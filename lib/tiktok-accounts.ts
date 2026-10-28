import { prisma } from "@/lib/db/client";

export async function canConnectTikTokAccount({
  workspaceId,
  openId,
}: {
  workspaceId: string;
  openId: string;
}) {
  const existingAccount = await prisma.tikTokAccount.findUnique({
    where: { openId },
    select: { workspaceId: true },
  });

  if (existingAccount && existingAccount.workspaceId !== workspaceId) {
    return {
      allowed: false,
      reason: "already_connected" as const,
    };
  }

  return {
    allowed: true,
    reason: null,
  };
}

export async function getWorkspaceTikTokAccount(
  workspaceId: string,
  tikTokAccountId?: string | null
) {
  if (tikTokAccountId && tikTokAccountId !== "all") {
    return prisma.tikTokAccount.findFirst({
      where: { id: tikTokAccountId, workspaceId },
    });
  }

  return prisma.tikTokAccount.findFirst({
    where: { workspaceId },
    orderBy: { connectedAt: "desc" },
  });
}