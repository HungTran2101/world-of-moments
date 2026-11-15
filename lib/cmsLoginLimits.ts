import "server-only";
import { createHash } from "node:crypto";
import { constants } from "@/app/api/constant";
import { CmsHttpError } from "@/app/api/_handlers/http";
import { prisma } from "@/lib/prisma";
import { submissionClientIp } from "@/lib/submissionIp";

export function cmsLoginIp(request: Request) {
  const ip = submissionClientIp(request.headers, process.env.NODE_ENV === "production");
  if (!ip) throw new CmsHttpError(503, "errors.loginUnavailable");
  return ip;
}

export async function limitCmsLogin(request: Request, username?: string) {
  const ip = cmsLoginIp(request);
  const scopes = [{ identifier: `ip:${ip}`, maximum: constants.CMS_LOGIN_MAX_ATTEMPTS_PER_IP }];
  if (username) {
    scopes.push({
      identifier: `ip-user:${JSON.stringify([ip, username.trim().toLowerCase()])}`,
      maximum: constants.CMS_LOGIN_MAX_ATTEMPTS_PER_IP_USERNAME,
    });
  }
  const limits = scopes.map(({ identifier, maximum }) => ({
    key: `rolling:${createHash("sha256").update(identifier).digest("hex")}`, maximum,
  })).sort((a, b) => a.key.localeCompare(b.key));

  await prisma.cmsLoginLimit.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  const retryAt = await prisma.$transaction(async (tx) => {
    // Khóa theo cùng thứ tự để các yêu cầu đồng thời không vượt hạn mức hoặc gây deadlock.
    for (const { key } of limits) {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`cms-login:${key}`}, 0))`;
    }
    const now = new Date();
    const windowStart = now.getTime() - constants.CMS_LOGIN_RATE_LIMIT_WINDOW_MS;
    const histories = [];
    let retryTime = 0;
    for (const { key, maximum } of limits) {
      const row = await tx.cmsLoginLimit.findUnique({ where: { key } });
      const attemptsAt = (row?.attemptsAt ?? []).filter((date) => date.getTime() > windowStart);
      histories.push({ key, maximum, attemptsAt });
      if (attemptsAt.length >= maximum) {
        // Chờ đến khi mọi phạm vi đều còn chỗ; mỗi lượt tự hết hạn sau 15 phút.
        const ordered = attemptsAt.map((date) => date.getTime()).sort((a, b) => a - b);
        retryTime = Math.max(retryTime,
          ordered[ordered.length - maximum] + constants.CMS_LOGIN_RATE_LIMIT_WINDOW_MS);
      }
    }
    // Yêu cầu bị từ chối không ghi thêm thời gian, tránh kéo dài thời gian chờ.
    if (retryTime) return new Date(retryTime);
    for (const { key, maximum, attemptsAt } of histories) {
      const timestamps = [...attemptsAt, now].slice(-maximum);
      const state = {
        attemptsAt: timestamps,
        attempts: timestamps.length,
        expiresAt: new Date(now.getTime() + constants.CMS_LOGIN_RATE_LIMIT_WINDOW_MS),
      };
      await tx.cmsLoginLimit.upsert({ where: { key }, create: { key, ...state }, update: state });
    }
    return null;
  }, { timeout: constants.CMS_LOGIN_TRANSACTION_TIMEOUT_MS });
  if (retryAt) {
    const error = new CmsHttpError(429, "errors.rateLimited");
    error.retryAt = retryAt;
    throw error;
  }
}
