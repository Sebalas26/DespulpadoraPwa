/**
 * Request payload for the hybrid authentication endpoint (`POST /api/auth/login`).
 */
export interface LoginRequestDto {
  usernameOrEmail: string;
  password: string;
}

/**
 * Legacy-compatible login request structure supporting either `usernameOrEmail` or `username`.
 */
export interface LoginRequest {
  usernameOrEmail?: string;
  username?: string;
  password: string;
}

/**
 * Request payload for session token rotation (`POST /api/auth/refresh-token`).
 */
export interface RefreshTokenRequestDto {
  refreshToken: string;
}

/**
 * Represents a plant or distribution branch node.
 */
export interface BranchDto {
  branchId: number;
  name: string;
  code?: string;
  isMatrix: boolean;
  companyId: number;
}

/**
 * Granular action permission descriptor associated with an authenticated user.
 */
export interface PermissionDto {
  actionId: number;
  actionName: string;
  actionSlug: string;
  operationId: number;
  operationName: string;
  moduleId: number;
  moduleName: string;
}

/**
 * Authenticated user profile metadata returned in `LoginResponseDto`.
 */
export interface AuthenticatedUserDto {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roleId: number;
  roleName: string;
  isSystemDeveloper: boolean;
  mustChangePassword?: boolean;
}

/**
 * Dynamic navigation module authorized for the user's role in the Server-Driven UI tree.
 */
export interface NavigationModuleDto {
  moduleId: number;
  name: string;
  slug: string;
  menuSection: string;
  frontendRoute: string;
  icon: string;
  displayOrder: number;
  allowedActionSlugs: string[];
}

/**
 * Grouped sidebar section containing sorted navigation modules.
 */
export interface NavigationSectionGroup {
  sectionName: string;
  modules: NavigationModuleDto[];
}

/**
 * Complete authentication response payload from `POST /api/auth/login` and `POST /api/auth/refresh-token`.
 */
export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  user: AuthenticatedUserDto;
  navigationModules: NavigationModuleDto[];
}

/**
 * Unified authentication session state DTO supporting both `LoginResponseDto` and legacy consumers.
 */
export interface AuthResponseDto {
  success: boolean;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAtUtc?: string;
  expiresAt?: string;
  errorMessage?: string;
  userId?: number;
  username?: string;
  email?: string;
  fullName?: string;
  roleName?: string;
  roleId?: number;
  isSystemDeveloper?: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  companyId: number;
  companyName?: string;
  branchId?: number;
  allowMultipleSessions: boolean;
  maxActiveSessionsPerUser: number;
  branches: BranchDto[];
  permissions: PermissionDto[];
  user?: AuthenticatedUserDto;
  navigationModules?: NavigationModuleDto[];
}

/**
 * Current authenticated user claims profile returned by `GET /api/auth/me`.
 */
export interface UserClaimsDto {
  id?: number;
  userId: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  roleName?: string;
  roleId: number;
  companyId: number;
  companyName: string;
  isSuperAdmin: boolean;
  isSystemDeveloper?: boolean;
}

/**
 * Password update request payload (`POST /api/auth/change-password`).
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Password recovery request payload (`POST /api/auth/forgot-password`).
 */
export interface ForgotPasswordRequest {
  emailOrUsername: string;
}

/**
 * Password reset completion payload (`POST /api/auth/reset-password`).
 */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/**
 * Permission action item inside a module catalog entry.
 */
export interface PermissionActionItemDto {
  moduleActionId?: number;
  id?: number;
  actionName: string;
  actionSlug: string;
  httpMethod?: string;
  description?: string;
  isActive?: boolean;
}

/**
 * Permission module catalog representation for RBAC management.
 */
export interface PermissionModule {
  moduleId: number;
  id?: number;
  moduleName: string;
  name?: string;
  moduleSlug: string;
  slug?: string;
  icon: string;
  menuSection: string;
  frontendRoute: string;
  displayOrder: number;
  isActive?: boolean;
  actions: PermissionActionItemDto[];
}

/**
 * Role summary representation for RBAC role listings.
 */
export interface RoleSummaryDto {
  roleId: number;
  id?: number;
  name: string;
  description?: string;
  isSystemRole: boolean;
  isActive?: boolean;
}

/**
 * Role permissions response payload for RBAC assignment views.
 */
export interface RolePermissionsResponseDto {
  roleId: number;
  roleName: string;
  moduleActionIds?: number[];
  actionSlugs?: string[];
  assignedModuleIds?: number[];
  assignedActionIds?: number[];
}

/**
 * User administration record summary.
 */
export interface UserRecordDto {
  userId: number;
  id?: number;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  roleId: number;
  roleName: string;
  branchId?: number;
  branchName?: string;
  isActive: boolean;
}
