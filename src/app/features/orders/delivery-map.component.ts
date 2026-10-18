import {
  Component,
  computed,
  inject,
  signal,
  OnDestroy,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { GeocodingService } from '../../core/services/geocoding.service';
import { OrderDto } from '../../core/models/business.models';
import confetti from 'canvas-confetti';
import * as L from 'leaflet';

export interface Courier {
  id: string;
  name: string;
  vehicleType: 'moto' | 'furgon';
  vehiclePlate: string;
  vehicleModel: string;
  phone: string;
  color: string;
  colorLight: string;
  capacityKg: number;
  status: 'en_ruta' | 'en_planta' | 'entregando';
  currentSpeedKmH: number;
  batteryPct: number;
  orderIds: number[];
  currentStopIndex: number;
  progress: number;
  roadStepIndex: number; // floating index along full road path
  lat: number;
  lng: number;
}

export interface DeliveryWaypoint {
  id: number;
  orderNumber: string;
  clientName: string;
  clientPhone: string;
  address: string;
  zone: string;
  lat: number;
  lng: number;
  totalAmount: number;
  weightKg: number;
  itemsSummary: string;
  isDelivered: boolean;
  assignedCourierId: string;
  orderRef?: OrderDto;
}

// Coordinates of Planta Cava Matriz Cundinamarca (Parque Industrial Calle 80 / Cota)
const PLANTA_MATRIZ_LAT = 4.7125;
const PLANTA_MATRIZ_LNG = -74.1420;

// Seed Delivery Stops in Bogotá & Cundinamarca
const INITIAL_BOGOTA_STOPS: DeliveryWaypoint[] = [
  {
    id: 1001,
    orderNumber: 'PED-2026-001',
    clientName: 'Restaurante Wok Parque 93',
    clientPhone: '315 456 7890',
    address: 'Calle 93A # 13-25, Chicó Norte',
    zone: 'Bogotá Norte',
    lat: 4.6765,
    lng: -74.0538,
    totalAmount: 184000,
    weightKg: 18.5,
    itemsSummary: '10x Maracuyá 1kg, 8x Mango 1kg, 5x Lulo 500g',
    isDelivered: false,
    assignedCourierId: 'c1'
  },
  {
    id: 1002,
    orderNumber: 'PED-2026-002',
    clientName: 'Café & Panadería Usaquén Gourmet',
    clientPhone: '310 987 6543',
    address: 'Cra 6A # 119-24, Usaquén',
    zone: 'Usaquén',
    lat: 4.6980,
    lng: -74.0310,
    totalAmount: 126400,
    weightKg: 14.0,
    itemsSummary: '24x Mora 140g, 20x Maracuyá 140g, 8x Guanábana 250g',
    isDelivered: false,
    assignedCourierId: 'c1'
  },
  {
    id: 1003,
    orderNumber: 'PED-2026-003',
    clientName: 'Bistro Chapinero Alto Zona G',
    clientPhone: '318 222 3344',
    address: 'Cra 5 # 69-18, Chapinero',
    zone: 'Chapinero',
    lat: 4.6540,
    lng: -74.0585,
    totalAmount: 95500,
    weightKg: 9.2,
    itemsSummary: '10x Mango Tommy 500g, 10x Lulo 250g',
    isDelivered: false,
    assignedCourierId: 'c1'
  },
  {
    id: 1004,
    orderNumber: 'PED-2026-004',
    clientName: 'Frutería & Helados Salitre Plaza',
    clientPhone: '312 888 9900',
    address: 'Av. La Esperanza # 50-10, Salitre',
    zone: 'Teusaquillo / Salitre',
    lat: 4.6465,
    lng: -74.1015,
    totalAmount: 154000,
    weightKg: 16.0,
    itemsSummary: '15x Maracuyá 1kg, 12x Fresa 500g',
    isDelivered: false,
    assignedCourierId: 'c2'
  },
  {
    id: 1005,
    orderNumber: 'PED-2026-005',
    clientName: 'Restaurante El Portal Capitalino Candelaria',
    clientPhone: '320 111 4455',
    address: 'Cra 4 # 11-20, La Candelaria',
    zone: 'Centro Histórico',
    lat: 4.5985,
    lng: -74.0745,
    totalAmount: 215000,
    weightKg: 22.0,
    itemsSummary: '20x Guanábana 1kg, 10x Maracuyá 1kg',
    isDelivered: false,
    assignedCourierId: 'c2'
  },
  {
    id: 1006,
    orderNumber: 'PED-2026-006',
    clientName: 'Distribuidora Pulpa Central Kennedy',
    clientPhone: '316 444 7788',
    address: 'Calle 38 Sur # 78-15, Kennedy',
    zone: 'Kennedy Central',
    lat: 4.6180,
    lng: -74.1520,
    totalAmount: 178000,
    weightKg: 19.5,
    itemsSummary: '18x Mango Tommy 1kg, 15x Mora 500g',
    isDelivered: false,
    assignedCourierId: 'c2'
  },
  {
    id: 1007,
    orderNumber: 'PED-2026-007',
    clientName: 'Asados & Piqueteadero El Retén Chía',
    clientPhone: '317 555 9922',
    address: 'Variante Chía - Cota Km 3',
    zone: 'Chía (Cundinamarca)',
    lat: 4.8620,
    lng: -74.0565,
    totalAmount: 310000,
    weightKg: 35.0,
    itemsSummary: '30x Maracuyá 1kg, 25x Mango 1kg, 20x Lulo 1kg',
    isDelivered: false,
    assignedCourierId: 'c3'
  },
  {
    id: 1008,
    orderNumber: 'PED-2026-008',
    clientName: 'Club Campestre & Restaurante Cota',
    clientPhone: '314 333 6611',
    address: 'Vereda Siberia - Variante Cota',
    zone: 'Cota (Cundinamarca)',
    lat: 4.8115,
    lng: -74.1025,
    totalAmount: 265000,
    weightKg: 28.0,
    itemsSummary: '25x Guanábana 1kg, 20x Mora 1kg',
    isDelivered: false,
    assignedCourierId: 'c3'
  }
];

export interface AddressSearchResult {
  id: string;
  name: string;
  label: string;
  lat: number;
  lng: number;
  zone: string;
  locality?: string;
}

export interface MapStyleOption {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  icon: string;
  description: string;
  url: string;
  maxZoom: number;
  maxNativeZoom?: number;
  isDark?: boolean;
}

export const STADIA_API_KEY = '28312715-2030-4d54-ad98-458156a468d2';

export const MAP_STYLES: MapStyleOption[] = [
  {
    id: 'stadia-smooth',
    name: 'Stadia Maps Alidade Smooth',
    shortName: 'Stadia Smooth',
    badge: 'VECTOR RETINA',
    icon: '⚡',
    description: 'Cartografía vectorial de alta definición en escala de grises con soporte Retina @2x.',
    url: `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${STADIA_API_KEY}`,
    maxZoom: 20
  },
  {
    id: 'stadia-dark',
    name: 'Stadia Maps Alidade Smooth Dark',
    shortName: 'Stadia Dark',
    badge: 'MODO NOCHE',
    icon: '🌙',
    description: 'Modo oscuro elegante de alto contraste para visibilidad nocturna.',
    url: `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=${STADIA_API_KEY}`,
    maxZoom: 20,
    isDark: true
  },
  {
    id: 'esri-gray',
    name: 'Esri World Gray Canvas',
    shortName: 'Esri Canvas',
    badge: 'ARCGIS',
    icon: '🏛️',
    description: 'Cartografía corporativa en escala de grises de Esri ArcGIS.',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    maxNativeZoom: 16
  },
  {
    id: 'osm-standard',
    name: 'OpenStreetMap Clásico',
    shortName: 'Color Estándar',
    badge: 'ESTÁNDAR',
    icon: '🌐',
    description: 'Mapa tradicional en colores naturales.',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19
  }
];

@Component({
  selector: 'app-delivery-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="delivery-map-container">
      <!-- Map Header & Telemetry Bar -->
      <div class="map-header-card">
        <div class="map-title-row">
          <div class="map-badge-group">
            <div class="live-indicator">
              <span class="pulse-dot"></span>
              <span>GPS & TELEMETRÍA EN VIVO · BOGOTÁ & CUNDINAMARCA</span>
            </div>
            <span class="badge-pill badge-emerald">Rutas por Calles & Avenidas Reales</span>
            <span class="badge-pill badge-stadia">⚡ Stadia Maps Alidade Smooth (@2x Retina)</span>
          </div>

          <!-- Controls Toolbar -->
          <div class="map-controls">
            <!-- Mode to mark points on the map -->
            <button
              type="button"
              class="btn btn-sm"
              [class.btn-mark-active]="isMarkingPointMode()"
              [class.btn-secondary]="!isMarkingPointMode()"
              (click)="toggleMarkingPointMode()"
              title="Haz clic en cualquier punto del mapa para crear un pedido y enrutarlo"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>{{ isMarkingPointMode() ? '📍 Haz Clic en el Mapa' : '+ Marcar Punto en Mapa' }}</span>
            </button>

            <!-- Simulation Play/Pause -->
            <button
              type="button"
              class="btn btn-sm btn-action"
              [class.btn-active]="isSimulating()"
              (click)="toggleSimulation()"
              [title]="isSimulating() ? 'Pausar Simulación' : 'Iniciar Simulación en Tiempo Real'"
            >
              @if (isSimulating()) {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
                <span>Pausar</span>
              } @else {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Simular Rutas</span>
              }
            </button>

            <!-- Speed Multiplier -->
            <div class="speed-toggle-group">
              <button
                type="button"
                class="speed-btn"
                [class.active]="simulationSpeed() === 1"
                (click)="setSimulationSpeed(1)"
              >1x</button>
              <button
                type="button"
                class="speed-btn"
                [class.active]="simulationSpeed() === 2"
                (click)="setSimulationSpeed(2)"
              >2x</button>
              <button
                type="button"
                class="speed-btn"
                [class.active]="simulationSpeed() === 4"
                (click)="setSimulationSpeed(4)"
              >4x</button>
            </div>

            <!-- Reset Simulation -->
            <button
              type="button"
              class="btn-icon btn-sm"
              (click)="resetSimulation()"
              title="Reiniciar Recorridos a Planta"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
            </button>

            <!-- Launch Route Planner Button -->
            <button
              type="button"
              class="btn btn-sm btn-primary"
              (click)="openRoutePlanner()"
              style="gap: 6px; font-weight: 700;"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="6" cy="19" r="3"></circle>
                <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"></path>
                <circle cx="18" cy="5" r="3"></circle>
              </svg>
              <span>Enrutador Inteligente</span>
            </button>

            <!-- Toggle Slide-Over Deliveries Drawer Button -->
            <button
              type="button"
              class="btn btn-sm btn-action"
              [class.btn-active]="showDeliveriesDrawer()"
              (click)="toggleDeliveriesDrawer()"
              style="gap: 6px; font-weight: 700;"
              title="Abrir o cerrar el cajón de entregas cargadas en el mapa"
            >
              <span>📦 Entregas ({{ deliveryStops().length }})</span>
            </button>
          </div>
        </div>

        <!-- Telemetry Summary Cards -->
        <div class="telemetry-bar">
          <div class="telemetry-item">
            <div class="telemetry-icon" style="background: rgba(16, 185, 129, 0.12); color: var(--color-primary-text);">
              🛵
            </div>
            <div>
              <div class="telemetry-val">{{ couriers().length }} Mensajeros</div>
              <div class="telemetry-lbl">En Despacho Activo</div>
            </div>
          </div>

          <div
            class="telemetry-item clickable-telemetry"
            (click)="toggleDeliveriesDrawer()"
            title="Haz clic para ver, agregar o eliminar entregas del mapa"
          >
            <div class="telemetry-icon" style="background: rgba(59, 130, 246, 0.12); color: var(--color-blue-text);">
              📦
            </div>
            <div>
              <div class="telemetry-val">{{ deliveredCount() }} / {{ deliveryStops().length }} Entregas</div>
              <div class="telemetry-lbl">Progreso · Clic para gestionar</div>
            </div>
          </div>

          <div class="telemetry-item">
            <div class="telemetry-icon" style="background: rgba(245, 158, 11, 0.12); color: var(--color-secondary-text);">
              💵
            </div>
            <div>
              <div class="telemetry-val">{{ formatCOP(totalTransitCash()) }}</div>
              <div class="telemetry-lbl">Recaudo en Calle</div>
            </div>
          </div>

          <div class="telemetry-item no-mobile">
            <div class="telemetry-icon" style="background: rgba(139, 92, 246, 0.12); color: var(--color-purple-text);">
              ⚡
            </div>
            <div>
              <div class="telemetry-val">{{ activeSpeedAvg() }} km/h</div>
              <div class="telemetry-lbl">Velocidad Flota</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Map Visualizer & Live Sidebar Grid -->
      <div class="map-workspace-grid">
        <!-- Leaflet Map Container -->
        <div
          class="map-canvas-card"
          [class.is-map-locked]="mapViewMode() === 'locked'"
          [class.map-fullscreen-active]="isMapFullscreen()"
        >
          <!-- Blurred & Locked Inner Wrapper when mapViewMode() === 'locked' -->
          <div class="map-blur-target" [class.blurred]="mapViewMode() === 'locked'">
            <!-- Hint Banner when in Point-Marking Mode -->
            @if (isMarkingPointMode()) {
              <div class="map-marking-banner">
                <span class="banner-pulse"></span>
                <span>🎯 MODO MARCADO ACTIVO: Haz clic en cualquier lugar de Bogotá o Cundinamarca para fijar la entrega y crear la orden.</span>
                <button class="banner-close" (click)="toggleMarkingPointMode()">✕ Cancelar</button>
              </div>
            }

            <div #mapElement class="leaflet-map-element" id="bogota-cundinamarca-map"></div>

            <!-- Floating Address Geocoder Search Box -->
            <div class="map-address-search-box" [class.has-dropdown]="showSearchResults() && searchResults().length > 0">
              <div class="search-input-shell">
                <span class="search-prefix-icon">
                  @if (isSearchingAddress()) {
                    <span class="search-mini-spinner"></span>
                  } @else {
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  }
                </span>

                <input
                  type="text"
                  class="address-search-input"
                  placeholder="Buscar dirección (ej: Cra 15 # 93-40), coordenadas o link de Maps..."
                  [ngModel]="searchAddressQuery()"
                  (ngModelChange)="onAddressQueryChange($event)"
                  (keydown.enter)="onSearchEnter()"
                  (focus)="onSearchFocus()"
                />

                @if (searchAddressQuery()) {
                  <button
                    type="button"
                    class="search-clear-action"
                    (click)="clearAddressSearch()"
                    title="Borrar búsqueda"
                  >
                    ✕
                  </button>
                }

                <button
                  type="button"
                  class="search-submit-btn"
                  (click)="onSearchEnter()"
                  title="Ubicar dirección en el mapa"
                >
                  Buscar
                </button>
              </div>

              <!-- Autocomplete Suggestions Dropdown -->
              @if (showSearchResults() && searchResults().length > 0) {
                <div class="search-autocomplete-dropdown">
                  <div class="dropdown-header">
                    <span>📍 DIRECCIONES ENCONTRADAS ({{ searchResults().length }})</span>
                    <button type="button" class="btn-dismiss-dropdown" (click)="closeSearchResults()">✕</button>
                  </div>
                  <div class="dropdown-scroll-list">
                    @for (item of searchResults(); track item.id) {
                      <div class="dropdown-item" (click)="selectAddressResult(item)">
                        <span class="item-pin-icon">📍</span>
                        <div class="item-texts">
                          <div class="item-title">{{ item.name || item.label }}</div>
                          <div class="item-subtitle">{{ item.label }}</div>
                          <span class="item-zone-tag">{{ item.zone }}</span>
                        </div>
                        <button
                          type="button"
                          class="item-order-shortcut"
                          (click)="$event.stopPropagation(); createOrderFromSearchResult(item)"
                          title="Crear pedido en esta dirección"
                        >
                          + Pedido
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- High-Contrast Legend Overlay -->
            <div class="map-legend-overlay">
              <div class="legend-chip legend-chip-planta">
                <span class="legend-color-dot" style="background: #10b981;"></span>
                <span>🏭 Cava Matriz (Cota/Calle 80)</span>
              </div>
              @for (c of couriers(); track c.id) {
                <div class="legend-chip" (click)="flyToCourier(c)">
                  <span class="legend-color-dot" [style.background]="c.color"></span>
                  <span>{{ c.name.split(' ')[0] }} ({{ c.orderIds.length }} paradas)</span>
                </div>
              }
            </div>
          </div>

          <!-- OVERLAY SCREEN WITH 2 GREEN BUTTONS WHEN MAP IS LOCKED -->
          @if (mapViewMode() === 'locked') {
            <div class="map-locked-screen-overlay">
              <div class="locked-actions-row">
                <button
                  type="button"
                  class="locked-mode-btn"
                  (click)="enterLiveMapMode()"
                >
                  <span class="live-dot-indicator"></span>
                  <span>🛵 En Vivo</span>
                </button>

                <button
                  type="button"
                  class="locked-mode-btn"
                  (click)="enterAllDeliveriesMode()"
                >
                  <span>📍 Ver Todas las Entregas</span>
                </button>
              </div>
            </div>
          } @else {
            <!-- Floating Mode Switcher Pill in Top-Right when Unlocked -->
            <div class="map-unlocked-mode-bar">
              <button
                type="button"
                class="unlocked-mode-pill"
                [class.active]="mapViewMode() === 'live'"
                (click)="enterLiveMapMode()"
              >
                <span class="pulse-dot" style="width: 7px; height: 7px;"></span>
                <span>En Vivo</span>
              </button>
              <button
                type="button"
                class="unlocked-mode-pill"
                [class.active]="mapViewMode() === 'stops'"
                (click)="enterAllDeliveriesMode()"
              >
                <span>📍 Ver Todas las Entregas</span>
              </button>
              <button
                type="button"
                class="unlocked-mode-pill"
                [class.active]="showDeliveriesDrawer()"
                (click)="toggleDeliveriesDrawer()"
                title="Abrir o cerrar lista de entregas cargadas en el mapa"
              >
                <span>📦 Entregas ({{ deliveryStops().length }})</span>
              </button>
              <button
                type="button"
                class="unlocked-mode-close"
                title="Bloquear mapa y volver a la pantalla de selección"
                (click)="lockMapOverlay()"
              >
                🔒 Bloquear
              </button>
            </div>
          }

          <!-- ======================================================================= -->
          <!-- SLIDE-OVER / BOTTOM-SHEET DRAWER: GESTIONAR ENTREGAS EN EL MAPA          -->
          <!-- ======================================================================= -->
          @if (showDeliveriesDrawer()) {
            <div class="deliveries-drawer" (click)="$event.stopPropagation()">
              <div class="drawer-head">
                <div class="drawer-head-left">
                  <span class="drawer-badge-icon">📦</span>
                  <div>
                    <div class="drawer-title">Entregas en el Mapa ({{ filteredDrawerStops().length }})</div>
                    <div class="drawer-subtitle">Agrega nuevas paradas o elimina entregas activas</div>
                  </div>
                </div>
                <div class="drawer-head-actions">
                  <button
                    type="button"
                    class="drawer-add-toggle-btn"
                    [class.active]="showDrawerQuickAdd()"
                    (click)="toggleDrawerQuickAdd()"
                  >
                    {{ showDrawerQuickAdd() ? '✕ Cerrar' : '+ Agregar' }}
                  </button>
                  <button
                    type="button"
                    class="drawer-close-btn"
                    (click)="showDeliveriesDrawer.set(false)"
                    title="Ocultar cajón de entregas"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 19V5"></path>
                      <path d="m5 12 7-7 7 7"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Registered Orders to Upload to Map -->
              @if (showDrawerQuickAdd()) {
                <div class="drawer-quick-add-box">
                  <div class="unmapped-orders-block">
                    <div class="unmapped-header">Pedidos registrados sin subir al mapa ({{ unmappedOrders().length }})</div>
                    @if (unmappedOrders().length > 0) {
                      <div class="unmapped-list">
                        @for (ord of unmappedOrders(); track ord.orderId) {
                          <div class="unmapped-item">
                            <div class="unmapped-info">
                              <strong>{{ ord.clientName }}</strong>
                              <span>{{ ord.orderNumber }} · {{ ord.clientAddress || 'Bogotá' }}</span>
                            </div>
                            <button
                              type="button"
                              class="btn-load-unmapped"
                              (click)="addExistingOrderToMap(ord)"
                            >
                              + Subir
                            </button>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="unmapped-empty">Todos los pedidos registrados ya están en el mapa.</div>
                    }
                  </div>
                </div>
              }

              <!-- Filter by Courier & Search -->
              <div class="drawer-filters">
                <div class="drawer-courier-pills">
                  <button
                    type="button"
                    class="drawer-c-pill"
                    [class.active]="drawerCourierFilter() === 'all'"
                    (click)="drawerCourierFilter.set('all')"
                  >
                    Todas ({{ deliveryStops().length }})
                  </button>
                  @for (c of couriers(); track c.id) {
                    <button
                      type="button"
                      class="drawer-c-pill"
                      [class.active]="drawerCourierFilter() === c.id"
                      (click)="drawerCourierFilter.set(c.id)"
                    >
                      <span class="dot" [style.background]="c.color"></span>
                      {{ c.name.split(' ')[0] }} ({{ c.orderIds.length }})
                    </button>
                  }
                </div>

                <input
                  type="text"
                  class="drawer-search-input"
                  [ngModel]="drawerSearchQuery()"
                  (ngModelChange)="drawerSearchQuery.set($event)"
                  placeholder="🔍 Filtrar por cliente, pedido o dirección..."
                />
              </div>

              <!-- Deliveries List -->
              <div class="drawer-stops-list">
                @for (stop of filteredDrawerStops(); track stop.id) {
                  <div class="drawer-stop-item" (click)="focusStopOnMap(stop)">
                    <div
                      class="drawer-stop-num"
                      [style.background]="getStopCourierColor(stop)"
                    >
                      {{ stop.isDelivered ? '✓' : getStopOrderIndex(stop) }}
                    </div>

                    <div class="drawer-stop-body">
                      <div class="drawer-stop-top">
                        <span class="drawer-stop-client">{{ stop.clientName }}</span>
                        <span class="drawer-stop-amount">{{ formatCOP(stop.totalAmount) }}</span>
                      </div>
                      <div class="drawer-stop-addr">📍 {{ stop.address }}</div>
                      <div class="drawer-stop-meta" (click)="$event.stopPropagation()">
                        <span class="drawer-stop-code">{{ stop.orderNumber }}</span>
                        <span>·</span>
                        <select
                          class="drawer-stop-courier-select"
                          [ngModel]="stop.assignedCourierId || ''"
                          (ngModelChange)="assignCourierToStop(stop.id, $event)"
                          title="Asignar o cambiar mensajero de esta entrega"
                        >
                          <option value="">📍 Sin mensajero</option>
                          @for (c of couriers(); track c.id) {
                            <option [value]="c.id">🛵 {{ c.name }}</option>
                          }
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      class="drawer-stop-del-btn"
                      title="Eliminar esta entrega del mapa"
                      (click)="$event.stopPropagation(); deleteDeliveryStop(stop.id)"
                    >
                      🗑️
                    </button>
                  </div>
                } @empty {
                  <div class="drawer-empty">
                    <span>📭</span>
                    <p>No hay entregas que coincidan con el filtro.</p>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Fullscreen Map Button (Web & Mobile PWA) -->
          <button
            type="button"
            class="map-fullscreen-fab"
            [class.is-fullscreen]="isMapFullscreen()"
            (click)="toggleMapFullscreen()"
            [title]="isMapFullscreen() ? 'Salir de pantalla completa' : 'Ver mapa en pantalla completa'"
          >
            @if (isMapFullscreen()) {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3"></path>
                <path d="M21 8h-3a2 2 0 0 1-2-2V3"></path>
                <path d="M3 16h3a2 2 0 0 1 2 2v3"></path>
                <path d="M16 21v-3a2 2 0 0 1 2-2h3"></path>
              </svg>
              <span>Salir Pantalla Completa</span>
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h6v6"></path>
                <path d="M9 21H3v-6"></path>
                <path d="M21 3l-7 7"></path>
                <path d="M3 21l7-7"></path>
              </svg>
              <span>Pantalla Completa</span>
            }
          </button>
        </div>

        <!-- Couriers Real-Time Status Deck -->
        <div class="couriers-deck-card">
          <div class="deck-header">
            <h3 class="deck-title">Flota de Despacho</h3>
            <span class="badge-pill badge-info">Tiempo Real</span>
          </div>

          <div class="couriers-list">
            @for (c of couriers(); track c.id) {
              <div
                class="courier-card"
                [style.borderLeftColor]="c.color"
                [class.selected]="selectedCourierId() === c.id"
                (click)="selectCourier(c.id)"
              >
                <div class="courier-card-head">
                  <div class="courier-avatar" [style.background]="c.colorLight" [style.color]="c.color">
                    {{ c.vehicleType === 'moto' ? '🛵' : '🚚' }}
                  </div>
                  <div class="courier-meta">
                    <div class="courier-name-row">
                      <span class="courier-name">{{ c.name }}</span>
                      <span class="courier-status-badge" [class.en-ruta]="c.status === 'en_ruta'">
                        {{ c.status === 'en_ruta' ? 'En Ruta' : (c.status === 'entregando' ? 'En Sitio' : 'En Planta') }}
                      </span>
                    </div>
                    <div class="courier-vehicle-info">
                      {{ c.vehicleModel }} · <strong>{{ c.vehiclePlate }}</strong>
                    </div>
                  </div>
                </div>

                <!-- Courier Route Progress & Specs -->
                <div class="courier-route-stats">
                  <div class="stat-mini">
                    <span class="stat-mini-label">Paradas</span>
                    <span class="stat-mini-val">
                      {{ getCourierCompletedStops(c) }} / {{ c.orderIds.length }}
                    </span>
                  </div>
                  <div class="stat-mini">
                    <span class="stat-mini-label">Velocidad</span>
                    <span class="stat-mini-val" [style.color]="c.color">
                      {{ isSimulating() ? c.currentSpeedKmH : 0 }} km/h
                    </span>
                  </div>
                  <div class="stat-mini">
                    <span class="stat-mini-label">Batería GPS</span>
                    <span class="stat-mini-val">{{ c.batteryPct }}%</span>
                  </div>
                </div>

                <!-- Progress bar -->
                <div class="progress-track">
                  <div
                    class="progress-fill"
                    [style.background]="c.color"
                    [style.width.%]="getCourierProgressPct(c)"
                  ></div>
                </div>

                <!-- Quick Action Buttons for Courier -->
                <div class="courier-card-footer">
                  <button
                    type="button"
                    class="btn-seq-link"
                    (click)="$event.stopPropagation(); openRoutePlannerFor(c.id)"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <circle cx="6" cy="19" r="3"></circle>
                      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"></path>
                      <circle cx="18" cy="5" r="3"></circle>
                    </svg>
                    <span>Editar Secuencia de Ruta</span>
                  </button>

                  <button
                    type="button"
                    class="btn-locate"
                    (click)="$event.stopPropagation(); flyToCourier(c)"
                    title="Centrar mapa en el mensajero"
                  >
                    📍 Ubicar
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- MODAL: MARCAR NUEVO PUNTO DE ENTREGA Y GUARDAR PEDIDO                      -->
      <!-- ========================================================================= -->
      @if (showPointOrderModal()) {
        <div class="modal-backdrop" (click)="cancelPointCreation()">
          <div class="modal-card" (click)="$event.stopPropagation()" style="max-width: 580px;">
            <div class="modal-header">
              <div class="modal-title-group">
                <div class="modal-icon-badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">
                  📍
                </div>
                <div>
                  <h2 class="modal-title">Nuevo Pedido en Bogotá / Cundinamarca</h2>
                  <p class="modal-subtitle">Punto georreferenciado guardado directamente desde el mapa</p>
                </div>
              </div>
              <button type="button" class="btn-close" (click)="cancelPointCreation()">✕</button>
            </div>

            <div class="modal-body">
              <div class="location-preview-card">
                <div class="loc-badge">ZONA DETECTADA</div>
                <div class="loc-title">{{ newOrderZone() }}</div>
                <div class="loc-coords">
                  Coordenadas GPS: {{ newOrderLat().toFixed(5) }}, {{ newOrderLng().toFixed(5) }}
                </div>
              </div>

              <div class="form-grid">
                <div class="form-group full-col">
                  <label class="form-label">Nombre del Cliente / Establecimiento</label>
                  <input
                    type="text"
                    class="form-input"
                    [(ngModel)]="newOrderClient"
                    placeholder="Ej. Restaurante Wok Chapinero, Frutería Cota..."
                  />
                </div>

                <div class="form-group half-col">
                  <label class="form-label">Dirección / Coordenadas</label>
                  <div style="display: flex; gap: 6px;">
                    <input
                      type="text"
                      class="form-input"
                      style="flex: 1;"
                      [(ngModel)]="newOrderAddress"
                      (keydown.enter)="geocodeModalAddress()"
                      placeholder="Ej. Cra 15 # 93-40, Bogotá"
                    />
                    <button
                      type="button"
                      class="btn btn-sm btn-secondary"
                      style="padding: 0 10px; font-size: 0.78rem; flex-shrink: 0;"
                      (click)="geocodeModalAddress()"
                      title="Calcular coordenadas GPS automáticamente a partir de esta dirección"
                    >
                      📍 Ubicar
                    </button>
                  </div>
                </div>

                <div class="form-group half-col">
                  <label class="form-label">Teléfono de Contacto</label>
                  <input
                    type="text"
                    class="form-input"
                    [(ngModel)]="newOrderPhone"
                    placeholder="Ej. 312 456 7890"
                  />
                </div>

                <div class="form-group half-col">
                  <label class="form-label">Total a Cobrar ($ COP)</label>
                  <input
                    type="number"
                    class="form-input"
                    [(ngModel)]="newOrderAmount"
                    placeholder="150000"
                  />
                </div>

                <div class="form-group half-col">
                  <label class="form-label">Asignar a Mensajero (Opcional)</label>
                  <select class="form-select" [(ngModel)]="newOrderCourierId">
                    <option value="">📍 Sin mensajero asignado</option>
                    @for (c of couriers(); track c.id) {
                      <option [value]="c.id">
                        {{ c.name }} ({{ c.vehicleType === 'moto' ? 'Moto' : 'Furgón' }} · {{ c.vehiclePlate }})
                      </option>
                    }
                  </select>
                </div>

                <div class="form-group full-col">
                  <label class="form-label">Pulpa Requerida</label>
                  <div class="pulp-chips-row">
                    @for (p of quickPulpOptions; track p.name) {
                      <button
                        type="button"
                        class="pulp-chip"
                        [class.selected]="selectedPulpItem() === p.name"
                        (click)="selectPulpPreset(p)"
                      >
                        <span>{{ p.emoji }} {{ p.name }}</span>
                        <span class="chip-price">{{ formatCOP(p.price) }}</span>
                      </button>
                    }
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="cancelPointCreation()">
                Cancelar
              </button>
              <button type="button" class="btn btn-primary" (click)="savePointAsOrder()" style="gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                <span>Guardar Pedido y Añadir a Ruta</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ========================================================================= -->
      <!-- MODAL: ENRUTADOR Y SECUENCIADOR INTERACTIVO DE PEDIDOS                    -->
      <!-- ========================================================================= -->
      @if (showPlannerModal()) {
        <div class="modal-backdrop" (click)="showPlannerModal.set(false)">
          <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-group">
                <div class="modal-icon-badge" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">
                  🗺️
                </div>
                <div>
                  <h2 class="modal-title">Enrutador y Secuenciador de Pedidos</h2>
                  <p class="modal-subtitle">
                    Ordena las paradas de entrega de cada mensajero. El sistema arma y recalcula la ruta por calles reales.
                  </p>
                </div>
              </div>
              <button type="button" class="btn-close" (click)="showPlannerModal.set(false)">✕</button>
            </div>

            <div class="modal-body">
              <div class="planner-courier-tabs">
                @for (c of couriers(); track c.id) {
                  <button
                    type="button"
                    class="planner-courier-btn"
                    [class.active]="activePlannerCourierId() === c.id"
                    [style.borderColor]="activePlannerCourierId() === c.id ? c.color : 'transparent'"
                    (click)="switchPlannerCourier(c.id)"
                  >
                    <span class="courier-tab-dot" [style.background]="c.color"></span>
                    <strong>{{ c.name }}</strong>
                    <span class="tab-count-pill">{{ c.orderIds.length }} paradas</span>
                  </button>
                }
              </div>

              <div class="planner-kpi-bar">
                <div class="kpi-group">
                  <div class="kpi-box">
                    <span class="kpi-label">Distancia Estimada</span>
                    <span class="kpi-value text-emerald">{{ computedPlannerDistanceKm() }} km</span>
                  </div>
                  <div class="kpi-box">
                    <span class="kpi-label">Tiempo Total en Tránsito</span>
                    <span class="kpi-value text-blue">{{ computedPlannerDurationMins() }} min</span>
                  </div>
                  <div class="kpi-box">
                    <span class="kpi-label">Carga en Maletín / Furgón</span>
                    <span class="kpi-value text-purple">{{ computedPlannerWeightKg() }} kg</span>
                  </div>
                  <div class="kpi-box">
                    <span class="kpi-label">Recaudo Total</span>
                    <span class="kpi-value text-amber">{{ formatCOP(computedPlannerTotalCash()) }}</span>
                  </div>
                </div>

                <button
                  type="button"
                  class="btn btn-secondary btn-optimize"
                  (click)="autoOptimizeSequence()"
                  title="Reorganiza las paradas usando el algoritmo de vecino más cercano para minimizar kilómetros"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                  </svg>
                  <span>✨ Optimizar por Cercanía</span>
                </button>
              </div>

              <div class="sequence-list-container">
                <div class="sequence-route-origin">
                  <div class="origin-node">
                    <div class="origin-pin">🏭</div>
                    <div>
                      <div class="node-title">Punto de Partida: Cava Matriz Cundinamarca</div>
                      <div class="node-desc">Parque Industrial Calle 80 / Cota · Bodega de Pulpa Congelada</div>
                    </div>
                  </div>
                </div>

                <div class="stops-flow">
                  @for (stop of activePlannerStops(); track stop.id; let i = $index) {
                    <div class="stop-card hover-lift">
                      <div class="stop-badge" [style.background]="getActiveCourier()?.color">
                        #{{ i + 1 }}
                      </div>

                      <div class="stop-content">
                        <div class="stop-top-row">
                          <span class="stop-order-tag">{{ stop.orderNumber }}</span>
                          <span class="stop-client-name">{{ stop.clientName }}</span>
                          <span class="stop-zone-pill">{{ stop.zone }}</span>
                        </div>
                        <div class="stop-address">📍 {{ stop.address }}</div>
                        <div class="stop-items">📦 {{ stop.itemsSummary }}</div>
                        <div class="stop-meta-footer">
                          <span>Recaudo: <strong>{{ formatCOP(stop.totalAmount) }}</strong></span>
                          <span>Peso: {{ stop.weightKg }} kg</span>
                        </div>
                      </div>

                      <div class="stop-reorder-actions">
                        <button
                          type="button"
                          class="btn-arrow"
                          [disabled]="i === 0"
                          (click)="moveStopUp(i)"
                          title="Subir en la ruta (entregar antes)"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          class="btn-arrow"
                          [disabled]="i === activePlannerStops().length - 1"
                          (click)="moveStopDown(i)"
                          title="Bajar en la ruta (entregar después)"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          class="btn-remove-stop"
                          (click)="removeStopFromCourier(stop.id)"
                          title="Quitar parada de este mensajero"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  }

                  @if (activePlannerStops().length === 0) {
                    <div class="empty-stops-box">
                      <span>📦</span>
                      <p>Este mensajero no tiene paradas asignadas actualmente.</p>
                      <small>Marca puntos en el mapa o asígnale pedidos para armar su ruta.</small>
                    </div>
                  }
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showPlannerModal.set(false)">
                Cerrar
              </button>
              <button type="button" class="btn btn-primary" (click)="applyPlannedRoute()" style="gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Guardar y Aplicar Ruta al Mapa</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .delivery-map-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
    }

    /* Map Header & Telemetry */
    .map-header-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg, 16px);
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .map-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .map-badge-group {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .live-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.6px;
      color: #10b981;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 4px 10px;
      border-radius: 9999px;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 8px #10b981;
      animation: pulseAnim 1.5s infinite;
    }

    @keyframes pulseAnim {
      0% { transform: scale(0.9); opacity: 0.8; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.8; }
    }

    .badge-pill {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
    }

    .badge-emerald {
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .badge-info {
      background: rgba(14, 165, 233, 0.12);
      color: #0ea5e9;
      border: 1px solid rgba(14, 165, 233, 0.25);
    }

    .badge-stadia {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
      font-weight: 700;
    }

    .map-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn-mark-active {
      background: #f59e0b !important;
      color: #000 !important;
      font-weight: 800 !important;
      animation: markButtonPulse 1.2s infinite;
      box-shadow: 0 0 12px rgba(245, 158, 11, 0.6);
    }

    @keyframes markButtonPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.04); }
      100% { transform: scale(1); }
    }

    .btn-action {
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      font-weight: 700;
      gap: 6px;
    }

    .btn-active {
      background: rgba(16, 185, 129, 0.15) !important;
      color: #10b981 !important;
      border-color: #10b981 !important;
    }

    .speed-toggle-group {
      display: inline-flex;
      background: var(--bg-input);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm, 8px);
      padding: 2px;
    }

    .speed-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .speed-btn.active {
      background: var(--color-primary);
      color: #fff;
    }

    /* Telemetry Bar */
    .telemetry-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      border-top: 1px solid var(--border-subtle);
      padding-top: 12px;
    }

    .telemetry-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-radius: var(--radius-sm, 8px);
      background: var(--bg-subtle);
    }

    .telemetry-icon {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      font-size: 1.1rem;
    }

    .telemetry-val {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .telemetry-lbl {
      font-size: 0.72rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    /* Workspace Grid */
    .map-workspace-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }

    @media (max-width: 768px) {
      .map-address-search-box {
        left: 10px !important;
        right: 10px !important;
        width: auto !important;
        top: max(10px, env(safe-area-inset-top, 10px)) !important;
      }
      .map-unlocked-mode-bar {
        top: calc(max(10px, env(safe-area-inset-top, 10px)) + 52px) !important;
        left: 10px !important;
        right: 10px !important;
        justify-content: space-between;
        overflow-x: auto;
      }
    }

    /* Leaflet Map Card */
    .map-canvas-card {
      position: relative;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg, 16px);
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
      min-height: 520px;
      transition: border-radius 0.25s ease;

      &.map-fullscreen-active {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100dvh !important;
        min-height: 100dvh !important;
        max-height: 100dvh !important;
        z-index: 9999 !important;
        border-radius: 0 !important;
        border: none !important;
        margin: 0 !important;

        .leaflet-map-element {
          width: 100vw !important;
          height: 100dvh !important;
        }
      }
    }

    .map-blur-target {
      position: relative;
      width: 100%;
      height: 100%;
      transition: filter 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);

      &.blurred {
        filter: blur(7px) saturate(0.88);
        pointer-events: none;
        user-select: none;
        transform: scale(1.02);
      }
    }

    .map-locked-screen-overlay {
      position: absolute;
      inset: 0;
      z-index: 1200;
      background: rgba(15, 41, 30, 0.18);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeInDown 0.22s ease;
    }

    .locked-actions-row {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    @media (max-width: 520px) {
      .locked-actions-row {
        flex-direction: column;
        width: 100%;
        max-width: 320px;

        .locked-mode-btn {
          width: 100%;
        }
      }
    }

    .locked-mode-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 15px 28px;
      border-radius: var(--radius-full, 9999px);
      font-size: 0.98rem;
      font-weight: 800;
      font-family: var(--font-body);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      background: var(--color-primary);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.16);
      box-shadow: 0 10px 24px rgba(30, 94, 58, 0.38);

      &:hover {
        background: var(--color-primary-hover);
        transform: translateY(-2px);
        box-shadow: 0 14px 30px rgba(30, 94, 58, 0.5);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .live-dot-indicator {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 8px #4ade80;
      animation: pulseAnim 1.4s infinite;
      flex-shrink: 0;
    }

    /* Fullscreen Map Floating Action Button (Web & Mobile PWA) */
    .map-fullscreen-fab {
      position: absolute;
      bottom: max(76px, calc(env(safe-area-inset-bottom, 16px) + 60px));
      left: 16px;
      right: auto;
      z-index: 1250;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: var(--radius-full, 9999px);
      background: var(--color-primary);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      font-size: 0.82rem;
      font-weight: 800;
      font-family: var(--font-body);
      cursor: pointer;
      box-shadow: 0 8px 22px rgba(30, 94, 58, 0.42);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        background: var(--color-primary-hover);
        transform: translateY(-2px);
        box-shadow: 0 12px 28px rgba(30, 94, 58, 0.55);
      }

      &.is-fullscreen {
        background: var(--color-primary-hover);
        border-color: rgba(255, 255, 255, 0.32);
      }
    }

    @media (max-width: 768px) {
      .map-fullscreen-fab {
        bottom: max(84px, calc(env(safe-area-inset-bottom, 16px) + 68px));
        left: 12px;
        right: auto;
        padding: 10px 14px;
        font-size: 0.78rem;
      }
    }

    /* Floating Mode Switcher when Unlocked */
    .map-unlocked-mode-bar {
      position: absolute;
      top: max(14px, env(safe-area-inset-top, 14px));
      right: 14px;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(12px);
      padding: 5px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }

    .unlocked-mode-pill {
      background: transparent;
      border: none;
      color: #cbd5e1;
      font-size: 0.76rem;
      font-weight: 700;
      padding: 6px 13px;
      border-radius: 9999px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      transition: all 0.2s ease;

      &:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.1);
      }

      &.active {
        background: var(--color-primary);
        color: #ffffff;
        font-weight: 800;
        box-shadow: 0 2px 10px rgba(30, 94, 58, 0.45);
      }
    }

    .unlocked-mode-close {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #f8fafc;
      font-size: 0.73rem;
      font-weight: 700;
      padding: 5px 11px;
      border-radius: 9999px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(239, 68, 68, 0.85);
        border-color: transparent;
      }
    }

    .leaflet-map-element {
      width: 100%;
      height: 540px;
      z-index: 1;
    }

    @media (max-width: 768px) {
      .leaflet-map-element {
        height: 440px;
      }
    }

    /* Floating Address Search Box */
    .map-address-search-box {
      position: absolute;
      top: 14px;
      left: 14px;
      z-index: 1000;
      width: clamp(280px, 34vw, 420px);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

      .search-input-shell {
        display: flex;
        align-items: center;
        background: rgba(15, 23, 42, 0.94);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 9999px;
        padding: 4px 6px 4px 14px;
        gap: 8px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
        transition: all 0.2s ease;

        &:focus-within {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.25), 0 8px 30px rgba(0, 0, 0, 0.45);
        }
      }

      &.has-dropdown .search-input-shell {
        border-bottom-left-radius: 10px;
        border-bottom-right-radius: 10px;
      }

      .search-prefix-icon {
        color: #94a3b8;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .search-mini-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(14, 165, 233, 0.3);
        border-top-color: #0ea5e9;
        border-radius: 50%;
        animation: spinSearch 0.8s linear infinite;
      }

      .address-search-input {
        flex: 1;
        min-width: 0;
        background: transparent;
        border: none;
        outline: none;
        color: #ffffff;
        font-size: 0.82rem;
        font-weight: 500;
        font-family: inherit;

        &::placeholder {
          color: #94a3b8;
          font-size: 0.78rem;
        }
      }

      .search-clear-action {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #cbd5e1;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        font-size: 0.65rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s;

        &:hover {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }
      }

      .search-submit-btn {
        background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
        border: none;
        color: #ffffff;
        font-size: 0.75rem;
        font-weight: 700;
        padding: 6px 13px;
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(14, 165, 233, 0.35);
        white-space: nowrap;

        &:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
      }

      .search-autocomplete-dropdown {
        margin-top: 6px;
        background: rgba(15, 23, 42, 0.96);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
        animation: fadeInDown 0.2s ease;

        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.68rem;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.5px;
        }

        .btn-dismiss-dropdown {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.75rem;
          cursor: pointer;
          &:hover { color: #fff; }
        }

        .dropdown-scroll-list {
          max-height: 250px;
          overflow-y: auto;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: background 0.15s;

          &:hover {
            background: rgba(255, 255, 255, 0.08);
          }

          &:last-child {
            border-bottom: none;
          }

          .item-pin-icon {
            font-size: 1.05rem;
            flex-shrink: 0;
          }

          .item-texts {
            flex: 1;
            min-width: 0;

            .item-title {
              font-size: 0.8rem;
              font-weight: 700;
              color: #f8fafc;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .item-subtitle {
              font-size: 0.7rem;
              color: #94a3b8;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin-top: 1px;
            }

            .item-zone-tag {
              display: inline-block;
              font-size: 0.62rem;
              font-weight: 700;
              background: rgba(14, 165, 233, 0.15);
              color: #38bdf8;
              padding: 1px 6px;
              border-radius: 4px;
              margin-top: 3px;
            }
          }

          .item-order-shortcut {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.35);
            color: #10b981;
            font-size: 0.72rem;
            font-weight: 800;
            padding: 4px 8px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            flex-shrink: 0;

            &:hover {
              background: #10b981;
              color: #ffffff;
            }
          }
        }
      }
    }

    @keyframes spinSearch {
      to { transform: rotate(360deg); }
    }

    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes pulseSearchPin {
      0% { transform: scale(0.95); box-shadow: 0 0 16px rgba(14, 165, 233, 0.8); }
      50% { transform: scale(1.1); box-shadow: 0 0 28px rgba(14, 165, 233, 1); }
      100% { transform: scale(0.95); box-shadow: 0 0 16px rgba(14, 165, 233, 0.8); }
    }

    .map-floating-layer-switcher {
      position: absolute;
      top: 14px;
      right: 14px;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(12px);
      padding: 4px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);

      .layer-switch-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        padding: 5px 12px;
        font-size: 0.76rem;
        font-weight: 700;
        border-radius: 9999px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

        &:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
        }

        &.active {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #0f172a;
          box-shadow: 0 2px 10px rgba(245, 158, 11, 0.4);
        }
      }
    }

    .map-marking-banner {
      position: absolute;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      background: rgba(15, 23, 42, 0.94);
      border: 1px solid #f59e0b;
      color: #fef08a;
      padding: 8px 18px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.82rem;
      font-weight: 700;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
    }

    .banner-pulse {
      width: 8px;
      height: 8px;
      background: #f59e0b;
      border-radius: 50%;
      animation: pulseAnim 1s infinite;
    }

    .banner-close {
      background: transparent;
      border: none;
      color: #fff;
      cursor: pointer;
      font-size: 0.78rem;
      margin-left: 6px;
    }

    /* ========================================================================= */
    /* HIGH CONTRAST MAP LEGEND OVERLAY (Fix for user issue in red rectangle)   */
    /* ========================================================================= */
    .map-legend-overlay {
      position: absolute;
      bottom: 16px;
      left: 16px;
      z-index: 999;
      background: var(--bg-card, #ffffff);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1.5px solid var(--border-subtle, rgba(0, 0, 0, 0.12));
      border-radius: var(--radius-md, 12px);
      padding: 10px 14px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
      max-width: calc(100% - 32px);
    }

    .legend-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      font-weight: 800;
      color: var(--text-main, #0f172a);
      padding: 7px 13px;
      border-radius: 8px;
      background: var(--bg-subtle, #f8fafc);
      border: 1px solid var(--border-subtle, #e2e8f0);
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .legend-chip:hover {
      background: var(--bg-hover, #f1f5f9);
      border-color: var(--color-primary, #10b981);
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    }

    .legend-chip-planta {
      background: rgba(16, 185, 129, 0.12) !important;
      border-color: rgba(16, 185, 129, 0.35) !important;
      color: var(--color-primary-text, #059669) !important;
    }

    .legend-color-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 6px currentColor;
    }

    /* Couriers Deck */
    .couriers-deck-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg, 16px);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .deck-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 10px;
    }

    .deck-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .couriers-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
    }

    .courier-card {
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-left-width: 4px;
      border-radius: var(--radius-md, 10px);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .courier-card:hover, .courier-card.selected {
      background: var(--bg-hover);
      transform: translateY(-2px);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
    }

    .courier-card-head {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .courier-avatar {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
    }

    .courier-meta {
      flex: 1;
    }

    .courier-name-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .courier-name {
      font-size: 0.88rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .courier-status-badge {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(148, 163, 184, 0.15);
      color: #94a3b8;
    }

    .courier-status-badge.en-ruta {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .courier-vehicle-info {
      font-size: 0.74rem;
      color: var(--text-muted);
    }

    .courier-route-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      padding: 6px 0;
      border-top: 1px solid var(--border-subtle);
      border-bottom: 1px solid var(--border-subtle);
    }

    .stat-mini {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .stat-mini-label {
      font-size: 0.65rem;
      color: var(--text-muted);
    }

    .stat-mini-val {
      font-size: 0.78rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .progress-track {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.3s;
    }

    .courier-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
      padding-top: 4px;
    }

    .btn-seq-link {
      background: transparent;
      border: none;
      color: var(--color-primary-text);
      font-size: 0.72rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 4px;
    }

    .btn-seq-link:hover {
      background: rgba(16, 185, 129, 0.1);
    }

    .btn-locate {
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      font-size: 0.7rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      cursor: pointer;
    }

    .btn-locate:hover {
      color: var(--text-main);
      border-color: var(--color-primary);
    }

    /* Modal Backdrop & Windows */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(6px);
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg, 16px);
      width: 100%;
      max-width: 580px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
      animation: modalFadeIn 0.25s ease-out;
      overflow: hidden;
    }

    .modal-lg {
      max-width: 820px;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .modal-icon-badge {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
    }

    .modal-title {
      font-size: 1.15rem;
      font-weight: 800;
      margin: 0;
      color: var(--text-main);
    }

    .modal-subtitle {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin: 2px 0 0 0;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.2rem;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
    }

    .btn-close:hover {
      color: var(--text-main);
      background: var(--bg-hover);
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .modal-footer {
      padding: 14px 20px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      background: var(--bg-subtle);
    }

    /* Point Marker Modal Specials */
    .location-preview-card {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(14, 165, 233, 0.08));
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: var(--radius-md, 12px);
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .loc-badge {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #10b981;
    }

    .loc-title {
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .loc-coords {
      font-size: 0.75rem;
      font-family: monospace;
      color: var(--text-muted);
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .full-col {
      grid-column: 1 / -1;
    }

    .half-col {
      grid-column: span 1;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .form-input, .form-select {
      background: var(--bg-input);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm, 8px);
      color: var(--text-main);
      padding: 8px 12px;
      font-size: 0.88rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .form-input:focus, .form-select:focus {
      border-color: var(--color-primary);
    }

    .pulp-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .pulp-chip {
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .pulp-chip:hover {
      border-color: var(--color-primary);
    }

    .pulp-chip.selected {
      background: rgba(16, 185, 129, 0.15);
      border-color: #10b981;
      color: #10b981;
    }

    .chip-price {
      font-size: 0.72rem;
      opacity: 0.75;
    }

    /* Route Planner Modal Specials */
    .planner-courier-tabs {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .planner-courier-btn {
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-bottom-width: 3px;
      border-radius: var(--radius-sm, 8px);
      padding: 8px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      color: var(--text-muted);
      font-size: 0.85rem;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .planner-courier-btn.active {
      background: var(--bg-hover);
      color: var(--text-main);
    }

    .courier-tab-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .tab-count-pill {
      font-size: 0.7rem;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 999px;
    }

    .planner-kpi-bar {
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md, 10px);
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .kpi-group {
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
    }

    .kpi-box {
      display: flex;
      flex-direction: column;
    }

    .kpi-label {
      font-size: 0.68rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .kpi-value {
      font-size: 1.15rem;
      font-weight: 800;
    }

    .text-emerald { color: #10b981; }
    .text-blue { color: #3b82f6; }
    .text-purple { color: #8b5cf6; }
    .text-amber { color: #f59e0b; }

    .btn-optimize {
      gap: 6px;
      font-size: 0.82rem;
      font-weight: 700;
      border-color: rgba(139, 92, 246, 0.4);
      color: #8b5cf6;
    }

    .btn-optimize:hover {
      background: rgba(139, 92, 246, 0.12);
    }

    /* Sequence Flow List */
    .sequence-list-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .sequence-route-origin {
      background: rgba(16, 185, 129, 0.08);
      border: 1px dashed rgba(16, 185, 129, 0.3);
      border-radius: var(--radius-sm, 8px);
      padding: 10px 14px;
    }

    .origin-node {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .origin-pin {
      font-size: 1.3rem;
    }

    .node-title {
      font-size: 0.88rem;
      font-weight: 800;
      color: #10b981;
    }

    .node-desc {
      font-size: 0.74rem;
      color: var(--text-muted);
    }

    .stops-flow {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .stop-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm, 10px);
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s;
    }

    .stop-card:hover {
      border-color: var(--border-focus);
      background: var(--bg-hover);
    }

    .stop-badge {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      color: #fff;
      font-size: 0.78rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stop-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .stop-top-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .stop-order-tag {
      font-size: 0.72rem;
      font-family: monospace;
      font-weight: 800;
      color: var(--color-primary);
    }

    .stop-client-name {
      font-size: 0.92rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .stop-zone-pill {
      font-size: 0.68rem;
      background: var(--bg-subtle);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--text-muted);
    }

    .stop-address {
      font-size: 0.76rem;
      color: var(--text-muted);
    }

    .stop-items {
      font-size: 0.74rem;
      color: #f59e0b;
    }

    .stop-meta-footer {
      display: flex;
      gap: 14px;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .stop-reorder-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .btn-arrow {
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      border: 1px solid var(--border-subtle);
      background: var(--bg-subtle);
      color: var(--text-main);
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-arrow:hover:not(:disabled) {
      background: var(--color-primary);
      color: #fff;
      border-color: var(--color-primary);
    }

    .btn-arrow:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .btn-remove-stop {
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      border: 1px solid rgba(244, 63, 94, 0.2);
      background: rgba(244, 63, 94, 0.08);
      color: #f43f5e;
      font-size: 0.82rem;
      cursor: pointer;
    }

    .btn-remove-stop:hover {
      background: #f43f5e;
      color: #fff;
    }

    .empty-stops-box {
      padding: 32px 20px;
      text-align: center;
      background: var(--bg-subtle);
      border-radius: var(--radius-sm, 8px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .empty-stops-box span {
      font-size: 2rem;
    }

    .clickable-telemetry {
      cursor: pointer;
      transition: transform 0.16s ease, box-shadow 0.16s ease;
    }

    .clickable-telemetry:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
    }

    /* ========================================================================= */
    /* SLIDE-OVER / BOTTOM-SHEET DELIVERIES DRAWER                               */
    /* ========================================================================= */
    .deliveries-drawer {
      position: absolute;
      top: 64px;
      right: 16px;
      bottom: 64px;
      width: 365px;
      max-width: calc(100% - 32px);
      z-index: 950;
      background: rgba(255, 255, 255, 0.97);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 18px;
      box-shadow: 0 20px 44px rgba(15, 23, 42, 0.22);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: drawerSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes drawerSlideIn {
      from {
        opacity: 0;
        transform: translateX(18px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @media (max-width: 768px) {
      .deliveries-drawer {
        top: auto;
        left: 8px;
        right: 8px;
        bottom: 58px;
        width: auto;
        max-width: none;
        max-height: 68%;
        border-radius: 18px;
      }
    }

    .drawer-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 13px 15px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .drawer-head-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .drawer-badge-icon {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: rgba(30, 94, 58, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .drawer-title {
      font-size: 0.9rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }

    .drawer-subtitle {
      font-size: 0.72rem;
      color: #64748b;
      margin-top: 1px;
    }

    .drawer-head-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .drawer-add-toggle-btn {
      border: none;
      background: #1e5e3a;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 6px 11px;
      border-radius: 9999px;
      cursor: pointer;
      transition: background 0.16s ease;
    }

    .drawer-add-toggle-btn:hover {
      background: #16482c;
    }

    .drawer-add-toggle-btn.active {
      background: #64748b;
    }

    .drawer-close-btn {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #475569;
      font-size: 0.85rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.16s ease;
    }

    .drawer-close-btn:hover {
      background: #f0fdf4;
      color: #1e5e3a;
      border-color: #86efac;
      transform: translateY(-1px);
    }

    /* Registered Orders Box inside Drawer */
    .drawer-quick-add-box {
      padding: 12px 14px;
      background: #f0fdf4;
      border-bottom: 1px solid #bbf7d0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .unmapped-orders-block {
      display: flex;
      flex-direction: column;
    }

    .unmapped-header {
      font-size: 0.72rem;
      font-weight: 800;
      color: #15803d;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .unmapped-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 170px;
      overflow-y: auto;
    }

    .unmapped-empty {
      font-size: 0.76rem;
      color: #64748b;
      padding: 6px 0;
    }

    .unmapped-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #dcfce7;
      border-radius: 8px;
      padding: 5px 8px;
    }

    .unmapped-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      font-size: 0.74rem;
      color: #0f172a;

      span {
        font-size: 0.68rem;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .btn-load-unmapped {
      border: none;
      background: #16a34a;
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      flex-shrink: 0;
    }

    /* Drawer Filter & Search */
    .drawer-filters {
      padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #ffffff;
    }

    .drawer-courier-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    .drawer-c-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 9px;
      border-radius: 9999px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #475569;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;

      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
      }

      &.active {
        background: #1e5e3a;
        color: #ffffff;
        border-color: #1e5e3a;
      }
    }

    .drawer-search-input {
      width: 100%;
      padding: 6px 10px;
      font-size: 0.78rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      color: #0f172a;
      outline: none;
    }

    .drawer-search-input:focus {
      border-color: #1e5e3a;
      background: #ffffff;
    }

    /* Drawer Stops List */
    .drawer-stops-list {
      flex: 1;
      overflow-y: auto;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .drawer-stop-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 10px;
      border-radius: 11px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .drawer-stop-item:hover {
      border-color: #1e5e3a;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
    }

    .drawer-stop-num {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      color: #ffffff;
      font-size: 0.74rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .drawer-stop-body {
      flex: 1;
      min-width: 0;
    }

    .drawer-stop-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .drawer-stop-client {
      font-size: 0.8rem;
      font-weight: 800;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .drawer-stop-amount {
      font-size: 0.76rem;
      font-weight: 800;
      color: #10b981;
      flex-shrink: 0;
    }

    .drawer-stop-addr {
      font-size: 0.72rem;
      color: #475569;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
    }

    .drawer-stop-meta {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.68rem;
      color: #64748b;
      margin-top: 2px;
    }

    .drawer-stop-code {
      font-family: monospace;
      font-weight: 700;
    }

    .drawer-stop-courier-select {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #0f172a;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 6px;
      cursor: pointer;
      outline: none;
    }

    .drawer-stop-courier-select:focus {
      border-color: #1e5e3a;
      background: #ffffff;
    }

    .drawer-stop-del-btn {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      border: 1px solid #fecaca;
      background: #fef2f2;
      color: #dc2626;
      font-size: 0.82rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    .drawer-stop-del-btn:hover {
      background: #dc2626;
      color: #ffffff;
      border-color: #dc2626;
    }

    .drawer-empty {
      padding: 28px 14px;
      text-align: center;
      color: #64748b;
      font-size: 0.8rem;

      span {
        font-size: 1.8rem;
        display: block;
        margin-bottom: 6px;
      }
    }
  `]
})
export class DeliveryMapComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly stateService = inject(StateService);
  private readonly notification = inject(NotificationService);
  private readonly geocodingService = inject(GeocodingService);

  @ViewChild('mapElement') mapElement!: ElementRef<HTMLDivElement>;

  // Slide-over Deliveries Drawer State
  readonly showDeliveriesDrawer = signal<boolean>(false);
  readonly showDrawerQuickAdd = signal<boolean>(false);
  readonly drawerCourierFilter = signal<string>('all');
  readonly drawerSearchQuery = signal<string>('');
  readonly drawerNewClient = signal<string>('');
  readonly drawerNewAddress = signal<string>('');
  readonly drawerNewCourierId = signal<string>('');
  readonly drawerNewAmount = signal<number>(125000);

  // Active Map Tile Style Signal (Defaults to Stadia Maps Alidade Smooth)
  readonly selectedMapStyleId = signal<string>(
    (() => {
      try {
        return localStorage.getItem('despulpadora_map_style') || 'stadia-smooth';
      } catch {
        return 'stadia-smooth';
      }
    })()
  );
  readonly mapStyles = MAP_STYLES;
  private currentTileLayer?: L.TileLayer;
  private currentRefLayer?: L.TileLayer;

  // Leaflet Map instance
  private map?: L.Map;
  private courierMarkers: Map<string, L.Marker> = new Map();
  private stopMarkers: Map<number, L.Marker> = new Map();
  private routeCasingPolylines: Map<string, L.Polyline> = new Map();
  private routePolylines: Map<string, L.Polyline> = new Map();
  private tempPointMarker?: L.Marker;

  // Address Search & Geocoding State
  readonly searchAddressQuery = signal<string>('');
  readonly isSearchingAddress = signal<boolean>(false);
  readonly searchResults = signal<AddressSearchResult[]>([]);
  readonly showSearchResults = signal<boolean>(false);
  private searchDebounceTimer?: any;
  private searchResultMarker?: L.Marker;

  // Real Road Network Cache & Coordinates
  private roadSegmentCache: Map<string, [number, number][]> = new Map();
  private courierFullRoadPaths: Map<string, [number, number][]> = new Map();

  // Map Overlay & Display Mode ('locked' = blurred overlay with 2 buttons, 'live' = routes + couriers, 'stops' = delivery points only)
  readonly mapViewMode = signal<'locked' | 'live' | 'stops'>('locked');
  readonly isMapFullscreen = signal<boolean>(false);

  // Real-time Simulation Engine Signals
  readonly isSimulating = signal<boolean>(false);
  readonly simulationSpeed = signal<number>(1); // 1x, 2x, 4x
  private animFrameId?: any;
  private lastTimestamp = 0;

  // Point Marking Mode
  readonly isMarkingPointMode = signal<boolean>(false);
  readonly showPointOrderModal = signal<boolean>(false);
  readonly newOrderLat = signal<number>(4.670);
  readonly newOrderLng = signal<number>(-74.085);
  readonly newOrderZone = signal<string>('Bogotá Norte / Chicó');
  newOrderClient = '';
  newOrderAddress = '';
  newOrderPhone = '315 789 0123';
  newOrderAmount = 145000;
  newOrderCourierId = '';
  selectedPulpItem = signal<string>('Maracuyá 1000g');

  readonly quickPulpOptions = [
    { name: 'Maracuyá 1000g', emoji: '🟡', price: 11000, kg: 1.0 },
    { name: 'Mango Tommy 1000g', emoji: '🥭', price: 10500, kg: 1.0 },
    { name: 'Lulo de Castilla 500g', emoji: '🟢', price: 6600, kg: 0.5 },
    { name: 'Mora de Castilla 500g', emoji: '🟣', price: 6500, kg: 0.5 },
    { name: 'Guanábana Criolla 1000g', emoji: '🍈', price: 13800, kg: 1.0 }
  ];

  // Route Sequencer / Planner Modal Signals
  readonly showPlannerModal = signal<boolean>(false);
  readonly activePlannerCourierId = signal<string>('c1');
  readonly selectedCourierId = signal<string>('c1');

  // Active Couriers Fleet
  readonly couriers = signal<Courier[]>([
    {
      id: 'c1',
      name: 'Carlos Rodríguez',
      vehicleType: 'moto',
      vehiclePlate: 'HND-45F',
      vehicleModel: 'Honda CB190R Térmica',
      phone: '315 889 0011',
      color: '#10b981',
      colorLight: 'rgba(16, 185, 129, 0.15)',
      capacityKg: 45,
      status: 'en_ruta',
      currentSpeedKmH: 38,
      batteryPct: 94,
      orderIds: [1001, 1002, 1003],
      currentStopIndex: 0,
      progress: 0.25,
      roadStepIndex: 12,
      lat: PLANTA_MATRIZ_LAT,
      lng: PLANTA_MATRIZ_LNG
    },
    {
      id: 'c2',
      name: 'Andrés Morales',
      vehicleType: 'moto',
      vehiclePlate: 'YMH-88B',
      vehicleModel: 'Yamaha Crypton 115 Frigorífica',
      phone: '318 445 6677',
      color: '#3b82f6',
      colorLight: 'rgba(59, 130, 246, 0.15)',
      capacityKg: 40,
      status: 'en_ruta',
      currentSpeedKmH: 34,
      batteryPct: 88,
      orderIds: [1004, 1005, 1006],
      currentStopIndex: 0,
      progress: 0.15,
      roadStepIndex: 25,
      lat: PLANTA_MATRIZ_LAT,
      lng: PLANTA_MATRIZ_LNG
    },
    {
      id: 'c3',
      name: 'Felipe Caicedo',
      vehicleType: 'furgon',
      vehiclePlate: 'CHE-912',
      vehicleModel: 'Furgón N300 ThermoKing Cundinamarca',
      phone: '320 667 8899',
      color: '#f59e0b',
      colorLight: 'rgba(245, 158, 11, 0.15)',
      capacityKg: 450,
      status: 'en_ruta',
      currentSpeedKmH: 42,
      batteryPct: 99,
      orderIds: [1007, 1008],
      currentStopIndex: 0,
      progress: 0.40,
      roadStepIndex: 8,
      lat: PLANTA_MATRIZ_LAT,
      lng: PLANTA_MATRIZ_LNG
    }
  ]);

  // Delivery Stops / Waypoints
  readonly deliveryStops = signal<DeliveryWaypoint[]>(INITIAL_BOGOTA_STOPS);

  // Telemetry Computeds
  readonly deliveredCount = computed(() => {
    return this.deliveryStops().filter(s => s.isDelivered).length;
  });

  readonly totalTransitCash = computed(() => {
    return this.deliveryStops()
      .filter(s => !s.isDelivered)
      .reduce((sum, s) => sum + s.totalAmount, 0);
  });

  readonly activeSpeedAvg = computed(() => {
    const list = this.couriers();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, c) => acc + c.currentSpeedKmH, 0);
    return Math.round(sum / list.length);
  });

  // Planner Computeds for Active Selected Courier
  readonly activePlannerStops = computed(() => {
    const courier = this.couriers().find(c => c.id === this.activePlannerCourierId());
    if (!courier) return [];
    const stopMap = new Map(this.deliveryStops().map(s => [s.id, s]));
    return courier.orderIds
      .map(id => stopMap.get(id))
      .filter((s): s is DeliveryWaypoint => !!s);
  });

  readonly computedPlannerDistanceKm = computed(() => {
    const stops = this.activePlannerStops();
    if (stops.length === 0) return '0.0';
    let totalKm = 0;
    let prevLat = PLANTA_MATRIZ_LAT;
    let prevLng = PLANTA_MATRIZ_LNG;

    for (const stop of stops) {
      totalKm += this.calculateHaversineKm(prevLat, prevLng, stop.lat, stop.lng);
      prevLat = stop.lat;
      prevLng = stop.lng;
    }
    totalKm += this.calculateHaversineKm(prevLat, prevLng, PLANTA_MATRIZ_LAT, PLANTA_MATRIZ_LNG);
    // Real road routing distance factor is ~1.32x compared to straight line
    return (totalKm * 1.32).toFixed(1);
  });

  readonly computedPlannerDurationMins = computed(() => {
    const km = parseFloat(this.computedPlannerDistanceKm());
    const stopsCount = this.activePlannerStops().length;
    const transitMins = Math.round((km / 28) * 60);
    const serviceMins = stopsCount * 8;
    return transitMins + serviceMins;
  });

  readonly computedPlannerWeightKg = computed(() => {
    return this.activePlannerStops().reduce((sum, s) => sum + s.weightKg, 0).toFixed(1);
  });

  readonly computedPlannerTotalCash = computed(() => {
    return this.activePlannerStops().reduce((sum, s) => sum + s.totalAmount, 0);
  });

  ngOnInit() {
    this.syncWithStateServiceOrders();
  }

  ngAfterViewInit() {
    this.initLeafletMap();
    this.startSimulationLoop();
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.map) {
      this.map.remove();
    }
  }

  // =========================================================================
  // LEAFLET MAP INITIALIZATION & RENDERING
  // =========================================================================
  private initLeafletMap() {
    if (!this.mapElement) return;

    // Centered on Bogotá & Cundinamarca
    this.map = L.map(this.mapElement.nativeElement, {
      center: [4.6850, -74.0950],
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Apply Stadia Maps / configured active layer
    this.applyTileLayer(this.selectedMapStyleId());

    // Add Planta Matriz Cundinamarca Marker
    this.addPlantaMarker();

    // Add Waypoint Markers
    this.renderStopMarkers();

    // Fetch and draw real road routes via OSRM / arterial network
    this.buildAndRenderRealRoadRoutes();

    // Add Courier Markers
    this.renderCourierMarkers();

    // Map Click Listener for "Marcar Punto"
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.handleMapClick(e.latlng);
    });

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 250);
  }

  selectMapStyle(styleId: string) {
    this.selectedMapStyleId.set(styleId);
    this.applyTileLayer(styleId);

    const style = MAP_STYLES.find(s => s.id === styleId);
    if (style) {
      this.notification.success(
        `Capa ${style.shortName} Activa`,
        style.description
      );
    }
  }

  applyTileLayer(styleId: string) {
    if (!this.map) return;

    const style = MAP_STYLES.find(s => s.id === styleId) || MAP_STYLES[0];

    // Clean up previous layers
    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
      this.currentTileLayer = undefined;
    }
    if (this.currentRefLayer) {
      this.map.removeLayer(this.currentRefLayer);
      this.currentRefLayer = undefined;
    }

    const options: L.TileLayerOptions = {
      maxZoom: style.maxZoom,
      maxNativeZoom: style.maxNativeZoom,
      attribution: style.id.startsWith('stadia')
        ? '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
        : (style.id === 'esri-gray'
            ? 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
            : '&copy; OpenStreetMap contributors')
    };

    this.currentTileLayer = L.tileLayer(style.url, options).addTo(this.map);

    // If Esri Canvas is active, also add official reference labels
    if (style.id === 'esri-gray') {
      this.currentRefLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, maxNativeZoom: 16 }
      ).addTo(this.map);
    }

    this.updatePolylineStylesForActiveMap();

    try {
      localStorage.setItem('despulpadora_map_style', styleId);
    } catch {}
  }

  private updatePolylineStylesForActiveMap() {
    if (!this.map) return;
    const isDark = this.selectedMapStyleId() === 'stadia-dark';
    const casingColor = isDark ? '#020617' : '#ffffff';
    const casingOpacity = isDark ? 0.9 : 0.85;

    this.routeCasingPolylines.forEach(casing => {
      casing.setStyle({
        color: casingColor,
        opacity: casingOpacity
      });
    });
  }

  private addPlantaMarker() {
    if (!this.map) return;

    const plantaHtml = `
      <div style="
        background: #10b981;
        color: #fff;
        border: 2px solid #ffffff;
        box-shadow: 0 0 16px rgba(16, 185, 129, 0.7);
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        cursor: pointer;
      ">
        🏭
      </div>
    `;

    const plantaIcon = L.divIcon({
      html: plantaHtml,
      className: '',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    const marker = L.marker([PLANTA_MATRIZ_LAT, PLANTA_MATRIZ_LNG], { icon: plantaIcon }).addTo(this.map);
    marker.bindPopup(`
      <div style="font-family: var(--font-body); padding: 4px;">
        <strong style="color: #10b981; font-size: 0.95rem;">🏭 CAVA MATRIZ CUNDINAMARCA</strong>
        <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #475569;">
          Parque Industrial Calle 80 / Cota<br/>
          Hub Central de Almacenamiento & Despacho de Pulpa Congelada.
        </p>
      </div>
    `);
  }

  private renderStopMarkers() {
    if (!this.map) return;

    this.stopMarkers.forEach(m => m.remove());
    this.stopMarkers.clear();

    const stops = this.deliveryStops();

    stops.forEach(stop => {
      const courier = stop.assignedCourierId ? this.couriers().find(c => c.id === stop.assignedCourierId) : undefined;
      const color = courier ? courier.color : '#64748b';
      const stopIndexInCourier = courier ? (courier.orderIds.indexOf(stop.id) + 1) : '📍';

      const iconHtml = `
        <div style="
          background: ${stop.isDelivered ? '#10b981' : color};
          color: #ffffff;
          border: 2px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.76rem;
          cursor: pointer;
          transition: transform 0.2s;
        ">
          ${stop.isDelivered ? '✓' : stopIndexInCourier}
        </div>
      `;

      const stopIcon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(this.map!);

      marker.bindPopup(`
        <div style="font-family: var(--font-body); min-width: 210px;">
          <div style="font-size: 0.72rem; color: ${color}; font-weight: 800;">${stop.orderNumber} · PARADA #${stopIndexInCourier}</div>
          <strong style="font-size: 0.95rem; color: #0f172a; display: block; margin-top: 2px;">${stop.clientName}</strong>
          <div style="font-size: 0.78rem; color: #64748b; margin-top: 4px;">📍 ${stop.address} (${stop.zone})</div>
          <div style="font-size: 0.78rem; color: #f59e0b; margin-top: 2px;">📦 ${stop.itemsSummary}</div>
          <div style="font-size: 0.85rem; font-weight: 800; color: #10b981; margin-top: 6px;">Total: ${this.formatCOP(stop.totalAmount)}</div>
          <div style="margin-top: 6px; font-size: 0.72rem; color: #64748b;">
            Mensajero: <strong>${courier?.name || 'Sin Asignar'}</strong>
          </div>
          <button
            type="button"
            id="btn-delete-stop-${stop.id}"
            style="
              margin-top: 10px;
              width: 100%;
              padding: 7px 10px;
              border-radius: 8px;
              border: 1px solid #fecaca;
              background: #fef2f2;
              color: #dc2626;
              font-size: 0.76rem;
              font-weight: 800;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
            "
          >
            🗑️ Eliminar entrega del mapa
          </button>
        </div>
      `);

      marker.on('popupopen', () => {
        const delBtn = document.getElementById(`btn-delete-stop-${stop.id}`);
        if (delBtn) {
          delBtn.onclick = (e) => {
            e.stopPropagation();
            marker.closePopup();
            this.deleteDeliveryStop(stop.id);
          };
        }
      });

      this.stopMarkers.set(stop.id, marker);
    });
  }

  // =========================================================================
  // REAL ROAD ROUTING ENGINE (OSRM + BOGOTA URBAN CORRIDOR FALLBACK)
  // =========================================================================
  private async getRoadSegment(lat1: number, lng1: number, lat2: number, lng2: number): Promise<[number, number][]> {
    const key = `${lat1.toFixed(4)},${lng1.toFixed(4)}_${lat2.toFixed(4)},${lng2.toFixed(4)}`;
    if (this.roadSegmentCache.has(key)) {
      return this.roadSegmentCache.get(key)!;
    }

    try {
      // Free Open Source Routing Machine endpoint for driving in Colombia
      const url = `https://router.project-osrm.org/route/v1/driving/${lng1.toFixed(5)},${lat1.toFixed(5)};${lng2.toFixed(5)},${lat2.toFixed(5)}?overview=full&geometries=geojson`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        if (data.routes?.[0]?.geometry?.coordinates?.length > 1) {
          // OSRM returns [lng, lat], convert to Leaflet [lat, lng]
          const roadCoords: [number, number][] = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]]
          );
          this.roadSegmentCache.set(key, roadCoords);
          return roadCoords;
        }
      }
    } catch {
      // Fall through to urban road corridor fallback
    }

    // High-fidelity fallback that routes via actual Bogota highway corridors
    const corridorCoords = this.generateUrbanCorridorRoute(lat1, lng1, lat2, lng2);
    this.roadSegmentCache.set(key, corridorCoords);
    return corridorCoords;
  }

  /**
   * Generates realistic street-following waypoints along Bogotá & Cundinamarca
   * arterial corridors (Calle 80, Autopista Norte, Av Boyacá, NQS Cra 30, Calle 26)
   * so lines never cut straight across mountains or buildings.
   */
  private generateUrbanCorridorRoute(lat1: number, lng1: number, lat2: number, lng2: number): [number, number][] {
    const points: [number, number][] = [[lat1, lng1]];

    // Intermediate junction based on Bogota's arterial grid
    const midLat = (lat1 + lat2) / 2;
    const midLng = (lng1 + lng2) / 2;

    // If traveling to/from Cota / Calle 80 Industrial park
    if (lng1 < -74.12 || lng2 < -74.12) {
      // Route via Calle 80 / Siberia interchange
      points.push([4.7220, -74.1350]);
      points.push([4.7150, -74.1080]); // Av. Boyacá con 80
    }

    // If traveling to/from Chía / Cundinamarca Norte
    if (lat1 > 4.80 || lat2 > 4.80) {
      points.push([4.8150, -74.0620]); // Peaje Andes / Autonorte
      points.push([4.7600, -74.0480]); // Autonorte con 170
    }

    // Connect via nearest north-south or east-west arterial
    if (Math.abs(lat1 - lat2) > 0.03 && Math.abs(lng1 - lng2) > 0.03) {
      points.push([midLat, lng1]);
      points.push([midLat, midLng]);
      points.push([lat2, midLng]);
    }

    points.push([lat2, lng2]);

    // Subdivide into smooth road segments
    const smoothPoints: [number, number][] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const pA = points[i];
      const pB = points[i + 1];
      const steps = 6;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        smoothPoints.push([
          pA[0] + (pB[0] - pA[0]) * t,
          pA[1] + (pB[1] - pA[1]) * t
        ]);
      }
    }
    smoothPoints.push([lat2, lng2]);
    return smoothPoints;
  }

  async buildAndRenderRealRoadRoutes() {
    const stopMap = new Map(this.deliveryStops().map(s => [s.id, s]));

    for (const courier of this.couriers()) {
      const stops: [number, number][] = [[PLANTA_MATRIZ_LAT, PLANTA_MATRIZ_LNG]];

      courier.orderIds.forEach(id => {
        const s = stopMap.get(id);
        if (s) stops.push([s.lat, s.lng]);
      });

      if (stops.length > 1) {
        stops.push([PLANTA_MATRIZ_LAT, PLANTA_MATRIZ_LNG]);
      }

      const fullRoadPath: [number, number][] = [];

      for (let i = 0; i < stops.length - 1; i++) {
        const seg = await this.getRoadSegment(stops[i][0], stops[i][1], stops[i + 1][0], stops[i + 1][1]);
        if (fullRoadPath.length > 0) {
          fullRoadPath.push(...seg.slice(1));
        } else {
          fullRoadPath.push(...seg);
        }
      }

      this.courierFullRoadPaths.set(courier.id, fullRoadPath);

      // Render glowing real road polyline on map with crisp casing
      if (this.map && fullRoadPath.length > 1) {
        const isDark = this.selectedMapStyleId() === 'stadia-dark';
        const casingColor = isDark ? '#020617' : '#ffffff';
        const casingOpacity = isDark ? 0.9 : 0.85;
        const showRoutes = this.mapViewMode() !== 'stops';

        let casing = this.routeCasingPolylines.get(courier.id);
        if (casing) {
          casing.setLatLngs(fullRoadPath);
        } else {
          casing = L.polyline(fullRoadPath, {
            color: casingColor,
            weight: 7,
            opacity: casingOpacity,
            lineCap: 'round',
            lineJoin: 'round'
          });
          if (showRoutes) casing.addTo(this.map);
          this.routeCasingPolylines.set(courier.id, casing);
        }

        let polyline = this.routePolylines.get(courier.id);
        if (polyline) {
          polyline.setLatLngs(fullRoadPath);
        } else {
          polyline = L.polyline(fullRoadPath, {
            color: courier.color,
            weight: 4.5,
            opacity: 0.95,
            dashArray: '8, 8',
            lineCap: 'round',
            lineJoin: 'round'
          });
          if (showRoutes) polyline.addTo(this.map);
          this.routePolylines.set(courier.id, polyline);
        }
      }
    }
  }

  private renderCourierMarkers() {
    if (!this.map) return;

    this.couriers().forEach(courier => {
      const courierHtml = `
        <div style="
          position: relative;
          background: ${courier.color};
          color: #ffffff;
          border: 2px solid #ffffff;
          box-shadow: 0 0 16px ${courier.color};
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          cursor: pointer;
        ">
          ${courier.vehicleType === 'moto' ? '🛵' : '🚚'}
          <span style="
            position: absolute;
            bottom: -6px;
            right: -6px;
            background: #0f172a;
            color: #ffffff;
            font-size: 0.58rem;
            font-weight: 800;
            padding: 1px 5px;
            border-radius: 4px;
            border: 1px solid ${courier.color};
          ">${courier.vehiclePlate.split('-')[0]}</span>
        </div>
      `;

      const courierIcon = L.divIcon({
        html: courierHtml,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([courier.lat, courier.lng], { icon: courierIcon });
      if (this.mapViewMode() !== 'stops') {
        marker.addTo(this.map!);
      }

      marker.bindPopup(`
        <div style="font-family: var(--font-body); padding: 4px;">
          <strong style="color: ${courier.color}; font-size: 0.95rem;">${courier.name}</strong>
          <div style="font-size: 0.78rem; color: #475569; margin-top: 2px;">
            ${courier.vehicleModel} (${courier.vehiclePlate})
          </div>
          <div style="font-size: 0.8rem; margin-top: 4px;">
            Velocidad: <strong>${courier.currentSpeedKmH} km/h</strong> · Paradas: <strong>${courier.orderIds.length}</strong>
          </div>
        </div>
      `);

      this.courierMarkers.set(courier.id, marker);
    });
  }

  // =========================================================================
  // DYNAMIC MAP POINT-MARKING & ORDER CREATION
  // =========================================================================
  toggleMarkingPointMode() {
    if (this.mapViewMode() === 'locked') {
      this.enterAllDeliveriesMode();
    }
    this.isMarkingPointMode.update(val => !val);
    if (this.isMarkingPointMode()) {
      this.notification.info(
        'Modo Marcado de Pedidos Activo',
        'Haz clic en cualquier punto de Bogotá o Cundinamarca para fijar la entrega'
      );
    } else {
      if (this.tempPointMarker) {
        this.tempPointMarker.remove();
        this.tempPointMarker = undefined;
      }
    }
  }

  private handleMapClick(latlng: L.LatLng) {
    this.newOrderLat.set(latlng.lat);
    this.newOrderLng.set(latlng.lng);

    const zone = this.detectBogotaZone(latlng.lat, latlng.lng);
    this.newOrderZone.set(zone);
    this.newOrderClient = `Cliente ${zone.split(' ')[0]} #${Math.floor(10 + Math.random() * 90)}`;
    this.newOrderAddress = `Dirección en ${zone}`;

    // Obtener automáticamente la dirección vial real del punto clicado
    this.geocodingService.reverseGeocodeLabel(latlng.lat, latlng.lng).then(revAddr => {
      if (revAddr) {
        this.newOrderAddress = revAddr;
      }
    });

    if (this.map) {
      if (this.tempPointMarker) this.tempPointMarker.remove();

      const tempHtml = `
        <div style="
          background: #f59e0b;
          color: #000;
          border: 3px solid #fff;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.9);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          animation: markButtonPulse 1s infinite;
        ">
          📍
        </div>
      `;

      const tempIcon = L.divIcon({
        html: tempHtml,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      this.tempPointMarker = L.marker([latlng.lat, latlng.lng], { icon: tempIcon }).addTo(this.map);
    }

    this.showPointOrderModal.set(true);
  }

  async geocodeModalAddress() {
    const addr = (this.newOrderAddress || '').trim();
    if (!addr) return;

    const best = await this.geocodingService.geocodeBestMatch(addr);
    if (best) {
      this.newOrderLat.set(best.lat);
      this.newOrderLng.set(best.lng);
      this.newOrderZone.set(best.zone);
      this.newOrderAddress = best.label;

      if (this.map) {
        this.map.flyTo([best.lat, best.lng], 16, { animate: true, duration: 1.0 });
        if (this.tempPointMarker) {
          this.tempPointMarker.setLatLng([best.lat, best.lng]);
        }
      }
      this.notification.success(
        'Coordenadas Calculadas',
        `${best.label} (${best.lat.toFixed(5)}, ${best.lng.toFixed(5)})`
      );
    } else {
      this.notification.warning(
        'No se pudo ubicar',
        'Intenta escribir la dirección como Calle 93 # 13-25 o pega las coordenadas.'
      );
    }
  }

  private detectBogotaZone(lat: number, lng: number): string {
    return this.geocodingService.detectBogotaZone(lat, lng);
  }

  // =========================================================================
  // ADDRESS SEARCH & GEOCODING (ARCGIS COLOMBIA + STADIA + NOMINATIM + BOGOTA GRID)
  // =========================================================================
  onAddressQueryChange(query: string) {
    this.searchAddressQuery.set(query);
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      this.searchResults.set([]);
      this.showSearchResults.set(false);
      this.isSearchingAddress.set(false);
      return;
    }

    this.isSearchingAddress.set(true);
    this.searchDebounceTimer = setTimeout(() => {
      this.executeAddressSearch(trimmed);
    }, 260);
  }

  onSearchFocus() {
    if (this.searchResults().length > 0) {
      this.showSearchResults.set(true);
    }
  }

  closeSearchResults() {
    this.showSearchResults.set(false);
  }

  clearAddressSearch() {
    this.searchAddressQuery.set('');
    this.searchResults.set([]);
    this.showSearchResults.set(false);
    if (this.searchResultMarker) {
      this.searchResultMarker.remove();
      this.searchResultMarker = undefined;
    }
  }

  onSearchEnter() {
    const query = this.searchAddressQuery().trim();
    if (!query) return;

    const results = this.searchResults();
    if (results.length > 0) {
      this.selectAddressResult(results[0]);
    } else {
      this.isSearchingAddress.set(true);
      this.executeAddressSearch(query).then(() => {
        const updated = this.searchResults();
        if (updated.length > 0) {
          this.selectAddressResult(updated[0]);
        } else {
          this.notification.warning(
            'Dirección no encontrada',
            `No se encontró '${query}'. Intenta con nomenclatura (ej: Calle 93 # 13-25), coordenadas o punto de referencia.`
          );
        }
      });
    }
  }

  async executeAddressSearch(query: string) {
    try {
      const geocoded = await this.geocodingService.searchAddress(query);
      const results: AddressSearchResult[] = geocoded.map(item => ({
        id: item.id,
        name: item.name,
        label: item.label,
        lat: item.lat,
        lng: item.lng,
        zone: item.zone,
        locality: item.locality
      }));

      this.searchResults.set(results);
      this.showSearchResults.set(results.length > 0);
    } catch (err) {
      console.error('Error buscando dirección:', err);
    } finally {
      this.isSearchingAddress.set(false);
    }
  }

  selectAddressResult(item: AddressSearchResult) {
    this.showSearchResults.set(false);
    this.searchAddressQuery.set(item.name || item.label);

    if (!this.map) return;

    // Fly smoothly to the found address
    this.map.flyTo([item.lat, item.lng], 16, {
      animate: true,
      duration: 1.2
    });

    if (this.searchResultMarker) {
      this.searchResultMarker.remove();
      this.searchResultMarker = undefined;
    }

    const pinHtml = `
      <div style="
        position: relative;
        background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
        color: #ffffff;
        border: 3px solid #ffffff;
        box-shadow: 0 0 24px rgba(14, 165, 233, 0.9), 0 4px 12px rgba(0, 0, 0, 0.3);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        animation: pulseSearchPin 1.5s infinite;
        cursor: pointer;
      ">
        🔍
        <span style="
          position: absolute;
          bottom: -6px;
          right: -6px;
          background: #f59e0b;
          color: #000;
          font-size: 0.6rem;
          font-weight: 900;
          padding: 2px 5px;
          border-radius: 9999px;
          border: 1px solid #fff;
        ">GPS</span>
      </div>
    `;

    const pinIcon = L.divIcon({
      html: pinHtml,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -22]
    });

    const popupHtml = `
      <div style="min-width: 220px; font-family: inherit; padding: 4px;">
        <div style="font-size: 0.72rem; font-weight: 800; color: #0ea5e9; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
          📍 Dirección Localizada
        </div>
        <div style="font-size: 0.88rem; font-weight: 700; color: #0f172a; line-height: 1.3; margin-bottom: 6px;">
          ${item.label}
        </div>
        <div style="display: flex; gap: 6px; font-size: 0.73rem; color: #64748b; margin-bottom: 10px; background: #f8fafc; padding: 4px 8px; border-radius: 6px;">
          <span>Zona: <b>${item.zone || this.detectBogotaZone(item.lat, item.lng)}</b></span>
        </div>
        <button
          id="btn-create-order-from-search"
          style="
            width: 100%;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: #ffffff;
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            font-weight: 800;
            font-size: 0.82rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          "
        >
          ➕ Crear Pedido en Esta Dirección
        </button>
      </div>
    `;

    this.searchResultMarker = L.marker([item.lat, item.lng], { icon: pinIcon })
      .bindPopup(popupHtml, { closeButton: true, autoClose: false })
      .addTo(this.map);

    this.searchResultMarker.on('popupopen', () => {
      const btn = document.getElementById('btn-create-order-from-search');
      if (btn) {
        btn.onclick = () => {
          this.createOrderFromSearchResult(item);
        };
      }
    });

    setTimeout(() => {
      this.searchResultMarker?.openPopup();
    }, 1250);

    this.notification.info(
      'Dirección Ubicada',
      `${item.label} (${item.zone})`
    );
  }

  createOrderFromSearchResult(item: AddressSearchResult) {
    this.newOrderLat.set(item.lat);
    this.newOrderLng.set(item.lng);
    const zone = item.zone || this.detectBogotaZone(item.lat, item.lng);
    this.newOrderZone.set(zone);
    this.newOrderAddress = item.label;
    this.newOrderClient = `Cliente ${zone.split(' ')[0]} #${Math.floor(10 + Math.random() * 90)}`;

    if (this.map) {
      if (this.tempPointMarker) this.tempPointMarker.remove();

      const tempHtml = `
        <div style="
          background: #f59e0b;
          color: #000;
          border: 3px solid #fff;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.9);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          animation: markButtonPulse 1s infinite;
        ">
          📍
        </div>
      `;

      const tempIcon = L.divIcon({
        html: tempHtml,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      this.tempPointMarker = L.marker([item.lat, item.lng], { icon: tempIcon }).addTo(this.map);
    }

    this.showPointOrderModal.set(true);
  }

  selectPulpPreset(preset: { name: string; price: number; kg: number }) {
    this.selectedPulpItem.set(preset.name);
    this.newOrderAmount = preset.price * 10;
  }

  cancelPointCreation() {
    this.showPointOrderModal.set(false);
    if (this.tempPointMarker) {
      this.tempPointMarker.remove();
      this.tempPointMarker = undefined;
    }
  }

  savePointAsOrder() {
    const lat = this.newOrderLat();
    const lng = this.newOrderLng();
    const courierId = this.newOrderCourierId || '';
    const clientName = this.newOrderClient.trim() || 'Cliente Directo Bogotá';
    const address = this.newOrderAddress.trim() || `Sector ${this.newOrderZone()}`;
    const amount = Number(this.newOrderAmount) || 120000;

    const courierObj = courierId ? this.couriers().find(c => c.id === courierId) : undefined;

    const newOrderDto = this.stateService.createOrder({
      clientName,
      clientPhone: this.newOrderPhone,
      clientAddress: address,
      courierName: courierObj?.name,
      notes: `Pedido georreferenciado en ${this.newOrderZone()}`,
      items: [
        {
          fruitName: this.selectedPulpItem().split(' ')[0] || 'Maracuyá',
          grammage: 1000,
          quantity: 10,
          unitPrice: amount / 10
        }
      ]
    });

    this.stateService.updateOrderStatus(newOrderDto.orderId, 'DISPATCHED');

    const newStop: DeliveryWaypoint = {
      id: newOrderDto.orderId,
      orderNumber: newOrderDto.orderNumber,
      clientName,
      clientPhone: this.newOrderPhone,
      address,
      zone: this.newOrderZone(),
      lat,
      lng,
      totalAmount: amount,
      weightKg: 10.0,
      itemsSummary: `10x ${this.selectedPulpItem()}`,
      isDelivered: false,
      assignedCourierId: courierId,
      orderRef: newOrderDto
    };

    this.deliveryStops.update(stops => [newStop, ...stops]);

    if (courierId) {
      this.couriers.update(list => list.map(c => {
        if (c.id === courierId) {
          return {
            ...c,
            orderIds: [...c.orderIds, newStop.id]
          };
        }
        return c;
      }));
    }

    if (this.tempPointMarker) {
      this.tempPointMarker.remove();
      this.tempPointMarker = undefined;
    }
    this.isMarkingPointMode.set(false);
    this.showPointOrderModal.set(false);

    this.renderStopMarkers();
    this.buildAndRenderRealRoadRoutes();

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });

    this.notification.success(
      '¡Punto Guardado en el Mapa!',
      courierObj
        ? `${newOrderDto.orderNumber} asignado a ${courierObj.name} en ${newStop.zone}`
        : `${newOrderDto.orderNumber} cargado en ${newStop.zone} (sin mensajero asignado)`
    );
  }

  // =========================================================================
  // ROUTE SEQUENCER / REORDERING / NEAREST-NEIGHBOR OPTIMIZER
  // =========================================================================
  openRoutePlanner() {
    this.showPlannerModal.set(true);
    setTimeout(() => this.map?.invalidateSize(), 150);
  }

  openRoutePlannerFor(courierId: string) {
    this.activePlannerCourierId.set(courierId);
    this.openRoutePlanner();
  }

  switchPlannerCourier(courierId: string) {
    this.activePlannerCourierId.set(courierId);
  }

  getActiveCourier(): Courier | undefined {
    return this.couriers().find(c => c.id === this.activePlannerCourierId());
  }

  moveStopUp(index: number) {
    if (index <= 0) return;
    const courierId = this.activePlannerCourierId();

    this.couriers.update(list => list.map(c => {
      if (c.id === courierId) {
        const orderIds = [...c.orderIds];
        const temp = orderIds[index];
        orderIds[index] = orderIds[index - 1];
        orderIds[index - 1] = temp;
        return { ...c, orderIds };
      }
      return c;
    }));

    // Dynamically rebuild real street route on map
    this.buildAndRenderRealRoadRoutes();
    this.renderStopMarkers();
  }

  moveStopDown(index: number) {
    const courierId = this.activePlannerCourierId();
    const courier = this.couriers().find(c => c.id === courierId);
    if (!courier || index >= courier.orderIds.length - 1) return;

    this.couriers.update(list => list.map(c => {
      if (c.id === courierId) {
        const orderIds = [...c.orderIds];
        const temp = orderIds[index];
        orderIds[index] = orderIds[index + 1];
        orderIds[index + 1] = temp;
        return { ...c, orderIds };
      }
      return c;
    }));

    // Dynamically rebuild real street route on map
    this.buildAndRenderRealRoadRoutes();
    this.renderStopMarkers();
  }

  // =========================================================================
  // SLIDE-OVER DELIVERIES DRAWER & PIN DELETION METHODS
  // =========================================================================
  readonly filteredDrawerStops = computed(() => {
    const cFilter = this.drawerCourierFilter();
    const query = this.drawerSearchQuery().trim().toLowerCase();
    let list = this.deliveryStops();

    if (cFilter !== 'all') {
      list = list.filter(s => s.assignedCourierId === cFilter);
    }

    if (query) {
      list = list.filter(
        s =>
          s.clientName.toLowerCase().includes(query) ||
          s.orderNumber.toLowerCase().includes(query) ||
          s.address.toLowerCase().includes(query) ||
          s.zone.toLowerCase().includes(query)
      );
    }

    return list;
  });

  readonly unmappedOrders = computed(() => {
    const mappedIds = new Set(this.deliveryStops().map(s => s.id));
    return this.stateService
      .orders()
      .filter(o => o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && !mappedIds.has(o.orderId));
  });

  toggleDeliveriesDrawer() {
    const next = !this.showDeliveriesDrawer();
    if (next && this.mapViewMode() === 'locked') {
      this.enterAllDeliveriesMode();
    }
    this.showDeliveriesDrawer.set(next);
  }

  toggleDrawerQuickAdd() {
    const next = !this.showDrawerQuickAdd();
    if (next) {
      this.drawerNewCourierId.set('');
    }
    this.showDrawerQuickAdd.set(next);
  }

  assignCourierToStop(stopId: number, newCourierId: string) {
    this.deliveryStops.update(stops =>
      stops.map(s => (s.id === stopId ? { ...s, assignedCourierId: newCourierId } : s))
    );

    this.couriers.update(list =>
      list.map(c => {
        const filteredIds = c.orderIds.filter(id => id !== stopId);
        if (c.id === newCourierId) {
          return { ...c, orderIds: [...filteredIds, stopId] };
        }
        return { ...c, orderIds: filteredIds };
      })
    );

    this.renderStopMarkers();
    this.buildAndRenderRealRoadRoutes();
  }

  getStopCourierColor(stop: DeliveryWaypoint): string {
    if (!stop.assignedCourierId) return '#64748b';
    const courier = this.couriers().find(c => c.id === stop.assignedCourierId);
    return courier ? courier.color : '#64748b';
  }

  getStopCourierName(stop: DeliveryWaypoint): string {
    if (!stop.assignedCourierId) return 'Sin asignar';
    const courier = this.couriers().find(c => c.id === stop.assignedCourierId);
    return courier ? courier.name : 'Sin asignar';
  }

  getStopOrderIndex(stop: DeliveryWaypoint): string | number {
    if (!stop.assignedCourierId) return '📍';
    const courier = this.couriers().find(c => c.id === stop.assignedCourierId);
    if (!courier) return '📍';
    const idx = courier.orderIds.indexOf(stop.id);
    return idx >= 0 ? idx + 1 : '📍';
  }

  focusStopOnMap(stop: DeliveryWaypoint) {
    if (this.mapViewMode() === 'locked') {
      this.enterAllDeliveriesMode();
    }
    if (this.map) {
      this.map.flyTo([stop.lat, stop.lng], 15, { duration: 0.9 });
      const marker = this.stopMarkers.get(stop.id);
      if (marker) {
        setTimeout(() => marker.openPopup(), 450);
      }
    }
  }

  deleteDeliveryStop(stopId: number) {
    const target = this.deliveryStops().find(s => s.id === stopId);
    this.deliveryStops.update(stops => stops.filter(s => s.id !== stopId));

    this.couriers.update(list =>
      list.map(c => ({
        ...c,
        orderIds: c.orderIds.filter(id => id !== stopId)
      }))
    );

    const marker = this.stopMarkers.get(stopId);
    if (marker) {
      marker.remove();
      this.stopMarkers.delete(stopId);
    }

    this.renderStopMarkers();
    this.buildAndRenderRealRoadRoutes();

    if (target) {
      this.notification.info(
        'Entrega Eliminada del Mapa',
        `Se retiró ${target.clientName} (${target.orderNumber}) de la ruta activa.`
      );
    }
  }

  startMarkingFromDrawer() {
    this.showDeliveriesDrawer.set(false);
    this.newOrderCourierId = '';
    if (this.mapViewMode() === 'locked') {
      this.enterAllDeliveriesMode();
    }
    if (!this.isMarkingPointMode()) {
      this.toggleMarkingPointMode();
    }
  }

  async submitDrawerQuickAdd() {
    const clientName = this.drawerNewClient().trim();
    const address = this.drawerNewAddress().trim();
    const courierId = this.drawerNewCourierId() || '';
    const amount = Number(this.drawerNewAmount()) || 120000;

    if (!clientName || !address) {
      this.notification.warning('Datos Incompletos', 'Ingresa el nombre del cliente y la dirección.');
      return;
    }

    let lat = 4.6765 + (Math.random() - 0.5) * 0.04;
    let lng = -74.0538 + (Math.random() - 0.5) * 0.04;
    let zone = this.detectBogotaZone(lat, lng);

    try {
      const geo = await this.geocodingService.geocodeBestMatch(address);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        zone = geo.zone || zone;
      }
    } catch { }

    const courierObj = courierId ? this.couriers().find(c => c.id === courierId) : undefined;
    const newOrderDto = this.stateService.createOrder({
      clientName,
      clientPhone: '315 000 0000',
      clientAddress: address,
      courierName: courierObj?.name,
      notes: `Agregado desde el mapa (${zone})`,
      items: [
        {
          fruitName: 'Maracuyá',
          grammage: 1000,
          quantity: 10,
          unitPrice: Math.round(amount / 10)
        }
      ]
    });

    this.stateService.updateOrderStatus(newOrderDto.orderId, 'DISPATCHED');

    const newStop: DeliveryWaypoint = {
      id: newOrderDto.orderId,
      orderNumber: newOrderDto.orderNumber,
      clientName,
      clientPhone: '315 000 0000',
      address,
      zone,
      lat,
      lng,
      totalAmount: amount,
      weightKg: 10.0,
      itemsSummary: '10x Maracuyá 1000g',
      isDelivered: false,
      assignedCourierId: courierId,
      orderRef: newOrderDto
    };

    this.deliveryStops.update(stops => [newStop, ...stops]);
    if (courierId) {
      this.couriers.update(list =>
        list.map(c => (c.id === courierId ? { ...c, orderIds: [...c.orderIds, newStop.id] } : c))
      );
    }

    this.drawerNewClient.set('');
    this.drawerNewAddress.set('');
    this.drawerNewCourierId.set('');
    this.showDrawerQuickAdd.set(false);

    this.renderStopMarkers();
    this.buildAndRenderRealRoadRoutes();
    this.focusStopOnMap(newStop);

    this.notification.success(
      'Entrega Agregada al Mapa',
      courierObj
        ? `${newStop.clientName} asignado a ${courierObj.name}.`
        : `${newStop.clientName} cargado al mapa (sin mensajero asignado).`
    );
  }

  async addExistingOrderToMap(order: OrderDto) {
    const courierId = this.drawerNewCourierId() || '';
    let lat = 4.665 + (Math.random() - 0.5) * 0.04;
    let lng = -74.065 + (Math.random() - 0.5) * 0.04;
    let zone = this.detectBogotaZone(lat, lng);

    if (order.clientAddress && order.clientAddress.trim().length >= 4) {
      try {
        const geo = await this.geocodingService.geocodeBestMatch(order.clientAddress);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
          zone = geo.zone || zone;
        }
      } catch { }
    }

    const newStop: DeliveryWaypoint = {
      id: order.orderId,
      orderNumber: order.orderNumber,
      clientName: order.clientName,
      clientPhone: order.clientPhone || '300 000 0000',
      address: order.clientAddress || 'Bogotá D.C.',
      zone,
      lat,
      lng,
      totalAmount: order.totalAmount,
      weightKg: 12.0,
      itemsSummary: order.items.map(it => `${it.quantity}x ${it.fruitName}`).join(', ') || 'Pulpas',
      isDelivered: false,
      assignedCourierId: courierId,
      orderRef: order
    };

    this.stateService.updateOrderStatus(order.orderId, 'DISPATCHED');
    this.deliveryStops.update(stops => [newStop, ...stops]);
    if (courierId) {
      this.couriers.update(list =>
        list.map(c => (c.id === courierId ? { ...c, orderIds: [...c.orderIds, newStop.id] } : c))
      );
    }

    this.renderStopMarkers();
    this.buildAndRenderRealRoadRoutes();
    this.focusStopOnMap(newStop);
  }

  removeStopFromCourier(stopId: number) {
    this.deleteDeliveryStop(stopId);
  }

  autoOptimizeSequence() {
    const courierId = this.activePlannerCourierId();
    const stops = this.activePlannerStops();
    if (stops.length < 2) {
      this.notification.info('Optimización', 'Se requieren al menos 2 paradas para optimizar la secuencia.');
      return;
    }

    const unvisited = [...stops];
    const optimized: DeliveryWaypoint[] = [];
    let currentLat = PLANTA_MATRIZ_LAT;
    let currentLng = PLANTA_MATRIZ_LNG;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const d = this.calculateHaversineKm(currentLat, currentLng, unvisited[i].lat, unvisited[i].lng);
        if (d < minDistance) {
          minDistance = d;
          nearestIdx = i;
        }
      }

      const nextStop = unvisited.splice(nearestIdx, 1)[0];
      optimized.push(nextStop);
      currentLat = nextStop.lat;
      currentLng = nextStop.lng;
    }

    const newOrderIds = optimized.map(s => s.id);

    this.couriers.update(list => list.map(c => {
      if (c.id === courierId) {
        return { ...c, orderIds: newOrderIds };
      }
      return c;
    }));

    this.buildAndRenderRealRoadRoutes();
    this.renderStopMarkers();

    this.notification.success(
      '¡Ruta Optimizada por Calles!',
      `Secuencia reordenada para menor consumo de combustible y menor tiempo en Bogotá.`
    );
  }

  applyPlannedRoute() {
    this.buildAndRenderRealRoadRoutes();
    this.renderStopMarkers();
    this.showPlannerModal.set(false);

    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.5 }
    });

    const courier = this.getActiveCourier();
    this.notification.success(
      'Ruta Aplicada con Éxito',
      `El mensajero ${courier?.name} ha recibido su nuevo orden de entrega en tiempo real.`
    );
  }

  // =========================================================================
  // REAL-TIME COURIER MOVEMENT SIMULATION LOOP (ALONG REAL ROADS)
  // =========================================================================
  private startSimulationLoop() {
    const loop = (timestamp: number) => {
      if (!this.lastTimestamp) this.lastTimestamp = timestamp;
      const deltaSec = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      if (this.isSimulating()) {
        this.updateSimulationTick(deltaSec * this.simulationSpeed());
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private updateSimulationTick(step: number) {
    this.couriers.update(list => list.map(c => {
      const roadPath = this.courierFullRoadPaths.get(c.id);
      if (!roadPath || roadPath.length < 2) return c;

      // Advance along detailed road coordinates
      // Speed factor: 30 km/h baseline
      const speedStep = step * (c.currentSpeedKmH / 30) * 1.8;
      let newStepIndex = c.roadStepIndex + speedStep;

      if (newStepIndex >= roadPath.length - 1) {
        newStepIndex = 0; // complete loop, return to plant
      }

      const idx = Math.floor(newStepIndex);
      const nextIdx = (idx + 1) % roadPath.length;
      const ratio = newStepIndex - idx;

      const currentLat = roadPath[idx][0] + (roadPath[nextIdx][0] - roadPath[idx][0]) * ratio;
      const currentLng = roadPath[idx][1] + (roadPath[nextIdx][1] - roadPath[idx][1]) * ratio;

      // Update Leaflet marker position smoothly along the actual street
      const marker = this.courierMarkers.get(c.id);
      if (marker) {
        marker.setLatLng([currentLat, currentLng]);
      }

      // Check proximity to delivery stops to mark delivered
      this.checkStopProximity(c, currentLat, currentLng);

      return {
        ...c,
        roadStepIndex: newStepIndex,
        lat: currentLat,
        lng: currentLng,
        status: 'en_ruta'
      };
    }));
  }

  private checkStopProximity(courier: Courier, lat: number, lng: number) {
    const stops = this.deliveryStops();
    for (const stop of stops) {
      if (stop.assignedCourierId === courier.id && !stop.isDelivered) {
        const distKm = this.calculateHaversineKm(lat, lng, stop.lat, stop.lng);
        if (distKm < 0.35) { // within 350 meters of stop
          this.markStopDeliveredSilently(stop.id);
        }
      }
    }
  }

  private markStopDeliveredSilently(stopId: number) {
    this.deliveryStops.update(stops => stops.map(s => {
      if (s.id === stopId && !s.isDelivered) {
        return { ...s, isDelivered: true };
      }
      return s;
    }));
    this.renderStopMarkers();
  }

  enterLiveMapMode() {
    this.mapViewMode.set('live');
    this.isSimulating.set(true);
    this.syncMapLayersForMode();
    if (this.map) {
      setTimeout(() => {
        this.map?.invalidateSize();
        this.fitMapToAllStops();
      }, 60);
    }
  }

  enterAllDeliveriesMode() {
    this.mapViewMode.set('stops');
    this.isSimulating.set(false);
    this.syncMapLayersForMode();
    if (this.map) {
      setTimeout(() => {
        this.map?.invalidateSize();
        this.fitMapToAllStops();
      }, 60);
    }
  }

  lockMapOverlay() {
    this.mapViewMode.set('locked');
    this.isSimulating.set(false);
  }

  toggleMapFullscreen() {
    const nextState = !this.isMapFullscreen();
    this.isMapFullscreen.set(nextState);
    document.body.style.overflow = nextState ? 'hidden' : '';

    // Refresh Leaflet canvas dimensions for both Web and Mobile PWA
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 80);
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 260);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isMapFullscreen()) {
      this.toggleMapFullscreen();
    }
  }

  private syncMapLayersForMode() {
    if (!this.map) return;

    const mode = this.mapViewMode();
    if (mode === 'stops') {
      // Hide moving courier markers and route polylines so only assigned delivery points are shown
      this.routeCasingPolylines.forEach(p => p.remove());
      this.routePolylines.forEach(p => p.remove());
      this.courierMarkers.forEach(m => m.remove());
    } else if (mode === 'live') {
      // Restore route polylines and live courier markers onto the map
      this.routeCasingPolylines.forEach(p => {
        if (!this.map!.hasLayer(p)) p.addTo(this.map!);
      });
      this.routePolylines.forEach(p => {
        if (!this.map!.hasLayer(p)) p.addTo(this.map!);
      });
      this.courierMarkers.forEach(m => {
        if (!this.map!.hasLayer(m)) m.addTo(this.map!);
      });
    }
  }

  private fitMapToAllStops() {
    if (!this.map) return;
    const coords: [number, number][] = [
      [PLANTA_MATRIZ_LAT, PLANTA_MATRIZ_LNG],
      ...this.deliveryStops().map(s => [s.lat, s.lng] as [number, number])
    ];
    if (coords.length > 1) {
      const bounds = L.latLngBounds(coords);
      this.map.flyToBounds(bounds, { padding: [48, 48], maxZoom: 13, duration: 1.0 });
    }
  }

  toggleSimulation() {
    if (this.mapViewMode() !== 'live') {
      this.enterLiveMapMode();
      return;
    }
    this.isSimulating.update(v => !v);
  }

  setSimulationSpeed(speed: number) {
    this.simulationSpeed.set(speed);
  }

  resetSimulation() {
    this.couriers.update(list => list.map(c => ({
      ...c,
      roadStepIndex: 0,
      lat: PLANTA_MATRIZ_LAT,
      lng: PLANTA_MATRIZ_LNG,
      status: 'en_planta'
    })));

    this.deliveryStops.update(stops => stops.map(s => ({
      ...s,
      isDelivered: false
    })));

    this.couriers().forEach(c => {
      const m = this.courierMarkers.get(c.id);
      if (m) m.setLatLng([PLANTA_MATRIZ_LAT, PLANTA_MATRIZ_LNG]);
    });

    this.renderStopMarkers();
    this.buildAndRenderRealRoadRoutes();
    this.notification.info('Simulación Reiniciada', 'Todos los mensajeros han regresado a la Cava Matriz Cundinamarca.');
  }

  selectCourier(id: string) {
    if (this.mapViewMode() !== 'live') {
      this.mapViewMode.set('live');
      this.isSimulating.set(true);
      this.syncMapLayersForMode();
    }
    this.selectedCourierId.set(id);
    const courier = this.couriers().find(c => c.id === id);
    if (courier && this.map) {
      this.map.flyTo([courier.lat, courier.lng], 14, { duration: 1.2 });
    }
  }

  flyToCourier(c: Courier) {
    this.selectCourier(c.id);
  }

  getCourierCompletedStops(c: Courier): number {
    const stopMap = new Map(this.deliveryStops().map(s => [s.id, s]));
    return c.orderIds.filter(id => stopMap.get(id)?.isDelivered).length;
  }

  getCourierProgressPct(c: Courier): number {
    if (c.orderIds.length === 0) return 0;
    return Math.round((this.getCourierCompletedStops(c) / c.orderIds.length) * 100);
  }

  private syncWithStateServiceOrders() {
    const stateOrders = this.stateService.orders().filter(o => o.status === 'DISPATCHED');
    const existingIds = new Set(this.deliveryStops().map(s => s.id));

    stateOrders.forEach((order, i) => {
      if (!existingIds.has(order.orderId)) {
        const seedLats = [4.6850, 4.6450, 4.6720, 4.6210, 4.8450];
        const seedLngs = [-74.0550, -74.0950, -74.0450, -74.1400, -74.0650];
        const lat = seedLats[i % seedLats.length];
        const lng = seedLngs[i % seedLngs.length];
        const courierIds = ['c1', 'c2', 'c3'];
        const assignedCourierId = courierIds[i % courierIds.length];

        const stop: DeliveryWaypoint = {
          id: order.orderId,
          orderNumber: order.orderNumber,
          clientName: order.clientName,
          clientPhone: order.clientPhone || '300 123 4567',
          address: order.clientAddress || 'Bogotá D.C.',
          zone: this.detectBogotaZone(lat, lng),
          lat,
          lng,
          totalAmount: order.totalAmount,
          weightKg: 12.0,
          itemsSummary: order.items.map(it => `${it.quantity}x ${it.fruitName}`).join(', ') || 'Pulpas Variadas',
          isDelivered: order.status === 'DELIVERED',
          assignedCourierId,
          orderRef: order
        };

        this.deliveryStops.update(stops => [stop, ...stops]);
        this.couriers.update(list => list.map(c => {
          if (c.id === assignedCourierId) {
            return { ...c, orderIds: [...c.orderIds, stop.id] };
          }
          return c;
        }));

        // Georreferenciar automáticamente la dirección real del pedido
        if (order.clientAddress && order.clientAddress.trim().length >= 4) {
          this.geocodingService.geocodeBestMatch(order.clientAddress).then(geo => {
            if (geo) {
              this.deliveryStops.update(stops =>
                stops.map(s =>
                  s.id === order.orderId
                    ? { ...s, lat: geo.lat, lng: geo.lng, zone: geo.zone }
                    : s
                )
              );
              this.renderStopMarkers();
              this.buildAndRenderRealRoadRoutes();
            }
          });
        }
      }
    });
  }

  private calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  formatCOP(val: number): string {
    return '$ ' + (val || 0).toLocaleString('es-CO');
  }
}
