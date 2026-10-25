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

  // Siempre carga los datos de hoy por defecto
  readonly timeFilter = signal<'today' | 'month'>('today');

  // Modal states
  readonly showEditTargetModal = signal(false);
  readonly editTargetAmount = signal<number>(18000000);
  readonly selectedKpiCard = signal<'billing' | 'pulpStock' | 'pulpsSoldToday' | 'freshFruit' | null>(null);

  openKpiDetail(card: 'billing' | 'pulpStock' | 'pulpsSoldToday' | 'freshFruit') {
    this.selectedKpiCard.set(card);
  }

  closeKpiDetail() {
    this.selectedKpiCard.set(null);
  }

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

  onTargetAmountInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digitsOnly = (input.value || '').replace(/\D/g, '');
    const numericVal = digitsOnly ? parseInt(digitsOnly, 10) : 0;
    this.editTargetAmount.set(numericVal);
    input.value = numericVal > 0 ? this.formatCOP(numericVal) : '';
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

  // Facturación hoy (real orders from today, or latest active order day in demo)
  readonly todayBillingStats = computed(() => {
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
  });

  // Detailed orders list for "Facturación hoy" modal
  readonly todayOrdersList = computed(() => {
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
        o.items.reduce((sum, i) => sum + ((i.quantity || 0) * (i.grammage || 250)) / 1000, 0).toFixed(1)
      );
      return {
        id: o.orderId,
        orderNumber: o.orderNumber || `PED-${o.orderId}`,
        clientName: o.clientName || 'Cliente General',
        status: o.status,
        statusLabel: statusLabels[o.status] || o.status,
        paymentMethod: o.paymentMethodName || 'Efectivo',
        totalUnits,
        totalKg,
        itemsCount: o.items.length,
        itemsSummary: o.items.map(i => `${i.quantity}x ${i.fruitName} (${i.grammage}g)`).join(', '),
        totalAmount: o.totalAmount || 0
      };
    });
  });

  // Detailed breakdown of pulps sold today for "Pulpas vendidas hoy" modal
  readonly todaySoldPulpsBreakdown = computed(() => {
    const orders = this.todayBillingStats().orders;
    const fruitsConfig = this.stateService.fruits();
    const byGrammage = { g140: 0, g250: 0, g500: 0, g1000: 0 };
    let totalUnits = 0;
    let totalKg = 0;

    const fruitMap = new Map<
      string,
      {
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
    >();

    orders.forEach(order => {
      order.items.forEach(item => {
        const qty = item.quantity || 0;
        const gram = item.grammage || 250;
        const price = item.unitPrice || 0;
        const fruitName = item.fruitName || 'Otra';
        const fruitMeta = fruitsConfig.find(f => f.name.toLowerCase() === fruitName.toLowerCase());

        totalUnits += qty;
        totalKg += (qty * gram) / 1000;

        if (gram === 140) byGrammage.g140 += qty;
        else if (gram === 250) byGrammage.g250 += qty;
        else if (gram === 500) byGrammage.g500 += qty;
        else if (gram === 1000) byGrammage.g1000 += qty;

        const existing = fruitMap.get(fruitName) || {
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
  });

  // Pulpas vendidas summary
  readonly soldPulpsSummary = computed(() => {
    const validOrders = this.stateService.orders().filter(o => o.status !== 'CANCELLED');
    let totalUnits = 0;
    let totalKg = 0;
    const byFruit = new Map<string, number>();

    validOrders.forEach(order => {
      order.items.forEach(item => {
        const qty = item.quantity || 0;
        const gram = item.grammage || 250;
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
  });

  // Top client of the current month (by total purchase amount)
  readonly topClientOfMonth = computed(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    const allValidOrders = this.stateService.orders().filter(o => o.status !== 'CANCELLED');
    let validOrders = allValidOrders.filter(o => (o.orderDate || o.createdAt || '').startsWith(currentMonthStr));
    if (validOrders.length === 0) {
      validOrders = allValidOrders;
    }

    const byClient = new Map<string, { name: string; total: number; orders: number }>();
    validOrders.forEach(order => {
      const name = order.clientName || 'Cliente sin nombre';
      const existing = byClient.get(name) || { name, total: 0, orders: 0 };
      existing.total += (order.totalAmount || 0);
      existing.orders += 1;
      byClient.set(name, existing);
    });

    let topClient = { name: 'Sin clientes este mes', total: 0, orders: 0 };
    byClient.forEach(client => {
      if (client.total > topClient.total) {
        topClient = client;
      }
    });

    return topClient;
  });

  // Current month name in Spanish
  currentMonthName(): string {
    return new Date().toLocaleString('es-CO', { month: 'long' });
  }

  // Total prepared pulp units in bodega
  readonly totalPreparedPulpUnits = computed(() => {
    return this.stateService.fruits().reduce(
      (sum, f) => sum + (f.stock.g140 || 0) + (f.stock.g250 || 0) + (f.stock.g500 || 0) + (f.stock.g1000 || 0),
      0
    );
  });

  // Estimated pulp kg producible from current fresh fruit inventory
  readonly estimatedPulpFromFreshFruitKg = computed(() => {
    const total = this.stateService.fruits().reduce(
      (sum, f) => sum + (f.freshStockKg || 0) * (f.yieldRate || 0.6),
      0
    );
    return Number(total.toFixed(1));
  });

  // Report 1: Inventario de Fruta Fresca
  readonly fruitInventoryReport = computed(() => {
    const fruits = this.stateService.fruits();
    const maxKg = Math.max(...fruits.map(f => f.freshStockKg || 0), 100);
    const totalKg = this.stateService.totalFreshStockKg() || 1;

    return fruits.map(f => {
      const freshKg = f.freshStockKg || 0;
      const estimatedPulpKg = Number((freshKg * (f.yieldRate || 0.6)).toFixed(1));
      const sharePct = Math.round((freshKg / totalKg) * 100);
      const barPct = Math.min(100, Math.round((freshKg / maxKg) * 100));
      const status: 'OPTIMO' | 'MEDIO' | 'BAJO' =
        freshKg >= 200 ? 'OPTIMO' : freshKg >= 120 ? 'MEDIO' : 'BAJO';

      return {
        id: f.id,
        name: f.name,
        emoji: f.emoji || '🍎',
        color: f.color || '#16a34a',
        category: f.category,
        freshKg,
        yieldPct: Math.round((f.yieldRate || 0.6) * 100),
        estimatedPulpKg,
        sharePct,
        barPct,
        status
      };
    });
  });

  // Report 2: Informe de Pulpas Preparadas en Bodega
  readonly preparedPulpsReport = computed(() => {
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
        emoji: f.emoji || '📦',
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
  });

  // Low stock items for "Atención en bodega"
  readonly lowStockItems = computed(() => {
    const list: {
      fruitName: string;
      emoji: string;
      color: string;
      presentation: string;
      currentUnits: number;
      minUnits: number;
    }[] = [];

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
            emoji: f.emoji || '🟢',
            color: f.color || '#1e5e3a',
            presentation: presLabel,
            currentUnits: curr,
            minUnits: min
          });
        }
      });
    });

    return list.slice(0, 4);
  });

  formatCOP(val: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val || 0);
  }
}
