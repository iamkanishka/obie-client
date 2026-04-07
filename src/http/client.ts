import { v4 as uuidv4 } from "uuid";
import { parseApiError, OBIERetryExhaustedError } from "../errors";
import type { ResolvedConfig } from "../config";
import type { TokenManager } from "../auth/token-manager";
import type { CircuitBreaker } from "../circuitbreaker/index";
import type { RateLimiter } from "../ratelimit/index";
import type { InMemoryRecorder } from "../observability/index";

export interface DoOptions {
  idempotencyKey?: string;
  jwsSignature?: string;
  extraHeaders?: Record<string, string>;
  /** Override the AbortSignal for this request. */
  signal?: AbortSignal;
}

/** Low-level HTTP client shared by all service modules. */
export class HttpClient {
  private readonly cfg: ResolvedConfig;
  private readonly tokenManager: TokenManager;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly rateLimiter: RateLimiter;
  private readonly recorder: InMemoryRecorder;

  constructor(params: {
    cfg: ResolvedConfig;
    tokenManager: TokenManager;
    circuitBreaker: CircuitBreaker;
    rateLimiter: RateLimiter;
    recorder: InMemoryRecorder;
  }) {
    this.cfg = params.cfg;
    this.tokenManager = params.tokenManager;
    this.circuitBreaker = params.circuitBreaker;
    this.rateLimiter = params.rateLimiter;
    this.recorder = params.recorder;
  }

  public async get<T>(url: string, opts: DoOptions = {}): Promise<T> {
    return this.request<T>("GET", url, undefined, opts);
  }

  public async post<T>(url: string, body: unknown, opts: DoOptions = {}): Promise<T> {
    return this.request<T>("POST", url, body, opts);
  }

  public async put<T>(url: string, body: unknown, opts: DoOptions = {}): Promise<T> {
    return this.request<T>("PUT", url, body, opts);
  }

  public async delete(url: string, opts: DoOptions = {}): Promise<void> {
    await this.request<void>("DELETE", url, undefined, opts);
  }

  /** Raw request for file upload / binary response. */
  public async postRaw(
    url: string,
    body: ArrayBuffer | ReadableStream | string,
    contentType: string,
    opts: DoOptions = {},
  ): Promise<ArrayBuffer> {
    await this.rateLimiter.wait(opts.signal);
    return this.circuitBreaker.execute(async () => {
      const token = await this.tokenManager.accessToken();
      const headers = this.buildHeaders(token, opts);
      headers.set("Content-Type", contentType);

      const response = await this.cfg.fetch(url, {
        method: "POST",
        headers,
        body,
        signal: opts.signal ?? AbortSignal.timeout(this.cfg.timeoutMs),
      });

      if (!response.ok) {
        const text = await response.text();
        throw parseApiError(response.status, text, response.headers.get("x-fapi-interaction-id"));
      }
      return response.arrayBuffer();
    });
  }

  public async getRaw(url: string, opts: DoOptions = {}): Promise<ArrayBuffer> {
    await this.rateLimiter.wait(opts.signal);
    return this.circuitBreaker.execute(async () => {
      const token = await this.tokenManager.accessToken();
      const headers = this.buildHeaders(token, opts);

      const response = await this.cfg.fetch(url, {
        method: "GET",
        headers,
        signal: opts.signal ?? AbortSignal.timeout(this.cfg.timeoutMs),
      });

      if (!response.ok) {
        const text = await response.text();
        throw parseApiError(response.status, text, response.headers.get("x-fapi-interaction-id"));
      }
      return response.arrayBuffer();
    });
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    url: string,
    body: unknown,
    opts: DoOptions,
  ): Promise<T> {
    await this.rateLimiter.wait(opts.signal);

    let lastError: unknown;
    const maxAttempts = this.cfg.maxRetries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        const backoff = this.backoffMs(attempt);
        this.cfg.logger.warn(`obie: retrying ${method} ${url} (attempt ${attempt}/${this.cfg.maxRetries}) after ${backoff}ms`);
        await sleep(backoff, opts.signal);
      }

