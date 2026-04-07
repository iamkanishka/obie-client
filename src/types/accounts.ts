import type {
  OBActiveOrHistoricCurrencyAndAmount,
  OBCashAccount3,
  OBPostalAddress6,
  Links,
  Meta,
} from "./common";

// ── Account ───────────────────────────────────────────────────────────────────

export interface OBAccount6 {
  AccountId: string;
  Status?: string;
  StatusUpdateDateTime?: string;
  Currency: string;
  AccountType: string;
  AccountSubType: string;
  Description?: string;
  Nickname?: string;
  OpeningDate?: string;
  MaturityDate?: string;
  Account?: OBCashAccount3[];
  Servicer?: { SchemeName: string; Identification: string };
}

export interface OBReadAccount6 {
  Data: { Account: OBAccount6[] };
  Links: Links;
  Meta: Meta;
}

// ── Balance ───────────────────────────────────────────────────────────────────

export interface OBReadBalance1 {
  Data: { Balance: OBBalance1[] };
  Links: Links;
  Meta: Meta;
}

export interface OBBalance1 {
  AccountId: string;
  CreditDebitIndicator: string;
  Type: string;
  DateTime: string;
  Amount: OBActiveOrHistoricCurrencyAndAmount;
  CreditLine?: OBCreditLine1[];
}

export interface OBCreditLine1 {
  Included: boolean;
  Type?: string;
  Amount?: OBActiveOrHistoricCurrencyAndAmount;
}

// ── Transaction ───────────────────────────────────────────────────────────────

export interface OBReadTransaction6 {
  Data: { Transaction: OBTransaction6[] };
  Links: Links;
  Meta: Meta;
}

export interface OBTransaction6 {
  AccountId: string;
  TransactionId?: string;
  TransactionReference?: string;
  Status: string;
  CreditDebitIndicator: string;
  BookingDateTime: string;
  ValueDateTime?: string;
  Amount: OBActiveOrHistoricCurrencyAndAmount;
  ChargeAmount?: OBActiveOrHistoricCurrencyAndAmount;
  CurrencyExchange?: {
    SourceCurrency: string;
    TargetCurrency?: string;
    UnitCurrency?: string;
    ExchangeRate: number;
    ContractIdentification?: string;
    QuotationDate?: string;
    InstructedAmount?: OBActiveOrHistoricCurrencyAndAmount;
  };
  BankTransactionCode?: { Code: string; SubCode: string };
  ProprietaryBankTransactionCode?: { Code: string; Issuer?: string };
  Balance?: { CreditDebitIndicator: string; Type: string; Amount: OBActiveOrHistoricCurrencyAndAmount };
  MerchantDetails?: { MerchantName?: string; MerchantCategoryCode?: string };
  CreditorAgent?: { SchemeName?: string; Identification?: string };
  CreditorAccount?: OBCashAccount3;
  DebtorAgent?: { SchemeName?: string; Identification?: string };
  DebtorAccount?: OBCashAccount3;
  CardInstrument?: {
    CardSchemeName: string;
    AuthorisationType?: string;
    Name?: string;
    Identification?: string;
  };
  TransactionInformation?: string;
  AddressLine?: string;
  SupplementaryData?: Record<string, unknown>;
}

// ── Beneficiary ───────────────────────────────────────────────────────────────

export interface OBReadBeneficiary5 {
  Data: { Beneficiary: OBBeneficiary5[] };
  Links: Links;
  Meta: Meta;
}

export interface OBBeneficiary5 {
  AccountId?: string;
  BeneficiaryId?: string;
  BeneficiaryType?: string;
  Reference?: string;
  CreditorAgent?: { SchemeName?: string; Identification?: string; Name?: string; PostalAddress?: OBPostalAddress6 };
  CreditorAccount?: OBCashAccount3;
}

// ── Direct Debit ──────────────────────────────────────────────────────────────

export interface OBReadDirectDebit2 {
  Data: { DirectDebit: OBDirectDebit2[] };
  Links: Links;
  Meta: Meta;
}

export interface OBDirectDebit2 {
  AccountId: string;
  DirectDebitId?: string;
  MandateIdentification: string;
  DirectDebitStatusCode?: string;
  Name: string;
  PreviousPaymentDateTime?: string;
  Frequency?: string;
  PreviousPaymentAmount?: OBActiveOrHistoricCurrencyAndAmount;
}

// ── Standing Order ────────────────────────────────────────────────────────────

export interface OBReadStandingOrder6 {
  Data: { StandingOrder: OBStandingOrder6[] };
  Links: Links;
  Meta: Meta;
}

