import { PageIterator } from "../pagination/index";
import type { HttpClient } from "../http/client";
import type {
  OBReadAccount6,
  OBReadBalance1,
  OBReadTransaction6,
  OBTransaction6,
  OBReadBeneficiary5,
  OBReadDirectDebit2,
  OBReadStandingOrder6,
  OBReadScheduledPayment3,
  OBReadStatement2,
  OBStatement2,
  OBReadParty3,
  OBReadParty3Multiple,
  OBReadProduct2,
  OBReadOffer1,
} from "../types/accounts";

const AIS_BASE = "/open-banking/v3.1/aisp";

/** Date filter options for transaction/statement queries. */
export interface DateRange {
  fromBookingDateTime?: string;
  toBookingDateTime?: string;
}

function buildDateQuery(range?: DateRange): string {
  if (!range) return "";
  const params = new URLSearchParams();
  if (range.fromBookingDateTime) params.set("fromBookingDateTime", range.fromBookingDateTime);
  if (range.toBookingDateTime) params.set("toBookingDateTime", range.toBookingDateTime);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * OBIE Account Information Service — all 13 resource types.
 * Requires an authorised account-access-consent.
 */
export class AccountsService {
  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
  ) {}

  // ── Accounts ──────────────────────────────────────────────────────────────

  /** GET /accounts */
  async list(): Promise<OBReadAccount6> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/accounts`);
  }

  /** GET /accounts/{AccountId} */
  async get(accountId: string): Promise<OBReadAccount6> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/accounts/${accountId}`);
  }

  // ── Balances ──────────────────────────────────────────────────────────────

  /** GET /balances */
  async listBalances(): Promise<OBReadBalance1> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/balances`);
  }

  /** GET /accounts/{AccountId}/balances */
  async getBalances(accountId: string): Promise<OBReadBalance1> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/accounts/${accountId}/balances`);
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  /** GET /transactions with optional date filter */
  async listTransactions(range?: DateRange): Promise<OBReadTransaction6> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/transactions${buildDateQuery(range)}`);
  }

  /** GET /accounts/{AccountId}/transactions with optional date filter */
  async getTransactions(accountId: string, range?: DateRange): Promise<OBReadTransaction6> {
    return this.http.get(
      `${this.baseUrl}${AIS_BASE}/accounts/${accountId}/transactions${buildDateQuery(range)}`,
    );
  }

  /** Returns a lazy async iterator over all transactions pages. */
  iterateTransactions(accountId: string, range?: DateRange): PageIterator<OBReadTransaction6, OBTransaction6> {
    const url = `${this.baseUrl}${AIS_BASE}/accounts/${accountId}/transactions${buildDateQuery(range)}`;
    return new PageIterator(this.http, url, (p) => p.Data.Transaction ?? []);
  }

  // ── Beneficiaries ─────────────────────────────────────────────────────────

  /** GET /beneficiaries */
  async listBeneficiaries(): Promise<OBReadBeneficiary5> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/beneficiaries`);
  }

  /** GET /accounts/{AccountId}/beneficiaries */
  async getBeneficiaries(accountId: string): Promise<OBReadBeneficiary5> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/accounts/${accountId}/beneficiaries`);
  }

  // ── Direct Debits ─────────────────────────────────────────────────────────

  /** GET /direct-debits */
  async listDirectDebits(): Promise<OBReadDirectDebit2> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/direct-debits`);
  }

  /** GET /accounts/{AccountId}/direct-debits */
  async getDirectDebits(accountId: string): Promise<OBReadDirectDebit2> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/accounts/${accountId}/direct-debits`);
  }

  // ── Standing Orders ───────────────────────────────────────────────────────

  /** GET /standing-orders */
  async listStandingOrders(): Promise<OBReadStandingOrder6> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/standing-orders`);
  }

  /** GET /accounts/{AccountId}/standing-orders */
  async getStandingOrders(accountId: string): Promise<OBReadStandingOrder6> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/accounts/${accountId}/standing-orders`);
  }

  // ── Scheduled Payments ────────────────────────────────────────────────────

  /** GET /scheduled-payments */
  async listScheduledPayments(): Promise<OBReadScheduledPayment3> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/scheduled-payments`);
  }

  /** GET /accounts/{AccountId}/scheduled-payments */
  async getScheduledPayments(accountId: string): Promise<OBReadScheduledPayment3> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/accounts/${accountId}/scheduled-payments`);
  }

  // ── Statements ────────────────────────────────────────────────────────────

  /** GET /statements */
  async listStatements(): Promise<OBReadStatement2> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/statements`);
  }

  /** GET /accounts/{AccountId}/statements */
  async getStatements(accountId: string): Promise<OBReadStatement2> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/accounts/${accountId}/statements`);
  }

  /** GET /accounts/{AccountId}/statements/{StatementId} */
  async getStatement(accountId: string, statementId: string): Promise<OBReadStatement2> {
    return this.http.get(
      `${this.baseUrl}${AIS_BASE}/accounts/${accountId}/statements/${statementId}`,
    );
  }

  /** GET /accounts/{AccountId}/statements/{StatementId}/transactions */
  async getStatementTransactions(accountId: string, statementId: string): Promise<OBReadTransaction6> {
    return this.http.get(
      `${this.baseUrl}${AIS_BASE}/accounts/${accountId}/statements/${statementId}/transactions`,
    );
  }

  /** GET /statements/{StatementId}/transactions (bulk — no account ID) */
  async getStatementTransactionsBulk(statementId: string): Promise<OBReadTransaction6> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/statements/${statementId}/transactions`);
  }

  /** Returns a lazy async iterator over all statement pages. */
  iterateStatements(accountId: string): PageIterator<OBReadStatement2, OBStatement2> {
    const url = `${this.baseUrl}${AIS_BASE}/accounts/${accountId}/statements`;
    return new PageIterator(this.http, url, (p) => p.Data.Statement ?? []);
  }

  // ── Parties ───────────────────────────────────────────────────────────────

  /** GET /party (PSU-level party) */
  async getParty(): Promise<OBReadParty3> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/party`);
  }

  /** GET /accounts/{AccountId}/party */
  async getAccountParty(accountId: string): Promise<OBReadParty3> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/accounts/${accountId}/party`);
  }

  /** GET /accounts/{AccountId}/parties */
  async getAccountParties(accountId: string): Promise<OBReadParty3Multiple> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/accounts/${accountId}/parties`);
  }

  // ── Products ──────────────────────────────────────────────────────────────

  /** GET /products */
  async listProducts(): Promise<OBReadProduct2> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/products`);
  }

  /** GET /accounts/{AccountId}/product */
  async getProduct(accountId: string): Promise<OBReadProduct2> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/accounts/${accountId}/product`);
  }

  // ── Offers ────────────────────────────────────────────────────────────────

  /** GET /offers */
  async listOffers(): Promise<OBReadOffer1> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/offers`);
  }

  /** GET /accounts/{AccountId}/offers */
  async getOffers(accountId: string): Promise<OBReadOffer1> {
    return this.http.get(`${this.baseUrl}${AIS_BASE}/accounts/${accountId}/offers`);
  }
}
