import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { FruitConfig, PortalCmsConfig } from '../../core/data/initial-data';
import { CopCurrencyInputDirective } from '../../shared/directives/cop-currency-input.directive';

/**
 * Editable draft state for a client portal product card.
 */
export interface EditableCardDraft {
  id: string;
  fruitId?: number;
  name: string;
  scientificName: string;
  description: string;
  category: string;
  color: string;
  imageUrl: string;
  isVisibleInPortal: boolean;
  prices: Record<string, number>;
}

/**
 * Client portal catalog and CMS banner administration component.
 */
@Component({
  selector: 'app-client-portal-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, CopCurrencyInputDirective],
  template: `
    <div class="portal-admin-page">
      <div class="admin-top-bar">
        <div class="admin-title-block">
          <div class="title-badge-row">
            <span class="cms-pill">ADMINISTRACIÓN DE CATÁLOGO</span>
            <span class="cards-counter">{{ visibleCardsCount() }} de {{ stateService.fruits().length }} cards activas en el portal</span>
          </div>
          <h1 class="page-title">Administración del Portal Clientes</h1>
          <p class="page-subtitle">
            Carga o cambia las fotos de los productos, edita los títulos, descripciones, etiquetas y actualiza los precios de cada presentación (140g, 250g, 500g y 1 Kg).
          </p>
        </div>

        <div class="admin-top-actions">
          <button
            type="button"
            class="btn-banner-config"
            [class.active]="showBannerEditor()"
            (click)="toggleBannerEditor()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            <span>{{ showBannerEditor() ? 'Ocultar Editor de Banner' : 'Editar Textos del Banner' }}</span>
          </button>

          <button
            type="button"
            class="btn-new-card"
            (click)="openNewCardModal()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Nueva Card de Producto</span>
          </button>

          <button
            type="button"
            class="btn-preview-portal"
            (click)="openLivePortal()"
            title="Ver cómo ven los clientes el Portal de Pedidos en vivo"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            <span>Ver Portal en Vivo</span>
          </button>
        </div>
      </div>

      @if (showBannerEditor()) {
        <section class="banner-cms-card">
          <div class="banner-cms-header">
            <div>
              <h3 class="banner-cms-title">Textos del Encabezado y Banner Principal del Portal</h3>
              <p class="banner-cms-sub">Personaliza el mensaje de bienvenida, los sellos de calidad y el número de WhatsApp del Portal Clientes.</p>
            </div>
            <button type="button" class="btn-save-banner" (click)="saveBannerConfig()">
              Guardar Banner
            </button>
          </div>

          <div class="banner-cms-grid">
            <div class="form-group">
              <label>Subtítulo del Encabezado Superior</label>
              <input type="text" [(ngModel)]="bannerDraft.brandTagline" placeholder="Subtítulo del encabezado" />
            </div>

            <div class="form-group">
              <label>Sello Superior del Banner (Badge)</label>
              <input type="text" [(ngModel)]="bannerDraft.heroBadge" placeholder="Sello del banner" />
            </div>

            <div class="form-group">
              <label>Título Principal del Banner</label>
              <input type="text" [(ngModel)]="bannerDraft.heroTitle" placeholder="Título principal" />
            </div>

            <div class="form-group">
              <label>WhatsApp de Atención y Pedidos (con indicativo 57)</label>
              <input type="text" [(ngModel)]="bannerDraft.whatsappPhone" placeholder="Número con indicativo" />
            </div>

            <div class="form-group full-col">
              <label>Descripción Principal del Banner</label>
              <textarea rows="2" [(ngModel)]="bannerDraft.heroDescription"></textarea>
            </div>

            <div class="form-group">
              <label>Texto Chip Destacado #1</label>
              <input type="text" [(ngModel)]="bannerDraft.chip1Text" />
            </div>

            <div class="form-group">
              <label>Texto Chip Destacado #2</label>
              <input type="text" [(ngModel)]="bannerDraft.chip2Text" />
            </div>

            <div class="form-group">
              <label>Texto Chip Destacado #3</label>
              <input type="text" [(ngModel)]="bannerDraft.chip3Text" />
            </div>
          </div>
        </section>
      }

      <div class="admin-toolbar">
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Buscar card por nombre de fruta, categoría o texto..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
          @if (searchQuery()) {
            <button type="button" class="clear-search-btn" (click)="searchQuery.set('')">&times;</button>
          }
        </div>

        <div class="category-filters">
          <button
            type="button"
            class="filter-pill"
            [class.active]="selectedCategory() === 'ALL'"
            (click)="selectedCategory.set('ALL')"
          >
            Todas ({{ stateService.fruits().length }})
          </button>
          @for (cat of categories(); track cat) {
            <button
              type="button"
              class="filter-pill"
              [class.active]="selectedCategory() === cat"
              (click)="selectedCategory.set(cat)"
            >
              {{ cat }}
            </button>
          }
        </div>

        <button
          type="button"
          class="btn-reset-defaults"
          (click)="confirmResetCatalog()"
          title="Restaurar fotos, textos y precios originales de fábrica"
        >
          Restablecer Predeterminados
        </button>
      </div>

      <input
        #quickFileInput
        type="file"
        accept="image/*"
        style="display: none;"
        (change)="onQuickFileSelected($event)"
      />

      @if (isLoading()) {
        <div class="dgl-shimmer-wrapper">
          <div class="shimmer-card-grid">
            @for (item of [1, 2, 3, 4, 5, 6]; track item) {
              <div class="shimmer-card" style="gap: 12px;">
                <div class="shimmer-box" style="height: 150px; border-radius: 12px;"></div>
                <div class="shimmer-title" style="width: 60%;"></div>
                <div class="shimmer-subtitle" style="width: 80%;"></div>
                <div class="shimmer-box" style="height: 60px; border-radius: 10px;"></div>
              </div>
            }
          </div>
        </div>
      }

      <div class="admin-cards-grid" [class.dgl-loading-hidden]="isLoading()">
        @for (fruit of filteredFruits(); track fruit.id) {
          <div class="admin-product-card" [class.is-hidden-portal]="fruit.isVisibleInPortal === false">
            <div class="card-media-box">
              <img
                [src]="getCardImage(fruit)"
                [alt]="fruit.name"
                class="card-preview-img"
                loading="lazy"
              />
              <div class="card-media-overlay"></div>

              <span class="category-floating-badge" [style.background]="fruit.color || '#1e5e3a'">
                {{ fruit.category }}
              </span>

              <div class="photo-actions-bar">
                <button
                  type="button"
                  class="btn-upload-photo"
                  (click)="triggerQuickPhotoUpload(fruit, quickFileInput)"
                  title="Subir una foto desde tu computador o celular"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                  <span>Cambiar Foto</span>
                </button>

                @if (fruit.imageUrl && fruit.imageUrl !== ('/fruits/' + fruit.id + '.jpg')) {
                  <button
                    type="button"
                    class="btn-restore-photo"
                    (click)="restoreDefaultPhoto(fruit)"
                    title="Restaurar la foto original de esta fruta"
                  >
                    Restaurar original
                  </button>
                }
              </div>
            </div>

            <div class="card-status-strip">
              <label class="visibility-switch" title="Mostrar u ocultar esta card en el Portal de Clientes">
                <input
                  type="checkbox"
                  [checked]="fruit.isVisibleInPortal !== false"
                  (change)="toggleCardVisibility(fruit)"
                />
                <span class="switch-slider"></span>
                <span class="switch-label">
                  {{ fruit.isVisibleInPortal === false ? 'Oculta en Portal' : 'Visible en Portal' }}
                </span>
              </label>

              <button
                type="button"
                class="btn-open-modal-edit"
                (click)="openEditCardModal(fruit)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Editar todo</span>
              </button>
            </div>

            <div class="card-editor-body">
              <div class="inline-fields-row">
                <div class="field-item">
                  <label>Título de la Card</label>
                  <input
                    type="text"
                    [ngModel]="fruit.name"
                    (ngModelChange)="updateInlineField(fruit, 'name', $event)"
                    placeholder="Nombre de la pulpa"
                  />
                </div>
                <div class="field-item">
                  <label>Subtítulo / Nombre Científico</label>
                  <input
                    type="text"
                    [ngModel]="fruit.scientificName"
                    (ngModelChange)="updateInlineField(fruit, 'scientificName', $event)"
                    placeholder="Subtítulo o variedad"
                  />
                </div>
              </div>

              <div class="inline-fields-row">
                <div class="field-item flex-1">
                  <label>Etiqueta Categoría (Badge)</label>
                  <input
                    type="text"
                    [ngModel]="fruit.category"
                    (ngModelChange)="updateInlineField(fruit, 'category', $event)"
                    placeholder="Categoría"
                  />
                </div>
                <div class="field-item color-field">
                  <label>Color</label>
                  <input
                    type="color"
                    [ngModel]="fruit.color || '#1e5e3a'"
                    (ngModelChange)="updateInlineField(fruit, 'color', $event)"
                    title="Color de la etiqueta de la card"
                  />
                </div>
              </div>

              <div class="field-item">
                <label>Texto Descriptivo de la Card</label>
                <textarea
                  rows="2"
                  [ngModel]="fruit.description"
                  (ngModelChange)="updateInlineField(fruit, 'description', $event)"
                  placeholder="Descripción que verán los clientes en la card..."
                ></textarea>
              </div>

              <div class="prices-editor-box">
                <div class="prices-box-header">
                  <span>PRECIOS POR PRESENTACIÓN (COP)</span>
                </div>
                <div class="prices-grid-4">
                  @for (g of activeGrammages(); track g.key) {
                    <div class="price-input-cell">
                      <span class="gram-tag">{{ g.label }}</span>
                      <div class="cop-input-wrap">
                        <span class="cop-sign">$</span>
                        <input
                          type="text"
                          appCopInput
                          [appCopPrefix]="false"
                          [ngModel]="fruit.prices[g.key] || 0"
                          (ngModelChange)="updateInlinePrice(fruit, g.key, $event)"
                        />
                      </div>
                    </div>
                  }
                </div>
              </div>

              <div class="card-footer-actions">
                <button
                  type="button"
                  class="btn-save-card-inline"
                  (click)="notifyCardSaved(fruit)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Guardar Card</span>
                </button>
              </div>
            </div>
          </div>
        }
      </div>

      @if (showCardModal() && activeDraft()) {
        <div class="modal-backdrop" (click)="closeCardModal()">
          <div class="card-edit-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-kicker">{{ isCreatingNewCard() ? 'NUEVO PRODUCTO EN EL CATÁLOGO' : 'EDICIÓN DE CARD DEL PORTAL' }}</span>
                <h3 class="modal-title">{{ isCreatingNewCard() ? 'Crear Nueva Card de Pulpa' : 'Editar ' + activeDraft()!.name }}</h3>
              </div>
              <button type="button" class="modal-close-btn" (click)="closeCardModal()">&times;</button>
            </div>

            <div class="modal-body-grid">
              <div class="modal-preview-col">
                <span class="preview-col-label">VISTA PREVIA EN VIVO DE LA CARD</span>

                <div class="live-portal-card-preview">
                  <div class="preview-media">
                    <img [src]="activeDraft()!.imageUrl" [alt]="activeDraft()!.name" />
                    <div class="preview-gradient"></div>
                    <span class="preview-badge" [style.background]="activeDraft()!.color || '#1e5e3a'">
                      {{ activeDraft()!.category }}
                    </span>
                  </div>

                  <div class="preview-content">
                    <h4 class="preview-title">{{ activeDraft()!.name }}</h4>
                    <span class="preview-sub">{{ activeDraft()!.scientificName }}</span>
                    <p class="preview-desc">{{ activeDraft()!.description }}</p>

                    <div class="preview-prices-strip">
                      @for (g of activeGrammages(); track g.key) {
                        <div><small>{{ g.label }}</small><strong>{{ formatCOP(activeDraft()!.prices[g.key] || 0) }}</strong></div>
                      }
                    </div>
                  </div>
                </div>

                <div class="photo-upload-panel">
                  <input
                    #modalFileInput
                    type="file"
                    accept="image/*"
                    style="display: none;"
                    (change)="onModalFileSelected($event)"
                  />
                  <button type="button" class="btn-modal-upload" (click)="modalFileInput.click()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span>Subir Foto desde Dispositivo</span>
                  </button>

                  <div class="url-input-group">
                    <label>O pegar URL / ruta de imagen:</label>
                    <input
                      type="text"
                      [(ngModel)]="activeDraft()!.imageUrl"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              <div class="modal-form-col">
                <div class="form-group">
                  <label>Título / Nombre del Producto *</label>
                  <input type="text" [(ngModel)]="activeDraft()!.name" placeholder="Nombre del producto" />
                </div>

                <div class="form-group">
                  <label>Subtítulo / Nombre Científico</label>
                  <input type="text" [(ngModel)]="activeDraft()!.scientificName" placeholder="Subtítulo o nombre científico" />
                </div>

                <div class="form-row-2">
                  <div class="form-group">
                    <label>Texto de la Etiqueta (Categoría)</label>
                    <input type="text" [(ngModel)]="activeDraft()!.category" placeholder="Categoría" />
                  </div>

                  <div class="form-group">
                    <label>Color de la Etiqueta</label>
                    <div class="color-picker-wrap">
                      <input type="color" [(ngModel)]="activeDraft()!.color" />
                      <span>{{ activeDraft()!.color }}</span>
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label>Texto Descriptivo de la Card</label>
                  <textarea
                    rows="3"
                    [(ngModel)]="activeDraft()!.description"
                    placeholder="Escribe el texto que aparece en el cuerpo de la card..."
                  ></textarea>
                </div>

                <div class="modal-prices-section">
                  <label class="section-lbl">Precios de Venta en el Portal Clientes (COP)</label>
                  <div class="modal-prices-grid">
                    @for (g of activeGrammages(); track g.key) {
                      <div class="form-group">
                        <label>Bolsa {{ g.label }}</label>
                        <input type="text" appCopInput [(ngModel)]="activeDraft()!.prices[g.key]" />
                      </div>
                    }
                  </div>
                </div>

                @if (!isCreatingNewCard()) {
                  <div class="visibility-box">
                    <label class="visibility-check">
                      <input type="checkbox" [(ngModel)]="activeDraft()!.isVisibleInPortal" />
                      <span>Mostrar esta card públicamente en el Portal de Clientes</span>
                    </label>
                  </div>
                }
              </div>
            </div>

            <div class="modal-footer">
              @if (!isCreatingNewCard()) {
                <button type="button" class="btn-delete-card" (click)="deleteActiveCard()">
                  Eliminar Card
                </button>
              }
              <div class="footer-right">
                <button type="button" class="btn-cancel-modal" (click)="closeCardModal()">
                  Cancelar
                </button>
                <button type="button" class="btn-save-modal" (click)="saveModalCard()">
                  {{ isCreatingNewCard() ? 'Crear y Publicar Card' : 'Guardar Cambios' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .portal-admin-page {
      padding: 20px 24px 48px 24px;
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .admin-top-bar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      flex-wrap: wrap;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      padding: 20px 24px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
    }

    .title-badge-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
      flex-wrap: wrap;
    }

    .cms-pill {
      background: #eaf5ee;
      color: #1e5e3a;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 9999px;
      letter-spacing: 0.04em;
    }

    .cards-counter {
      font-size: 0.76rem;
      font-weight: 700;
      color: #64748b;
    }

    .page-title {
      font-size: 1.45rem;
      font-weight: 900;
      color: #111827;
      margin: 0 0 4px 0;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      font-size: 0.86rem;
      color: #6b7280;
      margin: 0;
      max-width: 680px;
      line-height: 1.4;
    }

    .admin-top-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn-banner-config,
    .btn-new-card,
    .btn-preview-portal {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      border-radius: 12px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .btn-banner-config {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      color: #334155;

      &:hover,
      &.active {
        background: #f0fdf4;
        border-color: #1e5e3a;
        color: #164a2d;
      }
    }

    .btn-new-card {
      background: #1e5e3a;
      border: 1.5px solid #1e5e3a;
      color: #ffffff;
      box-shadow: 0 3px 10px rgba(30, 94, 58, 0.25);

      &:hover {
        background: #164a2d;
        border-color: #164a2d;
        transform: translateY(-1px);
      }
    }

    .btn-preview-portal {
      background: #1e5e3a;
      border: 1.5px solid #1e5e3a;
      color: #ffffff;
      box-shadow: 0 3px 10px rgba(30, 94, 58, 0.22);

      &:hover {
        background: #164a2d;
        transform: translateY(-1px);
      }
    }

    .banner-cms-card {
      background: #ffffff;
      border: 1.5px solid #d1e7d8;
      border-radius: 18px;
      padding: 20px 24px;
      box-shadow: 0 6px 20px rgba(30, 94, 58, 0.08);
    }

    .banner-cms-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #eef2ef;
      flex-wrap: wrap;
    }

    .banner-cms-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: #164a2d;
      margin: 0;
    }

    .banner-cms-sub {
      font-size: 0.8rem;
      color: #64748b;
      margin: 2px 0 0 0;
    }

    .btn-save-banner {
      background: #1e5e3a;
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 9px 18px;
      font-size: 0.82rem;
      font-weight: 800;
      cursor: pointer;

      &:hover {
        background: #164a2d;
      }
    }

    .banner-cms-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;

      .full-col {
        grid-column: 1 / -1;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;

      label {
        font-size: 0.74rem;
        font-weight: 800;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      input,
      textarea {
        padding: 9px 12px;
        border: 1.5px solid #cbd5e1;
        border-radius: 10px;
        font-size: 0.85rem;
        color: #0f172a;
        background: #ffffff;
        outline: none;

        &:focus {
          border-color: #1e5e3a;
        }
      }
    }

    .admin-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
    }

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
      }

      input {
        width: 100%;
        padding: 9px 32px 9px 38px;
        background: #ffffff;
        border: 1.5px solid #cbd5e1;
        border-radius: 9999px;
        font-size: 0.84rem;
        outline: none;

        &:focus {
          border-color: #1e5e3a;
        }
      }

      .clear-search-btn {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        font-size: 1.15rem;
        color: #94a3b8;
        cursor: pointer;
      }
    }

    .category-filters {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      flex: 1;
    }

    .filter-pill {
      padding: 6px 14px;
      border-radius: 9999px;
      border: 1.5px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;

      &.active {
        background: #1e5e3a;
        border-color: #1e5e3a;
        color: #ffffff;
      }
    }

    .btn-reset-defaults {
      padding: 7px 13px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #64748b;
      font-size: 0.76rem;
      font-weight: 700;
      cursor: pointer;

      &:hover {
        color: #dc2626;
        border-color: #fecaca;
        background: #fef2f2;
      }
    }

    .admin-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
      gap: 20px;
    }

    .admin-product-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 18px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease;

      &:hover {
        border-color: #1e5e3a;
        box-shadow: 0 8px 24px rgba(30, 94, 58, 0.1);
      }

      &.is-hidden-portal {
        opacity: 0.68;
        border-style: dashed;
      }
    }

    .card-media-box {
      position: relative;
      height: 185px;
      background: #e2e8f0;
      overflow: hidden;

      .card-preview-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .card-media-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.05) 45%, rgba(0, 0, 0, 0.65) 100%);
      }

      .category-floating-badge {
        position: absolute;
        top: 12px;
        left: 12px;
        color: #ffffff;
        font-size: 0.68rem;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: 9999px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
      }

      .photo-actions-bar {
        position: absolute;
        bottom: 10px;
        left: 10px;
        right: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .btn-upload-photo {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.95);
        color: #0f172a;
        border: none;
        font-size: 0.76rem;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        transition: all 0.15s ease;

        &:hover {
          background: #1e5e3a;
          color: #ffffff;
        }
      }

      .btn-restore-photo {
        padding: 5px 10px;
        border-radius: 9999px;
        background: rgba(15, 23, 42, 0.78);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.3);
        font-size: 0.7rem;
        font-weight: 700;
        cursor: pointer;

        &:hover {
          background: #dc2626;
        }
      }
    }

    .card-status-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    .visibility-switch {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;

      input {
        accent-color: #1e5e3a;
        width: 15px;
        height: 15px;
        cursor: pointer;
      }

      .switch-label {
        font-size: 0.75rem;
        font-weight: 700;
        color: #334155;
      }
    }

    .btn-open-modal-edit {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #eaf5ee;
      color: #1e5e3a;
      border: 1px solid #bbf7d0;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 0.74rem;
      font-weight: 800;
      cursor: pointer;

      &:hover {
        background: #1e5e3a;
        color: #ffffff;
      }
    }

    .card-editor-body {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }

    .inline-fields-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;

      .color-field {
        width: 58px;
      }
    }

    .field-item {
      display: flex;
      flex-direction: column;
      gap: 3px;

      label {
        font-size: 0.68rem;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
      }

      input[type='text'],
      textarea {
        padding: 7px 10px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 0.82rem;
        color: #0f172a;
        font-weight: 600;
        background: #ffffff;
        outline: none;

        &:focus {
          border-color: #1e5e3a;
        }
      }

      textarea {
        font-weight: 500;
        resize: vertical;
        line-height: 1.35;
      }

      input[type='color'] {
        width: 100%;
        height: 33px;
        padding: 2px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #ffffff;
        cursor: pointer;
      }
    }

    .prices-editor-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px;
    }

    .prices-box-header {
      font-size: 0.66rem;
      font-weight: 900;
      color: #475569;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
    }

    .prices-grid-4 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .price-input-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .gram-tag {
        font-size: 0.68rem;
        font-weight: 800;
        color: #1e5e3a;
      }

      .cop-input-wrap {
        display: flex;
        align-items: center;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 0 8px;

        .cop-sign {
          font-size: 0.78rem;
          font-weight: 800;
          color: #64748b;
          margin-right: 3px;
        }

        input {
          width: 100%;
          border: none;
          padding: 6px 0;
          font-size: 0.82rem;
          font-weight: 800;
          color: #0f172a;
          outline: none;
          background: transparent;
        }
      }
    }

    .card-footer-actions {
      margin-top: auto;
      padding-top: 4px;
    }

    .btn-save-card-inline {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 9px;
      background: #1e5e3a;
      color: #ffffff;
      border: none;
      border-radius: 10px;
      font-size: 0.8rem;
      font-weight: 800;
      cursor: pointer;
      transition: background 0.15s ease;

      &:hover {
        background: #164a2d;
      }
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(5px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .card-edit-modal {
      background: #ffffff;
      border-radius: 20px;
      width: 100%;
      max-width: 860px;
      max-height: 90vh;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      border-bottom: 1px solid #e2e8f0;
      flex-shrink: 0;

      .modal-kicker {
        font-size: 0.68rem;
        font-weight: 800;
        color: #1e5e3a;
        letter-spacing: 0.05em;
      }

      .modal-title {
        font-size: 1.2rem;
        font-weight: 900;
        color: #0f172a;
        margin: 2px 0 0 0;
      }

      .modal-close-btn {
        background: #f1f5f9;
        border: none;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        font-size: 1.3rem;
        color: #475569;
        cursor: pointer;
      }
    }

    .modal-body-grid {
      display: grid;
      grid-template-columns: 310px 1fr;
      gap: 24px;
      padding: 22px 24px;
      overflow-y: auto;
      flex: 1;
      min-height: 0;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
      }

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .modal-preview-col {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .preview-col-label {
        font-size: 0.7rem;
        font-weight: 800;
        color: #64748b;
        letter-spacing: 0.04em;
      }
    }

    .live-portal-card-preview {
      border: 1.5px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);

      .preview-media {
        position: relative;
        height: 165px;
        background: #e2e8f0;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.45) 100%);
        }

        .preview-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          color: #ffffff;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 9999px;
          text-transform: uppercase;
        }
      }

      .preview-content {
        padding: 12px 14px;

        .preview-title {
          font-size: 1.05rem;
          font-weight: 900;
          color: #0f172a;
          margin: 0;
        }

        .preview-sub {
          font-size: 0.72rem;
          color: #64748b;
          font-style: italic;
          display: block;
          margin-bottom: 6px;
        }

        .preview-desc {
          font-size: 0.75rem;
          color: #475569;
          margin: 0 0 10px 0;
          line-height: 1.35;
        }

        .preview-prices-strip {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
          background: #f8fafc;
          padding: 8px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;

          div {
            display: flex;
            flex-direction: column;
            small {
              font-size: 0.65rem;
              color: #64748b;
              font-weight: 700;
            }
            strong {
              font-size: 0.78rem;
              color: #164a2d;
              font-weight: 900;
            }
          }
        }
      }
    }

    .photo-upload-panel {
      display: flex;
      flex-direction: column;
      gap: 10px;

      .btn-modal-upload {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px;
        background: #eaf5ee;
        color: #1e5e3a;
        border: 1.5px dashed #1e5e3a;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 800;
        cursor: pointer;

        &:hover {
          background: #d1fae5;
        }
      }

      .url-input-group {
        display: flex;
        flex-direction: column;
        gap: 4px;

        label {
          font-size: 0.7rem;
          font-weight: 700;
          color: #64748b;
        }

        input {
          padding: 7px 10px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.78rem;
        }
      }
    }

    .modal-form-col {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 140px;
      gap: 12px;
    }

    .color-picker-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 4px 8px;

      input[type='color'] {
        width: 30px;
        height: 28px;
        border: none;
        background: none;
        cursor: pointer;
      }

      span {
        font-size: 0.78rem;
        font-weight: 700;
        color: #334155;
      }
    }

    .modal-prices-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;

      .section-lbl {
        font-size: 0.72rem;
        font-weight: 800;
        color: #164a2d;
        text-transform: uppercase;
        display: block;
        margin-bottom: 10px;
      }

      .modal-prices-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
    }

    .visibility-box {
      padding: 10px 12px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;

      .visibility-check {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.82rem;
        font-weight: 700;
        color: #164a2d;
        cursor: pointer;
      }
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      flex-shrink: 0;
      background: #ffffff;
      background: #f8fafc;

      .footer-right {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
      }

      .btn-delete-card {
        padding: 9px 14px;
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
        border-radius: 10px;
        font-size: 0.8rem;
        font-weight: 700;
        cursor: pointer;
      }

      .btn-cancel-modal {
        padding: 9px 16px;
        background: #ffffff;
        color: #475569;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
      }

      .btn-save-modal {
        padding: 9px 20px;
        background: #1e5e3a;
        color: #ffffff;
        border: none;
        border-radius: 10px;
        font-size: 0.84rem;
        font-weight: 800;
        cursor: pointer;

        &:hover {
          background: #164a2d;
        }
      }
    }
  `]
})
export class ClientPortalAdminComponent {
  readonly stateService = inject(StateService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string>('ALL');
  readonly showBannerEditor = signal<boolean>(false);

  bannerDraft: PortalCmsConfig = { ...this.stateService.portalCmsConfig() };

  private quickPhotoTargetFruit: FruitConfig | null = null;

  readonly activeGrammages = this.stateService.activeGrammages;
  readonly showCardModal = signal<boolean>(false);
  readonly isCreatingNewCard = signal<boolean>(false);
  readonly activeDraft = signal<EditableCardDraft | null>(null);
  readonly isLoading = computed<boolean>(() => {
    try {
      return typeof this.stateService.isLoading === 'function' ? this.stateService.isLoading() : false;
    } catch {
      return false;
    }
  });

  /**
   * Synchronizes operational state when entering the Client Portal Admin module.
   */
  constructor() {
    try {
      this.stateService.refreshAll?.();
    } catch {
      return;
    }
  }

  /**
   * Computes the total number of fruit catalog cards currently visible in the client portal.
   */
  readonly visibleCardsCount = computed<number>(() => {
    try {
      return this.stateService.fruits().filter(f => f.isVisibleInPortal !== false).length;
    } catch {
      return 0;
    }
  });

  /**
   * Computes unique product categories from the fruit catalog.
   */
  readonly categories = computed<string[]>(() => {
    try {
      const set = new Set<string>();
      for (const f of this.stateService.fruits()) {
        if (f.category) {
          set.add(f.category);
        }
      }
      return Array.from(set);
    } catch {
      return [];
    }
  });

  /**
   * Filters fruit catalog cards by category and search query.
   */
  readonly filteredFruits = computed<FruitConfig[]>(() => {
    try {
      let list = this.stateService.fruits();
      const cat = this.selectedCategory();
      if (cat !== 'ALL') {
        list = list.filter(f => f.category === cat);
      }
      const q = this.searchQuery().trim().toLowerCase();
      if (q) {
        list = list.filter(
          f =>
            f.name.toLowerCase().includes(q) ||
            (f.scientificName && f.scientificName.toLowerCase().includes(q)) ||
            (f.category && f.category.toLowerCase().includes(q)) ||
            (f.description && f.description.toLowerCase().includes(q))
        );
      }
      return list;
    } catch {
      return [];
    }
  });

  /**
   * Returns the resolved image path for a fruit catalog card.
   */
  getCardImage(fruit: FruitConfig): string {
    try {
      return fruit.imageUrl || `/fruits/${fruit.id}.jpg`;
    } catch {
      return '';
    }
  }

  /**
   * Toggles the visibility of the hero banner CMS editor section.
   */
  toggleBannerEditor(): void {
    try {
      this.bannerDraft = { ...this.stateService.portalCmsConfig() };
      this.showBannerEditor.update(v => !v);
    } catch {
      return;
    }
  }

  /**
   * Persists the hero banner CMS configuration to `StateService`.
   */
  saveBannerConfig(): void {
    try {
      this.stateService.updatePortalCmsConfig(this.bannerDraft);
      this.showBannerEditor.set(false);
    } catch {
      return;
    }
  }

  /**
   * Navigates to the live client self-service portal view.
   */
  openLivePortal(): void {
    try {
      void this.router.navigate(['/portal-clientes']);
    } catch {
      return;
    }
  }

  /**
   * Updates an inline text field on a fruit catalog card silently.
   */
  updateInlineField(
    fruit: FruitConfig,
    field: 'name' | 'scientificName' | 'description' | 'category' | 'color',
    value: string
  ): void {
    try {
      this.stateService.updateFruitCatalogCard(fruit.id, { [field]: value }, true);
    } catch {
      return;
    }
  }

  /**
   * Updates an inline grammage price on a fruit catalog card silently.
   */
  updateInlinePrice(
    fruit: FruitConfig,
    gramKey: string,
    value: number
  ): void {
    try {
      const numeric = Math.max(0, Number(value) || 0);
      const nextPrices = {
        ...fruit.prices,
        [gramKey]: numeric
      };
      this.stateService.updateFruitCatalogCard(fruit.id, { prices: nextPrices }, true);
    } catch {
      return;
    }
  }

  /**
   * Toggles whether a fruit catalog card is publicly visible in the client portal.
   */
  toggleCardVisibility(fruit: FruitConfig): void {
    try {
      const nextVisible = fruit.isVisibleInPortal === false;
      this.stateService.updateFruitCatalogCard(
        fruit.id,
        { isVisibleInPortal: nextVisible },
        true
      );
      this.notification.info(
        nextVisible ? 'Card Visible en Portal' : 'Card Oculta en Portal',
        `"${fruit.name}" ${nextVisible ? 'ahora se muestra' : 'se ocultó'} en el Portal Clientes.`
      );
    } catch {
      return;
    }
  }

  /**
   * Triggers explicit save notification for a fruit catalog card.
   */
  notifyCardSaved(fruit: FruitConfig): void {
    try {
      this.stateService.updateFruitCatalogCard(fruit.id, {}, false);
    } catch {
      return;
    }
  }

  /**
   * Opens the file selector to upload a quick photo for a fruit card.
   */
  triggerQuickPhotoUpload(fruit: FruitConfig, inputEl: HTMLInputElement): void {
    try {
      this.quickPhotoTargetFruit = fruit;
      inputEl.value = '';
      inputEl.click();
    } catch {
      return;
    }
  }

  /**
   * Compresses and applies the selected image file to the target fruit card.
   */
  async onQuickFileSelected(event: Event): Promise<void> {
    try {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file || !this.quickPhotoTargetFruit) {
        return;
      }

      const targetFruit = this.quickPhotoTargetFruit;
      const compressedDataUrl = await this.compressImageFile(file, 900, 0.85);
      this.stateService.updateFruitCatalogCard(
        targetFruit.id,
        { imageUrl: compressedDataUrl },
        false
      );
    } catch {
      this.notification.warning('Error de imagen', 'No se pudo procesar la foto seleccionada.');
    }
  }

