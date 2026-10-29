import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import {
  AdminRolesComponent,
  DEFAULT_ROLE_PERMISSIONS,
  SYSTEM_MODULES,
  SYSTEM_ROLES
} from './roles.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import {
  RolePermissionsMatrixDto,
  SystemModuleCatalogDto,
  UserRoleDto
} from '../../../core/models/business.models';

/**
 * Unit tests for AdminRolesComponent verifying role and permission management without hardcoded fallbacks.
 */
describe('AdminRolesComponent', () => {
  let component: AdminRolesComponent;
  let fixture: ComponentFixture<AdminRolesComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let authMock: Partial<AuthService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let confirmDialogSpy: jasmine.SpyObj<ConfirmDialogService>;

  const mockSystemModules: SystemModuleCatalogDto[] = [
    {
      id: 1,
      name: 'Dashboard',
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
          description: 'Vista principal',
          isActive: true
        }
      ]
    }
  ];

  const mockRoles: UserRoleDto[] = [
    {
      roleId: 1,
      name: 'Operador',
      description: 'Rol operativo',
      isSystemRole: false,
      isActive: true
    }
  ];

  const mockMatrix: RolePermissionsMatrixDto = {
    roleId: 1,
    roleName: 'Operador',
    assignedModuleIds: [1],
    assignedActionIds: [101]
  };

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', [
      'getRoles',
      'getSystemModules',
      'getRolePermissionsMatrix',
      'assignRolePermissionsMatrix',
      'createRole',
      'updateRole',
      'deleteRole'
    ]);
    const isSuperAdminSignal = signal<boolean>(false);
    authMock = {
      user: signal(null) as unknown as AuthService['user'],
      currentUser: signal(null) as unknown as AuthService['currentUser'],
      isSuperAdmin: isSuperAdminSignal as unknown as AuthService['isSuperAdmin'],
      syncNavigationModules: jasmine.createSpy('syncNavigationModules'),
      isRemovedCalculatorModule: (mod: { frontendRoute?: string; slug?: string; name?: string }) =>
        mod.frontendRoute === '/calculator' ||
        mod.slug === 'calculator' ||
        mod.name === 'Planta e Inventario' ||
        mod.name === 'Control de Producción & Mermas',
      isSuperAdminRole: (role: { roleId?: number; name?: string; isSystemRole?: boolean }) =>
        (role.name || '').toLowerCase().includes('super') || (Boolean(role.isSystemRole) && role.roleId === 1),
      isSuperAdminOnlyModule: (mod: { frontendRoute?: string; slug?: string; name?: string; menuSection?: string }) =>
        mod.slug === 'system-catalog' || mod.slug === 'database-backups' || mod.frontendRoute === '/admin/catalog',
      isSuperAdminOnlyActionSlug: (slug: string) => (slug || '').toLowerCase().startsWith('system.')
    };
    notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'success',
      'error',
      'warning',
      'info'
    ]);
    confirmDialogSpy = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', [
      'confirm'
    ]);
    confirmDialogSpy.confirm.and.resolveTo(true);

    apiSpy.getSystemModules.and.returnValue(of(mockSystemModules));
    apiSpy.getRoles.and.returnValue(of(mockRoles));
    apiSpy.getRolePermissionsMatrix.and.returnValue(of(mockMatrix));

    await TestBed.configureTestingModule({
      imports: [AdminRolesComponent],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authMock },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: ConfirmDialogService, useValue: confirmDialogSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRolesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should export empty SYSTEM_ROLES, SYSTEM_MODULES, and DEFAULT_ROLE_PERMISSIONS constants', () => {
    expect(SYSTEM_ROLES).toEqual([]);
    expect(SYSTEM_MODULES).toEqual([]);
    expect(DEFAULT_ROLE_PERMISSIONS).toEqual({});
  });

  it('should load catalog, roles, and permissions matrix from API on init', () => {
    expect(component.modules().length).toBe(1);
    expect(component.roles().length).toBe(1);
    expect(component.assignedActionIds().has(101)).toBeTrue();
  });

  it('should keep roles and permissions empty and show error notification when API fails', () => {
    apiSpy.getRoles.and.returnValue(throwError(() => new Error('Network error')));
    apiSpy.getRolePermissionsMatrix.and.returnValue(throwError(() => new Error('Network error')));

    component.loadRolesAndCatalog();
    expect(component.roles()).toEqual([]);
    expect(notificationSpy.error).toHaveBeenCalled();

    component.selectRole(1);
    expect(component.assignedActionIds().size).toBe(0);
  });

  it('should toggle actions and save role permissions matrix via API', () => {
    apiSpy.assignRolePermissionsMatrix.and.returnValue(of(mockMatrix));

    component.toggleAction(101, 1);
    expect(component.assignedActionIds().has(101)).toBeFalse();

    const firstModule = component.modules()[0];
    component.toggleAllModuleActions(firstModule);
    expect(component.assignedActionIds().has(101)).toBeTrue();

    component.savePermissions();
    expect(apiSpy.assignRolePermissionsMatrix).toHaveBeenCalledWith(1, {
      moduleIds: [1],
      actionIds: [101]
    });
  });

  it('should create and delete custom roles via API using modern confirm dialog', async () => {
    const newRole: UserRoleDto = {
      roleId: 5,
      name: 'Supervisor',
      description: 'Supervisión',
      isSystemRole: false,
      isActive: true
    };
    apiSpy.createRole.and.returnValue(of(newRole));
    apiSpy.deleteRole.and.returnValue(of({ message: 'Deleted' }));

    component.showCreateRoleModal.set(true);
    component.newRoleName.set('Supervisor');
    component.newRoleDesc.set('Supervisión');
    component.submitNewRole();

    expect(apiSpy.createRole).toHaveBeenCalled();
    expect(component.roles().some(r => r.roleId === 5)).toBeTrue();

    const mouseEvent = new MouseEvent('click');
    await component.deleteCustomRole(newRole, mouseEvent);

    expect(confirmDialogSpy.confirm).toHaveBeenCalled();
    expect(apiSpy.deleteRole).toHaveBeenCalledWith(5);
  });

  it('should open edit role modal, modify role name and save via updateRole API', () => {
    const targetRole: UserRoleDto = {
      roleId: 1,
      name: 'Operador',
      description: 'Rol operativo',
      isSystemRole: false,
      isActive: true
    };
    const updatedRoleDto: UserRoleDto = {
      ...targetRole,
      name: 'Administrador Operativo',
      description: 'Gestión completa'
    };
    apiSpy.updateRole.and.returnValue(of(updatedRoleDto));

    const mouseEvent = new MouseEvent('click');
    component.openEditRoleModal(targetRole, mouseEvent);

    expect(component.showEditRoleModal()).toBeTrue();
    expect(component.editingRole()?.roleId).toBe(1);
    expect(component.editingRoleName()).toBe('Operador');

    component.editingRoleName.set('Administrador Operativo');
    component.editingRoleDesc.set('Gestión completa');
    component.saveRoleName();

    expect(apiSpy.updateRole).toHaveBeenCalledWith(1, {
      name: 'Administrador Operativo',
      description: 'Gestión completa',
      isActive: true,
      isCourier: false
    });
    expect(component.showEditRoleModal()).toBeFalse();
    expect(component.roles().find(r => r.roleId === 1)?.name).toBe('Administrador Operativo');
    expect(notificationSpy.success).toHaveBeenCalled();
  });

  it('should prevent opening edit role modal on protected system roles', () => {
    const systemRole: UserRoleDto = {
      roleId: 1,
      name: 'Super Administrador',
      description: 'Sistema',
      isSystemRole: true,
      isActive: true
    };

    component.openEditRoleModal(systemRole);
    expect(component.showEditRoleModal()).toBeFalse();
    expect(notificationSpy.warning).toHaveBeenCalled();
  });

  it('should filter out removed calculator module and calculator/batches actions from permissions matrix', () => {
    apiSpy.getSystemModules.and.returnValue(
      of([
        ...mockSystemModules,
        {
          id: 99,
          name: 'Planta e Inventario',
          slug: 'calculator',
          icon: 'package',
          menuSection: 'OPERACIÓN',
          frontendRoute: '/calculator',
          displayOrder: 2,
          isActive: true,
          actions: [
            {
              id: 991,
              moduleId: 99,
              name: 'Registrar Lote',
              slug: 'batches.create',
              httpMethod: 'POST',
              description: '',
              isActive: true
            }
          ]
        }
      ])
    );

    component.loadRolesAndCatalog();

    expect(component.modules().length).toBe(1);
    expect(component.modules().some(m => m.frontendRoute === '/calculator')).toBeFalse();
  });

  it('should hide Super Administrador role and Super Admin exclusive modules when logged-in user is not Super Admin', () => {
    apiSpy.getRoles.and.returnValue(
      of([
        {
          roleId: 1,
          name: 'Super Administrador',
          description: 'Control maestro',
          isSystemRole: true,
          isActive: true
        },
        {
          roleId: 2,
          name: 'Administrador Operativo',
          description: 'Gestión de planta',
          isSystemRole: false,
          isActive: true
        }
      ])
    );
    apiSpy.getSystemModules.and.returnValue(
      of([
        ...mockSystemModules,
        {
          id: 50,
          name: 'Catálogo Maestro del Sistema',
          slug: 'system-catalog',
          icon: 'cpu',
          menuSection: 'CONFIGURACIÓN MAESTRA',
          frontendRoute: '/admin/catalog',
          displayOrder: 10,
          isActive: true,
          actions: [
            {
              id: 501,
              moduleId: 50,
              name: 'Gestionar Catálogo',
              slug: 'system.catalog',
              httpMethod: 'POST',
              description: '',
              isActive: true
            }
          ]
        }
      ])
    );

    component.loadRolesAndCatalog();

    expect(component.visibleRoles().length).toBe(1);
    expect(component.visibleRoles()[0].name).toBe('Administrador Operativo');
    expect(component.selectedRoleId()).toBe(2);
    expect(component.filteredModules().some(m => m.slug === 'system-catalog')).toBeFalse();
  });
  it('should send isCourier flag to api.createRole when newRoleIsCourier is checked', () => {
    component.newRoleName.set('Repartidor Expreso');
    component.newRoleDesc.set('Zona Norte');
    component.newRoleIsCourier.set(true);

    apiSpy.createRole.and.returnValue(of({
      roleId: 99,
      name: 'Repartidor Expreso',
      description: 'Zona Norte',
      isCourier: true,
      isSystemRole: false,
      isActive: true
    }));

    component.submitNewRole();

    expect(apiSpy.createRole).toHaveBeenCalledWith(jasmine.objectContaining({
      name: 'Repartidor Expreso',
      isCourier: true
    }));
    expect(component.roles().some(r => r.roleId === 99 && r.isCourier === true)).toBeTrue();
  });

  it('should send isCourier flag when updating role via saveRoleName', () => {
    component.editingRole.set({
      roleId: 44,
      name: 'Repartidor Antiguo',
      description: 'Antiguo',
      isSystemRole: false,
      isActive: true,
      isCourier: false
    });
    component.editingRoleName.set('Repartidor Actualizado');
    component.editingRoleDesc.set('Nuevo');
    component.editingRoleIsCourier.set(true);

    apiSpy.updateRole.and.returnValue(of({
      roleId: 44,
      name: 'Repartidor Actualizado',
      description: 'Nuevo',
      isCourier: true,
      isSystemRole: false,
      isActive: true
    }));

    component.saveRoleName();

    expect(apiSpy.updateRole).toHaveBeenCalledWith(44, jasmine.objectContaining({
      name: 'Repartidor Actualizado',
      isCourier: true
    }));
  });
});