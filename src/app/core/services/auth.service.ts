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
 * Central reactive authentication and Server-Driven dynamic navigation service.
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
    const roleName = (this.user()?.roleName || this.currentUser()?.roleName || '').trim().toLowerCase();
    if (roleName.includes('super')) {
      return true;
    }
    return this.allowedActionSlugsSet().has('system.catalog');
  });

  readonly isAdmin = computed<boolean>(() => {
    if (this.isSuperAdmin()) {
      return true;
    }
    const roleName = (this.user()?.roleName || this.currentUser()?.roleName || '').trim().toLowerCase();
    return (
      roleName.includes('admin') ||
      roleName.includes('administrador') ||
      roleName.includes('gerente')
    );
  });

  readonly branches = computed<BranchDto[]>(() => this.currentUser()?.branches ?? []);
  readonly permissions = computed<PermissionDto[]>(() => this.currentUser()?.permissions ?? []);

  readonly allowedActionSlugsSet = computed<Set<string>>(() => {
    const slugs = new Set<string>();
    const modules = this.navigationModules();
    for (const mod of modules) {
      if (this.isRemovedCalculatorModule(mod)) {
        continue;
      }
      if (Array.isArray(mod.allowedActionSlugs)) {
        for (const slug of mod.allowedActionSlugs) {
          if (!this.isRemovedCalculatorActionSlug(slug)) {
            slugs.add(slug);
          }
        }
      }
    }
    const directPermissions = this.currentUser()?.permissions ?? [];
    for (const perm of directPermissions) {
      if (perm.actionSlug && !this.isRemovedCalculatorActionSlug(perm.actionSlug)) {
        slugs.add(perm.actionSlug);
      }
    }
    return slugs;
  });

  readonly groupedNavigationSections = computed<NavigationSectionGroup[]>(() => {
    try {
      const rawModules = [...this.navigationModules()];
      const modules: NavigationModuleDto[] = [];

      for (const mod of rawModules) {
        if (
          this.isRemovedCalculatorModule(mod) ||
          this.isEmbeddedSettingsRbacModule(mod) ||
          this.isDedicatedClientPortalModule(mod)
        ) {
          continue;
        }
        if (!this.isSuperAdmin() && this.isSuperAdminOnlyModule(mod)) {
          continue;
        }
        const normSlug = (mod.slug || '').trim().toLowerCase();
        const normName = (mod.name || '').trim().toLowerCase();
        if (normSlug === 'inventory' || normName.includes('inventario') || normName === 'planta e inventario') {
          modules.push({
            ...mod,
            name: 'Inventario de Pulpas y Frutas',
            slug: 'inventory',
            frontendRoute: '/settings?tab=inventory',
            icon: 'package',
            menuSection: 'Operación',
            displayOrder: 2
          });
        } else {
          modules.push(mod);
        }
      }

      const hasInventory = modules.some(
        (m: NavigationModuleDto) =>
          m.slug === 'inventory' ||
          m.frontendRoute.includes('tab=inventory') ||
          m.frontendRoute.includes('/kds-inventory')
      );

      if (!hasInventory && (this.isAdmin() || this.allowedActionSlugsSet().has('inventory.view'))) {
        modules.push({
          moduleId: 2,
          name: 'Inventario de Pulpas y Frutas',
          slug: 'inventory',
          menuSection: 'Operación',
          frontendRoute: '/settings?tab=inventory',
          icon: 'package',
          displayOrder: 2,
          allowedActionSlugs: ['inventory.view', 'inventory.adjust', 'inventory.manage']
        });
      }

      modules.sort((a, b) => a.displayOrder - b.displayOrder);

      const sectionMap = new Map<string, NavigationModuleDto[]>();

      for (const mod of modules) {
        const section = (mod.menuSection || 'OPERACIÓN').trim();
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
        ? [...response.navigationModules]
            .filter((mod: NavigationModuleDto) => !this.isRemovedCalculatorModule(mod))
            .sort((a, b) => a.displayOrder - b.displayOrder)
        : [];

      const flatPermissions: PermissionDto[] = [];
      let syntheticId = 1;
      for (const mod of sortedModules) {
        const slugs = Array.isArray(mod.allowedActionSlugs) ? mod.allowedActionSlugs : [];
        for (const slug of slugs) {
          if (this.isRemovedCalculatorActionSlug(slug)) {
            continue;
          }
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
      const sorted = [...modules]
        .filter((mod: NavigationModuleDto) => !this.isRemovedCalculatorModule(mod))
        .sort((a, b) => a.displayOrder - b.displayOrder);
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

      const normalizedTarget = this.normalizeRouteKey(routeOrSlug);
      if (normalizedTarget === 'calculator') {
        return false;
      }

      if (this.isSystemDeveloper() || this.isAdmin() || this.isSuperAdmin()) {
        return true;
      }

      if (!normalizedTarget || normalizedTarget === 'dashboard') {
        return true;
      }

      const modules = this.navigationModules();
      const hasDirectMatch = modules.some((mod: NavigationModuleDto) => {
        const modRoute = this.normalizeRouteKey(mod.frontendRoute);
        const modSlug = (mod.slug || '').trim().toLowerCase();
        return (
          modRoute === normalizedTarget ||
          modRoute.startsWith(`${normalizedTarget}/`) ||
          normalizedTarget.startsWith(`${modRoute}/`) ||
          modSlug === normalizedTarget
        );
      });

      if (hasDirectMatch) {
        return true;
      }

      if (normalizedTarget === 'settings') {
        return (
          this.hasModuleAccess('admin/users') ||
          this.hasModuleAccess('admin/roles') ||
          this.hasModuleAccess('users') ||
          this.hasModuleAccess('roles')
        );
      }

      if (normalizedTarget === 'portal-admin') {
        return this.hasModuleAccess('settings') || this.hasModuleAccess('orders');
      }

      if (normalizedTarget === 'reports') {
        return this.hasModuleAccess('accounting') || this.hasModuleAccess('orders');
      }

      return false;
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
      if (
        !normalizedTarget ||
        this.isRemovedCalculatorModule({ frontendRoute: normalizedTarget, slug: normalizedTarget })
      ) {
        return null;
      }
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

      const cleanSlug = (actionSlug || '').trim();
      if (this.isRemovedCalculatorActionSlug(cleanSlug)) {
        return false;
      }

      if (this.isSystemDeveloper() || this.isAdmin() || this.isSuperAdmin()) {
        return true;
      }

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
          return parsed.filter((mod: NavigationModuleDto) => !this.isRemovedCalculatorModule(mod));
        }
      }
      const sessionRaw = localStorage.getItem(this.SESSION_KEY);
      if (sessionRaw) {
        const parsedSession = JSON.parse(sessionRaw) as AuthResponseDto;
        if (Array.isArray(parsedSession.navigationModules)) {
          return parsedSession.navigationModules.filter(
            (mod: NavigationModuleDto) => !this.isRemovedCalculatorModule(mod)
          );
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Determines whether a navigation or system module corresponds to the removed
   * "Control de Producción & Mermas" (`/calculator` / `Planta e Inventario`) module.
   */
  isRemovedCalculatorModule(mod: {
    frontendRoute?: string;
    slug?: string;
    name?: string;
  }): boolean {
    const normalizedRoute = this.normalizeRouteKey(mod.frontendRoute || '');
    const normalizedSlug = (mod.slug || '').trim().toLowerCase();
    const normalizedName = (mod.name || '').trim().toLowerCase();
    if (normalizedRoute === 'calculator' || normalizedSlug === 'calculator') {
      return true;
    }
    return (
      normalizedName === 'control de producción & mermas' ||
      normalizedName === 'producción, formulación & mermas'
    );
  }

  /**
   * Determines whether a module corresponds to "Gestión de Usuarios" or "Roles y Matriz de Permisos"
   * (`SEGURIDAD RBAC`) which are already embedded as tabs inside `/settings` (Configuración)
   * and therefore should be omitted from the sidebar/drawer navigation menu.
   */
  isEmbeddedSettingsRbacModule(mod: {
    frontendRoute?: string;
    slug?: string;
    name?: string;
    menuSection?: string;
  }): boolean {
    try {
      const normalizedRoute = this.normalizeRouteKey(mod.frontendRoute || '');
      const normalizedSlug = (mod.slug || '').trim().toLowerCase();
      const normalizedName = (mod.name || '').trim().toLowerCase();
      const normalizedSection = (mod.menuSection || '').trim().toLowerCase();
      return (
        normalizedRoute === 'admin/users' ||
        normalizedRoute === 'admin/roles' ||
        normalizedSlug === 'users' ||
        normalizedSlug === 'roles' ||
        normalizedSlug === 'admin-users' ||
        normalizedSlug === 'admin-roles' ||
        normalizedName === 'gestión de usuarios' ||
        normalizedName === 'gestion de usuarios' ||
        normalizedName === 'roles y matriz de permisos' ||
        normalizedSection === 'seguridad rbac'
      );
    } catch {
      return false;
    }
  }

  /**
   * Determines whether a module corresponds to "Portal Web Clientes" or "Portal Clientes",
   * which is already accessible via the top collapsible quick-access module in the sidebar
   * and therefore should be omitted from the dynamic `COMERCIAL Y FINANZAS` section list.
   */
  isDedicatedClientPortalModule(mod: {
    frontendRoute?: string;
    slug?: string;
    name?: string;
  }): boolean {
    try {
      const normalizedRoute = this.normalizeRouteKey(mod.frontendRoute || '');
      const normalizedSlug = (mod.slug || '').trim().toLowerCase();
      const normalizedName = (mod.name || '').trim().toLowerCase();
      return (
        normalizedRoute === 'portal-clientes' ||
        normalizedRoute === 'portal-cliente' ||
        normalizedSlug === 'portal-clientes' ||
        normalizedSlug === 'client-portal' ||
        normalizedSlug === 'portal-web-clientes' ||
        normalizedName === 'portal web clientes' ||
        normalizedName === 'portal clientes'
      );
    } catch {
      return false;
    }
  }

  /**
   * Determines whether an action slug belongs to the removed calculator/batches module.
   */
  isRemovedCalculatorActionSlug(slug: string): boolean {
    const normalized = (slug || '').trim().toLowerCase();
    return normalized.startsWith('calculator.') || normalized.startsWith('batches.');
  }

  /**
   * Determines whether a role corresponds to the protected Super Administrator role.
   */
  isSuperAdminRole(role: { roleId?: number; name?: string; isSystemRole?: boolean }): boolean {
    try {
      const normalizedName = (role.name || '').trim().toLowerCase();
      if (normalizedName.includes('super')) {
        return true;
      }
      if (
        Boolean(role.isSystemRole) &&
        role.roleId === 1 &&
        !normalizedName.includes('general') &&
        !normalizedName.includes('operativo')
      ) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Determines whether a user account belongs to a Super Administrator or System Developer.
   */
  isSuperAdminUser(user: {
    userId?: number;
    roleId?: number;
    roleName?: string;
    isSystemDeveloper?: boolean;
  }): boolean {
    try {
      if (Boolean(user.isSystemDeveloper)) {
        return true;
      }
      const normalizedRole = (user.roleName || '').trim().toLowerCase();
      return normalizedRole.includes('super');
    } catch {
      return false;
    }
  }

  /**
   * Determines whether a module is restricted exclusively to the Super Administrator.
   */
  isSuperAdminOnlyModule(mod: {
    frontendRoute?: string;
    slug?: string;
    name?: string;
    menuSection?: string;
  }): boolean {
    try {
      const normalizedRoute = this.normalizeRouteKey(mod.frontendRoute || '');
      const normalizedSlug = (mod.slug || '').trim().toLowerCase();
      const normalizedName = (mod.name || '').trim().toLowerCase();
      const normalizedSection = (mod.menuSection || '').trim().toLowerCase();
      return (
        normalizedRoute === 'admin/catalog' ||
        normalizedRoute === 'admin/backups' ||
        normalizedSlug === 'system-catalog' ||
        normalizedSlug === 'database-backups' ||
        normalizedSlug === 'catalog' ||
        normalizedSlug === 'backups' ||
        normalizedSection.includes('configuración maestra') ||
        normalizedSection.includes('configuracion maestra') ||
        normalizedName.includes('catálogo maestro') ||
        normalizedName.includes('catalogo maestro') ||
        normalizedName.includes('copias de seguridad')
      );
    } catch {
      return false;
    }
  }

  /**
   * Determines whether an action slug is restricted exclusively to the Super Administrator.
   */
  isSuperAdminOnlyActionSlug(slug: string): boolean {
    try {
      const normalized = (slug || '').trim().toLowerCase();
      return normalized.startsWith('system.');
    } catch {
      return false;
    }
  }

  /**
   * Loads the unified `AuthResponseDto` from `localStorage`.
   */
  private loadStoredSession(): AuthResponseDto | null {
    try {
      const data = localStorage.getItem(this.SESSION_KEY);
      if (!data) {
        return null;
      }
      const parsed = JSON.parse(data) as AuthResponseDto;
      if (Array.isArray(parsed.navigationModules)) {
        parsed.navigationModules = parsed.navigationModules.filter(
          (mod: NavigationModuleDto) => !this.isRemovedCalculatorModule(mod)
        );
      }
      if (Array.isArray(parsed.permissions)) {
        parsed.permissions = parsed.permissions.filter(
          (perm: PermissionDto) => !this.isRemovedCalculatorActionSlug(perm.actionSlug)
        );
      }
      return parsed;
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
