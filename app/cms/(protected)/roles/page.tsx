import { ROUTE_PATHS } from "@/services/constant";
import { RolesPage } from "@/components/Roles";
import { createProtectedPage } from "@/components/ProtectedPage";

export default createProtectedPage(RolesPage, ROUTE_PATHS.ROLES);
