import { constants } from "@/app/api/constant";
import { getAuth, getCmsIdentity } from "@/app/api/_handlers/auth";
import { cmsJson, CmsHttpError, withCmsRequest } from "@/app/api/_handlers/http";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/services/schemas";
import { limitCmsLogin } from "@/lib/cmsLoginLimits";
import { validateCmsLoginCaptcha } from "@/lib/cmsLoginCaptcha";
import * as yup from "yup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = loginSchema.shape({
  captchaToken: yup.string().max(constants.CMS_LOGIN_MAX_CAPTCHA_TOKEN_LENGTH, "errors.captchaRequired").optional(),
});
const usernameSchema = loginSchema.pick(["username"]);

// Login not required - Permission: none
export async function POST(request: Request) {
  return withCmsRequest(request, async () => {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      await limitCmsLogin(request);
      throw new CmsHttpError(400, "errors.invalidJson");
    }
    // Payload lỗi vẫn tính theo IP; chỉ tạo khóa kết hợp khi username hợp lệ.
    const identity = await usernameSchema.validate(payload, { stripUnknown: true }).catch(() => null);
    await limitCmsLogin(request, identity?.username);
    const body = await requestSchema.validate(payload, { abortEarly: false, stripUnknown: true });
    await validateCmsLoginCaptcha(request, body.captchaToken);
    const auth = getAuth();
    let result;
    try {
      result = await auth.api.signInUsername({
        body: { username: body.username, password: body.password },
        headers: request.headers,
        returnHeaders: true,
      });
    } catch {
      throw new CmsHttpError(401, "errors.credentials");
    }

    try {
      const user = await getCmsIdentity(result.response.user.id);
      const response = cmsJson({ user });
      for (const cookie of result.headers.getSetCookie())
        response.headers.append("Set-Cookie", cookie);
      return response;
    } catch (error) {
      await prisma.session.deleteMany({
        where: { token: result.response.token },
      });
      throw error;
    }
  });
}
