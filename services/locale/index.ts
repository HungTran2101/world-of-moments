import type { Locale } from "@/i18n/config";
import { apiRequest, type ApiRequestOptions } from "@/services/shared/api";
import type { SetLocaleResponse } from "./types";

export function setLocale(locale: Locale, options?: ApiRequestOptions) {
  return apiRequest<SetLocaleResponse>("/api/locale", {
    ...options,
    method: "POST",
    body: { locale },
  });
}
