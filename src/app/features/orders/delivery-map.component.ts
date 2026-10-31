import {
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  OnDestroy,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { GeocodingService } from '../../core/services/geocoding.service';
import { RealtimeSyncService } from '../../core/services/realtime-sync.service';
import { EmployeeDto, FruitConfig, OrderDto } from '../../core/models/business.models';
import { CopCurrencyInputDirective } from '../../shared/directives/cop-currency-input.directive';
import confetti from 'canvas-confetti';
import * as L from 'leaflet';

/**
 * Represents a delivery courier and their live telemetry and route assignment.
 */
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
  roadStepIndex: number;
  lat: number;
  lng: number;
  routeCode?: string;
  routeDay?: string;
  routeStatus?: 'en_preparacion' | 'en_ruta' | 'completada' | 'liquidada';
  isRouteCreated?: boolean;
}

/**
 * Represents a georeferenced delivery stop on the logistics map.
 */
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

const PLANTA_MATRIZ_LAT = 4.7125;
const PLANTA_MATRIZ_LNG = -74.1420;

const INITIAL_BOGOTA_STOPS: DeliveryWaypoint[] = [];

/**
 * Represents an address geocoding search result.
 */
export interface AddressSearchResult {
  id: string;
  name: string;
  label: string;
  lat: number;
  lng: number;
  zone: string;
  locality?: string;
}

