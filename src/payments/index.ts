import { v4 as uuidv4 } from "uuid";
import type { HttpClient, DoOptions } from "../http/client";
import { signDetachedJws } from "../signing/jws";
import { isTerminalPaymentStatus } from "../types/enums";
import type {
  OBWriteDomesticConsent5,
  OBWriteDomesticConsentResponse5,
  OBWriteDomestic2,
  OBWriteDomesticResponse5,
  OBWriteDomesticScheduledConsent4,
  OBWriteDomesticScheduledConsentResponse5,
  OBWriteDomesticStandingOrderConsent5,
  OBWriteInternationalConsent5,
  OBWriteInternationalConsentResponse6,
  OBWriteInternational3,
  OBWriteInternationalResponse5,
  OBWriteInternationalScheduledConsent5,
  OBWriteInternationalStandingOrderConsent6,
  OBWritePaymentDetailsResponse1,
  OBWriteFundsConfirmationResponse1,
} from "../types/payments";

const PISP_BASE = "/open-banking/v3.1/pisp";

interface SignerConfig {
  privateKeyPem: string;
  signingKeyId: string;
}

interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
}

async function signedOpts(body: unknown, signer: SignerConfig): Promise<DoOptions> {
  const jwsSignature = await signDetachedJws(body, signer);
  return { idempotencyKey: uuidv4(), jwsSignature };
}

/**
 * OBIE Payment Initiation Service — all 6 payment types with full lifecycle.
 */
