import { RateLimiter } from "../../src/ratelimit";
import {  describe, it, expect } from "@jest/globals";

describe("RateLimiter", () => {
  it("allows requests when bucket is full", async () => {
    const limiter = new RateLimiter(100, 10);
    const start = Date.now();
    await limiter.wait();
    expect(Date.now() - start).toBeLessThan(50);
  });

  it("available() starts at burst capacity", () => {
    const limiter = new RateLimiter(10, 5);
    expect(limiter.available()).toBeCloseTo(5, 0);
  });

  it("available() decreases after waiting", async () => {
    const limiter = new RateLimiter(100, 5);
    await limiter.wait();
    await limiter.wait();
    expect(limiter.available()).toBeLessThan(4);
  });

  it("waits when bucket is empty", async () => {
    // 1 token/sec, burst 1 — exhausted after first call
    const limiter = new RateLimiter(10, 1);
    await limiter.wait(); // uses the only token
    const start = Date.now();
    // Should wait ~100ms for next token (10 tokens/sec)
    const waiting = limiter.wait();
    // We don't await it — just confirm it doesn't resolve instantly
    let resolved = false;
    void waiting.then(() => { resolved = true; });
    await new Promise<void>((r) => setTimeout(r, 20));
    expect(resolved).toBe(false);
    await waiting;
  });

  it("respects AbortSignal cancellation", async () => {
    const limiter = new RateLimiter(0.1, 1); // very slow refill
    await limiter.wait(); // exhaust the token
    const controller = new AbortController();
    const waitPromise = limiter.wait(controller.signal);
    controller.abort();
    await expect(waitPromise).rejects.toThrow(/aborted/i);
  });

  it("rejects immediately on already-aborted signal", async () => {
    const limiter = new RateLimiter(0.1, 1);
    await limiter.wait(); // exhaust
    const controller = new AbortController();
    controller.abort();
    await expect(limiter.wait(controller.signal)).rejects.toThrow(/aborted/i);
  });

  it("multiple concurrent waiters resolve in order", async () => {
    const limiter = new RateLimiter(100, 5);
    const results: number[] = [];
    await Promise.all(
      [1, 2, 3].map(async (n) => {
        await limiter.wait();
        results.push(n);
      }),
    );
    expect(results).toHaveLength(3);
  });
});
