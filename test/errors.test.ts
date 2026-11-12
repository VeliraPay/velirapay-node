import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    ApiError,
    AuthenticationError,
    ConflictError,
    ConnectionError,
    InvalidRequestError,
    NotFoundError,
    PermissionError,
    RateLimitError,
    ServerError,
    UnexpectedResponseError,
    ValidationError,
    VeliraPayClient,
    VeliraPayError,
} from '../src/index.ts';
import { client, MockFetch } from './support.ts';

const statuses: [number, typeof ApiError][] = [
    [400, InvalidRequestError],
    [401, AuthenticationError],
    [403, PermissionError],
    [404, NotFoundError],
    [409, ConflictError],
    [422, ValidationError],
    [429, RateLimitError],
    [500, ServerError],
    [503, ServerError],
];

for (const [status, errorClass] of statuses) {
    test(`a ${status} is thrown as a ${errorClass.name}`, async () => {
        const http = new MockFetch().json({ message: 'Something went wrong.' }, status);

        await assert.rejects(client(http).charges.retrieve('k3v9x2m7q8wz'), (error: unknown) => {
            assert.ok(error instanceof errorClass);
            assert.ok(error instanceof ApiError);
            assert.ok(error instanceof VeliraPayError);
            assert.equal(error.name, errorClass.name);
            assert.equal(error.status, status);
            assert.equal(error.message, 'Something went wrong.');
            assert.deepEqual(error.body, { message: 'Something went wrong.' });

            return true;
        });
    });
}

test('an object of another account or mode is not found', async () => {
    const http = new MockFetch().json({ message: 'No such object.' }, 404);

    await assert.rejects(client(http).charges.retrieve('k3v9x2m7q8wz'), { name: 'NotFoundError', message: 'No such object.' });
});

test('an error without a JSON message still explains itself', async () => {
    const http = new MockFetch().queue(new Response('<html>Bad Gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } }));

    await assert.rejects(client(http).charges.retrieve('k3v9x2m7q8wz'), (error: unknown) => {
        assert.ok(error instanceof ServerError);
        assert.equal(error.message, 'The VeliraPay API answered with HTTP 502.');
        assert.deepEqual(error.body, {});

        return true;
    });
});

test('validation errors are keyed by field', async () => {
    const http = new MockFetch().json({
        message: 'The asset field is required. (and 1 more error)',
        errors: {
            asset: ['The asset field is required.'],
            'items.0.quantity': ['The items.0.quantity field must be at least 0.001.'],
        },
    }, 422);

    await assert.rejects(client(http).charges.create({ asset: '' }), (error: unknown) => {
        assert.ok(error instanceof ValidationError);
        assert.deepEqual(error.errors(), {
            asset: ['The asset field is required.'],
            'items.0.quantity': ['The items.0.quantity field must be at least 0.001.'],
        });
        assert.equal(error.firstError('asset'), 'The asset field is required.');
        assert.equal(error.firstError('amount'), null);

        return true;
    });
});

test('a rate limit says when to try again', async () => {
    const http = new MockFetch().json({ message: 'Too Many Attempts.' }, 429, { 'Retry-After': '42' });

    await assert.rejects(client(http).charges.list(), (error: unknown) => {
        assert.ok(error instanceof RateLimitError);
        assert.equal(error.retryAfter(), 42);
        assert.equal(error.header('Retry-After'), '42');

        return true;
    });
});

test('a retry-after given as a date is read in seconds', async () => {
    const at = new Date(Date.now() + 30_000).toUTCString();
    const http = new MockFetch().json({ message: 'Service Unavailable' }, 503, { 'Retry-After': at });

    await assert.rejects(client(http).charges.list(), (error: unknown) => {
        assert.ok(error instanceof ServerError);
        const retryAfter = error.retryAfter();
        assert.ok(retryAfter !== null && retryAfter >= 29 && retryAfter <= 31, `${retryAfter} is about 30`);

        return true;
    });
});

test('a successful response that is not JSON is reported', async () => {
    const http = new MockFetch().queue(new Response('<html>Maintenance</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }));

    await assert.rejects(client(http).charges.retrieve('k3v9x2m7q8wz'), UnexpectedResponseError);
});

test('a successful response without the object asked for is reported', async () => {
    const http = new MockFetch().json({ data: [] });

    await assert.rejects(client(http).charges.retrieve('k3v9x2m7q8wz'), { name: 'UnexpectedResponseError', message: /without the object/ });
});

test('an unreachable API is reported', async () => {
    const failure = new TypeError('fetch failed', { cause: new Error('getaddrinfo ENOTFOUND api.velirapay.com') });
    const http = new MockFetch().queue(failure);

    await assert.rejects(client(http).charges.list(), (error: unknown) => {
        assert.ok(error instanceof ConnectionError);
        assert.ok(error instanceof VeliraPayError);
        assert.equal(error.message, 'Could not reach the VeliraPay API: getaddrinfo ENOTFOUND api.velirapay.com');
        assert.equal(error.cause, failure);

        return true;
    });
});

test('a request that takes too long is reported', async () => {
    const fetch = (_url: string, init: RequestInit): Promise<Response> => new Promise((_resolve, reject) => {
        // A real request holds a socket open meanwhile, which keeps Node running until the timeout fires.
        const socket = setTimeout(() => {}, 10_000);

        init.signal?.addEventListener('abort', () => {
            clearTimeout(socket);
            reject(init.signal?.reason);
        });
    });

    const velirapay = new VeliraPayClient('vp_test_secret', { fetch, maxRetries: 0, timeout: 0.05 });

    await assert.rejects(velirapay.charges.list(), { name: 'ConnectionError', message: 'Could not reach the VeliraPay API: no answer within 0.05 seconds.' });
});

test('an error the fetch implementation throws for another reason is not taken for a network error', async () => {
    const http = new MockFetch();

    await assert.rejects(client(http, 'vp_test_secret', { maxRetries: 2 }).charges.list(), { message: /No response was queued/ });
    assert.equal(http.requests.length, 1);
});
