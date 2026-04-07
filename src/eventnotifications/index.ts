import { v4 as uuidv4 } from "uuid";
import type { HttpClient } from "../http/client";
import type {
  OBEventSubscription1,
  OBEventSubscriptionResponse1,
} from "../types/aisp";

const EN_BASE = "/open-banking/v3.1";

/**
 * OBIE Event Notification service.
 * Manages subscriptions, callback URLs, and aggregated polling.
 */
export class EventNotificationsService {
  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
  ) {}

  // ── Event Subscriptions ───────────────────────────────────────────────────

  async createSubscription(req: OBEventSubscription1): Promise<OBEventSubscriptionResponse1> {
    return this.http.post(`${this.baseUrl}${EN_BASE}/event-subscriptions`, req, {
      idempotencyKey: uuidv4(),
    });
  }

  async listSubscriptions(): Promise<{ Data: { EventSubscription: OBEventSubscriptionResponse1["Data"][] }; Links: unknown; Meta: unknown }> {
    return this.http.get(`${this.baseUrl}${EN_BASE}/event-subscriptions`);
  }

  async updateSubscription(
    subscriptionId: string,
    req: OBEventSubscription1,
  ): Promise<OBEventSubscriptionResponse1> {
    return this.http.put(`${this.baseUrl}${EN_BASE}/event-subscriptions/${subscriptionId}`, req);
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    return this.http.delete(`${this.baseUrl}${EN_BASE}/event-subscriptions/${subscriptionId}`);
  }

  // ── Callback URLs ─────────────────────────────────────────────────────────

  async createCallbackUrl(req: { Data: { Url: string; Version: string } }): Promise<unknown> {
    return this.http.post(`${this.baseUrl}${EN_BASE}/callback-urls`, req, {
      idempotencyKey: uuidv4(),
    });
  }

  async listCallbackUrls(): Promise<unknown> {
    return this.http.get(`${this.baseUrl}${EN_BASE}/callback-urls`);
  }

  async updateCallbackUrl(callbackUrlId: string, req: { Data: { Url: string; Version: string } }): Promise<unknown> {
    return this.http.put(`${this.baseUrl}${EN_BASE}/callback-urls/${callbackUrlId}`, req);
  }

  async deleteCallbackUrl(callbackUrlId: string): Promise<void> {
    return this.http.delete(`${this.baseUrl}${EN_BASE}/callback-urls/${callbackUrlId}`);
  }

  // ── Aggregated Polling ────────────────────────────────────────────────────

  /**
   * POST /events — aggregated event polling.
   *
   * @param ack - JTIs to acknowledge (processed without error).
   * @param setErrs - Map of JTI → error for events that failed processing.
   */
  async pollEvents(
    ack: string[] = [],
    setErrs: Record<string, { err: string; description: string }> = {},
    options: { maxEvents?: number; returnImmediately?: boolean } = {},
  ): Promise<{ sets: Record<string, string>; moreAvailable: boolean }> {
    const body: Record<string, unknown> = {
      maxEvents: options.maxEvents ?? 10,
      returnImmediately: options.returnImmediately ?? true,
    };
    if (ack.length > 0) body["ack"] = ack;
    if (Object.keys(setErrs).length > 0) body["setErrs"] = setErrs;
    return this.http.post(`${this.baseUrl}${EN_BASE}/events`, body);
  }
}
