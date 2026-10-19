import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { EmployeeArea, EmployeeDto, EmployeeGender, PayrollSettlementDto, WorkShiftDto } from '../../core/models/business.models';

export type HrTabType = 'employees' | 'shifts' | 'certificates' | 'payroll';

@Component({
  selector: 'app-hr',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr.component.html',
  styleUrls: ['./hr.component.scss']
})
export class HrComponent implements OnInit, OnDestroy {
  readonly stateService = inject(StateService);
  readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly Math = Math;

  // Active Tab: 4 Options inside this module
  readonly activeTab = signal<HrTabType>('employees');

  // Timer for live clock in shifts
  readonly liveClock = signal<string>(new Date().toLocaleTimeString('es-CO'));
  readonly liveDate = signal<string>(
    new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  );
  private timer?: any;

  // Modals state
  readonly showPayslipModal = signal<boolean>(false);
  readonly showCertificateModal = signal<boolean>(false);
  readonly showNewEmployeeModal = signal<boolean>(false);
  readonly showSettlementModal = signal<boolean>(false);

  // Selected entities for modals / previews
  readonly selectedEmployee = signal<EmployeeDto | null>(null);
  readonly activeSettlement = signal<PayrollSettlementDto | null>(null);

  // TAB 1: EMPLOYEES DIRECTORY
  readonly employeeSearch = signal<string>('');
  readonly employeeAreaFilter = signal<string>('ALL');

  readonly filteredEmployees = computed(() => {
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
  });

  // TAB 2: SHIFTS (CONTROL HORARIO DE INGRESO Y SALIDA)
  readonly selectedShiftEmployeeId = signal<number>(1);
  readonly selectedShiftType = signal<'MORNING' | 'AFTERNOON' | 'NIGHT'>('MORNING');
  readonly shiftNotes = signal<string>('');

  readonly activeShifts = computed(() =>
    this.stateService.shifts().filter(s => s.status === 'ACTIVE')
  );

  readonly closedShifts = computed(() =>
    this.stateService.shifts().filter(s => s.status === 'CLOSED')
  );

  // TAB 3: CERTIFICATES GENERATOR (BANCARIA & LABORAL)
  readonly selectedCertEmployee = signal<EmployeeDto | null>(null);
  readonly certificateType = signal<'banking' | 'labor'>('banking');
  readonly certAddressedTo = signal<string>('A QUIEN INTERESE');
  readonly certCustomCity = signal<string>('Bogotá D.C.');
  readonly certExpeditionDate = signal<string>(
    new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
  );

  // TAB 4: PAYROLL SETTLEMENTS
  readonly selectedPeriodId = signal<number>(1);
  readonly settleEmpId = signal<number>(1);
  readonly settleDays = signal<number>(15);
  readonly settleDeliveries = signal<number>(0);
  readonly settleOvertime = signal<number>(0);
  readonly settleBonuses = signal<number>(0);
  readonly settleDeductions = signal<number>(0);

  // New Employee Form Fields (with Banking Details)
  readonly newFirstName = signal<string>('');
  readonly newLastName = signal<string>('');
  readonly newDoc = signal<string>('');
  readonly newGender = signal<EmployeeGender>('MASCULINO');
  readonly newArea = signal<EmployeeArea>('PRODUCCION');
  readonly newPosition = signal<string>('Operario de Planta');
  readonly newDepartment = signal<string>('Producción');
  readonly newSalary = signal<number>(1600000);
  readonly newPhone = signal<string>('');
  readonly newEmail = signal<string>('');
  readonly newBankName = signal<string>('Bancolombia');
  readonly newBankAccountType = signal<string>('Cuenta de Ahorros');
  readonly newBankAccountNumber = signal<string>('');

