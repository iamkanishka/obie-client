import { v4 as uuidv4 } from "uuid";
import type { HttpClient } from "../http/client";
import type {
  OBFundsConfirmationConsent1,
  OBFundsConfirmationConsentResponse1,
  OBFundsConfirmation1,
} from "../types/aisp";
import type { OBWriteFundsConfirmationResponse1 } from "../types/payments";

const CBPII_BASE = "/open-banking/v3.1/cbpii";

/**
 * OBIE Confirmation of Funds (CBPII) service.
 */
export class FundsService {
  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
  ) {}

  async createConsent(req: OBFundsConfirmationConsent1): Promise<OBFundsConfirmationConsentResponse1> {
    return this.http.post(`${this.baseUrl}${CBPII_BASE}/funds-confirmation-consents`, req, {
      idempotencyKey: uuidv4(),
    });
  }

  async getConsent(consentId: string): Promise<OBFundsConfirmationConsentResponse1> {
    return this.http.get(`${this.baseUrl}${CBPII_BASE}/funds-confirmation-consents/${consentId}`);
  }

  async deleteConsent(consentId: string): Promise<void> {
    return this.http.delete(`${this.baseUrl}${CBPII_BASE}/funds-confirmation-consents/${consentId}`);
  }

  async confirm(req: OBFundsConfirmation1): Promise<OBWriteFundsConfirmationResponse1> {
    return this.http.post(`${this.baseUrl}${CBPII_BASE}/funds-confirmations`, req, {
      idempotencyKey: uuidv4(),
    });
  }
}
