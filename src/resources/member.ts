import { ApiResource, bool, date, nullableString, string, type Attributes } from './api-resource.ts';

/** A person in the account, with their role. */
export class Member extends ApiResource {
    /** The member's id. */
    readonly id: string;

    /** Their name. */
    readonly name: string;

    /** The address they sign in with. */
    readonly email: string;

    /** "owner", "admin", "finance", "support" or "viewer". */
    readonly role: string | null;

    /** When they joined. */
    readonly joinedAt: Date | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.id = string(attributes, 'id');
        this.name = string(attributes, 'name');
        this.email = string(attributes, 'email');
        this.role = nullableString(attributes, 'role');
        this.joinedAt = date(attributes, 'joined_at');
    }
}

/** An invitation to the account nobody has accepted yet. */
export class Invitation extends ApiResource {
    /** The invitation's id, which is not the code in the email's link. */
    readonly id: string;

    /** Where it was sent. */
    readonly email: string;

    /** The role it gives once accepted: "admin", "finance", "support" or "viewer". */
    readonly role: string;

    /** The name of the member who sent it. */
    readonly invitedBy: string | null;

    /** Whether it can no longer be accepted. */
    readonly expired: boolean;

    /** When it stops working. */
    readonly expiresAt: Date | null;

    /** When it was sent. */
    readonly createdAt: Date | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.id = string(attributes, 'id');
        this.email = string(attributes, 'email');
        this.role = string(attributes, 'role');
        this.invitedBy = nullableString(attributes, 'invited_by');
        this.expired = bool(attributes, 'expired');
        this.expiresAt = date(attributes, 'expires_at');
        this.createdAt = date(attributes, 'created_at');
    }
}
