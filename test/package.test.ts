import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { VERSION } from '../src/index.ts';

const require = createRequire(import.meta.url);
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };

/** The built ES module, as `import` gets it. */
async function esm(): Promise<Record<string, unknown>> {
    return import(new URL('../dist/esm/index.js', import.meta.url).href) as Promise<Record<string, unknown>>;
}

/** The built CommonJS module, as `require` gets it. */
function cjs(): Record<string, any> {
    return require('../dist/cjs/index.js') as Record<string, any>;
}

test('the version matches package.json', () => {
    assert.equal(VERSION, packageJson.version);
});

test('the ES module and CommonJS builds export the same names', async () => {
    assert.deepEqual(Object.keys(cjs()).sort(), Object.keys(await esm()).sort());
    assert.equal(cjs()['VERSION'], packageJson.version);
});

test('the CommonJS build is marked as such', () => {
    assert.deepEqual(JSON.parse(readFileSync(new URL('../dist/cjs/package.json', import.meta.url), 'utf8')), { type: 'commonjs' });
});

test('the CommonJS build sends requests, throws its errors and verifies webhooks', async () => {
    const { VeliraPayClient, NotFoundError, Webhook } = cjs();
    const fetch = async (): Promise<Response> => new Response(JSON.stringify({ message: 'No such object.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

    await assert.rejects(new VeliraPayClient('vp_test_secret', { fetch, maxRetries: 0 }).charges.retrieve('k3v9x2m7q8wz'), NotFoundError);

    const raw = '{"id":"5f0c6f5e-8d1b-4a53-9a57-3c2b1d0e9f87","event":"charge.paid","mode":"live","data":{}}';
    const event = Webhook.constructEvent(raw, Webhook.signatureHeader(raw, 'whsec_test'), 'whsec_test');

    assert.equal(event.type, 'charge.paid');
});
