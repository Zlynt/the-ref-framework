// REF: server-side rendered React views for Express.
//
//   import ref from 'the-ref-framework';
//   ref(app, { views: path.join(__dirname, 'views') });
//   app.get('/', (req, res) => res.render('home', { name: 'World' }));
//
// Each view is a React component. The object passed to res.render() becomes its props.
// Local components a view imports are also bundled for the browser and added as <script> tags.
import express, { Express } from 'express';
import fs from 'fs';
import path from 'path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import type { Addon } from './addon';
import { createBundler } from './bundler';

export type { Addon } from './addon';

export interface RefOptions {
  /** Folder that holds your views. Defaults to Express's "views" setting. */
  views?: string;
  /** File extension of your views. Defaults to "tsx". */
  extension?: 'tsx' | 'jsx';
  /** Optional plugins, e.g. for styled-components. */
  addons?: Addon[];
}

const CACHE_DIR = path.join(process.cwd(), '.refCache');
const ASSETS_DIR = path.join(CACHE_DIR, 'assets');

/** Sets up REF as the view engine of an Express app. */
export default function ref(app: Express, options: RefOptions = {}): void {
  const viewsPath = path.resolve(options.views ?? app.get('views'));
  const extension = options.extension ?? 'tsx';
  const addons = options.addons ?? [];
  const isDev = app.get('env') === 'development';

  // Start fresh in development, so no old bundles are served
  if (isDev) fs.rmSync(CACHE_DIR, { recursive: true, force: true });
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const bundleComponentsOf = createBundler({ outputDir: ASSETS_DIR, extension, addons, isDev });
  for (const addon of addons) addon.onStart?.({ viewsPath, jsxOrTsx: extension, cacheLocation: CACHE_DIR });

  async function render(viewFile: string, locals: Record<string, any>): Promise<string> {
    if (isDev) forgetModulesIn(viewsPath); // Pick up edits to views without a restart

    // Express adds its own keys to the locals; leave them out of the props
    const { settings, _locals, cache, ...props } = locals;

    const [scripts, page] = await Promise.all([bundleComponentsOf(viewFile), renderPage(viewFile, props)]);

    let html = page;
    for (const addon of addons) if (addon.onStaticRender) html = await addon.onStaticRender(html);

    const scriptTags = scripts.map((src) => `<script src="${src}"></script>`).join('');
    return html.replace('</body>', `${scriptTags}</body>`);
  }

  app.engine(extension, (viewFile, locals, done) => {
    render(viewFile, locals).then((html) => done(null, html), done); // Errors go to Express's error handler
  });
  app.set('view engine', extension);
  app.set('views', viewsPath);
  app.use('/assets', express.static(ASSETS_DIR, { maxAge: '30d' }));
}

/** Renders a view file to a full HTML page. */
async function renderPage(viewFile: string, props: object): Promise<string> {
  const module = require(viewFile);
  const View = module.default ?? module;
  return '<!DOCTYPE html>' + renderToString(createElement(View, props));
}

/** Removes cached modules in a folder, so the next require() reads them from disk again. */
function forgetModulesIn(folder: string): void {
  for (const id of Object.keys(require.cache)) {
    if (id.startsWith(folder + path.sep)) delete require.cache[id];
  }
}
