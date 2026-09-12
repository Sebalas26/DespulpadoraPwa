import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { ExpenseDto } from '../../core/models/business.models';

@Component({
  selector: 'app-accounting',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accounting.component.html',
  styleUrls: ['./accounting.component.scss']
})
export class AccountingComponent {
  readonly stateService = inject(StateService);
  readonly notification = inject(NotificationService);

  readonly showNewExpenseModal = signal<boolean>(false);
  readonly filterCategory = signal<string>('all');

  // Form fields
  readonly newCategoryName = signal<string>('Materia Prima / Fruta Fresca');
  readonly newDescription = signal<string>('');
  readonly newAmount = signal<number>(50000);
  readonly newReceipt = signal<string>('');

  readonly categories = [
    'Materia Prima / Fruta Fresca',
    'Empaques, Bolsas y Cajas',
    'Servicios Públicos (Energía Cava)',
    'Mantenimiento Despulpadoras',
    'Transporte y Combustible',
    'Insumos de Aseo y BPM',
    'Otros Gastos Operativos'
  ];

  readonly totalExpenses = computed(() => {
    return this.stateService.expenses().reduce((sum, e) => sum + e.amount, 0);
  });

  readonly filteredExpenses = computed(() => {
    const cat = this.filterCategory();
    if (cat === 'all') return this.stateService.expenses();
    return this.stateService.expenses().filter(e => e.categoryName === cat);
  });

  submitExpense() {
    if (!this.newDescription() || this.newAmount() <= 0) {
      this.notification.warning('Datos inválidos', 'Ingrese una descripción y un monto válido');
      return;
    }

    this.stateService.addExpense({
      categoryName: this.newCategoryName(),
      description: this.newDescription(),
      amount: this.newAmount(),
      receiptNumber: this.newReceipt()
    });

    this.showNewExpenseModal.set(false);
    this.newDescription.set('');
    this.newAmount.set(50000);
    this.newReceipt.set('');
  }

  formatCOP(val: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  }
}
