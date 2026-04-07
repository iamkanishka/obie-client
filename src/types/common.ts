/**
 * Common OBIE v3.1.3 data types shared across all resource families.
 */

export interface OBActiveOrHistoricCurrencyAndAmount {
  /** Monetary amount: up to 13 digits before decimal, up to 5 after. Pattern: ^\d{1,13}\.\d{1,5}$ */
  Amount: string;
  /** ISO 4217 three-letter currency code. */
  Currency: string;
}

export interface OBCashAccount3 {
  /** Account numbering scheme. See SchemeNameCode enum. */
  SchemeName: string;
  /** Account identification. For UK.OBIE.SortCodeAccountNumber: 6-digit sort code + 8-digit account number. */
  Identification: string;
  Name?: string;
  SecondaryIdentification?: string;
}

export interface OBPostalAddress6 {
  AddressType?: string;
  Department?: string;
  SubDepartment?: string;
  StreetName?: string;
  BuildingNumber?: string;
  PostCode?: string;
  TownName?: string;
  CountrySubDivision?: string;
  /** ISO 3166-1 alpha-2 country code. */
  Country?: string;
  AddressLine?: string[];
}

export interface OBBranchAndFinancialInstitutionIdentification6 {
  SchemeName?: string;
  Identification?: string;
  Name?: string;
  PostalAddress?: OBPostalAddress6;
}

export interface OBRisk1 {
  PaymentContextCode?: string;
  MerchantCategoryCode?: string;
  MerchantCustomerIdentification?: string;
  DeliveryAddress?: OBPostalAddress6;
}

export interface OBRemittanceInformation1 {
  Unstructured?: string;
  Reference?: string;
}

export interface OBError {
  Code: string;
  Message: string;
  Errors?: OBErrorDetail[];
}

export interface OBErrorDetail {
  ErrorCode: string;
  Message: string;
  Path?: string;
  Url?: string;
}

export interface Links {
  Self: string;
  First?: string;
  Prev?: string;
  Next?: string;
  Last?: string;
}

export interface Meta {
  TotalPages?: number;
  FirstAvailableDateTime?: string;
  LastAvailableDateTime?: string;
}

export interface OBAuthorisation1 {
  /** "Any" | "Single" */
  AuthorisationType: string;
  CompletionDateTime?: string;
}

export interface OBSCASupportData1 {
  RequestedSCAExemptionType?: string;
  AppliedAuthenticationApproach?: string;
  ReferencePaymentOrderId?: string;
}

export interface OBCharge2 {
  ChargeBearer: string;
  Type: string;
  Amount: OBActiveOrHistoricCurrencyAndAmount;
}

export interface OBMultiAuthorisation1 {
  Status: string;
  NumberRequired?: number;
  NumberReceived?: number;
  LastUpdateDateTime?: string;
  ExpirationDateTime?: string;
}

export interface OBPartyIdentification43 {
  Name?: string;
  PostalAddress?: OBPostalAddress6;
}

export interface OBExchangeRate1 {
  RateType: string;
  UnitCurrency: string;
  ExchangeRate?: number;
  ContractIdentification?: string;
  ExpirationDateTime?: string;
}
