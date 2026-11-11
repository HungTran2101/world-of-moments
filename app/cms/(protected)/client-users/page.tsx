import { ROUTE_PATHS } from "@/services/constant";
import { ClientUsersPage } from "@/components/ClientUsers";
import { createProtectedPage } from "@/components/ProtectedPage";
export default createProtectedPage(ClientUsersPage, ROUTE_PATHS.CLIENT_USERS);
