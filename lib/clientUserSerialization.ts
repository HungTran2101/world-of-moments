import "server-only";
import type { ClientRecord } from "@/lib/clientAccounts";
import { hostingDay, verificationDeadline } from "@/lib/clientAccounts";
import { CLIENT_LIMITS } from "@/app/api/client/constant";
import type { CmsClientUserRecord } from "@/services/cms/client-users/types";
export function serializeClientUser(
  user: ClientRecord,
  actorName: string | null = null,
): CmsClientUserRecord {
  const now = new Date();
  return {
    id: user.id,
    email: user.email,
    status: user.clientStatus,
    emailVerified: user.emailVerified,
    suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
    suspensionCount: user.suspensionCount,
    verificationSendCount: user.verificationSendCount,
    verificationLastSentAt: user.verificationLastSentAt?.toISOString() ?? null,
    verificationDeadline: verificationDeadline(user).toISOString(),
    dailySubmissions:
      user.submissionLimit?.day === hostingDay(now) ? user.submissionLimit.submissions : 0,
    lastSubmittedAt: user.submissionLimit?.lastSubmittedAt?.toISOString() ?? null,
    recentRejectedAttempts:
      user.submissionLimit?.rejectedAt.filter(
        (date) => date.getTime() > now.getTime() - CLIENT_LIMITS.ABUSE_WINDOW_MS,
      ).length ?? 0,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.statusUpdatedAt.toISOString(),
    updatedBy: user.statusUpdatedBy,
    updatedByName: actorName,
  };
}
