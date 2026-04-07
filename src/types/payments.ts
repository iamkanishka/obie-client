import type {
  OBActiveOrHistoricCurrencyAndAmount,
  OBCashAccount3,
  OBRisk1,
  OBRemittanceInformation1,
  OBAuthorisation1,
  OBSCASupportData1,
  OBCharge2,
  OBMultiAuthorisation1,
  OBBranchAndFinancialInstitutionIdentification6,
  OBPartyIdentification43,
  OBExchangeRate1,
  OBPostalAddress6,
  Links,
  Meta,
} from "./common";

// ── Domestic Payment Consent ──────────────────────────────────────────────────

export interface OBWriteDomesticConsent5 {
  Data: OBWriteDomesticConsentData5;
  Risk: OBRisk1;
}

export interface OBWriteDomesticConsentData5 {
  Permission?: string;
  ReadRefundAccount?: string;
  ExpirationDateTime?: string;
  Initiation: OBDomesticInitiation;
  Authorisation?: OBAuthorisation1;
  SCASupportData?: OBSCASupportData1;
}

export interface OBDomesticInitiation {
  InstructionIdentification: string;
  EndToEndIdentification: string;
  LocalInstrument?: string;
  InstructedAmount: OBActiveOrHistoricCurrencyAndAmount;
  DebtorAccount?: OBCashAccount3;
  CreditorAccount: OBCashAccount3;
  CreditorPostalAddress?: OBPostalAddress6;
  RemittanceInformation?: OBRemittanceInformation1;
  SupplementaryData?: Record<string, unknown>;
}

export interface OBWriteDomesticConsentResponse5 {
  Data: OBWriteDomesticConsentResponseData5;
  Risk: OBRisk1;
  Links: Links;
  Meta: Meta;
}

export interface OBWriteDomesticConsentResponseData5 {
  ConsentId: string;
  CreationDateTime: string;
  Status: string;
  StatusUpdateDateTime: string;
  Permission?: string;
  ReadRefundAccount?: string;
  ExpirationDateTime?: string;
  Initiation: OBDomesticInitiation;
  Authorisation?: OBAuthorisation1;
  SCASupportData?: OBSCASupportData1;
  Debtor?: OBCashAccount3;
  Charges?: OBCharge2[];
}

// ── Domestic Payment ──────────────────────────────────────────────────────────

export interface OBWriteDomestic2 {
  Data: { ConsentId: string; Initiation: OBDomesticInitiation };
  Risk: OBRisk1;
}

export interface OBWriteDomesticResponse5 {
  Data: OBWriteDomesticResponseData5;
  Links: Links;
  Meta: Meta;
}

export interface OBWriteDomesticResponseData5 {
  DomesticPaymentId: string;
  ConsentId: string;
  CreationDateTime: string;
  Status: string;
  StatusUpdateDateTime: string;
  Initiation: OBDomesticInitiation;
  MultiAuthorisation?: OBMultiAuthorisation1;
  Debtor?: OBCashAccount3;
  Charges?: OBCharge2[];
}

// ── Domestic Scheduled Payment Consent ────────────────────────────────────────

export interface OBWriteDomesticScheduledConsent4 {
  Data: OBWriteDomesticScheduledConsentData4;
  Risk: OBRisk1;
}

export interface OBWriteDomesticScheduledConsentData4 {
  Permission?: string;
  ExpirationDateTime?: string;
  Initiation: OBDomesticScheduledInitiation;
  Authorisation?: OBAuthorisation1;
  SCASupportData?: OBSCASupportData1;
}

export interface OBDomesticScheduledInitiation {
  InstructionIdentification: string;
  EndToEndIdentification?: string;
  LocalInstrument?: string;
  RequestedExecutionDateTime: string;
  InstructedAmount: OBActiveOrHistoricCurrencyAndAmount;
  DebtorAccount?: OBCashAccount3;
  CreditorAccount: OBCashAccount3;
  CreditorPostalAddress?: OBPostalAddress6;
  RemittanceInformation?: OBRemittanceInformation1;
  SupplementaryData?: Record<string, unknown>;
}

export interface OBWriteDomesticScheduledConsentResponse5 {
  Data: OBWriteDomesticScheduledConsentResponseData5;
  Risk: OBRisk1;
  Links: Links;
  Meta: Meta;
}

export interface OBWriteDomesticScheduledConsentResponseData5 {
  ConsentId: string;
  CreationDateTime: string;
  Status: string;
  StatusUpdateDateTime: string;
  Permission?: string;
  ExpirationDateTime?: string;
  Initiation: OBDomesticScheduledInitiation;
}

// ── Domestic Standing Order Consent ───────────────────────────────────────────

export interface OBWriteDomesticStandingOrderConsent5 {
  Data: OBWriteDomesticStandingOrderConsentData5;
  Risk: OBRisk1;
}

export interface OBWriteDomesticStandingOrderConsentData5 {
  Permission?: string;
  ExpirationDateTime?: string;
  Initiation: OBDomesticStandingOrderInitiation;
  Authorisation?: OBAuthorisation1;
  SCASupportData?: OBSCASupportData1;
}

