import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Asset, Charge, ChargeStatus, InvalidArgumentError } from '../src/index.ts';
import { body, client, fixture, listResponse, MockFetch, pathOf, queryOf } from './support.ts';

test('a charge is created', async () => {
    const http = new MockFetch().json({ data: fixture('charge') }, 201);

    const charge = await client(http).charges.create({
        asset: Asset.BTC,
        amount: '150.00',
        currency: 'EUR',
        metadata: { order_id: '1042' },
    }, { idempotencyKey: 'order-1042' });

    const request = http.lastRequest();
    assert.equal(request.method, 'POST');
    assert.equal(pathOf(request), '/v1/charges');
    assert.equal(request.headers.get('Content-Type'), 'application/json');
    assert.equal(request.headers.get('Idempotency-Key'), 'order-1042');
    assert.deepEqual(await body(request), { asset: 'BTC', amount: '150.00', currency: 'EUR', metadata: { order_id: '1042' } });
    assert.ok(charge instanceof Charge);
    assert.equal(charge.id, 'k3v9x2m7q8wz');
});

test('a charge is created with everything already known', async () => {
    const http = new MockFetch().json({ data: { ...fixture('charge'), success_url: 'https://example.com/orders/1042', cancel_url: 'https://example.com/cart', success_message: 'Thank you.' } }, 201);

    const charge = await client(http).charges.create({
        asset: 'BTC',
        amount: '150.00',
        currency: 'EUR',
        custom_fields: [{ label: 'Company', value: 'Analytical Engines' }],
        success_url: 'https://example.com/orders/1042',
        cancel_url: 'https://example.com/cart',
        success_message: 'Thank you.',
        send_email: true,
    });

    const sent = await body(http.lastRequest()) as Record<string, unknown>;
    assert.deepEqual(sent['custom_fields'], [{ label: 'Company', value: 'Analytical Engines' }]);
    assert.equal(sent['send_email'], true);
    assert.equal(charge.successUrl, 'https://example.com/orders/1042');
    assert.equal(charge.cancelUrl, 'https://example.com/cart');
    assert.equal(charge.successMessage, 'Thank you.');
});

test('a charge can be emailed, accepted and paid by simulation', async () => {
    const http = new MockFetch();
    const velirapay = client(http);

    http.json({ data: fixture('charge') });
    await velirapay.charges.send('k3v9x2m7q8wz');
    assert.equal(http.lastRequest().method, 'POST');
    assert.equal(pathOf(http.lastRequest()), '/v1/charges/k3v9x2m7q8wz/send');

    http.json({ data: fixture('charge') });
    await velirapay.charges.accept('k3v9x2m7q8wz');
    assert.equal(pathOf(http.lastRequest()), '/v1/charges/k3v9x2m7q8wz/accept');

    http.json({ data: fixture('charge') });
    await velirapay.charges.simulate('k3v9x2m7q8wz');
    assert.equal(pathOf(http.lastRequest()), '/v1/charges/k3v9x2m7q8wz/simulate');
    assert.equal(await http.lastRequest().text(), '');

    http.json({ data: fixture('charge') });
    await velirapay.charges.simulate('k3v9x2m7q8wz', { amount: '0.001' });
    assert.deepEqual(await body(http.lastRequest()), { amount: '0.001' });
});

