/**
 * Token-bucket rate limiter.
 *
 * Implements the token-bucket algorithm: the bucket refills at `rate` tokens/s
 * up to a maximum of `burst`. Each request consumes one token.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefillTime: number;

  private readonly rate: number; // tokens per millisecond
  private readonly burst: number;

  constructor(ratePerSecond: number, burst: number) {
    this.rate = ratePerSecond / 1000;
    this.burst = burst;
    this.tokens = burst;
    this.lastRefillTime = Date.now();
  }

  /**
   * Waits until a token is available, then consumes one.
   * Respects AbortSignal for cancellation.
   */
  public async wait(signal?: AbortSignal): Promise<void> {
    while (true) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const waitMs = (1 - this.tokens) / this.rate;
      await sleep(waitMs, signal);
    }
  }

  /** Returns approximate available tokens (may be fractional). */
  public available(): number {
    this.refill();
    return this.tokens;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    this.tokens = Math.min(this.burst, this.tokens + elapsed * this.rate);
    this.lastRefillTime = now;
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Rate limiter wait aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Rate limiter wait aborted", "AbortError"));
    });
  });
}
