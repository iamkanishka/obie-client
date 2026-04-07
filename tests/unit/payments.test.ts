import { PaymentsService } from "../../src/payments";
import type { HttpClient } from "../../src/http/client";
import type {
  OBWriteDomesticConsent5,
  OBWriteDomesticConsentResponse5,
  OBWriteDomesticResponse5,
} from "../../src/types/payments";

import { jest, describe, it, expect, beforeEach} from "@jest/globals";

// Mock JWS signing so tests don't need real RSA keys
// Note: resetMocks:true in jest.config clears mockResolvedValue between tests,
// so we re-set the implementation in beforeEach.
jest.mock("../../src/signing/jws", () => ({
  signDetachedJws: jest.fn(),
}));

import { signDetachedJws } from "../../src/signing/jws";

beforeEach(() => {
  (signDetachedJws as jest.Mock).mockResolvedValue("header..signature");
});

function mockHttp(impl: Partial<Pick<HttpClient, "get" | "post" | "put" | "delete">> = {}): HttpClient {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    postRaw: jest.fn(),
    getRaw: jest.fn(),
    ...impl,
  } as unknown as HttpClient;
}

const BASE = "https://aspsp.example.com";
const SIGNER = { privateKeyPem: "---pem---", signingKeyId: "kid-1" };

const DOMESTIC_CONSENT_RESP: OBWriteDomesticConsentResponse5 = {
  Data: {
    ConsentId: "pmt-consent-001",
    Status: "AwaitingAuthorisation",
    CreationDateTime: "2024-01-01T00:00:00Z",
    StatusUpdateDateTime: "2024-01-01T00:00:00Z",
    Initiation: {
      InstructionIdentification: "INSTR-001",
      EndToEndIdentification: "E2E-001",
      InstructedAmount: { Amount: "10.50", Currency: "GBP" },
      CreditorAccount: { SchemeName: "UK.OBIE.SortCodeAccountNumber", Identification: "20000319825731" },
    },
  },
  Risk: {},
  Links: { Self: `${BASE}/pisp/domestic-payment-consents/pmt-consent-001` },
  Meta: { TotalPages: 1 },
};

function makePaymentResponse(status: string, id = "pmt-001"): OBWriteDomesticResponse5 {
  return {
    Data: {
      DomesticPaymentId: id,
      ConsentId: "pmt-consent-001",
      CreationDateTime: "2024-01-01T00:00:00Z",
      Status: status,
      StatusUpdateDateTime: "2024-01-01T00:00:01Z",
      Initiation: DOMESTIC_CONSENT_RESP.Data.Initiation,
    },
    Links: { Self: `${BASE}/pisp/domestic-payments/${id}` },
    Meta: { TotalPages: 1 },
  };
}

