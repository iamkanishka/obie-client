import { TokenManager } from "../../src/auth/token-manager";
import { OBIETokenError } from "../../src/errors";
import { resolveConfig } from "../../src/config";

import { jest, describe, it, expect } from "@jest/globals";

// Mock the jwt module so we don't need real RSA keys in unit tests
jest.mock("../../src/auth/jwt", () => ({
  buildClientAssertion: jest.fn().mockResolvedValue("mock-jwt-assertion"),
}));

function makeConfig(fetchImpl: typeof fetch) {
  return resolveConfig({
    clientId: "test-client",
    tokenUrl: "https://aspsp.example.com/token",
    privateKeyPem: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----",
    fetch: fetchImpl,
  });
}

function makeTokenResponse(token = "access-token-123", expiresIn = 3600): Response {
  return new Response(JSON.stringify({ access_token: token, expires_in: expiresIn, token_type: "Bearer" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("TokenManager", () => {
  it("fetches a token from the token endpoint", async () => {
    const mockFetch = jest.fn().mockResolvedValue(makeTokenResponse("my-token"));
    const cfg = makeConfig(mockFetch);
    const tm = new TokenManager(cfg);
    const token = await tm.accessToken();
    expect(token).toBe("my-token");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("caches the token and does not re-fetch before expiry", async () => {
    const mockFetch = jest.fn().mockResolvedValue(makeTokenResponse("cached-token", 3600));
    const tm = new TokenManager(makeConfig(mockFetch));
    await tm.accessToken();
    await tm.accessToken();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("invalidate clears the cache and forces re-fetch", async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(makeTokenResponse("first-token"))
      .mockResolvedValueOnce(makeTokenResponse("second-token"));
    const tm = new TokenManager(makeConfig(mockFetch));
    const t1 = await tm.accessToken();
    tm.invalidate();
    const t2 = await tm.accessToken();
    expect(t1).toBe("first-token");
    expect(t2).toBe("second-token");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws OBIETokenError on non-OK response", async () => {
    const mockFetch = jest.fn().mockResolvedValue(
      new Response("Unauthorized", { status: 401 }),
    );
    const tm = new TokenManager(makeConfig(mockFetch));
    await expect(tm.accessToken()).rejects.toThrow(OBIETokenError);
  });

  it("throws OBIETokenError on non-JSON response", async () => {
    const mockFetch = jest.fn().mockResolvedValue(
      new Response("not json", { status: 200 }),
    );
    const tm = new TokenManager(makeConfig(mockFetch));
    await expect(tm.accessToken()).rejects.toThrow(OBIETokenError);
  });

  it("throws OBIETokenError when access_token is missing", async () => {
    const mockFetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ token_type: "Bearer" }), { status: 200 }),
    );
    const tm = new TokenManager(makeConfig(mockFetch));
    await expect(tm.accessToken()).rejects.toThrow(OBIETokenError);
  });

  it("deduplicates concurrent token requests (only one fetch)", async () => {
    let resolveOnce: (v: Response) => void;
    const waitPromise = new Promise<Response>((resolve) => { resolveOnce = resolve; });
    const mockFetch = jest.fn().mockReturnValue(waitPromise);

    const tm = new TokenManager(makeConfig(mockFetch));
    const p1 = tm.accessToken();
    const p2 = tm.accessToken();
    const p3 = tm.accessToken();

    resolveOnce!(makeTokenResponse("shared-token"));
    const [t1, t2, t3] = await Promise.all([p1, p2, p3]);

    expect(t1).toBe("shared-token");
    expect(t2).toBe("shared-token");
    expect(t3).toBe("shared-token");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("throws OBIETokenError on network failure", async () => {
    const mockFetch = jest.fn().mockRejectedValue(new TypeError("network error"));
    const tm = new TokenManager(makeConfig(mockFetch));
    await expect(tm.accessToken()).rejects.toThrow(OBIETokenError);
  });
});
