import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { LoginResponseDto } from '../models/auth.models';
import { environment } from '../../../environments/environment';

/**
 * Unit test suite for `AuthService` covering JWT login, token refresh, logout,
 * Server-Driven RBAC navigation grouping, route access, and action permissions.
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
      username: 'admin',
      email: 'admin@example.com',
      fullName: 'Admin User',
      roleId: 1,
      roleName: 'AdminRole',
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
    service.login({ usernameOrEmail: 'admin', password: 'SecretPassword1!' }).subscribe(session => {
      expect(session.accessToken).toBe('jwt-access-token-123');
      expect(session.companyName).toBe('');
      expect(session.branches).toEqual([]);
      expect(service.isAuthenticated()).toBeTrue();
      expect(service.user()?.username).toBe('admin');
      expect(service.navigationModules().length).toBe(3);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ usernameOrEmail: 'admin', password: 'SecretPassword1!' });
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
});
