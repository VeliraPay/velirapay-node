import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InvalidArgumentError, Refund, RefundRequest, RefundRequestStatus } from '../src/index.ts';
import { body, client, fixture, listResponse, MockFetch, pathOf, queryOf } from './support.ts';

/** A refund request that waits for the customer to give the address. */
function awaitingAddress(): Record<string, unknown> {
    return {
        ...fixture('refund_request'),
        status: 'awaiting_address',
        address: null,
        address_given_by: null,
        address_url: 'https://velirapay.com/r/r5t8y2u6i9op?expires=1791297000&signature=0f3c',
        txid: null,
        detected_amount: null,
        confirmations: null,
        refund: null,
        completed_at: null,
    };
}

test("a charge's refund requests are listed", async () => {
    const http = new MockFetch().json(listResponse([fixture('refund_request'), awaitingAddress()], { currentPage: 2, lastPage: 2, perPage: 2, total: 4 }));

    const page = await client(http).charges.refundRequests('k3v9x2m7q8wz', { page: 2, per_page: 2 });

    const request = http.lastRequest();
    assert.equal(request.method, 'GET');
    assert.equal(pathOf(request), '/v1/charges/k3v9x2m7q8wz/refund-requests');
    assert.deepEqual(queryOf(request), { page: '2', per_page: '2' });
    assert.equal(page.data.length, 2);
    assert.ok(page.data[0] instanceof RefundRequest);
    assert.equal(page.data[1]?.status, RefundRequestStatus.AwaitingAddress);
    assert.equal(page.currentPage, 2);
    assert.equal(page.total, 4);
    assert.equal(page.hasMore(), false);
});

