# REF: React Engine Framework for Express

[![npm version](https://img.shields.io/npm/v/the-ref-framework.svg)](https://www.npmjs.com/package/the-ref-framework)
[![npm downloads](https://img.shields.io/npm/dm/the-ref-framework.svg)](https://www.npmjs.com/package/the-ref-framework)
[![license](https://img.shields.io/npm/l/the-ref-framework.svg)](https://github.com/Zlynt/ref/blob/main/LICENSE)

Use React components as Express views. Call `res.render()` as usual and REF sends back server-rendered HTML.

```ts
app.get('/', (req, res) => res.render('home', { name: 'World' }));
```

> **Note:** REF is a proof of concept and is not ready for production yet.

## Features

- **React views:** write your pages as `.tsx` or `.jsx` components.
- **Props from `res.render()`:** the object you pass becomes the component's props.
- **Browser bundles:** local components a view imports are bundled with webpack and added to the page as `<script>` tags.
- **Reload in development:** with `NODE_ENV=development`, edits to views show up on the next request, without a restart.
- **Addons:** change the Babel or webpack config, or edit the final HTML (for example, for styled-components).
- **TypeScript types** are included.

## Installation

```sh
npm install the-ref-framework
```

REF uses Express 5 and React 19, which are installed with it.

## Quick start

**1. Set up REF in your app**

```ts
// src/index.ts
import express from 'express';
import path from 'path';
import ref from 'the-ref-framework';

const app = express();
ref(app, { views: path.join(__dirname, 'views') });

app.get('/', (req, res) => res.render('home', { name: 'World' }));

app.listen(3000);
```

**2. Write a view**

```tsx
// src/views/home.tsx
export default function Home({ name }: { name: string }) {
  return (
    <html>
      <body>
        <h1>Hello {name}</h1>
      </body>
    </html>
  );
}
```

A view must export its component as the default export and render a `<body>` tag. REF adds its `<script>` tags just before `</body>`.

**3. Let Node load `.tsx` files**

REF loads views with `require()`, so Node needs to understand JSX and TypeScript. One way is `@babel/register`:

```sh
npm install --save-dev @babel/register @babel/preset-env @babel/preset-react @babel/preset-typescript
```

```js
// register.js
require('@babel/register').default({
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  babelrc: false,
  configFile: false,
});
```

**4. Run it**

```sh
node -r ./register.js src/index.ts
```

Open http://localhost:3000.

## Options

`ref(app, options)` takes these options. All of them are optional.

| Option      | Default                   | Description                                          |
| ----------- | ------------------------- | ---------------------------------------------------- |
| `views`     | Express's `views` setting | Folder that holds your views                         |
| `extension` | `'tsx'`                   | File extension of your views: `'tsx'` or `'jsx'`     |
| `addons`    | `[]`                      | Addons that change the build or the rendered HTML    |

## How it works

When you call `res.render('home', props)`, REF:

1. Renders `views/home.tsx` to HTML with `renderToString`, passing `props`. Express's own keys (`settings`, `_locals`, `cache`) are left out.
2. Finds the local files the view imports (such as `import Layout from './Layout'`), bundles each one for the browser and adds a `<script>` tag for it. Package imports like `react` are skipped.
3. Runs each addon's `onStaticRender` on the HTML and sends the result.

Bundles are written to a `.refCache` folder in the current working directory and served at `/assets`. Add `.refCache` to your `.gitignore`.

Outside development, each bundle is built once and then reused. In development, views and bundles are rebuilt on every request.

Errors thrown while rendering go to Express's error handler.

## Addons

An addon is an object with any of these optional methods:

| Method                  | When it runs           | What it does                                                         |
| ----------------------- | ---------------------- | -------------------------------------------------------------------- |
| `getBabelSettings()`    | When REF is set up     | Returns Babel options to merge into the browser bundle config        |
| `getWebpackSettings()`  | When REF is set up     | Returns webpack options to merge into the browser bundle config      |
| `onStart(info)`         | Once, when REF is set up | Gets `viewsPath`, `jsxOrTsx` and `cacheLocation`                   |
| `onStaticRender(html)`  | After each render      | Returns the HTML to send. Can be async                               |

Options are deep-merged, and arrays such as `presets`, `plugins` or `rules` are added to the defaults.

```ts
import ref, { Addon } from 'the-ref-framework';

const poweredBy: Addon = {
  onStaticRender: (html) => html.replace('</body>', '<footer>Rendered by REF</footer></body>'),
};

ref(app, { addons: [poweredBy] });
```

## Example

[example/hello-world](https://github.com/Zlynt/ref/tree/main/example/hello-world) is a small task list app with a shared layout, forms and a 404 page. To run it, clone the repository and run:

```sh
npm install
npm run dev
```

## Links

- [Source code](https://github.com/Zlynt/ref)
- [Report an issue](https://github.com/Zlynt/ref/issues)

## License

[MIT](https://github.com/Zlynt/ref/blob/main/LICENSE)
