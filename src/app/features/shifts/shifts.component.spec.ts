import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ShiftsComponent } from './shifts.component';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { EmployeeDto, WorkShiftDto } from '../../core/models/business.models';

/**
 * Unit tests for ShiftsComponent verifying state-bound activeShifts and StateService delegation.
 */
describe('ShiftsComponent', () => {
  let component: ShiftsComponent;
  let fixture: ComponentFixture<ShiftsComponent>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let startWorkShiftSpy: jasmine.Spy;
  let closeWorkShiftSpy: jasmine.Spy;

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
    notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'success',
      'error',
      'warning',
      'info'
    ]);
    startWorkShiftSpy = jasmine.createSpy('startWorkShift').and.callFake(
      (employeeId: number, shiftType: 'MORNING' | 'AFTERNOON' | 'NIGHT', notes?: string) => {
        const shift: WorkShiftDto = {
          shiftId: 100,
          employeeId,
          employeeName: 'Ana Ruiz',
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

    await TestBed.configureTestingModule({
      imports: [ShiftsComponent],
      providers: [
        { provide: StateService, useValue: stateServiceMock },
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

  it('should delegate punchClockIn to stateService.startWorkShift and prevent duplicate active shifts', () => {
    component.selectedEmployeeId.set(1);
    component.selectedShiftType.set('MORNING');
    component.shiftNotes.set('Línea de despulpado');

    component.punchClockIn();

    expect(startWorkShiftSpy).toHaveBeenCalledWith(1, 'MORNING', 'Línea de despulpado');
    expect(component.activeShifts().length).toBe(1);
    expect(component.activeShiftsCount()).toBe(1);

    component.punchClockIn();
    expect(notificationSpy.warning).toHaveBeenCalled();
  });

  it('should delegate punchClockOut to stateService.closeWorkShift', () => {
    component.selectedEmployeeId.set(1);
    component.punchClockIn();
    const shift = component.activeShifts()[0];

    component.punchClockOut(shift);

    expect(closeWorkShiftSpy).toHaveBeenCalledWith(100);
    expect(notificationSpy.info).toHaveBeenCalled();
  });
});
