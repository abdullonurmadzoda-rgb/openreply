import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { getBaseUrl } from "@/lib/env";
import { canConnectTikTokAccount } from "@/lib/tiktok-accounts";
import {
  getTikTokUserInfo,
  subscribeTikTokAccountToWebhooks,
} from "@/lib/tiktok/client";
import {
  exchangeCodeForToken,
  encryptToken,
  verifyOAuthState,
} from "@/lib/tiktok/oauth";
import { canManageWorkspace } from "@/lib/workspace-access";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const state = verifyOAuthState(request.nextUrl.searchParams.get("state"));
  const baseUrl = getBaseUrl();

  if (error) {
    return NextResponse.redirect(`${baseUrl}/settings?tiktok=denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/settings?tiktok=invalid`);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: state.workspaceId,
      userId: session.user.id,
    },
  });

  if (!membership || !canManageWorkspace(membership.role)) {
    return NextResponse.redirect(`${baseUrl}/settings?tiktok=forbidden`);
  }

  try {
    const redirectUri = `${baseUrl}/api/tiktok/callback`;
    const { accessToken: shortLivedToken, openId } =
      await exchangeCodeForToken(code, redirectUri);

    if (!openId) {
      return NextResponse.redirect(
        `${baseUrl}/settings?tiktok=failed&reason=open_id_missing`
      );
    }

    const userInfo = await getTikTokUserInfo(shortLivedToken);
    // TikTok open_id is the app-scoped ID used for messaging
    const tikTokAccountId = openId;

    const connection = await canConnectTikTokAccount({
      workspaceId: state.workspaceId,
      openId: tikTokAccountId,
    });

    if (!connection.allowed) {
      return NextResponse.redirect(
        `${baseUrl}/settings?tiktok=already_connected`
      );
    }

    const encryptedToken = encryptToken(shortLivedToken);

    let webhookSubscribed = false;
    try {
      const subscription = await subscribeTikTokAccountToWebhooks(
        shortLivedToken
      );
      webhookSubscribed = Boolean(subscription.success);
    } catch (subscriptionError) {
      console.warn(
        "[TikTok Callback] Webhook subscription failed:",
        subscriptionError
      );
    }

    await prisma.tikTokAccount.upsert({
      where: { openId: tikTokAccountId },
      create: {
        workspaceId: state.workspaceId,
        openId: tikTokAccountId,
        username: userInfo.username,
        displayName: userInfo.display_name,
        avatarUrl: userInfo.avatar_url,
        accessToken: encryptedToken,
        tokenExpiresAt: new Date(
          Date.now() + (userInfo as any).expires_in * 1000
        ),
        webhookSubscribed,
      },
      update: {
        workspaceId: state.workspaceId,
        username: userInfo.username,
        displayName: userInfo.display_name,
        avatarUrl: userInfo.avatar_url,
        accessToken: encryptedToken,
        tokenExpiresAt: new Date(
          Date.now() + (userInfo as any).expires_in * 1000
        ),
        webhookSubscribed,
      },
    });

    return NextResponse.redirect(`${baseUrl}/dashboard?connected=true`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[TikTok Callback] Error:", err);
    await prisma.operationalEvent
      .create({
        data: {
          source: "SYSTEM",
          level: "ERROR",
          workspaceId: state.workspaceId,
          message: "TikTok connection failed",
          payload: { reason: message },
        },
      })
      .catch(() => {});

    return NextResponse.redirect(
      `${baseUrl}/settings?tiktok=failed&reason=${encodeURIComponent(
        message.slice(0, 200)
      )}`
    );
  }
}