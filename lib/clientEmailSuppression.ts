import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ClientHttpError } from "@/lib/clientErrors";
import { checkClientEmailDomain } from "@/lib/clientEmailDomain";

type SuppressionReader = Pick<Prisma.TransactionClient, "clientEmailSuppression">;

export async function isClientEmailSuppressed(email: string, db: SuppressionReader = prisma) {
  const record = await db.clientEmailSuppression.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { email: true },
  });
  return Boolean(record);
}

export async function assertClientEmailNotSuppressed(email: string, db?: SuppressionReader) {
  if (await isClientEmailSuppressed(email, db))
    throw new ClientHttpError(422, "emailUndeliverable");
}

export async function checkClientEmailDeliverability(email: string) {
  await assertClientEmailNotSuppressed(email);
  await checkClientEmailDomain(email);
}

const eventTypeSchema = z.object({ type: z.string() });
const suppressionEventSchema = z.object({
  type: z.enum(["email.bounced", "email.complained", "email.suppressed"]),
  created_at: z.iso.datetime({ offset: true }),
  data: z.object({
    email_id: z.string().min(1),
    to: z.array(z.string().trim().toLowerCase().pipe(z.email())).min(1),
    bounce: z.object({ type: z.string() }).optional(),
  }),
}).refine((event) => event.type !== "email.bounced" || Boolean(event.data.bounce), {
  message: "Missing bounce classification",
});

export async function recordResendSuppression(payload: unknown, eventId: string) {
  const { type } = eventTypeSchema.parse(payload);
  if (!["email.bounced", "email.complained", "email.suppressed"].includes(type)) return;
  const event = suppressionEventSchema.parse(payload);
  if (event.type === "email.bounced") {
    if (event.data.bounce?.type !== "Permanent") return;
  }
  const reason = event.type === "email.bounced" ? "hard_bounce" :
    event.type === "email.complained" ? "complaint" : "provider_suppressed";
  // Giữ nguyên bằng chứng đầu tiên; INSERT ON CONFLICT bảo đảm webhook trùng/đảo thứ tự không xóa chặn.
  // Không gắn khóa ngoại tài khoản để việc xóa rồi đăng ký lại không vượt qua được chặn email.
  await prisma.clientEmailSuppression.createMany({
    data: [...new Set(event.data.to)].map((email) => ({
      email,
      reason,
      providerEmailId: event.data.email_id,
      providerEventId: eventId,
      eventAt: new Date(event.created_at),
    })),
    skipDuplicates: true,
  });
}
