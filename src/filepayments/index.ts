import { v4 as uuidv4 } from "uuid";
import { signDetachedJws } from "../signing/jws";
import type { HttpClient } from "../http/client";
import type {
  OBWriteFileConsent3,
  OBWriteFileConsentResponse4,
  OBWriteFile2,
  OBWriteFileResponse3,
} from "../types/aisp";

const PISP_BASE = "/open-banking/v3.1/pisp";

interface SignerConfig {
  privateKeyPem: string;
  signingKeyId: string;
}

const TERMINAL = new Set(["InitiationCompleted", "InitiationFailed", "Rejected"]);

/**
 * OBIE File Payment service — bulk payment file upload and submission.
 */
export class FilePaymentsService {
  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
    private readonly signer: SignerConfig,
  ) {}

  async createConsent(req: OBWriteFileConsent3): Promise<OBWriteFileConsentResponse4> {
    const jwsSignature = await signDetachedJws(req, this.signer);
    return this.http.post(`${this.baseUrl}${PISP_BASE}/file-payment-consents`, req, {
      idempotencyKey: uuidv4(),
      jwsSignature,
    });
  }

  async getConsent(consentId: string): Promise<OBWriteFileConsentResponse4> {
    return this.http.get(`${this.baseUrl}${PISP_BASE}/file-payment-consents/${consentId}`);
  }

  /** Uploads the raw payment file to an authorised consent. */
  async uploadFile(consentId: string, fileBytes: ArrayBuffer, contentType: string): Promise<void> {
    await this.http.postRaw(
      `${this.baseUrl}${PISP_BASE}/file-payment-consents/${consentId}/file`,
      fileBytes,
      contentType,
      { idempotencyKey: uuidv4() },
    );
  }

  /** Downloads the uploaded payment file. */
  async downloadFile(consentId: string): Promise<ArrayBuffer> {
    return this.http.getRaw(
      `${this.baseUrl}${PISP_BASE}/file-payment-consents/${consentId}/file`,
    );
  }

  async submit(req: OBWriteFile2): Promise<OBWriteFileResponse3> {
    const jwsSignature = await signDetachedJws(req, this.signer);
    return this.http.post(`${this.baseUrl}${PISP_BASE}/file-payments`, req, {
      idempotencyKey: uuidv4(),
      jwsSignature,
    });
  }

  async get(filePaymentId: string): Promise<OBWriteFileResponse3> {
    return this.http.get(`${this.baseUrl}${PISP_BASE}/file-payments/${filePaymentId}`);
  }

  async getDetails(filePaymentId: string): Promise<OBWriteFileResponse3> {
    return this.http.get(`${this.baseUrl}${PISP_BASE}/file-payments/${filePaymentId}/payment-details`);
  }

  /** Downloads the result report after payment processing. */
  async getReport(filePaymentId: string): Promise<ArrayBuffer> {
    return this.http.getRaw(
      `${this.baseUrl}${PISP_BASE}/file-payments/${filePaymentId}/report-file`,
    );
  }

  async poll(
    filePaymentId: string,
    options: { intervalMs?: number; timeoutMs?: number } = {},
  ): Promise<OBWriteFileResponse3> {
    const intervalMs = options.intervalMs ?? 5_000;
    const timeoutMs = options.timeoutMs ?? 600_000;
    const deadline = Date.now() + timeoutMs;

    while (true) {
      const result = await this.get(filePaymentId);
      if (TERMINAL.has(result.Data.Status)) return result;
      if (Date.now() >= deadline) throw new Error(`obie: file payment polling timed out after ${timeoutMs}ms`);
      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
