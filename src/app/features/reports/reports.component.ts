import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  EmployeeDto,
  ExpenseDto,
  FruitConfig,
  IdealVsRealAuditDto,
  OrderDto,
  OrderItemDto,
  OrderStatus,
  PayrollSettlementDto
} from '../../core/models/business.models';
import { CopCurrencyInputDirective } from '../../shared/directives/cop-currency-input.directive';

/**
 * Available report tab identifiers.
 */
export type ReportTab = 'sales' | 'loss' | 'stock' | 'expenses' | 'payroll';

/**
 * Available date filter modes for reports.
 */
export type ReportDateFilter = 'today' | 'yesterday' | 'month' | 'year' | 'range';

/**
 * Represents a selectable month option in the date filter bar.
 */
export interface MonthOption {
  value: string;
  label: string;
  shortLabel: string;
}

/**
 * Represents an editable line item in the report order edit modal.
 */
export interface ReportEditOrderItem {
  fruitName: string;
  grammage: 140 | 250 | 500 | 1000;
  quantity: number;
  unitPrice: number;
}

/**
 * Executive reports component for sales, ideal vs. real yield loss audit, inventory valuation, expenses, and payroll.
 */
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, CopCurrencyInputDirective],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent {
  readonly stateService = inject(StateService);
  readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);

  readonly activeTab = signal<ReportTab>('sales');

  readonly monthsList: MonthOption[] = [
    { value: '01', label: 'Enero', shortLabel: 'Ene' },
    { value: '02', label: 'Febrero', shortLabel: 'Feb' },
    { value: '03', label: 'Marzo', shortLabel: 'Mar' },
    { value: '04', label: 'Abril', shortLabel: 'Abr' },
    { value: '05', label: 'Mayo', shortLabel: 'May' },
    { value: '06', label: 'Junio', shortLabel: 'Jun' },
    { value: '07', label: 'Julio', shortLabel: 'Jul' },
    { value: '08', label: 'Agosto', shortLabel: 'Ago' },
    { value: '09', label: 'Septiembre', shortLabel: 'Sep' },
    { value: '10', label: 'Octubre', shortLabel: 'Oct' },
    { value: '11', label: 'Noviembre', shortLabel: 'Nov' },
    { value: '12', label: 'Diciembre', shortLabel: 'Dic' }
  ];

  readonly selectedDateFilter = signal<ReportDateFilter>('month');
  readonly selectedMonthNumber = signal<string>(
    String(new Date().getMonth() + 1).padStart(2, '0')
  );
  readonly selectedYear = signal<string>(String(new Date().getFullYear()));
  readonly rangeStartDate = signal<string>(
    new Date(Date.now() - 7 * 86400000).toISOString().substring(0, 10)
  );
  readonly rangeEndDate = signal<string>(new Date().toISOString().substring(0, 10));

  readonly availableYears = computed<string[]>(() => {
    try {
      const currentYear = new Date().getFullYear();
      const yearsSet = new Set<string>([
        String(currentYear),
        String(currentYear - 1),
        String(currentYear - 2)
      ]);
      this.stateService.orders().forEach((o: OrderDto) => {
        const y = (o.createdAt || o.orderDate || '').substring(0, 4);
        if (/^\d{4}$/.test(y)) {
          yearsSet.add(y);
        }
      });
      return Array.from(yearsSet).sort((a: string, b: string) => Number(b) - Number(a));
    } catch (error: unknown) {
      console.error('Error computing available years:', error);
      return [];
    }
  });

  readonly todayFormattedDisplay = computed<string>(() => {
    try {
      const todayStr = new Date().toISOString().substring(0, 10);
      return this.formatHumanDateES(todayStr);
    } catch (error: unknown) {
      console.error('Error computing today formatted display:', error);
      return '';
    }
  });

  readonly yesterdayFormattedDisplay = computed<string>(() => {
    try {
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
      return this.formatHumanDateES(yesterdayStr);
    } catch (error: unknown) {
      console.error('Error computing yesterday formatted display:', error);
      return '';
    }
  });

  readonly selectedMonthLabel = computed<string>(() => {
    try {
      const found = this.monthsList.find((m: MonthOption) => m.value === this.selectedMonthNumber());
      return found ? found.label : '';
    } catch (error: unknown) {
      console.error('Error computing selected month label:', error);
      return '';
    }
  });

  readonly openActionOrderId = signal<number | null>(null);

  readonly ordersPageSize = 10;
  readonly ordersCurrentPage = signal<number>(1);

  readonly showInvoiceModal = signal<boolean>(false);
  readonly selectedOrderForInvoice = signal<OrderDto | null>(null);
  readonly invoiceTaxRate = signal<number>(19);
  readonly itemDiscounts = signal<Record<string, number>>({});

  readonly showItemsListModal = signal<boolean>(false);
  readonly selectedOrderForItems = signal<OrderDto | null>(null);

  readonly showEditOrderModal = signal<boolean>(false);
  readonly editingOrderId = signal<number | null>(null);
  readonly editingOrderNumber = signal<string>('');
  readonly editClientName = signal<string>('');
  readonly editPhone = signal<string>('');
  readonly editAddress = signal<string>('');
  readonly editPaymentMethod = signal<string>('');
  readonly activePaymentMethods = computed(() => {
    try {
      return this.stateService.activePaymentMethods();
    } catch (error: unknown) {
      console.error('Error computing active payment methods:', error);
      return [];
    }
  });
  readonly editCourierName = signal<string>('');
  readonly editStatus = signal<OrderStatus>('PENDING');
  readonly editNotes = signal<string>('');
  readonly editItems = signal<ReportEditOrderItem[]>([]);

  readonly editOrderTotal = computed<number>(() => {
    try {
      return this.editItems().reduce(
        (sum: number, item: ReportEditOrderItem) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        0
      );
    } catch (error: unknown) {
      console.error('Error computing edit order total:', error);
      return 0;
    }
  });

  readonly filteredOrders = computed<OrderDto[]>(() => {
    try {
      const orders = this.stateService.orders().filter((o: OrderDto) => o.status !== 'CANCELLED');
      const filter = this.selectedDateFilter();
      const todayStr = new Date().toISOString().substring(0, 10);
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

      if (filter === 'today') {
        return orders.filter((o: OrderDto) => (o.createdAt || o.orderDate || '').substring(0, 10) === todayStr);
      }

      if (filter === 'yesterday') {
        return orders.filter((o: OrderDto) => (o.createdAt || o.orderDate || '').substring(0, 10) === yesterdayStr);
      }

      if (filter === 'month') {
        const targetMonth = `${this.selectedYear()}-${this.selectedMonthNumber()}`;
        return orders.filter((o: OrderDto) => (o.createdAt || o.orderDate || '').substring(0, 7) === targetMonth);
      }

      if (filter === 'year') {
        const targetYear = this.selectedYear() || todayStr.substring(0, 4);
        return orders.filter((o: OrderDto) => (o.createdAt || o.orderDate || '').substring(0, 4) === targetYear);
      }

      if (filter === 'range') {
        const start = this.rangeStartDate() || '0000-01-01';
        const end = this.rangeEndDate() || '9999-12-31';
        const [minDate, maxDate] = start <= end ? [start, end] : [end, start];
        return orders.filter((o: OrderDto) => {
          const d = (o.createdAt || o.orderDate || '').substring(0, 10);
          return d >= minDate && d <= maxDate;
        });
      }

      this.ordersCurrentPage.set(1);
      return orders;
    } catch (error: unknown) {
      console.error('Error computing filtered orders:', error);
      return [];
    }
  });

  readonly totalOrdersPages = computed<number>(() => {
    try {
      return Math.ceil(this.filteredOrders().length / this.ordersPageSize) || 1;
    } catch (error: unknown) {
      console.error('Error computing total orders pages:', error);
      return 1;
    }
  });

  readonly paginatedOrders = computed<OrderDto[]>(() => {
    try {
      const all = this.filteredOrders();
      const page = this.ordersCurrentPage();
      const start = (page - 1) * this.ordersPageSize;
      return all.slice(start, start + this.ordersPageSize);
    } catch (error: unknown) {
      console.error('Error computing paginated orders:', error);
      return [];
    }
  });

  readonly activeFilterSummaryLabel = computed<string>(() => {
    try {
      const filter = this.selectedDateFilter();
      if (filter === 'today') return `Hoy (${this.todayFormattedDisplay()})`;
      if (filter === 'yesterday') return `Ayer (${this.yesterdayFormattedDisplay()})`;
      if (filter === 'month') return `${this.selectedMonthLabel()} ${this.selectedYear()}`;
      if (filter === 'year') return `Año ${this.selectedYear()}`;
      if (filter === 'range') {
        return `${this.formatHumanDateES(this.rangeStartDate())} – ${this.formatHumanDateES(this.rangeEndDate())}`;
      }
      return 'Período';
    } catch (error: unknown) {
      console.error('Error computing active filter summary label:', error);
      return 'Período';
    }
  });

  readonly totalSalesRevenue = computed<number>(() => {
    try {
      return this.filteredOrders().reduce((sum: number, o: OrderDto) => sum + o.totalAmount, 0);
    } catch (error: unknown) {
      console.error('Error computing total sales revenue:', error);
      return 0;
    }
  });

  readonly filteredExpenses = computed<ExpenseDto[]>(() => {
    try {
      const expenses = this.stateService.expenses();
      const filter = this.selectedDateFilter();
      const todayStr = new Date().toISOString().substring(0, 10);
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

      if (filter === 'today') {
        return expenses.filter((e: ExpenseDto) => (e.expenseDate || e.createdAt || '').substring(0, 10) === todayStr);
      }
      if (filter === 'yesterday') {
        return expenses.filter((e: ExpenseDto) => (e.expenseDate || e.createdAt || '').substring(0, 10) === yesterdayStr);
      }
      if (filter === 'month') {
        const targetMonth = `${this.selectedYear()}-${this.selectedMonthNumber()}`;
        return expenses.filter((e: ExpenseDto) => (e.expenseDate || e.createdAt || '').substring(0, 7) === targetMonth);
      }
      if (filter === 'year') {
        const targetYear = this.selectedYear() || todayStr.substring(0, 4);
        return expenses.filter((e: ExpenseDto) => (e.expenseDate || e.createdAt || '').substring(0, 4) === targetYear);
      }
      if (filter === 'range') {
        const start = this.rangeStartDate() || '0000-01-01';
        const end = this.rangeEndDate() || '9999-12-31';
        const [minDate, maxDate] = start <= end ? [start, end] : [end, start];
        return expenses.filter((e: ExpenseDto) => {
          const d = (e.expenseDate || e.createdAt || '').substring(0, 10);
          return d >= minDate && d <= maxDate;
        });
      }
      return expenses;
    } catch (error: unknown) {
      console.error('Error computing filtered expenses:', error);
      return [];
    }
  });

  readonly totalExpensesAmount = computed<number>(() => {
    try {
      return this.filteredExpenses().reduce((sum: number, e: ExpenseDto) => sum + e.amount, 0);
    } catch (error: unknown) {
      console.error('Error computing total expenses amount:', error);
      return 0;
    }
  });

  readonly filteredGrossProfit = computed<number>(() => {
    try {
      const rev = this.totalSalesRevenue();
      const expenses = this.totalExpensesAmount();
      return Math.max(0, Math.round(rev - expenses));
    } catch (error: unknown) {
      console.error('Error computing filtered gross profit:', error);
      return 0;
    }
  });

  readonly filteredGrossMarginPct = computed<number>(() => {
    try {
      const rev = this.totalSalesRevenue();
      if (rev <= 0) return 0;
      return Number(((this.filteredGrossProfit() / rev) * 100).toFixed(1));
    } catch (error: unknown) {
      console.error('Error computing filtered gross margin pct:', error);
      return 0;
    }
  });

  readonly filteredCompliancePct = computed<number>(() => {
    try {
      const target = this.stateService.salesPerformance().monthTargetRevenue || 0;
      if (target <= 0) return 0;
      return Number(((this.totalSalesRevenue() / target) * 100).toFixed(1));
    } catch (error: unknown) {
      console.error('Error computing filtered compliance pct:', error);
      return 0;
    }
  });

  readonly totalUnitsSold = computed<number>(() => {
    try {
      return this.filteredOrders().reduce((sum: number, o: OrderDto) => {
        const itemsCount = o.items.reduce((iSum: number, it: OrderItemDto) => iSum + it.quantity, 0);
        return sum + itemsCount;
      }, 0);
    } catch (error: unknown) {
      console.error('Error computing total units sold:', error);
      return 0;
    }
  });

  readonly averageTicket = computed<number>(() => {
    try {
      const count = this.filteredOrders().length;
      return count > 0 ? Math.round(this.totalSalesRevenue() / count) : 0;
    } catch (error: unknown) {
      console.error('Error computing average ticket:', error);
      return 0;
    }
  });

  readonly idealVsRealAudit = computed<IdealVsRealAuditDto[]>(() => {
    try {
      return this.stateService.idealVsRealLossAudit();
    } catch (error: unknown) {
      console.error('Error computing ideal vs real audit:', error);
      return [];
    }
  });

  readonly lossTotalPulpKg = computed<number>(() => {
    try {
      return this.idealVsRealAudit().reduce((sum: number, r: IdealVsRealAuditDto) => sum + (r.totalPulpKgProduced || 0), 0);
    } catch (error: unknown) {
      console.error('Error computing loss total pulp kg:', error);
      return 0;
    }
  });

  readonly lossTotalIdealRevenue = computed<number>(() => {
    try {
      return this.idealVsRealAudit().reduce((sum: number, r: IdealVsRealAuditDto) => sum + (r.idealRevenue || 0), 0);
    } catch (error: unknown) {
      console.error('Error computing loss total ideal revenue:', error);
      return 0;
    }
  });

  readonly lossTotalRealRevenue = computed<number>(() => {
    try {
      return this.idealVsRealAudit().reduce((sum: number, r: IdealVsRealAuditDto) => sum + (r.realRevenue || 0), 0);
    } catch (error: unknown) {
      console.error('Error computing loss total real revenue:', error);
      return 0;
    }
  });

  readonly lossTotalGapRevenue = computed<number>(() => {
    try {
      return this.lossTotalIdealRevenue() - this.lossTotalRealRevenue();
    } catch (error: unknown) {
      console.error('Error computing loss total gap revenue:', error);
      return 0;
    }
  });

  readonly lossGlobalPercentage = computed<number>(() => {
    try {
      const ideal = this.lossTotalIdealRevenue();
      if (ideal <= 0) return 0;
      return Number(((this.lossTotalGapRevenue() / ideal) * 100).toFixed(1));
    } catch (error: unknown) {
      console.error('Error computing loss global percentage:', error);
      return 0;
    }
  });

  readonly cavaTotalStockKg = computed<number>(() => {
    try {
      return this.stateService.totalStockKg();
    } catch (error: unknown) {
      console.error('Error computing cava total stock kg:', error);
      return 0;
    }
  });

  readonly cavaFreshStockKg = computed<number>(() => {
    try {
      return this.stateService.totalFreshStockKg();
    } catch (error: unknown) {
      console.error('Error computing cava fresh stock kg:', error);
      return 0;
    }
  });

  readonly cavaCommercialValue = computed<number>(() => {
    try {
      return this.stateService.fruits().reduce((sum: number, f: FruitConfig) => {
        return sum + this.getFruitCommercialValue(f);
      }, 0);
    } catch (error: unknown) {
      console.error('Error computing cava commercial value:', error);
      return 0;
    }
  });

  readonly cavaEstimatedCost = computed<number>(() => {
    try {
      return Math.round(
        this.stateService.fruits().reduce((sum: number, f: FruitConfig) => {
          const totalKg = this.getFruitTotalPulpKg(f) + (f.freshStockKg || 0);
          return sum + totalKg * (f.costPerKg || 0);
        }, 0)
      );
    } catch (error: unknown) {
      console.error('Error computing cava estimated cost:', error);
      return 0;
    }
  });

  readonly cavaLowStockCount = computed<number>(() => {
    try {
      return this.stateService.lowStockFruitsCount();
    } catch (error: unknown) {
      console.error('Error computing cava low stock count:', error);
      return 0;
    }
  });

  readonly logisticsExpensesAmount = computed<number>(() => {
    try {
      return this.filteredExpenses()
        .filter(
          (e: ExpenseDto) =>
            (e.categoryName || '').toLowerCase().includes('combustible') ||
            (e.categoryName || '').toLowerCase().includes('logística')
        )
        .reduce((sum: number, e: ExpenseDto) => sum + e.amount, 0);
    } catch (error: unknown) {
      console.error('Error computing logistics expenses amount:', error);
      return 0;
    }
  });

  readonly packagingExpensesAmount = computed<number>(() => {
    try {
      return this.filteredExpenses()
        .filter(
          (e: ExpenseDto) =>
            (e.categoryName || '').toLowerCase().includes('empaque') ||
            (e.categoryName || '').toLowerCase().includes('inocuidad')
        )
        .reduce((sum: number, e: ExpenseDto) => sum + e.amount, 0);
    } catch (error: unknown) {
      console.error('Error computing packaging expenses amount:', error);
      return 0;
    }
  });

  readonly facilityExpensesAmount = computed<number>(() => {
    try {
      return this.filteredExpenses()
        .filter(
          (e: ExpenseDto) =>
            (e.categoryName || '').toLowerCase().includes('mantenimiento') ||
            (e.categoryName || '').toLowerCase().includes('servicios')
        )
        .reduce((sum: number, e: ExpenseDto) => sum + e.amount, 0);
    } catch (error: unknown) {
      console.error('Error computing facility expenses amount:', error);
      return 0;
    }
  });

  readonly payrollSettlements = computed<PayrollSettlementDto[]>(() => {
    try {
      return this.stateService.payrollSettlements();
    } catch (error: unknown) {
      console.error('Error computing payroll settlements:', error);
      return [];
    }
  });

  readonly totalPayrollNet = computed<number>(() => {
    try {
      return this.payrollSettlements().reduce((sum: number, s: PayrollSettlementDto) => sum + s.netPayable, 0);
    } catch (error: unknown) {
      console.error('Error computing total payroll net:', error);
      return 0;
    }
  });

  readonly totalPayrollEarnings = computed<number>(() => {
    try {
      return this.payrollSettlements().reduce((sum: number, s: PayrollSettlementDto) => sum + s.totalEarnings, 0);
    } catch (error: unknown) {
      console.error('Error computing total payroll earnings:', error);
      return 0;
    }
  });

  readonly totalPayrollDeductions = computed<number>(() => {
    try {
      return this.payrollSettlements().reduce((sum: number, s: PayrollSettlementDto) => sum + s.totalDeductions, 0);
    } catch (error: unknown) {
      console.error('Error computing total payroll deductions:', error);
      return 0;
    }
  });

  readonly productionPayrollNet = computed<number>(() => {
    try {
      return this.payrollSettlements()
        .filter((s: PayrollSettlementDto) => s.area === 'PRODUCCION')
        .reduce((sum: number, s: PayrollSettlementDto) => sum + s.netPayable, 0);
    } catch (error: unknown) {
      console.error('Error computing production payroll net:', error);
      return 0;
    }
  });

  readonly deliveryPayrollNet = computed<number>(() => {
    try {
      return this.payrollSettlements()
        .filter((s: PayrollSettlementDto) => s.area === 'DOMICILIOS')
        .reduce((sum: number, s: PayrollSettlementDto) => sum + s.netPayable, 0);
    } catch (error: unknown) {
      console.error('Error computing delivery payroll net:', error);
      return 0;
    }
  });

  /**
   * Subscribes to route query parameters to select the active report tab.
   */
  constructor() {
    try {
      this.route.queryParams.subscribe(params => {
        const tab = params['tab'];
        if (tab === 'sales' || tab === 'ventas') {
          this.activeTab.set('sales');
        } else if (tab === 'loss' || tab === 'mermas' || tab === 'ideal-vs-real') {
          this.activeTab.set('loss');
        } else if (tab === 'stock' || tab === 'cava' || tab === 'inventario') {
          this.activeTab.set('stock');
        } else if (tab === 'expenses' || tab === 'gastos' || tab === 'logistica') {
          this.activeTab.set('expenses');
        } else if (tab === 'payroll' || tab === 'nomina' || tab === 'rrhh') {
          this.activeTab.set('payroll');
        }
      });
    } catch (error: unknown) {
      console.error('Error initializing ReportsComponent:', error);
    }
  }

  /**
   * Dynamically returns the names of delivery employees from StateService.
   */
  get availableCouriers(): string[] {
    try {
      return this.stateService
        .employees()
        .filter((emp: EmployeeDto) => emp.area === 'DOMICILIOS')
        .map((emp: EmployeeDto) => emp.fullName || emp.name || '')
        .filter(Boolean);
    } catch (error: unknown) {
      console.error('Error getting available couriers:', error);
      return [];
    }
  }

  /**
   * Opens the modal displaying the item breakdown for an order.
   */
  openItemsListModal(order: OrderDto): void {
    try {
      this.selectedOrderForItems.set(order);
      this.showItemsListModal.set(true);
    } catch (error: unknown) {
      console.error('Error opening items list modal:', error);
    }
  }

  /**
   * Switches the active report tab and closes any open row action dropdown.
   */
  setTab(tab: ReportTab): void {
    try {
      this.activeTab.set(tab);
      this.openActionOrderId.set(null);
    } catch (error: unknown) {
      console.error('Error setting report tab:', error);
    }
  }

  /**
   * Closes the row actions dropdown when clicking outside.
   */
  @HostListener('document:click')
  closeDropdownOnOutsideClick(): void {
    try {
      if (this.openActionOrderId() !== null) {
        this.openActionOrderId.set(null);
      }
    } catch (error: unknown) {
      console.error('Error closing dropdown on outside click:', error);
    }
  }

  /**
   * Toggles the row action dropdown menu for a specific order ID.
   */
  toggleActionsDropdown(orderId: number, event: Event): void {
    try {
      event.stopPropagation();
      this.openActionOrderId.update((curr: number | null) => (curr === orderId ? null : orderId));
    } catch (error: unknown) {
      console.error('Error toggling actions dropdown:', error);
    }
  }

  /**
   * Updates the selected date filter mode.
   */
  setDateFilter(mode: ReportDateFilter): void {
    try {
      this.selectedDateFilter.set(mode);
    } catch (error: unknown) {
      console.error('Error setting date filter:', error);
    }
  }

  /**
   * Formats an ISO YYYY-MM-DD date string into a human-readable Spanish date.
   */
  formatHumanDateES(isoDate: string): string {
    try {
      if (!isoDate || isoDate.length < 10) return isoDate;
      const [yr, mo, dy] = isoDate.substring(0, 10).split('-');
      const mObj = this.monthsList.find((m: MonthOption) => m.value === mo);
      return `${Number(dy)} ${mObj ? mObj.shortLabel : mo} ${yr}`;
    } catch (error: unknown) {
      console.error('Error formatting human date ES:', error);
      return isoDate;
    }
  }

  /**
   * Calculates the commercial valuation of a fruit's finished pulp stock in COP.
   */
  getFruitCommercialValue(fruit: FruitConfig): number {
    try {
      const stockMap = fruit.stock as unknown as Record<string, number | undefined>;
      const priceMap = fruit.prices as unknown as Record<string, number | undefined>;
      const s140 = stockMap['g140'] ?? fruit.stock.g100 ?? 0;
      const p140 = priceMap['g140'] ?? fruit.prices.g100 ?? 0;
      return (
        s140 * p140 +
        (fruit.stock.g250 || 0) * (fruit.prices.g250 || 0) +
        (fruit.stock.g500 || 0) * (fruit.prices.g500 || 0) +
        (fruit.stock.g1000 || 0) * (fruit.prices.g1000 || 0)
      );
    } catch (error: unknown) {
      console.error('Error calculating fruit commercial value:', error);
      return 0;
    }
  }

  /**
   * Calculates the total finished pulp stock weight in kilograms for a fruit.
   */
  getFruitTotalPulpKg(fruit: FruitConfig): number {
    try {
      const stockMap = fruit.stock as unknown as Record<string, number | undefined>;
      const s140 = stockMap['g140'] ?? fruit.stock.g100 ?? 0;
      return Number(
        (
          s140 * 0.14 +
          (fruit.stock.g250 || 0) * 0.25 +
          (fruit.stock.g500 || 0) * 0.5 +
          (fruit.stock.g1000 || 0) * 1.0
        ).toFixed(2)
      );
    } catch (error: unknown) {
      console.error('Error calculating fruit total pulp kg:', error);
      return 0;
    }
  }

  /**
   * Returns the uppercase Spanish status label for an order status.
   */
  getStatusLabelES(status: OrderStatus | string): string {
    try {
      switch (status) {
        case 'PENDING':
          return 'PENDIENTE';
        case 'PICKING':
          return 'EN ALISTAMIENTO';
        case 'BILLED':
          return 'FACTURADO';
        case 'DISPATCHED':
          return 'DESPACHADO';
        case 'DELIVERED':
          return 'ENTREGADO';
        case 'CANCELLED':
          return 'CANCELADO';
        default:
          return String(status);
      }
    } catch (error: unknown) {
      console.error('Error getting status label ES:', error);
      return String(status);
    }
  }

  /**
   * Returns the CSS badge class for an order status.
   */
  getStatusBadgeClass(status: OrderStatus | string): string {
    try {
      switch (status) {
        case 'DELIVERED':
          return 'badge-success';
        case 'BILLED':
          return 'badge-info';
        case 'CANCELLED':
          return 'badge-danger';
        case 'DISPATCHED':
        case 'PENDING':
        case 'PICKING':
        default:
          return 'badge-warning';
      }
    } catch (error: unknown) {
      console.error('Error getting status badge class:', error);
      return 'badge-warning';
    }
  }

  /**
   * Returns the assigned courier name for an order or 'Sin asignar' if none is set.
   */
  getCourierName(order: OrderDto): string {
    try {
      return order.courierName?.trim() ? order.courierName : 'Sin asignar';
    } catch (error: unknown) {
      console.error('Error getting courier name:', error);
      return 'Sin asignar';
    }
  }

  /**
   * Opens the order edit modal populated with the selected order's details.
   */
  onEditOrder(order: OrderDto, event?: Event): void {
    try {
      event?.stopPropagation();
      this.openActionOrderId.set(null);

      this.editingOrderId.set(order.orderId);
      this.editingOrderNumber.set(order.orderNumber);
      this.editClientName.set(order.clientName || '');
      this.editPhone.set(order.clientPhone || '');
      this.editAddress.set(order.clientAddress || '');
      this.editPaymentMethod.set(order.paymentMethodName || '');
      this.editCourierName.set(order.courierName?.trim() || '');
      this.editStatus.set(order.status);
      this.editNotes.set(order.notes || '');
      this.editItems.set(
        order.items.map((i: OrderItemDto) => ({
          fruitName: i.fruitName || '',
          grammage: (i.grammage as 140 | 250 | 500 | 1000) || 1000,
          quantity: i.quantity,
          unitPrice: i.unitPrice
        }))
      );
      this.showEditOrderModal.set(true);
    } catch (error: unknown) {
      console.error('Error opening edit order modal in reports:', error);
    }
  }

  /**
   * Appends a new item row to the edit order modal using the first configured fruit if available.
   */
  addEditItem(): void {
    try {
      const firstFruit = this.stateService.fruits()[0];
      const fruitName = firstFruit ? firstFruit.name : '';
      const unitPrice = firstFruit ? (firstFruit.prices.g1000 ?? 0) : 0;
      this.editItems.update(list => [
        ...list,
        { fruitName, grammage: 1000, quantity: 1, unitPrice }
      ]);
    } catch (error: unknown) {
      console.error('Error adding edit item:', error);
    }
  }

  /**
   * Removes an item row from the edit order modal by index.
   */
  removeEditItem(index: number): void {
    try {
      this.editItems.update(list => list.filter((_: ReportEditOrderItem, i: number) => i !== index));
    } catch (error: unknown) {
      console.error('Error removing edit item:', error);
    }
  }

  /**
   * Updates the selected fruit and unit price for an item row in the edit modal.
   */
  updateEditItemFruit(index: number, fruitName: string): void {
    try {
      const fruit = this.stateService.fruits().find((f: FruitConfig) => f.name === fruitName);
      this.editItems.update(list =>
        list.map((item: ReportEditOrderItem, i: number) => {
          if (i === index && fruit) {
            const pKey = (`g${item.grammage === 140 ? 100 : item.grammage}`) as keyof typeof fruit.prices;
            return { ...item, fruitName: fruit.name, unitPrice: fruit.prices[pKey] ?? 0 };
          }
          return item;
        })
      );
    } catch (error: unknown) {
      console.error('Error updating edit item fruit:', error);
    }
  }

  /**
   * Updates the selected grammage and unit price for an item row in the edit modal.
   */
  updateEditItemGrammage(index: number, grammage: 140 | 250 | 500 | 1000): void {
    try {
      const numGram = Number(grammage) as 140 | 250 | 500 | 1000;
      this.editItems.update(list =>
        list.map((item: ReportEditOrderItem, i: number) => {
          if (i === index) {
            const fruit = this.stateService.fruits().find((f: FruitConfig) => f.name === item.fruitName);
            const pKey = (`g${numGram === 140 ? 100 : numGram}`) as keyof NonNullable<FruitConfig['prices']>;
            const nextPrice = fruit ? (fruit.prices[pKey] ?? 0) : item.unitPrice;
            return { ...item, grammage: numGram, unitPrice: nextPrice };
          }
          return item;
        })
      );
    } catch (error: unknown) {
      console.error('Error updating edit item grammage:', error);
    }
  }

  /**
   * Updates the quantity for an item row in the edit modal.
   */
  updateEditItemQuantity(index: number, qty: number): void {
    try {
      const validQty = Math.max(1, Number(qty) || 1);
      this.editItems.update(list =>
        list.map((item: ReportEditOrderItem, i: number) => (i === index ? { ...item, quantity: validQty } : item))
      );
    } catch (error: unknown) {
      console.error('Error updating edit item quantity:', error);
    }
  }

  /**
   * Updates the unit price for an item row in the edit modal.
   */
  updateEditItemPrice(index: number, price: number): void {
    try {
      const validPrice = Math.max(0, Number(price) || 0);
      this.editItems.update(list =>
        list.map((item: ReportEditOrderItem, i: number) => (i === index ? { ...item, unitPrice: validPrice } : item))
      );
    } catch (error: unknown) {
      console.error('Error updating edit item price:', error);
    }
  }

  /**
   * Saves the edited order details back to StateService.
   */
  saveEditedOrder(): void {
    try {
      const orderId = this.editingOrderId();
      if (orderId === null) return;

      const validItems = this.editItems().filter((i: ReportEditOrderItem) => i.quantity > 0);
      if (!this.editClientName().trim() || validItems.length === 0) {
        this.notification.warning('Datos Incompletos', 'Verifica el nombre del cliente y al menos un ítem.');
        return;
      }

      this.stateService.updateOrder(orderId, {
        clientName: this.editClientName().trim(),
        clientPhone: this.editPhone().trim(),
        clientAddress: this.editAddress().trim(),
        paymentMethodName: this.editPaymentMethod(),
        courierName: this.editCourierName(),
        status: this.editStatus(),
        notes: this.editNotes().trim(),
        items: validItems
      });

      this.showEditOrderModal.set(false);
      this.editingOrderId.set(null);
    } catch (error: unknown) {
      console.error('Error saving edited order in reports:', error);
    }
  }

  /**
   * Deletes an order from StateService.
   */
  onDeleteOrder(order: OrderDto, event?: Event): void {
    try {
      event?.stopPropagation();
      this.openActionOrderId.set(null);
      this.stateService.deleteOrder(order.orderId);
    } catch (error: unknown) {
      console.error('Error deleting order in reports:', error);
    }
  }

  /**
   * Opens the corporate invoice preview modal for an order.
   */
  onViewInvoice(order: OrderDto, event?: Event): void {
    try {
      event?.stopPropagation();
      this.openActionOrderId.set(null);
      this.selectedOrderForInvoice.set(order);
      this.showInvoiceModal.set(true);
    } catch (error: unknown) {
      console.error('Error viewing invoice in reports:', error);
    }
  }

  /**
   * Clones an existing order into a newly created order in StateService.
   */
  onRemakeOrder(order: OrderDto, event?: Event): void {
    try {
      event?.stopPropagation();
      this.openActionOrderId.set(null);

      const newOrder = this.stateService.createOrder({
        clientName: order.clientName,
        clientPhone: order.clientPhone,
        clientAddress: order.clientAddress,
        paymentMethodName: order.paymentMethodName,
        courierName: this.getCourierName(order),
        notes: order.notes ? `${order.notes} (Rehecho de ${order.orderNumber})` : `Rehecho de ${order.orderNumber}`,
        items: order.items.map((i: OrderItemDto) => ({
          fruitName: i.fruitName || '',
          grammage: (i.grammage as 140 | 250 | 500 | 1000) || 1000,
          quantity: i.quantity,
          unitPrice: i.unitPrice
        }))
      });

      this.notification.success(
        'Pedido Rehecho',
        `Se generó el nuevo pedido #${newOrder.orderNumber} a partir de ${order.orderNumber}.`
      );
    } catch (error: unknown) {
      console.error('Error remaking order in reports:', error);
    }
  }

  /**
   * Generates the invoice code for an order without hardcoded fallbacks.
   */
  getInvoiceCode(order: OrderDto): string {
    try {
      if (order.invoiceNumber) return order.invoiceNumber;
      const prefix = this.stateService.companyInfo().invoicePrefix || '';
      if (!prefix) return order.orderNumber || '';
      const baseNum = this.stateService.companyInfo().invoiceNextNumber || 0;
      const seq = String(baseNum + (order.orderId % 100)).padStart(5, '0');
      return `${prefix}${seq}`;
    } catch (error: unknown) {
      console.error('Error getting invoice code:', error);
      return '';
    }
  }

  /**
   * Generates the origin reference code for an order.
   */
  getOriginCode(order: OrderDto): string {
    try {
      return order.orderNumber || `S${String(order.orderId).padStart(5, '0')}`;
    } catch (error: unknown) {
      console.error('Error getting origin code:', error);
      return '';
    }
  }

  /**
   * Formats an ISO date string into DD/MM/YYYY format.
   */
  formatInvoiceDate(dateStr?: string): string {
    try {
      const d = dateStr ? new Date(dateStr) : new Date();
      if (isNaN(d.getTime())) return '';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error: unknown) {
      console.error('Error formatting invoice date:', error);
      return '';
    }
  }

  /**
   * Formats an ISO date-time string into DD/MM/YYYY HH:mm format.
   */
  formatDateTime(dateStr?: string): string {
    try {
      if (!dateStr) return '—';
      if (dateStr.includes('T')) {
        const [dPart, tPart] = dateStr.split('T');
        const [y, m, d] = dPart.split('-');
        const time = tPart ? tPart.substring(0, 5) : '00:00';
        return `${d}/${m}/${y} ${time}`;
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.substring(0, 10);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error: unknown) {
      console.error('Error formatting date time:', error);
      return '—';
    }
  }

  /**
   * Navigates to a specific page in the paginated sales orders table.
   */
  goToOrdersPage(page: number): void {
    try {
      if (page >= 1 && page <= this.totalOrdersPages()) {
        this.ordersCurrentPage.set(page);
      }
    } catch (error: unknown) {
      console.error('Error navigating to orders page:', error);
    }
  }

  /**
   * Returns the visible page numbers for the sales orders pagination bar.
   */
  getOrdersPageNumbers(): number[] {
    try {
      const total = this.totalOrdersPages();
      const current = this.ordersCurrentPage();
      const pages: number[] = [];
      const maxVisible = 5;
      let start = Math.max(1, current - Math.floor(maxVisible / 2));
      const end = Math.min(total, start + maxVisible - 1);
      if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
      }
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    } catch (error: unknown) {
      console.error('Error getting orders page numbers:', error);
      return [1];
    }
  }

  /**
   * Formats a numeric value with two decimal places in Colombian locale.
   */
  formatNumberES(val: number): string {
    try {
      return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(val || 0);
    } catch (error: unknown) {
      console.error('Error formatting number ES:', error);
      return String(val || 0);
    }
  }

  /**
   * Retrieves the discount percentage for an invoice line item.
   */
  getItemDiscount(orderId: number, idx: number): number {
    try {
      const key = `${orderId}_${idx}`;
      return this.itemDiscounts()[key] ?? 0;
    } catch (error: unknown) {
      console.error('Error getting item discount:', error);
      return 0;
    }
  }

  /**
   * Updates the discount percentage for an invoice line item.
   */
  setItemDiscount(orderId: number, idx: number, val: number): void {
    try {
      const clamped = Math.min(100, Math.max(0, Number(val) || 0));
      const key = `${orderId}_${idx}`;
      this.itemDiscounts.update(prev => ({ ...prev, [key]: clamped }));
    } catch (error: unknown) {
      console.error('Error setting item discount:', error);
    }
  }

  /**
   * Calculates the net line amount after applying its discount percentage.
   */
  getItemImporte(item: { quantity: number; unitPrice: number; subtotal: number }, orderId: number, idx: number): number {
    try {
      const disc = this.getItemDiscount(orderId, idx);
      const gross = (item.quantity || 0) * (item.unitPrice || 0);
      return Math.round(gross * (1 - disc / 100));
    } catch (error: unknown) {
      console.error('Error calculating item importe:', error);
      return 0;
    }
  }

  /**
   * Calculates the base subtotal of an invoice after line discounts.
   */
  getInvoiceBaseAmount(order: OrderDto): number {
    try {
      return order.items.reduce(
        (sum: number, item: OrderItemDto, idx: number) => sum + this.getItemImporte(item, order.orderId, idx),
        0
      );
    } catch (error: unknown) {
      console.error('Error calculating invoice base amount:', error);
      return 0;
    }
  }

  /**
   * Calculates the total discount savings across all items in an order.
   */
  getInvoiceDiscountSaved(order: OrderDto): number {
    try {
      const gross = order.items.reduce((sum: number, item: OrderItemDto) => sum + item.quantity * item.unitPrice, 0);
      return Math.max(0, gross - this.getInvoiceBaseAmount(order));
    } catch (error: unknown) {
      console.error('Error calculating invoice discount saved:', error);
      return 0;
    }
  }

  /**
   * Calculates the tax amount for an invoice based on the configured tax rate.
   */
  getInvoiceTaxAmount(order: OrderDto): number {
    try {
      const rate = this.invoiceTaxRate();
      if (rate <= 0) return 0;
      return Math.round(this.getInvoiceBaseAmount(order) * (rate / 100));
    } catch (error: unknown) {
      console.error('Error calculating invoice tax amount:', error);
      return 0;
    }
  }

  /**
   * Calculates the grand total of an invoice including taxes.
   */
  getInvoiceTotalWithTax(order: OrderDto): number {
    try {
      return this.getInvoiceBaseAmount(order) + this.getInvoiceTaxAmount(order);
    } catch (error: unknown) {
      console.error('Error calculating invoice total with tax:', error);
      return 0;
    }
  }

  /**
   * Triggers the browser print dialog for the open invoice modal.
   */
  printInvoice(): void {
    try {
      window.print();
    } catch (error: unknown) {
      console.error('Error printing invoice:', error);
    }
  }

  /**
   * Exports the currently active report tab to a downloadable CSV file.
   */
  exportCurrentReportCsv(): void {
    try {
      const now = new Date().toISOString().substring(0, 10);
      const tab = this.activeTab();

      if (tab === 'sales') {
        const headers = ['Nro Pedido', 'Fecha', 'Cliente', 'Teléfono', 'Método Pago', 'Mensajero', 'Ítems', 'Estado', 'Total COP'];
        const rows = this.filteredOrders().map((o: OrderDto) => [
          o.orderNumber,
          this.formatDateTime(o.createdAt || o.orderDate),
          `"${(o.clientName || '').replace(/"/g, '""')}"`,
          o.clientPhone || 'N/A',
          o.paymentMethodName || 'General',
          `"${this.getCourierName(o)}"`,
          o.items.length,
          this.getStatusLabelES(o.status),
          o.totalAmount
        ]);
        this.downloadCsv(`reporte_ventas_${now}.csv`, headers, rows);
      } else if (tab === 'loss') {
        const headers = ['Fruta', 'Pulpa Producida Kg', 'Unidades Estimadas', 'Unidades Facturadas', 'Venta Ideal COP', 'Venta Real COP', 'Diferencia Unidades', 'Diferencia COP', 'Nivel Merma'];
        const rows = this.idealVsRealAudit().map((r: IdealVsRealAuditDto) => [
          `"${r.fruitName}"`,
          r.totalPulpKgProduced,
          r.unitsProduced,
          r.unitsBilled,
          r.idealRevenue,
          r.realRevenue,
          r.differenceUnits,
          r.differenceRevenue,
          r.alertLevel
        ]);
        this.downloadCsv(`reporte_auditoria_mermas_${now}.csv`, headers, rows);
      } else if (tab === 'stock') {
        const headers = ['Fruta', 'Stock 140g', 'Stock 250g', 'Stock 500g', 'Stock 1000g', 'Total Pulpa Kg', 'Fruta Fresca Kg', 'Valorización COP'];
        const rows = this.stateService.fruits().map((f: FruitConfig) => {
          const stockMap = f.stock as unknown as Record<string, number | undefined>;
          return [
            `"${f.name}"`,
            stockMap['g140'] ?? f.stock.g100 ?? 0,
            f.stock.g250,
            f.stock.g500,
            f.stock.g1000,
            this.getFruitTotalPulpKg(f),
            f.freshStockKg || 0,
            this.getFruitCommercialValue(f)
          ];
        });
        this.downloadCsv(`reporte_inventario_${now}.csv`, headers, rows);
      } else if (tab === 'expenses') {
        const headers = ['Fecha', 'Categoría', 'Descripción', 'Medio Pago', 'Comprobante', 'Monto COP'];
        const rows = this.filteredExpenses().map((e: ExpenseDto) => [
          e.expenseDate || e.createdAt.substring(0, 10),
          `"${e.categoryName}"`,
          `"${e.description.replace(/"/g, '""')}"`,
          e.paymentMethodName || 'General',
          e.receiptNumber || 'N/A',
          e.amount
        ]);
        this.downloadCsv(`reporte_gastos_logistica_${now}.csv`, headers, rows);
      } else if (tab === 'payroll') {
        const headers = ['Colaborador', 'Área', 'Días Laborados', 'Salario Base Mes COP', 'Devengado Total COP', 'Deducciones COP', 'Neto a Pagar COP', 'Estado'];
        const rows = this.payrollSettlements().map((s: PayrollSettlementDto) => [
          `"${s.employeeName}"`,
          s.area,
          s.daysWorked,
          s.baseSalaryMonthly,
          s.totalEarnings,
          s.totalDeductions,
          s.netPayable,
          s.paymentStatus
        ]);
        this.downloadCsv(`reporte_nomina_quincenal_${now}.csv`, headers, rows);
      }

      this.notification.success('Reporte Exportado', 'Archivo Excel (CSV) generado con éxito.');
    } catch (error: unknown) {
      console.error('Error exporting report CSV:', error);
    }
  }

  /**
   * Creates and triggers a browser download for a semicolon-delimited CSV file.
   */
  private downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>): void {
    try {
      const csvContent =
        '\uFEFF' + [headers.join(';'), ...rows.map((r: Array<string | number>) => r.join(';'))].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error('Error downloading CSV:', error);
    }
  }

  /**
   * Triggers the browser print dialog for the current report view.
   */
  printReport(): void {
    try {
      window.print();
    } catch (error: unknown) {
      console.error('Error printing report:', error);
    }
  }

  /**
   * Formats a number as Colombian Pesos (COP).
   */
  formatCOP(value: number): string {
    try {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
      }).format(value || 0);
    } catch (error: unknown) {
      console.error('Error formatting COP:', error);
      return `$${value || 0}`;
    }
  }

  /**
   * Formats a numeric value using Colombian thousands separators.
   */
  formatNum(value: number): string {
    try {
      return new Intl.NumberFormat('es-CO').format(value || 0);
    } catch (error: unknown) {
      console.error('Error formatting number:', error);
      return String(value || 0);
    }
  }
}