/**
 * Represents a map tile layer style option.
 */
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
    id: 'arcgis-white',
    name: 'ArcGIS White Minimalist',
    shortName: 'ArcGIS White',
    badge: '100% GRATIS',
    icon: '',
    description: 'Cartografía blanca minimalista nativa de Esri ArcGIS con calles, sentidos viales y edificios hasta zoom 19 (sin cuenta ni API Key).',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 20,
    maxNativeZoom: 19
  },
  {
    id: 'osm-dark',
    name: 'Dark Smooth Mode',
    shortName: 'Dark Smooth',
    badge: 'MODO NOCHE',
    icon: '',
    description: 'Modo oscuro elegante de alto contraste 100% gratuito y sin API Key para visibilidad nocturna.',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    maxNativeZoom: 16,
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

/**
 * Interactive logistics and delivery map component for route planning, live courier tracking, and cash settlement.
 */
@Component({
  selector: 'app-delivery-map',
  standalone: true,
  imports: [CommonModule, FormsModule, CopCurrencyInputDirective],
  template: `
    <div class="delivery-map-container">
      
      <div class="map-header-card">

        
        <div class="telemetry-bar">
          <div class="telemetry-item">
            <div class="telemetry-icon" style="background: rgba(30, 94, 58, 0.12); color: var(--color-primary-text); display: flex; align-items: center; justify-content: center;">
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

      
      <div class="map-workspace-grid">
        
        <div
          class="map-canvas-card"
          [class.is-map-locked]="mapViewMode() === 'locked'"
          [class.map-fullscreen-active]="isMapFullscreen()"
          [class.is-stops-mode]="mapViewMode() === 'stops' || showDeliveriesDrawer()"
        >
          
          <div class="map-blur-target" [class.blurred]="mapViewMode() === 'locked'">
            
            @if (isMarkingPointMode()) {
              <div class="map-marking-banner">
                <span class="banner-pulse"></span>
                <span>MODO MARCADO ACTIVO: Haz clic en cualquier lugar de Bogotá o Cundinamarca para fijar la entrega y crear la orden.</span>
                <button class="banner-close" (click)="toggleMarkingPointMode()">Cancelar</button>
              </div>
            }

            <div #mapElement class="leaflet-map-element" id="bogota-cundinamarca-map"></div>

            
            <div
              class="map-address-search-box"
              [class.has-dropdown]="showSearchResults() && searchResults().length > 0"
              [class.mobile-hidden]="!isMobileAddressSearchOpen()"
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
            
            <div
              class="map-unlocked-mode-bar"
              [class.search-collapsed]="!isMobileAddressSearchOpen()"
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

              @if (!isMobileAddressSearchOpen()) {
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
                <svg class="lock-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span class="lock-btn-label">Bloquear</span>
              </button>
            </div>

            
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

          
          
          
          @if (showDeliveriesDrawer()) {
            <div
              class="deliveries-drawer"
              [style.height]="drawerHeightStyle()"
              (click)="$event.stopPropagation()"
            >
              
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

              @if (drawerCouriersWithStops().length > 0) {
                <div class="drawer-courier-routes-bar">
                  @for (c of drawerCouriersWithStops(); track c.id) {
                    <div class="drawer-courier-route-row" [class.is-route-created]="c.isRouteCreated">
                      <div class="dcr-left">
                        <span class="dcr-dot" [style.background]="c.color"></span>
                        <span class="dcr-name">{{ c.name }}</span>
                        <span class="dcr-count">{{ getCourierAssignedStopsCount(c.id) }} entrega(s)</span>
                      </div>
                      <div class="dcr-right">
                        @if (c.isRouteCreated) {
                          <button
                            type="button"
                            class="btn-edit-courier-route"
                            (click)="enableEditCourierRoute(c.id)"
                          >
                            Editar
                          </button>
                        } @else {
                          <button
                            type="button"
                            class="btn-create-courier-route"
                            (click)="openConfirmCreateRouteModal(c.id)"
                          >
                            Crear Ruta
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              }

              
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
                        title="Solicitar prioridad urgente en inventario para este pedido"
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
                  
                  <div class="alert-countdown-track">
                    <div class="alert-countdown-bar"></div>
                  </div>
                </div>
              }

              
              <div
                class="drawer-stops-list"
                (dragover)="$event.preventDefault()"
                (drop)="onRouteStopContainerDrop($event)"
              >
                @for (stop of filteredDrawerStops(); track stop.id) {
                  <div
                    class="drawer-stop-item"
                    [class.is-priority]="isStopPriority(stop)"
                    [class.is-route-locked]="isStopRouteLocked(stop)"
                    [attr.draggable]="isStopRouteLocked(stop) ? 'false' : 'true'"
                    [class.is-dragging]="draggedRouteStopId() === stop.id"
                    [class.is-drag-over]="dragOverRouteStopId() === stop.id && draggedRouteStopId() !== stop.id"
                    (dragstart)="onRouteStopDragStart($event, stop)"
                    (dragover)="onRouteStopDragOver($event, stop)"
                    (dragleave)="onRouteStopDragLeave(stop.id)"
                    (drop)="onRouteStopDrop($event, stop)"
                    (dragend)="onRouteStopDragEnd()"
                    (click)="focusStopOnMap(stop)"
                    [title]="isStopRouteLocked(stop) ? 'Ruta confirmada (Pulsa Editar en el mensajero para modificar)' : 'Mantén presionado y arrastra para cambiar el orden de entrega en la ruta'"
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
                      
                      <div class="drawer-stop-top">
                        <span class="drawer-stop-client" [title]="stop.clientName">{{ stop.clientName }}</span>
                        <span class="drawer-stop-amount">{{ formatCOP(stop.totalAmount) }}</span>
                      </div>

                      
                      <div class="drawer-stop-addr" [title]="stop.address">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; color: #64748b;">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>{{ stop.address }}</span>
                      </div>

                      
                      <div class="drawer-stop-status-line">
                        <span class="drawer-stop-code">{{ stop.orderNumber }}</span>
                        <span
                          class="stop-billed-badge"
                          [class.is-billed]="isStopBilled(stop)"
                          [title]="isStopBilled(stop) ? 'Pedido Facturado' : 'Pedido No Facturado (Aún en inventario)'"
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
                            [disabled]="isStopRouteLocked(stop)"
                            title="Asignar o cambiar mensajero de esta entrega"
                          >
                            <option value="">Sin mensajero</option>
                            @for (c of couriers(); track c.id) {
                              <option [value]="c.id">{{ c.name }}</option>
                            }
                          </select>
                        </div>

                        <div class="drawer-stop-actions">
                          
                          <button
                            type="button"
                            class="drawer-stop-priority-btn"
                            [class.is-active-priority]="isStopPriority(stop)"
                            [disabled]="isStopRouteLocked(stop)"
                            [title]="isStopPriority(stop) ? 'Quitar alerta de prioridad' : 'Marcar alerta de prioridad urgente en inventario'"
                            (click)="toggleStopPriority(stop)"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                            </svg>
                          </button>

                          
                          <button
                            type="button"
                            class="drawer-stop-del-btn"
                            [disabled]="isStopRouteLocked(stop)"
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

          
          <div class="map-left-controls-container" [class.is-fullscreen]="isMapFullscreen()">
              
              @if (mapViewMode() === 'live') {
                <div class="map-couriers-vertical-fab-stack">
                  
                  <button
                    type="button"
                    class="courier-fab-item fab-planta"
                    [class.is-selected]="!selectedCourierId()"
                    (click)="flyToPlantaMatriz()"
                    title="Bodega Matriz (Cota/Calle 80) · Centrar planta"
                  >
                    <span class="fab-initial">BM</span>
                  </button>

                  
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
        </div>

        
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

                  
                  <div class="progress-track">
                    <div
                      class="progress-fill"
                      [style.background]="c.color"
                      [style.width.%]="getCourierProgressPct(c)"
                    ></div>
                  </div>

                  
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
                      @if (c.isRouteCreated) {
                        <button
                          type="button"
                          class="btn-edit-courier-route"
                          (click)="$event.stopPropagation(); enableEditCourierRoute(c.id)"
                        >
                          <span>Editar</span>
                        </button>
                      } @else {
                        <button
                          type="button"
                          class="btn-create-courier-route"
                          (click)="$event.stopPropagation(); openConfirmCreateRouteModal(c.id)"
                        >
                          <span>Crear Ruta</span>
                        </button>
                      }

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
                        <span>Secuenciar</span>
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

      
      
      
      @if (showPointOrderModal()) {
        <div class="modal-backdrop" (click)="cancelPointCreation()">
          <div class="modal-card" (click)="$event.stopPropagation()" style="max-width: 580px;">
            <div class="modal-header">
              <div class="modal-title-group">
                <div class="modal-icon-badge" style="background: rgba(30, 94, 58, 0.15); color: #1e5e3a; display: flex; align-items: center; justify-content: center;">
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
                    type="text"
                    appCopInput
                    class="form-input"
                    [(ngModel)]="newOrderAmount"
                    placeholder="$ 150.000"
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
                      <div class="node-title">Punto de Partida: Inventario Matriz Cundinamarca</div>
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
                      [class.is-route-locked]="isStopRouteLocked(stop)"
                      [attr.draggable]="isStopRouteLocked(stop) ? 'false' : 'true'"
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

      
      
      
      @if (showReceiveModal() && receivingCourier()) {
        <div class="modal-backdrop" (click)="closeReceiveCourierModal()">
          <div class="modal-card modal-lg settlement-modal" (click)="$event.stopPropagation()">
            
            <div class="modal-header" style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-bottom: 1px solid #bbf7d0;">
              <div class="modal-title-group">
                <div class="modal-icon-badge" style="background: #1e5e3a; color: #ffffff; box-shadow: 0 4px 12px rgba(30, 94, 58, 0.35); display: flex; align-items: center; justify-content: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <h2 class="modal-title" style="color: #064e3b;">Recibir Domiciliario · Liquidación de Caja</h2>
                    <span class="badge-route-pill">{{ receivingCourier()?.routeCode || '' }}</span>
                  </div>
                  <p class="modal-subtitle" style="color: #1e5e3a;">
                    Arqueo de dinero recaudado, verificación de entregas y paz y salvo de recorrido
                  </p>
                </div>
              </div>
              <button type="button" class="btn-close" (click)="closeReceiveCourierModal()">✕</button>
            </div>

            <div class="modal-body" style="padding: 20px 24px;">
              
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
                        type="text"
                        appCopInput
                        [appCopPrefix]="false"
                        class="cash-input-field"
                        [ngModel]="physicalCashReceived()"
                        (ngModelChange)="physicalCashReceived.set(+$event)"
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

                    
                    @if (cashDifference() === 0) {
                      <div class="caja-diff-badge diff-ok">
                        <span class="diff-icon" style="display: flex; align-items: center; justify-content: center; color: #1e5e3a;">
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

              
              @if (showReceiptPrintView()) {
                <div class="thermal-receipt-preview">
                  <div class="thermal-receipt-body" id="thermal-receipt-domi">
                    <div class="receipt-header">
                      <h4>{{ stateService.companyInfo().companyName }}</h4>
                      <p>{{ stateService.companyInfo().address }} · NIT {{ stateService.companyInfo().nit }}</p>
                      <div class="receipt-divider">================================</div>
                      <div class="receipt-title">COMPROBANTE DE ENTREGA DE CAJA</div>
                      <div>RUTA: {{ receivingCourier()?.routeCode || '' }}</div>
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
                  style="gap: 8px; font-weight: 800; background: #164a2d; border-color: #1e5e3a;"
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

      @if (showConfirmCreateRouteModal() && pendingRouteCourier(); as routeCourier) {
        <div class="modal-backdrop" (click)="cancelConfirmCreateRoute()">
          <div class="modal-card confirm-route-modal" (click)="$event.stopPropagation()" style="max-width: 440px;">
            <div class="modal-header">
              <div class="modal-title-group">
                <div class="modal-icon-badge" style="background: rgba(30, 94, 58, 0.14); color: #1e5e3a; display: flex; align-items: center; justify-content: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="6" cy="19" r="3"></circle>
                    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"></path>
                    <circle cx="18" cy="5" r="3"></circle>
                  </svg>
                </div>
                <div>
                  <h2 class="modal-title">Confirmar Creación de Ruta</h2>
                  <p class="modal-subtitle">Despacho y sincronización hacia la App del domiciliario</p>
                </div>
              </div>
              <button type="button" class="btn-close" (click)="cancelConfirmCreateRoute()">✕</button>
            </div>

            <div class="modal-body" style="padding: 18px 20px;">
              <p style="margin: 0 0 10px; font-size: 0.92rem; color: #0f172a; line-height: 1.45;">
                ¿Deseas crear y confirmar la ruta de entrega para
                <strong>{{ routeCourier.name }}</strong> con
                <strong>{{ getCourierAssignedStopsCount(routeCourier.id) }} entrega(s)</strong> asignada(s)?
              </p>
              <p style="margin: 0; font-size: 0.78rem; color: #64748b; line-height: 1.4;">
                Al confirmar, la ruta quedará guardada en la base de datos, se enviará a la App de Flutter del domiciliario y las tarjetas de las entregas quedarán bloqueadas hasta que pulses <strong>Editar</strong>.
              </p>
            </div>

            <div class="modal-footer" style="justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary btn-cancel-create-route" (click)="cancelConfirmCreateRoute()">
                No
              </button>
              <button
                type="button"
                class="btn btn-primary btn-confirm-create-route"
                (click)="confirmCreateCourierRoute()"
                style="background: #1e5e3a; border-color: #1e5e3a; font-weight: 800;"
              >
                Sí, crear ruta
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
      color: #1e5e3a;
      background: rgba(30, 94, 58, 0.12);
      border: 1px solid rgba(30, 94, 58, 0.25);
      padding: 4px 10px;
      border-radius: 9999px;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background: #1e5e3a;
      border-radius: 50%;
      box-shadow: 0 0 8px #1e5e3a;
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
      background: rgba(30, 94, 58, 0.12);
      color: #1e5e3a;
      border: 1px solid rgba(30, 94, 58, 0.2);
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
      background: rgba(30, 94, 58, 0.15) !important;
      color: #1e5e3a !important;
      border-color: #1e5e3a !important;
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

    @media (max-width: 768px) {
      .map-header-card {
        background: transparent;
        border: none;
        padding: 0;
        box-shadow: none;
      }

      .telemetry-bar {
        grid-template-columns: 1fr;
        gap: 10px;
      }

      .telemetry-item {
        background: #ffffff;
        border: 1.5px solid #e2e8f0;
        border-radius: 14px;
        padding: 12px 14px;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
      }
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
        color: #164a2d;
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
      color: #164a2d;
      border: 2px solid #1e5e3a;
      box-shadow: 0 8px 24px rgba(30, 94, 58, 0.16),
                  0 2px 6px rgba(0, 0, 0, 0.06);
      letter-spacing: 0.2px;

      &:hover {
        background: #f0fdf4;
        border-color: #164a2d;
        color: #1e5e3a;
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 12px 30px rgba(30, 94, 58, 0.28),
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
      background: rgba(30, 94, 58, 0.45);
      animation: beaconRipple 1.8s cubic-bezier(0, 0.2, 0.8, 1) infinite;
    }

    .beacon-dot {
      position: relative;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #1e5e3a;
      box-shadow: 0 0 6px #1e5e3a;
    }

    @keyframes beaconRipple {
      0% { transform: scale(0.4); opacity: 1; }
      100% { transform: scale(2.2); opacity: 0; }
    }

    .btn-counter-badge {
      background: #ecfdf5;
      color: #1e5e3a;
      font-size: 0.74rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 9999px;
      border: 1px solid #d1e7d8;
      margin-left: 2px;
    }

    .live-dot-indicator {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #1e5e3a;
      box-shadow: 0 0 8px #1e5e3a;
      animation: pulseAnim 1.4s infinite;
      flex-shrink: 0;
    }

    
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
      border: 2.5px solid var(--courier-accent, #1e5e3a);
      color: var(--courier-accent, #1e5e3a);
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
        background: var(--courier-accent, #1e5e3a);
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
        background: var(--courier-accent, #1e5e3a);
        color: #ffffff;
      }

      &:active {
        transform: scale(0.96);
      }

      &.is-selected {
        background: var(--courier-accent, #1e5e3a);
        color: #ffffff;
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.95), 0 4px 16px rgba(0, 0, 0, 0.3);
        transform: scale(1.08);

        .fab-badge {
          background: #0f172a;
          color: #ffffff;
        }
      }

      &.fab-planta {
        border-color: #1e5e3a;
        color: #164a2d;
        background: #ecfdf5;

        &:hover, &.is-selected {
          background: #1e5e3a;
          color: #ffffff;
        }
      }
    }

    
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
      color: #164a2d;
      border: 2px solid #1e5e3a;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(30, 94, 58, 0.18), 0 1px 3px rgba(0, 0, 0, 0.08);
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        background: #f0fdf4;
        border-color: #164a2d;
        color: #1e5e3a;
        transform: scale(1.06);
      }

      &:active {
        transform: scale(0.96);
      }

      &.is-fullscreen {
        background: #f0fdf4;
        border-color: #1e5e3a;
        color: #1e5e3a;
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
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      flex-shrink: 0;
      transition: all 0.2s ease;

      &:hover {
        background: #fee2e2;
        color: #dc2626;
        border-color: #fecaca;
      }

      @media (max-width: 768px) {
        width: 32px;
        height: 32px;
        min-width: 32px;
        padding: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.95);
        border: 1.5px solid #dbe4de;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);

        .lock-btn-label {
          display: none;
        }
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
      background: rgba(30, 94, 58, 0.15);
      color: #1e5e3a;
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
      background: rgba(30, 94, 58, 0.1);
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

    
    .location-preview-card {
      background: linear-gradient(135deg, rgba(30, 94, 58, 0.12), rgba(14, 165, 233, 0.08));
      border: 1px solid rgba(30, 94, 58, 0.25);
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
      color: #1e5e3a;
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
      background: rgba(30, 94, 58, 0.15);
      border-color: #1e5e3a;
      color: #1e5e3a;
    }

    .chip-price {
      font-size: 0.72rem;
      opacity: 0.75;
    }

    
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

    .text-emerald { color: #1e5e3a; }
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

    
    .sequence-list-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .sequence-route-origin {
      background: rgba(30, 94, 58, 0.08);
      border: 1px dashed rgba(30, 94, 58, 0.3);
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
      color: #1e5e3a;
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

    .drawer-courier-routes-bar {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 8px 12px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    .drawer-courier-route-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 9px;
      background: #ffffff;
      border: 1px solid #e2e8f0;

      &.is-route-created {
        background: #f1f5f9;
        border-color: #cbd5e1;
      }

      .dcr-left {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        flex: 1;
      }

      .dcr-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .dcr-name {
        font-size: 0.78rem;
        font-weight: 800;
        color: #0f172a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .dcr-count {
        font-size: 0.68rem;
        font-weight: 700;
        color: #64748b;
        background: #f1f5f9;
        padding: 2px 7px;
        border-radius: 999px;
        flex-shrink: 0;
      }
    }

    .btn-create-courier-route {
      background: #1e5e3a;
      color: #ffffff;
      border: 1px solid #1e5e3a;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 7px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;

      &:hover {
        background: #16482c;
        border-color: #16482c;
      }
    }

    .btn-edit-courier-route {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 7px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;

      &:hover {
        background: #f1f5f9;
        border-color: #94a3b8;
        color: #0f172a;
      }
    }

    .drawer-stop-item.is-route-locked,
    .stop-card.is-route-locked {
      background: #f1f5f9 !important;
      border-color: #cbd5e1 !important;
      color: #64748b !important;
      opacity: 0.78;
      cursor: not-allowed !important;

      .drawer-stop-client,
      .drawer-stop-amount,
      .drawer-stop-addr,
      .stop-client-name,
      .stop-address {
        color: #64748b !important;
      }

      .stop-drag-grip {
        color: #cbd5e1 !important;
        cursor: not-allowed !important;
      }

      .drawer-stop-courier-select:disabled,
      .drawer-stop-priority-btn:disabled,
      .drawer-stop-del-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed !important;
        background: #e2e8f0 !important;
        color: #64748b !important;
        border-color: #cbd5e1 !important;
      }
    }

    
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
      color: #164a2d;
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
        color: #1e5e3a;
        border-color: #d1e7d8;
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
          color: #164a2d !important;
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
      color: #164a2d;
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
      background: #1e5e3a;
      box-shadow: 0 0 6px #1e5e3a;
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
      background: linear-gradient(135deg, #164a2d 0%, #1e5e3a 100%);
      color: #ffffff;
      border: 1px solid #1e5e3a;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 0.78rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(30, 94, 58, 0.35);
      transition: all 0.2s ease;

      &:hover {
        background: linear-gradient(135deg, #1e5e3a 0%, #164a2d 100%);
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(30, 94, 58, 0.45);
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
        border-color: #1e5e3a;
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
      color: #164a2d;
      text-transform: uppercase;
    }

    .cash-summary-amount {
      font-size: 1.6rem;
      font-weight: 900;
      color: #1e5e3a;
      line-height: 1.1;
    }

    .cash-summary-hint {
      font-size: 0.72rem;
      color: #164a2d;
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
      border: 2px solid #164a2d;
      border-radius: 10px;
      padding: 4px 10px;
      gap: 8px;
      margin-bottom: 12px;
    }

    .currency-prefix {
      font-size: 1.2rem;
      font-weight: 800;
      color: #164a2d;
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
        color: #164a2d;
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
  readonly stateService = inject(StateService);
  private readonly notification = inject(NotificationService);
  private readonly geocodingService = inject(GeocodingService);
  readonly realtimeSync = inject(RealtimeSyncService);

  private realtimeSub?: Subscription;
  private courierLocSub?: Subscription;

  constructor() {
    effect(() => {
      try {
        void this.stateService.orders();
        void this.stateService.users?.();
        void this.stateService.roles?.();
        void this.stateService.employees();
        untracked(() => {
          this.syncWithStateServiceOrders();
        });
      } catch {
        return;
      }
    });
  }

  @ViewChild('mapElement') mapElement!: ElementRef<HTMLDivElement>;

  readonly showDeliveriesDrawer = signal<boolean>(false);
  readonly expandedMobileCourierIds = signal<Record<string, boolean>>({});
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
      return '38vh';
    } else {
      if (preset === 'compact') return '140px';
      if (preset === 'expanded') return '72%';
      return '36%';
    }
  });

  private isDraggingDrawer = false;
  private dragStartY = 0;
  private dragStartHeight = 0;
  private dragMoved = false;

  /**
   * Starts pointer-based vertical resizing of the mobile deliveries drawer.
   */
  startDrawerResize(event: PointerEvent): void {
    try {
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

      const onPointerMove = (e: PointerEvent): void => {
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

      const onPointerUp = (): void => {
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
    } catch (error: unknown) {
      console.error('Error starting drawer resize:', error);
    }
  }

  /**
   * Cycles through the mobile drawer height presets.
   */
  toggleDrawerExpandPreset(): void {
    try {
      this.drawerHeightPx.set(null);
      const curr = this.drawerHeightPreset();
      if (curr === 'compact') {
        this.drawerHeightPreset.set('half');
      } else if (curr === 'half') {
        this.drawerHeightPreset.set('expanded');
      } else {
        this.drawerHeightPreset.set('half');
      }
    } catch (error: unknown) {
      console.error('Error toggling drawer expand preset:', error);
    }
  }

  /**
   * Opens the mobile address search bar and focuses its input.
   */
  openMobileAddressSearch(): void {
    try {
      this.isMobileAddressSearchOpen.set(true);
      setTimeout(() => {
        const input = document.querySelector('.address-search-input') as HTMLInputElement | null;
        input?.focus();
      }, 60);
    } catch (error: unknown) {
      console.error('Error opening mobile address search:', error);
    }
  }

  /**
   * Closes the mobile address search bar.
   */
  closeMobileAddressSearch(): void {
    try {
      this.isMobileAddressSearchOpen.set(false);
    } catch (error: unknown) {
      console.error('Error closing mobile address search:', error);
    }
  }

  /**
   * Toggles the mobile address search bar visibility.
   */
  toggleMobileAddressSearch(): void {
    try {
      const next = !this.isMobileAddressSearchOpen();
      this.isMobileAddressSearchOpen.set(next);
      if (next) {
        setTimeout(() => {
          const input = document.querySelector('.address-search-input') as HTMLInputElement | null;
          input?.focus();
        }, 60);
      }
    } catch (error: unknown) {
      console.error('Error toggling mobile address search:', error);
    }
  }

  /**
   * Toggles expansion of a mobile courier card.
   */
  toggleMobileCourierCard(courierId: string, event?: Event): void {
    try {
      if (event) {
        event.stopPropagation();
      }
      this.expandedMobileCourierIds.update((prev: Record<string, boolean>) => ({
        ...prev,
        [courierId]: !prev[courierId]
      }));
    } catch (error: unknown) {
      console.error('Error toggling mobile courier card:', error);
    }
  }

  /**
   * Returns whether a mobile courier card is expanded.
   */
  isMobileCourierCardExpanded(courierId: string): boolean {
    try {
      return !!this.expandedMobileCourierIds()[courierId];
    } catch (error: unknown) {
      console.error('Error checking mobile courier card expansion:', error);
      return false;
    }
  }

  readonly showDrawerQuickAdd = signal<boolean>(false);
  readonly drawerCourierFilter = signal<string>('all');
  readonly drawerSearchQuery = signal<string>('');
  readonly drawerNewClient = signal<string>('');
  readonly drawerNewAddress = signal<string>('');
  readonly drawerNewCourierId = signal<string>('');
  readonly drawerNewAmount = signal<number>(0);

  readonly activeUnbilledAlert = signal<{
    stopId: number;
    orderNumber: string;
    clientName: string;
    targetCourierId: string;
  } | null>(null);
  private unbilledAlertTimeout?: ReturnType<typeof setTimeout>;

  readonly showReceiveModal = signal<boolean>(false);
  readonly receivingCourier = signal<Courier | null>(null);
  readonly physicalCashReceived = signal<number>(0);
  readonly receiveNotes = signal<string>('');
  readonly showReceiptPrintView = signal<boolean>(false);
  readonly stopPaymentOverrides = signal<Record<number, 'EFECTIVO' | 'NEQUI' | 'BANCOLOMBIA' | 'CREDITO'>>({});
  readonly stopDeliveredOverrides = signal<Record<number, boolean>>({});

  /**
   * Checks whether a courier has completed all assigned stops and is ready for cash settlement.
   */
  isCourierReadyToReceive(c: Courier): boolean {
    try {
      if (c.orderIds.length === 0) return false;
      return this.getCourierCompletedStops(c) === c.orderIds.length || c.routeStatus === 'completada';
    } catch (error: unknown) {
      console.error('Error checking if courier is ready to receive:', error);
      return false;
    }
  }

  readonly receivingCourierStops = computed<DeliveryWaypoint[]>(() => {
    try {
      const courier = this.receivingCourier();
      if (!courier) return [];
      const stopMap = new Map(this.deliveryStops().map((s: DeliveryWaypoint) => [s.id, s]));
      return courier.orderIds
        .map((id: number) => stopMap.get(id))
        .filter((s): s is DeliveryWaypoint => !!s);
    } catch (error: unknown) {
      console.error('Error computing receiving courier stops:', error);
      return [];
    }
  });

  /**
   * Returns the effective delivery state of a stop considering settlement modal overrides.
   */
  getEffectiveStopDelivered(stop: DeliveryWaypoint): boolean {
    try {
      const overrides = this.stopDeliveredOverrides();
      if (stop.id in overrides) {
        return overrides[stop.id];
      }
      return stop.isDelivered;
    } catch (error: unknown) {
      console.error('Error getting effective stop delivered state:', error);
      return stop.isDelivered;
    }
  }

  /**
   * Toggles the delivered override state for a stop inside the settlement modal.
   */
  toggleStopDelivered(stopId: number): void {
    try {
      const stop = this.deliveryStops().find((s: DeliveryWaypoint) => s.id === stopId);
      if (!stop) return;
      const current = this.getEffectiveStopDelivered(stop);
      this.stopDeliveredOverrides.update((map: Record<number, boolean>) => ({
        ...map,
        [stopId]: !current
      }));
    } catch (error: unknown) {
      console.error('Error toggling stop delivered:', error);
    }
  }

  /**
   * Returns the effective payment method of a stop considering settlement modal overrides.
   */
  getEffectiveStopPaymentMethod(stop: DeliveryWaypoint): 'EFECTIVO' | 'NEQUI' | 'BANCOLOMBIA' | 'CREDITO' {
    try {
      const overrides = this.stopPaymentOverrides();
      if (stop.id in overrides) {
        return overrides[stop.id];
      }
      return stop.paymentMethod || 'EFECTIVO';
    } catch (error: unknown) {
      console.error('Error getting effective stop payment method:', error);
      return 'EFECTIVO';
    }
  }

  /**
   * Sets the payment method override for a stop inside the settlement modal.
   */
  setStopPaymentMethod(stopId: number, method: 'EFECTIVO' | 'NEQUI' | 'BANCOLOMBIA' | 'CREDITO'): void {
    try {
      this.stopPaymentOverrides.update((map: Record<number, 'EFECTIVO' | 'NEQUI' | 'BANCOLOMBIA' | 'CREDITO'>) => ({
        ...map,
        [stopId]: method
      }));
    } catch (error: unknown) {
      console.error('Error setting stop payment method:', error);
    }
  }

  readonly receivingExpectedCash = computed<number>(() => {
    try {
      const stops = this.receivingCourierStops();
      return stops
        .filter((s: DeliveryWaypoint) => this.getEffectiveStopDelivered(s))
        .filter((s: DeliveryWaypoint) => this.getEffectiveStopPaymentMethod(s) === 'EFECTIVO')
        .reduce((sum: number, s: DeliveryWaypoint) => sum + s.totalAmount, 0);
    } catch (error: unknown) {
      console.error('Error computing receiving expected cash:', error);
      return 0;
    }
  });

  readonly receivingExpectedDigital = computed<number>(() => {
    try {
      const stops = this.receivingCourierStops();
      return stops
        .filter((s: DeliveryWaypoint) => this.getEffectiveStopDelivered(s))
        .filter((s: DeliveryWaypoint) => {
          const m = this.getEffectiveStopPaymentMethod(s);
          return m === 'NEQUI' || m === 'BANCOLOMBIA';
        })
        .reduce((sum: number, s: DeliveryWaypoint) => sum + s.totalAmount, 0);
    } catch (error: unknown) {
      console.error('Error computing receiving expected digital:', error);
      return 0;
    }
  });

  readonly receivingExpectedCredit = computed<number>(() => {
    try {
      const stops = this.receivingCourierStops();
      return stops
        .filter((s: DeliveryWaypoint) => this.getEffectiveStopDelivered(s))
        .filter((s: DeliveryWaypoint) => this.getEffectiveStopPaymentMethod(s) === 'CREDITO')
        .reduce((sum: number, s: DeliveryWaypoint) => sum + s.totalAmount, 0);
    } catch (error: unknown) {
      console.error('Error computing receiving expected credit:', error);
      return 0;
    }
  });

  readonly receivingTotalCollected = computed<number>(() => {
    try {
      return this.receivingExpectedCash() + this.receivingExpectedDigital() + this.receivingExpectedCredit();
    } catch (error: unknown) {
      console.error('Error computing receiving total collected:', error);
      return 0;
    }
  });

  readonly cashDifference = computed<number>(() => {
    try {
      return this.physicalCashReceived() - this.receivingExpectedCash();
    } catch (error: unknown) {
      console.error('Error computing cash difference:', error);
      return 0;
    }
  });

  /**
   * Returns the count of delivered stops for the courier currently being received.
   */
  getReceivedDeliveredCount(): number {
    try {
      return this.receivingCourierStops().filter((s: DeliveryWaypoint) => this.getEffectiveStopDelivered(s)).length;
    } catch (error: unknown) {
      console.error('Error getting received delivered count:', error);
      return 0;
    }
  }

  /**
   * Returns a formatted date string for the courier cash settlement receipt.
   */
  getReceiptFormattedDate(): string {
    try {
      return new Date().toLocaleString('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch (error: unknown) {
      console.error('Error formatting receipt date:', error);
      return '';
    }
  }

  /**
   * Toggles the thermal receipt preview in the courier settlement modal.
   */
  toggleReceiptPrintView(): void {
    try {
      this.showReceiptPrintView.update((v: boolean) => !v);
    } catch (error: unknown) {
      console.error('Error toggling receipt print view:', error);
    }
  }

  /**
   * Opens the cash settlement modal for the specified courier.
   */
  openReceiveCourierModal(courier: Courier): void {
    try {
      this.receivingCourier.set(courier);
      this.stopPaymentOverrides.set({});
      this.stopDeliveredOverrides.set({});
      this.receiveNotes.set('');
      this.showReceiptPrintView.set(false);

      const stopMap = new Map(this.deliveryStops().map((s: DeliveryWaypoint) => [s.id, s]));
      const stops = courier.orderIds.map((id: number) => stopMap.get(id)).filter((s): s is DeliveryWaypoint => !!s);
      const expectedCash = stops.reduce((sum: number, s: DeliveryWaypoint) => sum + s.totalAmount, 0);
      this.physicalCashReceived.set(expectedCash);

      this.showReceiveModal.set(true);
    } catch (error: unknown) {
      console.error('Error opening receive courier modal:', error);
    }
  }

  /**
   * Closes the courier cash settlement modal.
   */
  closeReceiveCourierModal(): void {
    try {
      this.showReceiveModal.set(false);
      this.receivingCourier.set(null);
    } catch (error: unknown) {
      console.error('Error closing receive courier modal:', error);
    }
  }

  /**
   * Confirms the courier cash settlement, updates order statuses, and releases the courier.
   */
  confirmSettlementAndReceive(): void {
    try {
      const courier = this.receivingCourier();
      if (!courier) return;

      const stops = this.receivingCourierStops();
      const deliveredCount = stops.filter((s: DeliveryWaypoint) => this.getEffectiveStopDelivered(s)).length;
      const physicalCash = this.physicalCashReceived();
      const diff = this.cashDifference();

      stops.forEach((s: DeliveryWaypoint) => {
        const isDelivered = this.getEffectiveStopDelivered(s);
        if (isDelivered) {
          this.stateService.updateOrderStatus(s.id, 'DELIVERED');
        }
      });

      const stopIds = new Set(courier.orderIds);
      this.deliveryStops.update((all: DeliveryWaypoint[]) => all.map((s: DeliveryWaypoint) => {
        if (stopIds.has(s.id)) {
          return {
            ...s,
            isDelivered: this.getEffectiveStopDelivered(s),
            paymentMethod: this.getEffectiveStopPaymentMethod(s)
          };
        }
        return s;
      }));

      this.couriers.update((list: Courier[]) => list.map((c: Courier) => {
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
    } catch (error: unknown) {
      console.error('Error confirming settlement and receiving courier:', error);
    }
  }

  /**
   * Marks all stops assigned to a courier as delivered.
   */
  markAllCourierStopsDelivered(courierId: string): void {
    try {
      const courier = this.couriers().find((c: Courier) => c.id === courierId);
      if (!courier) return;

      this.deliveryStops.update((all: DeliveryWaypoint[]) => all.map((s: DeliveryWaypoint) => {
        if (courier.orderIds.includes(s.id)) {
          return { ...s, isDelivered: true };
        }
        return s;
      }));

      this.couriers.update((list: Courier[]) => list.map((c: Courier) => {
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
    } catch (error: unknown) {
      console.error('Error marking all courier stops delivered:', error);
    }
  }

  /**
   * Marks a specific stop as delivered by its order number.
   */
  markOrderDeliveredByOrderNumber(orderNumber: string): void {
    try {
      this.deliveryStops.update((stops: DeliveryWaypoint[]) => stops.map((s: DeliveryWaypoint) => {
        if (s.orderNumber === orderNumber) {
          return { ...s, isDelivered: true };
        }
        return s;
      }));
      this.renderStopMarkers();
    } catch (error: unknown) {
      console.error('Error marking order delivered by order number:', error);
    }
  }

  /**
   * Centers the map on a delivery stop matching the provided order number.
   */
  locateOrderOnMap(orderNumber: string): void {
    try {
      const stop = this.deliveryStops().find((s: DeliveryWaypoint) => s.orderNumber === orderNumber);
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
    } catch (error: unknown) {
      console.error('Error locating order on map:', error);
    }
  }

  /**
   * Assigns an order to a courier by order number and updates the map routes.
   */
  assignOrderToCourierByOrderNumber(orderNumber: string, courierId: string): void {
    try {
      const courier = this.couriers().find((c: Courier) => c.id === courierId);
      if (!courier) return;

      this.deliveryStops.update((stops: DeliveryWaypoint[]) => stops.map((s: DeliveryWaypoint) => {
        if (s.orderNumber === orderNumber) {
          return { ...s, assignedCourierId: courierId };
        }
        return s;
      }));

      const stop = this.deliveryStops().find((s: DeliveryWaypoint) => s.orderNumber === orderNumber);
      if (stop) {
        this.couriers.update((list: Courier[]) => list.map((c: Courier) => {
          if (c.id === courierId && !c.orderIds.includes(stop.id)) {
            return { ...c, orderIds: [...c.orderIds, stop.id] };
          }
          if (c.id !== courierId && c.orderIds.includes(stop.id)) {
            return { ...c, orderIds: c.orderIds.filter((id: number) => id !== stop.id) };
          }
          return c;
        }));
      }

      this.renderStopMarkers();
      this.buildAndRenderRealRoadRoutes();
    } catch (error: unknown) {
      console.error('Error assigning order to courier by order number:', error);
    }
  }

  readonly zoneTargetPoints = signal<4 | 6>(4);
  readonly zonePolygonPoints = signal<[number, number][]>([]);
  readonly showZoneAssignCard = signal<boolean>(false);
  private zoneVertexMarkers: L.Marker[] = [];
  private zonePolygonLayer?: L.Polygon | L.Polyline;

  readonly selectedMapStyleId = signal<string>(
    (() => {
      try {
        const stored = localStorage.getItem('despulpadora_map_style_v3');
        if (!stored || !MAP_STYLES.some(s => s.id === stored)) return 'arcgis-white';
        return stored;
      } catch {
        return 'arcgis-white';
      }
    })()
  );
  readonly mapStyles = MAP_STYLES;
  private currentTileLayer?: L.TileLayer;
  private currentRefLayer?: L.TileLayer;

  private map?: L.Map;
  private courierMarkers: Map<string, L.Marker> = new Map();
  private stopMarkers: Map<number, L.Marker> = new Map();
  private routeCasingPolylines: Map<string, L.Polyline> = new Map();
  private routePolylines: Map<string, L.Polyline> = new Map();
  private tempPointMarker?: L.Marker;

  readonly searchAddressQuery = signal<string>('');
  readonly isSearchingAddress = signal<boolean>(false);
  readonly searchResults = signal<AddressSearchResult[]>([]);
  readonly showSearchResults = signal<boolean>(false);
  private searchDebounceTimer?: ReturnType<typeof setTimeout>;
  private searchResultMarker?: L.Marker;

  private roadSegmentCache: Map<string, [number, number][]> = new Map();
  private courierFullRoadPaths: Map<string, [number, number][]> = new Map();

  readonly mapViewMode = signal<'locked' | 'live' | 'stops'>('locked');
  readonly isMapFullscreen = signal<boolean>(false);

  readonly isSimulating = signal<boolean>(false);
  readonly simulationSpeed = signal<number>(1);
  private animFrameId?: number;
  private lastTimestamp = 0;

  readonly isMarkingPointMode = signal<boolean>(false);
  readonly showPointOrderModal = signal<boolean>(false);
  readonly newOrderLat = signal<number>(4.670);
  readonly newOrderLng = signal<number>(-74.085);
  readonly newOrderZone = signal<string>('Bogotá Norte / Chicó');
  newOrderClient = '';
  newOrderAddress = '';
  newOrderPhone = '';
  newOrderAmount = 0;
  newOrderCourierId = '';
  selectedPulpItem = signal<string>('');

  /**
   * Returns quick pulp preset options derived from the configured fruit catalog.
   */
  get quickPulpOptions(): Array<{ name: string; price: number; kg: number }> {
    try {
      return this.stateService.fruits().map((f: FruitConfig) => ({
        name: `${f.name} 1000g`,
        price: f.prices.g1000 ?? 0,
        kg: 1.0
      }));
    } catch (error: unknown) {
      console.error('Error computing quickPulpOptions:', error);
      return [];
    }
  }

  readonly showPlannerModal = signal<boolean>(false);
  readonly activePlannerCourierId = signal<string>('');
  readonly selectedCourierId = signal<string>('');

  readonly couriers = signal<Courier[]>([]);
  readonly deliveryStops = signal<DeliveryWaypoint[]>(INITIAL_BOGOTA_STOPS);

  /**
   * Alias getter returning the current delivery stops array.
   */
  get stops(): DeliveryWaypoint[] {
    try {
      return this.deliveryStops();
    } catch (error: unknown) {
      console.error('Error reading stops:', error);
      return [];
    }
  }

  readonly assignedCouriers = computed<Courier[]>(() => {
    try {
      const stops = this.deliveryStops();
      const validStopIds = new Set(stops.map((s: DeliveryWaypoint) => s.id));
      return this.couriers().filter(
        (c: Courier) => c.orderIds.some((id: number) => validStopIds.has(id)) || stops.some((s: DeliveryWaypoint) => s.assignedCourierId === c.id)
      );
    } catch (error: unknown) {
      console.error('Error computing assigned couriers:', error);
      return [];
    }
  });

  readonly deliveredCount = computed<number>(() => {
    try {
      return this.deliveryStops().filter((s: DeliveryWaypoint) => s.isDelivered).length;
    } catch (error: unknown) {
      console.error('Error computing delivered count:', error);
      return 0;
    }
  });

  readonly totalTransitCash = computed<number>(() => {
    try {
      return this.deliveryStops()
        .filter((s: DeliveryWaypoint) => !s.isDelivered)
        .reduce((sum: number, s: DeliveryWaypoint) => sum + s.totalAmount, 0);
    } catch (error: unknown) {
      console.error('Error computing total transit cash:', error);
      return 0;
    }
  });

  readonly activeSpeedAvg = computed<number>(() => {
    try {
      const list = this.couriers();
      if (list.length === 0) return 0;
      const sum = list.reduce((acc: number, c: Courier) => acc + c.currentSpeedKmH, 0);
      return Math.round(sum / list.length);
    } catch (error: unknown) {
      console.error('Error computing active speed avg:', error);
      return 0;
    }
  });

  readonly activePlannerStops = computed<DeliveryWaypoint[]>(() => {
    try {
      const courier = this.couriers().find((c: Courier) => c.id === this.activePlannerCourierId());
      if (!courier) return [];
      const stopMap = new Map(this.deliveryStops().map((s: DeliveryWaypoint) => [s.id, s]));
      return courier.orderIds
        .map((id: number) => stopMap.get(id))
        .filter((s): s is DeliveryWaypoint => !!s);
    } catch (error: unknown) {
      console.error('Error computing active planner stops:', error);
      return [];
    }
  });

  readonly computedPlannerDistanceKm = computed<string>(() => {
    try {
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
      return (totalKm * 1.32).toFixed(1);
    } catch (error: unknown) {
      console.error('Error computing planner distance km:', error);
      return '0.0';
    }
  });

  readonly computedPlannerDurationMins = computed<number>(() => {
    try {
      const km = parseFloat(this.computedPlannerDistanceKm());
      const stopsCount = this.activePlannerStops().length;
      const transitMins = Math.round((km / 28) * 60);
      const serviceMins = stopsCount * 8;
      return transitMins + serviceMins;
    } catch (error: unknown) {
      console.error('Error computing planner duration mins:', error);
      return 0;
    }
  });

  readonly computedPlannerWeightKg = computed<string>(() => {
    try {
      return this.activePlannerStops().reduce((sum: number, s: DeliveryWaypoint) => sum + s.weightKg, 0).toFixed(1);
    } catch (error: unknown) {
      console.error('Error computing planner weight kg:', error);
      return '0.0';
    }
  });

  readonly computedPlannerTotalCash = computed<number>(() => {
    try {
      return this.activePlannerStops().reduce((sum: number, s: DeliveryWaypoint) => sum + s.totalAmount, 0);
    } catch (error: unknown) {
      console.error('Error computing planner total cash:', error);
      return 0;
    }
  });

  /**
   * Initializes component state by syncing couriers, orders, and real-time SignalR/WebSocket streams.
   */
  ngOnInit(): void {
    try {
      this.realtimeSync.connect();
      this.syncWithStateServiceOrders();

      this.realtimeSub = this.realtimeSync.domainEvents$.subscribe(evt => {
        try {
          if (
            evt.domain === 'orders' ||
            evt.domain === 'routes' ||
            evt.domain === 'users' ||
            evt.domain === 'all'
          ) {
            this.syncWithStateServiceOrders();
            this.renderStopMarkers();
            this.buildAndRenderRealRoadRoutes();
            this.renderCourierMarkers();
          }
        } catch {
          return;
        }
      });

      this.courierLocSub = this.realtimeSync.courierLocations$.subscribe(loc => {
        try {
          this.couriers.update((list: Courier[]) =>
            list.map((c: Courier) => {
              const matchesId =
                c.id === loc.courierId ||
                c.id === `u${loc.courierId}` ||
                c.id === `c${loc.courierId}`;
              const matchesName =
                Boolean(loc.courierName) &&
                c.name.toLowerCase().includes((loc.courierName || '').toLowerCase());
              if (matchesId || matchesName) {
                return {
                  ...c,
                  lat: loc.latitude,
                  lng: loc.longitude,
                  currentSpeedKmH:
                    loc.speedKmh !== undefined ? Math.round(loc.speedKmh) : c.currentSpeedKmH,
                  batteryPct:
                    loc.batteryLevel !== undefined ? Math.round(loc.batteryLevel) : c.batteryPct
                };
              }
              return c;
            })
          );
          this.renderCourierMarkers();
        } catch {
          return;
        }
      });
    } catch (error: unknown) {
      console.error('Error initializing DeliveryMapComponent:', error);
    }
  }

  /**
   * Initializes the Leaflet map instance and simulation loop after view creation.
   */
  ngAfterViewInit(): void {
    try {
      this.initLeafletMap();
      this.startSimulationLoop();
    } catch (error: unknown) {
      console.error('Error in ngAfterViewInit:', error);
    }
  }

  /**
   * Cleans up timers, real-time subscriptions, animation frames, and the Leaflet map instance on destroy.
   */
  ngOnDestroy(): void {
    try {
      document.body.style.overflow = '';
      if (this.realtimeSub) {
        this.realtimeSub.unsubscribe();
      }
      if (this.courierLocSub) {
        this.courierLocSub.unsubscribe();
      }
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
      }
      if (this.map) {
        this.map.remove();
        this.map = undefined;
      }
      this.dismissUnbilledAlert();
    } catch (error: unknown) {
      console.error('Error destroying DeliveryMapComponent:', error);
    }
  }

  /**
   * Initializes the Leaflet map, tile layers, markers, and click listeners.
   */
  private initLeafletMap(): void {
    try {
      if (!this.mapElement) return;

      this.map = L.map(this.mapElement.nativeElement, {
        center: [4.6850, -74.0950],
        zoom: 12,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'topleft' }).addTo(this.map);

      this.applyTileLayer(this.selectedMapStyleId());
      this.addPlantaMarker();
      this.renderStopMarkers();
      this.buildAndRenderRealRoadRoutes();
      this.renderCourierMarkers();

      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.handleMapClick(e.latlng);
      });

      setTimeout(() => {
        try {
          this.map?.invalidateSize();
        } catch {
        }
      }, 250);
    } catch (error: unknown) {
      console.error('Error initializing Leaflet map:', error);
    }
  }

  /**
   * Selects and applies a map tile style by ID.
   */
  selectMapStyle(styleId: string): void {
    try {
      this.selectedMapStyleId.set(styleId);
      this.applyTileLayer(styleId);

      const style = MAP_STYLES.find((s: MapStyleOption) => s.id === styleId);
      if (style) {
        this.notification.success(
          `Capa ${style.shortName} Activa`,
          style.description
        );
      }
    } catch (error: unknown) {
      console.error('Error selecting map style:', error);
    }
  }

  /**
   * Applies the requested tile layer style to the active Leaflet map.
   */
  applyTileLayer(styleId: string): void {
    try {
      if (!this.map) return;

      const style = MAP_STYLES.find((s: MapStyleOption) => s.id === styleId) || MAP_STYLES[0];

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
        attribution: style.id.startsWith('arcgis') || style.id.startsWith('esri')
          ? 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap'
          : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
      };

      this.currentTileLayer = L.tileLayer(style.url, options).addTo(this.map);

      const tilePane = this.map.getPane('tilePane');
      if (tilePane) {
        tilePane.style.filter = 'none';
        tilePane.style.setProperty('-webkit-filter', 'none');
      }
      this.map.getContainer().style.backgroundColor = style.id === 'osm-dark' ? '#0f172a' : '#f4f6f8';

      if (style.id === 'esri-gray') {
        this.currentRefLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19, maxNativeZoom: 16 }
        ).addTo(this.map);
      } else if (style.id === 'osm-dark') {
        this.currentRefLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19, maxNativeZoom: 16 }
        ).addTo(this.map);
      }

      this.updatePolylineStylesForActiveMap();

      try {
        localStorage.setItem('despulpadora_map_style_v3', style.id);
      } catch {
      }
    } catch (error: unknown) {
      console.error('Error applying tile layer:', error);
    }
  }

  /**
   * Updates route polyline casing colors based on the active map theme.
   */
  private updatePolylineStylesForActiveMap(): void {
    try {
      if (!this.map) return;
      const isDark = this.selectedMapStyleId() === 'osm-dark';
      const casingColor = isDark ? '#020617' : '#ffffff';
      const casingOpacity = isDark ? 0.9 : 0.85;

      this.routeCasingPolylines.forEach((casing: L.Polyline) => {
        casing.setStyle({
          color: casingColor,
          opacity: casingOpacity
        });
      });
    } catch (error: unknown) {
      console.error('Error updating polyline styles:', error);
    }
  }

  /**
   * Renders the central processing plant marker on the map.
   */
  private addPlantaMarker(): void {
    try {
      if (!this.map) return;

      const plantaHtml = `
        <div style="
          background: #1e5e3a;
          color: #fff;
          border: 2px solid #ffffff;
          box-shadow: 0 0 16px rgba(30, 94, 58, 0.7);
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
          <strong style="color: #1e5e3a; font-size: 0.95rem;">INVENTARIO MATRIZ CUNDINAMARCA</strong>
          <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #475569;">
            Parque Industrial Calle 80 / Cota<br/>
            Hub Central de Almacenamiento & Despacho de Pulpa Congelada.
          </p>
        </div>
      `);
    } catch (error: unknown) {
      console.error('Error adding plant marker:', error);
    }
  }

  /**
   * Renders all delivery waypoint markers on the Leaflet map.
   */
  private renderStopMarkers(): void {
    try {
      if (!this.map) return;

      this.stopMarkers.forEach((m: L.Marker) => m.remove());
      this.stopMarkers.clear();

      const stops = this.deliveryStops();
      const coordCountMap = new Map<string, number>();

      stops.forEach((stop: DeliveryWaypoint) => {
        const courier = stop.assignedCourierId ? this.couriers().find((c: Courier) => c.id === stop.assignedCourierId) : undefined;
        const isUnassigned = !courier && !stop.isDelivered;

        if (this.mapViewMode() === 'live' && (!courier || !stop.assignedCourierId)) {
          return;
        }

        const bgColor = stop.isDelivered ? '#1e5e3a' : (courier ? courier.color : '#ffffff');
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
          .map((c: Courier) => {
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
            <div style="font-size: 0.85rem; font-weight: 800; color: #1e5e3a; margin-top: 6px;">Total: ${this.formatCOP(stop.totalAmount)}</div>
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
          this.couriers().forEach((c: Courier) => {
            const assignBtn = document.getElementById(`btn-popup-assign-${stop.id}-${c.id}`);
            if (assignBtn) {
              assignBtn.onclick = (e: MouseEvent) => {
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
            unassignBtn.onclick = (e: MouseEvent) => {
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
            delBtn.onclick = (e: MouseEvent) => {
              e.stopPropagation();
              marker.closePopup();
              this.deleteDeliveryStop(stop.id);
            };
          }
        });

        this.stopMarkers.set(stop.id, marker);
      });
    } catch (error: unknown) {
      console.error('Error rendering stop markers:', error);
    }
  }

  /**
   * Decodes a precision-6 encoded polyline string into latitude/longitude coordinate pairs.
   */
  private decodePolyline6(encoded: string): [number, number][] {
    try {
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
    } catch (error: unknown) {
      console.error('Error decoding polyline:', error);
      return [];
    }
  }

  /**
   * Computes a street-level route segment between two coordinates using public routing APIs or urban corridor fallback.
   */
  private async getRoadSegment(lat1: number, lng1: number, lat2: number, lng2: number): Promise<[number, number][]> {
    try {
      const key = `${lat1.toFixed(4)},${lng1.toFixed(4)}_${lat2.toFixed(4)},${lng2.toFixed(4)}`;
      if (this.roadSegmentCache.has(key)) {
        return this.roadSegmentCache.get(key)!;
      }

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
          const valhallaData = (await valhallaRes.json()) as { trip?: { legs?: Array<{ shape?: string }> } };
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
      }

      const osrmEndpoints = [
        `https://router.project-osrm.org/route/v1/driving/${lng1.toFixed(5)},${lat1.toFixed(5)};${lng2.toFixed(5)},${lat2.toFixed(5)}?overview=full&geometries=geojson`,
        `https://routing.openstreetmap.de/routed-car/route/v1/driving/${lng1.toFixed(5)},${lat1.toFixed(5)};${lng2.toFixed(5)},${lat2.toFixed(5)}?overview=full&geometries=geojson`
      ];

      for (const url of osrmEndpoints) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (res.ok) {
            const data = (await res.json()) as { routes?: Array<{ geometry?: { coordinates?: [number, number][] } }> };
            const coordinates = data.routes?.[0]?.geometry?.coordinates;
            if (coordinates && coordinates.length > 1) {
              const roadCoords: [number, number][] = coordinates.map(
                (c: [number, number]) => [c[1], c[0]]
              );
              this.roadSegmentCache.set(key, roadCoords);
              return roadCoords;
            }
          }
        } catch {
        }
      }

      return this.generateUrbanCorridorRoute(lat1, lng1, lat2, lng2);
    } catch (error: unknown) {
      console.error('Error getting road segment:', error);
      return [[lat1, lng1], [lat2, lng2]];
    }
  }

  /**
   * Generates interpolated arterial corridor coordinates when offline or when routing APIs time out.
   */
  private generateUrbanCorridorRoute(lat1: number, lng1: number, lat2: number, lng2: number): [number, number][] {
    try {
      const points: [number, number][] = [[lat1, lng1]];
      const midLat = (lat1 + lat2) / 2;
      const midLng = (lng1 + lng2) / 2;

      if (lng1 < -74.12 || lng2 < -74.12) {
        points.push([4.7220, -74.1350]);
        points.push([4.7150, -74.1080]);
      }

      if (lat1 > 4.80 || lat2 > 4.80) {
        points.push([4.8150, -74.0620]);
        points.push([4.7600, -74.0480]);
      }

      if (Math.abs(lat1 - lat2) > 0.03 && Math.abs(lng1 - lng2) > 0.03) {
        points.push([midLat, lng1]);
        points.push([midLat, midLng]);
        points.push([lat2, midLng]);
      }

      points.push([lat2, lng2]);

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
    } catch (error: unknown) {
      console.error('Error generating urban corridor route:', error);
      return [[lat1, lng1], [lat2, lng2]];
    }
  }

  /**
   * Builds and renders road polylines on the map for all active couriers.
   */
  async buildAndRenderRealRoadRoutes(): Promise<void> {
    try {
      const stopMap = new Map(this.deliveryStops().map((s: DeliveryWaypoint) => [s.id, s]));

      for (const courier of this.couriers()) {
        const stops: [number, number][] = [[PLANTA_MATRIZ_LAT, PLANTA_MATRIZ_LNG]];

        courier.orderIds.forEach((id: number) => {
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
    } catch (error: unknown) {
      console.error('Error building and rendering road routes:', error);
    }
  }

  /**
   * Renders courier vehicle markers on the Leaflet map.
   */
  private renderCourierMarkers(): void {
    try {
      if (!this.map) return;

      this.couriers().forEach((courier: Courier) => {
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
    } catch (error: unknown) {
      console.error('Error rendering courier markers:', error);
    }
  }

  /**
   * Toggles interactive point-marking mode on the map.
   */
  toggleMarkingPointMode(): void {
    try {
      if (this.mapViewMode() === 'locked') {
        this.enterAllDeliveriesMode();
      }
      this.isMarkingPointMode.update((val: boolean) => !val);
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
    } catch (error: unknown) {
      console.error('Error toggling marking point mode:', error);
    }
  }

  readonly zoneCapturedStops = computed<DeliveryWaypoint[]>(() => {
    try {
      const pts = this.zonePolygonPoints();
      const target = this.zoneTargetPoints();
      if (pts.length < target) return [];
      return this.deliveryStops().filter((stop: DeliveryWaypoint) => this.isPointInPolygon(stop.lat, stop.lng, pts));
    } catch (error: unknown) {
      console.error('Error computing zone captured stops:', error);
      return [];
    }
  });

  /**
   * Sets the number of vertices (4 or 6) for the polygon zone selection tool.
   */
  setZoneTargetPoints(pts: 4 | 6): void {
    try {
      if (this.zoneTargetPoints() !== pts) {
        this.zoneTargetPoints.set(pts);
        this.clearZonePolygon();
      }
    } catch (error: unknown) {
      console.error('Error setting zone target points:', error);
    }
  }

  /**
   * Clears the current zone polygon selection and removes its map overlays.
   */
  clearZonePolygon(): void {
    try {
      this.zonePolygonPoints.set([]);
      this.showZoneAssignCard.set(false);
      this.zoneVertexMarkers.forEach((m: L.Marker) => m.remove());
      this.zoneVertexMarkers = [];
      if (this.zonePolygonLayer) {
        this.zonePolygonLayer.remove();
        this.zonePolygonLayer = undefined;
      }
    } catch (error: unknown) {
      console.error('Error clearing zone polygon:', error);
    }
  }

  /**
   * Handles map click events to add polygon zone vertices when in stops view mode.
   */
  private handleMapClick(latlng: L.LatLng): void {
    try {
      if (this.mapViewMode() !== 'stops') {
        return;
      }

      const target = this.zoneTargetPoints();
      let currentPts = [...this.zonePolygonPoints()];

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
    } catch (error: unknown) {
      console.error('Error handling map click:', error);
    }
  }

  /**
   * Renders the zone polygon vertices and shape on the Leaflet map.
   */
  private renderZonePolygonOnMap(): void {
    try {
      if (!this.map) return;

      this.zoneVertexMarkers.forEach((m: L.Marker) => m.remove());
      this.zoneVertexMarkers = [];
      if (this.zonePolygonLayer) {
        this.zonePolygonLayer.remove();
        this.zonePolygonLayer = undefined;
      }

      const pts = this.zonePolygonPoints();
      const target = this.zoneTargetPoints();

      pts.forEach((pt: [number, number], idx: number) => {
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
    } catch (error: unknown) {
      console.error('Error rendering zone polygon on map:', error);
    }
  }

  /**
   * Assigns all delivery stops captured inside the drawn zone polygon to a courier.
   */
  assignZoneStopsToCourier(courierId: string): void {
    try {
      const captured = this.zoneCapturedStops();
      if (captured.length === 0) return;

      const capturedIds = new Set(captured.map((s: DeliveryWaypoint) => s.id));

      this.deliveryStops.update((stops: DeliveryWaypoint[]) =>
        stops.map((s: DeliveryWaypoint) => (capturedIds.has(s.id) ? { ...s, assignedCourierId: courierId } : s))
      );

      this.couriers.update((list: Courier[]) =>
        list.map((c: Courier) => {
          const withoutCaptured = c.orderIds.filter((id: number) => !capturedIds.has(id));
          if (c.id === courierId) {
            return { ...c, orderIds: [...withoutCaptured, ...Array.from(capturedIds)] };
          }
          return { ...c, orderIds: withoutCaptured };
        })
      );

      this.renderStopMarkers();
      this.buildAndRenderRealRoadRoutes();

      const courier = this.couriers().find((c: Courier) => c.id === courierId);
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
    } catch (error: unknown) {
      console.error('Error assigning zone stops to courier:', error);
    }
  }

  /**
   * Ray-casting check determining whether a coordinate lies inside a polygon.
   */
  private isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
    try {
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
    } catch (error: unknown) {
      console.error('Error checking point in polygon:', error);
      return false;
    }
  }

  /**
   * Geocodes the address entered in the point-creation modal and updates coordinates.
   */
  async geocodeModalAddress(): Promise<void> {
    try {
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
    } catch (error: unknown) {
      console.error('Error geocoding modal address:', error);
    }
  }

  /**
   * Detects the zone name for the provided latitude and longitude.
   */
  private detectBogotaZone(lat: number, lng: number): string {
    try {
      return this.geocodingService.detectBogotaZone(lat, lng);
    } catch (error: unknown) {
      console.error('Error detecting zone:', error);
      return '';
    }
  }

  /**
   * Handles changes in the address search input with debounced geocoding lookup.
   */
  onAddressQueryChange(query: string): void {
    try {
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
    } catch (error: unknown) {
      console.error('Error handling address query change:', error);
    }
  }

  /**
   * Shows existing address search suggestions when the search input receives focus.
   */
  onSearchFocus(): void {
    try {
      if (this.searchResults().length > 0) {
        this.showSearchResults.set(true);
      }
    } catch (error: unknown) {
      console.error('Error handling search focus:', error);
    }
  }

  /**
   * Closes the address search suggestions dropdown.
   */
  closeSearchResults(): void {
    try {
      this.showSearchResults.set(false);
    } catch (error: unknown) {
      console.error('Error closing search results:', error);
    }
  }

  /**
   * Clears the address search query, results, and temporary marker.
   */
  clearAddressSearch(): void {
    try {
      this.searchAddressQuery.set('');
      this.searchResults.set([]);
      this.showSearchResults.set(false);
      if (this.searchResultMarker) {
        this.searchResultMarker.remove();
        this.searchResultMarker = undefined;
      }
    } catch (error: unknown) {
      console.error('Error clearing address search:', error);
    }
  }

  /**
   * Selects the first search result or triggers a geocoding search when Enter is pressed.
   */
  onSearchEnter(): void {
    try {
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
    } catch (error: unknown) {
      console.error('Error handling search enter:', error);
    }
  }

  /**
   * Queries GeocodingService for address matches and updates the results signal.
   */
  async executeAddressSearch(query: string): Promise<void> {
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
    } catch (error: unknown) {
      console.error('Error searching address:', error);
    } finally {
      this.isSearchingAddress.set(false);
    }
  }

  /**
   * Flies the map to a selected address search result and opens a creation popup.
   */
  selectAddressResult(item: AddressSearchResult): void {
    try {
      this.showSearchResults.set(false);
      this.isMobileAddressSearchOpen.set(false);
      this.searchAddressQuery.set(item.name || item.label);

      if (!this.map) return;

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
              background: linear-gradient(135deg, #1e5e3a 0%, #164a2d 100%);
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
              box-shadow: 0 4px 12px rgba(30, 94, 58, 0.3);
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
    } catch (error: unknown) {
      console.error('Error selecting address result:', error);
    }
  }

  /**
   * Opens the point order creation modal pre-populated with a geocoded search result.
   */
  createOrderFromSearchResult(item: AddressSearchResult): void {
    try {
      this.newOrderLat.set(item.lat);
      this.newOrderLng.set(item.lng);
      const zone = item.zone || this.detectBogotaZone(item.lat, item.lng);
      this.newOrderZone.set(zone);
      this.newOrderAddress = item.label;
      this.newOrderClient = '';

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
    } catch (error: unknown) {
      console.error('Error creating order from search result:', error);
    }
  }

  /**
   * Selects a fruit pulp preset in the point-order modal and updates the order amount.
   */
  selectPulpPreset(preset: { name: string; price: number; kg: number }): void {
    try {
      this.selectedPulpItem.set(preset.name);
      this.newOrderAmount = preset.price * 10;
    } catch (error: unknown) {
      console.error('Error selecting pulp preset:', error);
    }
  }

  /**
   * Cancels the point order creation modal and removes the temporary marker.
   */
  cancelPointCreation(): void {
    try {
      this.showPointOrderModal.set(false);
      if (this.tempPointMarker) {
        this.tempPointMarker.remove();
        this.tempPointMarker = undefined;
      }
    } catch (error: unknown) {
      console.error('Error cancelling point creation:', error);
    }
  }

  /**
   * Saves the marked map point as a new order in StateService and adds a delivery stop.
   */
  savePointAsOrder(): void {
    try {
      const lat = this.newOrderLat();
      const lng = this.newOrderLng();
      const courierId = this.newOrderCourierId || '';
      const clientName = this.newOrderClient.trim();
      const address = this.newOrderAddress.trim() || `Sector ${this.newOrderZone()}`;
      const amount = Number(this.newOrderAmount) || 0;
      const fruitName = this.selectedPulpItem().split(' ')[0] || this.stateService.fruits()[0]?.name || '';

      const courierObj = courierId ? this.couriers().find((c: Courier) => c.id === courierId) : undefined;

      const newOrderDto = this.stateService.createOrder({
        clientName,
        clientPhone: this.newOrderPhone,
        clientAddress: address,
        courierName: courierObj?.name,
        notes: `Pedido georreferenciado en ${this.newOrderZone()}`,
        items: fruitName
          ? [
              {
                fruitName,
                grammage: 1000,
                quantity: 10,
                unitPrice: amount / 10
              }
            ]
          : []
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
        itemsSummary: this.selectedPulpItem() ? `10x ${this.selectedPulpItem()}` : '',
        isDelivered: false,
        assignedCourierId: courierId,
        orderRef: newOrderDto
      };

      this.deliveryStops.update((stops: DeliveryWaypoint[]) => [newStop, ...stops]);

      if (courierId) {
        this.couriers.update((list: Courier[]) => list.map((c: Courier) => {
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
    } catch (error: unknown) {
      console.error('Error saving point as order:', error);
    }
  }

  /**
   * Opens the interactive route planner modal.
   */
  openRoutePlanner(): void {
    try {
      this.showPlannerModal.set(true);
      setTimeout(() => this.map?.invalidateSize(), 150);
    } catch (error: unknown) {
      console.error('Error opening route planner:', error);
    }
  }

  /**
   * Opens the route planner modal for a specific courier.
   */
  openRoutePlannerFor(courierId: string): void {
    try {
      this.activePlannerCourierId.set(courierId);
      this.openRoutePlanner();
    } catch (error: unknown) {
      console.error('Error opening route planner for courier:', error);
    }
  }

  /**
   * Switches the active courier inside the route planner modal.
   */
  switchPlannerCourier(courierId: string): void {
    try {
      this.activePlannerCourierId.set(courierId);
    } catch (error: unknown) {
      console.error('Error switching planner courier:', error);
    }
  }

  /**
   * Returns the courier currently selected in the route planner modal.
   */
  getActiveCourier(): Courier | undefined {
    try {
      return this.couriers().find((c: Courier) => c.id === this.activePlannerCourierId());
    } catch (error: unknown) {
      console.error('Error getting active courier:', error);
      return undefined;
    }
  }

  /**
   * Moves a stop one position earlier in the active courier's route sequence.
   */
  moveStopUp(index: number): void {
    try {
      if (index <= 0) return;
      const courierId = this.activePlannerCourierId();

      this.couriers.update((list: Courier[]) => list.map((c: Courier) => {
        if (c.id === courierId) {
          const orderIds = [...c.orderIds];
          const temp = orderIds[index];
          orderIds[index] = orderIds[index - 1];
          orderIds[index - 1] = temp;
          return { ...c, orderIds };
        }
        return c;
      }));

      this.buildAndRenderRealRoadRoutes();
      this.renderStopMarkers();
    } catch (error: unknown) {
      console.error('Error moving stop up:', error);
    }
  }

  /**
   * Moves a stop one position later in the active courier's route sequence.
   */
  moveStopDown(index: number): void {
    try {
      const courierId = this.activePlannerCourierId();
      const courier = this.couriers().find((c: Courier) => c.id === courierId);
      if (!courier || index >= courier.orderIds.length - 1) return;

      this.couriers.update((list: Courier[]) => list.map((c: Courier) => {
        if (c.id === courierId) {
          const orderIds = [...c.orderIds];
          const temp = orderIds[index];
          orderIds[index] = orderIds[index + 1];
          orderIds[index + 1] = temp;
          return { ...c, orderIds };
        }
        return c;
      }));

      this.buildAndRenderRealRoadRoutes();
      this.renderStopMarkers();
    } catch (error: unknown) {
      console.error('Error moving stop down:', error);
    }
  }

  readonly draggedRouteStopId = signal<number | null>(null);
  readonly dragOverRouteStopId = signal<number | null>(null);
  readonly dragOverCourierPillId = signal<string | null>(null);
  readonly showConfirmCreateRouteModal = signal<boolean>(false);
  readonly pendingRouteCourierId = signal<string>('');

  /**
   * Resolves the courier currently pending route creation confirmation.
   */
  readonly pendingRouteCourier = computed<Courier | null>(() => {
    try {
      const id = this.pendingRouteCourierId();
      if (!id) return null;
      return this.couriers().find((c: Courier) => c.id === id) || null;
    } catch {
      return null;
    }
  });

  /**
   * Lists couriers with assigned stops to display in the drawer route action bar.
   */
  readonly drawerCouriersWithStops = computed<Courier[]>(() => {
    try {
      const filter = this.drawerCourierFilter();
      const assigned = this.assignedCouriers();
      if (filter !== 'all') {
        return assigned.filter((c: Courier) => c.id === filter);
      }
      return assigned;
    } catch {
      return [];
    }
  });

  /**
   * Returns true if the delivery stop belongs to a courier whose route is already created and locked.
   */
  isStopRouteLocked(stop: DeliveryWaypoint): boolean {
    try {
      if (!stop.assignedCourierId) return false;
      const courier = this.couriers().find((c: Courier) => c.id === stop.assignedCourierId);
      return courier?.isRouteCreated === true;
    } catch {
      return false;
    }
  }

  /**
   * Returns the total number of stops currently assigned to the specified courier.
   */
  getCourierAssignedStopsCount(courierId: string): number {
    try {
      const courier = this.couriers().find((c: Courier) => c.id === courierId);
      const stopsCount = this.deliveryStops().filter((s: DeliveryWaypoint) => s.assignedCourierId === courierId).length;
      return Math.max(courier?.orderIds.length || 0, stopsCount);
    } catch {
      return 0;
    }
  }

  /**
   * Opens the confirmation modal before creating and locking a courier's delivery route.
   */
  openConfirmCreateRouteModal(courierId: string): void {
    try {
      const courier = this.couriers().find((c: Courier) => c.id === courierId);
      if (!courier) return;
      const assignedStops = this.deliveryStops().filter(
        (s: DeliveryWaypoint) => s.assignedCourierId === courierId || courier.orderIds.includes(s.id)
      );
      if (assignedStops.length === 0) {
        this.notification.warning('Sin Entregas Asignadas', `Asigna al menos una entrega a ${courier.name} antes de crear la ruta.`);
        return;
      }
      const unbilledStop = assignedStops.find((s: DeliveryWaypoint) => !this.isStopBilled(s));
      if (unbilledStop) {
        this.showUnbilledOrderAlert(unbilledStop, courierId);
        return;
      }
      this.pendingRouteCourierId.set(courierId);
      this.showConfirmCreateRouteModal.set(true);
    } catch (error: unknown) {
      console.error('Error opening confirm create route modal:', error);
    }
  }

  /**
   * Cancels and closes the route creation confirmation modal.
   */
  cancelConfirmCreateRoute(): void {
    try {
      this.showConfirmCreateRouteModal.set(false);
      this.pendingRouteCourierId.set('');
    } catch {
      return;
    }
  }

  /**
   * Confirms route creation, locks the courier's delivery cards in light gray, and dispatches the route to the API/database.
   */
  confirmCreateCourierRoute(): void {
    try {
      const courierId = this.pendingRouteCourierId();
      const courier = this.couriers().find((c: Courier) => c.id === courierId);
      if (!courier) {
        this.cancelConfirmCreateRoute();
        return;
      }

      const stopMap = new Map(this.deliveryStops().map((s: DeliveryWaypoint) => [s.id, s]));
      const orderedIds = courier.orderIds.filter((id: number) => stopMap.has(id));
      const extraIds = this.deliveryStops()
        .filter((s: DeliveryWaypoint) => s.assignedCourierId === courierId && !orderedIds.includes(s.id))
        .map((s: DeliveryWaypoint) => s.id);
      const finalOrderIds = [...orderedIds, ...extraIds];

      this.couriers.update((list: Courier[]) =>
        list.map((c: Courier) =>
          c.id === courierId
            ? { ...c, orderIds: finalOrderIds, isRouteCreated: true, status: 'en_ruta', routeStatus: 'en_ruta' }
            : c
        )
      );

      const numericId = Number(String(courierId).replace(/\D/g, '')) || 0;
      this.stateService.dispatchCourierRoute?.({
        courierId: numericId,
        courierName: courier.name,
        orderIds: finalOrderIds
      });

      this.showConfirmCreateRouteModal.set(false);
      this.pendingRouteCourierId.set('');
      this.renderStopMarkers();
      this.buildAndRenderRealRoadRoutes();

      this.notification.success(
        'Ruta Creada y Enviada',
        `La ruta de ${courier.name} (${finalOrderIds.length} entrega(s)) fue guardada en BD y enviada a la App Móvil.`
      );
    } catch (error: unknown) {
      console.error('Error confirming courier route creation:', error);
      this.cancelConfirmCreateRoute();
    }
  }

  /**
   * Unlocks a courier's created route so its delivery cards become active and editable again.
   */
  enableEditCourierRoute(courierId: string): void {
    try {
      const courier = this.couriers().find((c: Courier) => c.id === courierId);
      this.couriers.update((list: Courier[]) =>
        list.map((c: Courier) => (c.id === courierId ? { ...c, isRouteCreated: false } : c))
      );
      if (courier) {
        this.notification.info(
          'Edición de Ruta Habilitada',
          `Ahora puedes modificar las entregas de ${courier.name} y pulsar "Crear Ruta" para guardar.`
        );
      }
    } catch (error: unknown) {
      console.error('Error enabling edit courier route:', error);
    }
  }

  /**
   * Handles drag start for reordering a delivery stop in the drawer.
   */
  onRouteStopDragStart(event: DragEvent, stop: DeliveryWaypoint): void {
    try {
      if (this.isStopRouteLocked(stop)) {
        event.preventDefault();
        return;
      }
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
    } catch (error: unknown) {
      console.error('Error starting route stop drag:', error);
    }
  }

  /**
   * Handles drag over on a target delivery stop card.
   */
  onRouteStopDragOver(event: DragEvent, targetStop: DeliveryWaypoint): void {
    try {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      if (this.draggedRouteStopId() !== targetStop.id) {
        this.dragOverRouteStopId.set(targetStop.id);
      }
    } catch (error: unknown) {
      console.error('Error handling route stop drag over:', error);
    }
  }

  /**
   * Clears the drag-over state when leaving a stop card.
   */
  onRouteStopDragLeave(stopId: number): void {
    try {
      if (this.dragOverRouteStopId() === stopId) {
        this.dragOverRouteStopId.set(null);
      }
    } catch (error: unknown) {
      console.error('Error handling route stop drag leave:', error);
    }
  }

  /**
   * Handles dropping a dragged stop onto another stop to reorder the route.
   */
  onRouteStopDrop(event: DragEvent, targetStop: DeliveryWaypoint, explicitCourierId?: string): void {
    try {
      event.preventDefault();
      event.stopPropagation();

      const rawId = event.dataTransfer?.getData('text/plain');
      const draggedId = this.draggedRouteStopId() ?? (rawId ? Number(rawId) : null);

      this.draggedRouteStopId.set(null);
      this.dragOverRouteStopId.set(null);
      this.dragOverCourierPillId.set(null);

      if (draggedId === null || draggedId === targetStop.id) return;

      this.reorderStopToTarget(draggedId, targetStop.id, explicitCourierId);
    } catch (error: unknown) {
      console.error('Error handling route stop drop:', error);
    }
  }

  /**
   * Handles dropping a dragged stop onto the stop list container.
   */
  onRouteStopContainerDrop(event: DragEvent, explicitCourierId?: string): void {
    try {
      event.preventDefault();
      const draggedId = this.draggedRouteStopId();
      const targetId = this.dragOverRouteStopId();

      this.draggedRouteStopId.set(null);
      this.dragOverRouteStopId.set(null);
      this.dragOverCourierPillId.set(null);

      if (draggedId !== null && targetId !== null && draggedId !== targetId) {
        this.reorderStopToTarget(draggedId, targetId, explicitCourierId);
      }
    } catch (error: unknown) {
      console.error('Error handling route stop container drop:', error);
    }
  }

  /**
   * Resets drag-and-drop state when dragging ends.
   */
  onRouteStopDragEnd(): void {
    try {
      this.draggedRouteStopId.set(null);
      this.dragOverRouteStopId.set(null);
      this.dragOverCourierPillId.set(null);
    } catch (error: unknown) {
      console.error('Error handling route stop drag end:', error);
    }
  }

  /**
   * Highlights a courier filter pill when a stop is dragged over it.
   */
  onCourierPillDragOver(event: DragEvent, courierId: string): void {
    try {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      this.dragOverCourierPillId.set(courierId);
    } catch (error: unknown) {
      console.error('Error handling courier pill drag over:', error);
    }
  }

  /**
   * Clears courier pill highlight when a dragged stop leaves it.
   */
  onCourierPillDragLeave(courierId: string): void {
    try {
      if (this.dragOverCourierPillId() === courierId) {
        this.dragOverCourierPillId.set(null);
      }
    } catch (error: unknown) {
      console.error('Error handling courier pill drag leave:', error);
    }
  }

  /**
   * Assigns a dragged stop to a courier when dropped onto the courier's pill.
   */
  onDropStopOnCourierPill(event: DragEvent, courierId: string): void {
    try {
      event.preventDefault();
      event.stopPropagation();
      const rawId = event.dataTransfer?.getData('text/plain');
      const draggedId = this.draggedRouteStopId() ?? (rawId ? Number(rawId) : null);

      this.draggedRouteStopId.set(null);
      this.dragOverRouteStopId.set(null);
      this.dragOverCourierPillId.set(null);

      if (draggedId === null) return;
      const stop = this.deliveryStops().find((s: DeliveryWaypoint) => s.id === draggedId);
      if (stop && !this.isStopBilled(stop)) {
        this.showUnbilledOrderAlert(stop, courierId);
        return;
      }
      const courier = this.couriers().find((c: Courier) => c.id === courierId);
      this.assignCourierToStop(draggedId, courierId);
      if (stop && courier) {
        this.notification.success(
          'Entrega Asignada',
          `${stop.clientName} (${stop.orderNumber}) se asignó a ${courier.name}.`
        );
      }
    } catch (error: unknown) {
      console.error('Error dropping stop on courier pill:', error);
    }
  }

  /**
   * Reorders a dragged stop relative to a target stop and updates the courier's route.
   */
  private reorderStopToTarget(draggedId: number, targetId: number, explicitCourierId?: string): void {
    try {
      const stops = this.deliveryStops();
      const draggedStop = stops.find((s: DeliveryWaypoint) => s.id === draggedId);
      const targetStop = stops.find((s: DeliveryWaypoint) => s.id === targetId);
      if (!draggedStop || !targetStop) return;

      const activeFilter = this.drawerCourierFilter();
      const courierId =
        explicitCourierId ||
        (activeFilter !== 'all' ? activeFilter : (targetStop.assignedCourierId || draggedStop.assignedCourierId));

      if (courierId && draggedStop.assignedCourierId !== courierId) {
        this.deliveryStops.update((list: DeliveryWaypoint[]) =>
          list.map((s: DeliveryWaypoint) => (s.id === draggedId ? { ...s, assignedCourierId: courierId } : s))
        );
      }

      if (courierId) {
        this.couriers.update((list: Courier[]) =>
          list.map((c: Courier) => {
            if (c.id === courierId) {
              const orderIds = c.orderIds.filter((id: number) => id !== draggedId);
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
            return { ...c, orderIds: c.orderIds.filter((id: number) => id !== draggedId) };
          })
        );
      }

      this.deliveryStops.update((list: DeliveryWaypoint[]) => {
        const copy = [...list];
        const fromIdx = copy.findIndex((s: DeliveryWaypoint) => s.id === draggedId);
        const toIdx = copy.findIndex((s: DeliveryWaypoint) => s.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return list;
        const [moved] = copy.splice(fromIdx, 1);
        copy.splice(toIdx, 0, moved);
        return copy;
      });

      this.renderStopMarkers();
      this.buildAndRenderRealRoadRoutes();

      const courier = courierId ? this.couriers().find((c: Courier) => c.id === courierId) : undefined;
      const newPos = courier ? courier.orderIds.indexOf(draggedId) + 1 : null;
      this.notification.info(
        'Orden de Ruta Actualizado',
        courier && newPos
          ? `${draggedStop.clientName} ahora es la parada #${newPos} de ${courier.name}.`
          : `Se actualizó la posición de ${draggedStop.clientName}.`
      );
    } catch (error: unknown) {
      console.error('Error reordering stop to target:', error);
    }
  }

  readonly filteredDrawerStops = computed<DeliveryWaypoint[]>(() => {
    try {
      const cFilter = this.drawerCourierFilter();
      const query = this.drawerSearchQuery().trim().toLowerCase();
      let list = this.deliveryStops();

      if (cFilter !== 'all') {
        const courier = this.couriers().find((c: Courier) => c.id === cFilter);
        if (courier) {
          const stopMap = new Map(this.deliveryStops().map((s: DeliveryWaypoint) => [s.id, s]));
          const ordered = courier.orderIds
            .map((id: number) => stopMap.get(id))
            .filter((s): s is DeliveryWaypoint => !!s);
          const orderedIds = new Set(courier.orderIds);
          const extras = this.deliveryStops().filter(
            (s: DeliveryWaypoint) => s.assignedCourierId === cFilter && !orderedIds.has(s.id)
          );
          list = [...ordered, ...extras];
        } else {
          list = list.filter((s: DeliveryWaypoint) => s.assignedCourierId === cFilter);
        }
      }

      if (query) {
        list = list.filter(
          (s: DeliveryWaypoint) =>
            s.clientName.toLowerCase().includes(query) ||
            s.orderNumber.toLowerCase().includes(query) ||
            s.address.toLowerCase().includes(query) ||
            s.zone.toLowerCase().includes(query)
        );
      }

      return list;
    } catch (error: unknown) {
      console.error('Error computing filtered drawer stops:', error);
      return [];
    }
  });

  readonly unmappedOrders = computed<OrderDto[]>(() => {
    try {
      const mappedIds = new Set(this.deliveryStops().map((s: DeliveryWaypoint) => s.id));
      return this.stateService
        .orders()
        .filter((o: OrderDto) => o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && !mappedIds.has(o.orderId));
    } catch (error: unknown) {
      console.error('Error computing unmapped orders:', error);
      return [];
    }
  });

  readonly isRefreshingDrawer = signal<boolean>(false);

  /**
   * Enters all-deliveries view mode and toggles the deliveries drawer.
   */
  openAllDeliveriesAndDrawer(): void {
    try {
      this.isMobileAddressSearchOpen.set(false);
      if (this.mapViewMode() !== 'stops') {
        this.enterAllDeliveriesMode();
        this.showDeliveriesDrawer.set(true);
      } else {
        this.showDeliveriesDrawer.update((v: boolean) => !v);
      }
      setTimeout(() => {
        this.map?.invalidateSize();
        this.fitMapToAllStops();
      }, 150);
    } catch (error: unknown) {
      console.error('Error opening all deliveries and drawer:', error);
    }
  }

  /**
   * Synchronizes delivery stops from active orders in StateService and refreshes the map.
   */
  refreshDeliveriesFromOrders(): void {
    try {
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
    } catch (error: unknown) {
      console.error('Error refreshing deliveries from orders:', error);
    }
  }

  /**
   * Toggles visibility of the slide-over deliveries drawer.
   */
  toggleDeliveriesDrawer(): void {
    try {
      const next = !this.showDeliveriesDrawer();
      if (next && this.mapViewMode() === 'locked') {
        this.enterAllDeliveriesMode();
      }
      this.showDeliveriesDrawer.set(next);
    } catch (error: unknown) {
      console.error('Error toggling deliveries drawer:', error);
    }
  }

  /**
   * Handles courier selection changes for a delivery stop, enforcing billing validation.
   */
  onCourierSelectChange(stop: DeliveryWaypoint, newCourierId: string): void {
    try {
      if (newCourierId && !this.isStopBilled(stop)) {
        const currentAssigned = stop.assignedCourierId || '';
        this.deliveryStops.update((stops: DeliveryWaypoint[]) =>
          stops.map((s: DeliveryWaypoint) => (s.id === stop.id ? { ...s, assignedCourierId: '' } : s))
        );
        setTimeout(() => {
          this.deliveryStops.update((stops: DeliveryWaypoint[]) =>
            stops.map((s: DeliveryWaypoint) => (s.id === stop.id ? { ...s, assignedCourierId: currentAssigned } : s))
          );
        }, 50);

        this.showUnbilledOrderAlert(stop, newCourierId);
        return;
      }
      this.assignCourierToStop(stop.id, newCourierId);
    } catch (error: unknown) {
      console.error('Error handling courier select change:', error);
    }
  }

  /**
   * Displays a 10-second alert when attempting to assign an unbilled order to a courier.
   */
  showUnbilledOrderAlert(stop: DeliveryWaypoint, targetCourierId: string): void {
    try {
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
    } catch (error: unknown) {
      console.error('Error showing unbilled order alert:', error);
    }
  }

  /**
   * Dismisses the active unbilled order alert banner.
   */
  dismissUnbilledAlert(): void {
    try {
      if (this.unbilledAlertTimeout) {
        clearTimeout(this.unbilledAlertTimeout);
        this.unbilledAlertTimeout = undefined;
      }
      this.activeUnbilledAlert.set(null);
    } catch (error: unknown) {
      console.error('Error dismissing unbilled alert:', error);
    }
  }

  /**
   * Flags the unbilled order as high priority in KDS from the alert banner.
   */
  requestPriorityFromBanner(): void {
    try {
      const alert = this.activeUnbilledAlert();
      if (!alert) return;
      const stop = this.deliveryStops().find((s: DeliveryWaypoint) => s.id === alert.stopId);
      if (stop) {
        this.toggleStopPriority(stop, true);
      } else {
        this.stateService.setOrderPriority(alert.stopId, true);
        this.stateService.setOrderPriority(alert.orderNumber, true);
        this.notification.warning(
          'Alerta de Prioridad Activada',
          `Pedido ${alert.orderNumber} marcado con ALTA PRIORIDAD en Inventario / KDS.`
        );
      }
      this.dismissUnbilledAlert();
    } catch (error: unknown) {
      console.error('Error requesting priority from banner:', error);
    }
  }

  /**
   * Checks whether a delivery stop's underlying order has been billed.
   */
  isStopBilled(stop: DeliveryWaypoint): boolean {
    try {
      if (stop.isBilled !== undefined) return stop.isBilled;
      const order = this.stateService.orders().find((o: OrderDto) => o.orderId === stop.id || o.orderNumber === stop.orderNumber);
      if (order) {
        return order.isBilled === true || order.status === 'BILLED' || order.status === 'DISPATCHED' || order.status === 'DELIVERED';
      }
      return stop.isDelivered;
    } catch (error: unknown) {
      console.error('Error checking if stop is billed:', error);
      return false;
    }
  }

  /**
   * Checks whether a delivery stop is marked as high priority.
   */
  isStopPriority(stop: DeliveryWaypoint): boolean {
    try {
      if (stop.isPriority) return true;
      const order = this.stateService.orders().find((o: OrderDto) => o.orderId === stop.id || o.orderNumber === stop.orderNumber);
      return order?.isPriority === true;
    } catch (error: unknown) {
      console.error('Error checking if stop is priority:', error);
      return false;
    }
  }

  /**
   * Toggles the high-priority flag for a delivery stop and syncs with StateService.
   */
  toggleStopPriority(stop: DeliveryWaypoint, forceState?: boolean): void {
    try {
      const nextVal = forceState !== undefined ? forceState : !this.isStopPriority(stop);

      this.deliveryStops.update((stops: DeliveryWaypoint[]) =>
        stops.map((s: DeliveryWaypoint) => (s.id === stop.id ? { ...s, isPriority: nextVal } : s))
      );

      this.stateService.setOrderPriority(stop.id, nextVal);
      this.stateService.setOrderPriority(stop.orderNumber, nextVal);

      if (nextVal) {
        this.notification.warning(
          'Alerta de Prioridad Activada',
          `El pedido ${stop.orderNumber} se marcó con ALTA PRIORIDAD. Se resaltó con borde rojo en la pantalla de Inventario (KDS).`
        );
      } else {
        this.notification.info(
          'Prioridad Desactivada',
          `Se retiró la alerta de prioridad del pedido ${stop.orderNumber}.`
        );
      }
    } catch (error: unknown) {
      console.error('Error toggling stop priority:', error);
    }
  }

  /**
   * Assigns a courier to a delivery stop by ID and rebuilds map routes.
   */
  assignCourierToStop(stopId: number, newCourierId: string): void {
    try {
      this.deliveryStops.update((stops: DeliveryWaypoint[]) =>
        stops.map((s: DeliveryWaypoint) => (s.id === stopId ? { ...s, assignedCourierId: newCourierId } : s))
      );

      this.couriers.update((list: Courier[]) =>
        list.map((c: Courier) => {
          const filteredIds = c.orderIds.filter((id: number) => id !== stopId);
          if (c.id === newCourierId) {
            return { ...c, orderIds: [...filteredIds, stopId] };
          }
          return { ...c, orderIds: filteredIds };
        })
      );

      this.renderStopMarkers();
      this.buildAndRenderRealRoadRoutes();
    } catch (error: unknown) {
      console.error('Error assigning courier to stop:', error);
    }
  }

  /**
   * Returns the badge color of the courier assigned to a stop.
   */
  getStopCourierColor(stop: DeliveryWaypoint): string {
    try {
      if (!stop.assignedCourierId) return '#64748b';
      const courier = this.couriers().find((c: Courier) => c.id === stop.assignedCourierId);
      return courier ? courier.color : '#64748b';
    } catch (error: unknown) {
      console.error('Error getting stop courier color:', error);
      return '#64748b';
    }
  }

  /**
   * Returns the display name of the courier assigned to a stop.
   */
  getStopCourierName(stop: DeliveryWaypoint): string {
    try {
      if (!stop.assignedCourierId) return 'Sin asignar';
      const courier = this.couriers().find((c: Courier) => c.id === stop.assignedCourierId);
      return courier ? courier.name : 'Sin asignar';
    } catch (error: unknown) {
      console.error('Error getting stop courier name:', error);
      return 'Sin asignar';
    }
  }

  /**
   * Returns the 1-based sequence index of a stop within its assigned courier's route.
   */
  getStopOrderIndex(stop: DeliveryWaypoint): string | number {
    try {
      if (!stop.assignedCourierId) return '•';
      const courier = this.couriers().find((c: Courier) => c.id === stop.assignedCourierId);
      if (!courier) return '•';
      const idx = courier.orderIds.indexOf(stop.id);
      return idx >= 0 ? idx + 1 : '•';
    } catch (error: unknown) {
      console.error('Error getting stop order index:', error);
      return '•';
    }
  }

  /**
   * Flies the map to a specific delivery stop and opens its marker popup.
   */
  focusStopOnMap(stop: DeliveryWaypoint): void {
    try {
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
    } catch (error: unknown) {
      console.error('Error focusing stop on map:', error);
    }
  }

  /**
   * Removes a delivery stop from the map and from any assigned courier route.
   */
  deleteDeliveryStop(stopId: number): void {
    try {
      const target = this.deliveryStops().find((s: DeliveryWaypoint) => s.id === stopId);
      this.deliveryStops.update((stops: DeliveryWaypoint[]) => stops.filter((s: DeliveryWaypoint) => s.id !== stopId));

      this.couriers.update((list: Courier[]) =>
        list.map((c: Courier) => ({
          ...c,
          orderIds: c.orderIds.filter((id: number) => id !== stopId)
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
    } catch (error: unknown) {
      console.error('Error deleting delivery stop:', error);
    }
  }

  /**
   * Closes the drawer and enables map point-marking mode.
   */
  startMarkingFromDrawer(): void {
    try {
      this.showDeliveriesDrawer.set(false);
      this.newOrderCourierId = '';
      if (this.mapViewMode() === 'locked') {
        this.enterAllDeliveriesMode();
      }
      if (!this.isMarkingPointMode()) {
        this.toggleMarkingPointMode();
      }
    } catch (error: unknown) {
      console.error('Error starting marking from drawer:', error);
    }
  }

  /**
   * Submits the quick-add delivery form from the drawer, geocoding the address and creating an order.
   */
  async submitDrawerQuickAdd(): Promise<void> {
    try {
      const clientName = this.drawerNewClient().trim();
      const address = this.drawerNewAddress().trim();
      const courierId = this.drawerNewCourierId() || '';
      const amount = Number(this.drawerNewAmount()) || 0;

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
      } catch {
      }

      const courierObj = courierId ? this.couriers().find((c: Courier) => c.id === courierId) : undefined;
      const defaultFruit = this.stateService.fruits()[0]?.name || '';
      const newOrderDto = this.stateService.createOrder({
        clientName,
        clientPhone: '',
        clientAddress: address,
        courierName: courierObj?.name,
        notes: `Agregado desde el mapa (${zone})`,
        items: defaultFruit
          ? [
              {
                fruitName: defaultFruit,
                grammage: 1000,
                quantity: 10,
                unitPrice: Math.round(amount / 10)
              }
            ]
          : []
      });

      this.stateService.updateOrderStatus(newOrderDto.orderId, 'DISPATCHED');

      const newStop: DeliveryWaypoint = {
        id: newOrderDto.orderId,
        orderNumber: newOrderDto.orderNumber,
        clientName,
        clientPhone: '',
        address,
        zone,
        lat,
        lng,
        totalAmount: amount,
        weightKg: 10.0,
        itemsSummary: defaultFruit ? `10x ${defaultFruit} 1000g` : '',
        isDelivered: false,
        assignedCourierId: courierId,
        orderRef: newOrderDto
      };

      this.deliveryStops.update((stops: DeliveryWaypoint[]) => [newStop, ...stops]);
      if (courierId) {
        this.couriers.update((list: Courier[]) =>
          list.map((c: Courier) => (c.id === courierId ? { ...c, orderIds: [...c.orderIds, newStop.id] } : c))
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
    } catch (error: unknown) {
      console.error('Error submitting drawer quick add:', error);
    }
  }

  /**
   * Geocodes and adds an existing StateService order onto the delivery map.
   */
  async addExistingOrderToMap(order: OrderDto): Promise<void> {
    try {
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
        } catch {
        }
      }

      const newStop: DeliveryWaypoint = {
        id: order.orderId,
        orderNumber: order.orderNumber,
        clientName: order.clientName,
        clientPhone: order.clientPhone || '',
        address: order.clientAddress || '',
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
      this.deliveryStops.update((stops: DeliveryWaypoint[]) => [newStop, ...stops]);
      if (courierId) {
        this.couriers.update((list: Courier[]) =>
          list.map((c: Courier) => (c.id === courierId ? { ...c, orderIds: [...c.orderIds, newStop.id] } : c))
        );
      }

      this.renderStopMarkers();
      this.buildAndRenderRealRoadRoutes();
      this.focusStopOnMap(newStop);
    } catch (error: unknown) {
      console.error('Error adding existing order to map:', error);
    }
  }

  /**
   * Removes a stop from a courier's route.
   */
  removeStopFromCourier(stopId: number): void {
    try {
      this.deleteDeliveryStop(stopId);
    } catch (error: unknown) {
      console.error('Error removing stop from courier:', error);
    }
  }

  /**
   * Optimizes the active courier's stop sequence using a nearest-neighbor heuristic from the plant.
   */
  autoOptimizeSequence(): void {
    try {
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

      const newOrderIds = optimized.map((s: DeliveryWaypoint) => s.id);

      this.couriers.update((list: Courier[]) => list.map((c: Courier) => {
        if (c.id === courierId) {
          return { ...c, orderIds: newOrderIds };
        }
        return c;
      }));

      this.buildAndRenderRealRoadRoutes();
      this.renderStopMarkers();

      this.notification.success(
        '¡Ruta Optimizada por Calles!',
        'Secuencia reordenada para menor consumo de combustible y menor tiempo en Bogotá.'
      );
    } catch (error: unknown) {
      console.error('Error auto-optimizing sequence:', error);
    }
  }

  /**
   * Applies the planned route sequence and closes the route planner modal.
   */
  applyPlannedRoute(): void {
    try {
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
        `El mensajero ${courier?.name || ''} ha recibido su nuevo orden de entrega en tiempo real.`
      );
    } catch (error: unknown) {
      console.error('Error applying planned route:', error);
    }
  }

  /**
   * Starts the requestAnimationFrame loop for courier movement simulation.
   */
  private startSimulationLoop(): void {
    try {
      const loop = (timestamp: number): void => {
        if (!this.lastTimestamp) this.lastTimestamp = timestamp;
        const deltaSec = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;

        if (this.isSimulating()) {
          this.updateSimulationTick(deltaSec * this.simulationSpeed());
        }

        this.animFrameId = requestAnimationFrame(loop);
      };

      this.animFrameId = requestAnimationFrame(loop);
    } catch (error: unknown) {
      console.error('Error starting simulation loop:', error);
    }
  }

  /**
   * Advances courier positions along their computed road paths on each simulation tick.
   */
  private updateSimulationTick(step: number): void {
    try {
      this.couriers.update((list: Courier[]) => list.map((c: Courier) => {
        const roadPath = this.courierFullRoadPaths.get(c.id);
        if (!roadPath || roadPath.length < 2) return c;

        const speedStep = step * (c.currentSpeedKmH / 30) * 1.8;
        let newStepIndex = c.roadStepIndex + speedStep;

        if (newStepIndex >= roadPath.length - 1) {
          newStepIndex = 0;
        }

        const idx = Math.floor(newStepIndex);
        const nextIdx = (idx + 1) % roadPath.length;
        const ratio = newStepIndex - idx;

        const currentLat = roadPath[idx][0] + (roadPath[nextIdx][0] - roadPath[idx][0]) * ratio;
        const currentLng = roadPath[idx][1] + (roadPath[nextIdx][1] - roadPath[idx][1]) * ratio;

        const marker = this.courierMarkers.get(c.id);
        if (marker) {
          marker.setLatLng([currentLat, currentLng]);
        }

        this.checkStopProximity(c, currentLat, currentLng);

        return {
          ...c,
          roadStepIndex: newStepIndex,
          lat: currentLat,
          lng: currentLng,
          status: 'en_ruta'
        };
      }));
    } catch (error: unknown) {
      console.error('Error updating simulation tick:', error);
    }
  }

  /**
   * Checks whether a courier is within 350 meters of any assigned stop to mark it delivered.
   */
  private checkStopProximity(courier: Courier, lat: number, lng: number): void {
    try {
      const stops = this.deliveryStops();
      for (const stop of stops) {
        if (stop.assignedCourierId === courier.id && !stop.isDelivered) {
          const distKm = this.calculateHaversineKm(lat, lng, stop.lat, stop.lng);
          if (distKm < 0.35) {
            this.markStopDeliveredSilently(stop.id);
          }
        }
      }
    } catch (error: unknown) {
      console.error('Error checking stop proximity:', error);
    }
  }

  /**
   * Marks a stop as delivered during live simulation without triggering a toast notification.
   */
  private markStopDeliveredSilently(stopId: number): void {
    try {
      this.deliveryStops.update((stops: DeliveryWaypoint[]) => stops.map((s: DeliveryWaypoint) => {
        if (s.id === stopId && !s.isDelivered) {
          return { ...s, isDelivered: true };
        }
        return s;
      }));
      this.renderStopMarkers();
    } catch (error: unknown) {
      console.error('Error marking stop delivered silently:', error);
    }
  }

  /**
   * Switches the map into live courier tracking and simulation mode.
   */
  enterLiveMapMode(): void {
    try {
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
    } catch (error: unknown) {
      console.error('Error entering live map mode:', error);
    }
  }

  /**
   * Switches the map into all-deliveries stop management mode.
   */
  enterAllDeliveriesMode(): void {
    try {
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
    } catch (error: unknown) {
      console.error('Error entering all deliveries mode:', error);
    }
  }

  /**
   * Locks the map overlay and pauses simulation.
   */
  lockMapOverlay(): void {
    try {
      this.isMobileAddressSearchOpen.set(false);
      this.mapViewMode.set('locked');
      this.showDeliveriesDrawer.set(false);
      this.isSimulating.set(false);
    } catch (error: unknown) {
      console.error('Error locking map overlay:', error);
    }
  }

  /**
   * Toggles fullscreen display mode for the delivery map container.
   */
  toggleMapFullscreen(): void {
    try {
      const nextState = !this.isMapFullscreen();
      this.isMapFullscreen.set(nextState);
      document.body.style.overflow = nextState ? 'hidden' : '';

      setTimeout(() => {
        this.map?.invalidateSize();
      }, 80);
      setTimeout(() => {
        this.map?.invalidateSize();
      }, 260);
    } catch (error: unknown) {
      console.error('Error toggling map fullscreen:', error);
    }
  }

  /**
   * Exits map fullscreen mode when the Escape key is pressed.
   */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    try {
      if (this.isMapFullscreen()) {
        this.toggleMapFullscreen();
      }
    } catch (error: unknown) {
      console.error('Error handling Escape key:', error);
    }
  }

  /**
   * Synchronizes visible Leaflet layers (polylines and courier markers) with the active map view mode.
   */
  private syncMapLayersForMode(): void {
    try {
      if (!this.map) return;

      this.renderStopMarkers();

      const mode = this.mapViewMode();
      if (mode === 'stops') {
        this.routeCasingPolylines.forEach((p: L.Polyline) => p.remove());
        this.routePolylines.forEach((p: L.Polyline) => p.remove());
        this.courierMarkers.forEach((m: L.Marker) => m.remove());
      } else {
        this.clearZonePolygon();
        if (mode === 'live') {
          this.routeCasingPolylines.forEach((p: L.Polyline) => {
            if (!this.map!.hasLayer(p)) p.addTo(this.map!);
          });
          this.routePolylines.forEach((p: L.Polyline) => {
            if (!this.map!.hasLayer(p)) p.addTo(this.map!);
          });
          this.courierMarkers.forEach((m: L.Marker) => {
            if (!this.map!.hasLayer(m)) m.addTo(this.map!);
          });
        }
      }
    } catch (error: unknown) {
      console.error('Error syncing map layers for mode:', error);
    }
  }

  /**
   * Fits the Leaflet map bounds to encompass the plant, relevant stops, and active couriers.
   */
  private fitMapToAllStops(): void {
    try {
      if (!this.map) return;
      const isLive = this.mapViewMode() === 'live';
      const relevantStops = isLive
        ? this.deliveryStops().filter((s: DeliveryWaypoint) => !!s.assignedCourierId)
        : this.deliveryStops();

      const courierCoords = isLive
        ? this.assignedCouriers().map((c: Courier) => [c.lat, c.lng] as [number, number])
        : [];

      const coords: [number, number][] = [
        [PLANTA_MATRIZ_LAT, PLANTA_MATRIZ_LNG],
        ...relevantStops.map((s: DeliveryWaypoint) => [s.lat, s.lng] as [number, number]),
        ...courierCoords
      ];
      if (coords.length > 1) {
        const bounds = L.latLngBounds(coords);
        this.map.flyToBounds(bounds, { padding: [48, 48], maxZoom: 13, duration: 1.0 });
      }
    } catch (error: unknown) {
      console.error('Error fitting map to all stops:', error);
    }
  }

  /**
   * Toggles the real-time courier simulation play/pause state.
   */
  toggleSimulation(): void {
    try {
      if (this.mapViewMode() !== 'live') {
        this.enterLiveMapMode();
        return;
      }
      this.isSimulating.update((v: boolean) => !v);
    } catch (error: unknown) {
      console.error('Error toggling simulation:', error);
    }
  }

  /**
   * Sets the simulation playback speed multiplier.
   */
  setSimulationSpeed(speed: number): void {
    try {
      this.simulationSpeed.set(speed);
    } catch (error: unknown) {
      console.error('Error setting simulation speed:', error);
    }
  }

  /**
   * Resets all couriers back to the central plant and marks stops as undelivered.
   */
  resetSimulation(): void {
    try {
      this.couriers.update((list: Courier[]) => list.map((c: Courier) => ({
        ...c,
        roadStepIndex: 0,
        lat: PLANTA_MATRIZ_LAT,
        lng: PLANTA_MATRIZ_LNG,
        status: 'en_planta'
      })));

      this.deliveryStops.update((stops: DeliveryWaypoint[]) => stops.map((s: DeliveryWaypoint) => ({
        ...s,
        isDelivered: false
      })));

      this.couriers().forEach((c: Courier) => {
        const m = this.courierMarkers.get(c.id);
        if (m) m.setLatLng([PLANTA_MATRIZ_LAT, PLANTA_MATRIZ_LNG]);
      });

      this.renderStopMarkers();
      this.buildAndRenderRealRoadRoutes();
      this.notification.info('Simulación Reiniciada', 'Todos los mensajeros han regresado a la Inventario Matriz Cundinamarca.');
    } catch (error: unknown) {
      console.error('Error resetting simulation:', error);
    }
  }

  /**
   * Extracts up to two uppercase initials from a courier's full name.
   */
  getCourierInitials(name: string): string {
    try {
      if (!name) return 'M';
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    } catch (error: unknown) {
      console.error('Error getting courier initials:', error);
      return 'M';
    }
  }

  /**
   * Flies the map camera directly to the central plant coordinates.
   */
  flyToPlantaMatriz(): void {
    try {
      this.selectedCourierId.set('');
      if (this.map) {
        this.map.flyTo([PLANTA_MATRIZ_LAT, PLANTA_MATRIZ_LNG], 14, { duration: 1.2 });
      }
    } catch (error: unknown) {
      console.error('Error flying to plant:', error);
    }
  }

  /**
   * Toggles selection of a courier card in the sidebar deck.
   */
  onCourierCardClick(id: string): void {
    try {
      this.selectedCourierId.update((curr: string) => (curr === id ? '' : id));
    } catch (error: unknown) {
      console.error('Error handling courier card click:', error);
    }
  }

  /**
   * Selects a courier by ID and flies the map to fit the courier and their stops.
   */
  selectCourier(id: string): void {
    try {
      this.selectedCourierId.set(id);
      if (this.mapViewMode() === 'live' && this.map) {
        const courier = this.couriers().find((c: Courier) => c.id === id);
        if (courier) {
          const courierStops = this.deliveryStops().filter(
            (s: DeliveryWaypoint) => s.assignedCourierId === id || courier.orderIds.includes(s.id)
          );
          if (courierStops.length > 0) {
            const boundsCoords: [number, number][] = [
              [courier.lat, courier.lng],
              ...courierStops.map((s: DeliveryWaypoint) => [s.lat, s.lng] as [number, number])
            ];
            const bounds = L.latLngBounds(boundsCoords);
            this.map.flyToBounds(bounds, { padding: [55, 55], maxZoom: 15, duration: 1.2 });
          } else {
            this.map.flyTo([courier.lat, courier.lng], 14, { duration: 1.2 });
          }
        }
      }
    } catch (error: unknown) {
      console.error('Error selecting courier:', error);
    }
  }

  /**
   * Enters live map mode if needed and focuses the map on the specified courier.
   */
  flyToCourier(c: Courier): void {
    try {
      if (this.mapViewMode() !== 'live') {
        this.enterLiveMapMode();
      }
      this.selectCourier(c.id);
    } catch (error: unknown) {
      console.error('Error flying to courier:', error);
    }
  }

  /**
   * Returns the number of completed delivery stops for a courier.
   */
  getCourierCompletedStops(c: Courier): number {
    try {
      const stopMap = new Map(this.deliveryStops().map((s: DeliveryWaypoint) => [s.id, s]));
      return c.orderIds.filter((id: number) => stopMap.get(id)?.isDelivered).length;
    } catch (error: unknown) {
      console.error('Error getting courier completed stops:', error);
      return 0;
    }
  }

  /**
   * Returns the route completion percentage (0-100) for a courier.
   */
  getCourierProgressPct(c: Courier): number {
    try {
      if (c.orderIds.length === 0) return 0;
      return Math.round((this.getCourierCompletedStops(c) / c.orderIds.length) * 100);
    } catch (error: unknown) {
      console.error('Error getting courier progress percentage:', error);
      return 0;
    }
  }

  /**
   * Synchronizes the couriers signal from users with courier role and delivery employees in StateService.
   */
  private syncCouriersFromEmployees(): void {
    try {
      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
      const lightColors = [
        'rgba(16, 185, 129, 0.15)',
        'rgba(59, 130, 246, 0.15)',
        'rgba(245, 158, 11, 0.15)',
        'rgba(139, 92, 246, 0.15)',
        'rgba(236, 72, 153, 0.15)'
      ];

      let rolesList = this.stateService.roles ? this.stateService.roles() : [];
      if (rolesList.length === 0 && typeof localStorage !== 'undefined') {
        try {
          const cached = localStorage.getItem('dgl_roles_v2');
          if (cached) rolesList = JSON.parse(cached);
        } catch {}
      }
      const courierRoleIds = new Set(
        rolesList
          .filter(r => r.isCourier || (r.name && (r.name.toLowerCase().includes('domicili') || r.name.toLowerCase().includes('mensajer') || r.name.toLowerCase().includes('repartidor'))))
          .map(r => r.roleId)
      );

      let usersList = this.stateService.users ? this.stateService.users() : [];
      if (usersList.length === 0 && typeof localStorage !== 'undefined') {
        try {
          const cached = localStorage.getItem('dgl_users_v2');
          if (cached) usersList = JSON.parse(cached);
        } catch {}
      }
      const courierUsers = usersList.filter(u =>
        u.isActive !== false &&
        (courierRoleIds.has(u.roleId) ||
          (u.roleName && (u.roleName.toLowerCase().includes('domicili') || u.roleName.toLowerCase().includes('mensajer') || u.roleName.toLowerCase().includes('repartidor'))))
      );

      const domiEmployees = this.stateService.employees ? this.stateService.employees().filter((e: EmployeeDto) => e.area === 'DOMICILIOS') : [];

      const existingMap = new Map(this.couriers().map((c: Courier) => [c.id, c]));
      const updated: Courier[] = [];
      const seenNames = new Set<string>();

      courierUsers.forEach((usr, idx) => {
        const id = 'u' + usr.userId;
        const name = usr.fullName || usr.username;
        seenNames.add(name.toLowerCase());
        const existing = existingMap.get(id);
        if (existing) {
          updated.push({
            ...existing,
            name,
            phone: usr.phone || existing.phone
          });
        } else {
          updated.push({
            id,
            name,
            vehicleType: 'moto',
            vehiclePlate: usr.documentNumber || '',
            vehicleModel: usr.roleName || 'Domiciliario',
            phone: usr.phone || '',
            color: colors[idx % colors.length],
            colorLight: lightColors[idx % lightColors.length],
            capacityKg: 45,
            status: 'en_ruta',
            routeCode: 'RUTA-U' + usr.userId,
            routeStatus: 'en_ruta',
            currentSpeedKmH: 35,
            batteryPct: 100,
            orderIds: [],
            currentStopIndex: 0,
            progress: 0,
            roadStepIndex: 0,
            lat: PLANTA_MATRIZ_LAT,
            lng: PLANTA_MATRIZ_LNG
          });
        }
      });

      domiEmployees.forEach((emp: EmployeeDto, idx: number) => {
        const empName = emp.fullName || emp.name || '';
        if (seenNames.has(empName.toLowerCase())) return;
        seenNames.add(empName.toLowerCase());

        const id = 'c' + emp.id;
        const existing = existingMap.get(id);
        const paletteIdx = (courierUsers.length + idx) % colors.length;

        if (existing) {
          updated.push({
            ...existing,
            name: empName,
            phone: emp.phone || existing.phone
          });
        } else {
          updated.push({
            id,
            name: empName,
            vehicleType: 'moto',
            vehiclePlate: '',
            vehicleModel: emp.position || '',
            phone: emp.phone || '',
            color: colors[paletteIdx],
            colorLight: lightColors[paletteIdx],
            capacityKg: 45,
            status: 'en_ruta',
            routeCode: 'RUTA-' + emp.id,
            routeStatus: 'en_ruta',
            currentSpeedKmH: 35,
            batteryPct: 100,
            orderIds: [],
            currentStopIndex: 0,
            progress: 0,
            roadStepIndex: 0,
            lat: PLANTA_MATRIZ_LAT,
            lng: PLANTA_MATRIZ_LNG
          });
        }
      });

      if (updated.length > 0) {
        this.couriers.set(updated);
        if (!this.activePlannerCourierId()) {
          this.activePlannerCourierId.set(updated[0].id);
          this.selectedCourierId.set(updated[0].id);
        }
      }
    } catch (error: unknown) {
      console.error('Error syncing couriers from employees and users:', error);
    }
  }

  /**
   * Synchronizes couriers and active orders from StateService into delivery waypoints.
   */
  private syncWithStateServiceOrders(): void {
    try {
      this.syncCouriersFromEmployees();
      const stateOrders = this.stateService
        .orders()
        .filter((o: OrderDto) => o.status !== 'CANCELLED' && o.status !== 'DELIVERED');
      const existingIds = new Set(this.deliveryStops().map((s: DeliveryWaypoint) => s.id));

      stateOrders.forEach((order: OrderDto, i: number) => {
        if (!existingIds.has(order.orderId)) {
          const seedLats = [4.6850, 4.6450, 4.6720, 4.6210, 4.8450];
          const seedLngs = [-74.0550, -74.0950, -74.0450, -74.1400, -74.0650];
          const lat = seedLats[i % seedLats.length];
          const lng = seedLngs[i % seedLngs.length];
          const matchedCourier =
            this.couriers().find(
              (c: Courier) =>
                (order.courierId && (c.id === 'u' + order.courierId || c.id === 'c' + order.courierId)) ||
                (order.courierName && c.name.toLowerCase().includes(order.courierName.toLowerCase()))
            );
          const assignedCourierId = matchedCourier ? matchedCourier.id : '';
          const isOrderRouteDispatched =
            Boolean(assignedCourierId) &&
            (order.status === 'DISPATCHED' || (order.routeSequenceOrder !== undefined && order.routeSequenceOrder > 0));

          const stop: DeliveryWaypoint = {
            id: order.orderId,
            orderNumber: order.orderNumber,
            clientName: order.clientName,
            clientPhone: order.clientPhone || '',
            address: order.clientAddress || '',
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

          this.deliveryStops.update((stops: DeliveryWaypoint[]) => [stop, ...stops]);
          if (assignedCourierId) {
            this.couriers.update((list: Courier[]) => list.map((c: Courier) => {
              if (c.id === assignedCourierId) {
                return {
                  ...c,
                  orderIds: c.orderIds.includes(stop.id) ? c.orderIds : [...c.orderIds, stop.id],
                  isRouteCreated: c.isRouteCreated || isOrderRouteDispatched
                };
              }
              return c;
            }));
          }

          if (order.clientAddress && order.clientAddress.trim().length >= 4) {
            this.geocodingService.geocodeBestMatch(order.clientAddress).then(geo => {
              if (geo) {
                this.deliveryStops.update((stops: DeliveryWaypoint[]) =>
                  stops.map((s: DeliveryWaypoint) =>
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
        } else {
          this.deliveryStops.update((stops: DeliveryWaypoint[]) =>
            stops.map((s: DeliveryWaypoint) => {
              if (s.id === order.orderId) {
                const updatedSummary =
                  order.items.map(it => `${it.quantity}x ${it.fruitName}`).join(', ') ||
                  s.itemsSummary;
                return {
                  ...s,
                  clientName: order.clientName || s.clientName,
                  clientPhone: order.clientPhone ?? s.clientPhone,
                  totalAmount: order.totalAmount,
                  itemsSummary: updatedSummary,
                  orderRef: order
                };
              }
              return s;
            })
          );
        }
      });
    } catch (error: unknown) {
      console.error('Error syncing with StateService orders:', error);
    }
  }

  /**
   * Calculates the great-circle distance in kilometers between two coordinates using the Haversine formula.
   */
  private calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    try {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    } catch (error: unknown) {
      console.error('Error calculating Haversine distance:', error);
      return 0;
    }
  }

  /**
   * Formats a numeric value as a Colombian Peso (COP) currency string.
   */
  formatCOP(val: number): string {
    try {
      return '$ ' + (val || 0).toLocaleString('es-CO');
    } catch (error: unknown) {
      console.error('Error formatting COP currency:', error);
      return '$ 0';
    }
  }
}
