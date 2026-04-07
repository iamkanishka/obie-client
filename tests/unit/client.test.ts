/**
 * Integration-style unit tests for the root ObieClient.
 * All outgoing HTTP is mocked via a custom fetch implementation.
 */
import { ObieClient } from "../../src/client";
import { jest, describe, it, expect } from "@jest/globals";

// Mock auth and signing so we don't need real RSA keys
jest.mock("../../src/auth/jwt", () => ({
  buildClientAssertion: jest.fn().mockResolvedValue("mock-jwt"),
}));
jest.mock("../../src/signing/jws", () => ({
  signDetachedJws: jest.fn().mockResolvedValue("header..signature"),
  verifyDetachedJws: jest.fn().mockResolvedValue(true),
}));

const VALID_CONFIG = {
  clientId: "test-client",
  tokenUrl: "https://aspsp.example.com/token",
  privateKeyPem: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----",
  signingKeyId: "kid-1",
  financialId: "0015800001041RHAAY",
};

function makeTokenResponse(token = "access-token"): Response {
  return new Response(JSON.stringify({ access_token: token, expires_in: 3600, token_type: "Bearer" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ObieClient construction", () => {
  it("constructs successfully with minimal valid config", () => {
    const fetchMock = jest.fn();
    expect(() => new ObieClient({ ...VALID_CONFIG, fetch: fetchMock })).not.toThrow();
  });

  it("exposes all service properties", () => {
    const client = new ObieClient({ ...VALID_CONFIG, fetch: jest.fn() });
    expect(client.AISConsent).toBeDefined();
    expect(client.Accounts).toBeDefined();
    expect(client.Payments).toBeDefined();
    expect(client.FilePayments).toBeDefined();
    expect(client.Funds).toBeDefined();
    expect(client.VRP).toBeDefined();
    expect(client.EventNotifications).toBeDefined();
    expect(client.metrics).toBeDefined();
  });

  it("throws OBIEConfigError for missing clientId", () => {
    const { OBIEConfigError } = require("../../src/errors");
    expect(() => new ObieClient({ ...VALID_CONFIG, clientId: "", fetch: jest.fn() })).toThrow(OBIEConfigError);
  });

  it("throws OBIEConfigError for missing tokenUrl", () => {
    const { OBIEConfigError } = require("../../src/errors");
    expect(() => new ObieClient({ ...VALID_CONFIG, tokenUrl: "", fetch: jest.fn() })).toThrow(OBIEConfigError);
  });
});

describe("ObieClient — AIS flow", () => {
  it("creates an account-access-consent and lists accounts", async () => {
    const consentResp = {
      Data: {
        ConsentId: "urn-consent-1",
        Status: "AwaitingAuthorisation",
        Permissions: ["ReadAccountsDetail"],
        CreationDateTime: "2024-01-01T00:00:00Z",
        StatusUpdateDateTime: "2024-01-01T00:00:00Z",
      },
      Risk: {},
      Links: { Self: "https://aspsp.example.com/account-access-consents/urn-consent-1" },
      Meta: { TotalPages: 1 },
    };
    const accountsResp = {
      Data: {
        Account: [
          {
            AccountId: "acc-001",
            Currency: "GBP",
            AccountType: "Personal",
            AccountSubType: "CurrentAccount",
          },
        ],
      },
      Links: { Self: "https://aspsp.example.com/accounts" },
      Meta: { TotalPages: 1 },
    };

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(makeTokenResponse())         // token fetch (cached for all subsequent calls)
      .mockResolvedValueOnce(jsonResponse(consentResp))  // POST consent
      .mockResolvedValueOnce(jsonResponse(accountsResp)); // GET accounts

    const client = new ObieClient({ ...VALID_CONFIG, fetch: fetchMock });

    const consent = await client.AISConsent.create({
      Data: { Permissions: ["ReadAccountsDetail"] },
      Risk: {} as Record<string, never>,
    });
    expect(consent.Data.ConsentId).toBe("urn-consent-1");

    const accounts = await client.Accounts.list();
    expect(accounts.Data.Account).toHaveLength(1);
    expect(accounts.Data.Account[0]?.AccountId).toBe("acc-001");
  });
});

describe("ObieClient — PIS flow", () => {
  it("creates domestic consent and submits payment", async () => {
    const consentResp = {
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
      Links: { Self: "https://aspsp.example.com/domestic-payment-consents/pmt-consent-001" },
      Meta: {},
    };
    const paymentResp = {
      Data: {
        DomesticPaymentId: "pmt-001",
        ConsentId: "pmt-consent-001",
        Status: "AcceptedSettlementCompleted",
        CreationDateTime: "2024-01-01T00:00:00Z",
        StatusUpdateDateTime: "2024-01-01T00:00:01Z",
        Initiation: consentResp.Data.Initiation,
      },
      Links: { Self: "https://aspsp.example.com/domestic-payments/pmt-001" },
      Meta: {},
    };

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(makeTokenResponse())
      .mockResolvedValueOnce(jsonResponse(consentResp))
      .mockResolvedValueOnce(jsonResponse(paymentResp));

    const client = new ObieClient({ ...VALID_CONFIG, fetch: fetchMock });

    const consent = await client.Payments.createDomesticConsent({
      Data: { Initiation: consentResp.Data.Initiation },
      Risk: {},
    });
    expect(consent.Data.ConsentId).toBe("pmt-consent-001");

    const payment = await client.Payments.submitDomestic({
      Data: { ConsentId: "pmt-consent-001", Initiation: consentResp.Data.Initiation },
      Risk: {},
    });
    expect(payment.Data.DomesticPaymentId).toBe("pmt-001");
    expect(payment.Data.Status).toBe("AcceptedSettlementCompleted");
  });
});

describe("ObieClient — metrics", () => {
  it("records requests in the metrics recorder", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(makeTokenResponse())
      .mockResolvedValueOnce(jsonResponse({ Data: { Account: [] }, Links: { Self: "" }, Meta: {} }));

    const client = new ObieClient({ ...VALID_CONFIG, fetch: fetchMock });
    await client.Accounts.list();

    const stats = client.metrics.getStats();
    expect(stats.count).toBeGreaterThanOrEqual(1);
  });
});

describe("ObieClient — invalidateToken", () => {
  it("invalidateToken does not throw", () => {
    const client = new ObieClient({ ...VALID_CONFIG, fetch: jest.fn() });
    expect(() => client.invalidateToken()).not.toThrow();
  });
});