describe("PaymentsService", () => {
  describe("createDomesticConsent", () => {
    it("POSTs to correct endpoint with JWS signature", async () => {
      const http = mockHttp({ post: jest.fn().mockResolvedValue(DOMESTIC_CONSENT_RESP) });
      const svc = new PaymentsService(http, BASE, SIGNER);
      const req: OBWriteDomesticConsent5 = {
        Data: { Initiation: DOMESTIC_CONSENT_RESP.Data.Initiation },
        Risk: {},
      };
      const result = await svc.createDomesticConsent(req);
      expect(http.post).toHaveBeenCalledWith(
        `${BASE}/open-banking/v3.1/pisp/domestic-payment-consents`,
        req,
        expect.objectContaining({
          jwsSignature: "header..signature",
          idempotencyKey: expect.any(String),
        }),
      );
      expect(result.Data.ConsentId).toBe("pmt-consent-001");
    });
  });

  describe("getDomesticConsent", () => {
    it("GETs correct URL", async () => {
      const http = mockHttp({ get: jest.fn().mockResolvedValue(DOMESTIC_CONSENT_RESP) });
      const svc = new PaymentsService(http, BASE, SIGNER);
      await svc.getDomesticConsent("pmt-consent-001");
      expect(http.get).toHaveBeenCalledWith(
        `${BASE}/open-banking/v3.1/pisp/domestic-payment-consents/pmt-consent-001`,
      );
    });
  });

  describe("deleteDomesticScheduledConsent", () => {
    it("DELETEs correct URL", async () => {
      const http = mockHttp({ delete: jest.fn().mockResolvedValue(undefined) });
      const svc = new PaymentsService(http, BASE, SIGNER);
      await svc.deleteDomesticScheduledConsent("sc-001");
      expect(http.delete).toHaveBeenCalledWith(
        `${BASE}/open-banking/v3.1/pisp/domestic-scheduled-payment-consents/sc-001`,
      );
    });
  });

  describe("submitDomestic", () => {
    it("POSTs with ConsentId and JWS signature", async () => {
      const resp = makePaymentResponse("AcceptedSettlementInProcess");
      const http = mockHttp({ post: jest.fn().mockResolvedValue(resp) });
      const svc = new PaymentsService(http, BASE, SIGNER);
      const req = {
        Data: { ConsentId: "pmt-consent-001", Initiation: DOMESTIC_CONSENT_RESP.Data.Initiation },
        Risk: {},
      };
      const result = await svc.submitDomestic(req);
      expect(result.Data.DomesticPaymentId).toBe("pmt-001");
      expect(http.post).toHaveBeenCalledWith(
        `${BASE}/open-banking/v3.1/pisp/domestic-payments`,
        req,
        expect.objectContaining({ jwsSignature: "header..signature" }),
      );
    });
  });

  describe("pollDomestic", () => {
    it("returns immediately on terminal status", async () => {
      const http = mockHttp({ get: jest.fn().mockResolvedValue(makePaymentResponse("AcceptedSettlementCompleted")) });
      const svc = new PaymentsService(http, BASE, SIGNER);
      const result = await svc.pollDomestic("pmt-001");
      expect(result.Data.Status).toBe("AcceptedSettlementCompleted");
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it("polls multiple times until terminal", async () => {
      const http = mockHttp({
        get: jest.fn()
          .mockResolvedValueOnce(makePaymentResponse("Pending"))
          .mockResolvedValueOnce(makePaymentResponse("AcceptedSettlementInProcess"))
          .mockResolvedValueOnce(makePaymentResponse("AcceptedSettlementCompleted")),
      });
      const svc = new PaymentsService(http, BASE, SIGNER);
      const result = await svc.pollDomestic("pmt-001", { intervalMs: 5 });
      expect(result.Data.Status).toBe("AcceptedSettlementCompleted");
      expect(http.get).toHaveBeenCalledTimes(3);
    });

    it("returns on Rejected (terminal)", async () => {
      const http = mockHttp({ get: jest.fn().mockResolvedValue(makePaymentResponse("Rejected")) });
      const svc = new PaymentsService(http, BASE, SIGNER);
      const result = await svc.pollDomestic("pmt-001");
      expect(result.Data.Status).toBe("Rejected");
    });

    it("times out if never terminal", async () => {
      const http = mockHttp({ get: jest.fn().mockResolvedValue(makePaymentResponse("Pending")) });
      const svc = new PaymentsService(http, BASE, SIGNER);
      await expect(svc.pollDomestic("pmt-001", { intervalMs: 5, timeoutMs: 30 })).rejects.toThrow(/timed out/);
    });
  });

  describe("international payments", () => {
    it("createInternationalConsent posts to correct path", async () => {
      const http = mockHttp({ post: jest.fn().mockResolvedValue({}) });
      const svc = new PaymentsService(http, BASE, SIGNER);
      await svc.createInternationalConsent({
        Data: {
          Initiation: {
            InstructionIdentification: "i",
            EndToEndIdentification: "e",
            CurrencyOfTransfer: "USD",
            InstructedAmount: { Amount: "100.00", Currency: "USD" },
            CreditorAccount: { SchemeName: "UK.OBIE.IBAN", Identification: "DE89..." },
          },
        },
        Risk: {},
      });
      expect(http.post).toHaveBeenCalledWith(
        `${BASE}/open-banking/v3.1/pisp/international-payment-consents`,
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe("standing orders", () => {
    it("deleteDomesticStandingOrderConsent sends DELETE", async () => {
      const http = mockHttp({ delete: jest.fn().mockResolvedValue(undefined) });
      const svc = new PaymentsService(http, BASE, SIGNER);
      await svc.deleteDomesticStandingOrderConsent("so-001");
      expect(http.delete).toHaveBeenCalledWith(
        `${BASE}/open-banking/v3.1/pisp/domestic-standing-order-consents/so-001`,
      );
    });
  });
});
