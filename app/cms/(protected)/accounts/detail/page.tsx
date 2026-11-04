import { AccountDetailPage } from "@/components/AccountDetail";
import { createProtectedPage } from "@/components/ProtectedPage";
import { ROUTE_PATHS } from "@/services/routes";

export default createProtectedPage(AccountDetailPage, ROUTE_PATHS.ACCOUNT_DETAIL);
