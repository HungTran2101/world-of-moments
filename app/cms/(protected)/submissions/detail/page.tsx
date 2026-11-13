import { ROUTE_PATHS } from "@/services/constant";
import { SubmissionDetailPage } from "@/components/SubmissionDetail";
import { createProtectedPage } from "@/components/ProtectedPage";

export default createProtectedPage(
  SubmissionDetailPage,
  ROUTE_PATHS.SUBMISSION_DETAIL,
);
