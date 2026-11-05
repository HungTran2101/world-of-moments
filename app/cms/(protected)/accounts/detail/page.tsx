import { ROUTE_PATHS } from "@/services/constant";
import { AccountDetailPage } from "@/components/AccountDetail";
import { createProtectedPage } from "@/components/ProtectedPage";

export default createProtectedPage(AccountDetailPage, ROUTE_PATHS.ACCOUNT_DETAIL);
