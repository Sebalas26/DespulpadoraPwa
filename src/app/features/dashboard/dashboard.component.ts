import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderDto } from '../../core/models/business.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  readonly stateService = inject(StateService);
  readonly authService = inject(AuthService);

  readonly currentDateStr = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Modal states
  readonly showQuickBatchModal = signal(false);
  readonly showQuickOrderModal = signal(false);

  // Low stock items computed
  readonly lowStockItems = computed(() => {
    const list: {
      fruitName: string;
      emoji: string;
      color: string;
      size: string;
      current: number;
      min: number;
    }[] = [];

    this.stateService.fruits().forEach(f => {
      (['g140', 'g250', 'g500', 'g1000'] as const).forEach(sz => {
        const curr = f.stock[sz] || 0;
        const min = f.minStock[sz] || 0;
        if (curr <= min) {
          list.push({
            fruitName: f.name,
            emoji: f.emoji,
            color: f.color,
            size: sz.replace('g', '') + 'g',
            current: curr,
            min: min
          });
        }
      });
    });

    return list;
  });

  readonly totalPulpKgProduced = computed(() => {
    return this.stateService.batches().reduce((sum, b) => sum + (b.pulpProducedKg || 0), 0);
  });

  readonly ordersByStatus = computed(() => {
    const orders = this.stateService.orders();
    return {
      pending: orders.filter(o => o.status === 'PENDING').length,
      picking: orders.filter(o => o.status === 'PICKING').length,
      billed: orders.filter(o => o.status === 'BILLED').length,
      dispatched: orders.filter(o => o.status === 'DISPATCHED').length,
      delivered: orders.filter(o => o.status === 'DELIVERED').length
    };
  });

  formatCOP(val: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  }

  calculateKg(f: any): number {
    return Number(((f.stock.g140 * 0.14) + (f.stock.g250 * 0.25) + (f.stock.g500 * 0.5) + (f.stock.g1000 * 1.0)).toFixed(1));
  }
}
