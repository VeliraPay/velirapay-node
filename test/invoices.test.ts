import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Invoice, InvoiceStatus } from '../src/index.ts';
import { body, client, fixture, listResponse, MockFetch, pathOf, queryOf } from './support.ts';

test('an invoice is created', async () => {
    const http = new MockFetch().json({ data: fixture('invoice') }, 201);

    const invoice = await client(http).invoices.create({
        customer_name: 'Grace Hopper',
        customer_email: 'grace@example.com',
        currency: 'USD',
        items: [
            { description: 'Consulting', quantity: 10, unit_amount: '100.00' },
            { description: 'Hosting', quantity: '2.5', unit_amount: '100.00' },
        ],
        due_at: '2026-10-15',
        expires_at: new Date('2026-10-31T23:59:59Z'),
        success_url: 'https://example.com/orders/1042',
        cancel_url: 'https://example.com/checkout',
        success_message: 'Thanks, Grace. Your hosting is renewed.',
        send_email: true,
    });

    const request = http.lastRequest();
    const sent = await body(request) as Record<string, unknown>;
    assert.equal(request.method, 'POST');
    assert.equal(pathOf(request), '/v1/invoices');
    assert.deepEqual(sent['items'], [
        { description: 'Consulting', quantity: '10', unit_amount: '100.00' },
        { description: 'Hosting', quantity: '2.5', unit_amount: '100.00' },
    ]);
    assert.equal(sent['due_at'], '2026-10-15');
    assert.equal(sent['expires_at'], '2026-10-31T23:59:59.000Z');
    assert.equal(sent['send_email'], true);
    assert.equal(sent['success_url'], 'https://example.com/orders/1042');
    assert.equal(sent['cancel_url'], 'https://example.com/checkout');
    assert.equal(sent['success_message'], 'Thanks, Grace. Your hosting is renewed.');
    assert.equal(invoice.id, 'w7c2h5j9d3kx');
});

test('an invoice that names its customer by a username alone is created without an email', async () => {
    const http = new MockFetch().json({ data: { ...fixture('invoice'), customer_name: 'buyer_1042', customer_email: null } }, 201);

    const invoice = await client(http).invoices.create({ customer_name: 'buyer_1042', currency: 'USD', amount: '99.99', expires_at: '2026-12-31' });

    assert.deepEqual(await body(http.lastRequest()), { customer_name: 'buyer_1042', currency: 'USD', amount: '99.99', expires_at: '2026-12-31' });
    assert.equal(invoice.customerName, 'buyer_1042');
    assert.equal(invoice.customerEmail, null);
});

test('an invoice is created with tax on its lines and a discount, numbers sent as decimal strings', async () => {
    const http = new MockFetch().json({ data: fixture('invoice') }, 201).json({ data: fixture('invoice') }, 201);
    const velirapay = client(http);

    await velirapay.invoices.create({
        customer_name: 'Grace Hopper',
        currency: 'USD',
        items: [
            { description: 'Consulting', quantity: '10', unit_amount: '100.00', tax_rate: 20 },
            { description: 'Hosting', quantity: '2.5', unit_amount: '100.00', tax_rate: '5.5' },
            { description: 'Setup', quantity: '1', unit_amount: '50.00', tax_rate: null },
        ],
        discount_percent: 12.5,
    });

    assert.deepEqual(await body(http.lastRequest()), {
        customer_name: 'Grace Hopper',
        currency: 'USD',
        items: [
            { description: 'Consulting', quantity: '10', unit_amount: '100.00', tax_rate: '20' },
            { description: 'Hosting', quantity: '2.5', unit_amount: '100.00', tax_rate: '5.5' },
            { description: 'Setup', quantity: '1', unit_amount: '50.00', tax_rate: null },
        ],
        discount_percent: '12.5',
    });

    await velirapay.invoices.create({ customer_name: 'Grace Hopper', currency: 'USD', items: [{ description: 'Consulting', quantity: 10, unit_amount: '100.00' }], discount_amount: 0.1 + 0.2, discount_percent: null });

    assert.deepEqual(await body(http.lastRequest()), {
        customer_name: 'Grace Hopper',
        currency: 'USD',
        items: [{ description: 'Consulting', quantity: '10', unit_amount: '100.00' }],
        discount_amount: '0.3',
        discount_percent: null,
    });
});

