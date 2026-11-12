import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HttpTransport } from '../src/http/transport.ts';
import { ApiError, ConflictError, ConnectionError, RateLimitError, ServerError, ValidationError } from '../src/index.ts';
import { fixture, listResponse, MockFetch } from './support.ts';

/** A transport that records its waits instead of sleeping. */
function transport(http: MockFetch, sleeps: number[], options: { maxRetries?: number; maxRetryAfter?: number } = {}): HttpTransport {
    return new HttpTransport({
        apiKey: 'vp_test_secret',
        fetch: http.fetch,
        baseUrl: 'https://api.velirapay.com',
        maxRetries: options.maxRetries ?? 2,
        maxRetryAfter: options.maxRetryAfter ?? 10,
        timeout: 30,
        userAgent: 'VeliraPay-Node/test',
        sleep: async (seconds) => {
            sleeps.push(seconds);
        },
    });
}

test('outages and rate limits are retried with the same idempotency key', async () => {
    const sleeps: number[] = [];
    const http = new MockFetch()
        .json({ message: 'Service Unavailable' }, 503)
        .json({ message: 'Too Many Attempts.' }, 429, { 'Retry-After': '2' })
        .json({ data: fixture('charge') }, 201);

    const response = await transport(http, sleeps).request('POST', '/v1/charges', {}, { asset: 'BTC' });

    assert.equal(response.status, 201);
    assert.equal(http.requests.length, 3);

    const keys = new Set(http.requests.map((request) => request.headers.get('Idempotency-Key')));
    assert.equal(keys.size, 1);
    assert.match([...keys][0] ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

    assert.equal(sleeps.length, 2);
    assert.ok(sleeps[0]! >= 0.375 && sleeps[0]! <= 0.625, `${sleeps[0]} is about half a second`);
    assert.equal(sleeps[1], 2);
});

test('a given idempotency key is kept', async () => {
    const http = new MockFetch().json({ message: 'Bad Gateway' }, 502).json({ data: fixture('charge') }, 201);

    await transport(http, []).request('POST', '/v1/charges', {}, { asset: 'BTC' }, 'order-1042');

    assert.equal(http.requests[0]?.headers.get('Idempotency-Key'), 'order-1042');
    assert.equal(http.requests[1]?.headers.get('Idempotency-Key'), 'order-1042');
});

for (const status of [520, 521, 522, 523, 524]) {
    test(`Cloudflare's ${status} for an unreachable origin is retried with the same idempotency key`, async () => {
        const sleeps: number[] = [];
        const http = new MockFetch()
            .queue(new Response('<html>Cloudflare</html>', { status, headers: { 'Content-Type': 'text/html' } }))
            .json({ data: fixture('charge') }, 201);

        const response = await transport(http, sleeps).request('POST', '/v1/charges', {}, { asset: 'BTC' });

        assert.equal(response.status, 201);
        assert.equal(http.requests.length, 2);

        const key = http.requests[0]?.headers.get('Idempotency-Key');
        assert.ok(key !== null && key !== undefined);
        assert.equal(http.requests[1]?.headers.get('Idempotency-Key'), key);
        assert.equal(sleeps.length, 1);
    });
}

test('a server error is retried for reads only', async () => {
    const http = new MockFetch()
        .json({ message: 'Server Error' }, 500)
        .json({ data: fixture('charge') })
        .json({ message: 'Server Error' }, 500);

    await transport(http, []).request('GET', '/v1/charges/k3v9x2m7q8wz');

    assert.equal(http.requests.length, 2);

    await assert.rejects(transport(http, []).request('POST', '/v1/charges/k3v9x2m7q8wz/cancel'), ServerError);
    assert.equal(http.requests.length, 3);
});

test('a long retry-after is reported rather than waited', async () => {
    const sleeps: number[] = [];
    const http = new MockFetch().json({ message: 'Too Many Attempts.' }, 429, { 'Retry-After': '60' });

    await assert.rejects(transport(http, sleeps).request('GET', '/v1/charges'), (error: unknown) => {
        assert.ok(error instanceof RateLimitError);
        assert.equal(error.retryAfter(), 60);

        return true;
    });

    assert.equal(http.requests.length, 1);
    assert.deepEqual(sleeps, []);
});

for (const [status, errorClass] of [[409, ConflictError], [503, ServerError]] as const) {
    test(`a ${status} whose retry-after is longer than the longest is thrown straight away`, async () => {
        const sleeps: number[] = [];
        const http = new MockFetch().json({ message: 'Try again later.' }, status, { 'Retry-After': '11' });

        await assert.rejects(transport(http, sleeps).request('POST', '/v1/charges', {}, { asset: 'BTC' }), (error: unknown) => {
            assert.ok(error instanceof errorClass);
            assert.ok(error instanceof ApiError);
            assert.equal(error.retryAfter(), 11);

            return true;
        });

        assert.equal(http.requests.length, 1);
        assert.deepEqual(sleeps, []);
    });
}

test('the longest retry-after that is waited out can be raised', async () => {
    const sleeps: number[] = [];
    const http = new MockFetch().json({ message: 'Too Many Attempts.' }, 429, { 'Retry-After': '60' }).json(listResponse([]));

    await transport(http, sleeps, { maxRetryAfter: 60 }).request('GET', '/v1/charges');

    assert.equal(http.requests.length, 2);
    assert.deepEqual(sleeps, [60]);
});

test('a write still being processed under the same key is waited for', async () => {
    const sleeps: number[] = [];
    const http = new MockFetch()
        .json({ message: 'A request with this Idempotency-Key is still being processed.' }, 409, { 'Retry-After': '1' })
        .json({ data: fixture('charge') }, 201, { 'Idempotent-Replayed': 'true' });

    const response = await transport(http, sleeps).request('POST', '/v1/charges', {}, { asset: 'BTC' }, 'order-1042');

    assert.equal(response.status, 201);
    assert.equal(response.wasReplayed(), true);
    assert.equal(http.requests.length, 2);
    assert.equal(http.requests[1]?.headers.get('Idempotency-Key'), 'order-1042');
    assert.deepEqual(sleeps, [1]);
});

test('a write whose lost answer carried a secret is reported as having succeeded, rather than run again', async () => {
    const sleeps: number[] = [];
    const http = new MockFetch()
        .queue(new TypeError('fetch failed'))
        .json({ message: 'A request with this Idempotency-Key already succeeded. Its answer carried a secret, which is shown once and not kept, so it cannot be replayed.' }, 409, { 'Idempotent-Replayed': 'true' });

    await assert.rejects(transport(http, sleeps).request('POST', '/v1/webhook-endpoints/12/secret'), (error: unknown) => {
        assert.ok(error instanceof ConflictError);
        assert.equal(error.wasReplayed(), true);
        assert.equal(error.retryAfter(), null);

        return true;
    });

    assert.equal(http.requests.length, 2);
    assert.equal(sleeps.length, 1);

    const key = http.requests[0]?.headers.get('Idempotency-Key');
    assert.ok(key !== null && key !== undefined);
    assert.equal(http.requests[1]?.headers.get('Idempotency-Key'), key);
});

test('a conflict without a retry-after is not retried', async () => {
    const sleeps: number[] = [];
    const http = new MockFetch().json({ message: 'This Idempotency-Key was already used for a different request.' }, 409);

    await assert.rejects(transport(http, sleeps).request('POST', '/v1/charges', {}, { asset: 'BTC' }, 'order-1042'), (error: unknown) => {
        assert.ok(error instanceof ConflictError);
        assert.equal(error.retryAfter(), null);
        assert.equal(error.wasReplayed(), false);

        return true;
    });

    assert.equal(http.requests.length, 1);
    assert.deepEqual(sleeps, []);
});

test('network errors are retried until the limit', async () => {
    const sleeps: number[] = [];
    const failure = new TypeError('fetch failed', { cause: new Error('connect ECONNREFUSED 127.0.0.1:443') });
    const http = new MockFetch().queue(failure, failure, failure);

    await assert.rejects(transport(http, sleeps, { maxRetries: 2 }).request('GET', '/v1/charges'), { name: 'ConnectionError', message: 'Could not reach the VeliraPay API: connect ECONNREFUSED 127.0.0.1:443' });

    assert.equal(http.requests.length, 3);
    assert.equal(sleeps.length, 2);
});

test('a network error is retried, and the retry answered', async () => {
    const http = new MockFetch().queue(new TypeError('fetch failed')).json(listResponse([]));

    const response = await transport(http, []).request('GET', '/v1/charges');

    assert.equal(response.status, 200);
    assert.equal(http.requests.length, 2);
});

test('an answer cut off while its body is read is retried', async () => {
    const cutOff = new Response(new ReadableStream({
        start(controller) {
            controller.error(new TypeError('terminated'));
        },
    }), { status: 200 });
    const http = new MockFetch().queue(cutOff).json({ data: fixture('charge') });

    const response = await transport(http, []).request('GET', '/v1/charges/k3v9x2m7q8wz');

    assert.equal(response.status, 200);
    assert.equal(http.requests.length, 2);
});

test('client errors are not retried', async () => {
    const http = new MockFetch().json({ message: 'The given data was invalid.', errors: [] }, 422);

    await assert.rejects(transport(http, []).request('POST', '/v1/charges', {}, { asset: 'BTC' }), ValidationError);
    assert.equal(http.requests.length, 1);
});

test('no idempotency key is added when retries are off', async () => {
    const http = new MockFetch().json({ data: fixture('charge') }, 201);

    await transport(http, [], { maxRetries: 0 }).request('POST', '/v1/charges', {}, { asset: 'BTC' });

    assert.equal(http.lastRequest().headers.has('Idempotency-Key'), false);
});

/** An error shaped like the FetchError node-fetch throws, of the "system" type for a connection or a body read that failed. */
class FetchError extends Error {
    override readonly name = 'FetchError';
    readonly type: string;
    readonly code: string | undefined;

    constructor(message: string, type: string, code?: string) {
        super(message);
        this.type = type;
        this.code = code;
    }
}

test("a failure node-fetch reports is retried, then thrown as a ConnectionError", async () => {
    const sleeps: number[] = [];
    const failure = new FetchError('request to https://api.velirapay.com/v1/charges/k3v9x2m7q8wz failed, reason: socket hang up', 'system', 'ECONNRESET');
    const http = new MockFetch().queue(failure, failure, failure);

    await assert.rejects(transport(http, sleeps).request('GET', '/v1/charges/k3v9x2m7q8wz'), (error: unknown) => {
        assert.ok(error instanceof ConnectionError);
        assert.equal(error.cause, failure);
        assert.equal(error.message, 'Could not reach the VeliraPay API: request to https://api.velirapay.com/v1/charges/k3v9x2m7q8wz failed, reason: socket hang up');

        return true;
    });

    assert.equal(http.requests.length, 3);
    assert.equal(sleeps.length, 2);
});

test('a failure carrying a system error code is retried with the same idempotency key', async () => {
    const http = new MockFetch().queue(Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' })).json({ data: fixture('charge') }, 201);

    const response = await transport(http, []).request('POST', '/v1/charges', {}, { asset: 'BTC' });

    assert.equal(response.status, 201);
    assert.equal(http.requests.length, 2);
    assert.equal(http.requests[0]?.headers.get('Idempotency-Key'), http.requests[1]?.headers.get('Idempotency-Key'));
});

test('an error the fetch throws for another reason passes straight through, after one attempt', async () => {
    for (const failure of [new Error('Something in the test double broke.'), new FetchError('invalid json response body', 'invalid-json'), Object.assign(new Error('Not allowed.'), { code: 'ERR_NOT_ALLOWED' })]) {
        const http = new MockFetch().queue(failure);

        await assert.rejects(transport(http, []).request('POST', '/v1/charges', {}, { asset: 'BTC' }), (error: unknown) => error === failure);
        assert.equal(http.requests.length, 1);
    }
});

test('a connection error is not retried when retries are off', async () => {
    const http = new MockFetch().queue(new TypeError('fetch failed'));

    await assert.rejects(transport(http, [], { maxRetries: 0 }).request('GET', '/v1/charges'), ConnectionError);
    assert.equal(http.requests.length, 1);
});
