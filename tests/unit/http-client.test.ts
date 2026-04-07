import { HttpClient } from "../../src/http/client";
import { CircuitBreaker } from "../../src/circuitbreaker";
import { RateLimiter } from "../../src/ratelimit";
import { InMemoryRecorder } from "../../src/observability";
import { resolveConfig } from "../../src/config";
import { OBIEApiError } from "../../src/errors";
import { jest, describe, it, expect } from "@jest/globals";

// Plain token manager stub — avoids jest.mock/resetMocks interaction
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stubTokenManager: any = {
  accessToken: async () => "test-bearer-token",
  invalidate: () => undefined,
};

function makeClient(fetchImpl: typeof fetch) {
  const cfg = resolveConfig({
    clientId: "test",
    tokenUrl: "https://example.com/token",
    privateKeyPem: "---fake---",
    fetch: fetchImpl,
    maxRetries: 0, // disable retries for most tests
  });
  return new HttpClient({
    cfg,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    tokenManager: stubTokenManager,
    circuitBreaker: new CircuitBreaker(),
    rateLimiter: new RateLimiter(1000, 1000),
    recorder: new InMemoryRecorder(),
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("HttpClient", () => {
  it("GET: sends request and decodes JSON response", async () => {
    const mockFetch = jest.fn().mockResolvedValue(jsonResponse({ Data: { Account: [] } }));
    const http = makeClient(mockFetch);
    const result = await http.get<{ Data: { Account: unknown[] } }>("https://aspsp.example.com/accounts");
    expect(result.Data.Account).toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [req] = mockFetch.mock.calls[0] as [Request];
    expect(req.method).toBe("GET");
  });

  it("GET: sets Authorization header with Bearer token", async () => {
    const mockFetch = jest.fn().mockResolvedValue(jsonResponse({}));
    const http = makeClient(mockFetch);
    await http.get("https://example.com/resource");
    const [req] = mockFetch.mock.calls[0] as [Request];
    expect(req.headers.get("authorization")).toBe("Bearer test-bearer-token");
  });

  it("GET: sets mandatory FAPI headers", async () => {
    const mockFetch = jest.fn().mockResolvedValue(jsonResponse({}));
    const http = makeClient(mockFetch);
    await http.get("https://example.com/resource");
    const [req] = mockFetch.mock.calls[0] as [Request];
    expect(req.headers.get("x-fapi-interaction-id")).toBeTruthy();
    expect(req.headers.get("x-fapi-auth-date")).toBeTruthy();
    expect(req.headers.get("accept")).toBe("application/json");
  });

  it("POST: sends JSON body", async () => {
    const mockFetch = jest.fn().mockResolvedValue(jsonResponse({ Data: { ConsentId: "c-1" } }));
    const http = makeClient(mockFetch);
    await http.post("https://example.com/consents", { Data: { Permissions: ["ReadBalances"] }, Risk: {} });
    const [req] = mockFetch.mock.calls[0] as [Request];
    expect(req.method).toBe("POST");
    expect(req.headers.get("content-type")).toContain("application/json");
    const body = await req.json() as unknown;
    expect((body as Record<string, unknown>)["Data"]).toBeTruthy();
  });

  it("POST: sets idempotency key when provided", async () => {
    const mockFetch = jest.fn().mockResolvedValue(jsonResponse({}));
    const http = makeClient(mockFetch);
    await http.post("https://example.com/payments", {}, { idempotencyKey: "idem-123" });
    const [req] = mockFetch.mock.calls[0] as [Request];
    expect(req.headers.get("x-idempotency-key")).toBe("idem-123");
  });

  it("POST: sets JWS signature header when provided", async () => {
    const mockFetch = jest.fn().mockResolvedValue(jsonResponse({}));
    const http = makeClient(mockFetch);
    await http.post("https://example.com/payments", {}, { jwsSignature: "header..sig" });
    const [req] = mockFetch.mock.calls[0] as [Request];
    expect(req.headers.get("x-jws-signature")).toBe("header..sig");
  });

  it("DELETE: sends DELETE method", async () => {
    const mockFetch = jest.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const http = makeClient(mockFetch);
    await http.delete("https://example.com/consents/c-1");
    const [req] = mockFetch.mock.calls[0] as [Request];
    expect(req.method).toBe("DELETE");
  });

  it("throws OBIEApiError on 400 response", async () => {
    const mockFetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ Code: "UK.OBIE.Field.Missing", Message: "Missing field" }), {
        status: 400,
        headers: { "x-fapi-interaction-id": "iid-1" },
      }),
    );
    const http = makeClient(mockFetch);
    const err = await http.get("https://example.com/resource").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OBIEApiError);
    expect((err as OBIEApiError).statusCode).toBe(400);
    expect((err as OBIEApiError).interactionId).toBe("iid-1");
  });

  it("throws OBIEApiError on 401 response", async () => {
    const mockFetch = jest.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    const http = makeClient(mockFetch);
    await expect(http.get("https://example.com/")).rejects.toBeInstanceOf(OBIEApiError);
  });

  it("returns undefined for 204 No Content", async () => {
    const mockFetch = jest.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const http = makeClient(mockFetch);
    const result = await http.delete("https://example.com/resource");
    expect(result).toBeUndefined();
  });

  it("records requests in the metrics recorder", async () => {
    const recorder = new InMemoryRecorder();
    const cfg = resolveConfig({
      clientId: "test",
      tokenUrl: "https://example.com/token",
      privateKeyPem: "---fake---",
      fetch: jest.fn().mockResolvedValue(jsonResponse({ ok: true })),
      maxRetries: 0,
    });
    const http = new HttpClient({
      cfg,
      tokenManager: stubTokenManager,
      circuitBreaker: new CircuitBreaker(),
      rateLimiter: new RateLimiter(1000, 1000),
      recorder,
    });
    await http.get("https://example.com/test");
    const stats = recorder.getStats();
    expect(stats.count).toBe(1);
    expect(stats.errorCount).toBe(0);
  });

  it("retries idempotent 500 responses up to maxRetries", async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(new Response("Server Error", { status: 500 }))
      .mockResolvedValueOnce(new Response("Server Error", { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const cfg = resolveConfig({
      clientId: "test",
      tokenUrl: "https://example.com/token",
      privateKeyPem: "---fake---",
      fetch: mockFetch,
      maxRetries: 2,
    });
    const http = new HttpClient({
      cfg,
      tokenManager: stubTokenManager,
      circuitBreaker: new CircuitBreaker({ maxFailures: 100 }),
      rateLimiter: new RateLimiter(1000, 1000),
      recorder: new InMemoryRecorder(),
    });

    const result = await http.get<{ ok: boolean }>("https://example.com/resource");
    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
