/**
 * All OBIE v3.1.3 enumeration values as TypeScript const enums and string unions.
 * Ref: https://openbankinguk.github.io/read-write-api-site2/standards/v3.1.3/references/namespaced-enumerations/
 */

// ── AIS Permissions ──────────────────────────────────────────────────────────

export const Permission = {
  ReadAccountsBasic: "ReadAccountsBasic",
  ReadAccountsDetail: "ReadAccountsDetail",
  ReadBalances: "ReadBalances",
  ReadBeneficiariesBasic: "ReadBeneficiariesBasic",
  ReadBeneficiariesDetail: "ReadBeneficiariesDetail",
  ReadDirectDebits: "ReadDirectDebits",
  ReadOffers: "ReadOffers",
  ReadPAN: "ReadPAN",
  ReadParty: "ReadParty",
  ReadPartyPSU: "ReadPartyPSU",
  ReadProducts: "ReadProducts",
  ReadScheduledPaymentsBasic: "ReadScheduledPaymentsBasic",
  ReadScheduledPaymentsDetail: "ReadScheduledPaymentsDetail",
  ReadStandingOrdersBasic: "ReadStandingOrdersBasic",
  ReadStandingOrdersDetail: "ReadStandingOrdersDetail",
  ReadStatementsBasic: "ReadStatementsBasic",
  ReadStatementsDetail: "ReadStatementsDetail",
  ReadTransactionsBasic: "ReadTransactionsBasic",
  ReadTransactionsCredits: "ReadTransactionsCredits",
  ReadTransactionsDebits: "ReadTransactionsDebits",
  ReadTransactionsDetail: "ReadTransactionsDetail",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

/** Returns all 21 permission codes. */
export function allPermissions(): Permission[] {
  return Object.values(Permission);
}

/** Returns the 15 detail-level permissions recommended for most TPPs. */
export function detailPermissions(): Permission[] {
  return [
    Permission.ReadAccountsDetail,
    Permission.ReadBalances,
    Permission.ReadBeneficiariesDetail,
    Permission.ReadDirectDebits,
    Permission.ReadOffers,
    Permission.ReadPAN,
    Permission.ReadParty,
    Permission.ReadPartyPSU,
    Permission.ReadProducts,
    Permission.ReadScheduledPaymentsDetail,
    Permission.ReadStandingOrdersDetail,
    Permission.ReadStatementsDetail,
    Permission.ReadTransactionsCredits,
    Permission.ReadTransactionsDebits,
    Permission.ReadTransactionsDetail,
  ];
}

// ── Payment Status ────────────────────────────────────────────────────────────

export const PaymentStatus = {
  AcceptedCreditSettlementCompleted: "AcceptedCreditSettlementCompleted",
  AcceptedSettlementCompleted: "AcceptedSettlementCompleted",
  AcceptedSettlementInProcess: "AcceptedSettlementInProcess",
  AcceptedWithoutPosting: "AcceptedWithoutPosting",
  Pending: "Pending",
  InitiationCompleted: "InitiationCompleted",
  InitiationPending: "InitiationPending",
  InitiationFailed: "InitiationFailed",
  Rejected: "Rejected",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const TERMINAL_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.AcceptedCreditSettlementCompleted,
  PaymentStatus.AcceptedSettlementCompleted,
  PaymentStatus.Rejected,
  PaymentStatus.InitiationCompleted,
  PaymentStatus.InitiationFailed,
]);

export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return TERMINAL_PAYMENT_STATUSES.has(status);
}

// ── Consent Status ────────────────────────────────────────────────────────────

export const ConsentStatus = {
  Authorised: "Authorised",
  AwaitingAuthorisation: "AwaitingAuthorisation",
  Consumed: "Consumed",
  Rejected: "Rejected",
  Revoked: "Revoked",
} as const;

export type ConsentStatus = (typeof ConsentStatus)[keyof typeof ConsentStatus];

// ── Scheme Names ──────────────────────────────────────────────────────────────

export const SchemeName = {
  SortCodeAccountNumber: "UK.OBIE.SortCodeAccountNumber",
  IBAN: "UK.OBIE.IBAN",
  BBAN: "UK.OBIE.BBAN",
  PAN: "UK.OBIE.PAN",
  GetBranchCode: "UK.OBIE.GetBranchCode",
  SWIFT: "UK.OBIE.SWIFT",
  BICFI: "UK.OBIE.BICFI",
} as const;

export type SchemeName = (typeof SchemeName)[keyof typeof SchemeName];

// ── Account Types ─────────────────────────────────────────────────────────────

export const AccountType = {
  Business: "Business",
  Personal: "Personal",
} as const;

export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const AccountSubType = {
  ChargeCard: "ChargeCard",
  CreditCard: "CreditCard",
  CurrentAccount: "CurrentAccount",
  EMoney: "EMoney",
  Loan: "Loan",
  Mortgage: "Mortgage",
  PrePaymentCard: "PrePaymentCard",
  Savings: "Savings",
} as const;

export type AccountSubType = (typeof AccountSubType)[keyof typeof AccountSubType];

// ── Balance Types ─────────────────────────────────────────────────────────────

