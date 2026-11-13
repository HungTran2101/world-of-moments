import type { ClientStatus } from "@/services/client-auth/types";
export interface CmsClientUserRecord {
  id: string;
  email: string;
  status: ClientStatus;
  emailVerified: boolean;
  suspendedUntil: string | null;
  suspensionCount: number;
  verificationSendCount: number;
  verificationLastSentAt: string | null;
  verificationDeadline: string;
  dailySubmissions: number;
  lastSubmittedAt: string | null;
  recentRejectedAttempts: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  updatedByName: string | null;
}