  /**
   * Restores the default asset image URL for a fruit card.
   */
  restoreDefaultPhoto(fruit: FruitConfig): void {
    try {
      this.stateService.updateFruitCatalogCard(
        fruit.id,
        { imageUrl: `/fruits/${fruit.id}.jpg` },
        false
      );
    } catch {
      return;
    }
  }

  /**
   * Compresses and previews a selected image file inside the card modal.
   */
  async onModalFileSelected(event: Event): Promise<void> {
    try {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      const draft = this.activeDraft();
      if (!file || !draft) {
        return;
      }

      const compressedDataUrl = await this.compressImageFile(file, 900, 0.85);
      draft.imageUrl = compressedDataUrl;
      this.activeDraft.set({ ...draft });
      this.notification.success('Foto Cargada', 'La imagen se procesó y está lista en la vista previa.');
    } catch {
      this.notification.warning('Error de imagen', 'No se pudo cargar la foto seleccionada.');
    }
  }

  /**
   * Compresses an image file using an offscreen HTMLCanvasElement.
   */
  private compressImageFile(file: File, maxWidth: number = 900, quality: number = 0.85): Promise<string> {
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas context error'));
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          };
          img.onerror = err => reject(err);
          img.src = e.target?.result as string;
        };
        reader.onerror = err => reject(err);
        reader.readAsDataURL(file);
      });
    } catch (error: unknown) {
      return Promise.reject(error);
    }
  }

  /**
   * Opens the card modal populated with an existing fruit card's attributes.
   */
  openEditCardModal(fruit: FruitConfig): void {
    try {
      this.isCreatingNewCard.set(false);
      const initialPrices: Record<string, number> = {};
      for (const g of this.stateService.activeGrammages()) {
        initialPrices[g.key] = Number(fruit.prices[g.key]) || 0;
      }

      this.activeDraft.set({
        id: fruit.id,
        fruitId: fruit.fruitId,
        name: fruit.name,
        scientificName: fruit.scientificName,
        description: fruit.description || '',
        category: fruit.category || '',
        color: fruit.color || '#1e5e3a',
        imageUrl: fruit.imageUrl || `/fruits/${fruit.id}.jpg`,
        isVisibleInPortal: fruit.isVisibleInPortal !== false,
        prices: initialPrices
      });
      this.showCardModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Opens the card modal with an empty draft to create a new fruit card.
   */
  openNewCardModal(): void {
    try {
      this.isCreatingNewCard.set(true);
      const initialPrices: Record<string, number> = {};
      for (const g of this.activeGrammages()) {
        initialPrices[g.key] = 0;
      }
      this.activeDraft.set({
        id: '',
        name: '',
        scientificName: '',
        description: '',
        category: this.stateService.activeCategories()[0]?.name || '',
        color: '#1e5e3a',
        imageUrl: '',
        isVisibleInPortal: true,
        prices: initialPrices
      });
      this.showCardModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Closes the card edit/creation modal.
   */
  closeCardModal(): void {
    try {
      this.showCardModal.set(false);
      this.activeDraft.set(null);
    } catch {
      return;
    }
  }

  /**
   * Validates and persists the active card modal draft to `StateService`.
   */
  saveModalCard(): void {
    try {
      const draft = this.activeDraft();
      if (!draft) {
        return;
      }

      if (!draft.name.trim()) {
        this.notification.warning('Nombre requerido', 'Ingresa el nombre del producto para la card.');
        return;
      }

      if (this.isCreatingNewCard()) {
        this.stateService.createFruitCatalogCard({
          name: draft.name,
          scientificName: draft.scientificName,
          description: draft.description,
          category: draft.category,
          color: draft.color,
          imageUrl: draft.imageUrl,
          prices: draft.prices
        });
      } else {
        this.stateService.updateFruitCatalogCard(draft.id, {
          name: draft.name.trim(),
          scientificName: draft.scientificName.trim(),
          description: draft.description.trim(),
          category: draft.category.trim(),
          color: draft.color,
          imageUrl: draft.imageUrl,
          isVisibleInPortal: draft.isVisibleInPortal,
          prices: {
            g140: Number(draft.prices['g140']) || 0,
            g250: Number(draft.prices['g250']) || 0,
            g500: Number(draft.prices['g500']) || 0,
            g1000: Number(draft.prices['g1000']) || 0,
            ...draft.prices
          }
        });
      }

      this.closeCardModal();
    } catch {
      return;
    }
  }

  /**
   * Deletes the currently edited card from the catalog.
   */
  deleteActiveCard(): void {
    try {
      const draft = this.activeDraft();
      if (!draft) {
        return;
      }
      this.stateService.deleteFruitCatalogCard(draft.id);
      this.closeCardModal();
    } catch {
      return;
    }
  }

  /**
   * Resets the client portal catalog to default empty state.
   */
  confirmResetCatalog(): void {
    try {
      this.stateService.resetPortalCatalogToDefault();
    } catch {
      return;
    }
  }

  /**
   * Formats a numeric amount as Colombian Peso (COP) currency.
   */
  formatCOP(num: number): string {
    try {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
      }).format(num || 0);
    } catch {
      return '$0';
    }
  }
}
