import { verifyDetachedJws } from "../signing/jws";

export type WebhookEventHandler = (event: unknown) => void | Promise<void>;
export type WebhookErrorHandler = (error: unknown, rawBody: string) => void | Promise<void>;

export interface WebhookHandlerOptions {
  /** PEM-encoded ASPSP signing public key for JWS verification. */
  aspspPublicKeyPem?: string;
  onEvent?: WebhookEventHandler;
  onError?: WebhookErrorHandler;
}

/**
 * Handles incoming OBIE real-time event notifications.
 *
 * ASPSPs POST signed JWTs (SET — Security Event Tokens) to your callback URL.
 * This handler verifies the `x-jws-signature` header and dispatches events.
 *
 * @example
 * ```typescript
 * // Express
 * const handler = new WebhookHandler({
 *   aspspPublicKeyPem: fs.readFileSync("aspsp_public.pem", "utf8"),
 *   onEvent: async (event) => {
 *     await processEvent(event);
 *   },
 * });
 *
 * app.post("/webhooks/obie", express.raw({ type: "*\/*" }), async (req, res) => {
 *   const result = await handler.handle(
 *     req.body as Uint8Array,
 *     req.headers["x-jws-signature"] as string | undefined,
 *   );
 *   res.status(result.statusCode).end();
 * });
 * ```
 */
export class WebhookHandler {
  private readonly options: WebhookHandlerOptions;
  private readonly handlers = new Map<string, WebhookEventHandler>();

  constructor(options: WebhookHandlerOptions = {}) {
    this.options = options;
  }

  /** Registers a handler for a specific event type URN. */
  public on(eventType: string, handler: WebhookEventHandler): this {
    this.handlers.set(eventType, handler);
    return this;
  }

  /** Registers a wildcard handler called for every event. */
  public onAny(handler: WebhookEventHandler): this {
    this.handlers.set("*", handler);
    return this;
  }

  /**
   * Processes an incoming webhook request body.
   *
   * @param rawBody - The raw request body as Uint8Array (binary) or string.
   * @param jwsSignature - The x-jws-signature header value.
   * @returns Object with `statusCode` (200 on success, 400 on failure).
   */
  public async handle(
    rawBody: Uint8Array | string,
    jwsSignature: string | undefined,
  ): Promise<{ statusCode: number; body: string }> {
    const bodyStr = typeof rawBody === "string" ? rawBody : new TextDecoder().decode(rawBody);

    try {
      // Verify JWS signature if public key is configured
      if (this.options.aspspPublicKeyPem && jwsSignature) {
        let bodyJson: unknown;
        try {
          bodyJson = JSON.parse(bodyStr);
        } catch {
          bodyJson = bodyStr;
        }

        const valid = await verifyDetachedJws(jwsSignature, bodyJson, this.options.aspspPublicKeyPem);
        if (!valid) {
          throw new Error("JWS signature verification failed");
        }
      }

      const event = JSON.parse(bodyStr) as unknown;

      // Dispatch to registered handlers
      await this.dispatch(event);

      // Call global handler
      if (this.options.onEvent) {
        await this.options.onEvent(event);
      }

      return { statusCode: 200, body: "" };
    } catch (err) {
      if (this.options.onError) {
        await this.options.onError(err, bodyStr);
      }
      return { statusCode: 400, body: "Bad Request" };
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async dispatch(event: unknown): Promise<void> {
    if (typeof event !== "object" || event === null) return;

    const eventsMap = (event as Record<string, unknown>)["events"];
    if (typeof eventsMap !== "object" || eventsMap === null) {
      // No typed events — call wildcard handler if registered
      const wildcard = this.handlers.get("*");
      if (wildcard) await wildcard(event);
      return;
    }

    for (const eventType of Object.keys(eventsMap)) {
      const handler = this.handlers.get(eventType) ?? this.handlers.get("*");
      if (handler) await handler(event);
    }
  }
}
