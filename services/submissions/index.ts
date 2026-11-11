import { apiRequest, type ApiRequestOptions } from "@/services/shared/api";
import type { SubmissionBounds } from "@/lib/submissionBounds";
import type {
  CreateSubmissionPayload,
  Submission,
  SubmissionHistoryPage,
  SubmissionPin,
} from "./types";

export function getSubmissionHistory(search: string, page: number, options?: ApiRequestOptions) {
  const query = new URLSearchParams({
    search,
    page: String(page),
  });
  return apiRequest<SubmissionHistoryPage>(`/api/submissions/history?${query}`, {
    ...options,
    cache: "no-store",
  });
}

export function getSubmissions(bounds: SubmissionBounds, options?: ApiRequestOptions) {
  const query = new URLSearchParams({
    west: String(bounds.west),
    south: String(bounds.south),
    east: String(bounds.east),
    north: String(bounds.north),
  });
  return apiRequest<SubmissionPin[]>(`/api/submissions?${query}`, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
  });
}

export function getSubmissionById(id: string, options?: ApiRequestOptions) {
  return apiRequest<Submission>(`/api/submissions/${encodeURIComponent(id)}`, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
  });
}

export function createSubmission(payload: CreateSubmissionPayload, options?: ApiRequestOptions) {
  return apiRequest<Submission>("/api/submissions", {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    method: "POST",
    body: payload,
  });
}

export function deleteSubmission(id: string, options?: ApiRequestOptions) {
  return apiRequest<null>(`/api/submissions/${encodeURIComponent(id)}`, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    method: "DELETE",
  });
}
