import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { permissionGuard } from './permission.guard';
import { AuthService } from '../services/auth.service';
import { LoginResponseDto } from '../models/auth.models';

/**
 * Unit test suite for `permissionGuard` verifying dynamic Server-Driven RBAC route protection.
 */
describe('permissionGuard', () => {
  let authService: AuthService;
  let router: Router;

  const sampleSession: LoginResponseDto = {
    accessToken: 'token-abc',
    refreshToken: 'refresh-abc',
    expiresAtUtc: '2026-12-31T23:59:59Z',
    user: {
      id: 2,
      username: 'operador',
      email: 'operador@pulpafresca.com',
      fullName: 'Carlos Operador',
      roleId: 3,
      roleName: 'Operador de Planta',
      isSystemDeveloper: false
    },
    navigationModules: [
      {
        moduleId: 1,
        name: 'Dashboard',
        slug: 'dashboard',
        menuSection: 'Operación',
        frontendRoute: '/dashboard',
        icon: 'grid',
        displayOrder: 1,
        allowedActionSlugs: ['dashboard.view']
      },
      {
        moduleId: 2,
        name: 'Planta e Inventario',
        slug: 'inventory',
        menuSection: 'Operación',
        frontendRoute: '/calculator',
        icon: 'package',
        displayOrder: 2,
        allowedActionSlugs: ['inventory.view', 'batches.create']
      }
    ]
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  it('should allow navigation when the route exists in navigationModules', () => {
    authService.persistLoginSession(sampleSession, false);
    const route = new ActivatedRouteSnapshot();
    const state = { url: '/calculator' } as RouterStateSnapshot;

    const allowed = TestBed.runInInjectionContext(() => permissionGuard(route, state));
    expect(allowed).toBeTrue();
  });

  it('should deny navigation and redirect when the route is not authorized in navigationModules', () => {
    authService.persistLoginSession(sampleSession, false);
    spyOn(router, 'navigateByUrl');
    const route = new ActivatedRouteSnapshot();
    const state = { url: '/accounting' } as RouterStateSnapshot;

    const allowed = TestBed.runInInjectionContext(() => permissionGuard(route, state));
    expect(allowed).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });
});

