import type { Page } from '../page.ts';
import type { InvitationCreateParams, MemberUpdateParams, PageParams, RequestOptions } from '../params.ts';
import { Invitation, Member } from '../resources/member.ts';
import { path, Service } from './service.ts';

/** The /v1/members endpoints. Reading needs members:read; changing a role or removing someone needs members:write on a key an owner made. */
export class MemberService extends Service {
    /** List the account's members, oldest first. */
    async list(params: PageParams = {}): Promise<Page<Member>> {
        return this.page('/v1/members', params, (member) => new Member(member));
    }

    /** Iterate over every member, oldest first, fetching pages as they are reached. */
    async *iterator(params: Omit<PageParams, 'page'> = {}): AsyncGenerator<Member, void, undefined> {
        yield* (await this.list(params)).autoPagingIterator();
    }

    /** Give a member another role: "admin", "finance", "support" or "viewer". An owner is never changed this way. */
    async update(id: string, params: MemberUpdateParams, options?: RequestOptions): Promise<Member> {
        return new Member(await this.request('PATCH', path('/v1/members/%s', id), params, options));
    }

    /** Remove a member, which also revokes the API keys they made. An owner is never removed this way. */
    async remove(id: string, options?: RequestOptions): Promise<void> {
        await this.respond('DELETE', path('/v1/members/%s', id), undefined, options);
    }
}

/** The /v1/invitations endpoints. Reading needs members:read and changing members:write. */
export class InvitationService extends Service {
    /** List the invitations nobody has accepted yet, newest first, expired ones included. */
    async list(params: PageParams = {}): Promise<Page<Invitation>> {
        return this.page('/v1/invitations', params, (invitation) => new Invitation(invitation));
    }

    /** Iterate over every waiting invitation, newest first, fetching pages as they are reached. */
    async *iterator(params: Omit<PageParams, 'page'> = {}): AsyncGenerator<Invitation, void, undefined> {
        yield* (await this.list(params)).autoPagingIterator();
    }

    /** Email someone an invitation to join as an "admin", "finance", "support" or "viewer", in the name of whoever made the API key. */
    async create(params: InvitationCreateParams, options?: RequestOptions): Promise<Invitation> {
        return new Invitation(await this.request('POST', '/v1/invitations', params, options));
    }

    /** Withdraw an invitation, so its link stops working. */
    async cancel(id: string, options?: RequestOptions): Promise<void> {
        await this.respond('DELETE', path('/v1/invitations/%s', id), undefined, options);
    }
}
