# REF: React Engine Framework for Express

[![npm version](https://img.shields.io/npm/v/the-ref-framework.svg)](https://www.npmjs.com/package/the-ref-framework)
[![npm downloads](https://img.shields.io/npm/dm/the-ref-framework.svg)](https://www.npmjs.com/package/the-ref-framework)
[![license](https://img.shields.io/npm/l/the-ref-framework.svg)](https://github.com/Zlynt/ref/blob/main/LICENSE)

Use React components as Express views. Call `res.render()` as usual. The server sends finished HTML, good for crawlers and a fast first paint, and the browser then makes the page interactive.

```ts
app.get('/', (req, res) => res.render('home', { name: 'World' }));
```

> **Note:** REF is a proof of concept and is not ready for production yet.

## Features

- **React views:** write your pages as `.tsx` or `.jsx` components.
- **Props from `res.render()`:** the object you pass becomes the component's props.
- **Server rendering with hydration:** by default the server sends finished HTML, then React takes over in the browser, so state, effects and event handlers work.
- **Client-only rendering, per view:** add `export const render = 'client'` to skip the server and render a view only in the browser.
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

A view must export its component as the default export and render the whole page, from `<html>` down.

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

| Option      | Default                   | Description                                       |
| ----------- | ------------------------- | ------------------------------------------------- |
| `views`     | Express's `views` setting | Folder that holds your views                      |
| `extension` | `'tsx'`                   | File extension of your views: `'tsx'` or `'jsx'`  |
| `addons`    | `[]`                      | Addons that change the build or the rendered HTML |

## Server or client rendering

Every view is interactive. Each view chooses where its first render happens. Views render on the server unless they export `render = 'client'`:

```tsx
// src/views/counter.tsx
import { useState } from 'react';

export const render = 'client'; // Leave this out, or use 'server', to render on the server first

export default function Counter({ start }: { start: number }) {
  const [count, setCount] = useState(start);
  return (
    <html>
      <body>
        <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
      </body>
    </html>
  );
}
```

The route doesn't change: `res.render('counter', { start: 0 })`.

|                          | `'server'` (default)                           | `'client'`                                     |
| ------------------------ | ---------------------------------------------- | ---------------------------------------------- |
| First render             | On the server                                  | In the browser                                 |
| What the browser gets    | Finished HTML, the props as JSON, and a script | An empty page, the props as JSON, and a script |
| Then                     | React hydrates the HTML (makes it interactive) | React renders the page                         |
| State, effects, events   | Yes, once the script loads                     | Yes                                            |
| Crawlers and no-JS users | See the full page                              | See an empty page                              |
| Good for                 | Most pages                                     | Pages that need browser-only APIs to render    |

Rules for both modes:

- **Props must survive `JSON.stringify`.** They are sent to the browser as JSON, so a `Date` arrives as a string. Use `new Date(prop)` if you need a date again.
- **Props are public.** Everything you pass to `res.render()` ends up in the page source. Don't pass secrets.
- **View code is public, and so is everything it imports.** Every view is bundled for the browser, even server views, so any module a view imports is served at `/assets`. Don't import modules that hold secrets, such as database or API config, into views; load that data in the route and pass only what the view needs as props. `import type` is safe, because types are removed from the bundle.
- **Server views must render the same HTML on both sides.** If the browser renders something different (for example, `Date.now()`, `Math.random()` or a local time zone), React shows a hydration warning and re-renders the page. Put browser-only code in `useEffect` or an event handler.

TypeScript users can type the setting: `export const render: RenderMode = 'client'` (`import type { RenderMode } from 'the-ref-framework'`).

## How it works

When you call `res.render('home', props)`, REF loads `views/home.tsx` and checks its `render` export. Only the object passed to `res.render()` becomes `props`. `app.locals` and `res.locals` are not passed to views, because they often hold server-only data such as the logged-in user; pass what a view needs explicitly, e.g. `res.render('home', { user: res.locals.user.name })`.

1. REF bundles the view, React and everything the view imports into one script with webpack.
2. **Server views:** REF renders the component to HTML with `renderToString` and runs each addon's `onStaticRender` on it. **Client views:** REF starts from an empty page.
3. REF adds the props as JSON and a `<script>` tag for the bundle just before `</body>`, and sends the page.
4. In the browser, the script runs the view with the same props: `hydrateRoot(document, …)` for server views, `createRoot(document)` for client views.

Bundles are written to a `.refCache` folder in the current working directory and served at `/assets`. Add `.refCache` to your `.gitignore`.

Outside development, each bundle is built once, on the first request, and then reused. In development, views and bundles are rebuilt on every request; webpack's cache keeps this fast.

Errors thrown while rendering go to Express's error handler.

## Addons

An addon is an object with any of these optional methods:

| Method                 | When it runs             | What it does                                                        |
| ---------------------- | ------------------------ | ------------------------------------------------------------------- |
| `getBabelSettings()`   | When REF is set up       | Returns Babel options to merge into the browser bundle config       |
| `getWebpackSettings()` | When REF is set up       | Returns webpack options to merge into the browser bundle config     |
| `onStart(info)`        | Once, when REF is set up | Gets `viewsPath`, `jsxOrTsx` and `cacheLocation`                    |
| `onStaticRender(html)` | After each server render | Returns the HTML to send. Can be async. Not called for client views |

Options are deep-merged, and arrays such as `presets`, `plugins` or `rules` are added to the defaults.

```ts
import ref, { Addon } from 'the-ref-framework';

const poweredBy: Addon = {
  onStaticRender: (html) => html.replace('</body>', '<footer>Rendered by REF</footer></body>'),
};

ref(app, { addons: [poweredBy] });
```

## Example

[example/hello-world](https://github.com/Zlynt/ref/tree/main/example/hello-world) is a small task list app with a shared layout, forms and a 404 page. Its search page is rendered only in the browser; all other pages are rendered on the server and then hydrated. To run it, clone the repository and run:

```sh
npm install
npm run dev
```

## Links

- [Source code](https://github.com/Zlynt/ref)
- [Report an issue](https://github.com/Zlynt/ref/issues)

## License

[MIT](https://github.com/Zlynt/ref/blob/main/LICENSE)
