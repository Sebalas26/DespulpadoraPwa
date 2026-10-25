import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { AuthResponseDto } from '../models/auth.models';

/**
 * Unit test suite for `authInterceptor` verifying Bearer header injection,
 * 401 token refresh rotation, and automatic logout fallback.
 */
describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let accessTokenSignal = signal<string | null>(null);
  let refreshTokenSignal = signal<string | null>(null);
  let authServiceMock: {
    accessToken: typeof accessTokenSignal;
    refreshToken: typeof refreshTokenSignal;
    refreshSession: jasmine.Spy<() => Observable<AuthResponseDto>>;
    logout: jasmine.Spy<() => void>;
  };

  beforeEach(() => {
    accessTokenSignal = signal<string | null>('valid-jwt-token');
    refreshTokenSignal = signal<string | null>('valid-refresh-token');

    authServiceMock = {
      accessToken: accessTokenSignal,
      refreshToken: refreshTokenSignal,
      refreshSession: jasmine.createSpy('refreshSession'),
      logout: jasmine.createSpy('logout')
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should attach Authorization Bearer header when accessToken is present', () => {
    http.get<Record<string, unknown>>('/api/fruits').subscribe();

    const req = httpMock.expectOne('/api/fruits');
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid-jwt-token');
    req.flush({});
  });

  it('should not attach Authorization header when accessToken is null', () => {
    accessTokenSignal.set(null);
    http.get<Record<string, unknown>>('/api/fruits').subscribe();

    const req = httpMock.expectOne('/api/fruits');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should rotate token via refreshSession and retry request on 401 response', () => {
    const refreshedSession: AuthResponseDto = {
      success: true,
      accessToken: 'rotated-jwt-token',
      isAdmin: false,
      isSuperAdmin: false,
      companyId: 1,
      allowMultipleSessions: true,
      maxActiveSessionsPerUser: 5,
      branches: [],
      permissions: []
    };
    authServiceMock.refreshSession.and.returnValue(of(refreshedSession));

    let responseData: Record<string, unknown> | undefined;
    http.get<Record<string, unknown>>('/api/orders').subscribe(res => {
      responseData = res;
    });

    const initialReq = httpMock.expectOne('/api/orders');
    initialReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceMock.refreshSession).toHaveBeenCalledTimes(1);

    const retryReq = httpMock.expectOne('/api/orders');
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer rotated-jwt-token');
    retryReq.flush({ ok: true });

    expect(responseData).toEqual({ ok: true });
  });

  it('should invoke logout when 401 occurs and refreshSession fails', () => {
    authServiceMock.refreshSession.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 401 }))
    );

    let caughtError: unknown;
    http.get<Record<string, unknown>>('/api/orders').subscribe({
      error: (err: unknown) => {
        caughtError = err;
      }
    });

    const initialReq = httpMock.expectOne('/api/orders');
    initialReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
    expect(caughtError).toBeTruthy();
  });

  it('should invoke logout immediately on 401 when no refreshToken is available', () => {
    refreshTokenSignal.set(null);

    let caughtError: unknown;
    http.get<Record<string, unknown>>('/api/orders').subscribe({
      error: (err: unknown) => {
        caughtError = err;
      }
    });

    const req = httpMock.expectOne('/api/orders');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceMock.refreshSession).not.toHaveBeenCalled();
    expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
    expect(caughtError).toBeTruthy();
  });
});
