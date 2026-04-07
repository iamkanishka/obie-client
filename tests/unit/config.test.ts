import { resolveConfig } from "../../src/config";
import { OBIEConfigError } from "../../src/errors";
import { jest, describe, it, expect } from "@jest/globals";

const VALID_CONFIG = {
  clientId: "test-client",
  tokenUrl: "https://aspsp.example.com/token",
  privateKeyPem: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----",
};

describe("resolveConfig", () => {
  it("applies defaults when only required fields given", () => {
    const cfg = resolveConfig(VALID_CONFIG);
    expect(cfg.environment).toBe("sandbox");
    expect(cfg.timeoutMs).toBe(30_000);
    expect(cfg.maxRetries).toBe(3);
    expect(cfg.scopes).toEqual(["accounts", "payments", "fundsconfirmations"]);
    expect(cfg.signingKeyId).toBe("");
    expect(cfg.financialId).toBe("");
    expect(cfg.customerIpAddress).toBe("");
    expect(cfg.certificatePem).toBe("");
    expect(typeof cfg.logger.debug).toBe("function");
    expect(typeof cfg.fetch).toBe("function");
  });

  it("uses sandbox URL for sandbox environment", () => {
    const cfg = resolveConfig({ ...VALID_CONFIG, environment: "sandbox" });
    expect(cfg.baseUrl).toContain("sandbox");
  });

  it("uses production URL for production environment", () => {
    const cfg = resolveConfig({ ...VALID_CONFIG, environment: "production" });
    expect(cfg.baseUrl).not.toContain("sandbox");
  });

  it("respects explicit baseUrl over environment", () => {
    const cfg = resolveConfig({ ...VALID_CONFIG, baseUrl: "https://custom.bank.com" });
    expect(cfg.baseUrl).toBe("https://custom.bank.com");
  });

  it("passes through optional fields", () => {
    const cfg = resolveConfig({
      ...VALID_CONFIG,
      signingKeyId: "kid-2025",
      financialId: "0015800001041RHAAY",
      customerIpAddress: "1.2.3.4",
      scopes: ["accounts"],
      timeoutMs: 15_000,
      maxRetries: 1,
    });
    expect(cfg.signingKeyId).toBe("kid-2025");
    expect(cfg.financialId).toBe("0015800001041RHAAY");
    expect(cfg.customerIpAddress).toBe("1.2.3.4");
    expect(cfg.scopes).toEqual(["accounts"]);
    expect(cfg.timeoutMs).toBe(15_000);
    expect(cfg.maxRetries).toBe(1);
  });

  it("throws OBIEConfigError for missing clientId", () => {
    expect(() =>
      resolveConfig({ ...VALID_CONFIG, clientId: "" }),
    ).toThrow(OBIEConfigError);
  });

  it("throws OBIEConfigError for missing tokenUrl", () => {
    expect(() =>
      resolveConfig({ ...VALID_CONFIG, tokenUrl: "" }),
    ).toThrow(OBIEConfigError);
  });

  it("throws OBIEConfigError for missing privateKeyPem", () => {
    expect(() =>
      resolveConfig({ ...VALID_CONFIG, privateKeyPem: "" }),
    ).toThrow(OBIEConfigError);
  });

  it("throws OBIEConfigError for whitespace-only clientId", () => {
    expect(() =>
      resolveConfig({ ...VALID_CONFIG, clientId: "   " }),
    ).toThrow(OBIEConfigError);
  });

  it("uses custom fetch if provided", () => {
    const myFetch = jest.fn() as unknown as typeof fetch;
    const cfg = resolveConfig({ ...VALID_CONFIG, fetch: myFetch });
    expect(cfg.fetch).toBe(myFetch);
  });

  it("no-op logger does not throw", () => {
    const cfg = resolveConfig(VALID_CONFIG);
    expect(() => cfg.logger.debug("test")).not.toThrow();
    expect(() => cfg.logger.info("test")).not.toThrow();
    expect(() => cfg.logger.warn("test")).not.toThrow();
    expect(() => cfg.logger.error("test")).not.toThrow();
  });

  it("uses provided logger", () => {
    const mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const cfg = resolveConfig({ ...VALID_CONFIG, logger: mockLogger });
    cfg.logger.info("hello");
    expect(mockLogger.info).toHaveBeenCalledWith("hello");
  });
});
