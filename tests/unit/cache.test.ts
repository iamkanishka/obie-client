import { TTLCache } from "../../src/cache";
import { jest, describe, it, expect, afterEach } from "@jest/globals";

function makeCache<K extends string, V>(ttlMs = 1000): TTLCache<K, V> {
  return new TTLCache<K, V>(ttlMs, 0); // disable background eviction in tests
}

describe("TTLCache", () => {
  afterEach(() => {
    // Ensure timers are cleared
    jest.useRealTimers();
  });

  it("stores and retrieves a value within TTL", () => {
    const cache = makeCache<string, number>(5000);
    cache.set("key", 42);
    expect(cache.get("key")).toBe(42);
    cache.destroy();
  });

  it("returns undefined for unknown key", () => {
    const cache = makeCache<string, string>();
    expect(cache.get("missing")).toBeUndefined();
    cache.destroy();
  });

  it("returns undefined after TTL expires", async () => {
    const cache = makeCache<string, number>(50);
    cache.set("x", 1);
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    expect(cache.get("x")).toBeUndefined();
    cache.destroy();
  });

  it("respects per-entry TTL override", async () => {
    const cache = makeCache<string, number>(5000);
    cache.set("fast", 1, 50);
    cache.set("slow", 2, 5000);
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    expect(cache.get("fast")).toBeUndefined();
    expect(cache.get("slow")).toBe(2);
    cache.destroy();
  });

  it("getOrSet returns cached value without calling fn", () => {
    const cache = makeCache<string, number>(5000);
    cache.set("k", 99);
    const fn = jest.fn(() => 0);
    expect(cache.getOrSet("k", fn)).toBe(99);
    expect(fn).not.toHaveBeenCalled();
    cache.destroy();
  });

  it("getOrSet computes and stores on miss", () => {
    const cache = makeCache<string, number>(5000);
    const fn = jest.fn(() => 42);
    expect(cache.getOrSet("k", fn)).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(cache.get("k")).toBe(42);
    cache.destroy();
  });

  it("delete removes a key", () => {
    const cache = makeCache<string, string>(5000);
    cache.set("a", "hello");
    cache.delete("a");
    expect(cache.get("a")).toBeUndefined();
    cache.destroy();
  });

  it("delete is idempotent for missing key", () => {
    const cache = makeCache<string, string>(5000);
    expect(() => cache.delete("nonexistent")).not.toThrow();
    cache.destroy();
  });

  it("invalidatePrefix removes matching keys", () => {
    const cache = makeCache<string, number>(5000);
    cache.set("user:1", 1);
    cache.set("user:2", 2);
    cache.set("token:x", 3);
    expect(cache.invalidatePrefix("user:")).toBe(2);
    expect(cache.get("user:1")).toBeUndefined();
    expect(cache.get("user:2")).toBeUndefined();
    expect(cache.get("token:x")).toBe(3);
    cache.destroy();
  });

  it("invalidatePrefix returns 0 when no keys match", () => {
    const cache = makeCache<string, number>(5000);
    cache.set("other:1", 1);
    expect(cache.invalidatePrefix("user:")).toBe(0);
    cache.destroy();
  });

  it("clear removes all entries", () => {
    const cache = makeCache<string, number>(5000);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
    cache.destroy();
  });

  it("overwrites existing entry on set", () => {
    const cache = makeCache<string, string>(5000);
    cache.set("k", "first");
    cache.set("k", "second");
    expect(cache.get("k")).toBe("second");
    cache.destroy();
  });

  it("stores arbitrary values including objects", () => {
    const cache = makeCache<string, { id: number; name: string }>(5000);
    const val = { id: 1, name: "Test" };
    cache.set("obj", val);
    expect(cache.get("obj")).toEqual(val);
    cache.destroy();
  });
});
