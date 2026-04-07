import { Validator, validateDomesticInitiation } from "../../src/validation";
import { OBIEValidationError } from "../../src/errors";
import { jest, describe, it, expect } from "@jest/globals";

describe("Validator", () => {
  describe("validateAmount", () => {
    it("accepts valid GBP amount", () => {
      const v = new Validator();
      v.validateAmount({ Amount: "10.50", Currency: "GBP" }, "InstructedAmount");
      expect(v.getErrors()).toHaveLength(0);
    });

    it("accepts whole number amount", () => {
      const v = new Validator();
      v.validateAmount({ Amount: "100", Currency: "GBP" }, "f");
      expect(v.getErrors()).toHaveLength(0);
    });

    it("accepts maximum 5 decimal places", () => {
      const v = new Validator();
      v.validateAmount({ Amount: "10.12345", Currency: "GBP" }, "f");
      expect(v.getErrors()).toHaveLength(0);
    });

    it("rejects 6+ decimal places", () => {
      const v = new Validator();
      v.validateAmount({ Amount: "10.123456", Currency: "GBP" }, "f");
      expect(v.getErrors().some((e) => e.field.includes("Amount"))).toBe(true);
    });

    it("rejects non-numeric amount", () => {
      const v = new Validator();
      v.validateAmount({ Amount: "ten", Currency: "GBP" }, "f");
      expect(v.getErrors().length).toBeGreaterThan(0);
    });

    it("rejects lowercase currency", () => {
      const v = new Validator();
      v.validateAmount({ Amount: "10.00", Currency: "gbp" }, "f");
      expect(v.getErrors().some((e) => e.field.includes("Currency"))).toBe(true);
    });

    it("rejects 4-letter currency code", () => {
      const v = new Validator();
      v.validateAmount({ Amount: "10.00", Currency: "GBPS" }, "f");
      expect(v.getErrors().length).toBeGreaterThan(0);
    });

    it("adds error when amount is undefined", () => {
      const v = new Validator();
      v.validateAmount(undefined, "f");
      expect(v.getErrors()).toHaveLength(1);
    });
  });

  describe("validateAccount", () => {
    it("accepts valid sort code account number (14 digits)", () => {
      const v = new Validator();
      v.validateAccount(
        { SchemeName: "UK.OBIE.SortCodeAccountNumber", Identification: "20000319825731" },
        "CreditorAccount",
      );
      expect(v.getErrors()).toHaveLength(0);
    });

    it("accepts sort code with dashes stripped", () => {
      const v = new Validator();
      v.validateAccount(
        { SchemeName: "UK.OBIE.SortCodeAccountNumber", Identification: "200003-19825731" },
        "CreditorAccount",
      );
      expect(v.getErrors()).toHaveLength(0);
    });

    it("rejects sort code shorter than 14 digits", () => {
      const v = new Validator();
      v.validateAccount(
        { SchemeName: "UK.OBIE.SortCodeAccountNumber", Identification: "12345678" },
        "CreditorAccount",
      );
      expect(v.getErrors().length).toBeGreaterThan(0);
    });

    it("adds error when account is undefined", () => {
      const v = new Validator();
      v.validateAccount(undefined, "CreditorAccount");
      expect(v.getErrors()).toHaveLength(1);
    });

    it("adds error when SchemeName is missing", () => {
      const v = new Validator();
      v.validateAccount({ SchemeName: "", Identification: "12345678" }, "acc");
      expect(v.getErrors().some((e) => e.field.includes("SchemeName"))).toBe(true);
    });
  });

  describe("required", () => {
    it("passes for non-empty string", () => {
      const v = new Validator();
      v.required("hello", "field");
      expect(v.getErrors()).toHaveLength(0);
    });

    it("adds error for empty string", () => {
      const v = new Validator();
      v.required("", "field");
      expect(v.getErrors()).toHaveLength(1);
    });

    it("adds error for whitespace-only string", () => {
      const v = new Validator();
      v.required("   ", "field");
      expect(v.getErrors()).toHaveLength(1);
    });

    it("adds error for undefined", () => {
      const v = new Validator();
      v.required(undefined, "field");
      expect(v.getErrors()).toHaveLength(1);
    });
  });

  describe("maxLength", () => {
    it("passes for string within limit", () => {
      const v = new Validator();
      v.maxLength("abc", 35, "field");
      expect(v.getErrors()).toHaveLength(0);
    });

    it("adds error for string over limit", () => {
      const v = new Validator();
      v.maxLength("a".repeat(36), 35, "field");
      expect(v.getErrors()).toHaveLength(1);
      expect(v.getErrors()[0]!.message).toContain("35");
    });

    it("skips undefined value", () => {
      const v = new Validator();
      v.maxLength(undefined, 35, "field");
      expect(v.getErrors()).toHaveLength(0);
    });
  });

  describe("build", () => {
    it("returns value when no errors", () => {
      const v = new Validator();
      const obj = { foo: "bar" };
      expect(v.build(obj)).toBe(obj);
    });

    it("throws OBIEValidationError when errors exist", () => {
      const v = new Validator();
      v.required("", "field");
      expect(() => v.build({})).toThrow(OBIEValidationError);
    });
  });

  describe("method chaining", () => {
    it("supports chaining multiple validations", () => {
      const errors = new Validator()
        .required("", "a")
        .required("ok", "b")
        .required("", "c")
        .getErrors();
      expect(errors).toHaveLength(2);
      expect(errors.map((e) => e.field)).toContain("a");
      expect(errors.map((e) => e.field)).toContain("c");
    });
  });
});

describe("validateDomesticInitiation", () => {
  const validInit = {
    InstructionIdentification: "INSTR-001",
    EndToEndIdentification: "E2E-001",
    InstructedAmount: { Amount: "10.50", Currency: "GBP" },
    CreditorAccount: {
      SchemeName: "UK.OBIE.SortCodeAccountNumber",
      Identification: "20000319825731",
    },
  };

  it("does not throw for valid initiation", () => {
    expect(() => validateDomesticInitiation(validInit)).not.toThrow();
  });

  it("throws for missing InstructionIdentification", () => {
    expect(() =>
      validateDomesticInitiation({ ...validInit, InstructionIdentification: "" }),
    ).toThrow(OBIEValidationError);
  });

  it("throws for InstructionIdentification exceeding 35 chars", () => {
    expect(() =>
      validateDomesticInitiation({ ...validInit, InstructionIdentification: "x".repeat(36) }),
    ).toThrow(OBIEValidationError);
  });

  it("throws for invalid amount", () => {
    expect(() =>
      validateDomesticInitiation({
        ...validInit,
        InstructedAmount: { Amount: "not-a-number", Currency: "GBP" },
      }),
    ).toThrow(OBIEValidationError);
  });

  it("throws for invalid creditor account", () => {
    expect(() =>
      validateDomesticInitiation({
        ...validInit,
        CreditorAccount: { SchemeName: "UK.OBIE.SortCodeAccountNumber", Identification: "123" },
      }),
    ).toThrow(OBIEValidationError);
  });
});
