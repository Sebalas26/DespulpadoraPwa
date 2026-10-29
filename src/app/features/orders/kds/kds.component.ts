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
import { ClientDto, FruitConfig, OrderDto, OrderItemDto, OrderStatus } from '../../../core/models/business.models';
import confetti from 'canvas-confetti';

/**
 * Represents the elapsed timer metadata for a KDS order ticket.
 */
export interface OrderTimer {
  orderId: number;
  startTime: number;
}

/**
 * Extended Window interface supporting legacy webkitAudioContext.
 */
interface AudioContextWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

/**
 * Kitchen Display System (KDS) component for real-time order picking and dispatch tracking.
 */
@Component({
  selector: 'app-kds',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="kds-root" [class.dark-theme]="isDarkTheme()">
            <header class="kds-header">
                <div class="kds-clock-left">
          <span class="clock-time-large">{{ currentTime() }}</span>
        </div>

                <div class="kds-metrics-bar">
          <div class="kds-metric-pill metric-pending">
            <span class="metric-num">{{ pendingOrders().length }}</span>
            <span class="metric-lbl">Por Iniciar</span>
          </div>

          <div class="kds-metric-pill metric-picking">
            <span class="metric-num">{{ pickingOrders().length }}</span>
            <span class="metric-lbl">Alistando en Inventario</span>
          </div>

          <div class="kds-metric-pill metric-ready">
            <span class="metric-num">{{ readyOrders().length }}</span>
            <span class="metric-lbl">Listos / Despacho</span>
          </div>

          <div class="kds-metric-pill metric-kg">
            <span class="metric-num">{{ totalPendingKg() }} kg</span>
            <span class="metric-lbl">Volumen Pendiente</span>
          </div>
        </div>

                <div class="kds-actions-group">
                    <button
            type="button"
            class="btn-kds-simulate"
            (click)="simulateIncomingOrder()"
            title="Simula la llegada de un nuevo pedido de restaurante con campanilla y animación"
          >
            <span class="sim-pulse"></span>
            <span>+ Simular Pedido</span>
          </button>

                    <button
            type="button"
            class="kds-icon-btn"
            [class.muted]="!soundEnabled()"
            (click)="toggleSound()"
            [title]="soundEnabled() ? 'Silenciar campanilla' : 'Activar campanilla sonora'"
          >
            @if (soundEnabled()) {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                <path d="M18.63 13A17.89 17.89 0 0 1 18 8"></path>
                <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"></path>
                <path d="M18 8a6 6 0 0 0-9.33-5"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            }
          </button>

                    <div class="kds-view-toggle">
            <button
              type="button"
              [class.active]="viewMode() === 'columns'"
              (click)="viewMode.set('columns')"
              title="Vista Columnas Kanban"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="5" height="18" rx="1"></rect>
                <rect x="10" y="3" width="5" height="18" rx="1"></rect>
                <rect x="17" y="3" width="5" height="18" rx="1"></rect>
              </svg>
            </button>
            <button
              type="button"
              [class.active]="viewMode() === 'grid'"
              (click)="viewMode.set('grid')"
              title="Vista Rejilla TV"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
          </div>

                    <button
            type="button"
            class="kds-icon-btn"
            (click)="toggleFullscreen()"
            title="Pantalla Completa (F11 / Kiosko)"
          >
            ⛶
          </button>

                    <button
            type="button"
            class="kds-icon-btn"
            (click)="toggleTheme()"
            title="Cambiar tema Claro / Oscuro"
          >
            @if (isDarkTheme()) {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            }
          </button>

                    <button
            type="button"
            class="kds-icon-btn"
            (click)="returnToErp()"
            title="Volver a Pedidos ERP"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </header>

                        @if (isLoading()) {
        <div class="dgl-shimmer-wrapper" style="padding: 18px 24px;">
          <div class="shimmer-card-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
            @for (col of [1, 2, 3]; track col) {
              <div class="shimmer-card" style="gap: 14px;">
                <div class="shimmer-title" style="width: 55%;"></div>
                <div class="shimmer-box" style="height: 120px; border-radius: 12px;"></div>
                <div class="shimmer-box" style="height: 120px; border-radius: 12px;"></div>
              </div>
            }
          </div>
        </div>
      }

                        @if (viewMode() === 'columns') {
        <main class="kds-board-columns">
                    <section class="kds-column col-pending">
            <div class="kds-column-header">
              <div class="col-title-group">
                <span class="col-dot dot-pending"></span>
                <h2 class="col-title">1. Por Iniciar</h2>
              </div>
              <span class="col-counter-badge">{{ pendingOrders().length }}</span>
            </div>

            <div class="kds-column-body">
              @for (order of pendingOrders(); track order.orderId) {
                <article class="kds-ticket ticket-pending animate-slide-in" [class.ticket-priority]="order.isPriority">
                  <header class="ticket-header">
                    <div class="ticket-meta-left">
                      <span class="ticket-id">{{ order.orderNumber }}</span>
                      <h3 class="ticket-client">{{ order.clientName }}</h3>
                    </div>
                    <div class="ticket-timer timer-new">
                      <span>{{ getOrderElapsedTime(order) }}</span>
                    </div>
                  </header>

                  <div class="ticket-location">
                    {{ order.clientAddress || '' }}
                  </div>

                                    <div class="ticket-items-list">
                    @for (item of order.items; track (item.fruitName || '') + item.grammage) {
                      <div class="ticket-item-row" (click)="toggleItem(order, item)">
                        <div class="item-check" [class.checked]="(item.pickedQuantity || 0) >= item.quantity">
                          {{ (item.pickedQuantity || 0) >= item.quantity ? '✓' : '' }}
                        </div>
                        <span class="item-qty">{{ item.quantity }}x</span>
                        <span class="item-name">{{ item.fruitName }}</span>
                        <span class="item-gram">({{ item.grammage }}g)</span>
                      </div>
                    }
                  </div>

                  @if (order.isPriority) {
                    <div class="ticket-priority-alert">
                      <div class="priority-head">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        <span>URGENTE · PRIORIDAD ALTA</span>
                      </div>
                      <div class="priority-msg">Alistamiento prioritario solicitado desde Despacho / Entregas</div>
                    </div>
                  }

                  <footer class="ticket-footer">
                    <div class="ticket-total-kg">
                      Peso: <strong>{{ calculateOrderKg(order) }} kg</strong>
                    </div>
                    <button
                      type="button"
                      class="btn-ticket-primary btn-start-picking"
                      (click)="advanceStatus(order, 'PICKING')"
                    >
                      <span>Iniciar Alistamiento ➔</span>
                    </button>
                  </footer>
                </article>
              }

              @if (pendingOrders().length === 0) {
                <div class="kds-empty-column">
                  <svg class="empty-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 6px;">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                    <line x1="6" y1="1" x2="6" y2="4"></line>
                    <line x1="10" y1="1" x2="10" y2="4"></line>
                    <line x1="14" y1="1" x2="14" y2="4"></line>
                  </svg>
                  <p>Sin pedidos por iniciar</p>
                  <small>Utiliza el botón "+ Simular Pedido" para probar la llegada de órdenes.</small>
                </div>
              }
            </div>
          </section>

                    <section class="kds-column col-picking">
            <div class="kds-column-header">
              <div class="col-title-group">
                <span class="col-dot dot-picking"></span>
                <h2 class="col-title">2. Alistando en Inventario</h2>
              </div>
              <span class="col-counter-badge">{{ pickingOrders().length }}</span>
            </div>

            <div class="kds-column-body">
              @for (order of pickingOrders(); track order.orderId) {
                <article class="kds-ticket ticket-picking animate-slide-in" [class.ticket-priority]="order.isPriority">
                  <header class="ticket-header">
                    <div class="ticket-meta-left">
                      <span class="ticket-id">{{ order.orderNumber }}</span>
                      <h3 class="ticket-client">{{ order.clientName }}</h3>
                    </div>
                    <div class="ticket-timer timer-active" [class.timer-alert]="isTimerOverdue(order)">
                      <span>{{ getOrderElapsedTime(order) }}</span>
                    </div>
                  </header>

                  <div class="ticket-location">
                    {{ order.clientAddress }}
                  </div>

                                    <div class="ticket-items-list">
                    @for (item of order.items; track (item.fruitName || '') + item.grammage) {
                      <div
                        class="ticket-item-row interactive"
                        [class.item-completed]="(item.pickedQuantity || 0) >= item.quantity"
                        (click)="toggleItem(order, item)"
                      >
                        <div class="item-check" [class.checked]="(item.pickedQuantity || 0) >= item.quantity">
                          {{ (item.pickedQuantity || 0) >= item.quantity ? '✓' : '' }}
                        </div>
                        <span class="item-qty">{{ item.quantity }}x</span>
                        <span class="item-name" [style.textDecoration]="(item.pickedQuantity || 0) >= item.quantity ? 'line-through' : 'none'">
                          {{ item.fruitName }}
                        </span>
                        <span class="item-gram">({{ item.grammage }}g)</span>
                        <span class="item-ratio">
                          {{ item.pickedQuantity || 0 }}/{{ item.quantity }}
                        </span>
                      </div>
                    }
                  </div>

                  @if (order.isPriority) {
                    <div class="ticket-priority-alert">
                      <div class="priority-head">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        <span>URGENTE · PRIORIDAD ALTA</span>
                      </div>
                      <div class="priority-msg">Alistamiento prioritario solicitado desde Despacho / Entregas</div>
                    </div>
                  }

                                    <div class="ticket-progress-wrap">
                    <div class="ticket-progress-bar" [style.width.%]="getOrderPickedPercentage(order)"></div>
                  </div>

                  <footer class="ticket-footer">
                    <button
                      type="button"
                      class="btn-ticket-secondary"
                      (click)="advanceStatus(order, 'PENDING')"
                      title="Devolver a pendientes"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <polyline points="9 14 4 9 9 4"></polyline>
                        <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="btn-ticket-primary btn-complete-picking"
                      (click)="completeOrderPicking(order)"
                    >
                      <span>Marcar Alistado</span>
                    </button>
                  </footer>
                </article>
              }

              @if (pickingOrders().length === 0) {
                <div class="kds-empty-column">
                  <svg class="empty-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 6px;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <p>Inventario sin picking activo</p>
                  <small>Haz clic en "Iniciar Alistamiento" en un pedido pendiente para comenzarlo.</small>
                </div>
              }
            </div>
          </section>

                    <section class="kds-column col-ready">
            <div class="kds-column-header">
              <div class="col-title-group">
                <span class="col-dot dot-ready"></span>
                <h2 class="col-title">3. Listos para Despacho</h2>
              </div>
              <span class="col-counter-badge">{{ readyOrders().length }}</span>
            </div>

            <div class="kds-column-body">
              @for (order of readyOrders(); track order.orderId) {
                <article class="kds-ticket ticket-ready animate-slide-in">
                  <header class="ticket-header">
                    <div class="ticket-meta-left">
                      <span class="ticket-id">{{ order.orderNumber }}</span>
                      <h3 class="ticket-client">{{ order.clientName }}</h3>
                    </div>
                    <span class="badge-ready-pill">
                      {{ order.status === 'DELIVERED' ? 'Entregado' : 'Alistado' }}
                    </span>
                  </header>

                  <div class="ticket-location">
                    {{ order.clientAddress }}
                  </div>

                  <div class="ticket-items-summary">
                    {{ order.items.length }} productos alistados en inventario ({{ calculateOrderKg(order) }} kg)
                  </div>

                  <footer class="ticket-footer">
                    <div class="ready-stamp">
                      <span>EMPACADO EN HIELERA</span>
                    </div>
                    <button
                      type="button"
                      class="btn-ticket-secondary"
                      (click)="advanceStatus(order, 'PICKING')"
                      title="Devolver a picking si requiere cambios"
                      style="display: inline-flex; align-items: center; gap: 4px;"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <polyline points="9 14 4 9 9 4"></polyline>
                        <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                      </svg>
                      <span>Reabrir</span>
                    </button>
                  </footer>
                </article>
              }

              @if (readyOrders().length === 0) {
                <div class="kds-empty-column">
                  <svg class="empty-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 6px;">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                  <p>Aún no hay pedidos alistados</p>
                  <small>Los pedidos completados en la columna central aparecerán aquí.</small>
                </div>
              }
            </div>
          </section>
        </main>
      }

                        @if (viewMode() === 'grid') {
        <main class="kds-board-grid">
          @for (order of allActiveOrders(); track order.orderId) {
            <article
              class="kds-ticket ticket-grid"
              [class.ticket-priority]="order.isPriority"
              [class.ticket-pending]="order.status === 'PENDING'"
              [class.ticket-picking]="order.status === 'PICKING'"
              [class.ticket-ready]="order.status === 'BILLED' || order.status === 'DISPATCHED'"
            >
              <header class="ticket-header">
                <div class="ticket-meta-left">
                  <span class="ticket-id">{{ order.orderNumber }}</span>
                  <h3 class="ticket-client">{{ order.clientName }}</h3>
                </div>
                <div class="ticket-status-chip" [ngClass]="getStatusBadgeClass(order.status)">
                  {{ getStatusText(order.status) }}
                </div>
              </header>

              <div class="ticket-location">
                {{ order.clientAddress }}
              </div>

                            <div class="ticket-items-list">
                @for (item of order.items; track (item.fruitName || '') + item.grammage) {
                  <div
                    class="ticket-item-row interactive"
                    [class.item-completed]="(item.pickedQuantity || 0) >= item.quantity"
                    (click)="toggleItem(order, item)"
                  >
                    <div class="item-check" [class.checked]="(item.pickedQuantity || 0) >= item.quantity">
                      {{ (item.pickedQuantity || 0) >= item.quantity ? '✓' : '' }}
                    </div>
                    <span class="item-qty">{{ item.quantity }}x</span>
                    <span class="item-name">{{ item.fruitName }}</span>
                    <span class="item-gram">({{ item.grammage }}g)</span>
                  </div>
                }
              </div>

              @if (order.isPriority) {
                <div class="ticket-priority-alert">
                  <div class="priority-head">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                    <span>URGENTE · PRIORIDAD ALTA</span>
                  </div>
                  <div class="priority-msg">Alistamiento prioritario solicitado desde Despacho</div>
                </div>
              }

              <footer class="ticket-footer">
                <div class="ticket-timer">
                  <span>{{ getOrderElapsedTime(order) }}</span>
                </div>
                @if (order.status === 'PENDING') {
                  <button type="button" class="btn-ticket-primary btn-start-picking" (click)="advanceStatus(order, 'PICKING')">
                    Iniciar Picking
                  </button>
                } @else if (order.status === 'PICKING') {
                  <button type="button" class="btn-ticket-primary btn-complete-picking" (click)="completeOrderPicking(order)">
                    Alistado
                  </button>
                } @else {
                  <span class="text-emerald font-bold">Listo</span>
                }
              </footer>
            </article>
          }
        </main>
      }
    </div>
  `,
  styles: [`
    
    
    
    .kds-root {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: #f6f8f7;
      color: #111827;
      font-family: var(--font-body, 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      user-select: none;
      transition: background-color 0.25s ease, color 0.25s ease;
    }

    
    .kds-header {
      background: #ffffff;
      border-bottom: 1px solid #eef2ef;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    
    .kds-clock-left {
      flex: 1 1 0%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .clock-time-large {
      font-size: 1.95rem;
      font-weight: 900;
      color: #111827;
      letter-spacing: -0.025em;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      font-family: inherit;
      white-space: nowrap;
      user-select: none;
      text-align: center;
    }

    
    .kds-metrics-bar {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .kds-metric-pill {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 6px 16px;
      border-radius: 10px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      min-width: 95px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      transition: all 0.2s ease;
    }

    .metric-num {
      font-size: 1.15rem;
      font-weight: 800;
      line-height: 1.2;
      color: #111827;
    }

    .metric-lbl {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #6b7280;
      margin-top: 1px;
    }

    .metric-ready .metric-num {
      color: #1e5e3a;
    }

    
    .kds-actions-group {
      flex: 1 1 0%;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }

    .btn-kds-simulate {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #1e5e3a;
      border: none;
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(30, 94, 58, 0.18);
      transition: all 0.18s ease;
    }

    .btn-kds-simulate:hover {
      background: #164a2d;
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(30, 94, 58, 0.25);
    }

    .sim-pulse {
      width: 8px;
      height: 8px;
      background: #86efac;
      border-radius: 50%;
      animation: pulseSim 1.2s infinite;
    }

    @keyframes pulseSim {
      0% { transform: scale(0.9); opacity: 0.8; }
      50% { transform: scale(1.4); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.8; }
    }

    .kds-icon-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      color: #4b5563;
      font-size: 1rem;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      transition: all 0.18s ease;
    }

    .kds-icon-btn:hover {
      background: #f9fafb;
      border-color: #cbd5e1;
      color: #111827;
    }

    .kds-view-toggle {
      display: flex;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 2px;
    }

    .kds-view-toggle button {
      background: transparent;
      border: none;
      color: #6b7280;
      padding: 5px 8px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: all 0.15s ease;
    }

    .kds-view-toggle button.active {
      background: #ffffff;
      color: #1e5e3a;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      font-weight: 700;
    }

    
    
    
    .kds-board-columns {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      padding: 16px 20px;
      overflow: hidden;
    }

    .kds-column {
      background: #f8faf8;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }

    .kds-column-header {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border-radius: 13px 13px 0 0;
    }

    .col-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .col-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .dot-pending { background: #d97706; }
    .dot-picking { background: #475569; }
    .dot-ready { background: #1e5e3a; }

    .col-title {
      font-size: 0.95rem;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.01em;
      color: #111827;
    }

    .col-counter-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 999px;
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #e5e7eb;
    }

    .kds-column-body {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    
    .kds-ticket {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }

    .kds-ticket:hover {
      border-color: #cbd5e1;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.06);
    }

    .ticket-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }

    .ticket-meta-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .ticket-id {
      font-family: monospace;
      font-weight: 700;
      font-size: 0.78rem;
      color: #6b7280;
    }

    .ticket-client {
      font-size: 1rem;
      font-weight: 800;
      margin: 0;
      line-height: 1.3;
      color: #111827;
    }

    .ticket-location {
      font-size: 0.76rem;
      color: #6b7280;
    }

    
    .ticket-timer {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 0.74rem;
      font-weight: 700;
      color: #4b5563;
      white-space: nowrap;
    }

    .timer-alert {
      color: #dc2626 !important;
      background: #fef2f2 !important;
      border-color: #fecaca !important;
    }

    
    .ticket-items-list {
      background: #f9fafb;
      border: 1px solid #f3f4f6;
      border-radius: 8px;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .ticket-item-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 0.86rem;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      color: #374151;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .ticket-item-row.interactive {
      cursor: pointer;
    }

    .ticket-item-row.interactive:hover {
      background: #f8faf8;
      border-color: #cbd5e1;
    }

    .ticket-item-row.item-completed {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    .item-check {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 1.5px solid #d1d5db;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      font-weight: 800;
      color: #ffffff;
      background: #ffffff;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    .item-check.checked {
      background: #1e5e3a;
      border-color: #1e5e3a;
    }

    .item-qty {
      font-weight: 800;
      color: #111827;
    }

    .item-name {
      font-weight: 600;
      color: #1f2937;
      flex: 1;
    }

    .item-gram {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .item-ratio {
      font-size: 0.72rem;
      font-weight: 700;
      background: #f3f4f6;
      color: #4b5563;
      border: 1px solid #e5e7eb;
      padding: 2px 6px;
      border-radius: 4px;
    }

    
    .ticket-progress-wrap {
      height: 5px;
      background: #e5e7eb;
      border-radius: 999px;
      overflow: hidden;
    }

    .ticket-progress-bar {
      height: 100%;
      background: #1e5e3a;
      border-radius: 999px;
      transition: width 0.25s ease;
    }

    
    .kds-ticket.ticket-priority {
      border: 2px solid #ef4444 !important;
      box-shadow: 0 0 0 1px #ef4444, 0 4px 14px rgba(239, 68, 68, 0.16) !important;
    }

    .ticket-priority-alert {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 7px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      animation: priorityAlertPulse 2s infinite ease-in-out;
    }

    @keyframes priorityAlertPulse {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.2); }
      50% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.2); }
    }

    .priority-head {
      display: flex;
      align-items: center;
      gap: 5px;
      font-weight: 800;
      color: #dc2626;
      font-size: 0.72rem;
      letter-spacing: 0.02em;
    }

    .priority-msg {
      font-size: 0.69rem;
      color: #991b1b;
      font-weight: 600;
    }

    .ticket-note {
      font-size: 0.76rem;
      color: #92400e;
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 6px 10px;
      border-radius: 6px;
      font-weight: 600;
    }

    .ticket-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding-top: 6px;
    }

    .ticket-total-kg {
      font-size: 0.8rem;
      color: #6b7280;
    }

    .ticket-total-kg strong {
      color: #111827;
      font-weight: 800;
    }

    .btn-ticket-primary {
      background: #1e5e3a;
      border: none;
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 1px 3px rgba(30, 94, 58, 0.15);
      transition: all 0.15s ease;
    }

    .btn-ticket-primary:hover {
      background: #164a2d;
      transform: translateY(-1px);
    }

    .btn-start-picking,
    .btn-complete-picking {
      background: #1e5e3a;
    }

    .btn-ticket-secondary {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      color: #4b5563;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-ticket-secondary:hover {
      background: #f9fafb;
      border-color: #cbd5e1;
      color: #111827;
    }

    .badge-ready-pill {
      background: #eaf5ee;
      color: #1e5e3a;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #d1e7d8;
    }

    .ready-stamp {
      font-size: 0.72rem;
      font-weight: 800;
      color: #374151;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      padding: 3px 8px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .ticket-items-summary {
      font-size: 0.8rem;
      color: #6b7280;
    }

    .kds-empty-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 20px;
      text-align: center;
      color: #9ca3af;
      gap: 8px;
    }

    .empty-icon {
      font-size: 2.2rem;
    }

    
    
    
    .kds-board-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
      padding: 16px 20px;
      overflow-y: auto;
    }

    .ticket-status-chip {
      font-size: 0.7rem;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .chip-warning { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .chip-purple { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
    .chip-success { background: #eaf5ee; color: #1e5e3a; border: 1px solid #d1e7d8; }

    
    .animate-slide-in {
      animation: slideIn 0.25s ease-out;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    
    .kds-root.dark-theme {
      background: #0f172a;
      color: #f8fafc;
    }
    .kds-root.dark-theme .kds-header {
      background: #1e293b;
      border-bottom-color: #334155;
    }
    .kds-root.dark-theme .clock-time-large {
      color: #f8fafc;
    }
    .kds-root.dark-theme .kds-icon-btn,
    .kds-root.dark-theme .kds-metric-pill,
    .kds-root.dark-theme .kds-column-header,
    .kds-root.dark-theme .kds-ticket,
    .kds-root.dark-theme .ticket-item-row {
      background: #1e293b;
      border-color: #334155;
      color: #f8fafc;
    }
    .kds-root.dark-theme .kds-column {
      background: #0f172a;
      border-color: #334155;
    }
    .kds-root.dark-theme .metric-num,
    .kds-root.dark-theme .ticket-client,
    .kds-root.dark-theme .col-title,
    .kds-root.dark-theme .item-name,
    .kds-root.dark-theme .item-qty {
      color: #f8fafc;
    }
    .kds-root.dark-theme .ticket-items-list {
      background: #0f172a;
      border-color: #334155;
    }
  `]
})
export class KdsComponent implements OnInit, OnDestroy {
  private readonly stateService = inject(StateService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  readonly viewMode = signal<'columns' | 'grid'>('columns');
  readonly isDarkTheme = signal<boolean>(false);
  readonly soundEnabled = signal<boolean>(true);
  readonly currentTime = signal<string>('');

  private clockInterval?: ReturnType<typeof setInterval>;
  private audioCtx?: AudioContext;
  private readonly orderTimers: Map<number, number> = new Map<number, number>();

  readonly pendingOrders = computed<OrderDto[]>(() => {
    try {
      return this.stateService.orders().filter((o: OrderDto) => o.status === 'PENDING');
    } catch (error: unknown) {
      console.error('Error computing pending orders:', error);
      return [];
    }
  });

  readonly pickingOrders = computed<OrderDto[]>(() => {
    try {
      return this.stateService.orders().filter((o: OrderDto) => o.status === 'PICKING');
    } catch (error: unknown) {
      console.error('Error computing picking orders:', error);
      return [];
    }
  });

  readonly readyOrders = computed<OrderDto[]>(() => {
    try {
      return this.stateService.orders().filter(
        (o: OrderDto) => o.status === 'BILLED' || o.status === 'DISPATCHED' || o.status === 'DELIVERED'
      );
    } catch (error: unknown) {
      console.error('Error computing ready orders:', error);
      return [];
    }
  });

  readonly allActiveOrders = computed<OrderDto[]>(() => {
    try {
      return this.stateService.orders();
    } catch (error: unknown) {
      console.error('Error computing all active orders:', error);
      return [];
    }
  });

  readonly isLoading = computed<boolean>(() => {
    try {
      return typeof this.stateService.isLoading === 'function' ? this.stateService.isLoading() : false;
    } catch {
      return false;
    }
  });

  readonly totalPendingKg = computed<string>(() => {
    try {
      const orders = [...this.pendingOrders(), ...this.pickingOrders()];
      let kg = 0;
      for (const o of orders) {
        for (const it of o.items) {
          kg += (it.quantity * it.grammage) / 1000;
        }
      }
      return kg.toFixed(1);
    } catch (error: unknown) {
      console.error('Error computing total pending kg:', error);
      return '0.0';
    }
  });

  /**
   * Initializes the KDS clock, order timers, and persisted display theme.
   */
  ngOnInit(): void {
    try {
      this.stateService.refreshAll?.();
      this.updateClock();
      this.clockInterval = setInterval(() => this.updateClock(), 1000);

      const now = Date.now();
      this.stateService.orders().forEach((o: OrderDto, index: number) => {
        this.orderTimers.set(o.orderId, now - (index * 180000 + 120000));
      });

      const savedTheme = localStorage.getItem('despulpadora_kds_theme');
      if (savedTheme) {
        this.isDarkTheme.set(savedTheme === 'dark');
      } else {
        this.isDarkTheme.set(false);
      }
    } catch (error: unknown) {
      console.error('Error initializing KdsComponent:', error);
    }
  }

  /**
   * Cleans up the clock interval and audio context upon component destruction.
   */
  ngOnDestroy(): void {
    try {
      if (this.clockInterval) {
        clearInterval(this.clockInterval);
      }
      if (this.audioCtx) {
        this.audioCtx.close();
      }
    } catch (error: unknown) {
      console.error('Error destroying KdsComponent:', error);
    }
  }

  /**
   * Updates the current time signal formatted for Colombia locale.
   */
  private updateClock(): void {
    try {
      const now = new Date();
      this.currentTime.set(now.toLocaleTimeString('es-CO', { hour12: true }));
    } catch (error: unknown) {
      console.error('Error updating KDS clock:', error);
    }
  }

  /**
   * Navigates back to the main orders management view.
   */
  returnToErp(): void {
    try {
      this.router.navigate(['/orders']);
    } catch (error: unknown) {
      console.error('Error navigating back to ERP:', error);
    }
  }

  /**
   * Toggles between dark and light display themes for the KDS screen.
   */
  toggleTheme(): void {
    try {
      this.isDarkTheme.update((v: boolean) => !v);
      localStorage.setItem('despulpadora_kds_theme', this.isDarkTheme() ? 'dark' : 'light');
    } catch (error: unknown) {
      console.error('Error toggling KDS theme:', error);
    }
  }

  /**
   * Toggles the sound notification state and plays a chime when enabled.
   */
  toggleSound(): void {
    try {
      this.soundEnabled.update((v: boolean) => !v);
      if (this.soundEnabled()) {
        this.playKitchenBellChime();
      }
    } catch (error: unknown) {
      console.error('Error toggling KDS sound:', error);
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
   * Plays a synthesized two-tone bell chime using the Web Audio API.
   */
  private playKitchenBellChime(): void {
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

      const now = this.audioCtx.currentTime;

      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.08);
      gain2.gain.setValueAtTime(0.35, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.8);
    } catch {
      return;
    }
  }

  /**
   * Simulates an incoming urgent order using real clients and fruits from StateService.
   */
  simulateIncomingOrder(): void {
    try {
      const availableClients: ClientDto[] = this.stateService.clients();
      const availableFruits: FruitConfig[] = this.stateService.fruits();

      if (availableClients.length === 0 || availableFruits.length === 0) {
        this.notification.warning(
          'Catálogo vacío',
          'Configure clientes y frutas antes de simular una comanda.'
        );
        return;
      }

      const client = availableClients[Math.floor(Math.random() * availableClients.length)];
      const itemCount = Math.min(availableFruits.length, Math.floor(Math.random() * 2) + 1);
      const items: Array<{
        fruitName: string;
        grammage: 140 | 250 | 500 | 1000;
        quantity: number;
        unitPrice: number;
      }> = [];

      for (let i = 0; i < itemCount; i++) {
        const f = availableFruits[i % availableFruits.length];
        const qty = Math.floor(Math.random() * 5) + 1;
        items.push({
          fruitName: f.name,
          grammage: 1000,
          quantity: qty,
          unitPrice: f.prices.g1000 ?? 0
        });
      }

      const newOrder = this.stateService.createOrder({
        clientName: client.fullName || client.name || '',
        clientPhone: client.phone || '',
        clientAddress: client.address || '',
        notes: 'Comanda generada para alistamiento en inventario',
        paymentMethodName: '',
        items
      });

      this.orderTimers.set(newOrder.orderId, Date.now());
      this.playKitchenBellChime();

      try {
        confetti({
          particleCount: 35,
          spread: 50,
          origin: { y: 0.15 }
        });
      } catch {
        void 0;
      }

      this.notification.info(
        '¡Nueva Comanda en Pantalla!',
        `Pedido ${newOrder.orderNumber} para ${newOrder.clientName}`
      );
    } catch (error: unknown) {
      console.error('Error simulating incoming order:', error);
    }
  }

  /**
   * Advances an order ticket to a new status and initializes its timer if needed.
   */
  advanceStatus(order: OrderDto, newStatus: OrderStatus): void {
    try {
      this.stateService.updateOrderStatus(order.orderId, newStatus);
      if (!this.orderTimers.has(order.orderId)) {
        this.orderTimers.set(order.orderId, Date.now());
      }
    } catch (error: unknown) {
      console.error('Error advancing KDS order status:', error);
    }
  }

  /**
   * Marks all items in an order as picked and transitions the order to BILLED status.
   */
  completeOrderPicking(order: OrderDto): void {
    try {
      order.items.forEach((it: OrderItemDto) => {
        this.stateService.updateItemPickedQuantity(
          order.orderId,
          it.fruitId,
          it.grammage,
          it.quantity
        );
      });

      this.stateService.updateOrderStatus(order.orderId, 'BILLED');
      this.playKitchenBellChime();

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch {
        void 0;
      }

      this.notification.success(
        '¡Alistamiento Completado!',
        `${order.orderNumber} empacado y listo para despacho.`
      );
    } catch (error: unknown) {
      console.error('Error completing order picking:', error);
    }
  }

  /**
   * Toggles the picked completion state of a single order line item.
   */
  toggleItem(order: OrderDto, item: OrderItemDto): void {
    try {
      const isCompleted = (item.pickedQuantity || 0) >= item.quantity;
      const newQty = isCompleted ? 0 : item.quantity;
      this.stateService.updateItemPickedQuantity(order.orderId, item.fruitId, item.grammage, newQty);
    } catch (error: unknown) {
      console.error('Error toggling KDS item:', error);
    }
  }

  /**
   * Returns the formatted MM:SS elapsed time string for an order ticket.
   */
  getOrderElapsedTime(order: OrderDto): string {
    try {
      const startTime = this.orderTimers.get(order.orderId) || Date.now() - 120000;
      const diffSec = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } catch (error: unknown) {
      console.error('Error getting order elapsed time:', error);
      return '00:00';
    }
  }

  /**
   * Determines whether an order ticket has exceeded the 15-minute SLA threshold.
   */
  isTimerOverdue(order: OrderDto): boolean {
    try {
      const startTime = this.orderTimers.get(order.orderId) || Date.now();
      const diffSec = (Date.now() - startTime) / 1000;
      return diffSec > 900;
    } catch (error: unknown) {
      console.error('Error checking if timer is overdue:', error);
      return false;
    }
  }

  /**
   * Calculates the total weight in kilograms for an order ticket.
   */
  calculateOrderKg(order: OrderDto): string {
    try {
      const sum = order.items.reduce((acc: number, it: OrderItemDto) => acc + (it.quantity * it.grammage) / 1000, 0);
      return sum.toFixed(1);
    } catch (error: unknown) {
      console.error('Error calculating order kg:', error);
      return '0.0';
    }
  }

  /**
   * Calculates the percentage of picked items for an order ticket.
   */
  getOrderPickedPercentage(order: OrderDto): number {
    try {
      const total = order.items.reduce((acc: number, it: OrderItemDto) => acc + it.quantity, 0);
      if (total === 0) return 0;
      const picked = order.items.reduce((acc: number, it: OrderItemDto) => acc + (it.pickedQuantity || 0), 0);
      return Math.min(100, Math.round((picked / total) * 100));
    } catch (error: unknown) {
      console.error('Error getting order picked percentage:', error);
      return 0;
    }
  }

  /**
   * Returns the CSS badge class corresponding to an order status.
   */
  getStatusBadgeClass(status: OrderStatus): string {
    try {
      switch (status) {
        case 'PENDING': return 'chip-warning';
        case 'PICKING': return 'chip-purple';
        case 'BILLED':
        case 'DISPATCHED':
        case 'DELIVERED':
          return 'chip-success';
        default: return '';
      }
    } catch (error: unknown) {
      console.error('Error getting status badge class:', error);
      return '';
    }
  }

  /**
   * Returns the human-readable Spanish label for an order status.
   */
  getStatusText(status: OrderStatus): string {
    try {
      switch (status) {
        case 'PENDING': return 'Por Iniciar';
        case 'PICKING': return 'En Picking';
        case 'BILLED': return 'Facturado';
        case 'DISPATCHED': return 'En Reparto';
        case 'DELIVERED': return 'Entregado';
        default: return status;
      }
    } catch (error: unknown) {
      console.error('Error getting status text:', error);
      return status;
    }
  }
}