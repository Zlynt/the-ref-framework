# REF
The React Engine Framework for Express

> ***NOTE:*** This framework is not ready for production and for now, is just a Proof of Concept. Soon it will be ready for production

## About
REF is a template engine for Express, making Express able to provide server-side rendered React.

With REF, we can control if we want full server-sided render or partial.

Features:
- Partial or full server-side rendering

## Installing
> npm i the-ref-framework

## Example
> ***NOTE:*** I will be posting soon a project template

```
import express from "express";
import RenderEngine from "the-ref-framework";
import path from "path";

const app = express();
const PORT = 3000;

const viewsFolderPath: string = __dirname + "/views";

new RenderEngine({
  viewsPath: viewsFolderPath,
  errorMessage: "An error happened while loading this page.",
  jsxOrTsx: "TypeScript XML",
  expressApp: app,
});

app.get("/", function (req, res) {
  res.render("root");
});

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
```

