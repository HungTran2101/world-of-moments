import { ROUTE_PATHS } from "@/services/constant";
import { ClientUserDetailPage } from "@/components/ClientUserDetail";
import { createProtectedPage } from "@/components/ProtectedPage";
export default createProtectedPage(ClientUserDetailPage, ROUTE_PATHS.CLIENT_USER_DETAIL);
