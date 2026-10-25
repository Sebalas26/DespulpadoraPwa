import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { AuthService } from '../../core/services/auth.service';
import { VoiceOrdersService } from '../../core/services/voice-orders.service';

export interface OrdersByStatusCounts {
  pending: number;
  picking: number;
  billed: number;
  dispatched: number;
  delivered: number;
}

export interface TodayBillingStats {
  revenue: number;
  ordersCount: number;
  unitsSold: number;
}

export interface SoldPulpsSummary {
  totalUnits: number;
  totalKg: number;
  topFruitLabel: string;
}

export interface TopClientSummary {
  name: string;
  total: number;
  orders: number;
}

export interface FruitInventoryReportItem {
  id: string;
  name: string;
  emoji: string;
  color: string;
  category: string;
  freshKg: number;
  yieldPct: number;
  estimatedPulpKg: number;
  sharePct: number;
  barPct: number;
  status: 'OPTIMO' | 'MEDIO' | 'BAJO';
}

export interface PreparedPulpsReportItem {
  id: string;
  name: string;
  emoji: string;
  color: string;
  g140: number;
  g250: number;
  g500: number;
  g1000: number;
  low140: boolean;
  low250: boolean;
  low500: boolean;
  low1000: boolean;
  units: number;
  totalKg: number;
  retailValue: number;
  hasLowAlert: boolean;
}

export interface PreparedPulpsReport {
  totalUnits: number;
  totalRetailValue: number;
  byGrammage: { g140: number; g250: number; g500: number; g1000: number };
  items: PreparedPulpsReportItem[];
}

export interface LowStockAlertItem {
  fruitName: string;
  emoji: string;
  color: string;
  presentation: string;
  currentUnits: number;
  minUnits: number;
}

