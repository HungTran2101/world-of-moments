"use client";

import { Header } from "@/components/shared/Header";
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
  if (!permission.show)
    return (
      <Header
        title={t("errors.forbidden")}
        style={{ color: 'orangered' }}
      />
    );
  return children;
}
