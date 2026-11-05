import { ROUTE_PATHS } from "@/services/constant";
import { DashboardPage } from "@/components/Dashboard";
import { createProtectedPage } from "@/components/ProtectedPage";

export default createProtectedPage(DashboardPage, ROUTE_PATHS.DASHBOARD);
