"use client";

import { Header } from "@/components/shared/Header";
import { resolvePermission } from "@/services/permission";
import { routes } from "@/services/routes";
import type { CmsUser } from "@/services/shared/types";
import { useCmsStore } from "@/store/cmsStore";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

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
      <Header
        title={t("errors.forbidden")}
        style={{ color: 'orangered' }}
      />
    );
  const Component = route.component;
  return <Component permission={permission} />;
}
