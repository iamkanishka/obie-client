import { InMemoryRecorder } from "../../src/observability";

function rec(
  method: string,
  url: string,
  statusCode: number,
  durationMs: number,
  error?: string,
): { method: string; url: string; statusCode: number; durationMs: number; error?: string } {
  const base = { method, url, statusCode, durationMs };
  return error !== undefined ? { ...base, error } : base;
}

import { jest, describe, it, expect } from "@jest/globals";

describe("InMemoryRecorder", () => {
  it("starts empty", () => {
    const r = new InMemoryRecorder();
    expect(r.getStats().count).toBe(0);
  });

  it("records a request", () => {
    const r = new InMemoryRecorder();
    r.record(rec("GET", "/accounts", 200, 120));
    const stats = r.getStats();
    expect(stats.count).toBe(1);
    expect(stats.errorCount).toBe(0);
    expect(stats.errorRate).toBe(0);
  });

  it("counts errors (4xx/5xx and transport errors)", () => {
    const r = new InMemoryRecorder();
    r.record(rec("GET", "/accounts", 200, 100));
    r.record(rec("POST", "/payments", 400, 50));
    r.record(rec("GET", "/balances", 500, 200));
    r.record(rec("GET", "/error", 0, 10, "Network timeout"));
    const stats = r.getStats();
    expect(stats.count).toBe(4);
    expect(stats.errorCount).toBe(3);
    expect(stats.errorRate).toBeCloseTo(0.75, 2);
  });

  it("calculates avg duration", () => {
    const r = new InMemoryRecorder();
    r.record(rec("GET", "/a", 200, 100));
    r.record(rec("GET", "/b", 200, 200));
    r.record(rec("GET", "/c", 200, 300));
    expect(r.getStats().avgDurationMs).toBeCloseTo(200, 0);
  });

  it("calculates p95 and p99 duration", () => {
    const r = new InMemoryRecorder();
    for (let i = 1; i <= 100; i++) {
      r.record(rec("GET", "/x", 200, i * 10));
    }
    const stats = r.getStats();
    // p95 ≈ 950ms, p99 ≈ 990ms (within a few ms)
    expect(stats.p95DurationMs).toBeGreaterThanOrEqual(900);
    expect(stats.p99DurationMs).toBeGreaterThanOrEqual(960);
  });

  it("filters by method", () => {
    const r = new InMemoryRecorder();
    r.record(rec("GET", "/accounts", 200, 100));
    r.record(rec("POST", "/payments", 201, 150));
    r.record(rec("GET", "/balances", 200, 80));
    const getStats = r.getStats({ method: "GET" });
    expect(getStats.count).toBe(2);
    const postStats = r.getStats({ method: "POST" });
    expect(postStats.count).toBe(1);
  });

  it("filters by URL prefix", () => {
    const r = new InMemoryRecorder();
    r.record(rec("GET", "https://bank.com/aisp/accounts", 200, 100));
    r.record(rec("GET", "https://bank.com/pisp/payments", 200, 150));
    const stats = r.getStats({ urlPrefix: "https://bank.com/aisp" });
    expect(stats.count).toBe(1);
  });

  it("clear removes all records", () => {
    const r = new InMemoryRecorder();
    r.record(rec("GET", "/a", 200, 100));
    r.record(rec("GET", "/b", 200, 200));
    r.clear();
    expect(r.getStats().count).toBe(0);
  });

  it("getRecent returns last N records", () => {
    const r = new InMemoryRecorder();
    for (let i = 0; i < 5; i++) {
      r.record(rec("GET", `/r${i}`, 200, i * 10));
    }
    const recent = r.getRecent(3);
    expect(recent).toHaveLength(3);
    expect(recent[2]?.url).toBe("/r4");
  });

  it("evicts oldest records when maxSize is exceeded", () => {
    const r = new InMemoryRecorder(5);
    for (let i = 0; i < 7; i++) {
      r.record(rec("GET", `/r${i}`, 200, 10));
    }
    expect(r.getStats().count).toBe(5);
    const recent = r.getRecent(10);
    expect(recent[0]?.url).toBe("/r2");
  });

  it("returns zero stats for empty recorder", () => {
    const r = new InMemoryRecorder();
    const s = r.getStats();
    expect(s.avgDurationMs).toBe(0);
    expect(s.p95DurationMs).toBe(0);
    expect(s.p99DurationMs).toBe(0);
    expect(s.errorRate).toBe(0);
  });
});
