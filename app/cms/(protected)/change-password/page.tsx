import { ChangePasswordPage } from "@/components/ChangePassword";
import { createProtectedPage } from "@/components/ProtectedPage";
import { ROUTE_PATHS } from "@/services/routes";

export default createProtectedPage(ChangePasswordPage, ROUTE_PATHS.CHANGE_PASSWORD);
