import { ApiResource, date, nullableString, nullableStrings, string, type Attributes } from './api-resource.ts';

/** An API key of the account. The key itself is only in the answer that creates it. */
export class ApiKey extends ApiResource {
    /** The key's id, which is not the key itself. */
    readonly id: string;

    /** What the key is for. */
    readonly name: string;

    /** The start of the key, such as "vp_live_a1b2", to tell keys apart. */
    readonly prefix: string;

    /** The key itself, only in the answer that created it. */
    readonly key: string | null;

    /** "live" or "test". */
    readonly mode: string;

    /** The ApiKeyPermission values the key has, null for full access. */
    readonly permissions: string[] | null;

    /** The addresses and ranges it may be used from, null for anywhere. */
    readonly allowedIps: string[] | null;

    /** The name of the member who made it. */
    readonly createdBy: string | null;

    /** When it last made a request. */
    readonly lastUsedAt: Date | null;

    /** When it was made. */
    readonly createdAt: Date | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.id = string(attributes, 'id');
        this.name = string(attributes, 'name');
        this.prefix = string(attributes, 'prefix');
        this.key = nullableString(attributes, 'key');
        this.mode = string(attributes, 'mode');
        this.permissions = nullableStrings(attributes, 'permissions');
        this.allowedIps = nullableStrings(attributes, 'allowed_ips');
        this.createdBy = nullableString(attributes, 'created_by');
        this.lastUsedAt = date(attributes, 'last_used_at');
        this.createdAt = date(attributes, 'created_at');
    }

    /** Whether the key has every permission that full access gives. */
    hasFullAccess(): boolean {
        return this.permissions === null;
    }
}
