import { v4 as uuidv4 } from "uuid";
import { signDetachedJws } from "../signing/jws";
import { isTerminalPaymentStatus } from "../types/enums";
import type { HttpClient } from "../http/client";
import type {
  OBDomesticVRPConsentRequest,
  OBDomesticVRPConsentResponse,
  OBDomesticVRPRequest,
  OBDomesticVRPResponse,
} from "../types/aisp";
import type { OBWriteFundsConfirmationResponse1 } from "../types/payments";

const VRP_BASE = "/open-banking/v3.1/vrp";

interface SignerConfig {
  privateKeyPem: string;
  signingKeyId: string;
}

/**
 * OBIE Variable Recurring Payments (VRP) service.
 */
export class VRPService {
  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
    private readonly signer: SignerConfig,
  ) {}

  async createConsent(req: OBDomesticVRPConsentRequest): Promise<OBDomesticVRPConsentResponse> {
    const jwsSignature = await signDetachedJws(req, this.signer);
    return this.http.post(`${this.baseUrl}${VRP_BASE}/domestic-vrp-consents`, req, {
      idempotencyKey: uuidv4(),
      jwsSignature,
    });
  }

  async getConsent(consentId: string): Promise<OBDomesticVRPConsentResponse> {
    return this.http.get(`${this.baseUrl}${VRP_BASE}/domestic-vrp-consents/${consentId}`);
  }

  async deleteConsent(consentId: string): Promise<void> {
    return this.http.delete(`${this.baseUrl}${VRP_BASE}/domestic-vrp-consents/${consentId}`);
  }

  async getConsentFundsConfirmation(consentId: string): Promise<OBWriteFundsConfirmationResponse1> {
    return this.http.get(
      `${this.baseUrl}${VRP_BASE}/domestic-vrp-consents/${consentId}/funds-confirmation`,
    );
  }

  async submit(req: OBDomesticVRPRequest): Promise<OBDomesticVRPResponse> {
    const jwsSignature = await signDetachedJws(req, this.signer);
    return this.http.post(`${this.baseUrl}${VRP_BASE}/domestic-vrps`, req, {
      idempotencyKey: uuidv4(),
      jwsSignature,
    });
  }

  async get(vrpId: string): Promise<OBDomesticVRPResponse> {
    return this.http.get(`${this.baseUrl}${VRP_BASE}/domestic-vrps/${vrpId}`);
  }

  async getDetails(vrpId: string): Promise<OBDomesticVRPResponse> {
    return this.http.get(`${this.baseUrl}${VRP_BASE}/domestic-vrps/${vrpId}/payment-details`);
  }

  async poll(
    vrpId: string,
    options: { intervalMs?: number; timeoutMs?: number } = {},
  ): Promise<OBDomesticVRPResponse> {
    const intervalMs = options.intervalMs ?? 3_000;
    const timeoutMs = options.timeoutMs ?? 300_000;
    const deadline = Date.now() + timeoutMs;

    while (true) {
      const result = await this.get(vrpId);
      const status = result.Data.Status as Parameters<typeof isTerminalPaymentStatus>[0];
      if (isTerminalPaymentStatus(status)) return result;
      if (Date.now() >= deadline) throw new Error(`obie: VRP polling timed out after ${timeoutMs}ms`);
      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
