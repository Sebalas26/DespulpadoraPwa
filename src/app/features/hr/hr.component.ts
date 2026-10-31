import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { EmployeeArea, EmployeeDto, EmployeeGender, PayrollSettlementDto, ShiftScheduleConfig, WorkShiftDto } from '../../core/models/business.models';
import { DEFAULT_SHIFT_SCHEDULES } from '../../core/data/initial-data';
import { CopCurrencyInputDirective } from '../../shared/directives/cop-currency-input.directive';

/**
 * Active navigation tab type within the Human Resources module.
 */
export type HrTabType = 'employees' | 'shifts' | 'certificates' | 'payroll';

/**
 * Component for human resources management, employee directory, work shifts, certificates, and payroll settlements.
 */
@Component({
  selector: 'app-hr',
  standalone: true,
  imports: [CommonModule, FormsModule, CopCurrencyInputDirective],
  templateUrl: './hr.component.html',
  styleUrls: ['./hr.component.scss']
})
export class HrComponent implements OnInit, OnDestroy {
  readonly stateService = inject(StateService);
  private readonly api = inject(ApiService);
  readonly notification = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly Math = Math;

  readonly activeTab = signal<HrTabType>('employees');

  readonly liveClock = signal<string>(new Date().toLocaleTimeString('es-CO'));
  readonly liveDate = signal<string>(
    new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  );
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly showPayslipModal = signal<boolean>(false);
  readonly showCertificateModal = signal<boolean>(false);
  readonly showNewEmployeeModal = signal<boolean>(false);
  readonly showSettlementModal = signal<boolean>(false);

  readonly selectedEmployee = signal<EmployeeDto | null>(null);
  readonly activeSettlement = signal<PayrollSettlementDto | null>(null);

  readonly employeeSearch = signal<string>('');
  readonly employeeAreaFilter = signal<string>('ALL');

  readonly filteredEmployees = computed<EmployeeDto[]>(() => {
    try {
      const q = this.employeeSearch().toLowerCase().trim();
      const area = this.employeeAreaFilter();
      let list = this.stateService.employees();

      if (area !== 'ALL') {
        list = list.filter(e => e.area === area || e.department?.toLowerCase() === area.toLowerCase());
      }

      if (q) {
        list = list.filter(e =>
          e.fullName.toLowerCase().includes(q) ||
          e.identificationNumber.toLowerCase().includes(q) ||
          (e.position && e.position.toLowerCase().includes(q)) ||
          (e.phone && e.phone.toLowerCase().includes(q))
        );
      }

      return list;
    } catch {
      return [];
    }
  });

  readonly selectedShiftEmployeeId = signal<number>(1);
  readonly selectedShiftType = signal<string>('MORNING');
  readonly shiftNotes = signal<string>('');
  readonly activeShiftSchedules = computed<ShiftScheduleConfig[]>(() => {
    try {
      const list =
        typeof this.stateService.activeShiftSchedules === 'function'
          ? this.stateService.activeShiftSchedules()
          : DEFAULT_SHIFT_SCHEDULES;
      return list.length > 0 ? list : DEFAULT_SHIFT_SCHEDULES;
    } catch {
      return DEFAULT_SHIFT_SCHEDULES;
    }
  });
  readonly isLoading = computed<boolean>(() => {
    try {
      return typeof this.stateService.isLoading === 'function' ? this.stateService.isLoading() : false;
    } catch {
      return false;
    }
  });

  readonly activeShifts = computed<WorkShiftDto[]>(() => {
    try {
      return this.stateService.shifts().filter(s => s.status === 'ACTIVE');
    } catch {
      return [];
    }
  });

  readonly closedShifts = computed<WorkShiftDto[]>(() => {
    try {
      return this.stateService.shifts().filter(s => s.status === 'CLOSED');
    } catch {
      return [];
    }
  });

  readonly selectedCertEmployee = signal<EmployeeDto | null>(null);
  readonly certificateType = signal<'banking' | 'labor'>('banking');
  readonly certAddressedTo = signal<string>('');
  readonly certCustomCity = signal<string>('');
  readonly certExpeditionDate = signal<string>(
    new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
  );

