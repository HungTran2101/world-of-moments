export interface CmsAccountRecord {
  id: string;
  createdAt: string;
  username: string;
  name: string;
  isActive: boolean;
  roleIds: string[];
  roles: { id: string; name: string }[];
}
