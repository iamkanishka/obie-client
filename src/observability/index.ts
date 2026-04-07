/** A single recorded API call. */
export interface RequestRecord {
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  error?: string;
  timestamp: Date;
}

/** Statistics derived from recorded requests. */
export interface RequestStats {
  count: number;
  errorCount: number;
  errorRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
}

/**
 * In-memory metrics recorder for observability.
 *
 * For production use, replace with an OpenTelemetry exporter:
 * `import { trace } from "@opentelemetry/api"`
 */
export class InMemoryRecorder {
  private readonly records: RequestRecord[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 10_000) {
    this.maxSize = maxSize;
  }

  public record(rec: Omit<RequestRecord, "timestamp">): void {
    if (this.records.length >= this.maxSize) this.records.shift();
    this.records.push({ ...rec, timestamp: new Date() });
  }

  public getStats(filter?: { method?: string; urlPrefix?: string }): RequestStats {
    const filtered = filter
      ? this.records.filter(
          (r) =>
            (!filter.method || r.method === filter.method) &&
            (!filter.urlPrefix || r.url.startsWith(filter.urlPrefix)),
        )
      : this.records;

    const count = filtered.length;
    if (count === 0) {
      return { count: 0, errorCount: 0, errorRate: 0, avgDurationMs: 0, p95DurationMs: 0, p99DurationMs: 0 };
    }

    const errorCount = filtered.filter((r) => r.statusCode >= 400 || r.error).length;
    const durations = filtered.map((r) => r.durationMs).sort((a, b) => a - b);
    const avgDurationMs = durations.reduce((s, d) => s + d, 0) / count;
    const p95DurationMs = durations[Math.floor(count * 0.95)] ?? 0;
    const p99DurationMs = durations[Math.floor(count * 0.99)] ?? 0;

    return {
      count,
      errorCount,
      errorRate: errorCount / count,
      avgDurationMs,
      p95DurationMs,
      p99DurationMs,
    };
  }

  public getRecent(n = 100): RequestRecord[] {
    return this.records.slice(-n);
  }

  public clear(): void {
    this.records.length = 0;
  }
}
