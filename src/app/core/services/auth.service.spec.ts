import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { LoginResponseDto } from '../models/auth.models';
import { environment } from '../../../environments/environment';

/**
 * Unit test suite for `AuthService` covering JWT login, token refresh, logout,
 * Server-Driven dynamic navigation grouping, route access, and action permissions.
 */
describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  const sampleLoginResponse: LoginResponseDto = {
    accessToken: 'jwt-access-token-123',
    refreshToken: 'refresh-token-xyz',
    expiresAtUtc: '2026-12-31T23:59:59Z',
    user: {
      id: 1,
      username: 'operador',
      email: 'operador@example.com',
      fullName: 'Operador de Planta',
      roleId: 3,
      roleName: 'OperadorRole',
      isSystemDeveloper: false
    },
    navigationModules: [
      {
        moduleId: 3,
        name: 'Orders Module',
        slug: 'orders',
        menuSection: 'Operations',
        frontendRoute: '/orders',
        icon: 'truck',
        displayOrder: 2,
        allowedActionSlugs: ['orders.view', 'orders.create', 'orders.dispatch']
      },
      {
        moduleId: 1,
        name: 'Dashboard Module',
        slug: 'dashboard',
        menuSection: 'Operations',
        frontendRoute: '/dashboard',
        icon: 'grid',
        displayOrder: 1,
        allowedActionSlugs: ['dashboard.view']
      },
      {
        moduleId: 7,
        name: 'Settings Module',
        slug: 'settings',
        menuSection: 'Configuration',
        frontendRoute: '/settings',
        icon: 'settings',
        displayOrder: 7,
        allowedActionSlugs: ['settings.view']
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
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should authenticate against POST /api/auth/login and store session signals without hardcoded company names', () => {
    service.login({ usernameOrEmail: 'operador', password: 'SecretPassword1!' }).subscribe(session => {
      expect(session.accessToken).toBe('jwt-access-token-123');
      expect(session.companyName).toBe('');
      expect(session.branches).toEqual([]);
      expect(service.isAuthenticated()).toBeTrue();
      expect(service.user()?.username).toBe('operador');
      expect(service.navigationModules().length).toBe(3);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ usernameOrEmail: 'operador', password: 'SecretPassword1!' });
    req.flush(sampleLoginResponse);
  });

  it('should group navigationModules by menuSection and sort by displayOrder', () => {
    service.persistLoginSession(sampleLoginResponse, false);
    const groups = service.groupedNavigationSections();

    expect(groups.length).toBe(2);
    expect(groups[0].sectionName).toBe('Operations');
    expect(groups[0].modules[0].slug).toBe('dashboard');
    expect(groups[0].modules[1].slug).toBe('orders');
    expect(groups[1].sectionName).toBe('Configuration');
  });

  it('should validate dynamic module access and action permissions without hardcoded role names', () => {
    service.persistLoginSession(sampleLoginResponse, false);

    expect(service.hasModuleAccess('/orders')).toBeTrue();
    expect(service.hasModuleAccess('/hr')).toBeFalse();
    expect(service.hasPermission('orders.dispatch')).toBeTrue();
    expect(service.hasPermission('hr.manage')).toBeFalse();
    expect(service.findNavigationModuleByRoute('/orders')?.slug).toBe('orders');
  });

  it('should grant full module access and action permissions to administrators without granular permission dependency', () => {
    const adminResponse: LoginResponseDto = {
      ...sampleLoginResponse,
      user: {
        id: 2,
        username: 'admin.operativo',
        email: 'admin@despulpadora.com',
        fullName: 'Administrador Operativo',
        roleId: 2,
        roleName: 'Administrador Operativo',
        isSystemDeveloper: false
      }
    };

    service.persistLoginSession(adminResponse, false);

    expect(service.isAdmin()).toBeTrue();
    expect(service.hasModuleAccess('/hr')).toBeTrue();
    expect(service.hasModuleAccess('/accounting')).toBeTrue();
    expect(service.hasPermission('hr.manage')).toBeTrue();
    expect(service.hasPermission('inventory.adjust')).toBeTrue();
    expect(service.groupedNavigationSections().some(g => g.modules.some(m => m.slug === 'inventory'))).toBeTrue();
  });

  it('should rotate session tokens via refreshSession', () => {
    service.persistLoginSession(sampleLoginResponse, false);

    service.refreshSession().subscribe(refreshed => {
      expect(refreshed.accessToken).toBe('new-access-token');
      expect(service.accessToken()).toBe('new-access-token');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh-token`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'refresh-token-xyz' });
    req.flush({
      ...sampleLoginResponse,
      accessToken: 'new-access-token'
    });
  });

  it('should clear session state and navigate to /login on logout', () => {
    const navigateSpy = spyOn(router, 'navigate');
    service.persistLoginSession(sampleLoginResponse, false);

    service.logout();

    const logoutReq = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
    logoutReq.flush({});

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.user()).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should filter out removed calculator module and calculator/batches action slugs', () => {
    const responseWithCalculator: LoginResponseDto = {
      ...sampleLoginResponse,
      navigationModules: [
        ...(sampleLoginResponse.navigationModules ?? []),
        {
          moduleId: 99,
          name: 'Planta e Inventario',
          slug: 'calculator',
          menuSection: 'Operations',
          frontendRoute: '/calculator',
          icon: 'package',
          displayOrder: 3,
          allowedActionSlugs: ['calculator.view', 'batches.create']
        }
      ]
    };

    service.persistLoginSession(responseWithCalculator, false);

    expect(service.navigationModules().some(m => m.frontendRoute === '/calculator')).toBeFalse();
    expect(service.hasModuleAccess('/calculator')).toBeFalse();
    expect(service.hasPermission('calculator.view')).toBeFalse();
    expect(service.hasPermission('batches.create')).toBeFalse();
  });

  it('should hide SEGURIDAD RBAC modules (users and roles) from groupedNavigationSections while preserving permissions and /settings access', () => {
    const responseWithRbacMenu: LoginResponseDto = {
      ...sampleLoginResponse,
      navigationModules: [
        {
          moduleId: 1,
          name: 'Dashboard Module',
          slug: 'dashboard',
          menuSection: 'Operación',
          frontendRoute: '/dashboard',
          icon: 'grid',
          displayOrder: 1,
          allowedActionSlugs: ['dashboard.view']
        },
        {
          moduleId: 8,
          name: 'Gestión de Usuarios',
          slug: 'users',
          menuSection: 'SEGURIDAD RBAC',
          frontendRoute: '/admin/users',
          icon: 'users',
          displayOrder: 8,
          allowedActionSlugs: ['users.view', 'users.manage']
        },
        {
          moduleId: 9,
          name: 'Roles y Matriz de Permisos',
          slug: 'roles',
          menuSection: 'SEGURIDAD RBAC',
          frontendRoute: '/admin/roles',
          icon: 'shield',
          displayOrder: 9,
          allowedActionSlugs: ['roles.view', 'roles.manage']
        }
      ]
    };

    service.persistLoginSession(responseWithRbacMenu, false);

    const groups = service.groupedNavigationSections();
    expect(groups.some(g => g.sectionName === 'SEGURIDAD RBAC')).toBeFalse();
    expect(groups.length).toBe(1);
    expect(groups[0].modules.length).toBe(1);

    expect(service.navigationModules().length).toBe(3);
    expect(service.hasPermission('users.manage')).toBeTrue();
    expect(service.hasPermission('roles.manage')).toBeTrue();
    expect(service.hasModuleAccess('/settings')).toBeTrue();
  });

  it('should hide Portal Web Clientes from groupedNavigationSections in COMERCIAL Y FINANZAS while preserving /portal-clientes route access', () => {
    const responseWithPortalModule: LoginResponseDto = {
      ...sampleLoginResponse,
      navigationModules: [
        {
          moduleId: 6,
          name: 'Contabilidad y Facturación',
          slug: 'accounting',
          menuSection: 'Comercial y Finanzas',
          frontendRoute: '/accounting',
          icon: 'dollar-sign',
          displayOrder: 6,
          allowedActionSlugs: ['accounting.view']
        },
        {
          moduleId: 7,
          name: 'Portal Web Clientes',
          slug: 'client-portal',
          menuSection: 'Comercial y Finanzas',
          frontendRoute: '/portal-clientes',
          icon: 'grid',
          displayOrder: 7,
          allowedActionSlugs: ['portal.view']
        }
      ]
    };

    service.persistLoginSession(responseWithPortalModule, false);

    const groups = service.groupedNavigationSections();
    const commercialGroup = groups.find(g => g.sectionName === 'Comercial y Finanzas');
    expect(commercialGroup).toBeTruthy();
    expect(commercialGroup?.modules.some(m => m.frontendRoute === '/portal-clientes')).toBeFalse();
    expect(commercialGroup?.modules.some(m => m.name === 'Portal Web Clientes')).toBeFalse();
    expect(service.hasModuleAccess('/portal-clientes')).toBeTrue();
  });
});
