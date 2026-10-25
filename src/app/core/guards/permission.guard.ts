import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Dynamic Server-Driven RBAC guard that verifies whether the requested route or module slug
 * exists within the authenticated user's authorized `navigationModules` tree.
 */
export const permissionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean => {
  try {
    const authService = inject(AuthService);
    const router = inject(Router);
    const notification = inject(NotificationService);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    if (authService.isSystemDeveloper()) {
      return true;
    }

    const requiresDeveloper = Boolean(route.data?.['requiresSystemDeveloper']);
    if (requiresDeveloper) {
      const hasCatalogPermission =
        authService.hasModuleAccess('/admin/catalog') ||
        authService.hasPermission('system.catalog') ||
        authService.hasPermission('roles.manage');
      if (!hasCatalogPermission) {
        notification.warning('Acceso Restringido', 'Esta sección requiere permisos del Catálogo Maestro del Sistema.');
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    }

    const requiredActionSlug = route.data?.['actionSlug'] as string | undefined;
    if (requiredActionSlug && !authService.hasPermission(requiredActionSlug)) {
      notification.warning('Permiso Insuficiente', `No posees el privilegio requerido (${requiredActionSlug}).`);
      router.navigate(['/dashboard']);
      return false;
    }

    const configuredModuleSlug = route.data?.['moduleSlug'] as string | undefined;
    const targetRoute = configuredModuleSlug || state.url || route.routeConfig?.path || '';

    if (authService.hasModuleAccess(targetRoute)) {
      return true;
    }

    const modules = authService.navigationModules();
    if (modules.length > 0) {
      const firstAllowedRoute = modules[0].frontendRoute || '/dashboard';
      notification.warning('Módulo no Autorizado', 'Tu perfil no tiene asignado el acceso a esta pantalla.');
      router.navigateByUrl(firstAllowedRoute);
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

