import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { EmployeeArea, EmployeeDto, EmployeeGender, PayrollSettlementDto } from '../../core/models/business.models';

@Component({
  selector: 'app-hr',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr.component.html',
  styleUrls: ['./hr.component.scss']
})
export class HrComponent {
  readonly stateService = inject(StateService);
  readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  readonly Math = Math;

  readonly activeTab = signal<'employees' | 'payroll'>('employees');

  constructor() {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'payroll') {
        this.activeTab.set('payroll');
      } else if (params['tab'] === 'employees') {
        this.activeTab.set('employees');
      }
    });
  }

  readonly showPayslipModal = signal<boolean>(false);
  readonly showCertificateModal = signal<boolean>(false);
  readonly showNewEmployeeModal = signal<boolean>(false);
  readonly showSettlementModal = signal<boolean>(false);
  readonly selectedEmployee = signal<EmployeeDto | null>(null);
  readonly activeSettlement = signal<PayrollSettlementDto | null>(null);

  // Settlement Form fields
  readonly selectedPeriodId = signal<number>(1);
  readonly settleEmpId = signal<number>(1);
  readonly settleDays = signal<number>(15);
  readonly settleDeliveries = signal<number>(0);
  readonly settleOvertime = signal<number>(0);
  readonly settleBonuses = signal<number>(0);
  readonly settleDeductions = signal<number>(0);

  // New Employee Form fields
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

  openCertificate(emp: EmployeeDto) {
    this.selectedEmployee.set(emp);
    this.showCertificateModal.set(true);
  }

  openSettlementDialog(emp?: EmployeeDto) {
    if (emp) {
      this.settleEmpId.set(emp.employeeId);
      this.settleDeliveries.set(emp.area === 'DOMICILIOS' ? 28 : 0);
    } else if (this.stateService.employees().length > 0) {
      this.settleEmpId.set(this.stateService.employees()[0].employeeId);
    }
    this.settleDays.set(15);
    this.showSettlementModal.set(true);
  }

  onSettleEmployeeSelect(id: number) {
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

  printCurrentDocument() {
    window.print();
  }

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
      baseSalary: this.newSalary(),
      transportAllowance: 162000,
      deliveryBonusRate: this.newArea() === 'DOMICILIOS' ? 3500 : 0,
      phone: this.newPhone(),
      email: this.newEmail(),
      hireDate: new Date().toISOString().substring(0, 10),
      isActive: true
    };

    this.stateService.employees.update(list => [...list, newEmp]);
    this.notification.success('Empleado Registrado', `${newEmp.fullName} ha sido vinculado al sistema`);
    this.showNewEmployeeModal.set(false);

    // Reset
    this.newFirstName.set('');
    this.newLastName.set('');
    this.newDoc.set('');
  }

  // Colombian Payroll Calculations
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
    }).format(val);
  }
}
