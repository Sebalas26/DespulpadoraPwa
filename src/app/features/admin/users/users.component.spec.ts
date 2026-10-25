import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminUsersComponent } from './users.component';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserAdminDto, UserRoleDto } from '../../../core/models/business.models';

/**
 * Unit tests for AdminUsersComponent verifying API-driven user management without hardcoded fallbacks.
 */
describe('AdminUsersComponent', () => {
  let component: AdminUsersComponent;
  let fixture: ComponentFixture<AdminUsersComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;

  const mockRoles: UserRoleDto[] = [
    {
      roleId: 2,
      name: 'Administrador General',
      description: 'Administración global',
      isSystemRole: true,
      isActive: true
    }
  ];

  const mockUsers: UserAdminDto[] = [
    {
      userId: 10,
      username: 'jperez',
      fullName: 'Juan Pérez',
      email: 'jperez@dgl.com',
      phone: '3101234567',
      roleId: 2,
      roleName: 'Administrador General',
      companyId: 1,
      isActive: true,
      branches: []
    }
  ];

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', [
      'getUsers',
      'getRoles',
      'createUser',
      'assignUserRole',
      'updateUserStatus',
      'deleteUser'
    ]);
    notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'success',
      'error',
      'warning',
      'info'
    ]);

    apiSpy.getUsers.and.returnValue(of(mockUsers));
    apiSpy.getRoles.and.returnValue(of(mockRoles));

    await TestBed.configureTestingModule({
      imports: [AdminUsersComponent],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize newPassword as empty string and load users/roles from API', () => {
    expect(component).toBeTruthy();
    expect(component.newPassword()).toBe('');
    expect(component.users().length).toBe(1);
    expect(component.roles().length).toBe(1);
  });

  it('should keep users and roles empty when API calls fail without using hardcoded fallbacks', () => {
    apiSpy.getUsers.and.returnValue(throwError(() => new Error('API Down')));
    apiSpy.getRoles.and.returnValue(throwError(() => new Error('API Down')));

    component.loadUsersAndRoles();

    expect(component.users()).toEqual([]);
    expect(component.roles()).toEqual([]);
    expect(notificationSpy.error).toHaveBeenCalled();
  });

  it('should show error notification and NOT create a local fallback user when createUser API fails', () => {
    apiSpy.createUser.and.returnValue(throwError(() => new Error('Duplicate user')));

    component.showCreateModal.set(true);
    component.newUsername.set('nuevo');
    component.newFullName.set('Nuevo Usuario');
    component.newEmail.set('nuevo@dgl.com');
    component.newPassword.set('Secret123!');
    component.newRoleId.set(2);

    const initialCount = component.users().length;
    component.submitNewUser();

    expect(apiSpy.createUser).toHaveBeenCalled();
    expect(component.users().length).toBe(initialCount);
    expect(notificationSpy.error).toHaveBeenCalled();
  });

  it('should append newly created user when createUser API succeeds', () => {
    const createdUser: UserAdminDto = {
      userId: 11,
      username: 'mcastro',
      fullName: 'María Castro',
      email: 'mcastro@dgl.com',
      phone: '3200001111',
      roleId: 2,
      roleName: 'Administrador General',
      companyId: 1,
      isActive: true,
      branches: []
    };
    apiSpy.createUser.and.returnValue(of(createdUser));

    component.showCreateModal.set(true);
    component.newUsername.set('mcastro');
    component.newFullName.set('María Castro');
    component.newEmail.set('mcastro@dgl.com');
    component.newPassword.set('Secret123!');
    component.newRoleId.set(2);

    component.submitNewUser();

    expect(component.users().length).toBe(2);
    expect(component.showCreateModal()).toBeFalse();
    expect(notificationSpy.success).toHaveBeenCalled();
  });

  it('should assign role, toggle status, and delete user via API', () => {
    const updatedUser: UserAdminDto = { ...mockUsers[0], roleId: 3, roleName: 'Supervisor' };
    apiSpy.assignUserRole.and.returnValue(of(updatedUser));
    apiSpy.updateUserStatus.and.returnValue(of({ ...mockUsers[0], isActive: false }));
    apiSpy.deleteUser.and.returnValue(of({ message: 'Deleted' }));
    spyOn(window, 'confirm').and.returnValue(true);

    component.onUserRoleChange(mockUsers[0], 3);
    expect(apiSpy.assignUserRole).toHaveBeenCalledWith(10, 3);

    component.toggleUserStatus(mockUsers[0]);
    expect(apiSpy.updateUserStatus).toHaveBeenCalledWith(10, false);

    component.deleteUser(mockUsers[0]);
    expect(apiSpy.deleteUser).toHaveBeenCalledWith(10);
  });
});
