import express, { Express as ExpressInterface } from "express";
import path from "path";
import fs from "fs-extra";
import _escaperegexp from "lodash.escaperegexp";
import Compiler from "./Compiler";
const { paperwork } = require("precinct");
import crypto from "crypto";

type RendererParams = {
  path: string;
  options: any;
  callback: (e: any, rendered?: string | undefined) => void;
};

const jsxOrTsxConstants = {
  "JavaScript XML": "jsx",
  "TypeScript XML": "tsx",
};
export type jsxOrTsxConstantsTypes = "JavaScript XML" | "TypeScript XML";

interface RenderEngineConstructor {
  viewsPath: string; // Path to the folder containing all the views
  errorMessage?: string; // Error returned to the client, when not in development environment, when could not render correctly
  jsxOrTsx: jsxOrTsxConstantsTypes; // Are we rendering JavaScript or TypeScript XML?
  expressApp: ExpressInterface;
  addons?: Array<any>; // Addons
}

export default class RenderEngine {
  private viewsPath: string;
  private errorMessage: string | undefined;
  private moduleDetectRegEx: RegExp;
  private jsxOrTsx: "jsx" | "tsx";
  private cacheFolderPath: string;
  private compiler: Compiler;

  constructor(params: RenderEngineConstructor) {
    console.log("Welcome to REF: The React Engine Framework for Express");

    // Initialize location of the Views
    this.viewsPath = String(params.viewsPath).toString();
    console.log("[Expressact] Views path set to", this.viewsPath);

    // Define Engine type
    switch (params.jsxOrTsx) {
      case "TypeScript XML":
        this.jsxOrTsx = "tsx";
        break;

      default:
      case "JavaScript XML":
        this.jsxOrTsx = "jsx";
        break;
    }

    // Configure the static folder for caching built JavaScript Files
    this.cacheFolderPath = path.join(process.cwd(), ".refCache");
    if (process.env.NODE_ENV === "development") {
      fs.removeSync(this.cacheFolderPath);
    }
    fs.ensureDirSync(this.cacheFolderPath);

    this.compiler = new Compiler({
      documentVersion: "HTML 5",
      addons: params.addons,
      viewsPath: this.viewsPath,
      jsxOrTsx: this.jsxOrTsx,
      cacheLocation: this.cacheFolderPath,
    });

    // Initialize error message
    if (
      process.env.NODE_ENV !== "development" ||
      params.errorMessage !== undefined
    ) {
      this.errorMessage = params.errorMessage
        ? params.errorMessage
        : "Server side error, please check logs for more information";
    }

    // Initialize regex to remove cached files on development
    this.moduleDetectRegEx = new RegExp(
      [this.viewsPath]
        .map((viewPath) => "^" + _escaperegexp(viewPath))
        .join("|")
    );

    // Bind all the methods accessing current instance
    this.render = this.render.bind(this);
    this.getEngineType = this.getEngineType.bind(this);

    // Configure the render engine on the Express app
    params.expressApp.set("views", this.viewsPath);
    params.expressApp.set("view engine", this.getEngineType());
    params.expressApp.engine(this.getEngineType(), this.render);

    params.expressApp.use(
      "/assets",
      express.static(path.resolve(path.join(this.cacheFolderPath, "assets")), {
        maxAge: "30d",
      })
    );

    console.log(`[ENGINE] Ready (environment: ${process.env.NODE_ENV})`);
  }

  render(
    viewPath: RendererParams["path"],
    options: RendererParams["options"],
    cb: RendererParams["callback"]
  ) {
    (async () => {
      // console.log("Environment?", options.settings.env);

      if (options.settings.env === "development") {
        // Remove all files from the module cache that are in the view folder.
        const cacheKeys = Object.keys(require.cache);
        for (let i = 0; i < cacheKeys.length; i += 1) {
          const module = cacheKeys[i];
          if (require.cache[module]?.filename === undefined) continue;
          if (
            this.moduleDetectRegEx.test(require.cache[module]?.filename || "")
          ) {
            delete require.cache[module];
          }
        }
      }

      // Compile the dynamic component into a bundle in JavaScript
      let dynamicComponents: Array<any> = [];
      let outputFiles: Array<string> = [];
      paperwork(viewPath).forEach((file: string) => {
        //.${this.jsxOrTsx}

        let inputPath = path.join(viewPath, "..", `${file}`);

        // console.log("Possible import detected:", file, "->", inputPath);

        // Check if it is a file and the import didn't had the file extension
        const checkFileWithExtention =
          fs.existsSync(inputPath + "." + this.jsxOrTsx) &&
          fs.statSync(inputPath + "." + this.jsxOrTsx).isFile();

        // Is it a file?
        if (checkFileWithExtention) {
          inputPath += "." + this.jsxOrTsx;
        }
        // Is it a directory?
        else if (
          fs.existsSync(inputPath) &&
          fs.statSync(inputPath).isDirectory()
        ) {
          inputPath +=
            "/" +
            fs
              .readdirSync(inputPath)
              .filter((file) => file.startsWith("index"))[0];
        } else {
          // console.log("Rejected: Not found");
          return;
        }

        console.log("To compile:", file, "->", inputPath);

        const compileDetails = {
          from: inputPath,
          to: path.join(
            this.cacheFolderPath,
            "assets",
            `${crypto
              .createHash("sha256")
              .update(file)
              .digest("hex")
              .slice(0, -1)}.js`
          ),
        };

        outputFiles.push(
          compileDetails.to.replace(
            path.join(this.cacheFolderPath, "assets"),
            "/assets"
          )
        );
        if (
          process.env.NODE_ENV === "development" ||
          !fs.existsSync(compileDetails.to)
        ) {
          console.log("Following component will be compiled:", file);
          dynamicComponents.push(
            this.compiler.build(compileDetails.from, compileDetails.to)
          );
        }
      });

      console.log(`Rendering ${dynamicComponents.length} component(s)...`);
      let staticRender = "";
      try {
        staticRender = await this.compiler.renderStatic(viewPath, options);

        await Promise.all(dynamicComponents);
      } catch (err: any) {
        if (err.length > 0) {
          console.log("Error:", err);
          if (this.errorMessage) {
            return cb(null, this.errorMessage);
          } else {
            return cb(
              null,
              err.length
                ? "<h1>Cannot compile required scripts</h1>" +
                    err
                      .map(
                        (errorMsg: string) =>
                          `<p>${errorMsg
                            .toString()
                            .replace(
                              /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
                              ""
                            )}</p>`
                      )
                      .join("<br/>")
                : err.toString()
            );
          }
        }
      }
      console.log("Finished compiling all the components!");

      outputFiles.forEach((fileOnList) => {
        staticRender = staticRender.replace(
          "</body>",
          `<script src="${fileOnList}${
            process.env.NODE_ENV === "development"
              ? `?rndstr=${+new Date()}`
              : ""
          }"></script></body>`
        );
      });

      return cb(null, staticRender);
    })();
  }

  getEngineType() {
    return this.jsxOrTsx;
  }
}
