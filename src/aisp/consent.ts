import type { HttpClient } from "../http/client";
import type {
  OBReadConsent1,
  OBReadConsentResponse1,
} from "../types/aisp";

const AIS_BASE = "/open-banking/v3.1/aisp";

/**
 * OBIE Account Access Consent service.
 *
 * Must be called before any AIS resource reads to establish PSU consent.
 * Spec: POST/GET/DELETE /account-access-consents
 */
export class AISConsentService {
  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
  ) {}

  /**
   * Creates a new account-access-consent.
   * POST /account-access-consents
   */
  async create(req: OBReadConsent1): Promise<OBReadConsentResponse1> {
    return this.http.post<OBReadConsentResponse1>(
      `${this.baseUrl}${AIS_BASE}/account-access-consents`,
      req,
    );
  }

  /**
   * Retrieves an account-access-consent by ConsentId.
   * GET /account-access-consents/{ConsentId}
   */
  async get(consentId: string): Promise<OBReadConsentResponse1> {
    return this.http.get<OBReadConsentResponse1>(
      `${this.baseUrl}${AIS_BASE}/account-access-consents/${consentId}`,
    );
  }

  /**
   * Deletes (revokes) an account-access-consent.
   * DELETE /account-access-consents/{ConsentId}
   */
  async delete(consentId: string): Promise<void> {
    return this.http.delete(
      `${this.baseUrl}${AIS_BASE}/account-access-consents/${consentId}`,
    );
  }

  /**
   * Polls the consent until "Authorised", a terminal rejection, or timeout.
   */
  async pollUntilAuthorised(
    consentId: string,
    options: { intervalMs?: number; timeoutMs?: number } = {},
  ): Promise<OBReadConsentResponse1> {
    const intervalMs = options.intervalMs ?? 2_000;
    const timeoutMs = options.timeoutMs ?? 120_000;
    const deadline = Date.now() + timeoutMs;

    while (true) {
      const consent = await this.get(consentId);
      const status = consent.Data.Status;

      if (status === "Authorised") return consent;
      if (status === "Rejected" || status === "Revoked") {
        throw new Error(`obie: consent ${consentId} is ${status}`);
      }
      if (Date.now() >= deadline) {
        throw new Error(`obie: consent ${consentId} polling timed out after ${timeoutMs}ms`);
      }

      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
