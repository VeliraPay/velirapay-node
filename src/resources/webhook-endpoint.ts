import { ApiResource, bool, date, int, isRecord, map, nullableInt, nullableString, objects, reference, string, strings, type Attributes } from './api-resource.ts';

/** Where webhooks are delivered, and whether it can receive them. Its signing secret is only returned when it is added or rotated. */
export class WebhookEndpoint extends ApiResource {
    /** The endpoint's id. */
    readonly id: string;

    /** Where deliveries go. */
    readonly url: string;

    /** What the merchant noted about it. */
    readonly description: string | null;

    /** The EventType values it subscribes to. */
    readonly events: string[];

    /** Whether it is switched on. */
    readonly active: boolean;

    /** Whether it has answered the verification challenge; it receives nothing until it has. */
    readonly verified: boolean;

    /** How many deliveries are kept for it, from the last 30 days. */
    readonly deliveriesCount: number;

    /** How many of those failed. */
    readonly failedDeliveriesCount: number;

    /** When it last answered the verification challenge. */
    readonly verifiedAt: Date | null;

    /** When it was added. */
    readonly createdAt: Date | null;

    /** The signing secret, only in the answers that add the endpoint or rotate it. */
    readonly secret: string | null;

    /** Why the endpoint did not answer the verification challenge, in the answers that sent it one. */
    readonly verificationError: string | null;

    /** Until when the secret a rotation replaced still signs deliveries too, in the answer that rotates it. */
    readonly previousSecretExpiresAt: Date | null;

    constructor(attributes: Attributes, meta: Attributes = {}) {
        super(attributes);

        this.id = string(attributes, 'id');
        this.url = string(attributes, 'url');
        this.description = nullableString(attributes, 'description');
        this.events = strings(attributes, 'events');
        this.active = bool(attributes, 'active');
        this.verified = bool(attributes, 'verified');
        this.deliveriesCount = int(attributes, 'deliveries_count');
        this.failedDeliveriesCount = int(attributes, 'failed_deliveries_count');
        this.verifiedAt = date(attributes, 'verified_at');
        this.createdAt = date(attributes, 'created_at');
        this.secret = nullableString(attributes, 'secret');
        this.verificationError = nullableString(meta, 'verification_error');
        this.previousSecretExpiresAt = date(meta, 'previous_secret_expires_at');
    }

    /** Whether the endpoint receives deliveries right now. */
    isReceiving(): boolean {
        return this.active && this.verified;
    }
}

/** One event sent to a webhook endpoint, and how it went. What was sent and what came back are only in retrieveDelivery()'s answer. */
export class WebhookDelivery extends ApiResource {
    /** The delivery's id, the X-VeliraPay-Delivery header it was sent with. */
    readonly id: string;

    /** The EventType value it carried. */
    readonly event: string;

    /** The id of the event it carried, null for a test delivery. */
    readonly eventId: string | null;

    /** Whether it was a test event, which describes no real payment. */
    readonly test: boolean;

    /** "pending", "succeeded" or "failed". */
    readonly status: string;

    /** How many times it was sent. */
    readonly attempts: number;

    /** The HTTP status the endpoint last answered with. */
    readonly responseStatus: number | null;

    /** Why the last attempt failed. */
    readonly error: string | null;

    /** The id of the charge it was about. */
    readonly charge: string | null;

    /** The id of the invoice it was about. */
    readonly invoice: string | null;

    /** When it was queued. */
    readonly createdAt: Date | null;

    /** When it was last sent. */
    readonly lastAttemptedAt: Date | null;

    /** When the endpoint accepted it. */
    readonly deliveredAt: Date | null;

    /** The JSON body it carried, from retrieveDelivery() alone and only for a key that may also read events. */
    readonly payload: Record<string, unknown> | null;

    /** Every attempt to send it, the latest first, from retrieveDelivery() alone. */
    readonly attemptLog: WebhookDeliveryAttempt[];

    constructor(attributes: Attributes) {
        super(attributes);

        const payload = attributes['payload'];

        this.id = string(attributes, 'id');
        this.event = string(attributes, 'event');
        this.eventId = nullableString(attributes, 'event_id');
        this.test = bool(attributes, 'test');
        this.status = string(attributes, 'status');
        this.attempts = int(attributes, 'attempts');
        this.responseStatus = nullableInt(attributes, 'response_status');
        this.error = nullableString(attributes, 'error');
        this.charge = reference(attributes, 'charge');
        this.invoice = reference(attributes, 'invoice');
        this.createdAt = date(attributes, 'created_at');
        this.lastAttemptedAt = date(attributes, 'last_attempted_at');
        this.deliveredAt = date(attributes, 'delivered_at');
        this.payload = isRecord(payload) || Array.isArray(payload) ? map(attributes, 'payload') : null;
        this.attemptLog = objects(attributes, 'attempt_log', (attempt) => new WebhookDeliveryAttempt(attempt));
    }

    /** Whether the endpoint accepted the delivery. */
    succeeded(): boolean {
        return this.status === 'succeeded';
    }
}

/** One attempt to send a webhook delivery: the request it made and what the endpoint answered. */
export class WebhookDeliveryAttempt extends ApiResource {
    /** Which attempt it was, counted from 1. */
    readonly attempt: number;

    /** Where it was sent, null when nothing was sent. */
    readonly url: string | null;

    /** The headers sent, the signatures cut out but the timestamp they signed kept; null when nothing was sent. */
    readonly requestHeaders: Record<string, string> | null;

    /** The HTTP status the endpoint answered with, null when nothing answered. */
    readonly responseStatus: number | null;

    /** The headers the endpoint answered with, a few dozen at most and never cookies. */
    readonly responseHeaders: Record<string, string> | null;

    /** The first 2,000 characters of the endpoint's answer. */
    readonly responseBody: string | null;

    /** Why the attempt failed, such as a timeout or a refused connection. */
    readonly error: string | null;

    /** How long the endpoint took, in milliseconds. */
    readonly durationMs: number | null;

    /** When the attempt was made. */
    readonly createdAt: Date | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.attempt = int(attributes, 'attempt');
        this.url = nullableString(attributes, 'url');
        this.requestHeaders = headers(attributes, 'request_headers');
        this.responseStatus = nullableInt(attributes, 'response_status');
        this.responseHeaders = headers(attributes, 'response_headers');
        this.responseBody = nullableString(attributes, 'response_body');
        this.error = nullableString(attributes, 'error');
        this.durationMs = nullableInt(attributes, 'duration_ms');
        this.createdAt = date(attributes, 'created_at');
    }

    /** Whether the endpoint answered the attempt with a 2xx status. */
    succeeded(): boolean {
        return this.responseStatus !== null && this.responseStatus >= 200 && this.responseStatus < 300;
    }
}

/** Read a map of header names to values, or null when none were kept. */
function headers(data: Attributes, key: string): Record<string, string> | null {
    const value = data[key];

    if (!isRecord(value) && !Array.isArray(value)) {
        return null;
    }

    return Object.fromEntries(Object.entries(map(data, key)).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}
