import type { CLIENT_STATUSES } from "@/app/api/client/constant";

export type ClientStatus = (typeof CLIENT_STATUSES)[number];
export type SubmissionAvailability = "ready" | "cooldown" | "daily-limit";
export interface ClientIdentity {
  id: string;
  email: string;
  status: ClientStatus;
  suspendedUntil: string | null;
  verificationDeadline: string;
  resendAvailableAt: string | null;
  canResend: boolean;
  availability: SubmissionAvailability;
  availableAt: string | null;
}
export interface ClientSessionResponse {
  user: ClientIdentity | null;
}
export interface ClientCredentials {
  email: string;
  password: string;
  captchaToken?: string;
  locale?: "en" | "vi";
}
