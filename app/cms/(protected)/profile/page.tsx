import { ROUTE_PATHS } from "@/services/constant";
import { ProfilePage } from "@/components/Profile";
import { createProtectedPage } from "@/components/ProtectedPage";

export default createProtectedPage(ProfilePage, ROUTE_PATHS.PROFILE);
