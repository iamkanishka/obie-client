import { AISConsentService } from "../../src/aisp/consent";
import type { HttpClient } from "../../src/http/client";
import { detailPermissions } from "../../src/types/enums";
import { jest, describe, it, expect } from "@jest/globals";
function mockHttp(impl: Partial<Pick<HttpClient, "get" | "post" | "delete">> = {}): HttpClient {
  return {
    get: jest.fn<Promise<any>>() as any,
    post: jest.fn<Promise<any>>() as any,
    put: jest.fn<Promise<any>>() as any,
    delete: jest.fn<Promise<any>>() as any,
    postRaw: jest.fn<Promise<any>>() as any,
    getRaw: jest.fn<Promise<any>>() as any,
    ...impl,
  } as unknown as HttpClient;
}

const BASE = "https://aspsp.example.com";

describe("AISConsentService", () => {
  const validConsentResp = {
    Data: {
      ConsentId: "urn-obie-intent-123",
      Status: "AwaitingAuthorisation",
      Permissions: detailPermissions(),
      CreationDateTime: "2024-01-01T00:00:00Z",
      StatusUpdateDateTime: "2024-01-01T00:00:00Z",
    },
    Risk: {},
    Links: { Self: `${BASE}/aisp/account-access-consents/urn-obie-intent-123` },
    Meta: { TotalPages: 1 },
  };

  describe("create", () => {
    it("POSTs to the correct endpoint", async () => {
      const http = mockHttp({ post: jest.fn().mockResolvedValue(validConsentResp) });
      const svc = new AISConsentService(http, BASE);
      const req = { Data: { Permissions: detailPermissions() }, Risk: {} as Record<string, never> };
      const result = await svc.create(req);
      expect(http.post).toHaveBeenCalledWith(
        `${BASE}/open-banking/v3.1/aisp/account-access-consents`,
        req,
      );
      expect(result.Data.ConsentId).toBe("urn-obie-intent-123");
    });

    it("returns the consent response", async () => {
      const http = mockHttp({ post: jest.fn().mockResolvedValue(validConsentResp) });
      const svc = new AISConsentService(http, BASE);
      const result = await svc.create({ Data: { Permissions: ["ReadBalances"] }, Risk: {} as Record<string, never> });
      expect(result.Data.Status).toBe("AwaitingAuthorisation");
    });
  });

  describe("get", () => {
    it("GETs the correct URL", async () => {
      const http = mockHttp({ get: jest.fn().mockResolvedValue(validConsentResp) });
      const svc = new AISConsentService(http, BASE);
      await svc.get("urn-obie-intent-123");
      expect(http.get).toHaveBeenCalledWith(
        `${BASE}/open-banking/v3.1/aisp/account-access-consents/urn-obie-intent-123`,
      );
    });
  });

  describe("delete", () => {
    it("DELETEs the correct URL", async () => {
      const http = mockHttp({ delete: jest.fn().mockResolvedValue(undefined) });
      const svc = new AISConsentService(http, BASE);
      await svc.delete("urn-obie-intent-123");
      expect(http.delete).toHaveBeenCalledWith(
        `${BASE}/open-banking/v3.1/aisp/account-access-consents/urn-obie-intent-123`,
      );
    });
  });

  describe("pollUntilAuthorised", () => {
    it("returns immediately when consent is already Authorised", async () => {
      const authorisedResp = { ...validConsentResp, Data: { ...validConsentResp.Data, Status: "Authorised" } };
      const http = mockHttp({ get: jest.fn().mockResolvedValue(authorisedResp) });
      const svc = new AISConsentService(http, BASE);
      const result = await svc.pollUntilAuthorised("urn-obie-intent-123");
      expect(result.Data.Status).toBe("Authorised");
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it("polls multiple times until Authorised", async () => {
      const pending = { ...validConsentResp };
      const authorised = { ...validConsentResp, Data: { ...validConsentResp.Data, Status: "Authorised" } };
      const http = mockHttp({
        get: jest.fn()
          .mockResolvedValueOnce(pending)
          .mockResolvedValueOnce(pending)
          .mockResolvedValueOnce(authorised),
      });
      const svc = new AISConsentService(http, BASE);
      const result = await svc.pollUntilAuthorised("id-1", { intervalMs: 10 });
      expect(result.Data.Status).toBe("Authorised");
      expect(http.get).toHaveBeenCalledTimes(3);
    });

    it("throws when consent is Rejected", async () => {
      const rejected = { ...validConsentResp, Data: { ...validConsentResp.Data, Status: "Rejected" } };
      const http = mockHttp({ get: jest.fn().mockResolvedValue(rejected) });
      const svc = new AISConsentService(http, BASE);
      await expect(svc.pollUntilAuthorised("id-1", { intervalMs: 10 })).rejects.toThrow(/Rejected/);
    });

    it("throws when consent is Revoked", async () => {
      const revoked = { ...validConsentResp, Data: { ...validConsentResp.Data, Status: "Revoked" } };
      const http = mockHttp({ get: jest.fn().mockResolvedValue(revoked) });
      const svc = new AISConsentService(http, BASE);
      await expect(svc.pollUntilAuthorised("id-1")).rejects.toThrow(/Revoked/);
    });

    it("times out when never Authorised", async () => {
      const http = mockHttp({ get: jest.fn().mockResolvedValue(validConsentResp) });
      const svc = new AISConsentService(http, BASE);
      await expect(
        svc.pollUntilAuthorised("id-1", { intervalMs: 10, timeoutMs: 50 }),
      ).rejects.toThrow(/timed out/);
    });
  });
});
