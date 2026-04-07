import { importPKCS8, SignJWT } from "jose";
import { v4 as uuidv4 } from "uuid";
import { OBIESigningError } from "../errors";

const ASSERTION_TTL_SECONDS = 300; // 5 minutes

/**
 * Builds a signed RS256 `client_assertion` JWT for OAuth2 private_key_jwt
 * authentication as required by OBIE/FAPI.
 *
 * Claims: iss = sub = clientId, aud = tokenUrl, exp = now+5m, iat, jti
 */
export async function buildClientAssertion(params: {
  clientId: string;
  tokenUrl: string;
  privateKeyPem: string;
  signingKeyId?: string;
}): Promise<string> {
  const { clientId, tokenUrl, privateKeyPem, signingKeyId } = params;
  try {
    const privateKey = await importPKCS8(privateKeyPem, "RS256");
    const now = Math.floor(Date.now() / 1000);

    const builder = new SignJWT({
      iss: clientId,
      sub: clientId,
      aud: tokenUrl,
      exp: now + ASSERTION_TTL_SECONDS,
      iat: now,
      jti: uuidv4(),
    }).setProtectedHeader({
      alg: "RS256",
      ...(signingKeyId ? { kid: signingKeyId } : {}),
    });

    return await builder.sign(privateKey);
  } catch (err) {
    throw new OBIESigningError(err);
  }
}

/**
 * Parses the expiry claim from a JWT string without verifying the signature.
 * Returns null if the token cannot be decoded.
 * Uses standard Web API (atob) instead of Node Buffer — works in all runtimes.
 */
export function getJwtExpiry(token: string): Date | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) return null;

    // base64url → base64 → decode
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const jsonStr = atob(padded);

    const payload = JSON.parse(jsonStr) as unknown;
    if (
      typeof payload === "object" &&
      payload !== null &&
      "exp" in payload &&
      typeof (payload as Record<string, unknown>)["exp"] === "number"
    ) {
      return new Date(((payload as Record<string, unknown>)["exp"] as number) * 1000);
    }
    return null;
  } catch {
    return null;
  }
}