  ngOnInit() {
    // Synchronize queryParams with activeTab
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

    // Default select first employee for certificates
    if (!this.selectedCertEmployee() && this.stateService.employees().length > 0) {
      this.selectedCertEmployee.set(this.stateService.employees()[0]);
    }

    // Tick live clock
    this.timer = setInterval(() => {
      this.liveClock.set(new Date().toLocaleTimeString('es-CO'));
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  setTab(tab: HrTabType) {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  // ==========================================
  // TAB 1 ACTIONS: EMPLOYEES
  // ==========================================
  submitNewEmployee() {
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
      department: this.newArea() === 'PRODUCCION' ? 'Producción' : (this.newArea() === 'DOMICILIOS' ? 'Logística' : 'Administración'),
      baseSalary: Number(this.newSalary()) || 1600000,
      transportAllowance: 162000,
      deliveryBonusRate: this.newArea() === 'DOMICILIOS' ? 3500 : 0,
      phone: this.newPhone(),
      email: this.newEmail(),
      bankName: this.newBankName(),
      bankAccountType: this.newBankAccountType(),
      bankAccountNumber: this.newBankAccountNumber() || '458-000000-00',
      hireDate: new Date().toISOString().substring(0, 10),
      isActive: true
    };

    this.stateService.employees.update(list => [newEmp, ...list]);
    this.notification.success('Colaborador Vinculado', `${newEmp.fullName} ha sido registrado exitosamente.`);
    this.showNewEmployeeModal.set(false);

    // Reset Form
    this.newFirstName.set('');
    this.newLastName.set('');
    this.newDoc.set('');
    this.newPhone.set('');
    this.newEmail.set('');
    this.newBankAccountNumber.set('');
  }

  isEmployeeInActiveShift(empId: number): boolean {
    return this.activeShifts().some(s => s.employeeId === empId);
  }

  jumpToShiftForEmployee(emp: EmployeeDto) {
    this.selectedShiftEmployeeId.set(emp.employeeId);
    this.setTab('shifts');
  }

  jumpToCertificateForEmployee(emp: EmployeeDto) {
    this.selectedCertEmployee.set(emp);
    this.setTab('certificates');
  }

  deleteEmployee(emp: EmployeeDto) {
    const confirmed = confirm(`¿Estás seguro de que deseas eliminar a ${emp.fullName} del personal de la empresa?`);
    if (confirmed) {
      this.stateService.deleteEmployee(emp.employeeId);
    }
  }

  // ==========================================
  // TAB 2 ACTIONS: WORK SHIFTS (INGRESO Y SALIDA)
  // ==========================================
  punchClockIn() {
    const empId = Number(this.selectedShiftEmployeeId());
    const emp = this.stateService.employees().find(e => e.employeeId === empId);
    if (!emp) {
      this.notification.warning('Seleccione colaborador', 'Debe seleccionar un colaborador registrado.');
      return;
    }

    // Check if already active
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
  }

  punchClockOut(shift: WorkShiftDto) {
    this.stateService.closeWorkShift(shift.shiftId, 'Salida registrada satisfactoriamente');
    this.notification.info('Salida Registrada', `Jornada laboral de ${shift.employeeName} finalizada.`);
  }

  // ==========================================
  // TAB 3 ACTIONS: CERTIFICATES (BANCARIA & LABORAL)
  // ==========================================
  onCertEmployeeChange(empIdStr: string) {
    const empId = Number(empIdStr);
    const emp = this.stateService.employees().find(e => e.employeeId === empId);
    if (emp) {
      this.selectedCertEmployee.set(emp);
    }
  }

  printCurrentDocument() {
    window.print();
  }

  // ==========================================
  // TAB 4 ACTIONS: PAYROLL (LIQUIDACIÓN & PAGOS)
  // ==========================================
  openPayslip(emp: EmployeeDto) {
    this.selectedEmployee.set(emp);
    this.activeSettlement.set(null);
    this.showPayslipModal.set(true);
  }

  openSettlementPayslip(settlement: PayrollSettlementDto) {
    const emp = this.stateService.employees().find(e => e.employeeId === settlement.employeeId) || null;
    this.selectedEmployee.set(emp);
    this.activeSettlement.set(settlement);
    this.showPayslipModal.set(true);
  }

  openSettlementDialog(emp?: EmployeeDto) {
    if (emp) {
      this.settleEmpId.set(emp.employeeId);
      this.settleDeliveries.set(emp.area === 'DOMICILIOS' ? 28 : 0);
    } else if (this.stateService.employees().length > 0) {
      this.settleEmpId.set(this.stateService.employees()[0].employeeId);
    }
    this.settleDays.set(15);
    this.settleOvertime.set(0);
    this.settleBonuses.set(0);
    this.settleDeductions.set(0);
    this.showSettlementModal.set(true);
  }

  onSettleEmployeeSelect(idStr: any) {
    const id = Number(idStr);
    this.settleEmpId.set(id);
    const emp = this.stateService.employees().find(e => e.employeeId === id);
    if (emp?.area === 'DOMICILIOS') {
      this.settleDeliveries.set(28);
    } else {
      this.settleDeliveries.set(0);
    }
  }

  submitSettlement() {
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
    } catch (e: any) {
      this.notification.error('Error', e.message || 'Error al liquidar nómina');
    }
  }

  quickSettleAllActive() {
    let count = 0;
    this.stateService.employees().filter(e => e.isActive).forEach(emp => {
      this.stateService.settlePayroll({
        periodId: this.selectedPeriodId(),
        employeeId: emp.employeeId,
        daysWorked: 15,
        deliveryCount: emp.area === 'DOMICILIOS' ? 32 : 0
      });
      count++;
    });
    this.notification.success('Nómina Quincenal Completa', `Se liquidaron ${count} colaboradores con éxito`);
  }

  // Legal Colombian calculations
  calculateTransportAllowance(salary: number): number {
    return salary <= 2600000 ? 162000 : 0;
  }

  calculateHealthDeduction(salary: number): number {
    return Math.round(salary * 0.04);
  }

  calculatePensionDeduction(salary: number): number {
    return Math.round(salary * 0.04);
  }

  calculateNetPay(salary: number): number {
    return salary + this.calculateTransportAllowance(salary) - this.calculateHealthDeduction(salary) - this.calculatePensionDeduction(salary);
  }

  formatCOP(val: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val || 0);
  }
}
