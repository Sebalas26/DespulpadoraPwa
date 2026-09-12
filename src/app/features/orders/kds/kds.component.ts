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
import { Router, RouterLink } from '@angular/router';
import { StateService } from '../../../core/services/state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { OrderDto, OrderStatus } from '../../../core/models/business.models';
import confetti from 'canvas-confetti';

interface TicketTimer {
  orderId: number;
  startTime: number; // timestamp
}

@Component({
  selector: 'app-kds',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="kds-root" [class.dark-theme]="isDarkTheme()">
      <!-- KDS Top Header (TV Monitor Style) -->
      <header class="kds-header">
        <div class="kds-brand-block">
          <button type="button" class="btn-back" (click)="returnToErp()" title="Volver a la gestión de pedidos ERP">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>ERP</span>
          </button>

          <div class="kds-title-group">
            <div class="kds-logo-row">
              <span class="kds-badge-tag">KDS 4.0</span>
              <h1 class="kds-title">ALISTAMIENTO EN CAVA · PANTALLA DE PEDIDOS</h1>
            </div>
            <div class="kds-sub">Flujo visual continuo de preparación y picking de pulpa congelada</div>
          </div>
        </div>

        <!-- Live Metrics Bar -->
        <div class="kds-metrics-bar">
          <div class="kds-metric-pill metric-pending">
            <span class="metric-num">{{ pendingOrders().length }}</span>
            <span class="metric-lbl">Por Iniciar</span>
          </div>

          <div class="kds-metric-pill metric-picking">
            <span class="metric-num">{{ pickingOrders().length }}</span>
            <span class="metric-lbl">Alistando en Cava</span>
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

        <!-- Utility Controls -->
        <div class="kds-actions-group">
          <!-- Live Clock -->
          <div class="kds-clock">
            <span class="clock-icon">🕒</span>
            <span class="clock-time">{{ currentTime() }}</span>
          </div>

          <!-- Simulate Urgent Order Button -->
          <button
            type="button"
            class="btn-kds-simulate"
            (click)="simulateIncomingOrder()"
            title="Simula la llegada de un nuevo pedido de restaurante con campanilla y animación"
          >
            <span class="sim-pulse"></span>
            <span>+ Simular Pedido</span>
          </button>

          <!-- Audio Bell Toggle -->
          <button
            type="button"
            class="kds-icon-btn"
            [class.muted]="!soundEnabled()"
            (click)="toggleSound()"
            [title]="soundEnabled() ? 'Silenciar campanilla' : 'Activar campanilla sonora'"
          >
            {{ soundEnabled() ? '🔔' : '🔕' }}
          </button>

          <!-- View Mode Toggle: Columns vs Grid -->
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

          <!-- Fullscreen Toggle -->
          <button
            type="button"
            class="kds-icon-btn"
            (click)="toggleFullscreen()"
            title="Pantalla Completa (F11 / Kiosko)"
          >
            ⛶
          </button>

          <!-- Theme Toggle -->
          <button
            type="button"
            class="kds-icon-btn"
            (click)="toggleTheme()"
            title="Cambiar tema Claro / Oscuro"
          >
            {{ isDarkTheme() ? '☀️' : '🌙' }}
          </button>
        </div>
      </header>

      <!-- ===================================================================== -->
      <!-- VIEW 1: KANBAN COLUMNS (ESTILO COCINA / KDS RESTAURANTE)              -->
      <!-- ===================================================================== -->
      @if (viewMode() === 'columns') {
        <main class="kds-board-columns">
          <!-- COLUMN 1: NUEVOS / PENDIENTES -->
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
                <article class="kds-ticket ticket-pending animate-slide-in">
                  <header class="ticket-header">
                    <div class="ticket-meta-left">
                      <span class="ticket-id">{{ order.orderNumber }}</span>
                      <h3 class="ticket-client">{{ order.clientName }}</h3>
                    </div>
                    <div class="ticket-timer timer-new">
                      <span>⏱️ {{ getOrderElapsedTime(order) }}</span>
                    </div>
                  </header>

                  <div class="ticket-location">
                    📍 {{ order.clientAddress || 'Sede Bogotá / Cundinamarca' }}
                  </div>

                  <!-- Items Checklist -->
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

                  @if (order.notes) {
                    <div class="ticket-note">
                      📝 {{ order.notes }}
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
                  <span class="empty-icon">☕</span>
                  <p>Sin pedidos por iniciar</p>
                  <small>Utiliza el botón "+ Simular Pedido" para probar la llegada de órdenes.</small>
                </div>
              }
            </div>
          </section>

          <!-- COLUMN 2: EN ALISTAMIENTO EN CAVA (PICKING) -->
          <section class="kds-column col-picking">
            <div class="kds-column-header">
              <div class="col-title-group">
                <span class="col-dot dot-picking"></span>
                <h2 class="col-title">2. Alistando en Cava</h2>
              </div>
              <span class="col-counter-badge">{{ pickingOrders().length }}</span>
            </div>

            <div class="kds-column-body">
              @for (order of pickingOrders(); track order.orderId) {
                <article class="kds-ticket ticket-picking animate-slide-in">
                  <header class="ticket-header">
                    <div class="ticket-meta-left">
                      <span class="ticket-id text-purple">{{ order.orderNumber }}</span>
                      <h3 class="ticket-client">{{ order.clientName }}</h3>
                    </div>
                    <div class="ticket-timer timer-active" [class.timer-alert]="isTimerOverdue(order)">
                      <span>⏱️ {{ getOrderElapsedTime(order) }}</span>
                    </div>
                  </header>

                  <div class="ticket-location">
                    📍 {{ order.clientAddress }}
                  </div>

                  <!-- Items Checklist with Interactive Touch / Click -->
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

                  <!-- Progress Bar -->
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
                      ↩
                    </button>
                    <button
                      type="button"
                      class="btn-ticket-primary btn-complete-picking"
                      (click)="completeOrderPicking(order)"
                    >
                      <span>✓ Marcar Alistado</span>
                    </button>
                  </footer>
                </article>
              }

              @if (pickingOrders().length === 0) {
                <div class="kds-empty-column">
                  <span class="empty-icon">❄️</span>
                  <p>Cava sin picking activo</p>
                  <small>Haz clic en "Iniciar Alistamiento" en un pedido pendiente para comenzarlo.</small>
                </div>
              }
            </div>
          </section>

          <!-- COLUMN 3: ALISTADOS / LISTOS PARA DESPACHO -->
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
                      <span class="ticket-id text-emerald">{{ order.orderNumber }}</span>
                      <h3 class="ticket-client">{{ order.clientName }}</h3>
                    </div>
                    <span class="badge-ready-pill">
                      {{ order.status === 'DELIVERED' ? 'Entregado' : 'Alistado' }}
                    </span>
                  </header>

                  <div class="ticket-location">
                    📍 {{ order.clientAddress }}
                  </div>

                  <div class="ticket-items-summary">
                    📦 {{ order.items.length }} productos alistados en cava ({{ calculateOrderKg(order) }} kg)
                  </div>

                  <footer class="ticket-footer">
                    <div class="ready-stamp">
                      <span>✓ EMPACADO EN HIELERA</span>
                    </div>
                    <button
                      type="button"
                      class="btn-ticket-secondary"
                      (click)="advanceStatus(order, 'PICKING')"
                      title="Devolver a picking si requiere cambios"
                    >
                      ↩ Reabrir
                    </button>
                  </footer>
                </article>
              }

              @if (readyOrders().length === 0) {
                <div class="kds-empty-column">
                  <span class="empty-icon">📦</span>
                  <p>Aún no hay pedidos alistados</p>
                  <small>Los pedidos completados en la columna central aparecerán aquí.</small>
                </div>
              }
            </div>
          </section>
        </main>
      }

      <!-- ===================================================================== -->
      <!-- VIEW 2: TV GRID (MONITOR REJILLA COMPLETA)                            -->
      <!-- ===================================================================== -->
      @if (viewMode() === 'grid') {
        <main class="kds-board-grid">
          @for (order of allActiveOrders(); track order.orderId) {
            <article
              class="kds-ticket ticket-grid"
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
                📍 {{ order.clientAddress }}
              </div>

              <!-- Items Checklist -->
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

              <footer class="ticket-footer">
                <div class="ticket-timer">
                  <span>⏱️ {{ getOrderElapsedTime(order) }}</span>
                </div>
                @if (order.status === 'PENDING') {
                  <button type="button" class="btn-ticket-primary btn-start-picking" (click)="advanceStatus(order, 'PICKING')">
                    Iniciar Picking
                  </button>
                } @else if (order.status === 'PICKING') {
                  <button type="button" class="btn-ticket-primary btn-complete-picking" (click)="completeOrderPicking(order)">
                    ✓ Alistado
                  </button>
                } @else {
                  <span class="text-emerald font-bold">✓ Listo</span>
                }
              </footer>
            </article>
          }
        </main>
      }
    </div>
  `,
  styles: [`
    /* ========================================================================= */
    /* KDS ROOT & KIOSK THEME (DISTRACTION-FREE CLEAN SCREEN)                    */
    /* ========================================================================= */
    .kds-root {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: #0f172a;
      color: #f8fafc;
      font-family: var(--font-body, 'SF Pro Display', -apple-system, sans-serif);
      user-select: none;
      transition: background-color 0.3s, color 0.3s;
    }

    /* Clean Light Theme Option */
    .kds-root:not(.dark-theme) {
      background: #f1f5f9;
      color: #0f172a;
    }

    /* KDS Header Bar */
    .kds-header {
      background: rgba(15, 23, 42, 0.95);
      border-bottom: 2px solid rgba(255, 255, 255, 0.08);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-shrink: 0;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    }

    .kds-root:not(.dark-theme) .kds-header {
      background: #ffffff;
      border-bottom: 2px solid #e2e8f0;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
    }

    .kds-brand-block {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .btn-back {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #f8fafc;
      font-size: 0.82rem;
      font-weight: 800;
      padding: 7px 14px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .kds-root:not(.dark-theme) .btn-back {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: #0f172a;
    }

    .btn-back:hover {
      background: #10b981;
      color: #fff;
      border-color: #10b981;
    }

    .kds-title-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .kds-logo-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .kds-badge-tag {
      background: #10b981;
      color: #fff;
      font-size: 0.68rem;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.6px;
    }

    .kds-title {
      font-size: 1.15rem;
      font-weight: 800;
      margin: 0;
      letter-spacing: 0.4px;
      color: #f8fafc;
    }

    .kds-root:not(.dark-theme) .kds-title {
      color: #0f172a;
    }

    .kds-sub {
      font-size: 0.74rem;
      color: #94a3b8;
    }

    /* Live Metrics Bar */
    .kds-metrics-bar {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .kds-metric-pill {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4px 14px;
      border-radius: 8px;
      border: 1px solid transparent;
      min-width: 90px;
    }

    .metric-pending {
      background: rgba(245, 158, 11, 0.12);
      border-color: rgba(245, 158, 11, 0.3);
      color: #f59e0b;
    }

    .metric-picking {
      background: rgba(139, 92, 246, 0.12);
      border-color: rgba(139, 92, 246, 0.3);
      color: #a855f7;
    }

    .metric-ready {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.3);
      color: #10b981;
    }

    .metric-kg {
      background: rgba(14, 165, 233, 0.12);
      border-color: rgba(14, 165, 233, 0.3);
      color: #0ea5e9;
    }

    .metric-num {
      font-size: 1.15rem;
      font-weight: 800;
      line-height: 1.2;
    }

    .metric-lbl {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      opacity: 0.85;
    }

    /* Actions & Utility Controls */
    .kds-actions-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .kds-clock {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 6px 12px;
      border-radius: 8px;
      font-family: monospace;
      font-weight: 800;
      font-size: 0.92rem;
      color: #38bdf8;
    }

    .kds-root:not(.dark-theme) .kds-clock {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #0284c7;
    }

    .btn-kds-simulate {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #8b5cf6;
      border: none;
      color: #fff;
      font-size: 0.82rem;
      font-weight: 800;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.35);
      transition: all 0.2s;
    }

    .btn-kds-simulate:hover {
      background: #7c3aed;
      transform: translateY(-1px);
    }

    .sim-pulse {
      width: 8px;
      height: 8px;
      background: #fff;
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
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #f8fafc;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .kds-root:not(.dark-theme) .kds-icon-btn {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #0f172a;
    }

    .kds-icon-btn:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .kds-view-toggle {
      display: flex;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 2px;
    }

    .kds-root:not(.dark-theme) .kds-view-toggle {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .kds-view-toggle button {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 5px 8px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: all 0.2s;
    }

    .kds-view-toggle button.active {
      background: #10b981;
      color: #fff;
    }

    /* ========================================================================= */
    /* VIEW 1: KANBAN COLUMNS LAYOUT                                             */
    /* ========================================================================= */
    .kds-board-columns {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      padding: 16px 20px;
      overflow: hidden;
    }

    .kds-column {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .kds-root:not(.dark-theme) .kds-column {
      background: #ffffff;
      border-color: #e2e8f0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .kds-column-header {
      padding: 12px 16px;
      border-bottom: 2px solid;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.15);
    }

    .kds-root:not(.dark-theme) .kds-column-header {
      background: #f8fafc;
    }

    .col-pending .kds-column-header { border-bottom-color: #f59e0b; }
    .col-picking .kds-column-header { border-bottom-color: #8b5cf6; }
    .col-ready .kds-column-header { border-bottom-color: #10b981; }

    .col-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .col-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .dot-pending { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
    .dot-picking { background: #8b5cf6; box-shadow: 0 0 8px #8b5cf6; }
    .dot-ready { background: #10b981; box-shadow: 0 0 8px #10b981; }

    .col-title {
      font-size: 1rem;
      font-weight: 800;
      margin: 0;
      letter-spacing: 0.3px;
    }

    .col-counter-badge {
      font-size: 0.76rem;
      font-weight: 800;
      padding: 3px 9px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.1);
    }

    .kds-root:not(.dark-theme) .col-counter-badge {
      background: #e2e8f0;
      color: #0f172a;
    }

    .kds-column-body {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* KDS Ticket Cards (Kitchen Display Order Tickets) */
    .kds-ticket {
      background: #1e293b;
      border: 1.5px solid rgba(255, 255, 255, 0.1);
      border-top-width: 5px;
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .kds-root:not(.dark-theme) .kds-ticket {
      background: #ffffff;
      border-color: #cbd5e1;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
    }

    .ticket-pending { border-top-color: #f59e0b; }
    .ticket-picking { border-top-color: #8b5cf6; }
    .ticket-ready { border-top-color: #10b981; }

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
      font-weight: 800;
      font-size: 0.78rem;
      color: #38bdf8;
    }

    .text-purple { color: #c084fc !important; }
    .text-emerald { color: #34d399 !important; }

    .ticket-client {
      font-size: 1.05rem;
      font-weight: 800;
      margin: 0;
      line-height: 1.25;
      color: #f8fafc;
    }

    .kds-root:not(.dark-theme) .ticket-client {
      color: #0f172a;
    }

    .ticket-location {
      font-size: 0.76rem;
      color: #94a3b8;
    }

    .kds-root:not(.dark-theme) .ticket-location {
      color: #64748b;
    }

    /* Timers */
    .ticket-timer {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 3px 8px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 0.75rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .timer-new {
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.12);
      border-color: rgba(245, 158, 11, 0.3);
    }

    .timer-active {
      color: #10b981;
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.3);
    }

    .timer-alert {
      color: #ef4444 !important;
      background: rgba(239, 68, 68, 0.15) !important;
      border-color: #ef4444 !important;
      animation: timerBlink 1.2s infinite;
    }

    @keyframes timerBlink {
      0% { opacity: 1; }
      50% { opacity: 0.4; }
      100% { opacity: 1; }
    }

    /* Items Checklist */
    .ticket-items-list {
      background: rgba(0, 0, 0, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .kds-root:not(.dark-theme) .ticket-items-list {
      background: #f8fafc;
      border-color: #e2e8f0;
    }

    .ticket-item-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 0.88rem;
      background: rgba(255, 255, 255, 0.03);
      transition: background 0.15s;
    }

    .kds-root:not(.dark-theme) .ticket-item-row {
      background: #ffffff;
      border: 1px solid #f1f5f9;
    }

    .ticket-item-row.interactive {
      cursor: pointer;
    }

    .ticket-item-row.interactive:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .kds-root:not(.dark-theme) .ticket-item-row.interactive:hover {
      background: #f1f5f9;
    }

    .ticket-item-row.item-completed {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.3);
    }

    .item-check {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 1.5px solid #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      font-weight: 800;
      color: #fff;
    }

    .item-check.checked {
      background: #10b981;
      border-color: #10b981;
    }

    .item-qty {
      font-weight: 800;
      color: #f59e0b;
    }

    .item-name {
      font-weight: 700;
      flex: 1;
    }

    .item-gram {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .item-ratio {
      font-size: 0.72rem;
      font-weight: 800;
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* Progress Bar */
    .ticket-progress-wrap {
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      overflow: hidden;
    }

    .ticket-progress-bar {
      height: 100%;
      background: #10b981;
      border-radius: 999px;
      transition: width 0.25s ease;
    }

    .ticket-note {
      font-size: 0.76rem;
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
      padding: 4px 8px;
      border-radius: 6px;
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
      color: #94a3b8;
    }

    .btn-ticket-primary {
      background: #10b981;
      border: none;
      color: #fff;
      font-size: 0.82rem;
      font-weight: 800;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }

    .btn-ticket-primary:hover {
      background: #059669;
      transform: translateY(-1px);
    }

    .btn-start-picking {
      background: #f59e0b;
    }

    .btn-start-picking:hover {
      background: #d97706;
    }

    .btn-complete-picking {
      background: #10b981;
    }

    .btn-ticket-secondary {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #94a3b8;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
    }

    .kds-root:not(.dark-theme) .btn-ticket-secondary {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: #475569;
    }

    .badge-ready-pill {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .ready-stamp {
      font-size: 0.74rem;
      font-weight: 800;
      color: #10b981;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .kds-empty-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 20px;
      text-align: center;
      color: #64748b;
      gap: 8px;
    }

    .empty-icon {
      font-size: 2.2rem;
    }

    /* ========================================================================= */
    /* VIEW 2: TV GRID (MONITOR REJILLA COMPLETA)                                */
    /* ========================================================================= */
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

    .chip-warning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
    .chip-purple { background: rgba(139, 92, 246, 0.15); color: #c084fc; }
    .chip-success { background: rgba(16, 185, 129, 0.15); color: #10b981; }

    /* Animations */
    .animate-slide-in {
      animation: slideIn 0.25s ease-out;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `]
})
export class KdsComponent implements OnInit, OnDestroy {
  private readonly stateService = inject(StateService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  // Layout and Display Signals
  readonly viewMode = signal<'columns' | 'grid'>('columns');
  readonly isDarkTheme = signal<boolean>(true);
  readonly soundEnabled = signal<boolean>(true);
  readonly currentTime = signal<string>('');

  private clockInterval?: any;
  private audioCtx?: AudioContext;

  // Track start times of orders for accurate KDS elapsed timers
  private orderTimers: Map<number, number> = new Map();

  // Reactive Computed Orders from StateService
  readonly pendingOrders = computed(() => {
    return this.stateService.orders().filter(o => o.status === 'PENDING');
  });

  readonly pickingOrders = computed(() => {
    return this.stateService.orders().filter(o => o.status === 'PICKING');
  });

  readonly readyOrders = computed(() => {
    return this.stateService.orders().filter(o => o.status === 'BILLED' || o.status === 'DISPATCHED' || o.status === 'DELIVERED');
  });

  readonly allActiveOrders = computed(() => {
    return this.stateService.orders();
  });

  readonly totalPendingKg = computed(() => {
    const orders = [...this.pendingOrders(), ...this.pickingOrders()];
    let kg = 0;
    for (const o of orders) {
      for (const it of o.items) {
        kg += (it.quantity * it.grammage) / 1000;
      }
    }
    return kg.toFixed(1);
  });

  ngOnInit() {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);

    // Initialize timers for existing orders
    const now = Date.now();
    this.stateService.orders().forEach((o, index) => {
      // Stagger existing timestamps realistically (2m, 5m, 10m ago)
      this.orderTimers.set(o.orderId, now - (index * 180000 + 120000));
    });

    // Check saved theme
    const savedTheme = localStorage.getItem('despulpadora_theme');
    if (savedTheme) {
      this.isDarkTheme.set(savedTheme === 'dark');
    }
  }

  ngOnDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }

  private updateClock() {
    const now = new Date();
    this.currentTime.set(now.toLocaleTimeString('es-CO', { hour12: true }));
  }

  returnToErp() {
    this.router.navigate(['/orders']);
  }

  toggleTheme() {
    this.isDarkTheme.update(v => !v);
  }

  toggleSound() {
    this.soundEnabled.update(v => !v);
    if (this.soundEnabled()) {
      this.playKitchenBellChime();
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // =========================================================================
  // AUDIO SYNTHESIS CHIME (WEB AUDIO API - RESTAURANT POS BELL)
  // =========================================================================
  private playKitchenBellChime() {
    if (!this.soundEnabled()) return;

    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Note 1: High crisp bell ping (880 Hz - A5)
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

      // Note 2: Harmonic chime (1320 Hz - E6)
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
      // Audio context may be restricted by browser until first user gesture
    }
  }

  // =========================================================================
  // SIMULATOR: INCOMING URGENT ORDER
  // =========================================================================
  simulateIncomingOrder() {
    const clients = [
      { name: 'Restaurante Wok Parque 93', address: 'Calle 93A # 13-25, Chicó Norte, Bogotá' },
      { name: 'Crepes & Waffles Zona G', address: 'Cra 5 # 69-18, Chapinero, Bogotá' },
      { name: 'Frutería & Helados El Retén Chía', address: 'Variante Chía - Cota Km 3' },
      { name: 'Bistro Cota Gourmet', address: 'Variante Cota, Cundinamarca' },
      { name: 'Café & Panadería Usaquén', address: 'Cra 6A # 119-24, Usaquén, Bogotá' }
    ];

    const fruitPresets = [
      { name: 'Maracuyá', gram: 1000 as const, price: 11000 },
      { name: 'Mango Tommy', gram: 1000 as const, price: 10500 },
      { name: 'Lulo de Castilla', gram: 500 as const, price: 6600 },
      { name: 'Mora de Castilla', gram: 500 as const, price: 6500 },
      { name: 'Guanábana Criolla', gram: 1000 as const, price: 13800 }
    ];

    const client = clients[Math.floor(Math.random() * clients.length)];
    const itemCount = Math.floor(Math.random() * 3) + 2;
    const items = [];

    for (let i = 0; i < itemCount; i++) {
      const f = fruitPresets[Math.floor(Math.random() * fruitPresets.length)];
      const qty = Math.floor(Math.random() * 8) + 4;
      items.push({
        fruitName: f.name,
        grammage: f.gram,
        quantity: qty,
        unitPrice: f.price
      });
    }

    const newOrder = this.stateService.createOrder({
      clientName: client.name,
      clientPhone: '315 ' + Math.floor(1000000 + Math.random() * 9000000),
      clientAddress: client.address,
      notes: 'URGENTE · Pedido simulado para alistamiento en cava',
      paymentMethodName: 'Contra Entrega Efectivo',
      items
    });

    this.orderTimers.set(newOrder.orderId, Date.now());

    // Kitchen chime
    this.playKitchenBellChime();

    // Confetti effect
    confetti({
      particleCount: 35,
      spread: 50,
      origin: { y: 0.15 }
    });

    this.notification.info(
      '¡Nueva Comanda en Pantalla!',
      `Pedido ${newOrder.orderNumber} para ${client.name}`
    );
  }

  // =========================================================================
  // TICKET ACTIONS & STATUS ADVANCEMENTS
  // =========================================================================
  advanceStatus(order: OrderDto, newStatus: OrderStatus) {
    this.stateService.updateOrderStatus(order.orderId, newStatus);
    if (!this.orderTimers.has(order.orderId)) {
      this.orderTimers.set(order.orderId, Date.now());
    }
  }

  completeOrderPicking(order: OrderDto) {
    // Mark all items as picked
    order.items.forEach(it => {
      this.stateService.updateItemPickedQuantity(
        order.orderId,
        it.fruitId,
        it.grammage,
        it.quantity
      );
    });

    // Advance order to BILLED / ready for billing and dispatch
    this.stateService.updateOrderStatus(order.orderId, 'BILLED');

    this.playKitchenBellChime();

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });

    this.notification.success(
      '¡Alistamiento Completado!',
      `${order.orderNumber} empacado y listo para despacho.`
    );
  }

  toggleItem(order: OrderDto, item: any) {
    const isCompleted = (item.pickedQuantity || 0) >= item.quantity;
    const newQty = isCompleted ? 0 : item.quantity;
    this.stateService.updateItemPickedQuantity(order.orderId, item.fruitId, item.grammage, newQty);
  }

  // =========================================================================
  // TIMERS & METRIC HELPERS
  // =========================================================================
  getOrderElapsedTime(order: OrderDto): string {
    const startTime = this.orderTimers.get(order.orderId) || Date.now() - 120000;
    const diffSec = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  isTimerOverdue(order: OrderDto): boolean {
    const startTime = this.orderTimers.get(order.orderId) || Date.now();
    const diffSec = (Date.now() - startTime) / 1000;
    return diffSec > 900; // > 15 mins alert
  }

  calculateOrderKg(order: OrderDto): string {
    const sum = order.items.reduce((acc, it) => acc + (it.quantity * it.grammage) / 1000, 0);
    return sum.toFixed(1);
  }

  getOrderPickedPercentage(order: OrderDto): number {
    const total = order.items.reduce((acc, it) => acc + it.quantity, 0);
    if (total === 0) return 0;
    const picked = order.items.reduce((acc, it) => acc + (it.pickedQuantity || 0), 0);
    return Math.min(100, Math.round((picked / total) * 100));
  }

  getStatusBadgeClass(status: OrderStatus): string {
    switch (status) {
      case 'PENDING': return 'chip-warning';
      case 'PICKING': return 'chip-purple';
      case 'BILLED':
      case 'DISPATCHED':
      case 'DELIVERED':
        return 'chip-success';
      default: return '';
    }
  }

  getStatusText(status: OrderStatus): string {
    switch (status) {
      case 'PENDING': return 'Por Iniciar';
      case 'PICKING': return 'En Picking';
      case 'BILLED': return 'Facturado';
      case 'DISPATCHED': return 'En Reparto';
      case 'DELIVERED': return 'Entregado';
      default: return status;
    }
  }
}
