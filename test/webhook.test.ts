import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventType, InvalidArgumentError, SignatureVerificationError, Webhook, WebhookEvent } from '../src/index.ts';
import { payload } from './support.ts';

const SECRET = 'whsec_2b7Qf9LkXw3NcR8vT1mZ5pYs0HdJ4gUe6AoKiVbE';

/** Construct the event of a fixture, signed now. */
function signed(name: string): WebhookEvent {
    const raw = payload(name);

    return Webhook.constructEvent(raw, Webhook.signatureHeader(raw, SECRET), SECRET);
}

test('a signed charge delivery is verified and parsed', () => {
    const event = signed('webhook_charge');

    assert.equal(event.id, '5f0c6f5e-8d1b-4a53-9a57-3c2b1d0e9f87');
    assert.equal(event.eventId, '9b1f7a3e-2c4d-4e8f-a6b0-1d2c3e4f5a6b');
    assert.equal(event.type, 'charge.paid');
    assert.equal(event.is(EventType.ChargePaid), true);
    assert.equal(event.isLiveMode(), true);
    assert.equal(event.test, false);
    assert.deepEqual(event.createdAt, new Date('2026-09-20T10:05:42Z'));
    assert.equal(event.invoice, null);
    assert.equal(event.transaction, null);

    const charge = event.charge;
    assert.ok(charge !== null);
    assert.equal(charge.id, 'k3v9x2m7q8wz');
    assert.equal(charge.isPaid(), true);
    assert.equal(charge.paymentLink, 'p4n8r2t6y1ua');
    assert.equal(charge.paymentLinkTitle, 'Pro plan');
    assert.equal(charge.invoice, null);
    assert.equal(charge.invoiceNumber, null);
    assert.equal(charge.assetAmount, '0.002500000000000000');
    assert.equal(charge.transactions[0]?.confirmations, 2);
    assert.equal(charge.transactions[0]?.requiredConfirmations, 2);
    assert.equal(charge.customer.ipAddress, '203.0.113.7');
    assert.equal(charge.customer.ipCountry, 'DE');
    assert.equal(charge.customer.ipAsn, 24940);
    assert.equal(charge.customer.ipNetwork, 'Hetzner Online GmbH');
    assert.equal(charge.customer.email, 'ada@example.com');
    assert.deepEqual(charge.customer.metadata, {});
    assert.deepEqual(charge.metadata, { order_id: '1042' });
    assert.deepEqual(charge.refunds, []);
    assert.equal(charge.checkoutUrl, null);

    // @ts-expect-error A charge in a webhook has no checkout page, so its checkoutUrl stays string | null.
    const checkoutUrl: string = charge.checkoutUrl;
    assert.equal(checkoutUrl, null);
});

test("a delivery whose customer leaves out the IP address's country and network reads them as null", () => {
    const delivery = JSON.parse(payload('webhook_charge')) as { data: { charge: { customer: Record<string, unknown> } } };
    const { ip_country: _country, ip_asn: _asn, ip_network: _network, ...customer } = delivery.data.charge.customer;
    delivery.data.charge.customer = customer;
    const raw = JSON.stringify(delivery);

    const charge = Webhook.constructEvent(raw, Webhook.signatureHeader(raw, SECRET), SECRET).charge;

    assert.ok(charge !== null);
    assert.equal(charge.customer.ipAddress, '203.0.113.7');
    assert.equal(charge.customer.ipCountry, null);
    assert.equal(charge.customer.ipAsn, null);
    assert.equal(charge.customer.ipNetwork, null);
});

test('a charge that paid an invoice names the invoice', () => {
    const charge = signed('webhook_invoice_charge').charge;

    assert.ok(charge !== null);
    assert.equal(charge.invoice, 'w7c2h5j9d3kx');
    assert.equal(charge.invoiceNumber, 'INV-0042');
    assert.equal(charge.paymentLink, null);
    assert.equal(charge.paymentLinkTitle, null);
    assert.deepEqual(charge.metadata, {});
});

