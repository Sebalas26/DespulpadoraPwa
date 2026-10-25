import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard that requires an active authenticated session, redirecting unauthenticated visitors to `/login`.
 */
export const authGuard: CanActivateFn = (): boolean => {
  try {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated()) {
      return true;
    }

    router.navigate(['/login']);
    return false;
  } catch {
    return false;
  }
};

/**
 * Guard that validates administrative module access dynamically through RBAC permissions.
 */
export const adminGuard: CanActivateFn = (): boolean => {
  try {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (
      authService.isAuthenticated() &&
      (authService.isSystemDeveloper() ||
        authService.hasModuleAccess('/settings') ||
        authService.hasPermission('users.manage') ||
        authService.hasPermission('roles.manage'))
    ) {
      return true;
    }

    router.navigate(['/dashboard']);
    return false;
  } catch {
    return false;
  }
};

/**
 * Guard for public authentication screens (`/login`), redirecting already authenticated users to `/dashboard`.
 */
export const guestGuard: CanActivateFn = (): boolean => {
  try {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return true;
    }

    router.navigate(['/dashboard']);
    return false;
  } catch {
    return true;
  }
};
