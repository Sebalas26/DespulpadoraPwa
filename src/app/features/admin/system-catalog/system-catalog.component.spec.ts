import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { DEFAULT_SYSTEM_MODULES_CATALOG, SystemCatalogComponent } from './system-catalog.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SystemActionCatalogDto, SystemModuleCatalogDto } from '../../../core/models/business.models';

/**
 * Unit tests for SystemCatalogComponent verifying plain-language UX, KPI summaries,
 * master-detail pagination, and backend CRUD integration without hardcoded fallback data.
 */
describe('SystemCatalogComponent', () => {
  let component: SystemCatalogComponent;
  let fixture: ComponentFixture<SystemCatalogComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let authServiceMock: Partial<AuthService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;

  const mockCatalog: SystemModuleCatalogDto[] = [
    {
      id: 1,
      name: 'Dashboard General',
      slug: 'dashboard',
      icon: 'grid',
      menuSection: 'PRINCIPAL',
      frontendRoute: '/dashboard',
      displayOrder: 1,
      isActive: true,
      actions: [
        {
          id: 101,
          moduleId: 1,
          name: 'Ver Dashboard',
          slug: 'dashboard.view',
          httpMethod: 'GET',
          description: '',
          isActive: true
        }
      ]
    },
    {
      id: 2,
      name: 'Pedidos & Despachos',
      slug: 'orders',
      icon: 'truck',
      menuSection: 'OPERACIONES',
      frontendRoute: '/orders',
      displayOrder: 2,
      isActive: true,
      actions: [
        {
          id: 201,
          moduleId: 2,
          name: 'Ver Pedidos',
          slug: 'orders.view',
          httpMethod: 'GET',
          description: 'Permite consultar la bandeja de pedidos',
          isActive: true
        },
        {
          id: 202,
          moduleId: 2,
          name: 'Crear Pedido',
          slug: 'orders.create',
          httpMethod: 'POST',
          description: 'Permite registrar nuevos pedidos',
          isActive: true
        },
        {
          id: 203,
          moduleId: 2,
          name: 'Anular Pedido',
          slug: 'orders.delete',
          httpMethod: 'DELETE',
          description: 'Permite anular un pedido',
          isActive: false
        }
      ]
    }
  ];

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj<ApiService>('ApiService', [
      'getSystemModules',
      'getSystemActions',
      'createSystemModule',
      'updateSystemModule',
      'deleteSystemModule',
      'createSystemAction',
      'updateSystemAction',
      'deleteSystemAction'
    ]);

    authServiceMock = {
      isSystemDeveloper: signal<boolean>(true) as unknown as AuthService['isSystemDeveloper'],
      syncNavigationModules: jasmine.createSpy('syncNavigationModules'),
      isRemovedCalculatorModule: (mod: { frontendRoute?: string; slug?: string; name?: string }) =>
        mod.frontendRoute === '/calculator' ||
        mod.slug === 'calculator' ||
        mod.name === 'Planta e Inventario' ||
        mod.name === 'Control de Producción & Mermas',
      isRemovedCalculatorActionSlug: (slug: string) =>
        slug.startsWith('calculator.') || slug.startsWith('batches.')
    };

    notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'success',
      'error',
      'warning',
      'info'
    ]);

    apiServiceSpy.getSystemModules.and.returnValue(of(mockCatalog));

    await TestBed.configureTestingModule({
      imports: [SystemCatalogComponent],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SystemCatalogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and export an empty DEFAULT_SYSTEM_MODULES_CATALOG constant', () => {
    expect(component).toBeTruthy();
    expect(DEFAULT_SYSTEM_MODULES_CATALOG).toEqual([]);
    expect(component.moduleMenuSection()).toBe('');
    expect(component.moduleFrontendRoute()).toBe('');
  });

  it('should load catalog modules from ApiService on init and compute KPI summary metrics', () => {
    expect(apiServiceSpy.getSystemModules).toHaveBeenCalledWith(false);
    expect(component.modules().length).toBe(2);
    expect(component.activeModulesCount()).toBe(2);
    expect(component.hiddenModulesCount()).toBe(0);
    expect(component.totalActionsCount()).toBe(4);
    expect(component.activeActionsCount()).toBe(3);
    expect(component.availableMenuSections()).toEqual(['PRINCIPAL', 'OPERACIONES']);
  });

  it('should render human-friendly Spanish headings and action labels in the template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Menú y Pantallas del Sistema');
    expect(compiled.textContent).toContain('Pantallas del Sistema');
    expect(compiled.textContent).toContain('Permisos Disponibles en: Dashboard General');
    expect(compiled.textContent).toContain('+ Nueva Pantalla');
    expect(compiled.textContent).toContain('+ Agregar Permiso');
  });

  it('should keep modules empty when ApiService returns empty array or fails without fallback catalog', () => {
    apiServiceSpy.getSystemModules.and.returnValue(of([]));
    component.loadSystemCatalog();
    expect(component.modules()).toEqual([]);

    apiServiceSpy.getSystemModules.and.returnValue(throwError(() => new Error('API Error')));
    component.loadSystemCatalog();
    expect(component.modules()).toEqual([]);
    expect(notificationSpy.error).toHaveBeenCalled();
  });

  it('should filter modules by searchQuery and sectionFilter and reset pagination', () => {
    component.onSearchQueryChange('orders.create');
    expect(component.filteredModules().length).toBe(1);
    expect(component.filteredModules()[0].slug).toBe('orders');
    expect(component.modulesCurrentPage()).toBe(1);

    component.clearSearchQuery();
    expect(component.searchQuery()).toBe('');
    expect(component.filteredModules().length).toBe(2);

    component.selectSectionFilter('OPERACIONES');
    expect(component.filteredModules().length).toBe(1);
    expect(component.getSectionModulesCount('OPERACIONES')).toBe(1);

    component.onSearchQueryChange('nonexistent_xyz');
    expect(component.filteredModules().length).toBe(0);
  });

  it('should paginate screens list and compute sequential numbers accurately', () => {
    component.modulesPageSize.set(1);
    expect(component.modulesTotalPages()).toBe(2);
    expect(component.paginatedModules().length).toBe(1);
    expect(component.modulesRangeStart()).toBe(1);
    expect(component.modulesRangeEnd()).toBe(1);
    expect(component.getSequentialNumber(0)).toBe(1);

    component.nextModulesPage();
    expect(component.modulesCurrentPage()).toBe(2);
    expect(component.getSequentialNumber(0)).toBe(2);

    component.prevModulesPage();
    expect(component.modulesCurrentPage()).toBe(1);

    component.setModulesPage(2);
    expect(component.modulesCurrentPage()).toBe(2);
  });

  it('should filter and paginate permissions of the selected screen by query and operation type', () => {
    component.selectModule(2);
    expect(component.selectedModule()?.id).toBe(2);
    expect(component.filteredSelectedModuleActions().length).toBe(3);

    component.selectActionOperationFilter('POST');
    expect(component.filteredSelectedModuleActions().length).toBe(1);
    expect(component.filteredSelectedModuleActions()[0].slug).toBe('orders.create');

    component.clearActionFilters();
    expect(component.filteredSelectedModuleActions().length).toBe(3);

    component.onActionSearchChange('Anular');
    expect(component.filteredSelectedModuleActions().length).toBe(1);
    expect(component.filteredSelectedModuleActions()[0].slug).toBe('orders.delete');

    component.clearActionFilters();
    component.actionsPageSize.set(2);
    expect(component.actionsTotalPages()).toBe(2);
    expect(component.paginatedSelectedModuleActions().length).toBe(2);

    component.nextActionsPage();
    expect(component.actionsCurrentPage()).toBe(2);
    expect(component.paginatedSelectedModuleActions().length).toBe(1);

    component.prevActionsPage();
    expect(component.actionsCurrentPage()).toBe(1);
  });

  it('should translate HTTP verbs into friendly Spanish labels and resolve visual icons', () => {
    expect(component.getOperationShortLabel('GET')).toBe('Consulta');
    expect(component.getOperationShortLabel('POST')).toBe('Registro');
    expect(component.getOperationShortLabel('PUT')).toBe('Modificación');
    expect(component.getOperationShortLabel('PATCH')).toBe('Modificación');
    expect(component.getOperationShortLabel('DELETE')).toBe('Eliminación');

    expect(component.getOperationFullLabel('GET')).toBe('Consulta y lectura');
    expect(component.getOperationFullLabel('POST')).toBe('Creación y registro');
    expect(component.getOperationFullLabel('PUT')).toBe('Edición y actualización');
    expect(component.getOperationFullLabel('DELETE')).toBe('Eliminación');

    expect(component.resolveIconType('truck', '/orders', 'orders')).toBe('truck');
    expect(component.resolveIconType('box', '/inventory', 'inventory')).toBe('box');
    expect(component.resolveIconType('shield', '/admin/roles', 'roles')).toBe('shield');
    expect(component.resolveIconType('grid', '/dashboard', 'dashboard')).toBe('grid');
  });

  it('should auto-generate slug and frontendRoute when typing moduleName in create mode', () => {
    component.openCreateModuleModal();
    component.onModuleNameChange('Control de Calidad');

    expect(component.moduleName()).toBe('Control de Calidad');
    expect(component.moduleSlug()).toBe('control-de-calidad');
    expect(component.moduleFrontendRoute()).toBe('/control-de-calidad');
  });

  it('should show warning and prevent saving module if required fields are empty', () => {
    component.openCreateModuleModal();
    component.moduleName.set('');
    component.moduleSlug.set('');
    component.saveModule();

    expect(notificationSpy.warning).toHaveBeenCalled();
    expect(apiServiceSpy.createSystemModule).not.toHaveBeenCalled();
  });

  it('should call createSystemModule on ApiService when creating a valid module', () => {
    const createdModule: SystemModuleCatalogDto = {
      id: 3,
      name: 'Auditoría',
      slug: 'audit',
      icon: 'shield',
      menuSection: 'SISTEMA',
      frontendRoute: '/audit',
      displayOrder: 3,
      isActive: true,
      actions: []
    };
    apiServiceSpy.createSystemModule.and.returnValue(of(createdModule));

    component.openCreateModuleModal();
    component.moduleName.set('Auditoría');
    component.moduleSlug.set('audit');
    component.moduleIcon.set('shield');
    component.moduleMenuSection.set('SISTEMA');
    component.moduleFrontendRoute.set('/audit');
    component.moduleDisplayOrder.set(3);

    component.saveModule();

    expect(apiServiceSpy.createSystemModule).toHaveBeenCalledWith({
      name: 'Auditoría',
      slug: 'audit',
      icon: 'shield',
      menuSection: 'SISTEMA',
      frontendRoute: '/audit',
      displayOrder: 3,
      isActive: true
    });
    expect(notificationSpy.success).toHaveBeenCalled();
    expect(component.showModuleModal()).toBeFalse();
  });

  it('should update module and toggle module visibility via ApiService', () => {
    const updatedModule: SystemModuleCatalogDto = {
      ...mockCatalog[0],
      name: 'Tablero Principal'
    };
    apiServiceSpy.updateSystemModule.and.returnValue(of(updatedModule));

    component.openEditModuleModal(mockCatalog[0]);
    component.moduleName.set('Tablero Principal');
    component.saveModule();

    expect(apiServiceSpy.updateSystemModule).toHaveBeenCalled();
    expect(component.showModuleModal()).toBeFalse();

    const fakeEvent = new Event('click');
    component.toggleModuleStatus(mockCatalog[0], fakeEvent);
    expect(apiServiceSpy.updateSystemModule).toHaveBeenCalled();
  });

  it('should prefill actionSlug with module slug prefix and auto-generate suffix on actionName change', () => {
    const targetModule = mockCatalog[1];
    component.openCreateActionModal(targetModule);

    expect(component.actionModuleId()).toBe(2);
    expect(component.actionSlug()).toBe('orders.');
    expect(component.showActionModal()).toBeTrue();

    component.onActionNameChange('Exportar Reporte');
    expect(component.actionSlug()).toBe('orders.exportar_reporte');
  });

  it('should call createSystemAction on ApiService when saving a new action', () => {
    const targetModule = mockCatalog[1];
    const createdAction: SystemActionCatalogDto = {
      id: 204,
      moduleId: 2,
      name: 'Exportar Pedidos',
      slug: 'orders.export',
      httpMethod: 'GET',
      description: '',
      isActive: true
    };
    apiServiceSpy.createSystemAction.and.returnValue(of(createdAction));

    component.openCreateActionModal(targetModule);
    component.actionName.set('Exportar Pedidos');
    component.actionSlug.set('orders.export');
    component.saveAction();

    expect(apiServiceSpy.createSystemAction).toHaveBeenCalledWith({
      moduleId: 2,
      name: 'Exportar Pedidos',
      slug: 'orders.export',
      httpMethod: 'GET',
      description: '',
      isActive: true
    });
    expect(notificationSpy.success).toHaveBeenCalled();
    expect(component.showActionModal()).toBeFalse();
  });

  it('should update action and toggle action status via ApiService', () => {
    const existingAction = mockCatalog[1].actions[0];
    const updatedAction: SystemActionCatalogDto = {
      ...existingAction,
      name: 'Consultar Pedidos'
    };
    apiServiceSpy.updateSystemAction.and.returnValue(of(updatedAction));

    component.openEditActionModal(existingAction);
    component.actionName.set('Consultar Pedidos');
    component.saveAction();

    expect(apiServiceSpy.updateSystemAction).toHaveBeenCalled();
    expect(component.showActionModal()).toBeFalse();

    component.toggleActionStatus(existingAction);
    expect(apiServiceSpy.updateSystemAction).toHaveBeenCalled();
  });
});
