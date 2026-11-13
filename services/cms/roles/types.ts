export interface CmsRoleRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  name: string;
  permissions: string[];
  isSystem: boolean;
}

export interface CmsRoleOption {
  id: string;
  name: string;
}
