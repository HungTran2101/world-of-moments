"use client";

import { useTranslations } from "next-intl";
import { formatDateTime } from "@/lib/utils";

export function RecordAudit({
  record,
}: {
  record: { createdAt: string; updatedAt: string; updatedBy: string | null };
}) {
  const t = useTranslations();
  return (
    <dl className="grid gap-2 border-t border-border pt-4 mt-4">
      <div>
        <dt className="cms-muted">{t("common.createdAt")}</dt>
        <dd>
          <time dateTime={record.createdAt}>
            {formatDateTime(record.createdAt)}
          </time>
        </dd>
      </div>
      <div>
        <dt className="cms-muted">{t("common.updatedAt")}</dt>
        <dd>
          <time dateTime={record.updatedAt}>
            {formatDateTime(record.updatedAt)}
          </time>
        </dd>
      </div>
      <div>
        <dt className="cms-muted">{t("common.updatedBy")}</dt>
        <dd>{record.updatedBy ?? t("common.unknown")}</dd>
      </div>
    </dl>
  );
}
