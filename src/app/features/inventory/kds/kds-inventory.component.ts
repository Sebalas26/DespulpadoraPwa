import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../core/services/state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ProductVariantDto } from '../../../core/models/business.models';
import confetti from 'canvas-confetti';

interface InventoryTransaction {
  id: string;
  time: string;
  type: 'fruit' | 'variant';
  targetId: string | number;
  name: string;
  detail: string;
  delta: number;
  unit: 'Kg' | 'uds';
}

@Component({
  selector: 'app-kds-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="kds-root" [class.dark-theme]="isDarkTheme()">
      <!-- ========================================================
           KDS HEADER (TV / WORKSTATION TOUCH MONITOR STYLE)
           ======================================================== -->
      <header class="kds-header">
        <!-- Live Clock & Branding on the Left -->
        <div class="kds-brand-group">
          <div class="kds-clock">
            <span class="clock-time">{{ currentTime() }}</span>
            <span class="clock-date">{{ currentDate() }}</span>
          </div>
          <div class="kds-title-badge">
            <span class="badge-tag">KDS PLANTA & CAVA</span>
            <span class="kds-title">Alimentación de Inventario & Stock</span>
          </div>
        </div>

        <!-- Metrics Pills Bar (Live Totals) -->
        <div class="kds-metrics-bar">
          <div class="metric-card metric-fruit">
            <div class="metric-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M12 3v9l4 4"></path>
              </svg>
            </div>
            <div>
              <div class="metric-val">{{ stateService.totalFreshStockKg() | number:'1.0-0' }} <small>Kg</small></div>
              <div class="metric-lbl">Fruta Fresca en Planta</div>
            </div>
          </div>

          <div class="metric-card metric-pulp">
            <div class="metric-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <div>
              <div class="metric-val">{{ totalPulpUnits() | number:'1.0-0' }} <small>uds</small></div>
              <div class="metric-lbl">Pulpas en Cava</div>
            </div>
          </div>

          <div class="metric-card metric-equiv">
            <div class="metric-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <div>
              <div class="metric-val">~{{ estimatedPulpKg() | number:'1.0-0' }} <small>Kg</small></div>
              <div class="metric-lbl">Pulpa Est. Disponible</div>
            </div>
          </div>

          @if (lowStockFruitsCount() > 0) {
            <div class="metric-card metric-alert animate-pulse" title="Frutas con stock menor o igual a 50 Kg">
              <div class="metric-icon">⚠️</div>
              <div>
                <div class="metric-val">{{ lowStockFruitsCount() }}</div>
                <div class="metric-lbl">Bajo Stock</div>
              </div>
            </div>
          }
        </div>

        <!-- Utility & Workstation Actions -->
        <div class="kds-actions-group">
          <!-- View Mode Selector -->
          <div class="kds-view-selector">
            <button
              type="button"
              class="view-pill"
              [class.active]="viewMode() === 'all'"
              (click)="viewMode.set('all')"
              title="Ver Fruta fresca y Pulpas en cava"
            >
              Ambos
            </button>
            <button
              type="button"
              class="view-pill"
              [class.active]="viewMode() === 'fruits'"
              (click)="viewMode.set('fruits')"
              title="Solo Fruta Fresca (Kg)"
            >
              Fruta (Kg)
            </button>
            <button
              type="button"
              class="view-pill"
              [class.active]="viewMode() === 'pulps'"
              (click)="viewMode.set('pulps')"
              title="Solo Stock Pulpas (Uds)"
            >
              Pulpas (Uds)
            </button>
          </div>

          <!-- Sound Feedback Toggle -->
          <button
            type="button"
            class="kds-tool-btn"
            [class.muted]="!soundEnabled()"
            (click)="toggleSound()"
            [title]="soundEnabled() ? 'Silenciar campanilla táctil' : 'Activar sonido de respuesta táctil'"
          >
            @if (soundEnabled()) {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            } @else {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                <path d="M18.63 13A17.89 17.89 0 0 1 18 8"></path>
                <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            }
          </button>

          <!-- Fullscreen Toggle -->
          <button
            type="button"
            class="kds-tool-btn"
            (click)="toggleFullscreen()"
            title="Pantalla Completa Kiosko / F11"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>

          <!-- Theme Toggle -->
          <button
            type="button"
            class="kds-tool-btn"
            (click)="toggleTheme()"
            title="Cambiar Modo Claro / Oscuro"
          >
            @if (isDarkTheme()) {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            } @else {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            }
          </button>

          <!-- Exit KDS Button -->
          <button
            type="button"
            class="btn-exit-kds"
            (click)="exitKds()"
            title="Salir y volver a Inventario y Stock ERP"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span>Salir KDS</span>
          </button>
        </div>
      </header>

      <!-- ========================================================
           SUBBAR: SEARCH & QUICK FRUIT FILTER CHIPS
           ======================================================== -->
      <div class="kds-filter-bar">
        <div class="filter-search-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            class="filter-search-input"
            placeholder="Filtrar por fruta o presentación (ej: Mango, 500g)..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
          @if (searchQuery()) {
            <button class="clear-search-btn" (click)="searchQuery.set('')">&times;</button>
          }
        </div>

        <div class="fruit-chips-scroll">
          <button
            type="button"
            class="fruit-chip"
            [class.active]="selectedFruitFilter() === 'ALL'"
            (click)="selectedFruitFilter.set('ALL')"
          >
            Todas las Frutas
          </button>
          @for (fruit of stateService.fruits(); track fruit.id) {
            <button
              type="button"
              class="fruit-chip"
              [class.active]="selectedFruitFilter() === fruit.id"
              (click)="selectedFruitFilter.set(fruit.id)"
            >
              <span>{{ fruit.name }}</span>
              <span class="chip-badge">{{ fruit.freshStockKg }}k</span>
            </button>
          }
        </div>
      </div>

      <!-- ========================================================
           MAIN WORKSTATION CONTENT AREA
           ======================================================== -->
      <main class="kds-main-grid">

        <!-- ========================================================
             PANEL 1: FRUTA FRESCA EN PLANTA (MATERIA PRIMA EN KG)
             ======================================================== -->
        @if (viewMode() === 'all' || viewMode() === 'fruits') {
          <section class="kds-section-panel">
            <div class="section-title-bar">
              <div class="sec-left">
                <span class="sec-icon fruit-color">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="M12 3v9l4 4"></path>
                  </svg>
                </span>
                <div>
                  <h2 class="sec-title">Inventario de Fruta Disponible en Planta</h2>
                  <p class="sec-subtitle">Alimentación directa de entradas de cosecha y salidas a despulpadora (Kg)</p>
                </div>
              </div>
              <span class="sec-count-badge">
                {{ filteredFruits().length }} variedades
              </span>
            </div>

            <div class="cards-stream-grid">
              @for (f of filteredFruits(); track f.id) {
                <div class="touch-card fruit-card" [class.alert-border]="f.freshStockKg <= 50">
                  <div class="card-head">
                    <div class="item-identity">
                      <h3 class="item-name">{{ f.name }}</h3>
                      <span class="item-sub">{{ f.scientificName }} · Rto: {{ Math.round((f.yieldRate || 0.6) * 100) }}%</span>
                    </div>

                    <div class="item-status-pill" [class.low-stock]="f.freshStockKg <= 50">
                      {{ f.freshStockKg <= 50 ? 'Bajo Stock' : 'Disponible' }}
                    </div>
                  </div>

                  <!-- Central Big Quantity Display -->
                  <div class="card-big-stat">
                    <span class="stat-number">{{ f.freshStockKg | number:'1.0-1' }}</span>
                    <span class="stat-unit">Kg</span>
                    <span class="stat-equiv">~{{ Math.round(f.freshStockKg * (f.yieldRate || 0.6)) }} kg pulpa est.</span>
                  </div>

                  <!-- Fast Touch Keypad: Green (Entradas) & Red (Salidas) -->
                  <div class="touch-keypad">
                    <!-- Positive Entradas -->
                    <div class="keypad-row positive-row">
                      <span class="keypad-row-lbl">+ Cosecha</span>
                      <button type="button" class="kds-key-btn btn-pos" (click)="adjustFruit(f.id, f.name, 10)">+10k</button>
                      <button type="button" class="kds-key-btn btn-pos" (click)="adjustFruit(f.id, f.name, 25)">+25k</button>
                      <button type="button" class="kds-key-btn btn-pos" (click)="adjustFruit(f.id, f.name, 50)">+50k</button>
                      <button type="button" class="kds-key-btn btn-pos btn-bold" (click)="adjustFruit(f.id, f.name, 100)">+100k</button>
                    </div>

                    <!-- Negative Salidas -->
                    <div class="keypad-row negative-row">
                      <span class="keypad-row-lbl">- Merma</span>
                      <button type="button" class="kds-key-btn btn-neg" (click)="adjustFruit(f.id, f.name, -10)">-10k</button>
                      <button type="button" class="kds-key-btn btn-neg" (click)="adjustFruit(f.id, f.name, -25)">-25k</button>
                      <button type="button" class="kds-key-btn btn-neg" (click)="adjustFruit(f.id, f.name, -50)">-50k</button>
                      <button type="button" class="kds-key-btn btn-neg" (click)="adjustFruit(f.id, f.name, -100)">-100k</button>
                    </div>

                    <!-- Exact Custom Numpad Trigger Button -->
                    <button
                      type="button"
                      class="btn-exact-numpad"
                      (click)="openNumpad('fruit', f.id, f.name, f.freshStockKg, 'Kg')"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="4" y="2" width="16" height="20" rx="2"></rect>
                        <line x1="8" y1="6" x2="16" y2="6"></line>
                        <line x1="16" y1="14" x2="16" y2="18"></line>
                        <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"></path>
                      </svg>
                      <span>Ingresar Cantidad Exacta (Báscula)</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <!-- ========================================================
             PANEL 2: STOCK DE PULPAS EN CAVA (TERMINADAS EN UDS)
             ======================================================== -->
        @if (viewMode() === 'all' || viewMode() === 'pulps') {
          <section class="kds-section-panel">
            <div class="section-title-bar">
              <div class="sec-left">
                <span class="sec-icon pulp-color">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                </span>
                <div>
                  <h2 class="sec-title">Stock de Pulpas Hechas en Cava</h2>
                  <p class="sec-subtitle">Alimentación directa de producción sellada y salidas de despacho (Uds)</p>
                </div>
              </div>
              <span class="sec-count-badge">
                {{ filteredVariants().length }} presentaciones
              </span>
            </div>

            <div class="cards-stream-grid">
              @for (v of filteredVariants(); track v.variantId) {
                <div class="touch-card pulp-card" [class.alert-border]="v.currentStock <= v.minStockAlert">
                  <div class="card-head">
                    <div class="item-identity">
                      <h3 class="item-name">{{ v.fruitName }}</h3>
                      <span class="item-sub">Bolsa {{ v.grammage }}g · {{ v.category }}</span>
                    </div>

                    <div class="grammage-badge-pill">
                      {{ v.grammage }}g
                    </div>
                  </div>

                  <!-- Central Big Quantity Display -->
                  <div class="card-big-stat">
                    <span class="stat-number">{{ v.currentStock | number:'1.0-0' }}</span>
                    <span class="stat-unit">uds</span>
                    <span class="stat-equiv">
                      Mín: {{ v.minStockAlert }} uds · Total: {{ ((v.currentStock * v.grammage) / 1000) | number:'1.1-1' }} Kg
                    </span>
                  </div>

                  <!-- Fast Touch Keypad: Green (Producción) & Red (Despacho / Salida) -->
                  <div class="touch-keypad">
                    <!-- Positive Entradas -->
                    <div class="keypad-row positive-row">
                      <span class="keypad-row-lbl">+ Producido</span>
                      <button type="button" class="kds-key-btn btn-pos" (click)="adjustVariant(v.variantId, v.name, 5)">+5</button>
                      <button type="button" class="kds-key-btn btn-pos" (click)="adjustVariant(v.variantId, v.name, 10)">+10</button>
                      <button type="button" class="kds-key-btn btn-pos" (click)="adjustVariant(v.variantId, v.name, 25)">+25</button>
                      <button type="button" class="kds-key-btn btn-pos btn-bold" (click)="adjustVariant(v.variantId, v.name, 50)">+50</button>
                    </div>

                    <!-- Negative Salidas -->
                    <div class="keypad-row negative-row">
                      <span class="keypad-row-lbl">- Despacho</span>
                      <button type="button" class="kds-key-btn btn-neg" (click)="adjustVariant(v.variantId, v.name, -5)">-5</button>
                      <button type="button" class="kds-key-btn btn-neg" (click)="adjustVariant(v.variantId, v.name, -10)">-10</button>
                      <button type="button" class="kds-key-btn btn-neg" (click)="adjustVariant(v.variantId, v.name, -25)">-25</button>
                      <button type="button" class="kds-key-btn btn-neg" (click)="adjustVariant(v.variantId, v.name, -50)">-50</button>
                    </div>

                    <!-- Exact Custom Numpad Trigger Button -->
                    <button
                      type="button"
                      class="btn-exact-numpad"
                      (click)="openNumpad('variant', v.variantId, v.name, v.currentStock, 'uds')"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="4" y="2" width="16" height="20" rx="2"></rect>
                        <line x1="8" y1="6" x2="16" y2="6"></line>
                        <line x1="16" y1="14" x2="16" y2="18"></line>
                        <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"></path>
                      </svg>
                      <span>Ingresar Cantidad Exacta (Producción)</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          </section>
        }

      </main>

      <!-- ========================================================
           FOOTER TICKER: RECENT TRANSACTIONS LOG & UNDO
           ======================================================== -->
      <footer class="kds-audit-footer">
        <div class="audit-left">
          <span class="audit-pulse"></span>
          <span class="audit-title">Últimos Movimientos en Pantalla:</span>
        </div>

        <div class="audit-transactions-stream">
          @if (recentTransactions().length === 0) {
            <span class="audit-empty">No hay movimientos registrados en esta sesión. Toca los botones de las tarjetas para alimentar el inventario.</span>
          } @else {
            @for (tx of recentTransactions(); track tx.id) {
              <div class="tx-chip" [class.pos]="tx.delta > 0" [class.neg]="tx.delta < 0">
                <span class="tx-time">{{ tx.time }}</span>
                <span class="tx-name">{{ tx.name }}</span>
                <span class="tx-delta">{{ tx.delta > 0 ? '+' : '' }}{{ tx.delta }} {{ tx.unit }}</span>
                <button
                  type="button"
                  class="tx-undo-btn"
                  (click)="undoTransaction(tx)"
                  title="Deshacer este movimiento"
                >
                  ↺ Deshacer
                </button>
              </div>
            }
          }
        </div>
      </footer>

      <!-- ========================================================
           TACTILE ON-SCREEN NUMPAD MODAL (TECLADO TÁCTIL)
           ======================================================== -->
      @if (showNumpadModal()) {
        <div class="modal-backdrop" (click)="closeNumpad()">
          <div class="numpad-modal" (click)="$event.stopPropagation()">
            <div class="numpad-header">
              <div>
                <h3 class="numpad-title">{{ numpadTarget()?.name }}</h3>
                <span class="numpad-sub">
                  Stock actual: {{ numpadTarget()?.current }} {{ numpadTarget()?.unit }}
                </span>
              </div>
              <button class="numpad-close" (click)="closeNumpad()">&times;</button>
            </div>

            <!-- Operation Selector: [+] Sumar Entrada vs [-] Descontar Salida -->
            <div class="numpad-op-selector">
              <button
                type="button"
                class="op-btn op-add"
                [class.selected]="numpadSign() === 1"
                (click)="numpadSign.set(1)"
              >
                + Sumar (Entrada / Producción)
              </button>
              <button
                type="button"
                class="op-btn op-sub"
                [class.selected]="numpadSign() === -1"
                (click)="numpadSign.set(-1)"
              >
                - Descontar (Merma / Despacho)
              </button>
            </div>

            <!-- Numpad Digital Display Screen -->
            <div class="numpad-screen">
              <span class="screen-sign">{{ numpadSign() === 1 ? '+' : '-' }}</span>
              <span class="screen-number">{{ numpadBuffer() || '0' }}</span>
              <span class="screen-unit">{{ numpadTarget()?.unit }}</span>
            </div>

            <!-- Tactile Keys Grid -->
            <div class="numpad-keys-grid">
              <button type="button" class="numkey" (click)="tapDigit('1')">1</button>
              <button type="button" class="numkey" (click)="tapDigit('2')">2</button>
              <button type="button" class="numkey" (click)="tapDigit('3')">3</button>

              <button type="button" class="numkey" (click)="tapDigit('4')">4</button>
              <button type="button" class="numkey" (click)="tapDigit('5')">5</button>
              <button type="button" class="numkey" (click)="tapDigit('6')">6</button>

              <button type="button" class="numkey" (click)="tapDigit('7')">7</button>
              <button type="button" class="numkey" (click)="tapDigit('8')">8</button>
              <button type="button" class="numkey" (click)="tapDigit('9')">9</button>

              <button type="button" class="numkey numkey-clear" (click)="clearNumpad()">C</button>
              <button type="button" class="numkey" (click)="tapDigit('0')">0</button>
              <button type="button" class="numkey" (click)="tapDecimal()">.</button>
            </div>

            <!-- Quick Add Shortcut Chips -->
            <div class="numpad-shortcuts">
              <span class="shortcuts-lbl">Rápidos:</span>
              <button type="button" class="shortcut-chip" (click)="setNumpadValue(10)">10</button>
              <button type="button" class="shortcut-chip" (click)="setNumpadValue(25)">25</button>
              <button type="button" class="shortcut-chip" (click)="setNumpadValue(50)">50</button>
              <button type="button" class="shortcut-chip" (click)="setNumpadValue(100)">100</button>
              <button type="button" class="shortcut-chip" (click)="setNumpadValue(250)">250</button>
            </div>

            <!-- Confirm Action Button -->
            <div class="numpad-actions">
              <button type="button" class="btn-numpad-cancel" (click)="closeNumpad()">
                Cancelar
              </button>
              <button
                type="button"
                class="btn-numpad-confirm"
                [class.confirm-neg]="numpadSign() === -1"
                (click)="confirmNumpadAdjustment()"
              >
                ✓ Aplicar {{ numpadSign() === 1 ? '+' : '-' }}{{ numpadBuffer() || '0' }} {{ numpadTarget()?.unit }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100vw;
      min-height: 100vh;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    .kds-root {
      min-height: 100vh;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      user-select: none;
      transition: background 0.25s ease, color 0.25s ease;

      &:not(.dark-theme) {
        background: #f1f5f9;
        color: #0f172a;

        .kds-header {
          background: #ffffff;
          border-bottom-color: #e2e8f0;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        }

        .metric-card {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #1e293b;
        }

        .kds-filter-bar {
          background: #ffffff;
          border-bottom-color: #e2e8f0;
        }

        .filter-search-input {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        .fruit-chip {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #475569;

          &.active {
            background: #10b981;
            border-color: #10b981;
            color: #ffffff;
          }
        }

        .kds-section-panel {
          background: #ffffff;
          border-color: #e2e8f0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
        }

        .sec-title {
          color: #0f172a;
        }

        .touch-card {
          background: #ffffff;
          border-color: #e2e8f0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

          &:hover {
            border-color: #10b981;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
          }
        }

        .item-name {
          color: #0f172a;
        }

        .card-big-stat .stat-number {
          color: #0f172a;
        }

        .kds-audit-footer {
          background: #ffffff;
          border-top-color: #e2e8f0;
          color: #475569;
        }

        .tx-chip {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #1e293b;
        }
      }
    }

    /* HEADER */
    .kds-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 24px;
      background: #1e293b;
      border-bottom: 1.5px solid #334155;
      flex-wrap: wrap;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .kds-brand-group {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .kds-clock {
      display: flex;
      flex-direction: column;

      .clock-time {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 1.6rem;
        font-weight: 900;
        letter-spacing: -0.03em;
        line-height: 1;
        color: #10b981;
      }

      .clock-date {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
        margin-top: 2px;
      }
    }

    .kds-title-badge {
      display: flex;
      flex-direction: column;

      .badge-tag {
        font-size: 0.65rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        color: #38bdf8;
      }

      .kds-title {
        font-size: 1.15rem;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: -0.01em;
      }
    }

    /* METRICS BAR */
    .kds-metrics-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .metric-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 14px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;

      .metric-icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      &.metric-fruit .metric-icon {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
      }

      &.metric-pulp .metric-icon {
        background: rgba(56, 189, 248, 0.15);
        color: #38bdf8;
      }

      &.metric-equiv .metric-icon {
        background: rgba(168, 85, 247, 0.15);
        color: #a855f7;
      }

      &.metric-alert {
        border-color: #ef4444;
        background: rgba(239, 68, 68, 0.1);

        .metric-val {
          color: #ef4444;
        }
      }

      .metric-val {
        font-size: 1.15rem;
        font-weight: 900;
        line-height: 1;

        small {
          font-size: 0.72rem;
          font-weight: 700;
          color: #94a3b8;
        }
      }

      .metric-lbl {
        font-size: 0.68rem;
        font-weight: 600;
        color: #94a3b8;
        margin-top: 2px;
      }
    }

    /* ACTIONS GROUP */
    .kds-actions-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .kds-view-selector {
      display: inline-flex;
      background: rgba(0, 0, 0, 0.25);
      padding: 3px;
      border-radius: 10px;
      border: 1px solid #334155;

      .view-pill {
        border: none;
        background: transparent;
        color: #94a3b8;
        font-size: 0.78rem;
        font-weight: 700;
        padding: 5px 12px;
        border-radius: 7px;
        cursor: pointer;
        transition: all 0.15s ease;

        &.active {
          background: #10b981;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }
      }
    }

    .kds-tool-btn {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      border: 1px solid #334155;
      background: rgba(255, 255, 255, 0.05);
      color: #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        border-color: #64748b;
      }

      &.muted {
        color: #ef4444;
      }
    }

    .btn-exit-kds {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 7px 14px;
      background: rgba(239, 68, 68, 0.15);
      border: 1.5px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.18s ease;

      &:hover {
        background: #ef4444;
        color: #ffffff;
        border-color: #ef4444;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
      }
    }

    /* SUBBAR FILTERS */
    .kds-filter-bar {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 24px;
      background: #131d31;
      border-bottom: 1px solid #22324e;
      overflow-x: auto;
    }

    .filter-search-wrap {
      position: relative;
      width: 280px;
      flex-shrink: 0;

      svg {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #64748b;
        pointer-events: none;
      }

      .filter-search-input {
        width: 100%;
        padding: 7px 32px 7px 36px;
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 8px;
        color: #f8fafc;
        font-size: 0.82rem;
        outline: none;

        &:focus {
          border-color: #10b981;
        }
      }

      .clear-search-btn {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 1.1rem;
        cursor: pointer;
      }
    }

    .fruit-chips-scroll {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      white-space: nowrap;
      padding-bottom: 2px;
    }

    .fruit-chip {
      padding: 5px 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid #334155;
      color: #94a3b8;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }

      &.active {
        background: #10b981;
        border-color: #10b981;
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);

        .chip-badge {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }
      }

      .chip-badge {
        font-size: 0.68rem;
        padding: 1px 6px;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.3);
        color: #cbd5e1;
      }
    }

    /* MAIN CONTENT */
    .kds-main-grid {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 20px 24px;
      overflow-y: auto;
    }

    .kds-section-panel {
      background: #1e293b;
      border: 1.5px solid #334155;
      border-radius: 16px;
      padding: 18px 20px;
    }

    .section-title-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;

      .sec-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .sec-icon {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        &.fruit-color {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        &.pulp-color {
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
        }
      }

      .sec-title {
        font-size: 1.15rem;
        font-weight: 800;
        margin: 0;
        color: #ffffff;
      }

      .sec-subtitle {
        font-size: 0.78rem;
        color: #94a3b8;
        margin: 2px 0 0 0;
      }

      .sec-count-badge {
        font-size: 0.75rem;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.08);
        color: #cbd5e1;
      }
    }

    /* STREAM CARDS GRID */
    .cards-stream-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 16px;
    }

    .touch-card {
      background: #0f172a;
      border: 1.5px solid #334155;
      border-radius: 14px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.2s ease;

      &:hover {
        border-color: #10b981;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
      }

      &.alert-border {
        border-color: #ef4444 !important;
      }
    }

    .card-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;

      .item-name {
        font-size: 1.15rem;
        font-weight: 800;
        margin: 0;
        line-height: 1.2;
      }

      .item-sub {
        font-size: 0.74rem;
        color: #94a3b8;
        display: block;
        margin-top: 2px;
      }

      .item-status-pill {
        font-size: 0.7rem;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 9999px;
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.3);
        white-space: nowrap;

        &.low-stock {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.4);
        }
      }

      .grammage-badge-pill {
        font-size: 0.74rem;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 8px;
        background: rgba(168, 85, 247, 0.15);
        color: #c084fc;
        border: 1px solid rgba(168, 85, 247, 0.3);
      }
    }

    .card-big-stat {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin: 10px 0 14px 0;
      flex-wrap: wrap;

      .stat-number {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 2.2rem;
        font-weight: 900;
        line-height: 1;
        color: #ffffff;
      }

      .stat-unit {
        font-size: 1rem;
        font-weight: 800;
        color: #94a3b8;
      }

      .stat-equiv {
        font-size: 0.74rem;
        color: #64748b;
        margin-left: auto;
      }
    }

    /* KEYPAD IN CARD */
    .touch-keypad {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .keypad-row {
      display: flex;
      align-items: center;
      gap: 6px;

      .keypad-row-lbl {
        font-size: 0.65rem;
        font-weight: 800;
        text-transform: uppercase;
        width: 64px;
        flex-shrink: 0;
        letter-spacing: 0.04em;
      }

      &.positive-row .keypad-row-lbl {
        color: #10b981;
      }

      &.negative-row .keypad-row-lbl {
        color: #ef4444;
      }
    }

    .kds-key-btn {
      flex: 1;
      padding: 9px 0;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 800;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.12s ease;
      touch-action: manipulation;
      text-align: center;

      &:active {
        transform: scale(0.95);
      }

      &.btn-pos {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border-color: rgba(16, 185, 129, 0.35);

        &:hover {
          background: #10b981;
          color: #ffffff;
        }

        &.btn-bold {
          background: rgba(16, 185, 129, 0.28);
          font-weight: 900;
        }
      }

      &.btn-neg {
        background: rgba(239, 68, 68, 0.12);
        color: #f87171;
        border-color: rgba(239, 68, 68, 0.3);

        &:hover {
          background: #ef4444;
          color: #ffffff;
        }
      }
    }

    .btn-exact-numpad {
      margin-top: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px dashed #475569;
      border-radius: 8px;
      color: #94a3b8;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border-color: #94a3b8;
      }
    }

    /* FOOTER AUDIT LOG */
    .kds-audit-footer {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 24px;
      background: #1e293b;
      border-top: 1.5px solid #334155;
      font-size: 0.82rem;
      overflow-x: auto;
      white-space: nowrap;
    }

    .audit-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;

      .audit-pulse {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 10px #10b981;
      }

      .audit-title {
        font-weight: 800;
        color: #94a3b8;
      }
    }

    .audit-transactions-stream {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      overflow-x: auto;
    }

    .audit-empty {
      color: #64748b;
      font-style: italic;
      font-size: 0.78rem;
    }

    .tx-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      font-size: 0.78rem;

      .tx-time {
        font-family: monospace;
        color: #64748b;
      }

      .tx-name {
        font-weight: 700;
      }

      .tx-delta {
        font-weight: 900;
      }

      &.pos .tx-delta {
        color: #10b981;
      }

      &.neg .tx-delta {
        color: #ef4444;
      }

      .tx-undo-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;

        &:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
      }
    }

    /* NUMPAD MODAL */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }

    .numpad-modal {
      width: 100%;
      max-width: 440px;
      background: #1e293b;
      border: 1.5px solid #334155;
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .numpad-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;

      .numpad-title {
        font-size: 1.25rem;
        font-weight: 800;
        margin: 0;
      }

      .numpad-sub {
        font-size: 0.78rem;
        color: #94a3b8;
      }

      .numpad-close {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 1.6rem;
        cursor: pointer;
        line-height: 1;

        &:hover {
          color: #ffffff;
        }
      }
    }

    .numpad-op-selector {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;

      .op-btn {
        padding: 10px;
        border-radius: 10px;
        font-size: 0.85rem;
        font-weight: 800;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.15s ease;

        &.op-add {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border-color: rgba(16, 185, 129, 0.3);

          &.selected {
            background: #10b981;
            color: #ffffff;
            border-color: #10b981;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
          }
        }

        &.op-sub {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.3);

          &.selected {
            background: #ef4444;
            color: #ffffff;
            border-color: #ef4444;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
          }
        }
      }
    }

    .numpad-screen {
      background: #0f172a;
      border: 2px solid #334155;
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      align-items: baseline;
      justify-content: flex-end;
      gap: 8px;

      .screen-sign {
        font-family: monospace;
        font-size: 1.8rem;
        font-weight: 900;
        color: #94a3b8;
      }

      .screen-number {
        font-family: monospace;
        font-size: 2.5rem;
        font-weight: 900;
        color: #ffffff;
        letter-spacing: -0.02em;
      }

      .screen-unit {
        font-size: 1.1rem;
        font-weight: 800;
        color: #94a3b8;
      }
    }

    .numpad-keys-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;

      .numkey {
        padding: 16px 0;
        border-radius: 12px;
        background: #0f172a;
        border: 1px solid #334155;
        color: #ffffff;
        font-family: monospace;
        font-size: 1.6rem;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.12s ease;
        touch-action: manipulation;

        &:active {
          transform: scale(0.95);
          background: #334155;
        }

        &.numkey-clear {
          color: #ef4444;
          font-weight: 900;
        }
      }
    }

    .numpad-shortcuts {
      display: flex;
      align-items: center;
      gap: 8px;

      .shortcuts-lbl {
        font-size: 0.72rem;
        font-weight: 700;
        color: #94a3b8;
      }

      .shortcut-chip {
        padding: 4px 10px;
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 6px;
        color: #cbd5e1;
        font-size: 0.78rem;
        font-weight: 800;
        cursor: pointer;

        &:hover {
          background: #334155;
          color: #ffffff;
        }
      }
    }

    .numpad-actions {
      display: flex;
      gap: 12px;
      margin-top: 4px;

      .btn-numpad-cancel {
        flex: 1;
        padding: 12px;
        border-radius: 10px;
        background: transparent;
        border: 1.5px solid #475569;
        color: #cbd5e1;
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;

        &:hover {
          background: rgba(255, 255, 255, 0.05);
        }
      }

      .btn-numpad-confirm {
        flex: 2;
        padding: 12px;
        border-radius: 10px;
        background: #10b981;
        border: none;
        color: #ffffff;
        font-size: 0.95rem;
        font-weight: 900;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
        transition: all 0.15s ease;

        &:hover {
          background: #059669;
        }

        &.confirm-neg {
          background: #ef4444;
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);

          &:hover {
            background: #dc2626;
          }
        }
      }
    }
  `]
})
export class KdsInventoryComponent implements OnInit, OnDestroy {
  readonly stateService = inject(StateService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  readonly Math = Math;

  // View state
  readonly isDarkTheme = signal<boolean>(true);
  readonly soundEnabled = signal<boolean>(true);
  readonly viewMode = signal<'all' | 'fruits' | 'pulps'>('all');
  readonly searchQuery = signal<string>('');
  readonly selectedFruitFilter = signal<string>('ALL');

  // Clock
  readonly currentTime = signal<string>('');
  readonly currentDate = signal<string>('');
  private clockInterval?: any;

  // Audio Context for synthesized sound feedback
  private audioCtx?: AudioContext;

  // Audit transaction history
  readonly recentTransactions = signal<InventoryTransaction[]>([]);

  // Numpad Modal State
  readonly showNumpadModal = signal<boolean>(false);
  readonly numpadSign = signal<1 | -1>(1);
  readonly numpadBuffer = signal<string>('');
  readonly numpadTarget = signal<{
    type: 'fruit' | 'variant';
    id: string | number;
    name: string;
    current: number;
    unit: 'Kg' | 'uds';
  } | null>(null);

  // Computeds
  readonly totalPulpUnits = computed(() => {
    return this.stateService.productVariants().reduce((acc, v) => acc + (v.currentStock || 0), 0);
  });

  readonly estimatedPulpKg = computed(() => {
    return Math.round(this.stateService.totalFreshStockKg() * 0.62);
  });

  readonly lowStockFruitsCount = computed(() => {
    return this.stateService.fruits().filter(f => (f.freshStockKg || 0) <= 50).length;
  });

  readonly filteredFruits = computed(() => {
    let list = this.stateService.fruits();
    const sel = this.selectedFruitFilter();
    if (sel !== 'ALL') {
      list = list.filter(f => f.id === sel);
    }
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        (f.scientificName && f.scientificName.toLowerCase().includes(q))
      );
    }
    return list;
  });

  readonly filteredVariants = computed(() => {
    let list = this.stateService.productVariants();
    const sel = this.selectedFruitFilter();
    if (sel !== 'ALL') {
      const fruitObj = this.stateService.fruits().find(f => f.id === sel);
      if (fruitObj) {
        list = list.filter(v => v.fruitName.toLowerCase() === fruitObj.name.toLowerCase());
      }
    }
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.fruitName.toLowerCase().includes(q) ||
        v.sku.toLowerCase().includes(q) ||
        String(v.grammage).includes(q)
      );
    }
    return list;
  });

  ngOnInit() {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
    }
  }

  private updateClock() {
    const now = new Date();
    this.currentTime.set(
      now.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    );
    this.currentDate.set(
      now.toLocaleDateString('es-CO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      })
    );
  }

  // ==========================================
  // AUDIO SYNTHESIS
  // ==========================================
  private playSound(tone: 'positive' | 'negative' | 'undo' | 'bell') {
    if (!this.soundEnabled()) return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;

      if (tone === 'positive') {
        // High ascending chime
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (tone === 'negative') {
        // Lower tone
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(293.66, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (tone === 'undo') {
        // Double blip
        osc.frequency.setValueAtTime(350, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch {
      // Audio not permitted without interaction
    }
  }

  // ==========================================
  // QUICK TOUCH ADJUSTMENTS
  // ==========================================
  adjustFruit(fruitId: string, fruitName: string, deltaKg: number) {
    this.stateService.adjustFreshFruitStock(fruitId, deltaKg);
    this.playSound(deltaKg > 0 ? 'positive' : 'negative');

    this.pushTransaction({
      id: `${Date.now()}-${Math.random()}`,
      time: this.currentTime(),
      type: 'fruit',
      targetId: fruitId,
      name: fruitName,
      detail: 'Fruta Fresca',
      delta: deltaKg,
      unit: 'Kg'
    });
  }

  adjustVariant(variantId: number, variantName: string, deltaUnits: number) {
    this.stateService.adjustVariantStock(variantId, deltaUnits);
    this.playSound(deltaUnits > 0 ? 'positive' : 'negative');

    this.pushTransaction({
      id: `${Date.now()}-${Math.random()}`,
      time: this.currentTime(),
      type: 'variant',
      targetId: variantId,
      name: variantName,
      detail: 'Pulpa Terminada',
      delta: deltaUnits,
      unit: 'uds'
    });
  }

  private pushTransaction(tx: InventoryTransaction) {
    this.recentTransactions.update(list => [tx, ...list.slice(0, 9)]);
  }

  undoTransaction(tx: InventoryTransaction) {
    const reverseDelta = -tx.delta;
    if (tx.type === 'fruit') {
      this.stateService.adjustFreshFruitStock(String(tx.targetId), reverseDelta);
    } else {
      this.stateService.adjustVariantStock(Number(tx.targetId), reverseDelta);
    }

    this.playSound('undo');
    this.recentTransactions.update(list => list.filter(item => item.id !== tx.id));
    this.notification.info('Movimiento Deshecho', `Se revirtió ${tx.name}: ${reverseDelta > 0 ? '+' : ''}${reverseDelta} ${tx.unit}`);
  }

  // ==========================================
  // NUMPAD MODAL
  // ==========================================
  openNumpad(type: 'fruit' | 'variant', id: string | number, name: string, current: number, unit: 'Kg' | 'uds') {
    this.numpadTarget.set({ type, id, name, current, unit });
    this.numpadSign.set(1);
    this.numpadBuffer.set('');
    this.showNumpadModal.set(true);
  }

  closeNumpad() {
    this.showNumpadModal.set(false);
    this.numpadTarget.set(null);
  }

  tapDigit(d: string) {
    const curr = this.numpadBuffer();
    if (curr.length >= 7) return;
    this.numpadBuffer.set(curr + d);
  }

  tapDecimal() {
    const curr = this.numpadBuffer();
    if (!curr.includes('.')) {
      this.numpadBuffer.set(curr ? curr + '.' : '0.');
    }
  }

  clearNumpad() {
    this.numpadBuffer.set('');
  }

  setNumpadValue(val: number) {
    this.numpadBuffer.set(String(val));
  }

  confirmNumpadAdjustment() {
    const rawVal = parseFloat(this.numpadBuffer() || '0');
    if (isNaN(rawVal) || rawVal <= 0) {
      this.notification.warning('Valor Requerido', 'Ingresa una cantidad mayor a cero.');
      return;
    }

    const target = this.numpadTarget();
    if (!target) return;

    const finalDelta = rawVal * this.numpadSign();

    if (target.type === 'fruit') {
      this.adjustFruit(String(target.id), target.name, finalDelta);
    } else {
      this.adjustVariant(Number(target.id), target.name, Math.round(finalDelta));
    }

    if (finalDelta > 0 && rawVal >= 100) {
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
    }

    this.closeNumpad();
  }

  // ==========================================
  // CONTROLS & NAVIGATION
  // ==========================================
  toggleSound() {
    this.soundEnabled.update(s => !s);
  }

  toggleTheme() {
    this.isDarkTheme.update(t => !t);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  exitKds() {
    this.router.navigate(['/settings'], { queryParams: { tab: 'inventory' } });
  }
}
