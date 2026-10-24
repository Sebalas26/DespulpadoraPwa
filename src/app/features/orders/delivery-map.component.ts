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
  routeCode?: string;
  routeDay?: string;
  routeStatus?: 'en_preparacion' | 'en_ruta' | 'completada' | 'liquidada';
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
  paymentMethod?: 'EFECTIVO' | 'NEQUI' | 'BANCOLOMBIA' | 'CREDITO';
  isPriority?: boolean;
  isBilled?: boolean;
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
    assignedCourierId: 'c1',
    isBilled: true
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
    assignedCourierId: 'c1',
    isBilled: true
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
    assignedCourierId: '',
    isBilled: false
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
    assignedCourierId: 'c2',
    isBilled: true
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
    assignedCourierId: '',
    isBilled: false
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
    assignedCourierId: 'c2',
    isBilled: true
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
    assignedCourierId: '',
    isBilled: false
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
    assignedCourierId: 'c3',
    isBilled: true
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

export const MAP_STYLES: MapStyleOption[] = [
  {
    id: 'osm-white',
    name: 'OpenStreetMap White Smooth',
    shortName: 'White Smooth',
    badge: '100% GRATIS',
    icon: '',
    description: 'Cartografía blanca minimalista 100% gratuita y sin API Key con todas las vías y barrios de Colombia.',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 20,
    maxNativeZoom: 19
  },
  {
    id: 'osm-dark',
    name: 'OpenStreetMap Dark Smooth',
    shortName: 'Dark Smooth',
    badge: 'MODO NOCHE',
    icon: '',
    description: 'Modo oscuro elegante de alto contraste 100% gratuito y sin API Key para visibilidad nocturna.',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 20,
    maxNativeZoom: 19,
    isDark: true
  },
  {
    id: 'esri-gray',
    name: 'Esri World Gray Canvas',
    shortName: 'Esri Canvas',
    badge: 'ARCGIS',
    icon: '',
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
    icon: '',
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

        <!-- Telemetry Summary Cards -->
        <div class="telemetry-bar">
          <div class="telemetry-item">
            <div class="telemetry-icon" style="background: rgba(16, 185, 129, 0.12); color: var(--color-primary-text); display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
            </div>
            <div>
              <div class="telemetry-val">{{ assignedCouriers().length }} Mensajeros</div>
              <div class="telemetry-lbl">En Despacho Activo</div>
            </div>
          </div>

          <div
            class="telemetry-item clickable-telemetry"
            (click)="toggleDeliveriesDrawer()"
            title="Haz clic para ver, agregar o eliminar entregas del mapa"
          >
            <div class="telemetry-icon" style="background: rgba(59, 130, 246, 0.12); color: var(--color-blue-text); display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <div>
              <div class="telemetry-val">{{ deliveredCount() }} / {{ deliveryStops().length }} Entregas</div>
              <div class="telemetry-lbl">Progreso · Clic para gestionar</div>
            </div>
          </div>

          <div class="telemetry-item">
            <div class="telemetry-icon" style="background: rgba(245, 158, 11, 0.12); color: var(--color-secondary-text); display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="6" width="20" height="12" rx="2"></rect>
                <circle cx="12" cy="12" r="2"></circle>
                <path d="M6 12h.01M18 12h.01"></path>
              </svg>
            </div>
            <div>
              <div class="telemetry-val">{{ formatCOP(totalTransitCash()) }}</div>
              <div class="telemetry-lbl">Recaudo en Calle</div>
            </div>
          </div>

          <div class="telemetry-item no-mobile">
            <div class="telemetry-icon" style="background: rgba(139, 92, 246, 0.12); color: var(--color-purple-text); display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
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
          [class.is-stops-mode]="mapViewMode() === 'stops' || showDeliveriesDrawer()"
        >
          <!-- Blurred & Locked Inner Wrapper when mapViewMode() === 'locked' -->
          <div class="map-blur-target" [class.blurred]="mapViewMode() === 'locked'">
            <!-- Hint Banner when in Point-Marking Mode -->
            @if (isMarkingPointMode()) {
              <div class="map-marking-banner">
                <span class="banner-pulse"></span>
                <span>MODO MARCADO ACTIVO: Haz clic en cualquier lugar de Bogotá o Cundinamarca para fijar la entrega y crear la orden.</span>
                <button class="banner-close" (click)="toggleMarkingPointMode()">Cancelar</button>
              </div>
            }

            <div #mapElement class="leaflet-map-element" id="bogota-cundinamarca-map"></div>

            <!-- Floating Address Geocoder Search Box -->
            <div
              class="map-address-search-box"
              [class.has-dropdown]="showSearchResults() && searchResults().length > 0"
              [class.mobile-hidden]="(mapViewMode() === 'stops' || showDeliveriesDrawer()) && !isMobileAddressSearchOpen()"
              [class.mobile-expanded-active]="isMobileAddressSearchOpen()"
            >
              <div class="search-input-shell">
                <span class="search-prefix-icon" (click)="toggleMobileAddressSearch()">
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

                <!-- Mobile Close Search Button when expanded in Stops mode -->
                @if (isMobileAddressSearchOpen()) {
                  <button
                    type="button"
                    class="search-mobile-close-btn"
                    (click)="closeMobileAddressSearch()"
                    title="Cerrar buscador"
                  >
                    ✕
                  </button>
                }
              </div>

              <!-- Autocomplete Suggestions Dropdown -->
              @if (showSearchResults() && searchResults().length > 0) {
                <div class="search-autocomplete-dropdown">
                  <div class="dropdown-header">
                    <span>DIRECCIONES ENCONTRADAS ({{ searchResults().length }})</span>
                    <button type="button" class="btn-dismiss-dropdown" (click)="closeSearchResults()">✕</button>
                  </div>
                  <div class="dropdown-scroll-list">
                    @for (item of searchResults(); track item.id) {
                      <div class="dropdown-item" (click)="selectAddressResult(item)">
                        <span class="item-pin-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                        </span>
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
          </div>

          <!-- OVERLAY SCREEN WITH 2 GREEN BUTTONS WHEN MAP IS LOCKED -->
          @if (mapViewMode() === 'locked') {
            <div class="map-locked-screen-overlay">
              <div class="locked-actions-row">
                <button
                  type="button"
                  class="locked-mode-btn locked-mode-live"
                  (click)="enterLiveMapMode()"
                >
                  <span class="live-beacon">
                    <span class="beacon-ping"></span>
                    <span class="beacon-dot"></span>
                  </span>
                  <span>En Vivo</span>
                </button>

                <button
                  type="button"
                  class="locked-mode-btn locked-mode-deliveries"
                  (click)="enterAllDeliveriesMode()"
                >
                  <span>Ver Todas las Entregas</span>
                  <span class="btn-counter-badge">{{ deliveryStops().length }}</span>
                </button>
              </div>
            </div>
          } @else {
            <!-- Floating Mode Switcher Pill in Top-Right when Unlocked -->
            <div
              class="map-unlocked-mode-bar"
              [class.search-collapsed]="(mapViewMode() === 'stops' || showDeliveriesDrawer()) && !isMobileAddressSearchOpen()"
            >
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
                [class.active]="mapViewMode() === 'stops' || showDeliveriesDrawer()"
                (click)="openAllDeliveriesAndDrawer()"
                title="Ver todas las entregas en el mapa y abrir/cerrar el listado"
              >
                <span>Ver Todas las Entregas ({{ deliveryStops().length }})</span>
              </button>

              <!-- Mobile Search Magnifying Glass Icon Button when search is collapsed in Stops mode -->
              @if ((mapViewMode() === 'stops' || showDeliveriesDrawer()) && !isMobileAddressSearchOpen()) {
                <button
                  type="button"
                  class="unlocked-mode-search-icon-btn"
                  (click)="openMobileAddressSearch()"
                  title="Buscar dirección en el mapa"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              }

              <!-- Fullscreen Button in mode bar when in Stops mode -->
              @if (mapViewMode() === 'stops') {
                <button
                  type="button"
                  class="unlocked-mode-fullscreen-btn"
                  (click)="toggleMapFullscreen()"
                  [title]="isMapFullscreen() ? 'Salir de pantalla completa' : 'Ver mapa en pantalla completa'"
                >
                  @if (isMapFullscreen()) {
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M8 3v3a2 2 0 0 1-2 2H3"></path>
                      <path d="M21 8h-3a2 2 0 0 1-2-2V3"></path>
                      <path d="M3 16h3a2 2 0 0 1 2 2v3"></path>
                      <path d="M16 21v-3a2 2 0 0 1 2-2h3"></path>
                    </svg>
                  } @else {
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M15 3h6v6"></path>
                      <path d="M9 21H3v-6"></path>
                      <path d="M21 3l-7 7"></path>
                      <path d="M3 21l7-7"></path>
                    </svg>
                  }
                </button>
              }

              <button
                type="button"
                class="unlocked-mode-close"
                title="Bloquear mapa y volver a la pantalla de selección"
                (click)="lockMapOverlay()"
              >
                Bloquear
              </button>
            </div>

            <!-- Zone Polygon Assignment Card (Active in 'Ver Todas las Entregas') -->
            @if (mapViewMode() === 'stops') {
              @if (showZoneAssignCard()) {
                <div class="zone-assign-card" (click)="$event.stopPropagation()">
                  <div class="zone-assign-head">
                    <div>
                      <div class="zone-assign-title">
                        Zona Seleccionada ({{ zoneCapturedStops().length }} entregas)
                      </div>
                      <div class="zone-assign-sub">
                        Elige el domiciliario para asignarle todas las entregas dentro del polígono
                      </div>
                    </div>
                    <button type="button" class="zone-assign-close" (click)="clearZonePolygon()">✕</button>
                  </div>

                  @if (zoneCapturedStops().length > 0) {
                    <div class="zone-stops-chips">
                      @for (st of zoneCapturedStops(); track st.id) {
                        <span class="zone-stop-chip">{{ st.orderNumber }} · {{ st.clientName }}</span>
                      }
                    </div>

                    <div class="zone-courier-buttons">
                      @for (c of couriers(); track c.id) {
                        <button
                          type="button"
                          class="zone-courier-btn"
                          [style.borderColor]="c.color"
                          (click)="assignZoneStopsToCourier(c.id)"
                        >
                          <span class="c-dot" [style.background]="c.color"></span>
                          <span>{{ c.name }}</span>
                        </button>
                      }
                      <button
                        type="button"
                        class="zone-courier-btn zone-unassign-btn"
                        (click)="assignZoneStopsToCourier('')"
                      >
                        Dejar sin mensajero
                      </button>
                    </div>
                  } @else {
                    <div class="zone-empty-msg">
                      No hay entregas dentro de los puntos marcados. Haz clic en el mapa para trazar otra zona.
                    </div>
                  }
                </div>
              }
            }
          }

          <!-- ======================================================================= -->
          <!-- SLIDE-OVER / BOTTOM-SHEET DRAWER: GESTIONAR ENTREGAS EN EL MAPA          -->
          <!-- ======================================================================= -->
          @if (showDeliveriesDrawer()) {
            <div
              class="deliveries-drawer"
              [style.height]="drawerHeightStyle()"
              (click)="$event.stopPropagation()"
            >
              <!-- Drag / Resize Handle Bar (Mobile Bottom Sheet) -->
              <div
                class="drawer-drag-handle-zone"
                (pointerdown)="startDrawerResize($event)"
                (click)="toggleDrawerExpandPreset()"
                title="Desliza o toca para ajustar el tamaño"
              >
                <div class="drawer-drag-pill"></div>
              </div>

              <div class="drawer-head">
                <div class="drawer-head-left">
                  <span class="drawer-badge-icon" style="display: flex; align-items: center; justify-content: center;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                      <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                  </span>
                  <div>
                    <div class="drawer-title">Entregas en el Mapa ({{ filteredDrawerStops().length }})</div>
                  </div>
                </div>
                <div class="drawer-head-actions">
                  <button
                    type="button"
                    class="drawer-refresh-btn"
                    [class.is-spinning]="isRefreshingDrawer()"
                    (click)="refreshDeliveriesFromOrders()"
                    title="Actualizar y sincronizar lista de pedidos"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                      <path d="M3 3v5h5"></path>
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                      <path d="M16 16h5v5"></path>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="drawer-close-btn"
                    (click)="showDeliveriesDrawer.set(false)"
                    title="Ocultar entregas en el mapa"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </div>
              </div>

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
                      [class.is-pill-drop-target]="dragOverCourierPillId() === c.id"
                      (click)="drawerCourierFilter.set(c.id)"
                      (dragover)="onCourierPillDragOver($event, c.id)"
                      (dragleave)="onCourierPillDragLeave(c.id)"
                      (drop)="onDropStopOnCourierPill($event, c.id)"
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
                  placeholder="Filtrar por cliente, pedido o dirección..."
                />
              </div>

              <!-- 10-Second Informative Banner: Unbilled Order Courier Assignment Alert -->
              @if (activeUnbilledAlert(); as alert) {
                <div class="drawer-unbilled-alert-banner">
                  <div class="alert-content">
                    <div class="alert-icon-box">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                    </div>
                    <div class="alert-details">
                      <div class="alert-headline">
                        El pedido <strong>{{ alert.orderNumber }}</strong> aún no está listo
                      </div>
                      <div class="alert-subline">
                        No se puede asignar mensajero porque el pedido aún no está facturado.
                      </div>
                    </div>
                    <div class="alert-actions">
                      <button
                        type="button"
                        class="btn-alert-priority"
                        (click)="requestPriorityFromBanner()"
                        title="Solicitar prioridad urgente en cava para este pedido"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        <span>Solicitar Prioridad</span>
                      </button>
                      <button
                        type="button"
                        class="btn-alert-close"
                        (click)="dismissUnbilledAlert()"
                        title="Cerrar alerta"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <!-- 10s Countdown Progress Bar -->
                  <div class="alert-countdown-track">
                    <div class="alert-countdown-bar"></div>
                  </div>
                </div>
              }

              <!-- Deliveries List -->
              <div
                class="drawer-stops-list"
                (dragover)="$event.preventDefault()"
                (drop)="onRouteStopContainerDrop($event)"
              >
                @for (stop of filteredDrawerStops(); track stop.id) {
                  <div
                    class="drawer-stop-item"
                    [class.is-priority]="isStopPriority(stop)"
                    draggable="true"
                    [class.is-dragging]="draggedRouteStopId() === stop.id"
                    [class.is-drag-over]="dragOverRouteStopId() === stop.id && draggedRouteStopId() !== stop.id"
                    (dragstart)="onRouteStopDragStart($event, stop)"
                    (dragover)="onRouteStopDragOver($event, stop)"
                    (dragleave)="onRouteStopDragLeave(stop.id)"
                    (drop)="onRouteStopDrop($event, stop)"
                    (dragend)="onRouteStopDragEnd()"
                    (click)="focusStopOnMap(stop)"
                    title="Mantén presionado y arrastra para cambiar el orden de entrega en la ruta"
                  >
                    <span class="stop-drag-grip" title="Arrastrar para reordenar ruta">⋮⋮</span>

                    <div
                      class="drawer-stop-num"
                      [class.is-unassigned]="!stop.assignedCourierId && !stop.isDelivered"
                      [style.background]="stop.assignedCourierId || stop.isDelivered ? getStopCourierColor(stop) : '#ffffff'"
                    >
                      {{ stop.isDelivered ? '✓' : getStopOrderIndex(stop) }}
                    </div>

                    <div class="drawer-stop-body">
                      <!-- Línea 1: Cliente a la izquierda y Valor total a la derecha -->
                      <div class="drawer-stop-top">
                        <span class="drawer-stop-client" [title]="stop.clientName">{{ stop.clientName }}</span>
                        <span class="drawer-stop-amount">{{ formatCOP(stop.totalAmount) }}</span>
                      </div>

                      <!-- Línea 2: Dirección completa e independiente -->
                      <div class="drawer-stop-addr" [title]="stop.address">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; color: #64748b;">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>{{ stop.address }}</span>
                      </div>

                      <!-- Línea 3: Guía de pedido + Badge Facturado/Sin Facturar (espacio propio sin cortar) -->
                      <div class="drawer-stop-status-line">
                        <span class="drawer-stop-code">{{ stop.orderNumber }}</span>
                        <span
                          class="stop-billed-badge"
                          [class.is-billed]="isStopBilled(stop)"
                          [title]="isStopBilled(stop) ? 'Pedido Facturado' : 'Pedido No Facturado (Aún en cava)'"
                        >
                          @if (isStopBilled(stop)) {
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>Facturado</span>
                          } @else {
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="8" x2="12" y2="12"></line>
                              <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <span>Sin facturar</span>
                          }
                        </span>
                      </div>

                      <!-- Línea 4: Asignación de mensajero y botones de acción rápida -->
                      <div class="drawer-stop-footer-line" (click)="$event.stopPropagation()">
                        <div class="drawer-courier-wrap">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: #64748b; flex-shrink: 0;">
                            <circle cx="5" cy="16" r="3"></circle>
                            <circle cx="19" cy="16" r="3"></circle>
                            <path d="M12 16h3l3-6h-5l-2 3H8l2-5h3"></path>
                          </svg>
                          <select
                            class="drawer-stop-courier-select"
                            [ngModel]="stop.assignedCourierId || ''"
                            (ngModelChange)="onCourierSelectChange(stop, $event)"
                            title="Asignar o cambiar mensajero de esta entrega"
                          >
                            <option value="">Sin mensajero</option>
                            @for (c of couriers(); track c.id) {
                              <option [value]="c.id">{{ c.name }}</option>
                            }
                          </select>
                        </div>

                        <div class="drawer-stop-actions">
                          <!-- Priority Alert Button -->
                          <button
                            type="button"
                            class="drawer-stop-priority-btn"
                            [class.is-active-priority]="isStopPriority(stop)"
                            [title]="isStopPriority(stop) ? 'Quitar alerta de prioridad' : 'Marcar alerta de prioridad urgente en cava'"
                            (click)="toggleStopPriority(stop)"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                            </svg>
                          </button>

                          <!-- Delete Stop Button -->
                          <button
                            type="button"
                            class="drawer-stop-del-btn"
                            title="Eliminar esta entrega del mapa"
                            (click)="deleteDeliveryStop(stop.id)"
                            style="display: flex; align-items: center; justify-content: center;"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="drawer-empty">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 6px;">
                      <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                    </svg>
                    <p>No hay entregas que coincidan con el filtro.</p>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Left Floating Controls Container: Vertical Courier Initials Stack + Fullscreen Button -->
          @if (mapViewMode() !== 'locked') {
            <div class="map-left-controls-container" [class.is-fullscreen]="isMapFullscreen()">
              <!-- Vertical Courier Initials List (Directly above Fullscreen FAB) - only in live mode -->
              @if (mapViewMode() === 'live') {
                <div class="map-couriers-vertical-fab-stack">
                  <!-- Bodega Matriz Plant Button -->
                  <button
                    type="button"
                    class="courier-fab-item fab-planta"
                    [class.is-selected]="!selectedCourierId()"
                    (click)="flyToPlantaMatriz()"
                    title="Bodega Matriz (Cota/Calle 80) · Centrar planta"
                  >
                    <span class="fab-initial">BM</span>
                  </button>

                  <!-- Courier Initials Buttons -->
                  @for (c of assignedCouriers(); track c.id) {
                    <button
                      type="button"
                      class="courier-fab-item"
                      [class.is-selected]="selectedCourierId() === c.id"
                      [style.--courier-accent]="c.color"
                      (click)="selectCourier(c.id)"
                      [title]="c.name + ' (' + c.orderIds.length + ' paradas) · Clic para ver ruta'"
                    >
                      <span class="fab-initial">{{ getCourierInitials(c.name) }}</span>
                      @if (c.orderIds.length > 0) {
                        <span class="fab-badge">{{ c.orderIds.length }}</span>
                      }
                    </button>
                  }
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
                } @else {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 3h6v6"></path>
                    <path d="M9 21H3v-6"></path>
                    <path d="M21 3l-7 7"></path>
                    <path d="M3 21l7-7"></path>
                  </svg>
                }
              </button>
            </div>
          }
        </div>

        <!-- Couriers Real-Time Status Deck -->
        @if (assignedCouriers().length > 0) {
          <div class="couriers-deck-card">
            <div class="deck-header">
              <h3 class="deck-title">Domiciliarios con entregas asignadas ({{ assignedCouriers().length }})</h3>
              <span class="badge-pill badge-info">Tiempo Real</span>
            </div>

            <div class="couriers-list">
              @for (c of assignedCouriers(); track c.id) {
                <div
                  class="courier-card"
                  [style.borderLeftColor]="c.color"
                  [class.selected]="selectedCourierId() === c.id"
                  [class.mobile-card-expanded]="isMobileCourierCardExpanded(c.id)"
                  (click)="onCourierCardClick(c.id)"
                >
                  <!-- Resumen Compacto Mobile PWA -->
                  <div class="mobile-summary-header" (click)="toggleMobileCourierCard(c.id, $event); onCourierCardClick(c.id)">
                    <div class="ms-left">
                      <span class="ms-code-badge">{{ c.name }}</span>
                      <span class="ms-subtitle">Placa: {{ c.vehiclePlate }} • #{{ c.routeCode || 'RUTA' }} · {{ c.vehicleType === 'moto' ? 'Moto' : 'Carro' }}</span>
                    </div>
                    <div class="ms-right">
                      <div class="ms-top-right">
                        <span class="ms-value">{{ getCourierCompletedStops(c) }}/{{ c.orderIds.length }} paradas</span>
                        <span class="ms-chevron" [class.is-open]="isMobileCourierCardExpanded(c.id)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </span>
                      </div>
                      <span class="ms-status-pill">
                        {{ isCourierReadyToReceive(c) ? 'Por Recibir' : (c.status === 'en_ruta' ? 'En Ruta' : (c.status === 'entregando' ? 'En Sitio' : 'En Planta')) }}
                      </span>
                    </div>
                  </div>

                  <div class="mobile-courier-details">
                  <div class="courier-card-head">
                    <div class="courier-avatar" [style.background]="c.colorLight" [style.color]="c.color" style="display: flex; align-items: center; justify-content: center;">
                      @if (c.vehicleType === 'moto') {
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="5" cy="16" r="3"></circle>
                          <circle cx="19" cy="16" r="3"></circle>
                          <path d="M12 16h3l3-6h-5l-2 3H8l2-5h3"></path>
                        </svg>
                      } @else {
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="1" y="3" width="15" height="13"></rect>
                          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                          <circle cx="5.5" cy="18.5" r="2.5"></circle>
                          <circle cx="18.5" cy="18.5" r="2.5"></circle>
                        </svg>
                      }
                    </div>
                    <div class="courier-meta">
                      <div class="courier-name-row">
                        <span class="courier-name">{{ c.name }}</span>
                        <div class="courier-badges-inline">
                          <span class="courier-route-code-pill" [style.color]="c.color">
                            {{ c.routeCode || 'RUTA' }}
                          </span>
                          <span class="courier-stops-pill" title="Paradas completadas / asignadas">
                            Paradas: <strong>{{ getCourierCompletedStops(c) }}/{{ c.orderIds.length }}</strong>
                          </span>
                          <span class="courier-status-badge" [class.en-ruta]="c.status === 'en_ruta'" [class.ready-badge]="isCourierReadyToReceive(c)">
                            {{ isCourierReadyToReceive(c) ? 'Por Recibir' : (c.status === 'en_ruta' ? 'En Ruta' : (c.status === 'entregando' ? 'En Sitio' : 'En Planta')) }}
                          </span>
                        </div>
                      </div>
                      <div class="courier-vehicle-info">
                        <span>{{ c.vehicleModel }} · <strong>{{ c.vehiclePlate }}</strong></span>
                        <span class="courier-phone-inline">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                          </svg>
                          {{ c.phone }}
                        </span>
                      </div>
                    </div>
                  </div>

                  @if (isCourierReadyToReceive(c)) {
                    <div class="courier-ready-banner">
                      <span class="ready-dot"></span>
                      <span>Ruta Finalizada · Entregas completas · Recibir caja</span>
                    </div>
                  }

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
                    @if (isCourierReadyToReceive(c)) {
                      <button
                        type="button"
                        class="btn-receive-action"
                        (click)="$event.stopPropagation(); openReceiveCourierModal(c)"
                        title="Recibir domiciliario y liquidar el dinero de la ruta"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span>Recibir Domiciliario</span>
                      </button>
                    } @else {
                      <button
                        type="button"
                        class="btn-seq-link"
                        (click)="$event.stopPropagation(); openRoutePlannerFor(c.id)"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <circle cx="6" cy="19" r="3"></circle>
                          <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"></path>
                          <circle cx="18" cy="5" r="3"></circle>
                        </svg>
                        <span>Editar Ruta</span>
                      </button>

                      @if (c.orderIds.length > 0) {
                        <button
                          type="button"
                          class="btn-force-receive"
                          (click)="$event.stopPropagation(); markAllCourierStopsDelivered(c.id)"
                          title="Simular entrega total y habilitar botón Recibir Domiciliario"
                        >
                          Finalizar
                        </button>
                      }
                    }

                    <button
                      type="button"
                      class="btn-locate"
                      (click)="$event.stopPropagation(); flyToCourier(c)"
                      title="Centrar mapa en el mensajero"
                    >
                      Ubicar
                    </button>
                  </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- ========================================================================= -->
      <!-- MODAL: MARCAR NUEVO PUNTO DE ENTREGA Y GUARDAR PEDIDO                      -->
      <!-- ========================================================================= -->
      @if (showPointOrderModal()) {
        <div class="modal-backdrop" (click)="cancelPointCreation()">
          <div class="modal-card" (click)="$event.stopPropagation()" style="max-width: 580px;">
            <div class="modal-header">
              <div class="modal-title-group">
                <div class="modal-icon-badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; display: flex; align-items: center; justify-content: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
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
                      style="padding: 0 10px; font-size: 0.78rem; flex-shrink: 0; display: inline-flex; align-items: center; gap: 4px;"
                      (click)="geocodeModalAddress()"
                      title="Calcular coordenadas GPS automáticamente a partir de esta dirección"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      <span>Ubicar</span>
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
                    <option value="">Sin mensajero asignado</option>
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
                        <span>{{ p.name }}</span>
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
                <div class="modal-icon-badge" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; display: flex; align-items: center; justify-content: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                    <line x1="8" y1="2" x2="8" y2="18"></line>
                    <line x1="16" y1="6" x2="16" y2="22"></line>
                  </svg>
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
                  <span>Optimizar por Cercanía</span>
                </button>
              </div>

              <div class="sequence-list-container">
                <div class="sequence-route-origin">
                  <div class="origin-node">
                    <div class="origin-pin" style="display: flex; align-items: center; justify-content: center;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M2 20h20M5 20V8l5 4V4l10 8v8"></path>
                      </svg>
                    </div>
                    <div>
                      <div class="node-title">Punto de Partida: Cava Matriz Cundinamarca</div>
                      <div class="node-desc">Parque Industrial Calle 80 / Cota · Bodega de Pulpa Congelada</div>
                    </div>
                  </div>
                </div>

                <div
                  class="stops-flow"
                  (dragover)="$event.preventDefault()"
                  (drop)="onRouteStopContainerDrop($event, activePlannerCourierId())"
                >
                  @for (stop of activePlannerStops(); track stop.id; let i = $index) {
                    <div
                      class="stop-card hover-lift"
                      draggable="true"
                      [class.is-dragging]="draggedRouteStopId() === stop.id"
                      [class.is-drag-over]="dragOverRouteStopId() === stop.id && draggedRouteStopId() !== stop.id"
                      (dragstart)="onRouteStopDragStart($event, stop)"
                      (dragover)="onRouteStopDragOver($event, stop)"
                      (dragleave)="onRouteStopDragLeave(stop.id)"
                      (drop)="onRouteStopDrop($event, stop, activePlannerCourierId())"
                      (dragend)="onRouteStopDragEnd()"
                      title="Mantén presionado y arrastra para cambiar el orden de la parada"
                    >
                      <span class="stop-drag-grip" title="Arrastrar para reordenar ruta">⋮⋮</span>

                      <div class="stop-badge" [style.background]="getActiveCourier()?.color">
                        #{{ i + 1 }}
                      </div>

                      <div class="stop-content">
                        <div class="stop-top-row">
                          <span class="stop-order-tag">{{ stop.orderNumber }}</span>
                          <span class="stop-client-name">{{ stop.clientName }}</span>
                          <span class="stop-zone-pill">{{ stop.zone }}</span>
                        </div>
                        <div class="stop-address">{{ stop.address }}</div>
                        <div class="stop-items">{{ stop.itemsSummary }}</div>
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
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 6px;">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                      </svg>
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

      <!-- ========================================================================= -->
      <!-- MODAL: RECIBIR DOMICILIARIO Y LIQUIDACIÓN DE CAJA (ARQUEO DE ENTREGA)     -->
      <!-- ========================================================================= -->
      @if (showReceiveModal() && receivingCourier()) {
        <div class="modal-backdrop" (click)="closeReceiveCourierModal()">
          <div class="modal-card modal-lg settlement-modal" (click)="$event.stopPropagation()">
            <!-- Modal Header -->
            <div class="modal-header" style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-bottom: 1px solid #bbf7d0;">
              <div class="modal-title-group">
                <div class="modal-icon-badge" style="background: #10b981; color: #ffffff; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35); display: flex; align-items: center; justify-content: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <h2 class="modal-title" style="color: #064e3b;">Recibir Domiciliario · Liquidación de Caja</h2>
                    <span class="badge-route-pill">{{ receivingCourier()?.routeCode || 'RUTA-BOGOTA' }}</span>
                  </div>
                  <p class="modal-subtitle" style="color: #047857;">
                    Arqueo de dinero recaudado, verificación de entregas y paz y salvo de recorrido
                  </p>
                </div>
              </div>
              <button type="button" class="btn-close" (click)="closeReceiveCourierModal()">✕</button>
            </div>

            <div class="modal-body" style="padding: 20px 24px;">
              <!-- Domiciliario Banner Profile -->
              <div class="courier-settlement-profile">
                <div class="profile-left">
                  <div class="courier-avatar-lg" [style.background]="receivingCourier()?.colorLight" [style.color]="receivingCourier()?.color" style="display: flex; align-items: center; justify-content: center;">
                    @if (receivingCourier()?.vehicleType === 'moto') {
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="5" cy="16" r="3"></circle>
                        <circle cx="19" cy="16" r="3"></circle>
                        <path d="M12 16h3l3-6h-5l-2 3H8l2-5h3"></path>
                      </svg>
                    } @else {
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="1" y="3" width="15" height="13"></rect>
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                        <circle cx="5.5" cy="18.5" r="2.5"></circle>
                        <circle cx="18.5" cy="18.5" r="2.5"></circle>
                      </svg>
                    }
                  </div>
                  <div>
                    <h3 class="courier-profile-name">{{ receivingCourier()?.name }}</h3>
                    <div class="courier-profile-sub">
                      <span>{{ receivingCourier()?.vehicleModel }}</span>
                      <span>·</span>
                      <strong class="plate-pill">{{ receivingCourier()?.vehiclePlate }}</strong>
                      <span>·</span>
                      <span>Tel: {{ receivingCourier()?.phone }}</span>
                    </div>
                  </div>
                </div>

                <div class="profile-stats-strip">
                  <div class="pstat-item">
                    <span class="pstat-val">{{ receivingCourierStops().length }}</span>
                    <span class="pstat-lbl">Paradas</span>
                  </div>
                  <div class="pstat-item text-emerald">
                    <span class="pstat-val">{{ getReceivedDeliveredCount() }}</span>
                    <span class="pstat-lbl">Entregadas</span>
                  </div>
                  <div class="pstat-item text-purple">
                    <span class="pstat-val">{{ formatCOP(receivingTotalCollected()) }}</span>
                    <span class="pstat-lbl">Total Recaudo</span>
                  </div>
                </div>
              </div>

              <!-- Lista de Entregas y Métodos de Cobro -->
              <div class="settlement-section-title">
                <span>Relación de Entregas y Métodos de Pago</span>
                <small>Indica cómo pagó cada cliente para cuadrar la caja</small>
              </div>

              <div class="settlement-orders-table-wrapper">
                <table class="settlement-orders-table">
                  <thead>
                    <tr>
                      <th style="width: 40px;">#</th>
                      <th>Guía / Cliente</th>
                      <th>Destino</th>
                      <th>Valor Pedido</th>
                      <th>Estado</th>
                      <th>Método de Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (stop of receivingCourierStops(); track stop.id; let idx = $index) {
                      <tr [class.row-not-delivered]="!getEffectiveStopDelivered(stop)">
                        <td class="col-num">{{ idx + 1 }}</td>
                        <td>
                          <div class="order-code-tag">{{ stop.orderNumber }}</div>
                          <strong class="client-title">{{ stop.clientName }}</strong>
                        </td>
                        <td class="col-address">{{ stop.address }}</td>
                        <td class="col-amount">{{ formatCOP(stop.totalAmount) }}</td>
                        <td>
                          <button
                            type="button"
                            class="pill-status-toggle"
                            [class.is-delivered]="getEffectiveStopDelivered(stop)"
                            (click)="toggleStopDelivered(stop.id)"
                            title="Cambiar estado entre Entregado y Novedad / No entregado"
                          >
                            {{ getEffectiveStopDelivered(stop) ? 'Entregado' : 'No entregado' }}
                          </button>
                        </td>
                        <td>
                          <select
                            class="payment-method-select"
                            [ngModel]="getEffectiveStopPaymentMethod(stop)"
                            (ngModelChange)="setStopPaymentMethod(stop.id, $event)"
                            [disabled]="!getEffectiveStopDelivered(stop)"
                          >
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="NEQUI">Nequi / Daviplata</option>
                            <option value="BANCOLOMBIA">Transferencia Bancolombia</option>
                            <option value="CREDITO">Factura a Crédito</option>
                          </select>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Módulo de Arqueo de Caja / Recaudo -->
              <div class="cash-settlement-deck">
                <div class="cash-summary-column">
                  <div class="cash-summary-card">
                    <span class="cash-summary-label">Efectivo Esperado a Recibir</span>
                    <span class="cash-summary-amount text-emerald">{{ formatCOP(receivingExpectedCash()) }}</span>
                    <span class="cash-summary-hint">Dinero en billetes/monedas que el domi debe entregar</span>
                  </div>

                  <div class="digital-summary-card">
                    <div class="digital-row">
                      <span>Pagos Digitales (Nequi/Banco):</span>
                      <strong>{{ formatCOP(receivingExpectedDigital()) }}</strong>
                    </div>
                    @if (receivingExpectedCredit() > 0) {
                      <div class="digital-row">
                        <span>Facturas a Crédito / Cuenta:</span>
                        <strong>{{ formatCOP(receivingExpectedCredit()) }}</strong>
                      </div>
                    }
                    <div class="digital-row total-row">
                      <span>Total Liquidado de la Ruta:</span>
                      <strong>{{ formatCOP(receivingTotalCollected()) }}</strong>
                    </div>
                  </div>
                </div>

                <div class="cash-count-column">
                  <div class="cash-count-card">
                    <label class="cash-input-label">
                      <span>Efectivo Físico Entregado en Mano:</span>
                      <small>Ingresa la cantidad exacta que te entrega el domiciliario</small>
                    </label>

                    <div class="cash-input-shell">
                      <span class="currency-prefix">$</span>
                      <input
                        type="number"
                        class="cash-input-field"
                        [ngModel]="physicalCashReceived()"
                        (ngModelChange)="physicalCashReceived.set(+$event)"
                        step="1000"
                        min="0"
                      />
                      <button
                        type="button"
                        class="btn-quick-fill"
                        (click)="physicalCashReceived.set(receivingExpectedCash())"
                        title="Cuadrar con el valor exacto esperado"
                      >
                        Exacto
                      </button>
                    </div>

                    <!-- Indicador de Diferencia de Caja -->
                    @if (cashDifference() === 0) {
                      <div class="caja-diff-badge diff-ok">
                        <span class="diff-icon" style="display: flex; align-items: center; justify-content: center; color: #10b981;">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </span>
                        <div>
                          <strong>Caja Cuadrada ($0 de diferencia)</strong>
                          <p>El efectivo físico recibido coincide exactamente con los pedidos cobrados.</p>
                        </div>
                      </div>
                    } @else if (cashDifference() < 0) {
                      <div class="caja-diff-badge diff-short">
                        <span class="diff-icon" style="display: flex; align-items: center; justify-content: center; color: #ef4444;">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                        </span>
                        <div>
                          <strong>Faltante de Caja: {{ formatCOP(Math.abs(cashDifference())) }}</strong>
                          <p>Hace falta dinero por entregar según las órdenes marcadas en efectivo.</p>
                        </div>
                      </div>
                    } @else {
                      <div class="caja-diff-badge diff-surplus">
                        <span class="diff-icon" style="display: flex; align-items: center; justify-content: center; color: #3b82f6;">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                          </svg>
                        </span>
                        <div>
                          <strong>Sobrante de Caja: +{{ formatCOP(cashDifference()) }}</strong>
                          <p>Se entregó más efectivo del esperado en el reporte.</p>
                        </div>
                      </div>
                    }

                    <!-- Observaciones de la Entrega -->
                    <div class="form-group" style="margin-top: 12px; margin-bottom: 0;">
                      <label class="form-label" style="font-size: 0.74rem;">Observaciones / Novedades de la Liquidación</label>
                      <input
                        type="text"
                        class="form-input"
                        style="font-size: 0.8rem; padding: 7px 10px;"
                        [ngModel]="receiveNotes()"
                        (ngModelChange)="receiveNotes.set($event)"
                        placeholder="Ej. Recibido sin novedades, comprobante Nequi verificado en celular..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Vista previa de Vale / Paz y Salvo Imprimible -->
              @if (showReceiptPrintView()) {
                <div class="thermal-receipt-preview">
                  <div class="thermal-receipt-body" id="thermal-receipt-domi">
                    <div class="receipt-header">
                      <h4>DGL DESPULPADORA DE FRUTAS</h4>
                      <p>PLANTA CUNDINAMARCA · NIT 901.234.567-8</p>
                      <div class="receipt-divider">================================</div>
                      <div class="receipt-title">COMPROBANTE DE ENTREGA DE CAJA</div>
                      <div>RUTA: {{ receivingCourier()?.routeCode || 'RUTA-2026' }}</div>
                      <div>FECHA: {{ getReceiptFormattedDate() }}</div>
                      <div>DOMICILIARIO: {{ receivingCourier()?.name }}</div>
                      <div>PLACA: {{ receivingCourier()?.vehiclePlate }}</div>
                      <div class="receipt-divider">--------------------------------</div>
                    </div>

                    <div class="receipt-lines">
                      @for (s of receivingCourierStops(); track s.id) {
                        @if (getEffectiveStopDelivered(s)) {
                          <div class="receipt-line-item">
                            <span>{{ s.orderNumber }} {{ s.clientName | slice:0:16 }}</span>
                            <span>{{ formatCOP(s.totalAmount) }} [{{ getEffectiveStopPaymentMethod(s) | slice:0:3 }}]</span>
                          </div>
                        }
                      }
                    </div>

                    <div class="receipt-divider">================================</div>
                    <div class="receipt-totals">
                      <div class="rt-row"><span>TOTAL EFECTIVO ESPERADO:</span> <strong>{{ formatCOP(receivingExpectedCash()) }}</strong></div>
                      <div class="rt-row"><span>EFECTIVO RECIBIDO EN CAJA:</span> <strong>{{ formatCOP(physicalCashReceived()) }}</strong></div>
                      <div class="rt-row"><span>DIFERENCIA DE CAJA:</span> <strong>{{ cashDifference() >= 0 ? '+' : '' }}{{ formatCOP(cashDifference()) }}</strong></div>
                      <div class="rt-row"><span>PAGOS DIGITALES (NEQUI/BANCO):</span> <strong>{{ formatCOP(receivingExpectedDigital()) }}</strong></div>
                    </div>
                    <div class="receipt-divider">================================</div>
                    <div class="receipt-footer">
                      <p>FIRMA ENTREGA: ______________________</p>
                      <p>FIRMA RECIBE: _______________________</p>
                      <small>SISTEMA DE GESTIÓN LOGÍSTICA DGL</small>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer" style="background: #f8fafc; border-top: 1px solid #e2e8f0; justify-content: space-between;">
              <div style="display: flex; gap: 8px;">
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="toggleReceiptPrintView()"
                  style="gap: 6px; font-size: 0.82rem; display: inline-flex; align-items: center;"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  <span>{{ showReceiptPrintView() ? 'Ocultar Vale' : 'Ver / Imprimir Vale de Caja' }}</span>
                </button>
              </div>

              <div style="display: flex; gap: 10px;">
                <button type="button" class="btn btn-secondary" (click)="closeReceiveCourierModal()">
                  Cancelar
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="confirmSettlementAndReceive()"
                  style="gap: 8px; font-weight: 800; background: #059669; border-color: #047857;"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Confirmar Recepción y Cerrar Ruta</span>
                </button>
              </div>
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

    .unlocked-mode-search-icon-btn {
      display: none;
    }
    .unlocked-mode-fullscreen-btn {
      display: none;
    }
    .search-mobile-close-btn {
      display: none;
    }
    .drawer-drag-handle-zone {
      display: none;
    }

    @keyframes searchSlideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 768px) {
      .map-address-search-box {
        left: 10px !important;
        right: 10px !important;
        width: auto !important;
        top: max(10px, env(safe-area-inset-top, 10px)) !important;
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);

        &.mobile-hidden {
          display: none !important;
        }

        &.mobile-expanded-active {
          display: block !important;
          z-index: 1350 !important;
          animation: searchSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
      }

      .map-unlocked-mode-bar {
        top: calc(max(10px, env(safe-area-inset-top, 10px)) + 52px) !important;
        left: 10px !important;
        right: 10px !important;
        justify-content: space-between;
        overflow-x: auto;
        transition: top 0.22s cubic-bezier(0.16, 1, 0.3, 1);

        &.search-collapsed {
          top: max(10px, env(safe-area-inset-top, 10px)) !important;
        }
      }

      .unlocked-mode-search-icon-btn {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        min-width: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.95);
        border: 1.5px solid #dbe4de;
        color: #1e5e3a;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        flex-shrink: 0;
        transition: all 0.2s ease;
        padding: 0;

        &:active {
          transform: scale(0.92);
          background: #ecfdf5;
        }
      }

      .unlocked-mode-fullscreen-btn {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        min-width: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.95);
        border: 1.5px solid #dbe4de;
        color: #065f46;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        flex-shrink: 0;
        transition: all 0.2s ease;
        padding: 0;

        &:active {
          transform: scale(0.92);
          background: #ecfdf5;
        }
      }

      .search-mobile-close-btn {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 1px solid #cbd5e1;
        background: #f1f5f9;
        color: #475569;
        font-size: 0.8rem;
        font-weight: 700;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        margin-left: 2px;
        flex-shrink: 0;
        padding: 0;
        line-height: 1;

        &:active {
          background: #e2e8f0;
        }
      }
    }

    /* Leaflet Map Card */
    .map-canvas-card {
      position: relative;
      isolation: isolate;
      z-index: 1;
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
      padding: 13px 26px;
      border-radius: var(--radius-full, 9999px);
      font-size: 0.94rem;
      font-weight: 750;
      font-family: inherit;
      cursor: pointer;
      position: relative;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #065f46;
      border: 2px solid #10b981;
      box-shadow: 0 8px 24px rgba(16, 185, 129, 0.16),
                  0 2px 6px rgba(0, 0, 0, 0.06);
      letter-spacing: 0.2px;

      &:hover {
        background: #f0fdf4;
        border-color: #059669;
        color: #047857;
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 12px 30px rgba(16, 185, 129, 0.28),
                    0 4px 10px rgba(0, 0, 0, 0.08);
      }

      &:active {
        transform: translateY(0) scale(0.99);
        background: #dcfce7;
      }
    }

    .live-beacon {
      position: relative;
      width: 12px;
      height: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .beacon-ping {
      position: absolute;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.45);
      animation: beaconRipple 1.8s cubic-bezier(0, 0.2, 0.8, 1) infinite;
    }

    .beacon-dot {
      position: relative;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
    }

    @keyframes beaconRipple {
      0% { transform: scale(0.4); opacity: 1; }
      100% { transform: scale(2.2); opacity: 0; }
    }

    .btn-counter-badge {
      background: #ecfdf5;
      color: #047857;
      font-size: 0.74rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 9999px;
      border: 1px solid #a7f3d0;
      margin-left: 2px;
    }

    .live-dot-indicator {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulseAnim 1.4s infinite;
      flex-shrink: 0;
    }

    /* Bottom-Left Floating Controls: Courier Initials Stack + Fullscreen Button */
    .map-left-controls-container {
      position: absolute;
      bottom: 16px;
      left: 16px;
      z-index: 1250;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      pointer-events: none;

      & > * {
        pointer-events: auto;
      }

      &.is-fullscreen {
        bottom: max(76px, calc(env(safe-area-inset-bottom, 16px) + 60px));
      }
    }

    .map-couriers-vertical-fab-stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 7px;
    }

    .courier-fab-item {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 2.5px solid var(--courier-accent, #10b981);
      color: var(--courier-accent, #10b981);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.14), 0 1px 3px rgba(0, 0, 0, 0.06);
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      padding: 0;

      .fab-initial {
        font-size: 0.74rem;
        font-weight: 850;
        letter-spacing: 0.02em;
        line-height: 1;
      }

      .fab-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: var(--courier-accent, #10b981);
        color: #ffffff;
        font-size: 0.6rem;
        font-weight: 800;
        min-width: 16px;
        height: 16px;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1.5px solid #ffffff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        padding: 0 3px;
        line-height: 1;
      }

      &:hover {
        transform: scale(1.08) translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
        background: var(--courier-accent, #10b981);
        color: #ffffff;
      }

      &:active {
        transform: scale(0.96);
      }

      &.is-selected {
        background: var(--courier-accent, #10b981);
        color: #ffffff;
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.95), 0 4px 16px rgba(0, 0, 0, 0.3);
        transform: scale(1.08);

        .fab-badge {
          background: #0f172a;
          color: #ffffff;
        }
      }

      &.fab-planta {
        border-color: #10b981;
        color: #059669;
        background: #ecfdf5;

        &:hover, &.is-selected {
          background: #10b981;
          color: #ffffff;
        }
      }
    }

    /* Fullscreen Map Floating Action Button (Web & Mobile PWA) */
    .map-fullscreen-fab {
      width: 38px;
      height: 38px;
      padding: 0;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #065f46;
      border: 2px solid #10b981;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.18), 0 1px 3px rgba(0, 0, 0, 0.08);
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        background: #f0fdf4;
        border-color: #059669;
        color: #047857;
        transform: scale(1.06);
      }

      &:active {
        transform: scale(0.96);
      }

      &.is-fullscreen {
        background: #f0fdf4;
        border-color: #047857;
        color: #047857;
      }
    }

    @media (max-width: 768px) {
      .map-canvas-card {
        min-height: 420px;
        transition: min-height 0.25s ease, height 0.25s ease;

        &.is-stops-mode {
          min-height: 520px;
          height: clamp(500px, 70vh, 620px);

          .leaflet-map-element {
            height: 100% !important;
            min-height: 500px;
          }
        }
      }

      .map-left-controls-container {
        bottom: 14px;
        left: 12px;
        gap: 6px;

        &.is-fullscreen {
          bottom: max(84px, calc(env(safe-area-inset-bottom, 16px) + 68px));
        }
      }

      .courier-fab-item,
      .map-fullscreen-fab {
        width: 36px;
        height: 36px;
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
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      padding: 5px 6px;
      border-radius: 9999px;
      border: 1.5px solid #dbe4de;
      box-shadow: 0 10px 28px rgba(15, 41, 30, 0.14);
    }

    .unlocked-mode-pill {
      background: transparent;
      border: none;
      color: #334155;
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
        color: #1e5e3a;
        background: #f0fdf4;
      }

      &.active {
        background: var(--color-primary, #1e5e3a);
        color: #ffffff;
        font-weight: 800;
        box-shadow: 0 2px 10px rgba(30, 94, 58, 0.35);
      }
    }

    .unlocked-mode-close {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #475569;
      font-size: 0.73rem;
      font-weight: 700;
      padding: 5px 11px;
      border-radius: 9999px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;

      &:hover {
        background: #fee2e2;
        color: #dc2626;
        border-color: #fecaca;
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

    /* Floating Address Search Box (shifted right to accommodate top-left zoom control) */
    .map-address-search-box {
      position: absolute;
      top: 14px;
      left: 60px;
      z-index: 1000;
      width: clamp(280px, 34vw, 420px);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

      .search-input-shell {
        display: flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.96);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1.5px solid #dbe4de;
        border-radius: 9999px;
        padding: 4px 6px 4px 14px;
        gap: 8px;
        box-shadow: 0 10px 28px rgba(15, 41, 30, 0.14);
        transition: all 0.2s ease;

        &:focus-within {
          border-color: #1e5e3a;
          box-shadow: 0 0 0 3px rgba(30, 94, 58, 0.16), 0 10px 28px rgba(15, 41, 30, 0.18);
        }
      }

      &.has-dropdown .search-input-shell {
        border-bottom-left-radius: 10px;
        border-bottom-right-radius: 10px;
      }

      .search-prefix-icon {
        color: #1e5e3a;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .search-mini-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(30, 94, 58, 0.25);
        border-top-color: #1e5e3a;
        border-radius: 50%;
        animation: spinSearch 0.8s linear infinite;
      }

      .address-search-input {
        flex: 1;
        min-width: 0;
        background: transparent;
        border: none;
        outline: none;
        color: #0f172a;
        font-size: 0.82rem;
        font-weight: 600;
        font-family: inherit;

        &::placeholder {
          color: #64748b;
          font-size: 0.78rem;
          font-weight: 500;
        }
      }

      .search-clear-action {
        background: #f1f5f9;
        border: none;
        color: #475569;
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
          background: #fee2e2;
          color: #dc2626;
        }
      }

      .search-submit-btn {
        background: var(--color-primary, #1e5e3a);
        border: none;
        color: #ffffff;
        font-size: 0.75rem;
        font-weight: 800;
        padding: 6px 14px;
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(30, 94, 58, 0.3);
        white-space: nowrap;

        &:hover {
          background: #16482c;
          transform: translateY(-1px);
        }
      }

      .search-autocomplete-dropdown {
        margin-top: 6px;
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(16px);
        border: 1.5px solid #dbe4de;
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 14px 36px rgba(15, 41, 30, 0.18);
        animation: fadeInDown 0.2s ease;

        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 14px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 0.68rem;
          font-weight: 800;
          color: #475569;
          letter-spacing: 0.5px;
        }

        .btn-dismiss-dropdown {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 0.75rem;
          cursor: pointer;
          &:hover { color: #0f172a; }
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
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          transition: background 0.15s;

          &:hover {
            background: #f0fdf4;
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
              color: #0f172a;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .item-subtitle {
              font-size: 0.7rem;
              color: #64748b;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin-top: 1px;
            }

            .item-zone-tag {
              display: inline-block;
              font-size: 0.62rem;
              font-weight: 700;
              background: #f0fdf4;
              color: #1e5e3a;
              border: 1px solid #bbf7d0;
              padding: 1px 6px;
              border-radius: 4px;
              margin-top: 3px;
            }
          }

          .item-order-shortcut {
            background: #f0fdf4;
            border: 1px solid #86efac;
            color: #1e5e3a;
            font-size: 0.72rem;
            font-weight: 800;
            padding: 4px 8px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            flex-shrink: 0;

            &:hover {
              background: #1e5e3a;
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
      0% { transform: scale(0.95); box-shadow: 0 0 16px rgba(30, 94, 58, 0.8); }
      50% { transform: scale(1.1); box-shadow: 0 0 28px rgba(30, 94, 58, 1); }
      100% { transform: scale(0.95); box-shadow: 0 0 16px rgba(30, 94, 58, 0.8); }
    }

    .map-floating-layer-switcher {
      position: absolute;
      top: 14px;
      right: 14px;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(12px);
      padding: 4px;
      border-radius: 9999px;
      border: 1.5px solid #dbe4de;
      box-shadow: 0 8px 24px rgba(15, 41, 30, 0.14);

      .layer-switch-btn {
        background: transparent;
        border: none;
        color: #475569;
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
          color: #1e5e3a;
          background: #f0fdf4;
        }

        &.active {
          background: #1e5e3a;
          color: #ffffff;
          box-shadow: 0 2px 10px rgba(30, 94, 58, 0.35);
        }
      }
    }

    .map-marking-banner {
      position: absolute;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      background: rgba(255, 255, 255, 0.96);
      border: 1.5px solid #1e5e3a;
      color: #1e5e3a;
      padding: 8px 18px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.82rem;
      font-weight: 800;
      box-shadow: 0 8px 24px rgba(15, 41, 30, 0.16);
      backdrop-filter: blur(8px);
    }

    .banner-pulse {
      width: 8px;
      height: 8px;
      background: #1e5e3a;
      border-radius: 50%;
      animation: pulseAnim 1s infinite;
    }

    .banner-close {
      background: transparent;
      border: none;
      color: #475569;
      cursor: pointer;
      font-size: 0.78rem;
      margin-left: 6px;
    }

    /* Couriers Deck */
    .couriers-deck-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg, 14px);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
    }

    .deck-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 6px;
    }

    .deck-title {
      font-size: 0.88rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .couriers-list {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 4px;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: rgba(0,0,0,0.12) transparent;
    }

    .couriers-list::-webkit-scrollbar {
      height: 4px;
    }

    .couriers-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .couriers-list::-webkit-scrollbar-thumb {
      background: rgba(0,0,0,0.12);
      border-radius: 999px;
    }

    .courier-card {
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-left-width: 4px;
      border-radius: var(--radius-md, 10px);
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      cursor: pointer;
      transition: all 0.2s;
      min-width: 260px;
      max-width: 300px;
      flex-shrink: 0;
    }

    .courier-card:hover, .courier-card.selected {
      background: var(--bg-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .courier-card-head {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .courier-avatar {
      width: 28px;
      height: 28px;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      flex-shrink: 0;
    }

    .courier-meta {
      flex: 1;
      min-width: 0;
    }

    .courier-name-row {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .courier-name {
      font-size: 0.8rem;
      font-weight: 800;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .courier-badges-inline {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }

    .courier-stops-pill {
      font-size: 0.68rem;
      color: var(--text-muted);
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border-subtle);
      padding: 1px 6px;
      border-radius: 999px;

      strong {
        color: var(--text-main);
        font-weight: 800;
      }
    }

    .courier-status-badge {
      font-size: 0.65rem;
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
      font-size: 0.67rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 1px;
      line-height: 1.3;
    }

    .courier-phone-inline {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
      padding: 1px 7px;
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 700;
    }

    .progress-track {
      width: 100%;
      height: 2.5px;
      background: rgba(148, 163, 184, 0.18);
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
    }

    .btn-seq-link {
      background: transparent;
      border: none;
      color: var(--color-primary-text);
      font-size: 0.7rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      padding: 2px 5px;
      border-radius: 4px;
    }

    .btn-seq-link:hover {
      background: rgba(16, 185, 129, 0.1);
    }

    .btn-locate {
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      font-size: 0.68rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      cursor: pointer;
    }

    .btn-locate:hover {
      color: var(--text-main);
      border-color: var(--color-primary);
    }

    .mobile-courier-details {
      display: contents;
    }

    @media (max-width: 768px) {
      .couriers-deck-card {
        padding: 14px;
        gap: 12px;
        border-radius: 16px;
      }

      .deck-header {
        gap: 8px;
        padding-bottom: 10px;
      }

      .deck-title {
        font-size: 0.86rem;
        line-height: 1.25;
      }

      .deck-header .badge-pill {
        flex-shrink: 0;
        white-space: nowrap;
        font-size: 0.7rem;
        padding: 3px 9px;
      }

      .couriers-list {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
        overflow-x: visible;
        padding-bottom: 0;
      }

      .courier-card {
        min-width: 0;
        max-width: 100%;
        width: 100%;
        padding: 13px 16px;
        gap: 0;
        border-radius: 14px;
        border: 1.5px solid #e2e8f0;
        border-left-width: 5px;
        background: #ffffff;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
      }

      .courier-card:not(.mobile-card-expanded) .mobile-courier-details {
        display: none !important;
      }

      .courier-card.mobile-card-expanded .mobile-courier-details {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
        margin-top: 12px !important;
        padding-top: 12px !important;
        border-top: 1px dashed #e2e8f0 !important;
      }

      .courier-card-head {
        align-items: flex-start;
        gap: 10px;
      }

      .courier-avatar {
        width: 36px;
        height: 36px;
        border-radius: 10px;
      }

      .courier-name-row {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
      }

      .courier-name {
        font-size: 0.9rem;
      }

      .courier-badges-inline {
        gap: 5px;
      }

      .courier-vehicle-info {
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-top: 4px;
        font-size: 0.74rem;
        gap: 8px;
      }

      .courier-phone-inline {
        font-size: 0.72rem;
        padding: 2px 8px;
      }

      .progress-track {
        height: 4px;
        margin: 2px 0;
      }

      .courier-card-footer {
        padding-top: 8px;
        margin-top: 2px;
        border-top: 1px dashed #e2e8f0;
        gap: 8px;
      }

      .btn-seq-link {
        font-size: 0.76rem;
        padding: 5px 10px;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
      }

      .btn-force-receive {
        font-size: 0.74rem;
        padding: 5px 10px;
        border-radius: 8px;
      }

      .btn-locate {
        font-size: 0.74rem;
        padding: 5px 12px;
        border-radius: 8px;
        margin-left: auto;
      }
    }

    /* Modal Backdrop & Windows */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 999999 !important;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-card {
      background: #ffffff;
      border: 1px solid var(--border-subtle, #e2e8f0);
      border-radius: var(--radius-lg, 16px);
      width: 100%;
      max-width: 580px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.45);
      animation: modalFadeIn 0.25s ease-out;
      overflow: hidden;
      position: relative;
      z-index: 1000000 !important;
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
      bottom: 14px;
      width: 415px;
      max-width: calc(100% - 24px);
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
        top: auto !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        height: var(--drawer-height, 36%);
        min-height: 135px;
        max-height: 76%;
        border-radius: 22px 22px 0 0 !important;
        border-left: none !important;
        border-right: none !important;
        border-bottom: none !important;
        box-shadow: 0 -8px 32px rgba(15, 23, 42, 0.22) !important;
        z-index: 1280;
        transition: height 0.16s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .drawer-drag-handle-zone {
        display: flex !important;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: 9px 0 5px;
        cursor: grab;
        touch-action: none;
        user-select: none;
        background: #f8fafc;
        border-top-left-radius: 22px;
        border-top-right-radius: 22px;
        flex-shrink: 0;

        &:active {
          cursor: grabbing;
        }

        .drawer-drag-pill {
          width: 44px;
          height: 4.5px;
          border-radius: 9999px;
          background: #cbd5e1;
          transition: background 0.2s, transform 0.2s;
        }

        &:hover .drawer-drag-pill,
        &:active .drawer-drag-pill {
          background: #64748b;
          transform: scaleX(1.12);
        }
      }

      .drawer-stops-list {
        padding-bottom: max(40px, calc(env(safe-area-inset-bottom, 16px) + 24px)) !important;
        -webkit-overflow-scrolling: touch;
      }
    }

    @media (max-width: 768px) {
      .map-canvas-card.map-fullscreen-active .deliveries-drawer {
        height: var(--drawer-height, 38vh) !important;
        max-height: 82vh !important;
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

    .drawer-refresh-btn {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: 1px solid #bbf7d0;
      background: #f0fdf4;
      color: #1e5e3a;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.16s ease;

      &:hover {
        background: #1e5e3a;
        color: #ffffff;
        border-color: #1e5e3a;
      }

      &.is-spinning svg {
        animation: spinSearch 0.65s linear infinite;
      }
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

      &.is-pill-drop-target {
        background: #dcfce7;
        border-color: #16a34a;
        color: #15803d;
        transform: scale(1.06);
        box-shadow: 0 4px 12px rgba(22, 163, 74, 0.22);
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

    .stop-drag-grip {
      font-size: 0.9rem;
      font-weight: 900;
      color: #94a3b8;
      cursor: grab;
      user-select: none;
      letter-spacing: -1px;
      line-height: 1;
      padding: 2px 1px;
      flex-shrink: 0;
      transition: color 0.15s ease;
    }

    .drawer-stop-item:hover .stop-drag-grip,
    .stop-card:hover .stop-drag-grip {
      color: #1e5e3a;
    }

    .drawer-stop-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      cursor: grab;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, background 0.15s ease;

      &:active {
        cursor: grabbing;
      }

      &.is-dragging {
        opacity: 0.45;
        border: 1.5px dashed #1e5e3a;
        background: #f0fdf4;
      }

      &.is-drag-over {
        border: 2px solid #16a34a;
        background: #f0fdf4;
        transform: translateY(-2px);
        box-shadow: 0 8px 18px rgba(22, 163, 74, 0.18);
      }
    }

    .stop-card {
      cursor: grab;

      &:active {
        cursor: grabbing;
      }

      &.is-dragging {
        opacity: 0.45;
        border: 1.5px dashed #1e5e3a;
      }

      &.is-drag-over {
        border: 2px solid #16a34a !important;
        background: rgba(22, 163, 74, 0.08) !important;
        transform: translateY(-2px);
        box-shadow: 0 8px 18px rgba(22, 163, 74, 0.18);
      }
    }

    .drawer-stop-item:hover {
      border-color: #1e5e3a;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
    }

    .stop-drag-grip {
      font-size: 0.95rem;
      font-weight: 900;
      color: #94a3b8;
      cursor: grab;
      user-select: none;
      letter-spacing: -1px;
      line-height: 1;
      padding: 2px 0;
      margin-top: 3px;
      flex-shrink: 0;
      transition: color 0.15s ease;
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
      margin-top: 1px;

      &.is-unassigned {
        background: #ffffff !important;
        color: #0f172a;
        border: 2px solid #64748b;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
      }
    }

    .drawer-stop-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .drawer-stop-top {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }

    .drawer-stop-client {
      font-size: 0.88rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.25;
      word-break: break-word;
    }

    .drawer-stop-amount {
      font-size: 0.85rem;
      font-weight: 800;
      color: #059669;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .drawer-stop-addr {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.74rem;
      color: #475569;
      line-height: 1.3;
      word-break: break-word;
    }

    .drawer-stop-status-line {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 1px;
    }

    .drawer-stop-code {
      font-family: monospace;
      font-size: 0.72rem;
      font-weight: 700;
      color: #334155;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 2px 7px;
      border-radius: 5px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .stop-billed-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 5px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
      white-space: nowrap;
      flex-shrink: 0;

      &.is-billed {
        background: #ecfdf5;
        color: #047857;
        border-color: #a7f3d0;
      }
    }

    .drawer-stop-footer-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: 2px;
      padding-top: 6px;
      border-top: 1px dashed #f1f5f9;
    }

    .drawer-courier-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
    }

    .drawer-stop-courier-select {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #0f172a;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      cursor: pointer;
      outline: none;
      flex: 1;
      min-width: 0;
      max-width: 175px;
      transition: all 0.15s ease;
    }

    .drawer-stop-courier-select:focus {
      border-color: #1e5e3a;
      background: #ffffff;
      box-shadow: 0 0 0 2px rgba(30, 94, 58, 0.15);
    }

    .drawer-stop-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .drawer-stop-priority-btn {
      width: 28px;
      height: 28px;
      border-radius: 7px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.18s ease;

      &:hover {
        border-color: #f87171;
        color: #ef4444;
        background: #fef2f2;
      }

      &.is-active-priority {
        background: #fee2e2;
        border-color: #ef4444;
        color: #dc2626;
        fill: #ef4444;
        box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
        animation: priorityPulse 1.8s infinite;
      }
    }

    .drawer-stop-del-btn {
      width: 28px;
      height: 28px;
      border-radius: 7px;
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

      &:hover {
        background: #dc2626;
        color: #ffffff;
        border-color: #dc2626;
      }
    }

    .drawer-stop-item.is-priority {
      border: 1.5px solid #ef4444 !important;
      background: #fffdfd;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.12);
    }

    /* 10-Second Unbilled Courier Alert Banner */
    .drawer-unbilled-alert-banner {
      background: #fff1f2;
      border: 1px solid #fecdd3;
      border-radius: 10px;
      margin: 10px 14px 6px;
      overflow: hidden;
      animation: slideAlertDown 0.25s ease-out;
      box-shadow: 0 4px 12px rgba(225, 29, 72, 0.12);
    }

    @keyframes slideAlertDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .alert-content {
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .alert-icon-box {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #ffe4e6;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .alert-details {
      flex: 1;
      min-width: 0;
    }

    .alert-headline {
      font-size: 0.78rem;
      font-weight: 700;
      color: #9f1239;
      line-height: 1.25;
    }

    .alert-subline {
      font-size: 0.7rem;
      color: #be123c;
      margin-top: 2px;
    }

    .alert-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .btn-alert-priority {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #e11d48;
      color: #ffffff;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.74rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(225, 29, 72, 0.25);
      transition: background 0.15s ease, transform 0.15s ease;

      &:hover {
        background: #be123c;
        transform: translateY(-1px);
      }
    }

    .btn-alert-close {
      background: transparent;
      border: none;
      color: #9f1239;
      font-size: 0.9rem;
      font-weight: 800;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
      border-radius: 4px;

      &:hover {
        background: #fecdd3;
      }
    }

    .alert-countdown-track {
      height: 3px;
      background: #fecdd3;
      width: 100%;
    }

    .alert-countdown-bar {
      height: 100%;
      background: #e11d48;
      width: 100%;
      animation: alertCountdown 10s linear forwards;
    }

    @keyframes alertCountdown {
      from { width: 100%; }
      to { width: 0%; }
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

    /* Top-Left Zoom Controls */
    ::ng-deep .leaflet-top.leaflet-left {
      top: 4px;
      left: 4px;
      z-index: 999;
    }

    ::ng-deep .leaflet-control-zoom {
      border: 1.5px solid #dbe4de !important;
      border-radius: 12px !important;
      overflow: hidden;
      box-shadow: 0 4px 14px rgba(15, 41, 30, 0.12) !important;
      background: rgba(255, 255, 255, 0.96) !important;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);

      a {
        width: 32px !important;
        height: 32px !important;
        line-height: 32px !important;
        background-color: rgba(255, 255, 255, 0.96) !important;
        color: #1e5e3a !important;
        font-size: 16px !important;
        font-weight: 700 !important;
        transition: all 0.18s ease;

        &:hover {
          background-color: #ecfdf5 !important;
          color: #065f46 !important;
        }

        &:first-child {
          border-bottom: 1px solid #e2e8f0 !important;
        }
      }
    }

    .zone-assign-card {
      position: absolute;
      top: 106px;
      left: 14px;
      z-index: 1010;
      width: 330px;
      max-width: calc(100% - 28px);
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(14px);
      border: 1.5px solid #1e5e3a;
      border-radius: 16px;
      padding: 12px 14px;
      box-shadow: 0 18px 38px rgba(15, 41, 30, 0.22);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .zone-assign-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }

    .zone-assign-title {
      font-size: 0.84rem;
      font-weight: 800;
      color: #0f172a;
    }

    .zone-assign-sub {
      font-size: 0.68rem;
      color: #64748b;
      margin-top: 2px;
    }

    .zone-assign-close {
      border: none;
      background: #f1f5f9;
      color: #475569;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 800;
    }

    .zone-stops-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      max-height: 76px;
      overflow-y: auto;
    }

    .zone-stop-chip {
      font-size: 0.66rem;
      font-weight: 700;
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
      padding: 2px 7px;
      border-radius: 9999px;
    }

    .zone-courier-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }

    .zone-courier-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 9px;
      border-radius: 9px;
      border: 1.5px solid #cbd5e1;
      background: #ffffff;
      color: #0f172a;
      font-size: 0.72rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.15s ease;

      .c-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      &:hover {
        background: #f0fdf4;
        transform: translateY(-1px);
      }
    }

    .zone-unassign-btn {
      color: #475569;
      border-style: dashed;
    }

    .zone-empty-msg {
      font-size: 0.74rem;
      color: #64748b;
      background: #f8fafc;
      padding: 8px 10px;
      border-radius: 8px;
    }

    /* Courier Card Ready for Settlement Banner & Button */
    .courier-route-code-pill {
      font-family: monospace;
      font-size: 0.68rem;
      font-weight: 800;
      background: rgba(0, 0, 0, 0.05);
      padding: 1px 6px;
      border-radius: 4px;
      letter-spacing: 0.3px;
    }

    .courier-status-badge.ready-badge {
      background: #fef08a !important;
      color: #854d0e !important;
      border: 1px solid #fde047 !important;
      font-weight: 800;
    }

    .courier-ready-banner {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border: 1px solid #86efac;
      color: #065f46;
      border-radius: 5px;
      padding: 4px 7px;
      font-size: 0.68rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 4px;
      margin-bottom: 2px;
      animation: readyBannerPulse 2s infinite ease-in-out;
    }

    .ready-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
      flex-shrink: 0;
    }

    @keyframes readyBannerPulse {
      0%, 100% { opacity: 0.95; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.01); }
    }

    .btn-receive-action {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff;
      border: 1px solid #10b981;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 0.78rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
      transition: all 0.2s ease;

      &:hover {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.45);
      }
    }

    .btn-force-receive {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #475569;
      border-radius: 8px;
      padding: 5px 8px;
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #fee2e2;
        color: #dc2626;
        border-color: #fca5a5;
      }
    }

    /* Settlement Modal Styling */
    .settlement-modal {
      max-width: 900px;
    }

    .badge-route-pill {
      background: #e0e7ff;
      color: #3730a3;
      border: 1px solid #c7d2fe;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 6px;
      font-family: monospace;
    }

    .courier-settlement-profile {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
      padding: 14px 18px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      margin-bottom: 18px;
    }

    .profile-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .courier-avatar-lg {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      flex-shrink: 0;
    }

    .courier-profile-name {
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .courier-profile-sub {
      font-size: 0.76rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
    }

    .plate-pill {
      background: #fef08a;
      color: #854d0e;
      padding: 1px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-weight: 800;
    }

    .profile-stats-strip {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .pstat-item {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .pstat-val {
      font-size: 1.15rem;
      font-weight: 800;
    }

    .pstat-lbl {
      font-size: 0.68rem;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
    }

    .settlement-section-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 8px;

      small {
        font-size: 0.74rem;
        font-weight: 500;
        color: #64748b;
      }
    }

    .settlement-orders-table-wrapper {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 20px;
      background: #ffffff;
      max-height: 220px;
      overflow-y: auto;
    }

    .settlement-orders-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;

      th {
        background: #f8fafc;
        padding: 8px 12px;
        font-size: 0.72rem;
        font-weight: 800;
        color: #475569;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
        position: sticky;
        top: 0;
        z-index: 2;
      }

      td {
        padding: 8px 12px;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
      }

      tr:last-child td {
        border-bottom: none;
      }

      tr.row-not-delivered {
        opacity: 0.55;
        background: #fef2f2;
      }
    }

    .col-num {
      font-weight: 800;
      color: #94a3b8;
    }

    .col-address {
      font-size: 0.74rem;
      color: #64748b;
      max-width: 220px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .col-amount {
      font-weight: 800;
      color: #064e3b;
      white-space: nowrap;
    }

    .pill-status-toggle {
      border: none;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.15s;

      &.is-delivered {
        background: #dcfce7;
        color: #15803d;
      }
      &:not(.is-delivered) {
        background: #fee2e2;
        color: #b91c1c;
      }
    }

    .payment-method-select {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 0.74rem;
      font-weight: 700;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      cursor: pointer;

      &:focus {
        border-color: #10b981;
      }
    }

    .cash-settlement-deck {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 16px;
      margin-bottom: 18px;
    }

    @media (max-width: 768px) {
      .cash-settlement-deck {
        grid-template-columns: 1fr;
      }
    }

    .cash-summary-card {
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 12px;
    }

    .cash-summary-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #065f46;
      text-transform: uppercase;
    }

    .cash-summary-amount {
      font-size: 1.6rem;
      font-weight: 900;
      color: #047857;
      line-height: 1.1;
    }

    .cash-summary-hint {
      font-size: 0.72rem;
      color: #059669;
    }

    .digital-summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 0.78rem;
    }

    .digital-row {
      display: flex;
      justify-content: space-between;
      color: #475569;

      &.total-row {
        border-top: 1px dashed #cbd5e1;
        padding-top: 8px;
        font-weight: 800;
        color: #0f172a;
        font-size: 0.85rem;
      }
    }

    .cash-count-card {
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
    }

    .cash-input-label {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 0.82rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 8px;

      small {
        font-size: 0.72rem;
        font-weight: 500;
        color: #64748b;
      }
    }

    .cash-input-shell {
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 2px solid #059669;
      border-radius: 10px;
      padding: 4px 10px;
      gap: 8px;
      margin-bottom: 12px;
    }

    .currency-prefix {
      font-size: 1.2rem;
      font-weight: 800;
      color: #059669;
    }

    .cash-input-field {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 1.35rem;
      font-weight: 900;
      color: #0f172a;
      font-family: inherit;
    }

    .btn-quick-fill {
      background: #dcfce7;
      border: 1px solid #86efac;
      color: #15803d;
      font-size: 0.74rem;
      font-weight: 800;
      padding: 5px 10px;
      border-radius: 6px;
      cursor: pointer;

      &:hover {
        background: #15803d;
        color: #fff;
      }
    }

    .caja-diff-badge {
      padding: 10px 14px;
      border-radius: 10px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 0.8rem;

      strong {
        display: block;
        font-size: 0.85rem;
      }
      p {
        margin: 2px 0 0;
        font-size: 0.73rem;
      }

      &.diff-ok {
        background: #ecfdf5;
        border: 1px solid #86efac;
        color: #065f46;
      }
      &.diff-short {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
      }
      &.diff-surplus {
        background: #fffbeb;
        border: 1px solid #fde68a;
        color: #92400e;
      }
    }

    .thermal-receipt-preview {
      margin-top: 16px;
      background: #f1f5f9;
      border-radius: 10px;
      padding: 16px;
      display: flex;
      justify-content: center;
    }

    .thermal-receipt-body {
      background: #ffffff;
      border: 1px dashed #94a3b8;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
      padding: 18px 20px;
      width: 100%;
      max-width: 380px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.75rem;
      color: #0f172a;
      line-height: 1.4;

      .receipt-header {
        text-align: center;
        h4 { margin: 0; font-size: 0.9rem; font-weight: 900; }
        p { margin: 2px 0; font-size: 0.7rem; color: #475569; }
      }
      .receipt-divider {
        color: #94a3b8;
        overflow: hidden;
        text-align: center;
        margin: 4px 0;
      }
      .receipt-title {
        font-weight: 800;
        text-align: center;
        margin: 4px 0;
      }
      .receipt-lines {
        margin: 6px 0;
      }
      .receipt-line-item {
        display: flex;
        justify-content: space-between;
        font-size: 0.72rem;
        margin-bottom: 2px;
      }
      .receipt-totals {
        margin: 6px 0;
        .rt-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
        }
      }
      .receipt-footer {
        margin-top: 12px;
        text-align: center;
        font-size: 0.68rem;
        p { margin: 8px 0; }
      }
    }
  `]
})
export class DeliveryMapComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly Math = Math;
  private readonly stateService = inject(StateService);
  private readonly notification = inject(NotificationService);
  private readonly geocodingService = inject(GeocodingService);

  @ViewChild('mapElement') mapElement!: ElementRef<HTMLDivElement>;

  // Slide-over Deliveries Drawer State
  readonly showDeliveriesDrawer = signal<boolean>(false);
  readonly expandedMobileCourierIds = signal<Record<string, boolean>>({});

  // Mobile Address Search & Deliveries Drawer Height Signals
  readonly isMobileAddressSearchOpen = signal<boolean>(false);
  readonly drawerHeightPx = signal<number | null>(null);
  readonly drawerHeightPreset = signal<'compact' | 'half' | 'expanded'>('half');

  readonly drawerHeightStyle = computed(() => {
    if (typeof window === 'undefined' || window.innerWidth > 768) {
      return null;
    }
    const px = this.drawerHeightPx();
    if (px !== null) {
      return `${px}px`;
    }
    const preset = this.drawerHeightPreset();
    const isFullscreen = this.isMapFullscreen();

    if (isFullscreen) {
      if (preset === 'compact') return '22vh';
      if (preset === 'expanded') return '76vh';
      return '38vh'; // Small/half default so map takes 62vh in fullscreen
    } else {
      if (preset === 'compact') return '140px';
      if (preset === 'expanded') return '72%';
      return '36%'; // Small/compact default so map takes 64% in normal mode
    }
  });

  private isDraggingDrawer = false;
  private dragStartY = 0;
  private dragStartHeight = 0;
  private dragMoved = false;

  startDrawerResize(event: PointerEvent) {
    if (typeof window === 'undefined' || window.innerWidth > 768) return;

    event.preventDefault();
    event.stopPropagation();

    this.isDraggingDrawer = true;
    this.dragMoved = false;
    this.dragStartY = event.clientY;

    const drawerEl = (event.target as HTMLElement).closest('.deliveries-drawer') as HTMLElement | null;
    const isFullscreen = this.isMapFullscreen();
    const parentH = isFullscreen ? window.innerHeight : (drawerEl?.parentElement?.clientHeight || 520);
    this.dragStartHeight = drawerEl ? drawerEl.getBoundingClientRect().height : (parentH * 0.36);

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDraggingDrawer) return;
      const deltaY = this.dragStartY - e.clientY;
      if (Math.abs(deltaY) > 4) {
        this.dragMoved = true;
      }
      const minH = 135;
      const maxH = isFullscreen ? (window.innerHeight * 0.82) : (parentH * 0.74);
      const newHeight = Math.max(minH, Math.min(maxH, this.dragStartHeight + deltaY));
      this.drawerHeightPx.set(Math.round(newHeight));
    };

    const onPointerUp = () => {
      if (!this.isDraggingDrawer) return;
      this.isDraggingDrawer = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (!this.dragMoved) {
        this.toggleDrawerExpandPreset();
      } else {
        const currentH = this.drawerHeightPx() || (parentH * 0.36);
        if (currentH < parentH * 0.28) {
          this.drawerHeightPreset.set('compact');
          this.drawerHeightPx.set(null);
        } else if (currentH > parentH * 0.55) {
          this.drawerHeightPreset.set('expanded');
          this.drawerHeightPx.set(null);
        } else {
          this.drawerHeightPreset.set('half');
          this.drawerHeightPx.set(null);
        }
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
  }

  toggleDrawerExpandPreset() {
    this.drawerHeightPx.set(null);
    const curr = this.drawerHeightPreset();
    if (curr === 'compact') {
      this.drawerHeightPreset.set('half');
    } else if (curr === 'half') {
      this.drawerHeightPreset.set('expanded');
    } else {
      this.drawerHeightPreset.set('half');
    }
  }

  openMobileAddressSearch() {
    this.isMobileAddressSearchOpen.set(true);
    setTimeout(() => {
      const input = document.querySelector('.address-search-input') as HTMLInputElement | null;
      input?.focus();
    }, 60);
  }

  closeMobileAddressSearch() {
    this.isMobileAddressSearchOpen.set(false);
  }

  toggleMobileAddressSearch() {
    const next = !this.isMobileAddressSearchOpen();
    this.isMobileAddressSearchOpen.set(next);
    if (next) {
      setTimeout(() => {
        const input = document.querySelector('.address-search-input') as HTMLInputElement | null;
        input?.focus();
      }, 60);
    }
  }

  toggleMobileCourierCard(courierId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.expandedMobileCourierIds.update(prev => ({
      ...prev,
      [courierId]: !prev[courierId]
    }));
  }

  isMobileCourierCardExpanded(courierId: string): boolean {
    return !!this.expandedMobileCourierIds()[courierId];
  }
  readonly showDrawerQuickAdd = signal<boolean>(false);
  readonly drawerCourierFilter = signal<string>('all');
  readonly drawerSearchQuery = signal<string>('');
  readonly drawerNewClient = signal<string>('');
  readonly drawerNewAddress = signal<string>('');
  readonly drawerNewCourierId = signal<string>('');
  readonly drawerNewAmount = signal<number>(125000);

  // 10-Second Unbilled Order Assignment Alert State
  readonly activeUnbilledAlert = signal<{
    stopId: number;
    orderNumber: string;
    clientName: string;
    targetCourierId: string;
  } | null>(null);
  private unbilledAlertTimeout?: any;

  // =========================================================================
  // RECEIVE COURIER & CASH SETTLEMENT STATE (ARQUEO DE CAJA DE REPARTO)
  // =========================================================================
  readonly showReceiveModal = signal<boolean>(false);
  readonly receivingCourier = signal<Courier | null>(null);
  readonly physicalCashReceived = signal<number>(0);
  readonly receiveNotes = signal<string>('');
  readonly showReceiptPrintView = signal<boolean>(false);
  readonly stopPaymentOverrides = signal<Record<number, 'EFECTIVO' | 'NEQUI' | 'BANCOLOMBIA' | 'CREDITO'>>({});
  readonly stopDeliveredOverrides = signal<Record<number, boolean>>({});

  isCourierReadyToReceive(c: Courier): boolean {
    if (c.orderIds.length === 0) return false;
    return this.getCourierCompletedStops(c) === c.orderIds.length || c.routeStatus === 'completada';
  }

  readonly receivingCourierStops = computed(() => {
    const courier = this.receivingCourier();
    if (!courier) return [];
    const stopMap = new Map(this.deliveryStops().map(s => [s.id, s]));
    return courier.orderIds
      .map(id => stopMap.get(id))
      .filter((s): s is DeliveryWaypoint => !!s);
  });

  getEffectiveStopDelivered(stop: DeliveryWaypoint): boolean {
    const overrides = this.stopDeliveredOverrides();
    if (stop.id in overrides) {
      return overrides[stop.id];
    }
    return stop.isDelivered;
  }

  toggleStopDelivered(stopId: number) {
    const stop = this.deliveryStops().find(s => s.id === stopId);
    if (!stop) return;
    const current = this.getEffectiveStopDelivered(stop);
    this.stopDeliveredOverrides.update(map => ({
      ...map,
      [stopId]: !current
    }));
  }

  getEffectiveStopPaymentMethod(stop: DeliveryWaypoint): 'EFECTIVO' | 'NEQUI' | 'BANCOLOMBIA' | 'CREDITO' {
    const overrides = this.stopPaymentOverrides();
    if (stop.id in overrides) {
      return overrides[stop.id];
    }
    return stop.paymentMethod || 'EFECTIVO';
  }

  setStopPaymentMethod(stopId: number, method: 'EFECTIVO' | 'NEQUI' | 'BANCOLOMBIA' | 'CREDITO') {
    this.stopPaymentOverrides.update(map => ({
      ...map,
      [stopId]: method
    }));
  }

  readonly receivingExpectedCash = computed(() => {
    const stops = this.receivingCourierStops();
    return stops
      .filter(s => this.getEffectiveStopDelivered(s))
      .filter(s => this.getEffectiveStopPaymentMethod(s) === 'EFECTIVO')
      .reduce((sum, s) => sum + s.totalAmount, 0);
  });

  readonly receivingExpectedDigital = computed(() => {
    const stops = this.receivingCourierStops();
    return stops
      .filter(s => this.getEffectiveStopDelivered(s))
      .filter(s => {
        const m = this.getEffectiveStopPaymentMethod(s);
        return m === 'NEQUI' || m === 'BANCOLOMBIA';
      })
      .reduce((sum, s) => sum + s.totalAmount, 0);
  });

  readonly receivingExpectedCredit = computed(() => {
    const stops = this.receivingCourierStops();
    return stops
      .filter(s => this.getEffectiveStopDelivered(s))
      .filter(s => this.getEffectiveStopPaymentMethod(s) === 'CREDITO')
      .reduce((sum, s) => sum + s.totalAmount, 0);
  });

  readonly receivingTotalCollected = computed(() => {
    return this.receivingExpectedCash() + this.receivingExpectedDigital() + this.receivingExpectedCredit();
  });

  readonly cashDifference = computed(() => {
    return this.physicalCashReceived() - this.receivingExpectedCash();
  });

  getReceivedDeliveredCount(): number {
    return this.receivingCourierStops().filter(s => this.getEffectiveStopDelivered(s)).length;
  }

  getReceiptFormattedDate(): string {
    return new Date().toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  toggleReceiptPrintView() {
    this.showReceiptPrintView.update(v => !v);
  }

  openReceiveCourierModal(courier: Courier) {
    this.receivingCourier.set(courier);
    this.stopPaymentOverrides.set({});
    this.stopDeliveredOverrides.set({});
    this.receiveNotes.set('');
    this.showReceiptPrintView.set(false);

    const stopMap = new Map(this.deliveryStops().map(s => [s.id, s]));
    const stops = courier.orderIds.map(id => stopMap.get(id)).filter((s): s is DeliveryWaypoint => !!s);
    const expectedCash = stops.reduce((sum, s) => sum + s.totalAmount, 0);
    this.physicalCashReceived.set(expectedCash);

    this.showReceiveModal.set(true);
  }

  closeReceiveCourierModal() {
    this.showReceiveModal.set(false);
    this.receivingCourier.set(null);
  }

  confirmSettlementAndReceive() {
    const courier = this.receivingCourier();
    if (!courier) return;

    const stops = this.receivingCourierStops();
    const deliveredCount = stops.filter(s => this.getEffectiveStopDelivered(s)).length;
    const physicalCash = this.physicalCashReceived();
    const diff = this.cashDifference();

    // Sincronizar en StateService
    stops.forEach(s => {
      const isDelivered = this.getEffectiveStopDelivered(s);
      if (isDelivered) {
        this.stateService.updateOrderStatus(s.id, 'DELIVERED');
      }
    });

    // Actualizar deliveryStops
    const stopIds = new Set(courier.orderIds);
    this.deliveryStops.update(all => all.map(s => {
      if (stopIds.has(s.id)) {
        return {
          ...s,
          isDelivered: this.getEffectiveStopDelivered(s),
          paymentMethod: this.getEffectiveStopPaymentMethod(s)
        };
      }
      return s;
    }));

    // Liberar domiciliario: ruta cerrada, caja en cero y disponible
    this.couriers.update(list => list.map(c => {
      if (c.id === courier.id) {
        return {
          ...c,
          orderIds: [],
          status: 'en_planta',
          routeStatus: 'liquidada',
          currentStopIndex: 0,
          progress: 1,
          lat: PLANTA_MATRIZ_LAT,
          lng: PLANTA_MATRIZ_LNG
        };
      }
      return c;
    }));

    this.renderStopMarkers();
    this.buildAndRenderRealRoadRoutes();
    this.closeReceiveCourierModal();

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    const diffText = diff === 0
      ? 'Caja cuadrada exactamente ($0 diferencia).'
      : (diff > 0 ? `Sobrante de ${this.formatCOP(diff)}.` : `Faltante de ${this.formatCOP(Math.abs(diff))}.`);

    this.notification.success(
      '¡Domiciliario Recibido y Ruta Liquidada!',
      `${courier.name} entregó ${deliveredCount} pedidos. Total recibido en caja: ${this.formatCOP(physicalCash)}. ${diffText}`
    );
  }

  markAllCourierStopsDelivered(courierId: string) {
    const courier = this.couriers().find(c => c.id === courierId);
    if (!courier) return;

    this.deliveryStops.update(all => all.map(s => {
      if (courier.orderIds.includes(s.id)) {
        return { ...s, isDelivered: true };
      }
      return s;
    }));

    this.couriers.update(list => list.map(c => {
      if (c.id === courierId) {
        return { ...c, routeStatus: 'completada' };
      }
      return c;
    }));

    this.renderStopMarkers();
    this.notification.success(
      'Paradas Completadas',
      `Todas las paradas de ${courier.name} han sido marcadas como entregadas. El botón "Recibir Domiciliario" ya está activo.`
    );
  }

  markOrderDeliveredByOrderNumber(orderNumber: string) {
    this.deliveryStops.update(stops => stops.map(s => {
      if (s.orderNumber === orderNumber) {
        return { ...s, isDelivered: true };
      }
      return s;
    }));
    this.renderStopMarkers();
  }

  locateOrderOnMap(orderNumber: string) {
    const stop = this.deliveryStops().find(s => s.orderNumber === orderNumber);
    if (stop && this.map) {
      if (this.mapViewMode() === 'locked') {
        this.enterAllDeliveriesMode();
      }
      this.map.flyTo([stop.lat, stop.lng], 16, { duration: 1.2 });
      const marker = this.stopMarkers.get(stop.id);
      if (marker) {
        setTimeout(() => marker.openPopup(), 1250);
      }
      this.notification.info('Pedido Ubicado en Mapa', `${stop.orderNumber} · ${stop.clientName}`);
    }
  }

  assignOrderToCourierByOrderNumber(orderNumber: string, courierId: string) {
    const courier = this.couriers().find(c => c.id === courierId);
    if (!courier) return;

    this.deliveryStops.update(stops => stops.map(s => {
      if (s.orderNumber === orderNumber) {
        return { ...s, assignedCourierId: courierId };
      }
      return s;
    }));

    const stop = this.deliveryStops().find(s => s.orderNumber === orderNumber);
    if (stop) {
      this.couriers.update(list => list.map(c => {
        if (c.id === courierId && !c.orderIds.includes(stop.id)) {
          return { ...c, orderIds: [...c.orderIds, stop.id] };
        }
        if (c.id !== courierId && c.orderIds.includes(stop.id)) {
          return { ...c, orderIds: c.orderIds.filter(id => id !== stop.id) };
        }
        return c;
      }));
    }

    this.renderStopMarkers();
    this.buildAndRenderRealRoadRoutes();
  }

  // Zone Polygon Grouping State (4-point Quad or 6-point Hexagon)
  readonly zoneTargetPoints = signal<4 | 6>(4);
  readonly zonePolygonPoints = signal<[number, number][]>([]);
  readonly showZoneAssignCard = signal<boolean>(false);
  private zoneVertexMarkers: L.Marker[] = [];
  private zonePolygonLayer?: L.Polygon | L.Polyline;

  // Active Map Tile Style Signal (Defaults to OpenStreetMap White Smooth)
  readonly selectedMapStyleId = signal<string>(
    (() => {
      try {
        const stored = localStorage.getItem('despulpadora_map_style');
        if (!stored || stored === 'stadia-smooth' || stored === 'carto-positron') return 'osm-white';
        if (stored === 'stadia-dark' || stored === 'carto-dark') return 'osm-dark';
        return stored;
      } catch {
        return 'osm-white';
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
    { name: 'Maracuyá 1000g', price: 11000, kg: 1.0 },
    { name: 'Mango Tommy 1000g', price: 10500, kg: 1.0 },
    { name: 'Lulo de Castilla 500g', price: 6600, kg: 0.5 },
    { name: 'Mora de Castilla 500g', price: 6500, kg: 0.5 },
    { name: 'Guanábana Criolla 1000g', price: 13800, kg: 1.0 }
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
      routeCode: 'RUTA-2026-CR1',
      routeDay: 'Jueves',
      routeStatus: 'en_ruta',
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
      routeCode: 'RUTA-2026-AM2',
      routeDay: 'Jueves',
      routeStatus: 'en_ruta',
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
      routeCode: 'RUTA-2026-FC3',
      routeDay: 'Jueves',
      routeStatus: 'en_ruta',
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

  // Couriers that currently have at least one assigned delivery stop
  readonly assignedCouriers = computed(() => {
    const stops = this.deliveryStops();
    const validStopIds = new Set(stops.map(s => s.id));
    return this.couriers().filter(
      c => c.orderIds.some(id => validStopIds.has(id)) || stops.some(s => s.assignedCourierId === c.id)
    );
  });

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
    this.dismissUnbilledAlert();
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

    L.control.zoom({ position: 'topleft' }).addTo(this.map);

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

    const tileClassName =
      style.id === 'osm-white'
        ? 'osm-tile-white-smooth'
        : style.id === 'osm-dark'
          ? 'osm-tile-dark-smooth'
          : '';

    const options: L.TileLayerOptions = {
      maxZoom: style.maxZoom,
      maxNativeZoom: style.maxNativeZoom,
      className: tileClassName,
      attribution: style.id === 'esri-gray'
        ? 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
        : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
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
    } catch { }
  }

  private updatePolylineStylesForActiveMap() {
    if (!this.map) return;
    const isDark = this.selectedMapStyleId() === 'osm-dark';
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
          <path d="M17 18h1"></path>
          <path d="M12 18h1"></path>
          <path d="M7 18h1"></path>
        </svg>
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
        <strong style="color: #10b981; font-size: 0.95rem;">CAVA MATRIZ CUNDINAMARCA</strong>
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
    const coordCountMap = new Map<string, number>();

    stops.forEach(stop => {
      const courier = stop.assignedCourierId ? this.couriers().find(c => c.id === stop.assignedCourierId) : undefined;
      const isUnassigned = !courier && !stop.isDelivered;

      // Al consultar en vivo el despacho y rutas, no mostrar las entregas no asignadas a ningún mensajero
      if (this.mapViewMode() === 'live' && (!courier || !stop.assignedCourierId)) {
        return;
      }

      const bgColor = stop.isDelivered ? '#10b981' : (courier ? courier.color : '#ffffff');
      const textColor = isUnassigned ? '#0f172a' : '#ffffff';
      const borderColor = isUnassigned ? '#475569' : '#ffffff';
      const borderWidth = isUnassigned ? '2.5px' : '2px';
      const headerColor = courier ? courier.color : '#475569';
      const stopIndexInCourier = courier ? (courier.orderIds.indexOf(stop.id) + 1) : '•';

      const coordKey = `${stop.lat.toFixed(4)}_${stop.lng.toFixed(4)}`;
      const seenCount = coordCountMap.get(coordKey) || 0;
      coordCountMap.set(coordKey, seenCount + 1);

      let markerLat = stop.lat;
      let markerLng = stop.lng;
      if (seenCount > 0) {
        const angle = (seenCount * 135 * Math.PI) / 180;
        markerLat += 0.0012 * Math.cos(angle);
        markerLng += 0.0012 * Math.sin(angle);
      }

      const iconHtml = `
        <div style="
          background: ${bgColor};
          color: ${textColor};
          border: ${borderWidth} solid ${borderColor};
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.32);
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

      const marker = L.marker([markerLat, markerLng], {
        icon: stopIcon,
        zIndexOffset: isUnassigned ? 800 : 0
      }).addTo(this.map!);

      const courierAssignButtonsHtml = this.couriers()
        .map(c => {
          const isSelected = stop.assignedCourierId === c.id;
          return `
            <button
              type="button"
              id="btn-popup-assign-${stop.id}-${c.id}"
              style="
                padding: 5px 8px;
                border-radius: 7px;
                border: 1.5px solid ${isSelected ? c.color : '#cbd5e1'};
                background: ${isSelected ? c.color : '#ffffff'};
                color: ${isSelected ? '#ffffff' : '#0f172a'};
                font-size: 0.72rem;
                font-weight: 800;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 4px;
              "
            >
              ${c.name.split(' ')[0]}
            </button>
          `;
        })
        .join('');

      marker.bindPopup(`
        <div style="font-family: var(--font-body); min-width: 235px;">
          <div style="font-size: 0.72rem; color: ${headerColor}; font-weight: 800;">${stop.orderNumber} · ${courier ? 'PARADA #' + stopIndexInCourier : 'SIN MENSAJERO'}</div>
          <strong style="font-size: 0.95rem; color: #0f172a; display: block; margin-top: 2px;">${stop.clientName}</strong>
          <div style="font-size: 0.78rem; color: #64748b; margin-top: 4px;">${stop.address} (${stop.zone})</div>
          <div style="font-size: 0.78rem; color: #f59e0b; margin-top: 2px;">${stop.itemsSummary}</div>
          <div style="font-size: 0.85rem; font-weight: 800; color: #10b981; margin-top: 6px;">Total: ${this.formatCOP(stop.totalAmount)}</div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
            <div style="font-size: 0.7rem; font-weight: 800; color: #1e5e3a; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 6px;">
              Asignar mensajero:
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 5px;">
              ${courierAssignButtonsHtml}
              <button
                type="button"
                id="btn-popup-unassign-${stop.id}"
                style="
                  padding: 5px 8px;
                  border-radius: 7px;
                  border: 1.5px solid ${!stop.assignedCourierId ? '#0f172a' : '#cbd5e1'};
                  background: ${!stop.assignedCourierId ? '#f1f5f9' : '#ffffff'};
                  color: #475569;
                  font-size: 0.7rem;
                  font-weight: 800;
                  cursor: pointer;
                "
              >
                Sin asignar
              </button>
            </div>
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
            Eliminar entrega del mapa
          </button>
        </div>
      `);

      marker.on('popupopen', () => {
        this.couriers().forEach(c => {
          const assignBtn = document.getElementById(`btn-popup-assign-${stop.id}-${c.id}`);
          if (assignBtn) {
            assignBtn.onclick = (e) => {
              e.stopPropagation();
              marker.closePopup();
              this.assignCourierToStop(stop.id, c.id);
              this.notification.success(
                'Mensajero Asignado',
                `${stop.orderNumber} (${stop.clientName}) asignado a ${c.name}.`
              );
            };
          }
        });

        const unassignBtn = document.getElementById(`btn-popup-unassign-${stop.id}`);
        if (unassignBtn) {
          unassignBtn.onclick = (e) => {
            e.stopPropagation();
            marker.closePopup();
            this.assignCourierToStop(stop.id, '');
            this.notification.info(
              'Entrega Sin Asignar',
              `${stop.orderNumber} (${stop.clientName}) quedó pendiente de mensajero.`
            );
          };
        }

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
  // REAL ROAD ROUTING ENGINE (STADIA MAPS VALHALLA + OSRM + OSM.DE)
  // =========================================================================
  private decodePolyline6(encoded: string): [number, number][] {
    const inv = 1.0 / 1e6;
    const decoded: [number, number][] = [];
    let prevLat = 0;
    let prevLon = 0;
    let i = 0;
    const len = encoded.length;

    while (i < len) {
      let shift = 0;
      let result = 0;
      let byte = 0;
      do {
        if (i >= len) break;
        byte = encoded.charCodeAt(i++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const dLat = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);
      prevLat += dLat;

      shift = 0;
      result = 0;
      do {
        if (i >= len) break;
        byte = encoded.charCodeAt(i++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const dLon = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);
      prevLon += dLon;

      decoded.push([prevLat * inv, prevLon * inv]);
    }
    return decoded;
  }

  private async getRoadSegment(lat1: number, lng1: number, lat2: number, lng2: number): Promise<[number, number][]> {
    const key = `${lat1.toFixed(4)},${lng1.toFixed(4)}_${lat2.toFixed(4)},${lng2.toFixed(4)}`;
    if (this.roadSegmentCache.has(key)) {
      return this.roadSegmentCache.get(key)!;
    }

    // 1. Primary Engine: Valhalla OpenStreetMap Free Street Router
    try {
      const valhallaRes = await fetch('https://valhalla1.openstreetmap.de/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations: [
            { lat: lat1, lon: lng1 },
            { lat: lat2, lon: lng2 }
          ],
          costing: 'auto',
          directions_options: { units: 'kilometers' }
        }),
        signal: AbortSignal.timeout(5000)
      });
      if (valhallaRes.ok) {
        const valhallaData = await valhallaRes.json();
        const shape = valhallaData?.trip?.legs?.[0]?.shape;
        if (typeof shape === 'string' && shape.length > 2) {
          const roadCoords = this.decodePolyline6(shape);
          if (roadCoords.length > 2) {
            this.roadSegmentCache.set(key, roadCoords);
            return roadCoords;
          }
        }
      }
    } catch {
      // Fall through to OSRM
    }

    // 2. Secondary Engine: OSRM & OpenStreetMap.de Car Router
    const osrmEndpoints = [
      `https://router.project-osrm.org/route/v1/driving/${lng1.toFixed(5)},${lat1.toFixed(5)};${lng2.toFixed(5)},${lat2.toFixed(5)}?overview=full&geometries=geojson`,
      `https://routing.openstreetmap.de/routed-car/route/v1/driving/${lng1.toFixed(5)},${lat1.toFixed(5)};${lng2.toFixed(5)},${lat2.toFixed(5)}?overview=full&geometries=geojson`
    ];

    for (const url of osrmEndpoints) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (data.routes?.[0]?.geometry?.coordinates?.length > 1) {
            const roadCoords: [number, number][] = data.routes[0].geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]]
            );
            this.roadSegmentCache.set(key, roadCoords);
            return roadCoords;
          }
        }
      } catch {
        // Continue to next endpoint
      }
    }

    // Offline fallback (do not cache so next online attempt uses real street routing)
    return this.generateUrbanCorridorRoute(lat1, lng1, lat2, lng2);
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
        const isDark = this.selectedMapStyleId() === 'osm-dark';
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
          ${courier.vehicleType === 'moto'
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="16" r="3"></circle><circle cx="19" cy="16" r="3"></circle><path d="M12 16h3l3-6h-5l-2 3H8l2-5h3"></path></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`
        }
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

  readonly zoneCapturedStops = computed(() => {
    const pts = this.zonePolygonPoints();
    const target = this.zoneTargetPoints();
    if (pts.length < target) return [];
    return this.deliveryStops().filter(stop => this.isPointInPolygon(stop.lat, stop.lng, pts));
  });

  setZoneTargetPoints(pts: 4 | 6) {
    if (this.zoneTargetPoints() !== pts) {
      this.zoneTargetPoints.set(pts);
      this.clearZonePolygon();
    }
  }

  clearZonePolygon() {
    this.zonePolygonPoints.set([]);
    this.showZoneAssignCard.set(false);
    this.zoneVertexMarkers.forEach(m => m.remove());
    this.zoneVertexMarkers = [];
    if (this.zonePolygonLayer) {
      this.zonePolygonLayer.remove();
      this.zonePolygonLayer = undefined;
    }
  }

  private handleMapClick(latlng: L.LatLng) {
    // Bloquear clics en el mapa a menos que esté activo el modo 'Ver Todas las Entregas' ('stops')
    if (this.mapViewMode() !== 'stops') {
      return;
    }

    const target = this.zoneTargetPoints();
    let currentPts = [...this.zonePolygonPoints()];

    // Si ya se había completado la figura anterior, reiniciar para armar una nueva zona
    if (currentPts.length >= target) {
      this.clearZonePolygon();
      currentPts = [];
    }

    currentPts.push([latlng.lat, latlng.lng]);
    this.zonePolygonPoints.set(currentPts);

    this.renderZonePolygonOnMap();

    if (currentPts.length === target) {
      this.showZoneAssignCard.set(true);
      const captured = this.zoneCapturedStops();
      if (captured.length > 0) {
        this.notification.success(
          'Zona Creada',
          `${captured.length} entrega(s) agrupadas dentro del polígono. Selecciona el mensajero para asignarlas.`
        );
      } else {
        this.notification.warning(
          'Zona sin entregas',
          'No se encontraron entregas dentro del área marcada. Puedes limpiar y trazar de nuevo.'
        );
      }
    }
  }

  private renderZonePolygonOnMap() {
    if (!this.map) return;

    this.zoneVertexMarkers.forEach(m => m.remove());
    this.zoneVertexMarkers = [];
    if (this.zonePolygonLayer) {
      this.zonePolygonLayer.remove();
      this.zonePolygonLayer = undefined;
    }

    const pts = this.zonePolygonPoints();
    const target = this.zoneTargetPoints();

    pts.forEach((pt, idx) => {
      const vertexHtml = `
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #1e5e3a;
          color: #ffffff;
          border: 2.5px solid #ffffff;
          box-shadow: 0 3px 10px rgba(15, 23, 42, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 900;
          font-family: var(--font-heading);
        ">${idx + 1}</div>
      `;
      const icon = L.divIcon({
        html: vertexHtml,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      const vMarker = L.marker(pt, { icon, zIndexOffset: 1000 }).addTo(this.map!);
      this.zoneVertexMarkers.push(vMarker);
    });

    if (pts.length >= 2 && pts.length < target) {
      this.zonePolygonLayer = L.polyline(pts, {
        color: '#1e5e3a',
        weight: 3,
        dashArray: '6, 6',
        opacity: 0.9
      }).addTo(this.map);
    } else if (pts.length === target) {
      this.zonePolygonLayer = L.polygon(pts, {
        color: '#1e5e3a',
        weight: 3,
        fillColor: '#10b981',
        fillOpacity: 0.22
      }).addTo(this.map);
    }
  }

  assignZoneStopsToCourier(courierId: string) {
    const captured = this.zoneCapturedStops();
    if (captured.length === 0) return;

    const capturedIds = new Set(captured.map(s => s.id));

    this.deliveryStops.update(stops =>
      stops.map(s => (capturedIds.has(s.id) ? { ...s, assignedCourierId: courierId } : s))
    );

    this.couriers.update(list =>
      list.map(c => {
        const withoutCaptured = c.orderIds.filter(id => !capturedIds.has(id));
        if (c.id === courierId) {
          return { ...c, orderIds: [...withoutCaptured, ...Array.from(capturedIds)] };
        }
        return { ...c, orderIds: withoutCaptured };
      })
    );

    this.renderStopMarkers();
    this.buildAndRenderRealRoadRoutes();

    const courier = this.couriers().find(c => c.id === courierId);
    if (courier) {
      this.notification.success(
        'Agrupación Asignada',
        `Se asignaron ${captured.length} entrega(s) de la zona a ${courier.name}.`
      );
    } else {
      this.notification.info(
        'Entregas Desasignadas',
        `${captured.length} entrega(s) de la zona quedaron sin mensajero asignado.`
      );
    }

    this.clearZonePolygon();
  }

  private isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const yi = polygon[i][0];
      const xi = polygon[i][1];
      const yj = polygon[j][0];
      const xj = polygon[j][1];

      const intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
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
    this.isMobileAddressSearchOpen.set(false);
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
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
          Dirección Localizada
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
          Crear Pedido en Esta Dirección
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff" stroke="#000000" stroke-width="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3" fill="#f59e0b"></circle>
          </svg>
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
  // DRAG & DROP ROUTE REORDERING FOR COURIER DELIVERIES
  // =========================================================================
  readonly draggedRouteStopId = signal<number | null>(null);
  readonly dragOverRouteStopId = signal<number | null>(null);
  readonly dragOverCourierPillId = signal<string | null>(null);

  onRouteStopDragStart(event: DragEvent, stop: DeliveryWaypoint) {
    this.draggedRouteStopId.set(stop.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(stop.id));

      const idxLabel = this.getStopOrderIndex(stop);
      const ghost = document.createElement('div');
      ghost.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 7px 13px;
        border-radius: 10px;
        background: #1e5e3a;
        color: #ffffff;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 12px;
        font-weight: 800;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.28);
        border: 1.5px solid #86efac;
        white-space: nowrap;
        z-index: 99999;
        pointer-events: none;
      `;
      ghost.innerHTML = `<span>#${idxLabel}</span> <span>·</span> <span>${stop.clientName}</span> <span style="opacity:0.8">(${stop.orderNumber})</span>`;
      document.body.appendChild(ghost);
      event.dataTransfer.setDragImage(ghost, 20, 18);
      setTimeout(() => {
        if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
      }, 0);
    }
  }

  onRouteStopDragOver(event: DragEvent, targetStop: DeliveryWaypoint) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    if (this.draggedRouteStopId() !== targetStop.id) {
      this.dragOverRouteStopId.set(targetStop.id);
    }
  }

  onRouteStopDragLeave(stopId: number) {
    if (this.dragOverRouteStopId() === stopId) {
      this.dragOverRouteStopId.set(null);
    }
  }

  onRouteStopDrop(event: DragEvent, targetStop: DeliveryWaypoint, explicitCourierId?: string) {
    event.preventDefault();
    event.stopPropagation();

    const rawId = event.dataTransfer?.getData('text/plain');
    const draggedId = this.draggedRouteStopId() ?? (rawId ? Number(rawId) : null);

    this.draggedRouteStopId.set(null);
    this.dragOverRouteStopId.set(null);
    this.dragOverCourierPillId.set(null);

    if (draggedId === null || draggedId === targetStop.id) return;

    this.reorderStopToTarget(draggedId, targetStop.id, explicitCourierId);
  }

  onRouteStopContainerDrop(event: DragEvent, explicitCourierId?: string) {
    event.preventDefault();
    const draggedId = this.draggedRouteStopId();
    const targetId = this.dragOverRouteStopId();

    this.draggedRouteStopId.set(null);
    this.dragOverRouteStopId.set(null);
    this.dragOverCourierPillId.set(null);

    if (draggedId !== null && targetId !== null && draggedId !== targetId) {
      this.reorderStopToTarget(draggedId, targetId, explicitCourierId);
    }
  }

  onRouteStopDragEnd() {
    this.draggedRouteStopId.set(null);
    this.dragOverRouteStopId.set(null);
    this.dragOverCourierPillId.set(null);
  }

  onCourierPillDragOver(event: DragEvent, courierId: string) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverCourierPillId.set(courierId);
  }

  onCourierPillDragLeave(courierId: string) {
    if (this.dragOverCourierPillId() === courierId) {
      this.dragOverCourierPillId.set(null);
    }
  }

  onDropStopOnCourierPill(event: DragEvent, courierId: string) {
    event.preventDefault();
    event.stopPropagation();
    const rawId = event.dataTransfer?.getData('text/plain');
    const draggedId = this.draggedRouteStopId() ?? (rawId ? Number(rawId) : null);

    this.draggedRouteStopId.set(null);
    this.dragOverRouteStopId.set(null);
    this.dragOverCourierPillId.set(null);

    if (draggedId === null) return;
    const stop = this.deliveryStops().find(s => s.id === draggedId);
    if (stop && !this.isStopBilled(stop)) {
      this.showUnbilledOrderAlert(stop, courierId);
      return;
    }
    const courier = this.couriers().find(c => c.id === courierId);
    this.assignCourierToStop(draggedId, courierId);
    if (stop && courier) {
      this.notification.success(
        'Entrega Asignada',
        `${stop.clientName} (${stop.orderNumber}) se asignó a ${courier.name}.`
      );
    }
  }

  private reorderStopToTarget(draggedId: number, targetId: number, explicitCourierId?: string) {
    const stops = this.deliveryStops();
    const draggedStop = stops.find(s => s.id === draggedId);
    const targetStop = stops.find(s => s.id === targetId);
    if (!draggedStop || !targetStop) return;

    const activeFilter = this.drawerCourierFilter();
    const courierId =
      explicitCourierId ||
      (activeFilter !== 'all' ? activeFilter : (targetStop.assignedCourierId || draggedStop.assignedCourierId));

    // If dropped onto a stop belonging to a courier, ensure draggedStop is assigned to that courier
    if (courierId && draggedStop.assignedCourierId !== courierId) {
      this.deliveryStops.update(list =>
        list.map(s => (s.id === draggedId ? { ...s, assignedCourierId: courierId } : s))
      );
    }

    // Reorder inside courier.orderIds
    if (courierId) {
      this.couriers.update(list =>
        list.map(c => {
          if (c.id === courierId) {
            const orderIds = c.orderIds.filter(id => id !== draggedId);
            const targetIdx = orderIds.indexOf(targetId);
            const oldIdx = c.orderIds.indexOf(draggedId);
            if (targetIdx !== -1) {
              const insertAt = oldIdx !== -1 && oldIdx < c.orderIds.indexOf(targetId) ? targetIdx + 1 : targetIdx;
              orderIds.splice(insertAt, 0, draggedId);
            } else {
              orderIds.push(draggedId);
            }
            return { ...c, orderIds };
          }
          // Remove from other couriers if it switched courier
          return { ...c, orderIds: c.orderIds.filter(id => id !== draggedId) };
        })
      );
    }

    // Also reorder deliveryStops array so 'Todas' view reflects the new order
    this.deliveryStops.update(list => {
      const copy = [...list];
      const fromIdx = copy.findIndex(s => s.id === draggedId);
      const toIdx = copy.findIndex(s => s.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return list;
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });

    this.renderStopMarkers();
    this.buildAndRenderRealRoadRoutes();

    const courier = courierId ? this.couriers().find(c => c.id === courierId) : undefined;
    const newPos = courier ? courier.orderIds.indexOf(draggedId) + 1 : null;
    this.notification.info(
      'Orden de Ruta Actualizado',
      courier && newPos
        ? `${draggedStop.clientName} ahora es la parada #${newPos} de ${courier.name}.`
        : `Se actualizó la posición de ${draggedStop.clientName}.`
    );
  }

  // =========================================================================
  // SLIDE-OVER DELIVERIES DRAWER & PIN DELETION METHODS
  // =========================================================================
  readonly filteredDrawerStops = computed(() => {
    const cFilter = this.drawerCourierFilter();
    const query = this.drawerSearchQuery().trim().toLowerCase();
    let list = this.deliveryStops();

    if (cFilter !== 'all') {
      const courier = this.couriers().find(c => c.id === cFilter);
      if (courier) {
        const stopMap = new Map(this.deliveryStops().map(s => [s.id, s]));
        const ordered = courier.orderIds
          .map(id => stopMap.get(id))
          .filter((s): s is DeliveryWaypoint => !!s);
        const orderedIds = new Set(courier.orderIds);
        const extras = this.deliveryStops().filter(
          s => s.assignedCourierId === cFilter && !orderedIds.has(s.id)
        );
        list = [...ordered, ...extras];
      } else {
        list = list.filter(s => s.assignedCourierId === cFilter);
      }
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

  readonly isRefreshingDrawer = signal<boolean>(false);

  openAllDeliveriesAndDrawer() {
    this.isMobileAddressSearchOpen.set(false);
    if (this.mapViewMode() !== 'stops') {
      this.enterAllDeliveriesMode();
      this.showDeliveriesDrawer.set(true);
    } else {
      this.showDeliveriesDrawer.update(v => !v);
    }
    setTimeout(() => {
      this.map?.invalidateSize();
      this.fitMapToAllStops();
    }, 150);
  }

  refreshDeliveriesFromOrders() {
    this.isRefreshingDrawer.set(true);
    const beforeCount = this.deliveryStops().length;
    this.syncWithStateServiceOrders();
    this.renderStopMarkers();
    this.buildAndRenderRealRoadRoutes();
    const addedCount = this.deliveryStops().length - beforeCount;

    setTimeout(() => {
      this.isRefreshingDrawer.set(false);
      this.notification.success(
        'Lista de Entregas Actualizada',
        addedCount > 0
          ? `Se sincronizaron ${addedCount} nuevo(s) pedido(s) en el mapa.`
          : `Todas las entregas (${this.deliveryStops().length}) están sincronizadas.`
      );
    }, 450);
  }

  toggleDeliveriesDrawer() {
    const next = !this.showDeliveriesDrawer();
    if (next && this.mapViewMode() === 'locked') {
      this.enterAllDeliveriesMode();
    }
    this.showDeliveriesDrawer.set(next);
  }

  onCourierSelectChange(stop: DeliveryWaypoint, newCourierId: string) {
    if (newCourierId && !this.isStopBilled(stop)) {
      // Revert select model value to current assigned courier
      const currentAssigned = stop.assignedCourierId || '';
      this.deliveryStops.update(stops =>
        stops.map(s => (s.id === stop.id ? { ...s, assignedCourierId: '' } : s))
      );
      setTimeout(() => {
        this.deliveryStops.update(stops =>
          stops.map(s => (s.id === stop.id ? { ...s, assignedCourierId: currentAssigned } : s))
        );
      }, 50);

      // Trigger the 10-second informative banner!
      this.showUnbilledOrderAlert(stop, newCourierId);
      return;
    }
    this.assignCourierToStop(stop.id, newCourierId);
  }

  showUnbilledOrderAlert(stop: DeliveryWaypoint, targetCourierId: string) {
    if (this.unbilledAlertTimeout) {
      clearTimeout(this.unbilledAlertTimeout);
    }
    this.activeUnbilledAlert.set({
      stopId: stop.id,
      orderNumber: stop.orderNumber,
      clientName: stop.clientName,
      targetCourierId
    });

    this.unbilledAlertTimeout = setTimeout(() => {
      this.dismissUnbilledAlert();
    }, 10000);
  }

  dismissUnbilledAlert() {
    if (this.unbilledAlertTimeout) {
      clearTimeout(this.unbilledAlertTimeout);
      this.unbilledAlertTimeout = undefined;
    }
    this.activeUnbilledAlert.set(null);
  }

  requestPriorityFromBanner() {
    const alert = this.activeUnbilledAlert();
    if (!alert) return;
    const stop = this.deliveryStops().find(s => s.id === alert.stopId);
    if (stop) {
      this.toggleStopPriority(stop, true);
    } else {
      this.stateService.setOrderPriority(alert.stopId, true);
      this.stateService.setOrderPriority(alert.orderNumber, true);
      this.notification.warning(
        'Alerta de Prioridad Activada',
        `Pedido ${alert.orderNumber} marcado con ALTA PRIORIDAD en Cava / KDS.`
      );
    }
    this.dismissUnbilledAlert();
  }

  isStopBilled(stop: DeliveryWaypoint): boolean {
    if (stop.isBilled !== undefined) return stop.isBilled;
    const order = this.stateService.orders().find(o => o.orderId === stop.id || o.orderNumber === stop.orderNumber);
    if (order) {
      return order.isBilled === true || order.status === 'BILLED' || order.status === 'DISPATCHED' || order.status === 'DELIVERED';
    }
    return stop.isDelivered;
  }

  isStopPriority(stop: DeliveryWaypoint): boolean {
    if (stop.isPriority) return true;
    const order = this.stateService.orders().find(o => o.orderId === stop.id || o.orderNumber === stop.orderNumber);
    return order?.isPriority === true;
  }

  toggleStopPriority(stop: DeliveryWaypoint, forceState?: boolean) {
    const nextVal = forceState !== undefined ? forceState : !this.isStopPriority(stop);

    this.deliveryStops.update(stops =>
      stops.map(s => (s.id === stop.id ? { ...s, isPriority: nextVal } : s))
    );

    this.stateService.setOrderPriority(stop.id, nextVal);
    this.stateService.setOrderPriority(stop.orderNumber, nextVal);

    if (nextVal) {
      this.notification.warning(
        'Alerta de Prioridad Activada',
        `El pedido ${stop.orderNumber} se marcó con ALTA PRIORIDAD. Se resaltó con borde rojo en la pantalla de Cava (KDS).`
      );
    } else {
      this.notification.info(
        'Prioridad Desactivada',
        `Se retiró la alerta de prioridad del pedido ${stop.orderNumber}.`
      );
    }
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
    if (!stop.assignedCourierId) return '•';
    const courier = this.couriers().find(c => c.id === stop.assignedCourierId);
    if (!courier) return '•';
    const idx = courier.orderIds.indexOf(stop.id);
    return idx >= 0 ? idx + 1 : '•';
  }

  focusStopOnMap(stop: DeliveryWaypoint) {
    if (this.mapViewMode() === 'locked') {
      this.enterAllDeliveriesMode();
    }
    if (this.map) {
      const marker = this.stopMarkers.get(stop.id);
      const targetLatLng = marker ? marker.getLatLng() : L.latLng(stop.lat, stop.lng);
      this.map.flyTo(targetLatLng, 15, { duration: 0.9 });
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
    this.isMobileAddressSearchOpen.set(false);
    this.mapViewMode.set('live');
    this.showDeliveriesDrawer.set(false);
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
    this.isMobileAddressSearchOpen.set(false);
    this.syncWithStateServiceOrders();
    this.mapViewMode.set('stops');
    this.showDeliveriesDrawer.set(true);
    this.isSimulating.set(false);
    this.syncMapLayersForMode();
    this.renderStopMarkers();
    if (this.map) {
      setTimeout(() => {
        this.map?.invalidateSize();
        this.fitMapToAllStops();
      }, 100);
      setTimeout(() => {
        this.map?.invalidateSize();
      }, 300);
    }
  }

  lockMapOverlay() {
    this.isMobileAddressSearchOpen.set(false);
    this.mapViewMode.set('locked');
    this.showDeliveriesDrawer.set(false);
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

    this.renderStopMarkers();

    const mode = this.mapViewMode();
    if (mode === 'stops') {
      // Hide moving courier markers and route polylines so only assigned delivery points are shown
      this.routeCasingPolylines.forEach(p => p.remove());
      this.routePolylines.forEach(p => p.remove());
      this.courierMarkers.forEach(m => m.remove());
    } else {
      this.clearZonePolygon();
      if (mode === 'live') {
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
  }

  private fitMapToAllStops() {
    if (!this.map) return;
    const isLive = this.mapViewMode() === 'live';
    const relevantStops = isLive
      ? this.deliveryStops().filter(s => !!s.assignedCourierId)
      : this.deliveryStops();

    const courierCoords = isLive
      ? this.assignedCouriers().map(c => [c.lat, c.lng] as [number, number])
      : [];

    const coords: [number, number][] = [
      [PLANTA_MATRIZ_LAT, PLANTA_MATRIZ_LNG],
      ...relevantStops.map(s => [s.lat, s.lng] as [number, number]),
      ...courierCoords
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

  getCourierInitials(name: string): string {
    if (!name) return 'M';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  flyToPlantaMatriz() {
    this.selectedCourierId.set('');
    if (this.map) {
      this.map.flyTo([PLANTA_MATRIZ_LAT, PLANTA_MATRIZ_LNG], 14, { duration: 1.2 });
    }
  }

  onCourierCardClick(id: string) {
    // Seleccionar o deseleccionar la tarjeta en la lista sin abrir ni alterar el estado del mapa
    this.selectedCourierId.update(curr => (curr === id ? '' : id));
  }

  selectCourier(id: string) {
    this.selectedCourierId.set(id);
    if (this.mapViewMode() === 'live' && this.map) {
      const courier = this.couriers().find(c => c.id === id);
      if (courier) {
        const courierStops = this.deliveryStops().filter(
          s => s.assignedCourierId === id || courier.orderIds.includes(s.id)
        );
        if (courierStops.length > 0) {
          const boundsCoords: [number, number][] = [
            [courier.lat, courier.lng],
            ...courierStops.map(s => [s.lat, s.lng] as [number, number])
          ];
          const bounds = L.latLngBounds(boundsCoords);
          this.map.flyToBounds(bounds, { padding: [55, 55], maxZoom: 15, duration: 1.2 });
        } else {
          this.map.flyTo([courier.lat, courier.lng], 14, { duration: 1.2 });
        }
      }
    }
  }

  flyToCourier(c: Courier) {
    if (this.mapViewMode() !== 'live') {
      this.enterLiveMapMode();
    }
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
    const stateOrders = this.stateService
      .orders()
      .filter(o => o.status !== 'CANCELLED' && o.status !== 'DELIVERED');
    const existingIds = new Set(this.deliveryStops().map(s => s.id));

    stateOrders.forEach((order, i) => {
      if (!existingIds.has(order.orderId)) {
        const seedLats = [4.6850, 4.6450, 4.6720, 4.6210, 4.8450];
        const seedLngs = [-74.0550, -74.0950, -74.0450, -74.1400, -74.0650];
        const lat = seedLats[i % seedLats.length];
        const lng = seedLngs[i % seedLngs.length];
        const matchedCourier = order.courierName
          ? this.couriers().find(c => c.name.toLowerCase().includes(order.courierName!.toLowerCase()))
          : undefined;
        const assignedCourierId = matchedCourier ? matchedCourier.id : '';

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
        if (assignedCourierId) {
          this.couriers.update(list => list.map(c => {
            if (c.id === assignedCourierId) {
              return { ...c, orderIds: [...c.orderIds, stop.id] };
            }
            return c;
          }));
        }

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
