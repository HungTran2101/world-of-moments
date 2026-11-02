import type { PagePermission } from "@/services/permission";

export interface CmsUser {
  id: string;
  username: string;
  name: string;
  scopes: string[];
}

export interface CmsPageProps {
  permission: PagePermission;
}
export interface CmsErrorBody {
  error: string;
  fieldErrors?: Record<string, string[]>;
}
export interface CrudListParams {
  page: number;
  pageSize: number;
  search: string;
  filters: Record<string, string>;
}
