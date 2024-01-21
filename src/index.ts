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
type jsxOrTsxConstantsTypes = "JavaScript XML" | "TypeScript XML";

interface RenderEngineConstructor {
  viewsPath: string; // Path to the folder containing all the views
  errorMessage?: string; // Error returned to the client, when not in development environment, when could not render correctly
  jsxOrTsx: jsxOrTsxConstantsTypes; // Are we rendering JavaScript or TypeScript XML?
  expressApp: ExpressInterface;
  babelSettings?: any; // Options for babel (optional)
  webpackSettings?: any; // Options for Webpack (opcional)
}

export default class RenderEngine {
  private viewsPath: string;
  private errorMessage: string;
  private moduleDetectRegEx: RegExp;
  private jsxOrTsx: "jsx" | "tsx";
  private cacheFolderPath: string;
  private compiler: Compiler;

  constructor(params: RenderEngineConstructor) {
    console.log("Welcome to REF: The React Engine Framework for Express");

    this.compiler = new Compiler({
      useBeautify: true,
      documentVersion: "HTML 5",
      babelSettings: params.babelSettings,
      webpackSettings: params.webpackSettings,
    });

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

    // Initialize error message
    this.errorMessage = params.errorMessage
      ? params.errorMessage
      : "Server side error, please check logs for more information";

    // Initialize location of the Views
    this.viewsPath = String(params.viewsPath).toString();
    console.log("[Expressact] Views path set to", this.viewsPath);

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

    // Configure the static folder for caching built JavaScript Files
    this.cacheFolderPath = path.join(process.cwd(), ".expressactCache");
    fs.removeSync(this.cacheFolderPath);
    fs.ensureDirSync(this.cacheFolderPath);
    params.expressApp.use(
      "/assets",
      express.static(path.resolve(path.join(this.cacheFolderPath, "assets")), {
        maxAge: "30d",
      })
    );

    console.log("Engine is ready");
  }

  render(
    viewPath: RendererParams["path"],
    options: RendererParams["options"],
    cb: RendererParams["callback"]
  ) {
    (async () => {
      console.log("Environment?", options.settings.env);

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
        const compileDetails = {
          from: path.join(viewPath, "..", `${file}.${this.jsxOrTsx}`),
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
        dynamicComponents.push(
          this.compiler.build(compileDetails.from, compileDetails.to)
        );
      });

      console.log("Rendering queue size:", dynamicComponents.length);
      await Promise.all(dynamicComponents);

      console.log("Finished compiling all the assets");
      console.log(outputFiles);

      let staticRender = await this.compiler.renderStatic(viewPath, options);

      outputFiles.forEach((fileOnList) => {
        console.log("To Load:", fileOnList);
        staticRender = staticRender.replace(
          "</body>",
          `<script src="${fileOnList}?rndstr=${+new Date()}"></script></body>`
        );
      });

      return cb(null, staticRender);
    })();
  }

  getEngineType() {
    return this.jsxOrTsx;
  }
}