import { ROUTE_PATHS } from "@/services/routes";
import { permissions, type PermissionKey } from "@/services/permission";

export interface SidebarItem {
  key: string;
  name: string;
  href?: string;
  showRole?: PermissionKey;
  childRoutes?: string[];
  items?: SidebarItem[];
}

export const sidebarItems: SidebarItem[] = [
  { key: "home", name: "nav.home", href: ROUTE_PATHS.OVERVIEW },
  {
    key: "management",
    name: "nav.management",
    items: [
      {
        key: "accounts",
        name: "nav.accounts",
        href: ROUTE_PATHS.ACCOUNTS,
        showRole: permissions.ACCOUNT_SHOW,
        childRoutes: [ROUTE_PATHS.ACCOUNT_DETAIL],
      },
      {
        key: "roles",
        name: "nav.roles",
        href: ROUTE_PATHS.ROLES,
        showRole: permissions.ROLE_SHOW,
        childRoutes: [ROUTE_PATHS.ROLE_DETAIL],
      },
    ],
  },
];
