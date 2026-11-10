import { apiRequest } from "@/services/shared/api";

export function initializeVisitorIdentity() {
  return apiRequest<{
    cacheKey: string;
  }>("/api/submissions/client-token", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store"
  });
}