test("an invoice's subtotal, discount and tax are read, and are null for an invoice without them", async () => {
    const http = new MockFetch().json({
        data: {
            ...fixture('invoice'),
            amount: '1188.00',
            subtotal: '1250.00',
            discount: '125.00',
            discount_percent: '10.00',
            tax: '63.00',
            items: [
                { description: 'Consulting', quantity: '10', unit_amount: '100.00', tax_rate: '7.00', total: '1000.00' },
                { description: 'Hosting', quantity: '2.5', unit_amount: '100.00', tax_rate: null, total: '250.00' },
            ],
        },
    });

    const invoice = await client(http).invoices.retrieve('w7c2h5j9d3kx');

    assert.equal(invoice.amount, '1188.00');
    assert.equal(invoice.subtotal, '1250.00');
    assert.equal(invoice.discount, '125.00');
    assert.equal(invoice.discountPercent, '10.00');
    assert.equal(invoice.tax, '63.00');
    assert.equal(invoice.items[0]?.taxRate, '7.00');
    assert.equal(invoice.items[1]?.taxRate, null);

    const plain = new Invoice(fixture('invoice'));

    assert.equal(plain.subtotal, null);
    assert.equal(plain.discount, null);
    assert.equal(plain.discountPercent, null);
    assert.equal(plain.tax, null);
    assert.equal(plain.items[0]?.taxRate, null);
});

test("an invoice's total given as a number is sent as a decimal string", async () => {
    const http = new MockFetch().json({ data: fixture('invoice') }, 201);

    await client(http).invoices.create({ customer_name: 'Grace Hopper', customer_email: 'grace@example.com', currency: 'USD', amount: 1250.5 });

    assert.deepEqual(await body(http.lastRequest()), { customer_name: 'Grace Hopper', customer_email: 'grace@example.com', currency: 'USD', amount: '1250.5' });
});

test('an invoice is read into typed properties', async () => {
    const http = new MockFetch().json({ data: fixture('invoice') });

    const invoice = await client(http).invoices.retrieve('w7c2h5j9d3kx');

    assert.equal(pathOf(http.lastRequest()), '/v1/invoices/w7c2h5j9d3kx');
    assert.equal(invoice.number, 'INV-0042');
    assert.equal(invoice.status, InvoiceStatus.Open);
    assert.equal(invoice.isOpen(), true);
    assert.equal(invoice.overdue, false);
    assert.equal(invoice.customerName, 'Grace Hopper');
    assert.equal(invoice.customerEmail, 'grace@example.com');
    assert.equal(invoice.memo, 'Thanks for your business.');
    assert.equal(invoice.amount, '1250.00');
    assert.equal(invoice.items.length, 2);
    assert.equal(invoice.items[1]?.quantity, '2.5');
    assert.equal(invoice.items[1]?.unitAmount, '100.00');
    assert.equal(invoice.items[1]?.total, '250.00');
    assert.deepEqual(invoice.dueAt, new Date('2026-10-15T00:00:00Z'));
    assert.deepEqual(invoice.expiresAt, new Date('2026-10-31T23:59:59Z'));
    assert.equal(invoice.hostedUrl, 'https://velirapay.com/i/w7c2h5j9d3kx');
    assert.equal(invoice.documentUrl, 'https://velirapay.com/i/w7c2h5j9d3kx/document');
    assert.equal(invoice.successUrl, 'https://example.com/orders/1042');
    assert.equal(invoice.cancelUrl, null);
    assert.equal(invoice.successMessage, 'Thanks, Grace. Your hosting is renewed.');
    assert.deepEqual(invoice.charges, [{ id: 'm2q7w4e9r1ty', status: 'expired', asset: 'ETH', paidAt: null, acceptedAt: null }]);
    assert.deepEqual(invoice.sentAt, new Date('2026-09-21T08:00:00Z'));
    assert.equal(invoice.paidAt, null);
});

test('an invoice is sent and voided', async () => {
    const http = new MockFetch().json({ data: fixture('invoice') }).json({ data: { ...fixture('invoice'), status: 'void' } });
    const velirapay = client(http);

    await velirapay.invoices.send('w7c2h5j9d3kx');

    assert.equal(http.lastRequest().method, 'POST');
    assert.equal(pathOf(http.lastRequest()), '/v1/invoices/w7c2h5j9d3kx/send');

    const invoice = await velirapay.invoices.void('w7c2h5j9d3kx');

    assert.equal(http.lastRequest().method, 'POST');
    assert.equal(pathOf(http.lastRequest()), '/v1/invoices/w7c2h5j9d3kx/void');
    assert.equal(invoice.isVoid(), true);
});

test('invoices are listed by status, and overdue ones on their own', async () => {
    const http = new MockFetch().json(listResponse([fixture('invoice')])).json(listResponse([]));
    const velirapay = client(http);

    const page = await velirapay.invoices.list({ status: InvoiceStatus.Open });

    assert.deepEqual(queryOf(http.lastRequest()), { status: 'open' });
    assert.ok(page.data[0] instanceof Invoice);

    await velirapay.invoices.list({ overdue: true, search: 'grace@example.com' });

    assert.deepEqual(queryOf(http.lastRequest()), { overdue: '1', search: 'grace@example.com' });
});
