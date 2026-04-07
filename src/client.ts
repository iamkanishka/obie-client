import { resolveConfig } from "./config.js";
import { TokenManager } from "./auth/token-manager.js";
import { HttpClient } from "./http/client.js";
import { CircuitBreaker } from "./circuitbreaker/index.js";
import { RateLimiter } from "./ratelimit/index.js";
import { InMemoryRecorder } from "./observability/index.js";
import { AISConsentService } from "./aisp/consent.js";
import { AccountsService } from "./accounts/index.js";
import { PaymentsService } from "./payments/index.js";
import { FilePaymentsService } from "./filepayments/index.js";
import { FundsService } from "./funds/index.js";
import { VRPService } from "./vrp/index.js";
import { EventNotificationsService } from "./eventnotifications/index.js";
import type { ObieClientConfig } from "./config.js";

export { WebhookHandler } from "./webhook/index.js";

/**
 * Root OBIE SDK client. Instantiate one per ASPSP connection.
 *
 * @example
 * ```typescript
 * import { ObieClient } from "obie-client";
 *
 * const client = new ObieClient({
 *   clientId:      process.env.OBIE_CLIENT_ID!,
 *   tokenUrl:      process.env.OBIE_TOKEN_URL!,
 *   privateKeyPem: fs.readFileSync(process.env.OBIE_KEY_PATH!, "utf8"),
 *   signingKeyId:  process.env.OBIE_SIGNING_KID!,
 *   financialId:   process.env.OBIE_FINANCIAL_ID!,
 *   environment:   "production",
 * });
 *
 * // AIS
 * const consent = await client.AISConsent.create({ Data: { Permissions: [...] }, Risk: {} });
 * const accounts = await client.Accounts.list();
 *
 * // PIS
 * const pConsent = await client.Payments.createDomesticConsent({ ... });
 * const payment  = await client.Payments.submitDomestic({ ... });
 * const settled  = await client.Payments.pollDomestic(payment.Data.DomesticPaymentId);
 * ```
 */
export class ObieClient {
  // ── AIS ───────────────────────────────────────────────────────────────────
  /** Account-access-consent lifecycle (POST / GET / DELETE / poll). */
  public readonly AISConsent: AISConsentService;
  /** All 13 AIS resource types with pagination iterators. */
  public readonly Accounts: AccountsService;

  // ── PIS ───────────────────────────────────────────────────────────────────
  /** All 6 PIS payment types — consent, submit, poll. */
  public readonly Payments: PaymentsService;
  /** Bulk file payment upload and submission. */
  public readonly FilePayments: FilePaymentsService;

  // ── CBPII ─────────────────────────────────────────────────────────────────
  /** CBPII funds confirmation consent and check. */
  public readonly Funds: FundsService;

  // ── VRP ───────────────────────────────────────────────────────────────────
  /** Variable Recurring Payments. */
  public readonly VRP: VRPService;

  // ── Events ────────────────────────────────────────────────────────────────
  /** Event subscriptions, callback URLs, and aggregated polling. */
  public readonly EventNotifications: EventNotificationsService;

  // ── Observability ─────────────────────────────────────────────────────────
  /** In-memory request metrics — replace with OpenTelemetry for production. */
  public readonly metrics: InMemoryRecorder;

  // ── Internal ──────────────────────────────────────────────────────────────
  /** Exposed for testing and advanced use only. */
  public readonly _http: HttpClient;

  constructor(config: ObieClientConfig) {
    const cfg = resolveConfig(config);
    const signer = { privateKeyPem: cfg.privateKeyPem, signingKeyId: cfg.signingKeyId };

    const tokenManager = new TokenManager(cfg);
    const circuitBreaker = new CircuitBreaker({
      maxFailures: 5,
      openTimeoutMs: 30_000,
      successThreshold: 2,
      onStateChange: (from, to) => {
        cfg.logger.warn(`obie: circuit breaker ${from} → ${to}`);
      },
    });
    const rateLimiter = new RateLimiter(50, 50);
    const recorder = new InMemoryRecorder();

    const http = new HttpClient({ cfg, tokenManager, circuitBreaker, rateLimiter, recorder });
    this._http = http;
    this.metrics = recorder;

    this.AISConsent = new AISConsentService(http, cfg.baseUrl);
    this.Accounts = new AccountsService(http, cfg.baseUrl);
    this.Payments = new PaymentsService(http, cfg.baseUrl, signer);
    this.FilePayments = new FilePaymentsService(http, cfg.baseUrl, signer);
    this.Funds = new FundsService(http, cfg.baseUrl);
    this.VRP = new VRPService(http, cfg.baseUrl, signer);
    this.EventNotifications = new EventNotificationsService(http, cfg.baseUrl);
  }

  /** Invalidates the cached OAuth2 token, forcing a fresh fetch. */
  public invalidateToken(): void {
    // Access through http internals is intentional — tokenManager is owned by HttpClient
    (this._http as unknown as { tokenManager: TokenManager }).tokenManager.invalidate();
  }
}
