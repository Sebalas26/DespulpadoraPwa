import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { OrderDto, OrderStatus } from '../../core/models/business.models';

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

  // Edit Order Modal State
  readonly showEditOrderModal = signal<boolean>(false);
  readonly editingOrderId = signal<number | null>(null);
  readonly editingOrderNumber = signal<string>('');
  readonly editClientName = signal<string>('');
  readonly editPhone = signal<string>('');
  readonly editAddress = signal<string>('');
  readonly editPaymentMethod = signal<string>('Transferencia Bancolombia');
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

  // --- Sales Metrics Computed ---
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

    return orders;
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

  // --- Status & Courier Helpers in Spanish ---
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

  // --- Export to CSV Functionality ---
  exportCurrentReportCsv() {
    const now = new Date().toISOString().substring(0, 10);
    const headers = [
      'Nro Pedido',
      'Fecha',
      'Cliente',
      'Teléfono',
      'Método Pago',
      'Mensajero',
      'Ítems',
      'Estado',
      'Total COP'
    ];
    const rows = this.filteredOrders().map(o => [
      o.orderNumber,
      o.createdAt.substring(0, 10),
      `"${o.clientName.replace(/"/g, '""')}"`,
      o.clientPhone || 'N/A',
      o.paymentMethodName || 'General',
      `"${this.getCourierName(o)}"`,
      `${o.items.length} tipos`,
      this.getStatusLabelES(o.status),
      o.totalAmount
    ]);
    this.downloadCsv(`reporte_ventas_${now}.csv`, headers, rows);
    this.notification.success('Reporte Exportado', 'Archivo CSV descargado con éxito.');
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
