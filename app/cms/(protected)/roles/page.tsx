import { RolesPage } from "@/components/Roles";
import { createProtectedPage } from "@/components/ProtectedPage";
import { ROUTE_PATHS } from "@/services/routes";

export default createProtectedPage(RolesPage, ROUTE_PATHS.ROLES);
