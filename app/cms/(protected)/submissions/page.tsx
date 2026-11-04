import { SubmissionsPage } from "@/components/Submissions";
import { createProtectedPage } from "@/components/ProtectedPage";
import { ROUTE_PATHS } from "@/services/routes";

export default createProtectedPage(SubmissionsPage, ROUTE_PATHS.SUBMISSIONS);
