import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { HrComponent } from './hr.component';
import { StateService } from '../../core/services/state.service';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { DEFAULT_COMPANY_CONFIG } from '../../core/data/initial-data';
import {
  CompanyConfig,
  EmployeeDto,
  PayrollSettlementDto,
  WorkShiftDto
} from '../../core/models/business.models';

/**
 * Unit tests for HrComponent verifying zeroed initial signals, employee registration, shifts, and payroll settlements.
 */
describe('HrComponent', () => {
  let component: HrComponent;
  let fixture: ComponentFixture<HrComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let confirmDialogSpy: jasmine.SpyObj<ConfirmDialogService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let startWorkShiftSpy: jasmine.Spy;
  let closeWorkShiftSpy: jasmine.Spy;
  let settlePayrollSpy: jasmine.Spy;
  let stateServiceMock: Partial<StateService>;

  const mockEmployees = signal<EmployeeDto[]>([
    {
      employeeId: 1,
      firstName: 'Carlos',
      lastName: 'Gómez',
      fullName: 'Carlos Gómez',
      identificationNumber: '80123456',
      gender: 'MASCULINO',
      area: 'DOMICILIOS',
      position: 'Domiciliario',
      department: 'Logística',
      baseSalary: 1600000,
      transportAllowance: 162000,
      deliveryBonusRate: 3000,
      phone: '3100000000',
      email: 'carlos@dgl.com',
      bankName: 'Bancolombia',
      bankAccountType: 'Cuenta de Ahorros',
      bankAccountNumber: '123-456',
      hireDate: '2026-01-15',
      isActive: true
    }
  ]);

  const mockShifts = signal<WorkShiftDto[]>([]);
  const mockSettlements = signal<PayrollSettlementDto[]>([]);
  const mockCompanyInfo = signal<CompanyConfig>({
    ...DEFAULT_COMPANY_CONFIG,
    companyName: 'Test Corp',
    legalName: 'Test Corp S.A.S.',
    nit: '900.000.000-0'
  });

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', ['createEmployee']);
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

    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    startWorkShiftSpy = jasmine.createSpy('startWorkShift').and.returnValue({
      shiftId: 10,
      employeeId: 1,
      employeeName: 'Carlos Gómez',
      branchId: 1,
      startTime: '08:00',
      shiftType: 'MORNING',
      status: 'ACTIVE'
    } as WorkShiftDto);
    closeWorkShiftSpy = jasmine.createSpy('closeWorkShift');
    settlePayrollSpy = jasmine.createSpy('settlePayroll').and.returnValue({
      settlementId: 500,
      periodId: 1,
      employeeId: 1,
      employeeName: 'Carlos Gómez',
      area: 'DOMICILIOS',
      daysWorked: 15,
      baseSalaryMonthly: 1600000,
      baseSalaryEarned: 800000,
      transportAllowanceEarned: 81000,
      deliveryCount: 0,
      deliveryBonuses: 0,
      overtimeAmount: 0,
      otherBonuses: 0,
      totalEarnings: 881000,
      healthDeduction: 32000,
      pensionDeduction: 32000,
      otherDeductions: 0,
      totalDeductions: 64000,
      netPayable: 817000,
      paymentStatus: 'PAID',
      settledAt: '2026-10-15T12:00:00Z'
    } as PayrollSettlementDto);

    apiSpy.createEmployee.and.callFake((emp: Partial<EmployeeDto>) => of(emp as EmployeeDto));

    stateServiceMock = {
      employees: mockEmployees,
      shifts: mockShifts,
      payrollSettlements: mockSettlements,
      companyInfo: mockCompanyInfo,
      startWorkShift: startWorkShiftSpy,
      closeWorkShift: closeWorkShiftSpy,
      settlePayroll: settlePayrollSpy,
      deleteEmployee: jasmine.createSpy('deleteEmployee')
    };

    await TestBed.configureTestingModule({
      imports: [HrComponent],
      providers: [
        { provide: StateService, useValue: stateServiceMock },
        { provide: ApiService, useValue: apiSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: ConfirmDialogService, useValue: confirmDialogSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize certificate and new employee form signals with empty/zeroed values', () => {
    expect(component).toBeTruthy();
    expect(component.certAddressedTo()).toBe('');
    expect(component.certCustomCity()).toBe('');
    expect(component.newPosition()).toBe('');
    expect(component.newDepartment()).toBe('');
    expect(component.newSalary()).toBe(0);
    expect(component.newTransportAllowance()).toBe(0);
    expect(component.newDeliveryBonusRate()).toBe(0);
    expect(component.newBankName()).toBe('');
    expect(component.newBankAccountType()).toBe('');
    expect(component.newBankAccountNumber()).toBe('');
  });

  it('should submit new employee via ApiService without hardcoded salary or bank account fallbacks', () => {
    component.newFirstName.set('Laura');
    component.newLastName.set('Méndez');
    component.newDoc.set('10203040');

    component.submitNewEmployee();

    expect(apiSpy.createEmployee).toHaveBeenCalledWith(
      jasmine.objectContaining({
        firstName: 'Laura',
        lastName: 'Méndez',
        identificationNumber: '10203040',
        baseSalary: 0,
        transportAllowance: 0,
        deliveryBonusRate: 0,
        bankAccountNumber: '',
        department: ''
      })
    );
    expect(component.showNewEmployeeModal()).toBeFalse();
  });

  it('should set settleDeliveries to 0 in openSettleModal and onSettleEmployeeSelect without hardcoded 28', () => {
    component.openSettleModal(mockEmployees()[0]);
    expect(component.settleDeliveries()).toBe(0);

    component.onSettleEmployeeSelect(1);
    expect(component.settleDeliveries()).toBe(0);
  });

  it('should pass deliveryCount 0 in quickSettleAllActive without hardcoded 32', () => {
    component.quickSettleAllActive();

    expect(settlePayrollSpy).toHaveBeenCalledWith({
      periodId: 1,
      employeeId: 1,
      daysWorked: 15,
      deliveryCount: 0
    });
  });

  it('should punch clock in/out and compute statutory payroll deductions', () => {
    component.selectedShiftEmployeeId.set(1);
    component.punchClockIn();
    expect(startWorkShiftSpy).toHaveBeenCalled();

    component.punchClockOut({
      shiftId: 10,
      employeeId: 1,
      employeeName: 'Carlos Gómez',
      branchId: 1,
      startTime: '08:00',
      shiftType: 'MORNING',
      status: 'ACTIVE'
    });
    expect(closeWorkShiftSpy).toHaveBeenCalledWith(10, 'Salida registrada satisfactoriamente');

    expect(component.calculateHealthDeduction(1000000)).toBe(40000);
    expect(component.calculatePensionDeduction(1000000)).toBe(40000);
  });

  it('should prompt confirmation dialog and delete employee from stateStore when confirmed', async () => {
    const emp = mockEmployees()[0];
    await component.deleteEmployee(emp);

    expect(confirmDialogSpy.confirm).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: 'Eliminar Empleado',
        isDanger: true
      })
    );
    expect(stateServiceMock.deleteEmployee).toHaveBeenCalledWith(emp.employeeId);
  });
});
