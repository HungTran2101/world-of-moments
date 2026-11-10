import "server-only";
import type { BlacklistScope, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { constants } from "@/app/api/constant";
import { pruneBlacklistEvents } from "@/lib/blacklistRetention";

type ActiveScope = Exclude<BlacklistScope, "legacy">;

export function activeBlacklistWhere(scope: ActiveScope, now = new Date()): Prisma.SubmissionBlacklistWhereInput {
  return {
    scope,
    isActive: true,
    OR: [{
      expiresAt: null
    }, {
      expiresAt: {
        gt: now
      }
    }]
  };
}

async function lockTarget(tx: Prisma.TransactionClient, scope: ActiveScope, targetId: string) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`submission:${scope}:${targetId}`}, 0))`;
}

function remainingSeconds(expiresAt: Date, now: Date) {
  return Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / constants.MILLISECONDS_PER_SECOND));
}

async function createBlock(tx: Prisma.TransactionClient, scope: ActiveScope, targetId: string, ip: string, now: Date, expiresAt: Date | null) {
  const previous = await tx.submissionBlacklist.findUnique({
    where: {
      scope_targetId: {
        scope,
        targetId
      }
    }
  });
  if (previous) {
    // Đóng lần hết hạn trước khi thêm sự kiện mới, giữ nguyên thời điểm hết hạn thực tế.
    await tx.blacklistEvent.updateMany({
      where: {
        blacklistId: previous.id,
        endedAt: null
      },
      data: {
        endedAt: previous.expiresAt ?? now,
        endReason: "expired"
      }
    });
  }
  const event = {
    ip,
    createdAt: now,
    expiresAt
  };
  await tx.submissionBlacklist.upsert({
    where: {
      scope_targetId: {
        scope,
        targetId
      }
    },
    create: {
      scope,
      targetId,
      ip,
      expiresAt,
      lastBlockedAt: now,
      events: {
        create: event
      }
    },
    update: {
      ip,
      isActive: true,
      endReason: null,
      expiresAt,
      blacklistCount: {
        increment: 1
      },
      lastBlockedAt: now,
      events: {
        create: event
      }
    }
  });
}

export async function checkSubmissionProtection(ip: string, clientId: string | null) {
  const cleanupTime = new Date();
  await pruneBlacklistEvents(cleanupTime);
  await prisma.submissionClientLimit.deleteMany({
    where: {
      expiresAt: {
        lte: cleanupTime
      }
    }
  });
  await prisma.submissionNetworkLimit.deleteMany({
    where: {
      expiresAt: {
        lte: cleanupTime
      }
    }
  });
  return prisma.$transaction(async tx => {
    // Luôn khóa mạng trước, trình duyệt sau để các request nhiều IP không tạo vòng chờ.
    await lockTarget(tx, "network", ip);
    const networkNow = new Date();
    const networkBlock = await tx.submissionBlacklist.findFirst({
      where: {
        ...activeBlacklistWhere("network", networkNow),
        targetId: ip
      }
    });
    if (networkBlock?.expiresAt) return {
      status: "network-banned" as const,
      retryAfter: remainingSeconds(networkBlock.expiresAt, networkNow)
    };
    const network = await tx.submissionNetworkLimit.findUnique({
      where: {
        ip
      }
    });
    const attemptsAt = (network?.attemptsAt ?? []).filter(time => networkNow.getTime() - time.getTime() < constants.SUBMISSION_NETWORK_WINDOW_MS);
    if (attemptsAt.length >= constants.SUBMISSION_NETWORK_MAX_ATTEMPTS) {
      const expiresAt = new Date(networkNow.getTime() + constants.SUBMISSION_NETWORK_BAN_MS);
      await createBlock(tx, "network", ip, ip, networkNow, expiresAt);
      await tx.submissionNetworkLimit.deleteMany({
        where: {
          ip
        }
      });
      return {
        status: "network-banned" as const,
        retryAfter: remainingSeconds(expiresAt, networkNow)
      };
    }
    attemptsAt.push(networkNow);
    const networkData = {
      attemptsAt,
      expiresAt: new Date(networkNow.getTime() + constants.SUBMISSION_NETWORK_WINDOW_MS)
    };
    await tx.submissionNetworkLimit.upsert({
      where: {
        ip
      },
      create: {
        ip,
        ...networkData
      },
      update: networkData
    });
    if (!clientId) return {
      status: "identity-required" as const
    };
    await lockTarget(tx, "browser", clientId);
    const now = new Date();
    const block = await tx.submissionBlacklist.findFirst({
      where: {
        ...activeBlacklistWhere("browser", now),
        targetId: clientId
      }
    });
    if (block) return {
      status: "browser-blocked" as const
    };
    const state = await tx.submissionClientLimit.findUnique({
      where: {
        clientId
      }
    });
    const rejectedAt = (state?.rejectedAt ?? []).filter(time => now.getTime() - time.getTime() < constants.SUBMISSION_ABUSE_WINDOW_MS);
    const limited = state && now.getTime() - state.lastAllowedAt.getTime() < constants.RATE_LIMIT_WINDOW_MS;
    if (limited) rejectedAt.push(now);
    if (rejectedAt.length >= constants.SUBMISSION_ABUSE_MAX_RETRIES) {
      await createBlock(tx, "browser", clientId, ip, now, null);
      await tx.submissionClientLimit.deleteMany({
        where: {
          clientId
        }
      });
      return {
        status: "browser-blocked" as const
      };
    }
    const data = {
      lastAllowedAt: limited ? state.lastAllowedAt : now,
      rejectedAt,
      expiresAt: new Date(now.getTime() + constants.SUBMISSION_ABUSE_WINDOW_MS)
    };
    await tx.submissionClientLimit.upsert({
      where: {
        clientId
      },
      create: {
        clientId,
        ...data
      },
      update: data
    });
    return limited ? {
      status: "limited" as const,
      retryAfter: remainingSeconds(new Date(state.lastAllowedAt.getTime() + constants.RATE_LIMIT_WINDOW_MS), now)
    } : {
      status: "allowed" as const
    };
  });
}

export async function revokeBlacklist(id: string, eventId: string, actor: string) {
  return prisma.$transaction(async tx => {
    const record = await tx.submissionBlacklist.findUnique({
      where: {
        id
      }
    });
    if (!record) return "not-found" as const;
    if (record.scope === "legacy") return "conflict" as const;
    await lockTarget(tx, record.scope, record.targetId);
    const event = await tx.blacklistEvent.findFirst({
      where: {
        id: eventId,
        blacklistId: id
      }
    });
    if (!event) return "conflict" as const;
    // Lệnh cũ chỉ nhắm sự kiện đã thấy; không thu hồi lần chặn mới hơn.
    if (event.endedAt) return "revoked" as const;
    const now = new Date();
    const expired = event.expiresAt && event.expiresAt <= now;
    await tx.blacklistEvent.update({
      where: {
        id: eventId
      },
      data: expired ? {
        endedAt: event.expiresAt,
        endReason: "expired"
      } : {
        endedAt: now,
        endReason: "revoked",
        revokedAt: now,
        revokedBy: actor
      }
    });
    await tx.submissionBlacklist.update({
      where: {
        id
      },
      data: {
        isActive: false,
        endReason: expired ? "expired" : "revoked"
      }
    });
    if (record.scope === "browser") await tx.submissionClientLimit.deleteMany({
      where: {
        clientId: record.targetId
      }
    }); else await tx.submissionNetworkLimit.deleteMany({
      where: {
        ip: record.targetId
      }
    });
    return "revoked" as const;
  });
}
