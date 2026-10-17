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
        { actionId: 1, actionName: 'Ver Lotes', actionSlug: 'batches.view', operationId: 1, operationName: 'Lotes', moduleId: 1, moduleName: 'Producción' },
        { actionId: 2, actionName: 'Crear Lotes', actionSlug: 'batches.create', operationId: 1, operationName: 'Lotes', moduleId: 1, moduleName: 'Producción' },
        { actionId: 3, actionName: 'Completar Lotes', actionSlug: 'batches.complete', operationId: 1, operationName: 'Lotes', moduleId: 1, moduleName: 'Producción' },
        { actionId: 4, actionName: 'Ver Stock', actionSlug: 'stock.view', operationId: 2, operationName: 'Existencias', moduleId: 2, moduleName: 'Cava' },
        { actionId: 5, actionName: 'Ajustar Stock', actionSlug: 'stock.adjust', operationId: 2, operationName: 'Existencias', moduleId: 2, moduleName: 'Cava' },
        { actionId: 6, actionName: 'Ver Pedidos', actionSlug: 'orders.view', operationId: 3, operationName: 'Pedidos', moduleId: 3, moduleName: 'Comercial' },
        { actionId: 7, actionName: 'Crear Pedidos', actionSlug: 'orders.create', operationId: 3, operationName: 'Pedidos', moduleId: 3, moduleName: 'Comercial' },
        { actionId: 8, actionName: 'Alistar Picking', actionSlug: 'orders.picking', operationId: 3, operationName: 'Picking', moduleId: 3, moduleName: 'Comercial' },
        { actionId: 9, actionName: 'Facturar POS', actionSlug: 'orders.bill', operationId: 3, operationName: 'POS', moduleId: 3, moduleName: 'Comercial' },
        { actionId: 10, actionName: 'Despachar Rutas', actionSlug: 'orders.dispatch', operationId: 3, operationName: 'Despacho', moduleId: 3, moduleName: 'Comercial' },
        { actionId: 11, actionName: 'Marcación Turnos', actionSlug: 'shifts.punch', operationId: 4, operationName: 'Marcación', moduleId: 4, moduleName: 'Turnos' },
        { actionId: 12, actionName: 'Gestión Nómina', actionSlug: 'hr.view', operationId: 4, operationName: 'Nómina', moduleId: 4, moduleName: 'Turnos' },
        { actionId: 13, actionName: 'Libro Contable', actionSlug: 'accounting.view', operationId: 5, operationName: 'Libro', moduleId: 5, moduleName: 'Contabilidad' },
        { actionId: 14, actionName: 'Gestión Usuarios', actionSlug: 'users.manage', operationId: 6, operationName: 'Usuarios', moduleId: 6, moduleName: 'Seguridad' },
        { actionId: 15, actionName: 'Gestión Roles', actionSlug: 'roles.manage', operationId: 6, operationName: 'Roles', moduleId: 6, moduleName: 'Seguridad' }
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

  hasPermission(_actionSlug: string): boolean {
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
