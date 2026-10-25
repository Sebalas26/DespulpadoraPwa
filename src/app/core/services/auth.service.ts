import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthenticatedUserDto,
  AuthResponseDto,
  BranchDto,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  LoginRequestDto,
  LoginResponseDto,
  NavigationModuleDto,
  NavigationSectionGroup,
  PermissionDto,
  RefreshTokenRequestDto,
  ResetPasswordRequest,
  UserClaimsDto
} from '../models/auth.models';
import { NotificationService } from './notification.service';

/**
 * Central reactive authentication and Server-Driven RBAC navigation service.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  private readonly ACCESS_TOKEN_KEY = `${environment.storagePrefix}token`;
  private readonly REFRESH_TOKEN_KEY = `${environment.storagePrefix}refresh_token`;
  private readonly EXPIRES_AT_KEY = `${environment.storagePrefix}expires_at`;
  private readonly USER_PROFILE_KEY = `${environment.storagePrefix}auth_user`;
  private readonly NAV_MODULES_KEY = `${environment.storagePrefix}nav_modules`;
  private readonly SESSION_KEY = `${environment.storagePrefix}user`;
  private readonly BRANCH_KEY = `${environment.storagePrefix}active_branch`;

  readonly accessToken = signal<string | null>(this.readStorageString(this.ACCESS_TOKEN_KEY));
  readonly refreshToken = signal<string | null>(this.readStorageString(this.REFRESH_TOKEN_KEY));
  readonly expiresAtUtc = signal<string | null>(this.readStorageString(this.EXPIRES_AT_KEY));
  readonly user = signal<AuthenticatedUserDto | null>(this.loadStoredAuthenticatedUser());
  readonly navigationModules = signal<NavigationModuleDto[]>(this.loadStoredNavigationModules());
  readonly currentUser = signal<AuthResponseDto | null>(this.loadStoredSession());
  readonly selectedBranch = signal<BranchDto | null>(this.loadStoredBranch());

  readonly token = computed<string | null>(() => this.accessToken());
  readonly isAuthenticated = computed<boolean>(() => Boolean(this.accessToken()));
  readonly isSystemDeveloper = computed<boolean>(() => {
    const profile = this.user();
    if (profile?.isSystemDeveloper) {
      return true;
    }
    return this.currentUser()?.isSystemDeveloper ?? false;
  });

  readonly isSuperAdmin = computed<boolean>(() => {
    if (this.isSystemDeveloper()) {
      return true;
    }
    return this.hasPermission('roles.manage') || this.hasPermission('system.catalog');
  });

  readonly isAdmin = computed<boolean>(() => {
    if (this.isSuperAdmin()) {
      return true;
    }
    return this.hasModuleAccess('/settings') || this.hasPermission('users.manage');
  });

  readonly branches = computed<BranchDto[]>(() => this.currentUser()?.branches ?? []);
  readonly permissions = computed<PermissionDto[]>(() => this.currentUser()?.permissions ?? []);

  readonly allowedActionSlugsSet = computed<Set<string>>(() => {
    const slugs = new Set<string>();
    const modules = this.navigationModules();
    for (const mod of modules) {
      if (Array.isArray(mod.allowedActionSlugs)) {
        for (const slug of mod.allowedActionSlugs) {
          slugs.add(slug);
        }
      }
    }
    const directPermissions = this.currentUser()?.permissions ?? [];
    for (const perm of directPermissions) {
      if (perm.actionSlug) {
        slugs.add(perm.actionSlug);
      }
    }
    return slugs;
  });

  readonly groupedNavigationSections = computed<NavigationSectionGroup[]>(() => {
    try {
      const modules = [...this.navigationModules()].sort((a, b) => a.displayOrder - b.displayOrder);
      const sectionMap = new Map<string, NavigationModuleDto[]>();

      for (const mod of modules) {
        const section = (mod.menuSection || 'OPERACIÓN GENERAL').trim();
        const existing = sectionMap.get(section) ?? [];
        existing.push(mod);
        sectionMap.set(section, existing);
      }

      const groups: NavigationSectionGroup[] = [];
      sectionMap.forEach((items, sectionName) => {
        groups.push({
          sectionName,
          modules: items.sort((a, b) => a.displayOrder - b.displayOrder)
        });
      });
      return groups;
    } catch {
      return [];
    }
  });

  /**
   * Authenticates a user against `POST /api/auth/login` using username or email and password.
   */
  login(credentials: LoginRequest | LoginRequestDto): Observable<AuthResponseDto> {
    try {
      const rawIdentifier = ('usernameOrEmail' in credentials && credentials.usernameOrEmail)
        ? credentials.usernameOrEmail
        : (('username' in credentials && credentials.username) ? credentials.username : '');
      const payload: LoginRequestDto = {
        usernameOrEmail: rawIdentifier.trim(),
        password: credentials.password
      };

      return this.http.post<LoginResponseDto>(`${environment.apiUrl}/auth/login`, payload).pipe(
        map((response: LoginResponseDto) => this.persistLoginSession(response, true)),
        catchError((error: unknown) => {
          return throwError(() => error);
        })
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Rotates an expired JWT access token using `POST /api/auth/refresh-token`.
   */
  refreshSession(): Observable<AuthResponseDto> {
    try {
      const storedRefreshToken = this.refreshToken();
      if (!storedRefreshToken) {
        return throwError(() => new Error('No refresh token available.'));
      }

      const payload: RefreshTokenRequestDto = {
        refreshToken: storedRefreshToken
      };

      return this.http.post<LoginResponseDto>(`${environment.apiUrl}/auth/refresh-token`, payload).pipe(
        map((response: LoginResponseDto) => this.persistLoginSession(response, false)),
        catchError((error: unknown) => {
          this.logout();
          return throwError(() => error);
        })
      );
    } catch (error: unknown) {
      this.logout();
      return throwError(() => error);
    }
  }

  /**
   * Persists the `LoginResponseDto` into reactive signals and browser storage.
   */
  persistLoginSession(response: LoginResponseDto, notifyUser: boolean = false): AuthResponseDto {
    try {
      const rawRecord = response as unknown as Record<string, unknown>;
      const resolvedUser: AuthenticatedUserDto = response.user ?? {
        id: Number(rawRecord['userId'] ?? 0),
        username: String(rawRecord['username'] ?? ''),
        email: String(rawRecord['email'] ?? ''),
        fullName: String(rawRecord['fullName'] ?? rawRecord['username'] ?? ''),
        roleId: Number(rawRecord['roleId'] ?? 0),
        roleName: String(rawRecord['roleName'] ?? ''),
        isSystemDeveloper: Boolean(rawRecord['isSystemDeveloper'] ?? false)
      };

      const sortedModules = Array.isArray(response.navigationModules)
        ? [...response.navigationModules].sort((a, b) => a.displayOrder - b.displayOrder)
        : [];

      const flatPermissions: PermissionDto[] = [];
      let syntheticId = 1;
      for (const mod of sortedModules) {
        const slugs = Array.isArray(mod.allowedActionSlugs) ? mod.allowedActionSlugs : [];
        for (const slug of slugs) {
          flatPermissions.push({
            actionId: syntheticId++,
            actionName: slug,
            actionSlug: slug,
            operationId: mod.moduleId,
            operationName: mod.menuSection,
            moduleId: mod.moduleId,
            moduleName: mod.name
          });
        }
      }

      const defaultBranches: BranchDto[] = Array.isArray(rawRecord['branches'])
        ? (rawRecord['branches'] as BranchDto[])
        : [];

      const hasAdminPrivilege = Boolean(
        resolvedUser.isSystemDeveloper ||
        sortedModules.some(m =>
          m.frontendRoute.startsWith('/settings') ||
          m.frontendRoute.startsWith('/admin') ||
          m.slug.includes('settings') ||
          m.slug.includes('security')
        )
      );

      const unifiedSession: AuthResponseDto = {
        success: true,
        token: response.accessToken,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAtUtc: response.expiresAtUtc,
        userId: resolvedUser.id,
        username: resolvedUser.username,
        email: resolvedUser.email,
        fullName: resolvedUser.fullName,
        roleId: resolvedUser.roleId,
        roleName: resolvedUser.roleName,
        isSystemDeveloper: resolvedUser.isSystemDeveloper,
        isSuperAdmin: resolvedUser.isSystemDeveloper,
        isAdmin: hasAdminPrivilege,
        companyId: Number(rawRecord['companyId'] ?? 0),
        companyName: String(rawRecord['companyName'] ?? ''),
        allowMultipleSessions: true,
        maxActiveSessionsPerUser: 5,
        branches: defaultBranches,
        permissions: flatPermissions,
        user: resolvedUser,
        navigationModules: sortedModules
      };

      this.accessToken.set(response.accessToken);
      this.refreshToken.set(response.refreshToken);
      this.expiresAtUtc.set(response.expiresAtUtc);
      this.user.set(resolvedUser);
      this.navigationModules.set(sortedModules);
      this.currentUser.set(unifiedSession);

      localStorage.setItem(this.ACCESS_TOKEN_KEY, response.accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
      localStorage.setItem(this.EXPIRES_AT_KEY, response.expiresAtUtc);
      localStorage.setItem(this.USER_PROFILE_KEY, JSON.stringify(resolvedUser));
      localStorage.setItem(this.NAV_MODULES_KEY, JSON.stringify(sortedModules));
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(unifiedSession));

      if (!this.selectedBranch() && defaultBranches.length > 0) {
        this.setBranch(defaultBranches[0]);
      }

      if (notifyUser) {
        this.notification.success(
          '¡Bienvenido!',
          `Sesión iniciada como ${resolvedUser.fullName} (${resolvedUser.roleName})`
        );
      }

      return unifiedSession;
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Synchronizes updated `NavigationModuleDto[]` into the active session signals and storage.
   */
  syncNavigationModules(modules: NavigationModuleDto[]): void {
    try {
      const sorted = [...modules].sort((a, b) => a.displayOrder - b.displayOrder);
      this.navigationModules.set(sorted);
      localStorage.setItem(this.NAV_MODULES_KEY, JSON.stringify(sorted));
      const current = this.currentUser();
      if (current) {
        const updated: AuthResponseDto = { ...current, navigationModules: sorted };
        this.currentUser.set(updated);
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(updated));
      }
    } catch {
      return;
    }
  }

  /**
   * Sets the active operational plant node.
   */
  setBranch(branch: BranchDto): void {
    try {
      this.selectedBranch.set(branch);
      localStorage.setItem(this.BRANCH_KEY, JSON.stringify(branch));
    } catch {
      return;
    }
  }

  /**
   * Validates dynamically whether the current user has access to a given route or module slug.
   */
  hasModuleAccess(routeOrSlug: string): boolean {
    try {
      if (!this.isAuthenticated()) {
        return false;
      }

      if (this.isSystemDeveloper()) {
        return true;
      }

      const normalizedTarget = this.normalizeRouteKey(routeOrSlug);
      if (!normalizedTarget || normalizedTarget === 'dashboard') {
        return true;
      }

      const modules = this.navigationModules();
      return modules.some((mod: NavigationModuleDto) => {
        const modRoute = this.normalizeRouteKey(mod.frontendRoute);
        const modSlug = (mod.slug || '').trim().toLowerCase();
        return (
          modRoute === normalizedTarget ||
          modRoute.startsWith(`${normalizedTarget}/`) ||
          normalizedTarget.startsWith(`${modRoute}/`) ||
          modSlug === normalizedTarget
        );
      });
    } catch {
      return false;
    }
  }

  /**
   * Finds the metadata of an authorized navigation module matching the given route or slug.
   */
  findNavigationModuleByRoute(routeUrl: string): NavigationModuleDto | null {
    try {
      const normalizedTarget = this.normalizeRouteKey(routeUrl);
      const modules = this.navigationModules();
      const exactMatch = modules.find(
        (m: NavigationModuleDto) =>
          this.normalizeRouteKey(m.frontendRoute) === normalizedTarget ||
          (m.slug || '').trim().toLowerCase() === normalizedTarget
      );
      if (exactMatch) {
        return exactMatch;
      }
      return (
        modules.find((m: NavigationModuleDto) => {
          const modRoute = this.normalizeRouteKey(m.frontendRoute);
          return modRoute.length > 0 && normalizedTarget.startsWith(modRoute);
        }) ?? null
      );
    } catch {
      return null;
    }
  }

  /**
   * Validates dynamically whether the authenticated user has a specific granular action slug.
   */
  hasPermission(actionSlug: string): boolean {
    try {
      if (!this.isAuthenticated()) {
        return false;
      }

      if (this.isSystemDeveloper()) {
        return true;
      }

      const cleanSlug = (actionSlug || '').trim();
      if (!cleanSlug) {
        return true;
      }

      return this.allowedActionSlugsSet().has(cleanSlug);
    } catch {
      return false;
    }
  }

  /**
   * Retrieves the current user's profile from `GET /api/auth/me`.
   */
  getMe(): Observable<UserClaimsDto> {
    try {
      return this.http.get<UserClaimsDto>(`${environment.apiUrl}/auth/me`).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Updates the authenticated user's password via `POST /api/auth/change-password`.
   */
  changePassword(req: ChangePasswordRequest): Observable< Record<string, unknown> > {
    try {
      return this.http.post<Record<string, unknown>>(`${environment.apiUrl}/auth/change-password`, req).pipe(
        tap(() => this.notification.success('Éxito', 'Contraseña actualizada correctamente')),
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Requests a password reset link via `POST /api/auth/forgot-password`.
   */
  forgotPassword(req: ForgotPasswordRequest): Observable<Record<string, unknown>> {
    try {
      return this.http.post<Record<string, unknown>>(`${environment.apiUrl}/auth/forgot-password`, req).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Completes a password reset operation via `POST /api/auth/reset-password`.
   */
  resetPassword(req: ResetPasswordRequest): Observable<Record<string, unknown>> {
    try {
      return this.http.post<Record<string, unknown>>(`${environment.apiUrl}/auth/reset-password`, req).pipe(
        catchError((error: unknown) => throwError(() => error))
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
  }

  /**
   * Clears all authentication state and redirects the user to `/login`.
   */
  logout(): void {
    try {
      const currentRefresh = this.refreshToken();
      if (currentRefresh) {
        this.http
          .post(`${environment.apiUrl}/auth/logout`, { refreshToken: currentRefresh })
          .pipe(catchError(() => []))
          .subscribe();
      }

      this.accessToken.set(null);
      this.refreshToken.set(null);
      this.expiresAtUtc.set(null);
      this.user.set(null);
      this.navigationModules.set([]);
      this.currentUser.set(null);
      this.selectedBranch.set(null);

      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.EXPIRES_AT_KEY);
      localStorage.removeItem(this.USER_PROFILE_KEY);
      localStorage.removeItem(this.NAV_MODULES_KEY);
      localStorage.removeItem(this.SESSION_KEY);
      localStorage.removeItem(this.BRANCH_KEY);

      this.notification.info('Sesión finalizada', 'Ha cerrado sesión correctamente');
      this.router.navigate(['/login']);
    } catch {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Normalizes a URL or route string for permission comparison.
   */
  private normalizeRouteKey(rawRoute: string): string {
    try {
      const withoutQuery = (rawRoute || '').split('?')[0].split('#')[0].trim();
      return withoutQuery.replace(/^\/+|\/+$/g, '').toLowerCase();
    } catch {
      return '';
    }
  }

  /**
   * Safely reads a string from `localStorage`.
   */
  private readStorageString(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * Loads the stored `AuthenticatedUserDto` from `localStorage`.
   */
  private loadStoredAuthenticatedUser(): AuthenticatedUserDto | null {
    try {
      const raw = localStorage.getItem(this.USER_PROFILE_KEY);
      if (raw) {
        return JSON.parse(raw) as AuthenticatedUserDto;
      }
      const sessionRaw = localStorage.getItem(this.SESSION_KEY);
      if (sessionRaw) {
        const parsedSession = JSON.parse(sessionRaw) as AuthResponseDto;
        if (parsedSession.user) {
          return parsedSession.user;
        }
        if (parsedSession.username) {
          return {
            id: parsedSession.userId ?? 0,
            username: parsedSession.username,
            email: parsedSession.email ?? '',
            fullName: parsedSession.fullName ?? parsedSession.username,
            roleId: parsedSession.roleId ?? 0,
            roleName: parsedSession.roleName ?? '',
            isSystemDeveloper: Boolean(parsedSession.isSystemDeveloper || parsedSession.isSuperAdmin)
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Loads the stored `NavigationModuleDto[]` from `localStorage`.
   */
  private loadStoredNavigationModules(): NavigationModuleDto[] {
    try {
      const raw = localStorage.getItem(this.NAV_MODULES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as NavigationModuleDto[];
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      const sessionRaw = localStorage.getItem(this.SESSION_KEY);
      if (sessionRaw) {
        const parsedSession = JSON.parse(sessionRaw) as AuthResponseDto;
        if (Array.isArray(parsedSession.navigationModules)) {
          return parsedSession.navigationModules;
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Loads the unified `AuthResponseDto` from `localStorage`.
   */
  private loadStoredSession(): AuthResponseDto | null {
    try {
      const data = localStorage.getItem(this.SESSION_KEY);
      return data ? (JSON.parse(data) as AuthResponseDto) : null;
    } catch {
      return null;
    }
  }

  /**
   * Loads the active `BranchDto` from `localStorage`.
   */
  private loadStoredBranch(): BranchDto | null {
    try {
      const data = localStorage.getItem(this.BRANCH_KEY);
      return data ? (JSON.parse(data) as BranchDto) : null;
    } catch {
      return null;
    }
  }
}
