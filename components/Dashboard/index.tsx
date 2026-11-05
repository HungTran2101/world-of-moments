"use client";

import {
  permissions,
  ROUTE_PATHS,
  DASHBOARD_SUMMARY_PERIODS,
  DASHBOARD_TREND_PERIODS,
  DEFAULT_DASHBOARD_PERIOD,
} from "@/services/constant";
import type { SubmissionValidity } from "@/services/constant";
import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Info } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Header } from "@/components/shared/Header";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { LoadingDots } from "@/components/shared/LoadingDots";
import { ErrorNotice } from "@/components/shared/Forms";
import { Button } from "@/components/ui/button";
import { BADGE_COLOR_CLASSES } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCmsStore } from "@/store/cmsStore";
import { checkPermission } from "@/services/permission";
import {
  getCmsDashboardSummary,
  getCmsDashboardTrend,
} from "@/services/cms/dashboard";
import type {
  DashboardSummary,
  DashboardSummaryPeriod,
  DashboardTrend,
  DashboardTrendPeriod,
} from "@/services/cms/dashboard/types";

const SUMMARY_METRICS = [
  "total",
  "publiclyVisible",
  "needsInspection",
  "valid",
  "invalid",
] as const satisfies readonly (keyof DashboardSummary)[];

const SUMMARY_METRIC_COLORS = {
  total: "default",
  publiclyVisible: "success",
  needsInspection: "warning",
  valid: "success",
  invalid: "error",
} as const satisfies Record<keyof DashboardSummary, keyof typeof BADGE_COLOR_CLASSES>;

const SUMMARY_METRIC_VALIDITIES: Partial<Record<keyof DashboardSummary, SubmissionValidity>> = {
  publiclyVisible: "valid",
  needsInspection: "need-inspect",
  valid: "valid",
  invalid: "invalid",
};

const CHART_TICK_MARGIN_PX = 8;
const CHART_MIN_TICK_GAP_PX = 32;
const CHART_Y_AXIS_WIDTH_PX = 40;
const CHART_LINE_WIDTH_PX = 2;
const CHART_ACTIVE_DOT_RADIUS_PX = 4;
const CHART_MARGIN_PX = { top: 8, right: 12, bottom: 4, left: 0 };

function PeriodFilter<Period extends DashboardSummaryPeriod>({
  section,
  periods,
  value,
  onChange,
}: {
  section: "summary" | "trend";
  periods: readonly Period[];
  value: Period;
  onChange: (value: Period) => void;
}) {
  const t = useTranslations("dashboard");
  const id = `dashboard-${section}-period`;

  return (
    <div className="cms-dashboardFilter">
      <label htmlFor={id}>{t("period")}</label>
      <Select
        id={id}
        aria-label={`${t(section)}: ${t("period")}`}
        popupClassName="cms-popup"
        allowClear={false}
        value={value}
        onValueChange={(next) => {
          const period = periods.find((item) => item === next);
          if (period) onChange(period);
        }}
        options={periods.map((period) => ({
          value: period,
          label: t(`periods.${period as DashboardSummaryPeriod}`),
        }))}
      />
    </div>
  );
}

function VisibilityTooltip() {
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="cms-dashboardInfo"
          aria-label={t("visibilityHelp")}
          onClick={(event) => {
            // Radix tự đóng khi click; giữ thao tác bật/tắt để người dùng cảm ứng đọc được tooltip.
            event.preventDefault();
            setOpen((value) => !value);
          }}
        >
          <Info aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("visibilityCondition")}</TooltipContent>
    </Tooltip>
  );
}

