/**
 * TikTok for Business — Message API client.
 *
 * Sends direct messages to TikTok users via the TikTok Messaging API.
 * Requires the `message.send` scope on the TikTok app.
 *
 * Docs: https://developers.tiktok.com/doc/messaging-api-basics
 */

import { getMetaGraphApiVersion, requireEnv } from "@/lib/env";

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

export class TikTokApiError extends Error {
  constructor(
    public code: number | string,
    public message: string,
    public logId?: string
  ) {
    super(message);
    this.name = "TikTokApiError";
  }
}

interface TikTokErrorResponse {
  error: {
    code: number;
    message: string;
    log_id?: string;
  };
  message?: string;
  data?: unknown;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as TikTokErrorResponse;

  if (!response.ok || data.error) {
    const err = data.error ?? {};
    const code = err.code ?? response.status;
    const message = err.message ?? data.message ?? "Unknown TikTok API error";
    const logId = err.log_id;

    if (code === 401 || code === 403) {
      throw new TikTokApiError(code, message, logId);
    }

    throw new TikTokApiError(code, message, logId);
  }

  return data as unknown as T;
}

function tiktokUrl(path: string): string {
  return `${TIKTOK_API_BASE}${path}`;
}

export interface TikTokUser {
  open_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio_description?: string;
  profile_deep_link?: string;
}

/**
 * Get information about the authenticated TikTok user (the business account).
 * Used to resolve the open_id and display name after OAuth.
 */
export async function getTikTokUserInfo(
  accessToken: string
): Promise<TikTokUser> {
  const response = await fetch(tiktokUrl("/user/info/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ fields: ["open_id", "username", "display_name", "avatar_url"] }),
  });

  const data = await handleResponse<{
    data: { user: TikTokUser };
  }>(response);

  return data.data.user;
}

/**
 * Send a text direct message to a TikTok user by their open_id.
 */
export async function sendTikTokDirectMessage(
  accessToken: string,
  recipientOpenId: string,
  text: string
): Promise<{ message_id: string }> {
  const response = await fetch(tiktokUrl("/message/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      recipient: { open_id: recipientOpenId },
      message: { text },
    }),
  });

  const data = await handleResponse<{
    data: { message_id: string };
  }>(response);

  return data.data;
}

/**
 * Send a direct message with a button (link) to a TikTok user.
 * TikTok's message API supports buttons via the `button` field.
 */
export async function sendTikTokDirectMessageWithButton(
  accessToken: string,
  recipientOpenId: string,
  text: string,
  buttonLabel: string,
  buttonUrl: string,
  buttonPayload?: string
): Promise<{ message_id: string }> {
  const response = await fetch(tiktokUrl("/message/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      recipient: { open_id: recipientOpenId },
      message: {
        text,
        button: {
          label: buttonLabel,
          url: buttonUrl,
          ...(buttonPayload ? { payload: buttonPayload } : {}),
        },
      },
    }),
  });

  const data = await handleResponse<{
    data: { message_id: string };
  }>(response);

  return data.data;
}

export async function subscribeTikTokAccountToWebhooks(
  accessToken: string
): Promise<{ success: boolean }> {
  // TikTok webhooks are configured via the Developer Portal,
  // not via API subscription like Instagram. This is a placeholder
  // for future webhook registration if TikTok adds an API for it.
  return { success: true };
}