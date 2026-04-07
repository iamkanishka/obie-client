import {
  OBIEApiError,
  OBIEConfigError,
  OBIESigningError,
  OBIETokenError,
  OBIECircuitOpenError,
  OBIERetryExhaustedError,
  OBIEValidationError,
  parseApiError,
} from "../../src/errors";

import { describe, it, expect } from "@jest/globals";

describe("OBIEApiError", () => {
  it("formats message with status and OB error code", () => {
    const err = new OBIEApiError({
      statusCode: 400,
      obError: {
        Code: "UK.OBIE.Field.Missing",
        Message: "ConsentId required",
        Errors: [{ ErrorCode: "UK.OBIE.Field.Missing", Message: "ConsentId required" }],
      },
      body: "",
      interactionId: "abc-123",
    });
    expect(err.message).toContain("400");
    expect(err.message).toContain("UK.OBIE.Field.Missing");
    expect(err.name).toBe("OBIEApiError");
    expect(err.statusCode).toBe(400);
    expect(err.interactionId).toBe("abc-123");
  });

  it("formats message with raw body when no OBError", () => {
    const err = new OBIEApiError({
      statusCode: 503,
      obError: null,
      body: "Service Unavailable",
      interactionId: null,
    });
    expect(err.message).toContain("503");
    expect(err.message).toContain("Service Unavailable");
  });

  it("hasErrorCode returns true for matching error code", () => {
    const err = new OBIEApiError({
      statusCode: 400,
      obError: {
        Code: "UK.OBIE.Field.Invalid",
        Message: "Field invalid",
        Errors: [{ ErrorCode: "UK.OBIE.Resource.NotFound", Message: "Resource not found" }],
      },
      body: "",
      interactionId: null,
    });
    expect(err.hasErrorCode("UK.OBIE.Resource.NotFound")).toBe(true);
    expect(err.hasErrorCode("UK.OBIE.Field.Missing")).toBe(false);
  });

  it("hasErrorCode returns false when no obError", () => {
    const err = new OBIEApiError({ statusCode: 500, obError: null, body: "", interactionId: null });
    expect(err.hasErrorCode("anything")).toBe(false);
  });

  it("isRetryable returns true for 5xx", () => {
    expect(new OBIEApiError({ statusCode: 500, obError: null, body: "", interactionId: null }).isRetryable()).toBe(true);
    expect(new OBIEApiError({ statusCode: 503, obError: null, body: "", interactionId: null }).isRetryable()).toBe(true);
  });

  it("isRetryable returns false for 4xx", () => {
    expect(new OBIEApiError({ statusCode: 400, obError: null, body: "", interactionId: null }).isRetryable()).toBe(false);
    expect(new OBIEApiError({ statusCode: 401, obError: null, body: "", interactionId: null }).isRetryable()).toBe(false);
  });

  it("instanceof check works after setPrototypeOf", () => {
    const err = new OBIEApiError({ statusCode: 400, obError: null, body: "", interactionId: null });
    expect(err instanceof OBIEApiError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });
});

describe("OBIEConfigError", () => {
  it("includes field name in message", () => {
    const err = new OBIEConfigError("clientId", "must not be empty");
    expect(err.message).toContain("clientId");
    expect(err.message).toContain("must not be empty");
    expect(err.field).toBe("clientId");
    expect(err.name).toBe("OBIEConfigError");
  });
});

describe("OBIESigningError", () => {
  it("wraps a cause error", () => {
    const cause = new Error("RSA key invalid");
    const err = new OBIESigningError(cause);
    expect(err.message).toContain("RSA key invalid");
    expect(err.cause).toBe(cause);
    expect(err.name).toBe("OBIESigningError");
  });

  it("handles non-Error cause", () => {
    const err = new OBIESigningError("string error");
    expect(err.message).toContain("string error");
  });
});

describe("OBIETokenError", () => {
  it("creates with message and optional cause", () => {
    const cause = new Error("network failed");
    const err = new OBIETokenError("fetch failed", cause);
    expect(err.message).toContain("fetch failed");
    expect(err.cause).toBe(cause);
    expect(err.name).toBe("OBIETokenError");
  });
});

describe("OBIECircuitOpenError", () => {
  it("has correct name and message", () => {
    const err = new OBIECircuitOpenError();
    expect(err.name).toBe("OBIECircuitOpenError");
    expect(err.message).toContain("circuit breaker");
  });
});

describe("OBIERetryExhaustedError", () => {
  it("includes attempt count and last error", () => {
    const last = new Error("timeout");
    const err = new OBIERetryExhaustedError(3, last);
    expect(err.message).toContain("3");
    expect(err.lastError).toBe(last);
    expect(err.name).toBe("OBIERetryExhaustedError");
  });
});

describe("OBIEValidationError", () => {
  it("lists all field errors in message", () => {
    const err = new OBIEValidationError([
      { field: "Amount", message: "invalid format" },
      { field: "CreditorAccount", message: "is required" },
    ]);
    expect(err.message).toContain("Amount");
    expect(err.message).toContain("CreditorAccount");
    expect(err.fields).toHaveLength(2);
    expect(err.name).toBe("OBIEValidationError");
  });
});

describe("parseApiError", () => {
  it("parses OBIE JSON error body", () => {
    const body = JSON.stringify({
      Code: "UK.OBIE.Field.Missing",
      Message: "Missing field",
      Errors: [{ ErrorCode: "UK.OBIE.Field.Missing", Message: "Missing" }],
    });
    const err = parseApiError(400, body, "iid-1");
    expect(err.statusCode).toBe(400);
    expect(err.obError?.Code).toBe("UK.OBIE.Field.Missing");
    expect(err.interactionId).toBe("iid-1");
  });

  it("handles non-JSON body gracefully", () => {
    const err = parseApiError(500, "Internal Server Error", null);
    expect(err.statusCode).toBe(500);
    expect(err.obError).toBeNull();
    expect(err.body).toBe("Internal Server Error");
    expect(err.interactionId).toBeNull();
  });

  it("handles JSON that is not an OBError", () => {
    const err = parseApiError(400, '{"message":"bad request"}', null);
    expect(err.obError).toBeNull();
  });
});
