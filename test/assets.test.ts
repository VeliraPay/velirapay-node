import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Asset } from '../src/index.ts';
import { client, MockFetch, pathOf } from './support.ts';

const assets = {
    data: [
        {
            id: 'BTC', object: 'asset', name: 'Bitcoin', ticker: 'BTC', network: 'Bitcoin',
            contract_address: null, decimals: 8, required_confirmations: 2, confirmation_wait: 'about 20 minutes',
            accepted: true, currency: 'EUR', exchange_rate: '68527.48', minimum_amount: null, minimum_price: '0.01', network_surcharge: null,
        },
        {
            id: 'USDT', object: 'asset', name: 'Tether USD', ticker: 'USDT', network: 'Ethereum (ERC-20)',
            contract_address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, required_confirmations: 6, confirmation_wait: 'about a minute',
            accepted: false, currency: 'EUR', exchange_rate: '0.8709', minimum_amount: '10', minimum_price: '8.71', network_surcharge: null,
        },
        {
            id: 'NEWCOIN', object: 'asset', name: 'New', ticker: 'NEW', network: 'New',
            contract_address: null, decimals: 18, required_confirmations: 1, confirmation_wait: 'under a minute',
            accepted: null, currency: 'EUR', exchange_rate: null, minimum_amount: null, minimum_price: '0.01', network_surcharge: '2.50',
        },
    ],
    meta: { mode: 'live', currencies: ['USD', 'EUR'] },
};

test('the coins on offer are read with their minimums', async () => {
    const http = new MockFetch().json(assets);

    const page = await client(http).assets.list({ currency: 'EUR' });

    assert.equal(pathOf(http.lastRequest()), '/v1/assets');
    assert.equal(new URL(http.lastRequest().url).search, '?currency=EUR');
    assert.equal(page.data.length, 3);
    assert.equal(page.hasMore(), false);

    const [bitcoin, tether, unknown] = page.data;

    assert.equal(bitcoin?.id, 'BTC');
    assert.equal(bitcoin?.asset(), Asset.BTC);
    assert.equal(bitcoin?.accepted, true);
    assert.equal(bitcoin?.minimumAmount, null);
    assert.equal(bitcoin?.minimumPrice, '0.01');
    assert.equal(bitcoin?.contractAddress, null);
    assert.equal(bitcoin?.decimals, 8);
    assert.equal(bitcoin?.requiredConfirmations, 2);
    assert.equal(bitcoin?.confirmationWait, 'about 20 minutes');

    assert.equal(tether?.name, 'Tether USD');
    assert.equal(tether?.ticker, 'USDT');
    assert.equal(tether?.network, 'Ethereum (ERC-20)');
    assert.equal(tether?.accepted, false);
    assert.equal(tether?.currency, 'EUR');
    assert.equal(tether?.exchangeRate, '0.8709');
    assert.equal(tether?.minimumAmount, '10');
    assert.equal(tether?.minimumPrice, '8.71');

    assert.equal(unknown?.asset(), null);
    assert.equal(unknown?.accepted, null);
    assert.equal(unknown?.exchangeRate, null);
    assert.equal(unknown?.networkSurcharge, '2.50');
});
