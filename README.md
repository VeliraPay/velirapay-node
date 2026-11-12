# VeliraPay for Node.js

[![Tests](https://github.com/VeliraPay/velirapay-node/actions/workflows/tests.yml/badge.svg)](https://github.com/VeliraPay/velirapay-node/actions/workflows/tests.yml)
[![Latest version](https://img.shields.io/npm/v/velirapay)](https://www.npmjs.com/package/velirapay)
[![License](https://img.shields.io/github/license/VeliraPay/velirapay-node)](LICENSE)

The official Node.js library for [VeliraPay](https://velirapay.com), the crypto payment processor. It covers the whole v1 API, the coins on offer, charges, payment links, invoices, coupons, payouts and payout addresses, events, webhook endpoints, your account with its overview and activity log, API keys, members and invitations, and paying for Pro, and verifies the webhooks VeliraPay sends you. It is written in TypeScript, ships its type definitions and has no dependencies.

- [Requirements](#requirements)
- [Installation](#installation)
- [Getting started](#getting-started)
- [Which one to use](#which-one-to-use)
- [Supported coins](#supported-coins)
- [Charges](#charges)
- [Short and late payments](#short-and-late-payments)
- [Invoices](#invoices)
- [Payment links](#payment-links)
- [Coupons](#coupons)
- [Payouts](#payouts)
- [Events](#events)
- [Webhooks](#webhooks)
- [Webhook endpoints](#webhook-endpoints)
- [Your account](#your-account)
- [Members and invitations](#members-and-invitations)
- [API keys](#api-keys)
- [Pro](#pro)
- [What the client covers](#what-the-client-covers)
- [Lists and pagination](#lists-and-pagination)
- [Errors](#errors)
- [Retries and idempotency](#retries-and-idempotency)
- [Constants](#constants)
- [Test mode](#test-mode)
- [Configuration](#configuration)
- [Testing your integration](#testing-your-integration)

The full API reference is at [velirapay.com/docs](https://velirapay.com/docs).

## Requirements

Node.js 22 or later. The package works with both `import` and `require`.

## Installation

```bash
npm install velirapay
```

## Getting started

Create an API key in the dashboard under **Developers → API keys**. Keep it on your server: anyone holding it can create charges and read your payments.

To charge a customer, create a charge with what you already know about them, and send them to its checkout page:

```js
import { VeliraPayClient } from 'velirapay';

const velirapay = new VeliraPayClient(process.env.VELIRAPAY_API_KEY);

const charge = await velirapay.charges.create({
    amount: '49.90',
    currency: 'EUR',
    asset: 'BTC',
    customer: { email: 'ada@example.com', name: 'Ada Lovelace' },
    metadata: { order_id: '1042' },
    success_url: 'https://example.com/orders/1042',
}, { idempotencyKey: 'order-1042' });

res.redirect(303, charge.checkoutUrl);
```

They pay there, and VeliraPay tells your server about it with a [webhook](#webhooks). The exchange rate is locked when the charge is created, and the customer has 30 minutes to pay.

Parameters are sent as the API names them, in snake_case, and objects come back with camelCase properties: `charge.checkoutUrl`, `charge.assetAmount`, `charge.customer.ipAddress`. Amounts are always strings, such as `'49.90'`, never floating-point numbers, so no precision is lost. A number you pass is rounded to 14 significant digits, as the API reads a JSON number, and sent as a decimal string, since the API refuses an exponent such as `5e-7`: `0.1 + 0.2` goes out as `'0.3'` and `0.00005` as `'0.00005'`. Pass a string to send every digit as it is. A charge the API answers with is an `ApiCharge`, whose `checkoutUrl` is always a string. Charges in webhooks leave it out, so theirs is `string | null`.

With CommonJS:

```js
const { VeliraPayClient } = require('velirapay');
```

## Which one to use

| When | Use | |
| --- | --- | --- |
| You are asking one customer for one payment | A [charge](#charges) | The default. It has one checkout page for that one payment, with the rate locked for 30 minutes. |
| The customer should choose the coin, or pays later | An [invoice](#invoices) | It needs their name and email, has no timer, can be itemised and reminded, and lets them pick the coin on its page. |
| Many customers pay through the same public page | A [payment link](#payment-links), created once | A product sold again and again, a tip jar, a link on your site. |

Do not create a new payment link for each customer or each order.

A charge needs its coin up front, because its exchange rate, amount and deposit address depend on it. Ask the customer on your own page, and offer them the coins from [`velirapay.assets.list()`](#supported-coins).

## Supported coins

`assets.list()` gives the coins that can be paid in the key's mode, whether your account takes each, and the lowest price a charge in each can have.

```js
const coins = await velirapay.assets.list({ currency: 'EUR' });

for (const coin of coins) {
    coin.id;               // "USDT": what to pass as asset, and coin.asset() is the Asset value
    coin.name;             // "Tether USD"
    coin.network;          // "Ethereum (ERC-20)", the network the customer has to send it on
    coin.accepted;         // whether your account takes it, which needs a payout address for that network
    coin.minimumAmount;    // "10", in the coin, or null when it has no minimum of its own
    coin.minimumPrice;     // "8.71", the lowest price in EUR right now
    coin.exchangeRate;     // "0.8709"
    coin.confirmationWait; // "about a minute"
    coin.networkSurcharge; // null, or what a charge in it asks on top of the price, in the coin
}

coins.currencies; // ["USD", "EUR", …], the currencies prices can be asked in
```

Without `currency`, prices are in your account's default currency. The list is a single page.

No charge, payment link or invoice asks for less than the lowest price of its currency: 0.50 in USD, EUR, GBP and CHF, 0.70 CAD, 0.80 AUD and 25.00 TRY, below which a payment is mostly network fees. Some coins start higher: USDT and USDC on Ethereum start at 10 of the token, because paying one out costs enough in gas that a smaller payment would leave you little. `minimumPrice` is the figure to check for each coin. A coin's own minimum is in the coin, so its `minimumPrice` moves a little with the market: leave some room. Below it, `charges.create()` throws a `ValidationError` on `amount` or `asset`.

A coin is only offered while VeliraPay can also pay it out, and a network can be switched off, so `asset` takes any [`Asset`](#constants) value but not every one can be paid in at any given time. `account.acceptedAssets` lists the coins your account takes right now ([Your account](#your-account)). The coins on BNB Chain, Base, Arbitrum One and Polygon are offered in live mode only.

## Charges

A charge is how you ask a customer for a payment, in one coin. The exchange rate is locked when it is created, and the customer has 30 minutes to pay.

```js
import { Asset, ChargeStatus } from 'velirapay';

// For an amount you set, with whatever you already know.
const charge = await velirapay.charges.create({
    amount: '150.00',
    currency: 'USD',
    asset: Asset.USDC, // USD Coin on Ethereum
    description: 'Pro plan, 1 year',
    metadata: { order_id: '1042' },
    customer: { email: 'ada@example.com', name: 'Ada Lovelace' },
    custom_fields: [{ label: 'Company', value: 'Analytical Engines' }], // shown with the charge in the dashboard
    success_url: 'https://example.com/orders/1042', // a button back once they have paid
    cancel_url: 'https://example.com/cart',         // a link back from the checkout
    success_message: 'Thank you, your licence is on its way.', // on the page and in the receipt
    send_email: true,                               // email them the payment page straight away
});

// For one of your payment links: the currency comes from the link, and so does the price when it is fixed.
const fromLink = await velirapay.charges.create({ payment_link: 'p4n8r2t6y1ua', asset: 'ETH' });

// With one of your coupons: fiatAmount is the lower price, and discountAmount what the coupon took off.
const discounted = await velirapay.charges.create({ payment_link: 'p4n8r2t6y1ua', asset: 'ETH', coupon: 'SPRING10' });
discounted.coupon;         // "SPRING10"
discounted.discountAmount; // "15.00"

const retrieved = await velirapay.charges.retrieve('k3v9x2m7q8wz');

retrieved.status;         // "pending", "underpaid", "paid", "expired" or "canceled"
retrieved.isPaid();
retrieved.assetAmount;    // "0.0025", what the customer has to send
retrieved.receivedAmount; // what arrived so far
retrieved.depositAddress;
retrieved.transactions;   // the transfers seen, as Transaction objects
retrieved.metadata;       // { order_id: "1042" }

const paid = await velirapay.charges.list({ status: ChargeStatus.Paid });
const hers = await velirapay.charges.list({ search: 'ada@example.com', created_from: new Date('2026-10-01'), asset: Asset.BTC });

// Email the customer the payment page, if you did not pass send_email.
await velirapay.charges.send('k3v9x2m7q8wz');

// Only while the charge is pending and no transfer to it has been seen.
await velirapay.charges.cancel('k3v9x2m7q8wz');
```

`send()` needs a customer email and only works while the charge is pending, or it throws a `ConflictError`. Creating a charge with `send_email` but no customer email throws a `ValidationError` on `customer_email` and creates nothing. A charge can be emailed once every 10 minutes, and the emails count towards the hourly limit under [Invoices](#invoices). In test mode, charge emails only go to members of your account.

`metadata` holds up to 20 keys of at most 40 characters each. Values are strings, numbers, booleans or `null`, and a string is at most 500 characters.

The accounts one person owns can open 300 charges between them in each mode within 30 minutes, through the API, the MCP server and the dashboard together, and 30 until one of them has been paid in live mode. Canceled charges count, paid live ones do not, and the payments customers start on the hosted checkout are not counted. Past that, `create()` throws a `RateLimitError` whose `retryAfter()` says how many seconds to wait.

### Customer details

`charge.customer` holds what is known about who pays, to help you spot fraud before you ship anything. When the customer starts the payment on the hosted checkout, VeliraPay records the IP address and browser they did it from. A charge you create from your server comes from your server rather than the customer, so pass what you know:

```js
const charge = await velirapay.charges.create({
    amount: '150.00',
    currency: 'USD',
    asset: 'BTC',
    customer: {
        email: 'ada@example.com',
        name: 'Ada Lovelace',
        ip_address: req.ip,                // the customer's address, not your server's
        user_agent: req.get('user-agent'),
        reference: 'cus_1042',             // your own id for the customer
        phone: '+44 20 7946 0958',
        country: 'GB',                     // ISO 3166 two-letter code
        metadata: { orders: 7 },           // the same limits as the charge's metadata
    },
});

charge.customer.ipAddress; // "203.0.113.7"
charge.customer.userAgent;
charge.customer.country;   // "GB"
charge.customer.metadata;  // { orders: 7 }
```

Every field is optional, and any other key is refused with a `ValidationError`. The older `customer_email` parameter still works.

### Network surcharges

Passing a payment on costs the same whatever its size on some networks, so the customer pays that part: a charge in USDT on Tron (`Asset.USDT_TRON`) asks for 2.50 USDT on top of the price. The coin says so before it is chosen, as `coin.networkSurcharge` from `assets.list()`, so tell the customer; the checkout does. A charge counts it in `assetAmount` and gives it again as `charge.networkSurcharge`, which is `null` for every coin without one. VeliraPay keeps it: it is not part of your payout, and a refund can never include it.

### Bitcoin over Lightning

A charge in `Asset.BTC_LIGHTNING` is paid with a Lightning invoice rather than to an address. `charge.paymentRequest` is the invoice (BOLT11), which the checkout shows as a QR code, and `charge.depositAddress` is its payment hash; `paymentRequest` is `null` for every other coin. A Lightning invoice is for one exact amount, and is paid once.

## Short and late payments

A charge that received less than it asked for is `underpaid`. A transfer that arrives after the charge expired or was canceled, or tops up an underpaid charge after its rate lock ended, is a late payment, announced with the `charge.late_payment` webhook; a top-up is announced once it has confirmed. Neither counts until you accept it, at the old rate, for what arrived:

```js
// Settle an underpaid charge, or a late payment on an expired or canceled one, as paid for what arrived and confirmed.
const accepted = await velirapay.charges.accept('k3v9x2m7q8wz');

// Record a refund you sent the customer from your own wallet, in the charge's coin.
await velirapay.charges.recordRefund('k3v9x2m7q8wz', {
    amount: '0.0005',
    txid: '7d1c5e9a…',
    reason: 'Returned item',
});
```

`accept()` throws a `ConflictError` while a payment to an underpaid charge is still confirming, and for a charge that is neither underpaid nor late. A late payment on top of a charge that is already paid is counted on its own. `recordRefund()` only records what you sent: the transfer itself is yours to make. An underpaid charge or a late payment has to be accepted before it can be refunded, or `recordRefund()` throws a `ValidationError` on `amount` saying so, and the network surcharge is never refundable.

## Invoices

An invoice is a bill with a hosted page, where the customer pays in the coin of their choice. Use it for a bill to pay later, or when the customer should choose the coin.

```js
const invoice = await velirapay.invoices.create({
    customer_name: 'Grace Hopper',
    customer_email: 'grace@example.com',
    currency: 'USD',
    items: [
        { description: 'Consulting', quantity: '10', unit_amount: '100.00' },
        { description: 'Hosting', quantity: '1', unit_amount: '250.00' },
    ],
    due_at: '2026-12-01', // a day, as YYYY-MM-DD
    send_email: true,
});

invoice.number;    // "INV-0042"
invoice.hostedUrl; // the page where the customer pays

await velirapay.invoices.send(invoice.id); // email it, or send a reminder
await velirapay.invoices.void(invoice.id);

const overdue = await velirapay.invoices.list({ overdue: true });
const hers = await velirapay.invoices.list({ search: 'grace@example.com' });
```

Pass `amount` instead of `items` to bill a single total. The items may each cost less than the lowest price of the currency, as long as they add up to it.

An invoice can be emailed once every 10 minutes. An account can send 100 emails to its customers an hour, or 10 until one of its owner's accounts has been paid in live mode: invoices, charges emailed to their customers and refund notices together, shared with the other accounts its owner owns. Past either limit, `send()` throws a `RateLimitError` whose `retryAfter()` says how many seconds to wait, and `create()` with `send_email` throws it and creates nothing. In test mode, invoices are only emailed to members of your account: anyone else is refused with a `ValidationError` on `customer_email`, by `send()` as by `create()` with `send_email`.

## Payment links

A payment link is one reusable public checkout page, for a fixed price or one the customer chooses, opened by many customers who each pick their own coin. Create it once and share it. To charge one customer, [create a charge](#charges) instead.

```js
import { Asset, PaymentLinkStatus, PricingType } from 'velirapay';

const link = await velirapay.paymentLinks.create({
    title: 'Pro plan',
    pricing_type: PricingType.Fixed,
    amount: '150.00',
    currency: 'EUR',
    accepted_assets: [Asset.BTC, Asset.ETH, Asset.USDC], // null accepts every coin the account takes
    success_url: 'https://example.com/thanks',
    custom_fields: [{ label: 'Company', required: false }],
});

link.checkoutUrl; // https://velirapay.com/pay/…

const tipJar = await velirapay.paymentLinks.create({
    title: 'Tip jar',
    pricing_type: PricingType.Open,
    currency: 'USD',
    suggested_amounts: ['5.00', '10.00', '25.00'],
    min_amount: '1.00',
});

await velirapay.paymentLinks.update(link.id, { title: 'Pro plan (yearly)' });
await velirapay.paymentLinks.archive(link.id); // stops taking payments
await velirapay.paymentLinks.restore(link.id);

const existing = await velirapay.paymentLinks.list({ status: PaymentLinkStatus.Active, search: 'Pro plan' });
```

## Coupons

A coupon takes a percentage or a fixed amount off a payment. Customers type its code on the hosted checkout of a payment link, you add it to the link's URL so it is already applied (`https://velirapay.com/pay/p4n8r2t6y1ua?coupon=SPRING10`), or you pass it as `coupon` when you [create a charge](#charges). Invoices do not take coupons.

```js
const coupon = await velirapay.coupons.create({
    code: 'SPRING10',               // 3 to 32 letters, digits, dashes or underscores, stored in capitals
    percent_off: '10',              // or amount_off: '5.00' with a currency
    max_redemptions: 100,           // an open charge holds a use until it is paid, expires or is canceled
    once_per_customer: true,        // the customer's email is then required to use it
    payment_links: ['p4n8r2t6y1ua'], // empty for every link, and charges made without one
    expires_at: '2026-12-31',       // a bare date ends at 23:59:59 UTC
});

coupon.id;            // "SPRING10": the code is the id, and is matched in any case
coupon.timesRedeemed; // how many paid charges used it

await velirapay.coupons.update('SPRING10', { active: false }); // pause it
await velirapay.coupons.delete('SPRING10'); // charges that used it keep its code and their discount

const found = await velirapay.coupons.list({ search: 'spring' });
```

`currency` is required with `amount_off` or `min_amount`, and the coupon then only works on payments in that currency. A coupon cannot take a payment under the lowest price of its currency. Once a coupon exists, its code, discount, currency and `min_amount` cannot change: `update()` takes `max_redemptions`, `once_per_customer`, `payment_links` (which replaces the whole list), `active` and `expires_at`.

A coupon that cannot be used throws a `ValidationError` on `coupon` from `charges.create()`, saying why: it does not exist in this mode, is paused, has expired, is limited to other links, is for another currency, needs a higher price, would leave nothing to pay or is used up, or it is once per customer and the charge has no customer email or that customer already used it.

## Payouts

Every paid charge has one payout: what came in, what was kept, what you are owed, what actually landed and the transaction that carried it. These only read: payouts go out on their own, and nothing here can raise, redirect or reverse one.

```js
import { Asset, PayoutStatus } from 'velirapay';

const payout = await velirapay.payouts.retrieve('k3v9x2m7q8wz'); // by the charge's id; a NotFoundError until it is paid

payout.status;      // "pending", "sending", "sent", "failed" or "manual"
payout.isSent();    // confirmed: the money is in your wallet
payout.grossAmount; // what the customer paid
payout.feeAmount;   // what was kept
payout.netAmount;   // what you are owed, before the chain's own fee
payout.networkFee;  // what the chain charged
payout.sentAmount;  // what therefore reached you
payout.payoutTxid;  // the transaction, and payout.explorerUrl its page on a block explorer
payout.lastError;   // why the last try did not work, or why it is held
payout.nextAttemptAt;

const failed = await velirapay.payouts.list({ status: PayoutStatus.Failed });
const tether = await velirapay.payouts.list({ asset: Asset.USDT, search: '0x9a4f' }); // a charge id or a transaction hash

for (const coin of await velirapay.payouts.summary()) {
    coin.asset;             // one row per coin you have been paid in
    coin.paidOutAmount;     // what has reached you
    coin.inFlightAmount;    // what is on its way
    coin.owedAmount;        // what has not left yet
    coin.feeAmount;
    coin.waitingForAddress; // how many payouts wait for you to give an address
}
```

### Payout addresses

Payouts go to one address per network family, which the [`AddressNetwork`](#constants) values name: `bitcoin`, `litecoin`, `dogecoin`, `bitcoincash`, `evm` (Ethereum, for ETH, USDT and USDC there), `bsc` (BNB Chain), `base`, `arbitrum`, `polygon`, `tron`, `monero`, `solana` and `lightning`, whose address is a Lightning address such as `name@example.com`. BNB Chain, Base, Arbitrum One and Polygon each have their own, so nobody is paid on a chain they did not choose.

```js
import { AddressNetwork } from 'velirapay';

for (const address of await velirapay.payoutAddresses.list()) { // needs payout_addresses:read
    address.network; // "bitcoin", "evm", …
    address.name;    // "Bitcoin"
    address.address; // null while there is none: payouts in its coins wait for one
    address.assets;  // the coins on offer on that network
}

await velirapay.payoutAddresses.update(AddressNetwork.Bitcoin, { address: 'bc1q…' });
await velirapay.payoutAddresses.delete(AddressNetwork.Bitcoin);
```

`list()` gives one entry per network with coins on offer in the key's mode. Changing one needs the sensitive `payout_addresses:write` permission and an owner switching on "Let API keys and AI apps change payout addresses" under Payment settings, which `account.apiPayoutAddressChanges` reads; until then `update()` and `delete()` throw a `PermissionError` saying so. Owners and admins are emailed about every change, and once the account has been paid out, payouts to a new address wait 48 hours, until `payoutsHeldUntil`.

## Events

Every change to a charge or an invoice is recorded as an event, such as `charge.paid` or `invoice.viewed`. Webhooks carry the same events.

```js
import { EventType } from 'velirapay';

const forCharge = await velirapay.events.list({ charge: 'k3v9x2m7q8wz' });
const detected = await velirapay.events.list({ type: EventType.ChargePaymentDetected });

const event = await velirapay.events.retrieve('9b1f7a3e-2c4d-4e8f-a6b0-1d2c3e4f5a6b');
event.is(EventType.ChargePaid);
event.details; // what was recorded, such as the amount and txid of a payment or a refund
event.charge;  // the charge as it is now, without its timeline
```

## Webhooks

Add an endpoint in the dashboard under **Developers → Webhooks**, or [with the API](#webhook-endpoints), and keep its signing secret (`whsec_…`). Each delivery is a POST with a JSON body and these headers:

| Header | |
| --- | --- |
| `X-VeliraPay-Signature` (`Webhook.SIGNATURE_HEADER`) | `t={timestamp},v1={signature}` |
| `X-VeliraPay-Event` (`Webhook.EVENT_HEADER`) | The event type, such as `charge.paid` |
| `X-VeliraPay-Delivery` (`Webhook.DELIVERY_HEADER`) | The delivery's id |

`Webhook.constructEvent()` checks a delivery's signature and parses it. Pass it the **raw** body: a body parsed and encoded again no longer matches its signature. With Express:

```js
import express from 'express';
import { EventType, SignatureVerificationError, Webhook } from 'velirapay';

const app = express();

app.post('/webhooks/velirapay', express.raw({ type: 'application/json' }), (req, res) => {
    let event;

    try {
        event = Webhook.constructEvent(req.body, req.get(Webhook.SIGNATURE_HEADER), process.env.VELIRAPAY_WEBHOOK_SECRET);
    } catch (error) {
        if (error instanceof SignatureVerificationError) {
            return res.sendStatus(400);
        }

        throw error;
    }

    // Sent when the endpoint is added or moved: it receives nothing else until it answers.
    if (event.isVerification()) {
        return res.type('application/json').send(event.challengeResponse());
    }

    // A sample from "Send test event", or a test-mode event: acknowledge it, and fulfil nothing for real.
    if (event.test || !event.isLiveMode()) {
        return res.sendStatus(200);
    }

    // The same event can arrive more than once: remember this key, and skip the events you have handled.
    const key = event.eventId ?? event.id;

    if (event.is(EventType.ChargePaid) && event.charge !== null) {
        // A charge made without metadata, such as one from a payment link, has no order_id.
        const orderId = event.charge.metadata['order_id'];

        if (typeof orderId === 'string') {
            // Fulfil the order, once per key.
        }
    }

    return res.sendStatus(200);
});
```

Where a framework hands you a Fetch API `Request`, as Next.js route handlers do, `await Webhook.constructEventFromRequest(request, secret)` reads the body and the header itself.

Some things to know:

- **Answer the verification challenge.** When an endpoint is added, or its URL changes, VeliraPay sends it a signed `webhook.verification` delivery and sends it nothing else until it answers with HTTP 200 and the challenge, as `event.challengeResponse()` gives it. Endpoint URLs must use `https://`.
- **A second signature for a day after a rotation.** For a day after you rotate the signing secret, the `X-VeliraPay-Signature` header carries a `v1` made with the old secret too, so a receiver that still has the old one keeps working. `constructEvent()` accepts a delivery whichever `v1` matches.
- **Signatures expire.** A signature more than 5 minutes from the current time is rejected, which stops an intercepted delivery from being replayed. Change the limit with the `tolerance` argument, in seconds; `0` turns the age check off.
- **Answer quickly.** A delivery counts as delivered when your endpoint answers with a 2xx status within 15 seconds, so queue slow work. Redirects are not followed, so a 3xx counts as a failure: give the endpoint's final URL.
- **Failed deliveries are retried.** A delivery is tried 14 times over about 3 days: after 1 minute, 5 minutes, 30 minutes, 1 hour, 2 hours, 4 hours and 8 hours, then every 10 hours. When one runs out of tries, the account's owners and admins are emailed, at most once a day per endpoint, and an endpoint whose last 15 deliveries all failed is switched off until it is switched back on. While it is off it receives nothing, and switching it back on does not send what it missed; `webhookEndpoints.retryDelivery()` sends one again.
- **Skip duplicates by event.** A retried delivery keeps its id (`event.id`, also the `X-VeliraPay-Delivery` header), but each endpoint gets its own copy of an event under its own id. `event.eventId` is the same on every copy and is the event's id in [`events.retrieve()`](#events), so `event.eventId ?? event.id` is the key to remember.
- **Fulfil once.** A paid invoice sends both `charge.paid`, for the charge that paid it, and `invoice.paid`. Fulfil on one of them.
- **Deliveries can arrive out of order.** When the order matters, fetch the current state, such as with `velirapay.charges.retrieve(event.charge.id)` once `event.charge` is not `null`, rather than trusting the payload.
- **Test deliveries.** The dashboard's "Send test event" button and `webhookEndpoints.test()` send a sample `charge.paid` with `event.test` set to `true` and no `eventId`. Its charge is a made-up sample without many of a real one's fields, such as `transactions` and `customer`. An endpoint added in test mode receives the test-mode events, whose `event.mode` is `"test"`.

`charge.payment_detected` arrives as soon as a transfer to a charge is seen, before it is confirmed: tell the customer, but do not fulfil. `charge.late_payment` arrives when a transfer reaches a charge that already expired, was canceled or was paid, or, once it has confirmed, when one tops up an underpaid charge after its rate lock ended. A late payment to an expired, canceled or underpaid charge waits for you to [accept it](#short-and-late-payments). Both events carry that transfer as `event.transaction`; for every other event it is `null`.

`payout.sent` arrives when your share of a paid charge has been broadcast, and `payout.confirmed` when the chain has confirmed it. Both carry the charge as `event.charge` and the payout as `event.payout`, the same object `payouts.retrieve()` answers with; for every other event it is `null`. Book the money on `payout.confirmed`: a broadcast payout can still be dropped and go out again, so `payout.sent` can arrive more than once for a charge.

The charge and invoice in a delivery are not quite the ones the API answers with:

- A charge's coin amounts and exchange rate carry all 18 decimal places (`"0.002500000000000000"` rather than `"0.0025"`). Compare amounts as numbers, not as strings.
- A charge has no `timeline`, `refunds`, `checkoutUrl`, `receiptUrl`, `successUrl`, `cancelUrl` or `successMessage`. It names its payment link with its title and its invoice with its number: `charge.paymentLink` and `charge.invoice` hold the codes, and `charge.paymentLinkTitle` and `charge.invoiceNumber` the rest, which are `null` on the API's charges.
- An invoice has no `overdue` or `documentUrl`; both are `null`.
- `charge.refunded` carries no refund. Read its amount, txid and reason from the event: `(await velirapay.events.retrieve(eventId)).details`.

Fetch the object when you need what a delivery leaves out.

## Webhook endpoints

List them to see from your code why deliveries are not arriving:

```js
import { WebhookDeliveryStatus } from 'velirapay';

for (const endpoint of await velirapay.webhookEndpoints.list()) {
    endpoint.url;
    endpoint.events;                // the event types it takes
    endpoint.active;
    endpoint.verified;              // it receives nothing until it has answered the challenge
    endpoint.isReceiving();         // both of those
    endpoint.deliveriesCount;       // of the last 30 days
    endpoint.failedDeliveriesCount;
}

for (const failure of await velirapay.webhookEndpoints.deliveries('12', { status: WebhookDeliveryStatus.Failed })) {
    failure.event;          // "charge.paid"
    failure.responseStatus; // what the endpoint last answered
    failure.error;
}
```

Retrieve one delivery to see every attempt to send it, the latest first, and the JSON body it carried:

```js
const delivery = await velirapay.webhookEndpoints.retrieveDelivery('12', '9d2e0b8a-0000-4000-8000-5f3a00000000');

for (const attempt of delivery.attemptLog) {
    attempt.requestHeaders;  // the signatures cut out, the timestamp they signed kept
    attempt.responseStatus;  // null when nothing answered
    attempt.responseHeaders; // a few dozen at most, never cookies
    attempt.responseBody;    // the first 2,000 characters
    attempt.durationMs;
    attempt.error;           // such as a timeout
}

delivery.payload; // the JSON body, or null for a key without events:read
```

Deliveries and their attempts are kept for 30 days.

A key with the sensitive `webhook_endpoints:write` permission ticked can also add and change them. A new endpoint is sent its verification challenge at once, and the answer that adds it, or rotates its secret, is the only one that carries the signing secret:

```js
import { EventType } from 'velirapay';

const endpoint = await velirapay.webhookEndpoints.create({
    url: 'https://example.com/webhooks/velirapay',
    events: [EventType.ChargePaid, EventType.InvoicePaid],
});

endpoint.secret;            // "whsec_…": store it now, it is never shown again
endpoint.verificationError; // null once the endpoint answered the challenge

await velirapay.webhookEndpoints.update(endpoint.id, { active: false });
await velirapay.webhookEndpoints.verify(endpoint.id); // send the challenge again
await velirapay.webhookEndpoints.test(endpoint.id);   // a sample charge.paid, marked test

const rotated = await velirapay.webhookEndpoints.rotateSecret(endpoint.id);
rotated.secret;                  // the new one
rotated.previousSecretExpiresAt; // until when the old one signs too

await velirapay.webhookEndpoints.retryDelivery(endpoint.id, '9d2e0b8a-0000-4000-8000-5f3a00000000');
await velirapay.webhookEndpoints.delete(endpoint.id);
```

An account can have 10 endpoints in each mode. Adding an endpoint, giving one a new `url`, `verify()`, `test()` and `retryDelivery()` each send the endpoint a request, so together they are limited to 10 a minute per key. Past that the API answers 429: a short wait is [retried](#retries-and-idempotency) for you, and a longer one throws a `RateLimitError` whose `retryAfter()` says how many seconds to wait.

**When the answer that carries a secret is lost.** The API never keeps the answers of `create()` and `rotateSecret()`, since they carry a secret it shows once. If one is lost on the way, a repeat with the same idempotency key, which is what the library's own [retry](#retries-and-idempotency) sends, throws a `ConflictError` whose `wasReplayed()` is `true`: the endpoint was added, or its secret rotated, but the secret cannot be shown again.

- After `create()`, find the endpoint with `list()` and call `rotateSecret()`, since nothing relies on its first secret yet, or `delete()` it and add it again.
- After `rotateSecret()`, the secret your receiver holds keeps verifying for a day, as the previous one. Rotating again makes the lost secret the previous one and drops the one you hold at once, so only rotate again, with a fresh idempotency key, when you can deploy the new secret straight away. Deliveries that fail in between are retried.

## Your account

```js
const account = await velirapay.account.retrieve();

account.displayName;
account.supportEmail;
account.supportPhone;            // shown to customers next to the support email
account.logoDarkUrl;             // the logo for a dark background, or null
account.termsUrl;
account.refundPolicyUrl;
account.acceptedAssets;          // ["BTC", "ETH", …], the coins it takes right now, in the key's mode
account.mode;                    // "live" or "test"
account.type;                    // "personal" or "organization"
account.checkout;                // appearance, coinOrder, defaultCoin, successUrl, cancelUrl, successMessage, hidePoweredBy
account.invoices;                // numberPrefix, footer, showBusinessDetails
account.checkoutLocale;          // the checkout's fallback language, or null for English
account.invoiceReminders;
account.apiPayoutAddressChanges; // whether an owner lets API keys change payout addresses

const { business } = account;    // as entered under Business details in the dashboard's settings
business.type;                   // a BusinessType value, such as BusinessType.Company
business.legalName;
business.registrationNumber;
business.taxId;
business.address.line1;          // also line2, city, postalCode, state and country (ISO 3166 two-letter code)
business.industry;               // an Industry value, such as Industry.Software
business.productDescription;
business.monthlyVolume;          // a MonthlyVolume value, such as MonthlyVolume.Under50k ("10k_50k")
business.phone;                  // in international format
```

Every business field is `null` until it is filled in. `type`, `industry` and `monthlyVolume` are also `null` for a value the API adds after this version of the library; `business.get('industry')` still returns it as sent. The business details are only sent to a key with the sensitive `account:write` permission, which full access does not include. For any other key every business field is `null`, and so is `account.get('business')`.

The plan is on the account too: `account.plan` (`"free"` or `"pro"`), `account.feePercent`, the share of each payment kept as the fee, and `account.proEndsAt`, with `account.isPro()`.

A key with the sensitive `account:write` or `payment_settings:write` permission can change the account, in the shape it is read in, with `null` to clear a field:

```js
import { CheckoutAppearance, CheckoutLocale } from 'velirapay';

await velirapay.account.update({ display_name: 'Acme', checkout: { appearance: CheckoutAppearance.Dark } });
await velirapay.account.updatePaymentSettings({ underpayment_tolerance: '2', checkout_locale: CheckoutLocale.French, invoice_reminders: true });
```

### Overview

The dashboard's figures for the last 30 days, today included, and what needs a person now. It needs `overview:read`.

```js
const overview = await velirapay.overview.retrieve();

overview.period;                // { from, to }, as Dates at midnight UTC
overview.volume;                // "1250.00", in overview.currency
overview.volumeChangePercent;   // against the 30 days before; null when nothing was paid then
overview.sentVolume;            // what the payouts confirmed in the period came to
overview.paidCharges;
overview.conversionRatePercent; // the share of paid, expired and canceled charges that were paid; null when none
overview.funnel;                // { started, paid, waiting, abandoned, incomplete, assets }: how attempts to pay ended
overview.attention;             // { underpaidCharges, latePayments, payoutsWaitingForAddress, failingWebhookEndpoints }
overview.assets;                // [{ asset, paidCharges, sharePercent }], each coin's share of the paid charges
overview.topPaymentLinks;       // [{ id, title, paidCharges }]
overview.setup;                 // { payoutAddress, paymentLink, paidCharge, webhookEndpoint, publicProfile }

for (const day of overview.daily) {
    day.date;        // a Date, at midnight UTC
    day.volume;      // what was paid that day, in overview.currency
    day.sentVolume;
    day.paidCharges;
}

for (const short of overview.attention.underpaidCharges) {
    short.id;             // the charge, to accept or chase
    short.amount;         // what it asked for, in its coin
    short.receivedAmount; // what arrived
}
```

### Activity

```js
import { ActivityAction } from 'velirapay';

for await (const entry of velirapay.activity.iterator({ action: 'sensitive' })) { // needs activity:read
    entry.action;    // "api_key.created", one of the ActivityAction values
    entry.actor;     // a member's name, or 'API key "Shop server"'
    entry.ipAddress;
}

const rotations = await velirapay.activity.list({ action: ActivityAction.WebhookSecretRotated, from: '2026-11-01' });
```

The log holds the key's mode and what belongs to none, such as sign-ins, whose `mode` is `null`; `network: 'live'` or `'test'` leaves those out. `action: 'sensitive'` narrows it to what touches money or access.

## Members and invitations

```js
import { MemberRole } from 'velirapay';

for (const member of await velirapay.members.list()) { // needs members:read
    member.name;
    member.role; // "owner", "admin", "finance", "support" or "viewer"
}

await velirapay.invitations.create({ email: 'grace@example.com', role: MemberRole.Admin }); // needs members:write
await velirapay.members.update('3', { role: MemberRole.Finance });
await velirapay.members.remove('3'); // also revokes the API keys they made
```

Owners and admins run everything. Finance creates charges, invoices, payment links and coupons, accepts short and late payments, records refunds and sees payouts; support looks up charges and customers, emails payment pages and invoices again and cancels charges; a viewer sees payments and payouts and changes nothing.

`members:read` and `members:write` are sensitive. The roles are those of whoever made the key: an owner's or an admin's key invites people and cancels invitations, and only an owner's key changes a role or removes a member. Owners are never changed or removed this way and nobody is made one, so `MemberRole.Owner` only appears in answers: invitations and role changes take an `AssignableMemberRole`.

## API keys

```js
import { ApiKeyPermission } from 'velirapay';

const apiKey = await velirapay.apiKeys.create({
    name: 'Shop server',
    permissions: [ApiKeyPermission.ChargesRead, ApiKeyPermission.ChargesWrite], // leave out for full access
    allowed_ips: ['203.0.113.7'],                                               // leave out for anywhere
});

apiKey.key; // "vp_live_…", shown this once: store it now

await velirapay.apiKeys.update(apiKey.id, { name: 'Shop server (old)' });
await velirapay.apiKeys.revoke(apiKey.id);
```

A key is made in the mode of the key that makes it. An account can have 10 keys in each mode, and a key can be tied to up to 20 addresses or ranges. `api_keys:read` and `api_keys:write` are sensitive, and a key can make or change no key with a permission or an address it does not have itself, nor touch a key that reaches further.

**When the answer that carries the key is lost.** The API never keeps the answer of `create()`, since it carries the key. If it is lost on the way, a repeat with the same idempotency key, which is what the library's own [retry](#retries-and-idempotency) sends, throws a `ConflictError` whose `wasReplayed()` is `true`: the key was made, but cannot be shown again. Find it with `list()` by its `name` and `createdAt`, `revoke()` it, and create another with a fresh idempotency key.

## Pro

Pro keeps no fee on your payments. A key with `billing:write`, which full access includes, can start paying for a month of it in crypto, with a live key:

```js
const payment = await velirapay.billing.startProPayment({ asset: 'BTC' });

payment.checkoutUrl; // where to pay the month
payment.price;       // in payment.currency
payment.assetAmount; // what to send, in the coin
payment.started;     // false when a payment in that coin was already waiting, which it answers with
```

## What the client covers

| Property | Methods |
| --- | --- |
| `charges` | `create`, `retrieve`, `list`, `iterator`, `send`, `cancel`, `accept`, `recordRefund`, `simulate` |
| `invoices` | `create`, `retrieve`, `list`, `iterator`, `send`, `void` |
| `paymentLinks` | `create`, `retrieve`, `update`, `list`, `iterator`, `archive`, `restore` |
| `coupons` | `create`, `retrieve`, `update`, `list`, `iterator`, `delete` |
| `assets` | `list` |
| `payouts` | `retrieve` (by the charge's id), `list`, `iterator`, `summary` |
| `payoutAddresses` | `list`, `update`, `delete` |
| `events` | `retrieve`, `list`, `iterator` |
| `webhookEndpoints` | `create`, `retrieve`, `update`, `delete`, `list`, `iterator`, `verify`, `test`, `rotateSecret`, `deliveries`, `retrieveDelivery`, `retryDelivery` |
| `account` | `retrieve`, `update`, `updatePaymentSettings` |
| `overview` | `retrieve` |
| `activity` | `list`, `iterator` |
| `apiKeys` | `create`, `update`, `revoke`, `list`, `iterator` |
| `members` | `update`, `remove`, `list`, `iterator` |
| `invitations` | `create`, `cancel`, `list`, `iterator` |
| `billing` | `startProPayment` |

Each takes the parameters the [API reference](https://velirapay.com/docs) gives, typed, and answers with an object such as a `Charge`. `get('field')` reads an attribute this version of the library does not know yet, and `JSON.stringify()` gives the object as the API sent it. Objects have helpers such as `charge.isPaid()`.

Most endpoints need a permission, which a key with full access has, except the sensitive ones: `activity:read`, `account:write`, `payment_settings:write`, `payout_addresses:write`, `webhook_endpoints:write`, `api_keys:read`, `api_keys:write`, `members:read` and `members:write`. Only a key made with them ticked has those, and only while whoever made it is still an owner or admin. A key without the permission an endpoint needs gets a `PermissionError` naming it.

For an endpoint the library has no method for yet, send the request yourself: `await velirapay.request('GET', '/v1/charges', { per_page: 5 })` answers with the response, whose `json()` decodes it. Its parameters are sent as they are.

## Lists and pagination

`list()` methods answer with one page, newest first (members oldest first). Pass `page` and `per_page` (up to 100, 25 by default):

```js
const page = await velirapay.charges.list({ status: 'paid', per_page: 100 });

for (const charge of page) {
    // …
}

page.total;
page.hasMore();
const next = await page.nextPage(); // null on the last page
```

`iterator()` walks every page, fetching each one as it is reached:

```js
for await (const charge of velirapay.charges.iterator({ status: 'paid' })) {
    // …
}
```

Every page also has `meta`, what the answer said about the list as the API sent it, and `mode` for the lists whose answer says it: the coins on offer and the activity log. `assets.list()` answers with a single page holding every coin, an `AssetPage` whose `currencies` are the currencies prices can be asked in.

`payoutAddresses.list()` and `payouts.summary()` answer with plain arrays. The mode they are in is `velirapay.mode()`, and whether an owner lets API keys change payout addresses is `account.apiPayoutAddressChanges`. `velirapay.lastResponse()?.json()` gives the whole answer to the latest request, its `meta` included, but with requests running side by side it is whichever finished last.

## Errors

A failed request throws an error carrying the API's message. They are exported, and all extend `VeliraPayError`:

| Error | When |
| --- | --- |
| `AuthenticationError` | The API key is missing, wrong or revoked (401). |
| `PermissionError` | The API key may not do this (403): a restricted key without the permission the endpoint needs, such as `charges:write`, or a key used from an IP address it does not allow. The message names which. An owner or admin can change the key's permissions and addresses in the dashboard; the key itself stays the same. |
| `NotFoundError` | The object does not exist, or belongs to the other mode (404). |
| `ConflictError` | The object cannot make that change (409), such as canceling a charge once a transfer to it has been seen, accepting one that is neither underpaid nor late, or sending or voiding an invoice that is no longer open. Also when an idempotency key was used for a different request, or is held by a request still being processed, which is [retried](#retries-and-idempotency) for you. `wasReplayed()` is `true` when the key belongs to a request that succeeded but whose answer carried a new API key or signing secret, which cannot be shown again. |
| `ValidationError` | The request has invalid fields (422). `errors()` lists them by field, and `firstError('amount')` gives the first message for one. |
| `RateLimitError` | Too many requests (429), including a charge or invoice emailed again within 10 minutes, the hourly limit on emails to customers and the limit on new charges. `retryAfter()` says how many seconds to wait. |
| `ServerError` | VeliraPay had a problem (5xx), such as no exchange rate being available to create a charge with (503). |
| `InvalidRequestError` | Any other 4xx, such as an `Idempotency-Key` longer than 255 characters (400). |
| `UnexpectedResponseError` | The API answered with something the library cannot read, such as a body that is not JSON. |
| `ConnectionError` | The API could not be reached, after any retries. Its `cause` is the error the `fetch` threw. |
| `SignatureVerificationError` | A webhook's signature is missing, does not match, or is too old. |
| `InvalidArgumentError` | The library was given something it cannot use, such as an API key that does not start with `vp_live_` or `vp_test_`, or an amount that is not a finite number. |

Every error from an API answer extends `ApiError`, with `status`, `body` (the decoded response), `header(name)` and `retryAfter()`, which gives the `Retry-After` in seconds, or `null` when the answer had none.

```js
import { ApiError, ValidationError } from 'velirapay';

try {
    await velirapay.charges.create({ amount: '0', currency: 'EUR', asset: 'BTC' });
} catch (error) {
    if (error instanceof ValidationError) {
        error.errors(); // { amount: ['…'] }
        error.firstError('amount');
    } else if (error instanceof ApiError) {
        error.status;
        error.message;
        error.body;
    }
}
```

## Retries and idempotency

Requests that fail with a network error, a rate limit (429) or an outage (502, 503, 504) are tried again up to twice, waiting a little longer each time, or as long as the API's `Retry-After` header asks. A 500 is retried for reads only, since a write may have been carried out. A 409 that carries a `Retry-After` is the API still working on an earlier request with the same idempotency key: it is waited out and tried again, and the retry gets that request's answer once it is done. A `Retry-After` longer than `maxRetryAfter` (10 seconds unless [configured](#configuration) otherwise) is not waited out: the error is thrown straight away, and its `retryAfter()` says how long to wait.

Each key may make 120 requests a minute, and each network, an IPv4 address or an IPv6 /64, 600.

While retries are on, each write carries an `Idempotency-Key` header, so the API carries out a retried request once. The library makes up a key per call; pass your own, such as an order number, to make a call safe to repeat across processes:

```js
const charge = await velirapay.charges.create({ amount: '49.90', currency: 'EUR', asset: 'BTC' }, { idempotencyKey: 'order-1042' });

velirapay.lastResponse()?.wasReplayed(); // true when the API answered from an earlier request
```

What the API does with a key:

- Successful (2xx) answers are replayed for 24 hours to requests repeating the key. A request that failed stores nothing, so repeating it runs it again.
- An answer that carries a new API key or webhook signing secret is never stored. Repeating the key of `apiKeys.create()`, `webhookEndpoints.create()` or `rotateSecret()`, as the library's own retry does after a lost answer, throws a `ConflictError` whose `wasReplayed()` is `true`, which means the first request succeeded: see [webhook endpoints](#webhook-endpoints) and [API keys](#api-keys) for how to recover. It is the only conflict that is a replay.
- Reusing a key with a different body or query string throws a `ConflictError`.
- A request holds its key for up to 60 seconds while it is being processed. Another one with the same key gets a 409 with `Retry-After: 1` in that time, which the library waits out and retries.
- A key covers one account, one mode, one HTTP method and one path, and every API key of that account and mode shares it, so two servers with different API keys still create one charge for one idempotency key. It is at most 255 characters.

## Constants

The values the API uses are in exported constants, each a frozen object with a type of the same name, such as `ChargeStatus.Paid` and `Asset.USDT`. Methods take them or plain strings, and fields that hold one are typed with it, as a string that may also be a value the API adds later.

| Constant | Values |
| --- | --- |
| `Asset` | Every coin the API knows, on its network, such as `BTC`, `BTC_LIGHTNING`, `USDT` (on Ethereum), `USDT_TRON` and `USDC_BASE` |
| `ChargeStatus` | `pending`, `underpaid`, `paid`, `expired`, `canceled` |
| `InvoiceStatus` | `open`, `paid`, `void` |
| `PaymentLinkStatus` | `active`, `archived` |
| `PricingType` | `fixed`, `open` |
| `PayoutStatus` | `pending`, `sending`, `sent`, `failed`, `manual` |
| `EventType` | Every event webhooks and the events API carry, such as `charge.paid` |
| `Mode` | `live`, `test` |
| `Currency` | `USD`, `EUR`, `GBP`, `CAD`, `AUD`, `CHF`, `TRY` |
| `AddressNetwork` | The networks [payout addresses](#payout-addresses) are for, such as `bitcoin` and `evm` |
| `ApiKeyPermission` | Every permission an [API key](#api-keys) can have, such as `charges:read` |
| `MemberRole` | `owner`, `admin`, `finance`, `support`, `viewer`; `AssignableMemberRole` is the type of every one but `owner` |
| `ActivityAction` | Every action the [activity log](#activity) records, such as `api_key.created` |
| `WebhookDeliveryStatus` | `pending`, `succeeded`, `failed` |
| `AccountType` | `personal`, `organization` |
| `PlanName` | `free`, `pro` |
| `CheckoutAppearance` | `auto`, `light`, `dark` |
| `CheckoutLocale` | `en`, `fr`, `de`, `es`, `tr`, `pt`, `ru`, `ar` |
| `BusinessType`, `Industry`, `MonthlyVolume` | The [business details](#your-account) of an account |

## Test mode

Keys starting with `vp_test_` work in test mode: charges are paid with test coins on each chain's test network, and nothing touches real funds. Test and live objects are fully separate: a live key cannot see test charges, and each mode has its own webhook endpoints. Invoices and charge emails only go to members of your account.

```js
velirapay.isTestMode(); // read from the key's prefix

// Pay a test charge without any coins: it becomes paid, and the webhooks and emails go out as for a real payment.
await velirapay.charges.simulate('k3v9x2m7q8wz');
await velirapay.charges.simulate('k3v9x2m7q8wz', { amount: '0.001' }); // less than is due, to try an underpayment
```

BNB Chain, Base, Arbitrum One and Polygon have no test mode, so their coins can only be used with a live key.

Every key starts with `vp_live_` or `vp_test_`, and the client throws an `InvalidArgumentError` for any other, which the API would refuse.

## Configuration

```js
import { VeliraPayClient } from 'velirapay';

const velirapay = new VeliraPayClient(process.env.VELIRAPAY_API_KEY, {
    baseUrl: 'https://api.velirapay.com', // another API address, such as a staging one
    maxRetries: 2,                        // 0 turns retries off
    maxRetryAfter: 10,                    // the longest Retry-After, in seconds, waited out before trying again
    timeout: 30,                          // seconds an attempt may take
    appInfo: 'MyShop/2.1',                // added to the User-Agent
    fetch: globalThis.fetch,
});
```

`fetch` takes any implementation of the Fetch API, such as one that goes through a proxy or one that answers your tests. A network failure it reports, such as node-fetch's `FetchError`, is retried like one from the built-in `fetch`; any other error it throws passes straight through.

## Testing your integration

Sign a payload yourself to test your webhook handler: `Webhook.signatureHeader()` gives the header VeliraPay would send.

```js
import { Webhook } from 'velirapay';

const payload = JSON.stringify({
    id: 'a5f4b1c2-0000-4000-8000-000000000000',
    event: 'charge.paid',
    mode: 'test',
    created_at: new Date().toISOString(),
    data: { charge: { code: 'k3v9x2m7q8wz', status: 'paid', metadata: { order_id: '1042' } } },
});

await fetch('http://localhost:3000/webhooks/velirapay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [Webhook.SIGNATURE_HEADER]: Webhook.signatureHeader(payload, 'whsec_test') },
    body: payload,
});
```

To test code that calls the API, give the client a `fetch` that answers it, or use a test-mode key:

```js
import { VeliraPayClient } from 'velirapay';

const velirapay = new VeliraPayClient('vp_test_example', {
    fetch: async () => Response.json({ data: { id: 'k3v9x2m7q8wz', status: 'paid', checkout_url: 'https://velirapay.com/c/k3v9x2m7q8wz' } }),
});

const charge = await velirapay.charges.retrieve('k3v9x2m7q8wz');
charge.isPaid(); // true
```

## Development

```bash
npm install
npm run check   # types, the build and the tests
```

## License

MIT. See [LICENSE](LICENSE).
