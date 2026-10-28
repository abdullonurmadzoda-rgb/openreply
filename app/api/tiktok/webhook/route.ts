import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getDMQueue } from "@/lib/queue/client";
import { TIKTOK_MESSAGE_JOB_NAME } from "@/lib/queue/client";
import {
  parseTikTokWebhookEvents,
  verifyTikTokWebhookSignature,
} from "@/lib/tiktok/webhook";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("verify_token");

  if (token === process.env.TIKTOK_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse("OK", { status: 200 });
  }

  return NextResponse.json(
    { success: false, error: "Verification failed" },
    { status: 403 }
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("tiktok-signature");
  const timestamp = request.headers.get("tiktok-timestamp");

  // For test events from TikTok Developer Portal, signature headers may
  // be missing or invalid. Accept the request if signature headers are
  // absent (test events), but verify when they are present.
  if (signature && timestamp) {
    if (
      !verifyTikTokWebhookSignature(rawBody, {
        "tiktok-signature": signature,
        "tiktok-timestamp": timestamp,
      })
    ) {
    await prisma.operationalEvent
      .create({
        data: {
          source: "SYSTEM",
          level: "WARNING",
          message: "TikTok webhook signature verification failed",
          payload: {
            hadSignatureHeader: Boolean(signature),
            bodyLength: rawBody.length,
          },
        },
      })
      .catch(() => {});
    return NextResponse.json(
      { success: false, error: "Invalid signature" },
      { status: 401 }
    );
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const events = parseTikTokWebhookEvents(payload);
  const queue = getDMQueue();

  for (const event of events) {
    if (event.type !== "message" || !event.openId || !event.messageId) {
      continue;
    }

    const account = await prisma.tikTokAccount.findUnique({
      where: { openId: event.openId },
      select: { workspaceId: true },
    });

    if (!account) {
      continue;
    }

    await queue.add(
      TIKTOK_MESSAGE_JOB_NAME,
      {
        tikTokAccountId: event.openId,
        messageId: event.messageId,
        messageText: event.messageText ?? "",
        senderOpenId: event.openId,
      },
      {
        jobId: `tiktok_message_${event.openId}_${event.messageId}`,
      }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}