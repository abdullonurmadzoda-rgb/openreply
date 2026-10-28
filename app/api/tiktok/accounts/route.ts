import { NextResponse } from "next/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.tikTokAccount.findMany({
    where: { workspaceId: context.workspaceId },
    orderBy: { connectedAt: "desc" },
    select: {
      id: true,
      openId: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      tokenExpiresAt: true,
      webhookSubscribed: true,
      connectedAt: true,
    },
  });

  return NextResponse.json({ success: true, data: accounts });
}