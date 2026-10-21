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
import * as L from 'leaflet';

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

  // Weekly Picking Day Cards (Drag & Drop enabled)
  readonly weekDayConfigs: {
    name: string;
    color: 'purple' | 'green' | 'blue' | 'cyan' | 'red';
  }[] = [
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

  getOrderDay(order: OrderDto): string {
    return order.scheduledDay || 'Jueves';
  }

  readonly weekDays = computed(() => {
    const pickingOrders = this.stateService
      .orders()
      .filter(o => o.status === 'PENDING' || o.status === 'PICKING');
    const activeDay = this.selectedDay();

    return this.weekDayConfigs.map(cfg => {
      const count = pickingOrders.filter(o => this.getOrderDay(o) === cfg.name).length;
      const active = activeDay === cfg.name;
      return {
        name: cfg.name,
        count,
        color: cfg.color,
        active,
        hasIndicator: count > 0
      };
    });
  });

  toggleDayCard(index: number) {
    const target = this.weekDayConfigs[index];
    if (target) {
      this.selectedDay.set(target.name);
    }
  }

  onOrderDragStart(event: DragEvent, order: OrderDto) {
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
  }

  onOrderDragEnd() {
    this.draggingOrderId.set(null);
    this.dragOverDay.set(null);
  }

  onDayDragEnter(event: DragEvent, dayName: string) {
    event.preventDefault();
    if (this.draggingOrderId() !== null) {
      this.dragOverDay.set(dayName);
    }
  }

  onDayDragOver(event: DragEvent, dayName: string) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    if (this.dragOverDay() !== dayName) {
      this.dragOverDay.set(dayName);
    }
  }

  onDayDragLeave(event: DragEvent, dayName: string) {
    const current = event.currentTarget as HTMLElement | null;
    const related = event.relatedTarget as Node | null;
    if (current && related && current.contains(related)) {
      return;
    }
    if (this.dragOverDay() === dayName) {
      this.dragOverDay.set(null);
    }
  }

  onDayDrop(event: DragEvent, dayName: string) {
    event.preventDefault();
    event.stopPropagation();
    const rawId = event.dataTransfer?.getData('text/plain');
    const orderId = this.draggingOrderId() || (rawId ? Number(rawId) : null);
    this.draggingOrderId.set(null);
    this.dragOverDay.set(null);

    if (!orderId) return;
    const order = this.stateService.orders().find(o => o.orderId === orderId);
    if (!order) return;

    if (this.getOrderDay(order) === dayName) {
      return;
    }

    this.stateService.updateOrderScheduledDay(orderId, dayName);
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
    const activeDay = this.selectedDay();
    const pickingOrders = this.stateService
      .orders()
      .filter(
        o =>
          (o.status === 'PENDING' || o.status === 'PICKING') &&
          this.getOrderDay(o) === activeDay
      );

    const totalsMap = new Map<string, number>();
    pickingOrders.forEach(order => {
      order.items.forEach(item => {
        const key = `${item.fruitName} (${item.grammage}g)`;
        totalsMap.set(key, (totalsMap.get(key) || 0) + item.quantity);
      });
    });

    if (totalsMap.size === 0) {
      return `0 unidades pendientes para ${activeDay}`;
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
  readonly isManualOrderPaid = signal<boolean>(false);
  readonly manualPaymentMethod = signal<string>('Transferencia Bancolombia');
  readonly manualNotes = signal<string>('');
  readonly manualItems = signal<{ fruitName: string; grammage: 140 | 250 | 500 | 1000; quantity: number; unitPrice: number }[]>([
    { fruitName: 'Maracuyá', grammage: 1000, quantity: 5, unitPrice: 11000 }
  ]);

  // Client Autocomplete Suggestions
  readonly showClientSuggestions = signal<boolean>(false);

  readonly allKnownClients = computed(() => {
    const map = new Map<string, { fullName: string; phone: string; address: string }>();
    this.stateService.clients().forEach(c => {
      if (c.fullName) {
        map.set(c.fullName.toLowerCase().trim(), {
          fullName: c.fullName,
          phone: c.phone || '',
          address: c.address || ''
        });
      }
    });
    this.stateService.orders().forEach(o => {
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
  });

  readonly filteredClientSuggestions = computed(() => {
    const query = this.manualClientName().trim().toLowerCase();
    if (!query) return [];
    return this.allKnownClients().filter(c =>
      c.fullName.toLowerCase().includes(query) ||
      c.phone.toLowerCase().includes(query) ||
      c.address.toLowerCase().includes(query)
    );
  });

  onClientNameInput(val: string) {
    this.manualClientName.set(val);
    this.showClientSuggestions.set(true);
  }

  onClientNameFocus() {
    if (this.manualClientName().trim().length >= 1) {
      this.showClientSuggestions.set(true);
    }
  }

  selectClientSuggestion(client: { fullName: string; phone: string; address: string }) {
    this.manualClientName.set(client.fullName);
    if (client.phone) {
      this.manualPhone.set(client.phone);
    }
    if (client.address) {
      this.manualAddress.set(client.address);
      this.geocodingService.geocodeBestMatch(client.address).then(geo => {
        if (geo) {
          this.selectedManualGeo.set(geo);
        }
      });
    }
    this.showClientSuggestions.set(false);
  }

  clearClientNameInput() {
    this.manualClientName.set('');
    this.showClientSuggestions.set(false);
  }

  // Validación de formulario para habilitar el botón "Guardar Pedido"
  readonly isManualOrderValid = computed(() => {
    const nameOk = this.manualClientName().trim().length >= 2;
    const phoneOk = this.manualPhone().trim().length >= 7;
    const addrOk = this.manualAddress().trim().length >= 3;
    const items = this.manualItems();
    const itemsOk = items.length > 0 && items.every(it => Number(it.quantity) > 0 && Number(it.unitPrice) > 0);
    const paidOk = !this.isManualOrderPaid() || (this.manualPaymentMethod().trim().length > 0);
    return nameOk && phoneOk && addrOk && itemsOk && paidOk;
  });

  // Map Address Picker Modal State
  readonly showAddressMapPickerModal = signal<boolean>(false);
  readonly pickerSearchText = signal<string>('');
  readonly pickerCurrentAddress = signal<string>('');
  readonly pickerCurrentZone = signal<string>('Bogotá D.C.');
  readonly pickerCurrentLat = signal<number>(4.6750);
  readonly pickerCurrentLng = signal<number>(-74.0550);
  private pickerMap?: L.Map;
  private pickerMarker?: L.Marker;
  private pickerSearchDebounce?: any;
  readonly isReverseGeocoding = signal<boolean>(false);

  hideClientSuggestionsWithDelay() {
    setTimeout(() => {
      this.showClientSuggestions.set(false);
    }, 250);
  }

  openMapAddressPicker() {
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
      this.pickerCurrentAddress.set(this.manualAddress() || 'Bogotá D.C.');
      this.pickerCurrentZone.set('Chicó / Parque 93');
      this.pickerSearchText.set(this.manualAddress());
    }

    this.showAddressMapPickerModal.set(true);

    setTimeout(() => {
      this.initPickerMap();
    }, 120);
  }

  closeMapAddressPicker() {
    this.showAddressMapPickerModal.set(false);
    if (this.pickerMap) {
      this.pickerMap.remove();
      this.pickerMap = undefined;
      this.pickerMarker = undefined;
    }
  }

  private initPickerMap() {
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

    const stadiaKey = '28312715-2030-4d54-ad98-458156a468d2';
    L.tileLayer(`https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${stadiaKey}`, {
      maxZoom: 20,
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>'
    }).addTo(this.pickerMap);

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

    this.pickerMarker.on('dragend', (e: any) => {
      const pos = e.target.getLatLng();
      this.updatePickerCoords(pos.lat, pos.lng, true);
    });

    this.pickerMap.on('click', (e: L.LeafletMouseEvent) => {
      this.pickerMarker?.setLatLng(e.latlng);
      this.updatePickerCoords(e.latlng.lat, e.latlng.lng, true);
    });

    setTimeout(() => {
      this.pickerMap?.invalidateSize();
    }, 250);
  }

  async updatePickerCoords(lat: number, lng: number, doReverseGeocode = true) {
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
  }

  async searchPickerAddress() {
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
  }

  confirmPickerSelection() {
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
      locality: zone.includes('Cundinamarca') ? zone : 'Bogotá D.C.',
      source: 'coords',
      confidence: 1.0
    });

    this.closeMapAddressPicker();
    this.notification.success('Ubicación Georreferenciada', `${address} · ${zone}`);
  }

  // Orders Filtered by Tab & Search
  readonly tabOrders = computed(() => {
    const tab = this.activeSubTab();
    const search = this.searchTerm().toLowerCase();
    const activeDay = this.selectedDay();
    let list = this.stateService.orders();

    if (tab === 'picking') {
      list = list.filter(
        o =>
          (o.status === 'PENDING' || o.status === 'PICKING') &&
          this.getOrderDay(o) === activeDay
      );
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
      if (this.deliveryMapRef) {
        this.deliveryMapRef.markOrderDeliveredByOrderNumber(order.orderNumber);
      }
    }
  }

  // =========================================================================
  // HISTÓRICO DE ENTREGAS Y DESPACHOS DEL DÍA (LEDGER MANIFIESTO)
  // =========================================================================
  readonly COURIER_CATALOG = [
    {
      id: 'c1',
      name: 'Carlos Rodríguez',
      vehicleType: 'moto' as const,
      vehiclePlate: 'HND-45F',
      vehicleModel: 'Honda CB190R Térmica',
      phone: '311 889 0012',
      color: '#10b981',
      colorLight: '#ecfdf5',
      routeCode: 'RUTA-2026-CR1'
    },
    {
      id: 'c2',
      name: 'Andrés Morales',
      vehicleType: 'moto' as const,
      vehiclePlate: 'YMH-88B',
      vehicleModel: 'Yamaha Crypton 115 Frigorífica',
      phone: '320 445 6677',
      color: '#3b82f6',
      colorLight: '#eff6ff',
      routeCode: 'RUTA-2026-AM2'
    },
    {
      id: 'c3',
      name: 'Felipe Caicedo',
      vehicleType: 'furgon' as const,
      vehiclePlate: 'CHE-912',
      vehicleModel: 'Furgón N300 ThermoKing Cundinamarca',
      phone: '314 556 7788',
      color: '#f59e0b',
      colorLight: '#fffbeb',
      routeCode: 'RUTA-2026-FC3'
    }
  ];

  readonly historyFilter = signal<'ALL' | 'DELIVERED' | 'DISPATCHED' | 'UNASSIGNED'>('ALL');
  readonly historySearchQuery = signal<string>('');

  // Todas las entregas del día (no canceladas)
  readonly allHistoryOrders = computed(() => {
    return this.stateService.orders().filter(o => o.status !== 'CANCELLED');
  });

  readonly totalHistoryOrdersCount = computed(() => this.allHistoryOrders().length);

  readonly deliveredHistoryOrdersCount = computed(() =>
    this.allHistoryOrders().filter(o => o.status === 'DELIVERED').length
  );

  readonly inTransitHistoryOrdersCount = computed(() =>
    this.allHistoryOrders().filter(o => o.status === 'DISPATCHED').length
  );

  readonly unassignedHistoryOrdersCount = computed(() =>
    this.allHistoryOrders().filter(o => o.status !== 'DELIVERED' && o.status !== 'DISPATCHED').length
  );

  readonly totalDeliveredCash = computed(() =>
    this.allHistoryOrders()
      .filter(o => o.status === 'DELIVERED')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  );

  readonly totalDayExpectedCash = computed(() =>
    this.allHistoryOrders().reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  );

  readonly filteredHistoryOrders = computed(() => {
    const filter = this.historyFilter();
    const query = this.historySearchQuery().trim().toLowerCase();
    let list = this.allHistoryOrders();

    if (filter === 'DELIVERED') {
      list = list.filter(o => o.status === 'DELIVERED');
    } else if (filter === 'DISPATCHED') {
      list = list.filter(o => o.status === 'DISPATCHED');
    } else if (filter === 'UNASSIGNED') {
      list = list.filter(o => o.status !== 'DELIVERED' && o.status !== 'DISPATCHED');
    }

    if (query) {
      list = list.filter(o => {
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
  });

  readonly historyCurrentPage = signal<number>(1);
  readonly historyPageSize = signal<number>(10);

  readonly historyTotalPages = computed(() => {
    const total = this.filteredHistoryOrders().length;
    return Math.max(1, Math.ceil(total / this.historyPageSize()));
  });

  readonly paginatedHistoryOrders = computed(() => {
    const list = this.filteredHistoryOrders();
    const page = this.historyCurrentPage();
    const size = this.historyPageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  readonly historyPaginationInfo = computed(() => {
    const total = this.filteredHistoryOrders().length;
    const page = this.historyCurrentPage();
    const size = this.historyPageSize();
    if (total === 0) return { start: 0, end: 0, total: 0 };
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return { start, end, total };
  });

  readonly historyPagesList = computed(() => {
    const total = this.historyTotalPages();
    const pages: number[] = [];
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
    return pages;
  });

  setHistoryPage(page: number) {
    if (page >= 1 && page <= this.historyTotalPages()) {
      this.historyCurrentPage.set(page);
    }
  }

  setHistoryFilter(filter: 'ALL' | 'DELIVERED' | 'DISPATCHED' | 'UNASSIGNED') {
    this.historyFilter.set(filter);
    this.historyCurrentPage.set(1);
  }

  setHistorySearchQuery(query: string) {
    this.historySearchQuery.set(query);
    this.historyCurrentPage.set(1);
  }

  getCourierForOrder(order: OrderDto) {
    if (order.courierName) {
      const match = this.COURIER_CATALOG.find(c =>
        c.name.toLowerCase().includes(order.courierName!.toLowerCase()) ||
        order.courierName!.toLowerCase().includes(c.name.toLowerCase())
      );
      if (match) return match;
    }

    // Lookup en DeliveryMapComponent si está montado
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
          phone: c.phone || '310 123 4567',
          color: c.color,
          colorLight: c.colorLight,
          routeCode: c.routeCode || 'RUTA-2026'
        };
      }
    }

    // Fallbacks directos para las órdenes del semillero
    if (order.orderId === 1001 || order.orderId === 1002 || order.orderId === 1003 ||
        order.orderNumber === 'PED-2026-001' || order.orderNumber === 'PED-2026-002' || order.orderNumber === 'PED-2026-003') {
      return this.COURIER_CATALOG[0]; // Carlos Rodríguez
    }
    if (order.orderId === 1004 || order.orderId === 1005 || order.orderId === 1006 ||
        order.orderNumber === 'PED-2026-004' || order.orderNumber === 'PED-2026-005' || order.orderNumber === 'PED-2026-006') {
      return this.COURIER_CATALOG[1]; // Andrés Morales
    }
    if (order.orderId === 1007 || order.orderId === 1008 ||
        order.orderNumber === 'PED-2026-007' || order.orderNumber === 'PED-2026-008') {
      return this.COURIER_CATALOG[2]; // Felipe Caicedo
    }

    return null;
  }

  assignCourierToOrder(order: OrderDto, courierId: string) {
    const courier = this.COURIER_CATALOG.find(c => c.id === courierId);
    if (!courier) return;

    this.stateService.orders.update(orders =>
      orders.map(o => (o.orderId === order.orderId ? {
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
      `Guía ${order.orderNumber} asignada a ${courier.name} (${courier.routeCode} · ${courier.vehiclePlate})`
    );
  }

  locateOrderInMap(order: OrderDto) {
    if (this.deliveryMapRef) {
      this.deliveryMapRef.locateOrderOnMap(order.orderNumber);
      const mapEl = document.getElementById('bogota-cundinamarca-map');
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  // Order Details Modal (Lupa shortcut)
  readonly showOrderViewModal = signal<boolean>(false);
  readonly selectedOrderForView = signal<OrderDto | null>(null);

  viewOrderDetails(order: OrderDto) {
    this.selectedOrderForView.set(order);
    this.showOrderViewModal.set(true);
  }

  getOrderItemsSummary(order: OrderDto): string {
    if (!order.items || order.items.length === 0) return 'Pulpas variadas';
    return order.items.map(it => `${it.quantity}x ${it.fruitName || 'Pulpa'} ${it.grammage}g`).join(', ');
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
      paymentMethodName: 'Transferencia Bancolombia',
      scheduledDay: this.selectedDay()
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
    this.isManualOrderPaid.set(false);
    this.manualPaymentMethod.set('Transferencia Bancolombia');
    this.manualNotes.set('');
    this.showClientSuggestions.set(false);
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
    this.isManualOrderPaid.set(order.isPaid || false);
    this.manualPaymentMethod.set(order.paymentMethodName || 'Transferencia Bancolombia');
    this.manualNotes.set(order.notes || '');
    this.showClientSuggestions.set(false);
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
          all.map(o => (o.orderId === newOrder.orderId ? { ...o, isPaid: true } : o))
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
