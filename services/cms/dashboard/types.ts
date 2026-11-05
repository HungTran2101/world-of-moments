import type { DASHBOARD_SUMMARY_PERIODS, DASHBOARD_TREND_PERIODS } from "@/services/constant";

export type DashboardSummaryPeriod = (typeof DASHBOARD_SUMMARY_PERIODS)[number];
export type DashboardTrendPeriod = (typeof DASHBOARD_TREND_PERIODS)[number];

export interface DashboardSummary {
  total: number;
  publiclyVisible: number;
  needsInspection: number;
  valid: number;
  invalid: number;
}

export interface DashboardTrend {
  interval: "day" | "month";
  points: { date: string; count: number }[];
}

export interface DashboardParams<Period extends DashboardSummaryPeriod> {
  period: Period;
  timeZone: string;
}
