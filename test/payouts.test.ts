import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Asset, PayoutStatus } from '../src/index.ts';
import { client, MockFetch, pathOf } from './support.ts';

const payout = {
    id: 'k3v9x2m7q8wz', object: 'payout', charge: 'k3v9x2m7q8wz', status: 'sent', asset: 'USDT',
    gross_amount: '11.014175', fee_percent: '3', fee_amount: '0.330425', fee_fiat_amount: '0.33', fiat_currency: 'USD', exchange_rate: '0.9987',
    net_amount: '10.68375', network_fee: '0.081611', sent_amount: '10.602139',
    payout_address: '0x7099', payout_txid: '0x9a4f', explorer_url: 'https://etherscan.io/tx/0x9a4f',
    attempts: 1, last_error: null, next_attempt_at: null,
    sent_at: '2026-11-02T20:58:00.000000Z', confirmed_at: '2026-11-02T21:00:04.000000Z', created_at: '2026-11-02T20:57:00.000000Z',
};

test('a payout is read by its charge into typed properties', async () => {
    const http = new MockFetch().json({ data: payout });

    const read = await client(http).payouts.retrieve('k3v9x2m7q8wz');

    assert.equal(pathOf(http.lastRequest()), '/v1/payouts/k3v9x2m7q8wz');
    assert.equal(read.charge, 'k3v9x2m7q8wz');
    assert.equal(read.isSent(), true);
    assert.equal(read.isManual(), false);
    assert.equal(read.asset, 'USDT');
    assert.equal(read.grossAmount, '11.014175');
    assert.equal(read.feePercent, '3');
    assert.equal(read.feeAmount, '0.330425');
    assert.equal(read.feeFiatAmount, '0.33');
    assert.equal(read.fiatCurrency, 'USD');
    assert.equal(read.exchangeRate, '0.9987');
    assert.equal(read.netAmount, '10.68375');
    assert.equal(read.networkFee, '0.081611');
    assert.equal(read.sentAmount, '10.602139');
    assert.equal(read.payoutAddress, '0x7099');
    assert.equal(read.payoutTxid, '0x9a4f');
    assert.equal(read.explorerUrl, 'https://etherscan.io/tx/0x9a4f');
    assert.equal(read.attempts, 1);
    assert.equal(read.lastError, null);
    assert.equal(read.nextAttemptAt, null);
    assert.deepEqual(read.confirmedAt, new Date('2026-11-02T21:00:04Z'));
});

test('payouts are listed with their filters', async () => {
    const http = new MockFetch().json({ data: [payout], meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 } });

    const page = await client(http).payouts.list({ status: PayoutStatus.Sent, asset: Asset.USDT });

    assert.equal(pathOf(http.lastRequest()), '/v1/payouts');
    assert.equal(new URL(http.lastRequest().url).search, '?status=sent&asset=USDT');
    assert.equal(page.data[0]?.id, 'k3v9x2m7q8wz');
});

test('the summary adds up each coin', async () => {
    const http = new MockFetch().json({
        data: [{
            object: 'payout_summary', asset: 'BTC', payouts: 3, gross_amount: '0.3', fee_amount: '0.009',
            owed_amount: '0.097', in_flight_amount: '0', paid_out_amount: '0.194', network_fee_amount: '0.0001', waiting_for_address: 0,
        }],
        meta: { mode: 'live' },
    });

    const summary = await client(http).payouts.summary();

    assert.equal(pathOf(http.lastRequest()), '/v1/payouts/summary');
    assert.equal(summary.length, 1);
    assert.equal(summary[0]?.asset, 'BTC');
    assert.equal(summary[0]?.payouts, 3);
    assert.equal(summary[0]?.grossAmount, '0.3');
    assert.equal(summary[0]?.feeAmount, '0.009');
    assert.equal(summary[0]?.paidOutAmount, '0.194');
    assert.equal(summary[0]?.inFlightAmount, '0');
    assert.equal(summary[0]?.owedAmount, '0.097');
    assert.equal(summary[0]?.networkFeeAmount, '0.0001');
    assert.equal(summary[0]?.waitingForAddress, 0);
});
