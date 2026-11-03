// REF: React views for Express, rendered on the server or in the browser.
//
//   import ref from 'the-ref-framework';
//   ref(app, { views: path.join(__dirname, 'views') });
//   app.get('/', (req, res) => res.render('home', { name: 'World' }));
//
// Each view is a React component. The object passed to res.render() becomes its props.
// By default the server sends finished HTML and the browser then makes it interactive (hydration).
// A view can skip the server and render only in the browser:
//
//   export const render = 'client';
import express, { Express } from 'express';
import fs from 'fs';
import path from 'path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import type { Addon } from './addon';
import { createBundler } from './bundler';

export type { Addon } from './addon';

/**
 * Where a view is rendered.
 * "server": the server sends finished HTML, then the browser makes it interactive.
 * "client": the server sends an empty page, and the browser renders it.
 */
export type RenderMode = 'server' | 'client';

export interface RefOptions {
  /** Folder that holds your views. Defaults to Express's "views" setting. */
  views?: string;
  /** File extension of your views. Defaults to "tsx". */
  extension?: 'tsx' | 'jsx';
  /** Optional plugins, e.g. for styled-components. */
  addons?: Addon[];
}

const CACHE_DIR = path.join(process.cwd(), '.refCache');
const PROPS = Symbol('ref.props'); // Where the options passed to render() travel to the view engine
const EMPTY_PAGE ='<!DOCTYPE html><html><head></head><body></body></html>'; // Client views start from this

/** Sets up REF as the view engine of an Express app. */
export default function ref(app: Express, options: RefOptions = {}): void {
  const viewsPath = path.resolve(options.views ?? app.get('views'));
  const extension = options.extension ?? 'tsx';
  const addons = options.addons ?? [];
  const isDev = app.get('env') === 'development';

  // Start fresh in development, so no old bundles are served
  if (isDev) fs.rmSync(CACHE_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(CACHE_DIR, 'assets'), { recursive: true });

  const bundle = createBundler({ cacheDir: CACHE_DIR, addons, isDev });
  for (const addon of addons) addon.onStart?.({ viewsPath, jsxOrTsx: extension, cacheLocation: CACHE_DIR });

  async function render(viewFile: string, locals: Record<string | symbol, any>): Promise<string> {
    if (isDev) forgetModulesIn(viewsPath); // Pick up edits to views without a restart

    // Only what was passed to render() becomes props. Express also merges in app.locals and
    // res.locals, which often hold server-only data (users, sessions), so those stay on the server.
    const props: Record<string, any> = locals[PROPS] ?? {};

    const view = require(viewFile);
    const mode: RenderMode = view.render ?? 'server';
    if (mode !== 'server' && mode !== 'client') {
      throw new Error(`${viewFile}: "render" must be 'server' or 'client', not ${JSON.stringify(mode)}`);
    }

    // Build the browser bundle while the server renders the page
    const [scriptUrl, html] = await Promise.all([
      bundle(viewFile, mode),
      mode === 'server' ? serverHtml(view.default ?? view, props) : EMPTY_PAGE,
    ]);
    return html.replace('</body>', `${scripts(scriptUrl, props)}</body>`);
  }

  /** Renders a view to HTML on the server and lets addons change it. */
  async function serverHtml(View: any, props: object): Promise<string> {
    let html = '<!DOCTYPE html>' + renderToString(createElement(View, props));
    for (const addon of addons) if (addon.onStaticRender) html = await addon.onStaticRender(html);
    return html;
  }

  // res.render() calls app.render() with its options. Keep a copy of them under a private key,
  // which survives Express merging them with app.locals and res.locals.
  const expressRender: (...args: any[]) => void = app.render;
  app.render = function (this: Express, name: string, options?: any, callback?: any) {
    if (typeof options === 'function') [callback, options] = [options, {}];
    const { _locals, cache, ...props } = options ?? {};
    return expressRender.call(this, name, { ...options, [PROPS]: props }, callback);
  } as Express['render'];

  app.engine(extension, (viewFile, locals, done) => {
    render(viewFile, locals).then((html) => done(null, html), done); // Errors go to Express's error handler
  });
  app.set('view engine', extension);
  app.set('views', viewsPath);
  app.use('/assets', express.static(path.join(CACHE_DIR, 'assets'), { maxAge: '30d' }));
}

/** The tags that run the view in the browser: its props as JSON, and its bundle. */
function scripts(scriptUrl: string, props: object): string {
  // Escape "<" so a prop like "</script>" can't end the tag early
  const json = JSON.stringify(props).replace(/</g, '\\u003c');
  return `<script id="ref-props" type="application/json">${json}</script><script src="${scriptUrl}"></script>`;
}

/** Removes cached modules in a folder, so the next require() reads them from disk again. */
function forgetModulesIn(folder: string): void {
  for (const id of Object.keys(require.cache)) {
    if (id.startsWith(folder + path.sep)) delete require.cache[id];
  }
}
