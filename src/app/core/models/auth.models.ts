export interface LoginRequest {
  username: string;
  password: string;
}

export interface BranchDto {
  branchId: number;
  name: string;
  code?: string;
  isMatrix: boolean;
  companyId: number;
}

export interface PermissionDto {
  actionId: number;
  actionName: string;
  actionSlug: string;
  operationId: number;
  operationName: string;
  moduleId: number;
  moduleName: string;
}

export interface AuthResponseDto {
  success: boolean;
  token?: string;
  errorMessage?: string;
  userId?: number;
  username?: string;
  fullName?: string;
  roleName?: string;
  roleId?: number;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  companyId: number;
  companyName?: string;
  allowMultipleSessions: boolean;
  maxActiveSessionsPerUser: number;
  branches: BranchDto[];
  permissions: PermissionDto[];
}

export interface UserClaimsDto {
  userId: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  roleId: number;
  companyId: number;
  companyName: string;
  isSuperAdmin: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  emailOrUsername: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
