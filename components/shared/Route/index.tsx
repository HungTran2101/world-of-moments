"use client";

import { Header } from "@/components/shared/Header";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import { getCmsLandingPath } from "@/services/routes";
import type { PagePermission } from "@/services/permission";
import type { CmsUser } from "@/services/shared/types";
import { useCmsStore } from "@/store/cmsStore";
import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";

export function CmsRoute({
  user,
  permission,
  children,
}: {
  user: CmsUser;
  permission: PagePermission;
  children: ReactNode;
}) {
  const t = useTranslations();
  useEffect(() => {
    // Dùng dữ liệu phiên đã được server kiểm tra khi tải trang để đồng bộ sidebar và store.
    useCmsStore.getState().setUser(user);
  }, [user]);
  if (!getCmsLandingPath(user.scopes))
    return (
      <>
        <Header title={t("role.permissions")} />
        <CmsPageContent>
          <p role="status">{t("errors.noPagePermissions")}</p>
        </CmsPageContent>
      </>
    );
  if (!permission.show)
    return (
      <Header
        title={t("errors.forbidden")}
        style={{ color: 'orangered' }}
      />
    );
  return children;
}
