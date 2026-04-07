import { OBIEConfigError } from "./errors";

/** Target environment. */
export type Environment = "sandbox" | "production";

/** Pluggable logger interface. */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/** Called before every outgoing HTTP request. */
export type RequestHook = (request: Request) => void | Promise<void>;

/** Called after every HTTP response is received. */
export type ResponseHook = (request: Request, response: Response) => void | Promise<void>;

/**
 * Complete configuration for an ObieClient instance.
 *
 * Required fields: `clientId`, `tokenUrl`, `privateKeyPem`
 */
export interface ObieClientConfig {
  /** Target environment. Defaults to "sandbox". */
  environment?: Environment;
  /** Override the base URL instead of using the derived environment URL. */
  baseUrl?: string;
  /** OAuth2 token endpoint of the ASPSP (required). */
  tokenUrl: string;
  /** Software client ID from the Open Banking Directory (required). */
  clientId: string;
  /** PEM-encoded RSA private key for JWT signing (required). */
  privateKeyPem: string;
  /** PEM-encoded transport certificate for mTLS. */
  certificatePem?: string;
  /** `kid` placed in JWS/JWT headers. */
  signingKeyId?: string;
  /** `x-fapi-financial-id` header value (ASPSP-specific). */
  financialId?: string;
  /** PSU IP address injected as `x-fapi-customer-ip-address`. Omit for M2M flows. */
  customerIpAddress?: string;
  /** OAuth2 scopes. Defaults to ["accounts","payments","fundsconfirmations"]. */
  scopes?: string[];
  /** HTTP request timeout in milliseconds. Defaults to 30000. */
  timeoutMs?: number;
  /** Number of retries on transient failures. Defaults to 3. */
  maxRetries?: number;
  /** Pluggable logger. Defaults to no-op. */
  logger?: Logger;
  /** Hooks called before each outgoing request. */
  requestHooks?: RequestHook[];
  /** Hooks called after each response. */
  responseHooks?: ResponseHook[];
  /** Custom fetch implementation. Defaults to global fetch (Node 18+). */
  fetch?: typeof fetch;
}

/** Resolved config with all defaults applied. */
export interface ResolvedConfig extends Required<ObieClientConfig> {
  readonly baseUrl: string;
}

const SANDBOX_BASE_URL = "https://sandbox.token.io";
const PRODUCTION_BASE_URL = "https://api.token.io";

const NO_OP_LOGGER: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

/** Validates and resolves an ObieClientConfig, applying defaults. */
export function resolveConfig(config: ObieClientConfig): ResolvedConfig {
  if (!config.clientId || config.clientId.trim() === "") {
    throw new OBIEConfigError("clientId", "must not be empty");
  }
  if (!config.tokenUrl || config.tokenUrl.trim() === "") {
    throw new OBIEConfigError("tokenUrl", "must not be empty");
  }
  if (!config.privateKeyPem || config.privateKeyPem.trim() === "") {
    throw new OBIEConfigError("privateKeyPem", "must not be empty");
  }

  const environment = config.environment ?? "sandbox";
  const baseUrl =
    config.baseUrl ??
    (environment === "production" ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL);

  return {
    environment,
    baseUrl,
    tokenUrl: config.tokenUrl,
    clientId: config.clientId,
    privateKeyPem: config.privateKeyPem,
    certificatePem: config.certificatePem ?? "",
    signingKeyId: config.signingKeyId ?? "",
    financialId: config.financialId ?? "",
    customerIpAddress: config.customerIpAddress ?? "",
    scopes: config.scopes ?? ["accounts", "payments", "fundsconfirmations"],
    timeoutMs: config.timeoutMs ?? 30_000,
    maxRetries: config.maxRetries ?? 3,
    logger: config.logger ?? NO_OP_LOGGER,
    requestHooks: config.requestHooks ?? [],
    responseHooks: config.responseHooks ?? [],
    fetch: config.fetch ?? fetch,
  };
}
