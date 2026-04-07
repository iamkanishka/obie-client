# Changelog

All notable changes to `obie-client` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/2.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] — 2026-04-07

### Added

- **Complete OBIE v3.1.3 coverage**: AIS, PIS (domestic, domestic scheduled, domestic standing order, international, international scheduled, international standing order), CBPII, VRP, File Payments, Event Notifications
- **`ObieClient`** root client wiring all services with shared HTTP pipeline, circuit breaker, rate limiter, and metrics recorder
- **`AISConsentService`**: `create`, `get`, `delete`, `pollUntilAuthorised` with configurable interval/timeout
- **`AccountsService`**: all 13 AIS resource types — accounts, balances, transactions, beneficiaries, direct debits, standing orders, scheduled payments, statements, parties, products, offers — with `iterateTransactions` and `iterateStatements` async iterators
- **`PaymentsService`**: all 6 PIS payment types with `poll*` methods for each; `getDomesticConsentFundsConfirmation`, `getInternationalConsentFundsConfirmation`; `delete*Consent` for scheduled/standing order consents
- **`FilePaymentsService`**: `createConsent`, `uploadFile`, `downloadFile`, `submit`, `get`, `getDetails`, `getReport`, `poll`
- **`FundsService`**: CBPII `createConsent`, `getConsent`, `deleteConsent`, `confirm`
- **`VRPService`**: `createConsent`, `getConsent`, `deleteConsent`, `getConsentFundsConfirmation`, `submit`, `get`, `getDetails`, `poll`
- **`EventNotificationsService`**: `createSubscription`, `listSubscriptions`, `updateSubscription`, `deleteSubscription`, `createCallbackUrl`, `listCallbackUrls`, `updateCallbackUrl`, `deleteCallbackUrl`, `pollEvents`
- **`WebhookHandler`**: JWS-verified real-time event dispatch with per-event-type handlers, wildcard handler, and Express/Plug-compatible `handle(body, signature)` API
- **`TokenManager`**: OAuth2 client-credentials token lifecycle via `private_key_jwt` (`jose`), automatic refresh 30s before expiry, in-flight deduplication
- **`CircuitBreaker`**: Closed → Open → HalfOpen state machine with configurable `maxFailures`, `openTimeoutMs`, `successThreshold`, and `onStateChange` callback
- **`RateLimiter`**: token-bucket with `AbortSignal` cancellation
- **`TTLCache`**: generic in-memory TTL cache with `getOrSet`, `invalidatePrefix`, background eviction
- **`PageIterator`**: `AsyncIterable` HATEOAS page iterator with `toArray()` and `allPages()`
- **`batchExecute`**: parallel fan-out with bounded concurrency, result ordering, and partial-failure handling
- **`InMemoryRecorder`**: per-request metrics with `getStats()` (count, error rate, avg/p95/p99 duration), filter by method/URL prefix
- **`Validator`** builder: `validateAmount`, `validateAccount`, `required`, `maxLength`, `validatePermissions`; `validateDomesticInitiation` convenience function
- **Detached JWS** (`signDetachedJws` / `verifyDetachedJws`): OBIE `b64=false` profile using WebCrypto `crypto.subtle` — works in Node 18+, Deno, Bun, Cloudflare Workers
- **`buildClientAssertion`**: RS256 signed JWT via `jose` for FAPI `private_key_jwt` auth
- **Dual ESM/CJS build** with `exports` map and `dist/types/*.d.ts`
- **Full Jest test suite**: 17 test files, 150+ assertions, all unit-tested with mocked HTTP
- **GitHub Actions CI**: test matrix on Node 18/20/22, lint, typecheck, format check, coverage upload to Codecov, automated npm publish on GitHub release
- **All OBIE enumerations** as TypeScript `const` objects with type exports: `Permission`, `PaymentStatus`, `ConsentStatus`, `SchemeName`, `AccountType`, `BalanceType`, `ChargeBearer`, `Frequency`, `FileType`, `VRPType`, `OBIEErrorCode`, `EventNotificationType`
- **Helper functions**: `allPermissions()`, `detailPermissions()`, `isTerminalPaymentStatus()`, `TERMINAL_PAYMENT_STATUSES`

[2.0.0]: https://github.com/iamkanishka/obie-client/releases/tag/v2.0.0
