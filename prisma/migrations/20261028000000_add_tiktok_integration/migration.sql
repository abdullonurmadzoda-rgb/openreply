-- CreateTable
CREATE TABLE "TikTokAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "openId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresIn" INTEGER,
    "tokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "webhookSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TikTokAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TikTokAccount_openId_key" ON "TikTokAccount"("openId");

-- CreateIndex
CREATE INDEX "TikTokAccount_workspaceId_idx" ON "TikTokAccount"("workspaceId");

-- AddForeignKey
ALTER TABLE "TikTokAccount" ADD CONSTRAINT "TikTokAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Automation" ADD COLUMN "tikTokAccountId" TEXT;

-- CreateIndex
CREATE INDEX "Automation_tikTokAccountId_idx" ON "Automation"("tikTokAccountId");

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_tikTokAccountId_fkey" FOREIGN KEY ("tikTokAccountId") REFERENCES "TikTokAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "DmLog" ADD COLUMN "tikTokAccountId" TEXT;

-- CreateIndex
CREATE INDEX "DmLog_tikTokAccountId_idx" ON "DmLog"("tikTokAccountId");

-- AddForeignKey
ALTER TABLE "DmLog" ADD CONSTRAINT "DmLog_tikTokAccountId_fkey" FOREIGN KEY ("tikTokAccountId") REFERENCES "TikTokAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;