import { batchExecute } from "../../src/batch";
import { jest, describe, it, expect } from "@jest/globals";

describe("batchExecute", () => {
  it("executes fn for each item", async () => {
    const results = await batchExecute(["a", "b", "c"], async (item) => item.toUpperCase());
    expect(results.map((r) => r.value)).toEqual(["A", "B", "C"]);
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it("records errors without stopping other items", async () => {
    const results = await batchExecute(
      [1, 2, 3],
      async (n) => {
        if (n === 2) throw new Error("Failed on 2");
        return n * 10;
      },
    );
    expect(results).toHaveLength(3);
    expect(results[0]?.ok).toBe(true);
    expect(results[0]?.value).toBe(10);
    expect(results[1]?.ok).toBe(false);
    expect((results[1]?.error as Error).message).toBe("Failed on 2");
    expect(results[2]?.ok).toBe(true);
    expect(results[2]?.value).toBe(30);
  });

  it("handles empty input array", async () => {
    const results = await batchExecute<string, string>([], async (x) => x);
    expect(results).toHaveLength(0);
  });

  it("uses custom keyFn for result keys", async () => {
    const results = await batchExecute(
      [{ id: "acc-1" }, { id: "acc-2" }],
      async (item) => `balance-${item.id}`,
      { keyFn: (item) => item.id },
    );
    expect(results[0]?.key).toBe("acc-1");
    expect(results[1]?.key).toBe("acc-2");
  });

  it("respects concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;

    const results = await batchExecute(
      Array.from({ length: 10 }, (_, i) => i),
      async (n) => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise<void>((r) => setTimeout(r, 10));
        active--;
        return n;
      },
      { concurrency: 3 },
    );

    expect(maxActive).toBeLessThanOrEqual(3);
    expect(results).toHaveLength(10);
  });

  it("defaults concurrency to 5", async () => {
    let active = 0;
    let maxActive = 0;

    await batchExecute(
      Array.from({ length: 20 }, (_, i) => i),
      async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise<void>((r) => setTimeout(r, 5));
        active--;
      },
    );

    expect(maxActive).toBeLessThanOrEqual(5);
  });

  it("preserves result order matching input order", async () => {
    const items = Array.from({ length: 5 }, (_, i) => i);
    const results = await batchExecute(
      items,
      async (n) => {
        // Stagger delays so they complete in reverse order
        await new Promise<void>((r) => setTimeout(r, (5 - n) * 5));
        return n;
      },
      { concurrency: 5 },
    );
    expect(results.map((r) => r.value)).toEqual([0, 1, 2, 3, 4]);
  });

  it("all-failure scenario marks all results as not ok", async () => {
    const results = await batchExecute(
      ["a", "b"],
      async (s) => { throw new Error(s); },
    );
    expect(results.every((r) => !r.ok)).toBe(true);
    expect((results[0]?.error as Error).message).toBe("a");
    expect((results[1]?.error as Error).message).toBe("b");
  });
});
