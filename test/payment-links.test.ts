import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Asset, PaymentLink, PricingType } from '../src/index.ts';
import { body, client, fixture, listResponse, MockFetch, pathOf, queryOf } from './support.ts';

test('a payment link is created with its dates sent as ISO 8601', async () => {
    const http = new MockFetch().json({ data: fixture('payment_link') }, 201);

    const link = await client(http).paymentLinks.create({
        title: 'Tip jar',
        pricing_type: PricingType.Open,
        currency: 'USD',
        suggested_amounts: ['5.00', '10.00', '25.00'],
        accepted_assets: [Asset.BTC, 'ETH'],
        custom_fields: [{ label: 'Message', required: false }],
        expires_at: new Date('2026-12-31T23:59:59Z'),
    });

    const request = http.lastRequest();
    assert.equal(request.method, 'POST');
    assert.equal(pathOf(request), '/v1/payment-links');
    assert.deepEqual(await body(request), {
        title: 'Tip jar',
        pricing_type: 'open',
        currency: 'USD',
        suggested_amounts: ['5.00', '10.00', '25.00'],
        accepted_assets: ['BTC', 'ETH'],
        custom_fields: [{ label: 'Message', required: false }],
        expires_at: '2026-12-31T23:59:59.000Z',
    });
    assert.equal(link.id, 'p4n8r2t6y1ua');
});

test("a payment link's amounts given as numbers are sent as decimal strings", async () => {
    const http = new MockFetch().json({ data: fixture('payment_link') }, 201).json({ data: fixture('payment_link') });
    const velirapay = client(http);

    await velirapay.paymentLinks.create({ title: 'Tip jar', pricing_type: PricingType.Open, currency: 'USD', suggested_amounts: [5, 10.5, '25.00'], min_amount: 1, max_amount: null, max_payments: 100 });

    assert.deepEqual(await body(http.lastRequest()), { title: 'Tip jar', pricing_type: 'open', currency: 'USD', suggested_amounts: ['5', '10.5', '25.00'], min_amount: '1', max_amount: null, max_payments: 100 });

    await velirapay.paymentLinks.update('p4n8r2t6y1ua', { pricing_type: PricingType.Fixed, amount: 150 });

    assert.deepEqual(await body(http.lastRequest()), { pricing_type: 'fixed', amount: '150' });
});

test('a payment link is read into typed properties', async () => {
    const http = new MockFetch().json({ data: fixture('payment_link') });

    const link = await client(http).paymentLinks.retrieve('p4n8r2t6y1ua');

    assert.equal(pathOf(http.lastRequest()), '/v1/payment-links/p4n8r2t6y1ua');
    assert.equal(link.title, 'Tip jar');
    assert.equal(link.description, 'Support the project.');
    assert.equal(link.pricingType, PricingType.Open);
    assert.equal(link.hasFixedAmount(), false);
    assert.equal(link.amount, null);
    assert.deepEqual(link.suggestedAmounts, ['5.00', '10.00', '25.00']);
    assert.equal(link.minAmount, '1.00');
    assert.equal(link.maxAmount, '500.00');
    assert.equal(link.acceptedAssets, null);
    assert.equal(link.isActive(), true);
    assert.equal(link.successUrl, 'https://example.com/thanks');
    assert.equal(link.collectName, true);
    assert.equal(link.requireEmail, false);
    assert.deepEqual(link.customFields, [{ label: 'Message', required: false }]);
    assert.equal(link.successMessage, 'Thank you!');
    assert.equal(link.expiresAt, null);
    assert.equal(link.maxPayments, 100);
    assert.equal(link.acceptingPayments, true);
    assert.equal(link.viewsCount, 12);
    assert.equal(link.checkoutUrl, 'https://velirapay.com/pay/p4n8r2t6y1ua');
    assert.deepEqual(link.updatedAt, new Date('2026-09-02T08:30:00Z'));
});

test('a payment link is updated, with null sent as is', async () => {
    const http = new MockFetch().json({ data: { ...fixture('payment_link'), title: 'Coffee' } });

    const link = await client(http).paymentLinks.update('p4n8r2t6y1ua', { title: 'Coffee', accepted_assets: null });

    const request = http.lastRequest();
    assert.equal(request.method, 'PATCH');
    assert.equal(pathOf(request), '/v1/payment-links/p4n8r2t6y1ua');
    assert.deepEqual(await body(request), { title: 'Coffee', accepted_assets: null });
    assert.equal(link.title, 'Coffee');
});

test('a payment link is archived and restored', async () => {
    const http = new MockFetch().json({ data: { ...fixture('payment_link'), status: 'archived' } }).json({ data: fixture('payment_link') });
    const velirapay = client(http);

    const archived = await velirapay.paymentLinks.archive('p4n8r2t6y1ua');

    assert.equal(http.lastRequest().method, 'POST');
    assert.equal(pathOf(http.lastRequest()), '/v1/payment-links/p4n8r2t6y1ua/archive');
    assert.equal(archived.isArchived(), true);

    const restored = await velirapay.paymentLinks.restore('p4n8r2t6y1ua');

    assert.equal(http.lastRequest().method, 'DELETE');
    assert.equal(pathOf(http.lastRequest()), '/v1/payment-links/p4n8r2t6y1ua/archive');
    assert.equal(restored.isActive(), true);
});

test('payment links are listed', async () => {
    const http = new MockFetch().json(listResponse([fixture('payment_link')]));

    const page = await client(http).paymentLinks.list({ per_page: 10 });

    assert.deepEqual(queryOf(http.lastRequest()), { per_page: '10' });
    assert.ok(page.data[0] instanceof PaymentLink);
});