test('a payment detected delivery carries the transfer that was seen', () => {
    const event = signed('webhook_payment_detected');

    assert.equal(event.is(EventType.ChargePaymentDetected), true);
    assert.equal(event.charge?.isPending(), true);

    const transaction = event.transaction;
    assert.ok(transaction !== null);
    assert.equal(transaction.txid, '7d1c5e9a3b2f8e6d4c0a9b8e7f6d5c4b3a2918f7e6d5c4b3a29180f7e6d5c4b3');
    assert.equal(transaction.amount, '0.002500000000000000');
    assert.equal(transaction.confirmations, 0);
    assert.equal(transaction.requiredConfirmations, 2);
    assert.equal(transaction.credited, false);
    assert.ok(transaction.explorerUrl?.startsWith('https://mempool.space/tx/'));
    assert.deepEqual(transaction.seenAt, new Date('2026-09-20T09:58:12Z'));
});

test('a payout delivery carries the charge and its payout', () => {
    const event = signed('webhook_payout');

    assert.equal(event.is(EventType.PayoutConfirmed), true);
    assert.equal(event.charge?.id, 'k3v9x2m7q8wz');
    assert.equal(event.transaction, null);

    const payout = event.payout;
    assert.ok(payout !== null);
    assert.equal(payout.charge, 'k3v9x2m7q8wz');
    assert.equal(payout.isSent(), true);
    assert.equal(payout.sentAmount, '0.002425');
    assert.equal(payout.networkFee, '0.0000044');
    assert.equal(payout.payoutTxid, 'cc9a3e0b5629235194a6174d805c55df5554c94e2b4de8dc584db2091cc5cacf');
    assert.deepEqual(payout.confirmedAt, new Date('2026-09-20T10:41:02Z'));
});

test('only a payout delivery carries a payout', () => {
    assert.equal(signed('webhook_charge').payout, null);
});

test('a signed invoice delivery is parsed', () => {
    const event = signed('webhook_invoice');

    assert.equal(event.type, 'invoice.paid');
    assert.equal(event.isLiveMode(), false);
    assert.equal(event.charge, null);

    const invoice = event.invoice;
    assert.ok(invoice !== null);
    assert.equal(invoice.id, 'w7c2h5j9d3kx');
    assert.equal(invoice.isPaid(), true);
    assert.equal(invoice.overdue, null);
    assert.equal(invoice.documentUrl, null);
    assert.equal(invoice.successUrl, null);
    assert.deepEqual(invoice.charges.map((charge) => charge.id), ['m2q7w4e9r1ty', 'z8x6c4v2b0nm']);
    assert.deepEqual(invoice.dueAt, new Date('2026-10-15T00:00:00Z'));
});

test('signatures made by VeliraPay are accepted', () => {
    const raw = '{"id":"5f0c6f5e-8d1b-4a53-9a57-3c2b1d0e9f87","event_id":"9b1f7a3e-2c4d-4e8f-a6b0-1d2c3e4f5a6b","event":"charge.paid","mode":"live","created_at":"2026-09-20T10:05:42.000000Z","data":{"charge":{"code":"k3v9x2m7q8wz","status":"paid"}}}';
    const header = 't=1790000000,v1=a7a0dd3b10e4302cf840472806bb1c3a75453b7f8a6975c6475f92d58826df35';

    Webhook.verifySignature(raw, header, SECRET, 300, 1790000060);
    Webhook.verifySignature(Buffer.from(raw), header, SECRET, 300, 1790000060);

    assert.equal(Webhook.signatureHeader(raw, SECRET, 1790000000), header);
});

test('the bytes of the body are signed, whether given as a string or a Buffer', () => {
    const raw = payload('webhook_charge').replace('Pro plan, 1 year', 'Zoë’s plan, 1 year');
    const header = Webhook.signatureHeader(raw, SECRET);

    assert.equal(Webhook.signatureHeader(Buffer.from(raw, 'utf8'), SECRET, Number(header.slice(2, header.indexOf(',')))), header);
    assert.equal(Webhook.constructEvent(Buffer.from(raw, 'utf8'), header, SECRET).charge?.description, 'Zoë’s plan, 1 year');
    assert.equal(Webhook.constructEvent(new Uint8Array(Buffer.from(raw, 'utf8')), header, SECRET).id, '5f0c6f5e-8d1b-4a53-9a57-3c2b1d0e9f87');
});

