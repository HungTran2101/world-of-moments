export interface CmsAccountRecord {
  id: string;
  username: string;
  name: string;
  isActive: boolean;
  roleIds: string[];
  roles: { id: string; name: string }[];
}
