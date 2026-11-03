export interface CmsRoleRecord {
  id: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
}

export interface CmsRoleOption {
  id: string;
  name: string;
}
