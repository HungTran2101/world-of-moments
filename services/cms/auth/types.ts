import type { CmsUser } from "@/services/shared/types";
import type { LoginValues } from "@/services/schemas";

export interface CmsLoginRequest extends LoginValues {
  captchaToken: string;
}

export interface CmsLoginResponse {
  user: CmsUser;
}
