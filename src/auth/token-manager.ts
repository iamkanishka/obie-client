import { buildClientAssertion } from "./jwt";
import { OBIETokenError } from "../errors";
import type { ResolvedConfig } from "../config";

const EXPIRY_BUFFER_MS = 30_000; // refresh 30 s before expiry

interface TokenCache {
  accessToken: string;
  expiresAt: number; // ms since epoch
}

/**
 * OAuth2 client-credentials token manager with automatic refresh.
 *
 * Thread-safe via a single in-flight promise: concurrent callers share
 * one token fetch and receive the same result.
 */
export class TokenManager {
  private cache: TokenCache | null = null;
  private inFlight: Promise<string> | null = null;
  private readonly cfg: ResolvedConfig;

  constructor(cfg: ResolvedConfig) {
    this.cfg = cfg;
  }

  /** Returns a valid access token, fetching one if needed. */
  public async accessToken(): Promise<string> {
    if (this.cache !== null && Date.now() < this.cache.expiresAt - EXPIRY_BUFFER_MS) {
      return this.cache.accessToken;
    }

    // Deduplicate concurrent refresh requests
    if (this.inFlight !== null) return this.inFlight;

    this.inFlight = this.fetchToken().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  /** Clears the cached token, forcing a fresh fetch on the next call. */
  public invalidate(): void {
    this.cache = null;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async fetchToken(): Promise<string> {
    const assertion = await buildClientAssertion({
      clientId: this.cfg.clientId,
      tokenUrl: this.cfg.tokenUrl,
      privateKeyPem: this.cfg.privateKeyPem,
      signingKeyId: this.cfg.signingKeyId,
    });

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: assertion,
      scope: this.cfg.scopes.join(" "),
    });

    let response: Response;
    try {
      response = await this.cfg.fetch(this.cfg.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: AbortSignal.timeout(this.cfg.timeoutMs),
      });
    } catch (err) {
      throw new OBIETokenError("token endpoint request failed", err);
    }

    const text = await response.text();
    if (!response.ok) {
      throw new OBIETokenError(
        `token endpoint returned ${response.status}: ${text.slice(0, 200)}`,
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new OBIETokenError("token endpoint returned non-JSON response");
    }

    if (
      typeof data !== "object" ||
      data === null ||
      !("access_token" in data) ||
      typeof (data as Record<string, unknown>)["access_token"] !== "string"
    ) {
      throw new OBIETokenError("token endpoint response missing access_token");
    }

    const tokenData = data as { access_token: string; expires_in?: number };
    const expiresIn = tokenData.expires_in ?? 3600;

    this.cache = {
      accessToken: tokenData.access_token,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    this.cfg.logger.debug("obie: token refreshed, expires in", expiresIn, "s");

    return this.cache.accessToken;
  }
}
