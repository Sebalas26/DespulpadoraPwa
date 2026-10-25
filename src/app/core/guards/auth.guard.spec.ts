import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

/**
 * Unit test suite for `authGuard`, `adminGuard`, and `guestGuard`.
 */
describe('Auth Guards', () => {
  let authServiceMock: {
    isAuthenticated: jasmine.Spy<() => boolean>;
    isSystemDeveloper: jasmine.Spy<() => boolean>;
    hasModuleAccess: jasmine.Spy<(route: string) => boolean>;
    hasPermission: jasmine.Spy<(slug: string) => boolean>;
  };
  let routerMock: jasmine.SpyObj<Router>;
  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/dashboard' } as RouterStateSnapshot;

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
      isSystemDeveloper: jasmine.createSpy('isSystemDeveloper').and.returnValue(false),
      hasModuleAccess: jasmine.createSpy('hasModuleAccess').and.returnValue(false),
      hasPermission: jasmine.createSpy('hasPermission').and.returnValue(false)
    };
    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  describe('authGuard', () => {
    it('should allow access when the user is authenticated', () => {
      authServiceMock.isAuthenticated.and.returnValue(true);
      const result = TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));
      expect(result).toBeTrue();
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to /login and return false when unauthenticated', () => {
      authServiceMock.isAuthenticated.and.returnValue(false);
      const result = TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));
      expect(result).toBeFalse();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('adminGuard', () => {
    it('should allow access when authenticated as a system developer', () => {
      authServiceMock.isAuthenticated.and.returnValue(true);
      authServiceMock.isSystemDeveloper.and.returnValue(true);
      const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));
      expect(result).toBeTrue();
    });

    it('should allow access when authenticated and authorized for /settings', () => {
      authServiceMock.isAuthenticated.and.returnValue(true);
      authServiceMock.hasModuleAccess.and.callFake((route: string) => route === '/settings');
      const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));
      expect(result).toBeTrue();
    });

    it('should redirect to /dashboard and return false when lacking administrative permissions', () => {
      authServiceMock.isAuthenticated.and.returnValue(true);
      const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));
      expect(result).toBeFalse();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('guestGuard', () => {
    it('should allow access when user is not authenticated', () => {
      authServiceMock.isAuthenticated.and.returnValue(false);
      const result = TestBed.runInInjectionContext(() => guestGuard(dummyRoute, dummyState));
      expect(result).toBeTrue();
    });

    it('should redirect to /dashboard when user is already authenticated', () => {
      authServiceMock.isAuthenticated.and.returnValue(true);
      const result = TestBed.runInInjectionContext(() => guestGuard(dummyRoute, dummyState));
      expect(result).toBeFalse();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });
});
