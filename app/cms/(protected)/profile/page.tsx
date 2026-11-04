import { ProfilePage } from "@/components/Profile";
import { createProtectedPage } from "@/components/ProtectedPage";
import { ROUTE_PATHS } from "@/services/routes";

export default createProtectedPage(ProfilePage, ROUTE_PATHS.PROFILE);
