import { DashboardPage } from "@/components/Dashboard";
import { createProtectedPage } from "@/components/ProtectedPage";
import { ROUTE_PATHS } from "@/services/routes";

export default createProtectedPage(DashboardPage, ROUTE_PATHS.DASHBOARD);
