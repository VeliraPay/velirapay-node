import { UnexpectedResponseError } from '../errors.ts';

/** A response from the VeliraPay API. */
export class ApiResponse {
    /** The HTTP status. */
    readonly status: number;

    /** The headers. */
    readonly headers: Headers;

    /** The raw body. */
    readonly body: string;

    constructor(status: number, headers: Headers, body: string) {
        this.status = status;
        this.headers = headers;
        this.body = body;
    }

    /** Whether the request succeeded. */
    isSuccessful(): boolean {
        return this.status >= 200 && this.status < 300;
    }

    /** The value of a header. */
    header(name: string): string | null {
        return this.headers.get(name);
    }

    /** Whether the API replayed the response to an earlier request with the same idempotency key. */
    wasReplayed(): boolean {
        return this.header('Idempotent-Replayed')?.toLowerCase() === 'true';
    }

    /** How many seconds the API asked to wait before trying again. */
    retryAfter(): number | null {
        const value = this.header('Retry-After')?.trim();

        if (value === undefined) {
            return null;
        }

        if (/^\d+$/.test(value)) {
            return Number(value);
        }

        if (!/^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value)) {
            return null;
        }

        const date = Date.parse(value);

        return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - Date.now()) / 1000));
    }

    /** The body as a JSON object, throwing when it is not one. */
    json(): Record<string, unknown> {
        const decoded = this.decode();

        if (decoded === null) {
            throw new UnexpectedResponseError('The VeliraPay API answered with a body that is not a JSON object.', this);
        }

        return decoded;
    }

    /** The body as a JSON object, or null when it is not one. */
    decode(): Record<string, unknown> | null {
        if (this.body.trim() === '') {
            return null;
        }

        try {
            const decoded: unknown = JSON.parse(this.body);

            return typeof decoded === 'object' && decoded !== null && !Array.isArray(decoded) ? (decoded as Record<string, unknown>) : null;
        } catch {
            return null;
        }
    }
}
