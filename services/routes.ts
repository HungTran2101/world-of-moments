import { permissions, type PermissionRules } from "@/services/permission";
import { OverviewPage } from "@/components/Overview";
import { AccountsPage } from "@/components/Accounts";
import { AccountDetailPage } from "@/components/AccountDetail";
import { RolesPage } from "@/components/Roles";
import { RoleDetailPage } from "@/components/RoleDetail";
import { ChangePasswordPage } from "@/components/ChangePassword";
import type { ComponentType } from "react";
import type { CmsPageProps } from "@/services/shared/types";

interface CmsRouteDefinition {
  key: string;
  component: ComponentType<CmsPageProps>;
  roles?: PermissionRules;
}

export const routes: CmsRouteDefinition[] = [
  { key: "/cms", component: OverviewPage },
  {
    key: "/cms/accounts", component: AccountsPage, roles: {
      show: permissions.ACCOUNT_SHOW,
      create: permissions.ACCOUNT_CREATE,
      update: permissions.ACCOUNT_UPDATE,
      delete: permissions.ACCOUNT_DELETE,
      custom: [permissions.ACCOUNT_RESET_PASSWORD],
    }
  },
  {
    key: "/cms/accounts/detail",
    component: AccountDetailPage,
    roles: {
      show: permissions.ROLE_SHOW,
      create: permissions.ROLE_CREATE,
      update: permissions.ROLE_UPDATE,
      delete: permissions.ROLE_DELETE,
    },
  },
  {
    key: "/cms/roles",
    component: RolesPage,
    roles: {
      show: permissions.ROLE_SHOW,
      create: permissions.ROLE_CREATE,
      update: permissions.ROLE_UPDATE,
      delete: permissions.ROLE_DELETE,
    }
  },
  {
    key: "/cms/roles/detail",
    component: RoleDetailPage,
    roles: {
      show: permissions.ROLE_SHOW,
      create: permissions.ROLE_CREATE,
      update: permissions.ROLE_UPDATE,
      delete: permissions.ROLE_DELETE,
    }
  },
  {
    key: "/cms/change-password",
    component: ChangePasswordPage
  },
];
