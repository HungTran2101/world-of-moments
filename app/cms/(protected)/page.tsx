import { OverviewPage } from "@/components/Overview";
import { createProtectedPage } from "@/components/ProtectedPage";
import { ROUTE_PATHS } from "@/services/routes";

export default createProtectedPage(OverviewPage, ROUTE_PATHS.OVERVIEW);
