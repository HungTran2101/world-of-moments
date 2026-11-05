import { ROUTE_PATHS } from "@/services/constant";
import { GeneralPage } from "@/components/General";
import { createProtectedPage } from "@/components/ProtectedPage";

export default createProtectedPage(GeneralPage, ROUTE_PATHS.GENERAL);
