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
import {
  RolePermissionsMatrixDto,
  SystemModuleCatalogDto,
  UserRoleDto
} from '../../../core/models/business.models';

/**
 * Unit tests for AdminRolesComponent verifying RBAC role and permission management without hardcoded fallbacks.
 */
describe('AdminRolesComponent', () => {
  let component: AdminRolesComponent;
  let fixture: ComponentFixture<AdminRolesComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let authMock: Partial<AuthService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;

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
      'deleteRole'
    ]);
    authMock = {
      user: signal(null) as unknown as AuthService['user'],
      currentUser: signal(null) as unknown as AuthService['currentUser'],
      syncNavigationModules: jasmine.createSpy('syncNavigationModules')
    };
    notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'success',
      'error',
      'warning',
      'info'
    ]);

    apiSpy.getSystemModules.and.returnValue(of(mockSystemModules));
    apiSpy.getRoles.and.returnValue(of(mockRoles));
    apiSpy.getRolePermissionsMatrix.and.returnValue(of(mockMatrix));

    await TestBed.configureTestingModule({
      imports: [AdminRolesComponent],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authMock },
        { provide: NotificationService, useValue: notificationSpy }
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

  it('should create and delete custom roles via API', () => {
    const newRole: UserRoleDto = {
      roleId: 5,
      name: 'Supervisor',
      description: 'Supervisión',
      isSystemRole: false,
      isActive: true
    };
    apiSpy.createRole.and.returnValue(of(newRole));
    apiSpy.deleteRole.and.returnValue(of({ message: 'Deleted' }));
    spyOn(window, 'confirm').and.returnValue(true);

    component.showCreateRoleModal.set(true);
    component.newRoleName.set('Supervisor');
    component.newRoleDesc.set('Supervisión');
    component.submitNewRole();

    expect(apiSpy.createRole).toHaveBeenCalled();
    expect(component.roles().some(r => r.roleId === 5)).toBeTrue();

    const mouseEvent = new MouseEvent('click');
    component.deleteCustomRole(newRole, mouseEvent);
    expect(apiSpy.deleteRole).toHaveBeenCalledWith(5);
  });
});
