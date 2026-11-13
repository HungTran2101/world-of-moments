import { ROUTE_PATHS } from "@/services/constant";
import { permissions, type PermissionKey } from "@/services/permission";
import type { HTMLAttributeAnchorTarget } from "react";
import {
  LayoutDashboard,
  MapPin,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface SidebarItem {
  key: string;
  name: string;
  href?: string;
  icon?: LucideIcon;
  target?: HTMLAttributeAnchorTarget;
  showRole?: PermissionKey;
  childRoutes?: string[];
  items?: SidebarItem[];
}

export const sidebarItems: SidebarItem[] = [
  {
    key: "dashboard",
    name: "nav.dashboard",
    icon: LayoutDashboard,
    href: ROUTE_PATHS.DASHBOARD,
    showRole: permissions.DASHBOARD_SHOW,
  },
  {
    key: "management",
    name: "nav.management",
    items: [
      {
        key: "submissions",
        name: "nav.submissions",
        icon: MapPin,
        href: ROUTE_PATHS.SUBMISSIONS,
        showRole: permissions.SUBMISSION_SHOW,
        childRoutes: [ROUTE_PATHS.SUBMISSION_DETAIL],
      },
      {
        key: "clientUsers",
        name: "nav.clientUsers",
        icon: Users,
        href: ROUTE_PATHS.CLIENT_USERS,
        showRole: permissions.CLIENT_USER_SHOW,
        childRoutes: [ROUTE_PATHS.CLIENT_USER_DETAIL],
      },
    ],
  },
  {
    key: "system",
    name: "nav.system",
    items: [
      {
        key: "accounts",
        name: "nav.accounts",
        icon: Users,
        href: ROUTE_PATHS.ACCOUNTS,
        showRole: permissions.ACCOUNT_SHOW,
        childRoutes: [ROUTE_PATHS.ACCOUNT_DETAIL],
      },
      {
        key: "roles",
        name: "nav.roles",
        icon: ShieldCheck,
        href: ROUTE_PATHS.ROLES,
        showRole: permissions.ROLE_SHOW,
        childRoutes: [ROUTE_PATHS.ROLE_DETAIL],
      },
      {
        key: "general",
        name: "nav.general",
        icon: Settings,
        href: ROUTE_PATHS.GENERAL,
      },
      {
        key: "profile",
        name: "nav.profile",
        icon: UserRound,
        href: ROUTE_PATHS.PROFILE,
        childRoutes: [ROUTE_PATHS.CHANGE_PASSWORD],
      },
    ],
  },
];
