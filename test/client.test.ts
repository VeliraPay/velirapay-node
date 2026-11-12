import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChargeStatus, InvalidArgumentError, Mode, RateLimitError, VERSION, VeliraPayClient } from '../src/index.ts';
import { body, client, fixture, listResponse, MockFetch } from './support.ts';

test('requests are authenticated and identify the library', async () => {
    const http = new MockFetch().json(fixture('account'));

    await client(http, 'vp_test_secret', { appInfo: 'MyShop/2.1' }).account.retrieve();

    const request = http.lastRequest();
    assert.equal(request.method, 'GET');
    assert.equal(request.url, 'https://api.velirapay.com/v1/account');
    assert.equal(request.headers.get('Authorization'), 'Bearer vp_test_secret');
    assert.equal(request.headers.get('Accept'), 'application/json');
    assert.equal(request.headers.get('User-Agent'), `VeliraPay-Node/${VERSION} Node/${process.versions.node} MyShop/2.1`);
    assert.equal(request.headers.has('Idempotency-Key'), false);
    assert.equal(request.headers.has('Content-Type'), false);
    assert.equal(request.redirect, 'manual');
});

test('the mode is read from the key prefix', () => {
    const http = new MockFetch();

    assert.equal(client(http, 'vp_live_secret').mode(), Mode.Live);
    assert.equal(client(http, 'vp_live_secret').isLiveMode(), true);
    assert.equal(client(http, 'vp_test_secret').mode(), Mode.Test);
    assert.equal(client(http, 'vp_test_secret').isTestMode(), true);
});

test('a missing key is rejected', () => {
    for (const apiKey of [' ', '', undefined]) {
        assert.throws(() => new VeliraPayClient(apiKey), { name: 'InvalidArgumentError', message: /API key is required/ });
    }
});

test('a key that does not start with a mode is rejected', () => {
    for (const apiKey of ['sk_live_secret', 'vp_secret', 'VP_LIVE_secret']) {
        assert.throws(() => new VeliraPayClient(apiKey), (error: unknown) => error instanceof InvalidArgumentError && error.message.includes('starts with "vp_live_" or "vp_test_"'));
    }
});

test('a key with a space or a line break is rejected without repeating it', () => {
    assert.throws(() => new VeliraPayClient('vp_test_secret\n'), (error: unknown) => error instanceof InvalidArgumentError && !error.message.includes('secret'));
});

test('impossible options are rejected', () => {
    const fetch = new MockFetch().fetch;

    assert.throws(() => new VeliraPayClient('vp_test_secret', { fetch, maxRetries: -1 }), InvalidArgumentError);
    assert.throws(() => new VeliraPayClient('vp_test_secret', { fetch, maxRetries: 1.5 }), InvalidArgumentError);
    assert.throws(() => new VeliraPayClient('vp_test_secret', { fetch, maxRetryAfter: -1 }), InvalidArgumentError);
    assert.throws(() => new VeliraPayClient('vp_test_secret', { fetch, timeout: 0 }), InvalidArgumentError);
    assert.throws(() => new VeliraPayClient('vp_test_secret', { fetch, baseUrl: 'api.velirapay.com' }), InvalidArgumentError);
    assert.throws(() => new VeliraPayClient('vp_test_secret', { fetch, appInfo: 'MyShop\r\nX-Injected: 1' }), InvalidArgumentError);
});

test('a retry-after longer than the configured longest is thrown straight away', async () => {
    const http = new MockFetch().json({ message: 'Too Many Attempts.' }, 429, { 'Retry-After': '6' });

    await assert.rejects(client(http, 'vp_test_secret', { maxRetries: 2, maxRetryAfter: 5 }).charges.list(), (error: unknown) => {
        assert.ok(error instanceof RateLimitError);
        assert.equal(error.retryAfter(), 6);

        return true;
    });

    assert.equal(http.requests.length, 1);
});

test('the global fetch is used when none is given', () => {
    assert.equal(new VeliraPayClient('vp_test_secret').mode(), Mode.Test);
});

test('requests go to a custom base url', async () => {
    const http = new MockFetch().json({ data: fixture('charge') });

    await client(http, 'vp_test_secret', { baseUrl: 'http://localhost:8000/' }).charges.retrieve('k3v9x2m7q8wz');

    assert.equal(http.lastRequest().url, 'http://localhost:8000/v1/charges/k3v9x2m7q8wz');
});

test('raw requests send params as the query or the body', async () => {
    const http = new MockFetch().json(listResponse([])).json({ data: fixture('charge') }, 201);
    const velirapay = client(http);

    await velirapay.request('GET', '/v1/charges', { status: ChargeStatus.Paid, per_page: 5, payment_link: null });

    assert.equal(new URL(http.lastRequest().url).search, '?status=paid&per_page=5');

    const response = await velirapay.request('POST', '/v1/charges', { asset: 'BTC', amount: '25.00' }, { idempotencyKey: 'order-7' });

    assert.equal(response.status, 201);
    assert.equal(await http.lastRequest().text(), '{"asset":"BTC","amount":"25.00"}');
    assert.equal(http.lastRequest().headers.get('Content-Type'), 'application/json');
    assert.equal(http.lastRequest().headers.get('Idempotency-Key'), 'order-7');
    assert.equal(velirapay.lastResponse(), response);
});

test('replayed responses are recognised', async () => {
    const http = new MockFetch().json({ data: fixture('charge') }, 201, { 'Idempotent-Replayed': 'true' });
    const velirapay = client(http);

    await velirapay.charges.create({ asset: 'BTC', amount: '150.00', currency: 'EUR' }, { idempotencyKey: 'order-1042' });

    assert.equal(velirapay.lastResponse()?.wasReplayed(), true);
    assert.deepEqual(await body(http.lastRequest()), { asset: 'BTC', amount: '150.00', currency: 'EUR' });
});

test('a body that cannot be encoded is refused before anything is sent', async () => {
    const http = new MockFetch();
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;

    await assert.rejects(client(http).request('POST', '/v1/charges', circular), InvalidArgumentError);
    assert.equal(http.requests.length, 0);
});