export interface OBStandingOrder6 {
  AccountId: string;
  StandingOrderId?: string;
  Frequency: string;
  Reference?: string;
  FirstPaymentDateTime?: string;
  NextPaymentDateTime?: string;
  LastPaymentDateTime?: string;
  FinalPaymentDateTime?: string;
  NumberOfPayments?: string;
  StandingOrderStatusCode?: string;
  FirstPaymentAmount?: OBActiveOrHistoricCurrencyAndAmount;
  NextPaymentAmount?: OBActiveOrHistoricCurrencyAndAmount;
  LastPaymentAmount?: OBActiveOrHistoricCurrencyAndAmount;
  FinalPaymentAmount?: OBActiveOrHistoricCurrencyAndAmount;
  SupplementaryData?: Record<string, unknown>;
  CreditorAgent?: { SchemeName?: string; Identification?: string };
  CreditorAccount?: OBCashAccount3;
}

// ── Scheduled Payment ─────────────────────────────────────────────────────────

export interface OBReadScheduledPayment3 {
  Data: { ScheduledPayment: OBScheduledPayment3[] };
  Links: Links;
  Meta: Meta;
}

export interface OBScheduledPayment3 {
  AccountId: string;
  ScheduledPaymentId?: string;
  ScheduledPaymentDateTime: string;
  ScheduledType: string;
  Reference?: string;
  InstructedAmount: OBActiveOrHistoricCurrencyAndAmount;
  CreditorAgent?: { SchemeName?: string; Identification?: string };
  CreditorAccount?: OBCashAccount3;
}

// ── Statement ─────────────────────────────────────────────────────────────────

export interface OBReadStatement2 {
  Data: { Statement: OBStatement2[] };
  Links: Links;
  Meta: Meta;
}

export interface OBStatement2 {
  AccountId: string;
  StatementId?: string;
  StatementReference?: string;
  Type: string;
  StartDateTime: string;
  EndDateTime: string;
  CreationDateTime: string;
  StatementDescription?: string[];
  StatementBenefit?: Array<{ Type: string; Amount: OBActiveOrHistoricCurrencyAndAmount }>;
  StatementFee?: Array<{
    Description?: string;
    CreditDebitIndicator: string;
    Type: string;
    Rate?: number;
    RateType?: string;
    Frequency?: string;
    Amount: OBActiveOrHistoricCurrencyAndAmount;
  }>;
  StatementInterest?: Array<{
    Description?: string;
    CreditDebitIndicator: string;
    Type: string;
    Rate?: number;
    RateType?: string;
    Frequency?: string;
    Amount: OBActiveOrHistoricCurrencyAndAmount;
  }>;
  StatementAmount?: Array<{
    CreditDebitIndicator: string;
    Type: string;
    Amount: OBActiveOrHistoricCurrencyAndAmount;
  }>;
  StatementDateTime?: Array<{ DateTime: string; Type: string }>;
  StatementRate?: Array<{ Rate: string; Type: string }>;
  StatementValue?: Array<{ Value: string; Type: string }>;
}

// ── Party ─────────────────────────────────────────────────────────────────────

export interface OBReadParty3 {
  Data: { Party: OBParty3 };
  Links: Links;
  Meta: Meta;
}

export interface OBReadParty3Multiple {
  Data: { Party: OBParty3[] };
  Links: Links;
  Meta: Meta;
}

export interface OBParty3 {
  PartyId: string;
  PartyNumber?: string;
  PartyType?: string;
  Name?: string;
  FullLegalName?: string;
  LegalStructure?: string;
  BeneficialOwnership?: boolean;
  AccountRole?: string;
  EmailAddress?: string;
  Phone?: string;
  Mobile?: string;
  Relationships?: {
    Account?: { Related: string; Id: string };
  };
  Address?: Array<OBPostalAddress6 & { AddressType?: string }>;
}

// ── Product ───────────────────────────────────────────────────────────────────

export interface OBReadProduct2 {
  Data: { Product: OBProduct2[] };
  Links: Links;
  Meta: Meta;
}

export interface OBProduct2 {
  ProductName?: string;
  ProductId?: string;
  AccountId: string;
  SecondaryProductId?: string;
  ProductType: string;
  MarketingStateId?: string;
  OtherProductType?: { Name: string; Description: string };
}

// ── Offer ─────────────────────────────────────────────────────────────────────

export interface OBReadOffer1 {
  Data: { Offer: OBOffer1[] };
  Links: Links;
  Meta: Meta;
}

export interface OBOffer1 {
  AccountId: string;
  OfferId?: string;
  OfferType?: string;
  Description?: string;
  StartDateTime?: string;
  EndDateTime?: string;
  Rate?: string;
  Value?: number;
  Term?: string;
  URL?: string;
  Amount?: OBActiveOrHistoricCurrencyAndAmount;
  Fee?: OBActiveOrHistoricCurrencyAndAmount;
}
