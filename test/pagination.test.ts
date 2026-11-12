import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Charge } from '../src/index.ts';
import { client, fixture, listResponse, MockFetch, queryOf } from './support.ts';

test('the iterator walks every page and skips objects it already gave', async () => {
    const [first, second, third] = ['charge000001', 'charge000002', 'charge000003'].map((id) => ({ ...fixture('charge'), id }));
    const http = new MockFetch()
        .json(listResponse([first, second], { currentPage: 1, lastPage: 2, perPage: 2, total: 4 }))
        .json(listResponse([second, third], { currentPage: 2, lastPage: 2, perPage: 2, total: 4 }));

    const ids: string[] = [];

    for await (const charge of client(http).charges.iterator({ status: 'paid', per_page: 2 })) {
        ids.push(charge.id);
    }

    assert.deepEqual(ids, ['charge000001', 'charge000002', 'charge000003']);
    assert.equal(http.requests.length, 2);
    assert.deepEqual(queryOf(http.requests[0]!), { status: 'paid', per_page: '2' });
    assert.deepEqual(queryOf(http.requests[1]!), { status: 'paid', per_page: '2', page: '2' });
});

test('a page is walked with for of, and fetches the next one', async () => {
    const http = new MockFetch()
        .json(listResponse([fixture('charge')], { currentPage: 1, lastPage: 2, perPage: 1, total: 2 }))
        .json(listResponse([{ ...fixture('charge'), id: 'charge000002' }], { currentPage: 2, lastPage: 2, perPage: 1, total: 2 }));

    const page = await client(http).charges.list({ per_page: 1 });

    assert.deepEqual([...page].map((charge) => charge.id), ['k3v9x2m7q8wz']);
    assert.equal(page.hasMore(), true);
    assert.equal(page.isEmpty(), false);

    const next = await page.nextPage();

    assert.ok(next?.data[0] instanceof Charge);
    assert.equal(next.data[0].id, 'charge000002');
    assert.equal(next.hasMore(), false);
});

test('the last page has no next page', async () => {
    const http = new MockFetch().json(listResponse([fixture('charge')]));

    const page = await client(http).charges.list();

    assert.equal(page.hasMore(), false);
    assert.equal(await page.nextPage(), null);
    assert.equal(http.requests.length, 1);
});

test('the iterator stops on a page that does not move forward', async () => {
    const http = new MockFetch()
        .json(listResponse([fixture('charge')], { currentPage: 1, lastPage: 3 }))
        .json(listResponse([{ ...fixture('charge'), id: 'charge000002' }], { currentPage: 1, lastPage: 3 }));

    const ids: string[] = [];

    for await (const charge of client(http).charges.iterator()) {
        ids.push(charge.id);
    }

    assert.deepEqual(ids, ['k3v9x2m7q8wz']);
    assert.equal(http.requests.length, 2);
});
