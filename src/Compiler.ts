import React from "react";
import ReactDOMServer from "react-dom/server";
import { webpack } from "webpack";
import path from "path";
import fs from "fs-extra";
import { html as beautifyHTML } from "js-beautify";
import { jsxOrTsxConstantsTypes } from ".";
var jsonMerger = require("json-merger");

//#region HTML Document Version definitions
type documentVersionsHeaderType = "HTML 5" | "HTML 4.01" | "XHTML 1.1";
const documentVersionsHeaderList = {
  "HTML 5": `<!DOCTYPE html>`,
  "HTML 4.01": `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">`,
  "XHTML 1.1": `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">`,
};
//#endregion

//#region Default parameters
interface DefaultSettings {
  beautify: boolean;
  documentVersionsHeader: string;
  babel: any;
  webpack?: any;
}
const defaultSettings: DefaultSettings = {
  beautify: false,
  documentVersionsHeader: documentVersionsHeaderList["HTML 5"],
  babel: {
    presets: [
      [
        "@babel/preset-env",
        {
          loose: true,
          modules: "amd",
        },
      ],
      [
        "@babel/preset-react",
        {
          runtime: "automatic",
        },
      ],
    ],
    sourceType: "unambiguous",
    plugins: ["@babel/transform-flow-strip-types"],
  },
};
function getDefaultWebpackSettings() {
  return {
    mode: "production",
    resolve: {
      extensions: ["", ".js", ".jsx", ".tsx", ".ts"],
    },
    module: {
      rules: [
        {
          test: /\.(ts|js)x?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "ts-loader",
            },
          ],
        },
        /*{
          test: /\.(js|ts)x?$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: defaultRenderEngineSettings.babel,
          },
        },*/
      ],
    },
  };
}
//#endregion

//#region Other definitions
type RenderParams = {
  path: string;
  options: any;
  callback: (e: any, rendered?: string | undefined) => void;
};
//#endregion

interface CompilerConstructorParams {
  documentVersion: documentVersionsHeaderType;
  viewsPath: string;
  addons?: Array<any>;
  jsxOrTsx: "jsx" | "tsx";
  cacheLocation: string;
}
export default class Compiler {
  private babelSettings?: any;
  private webpackSettings?: any;
  private documentVersion: string;
  private addons: Array<any>;

  constructor(params: CompilerConstructorParams) {
    const { documentVersion, viewsPath, jsxOrTsx, cacheLocation } = params;
    // Setup Babel
    this.babelSettings = defaultSettings.babel;
    // Setup WebPack
    this.webpackSettings = getDefaultWebpackSettings();
    // Setup Addons
    this.addons = [];

    // Addons (styled-components, Material UI, etc...)
    params.addons?.forEach((addon) => {
      this.addons.push(addon);
      
      this.babelSettings = jsonMerger.mergeObjects([
        this.babelSettings,
        addon.getBabelSettings(),
      ]);

      this.webpackSettings = jsonMerger.mergeObjects([
        this.webpackSettings,
        addon.getWebpackSettings(),
      ]);

      addon.onStart({
        viewsPath,
        jsxOrTsx,
        cacheLocation,
      });
    });

    // Setup document version to be used
    this.documentVersion = documentVersion
      ? documentVersionsHeaderList[documentVersion]
      : documentVersionsHeaderList["HTML 5"];

    // Bind all the methods accessing current instance
    this.getWebpackCompiler = this.getWebpackCompiler.bind(this);
    this.build = this.build.bind(this);
    this.buildStatic = this.buildStatic.bind(this);
    this.renderStatic = this.renderStatic.bind(this);
  }

  // Build a dynamic component and save it into a file
  async build(inputFile: string, outputFile: string) {
    return new Promise((resolve, reject) => {
      // console.log(this.webpackSettings);
      let compileParameters = {
        ...this.webpackSettings,
        entry: inputFile,
        cache: process.env.NODE_ENV !== "development",
        output: {
          path: path.join(outputFile, ".."),
          filename: path.basename(outputFile),
        },
      };
      const compiler = webpack(compileParameters);
      compiler.run((err?: null | Error, res?: any) => {
        if (err) {
          reject(err);
          return undefined;
        }
        if (res?.compilation.errors) {
          reject(res?.compilation.errors);
          return undefined;
        }
        // console.log('Built:', inputFile, outputFile);
        resolve(undefined);
        return undefined;
      });
    });
  }

  // Build a static html page
  async buildStatic(
    inputFile: string,
    outputFile: string,
    options: RenderParams["options"]
  ) {
    await fs.writeFile(outputFile, await this.renderStatic(inputFile, options));
  }

  // Render an html (Usefull for server-side rendering)
  async renderStatic(
    inputFile: RenderParams["path"],
    options: RenderParams["options"]
  ) {
    // Load the requested path
    let rendererView: any = require(inputFile);
    // Transpiled ES6 may export components as { default: Component }
    rendererView = rendererView.default || rendererView;

    let renderer =
      this.documentVersion +
      ReactDOMServer.renderToString(React.createElement(rendererView, options));

    // Beautify before and after
    renderer = beautifyHTML(renderer);
    for (let i = 0; i < this.addons.length; i++) {
      renderer = await this.addons[i].onStaticRender(renderer);
    }
    renderer = beautifyHTML(renderer);

    return renderer;
  }

  // Return a webpack compiler
  getWebpackCompiler(options?: any) {
    return webpack(options ? options : this.webpackSettings);
  }
}
