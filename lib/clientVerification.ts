import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  readClient,
  verificationDeadline,
  verificationPrefix,
  lockClient,
  getClientRecord,
  type ClientRecord,
} from "@/lib/clientAccounts";
import { clientAuthSecret } from "@/app/api/_handlers/clientAuth";
import { ClientHttpError } from "@/lib/clientErrors";
import { CLIENT_LIMITS } from "@/app/api/client/constant";
import { verificationEmail } from "@/emails/verification";
import { checkClientEmailDeliverability } from "@/lib/clientEmailSuppression";

const tokenFor = (id: string) =>
  `${id}.${createHmac("sha256", clientAuthSecret()).update(`verify:${id}`).digest("base64url")}`;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
function assertVerificationAvailable(user: ClientRecord | null): asserts user is ClientRecord {
  if (!user) throw new ClientHttpError(401, "unauthorized");
  if (user.emailVerified) throw new ClientHttpError(409, "alreadyVerified");
  if (user.verificationEmailBlocked) throw new ClientHttpError(422, "emailUndeliverable");
  const now = new Date();
  if (
    user.verificationLastSentAt &&
    now.getTime() - user.verificationLastSentAt.getTime() < CLIENT_LIMITS.RESEND_COOLDOWN_MS
  )
    throw new ClientHttpError(429, "resendCooldown");
  if (user.verificationSendCount >= CLIENT_LIMITS.VERIFICATION_SEND_SLOTS && !user.hasPendingVerification)
    throw new ClientHttpError(429, "resendLimit");
}
export async function sendClientVerification(userId: string, locale: "en" | "vi") {
  const current = await getClientRecord(userId);
  assertVerificationAvailable(current);
  // Không giữ transaction trong lúc chờ DNS; khóa tài khoản và đọc lại điều kiện ngay trước khi dành slot.
  await checkClientEmailDeliverability(current.email);
  const slot = await prisma.$transaction(async (tx) => {
    const user = await readClient(tx, userId);
    assertVerificationAvailable(user);
    const now = new Date();
    const prefix = verificationPrefix(userId);
    // Lưu hash thay vì token thô; token có thể tái tạo bằng secret và ID ngẫu nhiên khi gửi lại lỗi mạng.
    let pending = await tx.verification.findFirst({
      where: {
        identifier: { startsWith: prefix, endsWith: ":pending" },
        createdAt: { gt: new Date(now.getTime() - CLIENT_LIMITS.EMAIL_IDEMPOTENCY_WINDOW_MS) },
      },
    });
    if (!pending) {
      if (user.verificationSendCount >= CLIENT_LIMITS.VERIFICATION_SEND_SLOTS)
        throw new ClientHttpError(429, "resendLimit");
      const id = randomBytes(CLIENT_LIMITS.TOKEN_BYTES).toString("hex");
      pending = await tx.verification.create({
        data: {
          id,
          identifier: `${prefix}${user.verificationSendCount + 1}:${locale}:pending`,
          value: hashToken(tokenFor(id)),
          expiresAt: verificationDeadline(user),
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { verificationSendCount: { increment: 1 } },
      });
    }
    await tx.user.update({ where: { id: userId }, data: { verificationLastSentAt: now } });
    return { record: pending, email: user.email };
  });
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)
    throw new ClientHttpError(503, "emailFailed");
  const url = new URL(
    "/api/client/auth/verify",
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  );
  url.searchParams.set("token", tokenFor(slot.record.id));
  const savedLocale = slot.record.identifier.split(":").at(-2) === "vi" ? "vi" : "en";
  const mail = verificationEmail(url.href, savedLocale);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `client-verification/${slot.record.id}`,
      },
      body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [slot.email], ...mail }),
      signal: AbortSignal.timeout(CLIENT_LIMITS.REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error("Email delivery unavailable");
  } catch {
    throw new ClientHttpError(503, "emailFailed");
  }
  await prisma.verification.updateMany({
    where: { id: slot.record.id },
    data: { identifier: slot.record.identifier.replace(/:pending$/, ":sent") },
  });
}
export async function verifyClientEmail(token: string) {
  const id = token.split(".")[0];
  if (!id || id.length !== CLIENT_LIMITS.TOKEN_ID_HEX_LENGTH || !/^[a-f0-9]+$/.test(id))
    throw new ClientHttpError(400, "invalidLink");
  const verification = await prisma.verification.findUnique({ where: { id } });
  if (!verification?.identifier.startsWith("client-email:"))
    throw new ClientHttpError(400, "invalidLink");
  const userId = verification.identifier.split(":")[1];
  const result = await prisma.$transaction(async (tx) => {
    await lockClient(tx, userId);
    const record = await tx.verification.findUnique({ where: { id } });
    const user = await readClient(tx, userId);
    if (!record || !user || record.expiresAt <= new Date()) return false;
    const expected = Buffer.from(record.value);
    const actual = Buffer.from(hashToken(token));
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
    await tx.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        clientStatus: "verified",
        statusUpdatedAt: new Date(),
        statusUpdatedBy: null,
      },
    });
    await tx.verification.deleteMany({
      where: { identifier: { startsWith: verificationPrefix(userId) } },
    });
    return true;
  });
  if (!result) throw new ClientHttpError(400, "invalidLink");
}
