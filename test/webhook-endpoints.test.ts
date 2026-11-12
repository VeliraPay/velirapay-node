import assert from 'node:assert/strict';
import { test } from 'node:test';
import { client, MockFetch, pathOf, queryOf } from './support.ts';

const endpoint = {
    id: '12', object: 'webhook_endpoint', url: 'https://example.com/hooks', description: null, events: ['charge.paid'],
    active: true, verified: true, deliveries_count: 0, failed_deliveries_count: 0,
    verified_at: '2026-10-20T10:00:00.000000Z', created_at: '2026-10-20T09:00:00.000000Z',
};

const delivery = {
    id: '9d2e0b8a-0000-4000-8000-5f3a00000000', object: 'webhook_delivery', event: 'charge.paid', event_id: null, test: true,
    status: 'succeeded', attempts: 1, response_status: 200, error: null, charge: null, invoice: null,
    created_at: '2026-11-06T09:00:00.000000Z', last_attempted_at: '2026-11-06T09:00:01.000000Z', delivered_at: '2026-11-06T09:00:01.000000Z',
};

test('endpoints are listed with whether they can receive', async () => {
    const http = new MockFetch().json({
        data: [
            { ...endpoint, description: 'Orders', deliveries_count: 2, failed_deliveries_count: 1 },
            { ...endpoint, id: '13', url: 'https://example.com/new', events: [], verified: false, verified_at: null },
        ],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 2 },
    });

    const [verified, unverified] = (await client(http).webhookEndpoints.list()).data;

    assert.equal(pathOf(http.lastRequest()), '/v1/webhook-endpoints');
    assert.equal(verified?.id, '12');
    assert.equal(verified?.url, 'https://example.com/hooks');
    assert.equal(verified?.description, 'Orders');
    assert.deepEqual(verified?.events, ['charge.paid']);
    assert.equal(verified?.isReceiving(), true);
    assert.equal(verified?.deliveriesCount, 2);
    assert.equal(verified?.failedDeliveriesCount, 1);
    assert.deepEqual(verified?.verifiedAt, new Date('2026-10-20T10:00:00Z'));

    assert.equal(unverified?.isReceiving(), false);
    assert.equal(unverified?.verifiedAt, null);
});

test('an endpoint is added with its secret and whether it answered', async () => {
    const http = new MockFetch().json({ data: { ...endpoint, verified: false, secret: 'whsec_abc' }, meta: { verification_error: 'The endpoint answered the challenge with HTTP 404.' } }, 201);

    const added = await client(http).webhookEndpoints.create({ url: 'https://example.com/hooks', events: ['charge.paid'] }, { idempotencyKey: 'add-hook' });

    const request = http.lastRequest();
    assert.equal(request.method, 'POST');
    assert.equal(pathOf(request), '/v1/webhook-endpoints');
    assert.equal(request.headers.get('Idempotency-Key'), 'add-hook');
    assert.equal(added.secret, 'whsec_abc');
    assert.equal(added.verificationError, 'The endpoint answered the challenge with HTTP 404.');
});

test('an endpoint is changed, verified, tested, rotated and deleted', async () => {
    const http = new MockFetch()
        .json({ data: { ...endpoint, active: false }, meta: { verification_error: null } })
        .json({ data: endpoint })
        .json({ data: delivery }, 201)
        .json({ data: { ...endpoint, secret: 'whsec_new' }, meta: { previous_secret_expires_at: '2026-11-07T09:00:00.000000Z' } })
        .empty();
    const velirapay = client(http);

    assert.equal((await velirapay.webhookEndpoints.update('12', { active: false })).active, false);
    assert.equal(http.lastRequest().method, 'PATCH');
    assert.equal(pathOf(http.lastRequest()), '/v1/webhook-endpoints/12');

    assert.equal((await velirapay.webhookEndpoints.verify('12')).verified, true);
    assert.equal(pathOf(http.lastRequest()), '/v1/webhook-endpoints/12/verify');

    assert.equal((await velirapay.webhookEndpoints.test('12')).test, true);
    assert.equal(pathOf(http.lastRequest()), '/v1/webhook-endpoints/12/test');

    const rotated = await velirapay.webhookEndpoints.rotateSecret('12');

    assert.equal(rotated.secret, 'whsec_new');
    assert.deepEqual(rotated.previousSecretExpiresAt, new Date('2026-11-07T09:00:00Z'));
    assert.equal(pathOf(http.lastRequest()), '/v1/webhook-endpoints/12/secret');

    await velirapay.webhookEndpoints.delete('12');

    assert.equal(http.lastRequest().method, 'DELETE');
    assert.equal(pathOf(http.lastRequest()), '/v1/webhook-endpoints/12');
});

