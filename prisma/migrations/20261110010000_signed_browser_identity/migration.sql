CREATE TYPE "BlacklistScope" AS ENUM ('browser', 'network', 'legacy');
CREATE TABLE "submission_client_limits" (
  "clientId" TEXT PRIMARY KEY,
  "lastAllowedAt" TIMESTAMP(3) NOT NULL,
  "rejectedAt" TIMESTAMP(3)[] NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "submission_client_limits_expiresAt_idx" ON "submission_client_limits"("expiresAt");
CREATE TABLE "submission_network_limits" (
  "ip" TEXT PRIMARY KEY,
  "attemptsAt" TIMESTAMP(3)[] NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "submission_network_limits_expiresAt_idx" ON "submission_network_limits"("expiresAt");
ALTER TABLE "ip_blacklist" ADD COLUMN "scope" "BlacklistScope" NOT NULL DEFAULT 'legacy',
  ADD COLUMN "targetId" TEXT, ADD COLUMN "expiresAt" TIMESTAMP(3), ADD COLUMN "endReason" TEXT;
UPDATE "ip_blacklist" SET "targetId" = "ip";
ALTER TABLE "ip_blacklist" ALTER COLUMN "targetId" SET NOT NULL, ALTER COLUMN "scope" SET DEFAULT 'browser';
ALTER TABLE "ip_blacklist_events" ADD COLUMN "ip" TEXT, ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "endedAt" TIMESTAMP(3), ADD COLUMN "endReason" TEXT;
UPDATE "ip_blacklist_events" e SET "ip" = b."ip",
  "endedAt" = COALESCE(e."revokedAt", CURRENT_TIMESTAMP),
  "endReason" = CASE WHEN e."revokedAt" IS NULL THEN 'migrated' ELSE 'revoked' END
  FROM "ip_blacklist" b WHERE b."id" = e."blacklistId";
ALTER TABLE "ip_blacklist_events" ALTER COLUMN "ip" SET NOT NULL;
-- Lưu lịch sử IP cũ nhưng ngừng áp dụng chặn cho cả mạng dùng chung.
UPDATE "ip_blacklist" SET "isActive" = false, "endReason" = 'migrated' WHERE "scope" = 'legacy';
DROP INDEX "ip_blacklist_ip_key";
DROP INDEX "ip_blacklist_events_one_active_idx";
CREATE UNIQUE INDEX "ip_blacklist_scope_targetId_key" ON "ip_blacklist"("scope", "targetId");
CREATE INDEX "ip_blacklist_ip_idx" ON "ip_blacklist"("ip");
CREATE INDEX "ip_blacklist_scope_isActive_expiresAt_idx" ON "ip_blacklist"("scope", "isActive", "expiresAt");
CREATE INDEX "ip_blacklist_events_ip_idx" ON "ip_blacklist_events"("ip");
CREATE UNIQUE INDEX "ip_blacklist_events_one_active_idx" ON "ip_blacklist_events"("blacklistId") WHERE "endedAt" IS NULL;
