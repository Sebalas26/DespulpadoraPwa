import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { VoiceOrdersService } from '../../core/services/voice-orders.service';
import { GeocodingService, GeocodedLocation } from '../../core/services/geocoding.service';
import { OrderDto, OrderStatus } from '../../core/models/business.models';
import { DeliveryMapComponent } from './delivery-map.component';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, DeliveryMapComponent],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent {
  readonly stateService = inject(StateService);
  readonly notification = inject(NotificationService);
  readonly voiceOrdersService = inject(VoiceOrdersService);
  readonly geocodingService = inject(GeocodingService);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('deliveryMapRef') deliveryMapRef?: DeliveryMapComponent;

  constructor() {
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'] as 'picking' | 'facturacion' | 'despachos' | undefined;
      if (tab && ['picking', 'facturacion', 'despachos'].includes(tab)) {
        this.activeSubTab.set(tab);
      } else {
        this.activeSubTab.set('picking');
      }
      if (params['planner'] === 'true') {
        this.openPlannerFromParent();
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('open-route-planner', () => {
        this.openPlannerFromParent();
      });
      window.addEventListener('open-new-order-modal', () => {
        this.openCreateOrderModal();
      });
    }
  }

  openPlannerFromParent() {
    this.activeSubTab.set('despachos');
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (this.deliveryMapRef) {
        clearInterval(interval);
        this.deliveryMapRef.openRoutePlanner();
      } else if (attempts > 20) {
        clearInterval(interval);
      }
    }, 80);
  }

  // Active Sub-tab
  readonly activeSubTab = signal<'picking' | 'facturacion' | 'despachos'>('picking');

  // Weekly Picking Day Cards (Figma design)
  readonly weekDays = signal<{
    name: string;
    count: number;
    color: 'purple' | 'green' | 'blue' | 'cyan' | 'red';
    active: boolean;
    hasIndicator?: boolean;
  }[]>([
    { name: 'Lunes', count: 2, color: 'purple', active: false, hasIndicator: true },
    { name: 'Martes', count: 4, color: 'green', active: false },
    { name: 'Miércoles', count: 3, color: 'blue', active: false },
    { name: 'Jueves', count: 12, color: 'green', active: true },
    { name: 'Viernes', count: 5, color: 'cyan', active: false },
    { name: 'Sábado', count: 1, color: 'red', active: false },
    { name: 'Domingo', count: 8, color: 'green', active: true }
  ]);

  toggleDayCard(index: number) {
    this.weekDays.update(days =>
      days.map((d, i) => (i === index ? { ...d, active: !d.active } : d))
    );
  }

  // Search & Filter
  readonly searchTerm = signal<string>('');
  readonly statusFilter = signal<string>('all');

  readonly pickingOrdersCount = computed(() =>
    this.stateService.orders().filter(o => o.status === 'PENDING' || o.status === 'PICKING').length
  );
  readonly billedOrdersCount = computed(() =>
    this.stateService.orders().filter(o => o.status === 'BILLED').length
  );
  readonly dispatchedOrdersCount = computed(() =>
    this.stateService.orders().filter(o => o.status === 'DISPATCHED').length
  );

  // Aggregated Pulp Summary for Picking Toolbar
  readonly pulpSummaryText = computed(() => {
    const pickingOrders = this.stateService
      .orders()
      .filter(o => o.status === 'PENDING' || o.status === 'PICKING');

    const totalsMap = new Map<string, number>();
    pickingOrders.forEach(order => {
      order.items.forEach(item => {
        const key = `${item.fruitName} (${item.grammage}g)`;
        totalsMap.set(key, (totalsMap.get(key) || 0) + item.quantity);
      });
    });

    if (totalsMap.size === 0) {
      return '0 unidades pendientes en cava';
    }

    const parts: string[] = [];
    totalsMap.forEach((qty, label) => {
      parts.push(`${qty}x ${label}`);
    });

    return parts.join(', ') + '...';
  });

  // Modal Dialogs & Pro Invoice Studio State
  readonly showWhatsAppModal = signal<boolean>(false);
  readonly showNewOrderModal = signal<boolean>(false);
  readonly showInvoiceModal = signal<boolean>(false);
  readonly selectedOrderForInvoice = signal<OrderDto | null>(null);
  readonly invoiceFormat = signal<'a4' | 'pos'>('a4');
  readonly invoiceTaxRate = signal<number>(19); // Default 19% IVA as in DGL invoice
  readonly itemDiscounts = signal<Record<string, number>>({});

  // Selected order in the Facturación & POS studio view
  readonly activeBillingOrder = computed<OrderDto | null>(() => {
    const explicit = this.selectedOrderForInvoice();
    const list = this.tabOrders();
    if (explicit && list.some(o => o.orderId === explicit.orderId)) {
      return explicit;
    }
    return list[0] || this.stateService.orders()[0] || null;
  });

  // WhatsApp Simulator inputs
  readonly whatsAppText = signal<string>(`Hola DGL , requiero urgente para Restaurante El Portal de la 93:
- 10 pulpas de Maracuyá de 1000g
- 8 pulpas de Mango Tommy de 1000g
- 6 pulpas de Mora de 500g
Dirección: Calle 93A # 13-25, Bogotá Norte
Contacto: Chef Carlos Gómez (315 456 7890)
Pago por Transferencia Bancolombia`);

  // New Manual Order Form inputs
  readonly manualClientName = signal<string>('');
  readonly manualPhone = signal<string>('');
  readonly manualAddress = signal<string>('');
  readonly manualAddressSuggestions = signal<GeocodedLocation[]>([]);
  readonly selectedManualGeo = signal<GeocodedLocation | null>(null);
  readonly isSearchingManualAddress = signal<boolean>(false);
  private manualAddressDebounce?: any;
  readonly manualPaymentMethod = signal<string>('Transferencia Bancolombia');
  readonly manualNotes = signal<string>('');
  readonly manualItems = signal<{ fruitName: string; grammage: 140 | 250 | 500 | 1000; quantity: number; unitPrice: number }[]>([
    { fruitName: 'Maracuyá', grammage: 1000, quantity: 5, unitPrice: 11000 }
  ]);

  // Orders Filtered by Tab & Search
  readonly tabOrders = computed(() => {
    const tab = this.activeSubTab();
    const search = this.searchTerm().toLowerCase();
    let list = this.stateService.orders();

    if (tab === 'picking') {
      list = list.filter(o => o.status === 'PENDING' || o.status === 'PICKING');
    } else if (tab === 'facturacion') {
      const billedOrPicking = list.filter(o => o.status === 'BILLED' || o.status === 'PICKING');
      list = billedOrPicking.length > 0 ? billedOrPicking : list.filter(o => o.status !== 'CANCELLED');
    } else if (tab === 'despachos') {
      list = list.filter(o => o.status === 'DISPATCHED' || o.status === 'DELIVERED');
    }

    if (search) {
      list = list.filter(o =>
        o.orderNumber.toLowerCase().includes(search) ||
        o.clientName.toLowerCase().includes(search) ||
        o.clientPhone?.toLowerCase().includes(search)
      );
    }

    return list;
  });

  // Picking checklist toggle
  toggleItemPicked(orderId: number, fruitId: number, grammage: number, totalQty: number, currentPicked?: number) {
    const nextPicked = (currentPicked || 0) >= totalQty ? 0 : totalQty;
    this.stateService.updateItemPickedQuantity(orderId, fruitId, grammage, nextPicked);

    if (nextPicked === totalQty) {
      try {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      } catch { }
    }
  }

  advanceOrderStatus(order: OrderDto, nextStatus: OrderStatus) {
    this.stateService.updateOrderStatus(order.orderId, nextStatus);
    if (nextStatus === 'DELIVERED') {
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
      } catch { }
    }
  }

  // Invoice Selection & Modal Opener
  selectBillingOrder(order: OrderDto) {
    this.selectedOrderForInvoice.set(order);
  }

  openInvoice(order: OrderDto, format: 'a4' | 'pos' = 'a4') {
    this.selectedOrderForInvoice.set(order);
    this.invoiceFormat.set(format);
    this.showInvoiceModal.set(true);
  }

  printInvoice() {
    window.print();
  }

  // ==========================================
  // PRO CORPORATE INVOICE HELPERS (INV/2026/...)
  // ==========================================
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
    if (isNaN(d.getTime())) return '17/10/2026';
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

  // WhatsApp Parsing Engine
  parseAndCreateWhatsAppOrder() {
    const text = this.whatsAppText();
    let clientName = 'Cliente WhatsApp';
    let phone = '310 000 0000';
    let address = 'Sede Principal';

    const lines = text.split('\n');
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('para ') || lower.includes('nombre:') || lower.includes('contacto:')) {
        clientName = line.replace(/(hola|requiero|urgente|pedido|para|nombre:|contacto:)/gi, '').trim() || clientName;
      }
      if (lower.includes('dirección:') || lower.includes('calle') || lower.includes('carrera') || lower.includes('av')) {
        address = line.replace(/dirección:/gi, '').trim() || address;
      }
      const phoneMatch = line.match(/\b3\d{2}[- ]?\d{3}[- ]?\d{4}\b/);
      if (phoneMatch) phone = phoneMatch[0];
    });

    // Extract items
    const parsedItems: { fruitName: string; grammage: 140 | 250 | 500 | 1000; quantity: number; unitPrice: number }[] = [];

    this.stateService.fruits().forEach(fruit => {
      const baseName = fruit.name.split(' ')[0];
      const regex = new RegExp(`(\\d+)\\s*(pulpas?|unidades?|de)?\\s*(de)?\\s*${baseName}`, 'i');
      const match = text.match(regex);
      if (match) {
        const qty = parseInt(match[1], 10) || 5;
        let grammage: 140 | 250 | 500 | 1000 = 140;

        if (text.toLowerCase().includes(baseName.toLowerCase()) && text.toLowerCase().includes('1000g')) {
          grammage = 1000;
        } else if (text.toLowerCase().includes('500g')) {
          grammage = 500;
        } else if (text.toLowerCase().includes('250g')) {
          grammage = 250;
        }

        const priceKey = `g${grammage}` as 'g140' | 'g250' | 'g500' | 'g1000';
        const unitPrice = fruit.prices[priceKey] || 5000;

        parsedItems.push({
          fruitName: fruit.name,
          grammage,
          quantity: qty,
          unitPrice
        });
      }
    });

    if (parsedItems.length === 0) {
      // Fallback sample item
      parsedItems.push({
        fruitName: 'Maracuyá',
        grammage: 1000,
        quantity: 10,
        unitPrice: 11000
      });
    }

    this.stateService.createOrder({
      clientName,
      clientPhone: phone,
      clientAddress: address,
      items: parsedItems,
      notes: 'Pedido procesado automáticamente desde WhatsApp',
      paymentMethodName: 'Transferencia Bancolombia'
    });

    this.showWhatsAppModal.set(false);
    this.activeSubTab.set('picking');

    try {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    } catch { }
  }

  // Manual & Edit Order Management
  readonly editingOrderId = signal<number | null>(null);
  readonly editingOrderNumber = signal<string>('');

  readonly manualOrderTotal = computed(() =>
    this.manualItems().reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
  );

  openCreateOrderModal() {
    this.editingOrderId.set(null);
    this.editingOrderNumber.set('');
    this.manualClientName.set('');
    this.manualPhone.set('');
    this.manualAddress.set('');
    this.manualAddressSuggestions.set([]);
    this.selectedManualGeo.set(null);
    this.manualPaymentMethod.set('Transferencia Bancolombia');
    this.manualNotes.set('');
    this.manualItems.set([
      { fruitName: 'Maracuyá', grammage: 1000, quantity: 5, unitPrice: 11000 }
    ]);
    this.showNewOrderModal.set(true);
  }

  openEditOrderModal(order: OrderDto) {
    this.editingOrderId.set(order.orderId);
    this.editingOrderNumber.set(order.orderNumber);
    this.manualClientName.set(order.clientName || '');
    this.manualPhone.set(order.clientPhone || '');
    this.manualAddress.set(order.clientAddress || '');
    this.manualAddressSuggestions.set([]);
    this.selectedManualGeo.set(null);
    this.manualPaymentMethod.set(order.paymentMethodName || 'Transferencia Bancolombia');
    this.manualNotes.set(order.notes || '');
    this.manualItems.set(
      order.items.map(i => ({
        fruitName: i.fruitName || 'Maracuyá',
        grammage: (i.grammage as 140 | 250 | 500 | 1000) || 1000,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      }))
    );
    this.showNewOrderModal.set(true);
  }

  addManualItem() {
    this.manualItems.update(list => [
      ...list,
      { fruitName: 'Mango Tommy', grammage: 1000, quantity: 1, unitPrice: 10500 }
    ]);
  }

  removeManualItem(index: number) {
    this.manualItems.update(list => list.filter((_, i) => i !== index));
  }

  updateManualItemFruit(index: number, fruitName: string) {
    const fruit = this.stateService.fruits().find(f => f.name === fruitName);
    this.manualItems.update(list => list.map((item, i) => {
      if (i === index && fruit) {
        const pKey = `g${item.grammage}` as 'g140' | 'g250' | 'g500' | 'g1000';
        return { ...item, fruitName: fruit.name, unitPrice: fruit.prices[pKey] };
      }
      return item;
    }));
  }

  updateManualItemGrammage(index: number, grammage: 140 | 250 | 500 | 1000) {
    const numGram = Number(grammage) as 140 | 250 | 500 | 1000;
    this.manualItems.update(list => list.map((item, i) => {
      if (i === index) {
        const fruit = this.stateService.fruits().find(f => f.name === item.fruitName);
        const pKey = `g${numGram}` as 'g140' | 'g250' | 'g500' | 'g1000';
        const price = fruit ? fruit.prices[pKey] : item.unitPrice;
        return { ...item, grammage: numGram, unitPrice: price };
      }
      return item;
    }));
  }

  updateManualItemQuantity(index: number, qty: number) {
    const validQty = Math.max(1, Number(qty) || 1);
    this.manualItems.update(list => list.map((item, i) => (i === index ? { ...item, quantity: validQty } : item)));
  }

  updateManualItemPrice(index: number, price: number) {
    const validPrice = Math.max(0, Number(price) || 0);
    this.manualItems.update(list => list.map((item, i) => (i === index ? { ...item, unitPrice: validPrice } : item)));
  }

  onManualAddressChange(val: string) {
    this.manualAddress.set(val);
    this.selectedManualGeo.set(null);

    if (this.manualAddressDebounce) {
      clearTimeout(this.manualAddressDebounce);
    }

    const trimmed = (val || '').trim();
    if (trimmed.length < 3) {
      this.manualAddressSuggestions.set([]);
      this.isSearchingManualAddress.set(false);
      return;
    }

    this.isSearchingManualAddress.set(true);
    this.manualAddressDebounce = setTimeout(async () => {
      const results = await this.geocodingService.searchAddress(trimmed);
      this.manualAddressSuggestions.set(results);
      if (results.length > 0) {
        this.selectedManualGeo.set(results[0]);
      }
      this.isSearchingManualAddress.set(false);
    }, 280);
  }

  selectManualAddressSuggestion(loc: GeocodedLocation) {
    this.manualAddress.set(loc.label);
    this.selectedManualGeo.set(loc);
    this.manualAddressSuggestions.set([]);
  }

  submitManualOrder() {
    if (!this.manualClientName() || this.manualItems().length === 0) {
      this.notification.warning('Campos incompletos', 'Indique el nombre del cliente y al menos 1 producto');
      return;
    }

    const geo = this.selectedManualGeo();
    const finalAddress = geo ? geo.label : this.manualAddress();
    const editId = this.editingOrderId();

    if (editId !== null) {
      this.stateService.updateOrder(editId, {
        clientName: this.manualClientName(),
        clientPhone: this.manualPhone(),
        clientAddress: finalAddress,
        items: this.manualItems(),
        paymentMethodName: this.manualPaymentMethod(),
        notes: this.manualNotes()
      });
    } else {
      this.stateService.createOrder({
        clientName: this.manualClientName(),
        clientPhone: this.manualPhone(),
        clientAddress: finalAddress,
        items: this.manualItems(),
        paymentMethodName: this.manualPaymentMethod(),
        notes: this.manualNotes()
      });
    }

    this.showNewOrderModal.set(false);
    this.editingOrderId.set(null);
    this.editingOrderNumber.set('');
    this.manualClientName.set('');
    this.manualPhone.set('');
    this.manualAddress.set('');
    this.manualAddressSuggestions.set([]);
    this.selectedManualGeo.set(null);
  }

  deleteCurrentEditingOrder() {
    const editId = this.editingOrderId();
    if (editId !== null) {
      this.stateService.deleteOrder(editId);
      this.showNewOrderModal.set(false);
      this.editingOrderId.set(null);
      this.editingOrderNumber.set('');
    }
  }

  formatCOP(val: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  }
}