      try {
        const result = await this.circuitBreaker.execute<T>(() =>
          this.doRequest<T>(method, url, body, opts),
        );
        return result;
      } catch (err) {
        lastError = err;
        if (!isRetryable(err, method)) throw err;
      }
    }

    throw new OBIERetryExhaustedError(this.cfg.maxRetries, lastError);
  }

  private async doRequest<T>(
    method: string,
    url: string,
    body: unknown,
    opts: DoOptions,
  ): Promise<T> {
    const token = await this.tokenManager.accessToken();
    const headers = this.buildHeaders(token, opts);

    const reqInit: RequestInit = {
      method,
      headers,
      signal: opts.signal ?? AbortSignal.timeout(this.cfg.timeoutMs),
    };

    if (body !== undefined) {
      reqInit.body = JSON.stringify(body);
      headers.set("Content-Type", "application/json");
    }

    // Apply request hooks
    const req = new Request(url, reqInit);
    for (const hook of this.cfg.requestHooks) {
      await hook(req);
    }

    const start = Date.now();
    this.cfg.logger.debug(`obie: → ${method} ${url}`);

    let response: Response;
    try {
      response = await this.cfg.fetch(req);
    } catch (err) {
      const durationMs = Date.now() - start;
      this.recorder.record({ method, url: sanitiseUrl(url), statusCode: 0, durationMs, error: String(err) });
      throw err;
    }

    const durationMs = Date.now() - start;
    const interactionId = response.headers.get("x-fapi-interaction-id");
    const text = await response.text();

    this.recorder.record({ method, url: sanitiseUrl(url), statusCode: response.status, durationMs });
    this.cfg.logger.debug(`obie: ← ${method} ${url} ${response.status} (${durationMs}ms)`);

    // Apply response hooks
    for (const hook of this.cfg.responseHooks) {
      await hook(req, response);
    }

    // Handle Retry-After on 429
    if (response.status === 429) {
      const wait = parseRetryAfter(response.headers.get("Retry-After"));
      await sleep(wait, opts.signal);
      throw parseApiError(response.status, text, interactionId);
    }

    if (!response.ok) {
      throw parseApiError(response.status, text, interactionId);
    }

    if (!text || response.status === 204) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`obie: failed to decode response JSON: ${text.slice(0, 200)}`);
    }
  }

  private buildHeaders(token: string, opts: DoOptions): Headers {
    const headers = new Headers({
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "x-fapi-interaction-id": uuidv4(),
      "x-fapi-auth-date": new Date().toUTCString(),
    });

    if (this.cfg.financialId) headers.set("x-fapi-financial-id", this.cfg.financialId);
    if (this.cfg.customerIpAddress) headers.set("x-fapi-customer-ip-address", this.cfg.customerIpAddress);
    if (opts.idempotencyKey) headers.set("x-idempotency-key", opts.idempotencyKey);
    if (opts.jwsSignature) headers.set("x-jws-signature", opts.jwsSignature);
    if (opts.extraHeaders) {
      for (const [k, v] of Object.entries(opts.extraHeaders)) headers.set(k, v);
    }

    return headers;
  }

  /** Exponential backoff with ±25% crypto-safe jitter. */
  private backoffMs(attempt: number): number {
    const base = Math.min(Math.pow(2, attempt - 1) * 500, 30_000);
    const jitter = (Math.random() * 0.5 - 0.25) * base;
    return Math.max(100, base + jitter);
  }
}

// ── Module-level helpers ──────────────────────────────────────────────────────

function isRetryable(err: unknown, method: string): boolean {
  const idempotentMethods = ["GET", "HEAD", "OPTIONS", "DELETE", "PUT"];
  if (!idempotentMethods.includes(method)) return false;

  if (err instanceof Error && err.name === "AbortError") return false;

  // Network errors
  if (err instanceof TypeError) return true;

  // 5xx API errors
  if (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    typeof (err as Record<string, unknown>)["statusCode"] === "number"
  ) {
    return (err as { statusCode: number }).statusCode >= 500;
  }

  return true;
}

function parseRetryAfter(header: string | null): number {
  if (!header) return 1000;
  const secs = parseInt(header, 10);
  if (!isNaN(secs)) return secs * 1000;
  const date = new Date(header);
  if (!isNaN(date.getTime())) return Math.max(0, date.getTime() - Date.now());
  return 1000;
}

function sanitiseUrl(url: string): string {
  const idx = url.indexOf("?");
  return idx >= 0 ? url.slice(0, idx) : url;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Sleep aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Sleep aborted", "AbortError"));
    });
  });
}
