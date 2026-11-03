# REF
The React Engine Framework for Express

> ***NOTE:*** This framework is not ready for production and for now, is just a Proof of Concept. Soon it will be ready for production

## About
REF lets Express render React components as server-side HTML views.

- Write views as React components (`.tsx` or `.jsx`).
- The object you pass to `res.render()` becomes the component's props.
- Local components a view imports are also bundled for the browser and added to the page as `<script>` tags.

## Installing
> npm i the-ref-framework

## Usage
```ts
import express from 'express';
import path from 'path';
import ref from 'the-ref-framework';

const app = express();
ref(app, { views: path.join(__dirname, 'views') });

app.get('/', (req, res) => res.render('home', { name: 'World' }));

app.listen(3000);
```

`views/home.tsx`:
```tsx
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

Node must be able to load `.tsx` files. See [example/hello-world/register.js](example/hello-world/register.js) for one way to do it with Babel.

## Options
All options are optional.

| Option      | Default                   | What it does                                        |
| ----------- | ------------------------- | --------------------------------------------------- |
| `views`     | Express's `views` setting | Folder that holds your views                        |
| `extension` | `'tsx'`                   | File extension of your views (`'tsx'` or `'jsx'`)   |
| `addons`    | `[]`                      | Plugins that change the build or the rendered HTML  |

In development (`NODE_ENV=development`), views reload on every request. Errors thrown while rendering go to Express's error handler.

## Addons
An addon is an object with any of these methods (see [src/addon.ts](src/addon.ts)):

- `getBabelSettings()` / `getWebpackSettings()`: options merged into the browser bundle config. Arrays such as `plugins` or `rules` are added to the defaults.
- `onStart(info)`: runs once, when REF is set up.
- `onStaticRender(html)`: runs after each render and returns the HTML to send.

## Example
A task list app: [example/hello-world](example/hello-world). Run it with `npm run dev`.

## Source code
- [src/index.ts](src/index.ts): the `ref()` function. Sets up the view engine and renders pages.
- [src/bundler.ts](src/bundler.ts): finds the components a view imports and bundles them with webpack.
- [src/addon.ts](src/addon.ts): the addon interface.
