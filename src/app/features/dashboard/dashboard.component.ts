import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { AuthService } from '../../core/services/auth.service';
import { VoiceOrdersService } from '../../core/services/voice-orders.service';
import { OrderDto } from '../../core/models/business.models';

/**
 * Identifier for interactive KPI detail cards on the operational dashboard.
 */
export type KpiCardType = 'billing' | 'pulpStock' | 'pulpsSoldToday' | 'freshFruit';

/**
 * Counts of orders grouped by operational status.
 */
export interface OrdersByStatusCounts {
  pending: number;
  picking: number;
  billed: number;
  dispatched: number;
  delivered: number;
}

/**
 * Daily billing statistics and matching order records.
 */
export interface TodayBillingStats {
  revenue: number;
  ordersCount: number;
  unitsSold: number;
  orders: OrderDto[];
}

/**
 * Summary item representing an order in the daily billing detail modal.
 */
export interface TodayOrderDetailItem {
  id: number;
  orderNumber: string;
  clientName: string;
  status: string;
  statusLabel: string;
  paymentMethod: string;
  totalUnits: number;
  totalKg: number;
  itemsCount: number;
  itemsSummary: string;
  totalAmount: number;
}

/**
 * Breakdown item for a fruit's sold pulps on the current day.
 */
export interface TodaySoldPulpItem {
  name: string;
  color: string;
  g140: number;
  g250: number;
  g500: number;
  g1000: number;
  units: number;
  totalKg: number;
  revenue: number;
}

/**
 * Aggregated summary of pulps sold today by grammage and fruit.
 */
export interface TodaySoldPulpsBreakdown {
  totalUnits: number;
  totalKg: number;
  byGrammage: { g140: number; g250: number; g500: number; g1000: number };
  items: TodaySoldPulpItem[];
}

/**
 * Summary of total pulps sold across active orders.
 */
export interface SoldPulpsSummary {
  totalUnits: number;
  totalKg: number;
  topFruitLabel: string;
}

/**
 * Top client summary for the current month.
 */
export interface TopClientSummary {
  name: string;
  total: number;
  orders: number;
}

/**
 * Fresh fruit inventory report item.
 */
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

/**
 * Prepared pulps inventory report item by fruit.
 */
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

/**
 * Aggregated report of prepared pulps in storage.
 */
export interface PreparedPulpsReport {
  totalUnits: number;
  totalRetailValue: number;
  byGrammage: { g140: number; g250: number; g500: number; g1000: number };
  items: PreparedPulpsReportItem[];
}

/**
 * Low stock alert item for warehouse attention.
 */
export interface LowStockAlertItem {
  fruitName: string;
  emoji: string;
  color: string;
  presentation: string;
  currentUnits: number;
  minUnits: number;
}

/**
 * Trend direction for KPI mini-sparkline charts.
 */
export type SparklineTrend = 'up' | 'flat' | 'down';

/**
 * SVG geometry and trend metadata for a single KPI mini-sparkline (`viewBox="0 0 68 34"`).
 */
export interface KpiSparklineData {
  trend: SparklineTrend;
  linePath: string;
  areaPath: string;
  endX: number;
  endY: number;
}

/**
 * Reactive map of mini-sparkline geometries for the 4 top KPI cards in the dashboard.
 */
export interface KpiSparklinesMap {
  billing: KpiSparklineData;
  pulpStock: KpiSparklineData;
  pulpsSoldToday: KpiSparklineData;
  freshFruit: KpiSparklineData;
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