  readonly selectedPeriodId = signal<number>(1);
  readonly settleEmpId = signal<number>(1);
  readonly settleDays = signal<number>(15);
  readonly settleDeliveries = signal<number>(0);
  readonly settleOvertime = signal<number>(0);
  readonly settleBonuses = signal<number>(0);
  readonly settleDeductions = signal<number>(0);

  readonly newFirstName = signal<string>('');
  readonly newLastName = signal<string>('');
  readonly newDoc = signal<string>('');
  readonly newGender = signal<EmployeeGender>('MASCULINO');
  readonly newArea = signal<EmployeeArea>('PRODUCCION');
  readonly newPosition = signal<string>('');
  readonly newDepartment = signal<string>('');
  readonly newSalary = signal<number>(0);
  readonly newTransportAllowance = signal<number>(0);
  readonly newDeliveryBonusRate = signal<number>(0);
  readonly newPhone = signal<string>('');
  readonly newEmail = signal<string>('');
  readonly newBankName = signal<string>('');
  readonly newBankAccountType = signal<string>('');
  readonly newBankAccountNumber = signal<string>('');

  /**
   * Initializes route parameter listeners, default employee selection, and live clock timer.
   */
  ngOnInit(): void {
    try {
      this.stateService.refreshAll?.();
      this.route.queryParams.subscribe(params => {
        const tab = params['tab'] as HrTabType | undefined;
        if (tab && ['employees', 'shifts', 'certificates', 'payroll'].includes(tab)) {
          this.activeTab.set(tab);
        }
        if (params['empId']) {
          const emp = this.stateService.employees().find(e => e.employeeId === Number(params['empId']));
          if (emp) {
            this.selectedCertEmployee.set(emp);
            this.selectedShiftEmployeeId.set(emp.employeeId);
          }
        }
      });

      if (!this.selectedCertEmployee() && this.stateService.employees().length > 0) {
        this.selectedCertEmployee.set(this.stateService.employees()[0]);
      }

      this.timer = setInterval(() => {
        this.liveClock.set(new Date().toLocaleTimeString('es-CO'));
      }, 1000);
    } catch {
      return;
    }
  }

