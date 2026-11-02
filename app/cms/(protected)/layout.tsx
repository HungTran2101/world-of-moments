import { getPageIdentity } from "@/components/ProtectedPage";
import { CmsSession } from "@/components/shared/Providers";
import { CmsShell } from "@/components/shared/Sidebar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getPageIdentity();
  return (
    <CmsSession user={user}>
      <CmsShell>{children}</CmsShell>
    </CmsSession>
  );
}