  readonly timeFilter = signal<'today' | 'month'>('today');
  readonly showEditTargetModal = signal<boolean>(false);
  readonly editTargetAmount = signal<number>(0);
  readonly selectedKpiCard = signal<KpiCardType | null>(null);
  readonly isLoading = computed<boolean>(() => {
    try {
      return typeof this.stateService.isLoading === 'function' ? this.stateService.isLoading() : false;
    } catch {
      return false;
    }
  });

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
        unitsSold: units,
        orders: todayOrders
      };
    } catch {
      return { revenue: 0, ordersCount: 0, unitsSold: 0, orders: [] };
    }
  });

  readonly kpiSparklines = computed<KpiSparklinesMap>(() => {
    try {
      const todayStats = this.todayBillingStats();
      const validOrders = this.stateService.orders().filter(o => o.status !== 'CANCELLED');
      const dailyTotalsMap = new Map<string, { revenue: number; units: number }>();

      for (const order of validOrders) {
        const dateKey = (order.orderDate || order.createdAt || '').substring(0, 10);
        if (!dateKey) {
          continue;
        }
        const current = dailyTotalsMap.get(dateKey) ?? { revenue: 0, units: 0 };
        const orderUnits = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        current.revenue += order.totalAmount || 0;
        current.units += orderUnits;
        dailyTotalsMap.set(dateKey, current);
      }

      const sortedDates = Array.from(dailyTotalsMap.keys()).sort();
      const previousDates = sortedDates.length > 1 ? sortedDates.slice(0, -1) : [];

      const avgPrevRevenue =
        previousDates.length > 0
          ? previousDates.reduce((sum, d) => sum + (dailyTotalsMap.get(d)?.revenue ?? 0), 0) /
            previousDates.length
          : (this.stateService.salesPerformance()?.monthTargetRevenue ?? 0) / 26;

      let billingTrend: SparklineTrend = 'down';
      if (todayStats.revenue <= 0) {
        billingTrend = 'down';
      } else if (avgPrevRevenue > 0) {
        if (todayStats.revenue < avgPrevRevenue * 0.85) {
          billingTrend = 'down';
        } else if (todayStats.revenue <= avgPrevRevenue * 1.15) {
          billingTrend = 'flat';
        } else {
          billingTrend = 'up';
        }
      } else {
        billingTrend = 'up';
      }

      const totalStockKg = this.stateService.totalStockKg();
      const fruits = this.stateService.fruits();
      const minStockKg = fruits.reduce(
        (sum, f) =>
          sum +
          ((f.minStock?.g140 ?? 0) * 0.14 +
            (f.minStock?.g250 ?? 0) * 0.25 +
            (f.minStock?.g500 ?? 0) * 0.5 +
            (f.minStock?.g1000 ?? 0) * 1.0),
        0
      );

      let pulpStockTrend: SparklineTrend = 'down';
      if (totalStockKg <= 0) {
        pulpStockTrend = 'down';
      } else if (minStockKg > 0) {
        if (totalStockKg < minStockKg) {
          pulpStockTrend = 'down';
        } else if (totalStockKg < minStockKg * 1.5) {
          pulpStockTrend = 'flat';
        } else {
          pulpStockTrend = 'up';
        }
      } else if (totalStockKg < 25) {
        pulpStockTrend = 'flat';
      } else {
        pulpStockTrend = 'up';
      }

      const avgPrevUnits =
        previousDates.length > 0
          ? previousDates.reduce((sum, d) => sum + (dailyTotalsMap.get(d)?.units ?? 0), 0) /
            previousDates.length
          : 0;

      let pulpsSoldTrend: SparklineTrend = 'down';
      if (todayStats.unitsSold <= 0) {
        pulpsSoldTrend = 'down';
      } else if (avgPrevUnits > 0) {
        if (todayStats.unitsSold < avgPrevUnits * 0.85) {
          pulpsSoldTrend = 'down';
        } else if (todayStats.unitsSold <= avgPrevUnits * 1.15) {
          pulpsSoldTrend = 'flat';
        } else {
          pulpsSoldTrend = 'up';
        }
      } else if (todayStats.unitsSold < 8) {
        pulpsSoldTrend = 'flat';
      } else {
        pulpsSoldTrend = 'up';
      }

      const totalFreshKg = this.stateService.totalFreshStockKg();
      const activeFruitsCount = Math.max(fruits.length, 1);
      const avgFreshPerFruit = totalFreshKg / activeFruitsCount;

      let freshFruitTrend: SparklineTrend = 'down';
      if (totalFreshKg <= 0 || avgFreshPerFruit < 120) {
        freshFruitTrend = 'down';
      } else if (avgFreshPerFruit < 200) {
        freshFruitTrend = 'flat';
      } else {
        freshFruitTrend = 'up';
      }

      return {
        billing: this.buildSparklineGeometry(billingTrend),
        pulpStock: this.buildSparklineGeometry(pulpStockTrend),
        pulpsSoldToday: this.buildSparklineGeometry(pulpsSoldTrend),
        freshFruit: this.buildSparklineGeometry(freshFruitTrend)
      };
    } catch {
      const fallbackDown = this.buildSparklineGeometry('down');
      return {
        billing: fallbackDown,
        pulpStock: fallbackDown,
        pulpsSoldToday: fallbackDown,
        freshFruit: fallbackDown
      };
    }
  });

  readonly todayOrdersList = computed<TodayOrderDetailItem[]>(() => {
    try {
      const orders = this.todayBillingStats().orders;
      const statusLabels: Record<string, string> = {
        PENDING: 'Pendiente',
        PICKING: 'En Alistamiento',
        BILLED: 'Facturado',
        DISPATCHED: 'En Ruta',
        DELIVERED: 'Entregado',
        CANCELLED: 'Cancelado'
      };

      return orders.map(o => {
        const totalUnits = o.items.reduce((sum, i) => sum + (i.quantity || 0), 0);
        const totalKg = Number(
          o.items.reduce((sum, i) => sum + ((i.quantity || 0) * (i.grammage || 0)) / 1000, 0).toFixed(1)
        );
        return {
          id: o.orderId,
          orderNumber: o.orderNumber || '',
          clientName: o.clientName || '',
          status: o.status,
          statusLabel: statusLabels[o.status] || o.status,
          paymentMethod: o.paymentMethodName || '',
          totalUnits,
          totalKg,
          itemsCount: o.items.length,
          itemsSummary: o.items.map(i => `${i.quantity}x ${i.fruitName} (${i.grammage}g)`).join(', '),
          totalAmount: o.totalAmount || 0
        };
      });
    } catch {
      return [];
    }
  });

  readonly todaySoldPulpsBreakdown = computed<TodaySoldPulpsBreakdown>(() => {
    try {
      const orders = this.todayBillingStats().orders;
      const fruitsConfig = this.stateService.fruits();
      const byGrammage = { g140: 0, g250: 0, g500: 0, g1000: 0 };
      let totalUnits = 0;
      let totalKg = 0;

      const fruitMap = new Map<string, TodaySoldPulpItem>();

      orders.forEach(order => {
        order.items.forEach(item => {
          const qty = item.quantity || 0;
          const gram = item.grammage || 0;
          const price = item.unitPrice || 0;
          const fruitName = item.fruitName || '';
          const fruitMeta = fruitsConfig.find(f => f.name.toLowerCase() === fruitName.toLowerCase());

          totalUnits += qty;
          totalKg += (qty * gram) / 1000;

          if (gram === 140) byGrammage.g140 += qty;
          else if (gram === 250) byGrammage.g250 += qty;
          else if (gram === 500) byGrammage.g500 += qty;
          else if (gram === 1000) byGrammage.g1000 += qty;

          const existing: TodaySoldPulpItem = fruitMap.get(fruitName) || {
            name: fruitName,
            color: fruitMeta?.color || '#1e5e3a',
            g140: 0,
            g250: 0,
            g500: 0,
            g1000: 0,
            units: 0,
            totalKg: 0,
            revenue: 0
          };

          if (gram === 140) existing.g140 += qty;
          else if (gram === 250) existing.g250 += qty;
          else if (gram === 500) existing.g500 += qty;
          else if (gram === 1000) existing.g1000 += qty;

          existing.units += qty;
          existing.totalKg = Number((existing.totalKg + (qty * gram) / 1000).toFixed(1));
          existing.revenue += qty * price;
          fruitMap.set(fruitName, existing);
        });
      });

      const items = Array.from(fruitMap.values()).sort((a, b) => b.units - a.units);

      return {
        totalUnits,
        totalKg: Number(totalKg.toFixed(1)),
        byGrammage,
        items
      };
    } catch {
      return {
        totalUnits: 0,
        totalKg: 0,
        byGrammage: { g140: 0, g250: 0, g500: 0, g1000: 0 },
        items: []
      };
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
              color: f.color || '#1e5e3a',
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
      this.stateService.refreshAll?.();
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
   * Opens the detail modal for the selected quick KPI card.
   */
  openKpiDetail(card: KpiCardType): void {
    try {
      this.selectedKpiCard.set(card);
    } catch {
      this.selectedKpiCard.set(null);
    }
  }

  /**
   * Closes the active quick KPI card detail modal.
   */
  closeKpiDetail(): void {
    try {
      this.selectedKpiCard.set(null);
    } catch {
      return;
    }
  }

  /**
   * Computes the integer monthly sales goal compliance percentage clamped between 0 and 100.
   */
  readonly monthlyGoalPercentage = computed<number>(() => {
    try {
      const rawPct = Math.round(Number(this.stateService.salesPerformance().compliancePercentage) || 0);
      return Math.min(100, Math.max(0, rawPct));
    } catch {
      return 0;
    }
  });

  /**
   * Resolves the visual color tier ('red', 'orange', or 'green') based on the monthly goal percentage.
   */
  readonly monthlyGoalTier = computed<'red' | 'orange' | 'green'>(() => {
    try {
      const pct = this.monthlyGoalPercentage();
      if (pct >= 80) {
        return 'green';
      }
      if (pct >= 40) {
        return 'orange';
      }
      return 'red';
    } catch {
      return 'red';
    }
  });

  /**
   * Returns the CSS modifier class for the monthly sales card according to the goal tier.
   */
  readonly monthlySalesCardClass = computed<string>(() => {
    try {
      const tier = this.monthlyGoalTier();
      if (tier === 'green') {
        return 'dark-green-card';
      }
      if (tier === 'orange') {
        return 'dark-orange-card';
      }
      return 'dark-red-card';
    } catch {
      return 'dark-red-card';
    }
  });

  /**
   * Returns the localized sales pace label matching the current monthly goal percentage range.
   */
  readonly monthlySalesPaceLabel = computed<string>(() => {
    try {
      const tier = this.monthlyGoalTier();
      if (tier === 'green') {
        return 'Ritmo de venta óptimo';
      }
      if (tier === 'orange') {
        return 'Ritmo de venta medio';
      }
      return 'Ritmo de venta bajo';
    } catch {
      return 'Ritmo de venta bajo';
    }
  });

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
   * Parses and formats COP currency input while typing the monthly sales target.
   */
  onTargetAmountInput(event: Event): void {
    try {
      const input = event.target as HTMLInputElement;
      const digitsOnly = (input.value || '').replace(/\D/g, '');
      const numericVal = digitsOnly ? parseInt(digitsOnly, 10) : 0;
      this.editTargetAmount.set(numericVal);
      input.value = numericVal > 0 ? this.formatCOP(numericVal) : '';
    } catch {
      return;
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

  /**
   * Builds the SVG Bézier curve and area path for a KPI sparkline (`viewBox="0 0 68 34"`)
   * based on whether the statistic is rising (`'up'`), steady/regular (`'flat'`), or falling/zero (`'down'`).
   */
  private buildSparklineGeometry(trend: SparklineTrend): KpiSparklineData {
    try {
      const endX = 63;
      if (trend === 'up') {
        const linePath = 'M2 25 C 14 23, 24 19, 36 14 C 46 10, 54 11, 63 7';
        return {
          trend: 'up',
          linePath,
          areaPath: `${linePath} L 63 32 L 2 32 Z`,
          endX,
          endY: 7
        };
      }
      if (trend === 'flat') {
        const linePath = 'M2 18 C 14 16, 26 19, 38 17 C 48 15, 55 18, 63 17';
        return {
          trend: 'flat',
          linePath,
          areaPath: `${linePath} L 63 32 L 2 32 Z`,
          endX,
          endY: 17
        };
      }
      const linePath = 'M2 11 C 14 14, 26 18, 38 22 C 48 25, 55 26, 63 27';
      return {
        trend: 'down',
        linePath,
        areaPath: `${linePath} L 63 32 L 2 32 Z`,
        endX,
        endY: 27
      };
    } catch {
      return {
        trend: 'down',
        linePath: 'M2 11 C 14 14, 26 18, 38 22 C 48 25, 55 26, 63 27',
        areaPath: 'M2 11 C 14 14, 26 18, 38 22 C 48 25, 55 26, 63 27 L 63 32 L 2 32 Z',
        endX: 63,
        endY: 27
      };
    }
  }
}
