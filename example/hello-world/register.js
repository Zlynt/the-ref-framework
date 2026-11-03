// Lets Node load .ts and .tsx files (the app, its views, and the REF source).
// Used instead of ts-node, which doesn't support TypeScript 7.
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
