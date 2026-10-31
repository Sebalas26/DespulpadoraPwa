import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ShiftsComponent } from './shifts.component';
import { StateService } from '../../core/services/state.service';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { EmployeeDto, UserAdminDto, WorkShiftDto } from '../../core/models/business.models';
import { AuthenticatedUserDto } from '../../core/models/auth.models';

/**
 * Unit tests for ShiftsComponent verifying state-bound activeShifts, operator filtering, and StateService delegation.
 */
describe('ShiftsComponent', () => {
  let component: ShiftsComponent;
  let fixture: ComponentFixture<ShiftsComponent>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let startWorkShiftSpy: jasmine.Spy;
  let closeWorkShiftSpy: jasmine.Spy;

  const mockLoggedUser = signal<AuthenticatedUserDto | null>({
    id: 5,
    username: 'ssalamanca',
    email: 'sebastian@dgl.com',
    fullName: 'Sebastian Salamanca',
    roleId: 2,
    roleName: 'Administrador Operativo',
    isSystemDeveloper: false
  });

  const mockSystemUsers: UserAdminDto[] = [
    {
      userId: 1,
      username: 'superadmin',
      fullName: 'Super Administrador',
      email: 'root@dgl.com',
      roleId: 1,
      roleName: 'Super Administrador',
      companyId: 1,
      isSystemDeveloper: true,
      isActive: true,
      branches: []
    },
    {
      userId: 5,
      username: 'ssalamanca',
      fullName: 'Sebastian Salamanca',
      email: 'sebastian@dgl.com',
      roleId: 2,
      roleName: 'Administrador Operativo',
      companyId: 1,
      isSystemDeveloper: false,
      isActive: true,
      branches: []
    },
    {
      userId: 8,
      username: 'cajero1',
      fullName: 'Carlos Cajero',
      email: 'cajero@dgl.com',
      roleId: 4,
      roleName: 'Cajero POS',
      companyId: 1,
      isSystemDeveloper: false,
      isActive: true,
      branches: []
    },
    {
      userId: 9,
      username: 'operario1',
      fullName: 'Ana Operaria',
      email: 'ana@dgl.com',
      roleId: 3,
      roleName: 'Operador de Planta',
      companyId: 1,
      isSystemDeveloper: false,
      isActive: true,
      branches: []
    }
  ];

  const mockEmployees = signal<EmployeeDto[]>([
    {
      employeeId: 1,
      firstName: 'Ana',
      lastName: 'Ruiz',
      fullName: 'Ana Ruiz',
      identificationNumber: '1010',
      area: 'PRODUCCION',
      position: 'Operaria',
      department: 'Producción',
      baseSalary: 1500000,
      transportAllowance: 162000,
      hireDate: '2026-01-01',
      isActive: true
    }
  ]);

  const mockShifts = signal<WorkShiftDto[]>([]);

  beforeEach(async () => {
    mockShifts.set([]);
    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', ['getUsers']);
    apiSpy.getUsers.and.returnValue(of(mockSystemUsers));

    notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'success',
      'error',
      'warning',
      'info'
    ]);
    startWorkShiftSpy = jasmine.createSpy('startWorkShift').and.callFake(
      (
        employeeId: number,
        shiftType: 'MORNING' | 'AFTERNOON' | 'NIGHT',
        notes?: string,
        employeeName?: string
      ) => {
        const shift: WorkShiftDto = {
          shiftId: 100,
          employeeId,
          employeeName: employeeName || 'Carlos Cajero',
          branchId: 1,
          startTime: '06:00',
          shiftType,
          status: 'ACTIVE',
          notes
        };
        mockShifts.update(list => [shift, ...list]);
        return shift;
      }
    );
    closeWorkShiftSpy = jasmine.createSpy('closeWorkShift').and.callFake((shiftId: number) => {
      mockShifts.update(list =>
        list.map(s => (s.shiftId === shiftId ? { ...s, status: 'CLOSED' } : s))
      );
    });

    const stateServiceMock: Partial<StateService> = {
      employees: mockEmployees,
      shifts: mockShifts,
      startWorkShift: startWorkShiftSpy,
      closeWorkShift: closeWorkShiftSpy
    };

    const authServiceMock: Partial<AuthService> = {
      user: mockLoggedUser as unknown as AuthService['user'],
      currentUser: signal(null) as unknown as AuthService['currentUser']
    };

    await TestBed.configureTestingModule({
      imports: [ShiftsComponent],
      providers: [
        { provide: StateService, useValue: stateServiceMock },
        { provide: ApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ShiftsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should bind activeShifts directly to stateService.shifts() with zero hardcoded shifts initially', () => {
    expect(component).toBeTruthy();
    expect(component.activeShifts()).toEqual([]);
    expect(component.activeShiftsCount()).toBe(0);
  });

  it('should populate selectableUsers with created non-admin users excluding the currently logged-in user', () => {
    const selectable = component.selectableUsers();
    expect(selectable.map(u => u.fullName)).toEqual(['Carlos Cajero', 'Ana Operaria']);
    expect(selectable.some(u => u.fullName === 'Sebastian Salamanca')).toBeFalse();
    expect(selectable.some(u => u.fullName === 'Super Administrador')).toBeFalse();
  });

  it('should delegate punchClockIn to stateService.startWorkShift and prevent duplicate active shifts', () => {
    component.selectedEmployeeId.set(8);
    component.selectedShiftType.set('MORNING');
    component.shiftNotes.set('Línea de despulpado');

    component.punchClockIn();

    expect(startWorkShiftSpy).toHaveBeenCalledWith(8, 'MORNING', 'Línea de despulpado', 'Carlos Cajero');
    expect(component.activeShifts().length).toBe(1);
    expect(component.activeShiftsCount()).toBe(1);

    component.punchClockIn();
    expect(notificationSpy.warning).toHaveBeenCalled();
  });

  it('should delegate punchClockOut to stateService.closeWorkShift', () => {
    component.selectedEmployeeId.set(8);
    component.punchClockIn();
    const shift = component.activeShifts()[0];

    component.punchClockOut(shift);

    expect(closeWorkShiftSpy).toHaveBeenCalledWith(100);
    expect(notificationSpy.info).toHaveBeenCalled();
  });

  it('should expose parametric activeShiftSchedules and format shift schedule labels with getShiftTypeLabel', () => {
    expect(component.activeShiftSchedules().length).toBeGreaterThan(0);
    expect(component.getShiftTypeLabel('MORNING')).toContain('Turno Mañana');
  });
});
