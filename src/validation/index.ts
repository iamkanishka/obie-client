import { OBIEValidationError } from "../errors";
import type { OBActiveOrHistoricCurrencyAndAmount, OBCashAccount3 } from "../types/index";

interface FieldError {
  field: string;
  message: string;
}

/** Client-side validator that catches malformed requests before sending. */
export class Validator {
  private readonly errors: FieldError[] = [];

  private add(field: string, message: string): this {
    this.errors.push({ field, message });
    return this;
  }

  /** Validates an amount object. */
  public validateAmount(amount: OBActiveOrHistoricCurrencyAndAmount | undefined, field: string): this {
    if (!amount) return this.add(field, "is required");
    if (!/^\d{1,13}(\.\d{1,5})?$/.test(amount.Amount)) {
      this.add(`${field}.Amount`, "must match pattern ^\\d{1,13}(\\.\\d{1,5})?$");
    }
    if (!/^[A-Z]{3}$/.test(amount.Currency)) {
      this.add(`${field}.Currency`, "must be a 3-letter ISO 4217 code");
    }
    return this;
  }

  /** Validates a cash account block. */
  public validateAccount(account: OBCashAccount3 | undefined, field: string): this {
    if (!account) return this.add(field, "is required");
    if (!account.SchemeName) this.add(`${field}.SchemeName`, "is required");
    if (!account.Identification) {
      this.add(`${field}.Identification`, "is required");
    } else if (
      account.SchemeName === "UK.OBIE.SortCodeAccountNumber" &&
      !/^\d{14}$/.test(account.Identification.replace(/[-\s]/g, ""))
    ) {
      this.add(`${field}.Identification`, "SortCodeAccountNumber must be 14 digits (6-digit sort code + 8-digit account number)");
    }
    return this;
  }

  /** Validates AIS permission codes. */
  public validatePermissions(permissions: string[] | undefined, field = "Data.Permissions"): this {
    if (!permissions || permissions.length === 0) {
      return this.add(field, "must contain at least one permission");
    }
    return this;
  }

  /** Validates a required non-empty string. */
  public required(value: string | undefined, field: string): this {
    if (!value || value.trim() === "") this.add(field, "is required");
    return this;
  }

  /** Validates a string does not exceed max length. */
  public maxLength(value: string | undefined, max: number, field: string): this {
    if (value && value.length > max) {
      this.add(field, `must not exceed ${max} characters (got ${value.length})`);
    }
    return this;
  }

  /** Throws OBIEValidationError if any errors were recorded, otherwise returns the value. */
  public build<T>(value: T): T {
    if (this.errors.length > 0) throw new OBIEValidationError(this.errors);
    return value;
  }

  /** Returns recorded errors without throwing. */
  public getErrors(): FieldError[] {
    return [...this.errors];
  }
}

/** Convenience: validate a domestic payment initiation. */
export function validateDomesticInitiation(init: {
  InstructionIdentification: string;
  EndToEndIdentification: string;
  InstructedAmount: OBActiveOrHistoricCurrencyAndAmount;
  CreditorAccount: OBCashAccount3;
}): void {
  new Validator()
    .required(init.InstructionIdentification, "InstructionIdentification")
    .maxLength(init.InstructionIdentification, 35, "InstructionIdentification")
    .required(init.EndToEndIdentification, "EndToEndIdentification")
    .maxLength(init.EndToEndIdentification, 35, "EndToEndIdentification")
    .validateAmount(init.InstructedAmount, "InstructedAmount")
    .validateAccount(init.CreditorAccount, "CreditorAccount")
    .build(init);
}
