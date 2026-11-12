import { createHmac, timingSafeEqual } from 'node:crypto';
import { InvalidArgumentError, SignatureVerificationError } from '../errors.ts';
import { VERIFICATION_EVENT, WebhookEvent } from './webhook-event.ts';

/** A delivery's raw body, exactly as received: a string, or a Buffer or other bytes. */
export type WebhookPayload = string | Uint8Array;

/** Verifies and parses the webhooks VeliraPay sends. */
export class Webhook {
    /** The header carrying the delivery's signature. */
    static readonly SIGNATURE_HEADER = 'X-VeliraPay-Signature';

    /** The header carrying the event type. */
    static readonly EVENT_HEADER = 'X-VeliraPay-Event';

    /** The header carrying the delivery's id. */
    static readonly DELIVERY_HEADER = 'X-VeliraPay-Delivery';

    /** How many seconds a signature stays valid. */
    static readonly DEFAULT_TOLERANCE = 300;

    /** The event of the challenge sent to an endpoint when it is added or moved: it receives nothing else until it answers. */
    static readonly VERIFICATION_EVENT = VERIFICATION_EVENT;

    private constructor() {}

    /**
     * Verify a delivery's signature and parse its payload.
     *
     * @param payload The raw request body, exactly as received.
     * @param signatureHeader The X-VeliraPay-Signature header.
     * @param secret The endpoint's signing secret, starting with "whsec_".
     * @param tolerance How many seconds old a signature may be; 0 accepts any age.
     */
    static constructEvent(payload: WebhookPayload, signatureHeader: string | string[] | null | undefined, secret: string | undefined, tolerance: number = Webhook.DEFAULT_TOLERANCE): WebhookEvent {
        Webhook.verifySignature(payload, signatureHeader, secret, tolerance);

        return WebhookEvent.fromPayload(payload);
    }

    /** Verify and parse the delivery in a Fetch API Request, which reads its body. */
    static async constructEventFromRequest(request: Request, secret: string | undefined, tolerance: number = Webhook.DEFAULT_TOLERANCE): Promise<WebhookEvent> {
        const payload = new Uint8Array(await request.arrayBuffer());

        return Webhook.constructEvent(payload, request.headers.get(Webhook.SIGNATURE_HEADER), secret, tolerance);
    }

    /**
     * Check that a payload was signed with the secret, recently.
     *
     * @param now The current Unix time in seconds, for tests.
     */
    static verifySignature(payload: WebhookPayload, signatureHeader: string | string[] | null | undefined, secret: string | undefined, tolerance: number = Webhook.DEFAULT_TOLERANCE, now?: number): void {
        if (!(tolerance >= 0)) {
            throw new InvalidArgumentError('The webhook signature tolerance cannot be negative.');
        }

        if (typeof secret !== 'string' || secret.trim() === '') {
            throw new InvalidArgumentError('A webhook signing secret is required. Copy it from the webhook endpoint in the dashboard.');
        }

        if (typeof payload !== 'string' && !(payload instanceof Uint8Array)) {
            throw new InvalidArgumentError('Pass the raw request body, as a string or a Buffer, exactly as received, rather than parsed JSON.');
        }

        const header = Array.isArray(signatureHeader) ? signatureHeader.join(',') : signatureHeader;

        if (typeof header !== 'string' || header.trim() === '') {
            throw new SignatureVerificationError(`The ${Webhook.SIGNATURE_HEADER} header is missing.`);
        }

        let timestamp: string | null = null;
        const signatures: string[] = [];

        for (const part of header.split(',')) {
            const trimmed = part.trim();
            const separator = trimmed.indexOf('=');
            const key = separator === -1 ? trimmed : trimmed.slice(0, separator);
            const value = separator === -1 ? '' : trimmed.slice(separator + 1);

            if (key === 't' && timestamp === null) {
                timestamp = value;
            } else if (key === 'v1' && value !== '') {
                signatures.push(value);
            }
        }

        if (timestamp === null || !/^\d+$/.test(timestamp)) {
            throw new SignatureVerificationError(`The ${Webhook.SIGNATURE_HEADER} header has no timestamp.`);
        }

        if (signatures.length === 0) {
            throw new SignatureVerificationError(`The ${Webhook.SIGNATURE_HEADER} header has no v1 signature.`);
        }

        const age = Math.abs((now ?? Math.floor(Date.now() / 1000)) - Number(timestamp));

        if (tolerance > 0 && age > tolerance) {
            throw new SignatureVerificationError(`The signature is ${age} seconds away from now, more than the ${tolerance} allowed.`);
        }

        const expected = Buffer.from(sign(payload, secret, timestamp), 'utf8');

        for (const signature of signatures) {
            const given = Buffer.from(signature, 'utf8');

            if (given.length === expected.length && timingSafeEqual(given, expected)) {
                return;
            }
        }

        throw new SignatureVerificationError('The signature does not match the payload. Check the signing secret and that the raw request body is passed unchanged.');
    }

    /** Build the signature header VeliraPay would send with a payload, to test a webhook handler. */
    static signatureHeader(payload: WebhookPayload, secret: string, timestamp: number = Math.floor(Date.now() / 1000)): string {
        return `t=${timestamp},v1=${sign(payload, secret, String(timestamp))}`;
    }
}

/** The HMAC-SHA256, in hex, of "{timestamp}.{payload}" under the secret. */
function sign(payload: WebhookPayload, secret: string, timestamp: string): string {
    return createHmac('sha256', secret).update(`${timestamp}.`).update(payload).digest('hex');
}
