import "server-only";
import type { BlacklistEvent, SubmissionBlacklist } from "@prisma/client";
import type { CmsBlacklistEvent, CmsBlacklistRecord } from "@/services/cms/blacklist/types";

export function serializeBlacklistEvent(event: BlacklistEvent, now: Date): CmsBlacklistEvent {
  const expired = !event.endedAt && event.expiresAt && event.expiresAt <= now;
  return {
    id: event.id,
    ip: event.ip,
    createdAt: event.createdAt.toISOString(),
    expiresAt: event.expiresAt?.toISOString() ?? null,
    endedAt: (event.endedAt ?? (expired ? event.expiresAt : null))?.toISOString() ?? null,
    endReason: event.endReason ?? (expired ? "expired" : null),
    revokedAt: event.revokedAt?.toISOString() ?? null,
    revokedBy: event.revokedBy
  };
}

export function serializeBlacklist(record: SubmissionBlacklist & {
  events: BlacklistEvent[];
}, now: Date): CmsBlacklistRecord {
  const latestEvent = serializeBlacklistEvent(record.events[0], now);
  const isActive = record.scope !== "legacy" && record.isActive && (!record.expiresAt || record.expiresAt > now);
  return {
    id: record.id,
    scope: record.scope,
    targetId: record.targetId,
    ip: record.ip,
    isActive,
    status: record.scope === "legacy" ? "legacy" : isActive ? "active" : latestEvent.endReason === "expired" ? "expired" : "revoked",
    expiresAt: record.expiresAt?.toISOString() ?? null,
    blacklistCount: record.blacklistCount,
    lastBlockedAt: record.lastBlockedAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    latestEvent
  };
}
