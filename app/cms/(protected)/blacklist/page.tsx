import { ROUTE_PATHS } from "@/services/constant";
import { BlacklistPage } from "@/components/Blacklist";
import { createProtectedPage } from "@/components/ProtectedPage";

export default createProtectedPage(BlacklistPage, ROUTE_PATHS.BLACKLIST);
