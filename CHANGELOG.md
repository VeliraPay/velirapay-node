# Changelog

All notable changes to this library are documented here. It follows [Semantic Versioning](https://semver.org).

## 0.2.7 - 2026-11-20

- Added `Asset.USDT_SOLANA` and `Asset.USDC_SOLANA` and the seven activity actions for team creation and deletion, account deletion, recovery codes and data exports.
- Clarified how the payment's settlement terms apply to unused network reserves.

## 0.2.6 - 2026-11-17

- Typed checkout questions. `paymentLinks.create()` and `update()` take, for each of up to ten `custom_fields`, a `type` (one of the new `QuestionType` values: `text`, `textarea`, `number`, `email`, `phone`, `url`, `date`, `select`, `checkbox` or `country`), a `placeholder`, a `help` line, a select's `options`, `min` and `max` as strings, and for text a `pattern` with its `pattern_hint`, typed as `CheckoutQuestionParams`. Only `label` is needed now: `{ label, required }` alone is still a short text question, as before.
- `CheckoutQuestion`, what `link.customFields` holds, gains `type`, `placeholder`, `help`, `options`, `min`, `max`, `pattern` and `patternHint`: `type` is `'text'` for a link saved before types, and the settings a question does not use are `null`. `CustomFieldAnswer`, what `charge.customFields` holds in the API and in webhooks, gains `type`, `'text'` for details given when creating the charge or kept before types; `value` stays a string. Code that builds these objects itself needs the new properties.
- Lightning is removed: `Asset.BTC_LIGHTNING`, `AddressNetwork.Lightning` (`'lightning'`) and `charge.paymentRequest` are gone, because VeliraPay no longer offers Bitcoin over Lightning. The API never returned them for anyone, since no account ever had Lightning switched on.

## 0.2.5 - 2026-11-15

- An invoice must name its customer: `invoices.create()` needs `customer_name`, `customer_email` or both, and a name alone, such as the buyer's username on your site, is enough. Without either, it throws a `ValidationError` on `customer_name` and creates nothing, so an invoice that names nobody, which 0.2.4 described, can no longer be created. The types do not change, since either may be left out: `invoice.customerName` is `null` for an invoice given only an email, and `invoice.customerEmail` for one given only a name. `customer_email` is still required with `send_email`, and an invoice without one still cannot be sent or reminded.
- The README and doc comments now say so, and no longer describe an invoice that whoever has its link can pay.

## 0.2.4 - 2026-11-15

- `invoices.create()` no longer needs `customer_name` or `customer_email`: an invoice that names nobody can be paid by whoever has its link. `customer_email` is still required with `send_email`: without it, `create()` throws a `ValidationError` on `customer_email` and creates nothing, and `invoices.send()` throws the same for an invoice that has none.
- `invoice.customerName` and `invoice.customerEmail` are typed `string | null`, and are `null` for an invoice that names nobody, where they would have read `''`. TypeScript code that hands either to something expecting a `string` needs a check first. Invoices created with both read exactly as before.
- `invoices.create()` takes `expires_at`, a `Date` or a string, as payment links do: a bare date ends at 23:59:59 UTC, and a timestamp is read in the offset it names. Once it has passed, the invoice takes no new payments, though one the customer already started can still be finished, and an invoice still unpaid once nothing is under way is voided on its own, with `invoice.voided`. `invoice.expiresAt` reads it back, as a `Date` or `null`. `invoices.send()` throws a `ConflictError` once the invoice has expired.
- `invoices.create()` takes `success_message`, up to 1,000 characters, what the customer is told once they have paid in place of the account's own message, and `invoice.successMessage` reads it back.
- The invoice in `invoice.*` webhooks now carries `expiresAt`, `overdue`, `documentUrl`, `successUrl`, `cancelUrl` and `successMessage`, as the API's does. They are `null` in deliveries made before 2026-11-15, which left them out.

## 0.2.3 - 2026-11-14

- `charge.switchedFrom`, typed `OriginalQuote`: a charge's first quote (`asset`, `assetAmount`, `exchangeRate` and `switchedAt`), once it was quoted again in another coin. TRX and USDT on Tron are paid into the same addresses, so when a charge closes, expired or canceled, with nothing of its own coin while the other one arrived, VeliraPay quotes it again in the coin that arrived: `asset`, `assetAmount`, `exchangeRate` and `networkSurcharge` then describe that coin, `fiatAmount` is unchanged, and the transfer is a late payment for you to accept. A charge switches at most once, so `asset` can change once: read the coin from each payload rather than remembering the one the charge was created with. It is `null` for every charge that never switched, and its amounts carry all 18 decimal places in webhooks, as the charge's do.
- `charge.processingTerms`, typed `ProcessingTerms`: the processing fee fixed when the charge was quoted, as `percent` (a decimal string such as `'1.75'`) and `maxForwardingPercent` (such as `10`), the most passing a managed payment on may cost, in percent of your share. It is `null` for older charges and for VeliraPay's own billing. The API's charges and the charges in webhooks have carried it since 2026-11-14.
- Both are read the same in the API's answers, the charges events carry and webhooks, and are `null` in a payload that leaves them out.
- `payout.merchantNetworkReserve`, typed `NetworkReserve`: what of the merchant's share was set aside for the network costs of a payout whose exact cost is not known when it is sent, as for ETH and the other EVM chains' own coins, TRX and Lightning routing, under the processing terms charges now carry. `reserved` is what was set aside, `payoutCost` what forwarding cost, `sweepBudget` and `sweepCost` what was set aside for and spent on sweeping VeliraPay's fee to its cold wallet, `sweepAvailable` what is left of that budget, `held` what is still held for the merchant, and `residual` what was left unused once every cost is known, which stays owed to the merchant and is recorded rather than sent back. All are decimal strings in the payout's coin; `payoutCost`, `sweepCost` and `residual` are `null` until known. It is `null` for older charges, the Bitcoin family, USDT and USDC forwarders and payouts not sent yet, in `payouts.retrieve()`, `list()` and the `payout.sent` and `payout.confirmed` webhooks alike.

## 0.2.2 - 2026-11-12

- `charge.customer.ipCountry`, `ipAsn` and `ipNetwork`: what VeliraPay works out from the customer's IP address, in the API's answers and in webhooks alike. `ipCountry` is the country the hosted checkout placed the address in, as an ISO 3166 two-letter code or `T1` for Tor, and `null` for a charge created through the API; `ipAsn` is the number of the network (autonomous system) the address belongs to, and `ipNetwork` who runs it, such as `24940` and `'Hetzner Online GmbH'`. A customer on a hosting company's network is often a bot or someone hiding behind a server. They are read only, and `null` in a payload that leaves them out.

## 0.2.1 - 2026-11-12

- `invoices.create()` takes `success_url` and `cancel_url`, public https:// addresses the invoice's page and its charges' checkout offer the customer a way back to: a button once they have paid, and a link while it is open. `invoice.successUrl` and `invoice.cancelUrl` read them back, and are `null` in webhooks, which leave them out.

## 0.2.0 - 2026-11-12

### Breaking

- `MemberRole` now has `owner` too, which members can be: a `switch` over it that covers every role needs a case for it. Invitations and role changes take the new `AssignableMemberRole`, which leaves owner out. Nothing changes at runtime.
- An `idempotencyKey` that is empty or only whitespace throws an `InvalidArgumentError` before anything is sent. It used to go out as an empty header, which the API reads as no key, so a retried write could be carried out twice.

### Added

- Constants for the API's other value sets, each an object with a type of the same name: `Currency`, `MemberRole`, `AddressNetwork` (the networks payout addresses are for), `CheckoutAppearance`, `WebhookDeliveryStatus`, `PlanName`, `AccountType`, `CheckoutLocale` and `ActivityAction`, every action the activity log records. Methods take them or plain strings.
- Fields that hold one of these, a coin, a currency, a mode, a permission or an event type are typed with it, such as `payoutAddress.network`, `account.plan`, `member.role`, `activity.action`, `apiKey.permissions`, `invoice.charges[].status` and `webhookEndpoint.events`. They stay strings, so a value the API adds later still reads, and nothing breaks.
- Every constant, the existing ones too, is frozen, so no code can change one by mistake.
- The overview's other figures, which only `get()` could read before: `overview.period`, `funnel`, `attention`, `assets`, `topPaymentLinks`, `setup` and `daily`, typed `OverviewPeriod`, `OverviewFunnel` (with `OverviewFunnelAsset`), `OverviewAttention` (with `OverviewChargeAmount` and `OverviewWaitingPayouts`), `OverviewAsset`, `OverviewPaymentLink`, `OverviewSetup` and `OverviewDay`. Amounts stay strings, and days are `Date`s at midnight UTC.
- What answers carry besides their objects: every `Page` has the `meta` the API sent and the `mode` of the lists that say it, the coins on offer and the activity log; `assets.list()` answers with an `AssetPage`, whose `currencies` are those prices can be asked in; and the overview has its `mode`. `payoutAddresses.list()` and `payouts.summary()` stay plain arrays: their mode is `velirapay.mode()`, and whether an owner lets API keys change payout addresses is `account.apiPayoutAddressChanges`.
- `ConflictError.wasReplayed()`, true for the 409 the API gives a repeat of `apiKeys.create()`, `webhookEndpoints.create()` or `rotateSecret()` whose first answer carried the new key or secret, which it never keeps. That includes the library's own retry after an answer was lost: the write was carried out, but the key or secret cannot be shown again. The three methods' docs say how to recover, and `idempotencyKey`'s no longer promises the first answer to every repeat.
- `charge.paymentLinkTitle` and `charge.invoiceNumber`: the title of the payment link and the number of the invoice a charge in a webhook names. The API's answers only give their codes, so both are null there; `paymentLink` and `invoice` keep giving the codes everywhere.
- The README covers the whole library, as the PHP library's does: the lowest prices and minimums, network surcharges, Lightning, short and late payments, payouts and payout addresses, webhook endpoints and what to do when the answer carrying a secret is lost, the account and its payment settings, the overview, the activity log, members, API keys, Pro, the constants, the `baseUrl` option, the retry of a 409 that is still being processed and `UnexpectedResponseError`. Every example type-checks under TypeScript's `strict`; the webhook example no longer reads `event.charge.id` without checking that there is a charge.

### Fixed

- The charges events carry are typed `ApiCharge`, since the API always sends their checkout page: `event.charge?.checkoutUrl` is a `string`, where 0.1.1 said events left it out. Only charges in webhooks lack it. Nothing changes at runtime.
- A network failure from a `fetch` you pass, such as node-fetch's `FetchError` of the `system` type or an error with a code such as `ECONNRESET`, is retried with the same idempotency key and then thrown as a `ConnectionError` whose `cause` is the original, as the built-in fetch's are. Before, it escaped as it was after one attempt. An error a `fetch` throws for any other reason still passes straight through.
- Amounts given as numbers are sent as decimal strings without an exponent. The API reads a JSON number below 0.0001, such as a refund of `0.00005` BTC, in exponent notation and refused it. A number is rounded first to the 14 significant digits the API read it with, so `0.1 + 0.2` still reaches it as `0.3`, and `0.00005` now goes out as `'0.00005'`. This covers charge, refund and simulated amounts, invoice totals, quantities and unit prices, payment link prices and limits, coupon discounts and minimums, and the payment tolerances; other numbers, such as `max_redemptions` and metadata values, stay numbers. A number that is not finite, or one with a fraction and 15 or more digits before its point, both of which the API refused, is refused before anything is sent. Strings go out as given, and `velirapay.request()` sends its body as it is.
- Cloudflare's 520 to 524, its answers when it gets nothing from VeliraPay, are retried like 502, 503 and 504, reads and writes alike, since a retried write carries the same idempotency key.
- The README's charge examples and the docs of `idempotencyKey` no longer use the bare order number as the idempotency key, which would send a customer coming back after the charge expired to that expired charge for a day. They use keys such as `order-1042-attempt-1`, and say to reuse a key only to retry the same request and to give a new attempt, such as a charge replacing an expired one, a new key.

## 0.1.1 - 2026-11-12

- The charges that `charges.create()`, `retrieve()`, `list()`, `iterator()`, `cancel()`, `recordRefund()`, `send()`, `accept()` and `simulate()` answer with are typed `ApiCharge`, whose `checkoutUrl` is a `string`, so `res.redirect(303, charge.checkoutUrl)` compiles under TypeScript's `strict`. Charges in webhooks and events keep `checkoutUrl: string | null`, since webhooks leave it out. Nothing changes at runtime.

## 0.1.0 - 2026-11-12

The first version, covering what the PHP library covers as of its 0.6.5:

- `VeliraPayClient` with `account`, `assets`, `charges`, `paymentLinks`, `invoices`, `coupons`, `payouts`, `payoutAddresses`, `events`, `webhookEndpoints`, `overview`, `activity`, `apiKeys`, `members`, `invitations` and `billing`, each answering with typed objects that keep every attribute the API sent (`get()`, `toJSON()`).
- `Page` for lists, with `nextPage()` and `autoPagingIterator()`, and `iterator()` on every paged list for `for await`.
- An error class per kind of failure, all extending `VeliraPayError`: `AuthenticationError`, `PermissionError`, `NotFoundError`, `ConflictError`, `ValidationError`, `RateLimitError`, `ServerError`, `InvalidRequestError`, `UnexpectedResponseError`, `ConnectionError`, `SignatureVerificationError` and `InvalidArgumentError`.
- Retries of network errors, rate limits and outages, with an `Idempotency-Key` on every write so a retried one is carried out once.
- `Webhook.constructEvent()` and `constructEventFromRequest()`, which check the signature, the second one sent for a day after a secret is rotated, and its age.
- `Asset` also has `BTC_LIGHTNING`, `ETH_BASE`, `ETH_ARBITRUM` and `POL`, which the API's contract defines, and charges and coins read the `network_surcharge` the API sends, and charges its `payment_request`.
- ES module and CommonJS builds with their type definitions, for Node.js 22 or later, without dependencies.
