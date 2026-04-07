import type { OBError, OBErrorDetail } from "./types/index.js";

/**
 * Thrown when the OBIE API returns a 4xx or 5xx response.
 */
export class OBIEApiError extends Error {
  public readonly statusCode: number;
  public readonly obError: OBError | null;
  public readonly body: string;
  public readonly interactionId: string | null;

  constructor(params: {
    statusCode: number;
    obError: OBError | null;
    body: string;
    interactionId: string | null;
  }) {
    const msg =
      params.obError != null
        ? `OBIE API error ${params.statusCode}: ${obErrorSummary(params.obError)}`
        : `OBIE API error ${params.statusCode}: ${params.body.slice(0, 200)}`;
    super(msg);
    this.name = "OBIEApiError";
    this.statusCode = params.statusCode;
    this.obError = params.obError;
    this.body = params.body;
    this.interactionId = params.interactionId;
    Object.setPrototypeOf(this, OBIEApiError.prototype);
  }

  /** Returns true if any OBErrorDetail has the given OBIE error code. */
  public hasErrorCode(code: string): boolean {
    return this.obError?.Errors?.some((e) => e.ErrorCode === code) ?? false;
  }

  /** Returns true if this error is worth retrying (5xx or transport). */
  public isRetryable(): boolean {
    return this.statusCode >= 500;
  }
}

/** Thrown when the client configuration is invalid. */
export class OBIEConfigError extends Error {
  public readonly field: string;

  constructor(field: string, message: string) {
    super(`OBIE config error — ${field}: ${message}`);
    this.name = "OBIEConfigError";
    this.field = field;
    Object.setPrototypeOf(this, OBIEConfigError.prototype);
  }
}

/** Thrown when JWS/JWT signing fails. */
export class OBIESigningError extends Error {
  constructor(cause: unknown) {
    super(`OBIE signing error: ${String(cause)}`);
    this.name = "OBIESigningError";
    if (cause instanceof Error) this.cause = cause;
    Object.setPrototypeOf(this, OBIESigningError.prototype);
  }
}

/** Thrown when an OAuth2 token cannot be obtained or refreshed. */
export class OBIETokenError extends Error {
  constructor(message: string, cause?: unknown) {
    super(`OBIE token error: ${message}`);
    this.name = "OBIETokenError";
    if (cause instanceof Error) this.cause = cause;
    Object.setPrototypeOf(this, OBIETokenError.prototype);
  }
}

/** Thrown when the circuit breaker is open and rejecting requests. */
export class OBIECircuitOpenError extends Error {
  constructor() {
    super("OBIE circuit breaker is open — request rejected");
    this.name = "OBIECircuitOpenError";
    Object.setPrototypeOf(this, OBIECircuitOpenError.prototype);
  }
}

/** Thrown when all retries are exhausted. */
export class OBIERetryExhaustedError extends Error {
  public readonly lastError: unknown;

  constructor(attempts: number, lastError: unknown) {
    super(`OBIE all ${attempts} retries exhausted`);
    this.name = "OBIERetryExhaustedError";
    this.lastError = lastError;
    Object.setPrototypeOf(this, OBIERetryExhaustedError.prototype);
  }
}

/** Thrown when a validation check fails before sending a request. */
export class OBIEValidationError extends Error {
  public readonly fields: Array<{ field: string; message: string }>;

  constructor(fields: Array<{ field: string; message: string }>) {
    super(`OBIE validation failed: ${fields.map((f) => `${f.field}: ${f.message}`).join("; ")}`);
    this.name = "OBIEValidationError";
    this.fields = fields;
    Object.setPrototypeOf(this, OBIEValidationError.prototype);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function obErrorSummary(err: OBError): string {
  const details = err.Errors?.map((e: OBErrorDetail) => e.Message).join(", ");
  return details ? `${err.Code}: ${details}` : (err.Message ?? err.Code);
}

export function parseApiError(
  statusCode: number,
  body: string,
  interactionId: string | null,
): OBIEApiError {
  let obError: OBError | null = null;
  try {
    const parsed = JSON.parse(body) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "Code" in parsed &&
      typeof (parsed as Record<string, unknown>)["Code"] === "string"
    ) {
      obError = parsed as OBError;
    }
  } catch {
    // body is not JSON — leave obError null
  }
  return new OBIEApiError({ statusCode, obError, body, interactionId });
}
