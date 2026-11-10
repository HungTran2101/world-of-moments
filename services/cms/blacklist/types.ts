export type BlacklistScope = "browser" | "network" | "legacy";

export type BlacklistStatus = "active" | "revoked" | "expired" | "legacy";

export interface CmsBlacklistEvent {
  id: string;
  ip: string;
  createdAt: string;
  expiresAt: string | null;
  endedAt: string | null;
  endReason: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
}

export interface CmsBlacklistRecord {
  id: string;
  scope: BlacklistScope;
  targetId: string;
  ip: string;
  isActive: boolean;
  status: BlacklistStatus;
  expiresAt: string | null;
  blacklistCount: number;
  lastBlockedAt: string;
  createdAt: string;
  latestEvent: CmsBlacklistEvent;
}

export interface CmsBlacklistSummary {
  activeBrowserBlocks: number;
  activeNetworkBans: number;
}
