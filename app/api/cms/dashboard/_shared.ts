import "server-only";

import { Prisma } from "@prisma/client";

export function dashboardCalendarBounds(timeZone: string, now = new Date()) {
  // Prisma lưu timestamp UTC không kèm múi giờ; đổi sang ngày địa phương trước khi tính khoảng lịch.
  return Prisma.sql`
    settings AS (
      SELECT ${timeZone}::text AS tz, ${now}::timestamp AS now_utc
    ), calendar AS (
      SELECT *, (now_utc AT TIME ZONE 'UTC' AT TIME ZONE tz)::date AS today
      FROM settings
    )
  `;
}
