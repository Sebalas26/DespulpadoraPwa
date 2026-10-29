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
import { FruitConfig, ProductVariantDto } from '../../../core/models/business.models';
import confetti from 'canvas-confetti';

/**
 * Represents an inventory adjustment audit transaction in the KDS view.
 */
export interface InventoryTransaction {
  id: string;
  time: string;
  type: 'fruit' | 'variant';
  targetId: string | number;
  name: string;
  detail: string;
  delta: number;
  unit: 'Kg' | 'uds';
}

/**
 * Represents the target item selected in the touch numpad modal.
 */
export interface NumpadTargetItem {
  type: 'fruit' | 'variant';
  id: string | number;
  name: string;
  current: number;
  unit: 'Kg' | 'uds';
}

/**
 * Extended Window interface supporting legacy webkitAudioContext.
 */
interface AudioContextWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

/**
 * Touch-first Kitchen Display System (KDS) component for real-time plant and cold storage inventory control.
 */
@Component({
  selector: 'app-kds-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="kds-root" [class.dark-theme]="isDarkTheme()">
            <header class="kds-header">
                <div class="kds-brand-group">
          <div class="kds-clock">
            <span class="clock-time">{{ currentTime() }}</span>
            <span class="clock-date">{{ currentDate() }}</span>
          </div>
          <div class="kds-title-badge">
            <span class="badge-tag">KDS PLANTA & INVENTARIO</span>
            <span class="kds-title">Alimentación de Inventario & Stock</span>
          </div>
        </div>

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
              <div class="metric-lbl">Pulpas en Inventario</div>
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

                <div class="kds-actions-group">
                    <div class="kds-view-selector">
            <button
              type="button"
              class="view-pill"
              [class.active]="viewMode() === 'all'"
              (click)="viewMode.set('all')"
              title="Ver Fruta fresca y Pulpas en inventario"
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

            @if (isLoading()) {
        <div class="dgl-shimmer-wrapper" style="padding: 16px 24px;">
          <div class="shimmer-card-grid">
            @for (item of [1, 2, 3, 4, 5, 6]; track item) {
              <div class="shimmer-card" style="gap: 14px;">
                <div class="shimmer-title" style="width: 60%;"></div>
                <div class="shimmer-subtitle" style="width: 45%;"></div>
                <div class="shimmer-box" style="height: 84px; border-radius: 12px;"></div>
              </div>
            }
          </div>
        </div>
      }

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

            <main class="kds-main-grid">

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
                      <span class="item-sub">{{ f.scientificName }} · Rto: {{ Math.round(f.yieldRate * 100) }}%</span>
                    </div>

                    <div class="item-status-pill" [class.low-stock]="f.freshStockKg <= 50">
                      {{ f.freshStockKg <= 50 ? 'Bajo Stock' : 'Disponible' }}
                    </div>
                  </div>

                                    <div class="card-big-stat">
                    <span class="stat-number">{{ f.freshStockKg | number:'1.0-1' }}</span>
                    <span class="stat-unit">Kg</span>
                    <span class="stat-equiv">~{{ Math.round(f.freshStockKg * f.yieldRate) }} kg pulpa est.</span>
                  </div>

                                    <div class="touch-keypad">
                                        <div class="keypad-row positive-row">
                      <span class="keypad-row-lbl">+ Cosecha</span>
                      <button type="button" class="kds-key-btn btn-pos" (click)="adjustFruit(f.id, f.name, 10)">+10k</button>
                      <button type="button" class="kds-key-btn btn-pos" (click)="adjustFruit(f.id, f.name, 25)">+25k</button>
                      <button type="button" class="kds-key-btn btn-pos" (click)="adjustFruit(f.id, f.name, 50)">+50k</button>
                      <button type="button" class="kds-key-btn btn-pos btn-bold" (click)="adjustFruit(f.id, f.name, 100)">+100k</button>
                    </div>

                                        <div class="keypad-row negative-row">
                      <span class="keypad-row-lbl">- Merma</span>
                      <button type="button" class="kds-key-btn btn-neg" (click)="adjustFruit(f.id, f.name, -10)">-10k</button>
                      <button type="button" class="kds-key-btn btn-neg" (click)="adjustFruit(f.id, f.name, -25)">-25k</button>
                      <button type="button" class="kds-key-btn btn-neg" (click)="adjustFruit(f.id, f.name, -50)">-50k</button>
                      <button type="button" class="kds-key-btn btn-neg" (click)="adjustFruit(f.id, f.name, -100)">-100k</button>
                    </div>

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
                  <h2 class="sec-title">Stock de Pulpas Hechas en Inventario</h2>
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

                                    <div class="card-big-stat">
                    <span class="stat-number">{{ v.currentStock | number:'1.0-0' }}</span>
                    <span class="stat-unit">uds</span>
                    <span class="stat-equiv">
                      Mín: {{ v.minStockAlert }} uds · Total: {{ ((v.currentStock * v.grammage) / 1000) | number:'1.1-1' }} Kg
                    </span>
                  </div>

                                    <div class="touch-keypad">
                                        <div class="keypad-row positive-row">
                      <span class="keypad-row-lbl">+ Producido</span>
                      <button type="button" class="kds-key-btn btn-pos" (click)="adjustVariant(v.variantId, v.name, 5)">+5</button>
                      <button type="button" class="kds-key-btn btn-pos" (click)="adjustVariant(v.variantId, v.name, 10)">+10</button>
                      <button type="button" class="kds-key-btn btn-pos" (click)="adjustVariant(v.variantId, v.name, 25)">+25</button>
                      <button type="button" class="kds-key-btn btn-pos btn-bold" (click)="adjustVariant(v.variantId, v.name, 50)">+50</button>
                    </div>

                                        <div class="keypad-row negative-row">
                      <span class="keypad-row-lbl">- Despacho</span>
                      <button type="button" class="kds-key-btn btn-neg" (click)="adjustVariant(v.variantId, v.name, -5)">-5</button>
                      <button type="button" class="kds-key-btn btn-neg" (click)="adjustVariant(v.variantId, v.name, -10)">-10</button>
                      <button type="button" class="kds-key-btn btn-neg" (click)="adjustVariant(v.variantId, v.name, -25)">-25</button>
                      <button type="button" class="kds-key-btn btn-neg" (click)="adjustVariant(v.variantId, v.name, -50)">-50</button>
                    </div>

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

                        <div class="numpad-screen">
              <span class="screen-sign">{{ numpadSign() === 1 ? '+' : '-' }}</span>
              <span class="screen-number">{{ numpadBuffer() || '0' }}</span>
              <span class="screen-unit">{{ numpadTarget()?.unit }}</span>
            </div>

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

                        <div class="numpad-shortcuts">
              <span class="shortcuts-lbl">Rápidos:</span>
              <button type="button" class="shortcut-chip" (click)="setNumpadValue(10)">10</button>
              <button type="button" class="shortcut-chip" (click)="setNumpadValue(25)">25</button>
              <button type="button" class="shortcut-chip" (click)="setNumpadValue(50)">50</button>
              <button type="button" class="shortcut-chip" (click)="setNumpadValue(100)">100</button>
              <button type="button" class="shortcut-chip" (click)="setNumpadValue(250)">250</button>
            </div>

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
      background: #f6f8f7;
      color: #111827;
      display: flex;
      flex-direction: column;
      user-select: none;
      transition: background 0.25s ease, color 0.25s ease;

      &.dark-theme {
        background: #0f172a;
        color: #f8fafc;

        .kds-header {
          background: #1e293b;
          border-bottom-color: #334155;
          box-shadow: none;
        }

        .kds-clock .clock-time {
          color: #4ade80;
        }

        .kds-clock .clock-date {
          color: #94a3b8;
        }

        .kds-title-badge .badge-tag {
          color: #4ade80;
        }

        .kds-title-badge .kds-title {
          color: #f8fafc;
        }

        .metric-card {
          background: #0f172a;
          border-color: #334155;
          color: #f8fafc;

          .metric-val {
            color: #f8fafc;

            small {
              color: #94a3b8;
            }
          }

          .metric-lbl {
            color: #94a3b8;
          }
        }

        .kds-view-selector {
          background: #0f172a;
          border-color: #334155;

          .view-pill {
            color: #94a3b8;

            &.active {
              background: #1e5e3a;
              color: #ffffff;
            }
          }
        }

        .kds-tool-btn {
          background: #0f172a;
          border-color: #334155;
          color: #cbd5e1;

          &:hover {
            background: #334155;
            color: #ffffff;
          }
        }

        .kds-filter-bar {
          background: #131d31;
          border-bottom-color: #22324e;
        }

        .filter-search-wrap .filter-search-input {
          background: #0f172a;
          border-color: #334155;
          color: #f8fafc;
        }

        .fruit-chip {
          background: #1e293b;
          border-color: #334155;
          color: #cbd5e1;

          &.active {
            background: #1e5e3a;
            border-color: #1e5e3a;
            color: #ffffff;
          }

          .chip-badge {
            background: rgba(0, 0, 0, 0.35);
            color: #cbd5e1;
          }
        }

        .kds-section-panel {
          background: #1e293b;
          border-color: #334155;
        }

        .section-title-bar {
          .sec-title {
            color: #f8fafc;
          }

          .sec-subtitle {
            color: #94a3b8;
          }

          .sec-count-badge {
            background: #0f172a;
            border-color: #334155;
            color: #cbd5e1;
          }
        }

        .touch-card {
          background: #0f172a;
          border-color: #334155;

          .item-name {
            color: #f8fafc;
          }

          .item-sub {
            color: #94a3b8;
          }

          .card-big-stat .stat-number {
            color: #f8fafc;
          }
        }

        .btn-exact-numpad {
          background: rgba(255, 255, 255, 0.04);
          border-color: #475569;
          color: #cbd5e1;

          &:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #ffffff;
          }
        }

        .kds-audit-footer {
          background: #1e293b;
          border-top-color: #334155;
          color: #94a3b8;
        }

        .tx-chip {
          background: #0f172a;
          border-color: #334155;
          color: #f8fafc;
        }

        .numpad-modal {
          background: #1e293b;
          border-color: #334155;
          color: #f8fafc;

          .numpad-title {
            color: #f8fafc;
          }

          .numpad-screen {
            background: #0f172a;
            border-color: #334155;

            .screen-number {
              color: #ffffff;
            }
          }

          .numkey {
            background: #0f172a;
            border-color: #334155;
            color: #ffffff;
          }

          .shortcut-chip {
            background: #0f172a;
            border-color: #334155;
            color: #cbd5e1;
          }
        }
      }
    }

    .kds-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 24px;
      background: #ffffff;
      border-bottom: 1px solid #eef2ef;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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
      padding-right: 16px;
      border-right: 1px solid #e5e7eb;

      .clock-time {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 1.55rem;
        font-weight: 900;
        letter-spacing: -0.03em;
        line-height: 1;
        color: #111827;
      }

      .clock-date {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #6b7280;
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
        color: #1e5e3a;
      }

      .kds-title {
        font-size: 1.15rem;
        font-weight: 800;
        color: #111827;
        letter-spacing: -0.01em;
      }
    }

    .kds-metrics-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .metric-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 14px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);

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
        background: #eaf5ee;
        color: #1e5e3a;
      }

      &.metric-pulp .metric-icon {
        background: #eff6ff;
        color: #2563eb;
      }

      &.metric-equiv .metric-icon {
        background: #f5f3ff;
        color: #7c3aed;
      }

      &.metric-alert {
        border-color: #fecaca;
        background: #fef2f2;

        .metric-val {
          color: #dc2626;
        }
      }

      .metric-val {
        font-size: 1.15rem;
        font-weight: 900;
        line-height: 1;
        color: #111827;

        small {
          font-size: 0.72rem;
          font-weight: 700;
          color: #6b7280;
        }
      }

      .metric-lbl {
        font-size: 0.68rem;
        font-weight: 600;
        color: #6b7280;
        margin-top: 2px;
      }
    }

    .kds-actions-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .kds-view-selector {
      display: inline-flex;
      background: #f3f4f6;
      padding: 2px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;

      .view-pill {
        border: none;
        background: transparent;
        color: #6b7280;
        font-size: 0.78rem;
        font-weight: 600;
        padding: 5px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;

        &.active {
          background: #ffffff;
          color: #1e5e3a;
          font-weight: 700;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
      }
    }

    .kds-tool-btn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: #ffffff;
      color: #4b5563;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #f9fafb;
        color: #111827;
        border-color: #d1d5db;
      }

      &.muted {
        color: #dc2626;
        border-color: #fecaca;
        background: #fef2f2;
      }
    }

    .btn-exit-kds {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      background: #ffffff;
      border: 1px solid #fecaca;
      color: #dc2626;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.18s ease;

      &:hover {
        background: #dc2626;
        color: #ffffff;
        border-color: #dc2626;
      }
    }

    .kds-filter-bar {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 24px;
      background: #ffffff;
      border-bottom: 1px solid #eef2ef;
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
        color: #9ca3af;
        pointer-events: none;
      }

      .filter-search-input {
        width: 100%;
        padding: 7px 32px 7px 36px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        color: #111827;
        font-size: 0.82rem;
        outline: none;

        &:focus {
          border-color: #1e5e3a;
          background: #ffffff;
        }
      }

      .clear-search-btn {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #6b7280;
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
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      color: #374151;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;

      &:hover {
        background: #e5e7eb;
        color: #111827;
      }

      &.active {
        background: #1e5e3a;
        border-color: #1e5e3a;
        color: #ffffff;
        box-shadow: 0 2px 6px rgba(30, 94, 58, 0.25);

        .chip-badge {
          background: rgba(255, 255, 255, 0.22);
          color: #ffffff;
        }
      }

      .chip-badge {
        font-size: 0.68rem;
        padding: 1px 6px;
        border-radius: 8px;
        background: #ffffff;
        color: #374151;
      }
    }

    .kds-main-grid {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 20px 24px;
      overflow-y: auto;
    }

    .kds-section-panel {
      background: #f8faf8;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
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
          background: #eaf5ee;
          color: #1e5e3a;
        }

        &.pulp-color {
          background: #eff6ff;
          color: #2563eb;
        }
      }

      .sec-title {
        font-size: 1.1rem;
        font-weight: 800;
        margin: 0;
        color: #111827;
      }

      .sec-subtitle {
        font-size: 0.78rem;
        color: #6b7280;
        margin: 2px 0 0 0;
      }

      .sec-count-badge {
        font-size: 0.75rem;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 9999px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        color: #374151;
      }
    }

    .cards-stream-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 16px;
    }

    .touch-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease;

      &:hover {
        border-color: #1e5e3a;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.07);
      }

      &.alert-border {
        border: 1.5px solid #ef4444 !important;
      }
    }

    .card-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;

      .item-name {
        font-size: 1.1rem;
        font-weight: 800;
        margin: 0;
        line-height: 1.2;
        color: #111827;
      }

      .item-sub {
        font-size: 0.74rem;
        color: #6b7280;
        display: block;
        margin-top: 2px;
      }

      .item-status-pill {
        font-size: 0.7rem;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 9999px;
        background: #eaf5ee;
        color: #1e5e3a;
        border: 1px solid #d1e7d8;
        white-space: nowrap;

        &.low-stock {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
        }
      }

      .grammage-badge-pill {
        font-size: 0.74rem;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 8px;
        background: #f5f3ff;
        color: #7c3aed;
        border: 1px solid #ddd6fe;
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
        font-size: 2.1rem;
        font-weight: 900;
        line-height: 1;
        color: #111827;
      }

      .stat-unit {
        font-size: 0.95rem;
        font-weight: 800;
        color: #6b7280;
      }

      .stat-equiv {
        font-size: 0.74rem;
        color: #6b7280;
        margin-left: auto;
      }
    }

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
        color: #1e5e3a;
      }

      &.negative-row .keypad-row-lbl {
        color: #dc2626;
      }
    }

    .kds-key-btn {
      flex: 1;
      padding: 8px 0;
      border-radius: 8px;
      font-size: 0.8rem;
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
        background: #eaf5ee;
        color: #1e5e3a;
        border-color: #d1e7d8;

        &:hover {
          background: #1e5e3a;
          color: #ffffff;
        }

        &.btn-bold {
          background: #dcfce7;
          font-weight: 900;
        }
      }

      &.btn-neg {
        background: #fef2f2;
        color: #dc2626;
        border-color: #fecaca;

        &:hover {
          background: #dc2626;
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
      background: #f9fafb;
      border: 1px dashed #d1d5db;
      border-radius: 8px;
      color: #4b5563;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #f3f4f6;
        color: #111827;
        border-color: #9ca3af;
      }
    }

    .kds-audit-footer {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 24px;
      background: #ffffff;
      border-top: 1px solid #eef2ef;
      font-size: 0.82rem;
      overflow-x: auto;
      white-space: nowrap;
      color: #4b5563;
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
        background: #1e5e3a;
        box-shadow: 0 0 8px rgba(30, 94, 58, 0.5);
      }

      .audit-title {
        font-weight: 800;
        color: #374151;
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
      color: #6b7280;
      font-style: italic;
      font-size: 0.78rem;
    }

    .tx-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 0.78rem;
      color: #111827;

      .tx-time {
        font-family: monospace;
        color: #6b7280;
      }

      .tx-name {
        font-weight: 700;
      }

      .tx-delta {
        font-weight: 900;
      }

      &.pos .tx-delta {
        color: #1e5e3a;
      }

      &.neg .tx-delta {
        color: #dc2626;
      }

      .tx-undo-btn {
        background: transparent;
        border: none;
        color: #6b7280;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;

        &:hover {
          background: #e5e7eb;
          color: #111827;
        }
      }
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(17, 24, 39, 0.45);
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
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18);
      display: flex;
      flex-direction: column;
      gap: 16px;
      color: #111827;
    }

    .numpad-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;

      .numpad-title {
        font-size: 1.25rem;
        font-weight: 800;
        margin: 0;
        color: #111827;
      }

      .numpad-sub {
        font-size: 0.78rem;
        color: #6b7280;
      }

      .numpad-close {
        background: none;
        border: none;
        color: #6b7280;
        font-size: 1.6rem;
        cursor: pointer;
        line-height: 1;

        &:hover {
          color: #111827;
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
        border: 1.5px solid transparent;
        transition: all 0.15s ease;

        &.op-add {
          background: #eaf5ee;
          color: #1e5e3a;
          border-color: #d1e7d8;

          &.selected {
            background: #1e5e3a;
            color: #ffffff;
            border-color: #1e5e3a;
            box-shadow: 0 4px 12px rgba(30, 94, 58, 0.25);
          }
        }

        &.op-sub {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;

          &.selected {
            background: #dc2626;
            color: #ffffff;
            border-color: #dc2626;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
          }
        }
      }
    }

    .numpad-screen {
      background: #f9fafb;
      border: 1.5px solid #e5e7eb;
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
        color: #6b7280;
      }

      .screen-number {
        font-family: monospace;
        font-size: 2.5rem;
        font-weight: 900;
        color: #111827;
        letter-spacing: -0.02em;
      }

      .screen-unit {
        font-size: 1.1rem;
        font-weight: 800;
        color: #6b7280;
      }
    }

    .numpad-keys-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;

      .numkey {
        padding: 14px 0;
        border-radius: 12px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        color: #111827;
        font-family: monospace;
        font-size: 1.5rem;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.12s ease;
        touch-action: manipulation;

        &:hover {
          background: #f3f4f6;
        }

        &:active {
          transform: scale(0.95);
          background: #e5e7eb;
        }

        &.numkey-clear {
          color: #dc2626;
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
        color: #6b7280;
      }

      .shortcut-chip {
        padding: 4px 10px;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        color: #374151;
        font-size: 0.78rem;
        font-weight: 800;
        cursor: pointer;

        &:hover {
          background: #e5e7eb;
          color: #111827;
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
        background: #ffffff;
        border: 1px solid #d1d5db;
        color: #374151;
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;

        &:hover {
          background: #f9fafb;
        }
      }

      .btn-numpad-confirm {
        flex: 2;
        padding: 12px;
        border-radius: 10px;
        background: #1e5e3a;
        border: none;
        color: #ffffff;
        font-size: 0.95rem;
        font-weight: 900;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(30, 94, 58, 0.28);
        transition: all 0.15s ease;

        &:hover {
          background: #164a2d;
        }

        &.confirm-neg {
          background: #dc2626;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.28);

          &:hover {
            background: #b91c1c;
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

  readonly isDarkTheme = signal<boolean>(false);
  readonly soundEnabled = signal<boolean>(true);
  readonly viewMode = signal<'all' | 'fruits' | 'pulps'>('all');
  readonly searchQuery = signal<string>('');
  readonly selectedFruitFilter = signal<string>('ALL');

  readonly currentTime = signal<string>('');
  readonly currentDate = signal<string>('');
  private clockInterval?: ReturnType<typeof setInterval>;

  private audioCtx?: AudioContext;

  readonly recentTransactions = signal<InventoryTransaction[]>([]);

  readonly showNumpadModal = signal<boolean>(false);
  readonly numpadSign = signal<1 | -1>(1);
  readonly numpadBuffer = signal<string>('');
  readonly numpadTarget = signal<NumpadTargetItem | null>(null);

  readonly totalPulpUnits = computed<number>(() => {
    try {
      return this.stateService.productVariants().reduce(
        (acc: number, v: ProductVariantDto) => acc + (v.currentStock || 0),
        0
      );
    } catch (error: unknown) {
      console.error('Error computing total pulp units:', error);
      return 0;
    }
  });

  readonly estimatedPulpKg = computed<number>(() => {
    try {
      return Math.round(
        this.stateService.fruits().reduce(
          (acc: number, f: FruitConfig) => acc + (f.freshStockKg || 0) * (f.yieldRate ?? 0),
          0
        )
      );
    } catch (error: unknown) {
      console.error('Error computing estimated pulp kg:', error);
      return 0;
    }
  });

  readonly lowStockFruitsCount = computed<number>(() => {
    try {
      return this.stateService.fruits().filter((f: FruitConfig) => (f.freshStockKg || 0) <= 50).length;
    } catch (error: unknown) {
      console.error('Error computing low stock fruits count:', error);
      return 0;
    }
  });

  readonly isLoading = computed<boolean>(() => {
    try {
      return typeof this.stateService.isLoading === 'function' ? this.stateService.isLoading() : false;
    } catch {
      return false;
    }
  });

  readonly filteredFruits = computed<FruitConfig[]>(() => {
    try {
      let list = this.stateService.fruits();
      const sel = this.selectedFruitFilter();
      if (sel !== 'ALL') {
        list = list.filter((f: FruitConfig) => String(f.id) === String(sel));
      }
      const q = this.searchQuery().trim().toLowerCase();
      if (q) {
        list = list.filter((f: FruitConfig) =>
          f.name.toLowerCase().includes(q) ||
          Boolean(f.scientificName && f.scientificName.toLowerCase().includes(q))
        );
      }
      return list;
    } catch (error: unknown) {
      console.error('Error computing filtered fruits:', error);
      return [];
    }
  });

  readonly filteredVariants = computed<ProductVariantDto[]>(() => {
    try {
      let list = this.stateService.productVariants();
      const sel = this.selectedFruitFilter();
      if (sel !== 'ALL') {
        const fruitObj = this.stateService.fruits().find((f: FruitConfig) => String(f.id) === String(sel));
        if (fruitObj) {
          list = list.filter((v: ProductVariantDto) => v.fruitName.toLowerCase() === fruitObj.name.toLowerCase());
        }
      }
      const q = this.searchQuery().trim().toLowerCase();
      if (q) {
        list = list.filter((v: ProductVariantDto) =>
          v.name.toLowerCase().includes(q) ||
          v.fruitName.toLowerCase().includes(q) ||
          v.sku.toLowerCase().includes(q) ||
          String(v.grammage).includes(q)
        );
      }
      return list;
    } catch (error: unknown) {
      console.error('Error computing filtered variants:', error);
      return [];
    }
  });

  /**
   * Starts the live digital clock interval on component initialization.
   */
  ngOnInit(): void {
    try {
      const savedTheme = localStorage.getItem('despulpadora_kds_theme');
      if (savedTheme === 'dark') {
        this.isDarkTheme.set(true);
      } else {
        this.isDarkTheme.set(false);
      }
      this.stateService.refreshAll?.();
      this.updateClock();
      this.clockInterval = setInterval(() => this.updateClock(), 1000);
    } catch (error: unknown) {
      console.error('Error initializing KdsInventoryComponent:', error);
    }
  }

  /**
   * Clears the clock interval and closes the audio context on destruction.
   */
  ngOnDestroy(): void {
    try {
      if (this.clockInterval) {
        clearInterval(this.clockInterval);
      }
      if (this.audioCtx) {
        this.audioCtx.close().catch(() => undefined);
      }
    } catch (error: unknown) {
      console.error('Error destroying KdsInventoryComponent:', error);
    }
  }

  /**
   * Updates the current time and date signals formatted for Colombia locale.
   */
  private updateClock(): void {
    try {
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
    } catch (error: unknown) {
      console.error('Error updating KDS inventory clock:', error);
    }
  }

  /**
   * Synthesizes tactile audio feedback for inventory adjustments.
   */
  private playSound(tone: 'positive' | 'negative' | 'undo' | 'bell'): void {
    try {
      if (!this.soundEnabled()) return;
      if (!this.audioCtx) {
        const audioWin = window as unknown as AudioContextWindow;
        const AudioContextClass = window.AudioContext || audioWin.webkitAudioContext;
        if (!AudioContextClass) return;
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
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (tone === 'negative') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(293.66, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (tone === 'undo') {
        osc.frequency.setValueAtTime(350, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch {
      return;
    }
  }

  /**
   * Adjusts the fresh fruit stock in kilograms and records an audit transaction.
   */
  adjustFruit(fruitId: string | number, fruitName: string, deltaKg: number): void {
    try {
      this.stateService.adjustFreshFruitStock(String(fruitId), deltaKg);
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
    } catch (error: unknown) {
      console.error('Error adjusting fruit stock:', error);
    }
  }

  /**
   * Adjusts the finished pulp variant stock in units and records an audit transaction.
   */
  adjustVariant(variantId: number, variantName: string, deltaUnits: number): void {
    try {
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
    } catch (error: unknown) {
      console.error('Error adjusting variant stock:', error);
    }
  }

  /**
   * Prepends a transaction to the recent transactions log (keeping up to 10 entries).
   */
  private pushTransaction(tx: InventoryTransaction): void {
    try {
      this.recentTransactions.update((list: InventoryTransaction[]) => [tx, ...list.slice(0, 9)]);
    } catch (error: unknown) {
      console.error('Error pushing transaction:', error);
    }
  }

  /**
   * Reverts a previously recorded inventory adjustment transaction.
   */
  undoTransaction(tx: InventoryTransaction): void {
    try {
      const reverseDelta = -tx.delta;
      if (tx.type === 'fruit') {
        this.stateService.adjustFreshFruitStock(String(tx.targetId), reverseDelta);
      } else {
        this.stateService.adjustVariantStock(Number(tx.targetId), reverseDelta);
      }

      this.playSound('undo');
      this.recentTransactions.update((list: InventoryTransaction[]) =>
        list.filter((item: InventoryTransaction) => item.id !== tx.id)
      );
      this.notification.info(
        'Movimiento Deshecho',
        `Se revirtió ${tx.name}: ${reverseDelta > 0 ? '+' : ''}${reverseDelta} ${tx.unit}`
      );
    } catch (error: unknown) {
      console.error('Error undoing transaction:', error);
    }
  }

  /**
   * Opens the custom quantity numpad modal for a fruit or pulp variant.
   */
  openNumpad(
    type: 'fruit' | 'variant',
    id: string | number,
    name: string,
    current: number,
    unit: 'Kg' | 'uds'
  ): void {
    try {
      this.numpadTarget.set({ type, id, name, current, unit });
      this.numpadSign.set(1);
      this.numpadBuffer.set('');
      this.showNumpadModal.set(true);
    } catch (error: unknown) {
      console.error('Error opening numpad:', error);
    }
  }

  /**
   * Closes the custom quantity numpad modal.
   */
  closeNumpad(): void {
    try {
      this.showNumpadModal.set(false);
      this.numpadTarget.set(null);
    } catch (error: unknown) {
      console.error('Error closing numpad:', error);
    }
  }

  /**
   * Appends a digit to the numpad input buffer.
   */
  tapDigit(d: string): void {
    try {
      const curr = this.numpadBuffer();
      if (curr.length >= 7) return;
      this.numpadBuffer.set(curr + d);
    } catch (error: unknown) {
      console.error('Error tapping digit:', error);
    }
  }

  /**
   * Appends a decimal point to the numpad input buffer if not already present.
   */
  tapDecimal(): void {
    try {
      const curr = this.numpadBuffer();
      if (!curr.includes('.')) {
        this.numpadBuffer.set(curr ? curr + '.' : '0.');
      }
    } catch (error: unknown) {
      console.error('Error tapping decimal:', error);
    }
  }

  /**
   * Clears the numpad input buffer.
   */
  clearNumpad(): void {
    try {
      this.numpadBuffer.set('');
    } catch (error: unknown) {
      console.error('Error clearing numpad:', error);
    }
  }

  /**
   * Sets the numpad input buffer to a preset numeric value.
   */
  setNumpadValue(val: number): void {
    try {
      this.numpadBuffer.set(String(val));
    } catch (error: unknown) {
      console.error('Error setting numpad value:', error);
    }
  }

  /**
   * Confirms and applies the custom quantity adjustment entered in the numpad modal.
   */
  confirmNumpadAdjustment(): void {
    try {
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
        try {
          confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
        } catch {
          void 0;
        }
      }

      this.closeNumpad();
    } catch (error: unknown) {
      console.error('Error confirming numpad adjustment:', error);
    }
  }

  /**
   * Toggles tactile sound effects on or off.
   */
  toggleSound(): void {
    try {
      this.soundEnabled.update((s: boolean) => !s);
    } catch (error: unknown) {
      console.error('Error toggling sound:', error);
    }
  }

  /**
   * Toggles between dark and light KDS display themes.
   */
  toggleTheme(): void {
    try {
      const next = !this.isDarkTheme();
      this.isDarkTheme.set(next);
      localStorage.setItem('despulpadora_kds_theme', next ? 'dark' : 'light');
    } catch (error: unknown) {
      console.error('Error toggling theme:', error);
    }
  }

  /**
   * Toggles fullscreen mode on the browser document element.
   */
  toggleFullscreen(): void {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => undefined);
      } else {
        document.exitFullscreen().catch(() => undefined);
      }
    } catch (error: unknown) {
      console.error('Error toggling fullscreen:', error);
    }
  }

  /**
   * Navigates back to the inventory tab in settings.
   */
  exitKds(): void {
    try {
      this.router.navigate(['/settings'], { queryParams: { tab: 'inventory' } });
    } catch (error: unknown) {
      console.error('Error exiting KDS inventory:', error);
    }
  }
}