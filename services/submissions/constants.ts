export const SUBMISSION_STATUSES = ["published", "unpublished"] as const;
export const SUBMISSION_VALIDITIES = [
  "valid",
  "invalid",
  "need-inspect",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];
export type SubmissionValidity = (typeof SUBMISSION_VALIDITIES)[number];
export const DEFAULT_SUBMISSION_STATUS: SubmissionStatus = "published";
export const DEFAULT_SUBMISSION_VALIDITY: SubmissionValidity = "need-inspect";
export const CLIENT_SUBMISSION_ACTOR = "client";