function TrendChart({ trend }: { trend: DashboardTrend }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const number = new Intl.NumberFormat(locale);
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    ...(trend.interval === "month"
      ? { month: "short", year: "numeric" }
      : { day: "2-digit", month: "short", year: "numeric" }),
  });
  const label = (value: string) => date.format(new Date(`${value}T00:00:00Z`));
  const axisDate = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    ...(trend.interval === "month"
      ? { month: "short", year: "numeric" }
      : { day: "2-digit", month: "short" }),
  });
  const chartConfig = {
    count: { label: t("submissions"), color: "var(--color-ring)" },
  } satisfies ChartConfig;
  const total = trend.points.reduce((sum, point) => sum + point.count, 0);
  if (!total) return <p className="cms-dashboardEmpty">{t("emptyTrend")}</p>;

  return (
    <figure className="cms-dashboardFigure">
      <figcaption>
        {t(trend.interval === "day" ? "dailyCaption" : "monthlyCaption", { count: total })}
      </figcaption>
      <ChartContainer config={chartConfig} className="cms-dashboardChart">
        <LineChart accessibilityLayer data={trend.points} margin={CHART_MARGIN_PX}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tickMargin={CHART_TICK_MARGIN_PX}
            minTickGap={CHART_MIN_TICK_GAP_PX}
            tickFormatter={(value: string) => axisDate.format(new Date(`${value}T00:00:00Z`))}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={CHART_Y_AXIS_WIDTH_PX}
            tickFormatter={(value: number) => number.format(value)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => label(String(value))}
                formatter={(value) => (
                  <>
                    <span className="text-muted-foreground">{t("submissions")}</span>
                    <span className="font-medium tabular-nums">
                      {typeof value === "number" ? number.format(value) : String(value)}
                    </span>
                  </>
                )}
              />
            }
          />
          <Line
            dataKey="count"
            type="monotone"
            stroke="var(--color-count)"
            strokeWidth={CHART_LINE_WIDTH_PX}
            dot={trend.points.length === 1}
            activeDot={{ r: CHART_ACTIVE_DOT_RADIUS_PX }}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
      <details className="cms-dashboardData">
        <summary>{t("viewChartData")}</summary>
        <div className="cms-tableScroll">
          <table className="cms-table">
            <caption className="sr-only">{t("trend")}</caption>
            <thead>
              <tr>
                <th scope="col">{t(trend.interval === "day" ? "date" : "month")}</th>
                <th scope="col">{t("submissions")}</th>
              </tr>
            </thead>
            <tbody>
              {trend.points.map((point) => (
                <tr key={point.date}>
                  <th scope="row">{label(point.date)}</th>
                  <td>{number.format(point.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

export function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const user = useCmsStore((state) => state.user);
  const [timeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [summaryPeriod, setSummaryPeriod] = useState<DashboardSummaryPeriod>(DEFAULT_DASHBOARD_PERIOD);
  const [trendPeriod, setTrendPeriod] = useState<DashboardTrendPeriod>(DEFAULT_DASHBOARD_PERIOD);
  const canView = checkPermission(user?.scopes ?? [], permissions.DASHBOARD_SHOW);
  const summary = useQuery({
    queryKey: ["cms", "dashboard", "summary", summaryPeriod, timeZone],
    queryFn: ({ signal }) =>
      getCmsDashboardSummary({ period: summaryPeriod, timeZone }, { signal }),
    enabled: canView,
  });
  const trend = useQuery({
    queryKey: ["cms", "dashboard", "trend", trendPeriod, timeZone],
    queryFn: ({ signal }) =>
      getCmsDashboardTrend({ period: trendPeriod, timeZone }, { signal }),
    enabled: canView,
  });
  const number = new Intl.NumberFormat(locale);

  return (
    <>
      <Header title={t("nav.dashboard")} />
      <CmsPageContent>
        <Breadcrumbs
          label={t("common.breadcrumbs")}
          items={[{ label: t("nav.dashboard") }]}
        />
        <div className="cms-dashboard">
          <section
            className="cms-dashboardPanel"
            aria-labelledby="dashboard-summary-title"
            aria-busy={summary.isFetching}
          >
            <div className="cms-dashboardPanelHeader">
              <h2 id="dashboard-summary-title">{t("dashboard.summary")}</h2>
              <PeriodFilter
                section="summary"
                periods={DASHBOARD_SUMMARY_PERIODS}
                value={summaryPeriod}
                onChange={setSummaryPeriod}
              />
            </div>
            <p className="cms-dashboardDescription">
              {t("dashboard.summaryDescription")}
            </p>
            {summary.isError ? (
              <ErrorNotice
                error={summary.error}
                retryLoading={summary.isFetching}
                onRetry={() => void summary.refetch()}
              />
            ) : summary.isPending ? (
              <p role="status" aria-label={t("common.loading")}><LoadingDots /></p>
            ) : (
              <dl className="cms-dashboardMetrics" aria-live="polite">
                {SUMMARY_METRICS.map((metric) => (
                  <div
                    key={metric}
                    className={cn("cms-dashboardMetric", BADGE_COLOR_CLASSES[SUMMARY_METRIC_COLORS[metric]])}
                  >
                    <dt>
                      <span>{t(`dashboard.metrics.${metric}`)}</span>
                      {metric === "publiclyVisible" && <VisibilityTooltip />}
                      {SUMMARY_METRIC_VALIDITIES[metric] && checkPermission(user?.scopes ?? [], permissions.SUBMISSION_SHOW) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              className="cms-dashboardReviewLink"
                              href={`${ROUTE_PATHS.SUBMISSIONS}?${metric === "publiclyVisible" ? "status=published&" : ""}validity=${SUMMARY_METRIC_VALIDITIES[metric]}`}
                              aria-label={`${t("dashboard.viewSubmissions")}: ${t(`dashboard.metrics.${metric}`)}`}
                            >
                              <ArrowUpRight aria-hidden="true" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("dashboard.viewSubmissions")}: {t(`dashboard.metrics.${metric}`)}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </dt>
                    <dd>
                      <span className="cms-dashboardValue">{number.format(summary.data[metric])}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
          <section
            className="cms-dashboardPanel"
            aria-labelledby="dashboard-trend-title"
            aria-busy={trend.isFetching}
          >
            <div className="cms-dashboardPanelHeader">
              <h2 id="dashboard-trend-title">{t("dashboard.trend")}</h2>
              <PeriodFilter
                section="trend"
                periods={DASHBOARD_TREND_PERIODS}
                value={trendPeriod}
                onChange={setTrendPeriod}
              />
            </div>
            {trend.isError ? (
              <ErrorNotice
                error={trend.error}
                retryLoading={trend.isFetching}
                onRetry={() => void trend.refetch()}
              />
            ) : trend.isPending ? (
              <p role="status" aria-label={t("common.loading")}><LoadingDots /></p>
            ) : <TrendChart trend={trend.data} />}
          </section>
        </div>
      </CmsPageContent>
    </>
  );
}
