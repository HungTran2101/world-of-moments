import { ROUTE_PATHS } from "@/services/constant";
import { SubmissionsPage } from "@/components/Submissions";
import { createProtectedPage } from "@/components/ProtectedPage";

export default createProtectedPage(SubmissionsPage, ROUTE_PATHS.SUBMISSIONS);
