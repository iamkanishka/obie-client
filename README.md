# obie-client

Production-grade TypeScript/Node.js client for the **UK Open Banking (OBIE) Read/Write API v3.1.3**.

[![CI](https://github.com/iamkanishka/obie-client/actions/workflows/ci.yml/badge.svg)](https://github.com/iamkanishka/obie-client/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/@iamkanishka%2Fobie-client.svg)](https://www.npmjs.com/package/obie-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Complete OBIE v3.1.3 coverage** — AIS, PIS (all 6 types), CBPII, VRP, File Payments, Event Notifications, DCR
- **Production-grade resilience** — circuit breaker, token-bucket rate limiter, exponential backoff with jitter, automatic token refresh
- **FAPI-compliant** — `x-fapi-interaction-id`, `x-fapi-financial-id`, `x-jws-signature`, `x-idempotency-key` on every request
- **Detached JWS signing** — OBIE `b64=false` profile via WebCrypto (works in Node 18+, Deno, Bun, edge runtimes)
- **Dual ESM/CJS builds** with full TypeScript declarations
- **Lazy pagination** — `AsyncIterable` iterators follow HATEOAS `Links.Next` automatically
- **Batch fan-out** — parallel requests over multiple accounts with bounded concurrency
- **In-memory metrics** — p95/p99 latency, error rates; swap for OpenTelemetry in production
- **Webhook handler** — JWS-verified real-time event dispatch for Plug/Express/Fastify

---

## Requirements

- Node.js ≥ 18 (uses `fetch`, `crypto.subtle`, `AbortSignal.timeout`)
- TypeScript ≥ 5.0 (for consuming types)

---

## Installation

```bash
npm install obie-client
# or
yarn add obie-client
```

---

## Quick start

```typescript
import { ObieClient, detailPermissions } from "obie-client";
import { readFileSync } from "fs";

const client = new ObieClient({
  clientId:      process.env.OBIE_CLIENT_ID!,
  tokenUrl:      process.env.OBIE_TOKEN_URL!,
  privateKeyPem: readFileSync(process.env.OBIE_KEY_PATH!, "utf8"),
  signingKeyId:  process.env.OBIE_SIGNING_KID!,
  financialId:   process.env.OBIE_FINANCIAL_ID!,
  environment:   "production",
});

// ── AIS: create consent ───────────────────────────────────────────────────────
const consent = await client.AISConsent.create({
  Data: { Permissions: detailPermissions() },
  Risk: {},
});
console.log("Redirect PSU to authorise:", consent.Data.ConsentId);

// ── AIS: read accounts (after consent is Authorised) ─────────────────────────
const { Data: { Account: accounts } } = await client.Accounts.list();
console.log("Accounts:", accounts.map(a => a.AccountId));

// ── AIS: paginate all transactions lazily ────────────────────────────────────
for await (const txn of client.Accounts.iterateTransactions("acc-001")) {
  console.log(txn.TransactionId, txn.Amount);
}

// ── PIS: domestic payment ────────────────────────────────────────────────────
const pConsent = await client.Payments.createDomesticConsent({
  Data: {
    Initiation: {
      InstructionIdentification: "INSTR-001",
      EndToEndIdentification:   "E2E-001",
      InstructedAmount:         { Amount: "10.50", Currency: "GBP" },
      CreditorAccount: {
        SchemeName:     "UK.OBIE.SortCodeAccountNumber",
        Identification: "20000319825731",
        Name:           "Payee Name",
      },
    },
  },
  Risk: {},
});

// After PSU authorises pConsent.Data.ConsentId...
const payment = await client.Payments.submitDomestic({
  Data: { ConsentId: pConsent.Data.ConsentId, Initiation: pConsent.Data.Initiation },
  Risk: {},
});

// Poll until terminal status (Accepted / Rejected)
const settled = await client.Payments.pollDomestic(payment.Data.DomesticPaymentId);
console.log("Final status:", settled.Data.Status);
```

---

## Configuration

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `clientId` | `string` | ✅ | — | OAuth2 client ID from the Open Banking Directory |
| `tokenUrl` | `string` | ✅ | — | ASPSP OAuth2 token endpoint |
| `privateKeyPem` | `string` | ✅ | — | PEM-encoded RSA private key |
| `environment` | `"sandbox" \| "production"` | — | `"sandbox"` | Target environment |
| `baseUrl` | `string` | — | derived | Override base URL |
| `signingKeyId` | `string` | — | `""` | `kid` for JWS/JWT headers |
| `financialId` | `string` | — | `""` | `x-fapi-financial-id` header |
| `customerIpAddress` | `string` | — | `""` | `x-fapi-customer-ip-address` header |
| `certificatePem` | `string` | — | — | mTLS transport certificate |
| `scopes` | `string[]` | — | `["accounts","payments","fundsconfirmations"]` | OAuth2 scopes |
| `timeoutMs` | `number` | — | `30000` | Request timeout in ms |
| `maxRetries` | `number` | — | `3` | Retries on transient failures |
| `logger` | `Logger` | — | no-op | Pluggable logger |
| `requestHooks` | `RequestHook[]` | — | `[]` | Pre-request hooks |
| `responseHooks` | `ResponseHook[]` | — | `[]` | Post-response hooks |
| `fetch` | `typeof fetch` | — | `globalThis.fetch` | Custom fetch (for testing) |

---

## Services

### `client.AISConsent` — Account Access Consents

```typescript
await client.AISConsent.create(req);
await client.AISConsent.get(consentId);
await client.AISConsent.delete(consentId);
await client.AISConsent.pollUntilAuthorised(consentId, { intervalMs: 2000, timeoutMs: 120_000 });
```

### `client.Accounts` — All 13 AIS Resource Types

```typescript
// Accounts
client.Accounts.list()
client.Accounts.get(accountId)
// Balances
client.Accounts.listBalances()
client.Accounts.getBalances(accountId)
// Transactions (with optional date range)
client.Accounts.listTransactions({ fromBookingDateTime, toBookingDateTime })
client.Accounts.getTransactions(accountId, range)
client.Accounts.iterateTransactions(accountId)  // AsyncIterable<OBTransaction6>
// Beneficiaries, Direct Debits, Standing Orders, Scheduled Payments
// Statements (with iterator), Parties, Products, Offers
```

### `client.Payments` — All 6 PIS Payment Types

```typescript
// Domestic (consent → submit → poll)
client.Payments.createDomesticConsent(req)
client.Payments.getDomesticConsent(consentId)
client.Payments.getDomesticConsentFundsConfirmation(consentId)
client.Payments.submitDomestic(req)
client.Payments.getDomestic(paymentId)
client.Payments.pollDomestic(paymentId, { intervalMs, timeoutMs })

// Domestic Scheduled, Domestic Standing Order,
// International, International Scheduled, International Standing Order
// — each with create/get/delete consent + submit + poll
```

### `client.Funds` — CBPII

```typescript
client.Funds.createConsent(req)
client.Funds.getConsent(consentId)
client.Funds.deleteConsent(consentId)
client.Funds.confirm(req)
```

### `client.VRP` — Variable Recurring Payments

```typescript
client.VRP.createConsent(req)
client.VRP.getConsent(consentId)
client.VRP.deleteConsent(consentId)
client.VRP.getConsentFundsConfirmation(consentId)
client.VRP.submit(req)
client.VRP.get(vrpId)
client.VRP.poll(vrpId, { intervalMs, timeoutMs })
```

### `client.FilePayments` — Bulk File Payments

```typescript
client.FilePayments.createConsent(req)
client.FilePayments.uploadFile(consentId, fileBytes, contentType)
client.FilePayments.downloadFile(consentId)
client.FilePayments.submit(req)
client.FilePayments.get(filePaymentId)
client.FilePayments.getReport(filePaymentId)
client.FilePayments.poll(filePaymentId)
```

### `client.EventNotifications`

```typescript
client.EventNotifications.createSubscription(req)
client.EventNotifications.listSubscriptions()
client.EventNotifications.updateSubscription(id, req)
client.EventNotifications.deleteSubscription(id)
client.EventNotifications.createCallbackUrl(req)
client.EventNotifications.pollEvents(ack, setErrs, options)
```

---

## Webhook Handler

```typescript
import { WebhookHandler } from "obie-client";
import express from "express";

const webhookHandler = new WebhookHandler({
  aspspPublicKeyPem: readFileSync("aspsp_public.pem", "utf8"),
  onEvent: async (event) => {
    console.log("OBIE event received:", JSON.stringify(event, null, 2));
  },
});

// Register typed event handlers
webhookHandler.on(
  "urn:uk:org:openbanking:events:resource-update",
  async (event) => { /* handle resource update */ },
);

app.post(
  "/webhooks/obie",
  express.raw({ type: "*/*" }),
  async (req, res) => {
    const result = await webhookHandler.handle(
      req.body as Buffer,
      req.headers["x-jws-signature"] as string | undefined,
    );
    res.status(result.statusCode).end();
  },
);
```

---

## Batch fan-out

```typescript
import { batchExecute } from "obie-client";

const accountIds = ["acc-001", "acc-002", "acc-003"];
const results = await batchExecute(
  accountIds,
  (id) => client.Accounts.getBalances(id),
  { concurrency: 5 },
);

const succeeded = results.filter(r => r.ok);
const failed    = results.filter(r => !r.ok);
console.log(`${succeeded.length} succeeded, ${failed.length} failed`);
```

---

## Observability

```typescript
const stats = client.metrics.getStats();
console.log(`${stats.count} requests, p95=${stats.p95DurationMs}ms, errors=${stats.errorRate * 100}%`);

// Filter by method or URL prefix
const pisStats = client.metrics.getStats({ urlPrefix: "/open-banking/v3.1/pisp" });
```

For production, replace `InMemoryRecorder` with an OpenTelemetry exporter:

```typescript
import { trace, SpanStatusCode } from "@opentelemetry/api";
// Pass a custom logger and responseHooks to client config
```

---

## Error Handling

```typescript
import {
  OBIEApiError,
  OBIEConfigError,
  OBIESigningError,
  OBIETokenError,
  OBIECircuitOpenError,
  OBIERetryExhaustedError,
  OBIEValidationError,
} from "obie-client";

try {
  await client.Payments.submitDomestic(req);
} catch (err) {
  if (err instanceof OBIEApiError) {
    console.error(`HTTP ${err.statusCode}:`, err.obError?.Code);
    if (err.hasErrorCode("UK.OBIE.Resource.InvalidConsentStatus")) {
      // handle consent not authorised
    }
  } else if (err instanceof OBIECircuitOpenError) {
    // ASPSP is unavailable, back off
  } else if (err instanceof OBIERetryExhaustedError) {
    // All retries exhausted
  }
}
```

---

## Testing

```bash
npm test                    # all tests with coverage
npm run test:unit           # unit tests only
npm run test:watch          # watch mode
npm run typecheck           # TypeScript type check
npm run lint                # ESLint
npm run format:check        # Prettier check
```

---

## License

MIT © Kanishka Naik
