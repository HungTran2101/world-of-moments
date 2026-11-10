import { type ApiRequestOptions } from "@/services/shared/api";
import { visitorRequest } from "@/services/shared/visitor-api";
import type { CreateFutureMessagePayload, FutureMessage } from "./types";

export function listFutureMessages(options?: ApiRequestOptions) {
  return visitorRequest<FutureMessage[]>("/api/future-message", {
    ...options
  });
}

export function createFutureMessage(payload: CreateFutureMessagePayload, options?: ApiRequestOptions) {
  return visitorRequest<FutureMessage>("/api/future-message", {
    ...options,
    method: "POST",
    body: payload
  });
}
