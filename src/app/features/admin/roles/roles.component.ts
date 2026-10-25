import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NavigationModuleDto } from '../../../core/models/auth.models';
import {
  RolePermissionsMatrixDto,
  SystemActionCatalogDto,
  SystemModuleCatalogDto,
  UserRoleDto
} from '../../../core/models/business.models';

/**
 * Granular action item displayed in the Role Permissions Matrix.
 */
export interface PermissionAction {
  actionId: number;
  name: string;
  slug: string;
  httpMethod?: string;
  description: string;
}

/**
 * Module group displayed in the Role Permissions Matrix.
 */
export interface PermissionModule {
  moduleId: number;
  name: string;
  slug?: string;
  menuSection?: string;
  frontendRoute?: string;
  scope: 'PWA' | 'APP' | 'PWA + APP';
  description: string;
  actions: PermissionAction[];
}

/**
 * Alias for system module catalog entry in the Role Permissions Matrix.
 */
export type SystemModuleCatalog = PermissionModule;

/**
 * Empty initial system roles list populated from the backend RBAC API.
 */
export const SYSTEM_ROLES: UserRoleDto[] = [];

/**
 * Empty initial system modules list populated from the backend RBAC API.
 */
export const SYSTEM_MODULES: PermissionModule[] = [];

/**
 * Empty initial role-permissions mapping populated from the backend RBAC API.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<number, number[]> = {};

const STORAGE_ROLES_KEY = 'dgl_roles_v2';
const STORAGE_PERMISSIONS_KEY = 'dgl_role_permissions_v2';

/**
 * RBAC Roles and Permissions Matrix administration component connected to
 * `/api/roles`, `/api/modules`, and `PUT /api/roles/{roleId}/permissions`.
 */
