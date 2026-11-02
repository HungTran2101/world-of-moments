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
  { key: "home", name: "nav.home", href: "/cms" },
  {
    key: "management",
    name: "nav.management",
    items: [
      {
        key: "accounts",
        name: "nav.accounts",
        href: "/cms/accounts",
        showRole: permissions.ACCOUNT_SHOW,
        childRoutes: ["/cms/accounts/detail"],
      },
      {
        key: "roles",
        name: "nav.roles",
        href: "/cms/roles",
        showRole: permissions.ROLE_SHOW,
        childRoutes: ["/cms/roles/detail"],
      },
    ],
  },
];
