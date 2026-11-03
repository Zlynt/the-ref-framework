/**
 * An addon plugs extra tooling into REF, for example styled-components or Material UI.
 * Every method is optional.
 */
export interface Addon {
  /** Babel options to merge into the config used for browser bundles. */
  getBabelSettings?(): object;

  /** Webpack options to merge into the config used for browser bundles. */
  getWebpackSettings?(): object;

  /** Called once, when REF is set up. */
  onStart?(info: { viewsPath: string; jsxOrTsx: string; cacheLocation: string }): void;

  /** Called after each page is rendered. Return the (possibly changed) HTML. */
  onStaticRender?(html: string): string | Promise<string>;
}
