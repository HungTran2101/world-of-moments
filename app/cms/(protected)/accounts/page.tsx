import { ROUTE_PATHS } from "@/services/constant";
import { AccountsPage } from "@/components/Accounts";
import { createProtectedPage } from "@/components/ProtectedPage";

export default createProtectedPage(AccountsPage, ROUTE_PATHS.ACCOUNTS);
