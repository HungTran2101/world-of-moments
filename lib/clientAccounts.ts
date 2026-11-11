import "server-only";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ClientHttpError } from "@/lib/clientErrors";
import { CLIENT_LIMITS } from "@/app/api/client/constant";
import type { ClientIdentity, ClientStatus } from "@/services/client-auth/types";

export const CLIENT_VERIFICATION_PREFIX = "client-email:";
export const verificationPrefix = (id: string) => `${CLIENT_VERIFICATION_PREFIX}${id}:`;
export const verificationDeadline = (user: Pick<User, "createdAt">) =>
  new Date(user.createdAt.getTime() + CLIENT_LIMITS.UNVERIFIED_LIFETIME_MS);
export function hostingDay(now: Date) {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}
export async function lockClient(tx: Prisma.TransactionClient, id: string) {
  // Mọi thao tác trạng thái, quota và xóa cùng tài khoản dùng chung khóa để tránh vượt giới hạn.
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`client:${id}`}, 0))`;
}
export async function readClient(tx: Prisma.TransactionClient, id: string, at?: Date) {
  await lockClient(tx, id);
  const now = at ?? new Date();
  let user = await tx.user.findFirst({
    where: { id, kind: "client" },
    include: { submissionLimit: true },
  });
  if (!user) return null;
  if (!user.emailVerified && verificationDeadline(user) <= now) {
    await tx.verification.deleteMany({
      where: { identifier: { startsWith: verificationPrefix(id) } },
    });
    await tx.user.delete({ where: { id } });
    return null;
  }
  if (user.clientStatus === "suspended" && user.suspendedUntil && user.suspendedUntil <= now) {
    user = await tx.user.update({
      where: { id },
      data: {
        clientStatus: "verified",
        suspendedUntil: null,
        statusUpdatedAt: now,
        statusUpdatedBy: null,
      },
      include: { submissionLimit: true },
    });
  }
  const pending = !user.emailVerified
    ? await tx.verification.findFirst({
        where: {
          identifier: { startsWith: verificationPrefix(id), endsWith: ":pending" },
          createdAt: { gt: new Date(now.getTime() - CLIENT_LIMITS.EMAIL_IDEMPOTENCY_WINDOW_MS) },
        },
        select: { id: true },
      })
    : null;
  return { ...user, hasPendingVerification: Boolean(pending) };
}
export type ClientRecord = Prisma.UserGetPayload<{ include: { submissionLimit: true } }> & {
  hasPendingVerification?: boolean;
};
export function clientIdentity(user: ClientRecord, now = new Date()): ClientIdentity {
  const limit = user.submissionLimit;
  const dailyLimit =
    limit?.day === hostingDay(now) && limit.submissions >= CLIENT_LIMITS.DAILY_SUBMISSIONS;
  const cooldownUntil = limit?.lastSubmittedAt
    ? new Date(limit.lastSubmittedAt.getTime() + CLIENT_LIMITS.SUBMISSION_COOLDOWN_MS)
    : null;
  const midnight = new Date(now);
  midnight.setHours(CLIENT_LIMITS.HOURS_PER_DAY, 0, 0, 0);
  const availableAt = dailyLimit
    ? midnight
    : cooldownUntil && cooldownUntil > now
      ? cooldownUntil
      : null;
  return {
    id: user.id,
    email: user.email,
    status: user.clientStatus,
    suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
    verificationDeadline: verificationDeadline(user).toISOString(),
    resendAvailableAt: user.verificationLastSentAt
      ? new Date(
          user.verificationLastSentAt.getTime() + CLIENT_LIMITS.RESEND_COOLDOWN_MS,
        ).toISOString()
      : null,
    canResend:
      !user.emailVerified &&
      (user.verificationSendCount < CLIENT_LIMITS.VERIFICATION_SEND_SLOTS ||
        Boolean(user.hasPendingVerification)),
    availability: dailyLimit ? "daily-limit" : availableAt ? "cooldown" : "ready",
    availableAt: availableAt?.toISOString() ?? null,
  };
}
export async function getClientRecord(id: string) {
  return prisma.$transaction((tx) => readClient(tx, id));
}
export function suspensionData(user: Pick<User, "suspensionCount">, now: Date) {
  const count = user.suspensionCount + 1;
  const banned = count >= CLIENT_LIMITS.SUSPENSIONS_UNTIL_BAN;
  return {
    clientStatus: banned ? ("banned" as const) : ("suspended" as const),
    suspensionCount: banned ? 0 : count,
    suspendedUntil: banned ? null : new Date(now.getTime() + CLIENT_LIMITS.SUSPENSION_DURATION_MS),
    statusUpdatedAt: now,
  };
}
export async function createClientAccount(
  email: string,
  plainPassword: string,
  status: ClientStatus = "unverified",
  actorId: string | null = null,
) {
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
  });
  if (existing && (existing.kind !== "client" || (await getClientRecord(existing.id))))
    throw new ClientHttpError(409, "emailExists");
  const password = await hashPassword(plainPassword);
  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.user.findFirst({
      where: { email: { equals: normalized, mode: "insensitive" } },
      select: { id: true },
    });
    if (duplicate) throw new ClientHttpError(409, "emailExists");
    const id = randomUUID();
    return tx.user.create({
      data: {
        id,
        email: normalized,
        name: "Visitor",
        kind: "client",
        clientStatus: status,
        emailVerified: status !== "unverified",
        statusUpdatedBy: actorId,
        updatedBy: actorId,
        ...(status === "suspended" ? suspensionData({ suspensionCount: 0 }, new Date()) : {}),
        accounts: { create: { accountId: id, providerId: "credential", password } },
      },
    });
  });
}
export async function changeClientStatus(
  id: string,
  status: ClientStatus,
  actorId: string,
  revoke = false,
) {
  return prisma.$transaction(async (tx) => {
    const user = await readClient(tx, id);
    if (!user) throw new ClientHttpError(404, "notFound");
    if (revoke ? user.clientStatus !== "banned" : user.clientStatus === "banned")
      throw new ClientHttpError(409, "statusConflict");
    if (status === "unverified" && user.emailVerified)
      throw new ClientHttpError(409, "verificationPermanent");
    if (user.clientStatus === status) return;
    const now = new Date();
    await tx.user.update({
      where: { id },
      data: {
        clientStatus: status,
        suspendedUntil: null,
        emailVerified: user.emailVerified || status !== "unverified",
        statusUpdatedAt: now,
        statusUpdatedBy: actorId,
        updatedBy: actorId,
        ...(status === "suspended" ? suspensionData(user, now) : {}),
        ...(status === "banned" ? { suspensionCount: 0 } : {}),
      },
    });
    await tx.clientSubmissionLimit.updateMany({ where: { userId: id }, data: { rejectedAt: [] } });
    if (status !== "unverified")
      await tx.verification.deleteMany({
        where: { identifier: { startsWith: verificationPrefix(id) } },
      });
  });
}
export async function deleteClientAccounts(ids: string[]) {
  await prisma.$transaction(async (tx) => {
    for (const id of [...ids].sort()) {
      await lockClient(tx, id);
      const user = await tx.user.findFirst({ where: { id, kind: "client" }, select: { id: true } });
      if (!user) throw new ClientHttpError(404, "notFound");
      await tx.verification.deleteMany({
        where: { identifier: { startsWith: verificationPrefix(id) } },
      });
      // Khóa ngoại SetNull giữ lại suy nghĩ; session, credential và quota tự xóa theo tài khoản.
      await tx.user.delete({ where: { id } });
    }
  });
}
export async function cleanupExpiredClients(now = new Date()) {
  const expired = await prisma.user.findMany({
    where: {
      kind: "client",
      emailVerified: false,
      createdAt: { lte: new Date(now.getTime() - CLIENT_LIMITS.UNVERIFIED_LIFETIME_MS) },
    },
    select: { id: true },
  });
  let deleted = 0;
  for (const { id } of expired) {
    const removed = await prisma.$transaction(async (tx) => {
      const user = await readClient(tx, id, now);
      return !user;
    });
    if (removed) deleted++;
  }
  await prisma.clientAuthIpLimit.deleteMany({ where: { expiresAt: { lte: now } } });
  await prisma.verification.deleteMany({
    where: { identifier: { startsWith: CLIENT_VERIFICATION_PREFIX }, expiresAt: { lte: now } },
  });
  return deleted;
}
export async function saveClientThought(
  id: string,
  data: Pick<
    Prisma.SubmissionCreateInput,
    "description" | "lat" | "lng" | "weather_summary" | "weather_code"
  >,
) {
  // Kết quả từ chối phải commit trước khi trả lỗi HTTP để không rollback bộ đếm vi phạm.
  const result = await prisma.$transaction(async (tx) => {
    const user = await readClient(tx, id);
    if (!user) return { code: "unauthorized", status: 401 };
    if (user.clientStatus !== "verified") return { code: user.clientStatus, status: 403 };
    const now = new Date();
    const identity = clientIdentity(user, now);
    const state = user.submissionLimit;
    const rejectedAt = (state?.rejectedAt ?? []).filter(
      (date) => date.getTime() > now.getTime() - CLIENT_LIMITS.ABUSE_WINDOW_MS,
    );
    if (identity.availability !== "ready") {
      rejectedAt.push(now);
      if (rejectedAt.length > CLIENT_LIMITS.MAX_REJECTED_ATTEMPTS) {
        const restriction = suspensionData(user, now);
        await tx.user.update({ where: { id }, data: { ...restriction, statusUpdatedBy: null } });
        await tx.clientSubmissionLimit.update({ where: { userId: id }, data: { rejectedAt: [] } });
        return { code: restriction.clientStatus, status: 403 };
      }
      await tx.clientSubmissionLimit.update({ where: { userId: id }, data: { rejectedAt } });
      return { code: identity.availability, status: 429 };
    }
    const submission = await tx.submission.create({
      data: { ...data, clientUserId: id, author_uuid: id, updatedBy: "client" },
      select: {
        id: true,
        description: true,
        lat: true,
        lng: true,
        weather_summary: true,
        weather_code: true,
      },
    });
    const submissions = state?.day === hostingDay(now) ? state.submissions + 1 : 1;
    const next = { day: hostingDay(now), submissions, lastSubmittedAt: now, rejectedAt };
    await tx.clientSubmissionLimit.upsert({
      where: { userId: id },
      create: { userId: id, ...next },
      update: next,
    });
    return { submission };
  });
  if ("code" in result) throw new ClientHttpError(result.status!, result.code!);
  return result.submission;
}
