interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

/**
 * Generic in-memory TTL cache with automatic eviction.
 */
export class TTLCache<K extends string | number | symbol, V> {
  private readonly items = new Map<K, CacheEntry<V>>();
  private readonly defaultTtlMs: number;
  private evictionTimer: NodeJS.Timeout | number | null = null;

  constructor(defaultTtlMs: number, evictionIntervalMs = 60_000) {
  this.defaultTtlMs = defaultTtlMs;

  if (evictionIntervalMs > 0) {
    this.evictionTimer = setInterval(() => this.evict(), evictionIntervalMs);

    // Allow process to exit even if the timer is running (Node only)
    if (
      this.evictionTimer &&
      typeof this.evictionTimer !== "number"
    ) {
      this.evictionTimer.unref?.();
    }
  }
}

  /** Stores value under key with the default TTL. */
  public set(key: K, value: V, ttlMs?: number): void {
    this.items.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  /** Returns the value if present and not expired; otherwise undefined. */
  public get(key: K): V | undefined {
    const entry = this.items.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.items.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /** Returns the value, or computes+stores it with `fn` if missing/expired. */
  public getOrSet(key: K, fn: () => V, ttlMs?: number): V {
    const existing = this.get(key);
    if (existing !== undefined) return existing;
    const value = fn();
    this.set(key, value, ttlMs);
    return value;
  }

  /** Removes a key. */
  public delete(key: K): void {
    this.items.delete(key);
  }

  /** Removes all entries whose string key starts with prefix. */
  public invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.items.keys()) {
      if (String(key).startsWith(prefix)) {
        this.items.delete(key);
        count++;
      }
    }
    return count;
  }

  /** Removes all entries. */
  public clear(): void {
    this.items.clear();
  }

  /** Number of non-expired entries. */
  public get size(): number {
    this.evict();
    return this.items.size;
  }

  /** Stops the background eviction timer. */
  public destroy(): void {
    if (this.evictionTimer !== null) {
      clearInterval(this.evictionTimer);
      this.evictionTimer = null;
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private evict(): void {
    const now = Date.now();
    for (const [key, entry] of this.items) {
      if (now > entry.expiresAt) this.items.delete(key);
    }
  }
}