  /**
   * Cleans up the live clock interval timer on component destruction.
   */
  ngOnDestroy(): void {
    try {
      if (this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
    } catch {
      return;
    }
  }

  /**
   * Switches the active HR tab and updates route query parameters.
   */
  setTab(tab: HrTabType): void {
    try {
      this.activeTab.set(tab);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab },
        queryParamsHandling: 'merge'
      });
    } catch {
      return;
    }
  }

  /**
   * Validates and submits a new employee record to the backend API and state store.
   */
  submitNewEmployee(): void {
    try {
      if (!this.newFirstName() || !this.newLastName() || !this.newDoc()) {
        this.notification.warning('Campos requeridos', 'Por favor complete nombres, apellidos y documento');
        return;
      }

      const newEmp: EmployeeDto = {
        employeeId: Date.now(),
        firstName: this.newFirstName(),
        lastName: this.newLastName(),
        fullName: `${this.newFirstName()} ${this.newLastName()}`,
        identificationNumber: this.newDoc(),
        gender: this.newGender(),
        area: this.newArea(),
        position: this.newPosition(),
        department: this.newDepartment().trim(),
        baseSalary: Number(this.newSalary()) || 0,
        transportAllowance: Number(this.newTransportAllowance()) || 0,
        deliveryBonusRate: Number(this.newDeliveryBonusRate()) || 0,
        phone: this.newPhone(),
        email: this.newEmail(),
        bankName: this.newBankName(),
        bankAccountType: this.newBankAccountType(),
        bankAccountNumber: this.newBankAccountNumber().trim(),
        hireDate: new Date().toISOString().substring(0, 10),
        isActive: true
      };

      this.api.createEmployee(newEmp).subscribe({
        next: (saved) => {
          if (saved && saved.employeeId) {
            this.stateService.employees.update(list =>
              list.map(e => e.employeeId === newEmp.employeeId ? saved : e)
            );
          }
        },
        error: () => {
          return;
        }
      });

      this.stateService.employees.update(list => [newEmp, ...list]);
      this.notification.success('Colaborador Vinculado', `${newEmp.fullName} ha sido registrado exitosamente.`);
      this.showNewEmployeeModal.set(false);

      this.newFirstName.set('');
      this.newLastName.set('');
      this.newDoc.set('');
      this.newPosition.set('');
      this.newDepartment.set('');
      this.newSalary.set(0);
      this.newTransportAllowance.set(0);
      this.newDeliveryBonusRate.set(0);
      this.newPhone.set('');
      this.newEmail.set('');
      this.newBankName.set('');
      this.newBankAccountType.set('');
      this.newBankAccountNumber.set('');
    } catch {
      this.notification.error('Error', 'No se pudo registrar el colaborador.');
    }
  }

  /**
   * Checks whether an employee currently has an active work shift.
   */
  isEmployeeInActiveShift(empId: number): boolean {
    try {
      return this.activeShifts().some(s => s.employeeId === empId);
    } catch {
      return false;
    }
  }

  /**
   * Navigates to the shifts tab preselecting the specified employee.
   */
  jumpToShiftForEmployee(emp: EmployeeDto): void {
    try {
      this.selectedShiftEmployeeId.set(emp.employeeId);
      this.setTab('shifts');
    } catch {
      return;
    }
  }

  /**
   * Navigates to the certificates tab preselecting the specified employee.
   */
  jumpToCertificateForEmployee(emp: EmployeeDto): void {
    try {
      this.selectedCertEmployee.set(emp);
      this.setTab('certificates');
    } catch {
      return;
    }
  }

  /**
   * Prompts for confirmation using the modern confirm dialog and deletes an employee from the state store.
   */
  async deleteEmployee(emp: EmployeeDto): Promise<void> {
    try {
      const confirmed = await this.confirmDialog.confirm({
        title: 'Eliminar Empleado',
        message: `¿Estás seguro de que deseas eliminar a ${emp.fullName} del personal de la empresa?`,
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar',
        isDanger: true
      });
      if (confirmed) {
        this.stateService.deleteEmployee(emp.employeeId);
      }
    } catch {
      return;
    }
  }

  /**
   * Registers a work shift clock-in for the selected employee.
   */
  punchClockIn(): void {
    try {
      const empId = Number(this.selectedShiftEmployeeId());
      const emp = this.stateService.employees().find(e => e.employeeId === empId);
      if (!emp) {
        this.notification.warning('Seleccione colaborador', 'Debe seleccionar un colaborador registrado.');
        return;
      }

      const active = this.activeShifts().find(s => s.employeeId === empId);
      if (active) {
        this.notification.warning('Turno ya activo', `${emp.fullName} ya tiene un turno abierto.`);
        return;
      }

      const shift = this.stateService.startWorkShift(
        empId,
        this.selectedShiftType(),
        this.shiftNotes()
      );

      this.notification.success('Ingreso Registrado', `Turno de ${emp.fullName} iniciado a las ${shift.startTime}.`);
      this.shiftNotes.set('');
    } catch {
      this.notification.error('Error', 'No se pudo iniciar el turno.');
    }
  }

  /**
   * Closes an active work shift and records the clock-out time.
   */
  punchClockOut(shift: WorkShiftDto): void {
    try {
      this.stateService.closeWorkShift(shift.shiftId, 'Salida registrada satisfactoriamente');
      this.notification.info('Salida Registrada', `Jornada laboral de ${shift.employeeName} finalizada.`);
    } catch {
      this.notification.error('Error', 'No se pudo cerrar el turno.');
    }
  }

  /**
   * Updates the selected employee for certificate generation when the dropdown changes.
   */
  onCertEmployeeChange(empIdStr: string | number): void {
    try {
      const empId = Number(empIdStr);
      const emp = this.stateService.employees().find(e => e.employeeId === empId);
      if (emp) {
        this.selectedCertEmployee.set(emp);
      }
    } catch {
      return;
    }
  }

  /**
   * Triggers the browser print dialog for the currently displayed document.
   */
  printCurrentDocument(): void {
    try {
      window.print();
    } catch {
      return;
    }
  }

  /**
   * Opens the payslip modal for a specific employee.
   */
  openPayslip(emp: EmployeeDto): void {
    try {
      this.selectedEmployee.set(emp);
      this.activeSettlement.set(null);
      this.showPayslipModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Opens the payslip modal for a specific payroll settlement.
   */
  openSettlementPayslip(settlement: PayrollSettlementDto): void {
    try {
      const emp = this.stateService.employees().find(e => e.employeeId === settlement.employeeId) || null;
      this.selectedEmployee.set(emp);
      this.activeSettlement.set(settlement);
      this.showPayslipModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Opens the payroll settlement dialog with zeroed bonus/delivery defaults.
   */
  openSettleModal(emp?: EmployeeDto): void {
    try {
      if (emp) {
        this.settleEmpId.set(emp.employeeId);
      } else if (this.stateService.employees().length > 0) {
        this.settleEmpId.set(this.stateService.employees()[0].employeeId);
      }
      this.settleDeliveries.set(0);
      this.settleDays.set(15);
      this.settleOvertime.set(0);
      this.settleBonuses.set(0);
      this.settleDeductions.set(0);
      this.showSettlementModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Alias for opening the payroll settlement modal.
   */
  openSettlementDialog(emp?: EmployeeDto): void {
    try {
      this.openSettleModal(emp);
    } catch {
      return;
    }
  }

  /**
   * Updates the selected employee in the payroll settlement modal and resets deliveries to zero.
   */
  onSettleEmployeeSelect(idStr: string | number): void {
    try {
      const id = Number(idStr);
      this.settleEmpId.set(id);
      this.settleDeliveries.set(0);
    } catch {
      return;
    }
  }

  /**
   * Submits the individual payroll settlement and opens the generated payslip.
   */
  submitSettlement(): void {
    try {
      const settlement = this.stateService.settlePayroll({
        periodId: this.selectedPeriodId(),
        employeeId: this.settleEmpId(),
        daysWorked: this.settleDays(),
        deliveryCount: this.settleDeliveries(),
        overtimeAmount: this.settleOvertime(),
        otherBonuses: this.settleBonuses(),
        otherDeductions: this.settleDeductions()
      });

      this.showSettlementModal.set(false);
      this.openSettlementPayslip(settlement);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error al liquidar nómina';
      this.notification.error('Error', message);
    }
  }

  /**
   * Performs a batch biweekly payroll settlement for all active employees.
   */
  quickSettleAllActive(): void {
    try {
      let count = 0;
      this.stateService.employees().filter(e => e.isActive).forEach(emp => {
        this.stateService.settlePayroll({
          periodId: this.selectedPeriodId(),
          employeeId: emp.employeeId,
          daysWorked: 15,
          deliveryCount: 0
        });
        count++;
      });
      this.notification.success('Nómina Quincenal Completa', `Se liquidaron ${count} colaboradores con éxito`);
    } catch {
      this.notification.error('Error', 'No se pudo completar la liquidación masiva.');
    }
  }

  /**
   * Calculates the statutory transport allowance based on the monthly base salary.
   */
  calculateTransportAllowance(salary: number): number {
    try {
      return salary <= 2600000 ? 162000 : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Calculates the 4% statutory health contribution deduction.
   */
  calculateHealthDeduction(salary: number): number {
    try {
      return Math.round(salary * 0.04);
    } catch {
      return 0;
    }
  }

  /**
   * Calculates the 4% statutory pension contribution deduction.
   */
  calculatePensionDeduction(salary: number): number {
    try {
      return Math.round(salary * 0.04);
    } catch {
      return 0;
    }
  }

  /**
   * Calculates the estimated net monthly pay after statutory allowances and deductions.
   */
  calculateNetPay(salary: number): number {
    try {
      return salary + this.calculateTransportAllowance(salary) - this.calculateHealthDeduction(salary) - this.calculatePensionDeduction(salary);
    } catch {
      return 0;
    }
  }

  /**
   * Formats a numeric value as Colombian Peso currency.
   */
  formatCOP(val: number): string {
    try {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
      }).format(val || 0);
    } catch {
      return '$0';
    }
  }
}
