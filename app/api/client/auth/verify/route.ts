import { z } from "zod";
import { clientJson, withClientRequest } from "@/app/api/_handlers/clientHttp";
import { ClientHttpError } from "@/lib/clientErrors";
import { verifyClientEmail } from "@/lib/clientVerification";
import type { ClientVerificationResponse } from "@/services/client-auth/types";

export const runtime = "nodejs";

const verifySchema = z.object({ token: z.string().min(1) });

export async function POST(request: Request) {
  return withClientRequest(request, async () => {
    const input = verifySchema.safeParse(await request.json().catch(() => null));
    let status: ClientVerificationResponse["status"] = "invalid";
    if (input.success) {
      try {
        await verifyClientEmail(input.data.token);
        status = "success";
      } catch (error) {
        if (!(error instanceof ClientHttpError) || error.code !== "invalidLink") throw error;
      }
    }
    return clientJson({ status } satisfies ClientVerificationResponse);
  });
}
