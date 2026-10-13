import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';

type ReportTab = 'sales' | 'losses' | 'inventory' | 'payroll' | 'expenses';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent {
  readonly stateService = inject(StateService);
  readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);

  readonly activeTab = signal<ReportTab>('sales');
  readonly selectedDateFilter = signal<'all' | 'today' | 'month'>('month');

  constructor() {
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'] as ReportTab;
      if (['sales', 'losses', 'inventory', 'payroll', 'expenses'].includes(tab)) {
        this.activeTab.set(tab);
      }
    });
  }

  // --- Sales Metrics Computed ---
  readonly filteredOrders = computed(() => {
    const orders = this.stateService.orders().filter(o => o.status !== 'CANCELLED');
    const filter = this.selectedDateFilter();
    const today = new Date().toISOString().substring(0, 10);
    const thisMonth = new Date().toISOString().substring(0, 7);

    if (filter === 'today') {
      return orders.filter(o => o.createdAt.startsWith(today));
    }
    if (filter === 'month') {
      return orders.filter(o => o.createdAt.startsWith(thisMonth));
    }
    return orders;
  });

  readonly totalSalesRevenue = computed(() => {
    return this.filteredOrders().reduce((sum, o) => sum + o.totalAmount, 0);
  });

  readonly totalUnitsSold = computed(() => {
    return this.filteredOrders().reduce((sum, o) => {
      const itemsCount = o.items.reduce((iSum, it) => iSum + it.quantity, 0);
      return sum + itemsCount;
    }, 0);
  });

  // --- Losses Metrics Computed ---
  readonly lossAuditList = computed(() => this.stateService.idealVsRealLossAudit());
  readonly totalLossMoney = computed(() => {
    return this.lossAuditList().reduce((sum, a) => sum + Math.max(0, -a.moneyDifference), 0);
  });
  readonly totalLossUnits = computed(() => {
    return this.lossAuditList().reduce((sum, a) => sum + Math.max(0, -a.unitsDifference), 0);
  });

  // --- Inventory Valuation Computed ---
  readonly inventoryValuation = computed(() => {
    let totalKg = 0;
    let estimatedValue = 0;
    const items = this.stateService.fruits().map(f => {
      const g140Kg = f.stock.g140 * 0.14;
      const g250Kg = f.stock.g250 * 0.25;
      const g500Kg = f.stock.g500 * 0.50;
      const g1000Kg = f.stock.g1000 * 1.0;
      const fruitTotalKg = g140Kg + g250Kg + g500Kg + g1000Kg;
      const fruitValue = (f.stock.g140 * (f.prices?.g140 || 2800)) +
                         (f.stock.g250 * (f.prices?.g250 || 4500)) +
                         (f.stock.g500 * (f.prices?.g500 || 8000)) +
                         (f.stock.g1000 * (f.prices?.g1000 || 14000));

      totalKg += fruitTotalKg;
      estimatedValue += fruitValue;

      return {
        fruitName: f.name,
        emoji: f.emoji,
        color: f.color,
        g140: f.stock.g140,
        g250: f.stock.g250,
        g500: f.stock.g500,
        g1000: f.stock.g1000,
        totalKg: fruitTotalKg,
        estimatedValueCOP: fruitValue
      };
    });

    return { totalKg, estimatedValue, items };
  });

  // --- Payroll Computed ---
  readonly settlementsList = computed(() => this.stateService.payrollSettlements());
  readonly totalPayrollDisbursed = computed(() => {
    return this.settlementsList().reduce((sum, s) => sum + s.netPayable, 0);
  });
  readonly totalStatutoryDeductions = computed(() => {
    return this.settlementsList().reduce((sum, s) => sum + s.healthDeduction + s.pensionDeduction, 0);
  });
  readonly totalDeliveryBonuses = computed(() => {
    return this.settlementsList().reduce((sum, s) => sum + s.deliveryBonuses, 0);
  });

  // --- Expenses Computed ---
  readonly expensesList = computed(() => this.stateService.expenses());
  readonly totalExpensesAmount = computed(() => {
    return this.expensesList().reduce((sum, e) => sum + e.amount, 0);
  });

  // Export to CSV Functionality
  exportCurrentReportCsv() {
    const tab = this.activeTab();
    const now = new Date().toISOString().substring(0, 10);

    if (tab === 'sales') {
      const headers = ['Nro Pedido', 'Fecha', 'Cliente', 'Teléfono', 'Método Pago', 'Estado', 'Total COP'];
      const rows = this.filteredOrders().map(o => [
        o.orderNumber,
        o.createdAt.substring(0, 10),
        `"${o.clientName.replace(/"/g, '""')}"`,
        o.clientPhone || 'N/A',
        o.paymentMethodName || 'General',
        o.status,
        o.totalAmount
      ]);
      this.downloadCsv(`reporte_ventas_${now}.csv`, headers, rows);
    } else if (tab === 'losses') {
      const headers = ['Fruta', 'Unidades Producidas', 'Unidades Facturadas', 'Diferencia Unds', 'Ingreso Ideal COP', 'Ingreso Real COP', 'Pérdida Dinero COP'];
      const rows = this.lossAuditList().map(a => [
        `"${a.fruitName || 'Fruta'}"`,
        a.unitsProduced,
        a.unitsBilled,
        a.unitsDifference,
        a.idealRevenue,
        a.realRevenue,
        a.moneyDifference
      ]);
      this.downloadCsv(`auditoria_mermas_${now}.csv`, headers, rows);
    } else if (tab === 'inventory') {
      const headers = ['Fruta', 'Unds 140g', 'Unds 250g', 'Unds 500g', 'Unds 1000g', 'Total Kilos', 'Valor Estimado COP'];
      const rows = this.inventoryValuation().items.map(i => [
        `"${i.fruitName}"`,
        i.g140,
        i.g250,
        i.g500,
        i.g1000,
        i.totalKg.toFixed(2),
        Math.round(i.estimatedValueCOP)
      ]);
      this.downloadCsv(`inventario_cava_${now}.csv`, headers, rows);
    } else if (tab === 'payroll') {
      const headers = ['Periodo ID', 'Empleado', 'Área', 'Días Lab.', 'Básico Ganado COP', 'Aux. Transp COP', 'Bonos Domicilios COP', 'Salud 4% COP', 'Pensión 4% COP', 'Neto a Pagar COP'];
      const rows = this.settlementsList().map(s => [
        s.periodId,
        `"${s.employeeName}"`,
        s.area,
        s.daysWorked,
        s.baseSalaryEarned,
        s.transportAllowanceEarned,
        s.deliveryBonuses,
        s.healthDeduction,
        s.pensionDeduction,
        s.netPayable
      ]);
      this.downloadCsv(`nomina_quincenal_${now}.csv`, headers, rows);
    } else if (tab === 'expenses') {
      const headers = ['Fecha', 'Categoría', 'Descripción', 'Comprobante', 'Monto COP'];
      const rows = this.expensesList().map(e => [
        e.createdAt.substring(0, 10),
        `"${e.categoryName}"`,
        `"${e.description.replace(/"/g, '""')}"`,
        e.receiptNumber || 'N/A',
        e.amount
      ]);
      this.downloadCsv(`gastos_caja_${now}.csv`, headers, rows);
    }

    this.notification.success('Reporte Exportado', `Archivo CSV descargado con éxito.`);
  }

  private downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  printReport() {
    window.print();
  }

  formatCOP(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  formatNum(value: number): string {
    return new Intl.NumberFormat('es-CO').format(value || 0);
  }
}
