CREATE TABLE "submission_ip_limits" (
    "ip" TEXT NOT NULL,
    "lastAllowedAt" TIMESTAMP(3) NOT NULL,
    "rejectedAt" TIMESTAMP(3)[] NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "submission_ip_limits_pkey" PRIMARY KEY ("ip")
);
CREATE INDEX "submission_ip_limits_expiresAt_idx" ON "submission_ip_limits"("expiresAt");

CREATE TABLE "ip_blacklist" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "blacklistCount" INTEGER NOT NULL DEFAULT 1,
    "lastBlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ip_blacklist_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ip_blacklist_ip_key" ON "ip_blacklist"("ip");
CREATE INDEX "ip_blacklist_isActive_createdAt_idx" ON "ip_blacklist"("isActive", "createdAt");

CREATE TABLE "ip_blacklist_events" (
    "id" TEXT NOT NULL,
    "blacklistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    CONSTRAINT "ip_blacklist_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ip_blacklist_events_blacklistId_fkey" FOREIGN KEY ("blacklistId") REFERENCES "ip_blacklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ip_blacklist_events_blacklistId_createdAt_idx" ON "ip_blacklist_events"("blacklistId", "createdAt");
-- Mỗi IP chỉ có một lần chặn chưa được thu hồi, kể cả khi nhiều request đến đồng thời.
CREATE UNIQUE INDEX "ip_blacklist_events_one_active_idx" ON "ip_blacklist_events"("blacklistId") WHERE "revokedAt" IS NULL;
