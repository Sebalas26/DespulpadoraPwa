import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { VoiceOrdersService } from '../../core/services/voice-orders.service';
import { GeocodingService, GeocodedLocation } from '../../core/services/geocoding.service';
import { EmployeeDto, FruitConfig, OrderDto, OrderItemDto, OrderStatus } from '../../core/models/business.models';
import { DeliveryMapComponent } from './delivery-map.component';
import { CopCurrencyInputDirective } from '../../shared/directives/cop-currency-input.directive';
import confetti from 'canvas-confetti';
import * as L from 'leaflet';

/**
 * Represents a courier entry in the order dispatch catalog.
 */
export interface CourierCatalogEntry {
  id: string;
  name: string;
  vehicleType: 'moto' | 'furgon';
  vehiclePlate: string;
  vehicleModel: string;
  phone: string;
  color: string;
  colorLight: string;
  routeCode: string;
}

/**
 * Represents a line item in the manual order form.
 */
export interface ManualOrderFormItem {
  fruitName: string;
  grammage: 140 | 250 | 500 | 1000;
  quantity: number;
  unitPrice: number;
}

/**
 * Represents a known client suggestion entry for autocomplete.
 */
export interface ClientSuggestionEntry {
  fullName: string;
  phone: string;
  address: string;
}

/**
 * Component responsible for managing orders, weekly picking, billing studio, and delivery dispatches.
 */
