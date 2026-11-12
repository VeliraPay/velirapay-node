# VeliraPay for Node.js

[![Tests](https://github.com/VeliraPay/velirapay-node/actions/workflows/tests.yml/badge.svg)](https://github.com/VeliraPay/velirapay-node/actions/workflows/tests.yml)
[![License](https://img.shields.io/github/license/VeliraPay/velirapay-node)](LICENSE)

The official Node.js library for [VeliraPay](https://velirapay.com), the crypto payment processor. It covers the v1 API (the coins on offer, charges, invoices, payment links, coupons, payouts, events, webhook endpoints and your account) and verifies the webhooks VeliraPay sends you. It is written in TypeScript, ships its type definitions and has no dependencies.

- [Requirements](#requirements)
- [Installation](#installation)
- [Charging a customer](#charging-a-customer)
- [Verifying webhooks](#verifying-webhooks)
- [Which one to use](#which-one-to-use)
- [What the client covers](#what-the-client-covers)
- [Lists and pagination](#lists-and-pagination)
- [Errors](#errors)
- [Retries and idempotency](#retries-and-idempotency)
- [Test mode](#test-mode)
- [Configuration](#configuration)

The full API reference is at [velirapay.com/docs](https://velirapay.com/docs).

## Requirements

Node.js 22 or later. The package works with both `import` and `require`.

## Installation

The first version, 0.1.0, is not on npm yet. Once it is:

```bash
npm install velirapay
```

## Charging a customer

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

They pay there, and VeliraPay tells your server about it with a [webhook](#verifying-webhooks). The exchange rate is locked when the charge is created, and the customer has 30 minutes to pay.

Parameters are sent as the API names them, in snake_case, and objects come back with camelCase properties: `charge.checkoutUrl`, `charge.assetAmount`, `charge.customer.ipAddress`. Amounts are always strings, such as `'49.90'`, never floating-point numbers, so no precision is lost. `checkoutUrl` is typed `string | null` because the charges in webhooks leave it out; a charge the API answers with always has one.

With CommonJS:

```js
const { VeliraPayClient } = require('velirapay');
```

A charge from your server comes from your server rather than the customer, so pass what you know about them as `customer` (`email`, `name`, `ip_address`, `user_agent`, `reference`, `phone`, `country` and `metadata`); it helps you spot fraud before you ship anything. `charge.customer` reads it back.

## Verifying webhooks

Add an endpoint in the dashboard under **Developers → Webhooks** and copy its signing secret (`whsec_…`). `Webhook.constructEvent()` checks a delivery's signature and parses it. Pass it the **raw** body: a body parsed and encoded again no longer matches its signature. With Express:

```js
import express from 'express';
import { SignatureVerificationError, Webhook } from 'velirapay';

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

    // The same event can arrive more than once: remember this key, and skip the events you have handled.
    const key = event.eventId ?? event.id;

    if (event.is('charge.paid')) {
        // Fulfil the order event.charge.metadata.order_id.
    }

    res.sendStatus(200);
});
```

Where a framework hands you a Fetch API `Request`, as Next.js route handlers do, `await Webhook.constructEventFromRequest(request, secret)` reads the body and the header itself.

Some things to know:

- **Answer the verification challenge.** When an endpoint is added, or its URL changes, VeliraPay sends it a signed `webhook.verification` delivery and sends it nothing else until it answers with HTTP 200 and the challenge, as `event.challengeResponse()` gives it. Endpoint URLs must use `https://`.
- **A second signature for a day after a rotation.** For a day after you rotate the signing secret, the `X-VeliraPay-Signature` header carries a `v1` made with the old secret too, so a receiver that still has the old one keeps working. `constructEvent()` accepts a delivery whichever `v1` matches.
- **Signatures expire.** A signature more than 5 minutes from the current time is rejected, which stops an intercepted delivery from being replayed. Change the limit with the `tolerance` argument, in seconds; `0` turns the age check off.
- **Answer quickly.** A delivery counts as delivered when your endpoint answers with a 2xx status within 15 seconds, so queue slow work. Redirects are not followed.
- **Failed deliveries are retried.** A delivery is tried 14 times over about 3 days.
- **Skip duplicates by event.** A retried delivery keeps its id (`event.id`), but each endpoint gets its own copy of an event under its own id. `event.eventId` is the same on every copy, so `event.eventId ?? event.id` is the key to remember.
- **Fulfil once.** A paid invoice sends both `charge.paid`, for the charge that paid it, and `invoice.paid`. Fulfil on one of them.
- **Deliveries can arrive out of order.** When the order matters, fetch the current state with `velirapay.charges.retrieve(event.charge.id)`.

`charge.payment_detected` arrives as soon as a transfer is seen, before it is confirmed: tell the customer, but do not fulfil. It and `charge.late_payment` carry that transfer as `event.transaction`; `payout.sent` and `payout.confirmed` carry the payout as `event.payout`.

To test your handler, sign a payload yourself: `Webhook.signatureHeader(payload, 'whsec_test')` gives the header VeliraPay would send.

## Which one to use

| When | Use | |
| --- | --- | --- |
| You are asking one customer for one payment | A charge | The default. It has one checkout page for that one payment, with the rate locked for 30 minutes. |
| The customer should choose the coin, or pays later | An invoice | It needs their name and email, has no timer, can be itemised and reminded, and lets them pick the coin on its page. |
| Many customers pay through the same public page | A payment link, created once | A product sold again and again, a tip jar, a link on your site. |

Do not create a new payment link for each customer or each order.

A charge needs its coin up front, because its exchange rate, amount and deposit address depend on it. Ask the customer on your own page, and offer them the coins from `velirapay.assets.list()`, which also gives the lowest price each can be charged at.

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

Each takes the parameters the [API reference](https://velirapay.com/docs) gives, typed, and answers with an object such as a `Charge`. `get('field')` reads an attribute this version of the library does not know yet, and `JSON.stringify()` gives the object as the API sent it. Status values are in exported constants, such as `ChargeStatus.Paid` and `Asset.USDT`, and objects have helpers such as `charge.isPaid()`.

Most endpoints need a permission, which a key with full access has, except the sensitive ones, such as `webhook_endpoints:write` and `api_keys:write`: only a key made with them ticked has those. A key without the permission an endpoint needs gets a `PermissionError` naming it.

For an endpoint the library has no method for yet, send the request yourself: `await velirapay.request('GET', '/v1/charges', { per_page: 5 })` answers with the response, whose `json()` decodes it.

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

`assets.list()` answers with a single page holding every coin, and `payoutAddresses.list()` and `payouts.summary()` with arrays.

## Errors

A failed request throws an error carrying the API's message. They are exported, and all extend `VeliraPayError`:

| Error | When |
| --- | --- |
| `AuthenticationError` | The API key is missing, wrong or revoked (401). |
| `PermissionError` | The API key may not do this (403): a restricted key without the permission the endpoint needs, or a key used from an IP address it does not allow. |
| `NotFoundError` | The object does not exist, or belongs to the other mode (404). |
| `ConflictError` | The object cannot make that change (409), such as canceling a charge that is no longer pending, or an idempotency key reused for a different request. |
| `ValidationError` | The request has invalid fields (422). `errors()` lists them by field, and `firstError('amount')` gives the first message for one. |
| `RateLimitError` | Too many requests (429). `retryAfter()` says how many seconds to wait. |
| `ServerError` | VeliraPay had a problem (5xx). |
| `InvalidRequestError` | Any other 4xx. |
| `ConnectionError` | The API could not be reached, after any retries. |
| `SignatureVerificationError` | A webhook's signature is missing, does not match, or is too old. |
| `InvalidArgumentError` | The library was given something it cannot use, such as an API key that does not start with `vp_live_` or `vp_test_`. |

Every error from an API answer extends `ApiError`, with `status`, `body` (the decoded response), `header(name)` and `retryAfter()`.

```js
import { ApiError, ValidationError } from 'velirapay';

try {
    await velirapay.charges.create({ amount: '0', currency: 'EUR', asset: 'BTC' });
} catch (error) {
    if (error instanceof ValidationError) {
        error.errors(); // { amount: ['…'] }
    } else if (error instanceof ApiError) {
        error.status;
    }
}
```

## Retries and idempotency

Requests that fail with a network error, a rate limit (429) or an outage (502, 503, 504) are tried again up to twice, waiting a little longer each time, or as long as the API's `Retry-After` header asks. A 500 is retried for reads only, since a write may have been carried out. A `Retry-After` longer than `maxRetryAfter` (10 seconds unless [configured](#configuration) otherwise) is not waited out: the error is thrown straight away, and its `retryAfter()` says how long to wait.

While retries are on, each write carries an `Idempotency-Key` header, so the API carries out a retried request once. The library makes up a key per call; pass your own, such as an order number, to make a call safe to repeat across processes:

```js
const charge = await velirapay.charges.create(params, { idempotencyKey: 'order-1042' });
```

For 24 hours, a request repeating a key gets the first successful response, and `velirapay.lastResponse()?.wasReplayed()` is then true. Reusing a key with a different body throws a `ConflictError`. A key covers one account, one mode, one method and one path, and is at most 255 characters.

## Test mode

Keys starting with `vp_test_` work in test mode: charges are paid with test coins on each chain's test network, and nothing touches real funds. Test and live objects are fully separate, and each mode has its own webhooks.

```js
velirapay.isTestMode(); // read from the key's prefix

// Pay a test charge without any coins: it becomes paid, and the webhooks go out as for a real payment.
await velirapay.charges.simulate('k3v9x2m7q8wz');
await velirapay.charges.simulate('k3v9x2m7q8wz', { amount: '0.001' }); // less than is due, to try an underpayment
```

## Configuration

```js
const velirapay = new VeliraPayClient(process.env.VELIRAPAY_API_KEY, {
    maxRetries: 2,         // 0 turns retries off
    maxRetryAfter: 10,     // the longest Retry-After, in seconds, waited out before trying again
    timeout: 30,           // seconds an attempt may take
    appInfo: 'MyShop/2.1', // added to the User-Agent
    fetch: globalThis.fetch,
});
```

`fetch` takes any implementation of the Fetch API, such as one that goes through a proxy or one that answers your tests.

## Development

```bash
npm install
npm run check   # types, the build and the tests
```

## License

MIT. See [LICENSE](LICENSE).
