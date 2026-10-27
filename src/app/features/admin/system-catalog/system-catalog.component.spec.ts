import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { DEFAULT_SYSTEM_MODULES_CATALOG, SystemCatalogComponent } from './system-catalog.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SystemModuleCatalogDto } from '../../../core/models/business.models';

/**
 * Unit tests for SystemCatalogComponent verifying master catalog CRUD without hardcoded fallback catalogs.
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
      icon: 'box',
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
          description: '',
          isActive: true
        },
        {
          id: 202,
          moduleId: 2,
          name: 'Crear Pedido',
          slug: 'orders.create',
          httpMethod: 'POST',
          description: '',
          isActive: true
        }
      ]
    }
  ];

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj<ApiService>('ApiService', [
      'getSystemModules',
      'createSystemModule',
      'updateSystemModule',
      'createSystemAction',
      'updateSystemAction'
    ]);

    authServiceMock = {
      isSystemDeveloper: signal<boolean>(true) as unknown as AuthService['isSystemDeveloper'],
      syncNavigationModules: jasmine.createSpy('syncNavigationModules'),
      isRemovedCalculatorModule: (mod: { frontendRoute?: string; slug?: string; name?: string }) =>
        mod.frontendRoute === '/calculator' ||
        mod.slug === 'calculator' ||
        mod.name === 'Planta e Inventario' ||
        mod.name === 'Control de Producción & Mermas'
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

  it('should load catalog modules from ApiService on init and compute totalActionsCount', () => {
    expect(apiServiceSpy.getSystemModules).toHaveBeenCalledWith(false);
    expect(component.modules().length).toBe(2);
    expect(component.totalActionsCount()).toBe(3);
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

  it('should filter modules by searchQuery matching name, slug, route, or actionSlug', () => {
    component.searchQuery.set('orders.create');
    expect(component.filteredModules().length).toBe(1);
    expect(component.filteredModules()[0].slug).toBe('orders');

    component.searchQuery.set('nonexistent_xyz');
    expect(component.filteredModules().length).toBe(0);
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

  it('should prefill actionSlug with module slug prefix when opening create action modal', () => {
    const targetModule = mockCatalog[1];
    component.openCreateActionModal(targetModule);

    expect(component.actionModuleId()).toBe(2);
    expect(component.actionSlug()).toBe('orders.');
    expect(component.showActionModal()).toBeTrue();
  });

  it('should call createSystemAction on ApiService when saving a new action', () => {
    const targetModule = mockCatalog[1];
    apiServiceSpy.createSystemAction.and.returnValue(
      of({
        id: 203,
        moduleId: 2,
        name: 'Exportar Pedidos',
        slug: 'orders.export',
        httpMethod: 'GET',
        description: '',
        isActive: true
      })
    );

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
});
