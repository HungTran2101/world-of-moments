import { permissions } from "@/services/permission";
import { DASHBOARD_DAILY_HISTORY_LIMIT_DAYS, DASHBOARD_PERIOD_DAYS } from "@/services/constant";
import { dashboardCalendarBounds } from "@/app/api/_shared";
import { prisma } from "@/lib/prisma";
import { requireCmsSession } from "@/handlers/auth";
import { cmsJson, withCmsRequest } from "@/handlers/http";
import { dashboardTrendSchema } from "@/services/schemas";
import type { DashboardTrend } from "@/services/cms/dashboard/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: dashboard.show
export async function GET(request: Request) {
  return withCmsRequest(request, async () => {
    await requireCmsSession(request.headers, permissions.DASHBOARD_SHOW);
    const { period, timeZone } = await dashboardTrendSchema.validate(
      Object.fromEntries(new URL(request.url).searchParams),
      { abortEarly: false, stripUnknown: true },
    );
    type Bucket = DashboardTrend["points"][number] & {
      interval: DashboardTrend["interval"];
    };
    // Gom nhóm tại DB và bù khoảng trống bằng generate_series, tránh tải từng bài về server.
    const rows = await prisma.$queryRaw<Bucket[]>`
      WITH ${dashboardCalendarBounds(timeZone)}, extent AS (
        SELECT calendar.*,
          CASE WHEN ${period} = '30d' THEN today - (${DASHBOARD_PERIOD_DAYS["30d"]}::int - 1)
          ELSE COALESCE((
            SELECT (min(created_at) AT TIME ZONE 'UTC' AT TIME ZONE tz)::date
            FROM submissions WHERE created_at <= now_utc
          ), today) END AS start_day
        FROM calendar
      ), range AS (
        SELECT *, CASE WHEN ${period} = 'all' AND today - start_day + 1 > ${DASHBOARD_DAILY_HISTORY_LIMIT_DAYS}::int
          THEN 'month' ELSE 'day' END AS unit
        FROM extent
      ), counts AS (
        SELECT date_trunc(unit, created_at AT TIME ZONE 'UTC' AT TIME ZONE tz) AS bucket,
          count(*)::int AS count
        FROM submissions CROSS JOIN range
        WHERE created_at <= now_utc
          AND created_at >= ((start_day::timestamp AT TIME ZONE tz) AT TIME ZONE 'UTC')
        GROUP BY bucket
      )
      SELECT to_char(bucket, 'YYYY-MM-DD') AS date, COALESCE(counts.count, 0)::int AS count,
        range.unit AS interval
      FROM range CROSS JOIN LATERAL generate_series(
        date_trunc(unit, start_day::timestamp), date_trunc(unit, today::timestamp),
        CASE WHEN unit = 'month' THEN interval '1 month' ELSE interval '1 day' END
      ) AS series(bucket)
      LEFT JOIN counts USING (bucket)
      ORDER BY bucket
    `;
    return cmsJson({
      interval: rows[0]?.interval ?? "day",
      points: rows.map(({ date, count }) => ({ date, count })),
    } satisfies DashboardTrend);
  });
}
