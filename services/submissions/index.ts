import { apiRequest, type ApiRequestOptions } from "@/services/shared/api";
import type { SubmissionBounds } from "@/lib/submissionBounds";
import type {
  CreateSubmissionPayload,
  Submission,
  SubmissionHistoryPage,
  SubmissionPin,
  UpdateSubmissionPayload,
} from "./types";

// Tách cache của DTO mới khỏi các trang còn giữ metadata phẳng khi cập nhật ứng dụng.
export const submissionHistoryKey = ["submission-history", "metadata"] as const;

export function getSubmissionHistory(
  authorUuid: string,
  search: string,
  page: number,
  options?: ApiRequestOptions,
) {
  const query = new URLSearchParams({ search, page: String(page) });
  return apiRequest<SubmissionHistoryPage>(`/api/submissions/history?${query}`, {
    ...options,
    headers: { "x-author-uuid": authorUuid },
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
  return apiRequest<SubmissionPin[]>(`/api/submissions?${query}`, options);
}

export function getSubmissionById(id: string, options?: ApiRequestOptions) {
  return apiRequest<Submission>(`/api/submissions/${id}`, options);
}

export function createSubmission(payload: CreateSubmissionPayload, options?: ApiRequestOptions) {
  return apiRequest<Submission>("/api/submissions", {
    ...options,
    method: "POST",
    body: payload,
  });
}

export function updateSubmission(
  id: string,
  payload: UpdateSubmissionPayload,
  options?: ApiRequestOptions
) {
  return apiRequest<Submission>(`/api/submissions/${id}`, {
    ...options,
    method: "PATCH",
    body: payload,
  });
}

export function deleteSubmission(id: string, authorUuid: string, options?: ApiRequestOptions) {
  return apiRequest<null>(`/api/submissions/${id}`, {
    ...options,
    method: "DELETE",
    headers: {
      "x-author-uuid": authorUuid,
    },
  });
}
