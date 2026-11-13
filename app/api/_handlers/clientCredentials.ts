import "server-only";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { getClientAuth } from "@/app/api/_handlers/clientAuth";
import { ClientHttpError } from "@/lib/clientErrors";
import { CLIENT_LIMITS } from "@/app/api/client/constant";

export const clientCredentialsSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    password: z
      .string()
      .min(CLIENT_LIMITS.MIN_PASSWORD_LENGTH)
      .max(CLIENT_LIMITS.MAX_PASSWORD_LENGTH),
    captchaToken: z.string().max(CLIENT_LIMITS.MAX_CAPTCHA_TOKEN_LENGTH).optional(),
    locale: z.enum(["en", "vi"]).default("en"),
  })
  .strict();
export async function signInClient(request: Request, email: string, password: string) {
  try {
    return await getClientAuth().api.signInEmail({
      body: { email, password },
      headers: request.headers,
      returnHeaders: true,
    });
  } catch (error) {
    if (error instanceof APIError) throw new ClientHttpError(401, "credentials");
    throw error;
  }
}
export function appendAuthCookies(response: Response, headers: Headers) {
  for (const cookie of headers.getSetCookie()) response.headers.append("Set-Cookie", cookie);
  return response;
}
