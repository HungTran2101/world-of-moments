import { apiRequest, type ApiRequestOptions } from "@/services/shared/api";
import type { CreateFutureMessagePayload, FutureMessage } from "./types";

export function listFutureMessages(authorUuid: string, options?: ApiRequestOptions) {
  return apiRequest<FutureMessage[]>("/api/future-message", {
    ...options,
    headers: {
      "x-author-uuid": authorUuid,
    },
  });
}

export function createFutureMessage(payload: CreateFutureMessagePayload, options?: ApiRequestOptions) {
  return apiRequest<FutureMessage>("/api/future-message", {
    ...options,
    method: "POST",
    body: payload,
  });
}
