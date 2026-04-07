// ── Root client ──────────────────────────────────────────────────────────────
export { ObieClient, WebhookHandler } from "./client";

// ── Config ───────────────────────────────────────────────────────────────────
export type { ObieClientConfig, Environment, Logger, RequestHook, ResponseHook } from "./config";

// ── Errors ────────────────────────────────────────────────────────────────────
export {
  OBIEApiError,
  OBIEConfigError,
  OBIESigningError,
  OBIETokenError,
  OBIECircuitOpenError,
  OBIERetryExhaustedError,
  OBIEValidationError,
} from "./errors";

// ── Types ─────────────────────────────────────────────────────────────────────
export * from "./types/index";

// ── Auth ─────────────────────────────────────────────────────────────────────
export { TokenManager } from "./auth/token-manager";
export { buildClientAssertion } from "./auth/jwt";

// ── Signing ───────────────────────────────────────────────────────────────────
export { signDetachedJws, verifyDetachedJws } from "./signing/jws";

// ── Resilience ────────────────────────────────────────────────────────────────
export { CircuitBreaker } from "./circuitbreaker/index";
export type { CircuitState, CircuitBreakerOptions } from "./circuitbreaker/index";
export { RateLimiter } from "./ratelimit/index";
export { TTLCache } from "./cache/index";

// ── Utilities ─────────────────────────────────────────────────────────────────
export { PageIterator } from "./pagination/index";
export { Validator, validateDomesticInitiation } from "./validation/index";
export { batchExecute } from "./batch/index";
export type { BatchResult } from "./batch/index";
export { InMemoryRecorder } from "./observability/index";
export type { RequestRecord, RequestStats } from "./observability/index";

// ── Services (for direct instantiation) ──────────────────────────────────────
export { AISConsentService } from "./aisp/consent";
export { AccountsService } from "./accounts/index";
export { PaymentsService } from "./payments/index";
export { FilePaymentsService } from "./filepayments/index";
export { FundsService } from "./funds/index";
export { VRPService } from "./vrp/index";
export { EventNotificationsService } from "./eventnotifications/index";

// ── Version ───────────────────────────────────────────────────────────────────
export const VERSION = "1.0.0";
export const SPEC_VERSION = "v3.1.3";
