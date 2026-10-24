import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  OrderDto,
  OrderStatus,
  IdealVsRealAuditDto,
  ExpenseDto,
  PayrollSettlementDto
} from '../../core/models/business.models';

export type ReportTab = 'sales' | 'loss' | 'stock' | 'expenses' | 'payroll';
export type ReportDateFilter = 'today' | 'yesterday' | 'month' | 'year' | 'range';

export interface MonthOption {
  value: string; // '01' .. '12'
  label: string;
  shortLabel: string;
}

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

  // Active Report Tab: sales, loss, stock, expenses, payroll
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

  // Date Filter State: Hoy, Ayer, Mes, Año, Rango
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
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<string>([
      String(currentYear),
      String(currentYear - 1),
      String(currentYear - 2)
    ]);
    this.stateService.orders().forEach(o => {
      const y = (o.createdAt || o.orderDate || '').substring(0, 4);
      if (/^\d{4}$/.test(y)) {
        yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  });

  readonly todayFormattedDisplay = computed(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    return this.formatHumanDateES(todayStr);
  });

  readonly yesterdayFormattedDisplay = computed(() => {
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
    return this.formatHumanDateES(yesterdayStr);
  });

  readonly selectedMonthLabel = computed(() => {
    const found = this.monthsList.find(m => m.value === this.selectedMonthNumber());
    return found ? found.label : 'Octubre';
  });

  // Dropdown Actions Menu state (stores orderId of open dropdown, or null)
  readonly openActionOrderId = signal<number | null>(null);

  // Pagination for orders table
  readonly ordersPageSize = 10;
  readonly ordersCurrentPage = signal<number>(1);

  // Available Couriers
  readonly availableCouriers = [
    'Carlos Rodríguez',
    'Andrés Morales',
    'Felipe Caicedo',
    'Julián David Pérez',
    'Sin asignar'
  ];

  // Invoice Modal State
  readonly showInvoiceModal = signal<boolean>(false);
  readonly selectedOrderForInvoice = signal<OrderDto | null>(null);
  readonly invoiceTaxRate = signal<number>(19);
  readonly itemDiscounts = signal<Record<string, number>>({});

  // Items List Modal State
  readonly showItemsListModal = signal<boolean>(false);
  readonly selectedOrderForItems = signal<OrderDto | null>(null);

  openItemsListModal(order: OrderDto) {
    this.selectedOrderForItems.set(order);
    this.showItemsListModal.set(true);
  }

  // Edit Order Modal State
  readonly showEditOrderModal = signal<boolean>(false);
  readonly editingOrderId = signal<number | null>(null);
  readonly editingOrderNumber = signal<string>('');
  readonly editClientName = signal<string>('');
  readonly editPhone = signal<string>('');
  readonly editAddress = signal<string>('');
  readonly editPaymentMethod = signal<string>('Transferencia Bancolombia');
  readonly activePaymentMethods = computed(() => this.stateService.activePaymentMethods());
  readonly editCourierName = signal<string>('Carlos Rodríguez');
  readonly editStatus = signal<OrderStatus>('PENDING');
  readonly editNotes = signal<string>('');
  readonly editItems = signal<{
    fruitName: string;
    grammage: 140 | 250 | 500 | 1000;
    quantity: number;
    unitPrice: number;
  }[]>([]);

  readonly editOrderTotal = computed(() =>
    this.editItems().reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      0
    )
  );

  constructor() {
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
  }

  setTab(tab: ReportTab) {
    this.activeTab.set(tab);
    this.openActionOrderId.set(null);
  }

  @HostListener('document:click')
  closeDropdownOnOutsideClick() {
    if (this.openActionOrderId() !== null) {
      this.openActionOrderId.set(null);
    }
  }

  toggleActionsDropdown(orderId: number, event: Event) {
    event.stopPropagation();
    this.openActionOrderId.update(curr => (curr === orderId ? null : orderId));
  }

  setDateFilter(mode: ReportDateFilter) {
    this.selectedDateFilter.set(mode);
  }

  formatHumanDateES(isoDate: string): string {
    if (!isoDate || isoDate.length < 10) return isoDate;
    const [yr, mo, dy] = isoDate.substring(0, 10).split('-');
    const mObj = this.monthsList.find(m => m.value === mo);
    return `${Number(dy)} ${mObj ? mObj.shortLabel : mo} ${yr}`;
  }

  // ==========================================
  // TAB 1: SALES & KPI COMPUTED
  // ==========================================
  readonly filteredOrders = computed(() => {
    const orders = this.stateService.orders().filter(o => o.status !== 'CANCELLED');
    const filter = this.selectedDateFilter();
    const todayStr = new Date().toISOString().substring(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

    if (filter === 'today') {
      return orders.filter(o => (o.createdAt || o.orderDate || '').substring(0, 10) === todayStr);
    }

    if (filter === 'yesterday') {
      return orders.filter(o => (o.createdAt || o.orderDate || '').substring(0, 10) === yesterdayStr);
    }

    if (filter === 'month') {
      const targetMonth = `${this.selectedYear()}-${this.selectedMonthNumber()}`;
      return orders.filter(o => (o.createdAt || o.orderDate || '').substring(0, 7) === targetMonth);
    }

    if (filter === 'year') {
      const targetYear = this.selectedYear() || todayStr.substring(0, 4);
      return orders.filter(o => (o.createdAt || o.orderDate || '').substring(0, 4) === targetYear);
    }

    if (filter === 'range') {
      const start = this.rangeStartDate() || '0000-01-01';
      const end = this.rangeEndDate() || '9999-12-31';
      const [minDate, maxDate] = start <= end ? [start, end] : [end, start];
      return orders.filter(o => {
        const d = (o.createdAt || o.orderDate || '').substring(0, 10);
        return d >= minDate && d <= maxDate;
      });
    }

    this.ordersCurrentPage.set(1);
    return orders;
  });

  readonly totalOrdersPages = computed(() => Math.ceil(this.filteredOrders().length / this.ordersPageSize) || 1);

  readonly paginatedOrders = computed(() => {
    const all = this.filteredOrders();
    const page = this.ordersCurrentPage();
    const start = (page - 1) * this.ordersPageSize;
    return all.slice(start, start + this.ordersPageSize);
  });

  readonly activeFilterSummaryLabel = computed(() => {
    const filter = this.selectedDateFilter();
    if (filter === 'today') return `Hoy (${this.todayFormattedDisplay()})`;
    if (filter === 'yesterday') return `Ayer (${this.yesterdayFormattedDisplay()})`;
    if (filter === 'month') return `${this.selectedMonthLabel()} ${this.selectedYear()}`;
    if (filter === 'year') return `Año ${this.selectedYear()}`;
    if (filter === 'range') {
      return `${this.formatHumanDateES(this.rangeStartDate())} – ${this.formatHumanDateES(this.rangeEndDate())}`;
    }
    return 'Período';
  });

  readonly totalSalesRevenue = computed(() => {
    return this.filteredOrders().reduce((sum, o) => sum + o.totalAmount, 0);
  });

  readonly filteredGrossProfit = computed(() => {
    const rev = this.totalSalesRevenue();
    const cogs = this.filteredOrders().reduce((sum, o) => {
      const orderCogs = o.items.reduce((iSum, item) => iSum + item.subtotal * 0.55, 0);
      return sum + orderCogs;
    }, 0);
    return Math.round(rev - cogs);
  });

  readonly filteredGrossMarginPct = computed(() => {
    const rev = this.totalSalesRevenue();
    if (rev <= 0) return 0;
    return Number(((this.filteredGrossProfit() / rev) * 100).toFixed(1));
  });

  readonly filteredCompliancePct = computed(() => {
    const target = this.stateService.salesPerformance().monthTargetRevenue || 18000000;
    if (target <= 0) return 0;
    return Number(((this.totalSalesRevenue() / target) * 100).toFixed(1));
  });

  readonly totalUnitsSold = computed(() => {
    return this.filteredOrders().reduce((sum, o) => {
      const itemsCount = o.items.reduce((iSum, it) => iSum + it.quantity, 0);
      return sum + itemsCount;
    }, 0);
  });

  readonly averageTicket = computed(() => {
    const count = this.filteredOrders().length;
    return count > 0 ? Math.round(this.totalSalesRevenue() / count) : 0;
  });

  // ==========================================
  // TAB 2: AUDITORÍA DE MERMAS (IDEAL VS REAL)
  // ==========================================
  readonly idealVsRealAudit = computed<IdealVsRealAuditDto[]>(() => {
    return this.stateService.idealVsRealLossAudit();
  });

  readonly lossTotalPulpKg = computed(() => {
    return this.idealVsRealAudit().reduce((sum, r) => sum + (r.totalPulpKgProduced || 0), 0);
  });

  readonly lossTotalIdealRevenue = computed(() => {
    return this.idealVsRealAudit().reduce((sum, r) => sum + (r.idealRevenue || 0), 0);
  });

  readonly lossTotalRealRevenue = computed(() => {
    return this.idealVsRealAudit().reduce((sum, r) => sum + (r.realRevenue || 0), 0);
  });

  readonly lossTotalGapRevenue = computed(() => {
    return this.lossTotalIdealRevenue() - this.lossTotalRealRevenue();
  });

  readonly lossGlobalPercentage = computed(() => {
    const ideal = this.lossTotalIdealRevenue();
    if (ideal <= 0) return 0;
    return Number(((this.lossTotalGapRevenue() / ideal) * 100).toFixed(1));
  });

  // ==========================================
  // TAB 3: INVENTARIO & VALORACIÓN DE CAVA
  // ==========================================
  readonly cavaTotalStockKg = computed(() => this.stateService.totalStockKg());
  readonly cavaFreshStockKg = computed(() => this.stateService.totalFreshStockKg());

  readonly cavaCommercialValue = computed(() => {
    return this.stateService.fruits().reduce((sum, f) => {
      return (
        sum +
        (f.stock.g140 || 0) * (f.prices.g140 || 0) +
        (f.stock.g250 || 0) * (f.prices.g250 || 0) +
        (f.stock.g500 || 0) * (f.prices.g500 || 0) +
        (f.stock.g1000 || 0) * (f.prices.g1000 || 0)
      );
    }, 0);
  });

  readonly cavaEstimatedCost = computed(() => Math.round(this.cavaCommercialValue() * 0.55));
  readonly cavaLowStockCount = computed(() => this.stateService.lowStockFruitsCount());

  getFruitCommercialValue(fruit: any): number {
    return (
      (fruit.stock.g140 || 0) * (fruit.prices.g140 || 0) +
      (fruit.stock.g250 || 0) * (fruit.prices.g250 || 0) +
      (fruit.stock.g500 || 0) * (fruit.prices.g500 || 0) +
      (fruit.stock.g1000 || 0) * (fruit.prices.g1000 || 0)
    );
  }

  getFruitTotalPulpKg(fruit: any): number {
    return Number(
      (
        (fruit.stock.g140 || 0) * 0.14 +
        (fruit.stock.g250 || 0) * 0.25 +
        (fruit.stock.g500 || 0) * 0.5 +
        (fruit.stock.g1000 || 0) * 1.0
      ).toFixed(2)
    );
  }

  // ==========================================
  // TAB 4: GASTOS & LOGÍSTICA
  // ==========================================
  readonly filteredExpenses = computed<ExpenseDto[]>(() => {
    const expenses = this.stateService.expenses();
    const filter = this.selectedDateFilter();
    const todayStr = new Date().toISOString().substring(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

    if (filter === 'today') {
      return expenses.filter(e => (e.expenseDate || e.createdAt || '').substring(0, 10) === todayStr);
    }
    if (filter === 'yesterday') {
      return expenses.filter(e => (e.expenseDate || e.createdAt || '').substring(0, 10) === yesterdayStr);
    }
    if (filter === 'month') {
      const targetMonth = `${this.selectedYear()}-${this.selectedMonthNumber()}`;
      return expenses.filter(e => (e.expenseDate || e.createdAt || '').substring(0, 7) === targetMonth);
    }
    if (filter === 'year') {
      const targetYear = this.selectedYear() || todayStr.substring(0, 4);
      return expenses.filter(e => (e.expenseDate || e.createdAt || '').substring(0, 4) === targetYear);
    }
    if (filter === 'range') {
      const start = this.rangeStartDate() || '0000-01-01';
      const end = this.rangeEndDate() || '9999-12-31';
      const [minDate, maxDate] = start <= end ? [start, end] : [end, start];
      return expenses.filter(e => {
        const d = (e.expenseDate || e.createdAt || '').substring(0, 10);
        return d >= minDate && d <= maxDate;
      });
    }
    return expenses;
  });

  readonly totalExpensesAmount = computed(() => {
    return this.filteredExpenses().reduce((sum, e) => sum + e.amount, 0);
  });

  readonly logisticsExpensesAmount = computed(() => {
    return this.filteredExpenses()
      .filter(e => (e.categoryName || '').toLowerCase().includes('combustible') || (e.categoryName || '').toLowerCase().includes('logística'))
      .reduce((sum, e) => sum + e.amount, 0);
  });

  readonly packagingExpensesAmount = computed(() => {
    return this.filteredExpenses()
      .filter(e => (e.categoryName || '').toLowerCase().includes('empaque') || (e.categoryName || '').toLowerCase().includes('inocuidad'))
      .reduce((sum, e) => sum + e.amount, 0);
  });

  readonly facilityExpensesAmount = computed(() => {
    return this.filteredExpenses()
      .filter(e => (e.categoryName || '').toLowerCase().includes('mantenimiento') || (e.categoryName || '').toLowerCase().includes('servicios'))
      .reduce((sum, e) => sum + e.amount, 0);
  });

  // ==========================================
  // TAB 5: NÓMINA QUINCENAL & ASISTENCIA
  // ==========================================
  readonly payrollSettlements = computed<PayrollSettlementDto[]>(() => {
    return this.stateService.payrollSettlements();
  });

  readonly totalPayrollNet = computed(() => {
    return this.payrollSettlements().reduce((sum, s) => sum + s.netPayable, 0);
  });

  readonly totalPayrollEarnings = computed(() => {
    return this.payrollSettlements().reduce((sum, s) => sum + s.totalEarnings, 0);
  });

  readonly totalPayrollDeductions = computed(() => {
    return this.payrollSettlements().reduce((sum, s) => sum + s.totalDeductions, 0);
  });

  readonly productionPayrollNet = computed(() => {
    return this.payrollSettlements()
      .filter(s => s.area === 'PRODUCCION')
      .reduce((sum, s) => sum + s.netPayable, 0);
  });

  readonly deliveryPayrollNet = computed(() => {
    return this.payrollSettlements()
      .filter(s => s.area === 'DOMICILIOS')
      .reduce((sum, s) => sum + s.netPayable, 0);
  });

  // ==========================================
  // HELPERS & ACTIONS
  // ==========================================
  getStatusLabelES(status: OrderStatus | string): string {
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
  }

  getStatusBadgeClass(status: OrderStatus | string): string {
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
  }

  getCourierName(order: OrderDto): string {
    if (order.courierName && order.courierName.trim().length > 0) {
      return order.courierName;
    }
    const couriers = ['Carlos Rodríguez', 'Andrés Morales', 'Felipe Caicedo', 'Julián David Pérez'];
    const idx = Math.abs(order.orderId || 0) % couriers.length;
    return couriers[idx];
  }

  // --- Row Actions (Editar, Eliminar, Ver Factura, Rehacer Pedido) ---
  onEditOrder(order: OrderDto, event?: Event) {
    event?.stopPropagation();
    this.openActionOrderId.set(null);

    this.editingOrderId.set(order.orderId);
    this.editingOrderNumber.set(order.orderNumber);
    this.editClientName.set(order.clientName || '');
    this.editPhone.set(order.clientPhone || '');
    this.editAddress.set(order.clientAddress || '');
    this.editPaymentMethod.set(order.paymentMethodName || 'Transferencia Bancolombia');
    this.editCourierName.set(this.getCourierName(order));
    this.editStatus.set(order.status);
    this.editNotes.set(order.notes || '');
    this.editItems.set(
      order.items.map(i => ({
        fruitName: i.fruitName || 'Maracuyá',
        grammage: (i.grammage as 140 | 250 | 500 | 1000) || 1000,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      }))
    );
    this.showEditOrderModal.set(true);
  }

  addEditItem() {
    this.editItems.update(list => [
      ...list,
      { fruitName: 'Mango Tommy', grammage: 1000, quantity: 1, unitPrice: 10500 }
    ]);
  }

  removeEditItem(index: number) {
    this.editItems.update(list => list.filter((_, i) => i !== index));
  }

  updateEditItemFruit(index: number, fruitName: string) {
    const fruit = this.stateService.fruits().find(f => f.name === fruitName);
    this.editItems.update(list =>
      list.map((item, i) => {
        if (i === index && fruit) {
          const pKey = `g${item.grammage}` as 'g140' | 'g250' | 'g500' | 'g1000';
          return { ...item, fruitName: fruit.name, unitPrice: fruit.prices[pKey] };
        }
        return item;
      })
    );
  }

  updateEditItemGrammage(index: number, grammage: 140 | 250 | 500 | 1000) {
    const numGram = Number(grammage) as 140 | 250 | 500 | 1000;
    this.editItems.update(list =>
      list.map((item, i) => {
        if (i === index) {
          const fruit = this.stateService.fruits().find(f => f.name === item.fruitName);
          const pKey = `g${numGram}` as 'g140' | 'g250' | 'g500' | 'g1000';
          const nextPrice = fruit ? fruit.prices[pKey] : item.unitPrice;
          return { ...item, grammage: numGram, unitPrice: nextPrice };
        }
        return item;
      })
    );
  }

  updateEditItemQuantity(index: number, qty: number) {
    const validQty = Math.max(1, Number(qty) || 1);
    this.editItems.update(list =>
      list.map((item, i) => (i === index ? { ...item, quantity: validQty } : item))
    );
  }

  updateEditItemPrice(index: number, price: number) {
    const validPrice = Math.max(0, Number(price) || 0);
    this.editItems.update(list =>
      list.map((item, i) => (i === index ? { ...item, unitPrice: validPrice } : item))
    );
  }

  saveEditedOrder() {
    const orderId = this.editingOrderId();
    if (orderId === null) return;

    const validItems = this.editItems().filter(i => i.quantity > 0);
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
  }

  onDeleteOrder(order: OrderDto, event?: Event) {
    event?.stopPropagation();
    this.openActionOrderId.set(null);
    this.stateService.deleteOrder(order.orderId);
  }

  onViewInvoice(order: OrderDto, event?: Event) {
    event?.stopPropagation();
    this.openActionOrderId.set(null);
    this.selectedOrderForInvoice.set(order);
    this.showInvoiceModal.set(true);
  }

  onRemakeOrder(order: OrderDto, event?: Event) {
    event?.stopPropagation();
    this.openActionOrderId.set(null);

    const newOrder = this.stateService.createOrder({
      clientName: order.clientName,
      clientPhone: order.clientPhone,
      clientAddress: order.clientAddress,
      paymentMethodName: order.paymentMethodName,
      courierName: this.getCourierName(order),
      notes: order.notes ? `${order.notes} (Rehecho de ${order.orderNumber})` : `Rehecho de ${order.orderNumber}`,
      items: order.items.map(i => ({
        fruitName: i.fruitName || 'Maracuyá',
        grammage: (i.grammage as 140 | 250 | 500 | 1000) || 1000,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      }))
    });

    this.notification.success(
      'Pedido Rehecho',
      `Se generó el nuevo pedido #${newOrder.orderNumber} a partir de ${order.orderNumber}.`
    );
  }

  // --- Corporate Invoice Helpers ---
  getInvoiceCode(order: OrderDto): string {
    const prefix = this.stateService.companyInfo().invoicePrefix || 'INV/2026/';
    const baseNum = this.stateService.companyInfo().invoiceNextNumber || 7750;
    const seq = String(baseNum + (order.orderId % 100)).padStart(5, '0');
    return `${prefix}${seq}`;
  }

  getOriginCode(order: OrderDto): string {
    const seq = String(1097 + (order.orderId % 9000)).padStart(4, '0');
    return `S0${seq}`;
  }

  formatInvoiceDate(dateStr?: string): string {
    const d = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(d.getTime())) return '18/10/2026';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatDateTime(dateStr?: string): string {
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
  }

  goToOrdersPage(page: number): void {
    if (page >= 1 && page <= this.totalOrdersPages()) {
      this.ordersCurrentPage.set(page);
    }
  }

  getOrdersPageNumbers(): number[] {
    const total = this.totalOrdersPages();
    const current = this.ordersCurrentPage();
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  formatNumberES(val: number): string {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  }

  getItemDiscount(orderId: number, idx: number): number {
    const key = `${orderId}_${idx}`;
    return this.itemDiscounts()[key] ?? 0;
  }

  setItemDiscount(orderId: number, idx: number, val: number) {
    const clamped = Math.min(100, Math.max(0, Number(val) || 0));
    const key = `${orderId}_${idx}`;
    this.itemDiscounts.update(prev => ({ ...prev, [key]: clamped }));
  }

  getItemImporte(item: { quantity: number; unitPrice: number; subtotal: number }, orderId: number, idx: number): number {
    const disc = this.getItemDiscount(orderId, idx);
    const gross = (item.quantity || 0) * (item.unitPrice || 0);
    return Math.round(gross * (1 - disc / 100));
  }

  getInvoiceBaseAmount(order: OrderDto): number {
    return order.items.reduce((sum, item, idx) => sum + this.getItemImporte(item, order.orderId, idx), 0);
  }

  getInvoiceDiscountSaved(order: OrderDto): number {
    const gross = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    return Math.max(0, gross - this.getInvoiceBaseAmount(order));
  }

  getInvoiceTaxAmount(order: OrderDto): number {
    const rate = this.invoiceTaxRate();
    if (rate <= 0) return 0;
    return Math.round(this.getInvoiceBaseAmount(order) * (rate / 100));
  }

  getInvoiceTotalWithTax(order: OrderDto): number {
    return this.getInvoiceBaseAmount(order) + this.getInvoiceTaxAmount(order);
  }

  printInvoice() {
    window.print();
  }

  // --- Dynamic Export to CSV Functionality ---
  exportCurrentReportCsv() {
    const now = new Date().toISOString().substring(0, 10);
    const tab = this.activeTab();

    if (tab === 'sales') {
      const headers = ['Nro Pedido', 'Fecha', 'Cliente', 'Teléfono', 'Método Pago', 'Mensajero', 'Ítems', 'Estado', 'Total COP'];
      const rows = this.filteredOrders().map(o => [
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
      const rows = this.idealVsRealAudit().map(r => [
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
      const rows = this.stateService.fruits().map(f => [
        `"${f.name}"`,
        f.stock.g140,
        f.stock.g250,
        f.stock.g500,
        f.stock.g1000,
        this.getFruitTotalPulpKg(f),
        f.freshStockKg || 0,
        this.getFruitCommercialValue(f)
      ]);
      this.downloadCsv(`reporte_inventario_cava_${now}.csv`, headers, rows);
    } else if (tab === 'expenses') {
      const headers = ['Fecha', 'Categoría', 'Descripción', 'Medio Pago', 'Comprobante', 'Monto COP'];
      const rows = this.filteredExpenses().map(e => [
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
      const rows = this.payrollSettlements().map(s => [
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
  }

  private downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');

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
