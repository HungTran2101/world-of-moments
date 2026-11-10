import "server-only";
import type { Prisma } from "@prisma/client";
import { constants } from "@/app/api/constant";
import { prisma } from "@/lib/prisma";

const MILLISECONDS_PER_DAY = 86_400_000;

export async function pruneBlacklistEvents(now = new Date(), db: Pick<Prisma.TransactionClient, "blacklistEvent"> = prisma) {
  const cutoff = new Date(now.getTime() - constants.BLACKLIST_EVENT_RETENTION_DAYS * MILLISECONDS_PER_DAY);

  // Giữ sự kiện đang chặn; thời gian lưu bắt đầu khi thu hồi hoặc hết hạn thực tế.
  return db.blacklistEvent.deleteMany({
    where: {
      OR: [{
        endedAt: {
          lt: cutoff
        }
      }, {
        endedAt: null,
        expiresAt: {
          lt: cutoff
        }
      }]
    }
  });
}