@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss']
})
export class AdminRolesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly roles = signal<UserRoleDto[]>([]);
  readonly selectedRoleId = signal<number>(0);
  readonly assignedModuleIds = signal<Set<number>>(new Set<number>());
  readonly assignedActionIds = signal<Set<number>>(new Set<number>());
  readonly isSaving = signal<boolean>(false);

  readonly searchTerm = signal<string>('');
  readonly scopeFilter = signal<'ALL' | 'PWA' | 'APP'>('ALL');

  readonly showCreateRoleModal = signal<boolean>(false);
  readonly newRoleName = signal<string>('');
  readonly newRoleDesc = signal<string>('');

  readonly modules = signal<SystemModuleCatalog[]>([]);

  readonly totalActionsCount = computed<number>(() => {
    try {
      return this.modules().reduce((acc: number, m: SystemModuleCatalog) => acc + m.actions.length, 0);
    } catch {
      return 0;
    }
  });

  readonly currentRole = computed<UserRoleDto>(() => {
    try {
      const id = this.selectedRoleId();
      return (
        this.roles().find((r: UserRoleDto) => r.roleId === id) ||
        this.roles()[0] || {
          roleId: 0,
          name: '',
          description: '',
          isSystemRole: false
        }
      );
    } catch {
      return {
        roleId: 0,
        name: '',
        description: '',
        isSystemRole: false
      };
    }
  });

  readonly filteredModules = computed<PermissionModule[]>(() => {
    try {
      const term = this.searchTerm().trim().toLowerCase();
      const scope = this.scopeFilter();

      return this.modules()
        .filter((m: PermissionModule) => {
          if (scope === 'ALL') {
            return true;
          }
          if (scope === 'PWA') {
            return m.scope === 'PWA' || m.scope === 'PWA + APP';
          }
          if (scope === 'APP') {
            return m.scope === 'APP' || m.scope === 'PWA + APP';
          }
          return true;
        })
        .map((m: PermissionModule) => {
          if (!term) {
            return m;
          }
          const matchingActions = m.actions.filter(
            (a: PermissionAction) =>
              a.name.toLowerCase().includes(term) ||
              a.slug.toLowerCase().includes(term) ||
              a.description.toLowerCase().includes(term)
          );
          const moduleMatches =
            m.name.toLowerCase().includes(term) || m.description.toLowerCase().includes(term);
          return {
            ...m,
            actions: moduleMatches ? m.actions : matchingActions
          };
        })
        .filter((m: PermissionModule) => m.actions.length > 0 || !term);
    } catch {
      return [];
    }
  });

  /**
   * Initializes roles and dynamic modules from the backend API.
   */
  ngOnInit(): void {
    try {
      this.loadRolesAndCatalog();
    } catch {
      return;
    }
  }

  /**
   * Loads both `/api/roles` and `/api/modules` in parallel to build the real-time matrix.
   */
  loadRolesAndCatalog(): void {
    try {
      forkJoin({
        roles: this.api.getRoles(),
        modules: this.api.getSystemModules(false)
      }).subscribe({
        next: (result: { roles: UserRoleDto[]; modules: SystemModuleCatalogDto[] }) => {
          if (Array.isArray(result.modules)) {
            const mappedModules: PermissionModule[] = result.modules.map((m: SystemModuleCatalogDto) => ({
              moduleId: m.id,
              name: m.name,
              slug: m.slug,
              menuSection: m.menuSection,
              frontendRoute: m.frontendRoute,
              scope: 'PWA',
              description: `Sección: ${m.menuSection} · Ruta: ${m.frontendRoute}`,
              actions: (m.actions || []).map((a: SystemActionCatalogDto) => ({
                actionId: a.id,
                name: a.name,
                slug: a.slug,
                httpMethod: a.httpMethod || 'GET',
                description: a.description || ''
              }))
            }));
            this.modules.set(mappedModules);
          } else {
            this.modules.set([]);
          }

          if (Array.isArray(result.roles) && result.roles.length > 0) {
            this.roles.set(result.roles);
            this.saveRolesToStorage(result.roles);
            this.selectRole(result.roles[0].roleId);
          } else {
            this.roles.set([]);
            this.assignedModuleIds.set(new Set<number>());
            this.assignedActionIds.set(new Set<number>());
          }
        },
        error: () => {
          this.roles.set([]);
          this.modules.set([]);
          this.assignedModuleIds.set(new Set<number>());
          this.assignedActionIds.set(new Set<number>());
          this.notification.error('Error de Conexión', 'No se pudieron cargar los roles y módulos del servidor.');
        }
      });
    } catch {
      this.roles.set([]);
      this.modules.set([]);
    }
  }

  /**
   * Legacy alias for `loadRolesAndCatalog()`.
   */
  loadRoles(): void {
    try {
      this.loadRolesAndCatalog();
    } catch {
      return;
    }
  }

  /**
   * Selects a role and loads its `RolePermissionsMatrixDto` from `GET /api/roles/{roleId}/permissions`.
   */
  selectRole(roleId: number): void {
    try {
      this.selectedRoleId.set(roleId);

      this.api.getRolePermissionsMatrix(roleId).subscribe({
        next: (matrix: RolePermissionsMatrixDto) => {
          const modSet = new Set<number>(matrix.assignedModuleIds || []);
          const actSet = new Set<number>(matrix.assignedActionIds || []);
          this.assignedModuleIds.set(modSet);
          this.assignedActionIds.set(actSet);
        },
        error: () => {
          this.assignedModuleIds.set(new Set<number>());
          this.assignedActionIds.set(new Set<number>());
          this.notification.error('Error de Permisos', 'No se pudo cargar la matriz de permisos del rol seleccionado.');
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Toggles a granular action checkbox and automatically enables its parent module if selected.
   */
  toggleAction(actionId: number, parentModuleId?: number): void {
    try {
      this.assignedActionIds.update((set: Set<number>) => {
        const next = new Set<number>(set);
        if (next.has(actionId)) {
          next.delete(actionId);
        } else {
          next.add(actionId);
        }
        return next;
      });

      if (parentModuleId !== undefined) {
        const parentMod = this.modules().find((m: PermissionModule) => m.moduleId === parentModuleId);
        if (parentMod) {
          const hasAnyAction = parentMod.actions.some((a: PermissionAction) =>
            this.assignedActionIds().has(a.actionId)
          );
          if (hasAnyAction) {
            this.assignedModuleIds.update((set: Set<number>) => new Set<number>(set).add(parentModuleId));
          }
        }
      }
    } catch {
      return;
    }
  }

  /**
   * Toggles all actions and module access for a specific `PermissionModule`.
   */
  toggleAllModuleActions(mod: PermissionModule): void {
    try {
      const currentSet = this.assignedActionIds();
      const allAssigned =
        this.assignedModuleIds().has(mod.moduleId) &&
        (mod.actions.length === 0 || mod.actions.every((a: PermissionAction) => currentSet.has(a.actionId)));

      this.assignedModuleIds.update((set: Set<number>) => {
        const next = new Set<number>(set);
        if (allAssigned) {
          next.delete(mod.moduleId);
        } else {
          next.add(mod.moduleId);
        }
        return next;
      });

      this.assignedActionIds.update((set: Set<number>) => {
        const next = new Set<number>(set);
        if (allAssigned) {
          mod.actions.forEach((a: PermissionAction) => next.delete(a.actionId));
        } else {
          mod.actions.forEach((a: PermissionAction) => next.add(a.actionId));
        }
        return next;
      });
    } catch {
      return;
    }
  }

  /**
   * Checks whether all actions inside a module are currently selected.
   */
  isModuleFullySelected(mod: PermissionModule): boolean {
    try {
      const set = this.assignedActionIds();
      if (mod.actions.length === 0) {
        return this.assignedModuleIds().has(mod.moduleId);
      }
      return mod.actions.every((a: PermissionAction) => set.has(a.actionId));
    } catch {
      return false;
    }
  }

  /**
   * Returns the count of selected actions inside a module.
   */
  getModuleAssignedCount(mod: PermissionModule): number {
    try {
      const set = this.assignedActionIds();
      return mod.actions.filter((a: PermissionAction) => set.has(a.actionId)).length;
    } catch {
      return 0;
    }
  }

  /**
   * Persists the selected role's `moduleIds` and `actionIds` via `PUT /api/roles/{roleId}/permissions`.
   */
  savePermissions(): void {
    try {
      const roleId = this.selectedRoleId();
      const actionSet = this.assignedActionIds();
      const moduleSet = new Set<number>(this.assignedModuleIds());

      this.modules().forEach((m: PermissionModule) => {
        if (m.actions.some((a: PermissionAction) => actionSet.has(a.actionId))) {
          moduleSet.add(m.moduleId);
        }
      });

      const moduleIds = Array.from(moduleSet);
      const actionIds = Array.from(actionSet);

      this.isSaving.set(true);
      this.api.assignRolePermissionsMatrix(roleId, { moduleIds, actionIds }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.assignedModuleIds.set(moduleSet);
          const permsMap = this.getStoredPermissionsMap();
          permsMap[roleId] = actionIds;
          localStorage.setItem(STORAGE_PERMISSIONS_KEY, JSON.stringify(permsMap));
          this.syncCurrentRoleNavigationIfNeeded(roleId, moduleSet, actionSet);
          this.notification.success(
            'Matriz RBAC Guardada',
            `Se actualizaron ${moduleIds.length} módulos y ${actionIds.length} acciones para "${this.currentRole().name}".`
          );
        },
        error: () => {
          this.isSaving.set(false);
          this.notification.error(
            'Error al Guardar',
            'No se pudo actualizar la matriz de permisos en el servidor.'
          );
        }
      });
    } catch {
      this.isSaving.set(false);
    }
  }

  /**
   * Synchronizes the current user's sidebar navigation modules if the modified role matches the active user's role.
   */
  private syncCurrentRoleNavigationIfNeeded(
    roleId: number,
    moduleSet: Set<number>,
    actionSet: Set<number>
  ): void {
    try {
      const currentUserRoleId = this.auth.user()?.roleId ?? this.auth.currentUser()?.roleId;
      if (currentUserRoleId !== roleId) {
        return;
      }

      const updatedNav: NavigationModuleDto[] = this.modules()
        .filter((m: PermissionModule) => moduleSet.has(m.moduleId))
        .map((m: PermissionModule, idx: number) => ({
          moduleId: m.moduleId,
          name: m.name,
          slug: m.slug || `mod-${m.moduleId}`,
          menuSection: m.menuSection || '',
          frontendRoute: m.frontendRoute || '/',
          icon: 'grid',
          displayOrder: idx + 1,
          allowedActionSlugs: m.actions
            .filter((a: PermissionAction) => actionSet.has(a.actionId))
            .map((a: PermissionAction) => a.slug)
        }));
      this.auth.syncNavigationModules(updatedNav);
    } catch {
      return;
    }
  }

  /**
   * Creates a new role via `POST /api/roles`.
   */
  submitNewRole(): void {
    try {
      const name = this.newRoleName().trim();
      if (!name) {
        this.notification.warning('Nombre requerido', 'Ingresa el nombre del nuevo rol.');
        return;
      }

      const description = this.newRoleDesc().trim();

      this.api.createRole({ name, description, isActive: true }).subscribe({
        next: (created: UserRoleDto) => {
          const updated = [...this.roles(), created];
          this.roles.set(updated);
          this.saveRolesToStorage(updated);
          this.selectRole(created.roleId);
          this.showCreateRoleModal.set(false);
          this.newRoleName.set('');
          this.newRoleDesc.set('');
          this.notification.success('Rol Creado', `Rol "${created.name}" registrado en el servidor.`);
        },
        error: () => {
          this.notification.error('Error al Crear Rol', 'No se pudo registrar el rol en el servidor.');
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Deletes a custom role via `DELETE /api/roles/{id}`.
   */
  deleteCustomRole(role: UserRoleDto, event: MouseEvent): void {
    try {
      event.stopPropagation();
      if (role.isSystemRole) {
        this.notification.warning('No permitido', 'No es posible eliminar el rol Super Administrador.');
        return;
      }

      if (!confirm(`¿Eliminar el rol "${role.name}"?`)) {
        return;
      }

      this.api.deleteRole(role.roleId).subscribe({
        next: () => {
          this.removeRoleLocally(role);
        },
        error: () => {
          this.notification.error('Error al Eliminar', `No se pudo eliminar el rol "${role.name}".`);
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Removes a deleted role from local state and storage.
   */
  private removeRoleLocally(role: UserRoleDto): void {
    try {
      const updated = this.roles().filter((r: UserRoleDto) => r.roleId !== role.roleId);
      this.roles.set(updated);
      this.saveRolesToStorage(updated);

      const permsMap = this.getStoredPermissionsMap();
      delete permsMap[role.roleId];
      localStorage.setItem(STORAGE_PERMISSIONS_KEY, JSON.stringify(permsMap));

      if (updated.length > 0) {
        this.selectRole(updated[0].roleId);
      } else {
        this.selectedRoleId.set(0);
        this.assignedModuleIds.set(new Set<number>());
        this.assignedActionIds.set(new Set<number>());
      }
      this.notification.info('Rol Eliminado', `El rol "${role.name}" fue eliminado.`);
    } catch {
      return;
    }
  }

  /**
   * Reads the stored permissions map from `localStorage`.
   */
  private getStoredPermissionsMap(): Record<number, number[]> {
    try {
      const stored = localStorage.getItem(STORAGE_PERMISSIONS_KEY);
      if (stored) {
        return JSON.parse(stored) as Record<number, number[]>;
      }
      return {};
    } catch {
      return {};
    }
  }

  /**
   * Persists roles to `localStorage`.
   */
  private saveRolesToStorage(roles: UserRoleDto[]): void {
    try {
      localStorage.setItem(STORAGE_ROLES_KEY, JSON.stringify(roles));
    } catch {
      return;
    }
  }
}
