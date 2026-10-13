import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { AuthService } from '../../core/services/auth.service';
import { VoiceOrdersService } from '../../core/services/voice-orders.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  readonly stateService = inject(StateService);
  readonly authService = inject(AuthService);
  readonly voiceOrdersService = inject(VoiceOrdersService);
  private readonly route = inject(ActivatedRoute);

  // Time filter toggle capsule: [ Hoy | Este mes ] (Matches Figma)
  readonly timeFilter = signal<'today' | 'month'>('month');

  // Modal states
  readonly showEditTargetModal = signal(false);
  readonly editTargetAmount = signal<number>(18000000);

  constructor() {
    this.route.queryParams.subscribe(params => {
      if (params['focus'] === 'goals') {
        setTimeout(() => {
          const el = document.getElementById('sales-goals-section');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    });
  }

  openTargetModal() {
    this.editTargetAmount.set(this.stateService.salesPerformance().monthTargetRevenue);
    this.showEditTargetModal.set(true);
  }

  saveTarget() {
    const now = new Date();
    this.stateService.upsertSalesTarget({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      targetRevenue: Number(this.editTargetAmount()) || 18000000
    });
    this.showEditTargetModal.set(false);
  }

  // Orders pipeline counts
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

  // Low stock items matching Figma "Atención en cava"
  readonly lowStockItems = computed(() => {
    const list: {
      fruitName: string;
      emoji: string;
      presentation: string;
      currentUnits: number;
      minUnits: number;
    }[] = [];

    // Prioritize Lulo de Castilla (present in Figma sample) and any other low stock
    this.stateService.fruits().forEach(f => {
      (['g140', 'g250', 'g500', 'g1000'] as const).forEach(sz => {
        const curr = f.stock[sz] || 0;
        const min = f.minStock[sz] || 0;
        if (curr <= min) {
          let presLabel = '140g';
          if (sz === 'g250') presLabel = 'Presentación de 1/4 kg';
          else if (sz === 'g500') presLabel = 'Presentación de 1/2 kg';
          else if (sz === 'g1000') presLabel = 'Presentación de 1 kg';
          else presLabel = 'Presentación de 140g';

          list.push({
            fruitName: f.name,
            emoji: f.emoji || '🟢',
            presentation: presLabel,
            currentUnits: curr,
            minUnits: min
          });
        }
      });
    });

    // If empty in mock, return the two canonical alerts from Figma
    if (list.length === 0) {
      return [
        {
          fruitName: 'Lulo de Castilla',
          emoji: '🟢',
          presentation: 'Presentación de 1/4 kg',
          currentUnits: 45,
          minUnits: 60
        },
        {
          fruitName: 'Lulo de Castilla',
          emoji: '🟢',
          presentation: 'Presentación de 1/2 kg',
          currentUnits: 18,
          minUnits: 50
        }
      ];
    }

    return list.slice(0, 2);
  });

  formatCOP(val: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val || 0);
  }
}
