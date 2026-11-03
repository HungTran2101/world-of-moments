import { getPageIdentity } from "@/components/ProtectedPage";
import { CmsSession } from "@/components/shared/Providers";
import { CmsSidebar } from "@/components/CmsSidebar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getPageIdentity();
  return (
    <CmsSession user={user}>
      <CmsSidebar>{children}</CmsSidebar>
    </CmsSession>
  );
}
