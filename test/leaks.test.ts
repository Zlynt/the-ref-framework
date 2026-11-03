// Checks that server-side secrets never reach the browser: not in pages, not in bundles,
// and not in any other file a browser can request.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import express from 'express';
import ref from '../src';

const SECRETS = {
  processEnv: 'leak-process-env-5c1e9a',
  appLocals: 'leak-app-locals-8b27d4',
  appSetting: 'leak-app-setting-3f60ae',
  resLocals: 'leak-res-locals-94d1c7',
};
const PUBLIC_PROP = 'public-prop-2a7f0b'; // Passed to res.render(), so it must reach the browser
const CACHE_DIR = path.join(process.cwd(), '.refCache');

fs.rmSync(CACHE_DIR, { recursive: true, force: true }); // Check only bundles built by this test

for (const nodeEnv of [undefined, 'production', 'development']) {
  describe(`with NODE_ENV=${nodeEnv ?? '(unset)'}`, () => {
    let base: string;
    let close: () => void;

    before(async () => {
      // Express reads NODE_ENV when the app is created, and REF when it is set up
      if (nodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = nodeEnv;
      process.env.REF_TEST_ENV_SECRET = SECRETS.processEnv;

      const app = express();
      app.locals.apiKey = SECRETS.appLocals;
      app.set('session secret', SECRETS.appSetting); // Express exposes settings as app.locals.settings
      app.use((req, res, next) => {
        res.locals.user = { name: 'ann', passwordHash: SECRETS.resLocals };
        next();
      });
      ref(app, { views: path.join(__dirname, 'fixtures', 'views') });
      app.get('/server', (req, res) => res.render('page', { greeting: PUBLIC_PROP }));
      app.get('/client', (req, res) => res.render('client', { greeting: PUBLIC_PROP }));
      app.get('/broken', (req, res) => res.render('broken'));

      const server = app.listen(0);
      await new Promise((resolve) => server.once('listening', resolve));
      base = `http://localhost:${(server.address() as AddressInfo).port}`;
      close = () => server.close();
    });

    after(() => close());

    for (const route of ['/server', '/client']) {
      test(`${route}: the page and its scripts hold the props but no secrets`, async () => {
        const page = await get(route);
        assert.equal(page.status, 200);
        assert.ok(page.body.includes(PUBLIC_PROP), 'the props should be in the page');
        assertNoSecrets(route, page.body);

        const scripts = [...page.body.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1]);
        assert.equal(scripts.length, 1);
        for (const url of scripts) {
          const script = await get(url);
          assert.equal(script.status, 200);
          assertNoSecrets(url, script.body);
        }
      });
    }

    test('every file served at /assets is free of secrets and server paths', async () => {
      const files = fs.readdirSync(path.join(CACHE_DIR, 'assets'));
      assert.ok(files.length > 0);
      for (const file of files) {
        const { status, body } = await get(`/assets/${file}`);
        assert.equal(status, 200);
        assertNoSecrets(file, body);
        if (nodeEnv !== 'development') {
          assert.ok(!body.includes(process.cwd()), `${file} reveals the server's folder`);
        }
      }
    });

    test('the rest of the cache cannot be reached through /assets', async () => {
      const entry = fs.readdirSync(path.join(CACHE_DIR, 'entries'))[0];
      assert.ok(entry);
      for (const url of [
        `/assets/../entries/${entry}`,
        `/assets/%2e%2e/entries/${entry}`,
        `/assets/..%2fentries/${entry}`,
        `/assets/%2e%2e%2fentries%2f${entry}`,
        `/.refCache/entries/${entry}`,
        '/assets/../webpack/',
      ]) {
        const { status, body } = await get(url);
        assert.notEqual(status, 200, `${url} should not be served`);
        assertNoSecrets(url, body);
      }
    });

    if (nodeEnv === 'production') {
      // Outside production, Express's own error handler shows the error, which is Express's choice
      test('a failing view does not show its error to the browser', async () => {
        const { status, body } = await get('/broken');
        assert.equal(status, 500);
        assertNoSecrets('/broken', body);
      });
    }

    async function get(url: string): Promise<{ status: number; body: string }> {
      const response = await fetch(base + url, { redirect: 'manual' });
      return { status: response.status, body: await response.text() };
    }
  });
}

function assertNoSecrets(where: string, body: string): void {
  for (const [source, secret] of Object.entries(SECRETS)) {
    assert.ok(!body.includes(secret), `${where} leaks the secret from ${source}`);
  }
}
