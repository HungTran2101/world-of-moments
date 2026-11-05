import { ROUTE_PATHS } from "@/services/constant";
import { ChangePasswordPage } from "@/components/ChangePassword";
import { createProtectedPage } from "@/components/ProtectedPage";

export default createProtectedPage(ChangePasswordPage, ROUTE_PATHS.CHANGE_PASSWORD);
