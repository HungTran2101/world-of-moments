import { RoleDetailPage } from "@/components/RoleDetail";
import { createProtectedPage } from "@/components/ProtectedPage";
import { ROUTE_PATHS } from "@/services/routes";

export default createProtectedPage(RoleDetailPage, ROUTE_PATHS.ROLE_DETAIL);