/**
 * Main executive dashboard component displaying financial performance, inventory reports, and order pipelines.
 */
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

  readonly timeFilter = signal<'today' | 'month'>('month');
  readonly showEditTargetModal = signal<boolean>(false);
  readonly editTargetAmount = signal<number>(0);

  readonly ordersByStatus = computed<OrdersByStatusCounts>(() => {
    try {
      const orders = this.stateService.orders();
      return {
        pending: orders.filter(o => o.status === 'PENDING').length,
        picking: orders.filter(o => o.status === 'PICKING').length,
        billed: orders.filter(o => o.status === 'BILLED').length,
        dispatched: orders.filter(o => o.status === 'DISPATCHED').length,
        delivered: orders.filter(o => o.status === 'DELIVERED').length
      };
    } catch {
      return { pending: 0, picking: 0, billed: 0, dispatched: 0, delivered: 0 };
    }
  });

  readonly todayBillingStats = computed<TodayBillingStats>(() => {
    try {
      const validOrders = this.stateService.orders().filter(o => o.status !== 'CANCELLED');
      const todayStr = new Date().toISOString().substring(0, 10);
      let todayOrders = validOrders.filter(
        o => (o.orderDate && o.orderDate.startsWith(todayStr)) || (o.createdAt && o.createdAt.startsWith(todayStr))
      );

      if (todayOrders.length === 0 && validOrders.length > 0) {
        const latestDate = validOrders
          .map(o => (o.orderDate || o.createdAt || '').substring(0, 10))
          .filter(Boolean)
          .sort()
          .pop();
        if (latestDate) {
          todayOrders = validOrders.filter(
            o => (o.orderDate || o.createdAt || '').startsWith(latestDate)
          );
        }
      }

      const revenue = todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const units = todayOrders.reduce(
        (sum, o) => sum + o.items.reduce((iSum, item) => iSum + (item.quantity || 0), 0),
        0
      );

      return {
        revenue,
        ordersCount: todayOrders.length,
        unitsSold: units
      };
    } catch {
      return { revenue: 0, ordersCount: 0, unitsSold: 0 };
    }
  });

  readonly soldPulpsSummary = computed<SoldPulpsSummary>(() => {
    try {
      const validOrders = this.stateService.orders().filter(o => o.status !== 'CANCELLED');
      let totalUnits = 0;
      let totalKg = 0;
      const byFruit = new Map<string, number>();

      validOrders.forEach(order => {
        order.items.forEach(item => {
          const qty = item.quantity || 0;
          const gram = item.grammage || 0;
          totalUnits += qty;
          totalKg += (qty * gram) / 1000;
          const fruitKey = item.fruitName || 'Otra';
          byFruit.set(fruitKey, (byFruit.get(fruitKey) || 0) + qty);
        });
      });

      let topFruit = 'Surtido';
      let topFruitQty = 0;
      byFruit.forEach((qty, fruit) => {
        if (qty > topFruitQty) {
          topFruitQty = qty;
          topFruit = fruit;
        }
      });

      return {
        totalUnits,
        totalKg: Number(totalKg.toFixed(1)),
        topFruitLabel: topFruitQty > 0 ? `Top: ${topFruit} (${topFruitQty} uds)` : 'Sin ventas registradas'
      };
    } catch {
      return { totalUnits: 0, totalKg: 0, topFruitLabel: 'Sin ventas registradas' };
    }
  });

  readonly topClientOfMonth = computed<TopClientSummary>(() => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

      const allValidOrders = this.stateService.orders().filter(o => o.status !== 'CANCELLED');
      let validOrders = allValidOrders.filter(o => (o.orderDate || o.createdAt || '').startsWith(currentMonthStr));
      if (validOrders.length === 0) {
        validOrders = allValidOrders;
      }

      const byClient = new Map<string, TopClientSummary>();
      validOrders.forEach(order => {
        const name = order.clientName || 'Cliente sin nombre';
        const existing = byClient.get(name) || { name, total: 0, orders: 0 };
        existing.total += (order.totalAmount || 0);
        existing.orders += 1;
        byClient.set(name, existing);
      });

      let topClient: TopClientSummary = { name: 'Sin clientes este mes', total: 0, orders: 0 };
      byClient.forEach(client => {
        if (client.total > topClient.total) {
          topClient = client;
        }
      });

      return topClient;
    } catch {
      return { name: 'Sin clientes este mes', total: 0, orders: 0 };
    }
  });

  readonly totalPreparedPulpUnits = computed<number>(() => {
    try {
      return this.stateService.fruits().reduce(
        (sum, f) => sum + (f.stock.g140 || 0) + (f.stock.g250 || 0) + (f.stock.g500 || 0) + (f.stock.g1000 || 0),
        0
      );
    } catch {
      return 0;
    }
  });

  readonly estimatedPulpFromFreshFruitKg = computed<number>(() => {
    try {
      const total = this.stateService.fruits().reduce(
        (sum, f) => sum + (f.freshStockKg || 0) * (f.yieldRate || 0),
        0
      );
      return Number(total.toFixed(1));
    } catch {
      return 0;
    }
  });

  readonly fruitInventoryReport = computed<FruitInventoryReportItem[]>(() => {
    try {
      const fruits = this.stateService.fruits();
      const maxKg = Math.max(...fruits.map(f => f.freshStockKg || 0), 100);
      const totalKg = this.stateService.totalFreshStockKg() || 1;

      return fruits.map(f => {
        const freshKg = f.freshStockKg || 0;
        const estimatedPulpKg = Number((freshKg * (f.yieldRate || 0)).toFixed(1));
        const sharePct = Math.round((freshKg / totalKg) * 100);
        const barPct = Math.min(100, Math.round((freshKg / maxKg) * 100));
        const status: 'OPTIMO' | 'MEDIO' | 'BAJO' =
          freshKg >= 200 ? 'OPTIMO' : freshKg >= 120 ? 'MEDIO' : 'BAJO';

        return {
          id: f.id,
          name: f.name,
          emoji: f.emoji || '',
          color: f.color || '#16a34a',
          category: f.category,
          freshKg,
          yieldPct: Math.round((f.yieldRate || 0) * 100),
          estimatedPulpKg,
          sharePct,
          barPct,
          status
        };
      });
    } catch {
      return [];
    }
  });

  readonly preparedPulpsReport = computed<PreparedPulpsReport>(() => {
    try {
      const fruits = this.stateService.fruits();
      let totalUnits = 0;
      let totalRetailValue = 0;
      const byGrammage = { g140: 0, g250: 0, g500: 0, g1000: 0 };

      const items = fruits.map(f => {
        const g140 = f.stock.g140 || 0;
        const g250 = f.stock.g250 || 0;
        const g500 = f.stock.g500 || 0;
        const g1000 = f.stock.g1000 || 0;

        const units = g140 + g250 + g500 + g1000;
        const totalKg = Number(((g140 * 0.14) + (g250 * 0.25) + (g500 * 0.5) + (g1000 * 1.0)).toFixed(1));
        const retailValue =
          g140 * (f.prices?.g140 || 0) +
          g250 * (f.prices?.g250 || 0) +
          g500 * (f.prices?.g500 || 0) +
          g1000 * (f.prices?.g1000 || 0);

        totalUnits += units;
        totalRetailValue += retailValue;
        byGrammage.g140 += g140;
        byGrammage.g250 += g250;
        byGrammage.g500 += g500;
        byGrammage.g1000 += g1000;

        const hasLowAlert =
          g140 <= (f.minStock?.g140 || 0) ||
          g250 <= (f.minStock?.g250 || 0) ||
          g500 <= (f.minStock?.g500 || 0) ||
          g1000 <= (f.minStock?.g1000 || 0);

        return {
          id: f.id,
          name: f.name,
          emoji: f.emoji || '',
          color: f.color || '#16a34a',
          g140,
          g250,
          g500,
          g1000,
          low140: g140 <= (f.minStock?.g140 || 0),
          low250: g250 <= (f.minStock?.g250 || 0),
          low500: g500 <= (f.minStock?.g500 || 0),
          low1000: g1000 <= (f.minStock?.g1000 || 0),
          units,
          totalKg,
          retailValue,
          hasLowAlert
        };
      });

      return {
        totalUnits,
        totalRetailValue,
        byGrammage,
        items
      };
    } catch {
      return {
        totalUnits: 0,
        totalRetailValue: 0,
        byGrammage: { g140: 0, g250: 0, g500: 0, g1000: 0 },
        items: []
      };
    }
  });

  readonly lowStockItems = computed<LowStockAlertItem[]>(() => {
    try {
      const list: LowStockAlertItem[] = [];

      this.stateService.fruits().forEach(f => {
        (['g140', 'g250', 'g500', 'g1000'] as const).forEach(sz => {
          const curr = f.stock[sz] || 0;
          const min = f.minStock[sz] || 0;
          if (curr <= min) {
            let presLabel = 'Presentación de 140g';
            if (sz === 'g250') presLabel = 'Presentación de 250g (1/4 kg)';
            else if (sz === 'g500') presLabel = 'Presentación de 500g (1/2 kg)';
            else if (sz === 'g1000') presLabel = 'Presentación de 1000g (1 kg)';

            list.push({
              fruitName: f.name,
              emoji: f.emoji || '',
              color: f.color || '#10b981',
              presentation: presLabel,
              currentUnits: curr,
              minUnits: min
            });
          }
        });
      });

      return list.slice(0, 4);
    } catch {
      return [];
    }
  });

  /**
   * Initializes the dashboard component and listens for route focus query parameters.
   */
  constructor() {
    try {
      this.route.queryParams.subscribe(params => {
        if (params['focus'] === 'goals') {
          setTimeout(() => {
            const el = document.getElementById('sales-goals-section');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 150);
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Opens the modal to edit the monthly sales revenue target.
   */
  openTargetModal(): void {
    try {
      this.editTargetAmount.set(this.stateService.salesPerformance().monthTargetRevenue);
      this.showEditTargetModal.set(true);
    } catch {
      this.showEditTargetModal.set(false);
    }
  }

  /**
   * Saves the updated monthly sales revenue target to the state service.
   */
  saveTarget(): void {
    try {
      const now = new Date();
      this.stateService.upsertSalesTarget({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        targetRevenue: Number(this.editTargetAmount()) || 0
      });
      this.showEditTargetModal.set(false);
    } catch {
      this.showEditTargetModal.set(false);
    }
  }

  /**
   * Returns the localized name of the current month.
   */
  currentMonthName(): string {
    try {
      return new Date().toLocaleString('es-CO', { month: 'long' });
    } catch {
      return '';
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
