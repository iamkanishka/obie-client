import { OBIECircuitOpenError } from "../errors";

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  /** Consecutive failures before opening. Default: 5. */
  maxFailures?: number;
  /** Ms to stay open before probing. Default: 30000. */
  openTimeoutMs?: number;
  /** Consecutive successes in half-open before closing. Default: 2. */
  successThreshold?: number;
  /** Called when the state changes. */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

/**
 * Thread-safe circuit breaker implementing the Closed → Open → HalfOpen pattern.
 *
 * Wrap HTTP calls with `execute()` to prevent cascading failures.
 */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private openedAt = 0;

  private readonly maxFailures: number;
  private readonly openTimeoutMs: number;
  private readonly successThreshold: number;
  private readonly onStateChange: ((from: CircuitState, to: CircuitState) => void) | undefined;

  constructor(options: CircuitBreakerOptions = {}) {
    this.maxFailures = options.maxFailures ?? 5;
    this.openTimeoutMs = options.openTimeoutMs ?? 30_000;
    this.successThreshold = options.successThreshold ?? 2;
    this.onStateChange = options.onStateChange;
  }

  /** Executes fn through the circuit breaker. Throws OBIECircuitOpenError if open. */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.checkState();
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      if (err instanceof OBIECircuitOpenError) throw err;
      this.recordFailure();
      throw err;
    }
  }

  public getState(): CircuitState {
    if (this.state === "open" && Date.now() - this.openedAt >= this.openTimeoutMs) {
      this.transitionTo("half-open");
      this.successes = 0;
    }
    return this.state;
  }

  public reset(): void {
    this.transitionTo("closed");
    this.failures = 0;
    this.successes = 0;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private checkState(): void {
    if (this.state === "open") {
      if (Date.now() - this.openedAt >= this.openTimeoutMs) {
        this.transitionTo("half-open");
        this.successes = 0;
      } else {
        throw new OBIECircuitOpenError();
      }
    }
  }

  private recordSuccess(): void {
    if (this.state === "half-open") {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.transitionTo("closed");
        this.failures = 0;
        this.successes = 0;
      }
    } else if (this.state === "closed") {
      this.failures = 0;
    }
  }

  private recordFailure(): void {
    this.failures++;
    if (this.state === "half-open") {
      this.transitionTo("open");
      this.openedAt = Date.now();
    } else if (this.state === "closed" && this.failures >= this.maxFailures) {
      this.transitionTo("open");
      this.openedAt = Date.now();
    }
  }

  private transitionTo(next: CircuitState): void {
    if (this.state !== next) {
      const prev = this.state;
      this.state = next;
      this.onStateChange?.(prev, next);
    }
  }
}
