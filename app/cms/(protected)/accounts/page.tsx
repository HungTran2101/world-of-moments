import { AccountsPage } from "@/components/Accounts";
import { createProtectedPage } from "@/components/ProtectedPage";
import { ROUTE_PATHS } from "@/services/routes";

export default createProtectedPage(AccountsPage, ROUTE_PATHS.ACCOUNTS);
