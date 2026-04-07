import type {
  OBActiveOrHistoricCurrencyAndAmount,
  OBCashAccount3,
  OBRisk1,
  OBRemittanceInformation1,
  Links,
  Meta,
} from "./common";

// ── AIS Consent ───────────────────────────────────────────────────────────────

export interface OBReadConsent1 {
  Data: OBReadConsentData1;
  Risk: Record<string, never>;
}

export interface OBReadConsentData1 {
  Permissions: string[];
  ExpirationDateTime?: string;
  TransactionFromDateTime?: string;
  TransactionToDateTime?: string;
}

export interface OBReadConsentResponse1 {
  Data: OBReadConsentResponseData1;
  Risk: Record<string, never>;
  Links: Links;
  Meta: Meta;
}

export interface OBReadConsentResponseData1 {
  ConsentId: string;
  CreationDateTime: string;
  Status: string;
  StatusUpdateDateTime: string;
  Permissions: string[];
  ExpirationDateTime?: string;
  TransactionFromDateTime?: string;
  TransactionToDateTime?: string;
}

// ── VRP Consent ───────────────────────────────────────────────────────────────

export interface OBDomesticVRPConsentRequest {
  Data: OBDomesticVRPConsentRequestData;
  Risk: OBRisk1;
}

export interface OBDomesticVRPConsentRequestData {
  ControlParameters: OBDomesticVRPControlParameters;
  Initiation: OBDomesticVRPInitiation;
}

export interface OBDomesticVRPControlParameters {
  ValidFromDateTime?: string;
  ValidToDateTime?: string;
  MaximumIndividualAmount: OBActiveOrHistoricCurrencyAndAmount;
  PeriodicLimits: OBDomesticVRPControlParametersPeriodic[];
  VRPType: string[];
  PSUAuthenticationMethods: string[];
}

export interface OBDomesticVRPControlParametersPeriodic {
  PeriodAlignment: string;
  PeriodType: string;
  Amount: OBActiveOrHistoricCurrencyAndAmount;
}

export interface OBDomesticVRPInitiation {
  DebtorAccount?: OBCashAccount3;
  CreditorAccount: OBCashAccount3;
  RemittanceInformation?: OBRemittanceInformation1;
}

export interface OBDomesticVRPConsentResponse {
  Data: OBDomesticVRPConsentResponseData;
  Risk: OBRisk1;
  Links: Links;
  Meta: Meta;
}

export interface OBDomesticVRPConsentResponseData {
  ConsentId: string;
  CreationDateTime: string;
  Status: string;
  StatusUpdateDateTime: string;
  ControlParameters: OBDomesticVRPControlParameters;
  Initiation: OBDomesticVRPInitiation;
  DebtorAccount?: OBCashAccount3;
}

// ── VRP Payment ───────────────────────────────────────────────────────────────

export interface OBDomesticVRPRequest {
  Data: OBDomesticVRPRequestData;
  Risk: OBRisk1;
}

export interface OBDomesticVRPRequestData {
  ConsentId: string;
  PSUAuthenticationMethod: string;
  Initiation: OBDomesticVRPInitiation;
  Instruction: OBDomesticVRPInstruction;
}

export interface OBDomesticVRPInstruction {
  InstructionIdentification: string;
  EndToEndIdentification: string;
  LocalInstrument?: string;
  InstructedAmount: OBActiveOrHistoricCurrencyAndAmount;
  CreditorAccount: OBCashAccount3;
  RemittanceInformation?: OBRemittanceInformation1;
  SupplementaryData?: Record<string, unknown>;
}

export interface OBDomesticVRPResponse {
  Data: {
    DomesticVRPId: string;
    ConsentId: string;
    CreationDateTime: string;
    Status: string;
    StatusUpdateDateTime: string;
    Initiation: OBDomesticVRPInitiation;
    Instruction: OBDomesticVRPInstruction;
    DebtorAccount?: OBCashAccount3;
  };
  Links: Links;
  Meta: Meta;
}

// ── File Payment ──────────────────────────────────────────────────────────────

export interface OBWriteFileConsent3 {
  Data: OBWriteFileConsentData3;
  Risk: OBRisk1;
}

export interface OBWriteFileConsentData3 {
  Initiation: OBFileInitiation;
  Authorisation?: { AuthorisationType: string; CompletionDateTime?: string };
  SCASupportData?: { RequestedSCAExemptionType?: string };
}

export interface OBFileInitiation {
  FileType: string;
  FileHash: string;
  FileReference?: string;
  NumberOfTransactions?: string;
  ControlSum?: number;
  RequestedExecutionDateTime?: string;
  LocalInstrument?: string;
  DebtorAccount?: OBCashAccount3;
  RemittanceInformation?: OBRemittanceInformation1;
  SupplementaryData?: Record<string, unknown>;
}

export interface OBWriteFileConsentResponse4 {
  Data: OBWriteFileConsentResponseData4;
  Risk: OBRisk1;
  Links: Links;
  Meta: Meta;
}

export interface OBWriteFileConsentResponseData4 {
  ConsentId: string;
  CreationDateTime: string;
  Status: string;
  StatusUpdateDateTime: string;
  Initiation: OBFileInitiation;
}

export interface OBWriteFile2 {
  Data: { ConsentId: string; Initiation: OBFileInitiation };
  Risk: OBRisk1;
}

export interface OBWriteFileResponse3 {
  Data: {
    FilePaymentId: string;
    ConsentId: string;
    CreationDateTime: string;
    Status: string;
    StatusUpdateDateTime: string;
    Initiation: OBFileInitiation;
  };
  Links: Links;
  Meta: Meta;
}

// ── Event Subscriptions ───────────────────────────────────────────────────────

export interface OBEventSubscription1 {
  Data: { CallbackUrl?: string; Version: string; EventTypes?: string[] };
}

export interface OBEventSubscriptionResponse1 {
  Data: {
    EventSubscriptionId: string;
    CallbackUrl?: string;
    Version: string;
    EventTypes?: string[];
  };
  Links: Links;
  Meta: Meta;
}

// ── Funds Confirmation Consent ────────────────────────────────────────────────

export interface OBFundsConfirmationConsent1 {
  Data: {
    ExpirationDateTime?: string;
    DebtorAccount: OBCashAccount3;
  };
}

export interface OBFundsConfirmationConsentResponse1 {
  Data: {
    ConsentId: string;
    CreationDateTime: string;
    Status: string;
    StatusUpdateDateTime: string;
    ExpirationDateTime?: string;
    DebtorAccount: OBCashAccount3;
  };
  Links: Links;
  Meta: Meta;
}

export interface OBFundsConfirmation1 {
  Data: {
    ConsentId: string;
    Reference: string;
    InstructedAmount: OBActiveOrHistoricCurrencyAndAmount;
  };
}
