"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { routes } from "@/services/routes";
import { resolvePermission } from "@/services/permission";
import { useCmsStore } from "@/store/cmsStore";
import { Header } from "@/components/shared/Header";
import { CmsPageContent } from "@/components/shared/CmsPageContent";
import type { CmsUser } from "@/services/shared/types";

export function CmsRoute({
  routeKey,
  user,
}: {
  routeKey: string;
  user: CmsUser;
}) {
  const t = useTranslations();
  useEffect(() => {
    // Dùng dữ liệu phiên đã được server kiểm tra khi tải trang để đồng bộ sidebar và store.
    useCmsStore.getState().setUser(user);
  }, [user]);
  const route = routes.find(({ key }) => key === routeKey)!;
  const permission = resolvePermission(
    user.scopes,
    route.roles,
  );
  if (!permission.show)
    return (
      <>
        <Header title="403" />
        <CmsPageContent>
          <p>{t("errors.forbidden")}</p>
        </CmsPageContent>
      </>
    );
  const Component = route.component;
  return <Component permission={permission} />;
}
