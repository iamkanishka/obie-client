import {
  Permission,
  allPermissions,
  detailPermissions,
  PaymentStatus,
  isTerminalPaymentStatus,
  TERMINAL_PAYMENT_STATUSES,
  ConsentStatus,
  SchemeName,
  AccountType,
  BalanceType,
} from "../../src/types/enums";

import { describe, it, expect } from "@jest/globals";

describe("Permission enum", () => {
  it("allPermissions returns 21 codes", () => {
    const perms = allPermissions();
    expect(perms).toHaveLength(21);
    expect(perms).toContain(Permission.ReadAccountsDetail);
    expect(perms).toContain(Permission.ReadBalances);
  });

  it("detailPermissions returns 15 codes", () => {
    const perms = detailPermissions();
    expect(perms).toHaveLength(15);
    expect(perms).toContain(Permission.ReadAccountsDetail);
    expect(perms).not.toContain(Permission.ReadAccountsBasic);
  });

  it("each permission value is a non-empty string", () => {
    for (const val of Object.values(Permission)) {
      expect(typeof val).toBe("string");
      expect(val.length).toBeGreaterThan(0);
    }
  });
});

describe("PaymentStatus enum", () => {
  it("TERMINAL_PAYMENT_STATUSES contains the correct statuses", () => {
    expect(TERMINAL_PAYMENT_STATUSES.has(PaymentStatus.AcceptedCreditSettlementCompleted)).toBe(true);
    expect(TERMINAL_PAYMENT_STATUSES.has(PaymentStatus.AcceptedSettlementCompleted)).toBe(true);
    expect(TERMINAL_PAYMENT_STATUSES.has(PaymentStatus.Rejected)).toBe(true);
    expect(TERMINAL_PAYMENT_STATUSES.has(PaymentStatus.InitiationCompleted)).toBe(true);
    expect(TERMINAL_PAYMENT_STATUSES.has(PaymentStatus.InitiationFailed)).toBe(true);
  });

  it("non-terminal statuses are NOT in TERMINAL set", () => {
    expect(TERMINAL_PAYMENT_STATUSES.has(PaymentStatus.Pending)).toBe(false);
    expect(TERMINAL_PAYMENT_STATUSES.has(PaymentStatus.AcceptedSettlementInProcess)).toBe(false);
  });

  it("isTerminalPaymentStatus returns true for terminal statuses", () => {
    expect(isTerminalPaymentStatus(PaymentStatus.AcceptedSettlementCompleted)).toBe(true);
    expect(isTerminalPaymentStatus(PaymentStatus.Rejected)).toBe(true);
    expect(isTerminalPaymentStatus(PaymentStatus.InitiationFailed)).toBe(true);
  });

  it("isTerminalPaymentStatus returns false for non-terminal statuses", () => {
    expect(isTerminalPaymentStatus(PaymentStatus.Pending)).toBe(false);
    expect(isTerminalPaymentStatus(PaymentStatus.AcceptedSettlementInProcess)).toBe(false);
    expect(isTerminalPaymentStatus(PaymentStatus.InitiationPending)).toBe(false);
  });
});

describe("ConsentStatus enum", () => {
  it("has all expected consent statuses", () => {
    expect(ConsentStatus.Authorised).toBe("Authorised");
    expect(ConsentStatus.AwaitingAuthorisation).toBe("AwaitingAuthorisation");
    expect(ConsentStatus.Consumed).toBe("Consumed");
    expect(ConsentStatus.Rejected).toBe("Rejected");
    expect(ConsentStatus.Revoked).toBe("Revoked");
  });
});

describe("SchemeName enum", () => {
  it("has UK OBIE scheme names", () => {
    expect(SchemeName.SortCodeAccountNumber).toBe("UK.OBIE.SortCodeAccountNumber");
    expect(SchemeName.IBAN).toBe("UK.OBIE.IBAN");
    expect(SchemeName.BICFI).toBe("UK.OBIE.BICFI");
  });
});

describe("AccountType enum", () => {
  it("has Business and Personal", () => {
    expect(AccountType.Business).toBe("Business");
    expect(AccountType.Personal).toBe("Personal");
  });
});

describe("BalanceType enum", () => {
  it("has all standard balance types", () => {
    expect(BalanceType.InterimAvailable).toBe("InterimAvailable");
    expect(BalanceType.ClosingBooked).toBe("ClosingBooked");
    expect(BalanceType.OpeningBooked).toBe("OpeningBooked");
  });
});