test('deliveries are listed and retried', async () => {
    const http = new MockFetch()
        .json({ data: [{ ...delivery, test: false, status: 'failed', response_status: 500, charge: 'abc123' }], meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 } })
        .json({ data: { ...delivery, status: 'pending' } });
    const velirapay = client(http);

    const listed = (await velirapay.webhookEndpoints.deliveries('12', { status: 'failed' })).data[0];

    assert.equal(pathOf(http.lastRequest()), '/v1/webhook-endpoints/12/deliveries');
    assert.deepEqual(queryOf(http.lastRequest()), { status: 'failed' });
    assert.equal(listed?.succeeded(), false);
    assert.equal(listed?.responseStatus, 500);
    assert.equal(listed?.charge, 'abc123');
    assert.equal(listed?.payload, null);
    assert.deepEqual(listed?.attemptLog, []);

    await velirapay.webhookEndpoints.retryDelivery('12', listed!.id);

    assert.equal(http.lastRequest().method, 'POST');
    assert.equal(pathOf(http.lastRequest()), `/v1/webhook-endpoints/12/deliveries/${listed!.id}/retry`);
});

test('a delivery is retrieved with every attempt and its body', async () => {
    const http = new MockFetch().json({ data: {
        ...delivery,
        attempts: 2,
        payload: { id: 'whd_1', event: 'charge.paid', data: { charge: { id: 'abc123' } } },
        attempt_log: [
            {
                object: 'webhook_delivery_attempt', attempt: 2, url: 'https://example.com/hooks',
                request_headers: { 'Content-Type': 'application/json', 'X-VeliraPay-Signature': 't=1762419601,v1=…' },
                response_status: 200, response_headers: { 'Content-Type': 'text/plain' }, response_body: 'ok',
                error: null, duration_ms: 84, created_at: '2026-11-06T09:05:00.000000Z',
            },
            {
                object: 'webhook_delivery_attempt', attempt: 1, url: 'https://example.com/hooks', request_headers: { 'Content-Type': 'application/json' },
                response_status: null, response_headers: null, response_body: null,
                error: 'Timed out after 10 seconds.', duration_ms: 10003, created_at: '2026-11-06T09:00:00.000000Z',
            },
        ],
    } });

    const read = await client(http).webhookEndpoints.retrieveDelivery('12', '9d2e0b8a-0000-4000-8000-5f3a00000000');

    assert.equal(http.lastRequest().method, 'GET');
    assert.equal(pathOf(http.lastRequest()), '/v1/webhook-endpoints/12/deliveries/9d2e0b8a-0000-4000-8000-5f3a00000000');
    assert.deepEqual(read.payload, { id: 'whd_1', event: 'charge.paid', data: { charge: { id: 'abc123' } } });
    assert.equal(read.attemptLog.length, 2);

    const [latest, first] = read.attemptLog;

    assert.equal(latest?.succeeded(), true);
    assert.equal(latest?.attempt, 2);
    assert.deepEqual(latest?.responseHeaders, { 'Content-Type': 'text/plain' });
    assert.equal(latest?.responseBody, 'ok');
    assert.equal(latest?.durationMs, 84);
    assert.equal(first?.succeeded(), false);
    assert.equal(first?.responseHeaders, null);
    assert.equal(first?.error, 'Timed out after 10 seconds.');
});
