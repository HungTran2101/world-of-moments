import { GeneralPage } from "@/components/General";
import { createProtectedPage } from "@/components/ProtectedPage";
import { ROUTE_PATHS } from "@/services/routes";

export default createProtectedPage(GeneralPage, ROUTE_PATHS.GENERAL);
