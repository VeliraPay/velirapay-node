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
        send_email: true,
    });

    const request = http.lastRequest();
    const sent = await body(request) as Record<string, unknown>;
    assert.equal(request.method, 'POST');
    assert.equal(pathOf(request), '/v1/invoices');
    assert.equal(sent['due_at'], '2026-10-15');
    assert.equal(sent['send_email'], true);
    assert.equal(invoice.id, 'w7c2h5j9d3kx');
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
    assert.equal(invoice.hostedUrl, 'https://velirapay.com/i/w7c2h5j9d3kx');
    assert.equal(invoice.documentUrl, 'https://velirapay.com/i/w7c2h5j9d3kx/document');
    assert.deepEqual(invoice.charges, [{ id: 'm2q7w4e9r1ty', status: 'expired', asset: 'ETH' }]);
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
