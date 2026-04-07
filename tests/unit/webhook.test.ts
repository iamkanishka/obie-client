import { WebhookHandler } from "../../src/webhook";
import { jest, describe, it, expect } from "@jest/globals";

// Mock JWS verification
jest.mock("../../src/signing/jws", () => ({
  verifyDetachedJws: jest.fn().mockResolvedValue(true),
  signDetachedJws: jest.fn().mockResolvedValue("header..sig"),
}));

import { verifyDetachedJws } from "../../src/signing/jws";

const EVENT_BODY = JSON.stringify({
  iss: "https://aspsp.example.com",
  events: {
    "urn:uk:org:openbanking:events:resource-update": {
      subject: { http_status: 200, http_method: "PATCH" },
    },
  },
});

describe("WebhookHandler", () => {
  describe("handle without JWS verification", () => {
    it("returns 200 for valid JSON body", async () => {
      const handler = new WebhookHandler({});
      const result = await handler.handle(new TextEncoder().encode(EVENT_BODY), undefined);
      expect(result.statusCode).toBe(200);
    });

    it("returns 400 for non-JSON body", async () => {
      const handler = new WebhookHandler({});
      const result = await handler.handle(new TextEncoder().encode("not-json"), undefined);
      expect(result.statusCode).toBe(400);
    });

    it("calls onEvent handler for each received event", async () => {
      const onEvent = jest.fn();
      const handler = new WebhookHandler({ onEvent });
      await handler.handle(new TextEncoder().encode(EVENT_BODY), undefined);
      expect(onEvent).toHaveBeenCalledTimes(1);
      expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ events: expect.anything() }));
    });

    it("calls onError handler on failure", async () => {
      const onError = jest.fn();
      const handler = new WebhookHandler({ onError });
      await handler.handle(new TextEncoder().encode("{{bad json}}"), undefined);
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe("handle with JWS verification", () => {
    it("verifies signature when aspspPublicKeyPem is set", async () => {
      const handler = new WebhookHandler({ aspspPublicKeyPem: "---pem---" });
      await handler.handle(new TextEncoder().encode(EVENT_BODY), "header..sig");
      expect(verifyDetachedJws).toHaveBeenCalled();
    });

    it("returns 400 when signature verification fails", async () => {
      (verifyDetachedJws as jest.Mock).mockResolvedValueOnce(false);
      const handler = new WebhookHandler({ aspspPublicKeyPem: "---pem---" });
      const result = await handler.handle(new TextEncoder().encode(EVENT_BODY), "bad-sig");
      expect(result.statusCode).toBe(400);
    });
  });

  describe("on / onAny dispatch", () => {
    it("dispatches to specific event type handler", async () => {
      const specificHandler = jest.fn();
      const handler = new WebhookHandler({});
      handler.on("urn:uk:org:openbanking:events:resource-update", specificHandler);
      await handler.handle(new TextEncoder().encode(EVENT_BODY), undefined);
      expect(specificHandler).toHaveBeenCalledTimes(1);
    });

    it("dispatches to wildcard handler when no specific handler", async () => {
      const wildcard = jest.fn();
      const handler = new WebhookHandler({});
      handler.onAny(wildcard);
      await handler.handle(new TextEncoder().encode(EVENT_BODY), undefined);
      expect(wildcard).toHaveBeenCalledTimes(1);
    });

    it("specific handler takes priority over wildcard", async () => {
      const specific = jest.fn();
      const wildcard = jest.fn();
      const handler = new WebhookHandler({});
      handler.on("urn:uk:org:openbanking:events:resource-update", specific);
      handler.onAny(wildcard);
      await handler.handle(new TextEncoder().encode(EVENT_BODY), undefined);
      expect(specific).toHaveBeenCalledTimes(1);
      expect(wildcard).not.toHaveBeenCalled();
    });

    it("calls wildcard for event without events map", async () => {
      const wildcard = jest.fn();
      const handler = new WebhookHandler({});
      handler.onAny(wildcard);
      const bodyNoEvents = JSON.stringify({ iss: "aspsp", sub: "test" });
      await handler.handle(new TextEncoder().encode(bodyNoEvents), undefined);
      expect(wildcard).toHaveBeenCalledTimes(1);
    });

    it("on returns this for method chaining", () => {
      const handler = new WebhookHandler({});
      expect(handler.on("event-type", jest.fn())).toBe(handler);
    });

    it("onAny returns this for method chaining", () => {
      const handler = new WebhookHandler({});
      expect(handler.onAny(jest.fn())).toBe(handler);
    });
  });

  describe("string body", () => {
    it("handles string body as well as Uint8Array", async () => {
      const onEvent = jest.fn();
      const handler = new WebhookHandler({ onEvent });
      const result = await handler.handle(EVENT_BODY, undefined);
      expect(result.statusCode).toBe(200);
      expect(onEvent).toHaveBeenCalledTimes(1);
    });
  });
});
