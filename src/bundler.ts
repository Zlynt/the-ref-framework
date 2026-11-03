// Builds browser bundles for the components a view imports, using webpack and Babel.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import { webpack, Configuration } from 'webpack';
import type { Addon } from './addon';

interface BundlerOptions {
  outputDir: string; // Where bundles are written. Served at /assets.
  extension: 'tsx' | 'jsx';
  addons: Addon[];
  isDev: boolean; // In development, rebuild on every request. Otherwise build each file once.
}

/** Returns a function that builds the bundles for a view and gives back their URLs. */
export function createBundler({ outputDir, extension, addons, isDev }: BundlerOptions) {
  const config = webpackConfig(addons);
  const builds = new Map<string, Promise<void>>();
  const startedAt = Date.now();

  function bundle(entry: string): Promise<string> {
    const fileName = crypto.createHash('sha256').update(entry).digest('hex').slice(0, 16) + '.js';

    if (isDev || !builds.has(entry)) {
      const build = runWebpack({ ...config, entry, output: { path: outputDir, filename: fileName } });
      build.catch(() => builds.delete(entry)); // Let a failed build be retried
      builds.set(entry, build);
    }

    // The ?v= query makes browsers fetch the new file after a rebuild or restart
    const version = isDev ? Date.now() : startedAt;
    return builds.get(entry)!.then(() => `/assets/${fileName}?v=${version}`);
  }

  return function bundleComponentsOf(viewFile: string): Promise<string[]> {
    return Promise.all(localImports(viewFile, extension).map(bundle));
  };
}

/** Lists the local component files a view imports, e.g. `import Layout from './Layout'`. */
function localImports(file: string, extension: 'tsx' | 'jsx'): string[] {
  const code = fs.readFileSync(file, 'utf8');
  const plugins: ('jsx' | 'typescript')[] = extension === 'tsx' ? ['jsx', 'typescript'] : ['jsx'];
  const ast = parse(code, { sourceType: 'module', plugins });

  const files: string[] = [];
  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration' || node.importKind === 'type') continue;

    const specifier = node.source.value;
    if (!specifier.startsWith('.')) continue; // Skip packages like 'react'

    const found = resolveFile(path.resolve(path.dirname(file), specifier), extension);
    if (found) files.push(found);
  }
  return files;
}

/** Finds the component file an import points to: `./Layout`, `./Layout.tsx` or `./Layout/index.tsx`. */
function resolveFile(base: string, extension: string): string | undefined {
  const candidates = [base, `${base}.${extension}`, path.join(base, `index.${extension}`)];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

function webpackConfig(addons: Addon[]): Configuration {
  let babel: object = {
    presets: [
      ['@babel/preset-env', { modules: 'amd' }],
      ['@babel/preset-react', { runtime: 'automatic' }],
      '@babel/preset-typescript',
    ],
    sourceType: 'unambiguous',
  };
  for (const addon of addons) babel = merge(babel, addon.getBabelSettings?.() ?? {});

  let config: Configuration = {
    mode: 'production',
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
