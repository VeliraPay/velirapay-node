import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiKeyPermission } from '../src/index.ts';
import { body, client, MockFetch, pathOf } from './support.ts';

test('a key is created with the key itself shown once', async () => {
    const http = new MockFetch().json({ data: {
        id: '42', object: 'api_key', name: 'Shop server', prefix: 'vp_live_8Kq2', key: 'vp_live_8Kq2abc',
        mode: 'live', permissions: ['charges:read'], allowed_ips: ['203.0.113.7'], created_by: 'Ada',
        last_used_at: null, created_at: '2026-11-06T09:12:44.000000Z',
    } }, 201);

    const apiKey = await client(http).apiKeys.create({ name: 'Shop server', permissions: ['charges:read'], allowed_ips: ['203.0.113.7'] }, { idempotencyKey: 'new-key' });

    const request = http.lastRequest();
    assert.equal(request.method, 'POST');
    assert.equal(pathOf(request), '/v1/api-keys');
    assert.equal(request.headers.get('Idempotency-Key'), 'new-key');
    assert.deepEqual(await body(request), { name: 'Shop server', permissions: ['charges:read'], allowed_ips: ['203.0.113.7'] });
    assert.equal(apiKey.key, 'vp_live_8Kq2abc');
    assert.deepEqual(apiKey.permissions, ['charges:read']);
    assert.deepEqual(apiKey.allowedIps, ['203.0.113.7']);
    assert.equal(apiKey.createdBy, 'Ada');
    assert.equal(apiKey.hasFullAccess(), false);
});

test('permissions are sent as their values', async () => {
    const http = new MockFetch().json({ data: { id: '43', object: 'api_key', name: 'Books', prefix: 'vp_live_9Lr3', key: 'vp_live_9Lr3abc', mode: 'live', permissions: ['payouts:read', 'account:write'], allowed_ips: null } }, 201);

    await client(http).apiKeys.create({ name: 'Books', permissions: [ApiKeyPermission.PayoutsRead, 'account:write'] });

    assert.deepEqual(await body(http.lastRequest()), { name: 'Books', permissions: ['payouts:read', 'account:write'] });
});

test('keys are listed, changed and revoked', async () => {
    const http = new MockFetch()
        .json({ data: [{ id: '7', object: 'api_key', name: 'Old', prefix: 'vp_live_aaaa', mode: 'live', permissions: null, allowed_ips: null }], meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 } })
        .json({ data: { id: '7', object: 'api_key', name: 'Reader', prefix: 'vp_live_aaaa', mode: 'live', permissions: ['charges:read'], allowed_ips: null } })
        .empty();
    const velirapay = client(http);

    const listed = (await velirapay.apiKeys.list()).data[0];

    assert.equal(pathOf(http.lastRequest()), '/v1/api-keys');
    assert.equal(listed?.key, null);
    assert.equal(listed?.hasFullAccess(), true);

    await velirapay.apiKeys.update('7', { name: 'Reader', permissions: ['charges:read'] });

    assert.equal(http.lastRequest().method, 'PATCH');
    assert.equal(pathOf(http.lastRequest()), '/v1/api-keys/7');

    await velirapay.apiKeys.revoke('7');

    assert.equal(http.lastRequest().method, 'DELETE');
    assert.equal(pathOf(http.lastRequest()), '/v1/api-keys/7');
});

test('members are listed, changed and removed', async () => {
    const http = new MockFetch()
        .json({ data: [{ id: '3', object: 'member', name: 'Ada', email: 'ada@example.com', role: 'admin', joined_at: '2026-10-01T08:00:00.000000Z' }], meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 } })
        .json({ data: { id: '3', object: 'member', name: 'Ada', email: 'ada@example.com', role: 'finance' } })
        .empty();
    const velirapay = client(http);

    const member = (await velirapay.members.list()).data[0];

    assert.equal(pathOf(http.lastRequest()), '/v1/members');
    assert.equal(member?.email, 'ada@example.com');
    assert.equal(member?.role, 'admin');
    assert.deepEqual(member?.joinedAt, new Date('2026-10-01T08:00:00Z'));

    assert.equal((await velirapay.members.update('3', { role: 'finance' })).role, 'finance');
    assert.deepEqual(await body(http.lastRequest()), { role: 'finance' });

    await velirapay.members.remove('3');

    assert.equal(http.lastRequest().method, 'DELETE');
    assert.equal(pathOf(http.lastRequest()), '/v1/members/3');
});

test('invitations are sent, listed and canceled', async () => {
    const invitation = { id: '9', object: 'invitation', email: 'grace@example.com', role: 'admin', invited_by: 'Ada', expired: false, expires_at: '2026-11-09T09:00:00.000000Z' };
    const http = new MockFetch()
        .json({ data: invitation }, 201)
        .json({ data: [invitation], meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 } })
        .empty();
    const velirapay = client(http);

    const sent = await velirapay.invitations.create({ email: 'grace@example.com', role: 'admin' });

    assert.equal(http.lastRequest().method, 'POST');
    assert.equal(pathOf(http.lastRequest()), '/v1/invitations');
    assert.equal(sent.id, '9');
    assert.equal(sent.invitedBy, 'Ada');
    assert.equal(sent.expired, false);

    assert.equal((await velirapay.invitations.list()).data[0]?.email, 'grace@example.com');

    await velirapay.invitations.cancel('9');

    assert.equal(http.lastRequest().method, 'DELETE');
    assert.equal(pathOf(http.lastRequest()), '/v1/invitations/9');
});
