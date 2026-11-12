import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Event, EventType } from '../src/index.ts';
import { client, fixture, listResponse, MockFetch, pathOf, queryOf } from './support.ts';

const event = {
    id: '9b1f7a3e-2c4d-4e8f-a6b0-1d2c3e4f5a6b',
    object: 'event',
    type: 'charge.paid',
    details: { amount: '0.0025' },
    created_at: '2026-09-20T10:05:41.000000Z',
    charge: fixture('charge'),
    invoice: null,
};

test('an event is retrieved with its charge', async () => {
    const http = new MockFetch().json({ data: event });

    const read = await client(http).events.retrieve('9b1f7a3e-2c4d-4e8f-a6b0-1d2c3e4f5a6b');

    assert.equal(pathOf(http.lastRequest()), '/v1/events/9b1f7a3e-2c4d-4e8f-a6b0-1d2c3e4f5a6b');
    assert.equal(read.id, '9b1f7a3e-2c4d-4e8f-a6b0-1d2c3e4f5a6b');
    assert.equal(read.type, 'charge.paid');
    assert.equal(read.is(EventType.ChargeUnderpaid, 'charge.paid'), true);
    assert.equal(read.is(EventType.ChargeExpired), false);
    assert.deepEqual(read.details, { amount: '0.0025' });
    assert.deepEqual(read.createdAt, new Date('2026-09-20T10:05:41Z'));
    assert.equal(read.charge?.id, 'k3v9x2m7q8wz');
    assert.equal(read.invoice, null);
});

test('the charge an event carries is typed with its checkout page', async () => {
    const http = new MockFetch().json({ data: event });

    const read = await client(http).events.retrieve('9b1f7a3e-2c4d-4e8f-a6b0-1d2c3e4f5a6b');
    const checkoutUrl: string | undefined = read.charge?.checkoutUrl;

    assert.equal(checkoutUrl, 'https://velirapay.com/c/k3v9x2m7q8wz');
});

test('events are listed with filters', async () => {
    const http = new MockFetch().json(listResponse([event]));

    const page = await client(http).events.list({ type: EventType.ChargePaid, charge: 'k3v9x2m7q8wz' });

    assert.equal(pathOf(http.lastRequest()), '/v1/events');
    assert.deepEqual(queryOf(http.lastRequest()), { type: 'charge.paid', charge: 'k3v9x2m7q8wz' });
    assert.ok(page.data[0] instanceof Event);
});
