import {
  Component,
  computed,
  inject,
  signal,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { FruitConfig } from '../../core/data/initial-data';
import { OrderDto } from '../../core/models/business.models';
import confetti from 'canvas-confetti';

interface CartItem {
  fruitId: number;
  fruitName: string;
  grammage: 140 | 250 | 500 | 1000;
  quantity: number;
  unitPrice: number;
  color?: string;
}

@Component({
  selector: 'app-client-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="portal-root">
      <!-- ========================================================
           TOP BRAND HEADER
           ======================================================== -->
      <header class="portal-header">
        <div class="header-inner">
          <div class="brand-left">
            <img src="/logo-dgl.png" alt="DGL Despulpadora" class="brand-logo" />
            <div class="brand-text">
              <div class="brand-title-row">
                <span class="brand-name">DGL Despulpadora</span>
                <span class="portal-badge">PORTAL CLIENTES</span>
              </div>
              <p class="brand-tagline">{{ stateService.portalCmsConfig().brandTagline }}</p>
            </div>
          </div>

          <div class="header-actions">
            <!-- Contact / WhatsApp pill -->
            <a
              [href]="'https://wa.me/' + stateService.portalCmsConfig().whatsappPhone + '?text=Hola%20DGL%20Despulpadora,%20tengo%20una%20consulta%20sobre%20mi%20pedido'"
              target="_blank"
              class="contact-pill"
              title="Atención directa por WhatsApp"
            >
              <span class="wa-dot"></span>
              <span class="wa-text">Atención WhatsApp</span>
            </a>

            <!-- Admin Shortcut to Return to ERP -->
            <button
              type="button"
              class="erp-return-btn"
              (click)="returnToErp()"
              title="Volver al panel general administrativo de la PWA"
            >
              <span>Panel ERP</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- ========================================================
           PORTAL HERO BANNER (CATALOG PRESENTATION)
           ======================================================== -->
      <section class="portal-hero-banner">
        <div class="section-container">
          <div class="hero-card">
            <div class="hero-main-info">
              <span class="hero-badge">
                <img src="/logo-dgl.png" alt="DGL" class="hero-logo-mini" />
                {{ stateService.portalCmsConfig().heroBadge }}
              </span>
              <h2 class="hero-title">{{ stateService.portalCmsConfig().heroTitle }}</h2>
              <p class="hero-desc">
                {{ stateService.portalCmsConfig().heroDescription }}
              </p>
            </div>
            <div class="hero-features-chips">
              <div class="feature-chip">
                <span class="chip-icon">✨</span>
                <span>{{ stateService.portalCmsConfig().chip1Text }}</span>
              </div>
              <div class="feature-chip">
                <span class="chip-icon">🧊</span>
                <span>{{ stateService.portalCmsConfig().chip2Text }}</span>
              </div>
              <div class="feature-chip">
                <span class="chip-icon">⚡</span>
                <span>{{ stateService.portalCmsConfig().chip3Text }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ========================================================
           CATALOG SECTION: CATEGORIES & PRODUCT CARDS
           ======================================================== -->
      <main class="portal-main">
        <div class="section-container">
          <!-- Filter & Search Toolbar -->
          <div class="catalog-toolbar">
            <div class="search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                class="search-input"
                placeholder="Buscar pulpa de fruta (Maracuyá, Mango, Lulo, Mora...)"
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
              />
              @if (searchQuery()) {
                <button class="clear-btn" (click)="searchQuery.set('')">&times;</button>
              }
            </div>

            <!-- Category Pills -->
            <div class="category-pills-row">
              <button
                type="button"
                class="cat-pill"
                [class.active]="selectedCategory() === 'ALL'"
                (click)="selectedCategory.set('ALL')"
              >
                Todas las Frutas
              </button>
              @for (cat of categories(); track cat) {
                <button
                  type="button"
                  class="cat-pill"
                  [class.active]="selectedCategory() === cat"
                  (click)="selectedCategory.set(cat)"
                >
                  {{ cat }}
                </button>
              }
            </div>
          </div>

          <!-- Product Cards Grid -->
          <div class="products-grid">
            @for (fruit of filteredFruits(); track fruit.id) {
              <div
                class="product-card"
                [class.in-cart]="getFruitTotalQuantityInCart(fruit.fruitId || 0) > 0"
              >
                <!-- Food Photography Product Image -->
                <div class="product-media-container">
                  <img
                    [src]="fruit.imageUrl || ('/fruits/' + fruit.id + '.jpg')"
                    [alt]="fruit.name"
                    class="fruit-main-img"
                    loading="lazy"
                  />
                  <div class="media-overlay-gradient"></div>

                  <!-- Brand Seal Stamp with logo-dgl.png -->
                  <div class="brand-sticker-stamp" title="Marca Certificada DGL">
                    <img src="/logo-dgl.png" alt="DGL" />
                  </div>

                  <!-- Floating Category Badge -->
                  <span class="media-category-badge" [style.background]="fruit.color || '#1e5e3a'">
                    {{ fruit.category || '100% Natural' }}
                  </span>

                  <!-- Cart Indicator if in Cart -->
                  @if (getFruitTotalQuantityInCart(fruit.fruitId || 0) > 0) {
                    <span class="media-cart-badge">
                      ✓ {{ getFruitTotalQuantityInCart(fruit.fruitId || 0) }} en pedido
                    </span>
                  }
                </div>

                <div class="product-identity-bar">
                  <h4 class="fruit-name">{{ fruit.name }}</h4>
                  <span class="fruit-scientific">{{ fruit.scientificName }}</span>
                </div>

                <!-- Card Body: Description & Presentation Tabs -->
                <div class="card-body">
                  <p class="fruit-desc">
                    {{ fruit.description || '100% pulpa natural pura pasteurizada, sin agua añadida ni conservantes artificiales.' }}
                  </p>

                  <!-- Presentation Selector Tabs (140g, 250g, 500g, 1000g) -->
                  <div class="grammage-selector-box">
                    <span class="grammage-box-lbl">Selecciona la Presentación:</span>
                    <div class="grammage-pills-row">
                      <button
                        type="button"
                        class="gram-btn"
                        [class.active]="getSelectedGrammage(fruit.id) === 140"
                        (click)="setSelectedGrammage(fruit.id, 140)"
                      >
                        140g
                      </button>
                      <button
                        type="button"
                        class="gram-btn"
                        [class.active]="getSelectedGrammage(fruit.id) === 250"
                        (click)="setSelectedGrammage(fruit.id, 250)"
                      >
                        250g
                      </button>
                      <button
                        type="button"
                        class="gram-btn"
                        [class.active]="getSelectedGrammage(fruit.id) === 500"
                        (click)="setSelectedGrammage(fruit.id, 500)"
                      >
                        500g
                      </button>
                      <button
                        type="button"
                        class="gram-btn"
                        [class.active]="getSelectedGrammage(fruit.id) === 1000"
                        (click)="setSelectedGrammage(fruit.id, 1000)"
                      >
                        1 Kg
                      </button>
                    </div>
                  </div>

                  <!-- Price Summary for the Selected Presentation -->
                  <div class="price-availability-row">
                    <div>
                      <span class="price-tag">
                        {{ formatCOP(getPrice(fruit, getSelectedGrammage(fruit.id))) }}
                      </span>
                      <span class="unit-desc">/ Bolsa {{ getSelectedGrammage(fruit.id) }}g</span>
                    </div>
                  </div>

                  <!-- Interactive Stepper & Quick Add (Cliqueable) -->
                  <div class="card-interactive-action">
                    <div class="stepper-wrap">
                      <button
                        type="button"
                        class="stepper-btn btn-minus"
                        (click)="updateItemQuantity(fruit, getSelectedGrammage(fruit.id), -1)"
                        title="Restar 1 bolsa"
                      >
                        -
                      </button>

                      <span class="stepper-val">
                        {{ getItemQuantity(fruit.fruitId || 0, getSelectedGrammage(fruit.id)) }}
                      </span>

                      <button
                        type="button"
                        class="stepper-btn btn-plus"
                        (click)="updateItemQuantity(fruit, getSelectedGrammage(fruit.id), 1)"
                        title="Sumar 1 bolsa"
                      >
                        +
                      </button>
                    </div>

                    <!-- Bulk quick add buttons -->
                    <div class="bulk-add-row">
                      <button
                        type="button"
                        class="bulk-btn"
                        (click)="updateItemQuantity(fruit, getSelectedGrammage(fruit.id), 5)"
                        title="Sumar 5 bolsas"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        class="bulk-btn"
                        (click)="updateItemQuantity(fruit, getSelectedGrammage(fruit.id), 10)"
                        title="Sumar 10 bolsas"
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        class="bulk-btn"
                        (click)="updateItemQuantity(fruit, getSelectedGrammage(fruit.id), 25)"
                        title="Sumar 25 bolsas"
                      >
                        +25
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </main>

      <!-- ========================================================
           FLOATING CART PILL BUTTON (BOTTOM RIGHT)
           ======================================================== -->
      <button
        type="button"
        class="cart-floating-btn"
        (click)="toggleCartDrawer()"
        [class.has-items]="totalCartItems() > 0"
        title="Ver canasta de pedidos"
      >
        <span class="cart-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        </span>
        <div class="cart-btn-info">
          <span class="cart-count-badge">{{ totalCartItems() }}</span>
          <span class="cart-subtotal">{{ formatCOP(totalCartAmount()) }}</span>
        </div>
      </button>

      <!-- ========================================================
           CART DRAWER / FLOATING SUMMARY (ORDER ORGANIZER)
           ======================================================== -->
      @if (showCartDrawer()) {
        <div class="drawer-backdrop" (click)="showCartDrawer.set(false)">
          <div class="cart-drawer" (click)="$event.stopPropagation()">
            <!-- Drawer Header -->
            <div class="drawer-header">
              @if (cartDrawerStep() === 'checkout') {
                <div class="drawer-header-left">
                  <button type="button" class="btn-drawer-back" (click)="cartDrawerStep.set('items')">
                    ← Volver
                  </button>
                  <div>
                    <h3 class="drawer-title">Datos del Cliente & Despacho</h3>
                    <p class="drawer-sub">Completa los datos para confirmar tu entrega</p>
                  </div>
                </div>
              } @else {
                <div class="drawer-header-left">
                  <span class="drawer-icon">🛒</span>
                  <div>
                    <h3 class="drawer-title">Tu Pedido de Pulpa</h3>
                    <p class="drawer-sub">
                      {{ totalCartItems() }} unidades · {{ (totalCartKg() | number:'1.1-1') }} Kg de fruta
                    </p>
                  </div>
                </div>
              }
              <button class="drawer-close" (click)="closeCartDrawer()">&times;</button>
            </div>

            <!-- STEP 1: CART ITEMS -->
            @if (cartDrawerStep() === 'items') {
              <div class="drawer-items-list">
                @if (cart().length === 0) {
                  <div class="empty-cart-state">
                    <div class="empty-cart-icon">🛒</div>
                    <h4>Tu canasta está vacía</h4>
                    <p>Selecciona las pulpas de fruta y presentaciones que deseas ordenar en el catálogo.</p>
                  </div>
                } @else {
                  @for (item of cart(); track item.fruitId + '-' + item.grammage) {
                    <div class="cart-item-card">
                      <img
                        [src]="'/fruits/' + getFruitIdStr(item.fruitId) + '.jpg'"
                        [alt]="item.fruitName"
                        class="cart-item-thumb"
                        loading="lazy"
                      />
                      <div class="item-info">
                        <div class="item-head">
                          <strong class="item-fruit">{{ item.fruitName }}</strong>
                          <span class="item-gram">Bolsa {{ item.grammage }}g</span>
                        </div>
                        <div class="item-prices">
                          <span class="price-single">{{ formatCOP(item.unitPrice) }} c/u</span>
                          <span class="price-subtotal">{{ formatCOP(item.unitPrice * item.quantity) }}</span>
                        </div>
                      </div>

                      <div class="item-stepper">
                        <button
                          type="button"
                          class="drawer-stepper-btn"
                          (click)="updateQuantityById(item.fruitId, item.grammage, -1)"
                        >
                          -
                        </button>
                        <span class="drawer-stepper-val">{{ item.quantity }}</span>
                        <button
                          type="button"
                          class="drawer-stepper-btn"
                          (click)="updateQuantityById(item.fruitId, item.grammage, 1)"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          class="drawer-remove-btn"
                          (click)="removeItem(item.fruitId, item.grammage)"
                          title="Eliminar de la orden"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  }
                }
              </div>

              <!-- Drawer Footer for Step 1 -->
              <div class="drawer-footer">
                <div class="order-summary-box">
                  <div class="summary-line">
                    <span>Total Unidades:</span>
                    <strong>{{ totalCartItems() }} bolsas</strong>
                  </div>
                  <div class="summary-line">
                    <span>Volumen Total:</span>
                    <span>{{ totalCartKg() | number:'1.1-1' }} Kg</span>
                  </div>
                  <div class="summary-total-line">
                    <span>Total a Pagar:</span>
                    <span class="total-highlight">{{ formatCOP(totalCartAmount()) }}</span>
                  </div>
                </div>

                <button
                  type="button"
                  class="btn-submit-order"
                  [disabled]="cart().length === 0"
                  (click)="goToCheckout()"
                >
                  <span>Confirmar Selección y Datos de Entrega ➔</span>
                </button>
              </div>
            }

            <!-- STEP 2: CLIENT DETAILS AFTER CONFIRMING CART -->
            @if (cartDrawerStep() === 'checkout') {
              <div class="drawer-checkout-body">
                <!-- Quick Client Switcher -->
                <div class="drawer-client-switcher">
                  <label class="drawer-field-lbl">Cargar Datos de Cliente:</label>
                  <select
                    class="drawer-field-select"
                    [ngModel]="selectedClientId()"
                    (ngModelChange)="onClientSelect($event)"
                  >
                    @for (c of stateService.clients(); track c.clientId) {
                      <option [ngValue]="c.clientId">
                        {{ c.fullName }} ({{ c.city || 'Principal' }})
                      </option>
                    }
                    <option value="new">+ Registrar otro negocio o cliente</option>
                  </select>
                </div>

                <div class="drawer-fields-column">
                  <div class="drawer-field-group">
                    <label class="drawer-field-lbl">Nombre / Negocio *</label>
                    <input
                      type="text"
                      class="drawer-field-input"
                      placeholder="Ej: Restaurante El Portal, Frutería Luz..."
                      [ngModel]="clientName()"
                      (ngModelChange)="clientName.set($event)"
                    />
                  </div>

                  <div class="drawer-field-group">
                    <label class="drawer-field-lbl">Teléfono / WhatsApp *</label>
                    <input
                      type="text"
                      class="drawer-field-input"
                      placeholder="Ej: 315 456 7890"
                      [ngModel]="clientPhone()"
                      (ngModelChange)="clientPhone.set($event)"
                    />
                  </div>

                  <div class="drawer-field-group">
                    <label class="drawer-field-lbl">Dirección de Entrega *</label>
                    <input
                      type="text"
                      class="drawer-field-input"
                      placeholder="Ej: Calle 45 # 12-30, Cali"
                      [ngModel]="clientAddress()"
                      (ngModelChange)="clientAddress.set($event)"
                    />
                  </div>

                  <div class="drawer-field-row">
                    <div class="drawer-field-group flex-1">
                      <label class="drawer-field-lbl">Forma de Pago *</label>
                      <select
                        class="drawer-field-select"
                        [ngModel]="selectedPaymentMethod()"
                        (ngModelChange)="selectedPaymentMethod.set($event)"
                      >
                        @for (pm of stateService.activePaymentMethods(); track pm.paymentMethodId) {
                          <option [value]="pm.name">{{ pm.name }}</option>
                        }
                      </select>
                    </div>

                    <div class="drawer-field-group flex-1">
                      <label class="drawer-field-lbl">Día de Entrega</label>
                      <select
                        class="drawer-field-select"
                        [ngModel]="deliveryDay()"
                        (ngModelChange)="deliveryDay.set($event)"
                      >
                        <option value="Hoy mismo (Prioritario)">Hoy mismo (Prioritario)</option>
                        <option value="Mañana a primera hora">Mañana a primera hora</option>
                        <option value="Día Siguiente">Día Siguiente</option>
                        <option value="Programado fin de semana">Programado fin de semana</option>
                      </select>
                    </div>
                  </div>

                  <div class="drawer-field-group">
                    <label class="drawer-field-lbl">Instrucciones de Despacho (Opcional)</label>
                    <input
                      type="text"
                      class="drawer-field-input"
                      placeholder="Ej: Recibir antes de las 11:00 am, preguntar en recepción..."
                      [ngModel]="deliveryNotes()"
                      (ngModelChange)="deliveryNotes.set($event)"
                    />
                  </div>
                </div>
              </div>

              <!-- Drawer Footer for Step 2 -->
              <div class="drawer-footer">
                <div class="order-summary-box">
                  <div class="summary-line">
                    <span>Pedido para:</span>
                    <strong>{{ clientName() || 'Cliente' }}</strong>
                  </div>
                  <div class="summary-line">
                    <span>Entrega:</span>
                    <span class="text-truncate">{{ clientAddress() || 'Sin dirección' }}</span>
                  </div>
                  <div class="summary-total-line">
                    <span>Total a Pagar:</span>
                    <span class="total-highlight">{{ formatCOP(totalCartAmount()) }}</span>
                  </div>
                </div>

                <button
                  type="button"
                  class="btn-submit-order"
                  (click)="submitClientOrder()"
                >
                  <span>🚀 Finalizar Pedido y Confirmar</span>
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- ========================================================
           ORDER SUCCESS MODAL (CONFIRMATION & WHATSAPP)
           ======================================================== -->
      @if (showSuccessModal() && submittedOrder(); as order) {
        <div class="modal-backdrop">
          <div class="success-modal">
            <div class="success-header">
              <div class="success-icon-wrap">🎉</div>
              <h3 class="success-title">¡Pedido Registrado con Éxito!</h3>
              <p class="success-subtitle">
                Tu solicitud ya entró a la línea de preparación y alistamiento en cava.
              </p>
            </div>

            <div class="success-details-card">
              <div class="code-banner">
                <span class="code-lbl">Código de Orden:</span>
                <span class="code-val">{{ order.orderNumber }}</span>
              </div>

              <div class="order-meta-grid">
                <div>
                  <span class="meta-label">Cliente:</span>
                  <div class="meta-val">{{ order.clientName }}</div>
                </div>
                <div>
                  <span class="meta-label">Teléfono:</span>
                  <div class="meta-val">{{ order.clientPhone }}</div>
                </div>
                <div>
                  <span class="meta-label">Dirección:</span>
                  <div class="meta-val">{{ order.clientAddress }}</div>
                </div>
                <div>
                  <span class="meta-label">Forma de Pago:</span>
                  <div class="meta-val">{{ order.paymentMethodName }}</div>
                </div>
              </div>

              <div class="order-items-summary">
                <div class="items-head">Resumen de Pulpas Solicitadas:</div>
                @for (item of order.items; track item.fruitId + '-' + item.grammage) {
                  <div class="item-summary-row">
                    <span>{{ item.quantity }}x {{ item.fruitName }} ({{ item.grammage }}g)</span>
                    <strong>{{ formatCOP(item.subtotal) }}</strong>
                  </div>
                }
                <div class="item-summary-row total-row">
                  <span>Total de la Orden:</span>
                  <strong>{{ formatCOP(order.totalAmount) }}</strong>
                </div>
              </div>
            </div>

            <!-- Modal Action Buttons: WhatsApp & New Order -->
            <div class="success-actions">
              <button
                type="button"
                class="btn-send-whatsapp"
                (click)="openWhatsAppConfirmation(order)"
              >
                <span>📲 Enviar Confirmación por WhatsApp</span>
              </button>

              <button
                type="button"
                class="btn-new-order"
                (click)="startNewOrder()"
              >
                + Hacer Otro Pedido
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
    }

    .portal-root {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .section-container {
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 20px;
    }

    /* HEADER */
    .portal-header {
      background: #ffffff;
      border-bottom: 1.5px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
    }

    .header-inner {
      max-width: 1280px;
      margin: 0 auto;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .brand-left {
      display: flex;
      align-items: center;
      gap: 14px;

      .brand-logo {
        width: 44px;
        height: 44px;
        object-fit: contain;
      }

      .brand-title-row {
        display: flex;
        align-items: center;
        gap: 8px;

        .brand-name {
          font-size: 1.25rem;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .portal-badge {
          font-size: 0.65rem;
          font-weight: 900;
          background: #ecfdf5;
          color: #164a2d;
          border: 1px solid #d1e7d8;
          padding: 2px 7px;
          border-radius: 9999px;
          letter-spacing: 0.05em;
        }
      }

      .brand-tagline {
        font-size: 0.78rem;
        color: #64748b;
        margin: 2px 0 0 0;
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .contact-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 7px 14px;
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: 9999px;
      color: #166534;
      font-size: 0.8rem;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;

      &:hover {
        background: #16a34a;
        color: #ffffff;
        border-color: #16a34a;
      }

      .wa-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
      }
    }

    .erp-return-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 7px 12px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 9999px;
      color: #475569;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
    }

    /* FLOATING CART BUTTON (ESQUINA DERECHA ABAJO FLOTANTE) */
    .cart-floating-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 11px 22px;
      background: #1e5e3a;
      border: 2px solid rgba(255, 255, 255, 0.45);
      border-radius: 9999px;
      color: #ffffff;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(30, 94, 58, 0.45), 0 2px 8px rgba(0, 0, 0, 0.15);
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        background: #164a2d;
        transform: translateY(-2px) scale(1.04);
        box-shadow: 0 12px 30px rgba(30, 94, 58, 0.55);
      }

      &:active {
        transform: scale(0.96);
      }

      .cart-icon {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .cart-btn-info {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .cart-count-badge {
        background: rgba(255, 255, 255, 0.28);
        padding: 2px 10px;
        border-radius: 9999px;
        font-size: 0.82rem;
        font-weight: 900;
      }

      .cart-subtotal {
        font-size: 0.95rem;
        font-weight: 900;
      }
    }

    /* HERO BANNER (COMPACT / ACHICADO) */
    .portal-hero-banner {
      padding: 12px 0 6px 0;
    }

    .hero-card {
      background: linear-gradient(135deg, #064e3b 0%, #164a2d 50%, #1e5e3a 100%);
      border-radius: 14px;
      padding: 12px 22px;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-shadow: 0 6px 20px rgba(6, 78, 59, 0.15);
      position: relative;
      overflow: hidden;

      &::after {
        content: '';
        position: absolute;
        right: -20px;
        bottom: -30px;
        width: 140px;
        height: 140px;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 70%);
        border-radius: 50%;
        pointer-events: none;
      }

      .hero-main-info {
        max-width: 620px;

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.16);
          backdrop-filter: blur(8px);
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          margin-bottom: 4px;

          .hero-logo-mini {
            width: 15px;
            height: 15px;
            object-fit: contain;
          }
        }

        .hero-title {
          font-size: 1.15rem;
          font-weight: 900;
          margin: 0 0 3px 0;
          letter-spacing: -0.01em;
          color: #ffffff;
          line-height: 1.25;
        }

        .hero-desc {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.88);
          margin: 0;
          line-height: 1.35;
        }
      }

      .hero-features-chips {
        display: flex;
        flex-direction: row;
        gap: 6px;
        flex-shrink: 0;

        .feature-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(6px);
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.15);
          white-space: nowrap;
        }
      }
    }

    /* CATALOG MAIN */
    .portal-main {
      padding: 10px 0 60px 0;
      flex: 1;
    }

    .catalog-toolbar {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;

      .search-box {
        position: relative;
        width: 340px;
        max-width: 100%;

        svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 10px 32px 10px 38px;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-radius: 9999px;
          font-size: 0.85rem;
          color: #0f172a;
          outline: none;
          box-sizing: border-box;

          &:focus {
            border-color: #1e5e3a;
          }
        }

        .clear-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 1.2rem;
          cursor: pointer;
        }
      }

      .category-pills-row {
        display: flex;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
        white-space: nowrap;
        padding-bottom: 4px;
      }

      .cat-pill {
        padding: 7px 16px;
        border-radius: 9999px;
        border: 1.5px solid #cbd5e1;
        background: #ffffff;
        color: #475569;
        font-size: 0.8rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          border-color: #1e5e3a;
          color: #0f172a;
        }

        &.active {
          background: #1e5e3a;
          border-color: #1e5e3a;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(30, 94, 58, 0.35);
        }
      }
    }

    /* PRODUCTS GRID */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 20px;
    }

    .product-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 18px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);

      &:hover {
        transform: translateY(-3px);
        border-color: #1e5e3a;
        box-shadow: 0 8px 24px rgba(30, 94, 58, 0.12);
      }

      &.in-cart {
        border-color: #1e5e3a;
        box-shadow: 0 4px 18px rgba(30, 94, 58, 0.16);
      }
    }

    .product-media-container {
      position: relative;
      width: 100%;
      height: 190px;
      overflow: hidden;
      background: #e2e8f0;

      .fruit-main-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .media-overlay-gradient {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.5) 100%);
        pointer-events: none;
      }

      .brand-sticker-stamp {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 44px;
        height: 44px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(4px);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 5px;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.16), 0 0 0 2px rgba(255, 255, 255, 0.92);
        z-index: 3;
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);

        img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      }

      .media-category-badge {
        position: absolute;
        top: 12px;
        left: 12px;
        color: #ffffff;
        font-size: 0.68rem;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: 9999px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        letter-spacing: 0.03em;
        text-transform: uppercase;
        z-index: 2;
      }

      .media-cart-badge {
        position: absolute;
        bottom: 12px;
        right: 12px;
        background: #1e5e3a;
        color: #ffffff;
        font-size: 0.72rem;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: 9999px;
        box-shadow: 0 2px 8px rgba(30, 94, 58, 0.4);
        z-index: 2;
      }
    }

    .product-card:hover {
      .fruit-main-img {
        transform: scale(1.06);
      }
      .brand-sticker-stamp {
        transform: scale(1.1) rotate(5deg);
      }
    }

    .product-identity-bar {
      padding: 14px 16px 0 16px;

      .fruit-name {
        font-size: 1.2rem;
        font-weight: 900;
        color: #0f172a;
        margin: 0;
        line-height: 1.2;
      }

      .fruit-scientific {
        font-size: 0.74rem;
        color: #64748b;
        font-style: italic;
        display: block;
        margin-top: 2px;
      }
    }

    .card-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      flex: 1;
      justify-content: space-between;

      .fruit-desc {
        font-size: 0.78rem;
        color: #64748b;
        margin: 0;
        line-height: 1.4;
      }
    }

    .grammage-selector-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px;

      .grammage-box-lbl {
        font-size: 0.68rem;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        display: block;
        margin-bottom: 6px;
      }

      .grammage-pills-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;

        .gram-btn {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          padding: 6px 0;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 800;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            border-color: #1e5e3a;
            color: #0f172a;
          }

          &.active {
            background: #1e5e3a;
            border-color: #1e5e3a;
            color: #ffffff;
            box-shadow: 0 2px 6px rgba(30, 94, 58, 0.35);
          }
        }
      }
    }

    .price-availability-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;

      .price-tag {
        font-size: 1.35rem;
        font-weight: 900;
        color: #0f172a;
      }

      .unit-desc {
        font-size: 0.78rem;
        color: #64748b;
        margin-left: 4px;
      }

      .stock-pill {
        font-size: 0.72rem;
        font-weight: 800;
        color: #164a2d;
        background: #ecfdf5;
        padding: 2px 8px;
        border-radius: 9999px;
      }
    }

    .card-interactive-action {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;

      .stepper-wrap {
        display: flex;
        align-items: center;
        background: #f1f5f9;
        border: 1.5px solid #cbd5e1;
        border-radius: 12px;
        overflow: hidden;

        .stepper-btn {
          width: 44px;
          height: 40px;
          background: #ffffff;
          border: none;
          font-size: 1.25rem;
          font-weight: 900;
          color: #0f172a;
          cursor: pointer;
          transition: background 0.12s ease;

          &:hover {
            background: #e2e8f0;
          }

          &:active {
            background: #cbd5e1;
          }
        }

        .stepper-val {
          flex: 1;
          text-align: center;
          font-family: monospace;
          font-size: 1.15rem;
          font-weight: 900;
          color: #0f172a;
        }
      }

      .bulk-add-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;

        .bulk-btn {
          padding: 6px 0;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 800;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            background: #f0fdf4;
            border-color: #1e5e3a;
            color: #164a2d;
          }
        }
      }
    }

    /* CART DRAWER */
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
    }

    .cart-drawer {
      width: 100%;
      max-width: 460px;
      height: 100%;
      background: #ffffff;
      box-shadow: -8px 0 30px rgba(0, 0, 0, 0.25);
      display: flex;
      flex-direction: column;
      animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .drawer-header {
      padding: 20px;
      border-bottom: 1.5px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;

      .drawer-header-left {
        display: flex;
        align-items: center;
        gap: 12px;

        .btn-drawer-back {
          background: #e2e8f0;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 5px 10px;
          font-size: 0.74rem;
          font-weight: 800;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            background: #cbd5e1;
            color: #0f172a;
          }
        }

        .drawer-icon {
          font-size: 1.8rem;
        }

        .drawer-title {
          font-size: 1.2rem;
          font-weight: 900;
          margin: 0;
          color: #0f172a;
        }

        .drawer-sub {
          font-size: 0.78rem;
          color: #64748b;
          margin: 2px 0 0 0;
        }
      }

      .drawer-close {
        background: none;
        border: none;
        font-size: 1.6rem;
        color: #94a3b8;
        cursor: pointer;

        &:hover {
          color: #0f172a;
        }
      }
    }

    .drawer-items-list {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .empty-cart-state {
      text-align: center;
      padding: 60px 20px;
      color: #94a3b8;

      .empty-cart-icon {
        font-size: 3rem;
        margin-bottom: 12px;
      }

      h4 {
        font-size: 1.1rem;
        font-weight: 800;
        color: #475569;
        margin-bottom: 6px;
      }

      p {
        font-size: 0.85rem;
      }
    }

    .cart-item-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;

      .cart-item-thumb {
        width: 52px;
        height: 52px;
        border-radius: 10px;
        object-fit: cover;
        flex-shrink: 0;
        border: 1px solid #cbd5e1;
      }

      .item-info {
        flex: 1;

        .item-head {
          display: flex;
          align-items: center;
          gap: 6px;

          .item-fruit {
            font-size: 0.95rem;
            color: #0f172a;
          }

          .item-gram {
            font-size: 0.72rem;
            font-weight: 700;
            background: #e2e8f0;
            color: #475569;
            padding: 1px 6px;
            border-radius: 4px;
          }
        }

        .item-prices {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-top: 4px;

          .price-single {
            font-size: 0.74rem;
            color: #64748b;
          }

          .price-subtotal {
            font-size: 0.95rem;
            font-weight: 800;
            color: #164a2d;
          }
        }
      }

      .item-stepper {
        display: flex;
        align-items: center;
        gap: 6px;

        .drawer-stepper-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-weight: 900;
          font-size: 1rem;
          color: #0f172a;
          cursor: pointer;

          &:hover {
            background: #e2e8f0;
          }
        }

        .drawer-stepper-val {
          font-family: monospace;
          font-size: 0.95rem;
          font-weight: 900;
          width: 24px;
          text-align: center;
        }

        .drawer-remove-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.1rem;
          padding: 4px;
          margin-left: 2px;
        }
      }
    }

    .drawer-checkout-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;

        .drawer-client-switcher {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .drawer-fields-column {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .drawer-field-row {
          display: flex;
          gap: 10px;

          .flex-1 {
            flex: 1;
          }
        }

        .drawer-field-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .drawer-field-lbl {
          font-size: 0.72rem;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .drawer-field-input,
        .drawer-field-select {
          width: 100%;
          padding: 9px 12px;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          font-size: 0.85rem;
          color: #0f172a;
          outline: none;
          box-sizing: border-box;

          &:focus {
            border-color: #1e5e3a;
            box-shadow: 0 0 0 3px rgba(30, 94, 58, 0.15);
          }
        }
      }

    .drawer-footer {
      padding: 20px;
      border-top: 1.5px solid #e2e8f0;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .order-summary-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;

      .summary-line {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        color: #475569;

        .text-truncate {
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .summary-total-line {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding-top: 8px;
        border-top: 1.5px dashed #cbd5e1;
        font-size: 1rem;
        font-weight: 800;
        color: #0f172a;

        .total-highlight {
          font-size: 1.35rem;
          font-weight: 900;
          color: #164a2d;
        }
      }
    }

    .btn-submit-order {
      width: 100%;
      padding: 14px;
      background: #1e5e3a;
      border: none;
      border-radius: 12px;
      color: #ffffff;
      font-size: 1rem;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(30, 94, 58, 0.4);
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background: #164a2d;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(30, 94, 58, 0.5);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    /* SUCCESS MODAL */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      z-index: 1100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .success-modal {
      width: 100%;
      max-width: 500px;
      background: #ffffff;
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      gap: 18px;
      animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalPop {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .success-header {
      text-align: center;

      .success-icon-wrap {
        font-size: 3rem;
        margin-bottom: 8px;
      }

      .success-title {
        font-size: 1.35rem;
        font-weight: 900;
        color: #0f172a;
        margin: 0;
      }

      .success-subtitle {
        font-size: 0.85rem;
        color: #64748b;
        margin: 4px 0 0 0;
      }
    }

    .success-details-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;

      .code-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #ecfdf5;
        border: 1px solid #d1e7d8;
        padding: 8px 12px;
        border-radius: 8px;

        .code-lbl {
          font-size: 0.78rem;
          font-weight: 700;
          color: #1e5e3a;
        }

        .code-val {
          font-family: monospace;
          font-size: 1rem;
          font-weight: 900;
          color: #164a2d;
        }
      }

      .order-meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;

        .meta-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }

        .meta-val {
          font-size: 0.85rem;
          font-weight: 800;
          color: #0f172a;
        }
      }

      .order-items-summary {
        border-top: 1px dashed #cbd5e1;
        padding-top: 10px;

        .items-head {
          font-size: 0.72rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .item-summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.82rem;
          color: #334155;
          margin-bottom: 4px;

          &.total-row {
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid #e2e8f0;
            font-size: 0.95rem;
            font-weight: 900;
            color: #164a2d;
          }
        }
      }
    }

    .success-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;

      .btn-send-whatsapp {
        width: 100%;
        padding: 13px;
        background: #25d366;
        border: none;
        border-radius: 12px;
        color: #ffffff;
        font-size: 0.95rem;
        font-weight: 900;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(37, 211, 102, 0.4);
        transition: all 0.2s ease;

        &:hover {
          background: #20ba5a;
        }
      }

      .btn-new-order {
        width: 100%;
        padding: 11px;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        color: #475569;
        font-size: 0.88rem;
        font-weight: 700;
        cursor: pointer;

        &:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
      }
    }

    @media (max-width: 768px) {
      .hero-card {
        flex-direction: column;
        align-items: flex-start;
        padding: 12px 16px;

        .hero-features-chips {
          flex-wrap: wrap;
          margin-top: 4px;
        }
      }

      .cart-floating-btn {
        bottom: 20px;
        right: 16px;
        padding: 10px 18px;
      }

      .header-actions .contact-pill {
        display: none;
      }
    }
  `]
})
export class ClientPortalComponent implements OnInit {
  readonly stateService = inject(StateService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  // Cart state
  readonly cart = signal<CartItem[]>([]);
  readonly selectedGrammages = signal<Record<string, 140 | 250 | 500 | 1000>>({});

  // Filter state
  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string>('ALL');

  // Customer info preloaded
  readonly selectedClientId = signal<number | 'new'>(1);
  readonly clientName = signal<string>('Restaurante El Portal del Valle');
  readonly clientPhone = signal<string>('315 456 7890');
  readonly clientAddress = signal<string>('Calle 45 # 12-30, Cali');
  readonly deliveryNotes = signal<string>('Entregar en horario de la mañana');
  readonly selectedPaymentMethod = signal<string>('Contra Entrega Efectivo');
  readonly deliveryDay = signal<string>('Hoy mismo (Prioritario)');

  // UI Drawer / Modals
  readonly showCartDrawer = signal<boolean>(false);
  readonly cartDrawerStep = signal<'items' | 'checkout'>('items');
  readonly showSuccessModal = signal<boolean>(false);
  readonly submittedOrder = signal<OrderDto | null>(null);

  // Computeds
  readonly categories = computed(() => {
    const set = new Set<string>();
    for (const f of this.stateService.fruits()) {
      if (f.isVisibleInPortal === false) continue;
      if (f.category) set.add(f.category);
    }
    return Array.from(set);
  });

  readonly filteredFruits = computed(() => {
    let list = this.stateService.fruits().filter(f => f.isVisibleInPortal !== false);
    const cat = this.selectedCategory();
    if (cat !== 'ALL') {
      list = list.filter(f => f.category === cat);
    }
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        (f.scientificName && f.scientificName.toLowerCase().includes(q)) ||
        (f.description && f.description.toLowerCase().includes(q))
      );
    }
    return list;
  });

  readonly totalCartItems = computed(() => {
    return this.cart().reduce((sum, item) => sum + item.quantity, 0);
  });

  readonly totalCartAmount = computed(() => {
    return this.cart().reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  });

  readonly totalCartKg = computed(() => {
    return this.cart().reduce((sum, item) => sum + ((item.quantity * item.grammage) / 1000), 0);
  });

  ngOnInit() {
    // Initialize default client if available
    const clients = this.stateService.clients();
    if (clients.length > 0) {
      const first = clients[0];
      this.selectedClientId.set(first.clientId);
      this.clientName.set(first.fullName);
      this.clientPhone.set(first.phone);
      this.clientAddress.set(first.address || 'Sede Principal');
    }

    // Initialize default payment method if available
    const pms = this.stateService.activePaymentMethods();
    if (pms.length > 0) {
      this.selectedPaymentMethod.set(pms[0].name);
    }
  }

  // ==========================================
  // CLIENT SWITCHER
  // ==========================================
  onClientSelect(val: any) {
    if (val === 'new') {
      this.selectedClientId.set('new');
      this.clientName.set('');
      this.clientPhone.set('');
      this.clientAddress.set('');
      this.deliveryNotes.set('');
    } else {
      const cId = Number(val);
      this.selectedClientId.set(cId);
      const c = this.stateService.clients().find(item => item.clientId === cId);
      if (c) {
        this.clientName.set(c.fullName);
        this.clientPhone.set(c.phone);
        this.clientAddress.set(c.address || '');
      }
    }
  }

  // ==========================================
  // GRAMMAGES & PRICES
  // ==========================================
  getFruitIdStr(fruitId: number): string {
    const fruit = this.stateService.fruits().find(f => (f.fruitId || 1) === fruitId);
    return fruit ? fruit.id : 'maracuya';
  }

  getSelectedGrammage(fruitId: string): 140 | 250 | 500 | 1000 {
    return this.selectedGrammages()[fruitId] || 500;
  }

  setSelectedGrammage(fruitId: string, grammage: 140 | 250 | 500 | 1000) {
    this.selectedGrammages.update(map => ({ ...map, [fruitId]: grammage }));
  }

  getPrice(fruit: FruitConfig, grammage: 140 | 250 | 500 | 1000): number {
    // 1. Check fruit prices map (administered from Portal Clientes Admin)
    const pKey = ('g' + grammage) as 'g140' | 'g250' | 'g500' | 'g1000';
    if (fruit.prices && fruit.prices[pKey]) {
      return fruit.prices[pKey];
    }

    // 2. Check if configured in productVariants
    const variant = this.stateService.productVariants().find(
      v => v.fruitId === (fruit.fruitId || 1) && v.grammage === grammage
    );
    if (variant && variant.basePrice) {
      return variant.basePrice;
    }

    // 3. Fallback standard default
    switch (grammage) {
      case 140: return 2000;
      case 250: return 3500;
      case 500: return 6000;
      case 1000: return 11000;
      default: return 5000;
    }
  }

  // ==========================================
  // CART OPERATIONS
  // ==========================================
  getItemQuantity(fruitId: number, grammage: 140 | 250 | 500 | 1000): number {
    const item = this.cart().find(i => i.fruitId === fruitId && i.grammage === grammage);
    return item ? item.quantity : 0;
  }

  getFruitTotalQuantityInCart(fruitId: number): number {
    return this.cart()
      .filter(i => i.fruitId === fruitId)
      .reduce((sum, i) => sum + i.quantity, 0);
  }

  updateItemQuantity(fruit: FruitConfig, grammage: 140 | 250 | 500 | 1000, delta: number) {
    const fId = fruit.fruitId || 1;
    const unitPrice = this.getPrice(fruit, grammage);

    this.cart.update(current => {
      const idx = current.findIndex(i => i.fruitId === fId && i.grammage === grammage);
      if (idx >= 0) {
        const nextQty = current[idx].quantity + delta;
        if (nextQty <= 0) {
          return current.filter((_, i) => i !== idx);
        } else {
          return current.map((item, i) => i === idx ? { ...item, quantity: nextQty } : item);
        }
      } else if (delta > 0) {
        return [
          ...current,
          {
            fruitId: fId,
            fruitName: fruit.name,
            grammage,
            quantity: delta,
            unitPrice,
            color: fruit.color
          }
        ];
      }
      return current;
    });
  }

  updateQuantityById(fruitId: number, grammage: 140 | 250 | 500 | 1000, delta: number) {
    this.cart.update(current => {
      const idx = current.findIndex(i => i.fruitId === fruitId && i.grammage === grammage);
      if (idx >= 0) {
        const nextQty = current[idx].quantity + delta;
        if (nextQty <= 0) {
          return current.filter((_, i) => i !== idx);
        } else {
          return current.map((item, i) => i === idx ? { ...item, quantity: nextQty } : item);
        }
      }
      return current;
    });
  }

  removeItem(fruitId: number, grammage: 140 | 250 | 500 | 1000) {
    this.cart.update(current =>
      current.filter(i => !(i.fruitId === fruitId && i.grammage === grammage))
    );
  }

  toggleCartDrawer() {
    this.showCartDrawer.update(s => {
      const next = !s;
      if (!next) this.cartDrawerStep.set('items');
      return next;
    });
  }

  closeCartDrawer() {
    this.showCartDrawer.set(false);
    this.cartDrawerStep.set('items');
  }

  goToCheckout() {
    if (this.cart().length === 0) {
      this.notification.warning('Canasta vacía', 'Agrega al menos una pulpa a tu pedido antes de continuar.');
      return;
    }
    this.cartDrawerStep.set('checkout');
  }

  // ==========================================
  // SUBMIT ORDER ("MANDAR A PEDIR")
  // ==========================================
  submitClientOrder() {
    if (this.cart().length === 0) {
      this.notification.warning('Canasta vacía', 'Agrega al menos una pulpa a tu pedido antes de continuar.');
      return;
    }

    const name = this.clientName().trim();
    if (!name) {
      this.notification.warning('Nombre requerido', 'Por favor ingresa tu nombre o el nombre de tu negocio.');
      return;
    }

    const phone = this.clientPhone().trim();
    if (!phone) {
      this.notification.warning('Teléfono requerido', 'Ingresa un número de teléfono o WhatsApp de contacto.');
      return;
    }

    const address = this.clientAddress().trim();
    if (!address) {
      this.notification.warning('Dirección requerida', 'Ingresa la dirección para la entrega de las pulpas.');
      return;
    }

    // Submit order to state service
    const createdOrder = this.stateService.createOrder({
      clientName: name,
      clientPhone: phone,
      clientAddress: address,
      notes: this.deliveryNotes().trim(),
      paymentMethodName: this.selectedPaymentMethod(),
      scheduledDay: this.deliveryDay(),
      items: this.cart().map(item => ({
        fruitName: item.fruitName,
        grammage: item.grammage,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    });

    // Celebration & feedback
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 }
    });

    this.submittedOrder.set(createdOrder);
    this.showCartDrawer.set(false);
    this.cartDrawerStep.set('items');
    this.showSuccessModal.set(true);

    // Clear cart for next order
    this.cart.set([]);
  }

  openWhatsAppConfirmation(order: OrderDto) {
    const itemsText = order.items
      .map(i => `• ${i.quantity}x ${i.fruitName} (${i.grammage}g) - ${this.formatCOP(i.subtotal)}`)
      .join('%0A');

    const message =
      `*¡Hola DGL Despulpadora!* 🌿%0A` +
      `Acabo de registrar el pedido *${order.orderNumber}* desde el portal de clientes:%0A%0A` +
      `*Cliente:* ${order.clientName}%0A` +
      `*Teléfono:* ${order.clientPhone}%0A` +
      `*Dirección:* ${order.clientAddress}%0A` +
      `*Forma de Pago:* ${order.paymentMethodName}%0A` +
      `*Entrega Programada:* ${order.scheduledDay || 'Hoy'}%0A` +
      (order.notes ? `*Instrucciones:* ${order.notes}%0A` : '') +
      `%0A*Detalle del Pedido:*%0A${itemsText}%0A%0A` +
      `*TOTAL:* ${this.formatCOP(order.totalAmount)} COP%0A%0A` +
      `Quedo atento a la confirmación de despacho. ¡Muchas gracias!`;

    const whatsappUrl = `https://wa.me/573154567890?text=${message}`;
    window.open(whatsappUrl, '_blank');
  }

  startNewOrder() {
    this.showSuccessModal.set(false);
    this.submittedOrder.set(null);
  }

  returnToErp() {
    this.router.navigate(['/dashboard']);
  }

  formatCOP(num: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num || 0);
  }
}
