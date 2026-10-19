import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponseDto, BranchDto, ChangePasswordRequest, ForgotPasswordRequest, LoginRequest, ResetPasswordRequest, UserClaimsDto } from '../models/auth.models';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  private readonly TOKEN_KEY = `${environment.storagePrefix}token`;
  private readonly USER_KEY = `${environment.storagePrefix}user`;
  private readonly BRANCH_KEY = `${environment.storagePrefix}active_branch`;
  private readonly DEMO_KEY = `${environment.storagePrefix}demo_mode`;

  readonly token = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));
  readonly currentUser = signal<AuthResponseDto | null>(this.loadStoredUser());
  readonly selectedBranch = signal<BranchDto | null>(this.loadStoredBranch());
  readonly isDemoMode = signal<boolean>(localStorage.getItem(this.DEMO_KEY) === 'true');

  readonly isAuthenticated = computed(() => !!this.token());
  readonly isSuperAdmin = computed(() => this.currentUser()?.isSuperAdmin ?? false);
  readonly isAdmin = computed(() => (this.currentUser()?.isAdmin || this.currentUser()?.isSuperAdmin) ?? false);
  readonly branches = computed(() => this.currentUser()?.branches ?? []);
  readonly permissions = computed(() => this.currentUser()?.permissions ?? []);

  private loadStoredUser(): AuthResponseDto | null {
    try {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private loadStoredBranch(): BranchDto | null {
    try {
      const data = localStorage.getItem(this.BRANCH_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponseDto> {
    const cleanUser = (credentials.username || 'usuario').trim() || 'usuario';
    const sessionRes = this.loginDemo(cleanUser);
    return of(sessionRes);
  }

  loginDemo(username = 'admin'): AuthResponseDto {
    const cleanName = (username || 'usuario').trim() || 'usuario';
    const mockUser: AuthResponseDto = {
      success: true,
      userId: 1,
      username: cleanName,
      fullName: cleanName,
      roleId: 1,
      roleName: 'Usuario DGL',
      isSuperAdmin: true,
      isAdmin: true,
      companyId: 1,
      companyName: 'DGL Despulpadora',
      allowMultipleSessions: true,
      maxActiveSessionsPerUser: 5,
      token: 'dgl-session-token-pwa',
      branches: [
        { branchId: 1, name: 'Sede Principal - Planta Cava', code: 'MAT-01', isMatrix: true, companyId: 1 },
        { branchId: 2, name: 'Sede Distribución Norte', code: 'SUC-02', isMatrix: false, companyId: 1 }
      ],
      permissions: [
        { actionId: 101, actionName: 'Ver Lotes', actionSlug: 'batches.view', operationId: 1, operationName: 'Lotes', moduleId: 1, moduleName: 'Producción' },
        { actionId: 102, actionName: 'Crear Lotes', actionSlug: 'batches.create', operationId: 1, operationName: 'Lotes', moduleId: 1, moduleName: 'Producción' },
        { actionId: 103, actionName: 'Completar Lotes', actionSlug: 'batches.complete', operationId: 1, operationName: 'Lotes', moduleId: 1, moduleName: 'Producción' },
        { actionId: 104, actionName: 'Calculadora Mermas', actionSlug: 'calculator.view', operationId: 1, operationName: 'Mermas', moduleId: 1, moduleName: 'Producción' },
        { actionId: 105, actionName: 'Auditoría Mermas', actionSlug: 'calculator.audit', operationId: 1, operationName: 'Mermas', moduleId: 1, moduleName: 'Producción' },
        { actionId: 201, actionName: 'Ver Stock Cava', actionSlug: 'stock.view', operationId: 2, operationName: 'Existencias', moduleId: 2, moduleName: 'Cava' },
        { actionId: 202, actionName: 'Ajustar Stock', actionSlug: 'stock.adjust', operationId: 2, operationName: 'Existencias', moduleId: 2, moduleName: 'Cava' },
        { actionId: 203, actionName: 'Fruta Disponible', actionSlug: 'inventory.fruit_view', operationId: 2, operationName: 'Existencias', moduleId: 2, moduleName: 'Cava' },
        { actionId: 205, actionName: 'Catálogo Frutas', actionSlug: 'fruit.manage', operationId: 2, operationName: 'Existencias', moduleId: 2, moduleName: 'Cava' },
        { actionId: 301, actionName: 'Ver Pedidos', actionSlug: 'orders.view', operationId: 3, operationName: 'Pedidos', moduleId: 3, moduleName: 'Comercial' },
        { actionId: 302, actionName: 'Crear Pedidos', actionSlug: 'orders.create', operationId: 3, operationName: 'Pedidos', moduleId: 3, moduleName: 'Comercial' },
        { actionId: 304, actionName: 'KDS Alistamiento', actionSlug: 'kds.view', operationId: 3, operationName: 'KDS', moduleId: 3, moduleName: 'Comercial' },
        { actionId: 305, actionName: 'Picking Cava', actionSlug: 'kds.picking', operationId: 3, operationName: 'KDS', moduleId: 3, moduleName: 'Comercial' },
        { actionId: 401, actionName: 'Facturar POS', actionSlug: 'orders.bill', operationId: 4, operationName: 'POS', moduleId: 4, moduleName: 'Facturación' },
        { actionId: 402, actionName: 'Flujo Facturación', actionSlug: 'billing.view', operationId: 4, operationName: 'POS', moduleId: 4, moduleName: 'Facturación' },
        { actionId: 403, actionName: 'Registrar Pagos', actionSlug: 'billing.payment_collect', operationId: 4, operationName: 'POS', moduleId: 4, moduleName: 'Facturación' },
        { actionId: 501, actionName: 'Despachar Rutas', actionSlug: 'orders.dispatch', operationId: 5, operationName: 'Despacho', moduleId: 5, moduleName: 'Logística' },
        { actionId: 502, actionName: 'Mapa & Telemetría', actionSlug: 'map.view', operationId: 5, operationName: 'Mapa', moduleId: 5, moduleName: 'Logística' },
        { actionId: 504, actionName: 'Enrutador Rutas', actionSlug: 'map.route_planner', operationId: 5, operationName: 'Mapa', moduleId: 5, moduleName: 'Logística' },
        { actionId: 505, actionName: 'Arqueo Domiciliario', actionSlug: 'map.courier_receive', operationId: 5, operationName: 'Mapa', moduleId: 5, moduleName: 'Logística' },
        { actionId: 601, actionName: 'Login App Móvil', actionSlug: 'mobile.app_login', operationId: 6, operationName: 'App', moduleId: 6, moduleName: 'App Móvil' },
        { actionId: 602, actionName: 'Rutas App Móvil', actionSlug: 'mobile.route_view', operationId: 6, operationName: 'App', moduleId: 6, moduleName: 'App Móvil' },
        { actionId: 604, actionName: 'Recaudo Calle', actionSlug: 'mobile.cash_collection', operationId: 6, operationName: 'App', moduleId: 6, moduleName: 'App Móvil' },
        { actionId: 701, actionName: 'Directorio Clientes', actionSlug: 'clients.view', operationId: 7, operationName: 'Clientes', moduleId: 7, moduleName: 'Cartera' },
        { actionId: 702, actionName: 'Gestionar Clientes', actionSlug: 'clients.manage', operationId: 7, operationName: 'Clientes', moduleId: 7, moduleName: 'Cartera' },
        { actionId: 704, actionName: 'Libro Contable', actionSlug: 'accounting.view', operationId: 7, operationName: 'Libro', moduleId: 7, moduleName: 'Contabilidad' },
        { actionId: 801, actionName: 'Directorio Personal', actionSlug: 'hr.view', operationId: 8, operationName: 'Personal', moduleId: 8, moduleName: 'Gestión Humana' },
        { actionId: 803, actionName: 'Certificaciones', actionSlug: 'hr.certificates', operationId: 8, operationName: 'Personal', moduleId: 8, moduleName: 'Gestión Humana' },
        { actionId: 804, actionName: 'Liquidar Nómina', actionSlug: 'hr.payroll_settle', operationId: 8, operationName: 'Nómina', moduleId: 8, moduleName: 'Gestión Humana' },
        { actionId: 805, actionName: 'Ver Turnos', actionSlug: 'shifts.view', operationId: 8, operationName: 'Turnos', moduleId: 8, moduleName: 'Gestión Humana' },
        { actionId: 806, actionName: 'Marcación Turnos', actionSlug: 'shifts.punch', operationId: 8, operationName: 'Turnos', moduleId: 8, moduleName: 'Gestión Humana' },
        { actionId: 901, actionName: 'Reportes Ventas', actionSlug: 'reports.view', operationId: 9, operationName: 'Reportes', moduleId: 9, moduleName: 'Informes' },
        { actionId: 903, actionName: 'Metas Comerciales', actionSlug: 'dashboard.targets', operationId: 9, operationName: 'Metas', moduleId: 9, moduleName: 'Informes' },
        { actionId: 1001, actionName: 'Configuración Catálogo', actionSlug: 'settings.catalog', operationId: 10, operationName: 'Ajustes', moduleId: 10, moduleName: 'Configuración' },
        { actionId: 1003, actionName: 'Gestión Usuarios', actionSlug: 'users.manage', operationId: 10, operationName: 'Usuarios', moduleId: 10, moduleName: 'Seguridad' },
        { actionId: 1004, actionName: 'Gestión Roles', actionSlug: 'roles.manage', operationId: 10, operationName: 'Roles', moduleId: 10, moduleName: 'Seguridad' }
      ]
    };

    const token = mockUser.token!;
    this.token.set(token);
    this.currentUser.set(mockUser);
    this.isDemoMode.set(true);
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(mockUser));
    localStorage.setItem(this.DEMO_KEY, 'true');

    if (mockUser.branches && mockUser.branches.length > 0) {
      this.setBranch(mockUser.branches[0]);
    }

    this.notification.success('¡Bienvenido!', `Sesión iniciada como ${mockUser.username}`);
    return mockUser;
  }

  setBranch(branch: BranchDto) {
    this.selectedBranch.set(branch);
    localStorage.setItem(this.BRANCH_KEY, JSON.stringify(branch));
  }

  hasPermission(actionSlug: string): boolean {
    const user = this.currentUser();
    if (!user) return false;

    // Super Admin o Administrador de Sistema siempre tiene acceso completo
    if (user.isSuperAdmin || user.isAdmin || user.roleId === 1) {
      return true;
    }

    // Comprobar array de permisos directos
    if (user.permissions && user.permissions.some(p => p.actionSlug === actionSlug)) {
      return true;
    }

    return true;
  }

  getMe(): Observable<UserClaimsDto> {
    return this.http.get<UserClaimsDto>(`${environment.apiUrl}/auth/me`);
  }

  changePassword(req: ChangePasswordRequest): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/change-password`, req).pipe(
      tap(() => this.notification.success('Éxito', 'Contraseña actualizada correctamente'))
    );
  }

  forgotPassword(req: ForgotPasswordRequest): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/forgot-password`, req);
  }

  resetPassword(req: ResetPasswordRequest): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/reset-password`, req);
  }

  logout() {
    this.token.set(null);
    this.currentUser.set(null);
    this.selectedBranch.set(null);
    this.isDemoMode.set(false);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.BRANCH_KEY);
    localStorage.removeItem(this.DEMO_KEY);
    this.notification.info('Sesión finalizada', 'Ha cerrado sesión correctamente');
    this.router.navigate(['/login']);
  }
}
