// Builds the browser bundle for a view, using webpack and Babel.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { webpack, Configuration } from 'webpack';
import type { Addon } from './addon';
import type { RenderMode } from './index';

interface BundlerOptions {
  cacheDir: string; // Bundles go in <cacheDir>/assets, which is served at /assets.
  addons: Addon[];
  isDev: boolean; // In development, rebuild on every request. Otherwise build each view once.
}

/** Returns a function that builds the browser bundle for a view and gives back its URL. */
export function createBundler({ cacheDir, addons, isDev }: BundlerOptions) {
  const config = webpackConfig(addons, isDev, cacheDir);
  const builds = new Map<string, Promise<void>>();
  const startedAt = Date.now();

  return function bundle(viewFile: string, mode: RenderMode): Promise<string> {
    const key = `${mode}:${viewFile}`;
    const name = crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);

    if (isDev || !builds.has(key)) {
      const entry = writeEntry(path.join(cacheDir, 'entries', `${name}.js`), viewFile, mode);
      const output = { path: path.join(cacheDir, 'assets'), filename: `${name}.js` };
      const build = runWebpack({ ...config, entry, output });
      build.catch(() => builds.delete(key)); // Let a failed build be retried
      builds.set(key, build);
    }

    // The ?v= query makes browsers fetch the new file after a rebuild or restart
    const version = isDev ? Date.now() : startedAt;
    return builds.get(key)!.then(() => `/assets/${name}.js?v=${version}`);
  };
}

/**
 * Writes the browser entry file. It runs the view with the props the server sent:
 * "server" pages already hold the HTML, so React hydrates them (makes them interactive);
 * "client" pages are empty, so React renders them from scratch.
 */
function writeEntry(entryFile: string, viewFile: string, mode: RenderMode): string {
  const start = mode === 'server' ? 'hydrateRoot(document, view);' : 'createRoot(document).render(view);';
  const code = `
import { createElement } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import View from ${JSON.stringify(viewFile)};

const props = JSON.parse(document.getElementById('ref-props').textContent);
const view = createElement(View, props);
${start}
`;
  fs.mkdirSync(path.dirname(entryFile), { recursive: true });
  fs.writeFileSync(entryFile, code);
  return entryFile;
}

function webpackConfig(addons: Addon[], isDev: boolean, cacheDir: string): Configuration {
  let babel: object = {
    presets: [
      ['@babel/preset-env', { modules: false }], // Leave imports to webpack
      ['@babel/preset-react', { runtime: 'automatic' }],
      '@babel/preset-typescript',
    ],
    sourceType: 'unambiguous',
  };
  for (const addon of addons) babel = merge(babel, addon.getBabelSettings?.() ?? {});

  let config: Configuration = {
    mode: isDev ? 'development' : 'production',
    cache: { type: 'filesystem', cacheDirectory: path.join(cacheDir, 'webpack') }, // Makes rebuilds fast
    resolve: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
    module: {
      rules: [{ test: /\.(ts|js)x?$/, exclude: /node_modules/, use: { loader: 'babel-loader', options: babel } }],
    },
  };
  for (const addon of addons) config = merge(config, addon.getWebpackSettings?.() ?? {});

  return config;
}

function runWebpack(config: Configuration): Promise<void> {
  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) return reject(err);
      if (stats?.hasErrors()) return reject(new Error(stats.toString('errors-only')));
      resolve();
    });
  });
}

/** Deep-merges two config objects. Arrays are joined, so addons can add presets, plugins and rules. */
function merge<T extends object>(base: T, extra: object): T {
  const result: any = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const current = result[key];
    if (Array.isArray(current) && Array.isArray(value)) result[key] = [...current, ...value];
    else if (isPlainObject(current) && isPlainObject(value)) result[key] = merge(current, value);
    else result[key] = value;
  }
  return result;
}

function isPlainObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}