test('a changed payload is rejected', () => {
    const raw = payload('webhook_charge');
    const header = Webhook.signatureHeader(raw, SECRET);

    assert.throws(() => Webhook.constructEvent(raw.replace('150.00', '1.00'), header, SECRET), SignatureVerificationError);
});

test('a signature made with another secret is rejected', () => {
    const raw = payload('webhook_charge');

    assert.throws(() => Webhook.constructEvent(raw, Webhook.signatureHeader(raw, 'whsec_other'), SECRET), { name: 'SignatureVerificationError', message: /does not match/ });
});

test('an old signature is rejected unless the tolerance is off', () => {
    const raw = payload('webhook_charge');
    const header = Webhook.signatureHeader(raw, SECRET, Math.floor(Date.now() / 1000) - 301);

    Webhook.verifySignature(raw, header, SECRET, 0);

    assert.throws(() => Webhook.verifySignature(raw, header, SECRET), { name: 'SignatureVerificationError', message: /more than the 300 allowed/ });
});

test('a signature from the future is held to the same tolerance', () => {
    const raw = payload('webhook_charge');
    const header = Webhook.signatureHeader(raw, SECRET, 1790000000);

    Webhook.verifySignature(raw, header, SECRET, 300, 1790000000 - 300);

    assert.throws(() => Webhook.verifySignature(raw, header, SECRET, 300, 1790000000 - 301), { message: 'The signature is 301 seconds away from now, more than the 300 allowed.' });
});

test('one matching signature among several is enough', () => {
    const raw = payload('webhook_charge');
    const [timestamp, signature] = Webhook.signatureHeader(raw, SECRET).split(',');

    const event = Webhook.constructEvent(raw, `${timestamp},v1=${'0'.repeat(64)},${signature}`, SECRET);

    assert.equal(event.type, 'charge.paid');
});

test('during a secret rotation, either secret verifies the delivery', () => {
    const raw = payload('webhook_charge');
    const previousSecret = 'whsec_previousXw3NcR8vT1mZ5pYs0HdJ4gUe6AoKiVbE';
    const [timestamp, newSignature] = Webhook.signatureHeader(raw, SECRET, 1790000000).split(',');
    const [, oldSignature] = Webhook.signatureHeader(raw, previousSecret, 1790000000).split(',');
    const header = `${timestamp},${newSignature},${oldSignature}`;

    Webhook.verifySignature(raw, header, SECRET, 300, 1790000010);
    Webhook.verifySignature(raw, header, previousSecret, 300, 1790000010);

    assert.throws(() => Webhook.verifySignature(raw, header, 'whsec_neither', 300, 1790000010), SignatureVerificationError);
});

test('a signature of another length is a mismatch rather than a crash', () => {
    const raw = payload('webhook_charge');
    const [timestamp, signature] = Webhook.signatureHeader(raw, SECRET).split(',');

    for (const given of ['v1=abc', `${signature}00`, `${signature!.slice(0, -1)}`, `v1=${signature!.slice(3).toUpperCase()}`]) {
        assert.throws(() => Webhook.constructEvent(raw, `${timestamp},${given}`, SECRET), { name: 'SignatureVerificationError', message: /does not match/ });
    }
});

test('a negative signature tolerance is a configuration error', () => {
    const raw = payload('webhook_charge');
    const header = Webhook.signatureHeader(raw, SECRET, 1790000000);

    assert.throws(() => Webhook.verifySignature(raw, header, SECRET, -1, 1790000301), (error: unknown) => error instanceof InvalidArgumentError && error.message.includes('tolerance cannot be negative'));
});

for (const [header, message] of [
    [null, 'header is missing'],
    [undefined, 'header is missing'],
    ['', 'header is missing'],
    ['garbage', 'has no timestamp'],
    ['t=yesterday,v1=abc', 'has no timestamp'],
    ['t=1790000000', 'has no v1 signature'],
    ['t=1790000000,v0=abc', 'has no v1 signature'],
] as const) {
    test(`a malformed header is rejected: ${JSON.stringify(header)}`, () => {
        assert.throws(() => Webhook.constructEvent(payload('webhook_charge'), header, SECRET), (error: unknown) => error instanceof SignatureVerificationError && error.message.includes(message));
    });
}

