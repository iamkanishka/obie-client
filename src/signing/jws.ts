import { importPKCS8 } from "jose";
import { OBIESigningError } from "../errors";

/**
 * Produces a detached JWS signature over a JSON payload per the OBIE signing
 * profile (RFC 7797, b64=false).
 *
 * The returned string is the value of the `x-jws-signature` HTTP header:
 *   `<base64url(header)>..<base64url(signature)>`
 */
export async function signDetachedJws(
  payload: unknown,
  params: { privateKeyPem: string; signingKeyId: string },
): Promise<string> {
  const { privateKeyPem, signingKeyId } = params;

  try {
    const payloadJson = JSON.stringify(payload);

    const header = { alg: "RS256", kid: signingKeyId, b64: false, crit: ["b64"] };
    const headerB64 = base64urlEncode(JSON.stringify(header));

    // Signing input = ASCII(BASE64URL(header)) + '.' + raw payload
    const signingInputStr = `${headerB64}.${payloadJson}`;
    const signingInputBytes = strToArrayBuffer(signingInputStr);

    const privateKey = await importPKCS8(privateKeyPem, "RS256");

    // Reach through jose's KeyObject wrapper to the underlying CryptoKey
    const cryptoKey = (
      (privateKey as Record<string, unknown>)["keyObject"] ??
      (privateKey as unknown)
    ) as CryptoKey;

    const signatureBuffer = await crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
      cryptoKey,
      signingInputBytes,
    );

    const sigB64 = base64urlEncodeBuffer(signatureBuffer);
    return `${headerB64}..${sigB64}`;
  } catch (err) {
    if (err instanceof OBIESigningError) throw err;
    throw new OBIESigningError(err);
  }
}

/**
 * Verifies a detached JWS signature against a JSON payload.
 */
export async function verifyDetachedJws(
  jws: string,
  payload: unknown,
  publicKeyPem: string,
): Promise<boolean> {
  try {
    const parts = jws.split("..");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return false;

    const [headerB64, sigB64] = parts as [string, string];
    const payloadJson = JSON.stringify(payload);
    const signingInput = `${headerB64}.${payloadJson}`;

    const signingInputBuffer = strToArrayBuffer(signingInput);
    const signatureBuffer = base64urlDecodeToBuffer(sigB64);
    const spkiBuffer = pemToArrayBuffer(publicKeyPem);

    const key = await crypto.subtle.importKey(
      "spki",
      spkiBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
      false,
      ["verify"],
    );

    return await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      signatureBuffer,
      signingInputBuffer,
    );
  } catch {
    return false;
  }
}

// ── Helpers (all return plain ArrayBuffer to satisfy SubtleCrypto's BufferSource) ──

/** Encode a string to a plain ArrayBuffer (avoids Uint8Array<ArrayBufferLike> issue). */
function strToArrayBuffer(str: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(str);
  // Slice to guarantee a plain ArrayBuffer (not SharedArrayBuffer)
  return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength);
}

/** base64url-encode a string to a base64url string. */
function base64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** base64url-encode an ArrayBuffer to a base64url string. */
function base64urlEncodeBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** base64url-decode to a plain ArrayBuffer. */
function base64urlDecodeToBuffer(input: string): ArrayBuffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer.slice(0); // plain ArrayBuffer
}

/** PEM → plain ArrayBuffer (strips header/footer lines). */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const lines = pem.split("\n").filter((l) => !l.startsWith("-----"));
  const binary = atob(lines.join(""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer.slice(0); // plain ArrayBuffer
}
