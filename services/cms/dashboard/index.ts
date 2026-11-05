import { cmsRequest } from "@/services/shared/cms-api";
import type { ApiRequestOptions } from "@/services/shared/api";
import type {
  DashboardParams,
  DashboardSummary,
  DashboardSummaryPeriod,
  DashboardTrend,
  DashboardTrendPeriod,
} from "./types";

export function getCmsDashboardSummary(
  params: DashboardParams<DashboardSummaryPeriod>,
  options?: ApiRequestOptions,
) {
  return cmsRequest<DashboardSummary>(
    `/dashboard/summary?${new URLSearchParams({ ...params })}`,
    options,
  );
}

export function getCmsDashboardTrend(
  params: DashboardParams<DashboardTrendPeriod>,
  options?: ApiRequestOptions,
) {
  return cmsRequest<DashboardTrend>(
    `/dashboard/trend?${new URLSearchParams({ ...params })}`,
    options,
  );
}
