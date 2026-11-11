import { apiRequest, type ApiRequestOptions } from "@/services/shared/api";
import type { ClientCredentials, ClientSessionResponse } from "./types";
const endpoint = "/api/client/auth";
export function getClientSession(options?: ApiRequestOptions) {
  return apiRequest<ClientSessionResponse>(`${endpoint}/session`, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
  });
}
export function loginClient(body: ClientCredentials, options?: ApiRequestOptions) {
  return apiRequest<ClientSessionResponse>(`${endpoint}/login`, {
    ...options,
    method: "POST",
    body,
    credentials: "same-origin",
  });
}
export function registerClient(body: ClientCredentials, options?: ApiRequestOptions) {
  return apiRequest<ClientSessionResponse & { emailError: boolean }>(`${endpoint}/register`, {
    ...options,
    method: "POST",
    body,
    credentials: "same-origin",
  });
}
export function logoutClient(options?: ApiRequestOptions) {
  return apiRequest<{ ok: true }>(`${endpoint}/logout`, {
    ...options,
    method: "POST",
    credentials: "same-origin",
  });
}
export function resendClientVerification(locale: "en" | "vi", options?: ApiRequestOptions) {
  return apiRequest<{ ok: true }>(`${endpoint}/resend`, {
    ...options,
    method: "POST",
    body: { locale },
    credentials: "same-origin",
  });
}
