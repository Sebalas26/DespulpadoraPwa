import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BackupsComponent } from '../backups/backups.component';
import { NavigationModuleDto } from '../../../core/models/auth.models';
import {
  CreateSystemActionDto,
  CreateSystemModuleDto,
  SystemActionCatalogDto,
  SystemModuleCatalogDto,
  UpdateSystemActionDto,
  UpdateSystemModuleDto
} from '../../../core/models/business.models';

const STORAGE_SYSTEM_MODULES_KEY = 'dgl_system_catalog_modules_v1';

export const DEFAULT_SYSTEM_MODULES_CATALOG: SystemModuleCatalogDto[] = [];

/**
 * SuperAdmin / System Developer Master Configuration Circuit component for managing
 * dynamic navigation modules (`Modules`), granular module actions (`Actions`), and 1-click database backups.
 */
@Component({
  selector: 'app-system-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, BackupsComponent],
  templateUrl: './system-catalog.component.html'
})
export class SystemCatalogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly activeTab = signal<'catalog' | 'backups'>('catalog');
  readonly modules = signal<SystemModuleCatalogDto[]>([]);
  readonly selectedModuleId = signal<number | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly sectionFilter = signal<string>('ALL');

  readonly showModuleModal = signal<boolean>(false);
  readonly isEditingModule = signal<boolean>(false);
  readonly editingModuleId = signal<number | null>(null);

  readonly moduleName = signal<string>('');
  readonly moduleSlug = signal<string>('');
  readonly moduleMenuSection = signal<string>('');
  readonly moduleFrontendRoute = signal<string>('');
  readonly moduleIcon = signal<string>('grid');
  readonly moduleDisplayOrder = signal<number>(1);
  readonly moduleIsActive = signal<boolean>(true);

  readonly showActionModal = signal<boolean>(false);
  readonly isEditingAction = signal<boolean>(false);
  readonly editingActionId = signal<number | null>(null);

  readonly actionModuleId = signal<number>(0);
  readonly actionName = signal<string>('');
  readonly actionSlug = signal<string>('');
  readonly actionHttpMethod = signal<string>('GET');
  readonly actionDescription = signal<string>('');
  readonly actionIsActive = signal<boolean>(true);

  readonly availableMenuSections = computed<string[]>(() => {
    try {
      const custom = this.modules()
        .map((m: SystemModuleCatalogDto) => m.menuSection)
        .filter(Boolean);
      return Array.from(new Set(custom));
    } catch {
      return [];
    }
  });

  readonly filteredModules = computed<SystemModuleCatalogDto[]>(() => {
    try {
      const query = this.searchQuery().trim().toLowerCase();
      const section = this.sectionFilter();
      return [...this.modules()]
        .filter((mod: SystemModuleCatalogDto) => {
          if (section !== 'ALL' && mod.menuSection !== section) {
            return false;
          }
          if (!query) {
            return true;
          }
          const matchesModule =
            mod.name.toLowerCase().includes(query) ||
            mod.slug.toLowerCase().includes(query) ||
            mod.frontendRoute.toLowerCase().includes(query) ||
            mod.menuSection.toLowerCase().includes(query);
          const matchesAction = (mod.actions || []).some(
            (a: SystemActionCatalogDto) =>
              a.name.toLowerCase().includes(query) || a.slug.toLowerCase().includes(query)
          );
          return matchesModule || matchesAction;
        })
        .sort((a: SystemModuleCatalogDto, b: SystemModuleCatalogDto) => a.displayOrder - b.displayOrder);
    } catch {
      return [];
    }
  });

  readonly selectedModule = computed<SystemModuleCatalogDto | null>(() => {
    try {
      const id = this.selectedModuleId();
      const list = this.modules();
      if (list.length === 0) {
        return null;
      }
      return list.find((m: SystemModuleCatalogDto) => m.id === id) ?? list[0];
    } catch {
      return null;
    }
  });

  readonly totalActionsCount = computed<number>(() => {
    try {
      return this.modules().reduce(
        (sum: number, m: SystemModuleCatalogDto) => sum + (m.actions?.length ?? 0),
        0
      );
    } catch {
      return 0;
    }
  });

  /**
   * Initializes the System Catalog by loading all modules and actions from `/api/modules`.
   */
  ngOnInit(): void {
    try {
      this.loadSystemCatalog();
    } catch {
      return;
    }
  }

  /**
   * Loads all modules and their nested actions from the backend API.
   */
  loadSystemCatalog(): void {
    try {
      this.isLoading.set(true);
      this.api.getSystemModules(false).subscribe({
        next: (response: SystemModuleCatalogDto[]) => {
          this.isLoading.set(false);
          if (Array.isArray(response) && response.length > 0) {
            const sorted = [...response].sort(
              (a: SystemModuleCatalogDto, b: SystemModuleCatalogDto) => a.displayOrder - b.displayOrder
            );
            this.modules.set(sorted);
            this.saveCatalogToStorage(sorted);
            if (!this.selectedModuleId()) {
              this.selectedModuleId.set(sorted[0].id);
            }
          } else {
            this.modules.set([]);
            this.selectedModuleId.set(null);
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.modules.set([]);
          this.selectedModuleId.set(null);
          this.notification.error(
            'Error de Conexión',
            'No se pudo cargar el catálogo maestro de módulos del servidor.'
          );
        }
      });
    } catch {
      this.isLoading.set(false);
      this.modules.set([]);
      this.selectedModuleId.set(null);
    }
  }

  /**
   * Selects a module to inspect and manage its granular actions.
   */
  selectModule(moduleId: number): void {
    try {
      this.selectedModuleId.set(moduleId);
    } catch {
      return;
    }
  }

  /**
   * Opens the modal to register a new dynamic module.
   */
  openCreateModuleModal(): void {
    try {
      const nextOrder = Math.max(0, ...this.modules().map((m: SystemModuleCatalogDto) => m.displayOrder)) + 1;
      this.isEditingModule.set(false);
      this.editingModuleId.set(null);
      this.moduleName.set('');
      this.moduleSlug.set('');
      this.moduleMenuSection.set('');
      this.moduleFrontendRoute.set('');
      this.moduleIcon.set('grid');
      this.moduleDisplayOrder.set(nextOrder);
      this.moduleIsActive.set(true);
      this.showModuleModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Opens the modal to edit an existing dynamic module.
   */
  openEditModuleModal(mod: SystemModuleCatalogDto): void {
    try {
      this.isEditingModule.set(true);
      this.editingModuleId.set(mod.id);
      this.moduleName.set(mod.name);
      this.moduleSlug.set(mod.slug);
      this.moduleMenuSection.set(mod.menuSection);
      this.moduleFrontendRoute.set(mod.frontendRoute);
      this.moduleIcon.set(mod.icon || 'grid');
      this.moduleDisplayOrder.set(mod.displayOrder);
      this.moduleIsActive.set(mod.isActive);
      this.showModuleModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Automatically suggests a slug and frontend route when typing the module name during creation.
   */
  onModuleNameChange(name: string): void {
    try {
      this.moduleName.set(name);
      if (!this.isEditingModule()) {
        const generatedSlug = name
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        this.moduleSlug.set(generatedSlug);
        this.moduleFrontendRoute.set(generatedSlug ? `/${generatedSlug}` : '');
      }
    } catch {
      return;
    }
  }

  /**
   * Saves a new or edited dynamic module via `/api/modules`.
   */
  saveModule(): void {
    try {
      const name = this.moduleName().trim();
      const slug = this.moduleSlug().trim().toLowerCase();
      const menuSection = this.moduleMenuSection().trim();
      const rawRoute = this.moduleFrontendRoute().trim() || `/${slug}`;
      const frontendRoute = rawRoute.startsWith('/') ? rawRoute : `/${rawRoute}`;

      if (!name || !slug) {
        this.notification.warning(
          'Datos Requeridos',
          'Ingresa el nombre visible y el identificador (Slug) del módulo.'
        );
        return;
      }

      if (this.isEditingModule() && this.editingModuleId() !== null) {
        const targetId = this.editingModuleId()!;
        const updateDto: UpdateSystemModuleDto = {
          name,
          slug,
          menuSection,
          frontendRoute,
          icon: this.moduleIcon().trim() || 'grid',
          displayOrder: Number(this.moduleDisplayOrder()) || 1,
          isActive: this.moduleIsActive()
        };

        this.api.updateSystemModule(targetId, updateDto).subscribe({
          next: (updated: SystemModuleCatalogDto) => {
            this.modules.update((list: SystemModuleCatalogDto[]) =>
              list.map((m: SystemModuleCatalogDto) =>
                m.id === targetId ? { ...m, ...updated, actions: updated.actions ?? m.actions } : m
              )
            );
            this.saveCatalogToStorage(this.modules());
            this.showModuleModal.set(false);
            this.notification.success(
              'Módulo Actualizado',
              `El módulo "${name}" fue actualizado en el catálogo maestro.`
            );
          },
          error: () => {
            this.notification.error(
              'Error al Actualizar',
              `No se pudo actualizar el módulo "${name}" en el servidor.`
            );
          }
        });
      } else {
        const createDto: CreateSystemModuleDto = {
          name,
          slug,
          menuSection,
          frontendRoute,
          icon: this.moduleIcon().trim() || 'grid',
          displayOrder: Number(this.moduleDisplayOrder()) || 1,
          isActive: this.moduleIsActive()
        };

        this.api.createSystemModule(createDto).subscribe({
          next: (created: SystemModuleCatalogDto) => {
            const newMod: SystemModuleCatalogDto = {
              ...created,
              actions: created.actions ?? []
            };
            const updatedList = [...this.modules(), newMod].sort(
              (a: SystemModuleCatalogDto, b: SystemModuleCatalogDto) => a.displayOrder - b.displayOrder
            );
            this.modules.set(updatedList);
            this.selectedModuleId.set(newMod.id);
            this.saveCatalogToStorage(updatedList);
            this.showModuleModal.set(false);
            this.notification.success(
              'Módulo Creado',
              `Módulo "${name}" registrado en "${menuSection}" (${frontendRoute}).`
            );
          },
          error: () => {
            this.notification.error(
              'Error al Crear Módulo',
              `No se pudo registrar el módulo "${name}" en el servidor.`
            );
          }
        });
      }
    } catch {
      return;
    }
  }

  /**
   * Toggles the active status of a dynamic module via `PUT /api/modules/{id}`.
   */
  toggleModuleStatus(mod: SystemModuleCatalogDto, event: Event): void {
    try {
      event.stopPropagation();
      const nextActive = !mod.isActive;
      const dto: UpdateSystemModuleDto = {
        name: mod.name,
        slug: mod.slug,
        menuSection: mod.menuSection,
        frontendRoute: mod.frontendRoute,
        icon: mod.icon,
        displayOrder: mod.displayOrder,
        isActive: nextActive
      };

      this.api.updateSystemModule(mod.id, dto).subscribe({
        next: () => {
          this.modules.update((list: SystemModuleCatalogDto[]) =>
            list.map((m: SystemModuleCatalogDto) => (m.id === mod.id ? { ...m, isActive: nextActive } : m))
          );
          this.saveCatalogToStorage(this.modules());
          this.notification.info(
            nextActive ? 'Módulo Activado' : 'Módulo Desactivado',
            `El módulo "${mod.name}" ahora está ${nextActive ? 'activo' : 'inactivo'}.`
          );
        },
        error: () => {
          this.notification.error(
            'Error de Estado',
            `No se pudo cambiar el estado del módulo "${mod.name}".`
          );
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Opens the modal to create a new granular action inside the selected module.
   */
  openCreateActionModal(mod?: SystemModuleCatalogDto): void {
    try {
      const targetMod = mod ?? this.selectedModule();
      if (!targetMod) {
        return;
      }
      this.isEditingAction.set(false);
      this.editingActionId.set(null);
      this.actionModuleId.set(targetMod.id);
      this.actionName.set('');
      this.actionSlug.set(`${targetMod.slug}.`);
      this.actionHttpMethod.set('GET');
      this.actionDescription.set('');
      this.actionIsActive.set(true);
      this.showActionModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Opens the modal to edit an existing granular module action.
   */
  openEditActionModal(action: SystemActionCatalogDto): void {
    try {
      this.isEditingAction.set(true);
      this.editingActionId.set(action.id);
      this.actionModuleId.set(action.moduleId);
      this.actionName.set(action.name);
      this.actionSlug.set(action.slug);
      this.actionHttpMethod.set(action.httpMethod || 'GET');
      this.actionDescription.set(action.description || '');
      this.actionIsActive.set(action.isActive);
      this.showActionModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Saves a new or edited module action via `/api/actions`.
   */
  saveAction(): void {
    try {
      const moduleId = Number(this.actionModuleId());
      const name = this.actionName().trim();
      const slug = this.actionSlug().trim().toLowerCase();
      const httpMethod = (this.actionHttpMethod() || 'GET').trim().toUpperCase();
      const description = this.actionDescription().trim();

      if (!name || !slug) {
        this.notification.warning(
          'Datos Requeridos',
          'Ingresa el nombre y el código único (Slug) de la acción.'
        );
        return;
      }

      if (this.isEditingAction() && this.editingActionId() !== null) {
        const actionId = this.editingActionId()!;
        const dto: UpdateSystemActionDto = {
          moduleId,
          name,
          slug,
          httpMethod,
          description,
          isActive: this.actionIsActive()
        };

        this.api.updateSystemAction(actionId, dto).subscribe({
          next: (updated: SystemActionCatalogDto) => {
            this.applyActionUpdateLocally(actionId, updated);
            this.showActionModal.set(false);
            this.notification.success(
              'Acción Actualizada',
              `Permiso "${slug}" (${httpMethod}) actualizado.`
            );
          },
          error: () => {
            this.notification.error(
              'Error al Actualizar',
              `No se pudo actualizar la acción "${slug}".`
            );
          }
        });
      } else {
        const dto: CreateSystemActionDto = {
          moduleId,
          name,
          slug,
          httpMethod,
          description,
          isActive: this.actionIsActive()
        };

        this.api.createSystemAction(dto).subscribe({
          next: (created: SystemActionCatalogDto) => {
            this.appendActionLocally(moduleId, created);
            this.showActionModal.set(false);
            this.notification.success('Acción Registrada', `Permiso "${slug}" agregado al módulo.`);
          },
          error: () => {
            this.notification.error(
              'Error al Crear Acción',
              `No se pudo registrar la acción "${slug}".`
            );
          }
        });
      }
    } catch {
      return;
    }
  }

  /**
   * Toggles the active status of a module action via `PUT /api/actions/{id}`.
   */
  toggleActionStatus(action: SystemActionCatalogDto): void {
    try {
      const nextActive = !action.isActive;
      const dto: UpdateSystemActionDto = {
        moduleId: action.moduleId,
        name: action.name,
        slug: action.slug,
        httpMethod: action.httpMethod || 'GET',
        description: action.description || '',
        isActive: nextActive
      };

      this.api.updateSystemAction(action.id, dto).subscribe({
        next: (updated: SystemActionCatalogDto) => {
          this.applyActionUpdateLocally(action.id, updated);
          this.notification.info(
            nextActive ? 'Acción Activada' : 'Acción Desactivado',
            `El permiso "${action.slug}" ahora está ${nextActive ? 'activo' : 'inactivo'}.`
          );
        },
        error: () => {
          this.notification.error(
            'Error de Estado',
            `No se pudo actualizar el estado de la acción "${action.slug}".`
          );
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Returns a semantic badge class for an HTTP method.
   */
  getHttpMethodBadgeClass(method: string): string {
    try {
      switch ((method || 'GET').toUpperCase()) {
        case 'GET':
          return 'badge-info';
        case 'POST':
          return 'badge-emerald';
        case 'PUT':
          return 'badge-purple';
        case 'PATCH':
          return 'badge-warning';
        case 'DELETE':
          return 'badge-danger';
        default:
          return 'badge-subtle';
      }
    } catch {
      return 'badge-info';
    }
  }

  /**
   * Updates an action inside the local `modules` signal and persists to storage.
   */
  private applyActionUpdateLocally(actionId: number, updated: SystemActionCatalogDto): void {
    try {
      this.modules.update((list: SystemModuleCatalogDto[]) =>
        list.map((mod: SystemModuleCatalogDto) => ({
          ...mod,
          actions: (mod.actions || []).map((a: SystemActionCatalogDto) =>
            a.id === actionId ? { ...a, ...updated } : a
          )
        }))
      );
      this.saveCatalogToStorage(this.modules());
    } catch {
      return;
    }
  }

  /**
   * Appends a new action to its parent module inside the `modules` signal.
   */
  private appendActionLocally(moduleId: number, created: SystemActionCatalogDto): void {
    try {
      this.modules.update((list: SystemModuleCatalogDto[]) =>
        list.map((mod: SystemModuleCatalogDto) => {
          if (mod.id === moduleId) {
            return {
              ...mod,
              actions: [...(mod.actions || []), created]
            };
          }
          return mod;
        })
      );
      this.saveCatalogToStorage(this.modules());
    } catch {
      return;
    }
  }

  /**
   * Persists the catalog to `localStorage` and synchronizes the active developer session sidebar.
   */
  private saveCatalogToStorage(catalog: SystemModuleCatalogDto[]): void {
    try {
      localStorage.setItem(STORAGE_SYSTEM_MODULES_KEY, JSON.stringify(catalog));
      if (this.auth.isSystemDeveloper()) {
        const activeNavModules: NavigationModuleDto[] = catalog
          .filter((m: SystemModuleCatalogDto) => m.isActive)
          .map((m: SystemModuleCatalogDto) => ({
            moduleId: m.id,
            name: m.name,
            slug: m.slug,
            menuSection: m.menuSection,
            frontendRoute: m.frontendRoute,
            icon: m.icon,
            displayOrder: m.displayOrder,
            allowedActionSlugs: (m.actions || [])
              .filter((a: SystemActionCatalogDto) => a.isActive)
              .map((a: SystemActionCatalogDto) => a.slug)
          }));
        this.auth.syncNavigationModules(activeNavModules);
      }
    } catch {
      return;
    }
  }
}