test('a header given as a list of values is read', () => {
    const raw = payload('webhook_charge');
    const [timestamp, signature] = Webhook.signatureHeader(raw, SECRET).split(',');

    assert.equal(Webhook.constructEvent(raw, [timestamp!, signature!], SECRET).type, 'charge.paid');
});

test('an empty secret is a configuration error', () => {
    const raw = payload('webhook_charge');

    assert.throws(() => Webhook.constructEvent(raw, Webhook.signatureHeader(raw, ''), ''), InvalidArgumentError);
});

test('a body that was already parsed is refused', () => {
    const raw = payload('webhook_charge');

    assert.throws(() => Webhook.constructEvent(JSON.parse(raw) as string, Webhook.signatureHeader(raw, SECRET), SECRET), { name: 'InvalidArgumentError', message: /raw request body/ });
});

test('a Fetch API request is verified and parsed', async () => {
    const raw = payload('webhook_charge');
    const request = new Request('https://shop.example/webhooks/velirapay', {
        method: 'POST',
        headers: {
            [Webhook.SIGNATURE_HEADER]: Webhook.signatureHeader(raw, SECRET),
            [Webhook.EVENT_HEADER]: 'charge.paid',
            [Webhook.DELIVERY_HEADER]: '5f0c6f5e-8d1b-4a53-9a57-3c2b1d0e9f87',
        },
        body: raw,
    });

    const event = await Webhook.constructEventFromRequest(request, SECRET);

    assert.equal(event.id, '5f0c6f5e-8d1b-4a53-9a57-3c2b1d0e9f87');
});

test('test deliveries from the dashboard are flagged', () => {
    const raw = '{"id":"3c9e1f7a-5b2d-4e8c-9a1f-7b3d5e9c1a2f","event":"charge.paid","test":true,"mode":"test","created_at":"2026-09-24T09:00:00.000000Z","data":{"charge":{"code":"testab12cd34","status":"paid"}}}';

    const event = Webhook.constructEvent(raw, Webhook.signatureHeader(raw, SECRET), SECRET);

    assert.equal(event.test, true);
    assert.equal(event.eventId, null);
    assert.equal(event.charge?.id, 'testab12cd34');
});

test('the verification challenge is recognised and answered', () => {
    const raw = '{"id":"0199f0c2-2b7a-7c0e-9d3a-5e8f1a2b3c4d","event":"webhook.verification","mode":"live","created_at":"2026-10-19T22:00:00.000000Z","data":{"challenge":"c4Lr9xT2mQ7vZ1"}}';

    const event = Webhook.constructEvent(raw, Webhook.signatureHeader(raw, SECRET), SECRET);

    assert.equal(event.isVerification(), true);
    assert.equal(event.is(Webhook.VERIFICATION_EVENT), true);
    assert.equal(event.challenge(), 'c4Lr9xT2mQ7vZ1');
    assert.equal(event.challengeResponse(), '{"challenge":"c4Lr9xT2mQ7vZ1"}');
});

test('other deliveries have no challenge to answer', () => {
    const event = signed('webhook_charge');

    assert.equal(event.isVerification(), false);
    assert.equal(event.challenge(), null);
    assert.equal(event.challengeResponse(), null);
});

test('a signed payload that is not a JSON object is rejected', () => {
    assert.throws(() => Webhook.constructEvent('["charge.paid"]', Webhook.signatureHeader('["charge.paid"]', SECRET), SECRET), InvalidArgumentError);
    assert.throws(() => WebhookEvent.fromPayload(new Uint8Array([0x7b, 0xff, 0x7d])), { name: 'InvalidArgumentError', message: /not valid JSON/ });
});

test('an event keeps what it was sent with', () => {
    const raw = payload('webhook_charge');
    const event = signed('webhook_charge');

    assert.deepEqual(JSON.parse(JSON.stringify(event)), JSON.parse(raw));
    assert.equal(event.get('mode'), 'live');
});
