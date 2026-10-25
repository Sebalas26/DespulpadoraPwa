import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthResponseDto } from '../models/auth.models';

/**
 * HTTP interceptor that injects the JWT `Authorization: Bearer <accessToken>` header
 * and handles `401 Unauthorized` responses via token rotation or clean session logout.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  try {
    const authService = inject(AuthService);
    const token = authService.accessToken();

    let headers = req.headers;
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const clonedReq = req.clone({ headers });

    return next(clonedReq).pipe(
      catchError((error: HttpErrorResponse) => {
        const isAuthEndpoint =
          req.url.includes('/auth/login') ||
          req.url.includes('/auth/refresh-token') ||
          req.url.includes('/auth/logout');

        if (error.status === 401 && !isAuthEndpoint) {
          const currentRefreshToken = authService.refreshToken();
          if (currentRefreshToken) {
            return authService.refreshSession().pipe(
              switchMap((refreshed: AuthResponseDto) => {
                const newToken = refreshed.accessToken ?? refreshed.token ?? '';
                const retryReq = req.clone({
                  headers: req.headers.set('Authorization', `Bearer ${newToken}`)
                });
                return next(retryReq);
              }),
              catchError((refreshErr: unknown) => {
                authService.logout();
                return throwError(() => refreshErr);
              })
            );
          }

          authService.logout();
        }

        return throwError(() => error);
      })
    );
  } catch (error: unknown) {
    return throwError(() => error);
  }
};
