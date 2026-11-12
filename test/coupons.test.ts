import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Coupon } from '../src/index.ts';
import { body, client, fixture, listResponse, MockFetch, pathOf, queryOf } from './support.ts';

test('a coupon is created with its expiry sent as ISO 8601', async () => {
    const http = new MockFetch().json({ data: fixture('coupon') }, 201);

    const coupon = await client(http).coupons.create({
        code: 'spring10',
        percent_off: '10',
        max_redemptions: 100,
        once_per_customer: true,
        payment_links: ['p4n8r2t6y1ua'],
        expires_at: new Date('2026-12-31T23:59:59Z'),
    }, { idempotencyKey: 'spring-sale' });

    const request = http.lastRequest();
    assert.equal(request.method, 'POST');
    assert.equal(pathOf(request), '/v1/coupons');
    assert.equal(request.headers.get('Idempotency-Key'), 'spring-sale');
    assert.deepEqual(await body(request), {
        code: 'spring10',
        percent_off: '10',
        max_redemptions: 100,
        once_per_customer: true,
        payment_links: ['p4n8r2t6y1ua'],
        expires_at: '2026-12-31T23:59:59.000Z',
    });
    assert.equal(coupon.code, 'SPRING10');
});

test("a coupon's amounts given as numbers are sent as decimal strings", async () => {
    const http = new MockFetch().json({ data: fixture('coupon') }, 201);

    await client(http).coupons.create({ code: 'FIVE', amount_off: 5, currency: 'EUR', min_amount: 20, max_redemptions: 100 });

    assert.deepEqual(await body(http.lastRequest()), { code: 'FIVE', amount_off: '5', currency: 'EUR', min_amount: '20', max_redemptions: 100 });
});

test('a coupon is read into typed properties', async () => {
    const http = new MockFetch().json({ data: fixture('coupon') });

    const coupon = await client(http).coupons.retrieve('spring10');

    assert.equal(pathOf(http.lastRequest()), '/v1/coupons/spring10');
    assert.equal(coupon.id, 'SPRING10');
    assert.equal(coupon.code, 'SPRING10');
    assert.equal(coupon.isPercentage(), true);
    assert.equal(coupon.percentOff, '10.00');
    assert.equal(coupon.amountOff, null);
    assert.equal(coupon.currency, null);
    assert.equal(coupon.minAmount, null);
    assert.equal(coupon.maxRedemptions, 100);
    assert.equal(coupon.timesRedeemed, 4);
    assert.equal(coupon.oncePerCustomer, true);
    assert.deepEqual(coupon.paymentLinks, ['p4n8r2t6y1ua']);
    assert.equal(coupon.active, true);
    assert.deepEqual(coupon.expiresAt, new Date('2026-12-31T23:59:59Z'));
    assert.deepEqual(coupon.updatedAt, new Date('2026-10-15T09:30:00Z'));
});

test('an amount off coupon names its currency', async () => {
    const http = new MockFetch().json({ data: { ...fixture('coupon'), percent_off: null, amount_off: '5.00', currency: 'EUR', min_amount: '20.00' } });

    const coupon = await client(http).coupons.retrieve('SPRING10');

    assert.equal(coupon.isPercentage(), false);
    assert.equal(coupon.amountOff, '5.00');
    assert.equal(coupon.currency, 'EUR');
    assert.equal(coupon.minAmount, '20.00');
});

test("a coupon's limits are updated", async () => {
    const http = new MockFetch().json({ data: { ...fixture('coupon'), active: false, payment_links: [] } });

    const coupon = await client(http).coupons.update('SPRING10', { active: false, payment_links: [], expires_at: null });

    const request = http.lastRequest();
    assert.equal(request.method, 'PATCH');
    assert.equal(pathOf(request), '/v1/coupons/SPRING10');
    assert.deepEqual(await body(request), { active: false, payment_links: [], expires_at: null });
    assert.equal(coupon.active, false);
    assert.deepEqual(coupon.paymentLinks, []);
});

test('coupons are listed', async () => {
    const http = new MockFetch().json(listResponse([fixture('coupon')]));

    const page = await client(http).coupons.list({ per_page: 10 });

    assert.equal(pathOf(http.lastRequest()), '/v1/coupons');
    assert.deepEqual(queryOf(http.lastRequest()), { per_page: '10' });
    assert.ok(page.data[0] instanceof Coupon);
});

test('a coupon is deleted', async () => {
    const http = new MockFetch().empty();

    assert.equal(await client(http).coupons.delete('SPRING10'), undefined);

    const request = http.lastRequest();
    assert.equal(request.method, 'DELETE');
    assert.equal(pathOf(request), '/v1/coupons/SPRING10');
});
