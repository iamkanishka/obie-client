import { CircuitBreaker } from "../../src/circuitbreaker";
import { OBIECircuitOpenError } from "../../src/errors";
import { jest, describe, it, expect } from "@jest/globals";

function makeBreaker(opts?: ConstructorParameters<typeof CircuitBreaker>[0]): CircuitBreaker {
  return new CircuitBreaker({ maxFailures: 3, openTimeoutMs: 100, successThreshold: 2, ...opts });
}

describe("CircuitBreaker", () => {
  it("starts in closed state", () => {
    const cb = makeBreaker();
    expect(cb.getState()).toBe("closed");
  });

  it("allows requests when closed", async () => {
    const cb = makeBreaker();
    const result = await cb.execute(async () => 42);
    expect(result).toBe(42);
  });

  it("opens after maxFailures consecutive failures", async () => {
    const cb = makeBreaker({ maxFailures: 3, openTimeoutMs: 1000 });
    const fail = async (): Promise<never> => {
      throw new Error("fail");
    };

    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(fail)).rejects.toThrow("fail");
    }

    expect(cb.getState()).toBe("open");
    await expect(cb.execute(async () => "ok")).rejects.toBeInstanceOf(OBIECircuitOpenError);
  });

  it("transitions to half-open after openTimeout", async () => {
    const cb = makeBreaker({ maxFailures: 1, openTimeoutMs: 50 });
    await expect(cb.execute(async () => { throw new Error("fail"); })).rejects.toThrow();
    expect(cb.getState()).toBe("open");

    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    expect(cb.getState()).toBe("half-open");
  });

  it("closes after successThreshold successes in half-open", async () => {
    const cb = makeBreaker({ maxFailures: 1, openTimeoutMs: 50, successThreshold: 2 });
    await expect(cb.execute(async () => { throw new Error(); })).rejects.toThrow();
    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    await cb.execute(async () => "ok");
    expect(cb.getState()).toBe("half-open"); // need 2 successes
    await cb.execute(async () => "ok");
    expect(cb.getState()).toBe("closed");
  });

  it("re-opens on failure in half-open state", async () => {
    const cb = makeBreaker({ maxFailures: 1, openTimeoutMs: 50, successThreshold: 2 });
    await expect(cb.execute(async () => { throw new Error(); })).rejects.toThrow();
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    await expect(cb.execute(async () => { throw new Error("probe fail"); })).rejects.toThrow("probe fail");
    expect(cb.getState()).toBe("open");
  });

  it("resets to closed on manual reset", async () => {
    const cb = makeBreaker({ maxFailures: 1, openTimeoutMs: 10000 });
    await expect(cb.execute(async () => { throw new Error(); })).rejects.toThrow();
    expect(cb.getState()).toBe("open");
    cb.reset();
    expect(cb.getState()).toBe("closed");
  });

  it("calls onStateChange callback on transitions", async () => {
    const changes: Array<{ from: string; to: string }> = [];
    const cb = makeBreaker({
      maxFailures: 1,
      openTimeoutMs: 50,
      onStateChange: (from, to) => changes.push({ from, to }),
    });

    await expect(cb.execute(async () => { throw new Error(); })).rejects.toThrow();
    expect(changes).toContainEqual({ from: "closed", to: "open" });
  });

  it("does not open circuit on OBIECircuitOpenError", async () => {
    const cb = makeBreaker({ maxFailures: 2 });
    // Simulate already-open inner circuit
    const inner = makeBreaker({ maxFailures: 1 });
    await expect(inner.execute(async () => { throw new Error(); })).rejects.toThrow();

    // The outer circuit should not count OBIECircuitOpenError as a failure
    await expect(cb.execute(async () => inner.execute(async () => "x"))).rejects.toBeInstanceOf(OBIECircuitOpenError);
    expect(cb.getState()).toBe("closed");
  });

  it("resets failure count on success", async () => {
    const cb = makeBreaker({ maxFailures: 3 });
    const fail = async (): Promise<never> => { throw new Error("fail"); };

    await expect(cb.execute(fail)).rejects.toThrow();
    await expect(cb.execute(fail)).rejects.toThrow();
    await cb.execute(async () => "success"); // resets count
    await expect(cb.execute(fail)).rejects.toThrow();
    await expect(cb.execute(fail)).rejects.toThrow();
    // Circuit should still be closed (failures reset by success)
    expect(cb.getState()).toBe("closed");
  });
});