test('a charge is read into typed properties', async () => {
    const http = new MockFetch().json({ data: fixture('charge') });

    const charge = await client(http).charges.retrieve('k3v9x2m7q8wz');

    assert.equal(pathOf(http.lastRequest()), '/v1/charges/k3v9x2m7q8wz');
    assert.equal(charge.status, ChargeStatus.Paid);
    assert.equal(charge.isPaid(), true);
    assert.equal(charge.isOpen(), false);
    assert.equal(charge.paymentLink, 'p4n8r2t6y1ua');
    assert.equal(charge.paymentLinkTitle, null);
    assert.equal(charge.invoice, null);
    assert.equal(charge.invoiceNumber, null);
    assert.equal(charge.description, 'Pro plan, 1 year');
    assert.equal(charge.fiatAmount, '150.00');
    assert.equal(charge.fiatCurrency, 'EUR');
    assert.equal(charge.coupon, null);
    assert.equal(charge.discountAmount, null);
    assert.equal(charge.asset, 'BTC');
    assert.equal(charge.assetAmount, '0.0025');
    assert.equal(charge.receivedAmount, '0.0025');
    assert.equal(charge.remainingAmount, '0');
    assert.equal(charge.overpaid, false);
    assert.equal(charge.refundedAmount, '0.0005');
    assert.equal(charge.refunds.length, 1);
    assert.equal(charge.refunds[0]?.reason, 'Partial refund');
    assert.deepEqual(charge.refunds[0]?.createdAt, new Date('2026-09-21T14:30:00Z'));
    assert.equal(charge.exchangeRate, '60000');
    assert.equal(charge.depositAddress, 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
    assert.equal(charge.networkSurcharge, null);
    assert.equal(charge.paymentRequest, null);
    assert.equal(charge.transactions.length, 1);
    assert.equal(charge.transactions[0]?.confirmations, 3);
    assert.equal(charge.transactions[0]?.requiredConfirmations, 2);
    assert.equal(charge.transactions[0]?.credited, true);
    assert.ok(charge.transactions[0]?.explorerUrl?.startsWith('https://mempool.space/tx/'));
    assert.deepEqual(charge.timeline.map((entry) => entry.event), ['charge.created', 'charge.payment_detected', 'charge.paid']);
    assert.deepEqual(charge.timeline[2]?.time, new Date('2026-09-20T10:05:41Z'));
    assert.equal(charge.customerEmail, 'ada@example.com');
    assert.equal(charge.customerName, 'Ada Lovelace');
    assert.equal(charge.customer.email, 'ada@example.com');
    assert.equal(charge.customer.name, 'Ada Lovelace');
    assert.equal(charge.customer.ipAddress, '203.0.113.7');
    assert.ok(charge.customer.userAgent?.startsWith('Mozilla/5.0 (Macintosh;'));
    assert.equal(charge.customer.reference, 'cus_1042');
    assert.equal(charge.customer.phone, '+44 20 7946 0958');
    assert.equal(charge.customer.country, 'GB');
    assert.deepEqual(charge.customer.metadata, { orders: 7, verified: true });
    assert.deepEqual(charge.customFields, [{ label: 'Company', value: 'Analytical Engines Ltd' }]);
    assert.deepEqual(charge.metadata, { order_id: '1042' });
    assert.equal(charge.checkoutUrl, 'https://velirapay.com/c/k3v9x2m7q8wz');
    assert.equal(charge.receiptUrl, 'https://velirapay.com/c/k3v9x2m7q8wz/receipt');
    assert.deepEqual(charge.expiresAt, new Date('2026-09-20T10:25:00Z'));
    assert.deepEqual(charge.paidAt, new Date('2026-09-20T10:05:41Z'));
    assert.deepEqual(charge.createdAt, new Date('2026-09-20T09:55:00Z'));
});

test('the charges the API answers with are typed with their checkout page', async () => {
    const http = new MockFetch()
        .json({ data: fixture('charge') }, 201)
        .json({ data: fixture('charge') })
        .json(listResponse([fixture('charge')]));
    const velirapay = client(http);

    const created: string = (await velirapay.charges.create({ asset: 'BTC', amount: '150.00', currency: 'EUR' })).checkoutUrl;
    const retrieved: string = (await velirapay.charges.retrieve('k3v9x2m7q8wz')).checkoutUrl;
    const listed: string | undefined = (await velirapay.charges.list()).data[0]?.checkoutUrl;

    assert.equal(created, 'https://velirapay.com/c/k3v9x2m7q8wz');
    assert.equal(retrieved, 'https://velirapay.com/c/k3v9x2m7q8wz');
    assert.equal(listed, 'https://velirapay.com/c/k3v9x2m7q8wz');
});

test('a charge with a network surcharge or a Lightning invoice says so', () => {
    const tron = new Charge({ ...fixture('charge'), asset: 'USDT_TRON', asset_amount: '52.50', network_surcharge: '2.50' });
    const lightning = new Charge({ ...fixture('charge'), asset: 'BTC_LIGHTNING', payment_request: 'lnbc25u1p…', deposit_address: '9f86d081884c7d65' });

    assert.equal(tron.networkSurcharge, '2.50');
    assert.equal(lightning.asset, Asset.BTC_LIGHTNING);
    assert.equal(lightning.paymentRequest, 'lnbc25u1p…');
});

test("the customer's details are sent with a new charge", async () => {
    const http = new MockFetch().json({ data: fixture('charge') }, 201);
    const customer = { email: 'ada@example.com', ip_address: '203.0.113.7', user_agent: 'Mozilla/5.0', reference: 'cus_1042', country: 'GB', metadata: { orders: 7 } };

    await client(http).charges.create({ asset: 'BTC', amount: '150.00', currency: 'EUR', customer });

    assert.deepEqual((await body(http.lastRequest()) as Record<string, unknown>)['customer'], customer);
});

test('a coupon is applied to a new charge', async () => {
    const http = new MockFetch().json({ data: { ...fixture('charge'), fiat_amount: '135.00', coupon: 'SPRING10', discount_amount: '15.00' } }, 201);

    const charge = await client(http).charges.create({ payment_link: 'p4n8r2t6y1ua', asset: 'BTC', coupon: 'spring10' });

    assert.equal((await body(http.lastRequest()) as Record<string, unknown>)['coupon'], 'spring10');
    assert.equal(charge.fiatAmount, '135.00');
    assert.equal(charge.coupon, 'SPRING10');
    assert.equal(charge.discountAmount, '15.00');
});

test('a charge sent without a customer object takes it from the older fields', async () => {
    const { customer: _customer, ...attributes } = fixture('charge');
    const http = new MockFetch().json({ data: attributes });

    const charge = await client(http).charges.retrieve('k3v9x2m7q8wz');

    assert.equal(charge.customer.email, 'ada@example.com');
    assert.equal(charge.customer.name, 'Ada Lovelace');
    assert.equal(charge.customer.ipAddress, null);
    assert.deepEqual(charge.customer.metadata, {});
    assert.equal(new Charge({ customer_email: 'ada@example.com' }).customer.email, 'ada@example.com');
});

test('attributes the library does not know are kept', async () => {
    const attributes = { ...fixture('charge'), status: 'refunding', network_fee: '0.00001' };
    const http = new MockFetch().json({ data: attributes });

    const charge = await client(http).charges.retrieve('k3v9x2m7q8wz');

    assert.equal(charge.status, 'refunding');
    assert.equal(charge.isPaid(), false);
    assert.equal(charge.get('network_fee'), '0.00001');
    assert.equal(charge.get('nothing'), undefined);
    assert.deepEqual(charge.toJSON(), attributes);
    assert.equal(JSON.stringify(charge), JSON.stringify(attributes));
});

test('ids are escaped into paths', async () => {
    const http = new MockFetch().json({ data: fixture('charge') });

    await client(http).charges.retrieve('../account');

    assert.equal(pathOf(http.lastRequest()), '/v1/charges/..%2Faccount');
});

test('an empty id is refused before a request is sent', async () => {
    const http = new MockFetch();

    await assert.rejects(client(http).charges.cancel(''), (error: unknown) => error instanceof InvalidArgumentError && error.message === 'The id in /v1/charges/{id}/cancel cannot be empty.');
    await assert.rejects(client(http).charges.retrieve(' '), InvalidArgumentError);
    assert.equal(http.requests.length, 0);
});

test('a blank idempotency key is refused before a charge is created', async () => {
    const http = new MockFetch();

    await assert.rejects(client(http).charges.create({ asset: Asset.BTC, amount: '150.00', currency: 'EUR' }, { idempotencyKey: '   ' }), InvalidArgumentError);
    assert.equal(http.requests.length, 0);
});

test('an id that a URL would read as a directory is refused', async () => {
    const http = new MockFetch();

    await assert.rejects(client(http).charges.retrieve('..'), { name: 'InvalidArgumentError', message: 'The id in /v1/charges/{id} cannot be "..".' });
    await assert.rejects(client(http).webhookEndpoints.retryDelivery('12', '.'), InvalidArgumentError);
    assert.equal(http.requests.length, 0);
});

test('charges are listed with filters', async () => {
    const http = new MockFetch().json(listResponse([fixture('charge')], { currentPage: 2, lastPage: 3, perPage: 1, total: 3 }));

    const page = await client(http).charges.list({
        status: ChargeStatus.Paid,
        payment_link: 'p4n8r2t6y1ua',
        created_from: new Date('2026-10-01T00:00:00Z'),
        page: 2,
        per_page: 1,
    });

    assert.equal(pathOf(http.lastRequest()), '/v1/charges');
    assert.deepEqual(queryOf(http.lastRequest()), { status: 'paid', payment_link: 'p4n8r2t6y1ua', created_from: '2026-10-01T00:00:00.000Z', page: '2', per_page: '1' });
    assert.equal(page.data.length, 1);
    assert.ok(page.data[0] instanceof Charge);
    assert.equal(page.currentPage, 2);
    assert.equal(page.lastPage, 3);
    assert.equal(page.perPage, 1);
    assert.equal(page.total, 3);
    assert.equal(page.hasMore(), true);
});

test('a charge is canceled', async () => {
    const http = new MockFetch().json({ data: { ...fixture('charge'), status: 'canceled' } });

    const charge = await client(http).charges.cancel('k3v9x2m7q8wz', { idempotencyKey: 'cancel-1' });

    const request = http.lastRequest();
    assert.equal(request.method, 'POST');
    assert.equal(pathOf(request), '/v1/charges/k3v9x2m7q8wz/cancel');
    assert.equal(await request.text(), '');
    assert.equal(request.headers.has('Content-Type'), false);
    assert.equal(request.headers.get('Idempotency-Key'), 'cancel-1');
    assert.equal(charge.isCanceled(), true);
});

test('amounts given as numbers are sent as decimal strings, without an exponent', async () => {
    const http = new MockFetch().json({ data: fixture('charge') }, 201).json({ data: fixture('charge') }, 201).json({ data: fixture('charge') }).json({ data: fixture('charge') }, 201);
    const velirapay = client(http);

    await velirapay.charges.create({ asset: 'BTC', amount: 49.9, currency: 'EUR', metadata: { order_id: 1042, weight: 0.0000005 } });

    assert.equal(await http.lastRequest().text(), '{"asset":"BTC","amount":"49.9","currency":"EUR","metadata":{"order_id":1042,"weight":5e-7}}');

    await velirapay.charges.recordRefund('k3v9x2m7q8wz', { amount: 0.0000005, reason: 'Dust' });

    assert.deepEqual(await body(http.lastRequest()), { amount: '0.0000005', reason: 'Dust' });

    await velirapay.charges.simulate('k3v9x2m7q8wz', { amount: 1.5e21 });

    assert.deepEqual(await body(http.lastRequest()), { amount: '1500000000000000000000' });

    await velirapay.request('POST', '/v1/charges', { asset: 'BTC', amount: 0.0000005 });

    assert.equal(await http.lastRequest().text(), '{"asset":"BTC","amount":5e-7}');
});

test('amounts given as numbers are rounded to 14 significant digits, as the API read them', async () => {
    const http = new MockFetch().json({ data: fixture('charge') }, 201).json({ data: fixture('charge') }, 201).json({ data: fixture('charge') }, 201).json({ data: fixture('charge') }, 201).json({ data: fixture('charge') }, 201);
    const velirapay = client(http);

    await velirapay.charges.create({ asset: 'BTC', amount: 0.1 + 0.2, currency: 'EUR' });

    assert.deepEqual(await body(http.lastRequest()), { asset: 'BTC', amount: '0.3', currency: 'EUR' });

    await velirapay.charges.create({ asset: 'BTC', amount: 49.9 * 1.2, currency: 'EUR' });

    assert.deepEqual(await body(http.lastRequest()), { asset: 'BTC', amount: '59.88', currency: 'EUR' });

    await velirapay.charges.recordRefund('k3v9x2m7q8wz', { amount: 0.1 + 0.2 });

    assert.deepEqual(await body(http.lastRequest()), { amount: '0.3' });

    await velirapay.charges.recordRefund('k3v9x2m7q8wz', { amount: 0.1 * 3 * 0.0001 });

    assert.deepEqual(await body(http.lastRequest()), { amount: '0.00003' });

    await velirapay.charges.create({ asset: 'BTC', amount: 123456789012345, currency: 'EUR' });

    assert.deepEqual(await body(http.lastRequest()), { asset: 'BTC', amount: '123456789012345', currency: 'EUR' });
});

test('an amount with a fraction and too many digits to round is refused before anything is sent', async () => {
    const http = new MockFetch();

    await assert.rejects(client(http).charges.create({ asset: 'BTC', amount: 123456789012345.6, currency: 'EUR' }), { name: 'InvalidArgumentError', message: /pass it as a string/ });
    assert.equal(http.requests.length, 0);
});

test('an amount that is not a finite number is refused before anything is sent', async () => {
    const http = new MockFetch();

    await assert.rejects(client(http).charges.recordRefund('k3v9x2m7q8wz', { amount: Number.NaN }), { name: 'InvalidArgumentError', message: /amount/ });
    await assert.rejects(client(http).charges.create({ asset: 'BTC', amount: Number.POSITIVE_INFINITY, currency: 'EUR' }), InvalidArgumentError);
    assert.equal(http.requests.length, 0);
});

test('a refund is recorded', async () => {
    const http = new MockFetch().json({ data: fixture('charge') }, 201);

    await client(http).charges.recordRefund('k3v9x2m7q8wz', { amount: '0.0005', txid: 'c1f0e2d3', reason: 'Partial refund' });

    const request = http.lastRequest();
    assert.equal(request.method, 'POST');
    assert.equal(pathOf(request), '/v1/charges/k3v9x2m7q8wz/refunds');
    assert.deepEqual(await body(request), { amount: '0.0005', txid: 'c1f0e2d3', reason: 'Partial refund' });
});