@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, DeliveryMapComponent, CopCurrencyInputDirective],
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

  readonly activeSubTab = signal<'picking' | 'facturacion' | 'despachos'>('picking');
  readonly expandedMobileCards = signal<Record<string, boolean>>({});

  readonly weekDayConfigs: Array<{
    name: string;
    color: 'purple' | 'green' | 'blue' | 'cyan' | 'red';
  }> = [
    { name: 'Lunes', color: 'purple' },
    { name: 'Martes', color: 'green' },
    { name: 'Miércoles', color: 'blue' },
    { name: 'Jueves', color: 'green' },
    { name: 'Viernes', color: 'cyan' },
    { name: 'Sábado', color: 'red' },
    { name: 'Domingo', color: 'green' }
  ];

  readonly selectedDay = signal<string>('Jueves');
  readonly draggingOrderId = signal<number | null>(null);
  readonly dragOverDay = signal<string | null>(null);

  readonly searchTerm = signal<string>('');
  readonly statusFilter = signal<string>('all');

  readonly showWhatsAppModal = signal<boolean>(false);
  readonly showNewOrderModal = signal<boolean>(false);
  readonly showInvoiceModal = signal<boolean>(false);
  readonly selectedOrderForInvoice = signal<OrderDto | null>(null);
  readonly invoiceFormat = signal<'a4' | 'pos'>('a4');
  readonly invoiceTaxRate = signal<number>(19);
  readonly itemDiscounts = signal<Record<string, number>>({});

  readonly whatsAppText = signal<string>('');

  readonly manualClientName = signal<string>('');
  readonly manualPhone = signal<string>('');
  readonly manualAddress = signal<string>('');
  readonly manualAddressSuggestions = signal<GeocodedLocation[]>([]);
  readonly selectedManualGeo = signal<GeocodedLocation | null>(null);
  readonly isSearchingManualAddress = signal<boolean>(false);
  private manualAddressDebounce?: ReturnType<typeof setTimeout>;
  readonly isManualOrderPaid = signal<boolean>(false);
  readonly manualPaymentMethod = signal<string>('');
  readonly activePaymentMethods = computed(() => {
    try {
      return this.stateService.activePaymentMethods();
    } catch (error: unknown) {
      console.error('Error computing active payment methods:', error);
      return [];
    }
  });
  readonly manualNotes = signal<string>('');
  readonly manualItems = signal<ManualOrderFormItem[]>([]);

  readonly showClientSuggestions = signal<boolean>(false);

  readonly showAddressMapPickerModal = signal<boolean>(false);
  readonly pickerSearchText = signal<string>('');
  readonly pickerCurrentAddress = signal<string>('');
  readonly pickerCurrentZone = signal<string>('');
  readonly pickerCurrentLat = signal<number>(4.6750);
  readonly pickerCurrentLng = signal<number>(-74.0550);
  private pickerMap?: L.Map;
  private pickerMarker?: L.Marker;
  readonly isReverseGeocoding = signal<boolean>(false);

  readonly historyFilter = signal<'ALL' | 'DELIVERED' | 'DISPATCHED' | 'UNASSIGNED'>('ALL');
  readonly historySearchQuery = signal<string>('');
  readonly historyCurrentPage = signal<number>(1);
  readonly historyPageSize = signal<number>(10);

  readonly showOrderViewModal = signal<boolean>(false);
  readonly selectedOrderForView = signal<OrderDto | null>(null);

  readonly editingOrderId = signal<number | null>(null);
  readonly editingOrderNumber = signal<string>('');

  readonly weekDays = computed(() => {
    try {
      const pickingOrders = this.stateService
        .orders()
        .filter((o: OrderDto) => o.status === 'PENDING' || o.status === 'PICKING');
      const activeDay = this.selectedDay();

      return this.weekDayConfigs.map(cfg => {
        const count = pickingOrders.filter((o: OrderDto) => this.getOrderDay(o) === cfg.name).length;
        const active = activeDay === cfg.name;
        return {
          name: cfg.name,
          count,
          color: cfg.color,
          active,
          hasIndicator: count > 0
        };
      });
    } catch (error: unknown) {
      console.error('Error computing week days:', error);
      return [];
    }
  });

  readonly pickingOrdersCount = computed<number>(() => {
    try {
      return this.stateService.orders().filter((o: OrderDto) => o.status === 'PENDING' || o.status === 'PICKING').length;
    } catch (error: unknown) {
      console.error('Error computing picking orders count:', error);
      return 0;
    }
  });

  readonly billedOrdersCount = computed<number>(() => {
    try {
      return this.stateService.orders().filter((o: OrderDto) => o.status === 'BILLED').length;
    } catch (error: unknown) {
      console.error('Error computing billed orders count:', error);
      return 0;
    }
  });

  readonly dispatchedOrdersCount = computed<number>(() => {
    try {
      return this.stateService.orders().filter((o: OrderDto) => o.status === 'DISPATCHED').length;
    } catch (error: unknown) {
      console.error('Error computing dispatched orders count:', error);
      return 0;
    }
  });

  readonly pulpSummaryText = computed<string>(() => {
    try {
      const activeDay = this.selectedDay();
      const pickingOrders = this.stateService
        .orders()
        .filter(
          (o: OrderDto) =>
            (o.status === 'PENDING' || o.status === 'PICKING') &&
            this.getOrderDay(o) === activeDay
        );

      const totalsMap = new Map<string, number>();
      pickingOrders.forEach((order: OrderDto) => {
        order.items.forEach((item: OrderItemDto) => {
          const key = `${item.fruitName} (${item.grammage}g)`;
          totalsMap.set(key, (totalsMap.get(key) || 0) + item.quantity);
        });
      });

      if (totalsMap.size === 0) {
        return `0 unidades pendientes para ${activeDay}`;
      }

      const parts: string[] = [];
      totalsMap.forEach((qty: number, label: string) => {
        parts.push(`${qty}x ${label}`);
      });

      return parts.join(', ') + '...';
    } catch (error: unknown) {
      console.error('Error computing pulp summary text:', error);
      return '';
    }
  });

  readonly activeBillingOrder = computed<OrderDto | null>(() => {
    try {
      const explicit = this.selectedOrderForInvoice();
      const list = this.tabOrders();
      if (explicit && list.some((o: OrderDto) => o.orderId === explicit.orderId)) {
        return explicit;
      }
      return list[0] || this.stateService.orders()[0] || null;
    } catch (error: unknown) {
      console.error('Error computing active billing order:', error);
      return null;
    }
  });

  readonly allKnownClients = computed<ClientSuggestionEntry[]>(() => {
    try {
      const map = new Map<string, ClientSuggestionEntry>();
      this.stateService.clients().forEach(c => {
        if (c.fullName) {
          map.set(c.fullName.toLowerCase().trim(), {
            fullName: c.fullName,
            phone: c.phone || '',
            address: c.address || ''
          });
        }
      });
      this.stateService.orders().forEach((o: OrderDto) => {
        if (o.clientName) {
          const key = o.clientName.toLowerCase().trim();
          if (!map.has(key)) {
            map.set(key, {
              fullName: o.clientName,
              phone: o.clientPhone || '',
              address: o.clientAddress || ''
            });
          }
        }
      });
      return Array.from(map.values());
    } catch (error: unknown) {
      console.error('Error computing all known clients:', error);
      return [];
    }
  });

  readonly filteredClientSuggestions = computed<ClientSuggestionEntry[]>(() => {
    try {
      const query = this.manualClientName().trim().toLowerCase();
      if (!query) return [];
      return this.allKnownClients().filter((c: ClientSuggestionEntry) =>
        c.fullName.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query) ||
        c.address.toLowerCase().includes(query)
      );
    } catch (error: unknown) {
      console.error('Error computing filtered client suggestions:', error);
      return [];
    }
  });

  readonly isManualOrderValid = computed<boolean>(() => {
    try {
      const nameOk = this.manualClientName().trim().length >= 2;
      const phoneOk = this.manualPhone().trim().length >= 7;
      const addrOk = this.manualAddress().trim().length >= 3;
      const items = this.manualItems();
      const itemsOk = items.length > 0 && items.every((it: ManualOrderFormItem) => Number(it.quantity) > 0 && Number(it.unitPrice) > 0);
      const paidOk = !this.isManualOrderPaid() || (this.manualPaymentMethod().trim().length > 0);
      return nameOk && phoneOk && addrOk && itemsOk && paidOk;
    } catch (error: unknown) {
      console.error('Error computing manual order validity:', error);
      return false;
    }
  });

  readonly tabOrders = computed<OrderDto[]>(() => {
    try {
      const tab = this.activeSubTab();
      const search = this.searchTerm().toLowerCase();
      const activeDay = this.selectedDay();
      let list = this.stateService.orders();

      if (tab === 'picking') {
        list = list.filter(
          (o: OrderDto) =>
            (o.status === 'PENDING' || o.status === 'PICKING') &&
            this.getOrderDay(o) === activeDay
        );
      } else if (tab === 'facturacion') {
        const billedOrPicking = list.filter((o: OrderDto) => o.status === 'BILLED' || o.status === 'PICKING');
        list = billedOrPicking.length > 0 ? billedOrPicking : list.filter((o: OrderDto) => o.status !== 'CANCELLED');
      } else if (tab === 'despachos') {
        list = list.filter((o: OrderDto) => o.status === 'DISPATCHED' || o.status === 'DELIVERED');
      }

      if (search) {
        list = list.filter((o: OrderDto) =>
          o.orderNumber.toLowerCase().includes(search) ||
          o.clientName.toLowerCase().includes(search) ||
          o.clientPhone?.toLowerCase().includes(search)
        );
      }

      return list;
    } catch (error: unknown) {
      console.error('Error computing tab orders:', error);
      return [];
    }
  });

  readonly allHistoryOrders = computed<OrderDto[]>(() => {
    try {
      return this.stateService.orders().filter((o: OrderDto) => o.status !== 'CANCELLED');
    } catch (error: unknown) {
      console.error('Error computing all history orders:', error);
      return [];
    }
  });

  readonly totalHistoryOrdersCount = computed<number>(() => {
    try {
      return this.allHistoryOrders().length;
    } catch (error: unknown) {
      console.error('Error computing total history orders count:', error);
      return 0;
    }
  });

  readonly deliveredHistoryOrdersCount = computed<number>(() => {
    try {
      return this.allHistoryOrders().filter((o: OrderDto) => o.status === 'DELIVERED').length;
    } catch (error: unknown) {
      console.error('Error computing delivered history orders count:', error);
      return 0;
    }
  });

  readonly inTransitHistoryOrdersCount = computed<number>(() => {
    try {
      return this.allHistoryOrders().filter((o: OrderDto) => o.status === 'DISPATCHED').length;
    } catch (error: unknown) {
      console.error('Error computing in-transit history orders count:', error);
      return 0;
    }
  });

  readonly unassignedHistoryOrdersCount = computed<number>(() => {
    try {
      return this.allHistoryOrders().filter((o: OrderDto) => o.status !== 'DELIVERED' && o.status !== 'DISPATCHED').length;
    } catch (error: unknown) {
      console.error('Error computing unassigned history orders count:', error);
      return 0;
    }
  });

  readonly totalDeliveredCash = computed<number>(() => {
    try {
      return this.allHistoryOrders()
        .filter((o: OrderDto) => o.status === 'DELIVERED')
        .reduce((sum: number, o: OrderDto) => sum + (o.totalAmount || 0), 0);
    } catch (error: unknown) {
      console.error('Error computing total delivered cash:', error);
      return 0;
    }
  });

  readonly totalDayExpectedCash = computed<number>(() => {
    try {
      return this.allHistoryOrders().reduce((sum: number, o: OrderDto) => sum + (o.totalAmount || 0), 0);
    } catch (error: unknown) {
      console.error('Error computing total day expected cash:', error);
      return 0;
    }
  });

  readonly filteredHistoryOrders = computed<OrderDto[]>(() => {
    try {
      const filter = this.historyFilter();
      const query = this.historySearchQuery().trim().toLowerCase();
      let list = this.allHistoryOrders();

      if (filter === 'DELIVERED') {
        list = list.filter((o: OrderDto) => o.status === 'DELIVERED');
      } else if (filter === 'DISPATCHED') {
        list = list.filter((o: OrderDto) => o.status === 'DISPATCHED');
      } else if (filter === 'UNASSIGNED') {
        list = list.filter((o: OrderDto) => o.status !== 'DELIVERED' && o.status !== 'DISPATCHED');
      }

      if (query) {
        list = list.filter((o: OrderDto) => {
          const courier = this.getCourierForOrder(o);
          const orderNum = o.orderNumber ? o.orderNumber.toLowerCase() : '';
          const client = o.clientName ? o.clientName.toLowerCase() : '';
          const addr = o.clientAddress ? o.clientAddress.toLowerCase() : '';
          const phone = o.clientPhone ? o.clientPhone.toLowerCase() : '';
          const courierName = courier?.name?.toLowerCase() || '';
          const routeCode = courier?.routeCode?.toLowerCase() || '';
          const plate = courier?.vehiclePlate?.toLowerCase() || '';
          return (
            orderNum.includes(query) ||
            client.includes(query) ||
            addr.includes(query) ||
            phone.includes(query) ||
            courierName.includes(query) ||
            routeCode.includes(query) ||
            plate.includes(query)
          );
        });
      }

      return list;
    } catch (error: unknown) {
      console.error('Error computing filtered history orders:', error);
      return [];
    }
  });

  readonly historyTotalPages = computed<number>(() => {
    try {
      const total = this.filteredHistoryOrders().length;
      return Math.max(1, Math.ceil(total / this.historyPageSize()));
    } catch (error: unknown) {
      console.error('Error computing history total pages:', error);
      return 1;
    }
  });

  readonly paginatedHistoryOrders = computed<OrderDto[]>(() => {
    try {
      const list = this.filteredHistoryOrders();
      const page = this.historyCurrentPage();
      const size = this.historyPageSize();
      const start = (page - 1) * size;
      return list.slice(start, start + size);
    } catch (error: unknown) {
      console.error('Error computing paginated history orders:', error);
      return [];
    }
  });

  readonly historyPaginationInfo = computed<{ start: number; end: number; total: number }>(() => {
    try {
      const total = this.filteredHistoryOrders().length;
      const page = this.historyCurrentPage();
      const size = this.historyPageSize();
      if (total === 0) return { start: 0, end: 0, total: 0 };
      const start = (page - 1) * size + 1;
      const end = Math.min(page * size, total);
      return { start, end, total };
    } catch (error: unknown) {
      console.error('Error computing history pagination info:', error);
      return { start: 0, end: 0, total: 0 };
    }
  });

  readonly historyPagesList = computed<number[]>(() => {
    const total = this.historyTotalPages();
    const pages: number[] = [];
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
    return pages;
  });

  readonly manualOrderTotal = computed<number>(() =>
    this.manualItems().reduce((sum: number, item: ManualOrderFormItem) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
  );

  /**
   * Initializes route query param subscriptions and window event listeners.
   */
  constructor() {
    try {
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
    } catch (error: unknown) {
      console.error('Error initializing OrdersComponent:', error);
    }
  }

  /**
   * Dynamically derives available couriers from active delivery employees in StateService.
   */
  get COURIER_CATALOG(): CourierCatalogEntry[] {
    try {
      const palette: Array<{ color: string; colorLight: string }> = [
        { color: '#10b981', colorLight: '#ecfdf5' },
        { color: '#3b82f6', colorLight: '#eff6ff' },
        { color: '#f59e0b', colorLight: '#fffbeb' },
        { color: '#8b5cf6', colorLight: '#f5f3ff' }
      ];
      return this.stateService
        .employees()
        .filter((emp: EmployeeDto) => emp.area === 'DOMICILIOS')
        .map((emp: EmployeeDto, idx: number) => {
          const colors = palette[idx % palette.length];
          return {
            id: `c${emp.id}`,
            name: emp.fullName || emp.name || '',
            vehicleType: 'moto',
            vehiclePlate: emp.documentNumber || '',
            vehicleModel: emp.position || '',
            phone: emp.phone || '',
            color: colors.color,
            colorLight: colors.colorLight,
            routeCode: ''
          };
        });
    } catch (error: unknown) {
      console.error('Error deriving COURIER_CATALOG:', error);
      return [];
    }
  }

  /**
   * Switches to the dispatches tab and opens the delivery map route planner.
   */
  openPlannerFromParent(): void {
    try {
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
    } catch (error: unknown) {
      console.error('Error opening planner from parent:', error);
    }
  }

  /**
   * Toggles the expanded state of a collapsible mobile card.
   */
  toggleMobileCard(key: string, event?: Event): void {
    try {
      if (event) {
        event.stopPropagation();
      }
      this.expandedMobileCards.update(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    } catch (error: unknown) {
      console.error('Error toggling mobile card:', error);
    }
  }

  /**
   * Checks whether a collapsible mobile card is expanded.
   */
  isMobileCardExpanded(key: string): boolean {
    try {
      return !!this.expandedMobileCards()[key];
    } catch (error: unknown) {
      console.error('Error checking mobile card state:', error);
      return false;
    }
  }

  /**
   * Returns the scheduled day of the week for an order.
   */
  getOrderDay(order: OrderDto): string {
    try {
      return order.scheduledDay || '';
    } catch (error: unknown) {
      console.error('Error getting order day:', error);
      return '';
    }
  }

  /**
   * Selects a weekday card by its index.
   */
  toggleDayCard(index: number): void {
    try {
      const target = this.weekDayConfigs[index];
      if (target) {
        this.selectedDay.set(target.name);
      }
    } catch (error: unknown) {
      console.error('Error toggling day card:', error);
    }
  }

  /**
   * Starts dragging an order card to reschedule its picking day.
   */
  onOrderDragStart(event: DragEvent, order: OrderDto): void {
    try {
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(order.orderId));

        if (typeof document !== 'undefined') {
          const ghost = document.createElement('div');
          ghost.style.cssText = [
            'position: fixed',
            'top: -1000px',
            'left: -1000px',
            'width: 220px',
            'padding: 10px 14px',
            'background: #ffffff',
            'border: 2px solid #7c3aed',
            'border-left: 6px solid #7c3aed',
            'border-radius: 12px',
            'box-shadow: 0 12px 28px rgba(15, 23, 42, 0.22)',
            'font-family: Inter, system-ui, sans-serif',
            'pointer-events: none',
            'z-index: 99999'
          ].join(';');

          const topRow = document.createElement('div');
          topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:3px;';

          const codeEl = document.createElement('span');
          codeEl.style.cssText = 'font-size:11px;font-weight:800;color:#7c3aed;';
          codeEl.textContent = `${order.orderNumber}`;

          const totalEl = document.createElement('span');
          totalEl.style.cssText = 'font-size:11px;font-weight:800;color:#1e5e3a;';
          totalEl.textContent = this.formatCOP(order.totalAmount);

          topRow.appendChild(codeEl);
          topRow.appendChild(totalEl);

          const clientEl = document.createElement('div');
          clientEl.style.cssText = 'font-size:12.5px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
          clientEl.textContent = order.clientName;

          ghost.appendChild(topRow);
          ghost.appendChild(clientEl);
          document.body.appendChild(ghost);

          event.dataTransfer.setDragImage(ghost, 110, 26);
          setTimeout(() => ghost.remove(), 0);
        }
      }

      setTimeout(() => {
        this.draggingOrderId.set(order.orderId);
      }, 0);
    } catch (error: unknown) {
      console.error('Error starting order drag:', error);
    }
  }

  /**
   * Resets drag state when dragging ends.
   */
  onOrderDragEnd(): void {
    try {
      this.draggingOrderId.set(null);
      this.dragOverDay.set(null);
    } catch (error: unknown) {
      console.error('Error ending order drag:', error);
    }
  }

  /**
   * Handles drag enter on a weekday bucket.
   */
  onDayDragEnter(event: DragEvent, dayName: string): void {
    try {
      event.preventDefault();
      if (this.draggingOrderId() !== null) {
        this.dragOverDay.set(dayName);
      }
    } catch (error: unknown) {
      console.error('Error on day drag enter:', error);
    }
  }

  /**
   * Handles drag over on a weekday bucket.
   */
  onDayDragOver(event: DragEvent, dayName: string): void {
    try {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      if (this.dragOverDay() !== dayName) {
        this.dragOverDay.set(dayName);
      }
    } catch (error: unknown) {
      console.error('Error on day drag over:', error);
    }
  }

  /**
   * Handles drag leave from a weekday bucket.
   */
  onDayDragLeave(event: DragEvent, dayName: string): void {
    try {
      const current = event.currentTarget as HTMLElement | null;
      const related = event.relatedTarget as Node | null;
      if (current && related && current.contains(related)) {
        return;
      }
      if (this.dragOverDay() === dayName) {
        this.dragOverDay.set(null);
      }
    } catch (error: unknown) {
      console.error('Error on day drag leave:', error);
    }
  }

  /**
   * Assigns the dropped order to the target weekday.
   */
  onDayDrop(event: DragEvent, dayName: string): void {
    try {
      event.preventDefault();
      event.stopPropagation();
      const rawId = event.dataTransfer?.getData('text/plain');
      const orderId = this.draggingOrderId() || (rawId ? Number(rawId) : null);
      this.draggingOrderId.set(null);
      this.dragOverDay.set(null);

      if (!orderId) return;
      const order = this.stateService.orders().find((o: OrderDto) => o.orderId === orderId);
      if (!order) return;

      if (this.getOrderDay(order) === dayName) {
        return;
      }

      this.stateService.updateOrderScheduledDay(orderId, dayName);
    } catch (error: unknown) {
      console.error('Error dropping order on day:', error);
    }
  }

  /**
   * Updates client name input and opens autocomplete suggestions.
   */
  onClientNameInput(val: string): void {
    try {
      this.manualClientName.set(val);
      this.showClientSuggestions.set(true);
    } catch (error: unknown) {
      console.error('Error on client name input:', error);
    }
  }

  /**
   * Shows client suggestions when the client name input is focused.
   */
  onClientNameFocus(): void {
    try {
      if (this.manualClientName().trim().length >= 1) {
        this.showClientSuggestions.set(true);
      }
    } catch (error: unknown) {
      console.error('Error on client name focus:', error);
    }
  }

  /**
   * Populates the manual order form with the selected client suggestion.
   */
  selectClientSuggestion(client: ClientSuggestionEntry): void {
    try {
      this.manualClientName.set(client.fullName);
      if (client.phone) {
        this.manualPhone.set(client.phone);
      }
      if (client.address) {
        this.manualAddress.set(client.address);
        this.geocodingService.geocodeBestMatch(client.address).then((geo: GeocodedLocation | null) => {
          if (geo) {
            this.selectedManualGeo.set(geo);
          }
        }).catch((err: unknown) => {
          console.error('Error geocoding client address:', err);
        });
      }
      this.showClientSuggestions.set(false);
    } catch (error: unknown) {
      console.error('Error selecting client suggestion:', error);
    }
  }

  /**
   * Clears the manual client name field and hides suggestions.
   */
  clearClientNameInput(): void {
    try {
      this.manualClientName.set('');
      this.showClientSuggestions.set(false);
    } catch (error: unknown) {
      console.error('Error clearing client name input:', error);
    }
  }

  /**
   * Hides client autocomplete suggestions after a brief timeout.
   */
  hideClientSuggestionsWithDelay(): void {
    try {
      setTimeout(() => {
        this.showClientSuggestions.set(false);
      }, 250);
    } catch (error: unknown) {
      console.error('Error hiding client suggestions:', error);
    }
  }

  /**
   * Opens the interactive map address picker modal.
   */
  openMapAddressPicker(): void {
    try {
      const currentGeo = this.selectedManualGeo();
      if (currentGeo) {
        this.pickerCurrentLat.set(currentGeo.lat);
        this.pickerCurrentLng.set(currentGeo.lng);
        this.pickerCurrentAddress.set(currentGeo.label || currentGeo.name);
        this.pickerCurrentZone.set(currentGeo.zone);
        this.pickerSearchText.set(currentGeo.label || currentGeo.name);
      } else {
        this.pickerCurrentLat.set(4.6750);
        this.pickerCurrentLng.set(-74.0550);
        this.pickerCurrentAddress.set(this.manualAddress());
        this.pickerCurrentZone.set('');
        this.pickerSearchText.set(this.manualAddress());
      }

      this.showAddressMapPickerModal.set(true);

      setTimeout(() => {
        this.initPickerMap();
      }, 120);
    } catch (error: unknown) {
      console.error('Error opening map address picker:', error);
    }
  }

  /**
   * Closes the map address picker modal and cleans up the Leaflet map instance.
   */
  closeMapAddressPicker(): void {
    try {
      this.showAddressMapPickerModal.set(false);
      if (this.pickerMap) {
        this.pickerMap.remove();
        this.pickerMap = undefined;
        this.pickerMarker = undefined;
      }
    } catch (error: unknown) {
      console.error('Error closing map address picker:', error);
    }
  }

  /**
   * Initializes the Leaflet map inside the address picker modal.
   */
  private initPickerMap(): void {
    try {
      const container = document.getElementById('picker-leaflet-map');
      if (!container) return;

      if (this.pickerMap) {
        this.pickerMap.remove();
        this.pickerMap = undefined;
      }

      const lat = this.pickerCurrentLat();
      const lng = this.pickerCurrentLng();

      this.pickerMap = L.map(container, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true
      });

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 20,
        maxNativeZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap'
      }).addTo(this.pickerMap);
      this.pickerMap.getContainer().style.backgroundColor = '#f4f6f8';

      const customIcon = L.divIcon({
        className: 'picker-pin-wrapper',
        html: `
          <div class="picker-pin-bubble" style="display:flex;align-items:center;justify-content:center;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
            </svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      });

      this.pickerMarker = L.marker([lat, lng], {
        icon: customIcon,
        draggable: true
      }).addTo(this.pickerMap);

      this.pickerMarker.on('dragend', (e: L.DragEndEvent) => {
        const marker = e.target as L.Marker;
        const pos = marker.getLatLng();
        this.updatePickerCoords(pos.lat, pos.lng, true);
      });

      this.pickerMap.on('click', (e: L.LeafletMouseEvent) => {
        this.pickerMarker?.setLatLng(e.latlng);
        this.updatePickerCoords(e.latlng.lat, e.latlng.lng, true);
      });

      setTimeout(() => {
        this.pickerMap?.invalidateSize();
      }, 250);
    } catch (error: unknown) {
      console.error('Error initializing picker map:', error);
    }
  }

  /**
   * Updates the selected coordinates in the picker and optionally reverse-geocodes them.
   */
  async updatePickerCoords(lat: number, lng: number, doReverseGeocode: boolean = true): Promise<void> {
    try {
      this.pickerCurrentLat.set(lat);
      this.pickerCurrentLng.set(lng);
      const zone = this.geocodingService.detectBogotaZone(lat, lng);
      this.pickerCurrentZone.set(zone);

      if (doReverseGeocode) {
        this.isReverseGeocoding.set(true);
        try {
          const label = await this.geocodingService.reverseGeocodeLabel(lat, lng);
          if (label) {
            this.pickerCurrentAddress.set(label);
            this.pickerSearchText.set(label);
          } else {
            this.pickerCurrentAddress.set(`Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        } catch {
          this.pickerCurrentAddress.set(`Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } finally {
          this.isReverseGeocoding.set(false);
        }
      }
    } catch (error: unknown) {
      console.error('Error updating picker coordinates:', error);
    }
  }

  /**
   * Searches for an address inside the map picker modal.
   */
  async searchPickerAddress(): Promise<void> {
    try {
      const text = this.pickerSearchText().trim();
      if (text.length < 3) return;

      this.isReverseGeocoding.set(true);
      try {
        const results = await this.geocodingService.searchAddress(text);
        if (results && results.length > 0) {
          const top = results[0];
          this.pickerCurrentLat.set(top.lat);
          this.pickerCurrentLng.set(top.lng);
          this.pickerCurrentAddress.set(top.label);
          this.pickerCurrentZone.set(top.zone);

          if (this.pickerMap) {
            this.pickerMap.flyTo([top.lat, top.lng], 16, { animate: true, duration: 0.8 });
            this.pickerMarker?.setLatLng([top.lat, top.lng]);
          }
        } else {
          this.notification.warning('No se encontró la dirección', 'Intenta con una dirección más detallada o toca en el mapa.');
        }
      } finally {
        this.isReverseGeocoding.set(false);
      }
    } catch (error: unknown) {
      console.error('Error searching picker address:', error);
    }
  }

  /**
   * Confirms the selected map point and sets the manual order address and coordinates.
   */
  confirmPickerSelection(): void {
    try {
      const lat = this.pickerCurrentLat();
      const lng = this.pickerCurrentLng();
      const address = this.pickerCurrentAddress() || `Punto GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
      const zone = this.pickerCurrentZone();

      this.manualAddress.set(address);
      this.selectedManualGeo.set({
        id: `picked_${lat.toFixed(5)}_${lng.toFixed(5)}`,
        name: address,
        label: address,
        lat,
        lng,
        zone,
        locality: zone,
        source: 'coords',
        confidence: 1.0
      });

      this.closeMapAddressPicker();
      this.notification.success('Ubicación Georreferenciada', `${address} · ${zone}`);
    } catch (error: unknown) {
      console.error('Error confirming picker selection:', error);
    }
  }

  /**
   * Toggles the picked quantity of an order item during warehouse picking.
   */
  toggleItemPicked(orderId: number, fruitId: number, grammage: number, totalQty: number, currentPicked?: number): void {
    try {
      const nextPicked = (currentPicked || 0) >= totalQty ? 0 : totalQty;
      this.stateService.updateItemPickedQuantity(orderId, fruitId, grammage, nextPicked);

      if (nextPicked === totalQty) {
        try {
          confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
        } catch {
          return;
        }
      }
    } catch (error: unknown) {
      console.error('Error toggling item picked:', error);
    }
  }

  /**
   * Advances an order to its next lifecycle status.
   */
  advanceOrderStatus(order: OrderDto, nextStatus: OrderStatus): void {
    try {
      this.stateService.updateOrderStatus(order.orderId, nextStatus);
      if (nextStatus === 'DELIVERED') {
        try {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
        } catch {
          void 0;
        }
        if (this.deliveryMapRef) {
          this.deliveryMapRef.markOrderDeliveredByOrderNumber(order.orderNumber);
        }
      }
    } catch (error: unknown) {
      console.error('Error advancing order status:', error);
    }
  }

  /**
   * Sets the current page of the delivery history table.
   */
  setHistoryPage(page: number): void {
    try {
      if (page >= 1 && page <= this.historyTotalPages()) {
        this.historyCurrentPage.set(page);
      }
    } catch (error: unknown) {
      console.error('Error setting history page:', error);
    }
  }

  /**
   * Updates the active filter for the delivery history table.
   */
  setHistoryFilter(filter: 'ALL' | 'DELIVERED' | 'DISPATCHED' | 'UNASSIGNED'): void {
    try {
      this.historyFilter.set(filter);
      this.historyCurrentPage.set(1);
    } catch (error: unknown) {
      console.error('Error setting history filter:', error);
    }
  }

  /**
   * Updates the search query for the delivery history table.
   */
  setHistorySearchQuery(query: string): void {
    try {
      this.historySearchQuery.set(query);
      this.historyCurrentPage.set(1);
    } catch (error: unknown) {
      console.error('Error setting history search query:', error);
    }
  }

  /**
   * Resolves the courier assigned to an order without hardcoded fallbacks.
   */
  getCourierForOrder(order: OrderDto): CourierCatalogEntry | null {
    try {
      if (order.courierName && order.courierName.trim() !== '') {
        const assigned = order.courierName.trim();
        if (assigned.toLowerCase() === 'sin asignar') {
          return null;
        }
        const match = this.COURIER_CATALOG.find((c: CourierCatalogEntry) =>
          c.name.toLowerCase().includes(assigned.toLowerCase()) ||
          assigned.toLowerCase().includes(c.name.toLowerCase())
        );
        if (match) return match;
        return {
          id: 'assigned',
          name: assigned,
          vehicleType: 'moto',
          vehiclePlate: '',
          vehicleModel: '',
          phone: '',
          color: '#10b981',
          colorLight: '#ecfdf5',
          routeCode: ''
        };
      }

      if (this.deliveryMapRef) {
        const couriers = this.deliveryMapRef.couriers();
        const c = couriers.find(courier => courier.orderIds.includes(order.orderId));
        if (c) {
          return {
            id: c.id,
            name: c.name,
            vehicleType: c.vehicleType,
            vehiclePlate: c.vehiclePlate,
            vehicleModel: c.vehicleModel,
            phone: c.phone || '',
            color: c.color,
            colorLight: c.colorLight,
            routeCode: c.routeCode || ''
          };
        }
      }

      return null;
    } catch (error: unknown) {
      console.error('Error resolving courier for order:', error);
      return null;
    }
  }

  /**
   * Assigns a courier from the catalog to an order and updates its dispatch status.
   */
  assignCourierToOrder(order: OrderDto, courierId: string): void {
    try {
      const courier = this.COURIER_CATALOG.find((c: CourierCatalogEntry) => c.id === courierId);
      if (!courier) return;

      this.stateService.orders.update(orders =>
        orders.map((o: OrderDto) => (o.orderId === order.orderId ? {
          ...o,
          courierName: courier.name,
          status: o.status === 'DELIVERED' ? 'DELIVERED' : 'DISPATCHED'
        } : o))
      );

      if (this.deliveryMapRef) {
        this.deliveryMapRef.assignOrderToCourierByOrderNumber(order.orderNumber, courierId);
      }

      this.notification.success(
        'Domiciliario Asignado',
        `Guía ${order.orderNumber} asignada a ${courier.name}`
      );
    } catch (error: unknown) {
      console.error('Error assigning courier to order:', error);
    }
  }

  /**
   * Centers and locates an order on the delivery map.
   */
  locateOrderInMap(order: OrderDto): void {
    try {
      if (this.deliveryMapRef) {
        this.deliveryMapRef.locateOrderOnMap(order.orderNumber);
        const mapEl = document.getElementById('bogota-cundinamarca-map');
        if (mapEl) {
          mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    } catch (error: unknown) {
      console.error('Error locating order in map:', error);
    }
  }

  /**
   * Opens the order detail preview modal.
   */
  viewOrderDetails(order: OrderDto): void {
    try {
      this.selectedOrderForView.set(order);
      this.showOrderViewModal.set(true);
    } catch (error: unknown) {
      console.error('Error viewing order details:', error);
    }
  }

  /**
   * Returns a human-readable summary of an order's line items.
   */
  getOrderItemsSummary(order: OrderDto): string {
    try {
      if (!order.items || order.items.length === 0) return '';
      return order.items.map((it: OrderItemDto) => `${it.quantity}x ${it.fruitName || ''} ${it.grammage}g`).join(', ');
    } catch (error: unknown) {
      console.error('Error getting order items summary:', error);
      return '';
    }
  }

  /**
   * Selects an order in the billing studio view.
   */
  selectBillingOrder(order: OrderDto): void {
    try {
      this.selectedOrderForInvoice.set(order);
    } catch (error: unknown) {
      console.error('Error selecting billing order:', error);
    }
  }

  /**
   * Opens the invoice modal for a specific order and print format.
   */
  openInvoice(order: OrderDto, format: 'a4' | 'pos' = 'a4'): void {
    try {
      this.selectedOrderForInvoice.set(order);
      this.invoiceFormat.set(format);
      this.showInvoiceModal.set(true);
    } catch (error: unknown) {
      console.error('Error opening invoice:', error);
    }
  }

  /**
   * Triggers the browser print dialog for the current invoice.
   */
  printInvoice(): void {
    try {
      window.print();
    } catch (error: unknown) {
      console.error('Error printing invoice:', error);
    }
  }

  /**
   * Generates the invoice code for an order using configured company parameters.
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
   * Generates the origin document code for an order.
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
   * Formats a number with two decimal places according to Colombian locale.
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
   * Retrieves the discount percentage for an order line item.
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
   * Updates the discount percentage for an order line item.
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
   * Calculates the net line item amount after applying its discount percentage.
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
   * Calculates the base subtotal of an order after line discounts.
   */
  getInvoiceBaseAmount(order: OrderDto): number {
    try {
      return order.items.reduce((sum: number, item: OrderItemDto, idx: number) => sum + this.getItemImporte(item, order.orderId, idx), 0);
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
   * Calculates the tax amount for an order based on the active tax rate.
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
   * Parses the WhatsApp text message and creates an order from real catalog data.
   */
  parseAndCreateWhatsAppOrder(): void {
    try {
      const text = this.whatsAppText();
      let clientName = '';
      let phone = '';
      let address = '';

      const lines = text.split('\n');
      lines.forEach((line: string) => {
        const lower = line.toLowerCase();
        if (lower.includes('para ') || lower.includes('nombre:') || lower.includes('contacto:') || lower.includes('cliente:')) {
          clientName = line.replace(/(hola|requiero|urgente|pedido|para|nombre:|contacto:|cliente:)/gi, '').trim() || clientName;
        }
        if (lower.includes('dirección:') || lower.includes('calle') || lower.includes('carrera') || lower.includes('av')) {
          address = line.replace(/dirección:/gi, '').trim() || address;
        }
        const phoneMatch = line.match(/\b3\d{2}[- ]?\d{3}[- ]?\d{4}\b/);
        if (phoneMatch) phone = phoneMatch[0];
      });

      const parsedItems: ManualOrderFormItem[] = [];

      this.stateService.fruits().forEach((fruit: FruitConfig) => {
        const baseName = fruit.name.split(' ')[0];
        const regex = new RegExp(`(\\d+)\\s*(pulpas?|unidades?|de)?\\s*(de)?\\s*${baseName}`, 'i');
        const match = text.match(regex);
        if (match) {
          const qty = parseInt(match[1], 10) || 1;
          let grammage: 140 | 250 | 500 | 1000 = 140;

          if (text.toLowerCase().includes(baseName.toLowerCase()) && text.toLowerCase().includes('1000g')) {
            grammage = 1000;
          } else if (text.toLowerCase().includes('500g')) {
            grammage = 500;
          } else if (text.toLowerCase().includes('250g')) {
            grammage = 250;
          }

          const priceKey = (`g${grammage === 140 ? 100 : grammage}`) as keyof typeof fruit.prices;
          const unitPrice = fruit.prices[priceKey] ?? 0;

          parsedItems.push({
            fruitName: fruit.name,
            grammage,
            quantity: qty,
            unitPrice
          });
        }
      });

      this.stateService.createOrder({
        clientName,
        clientPhone: phone,
        clientAddress: address,
        items: parsedItems,
        notes: 'Pedido procesado automáticamente desde WhatsApp',
        paymentMethodName: '',
        scheduledDay: this.selectedDay()
      });

      this.showWhatsAppModal.set(false);
      this.activeSubTab.set('picking');

      try {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      } catch {
        return;
      }
    } catch (error: unknown) {
      console.error('Error parsing and creating WhatsApp order:', error);
    }
  }

  /**
   * Opens the modal for creating a new manual order with clean initial state.
   */
  openCreateOrderModal(): void {
    try {
      this.editingOrderId.set(null);
      this.editingOrderNumber.set('');
      this.manualClientName.set('');
      this.manualPhone.set('');
      this.manualAddress.set('');
      this.manualAddressSuggestions.set([]);
      this.selectedManualGeo.set(null);
      this.isManualOrderPaid.set(false);
      const firstMethod = this.activePaymentMethods()[0];
      this.manualPaymentMethod.set(firstMethod ? firstMethod.name : '');
      this.manualNotes.set('');
      this.showClientSuggestions.set(false);
      const firstFruit = this.stateService.fruits()[0];
      this.manualItems.set(
        firstFruit
          ? [
              {
                fruitName: firstFruit.name,
                grammage: 1000,
                quantity: 1,
                unitPrice: firstFruit.prices.g1000 ?? 0
              }
            ]
          : []
      );
      this.showNewOrderModal.set(true);
    } catch (error: unknown) {
      console.error('Error opening create order modal:', error);
    }
  }

  /**
   * Opens the manual order modal populated with an existing order for editing.
   */
  openEditOrderModal(order: OrderDto): void {
    try {
      this.editingOrderId.set(order.orderId);
      this.editingOrderNumber.set(order.orderNumber);
      this.manualClientName.set(order.clientName || '');
      this.manualPhone.set(order.clientPhone || '');
      this.manualAddress.set(order.clientAddress || '');
      this.manualAddressSuggestions.set([]);
      this.selectedManualGeo.set(null);
      this.isManualOrderPaid.set(order.isPaid || false);
      this.manualPaymentMethod.set(order.paymentMethodName || '');
      this.manualNotes.set(order.notes || '');
      this.showClientSuggestions.set(false);
      this.manualItems.set(
        order.items.map((i: OrderItemDto) => ({
          fruitName: i.fruitName || '',
          grammage: (i.grammage as 140 | 250 | 500 | 1000) || 1000,
          quantity: i.quantity,
          unitPrice: i.unitPrice
        }))
      );
      this.showNewOrderModal.set(true);
    } catch (error: unknown) {
      console.error('Error opening edit order modal:', error);
    }
  }

  /**
   * Appends a new item row to the manual order form using the first configured fruit if available.
   */
  addManualItem(): void {
    try {
      const firstFruit = this.stateService.fruits()[0];
      const fruitName = firstFruit ? firstFruit.name : '';
      const unitPrice = firstFruit ? (firstFruit.prices.g1000 ?? 0) : 0;
      this.manualItems.update(list => [
        ...list,
        { fruitName, grammage: 1000, quantity: 1, unitPrice }
      ]);
    } catch (error: unknown) {
      console.error('Error adding manual item:', error);
    }
  }

  /**
   * Removes an item row from the manual order form by index.
   */
  removeManualItem(index: number): void {
    try {
      this.manualItems.update(list => list.filter((_: ManualOrderFormItem, i: number) => i !== index));
    } catch (error: unknown) {
      console.error('Error removing manual item:', error);
    }
  }

  /**
   * Updates the selected fruit and unit price for a manual order item row.
   */
  updateManualItemFruit(index: number, fruitName: string): void {
    try {
      const fruit = this.stateService.fruits().find((f: FruitConfig) => f.name === fruitName);
      this.manualItems.update(list => list.map((item: ManualOrderFormItem, i: number) => {
        if (i === index && fruit) {
          const pKey = (`g${item.grammage === 140 ? 100 : item.grammage}`) as keyof typeof fruit.prices;
          return { ...item, fruitName: fruit.name, unitPrice: fruit.prices[pKey] ?? 0 };
        }
        return item;
      }));
    } catch (error: unknown) {
      console.error('Error updating manual item fruit:', error);
    }
  }

  /**
   * Updates the selected grammage and unit price for a manual order item row.
   */
  updateManualItemGrammage(index: number, grammage: 140 | 250 | 500 | 1000): void {
    try {
      const numGram = Number(grammage) as 140 | 250 | 500 | 1000;
      this.manualItems.update(list => list.map((item: ManualOrderFormItem, i: number) => {
        if (i === index) {
          const fruit = this.stateService.fruits().find((f: FruitConfig) => f.name === item.fruitName);
          const pKey = (`g${numGram === 140 ? 100 : numGram}`) as keyof NonNullable<FruitConfig['prices']>;
          const price = fruit ? (fruit.prices[pKey] ?? 0) : item.unitPrice;
          return { ...item, grammage: numGram, unitPrice: price };
        }
        return item;
      }));
    } catch (error: unknown) {
      console.error('Error updating manual item grammage:', error);
    }
  }

  /**
   * Updates the quantity of a manual order item row.
   */
  updateManualItemQuantity(index: number, qty: number): void {
    try {
      const validQty = Math.max(1, Number(qty) || 1);
      this.manualItems.update(list => list.map((item: ManualOrderFormItem, i: number) => (i === index ? { ...item, quantity: validQty } : item)));
    } catch (error: unknown) {
      console.error('Error updating manual item quantity:', error);
    }
  }

  /**
   * Updates the unit price of a manual order item row.
   */
  updateManualItemPrice(index: number, price: number): void {
    try {
      const validPrice = Math.max(0, Number(price) || 0);
      this.manualItems.update(list => list.map((item: ManualOrderFormItem, i: number) => (i === index ? { ...item, unitPrice: validPrice } : item)));
    } catch (error: unknown) {
      console.error('Error updating manual item price:', error);
    }
  }

  /**
   * Handles address input changes and triggers debounced geocoding suggestions.
   */
  onManualAddressChange(val: string): void {
    try {
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
        try {
          const results = await this.geocodingService.searchAddress(trimmed);
          this.manualAddressSuggestions.set(results);
          if (results.length > 0) {
            this.selectedManualGeo.set(results[0]);
          }
        } finally {
          this.isSearchingManualAddress.set(false);
        }
      }, 280);
    } catch (error: unknown) {
      console.error('Error on manual address change:', error);
    }
  }

  /**
   * Selects a geocoded address suggestion for the manual order.
   */
  selectManualAddressSuggestion(loc: GeocodedLocation): void {
    try {
      this.manualAddress.set(loc.label);
      this.selectedManualGeo.set(loc);
      this.manualAddressSuggestions.set([]);
    } catch (error: unknown) {
      console.error('Error selecting manual address suggestion:', error);
    }
  }

  /**
   * Validates and submits the manual order form to create or update an order.
   */
  submitManualOrder(): void {
    try {
      if (!this.isManualOrderValid()) {
        this.notification.warning('Campos incompletos', 'Completa el nombre del cliente, teléfono, dirección y al menos 1 producto.');
        return;
      }

      const geo = this.selectedManualGeo();
      const finalAddress = geo ? geo.label : this.manualAddress();
      const editId = this.editingOrderId();
      const isPaid = this.isManualOrderPaid();
      const paymentMethodName = isPaid ? this.manualPaymentMethod() : 'Contra Entrega (Por Cobrar)';

      if (editId !== null) {
        this.stateService.updateOrder(editId, {
          clientName: this.manualClientName(),
          clientPhone: this.manualPhone(),
          clientAddress: finalAddress,
          items: this.manualItems(),
          paymentMethodName,
          isPaid,
          notes: this.manualNotes()
        });
        this.notification.success('Pedido Actualizado', `Guía ${this.editingOrderNumber()} modificada con éxito.`);
      } else {
        const newOrder = this.stateService.createOrder({
          clientName: this.manualClientName(),
          clientPhone: this.manualPhone(),
          clientAddress: finalAddress,
          items: this.manualItems(),
          paymentMethodName,
          notes: this.manualNotes(),
          scheduledDay: this.selectedDay()
        });
        if (isPaid) {
          this.stateService.orders.update(all =>
            all.map((o: OrderDto) => (o.orderId === newOrder.orderId ? { ...o, isPaid: true } : o))
          );
        }
        this.notification.success('Pedido Creado', `Nueva orden ${newOrder.orderNumber} registrada.`);
      }

      this.showNewOrderModal.set(false);
      this.editingOrderId.set(null);
      this.editingOrderNumber.set('');
      this.manualClientName.set('');
      this.manualPhone.set('');
      this.manualAddress.set('');
      this.manualAddressSuggestions.set([]);
      this.selectedManualGeo.set(null);
      this.isManualOrderPaid.set(false);
    } catch (error: unknown) {
      console.error('Error submitting manual order:', error);
    }
  }

  /**
   * Deletes the order currently open in the edit modal.
   */
  deleteCurrentEditingOrder(): void {
    try {
      const editId = this.editingOrderId();
      if (editId !== null) {
        this.stateService.deleteOrder(editId);
        this.showNewOrderModal.set(false);
        this.editingOrderId.set(null);
        this.editingOrderNumber.set('');
      }
    } catch (error: unknown) {
      console.error('Error deleting current editing order:', error);
    }
  }

  /**
   * Formats a numeric value as Colombian Pesos (COP).
   */
  formatCOP(val: number): string {
    try {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
      }).format(val);
    } catch (error: unknown) {
      console.error('Error formatting COP:', error);
      return `$${val}`;
    }
  }
}