export const BalanceType = {
  ClosingAvailable: "ClosingAvailable",
  ClosingBooked: "ClosingBooked",
  ClosingCleared: "ClosingCleared",
  Expected: "Expected",
  ForwardAvailable: "ForwardAvailable",
  Information: "Information",
  InterimAvailable: "InterimAvailable",
  InterimBooked: "InterimBooked",
  InterimCleared: "InterimCleared",
  OpeningAvailable: "OpeningAvailable",
  OpeningBooked: "OpeningBooked",
  OpeningCleared: "OpeningCleared",
  PreviouslyClosedBooked: "PreviouslyClosedBooked",
} as const;

export type BalanceType = (typeof BalanceType)[keyof typeof BalanceType];

// ── Charge Bearer ─────────────────────────────────────────────────────────────

export const ChargeBearer = {
  BorneByCreditor: "BorneByCreditor",
  BorneByDebtor: "BorneByDebtor",
  FollowingServiceLevel: "FollowingServiceLevel",
  Shared: "Shared",
  SLEV: "SLEV",
} as const;

export type ChargeBearer = (typeof ChargeBearer)[keyof typeof ChargeBearer];

// ── Instruction Priority ──────────────────────────────────────────────────────

export const InstructionPriority = {
  Normal: "Normal",
  Urgent: "Urgent",
} as const;

export type InstructionPriority = (typeof InstructionPriority)[keyof typeof InstructionPriority];

// ── Exchange Rate Type ────────────────────────────────────────────────────────

export const ExchangeRateType = {
  Agreed: "Agreed",
  Actual: "Actual",
  Indicative: "Indicative",
} as const;

export type ExchangeRateType = (typeof ExchangeRateType)[keyof typeof ExchangeRateType];

// ── Payment Context ───────────────────────────────────────────────────────────

export const PaymentContext = {
  BillPayment: "BillPayment",
  EcommerceGoods: "EcommerceGoods",
  EcommerceServices: "EcommerceServices",
  Other: "Other",
  PartyToParty: "PartyToParty",
} as const;

export type PaymentContext = (typeof PaymentContext)[keyof typeof PaymentContext];

// ── Standing Order Frequency ──────────────────────────────────────────────────

export const Frequency = {
  EveryDay: "EvryDay",
  EveryWorkingDay: "EvryWorkgDay",
  IntervalDay: "IntrvlDay",
  IntervalWeekDay: "IntrvlWkDay",
  WeekInMonthDay: "WkInMnthDay",
  IntervalMonthDay: "IntrvlMnthDay",
  QuarterDay: "QtrDay",
} as const;

export type Frequency = (typeof Frequency)[keyof typeof Frequency];

// ── File Types ────────────────────────────────────────────────────────────────

export const FileType = {
  PaymentInitiation21: "UK.OBIE.PaymentInitiation.2.1",
  PaymentInitiation31: "UK.OBIE.PaymentInitiation.3.1",
  Pain00100108: "UK.OBIE.pain.001.001.08",
} as const;

export type FileType = (typeof FileType)[keyof typeof FileType];

// ── VRP Types ─────────────────────────────────────────────────────────────────

export const VRPType = {
  Sweeping: "UK.OBIE.VRPType.Sweeping",
  Other: "UK.OBIE.VRPType.Other",
} as const;

export type VRPType = (typeof VRPType)[keyof typeof VRPType];

// ── OBIE Error Codes ──────────────────────────────────────────────────────────

export const OBIEErrorCode = {
  FieldExpected: "UK.OBIE.Field.Expected",
  FieldInvalid: "UK.OBIE.Field.Invalid",
  FieldInvalidDate: "UK.OBIE.Field.InvalidDate",
  FieldMissing: "UK.OBIE.Field.Missing",
  FieldUnexpected: "UK.OBIE.Field.Unexpected",
  HeaderInvalid: "UK.OBIE.Header.Invalid",
  HeaderMissing: "UK.OBIE.Header.Missing",
  ResourceConsentMismatch: "UK.OBIE.Resource.ConsentMismatch",
  ResourceInvalidConsentStatus: "UK.OBIE.Resource.InvalidConsentStatus",
  ResourceNotFound: "UK.OBIE.Resource.NotFound",
  SignatureInvalid: "UK.OBIE.Signature.Invalid",
  SignatureMissing: "UK.OBIE.Signature.Missing",
  NotAuthorised: "UK.OBIE.NotAuthorised",
  UnexpectedError: "UK.OBIE.Unexpected.Error",
} as const;

export type OBIEErrorCode = (typeof OBIEErrorCode)[keyof typeof OBIEErrorCode];

// ── Credit/Debit Indicator ────────────────────────────────────────────────────

export const CreditDebitIndicator = {
  Credit: "Credit",
  Debit: "Debit",
} as const;

export type CreditDebitIndicator =
  (typeof CreditDebitIndicator)[keyof typeof CreditDebitIndicator];

// ── Event Notification Types ──────────────────────────────────────────────────

export const EventNotificationType = {
  ResourceUpdate: "urn:uk:org:openbanking:events:resource-update",
  ConsentAuthorizationRevoked:
    "urn:uk:org:openbanking:events:consent-authorization-revoked",
  AccountAccessConsentLinkedAccountUpdate:
    "urn:uk:org:openbanking:events:account-access-consent-linked-account-update",
} as const;

export type EventNotificationType =
  (typeof EventNotificationType)[keyof typeof EventNotificationType];