test('a refund request is read into typed properties', async () => {
    const http = new MockFetch().json({ data: fixture('refund_request') });

    const refundRequest = await client(http).charges.retrieveRefundRequest('k3v9x2m7q8wz', 'r5t8y2u6i9op');

    assert.equal(http.lastRequest().method, 'GET');
    assert.equal(pathOf(http.lastRequest()), '/v1/charges/k3v9x2m7q8wz/refund-requests/r5t8y2u6i9op');
    assert.ok(refundRequest instanceof RefundRequest);
    assert.equal(refundRequest.id, 'r5t8y2u6i9op');
    assert.equal(refundRequest.charge, 'k3v9x2m7q8wz');
    assert.equal(refundRequest.status, RefundRequestStatus.Refunded);
    assert.equal(refundRequest.isRefunded(), true);
    assert.equal(refundRequest.isOpen(), false);
    assert.equal(refundRequest.amount, '0.0005');
    assert.equal(refundRequest.reason, 'Returned order');
    assert.equal(refundRequest.address, 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
    assert.equal(refundRequest.addressGivenBy, 'customer');
    assert.equal(refundRequest.addressUrl, null);
    assert.deepEqual(refundRequest.linkExpiresAt, new Date('2026-10-05T14:30:00Z'));
    assert.deepEqual(refundRequest.emailedAt, new Date('2026-09-21T14:30:02Z'));
    assert.equal(refundRequest.txid, 'e4b2a1c3d5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90');
    assert.equal(refundRequest.detectedAmount, '0.0005');
    assert.equal(refundRequest.confirmations, 3);
    assert.deepEqual(refundRequest.createdAt, new Date('2026-09-21T14:30:00Z'));
    assert.deepEqual(refundRequest.completedAt, new Date('2026-09-22T09:12:40Z'));
    assert.equal(refundRequest.canceledAt, null);

    const refund = refundRequest.refund;
    assert.ok(refund instanceof Refund);
    assert.equal(refund.amount, '0.0005');
    assert.equal(refund.number, 'CN-0001');
    assert.equal(refund.fiatAmount, '30.00');
    assert.equal(refund.creditNoteUrl, 'https://velirapay.com/c/k3v9x2m7q8wz/credit-notes/CN-0001');
    assert.deepEqual(refund.confirmedOnChainAt, new Date('2026-09-22T09:12:40Z'));
    assert.deepEqual(refundRequest.toJSON(), fixture('refund_request'));
});

test('a refund request waiting for the address has no refund, transfer or confirmations yet', () => {
    const refundRequest = new RefundRequest(awaitingAddress());

    assert.equal(refundRequest.isAwaitingAddress(), true);
    assert.equal(refundRequest.isOpen(), true);
    assert.equal(refundRequest.address, null);
    assert.equal(refundRequest.addressGivenBy, null);
    assert.equal(refundRequest.addressUrl, 'https://velirapay.com/r/r5t8y2u6i9op?expires=1791297000&signature=0f3c');
    assert.equal(refundRequest.txid, null);
    assert.equal(refundRequest.detectedAmount, null);
    assert.equal(refundRequest.confirmations, null);
    assert.equal(refundRequest.refund, null);
    assert.equal(refundRequest.completedAt, null);
});

test('each status of a refund request has its helper, and only the first three are open', () => {
    const helpers = {
        awaiting_address: 'isAwaitingAddress',
        awaiting_transfer: 'isAwaitingTransfer',
        confirming: 'isConfirming',
        refunded: 'isRefunded',
        canceled: 'isCanceled',
        expired: 'isExpired',
    } as const;

    assert.deepEqual(Object.keys(helpers), Object.values(RefundRequestStatus));

    for (const [status, helper] of Object.entries(helpers)) {
        const refundRequest = new RefundRequest({ ...fixture('refund_request'), status });

        for (const other of Object.values(helpers)) {
            assert.equal(refundRequest[other](), other === helper, `${status} ${other}()`);
        }

        assert.equal(refundRequest.isOpen(), ['awaiting_address', 'awaiting_transfer', 'confirming'].includes(status), `${status} isOpen()`);
    }

    const unknown = new RefundRequest({ ...fixture('refund_request'), status: 'on_hold' });

    assert.equal(unknown.status, 'on_hold');
    assert.equal(unknown.isOpen(), false);
});

test('a refund is started, the customer being asked for the address', async () => {
    const http = new MockFetch().json({ data: awaitingAddress() }, 201);

    const refundRequest = await client(http).charges.startRefund('k3v9x2m7q8wz', { amount: '0.0005', reason: 'Returned order' }, { idempotencyKey: 'refund-1042' });

    const request = http.lastRequest();
    assert.equal(request.method, 'POST');
    assert.equal(pathOf(request), '/v1/charges/k3v9x2m7q8wz/refund-requests');
    assert.equal(request.headers.get('Content-Type'), 'application/json');
    assert.equal(request.headers.get('Idempotency-Key'), 'refund-1042');
    assert.deepEqual(await body(request), { amount: '0.0005', reason: 'Returned order' });
    assert.ok(refundRequest instanceof RefundRequest);
    assert.equal(refundRequest.isAwaitingAddress(), true);
});

test('a refund is started to an address the customer already gave, with its amount given as a number sent as a decimal string', async () => {
    const http = new MockFetch().json({ data: { ...fixture('refund_request'), status: 'awaiting_transfer', address_given_by: 'merchant', refund: null } }, 201);

    const refundRequest = await client(http).charges.startRefund('k3v9x2m7q8wz', { amount: 0.0000005, address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' });

    assert.deepEqual(await body(http.lastRequest()), { amount: '0.0000005', address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' });
    assert.equal(refundRequest.isAwaitingTransfer(), true);
    assert.equal(refundRequest.addressGivenBy, 'merchant');
});

test("a refund is given the customer's address", async () => {
    const http = new MockFetch().json({ data: { ...fixture('refund_request'), status: 'awaiting_transfer', address_given_by: 'merchant', refund: null } });

    const refundRequest = await client(http).charges.setRefundAddress('k3v9x2m7q8wz', 'r5t8y2u6i9op', { address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }, { idempotencyKey: 'refund-1042-address' });

    const request = http.lastRequest();
    assert.equal(request.method, 'POST');
    assert.equal(pathOf(request), '/v1/charges/k3v9x2m7q8wz/refund-requests/r5t8y2u6i9op/address');
    assert.equal(request.headers.get('Idempotency-Key'), 'refund-1042-address');
    assert.deepEqual(await body(request), { address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' });
    assert.equal(refundRequest.address, 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
});

test('a refund is marked as sent with the hash of its transaction', async () => {
    const http = new MockFetch().json({ data: { ...fixture('refund_request'), status: 'confirming', confirmations: 0, refund: null } });

    const refundRequest = await client(http).charges.markRefundSent('k3v9x2m7q8wz', 'r5t8y2u6i9op', { txid: 'e4b2a1c3d5f6' }, { idempotencyKey: 'refund-1042-sent' });

    const request = http.lastRequest();
    assert.equal(request.method, 'POST');
    assert.equal(pathOf(request), '/v1/charges/k3v9x2m7q8wz/refund-requests/r5t8y2u6i9op/sent');
    assert.equal(request.headers.get('Idempotency-Key'), 'refund-1042-sent');
    assert.deepEqual(await body(request), { txid: 'e4b2a1c3d5f6' });
    assert.equal(refundRequest.isConfirming(), true);
    assert.equal(refundRequest.confirmations, 0);
});

test('a refund is completed on your word, with or without its transaction', async () => {
    const http = new MockFetch().json({ data: fixture('refund_request') }).json({ data: fixture('refund_request') });
    const velirapay = client(http);

    const refundRequest = await velirapay.charges.completeRefund('k3v9x2m7q8wz', 'r5t8y2u6i9op', {}, { idempotencyKey: 'refund-1042-complete' });

    const request = http.lastRequest();
    assert.equal(request.method, 'POST');
    assert.equal(pathOf(request), '/v1/charges/k3v9x2m7q8wz/refund-requests/r5t8y2u6i9op/complete');
    assert.equal(await request.text(), '');
    assert.equal(request.headers.has('Content-Type'), false);
    assert.equal(request.headers.get('Idempotency-Key'), 'refund-1042-complete');
    assert.equal(refundRequest.isRefunded(), true);

    await velirapay.charges.completeRefund('k3v9x2m7q8wz', 'r5t8y2u6i9op', { txid: 'e4b2a1c3d5f6' });

    assert.deepEqual(await body(http.lastRequest()), { txid: 'e4b2a1c3d5f6' });
});

test("a refund's link is emailed again, and a refund is canceled", async () => {
    const http = new MockFetch().json({ data: awaitingAddress() }).json({ data: { ...awaitingAddress(), status: 'canceled', address_url: null, canceled_at: '2026-09-23T08:00:00.000000Z' } });
    const velirapay = client(http);

    await velirapay.charges.resendRefundLink('k3v9x2m7q8wz', 'r5t8y2u6i9op', { idempotencyKey: 'refund-1042-resend' });

    let request = http.lastRequest();
    assert.equal(request.method, 'POST');
    assert.equal(pathOf(request), '/v1/charges/k3v9x2m7q8wz/refund-requests/r5t8y2u6i9op/resend');
    assert.equal(await request.text(), '');
    assert.equal(request.headers.get('Idempotency-Key'), 'refund-1042-resend');

    const canceled = await velirapay.charges.cancelRefund('k3v9x2m7q8wz', 'r5t8y2u6i9op', { idempotencyKey: 'refund-1042-cancel' });

    request = http.lastRequest();
    assert.equal(request.method, 'POST');
    assert.equal(pathOf(request), '/v1/charges/k3v9x2m7q8wz/refund-requests/r5t8y2u6i9op/cancel');
    assert.equal(await request.text(), '');
    assert.equal(request.headers.get('Idempotency-Key'), 'refund-1042-cancel');
    assert.equal(canceled.isCanceled(), true);
    assert.equal(canceled.addressUrl, null);
    assert.deepEqual(canceled.canceledAt, new Date('2026-09-23T08:00:00Z'));
});

test("both ids are escaped into a refund request's path, and an empty one is refused before a request is sent", async () => {
    const http = new MockFetch().json({ data: fixture('refund_request') });
    const velirapay = client(http);

    await velirapay.charges.retrieveRefundRequest('../account', 'r5/t8');

    assert.equal(pathOf(http.lastRequest()), '/v1/charges/..%2Faccount/refund-requests/r5%2Ft8');

    await assert.rejects(velirapay.charges.cancelRefund('k3v9x2m7q8wz', ''), (error: unknown) => error instanceof InvalidArgumentError && error.message === 'The id in /v1/charges/{id}/refund-requests/{id}/cancel cannot be empty.');
    await assert.rejects(velirapay.charges.markRefundSent('k3v9x2m7q8wz', '..', { txid: 'e4b2a1c3d5f6' }), InvalidArgumentError);
    await assert.rejects(velirapay.charges.refundRequests(' '), InvalidArgumentError);
    assert.equal(http.requests.length, 1);
});
