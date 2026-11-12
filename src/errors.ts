import type { ApiResponse } from './http/api-response.ts';

/** The base of every error this library throws. */
export class VeliraPayError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = new.target.name;
    }
}

/** Thrown when the API answers with an error. */
export class ApiError extends VeliraPayError {
    /** The HTTP status the API answered with. */
    readonly status: number;

    /** The decoded JSON body of the response, or an empty object when it had none. */
    readonly body: Record<string, unknown>;

    /** The response itself. */
    readonly response: ApiResponse;

    constructor(message: string, response: ApiResponse) {
        super(message);
        this.response = response;
        this.status = response.status;
        this.body = response.decode() ?? {};
    }

    /** Create the error that matches the response's status. */
    static fromResponse(response: ApiResponse): ApiError {
        const message = response.decode()?.['message'];
        const text = typeof message === 'string' && message !== '' ? message : `The VeliraPay API answered with HTTP ${response.status}.`;

        switch (response.status) {
            case 401:
                return new AuthenticationError(text, response);
            case 403:
                return new PermissionError(text, response);
            case 404:
                return new NotFoundError(text, response);
            case 409:
                return new ConflictError(text, response);
            case 422:
                return new ValidationError(text, response);
            case 429:
                return new RateLimitError(text, response);
            default:
                return response.status >= 500 ? new ServerError(text, response) : new InvalidRequestError(text, response);
        }
    }

    /** The value of a response header. */
    header(name: string): string | null {
        return this.response.header(name);
    }

    /** How many seconds the API asked to wait before trying again, or null when it did not say. */
    retryAfter(): number | null {
        return this.response.retryAfter();
    }
}

/** The API key is missing, revoked or unknown (401). */
export class AuthenticationError extends ApiError {}

/** The API key may not do what was asked (403). */
export class PermissionError extends ApiError {}

/** The object does not exist for this account and mode (404). */
export class NotFoundError extends ApiError {}

/** The object's state does not allow the action, or an idempotency key was reused for a different request or is held by one still being processed (409). */
export class ConflictError extends ApiError {}

/** The request failed validation (422). */
export class ValidationError extends ApiError {
    /** The validation messages keyed by field, such as "amount" or "items.0.quantity". */
    errors(): Record<string, string[]> {
        const errors: Record<string, string[]> = {};
        const given = this.body['errors'];

        if (typeof given !== 'object' || given === null) {
            return errors;
        }

        for (const [field, messages] of Object.entries(given)) {
            errors[field] = (Array.isArray(messages) ? messages : [messages]).filter((message): message is string => typeof message === 'string');
        }

        return errors;
    }

    /** The first validation message for a field. */
    firstError(field: string): string | null {
        return this.errors()[field]?.[0] ?? null;
    }
}

/** Too many requests were made, or a limit such as emailing an invoice again was reached (429). */
export class RateLimitError extends ApiError {}

/** The API failed to handle the request (5xx). */
export class ServerError extends ApiError {}

/** The request was malformed (400 and other client errors). */
export class InvalidRequestError extends ApiError {}

/** The API answered with something this library cannot read. */
export class UnexpectedResponseError extends ApiError {}

/** The API could not be reached, after any retries. */
export class ConnectionError extends VeliraPayError {}

/** A webhook delivery's signature is missing, invalid or too old. */
export class SignatureVerificationError extends VeliraPayError {}

/** The library was given something it cannot use. */
export class InvalidArgumentError extends VeliraPayError {}
