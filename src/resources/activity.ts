import { ApiResource, date, map, nullableString, string, type Attributes } from './api-resource.ts';

/** One thing done in the account, from its activity log. */
export class Activity extends ApiResource {
    /** The entry's id. */
    readonly id: string;

    /** What was done, such as "api_key.created". */
    readonly action: string;

    /** What was done, in words. */
    readonly description: string;

    /** Who did it: a member's name or an API key's. */
    readonly actor: string | null;

    /** What it was done to. */
    readonly subject: string | null;

    /** The details kept with it. */
    readonly properties: Record<string, unknown>;

    /** The address it came from. */
    readonly ipAddress: string | null;

    /** "live" or "test", or null for what belongs to neither, such as a sign-in. */
    readonly mode: string | null;

    /** When it was done. */
    readonly createdAt: Date | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.id = string(attributes, 'id');
        this.action = string(attributes, 'action');
        this.description = string(attributes, 'description');
        this.actor = nullableString(attributes, 'actor');
        this.subject = nullableString(attributes, 'subject');
        this.properties = map(attributes, 'properties');
        this.ipAddress = nullableString(attributes, 'ip_address');
        this.mode = nullableString(attributes, 'mode');
        this.createdAt = date(attributes, 'created_at');
    }
}