export interface OBDomesticStandingOrderInitiation {
  Frequency: string;
  Reference?: string;
  NumberOfPayments?: string;
  FirstPaymentDateTime: string;
  RecurringPaymentDateTime?: string;
  FinalPaymentDateTime?: string;
  FirstPaymentAmount: OBActiveOrHistoricCurrencyAndAmount;
  RecurringPaymentAmount?: OBActiveOrHistoricCurrencyAndAmount;
  FinalPaymentAmount?: OBActiveOrHistoricCurrencyAndAmount;
  DebtorAccount?: OBCashAccount3;
  CreditorAccount: OBCashAccount3;
  SupplementaryData?: Record<string, unknown>;
}

// ── International Payment Consent ─────────────────────────────────────────────

export interface OBWriteInternationalConsent5 {
  Data: OBWriteInternationalConsentData5;
  Risk: OBRisk1;
}

export interface OBWriteInternationalConsentData5 {
  Permission?: string;
  ReadRefundAccount?: string;
  ExpirationDateTime?: string;
  Initiation: OBInternationalInitiation;
  Authorisation?: OBAuthorisation1;
  SCASupportData?: OBSCASupportData1;
}

export interface OBInternationalInitiation {
  InstructionIdentification: string;
  EndToEndIdentification: string;
  LocalInstrument?: string;
  InstructionPriority?: string;
  Purpose?: string;
  ExtendedPurpose?: string;
  ChargeBearer?: string;
  CurrencyOfTransfer: string;
  DestinationCountryCode?: string;
  InstructedAmount: OBActiveOrHistoricCurrencyAndAmount;
  ExchangeRateInformation?: OBExchangeRate1;
  DebtorAccount?: OBCashAccount3;
  Creditor?: OBPartyIdentification43;
  CreditorAgent?: OBBranchAndFinancialInstitutionIdentification6;
  CreditorAccount: OBCashAccount3;
  RemittanceInformation?: OBRemittanceInformation1;
}

export interface OBWriteInternationalConsentResponse6 {
  Data: OBWriteInternationalConsentResponseData6;
  Risk: OBRisk1;
  Links: Links;
  Meta: Meta;
}

export interface OBWriteInternationalConsentResponseData6 {
  ConsentId: string;
  CreationDateTime: string;
  Status: string;
  StatusUpdateDateTime: string;
  Permission?: string;
  ReadRefundAccount?: string;
  ExpirationDateTime?: string;
  Initiation: OBInternationalInitiation;
  Authorisation?: OBAuthorisation1;
  Charges?: OBCharge2[];
  ExchangeRateInformation?: OBExchangeRate1;
}

export interface OBWriteInternational3 {
  Data: { ConsentId: string; Initiation: OBInternationalInitiation };
  Risk: OBRisk1;
}

export interface OBWriteInternationalResponse5 {
  Data: {
    InternationalPaymentId: string;
    ConsentId: string;
    CreationDateTime: string;
    Status: string;
    StatusUpdateDateTime: string;
    Initiation: OBInternationalInitiation;
    MultiAuthorisation?: OBMultiAuthorisation1;
    Debtor?: OBCashAccount3;
    Charges?: OBCharge2[];
    ExchangeRateInformation?: OBExchangeRate1;
  };
  Links: Links;
  Meta: Meta;
}

// ── International Scheduled Payment Consent ───────────────────────────────────

export interface OBWriteInternationalScheduledConsent5 {
  Data: {
    Permission?: string;
    ExpirationDateTime?: string;
    Initiation: OBInternationalScheduledInitiation;
    Authorisation?: OBAuthorisation1;
    SCASupportData?: OBSCASupportData1;
  };
  Risk: OBRisk1;
}

export interface OBInternationalScheduledInitiation extends OBInternationalInitiation {
  RequestedExecutionDateTime: string;
}

// ── International Standing Order Consent ──────────────────────────────────────

export interface OBWriteInternationalStandingOrderConsent6 {
  Data: {
    Permission?: string;
    ExpirationDateTime?: string;
    Initiation: OBInternationalStandingOrderInitiation;
    Authorisation?: OBAuthorisation1;
    SCASupportData?: OBSCASupportData1;
  };
  Risk: OBRisk1;
}

export interface OBInternationalStandingOrderInitiation {
  Frequency: string;
  Reference?: string;
  NumberOfPayments?: string;
  FirstPaymentDateTime: string;
  FinalPaymentDateTime?: string;
  Purpose?: string;
  ExtendedPurpose?: string;
  ChargeBearer?: string;
  CurrencyOfTransfer: string;
  InstructedAmount: OBActiveOrHistoricCurrencyAndAmount;
  DebtorAccount?: OBCashAccount3;
  Creditor?: OBPartyIdentification43;
  CreditorAgent?: OBBranchAndFinancialInstitutionIdentification6;
  CreditorAccount: OBCashAccount3;
}

// ── Payment Details ────────────────────────────────────────────────────────────

export interface OBWritePaymentDetailsResponse1 {
  Data: {
    PaymentStatus?: Array<{
      PaymentTransactionId: string;
      Status: string;
      StatusUpdateDateTime?: string;
      StatusDetail?: {
        LocalInstrument?: string;
        Status: string;
        StatusReason?: string;
        StatusReasonDescription?: string;
      };
    }>;
  };
  Links: Links;
  Meta: Meta;
}

// ── Funds Confirmation ────────────────────────────────────────────────────────

export interface OBWriteFundsConfirmationResponse1 {
  Data: {
    FundsAvailableResult: {
      FundsAvailableDateTime: string;
      FundsAvailable: boolean;
    };
    SupplementaryData?: Record<string, unknown>;
  };
  Links: Links;
  Meta: Meta;
}
