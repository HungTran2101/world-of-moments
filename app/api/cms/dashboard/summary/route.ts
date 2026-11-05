import { permissions, DASHBOARD_PERIOD_DAYS } from "@/services/constant";
import { dashboardCalendarBounds } from "@/app/api/_shared";
import { prisma } from "@/lib/prisma";
import { requireCmsSession } from "@/handlers/auth";
import { cmsJson, withCmsRequest } from "@/handlers/http";
import { dashboardSummarySchema } from "@/services/schemas";
import type { DashboardSummary } from "@/services/cms/dashboard/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: dashboard.show
export async function GET(request: Request) {
  return withCmsRequest(request, async () => {
    await requireCmsSession(request.headers, permissions.DASHBOARD_SHOW);
    const { period, timeZone } = await dashboardSummarySchema.validate(
      Object.fromEntries(new URL(request.url).searchParams),
      { abortEarly: false, stripUnknown: true },
    );
    const days = period === "all" ? null : DASHBOARD_PERIOD_DAYS[period];
    // Đếm trạng thái hiện tại trong nhóm bài được tạo ở khoảng đã chọn, không suy diễn lịch sử duyệt.
    const [summary] = await prisma.$queryRaw<DashboardSummary[]>`
      WITH ${dashboardCalendarBounds(timeZone)}
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE status = 'published' AND validity = 'valid')::int AS "publiclyVisible",
        count(*) FILTER (WHERE validity = 'need-inspect')::int AS "needsInspection",
        count(*) FILTER (WHERE validity = 'valid')::int AS valid,
        count(*) FILTER (WHERE validity = 'invalid')::int AS invalid
      FROM submissions CROSS JOIN calendar
      WHERE created_at <= now_utc AND (
        ${days}::int IS NULL OR
        created_at >= (((today - (${days}::int - 1))::timestamp AT TIME ZONE tz) AT TIME ZONE 'UTC')
      )
    `;
    return cmsJson(summary);
  });
}