export class PaymentsService {
  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
    private readonly signer: SignerConfig,
  ) {}

  // ────────────────────────────────────────────────────────────────────────────
  // DOMESTIC PAYMENTS
  // ────────────────────────────────────────────────────────────────────────────

  async createDomesticConsent(req: OBWriteDomesticConsent5): Promise<OBWriteDomesticConsentResponse5> {
    const opts = await signedOpts(req, this.signer);
    return this.http.post(`${this.baseUrl}${PISP_BASE}/domestic-payment-consents`, req, opts);
  }

  async getDomesticConsent(consentId: string): Promise<OBWriteDomesticConsentResponse5> {
    return this.http.get(`${this.baseUrl}${PISP_BASE}/domestic-payment-consents/${consentId}`);
  }

  async getDomesticConsentFundsConfirmation(consentId: string): Promise<OBWriteFundsConfirmationResponse1> {
    return this.http.get(
      `${this.baseUrl}${PISP_BASE}/domestic-payment-consents/${consentId}/funds-confirmation`,
    );
  }

  async submitDomestic(req: OBWriteDomestic2): Promise<OBWriteDomesticResponse5> {
    const opts = await signedOpts(req, this.signer);
    return this.http.post(`${this.baseUrl}${PISP_BASE}/domestic-payments`, req, opts);
  }

  async getDomestic(paymentId: string): Promise<OBWriteDomesticResponse5> {
    return this.http.get(`${this.baseUrl}${PISP_BASE}/domestic-payments/${paymentId}`);
  }

  async getDomesticDetails(paymentId: string): Promise<OBWritePaymentDetailsResponse1> {
    return this.http.get(`${this.baseUrl}${PISP_BASE}/domestic-payments/${paymentId}/payment-details`);
  }

  async pollDomestic(paymentId: string, opts: PollOptions = {}): Promise<OBWriteDomesticResponse5> {
    return this.poll(() => this.getDomestic(paymentId), (r) => r.Data.Status, opts);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // DOMESTIC SCHEDULED PAYMENTS
  // ────────────────────────────────────────────────────────────────────────────

  async createDomesticScheduledConsent(
    req: OBWriteDomesticScheduledConsent4,
  ): Promise<OBWriteDomesticScheduledConsentResponse5> {
    const opts = await signedOpts(req, this.signer);
    return this.http.post(`${this.baseUrl}${PISP_BASE}/domestic-scheduled-payment-consents`, req, opts);
  }

  async getDomesticScheduledConsent(consentId: string): Promise<OBWriteDomesticScheduledConsentResponse5> {
    return this.http.get(`${this.baseUrl}${PISP_BASE}/domestic-scheduled-payment-consents/${consentId}`);
  }

  async deleteDomesticScheduledConsent(consentId: string): Promise<void> {
    return this.http.delete(`${this.baseUrl}${PISP_BASE}/domestic-scheduled-payment-consents/${consentId}`);
  }

  async submitDomesticScheduled(req: OBWriteDomestic2): Promise<OBWriteDomesticResponse5> {
    const opts = await signedOpts(req, this.signer);
    return this.http.post(`${this.baseUrl}${PISP_BASE}/domestic-scheduled-payments`, req, opts);
  }

  async getDomesticScheduled(paymentId: string): Promise<OBWriteDomesticResponse5> {
    return this.http.get(`${this.baseUrl}${PISP_BASE}/domestic-scheduled-payments/${paymentId}`);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // DOMESTIC STANDING ORDERS
  // ────────────────────────────────────────────────────────────────────────────

  async createDomesticStandingOrderConsent(
    req: OBWriteDomesticStandingOrderConsent5,
  ): Promise<OBWriteDomesticConsentResponse5> {
    const opts = await signedOpts(req, this.signer);
    return this.http.post(`${this.baseUrl}${PISP_BASE}/domestic-standing-order-consents`, req, opts);
  }

  async getDomesticStandingOrderConsent(consentId: string): Promise<OBWriteDomesticConsentResponse5> {
    return this.http.get(`${this.baseUrl}${PISP_BASE}/domestic-standing-order-consents/${consentId}`);
  }

  async deleteDomesticStandingOrderConsent(consentId: string): Promise<void> {
    return this.http.delete(`${this.baseUrl}${PISP_BASE}/domestic-standing-order-consents/${consentId}`);
  }

  async submitDomesticStandingOrder(req: OBWriteDomestic2): Promise<OBWriteDomesticResponse5> {
    const opts = await signedOpts(req, this.signer);
    return this.http.post(`${this.baseUrl}${PISP_BASE}/domestic-standing-orders`, req, opts);
  }

  async getDomesticStandingOrder(paymentId: string): Promise<OBWriteDomesticResponse5> {
    return this.http.get(`${this.baseUrl}${PISP_BASE}/domestic-standing-orders/${paymentId}`);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // INTERNATIONAL PAYMENTS
  // ────────────────────────────────────────────────────────────────────────────

  async createInternationalConsent(
    req: OBWriteInternationalConsent5,
  ): Promise<OBWriteInternationalConsentResponse6> {
    const opts = await signedOpts(req, this.signer);
    return this.http.post(`${this.baseUrl}${PISP_BASE}/international-payment-consents`, req, opts);
  }

  async getInternationalConsent(consentId: string): Promise<OBWriteInternationalConsentResponse6> {
    return this.http.get(`${this.baseUrl}${PISP_BASE}/international-payment-consents/${consentId}`);
  }

  async getInternationalConsentFundsConfirmation(
    consentId: string,
  ): Promise<OBWriteFundsConfirmationResponse1> {
    return this.http.get(
      `${this.baseUrl}${PISP_BASE}/international-payment-consents/${consentId}/funds-confirmation`,
    );
  }

  async submitInternational(req: OBWriteInternational3): Promise<OBWriteInternationalResponse5> {
    const opts = await signedOpts(req, this.signer);
    return this.http.post(`${this.baseUrl}${PISP_BASE}/international-payments`, req, opts);
  }

  async getInternational(paymentId: string): Promise<OBWriteInternationalResponse5> {
    return this.http.get(`${this.baseUrl}${PISP_BASE}/international-payments/${paymentId}`);
  }

  async getInternationalDetails(paymentId: string): Promise<OBWritePaymentDetailsResponse1> {
    return this.http.get(
      `${this.baseUrl}${PISP_BASE}/international-payments/${paymentId}/payment-details`,
    );
  }

  async pollInternational(paymentId: string, opts: PollOptions = {}): Promise<OBWriteInternationalResponse5> {
    return this.poll(() => this.getInternational(paymentId), (r) => r.Data.Status, opts);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // INTERNATIONAL SCHEDULED PAYMENTS
  // ────────────────────────────────────────────────────────────────────────────

  async createInternationalScheduledConsent(
    req: OBWriteInternationalScheduledConsent5,
  ): Promise<OBWriteInternationalConsentResponse6> {
    const opts = await signedOpts(req, this.signer);
    return this.http.post(
      `${this.baseUrl}${PISP_BASE}/international-scheduled-payment-consents`,
      req,
      opts,
    );
  }

  async getInternationalScheduledConsent(consentId: string): Promise<OBWriteInternationalConsentResponse6> {
    return this.http.get(
      `${this.baseUrl}${PISP_BASE}/international-scheduled-payment-consents/${consentId}`,
    );
  }

  async deleteInternationalScheduledConsent(consentId: string): Promise<void> {
    return this.http.delete(
      `${this.baseUrl}${PISP_BASE}/international-scheduled-payment-consents/${consentId}`,
    );
  }

  async submitInternationalScheduled(req: OBWriteInternational3): Promise<OBWriteInternationalResponse5> {
    const opts = await signedOpts(req, this.signer);
    return this.http.post(`${this.baseUrl}${PISP_BASE}/international-scheduled-payments`, req, opts);
  }

  async getInternationalScheduled(paymentId: string): Promise<OBWriteInternationalResponse5> {
    return this.http.get(`${this.baseUrl}${PISP_BASE}/international-scheduled-payments/${paymentId}`);
  }

  async pollInternationalScheduled(paymentId: string, opts: PollOptions = {}): Promise<OBWriteInternationalResponse5> {
    return this.poll(() => this.getInternationalScheduled(paymentId), (r) => r.Data.Status, opts);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // INTERNATIONAL STANDING ORDERS
  // ────────────────────────────────────────────────────────────────────────────

  async createInternationalStandingOrderConsent(
    req: OBWriteInternationalStandingOrderConsent6,
  ): Promise<OBWriteInternationalConsentResponse6> {
    const opts = await signedOpts(req, this.signer);
    return this.http.post(
      `${this.baseUrl}${PISP_BASE}/international-standing-order-consents`,
      req,
      opts,
    );
  }

  async getInternationalStandingOrderConsent(consentId: string): Promise<OBWriteInternationalConsentResponse6> {
    return this.http.get(
      `${this.baseUrl}${PISP_BASE}/international-standing-order-consents/${consentId}`,
    );
  }

  async deleteInternationalStandingOrderConsent(consentId: string): Promise<void> {
    return this.http.delete(
      `${this.baseUrl}${PISP_BASE}/international-standing-order-consents/${consentId}`,
    );
  }

  async submitInternationalStandingOrder(req: OBWriteInternational3): Promise<OBWriteInternationalResponse5> {
    const opts = await signedOpts(req, this.signer);
    return this.http.post(`${this.baseUrl}${PISP_BASE}/international-standing-orders`, req, opts);
  }

  async getInternationalStandingOrder(paymentId: string): Promise<OBWriteInternationalResponse5> {
    return this.http.get(`${this.baseUrl}${PISP_BASE}/international-standing-orders/${paymentId}`);
  }

  async pollInternationalStandingOrder(paymentId: string, opts: PollOptions = {}): Promise<OBWriteInternationalResponse5> {
    return this.poll(() => this.getInternationalStandingOrder(paymentId), (r) => r.Data.Status, opts);
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async poll<T>(
    getFn: () => Promise<T>,
    statusFn: (result: T) => string,
    options: PollOptions,
  ): Promise<T> {
    const intervalMs = options.intervalMs ?? 3_000;
    const timeoutMs = options.timeoutMs ?? 300_000;
    const deadline = Date.now() + timeoutMs;

    while (true) {
      const result = await getFn();
      const status = statusFn(result) as Parameters<typeof isTerminalPaymentStatus>[0];
      if (isTerminalPaymentStatus(status)) return result;
      if (Date.now() >= deadline) throw new Error(`obie: payment polling timed out after ${timeoutMs}ms`);
      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
