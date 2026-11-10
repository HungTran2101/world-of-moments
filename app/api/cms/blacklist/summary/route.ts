import { requireCmsSession } from "@/handlers/auth";
import { cmsJson, withCmsRequest } from "@/handlers/http";
import { prisma } from "@/lib/prisma";
import { activeBlacklistWhere } from "@/lib/submissionProtection";
import { permissions } from "@/services/permission";
import type { CmsBlacklistSummary } from "@/services/cms/blacklist/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: blacklist.show
export async function GET(request: Request) {
  return withCmsRequest(request, async () => {
    await requireCmsSession(request.headers, permissions.BLACKLIST_SHOW);
    // Hai số đếm cùng snapshot/thời điểm, độc lập từ khóa và tab đang xem.
    const now = new Date();
    const summary = await prisma.$transaction(async tx => ({
      activeBrowserBlocks: await tx.submissionBlacklist.count({
        where: activeBlacklistWhere("browser", now)
      }),
      activeNetworkBans: await tx.submissionBlacklist.count({
        where: activeBlacklistWhere("network", now)
      })
    }), {
      isolationLevel: "RepeatableRead"
    });
    return cmsJson(summary satisfies CmsBlacklistSummary);
  });
}
