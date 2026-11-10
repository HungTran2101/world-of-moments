import type { SubmissionBlockSupport } from "@/services/submissions/types";

export function getSubmissionBlockSupport(details: unknown): SubmissionBlockSupport {
  if (typeof details !== "object" || details === null) {
    return { browserId: null, contactMail: null };
  }

  return {
    browserId: "browserId" in details && typeof details.browserId === "string"
      ? details.browserId.trim() || null
      : null,
    contactMail: "contactMail" in details && typeof details.contactMail === "string"
      ? details.contactMail.trim() || null
      : null
  };
}

export function buildBlockAppealMailto(contactMail: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(contactMail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
