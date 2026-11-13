import { ROUTE_PATHS } from "@/services/constant";
import { RoleDetailPage } from "@/components/RoleDetail";
import { createProtectedPage } from "@/components/ProtectedPage";

export default createProtectedPage(RoleDetailPage, ROUTE_PATHS.ROLE_DETAIL);
