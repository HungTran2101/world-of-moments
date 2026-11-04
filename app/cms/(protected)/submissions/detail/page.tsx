import { SubmissionDetailPage } from "@/components/SubmissionDetail";
import { createProtectedPage } from "@/components/ProtectedPage";
import { ROUTE_PATHS } from "@/services/routes";

export default createProtectedPage(
  SubmissionDetailPage,
  ROUTE_PATHS.SUBMISSION_DETAIL,
);
