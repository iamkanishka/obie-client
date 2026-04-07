/** Result of one item in a batch operation. */
export interface BatchResult<T> {
  key: string;
  value?: T;
  error?: unknown;
  ok: boolean;
}

/**
 * Executes an async function over a list of keys with bounded concurrency,
 * collecting all results (successes and errors).
 *
 * @example
 * ```typescript
 * const results = await batchExecute(
 *   accountIds,
 *   (id) => client.Accounts.getBalances(id),
 *   { concurrency: 5 },
 * );
 * const succeeded = results.filter(r => r.ok);
 * ```
 */
export async function batchExecute<K, V>(
  items: K[],
  fn: (item: K) => Promise<V>,
  options: { concurrency?: number; keyFn?: (item: K) => string } = {},
): Promise<BatchResult<V>[]> {
  const concurrency = options.concurrency ?? 5;
  const keyFn = options.keyFn ?? ((item) => String(item));
  const results: BatchResult<V>[] = new Array(items.length);
  const sem = new Semaphore(concurrency);

  await Promise.all(
    items.map(async (item, i) => {
      const key = keyFn(item);
      await sem.acquire();
      try {
        const value = await fn(item);
        results[i] = { key, value, ok: true };
      } catch (error) {
        results[i] = { key, error, ok: false };
      } finally {
        sem.release();
      }
    }),
  );

  return results;
}

/** Simple semaphore for bounded concurrency. */
class Semaphore {
  private permits: number;
  private readonly queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => this.queue.push(resolve));
  }

  release(): void {
    const next = this.queue.shift();
    if (next !== undefined) {
      next();
    } else {
      this.permits++;
    }
  }
}
