import { z } from "zod";
import { requireClientSession } from "@/app/api/_handlers/clientAuth";
import { clientJson, withClientRequest } from "@/app/api/_handlers/clientHttp";
import { sendClientVerification } from "@/lib/clientVerification";
export const runtime = "nodejs";
const resendSchema = z.object({ locale: z.enum(["en", "vi"]).default("en") }).strict();
export async function POST(request: Request) {
  return withClientRequest(request, async () => {
    const user = await requireClientSession(request.headers);
    const { locale } = resendSchema.parse(await request.json());
    await sendClientVerification(user.id, locale);
    return clientJson({ ok: true });
  });
}
