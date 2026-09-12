import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { EmployeeDto } from '../../core/models/business.models';

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

  readonly showPayslipModal = signal<boolean>(false);
  readonly showCertificateModal = signal<boolean>(false);
  readonly showNewEmployeeModal = signal<boolean>(false);
  readonly selectedEmployee = signal<EmployeeDto | null>(null);

  // New Employee Form fields
  readonly newFirstName = signal<string>('');
  readonly newLastName = signal<string>('');
  readonly newDoc = signal<string>('');
  readonly newPosition = signal<string>('Operario de Planta');
  readonly newDepartment = signal<string>('Producción');
  readonly newSalary = signal<number>(1600000);
  readonly newPhone = signal<string>('');
  readonly newEmail = signal<string>('');

  openPayslip(emp: EmployeeDto) {
    this.selectedEmployee.set(emp);
    this.showPayslipModal.set(true);
  }

  openCertificate(emp: EmployeeDto) {
    this.selectedEmployee.set(emp);
    this.showCertificateModal.set(true);
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
      position: this.newPosition(),
      department: this.newDepartment(),
      baseSalary: this.newSalary(),
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
