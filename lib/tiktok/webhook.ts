/**
 * TikTok webhook event parsing.
 *
 * TikTok sends webhook events for messages, message status, and other
 * conversation events. This module parses the incoming webhook payload
 * into normalized events that the DM worker can process.
 *
 * Docs: https://developers.tiktok.com/doc/messaging-webhooks
 */

import { createHmac, timingSafeEqual } from "crypto";

export interface TikTokMessageEvent {
  openId: string; // TikTok user's open_id (app-scoped ID)
  messageId: string;
  messageText: string;
  timestamp: number;
}

export interface TikTokEvent {
  type: "message" | "message_status" | "other";
  openId?: string;
  messageId?: string;
  messageText?: string;
  timestamp?: number;
  raw?: unknown;
}

interface WebhookHeader {
  "tiktok-signature"?: string | null;
  "tiktok-timestamp"?: string | null;
}

interface TikTokWebhookPayload {
  event: string;
  timestamp: number;
  open_id?: string;
  message?: {
    message_id: string;
    text: string;
  };
  [key: string]: unknown;
}

/**
 * Verify TikTok webhook signature.
 * TikTok signs webhooks using the app secret as HMAC-SHA256.
 */
export function verifyTikTokWebhookSignature(
  payload: string,
  headers: WebhookHeader
): boolean {
  const signature = headers["tiktok-signature"];
  const timestamp = headers["tiktok-timestamp"];
  const secret = process.env.TIKTOK_APP_SECRET;

  if (!signature || !timestamp || !secret) return false;

  // TikTok signs: timestamp + payload body
  const signedPayload = `${timestamp}.${payload}`;
  const expected =
    "sha256=" +
    createHmac("sha256", secret).update(signedPayload).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

/**
 * Parse TikTok webhook payload into normalized events.
 */
export function parseTikTokWebhookEvents(
  payload: unknown
): TikTokEvent[] {
  const events: TikTokEvent[] = [];

  if (!payload || typeof payload !== "object") return events;

  const p = payload as TikTokWebhookPayload;
  const eventType = p.event;

  if (eventType === "message" && p.message) {
    events.push({
      type: "message",
      openId: p.open_id,
      messageId: p.message.message_id,
      messageText: p.message.text,
      timestamp: p.timestamp,
      raw: p,
    });
  } else if (eventType === "message_status") {
    events.push({
      type: "message_status",
      openId: p.open_id,
      messageId: p.message?.message_id,
      raw: p,
    });
  } else {
    events.push({ type: "other", raw: p });
  }

  return events;
}