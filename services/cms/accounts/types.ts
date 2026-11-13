export interface CmsAccountRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  username: string;
  name: string;
  isActive: boolean;
  roleIds: string[];
  roles: { id: string; name: string }[];
}
