import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BackupsComponent } from '../backups/backups.component';
import { NavigationModuleDto } from '../../../core/models/auth.models';
import {
  CreateSystemActionDto,
  CreateSystemModuleDto,
  SystemActionCatalogDto,
  SystemModuleCatalogDto,
  UpdateSystemActionDto,
  UpdateSystemModuleDto
} from '../../../core/models/business.models';

/**
 * Browser storage key used to cache the synchronized system modules catalog.
 */
const STORAGE_SYSTEM_MODULES_KEY = 'dgl_system_catalog_modules_v1';

/**
 * Empty initial system modules catalog populated exclusively from the backend API.
 */
export const DEFAULT_SYSTEM_MODULES_CATALOG: SystemModuleCatalogDto[] = [];

/**
 * Visual icon option for selecting a screen icon in human-friendly language.
 */
export interface SystemCatalogIconOption {
  /** Internal icon identifier stored in the backend. */
  readonly key: string;
  /** Human-friendly Spanish label displayed in the selector. */
  readonly label: string;
  /** Short usage hint for the administrator. */
  readonly hint: string;
}

/**
 * Friendly operation type option mapping HTTP verbs to business-level descriptions.
 */
export interface SystemCatalogOperationOption {
  /** Underlying HTTP method code sent to the API. */
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Short badge label shown in tables and filter chips. */
  readonly shortLabel: string;
  /** Full descriptive title shown in forms and tooltips. */
  readonly fullLabel: string;
  /** Plain-language explanation of what this operation type allows. */
  readonly helperText: string;
  /** Semantic badge class name. */
  readonly badgeClass: string;
}

/**
 * Redesigned Enterprise SaaS component for managing system menu screens,
 * granular screen permissions, and database backups with plain-language UX.
 */
@Component({
  selector: 'app-system-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, BackupsComponent],
  template: `
    <div class="sc-shell">
      <header class="sc-hero-card">
        <div class="sc-hero-left">
          <div class="sc-hero-icon-box" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
            </svg>
          </div>
          <div class="sc-hero-copy">
            <div class="sc-hero-badges">
              <span class="sc-pill sc-pill-emerald">Administración de Estructura y Accesos</span>
              <span class="sc-pill sc-pill-slate">
                {{ modules().length }} {{ modules().length === 1 ? 'Pantalla' : 'Pantallas' }} · {{ totalActionsCount() }} {{ totalActionsCount() === 1 ? 'Permiso' : 'Permisos' }}
              </span>
            </div>
            <h1 class="sc-hero-title">Menú y Pantallas del Sistema</h1>
            <p class="sc-hero-subtitle">
              Organiza las secciones del menú lateral, activa o desactiva pantallas y configura qué permisos existen dentro de cada área del sistema.
            </p>
          </div>
        </div>

        <div class="sc-hero-actions">
          <div class="sc-tab-switcher" role="tablist" aria-label="Secciones de configuración del sistema">
            <button
              type="button"
              role="tab"
              class="sc-tab-btn"
              [class.sc-tab-btn-active]="activeTab() === 'catalog'"
              [attr.aria-selected]="activeTab() === 'catalog'"
              (click)="activeTab.set('catalog')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1"></rect>
              </svg>
              <span>Pantallas y Permisos</span>
            </button>

            <button
              type="button"
              role="tab"
              class="sc-tab-btn"
              [class.sc-tab-btn-active]="activeTab() === 'backups'"
              [attr.aria-selected]="activeTab() === 'backups'"
              (click)="activeTab.set('backups')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
              </svg>
              <span>Ir a Copias de Seguridad</span>
            </button>
          </div>

          @if (activeTab() === 'catalog') {
            <button
              type="button"
              class="btn btn-outline sc-action-btn"
              [disabled]="isLoading()"
              (click)="loadSystemCatalog()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              <span>Actualizar listado</span>
            </button>

            <button
              type="button"
              class="btn btn-primary sc-action-btn sc-btn-new-screen"
              (click)="openCreateModuleModal()">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>+ Nueva Pantalla</span>
            </button>
          }
        </div>
      </header>

      @if (activeTab() === 'backups') {
        <app-backups />
      } @else {
        <section class="sc-kpi-grid" aria-label="Resumen de pantallas y permisos">
          <article class="sc-kpi-card">
            <div class="sc-kpi-icon sc-kpi-icon-emerald" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <div class="sc-kpi-content">
              <span class="sc-kpi-label">Pantallas Registradas</span>
              <div class="sc-kpi-value-row">
                <strong class="sc-kpi-value">{{ modules().length }}</strong>
                <span class="sc-kpi-badge sc-kpi-badge-emerald">{{ activeModulesCount() }} visibles</span>
              </div>
              <span class="sc-kpi-meta">
                {{ hiddenModulesCount() === 0 ? 'Todas las pantallas están visibles' : (hiddenModulesCount() + ' ocultas en el menú') }}
              </span>
            </div>
          </article>

          <article class="sc-kpi-card">
            <div class="sc-kpi-icon sc-kpi-icon-blue" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <polyline points="9 12 11 14 15 10"></polyline>
              </svg>
            </div>
            <div class="sc-kpi-content">
              <span class="sc-kpi-label">Permisos Configurados</span>
              <div class="sc-kpi-value-row">
                <strong class="sc-kpi-value">{{ totalActionsCount() }}</strong>
                <span class="sc-kpi-badge sc-kpi-badge-blue">{{ activeActionsCount() }} habilitados</span>
              </div>
              <span class="sc-kpi-meta">Funciones disponibles para asignar a roles</span>
            </div>
          </article>

          <article class="sc-kpi-card">
            <div class="sc-kpi-icon sc-kpi-icon-purple" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div class="sc-kpi-content">
              <span class="sc-kpi-label">Áreas del Menú</span>
              <div class="sc-kpi-value-row">
                <strong class="sc-kpi-value">{{ availableMenuSections().length }}</strong>
                <span class="sc-kpi-badge sc-kpi-badge-purple">Categorías</span>
              </div>
              <span class="sc-kpi-meta">Secciones en las que se agrupa el menú lateral</span>
            </div>
          </article>

          <article class="sc-kpi-card sc-kpi-card-highlight">
            <div class="sc-kpi-icon sc-kpi-icon-amber" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div class="sc-kpi-content">
              <span class="sc-kpi-label">Pantalla Seleccionada</span>
              <div class="sc-kpi-value-row">
                <strong class="sc-kpi-value sc-kpi-value-truncate">
                  {{ selectedModule()?.name || 'Ninguna seleccionada' }}
                </strong>
              </div>
              <span class="sc-kpi-meta">
                @if (selectedModule(); as currentMod) {
                  Área: {{ currentMod.menuSection || 'General' }} · {{ currentMod.actions.length }} {{ currentMod.actions.length === 1 ? 'permiso' : 'permisos' }}
                } @else {
                  Elige una pantalla para administrar sus permisos
                }
              </span>
            </div>
          </article>
        </section>

        @if (isLoading()) {
          <div class="dgl-shimmer-wrapper">
            <div class="shimmer-card-grid">
              @for (item of [1, 2, 3, 4]; track item) {
                <div class="shimmer-card" style="gap: 12px;">
                  <div class="shimmer-title" style="width: 56%;"></div>
                  <div class="shimmer-subtitle" style="width: 78%;"></div>
                  <div class="shimmer-box" style="height: 88px; border-radius: 10px;"></div>
                </div>
              }
            </div>
          </div>
        }

        <section class="sc-filter-bar" aria-label="Búsqueda y filtro por área del menú">
          <div class="sc-search-box">
            <svg class="sc-search-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              class="form-control sc-search-input"
              placeholder="Buscar pantalla por nombre, área del menú, dirección o permiso..."
              [ngModel]="searchQuery()"
              (ngModelChange)="onSearchQueryChange($event)"
            />
            @if (searchQuery().trim().length > 0) {
              <button
                type="button"
                class="sc-search-clear-btn"
                title="Limpiar búsqueda"
                (click)="clearSearchQuery()">
                Limpiar
              </button>
            }
          </div>

          <div class="sc-area-chips">
            <span class="sc-area-label">Área del Menú:</span>
            <button
              type="button"
              class="sc-chip"
              [class.sc-chip-active]="sectionFilter() === 'ALL'"
              (click)="selectSectionFilter('ALL')">
              <span>Todas las áreas</span>
              <span class="sc-chip-count">{{ modules().length }}</span>
            </button>
            @for (sec of availableMenuSections(); track sec) {
              <button
                type="button"
                class="sc-chip"
                [class.sc-chip-active]="sectionFilter() === sec"
                (click)="selectSectionFilter(sec)">
                <span>{{ sec }}</span>
                <span class="sc-chip-count">{{ getSectionModulesCount(sec) }}</span>
              </button>
            }
          </div>
        </section>

        <div class="sc-workspace-grid">
          <section class="sc-panel sc-screens-panel" aria-label="Pantallas del Sistema">
            <div class="sc-panel-header">
              <div>
                <h2 class="sc-panel-title">Pantallas del Sistema</h2>
                <p class="sc-panel-subtitle">
                  Selecciona una pantalla para consultar o configurar sus permisos de acceso.
                </p>
              </div>
              <span class="sc-count-pill">
                {{ filteredModules().length }} {{ filteredModules().length === 1 ? 'pantalla' : 'pantallas' }}
              </span>
            </div>

            <div class="sc-screens-list">
              @for (mod of paginatedModules(); track mod.id; let idx = $index) {
                <article
                  class="sc-screen-card"
                  [class.sc-screen-card-selected]="selectedModule()?.id === mod.id"
                  [class.sc-screen-card-inactive]="!mod.isActive"
                  (click)="selectModule(mod.id)">
                  <div class="sc-screen-card-top">
                    <div class="sc-screen-identity">
                      <div class="sc-screen-icon-box" [class.sc-screen-icon-active]="selectedModule()?.id === mod.id" aria-hidden="true">
                        @switch (resolveIconType(mod.icon, mod.frontendRoute, mod.slug)) {
                          @case ('truck') {
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <rect x="1" y="3" width="15" height="13"></rect>
                              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                              <circle cx="5.5" cy="18.5" r="2.5"></circle>
                              <circle cx="18.5" cy="18.5" r="2.5"></circle>
                            </svg>
                          }
                          @case ('box') {
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                              <line x1="12" y1="22.08" x2="12" y2="12"></line>
                            </svg>
                          }
                          @case ('clock') {
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                          }
                          @case ('users') {
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                          }
                          @case ('dollar') {
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <line x1="12" y1="1" x2="12" y2="23"></line>
                              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                          }
                          @case ('settings') {
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <circle cx="12" cy="12" r="3"></circle>
                              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                          }
                          @case ('shield') {
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                          }
                          @case ('chart') {
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <line x1="18" y1="20" x2="18" y2="10"></line>
                              <line x1="12" y1="20" x2="12" y2="4"></line>
                              <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                          }
                          @case ('globe') {
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="2" y1="12" x2="22" y2="12"></line>
                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                          }
                          @default {
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                              <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                              <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                              <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                            </svg>
                          }
                        }
                      </div>

                      <div class="sc-screen-title-group">
                        <div class="sc-screen-title-row">
                          <span class="sc-seq-number">{{ getSequentialNumber(idx) }}</span>
                          <h3 class="sc-screen-name">{{ mod.name }}</h3>
                        </div>
                        <div class="sc-screen-meta-row">
                          <span class="sc-meta-tag">
                            Área: <strong>{{ mod.menuSection || 'General' }}</strong>
                          </span>
                          <span class="sc-meta-dot">·</span>
                          <span class="sc-meta-route" title="Dirección de la pantalla">
                            {{ mod.frontendRoute }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      class="sc-status-badge"
                      [class.sc-status-visible]="mod.isActive"
                      [class.sc-status-hidden]="!mod.isActive">
                      <span class="sc-status-dot"></span>
                      {{ mod.isActive ? 'Visible' : 'Oculta' }}
                    </span>
                  </div>

                  <div class="sc-screen-card-footer">
                    <div class="sc-screen-stats">
                      <span class="sc-permission-count-badge">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        {{ mod.actions.length }} {{ mod.actions.length === 1 ? 'permiso' : 'permisos' }}
                      </span>
                      <span class="sc-order-hint">Orden #{{ mod.displayOrder }}</span>
                    </div>

                    <div class="sc-screen-actions">
                      <button
                        type="button"
                        class="sc-card-btn"
                        title="Editar configuración de la pantalla"
                        (click)="openEditModuleModal(mod); $event.stopPropagation()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        class="sc-card-btn"
                        [class.sc-card-btn-danger]="mod.isActive"
                        [class.sc-card-btn-success]="!mod.isActive"
                        [title]="mod.isActive ? 'Ocultar pantalla del menú' : 'Mostrar pantalla en el menú'"
                        (click)="toggleModuleStatus(mod, $event)">
                        @if (mod.isActive) {
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </svg>
                          <span>Ocultar</span>
                        } @else {
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          <span>Mostrar</span>
                        }
                      </button>
                    </div>
                  </div>
                </article>
              } @empty {
                <div class="sc-empty-state">
                  <div class="sc-empty-icon" aria-hidden="true">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                  <h3 class="sc-empty-title">No se encontraron pantallas</h3>
                  <p class="sc-empty-text">
                    No hay pantallas que coincidan con el filtro actual. Prueba limpiando la búsqueda o registra una nueva pantalla.
                  </p>
                </div>
              }
            </div>

            @if (filteredModules().length > 0) {
              <footer class="sc-pagination-bar" aria-label="Paginación de pantallas">
                <span class="sc-pagination-info">
                  Mostrando <strong>{{ modulesRangeStart() }}–{{ modulesRangeEnd() }}</strong> de <strong>{{ filteredModules().length }}</strong> pantallas
                </span>
                <div class="sc-pagination-controls">
                  <button
                    type="button"
                    class="sc-page-btn"
                    [disabled]="modulesCurrentPage() <= 1"
                    (click)="prevModulesPage()">
                    Anterior
                  </button>
                  <span class="sc-page-indicator">
                    Página {{ modulesCurrentPage() }} de {{ modulesTotalPages() }}
                  </span>
                  <button
                    type="button"
                    class="sc-page-btn"
                    [disabled]="modulesCurrentPage() >= modulesTotalPages()"
                    (click)="nextModulesPage()">
                    Siguiente
                  </button>
                </div>
              </footer>
            }
          </section>

          <section class="sc-panel sc-permissions-panel" aria-label="Permisos de la pantalla seleccionada">
            @if (selectedModule(); as activeMod) {
              <div class="sc-panel-header sc-permissions-header">
                <div class="sc-permissions-header-info">
                  <div class="sc-permissions-title-row">
                    <h2 class="sc-panel-title">Permisos Disponibles en: {{ activeMod.name }}</h2>
                    <span
                      class="sc-status-badge"
                      [class.sc-status-visible]="activeMod.isActive"
                      [class.sc-status-hidden]="!activeMod.isActive">
                      <span class="sc-status-dot"></span>
                      {{ activeMod.isActive ? 'Pantalla Visible' : 'Pantalla Oculta' }}
                    </span>
                  </div>
                  <div class="sc-permissions-meta-bar">
                    <span class="sc-meta-item">
                      Área del Menú: <strong>{{ activeMod.menuSection || 'General' }}</strong>
                    </span>
                    <span class="sc-meta-dot">·</span>
                    <span class="sc-meta-item">
                      Dirección de la Pantalla: <strong>{{ activeMod.frontendRoute }}</strong>
                    </span>
                    <span class="sc-meta-dot">·</span>
                    <span class="sc-meta-item">
                      Total: <strong>{{ activeMod.actions.length }} {{ activeMod.actions.length === 1 ? 'permiso configurado' : 'permisos configurados' }}</strong>
                    </span>
                  </div>
                </div>

                <div class="sc-permissions-header-actions">
                  <button
                    type="button"
                    class="btn btn-outline sc-action-btn-sm"
                    (click)="openEditModuleModal(activeMod)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    <span>Configurar Pantalla</span>
                  </button>

                  <button
                    type="button"
                    class="btn btn-primary sc-action-btn-sm"
                    (click)="openCreateActionModal(activeMod)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>+ Agregar Permiso</span>
                  </button>
                </div>
              </div>

              <div class="sc-permissions-toolbar">
                <div class="sc-perm-search-wrap">
                  <svg class="sc-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    class="form-control sc-perm-search-input"
                    placeholder="Filtrar permisos de esta pantalla por nombre o descripción..."
                    [ngModel]="actionSearchQuery()"
                    (ngModelChange)="onActionSearchChange($event)"
                  />
                  @if (actionSearchQuery().trim().length > 0 || actionOperationFilter() !== 'ALL') {
                    <button
                      type="button"
                      class="sc-search-clear-btn"
                      (click)="clearActionFilters()">
                      Ver todos
                    </button>
                  }
                </div>

                <div class="sc-operation-filters">
                  <span class="sc-area-label">Operación:</span>
                  <button
                    type="button"
                    class="sc-op-chip"
                    [class.sc-op-chip-active]="actionOperationFilter() === 'ALL'"
                    (click)="selectActionOperationFilter('ALL')">
                    Todas
                  </button>
                  <button
                    type="button"
                    class="sc-op-chip"
                    [class.sc-op-chip-active]="actionOperationFilter() === 'GET'"
                    (click)="selectActionOperationFilter('GET')">
                    Consulta
                  </button>
                  <button
                    type="button"
                    class="sc-op-chip"
                    [class.sc-op-chip-active]="actionOperationFilter() === 'POST'"
                    (click)="selectActionOperationFilter('POST')">
                    Registro
                  </button>
                  <button
                    type="button"
                    class="sc-op-chip"
                    [class.sc-op-chip-active]="actionOperationFilter() === 'PUT'"
                    (click)="selectActionOperationFilter('PUT')">
                    Modificación
                  </button>
                  <button
                    type="button"
                    class="sc-op-chip"
                    [class.sc-op-chip-active]="actionOperationFilter() === 'DELETE'"
                    (click)="selectActionOperationFilter('DELETE')">
                    Eliminación
                  </button>
                </div>
              </div>

              <div class="sc-table-wrapper">
                <table class="sc-permissions-table">
                  <thead>
                    <tr>
                      <th class="sc-col-permission">Permiso / Función</th>
                      <th class="sc-col-description">Qué permite hacer (Descripción)</th>
                      <th class="sc-col-operation">Tipo de Operación</th>
                      <th class="sc-col-status">Estado</th>
                      <th class="sc-col-options">Opciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (act of paginatedSelectedModuleActions(); track act.id) {
                      <tr [class.sc-row-disabled]="!act.isActive">
                        <td data-label="Permiso / Función" class="sc-cell-permission">
                          <div class="sc-perm-name">{{ act.name }}</div>
                          <div class="sc-perm-code" title="Identificador interno del permiso">
                            Identificador: {{ act.slug }}
                          </div>
                        </td>

                        <td data-label="Qué permite hacer" class="sc-cell-description">
                          <p class="sc-perm-desc-text">
                            {{ getFriendlyActionDescription(act) }}
                          </p>
                        </td>

                        <td data-label="Tipo de Operación" class="sc-cell-operation">
                          <span
                            class="badge sc-operation-badge"
                            [ngClass]="getHttpMethodBadgeClass(act.httpMethod)"
                            [title]="getOperationFullLabel(act.httpMethod)">
                            {{ getOperationShortLabel(act.httpMethod) }}
                          </span>
                          <span class="sc-operation-sublabel">{{ getOperationFullLabel(act.httpMethod) }}</span>
                        </td>

                        <td data-label="Estado" class="sc-cell-status">
                          <span
                            class="sc-status-badge"
                            [class.sc-status-visible]="act.isActive"
                            [class.sc-status-hidden]="!act.isActive">
                            <span class="sc-status-dot"></span>
                            {{ act.isActive ? 'Habilitado' : 'Deshabilitado' }}
                          </span>
                        </td>

                        <td data-label="Opciones" class="sc-cell-options">
                          <div class="sc-table-actions">
                            <button
                              type="button"
                              class="sc-table-btn"
                              title="Editar este permiso"
                              (click)="openEditActionModal(act)">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              class="sc-table-btn"
                              [class.sc-table-btn-danger]="act.isActive"
                              [class.sc-table-btn-success]="!act.isActive"
                              [title]="act.isActive ? 'Deshabilitar este permiso' : 'Habilitar este permiso'"
                              (click)="toggleActionStatus(act)">
                              @if (act.isActive) {
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                </svg>
                                <span>Deshabilitar</span>
                              } @else {
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <span>Habilitar</span>
                              }
                            </button>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="5" class="sc-empty-table-cell">
                          <div class="sc-empty-state sc-empty-state-compact">
                            <h4 class="sc-empty-title">
                              {{ activeMod.actions.length === 0 ? 'Esta pantalla aún no tiene permisos registrados' : 'Ningún permiso coincide con tu búsqueda' }}
                            </h4>
                            <p class="sc-empty-text">
                              {{ activeMod.actions.length === 0
                                ? 'Haz clic en el botón "+ Agregar Permiso" para definir qué funciones pueden realizar los usuarios en esta pantalla.'
                                : 'Prueba limpiando el filtro de operación o el texto de búsqueda para ver todos los permisos.' }}
                            </p>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (filteredSelectedModuleActions().length > 0) {
                <footer class="sc-pagination-bar" aria-label="Paginación de permisos">
                  <span class="sc-pagination-info">
                    Mostrando <strong>{{ actionsRangeStart() }}–{{ actionsRangeEnd() }}</strong> de <strong>{{ filteredSelectedModuleActions().length }}</strong> permisos
                  </span>
                  <div class="sc-pagination-controls">
                    <button
                      type="button"
                      class="sc-page-btn"
                      [disabled]="actionsCurrentPage() <= 1"
                      (click)="prevActionsPage()">
                      Anterior
                    </button>
                    <span class="sc-page-indicator">
                      Página {{ actionsCurrentPage() }} de {{ actionsTotalPages() }}
                    </span>
                    <button
                      type="button"
                      class="sc-page-btn"
                      [disabled]="actionsCurrentPage() >= actionsTotalPages()"
                      (click)="nextActionsPage()">
                      Siguiente
                    </button>
                  </div>
                </footer>
              }
            } @else {
              <div class="sc-empty-state sc-empty-detail">
                <div class="sc-empty-icon" aria-hidden="true">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                  </svg>
                </div>
                <h3 class="sc-empty-title">Selecciona una pantalla del listado</h3>
                <p class="sc-empty-text">
                  Elige cualquier pantalla en la columna izquierda para visualizar, agregar o modificar sus permisos disponibles.
                </p>
              </div>
            }
          </section>
        </div>
      }
    </div>

    @if (showModuleModal()) {
      <div class="modal-overlay">
        <div class="modal-content sc-modal-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">
                {{ isEditingModule() ? 'Editar Pantalla del Sistema' : 'Registrar Nueva Pantalla del Sistema' }}
              </h3>
              <p class="sc-modal-subtitle">
                Define cómo aparecerá esta pantalla en el menú lateral y en qué área estará ubicada.
              </p>
            </div>
            <button type="button" class="modal-close" aria-label="Cerrar ventana" (click)="showModuleModal.set(false)">&times;</button>
          </div>

          <div class="modal-body sc-modal-body">
            <div class="form-group">
              <label class="form-label">Nombre de la Pantalla *</label>
              <input
                type="text"
                class="form-control"
                [ngModel]="moduleName()"
                (ngModelChange)="onModuleNameChange($event)"
                placeholder="Ej: Control de Calidad y Laboratorio"
              />
              <small class="sc-field-hint">Es el nombre que verán los usuarios en el menú lateral.</small>
            </div>

            <div class="sc-form-grid-2">
              <div class="form-group">
                <label class="form-label">Área del Menú (Categoría) *</label>
                <input
                  type="text"
                  class="form-control"
                  [ngModel]="moduleMenuSection()"
                  (ngModelChange)="moduleMenuSection.set($event)"
                  placeholder="Ej: OPERACIÓN DIARIA"
                />
                @if (availableMenuSections().length > 0) {
                  <div class="sc-quick-suggestions">
                    <span class="sc-suggestion-label">Elegir área existente:</span>
                    @for (sec of availableMenuSections(); track sec) {
                      <button
                        type="button"
                        class="sc-suggestion-chip"
                        (click)="moduleMenuSection.set(sec)">
                        {{ sec }}
                      </button>
                    }
                  </div>
                }
              </div>

              <div class="form-group">
                <label class="form-label">Posición en el Menú</label>
                <input
                  type="number"
                  min="1"
                  class="form-control"
                  [ngModel]="moduleDisplayOrder()"
                  (ngModelChange)="moduleDisplayOrder.set(+$event)"
                />
                <small class="sc-field-hint">Orden de aparición de arriba hacia abajo (1, 2, 3...).</small>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Ícono Visual de la Pantalla</label>
              <div class="sc-icon-selector-grid">
                @for (opt of iconOptions; track opt.key) {
                  <button
                    type="button"
                    class="sc-icon-option-btn"
                    [class.sc-icon-option-selected]="moduleIcon() === opt.key"
                    (click)="moduleIcon.set(opt.key)">
                    <span class="sc-icon-option-title">{{ opt.label }}</span>
                    <span class="sc-icon-option-hint">{{ opt.hint }}</span>
                  </button>
                }
              </div>
            </div>

            <div class="sc-form-grid-2">
              <div class="form-group">
                <label class="form-label">Dirección de la Pantalla *</label>
                <input
                  type="text"
                  class="form-control"
                  [ngModel]="moduleFrontendRoute()"
                  (ngModelChange)="moduleFrontendRoute.set($event)"
                  placeholder="Ej: /calidad-laboratorio"
                />
                <small class="sc-field-hint">Enlace interno hacia donde navega el sistema al abrirla.</small>
              </div>

              <div class="form-group">
                <label class="form-label">Identificador Interno *</label>
                <input
                  type="text"
                  class="form-control"
                  [ngModel]="moduleSlug()"
                  (ngModelChange)="moduleSlug.set($event)"
                  placeholder="Ej: calidad-laboratorio"
                />
                <small class="sc-field-hint">Se genera automáticamente a partir del nombre.</small>
              </div>
            </div>

            <label class="sc-toggle-row" for="moduleIsActiveCheck">
              <input
                type="checkbox"
                id="moduleIsActiveCheck"
                [ngModel]="moduleIsActive()"
                (ngModelChange)="moduleIsActive.set($event)"
              />
              <div class="sc-toggle-copy">
                <strong>Mostrar esta pantalla en el menú lateral</strong>
                <span>Si la desmarcas, la pantalla quedará oculta temporalmente para los usuarios.</span>
              </div>
            </label>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showModuleModal.set(false)">Cancelar</button>
            <button type="button" class="btn btn-primary" (click)="saveModule()">
              {{ isEditingModule() ? 'Guardar Cambios' : 'Crear Pantalla' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (showActionModal()) {
      <div class="modal-overlay">
        <div class="modal-content sc-modal-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">
                {{ isEditingAction() ? 'Editar Permiso de la Pantalla' : 'Agregar Permiso a la Pantalla' }}
              </h3>
              <p class="sc-modal-subtitle">
                Configura una función específica que luego podrás autorizar o restringir según el rol de cada usuario.
              </p>
            </div>
            <button type="button" class="modal-close" aria-label="Cerrar ventana" (click)="showActionModal.set(false)">&times;</button>
          </div>

          <div class="modal-body sc-modal-body">
            <div class="form-group">
              <label class="form-label">Nombre del Permiso o Función *</label>
              <input
                type="text"
                class="form-control"
                [ngModel]="actionName()"
                (ngModelChange)="onActionNameChange($event)"
                placeholder="Ej: Aprobar Lote de Calidad"
              />
              <small class="sc-field-hint">Usa un nombre claro que describa la acción que realiza el usuario.</small>
            </div>

            <div class="form-group">
              <label class="form-label">Tipo de Operación *</label>
              <div class="sc-operation-selector-grid">
                @for (op of operationTypeOptions; track op.method) {
                  <button
                    type="button"
                    class="sc-operation-option-card"
                    [class.sc-operation-option-selected]="actionHttpMethod() === op.method"
                    (click)="actionHttpMethod.set(op.method)">
                    <div class="sc-operation-option-top">
                      <span class="badge" [ngClass]="op.badgeClass">{{ op.shortLabel }}</span>
                      <strong class="sc-operation-option-title">{{ op.fullLabel }}</strong>
                    </div>
                    <p class="sc-operation-option-desc">{{ op.helperText }}</p>
                  </button>
                }
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Qué permite hacer (Descripción)</label>
              <input
                type="text"
                class="form-control"
                [ngModel]="actionDescription()"
                (ngModelChange)="actionDescription.set($event)"
                placeholder="Ej: Permite certificar los resultados del lote antes de enviarlo a inventario"
              />
              <small class="sc-field-hint">Ayuda a otros administradores a entender para qué sirve este permiso.</small>
            </div>

            <div class="form-group">
              <label class="form-label">Identificador Interno *</label>
              <input
                type="text"
                class="form-control"
                [ngModel]="actionSlug()"
                (ngModelChange)="actionSlug.set($event)"
                placeholder="Ej: calidad.aprobar_lote"
              />
              <small class="sc-field-hint">Se autocompleta automáticamente al escribir el nombre del permiso.</small>
            </div>

            <label class="sc-toggle-row" for="actionIsActiveCheck">
              <input
                type="checkbox"
                id="actionIsActiveCheck"
                [ngModel]="actionIsActive()"
                (ngModelChange)="actionIsActive.set($event)"
              />
              <div class="sc-toggle-copy">
                <strong>Permiso habilitado en el sistema</strong>
                <span>Permite que esta función esté activa y pueda asignarse en la configuración de roles.</span>
              </div>
            </label>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" (click)="showActionModal.set(false)">Cancelar</button>
            <button type="button" class="btn btn-primary" (click)="saveAction()">
              {{ isEditingAction() ? 'Guardar Cambios' : 'Guardar Permiso' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .sc-shell {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
      }

      .sc-hero-card {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 18px;
        padding: 22px 24px;
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
      }

      .sc-hero-left {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        flex: 1;
        min-width: 280px;
      }

      .sc-hero-icon-box {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        background: var(--color-primary-light);
        color: var(--color-primary);
        border: 1px solid var(--color-primary-border);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .sc-hero-copy {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .sc-hero-badges {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }

      .sc-pill {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.01em;
      }

      .sc-pill-emerald {
        background: var(--color-primary-light);
        color: var(--color-primary);
        border: 1px solid var(--color-primary-border);
      }

      .sc-pill-slate {
        background: var(--bg-subtle);
        color: var(--text-muted);
        border: 1px solid var(--border-subtle);
      }

      .sc-hero-title {
        font-size: 1.55rem;
        font-weight: 800;
        color: var(--text-main);
        margin: 0;
        line-height: 1.2;
      }

      .sc-hero-subtitle {
        font-size: 0.9rem;
        color: var(--text-muted);
        margin: 0;
        max-width: 720px;
        line-height: 1.45;
      }

      .sc-hero-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
      }

      .sc-tab-switcher {
        display: inline-flex;
        padding: 4px;
        background: var(--bg-subtle);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        gap: 4px;
      }

      .sc-tab-btn {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 8px 14px;
        border-radius: 9px;
        border: none;
        background: transparent;
        color: var(--text-muted);
        font-size: 0.83rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.16s ease;
        white-space: nowrap;
      }

      .sc-tab-btn:hover {
        color: var(--text-main);
      }

      .sc-tab-btn-active {
        background: var(--bg-card);
        color: var(--color-primary);
        box-shadow: var(--shadow-sm);
      }

      .sc-action-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 9px 15px;
        font-size: 0.84rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .sc-action-btn-sm {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 13px;
        font-size: 0.81rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .sc-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        gap: 16px;
      }

      .sc-kpi-card {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 18px 20px;
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
      }

      .sc-kpi-card-highlight {
        border-color: var(--color-primary-border);
        background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-subtle) 100%);
      }

      .sc-kpi-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .sc-kpi-icon-emerald {
        background: rgba(30, 94, 58, 0.1);
        color: var(--color-primary);
      }

      .sc-kpi-icon-blue {
        background: rgba(37, 99, 235, 0.1);
        color: #2563eb;
      }

      .sc-kpi-icon-purple {
        background: rgba(109, 40, 217, 0.1);
        color: #6d28d9;
      }

      .sc-kpi-icon-amber {
        background: rgba(217, 119, 6, 0.12);
        color: #d97706;
      }

      .sc-kpi-content {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
        flex: 1;
      }

      .sc-kpi-label {
        font-size: 0.76rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
      }

      .sc-kpi-value-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .sc-kpi-value {
        font-size: 1.45rem;
        font-weight: 800;
        color: var(--text-main);
        line-height: 1.2;
      }

      .sc-kpi-value-truncate {
        font-size: 1.08rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .sc-kpi-badge {
        font-size: 0.72rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 999px;
      }

      .sc-kpi-badge-emerald {
        background: var(--color-primary-light);
        color: var(--color-primary);
      }

      .sc-kpi-badge-blue {
        background: rgba(37, 99, 235, 0.1);
        color: #2563eb;
      }

      .sc-kpi-badge-purple {
        background: rgba(109, 40, 217, 0.1);
        color: #6d28d9;
      }

      .sc-kpi-meta {
        font-size: 0.78rem;
        color: var(--text-muted);
      }

      .sc-filter-bar {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        padding: 14px 18px;
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
      }

      .sc-search-box {
        position: relative;
        flex: 1;
        min-width: 260px;
        max-width: 480px;
        display: flex;
        align-items: center;
      }

      .sc-search-icon {
        position: absolute;
        left: 13px;
        color: var(--text-dim);
        pointer-events: none;
      }

      .sc-search-input {
        padding-left: 38px;
        padding-right: 74px;
        font-size: 0.86rem;
        width: 100%;
      }

      .sc-search-clear-btn {
        position: absolute;
        right: 8px;
        padding: 4px 10px;
        border-radius: 6px;
        border: 1px solid var(--border-subtle);
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 0.74rem;
        font-weight: 700;
        cursor: pointer;
      }

      .sc-search-clear-btn:hover {
        color: var(--text-main);
        background: var(--bg-hover);
      }

      .sc-area-chips {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .sc-area-label {
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--text-muted);
      }

      .sc-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid var(--border-subtle);
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 0.77rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .sc-chip:hover {
        border-color: var(--color-primary-border);
        color: var(--text-main);
      }

      .sc-chip-active {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: #ffffff;
      }

      .sc-chip-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 18px;
        padding: 0 6px;
        border-radius: 999px;
        font-size: 0.7rem;
        background: rgba(0, 0, 0, 0.08);
      }

      .sc-chip-active .sc-chip-count {
        background: rgba(255, 255, 255, 0.22);
        color: #ffffff;
      }

      .sc-workspace-grid {
        display: grid;
        grid-template-columns: minmax(340px, 410px) minmax(0, 1fr);
        gap: 20px;
        align-items: start;
      }

      @media (max-width: 1180px) {
        .sc-workspace-grid {
          grid-template-columns: 1fr;
        }
      }

      .sc-panel {
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .sc-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        padding: 18px 20px;
        border-bottom: 1px solid var(--border-subtle);
        background: var(--bg-subtle);
      }

      .sc-panel-title {
        font-size: 1.05rem;
        font-weight: 800;
        color: var(--text-main);
        margin: 0;
      }

      .sc-panel-subtitle {
        font-size: 0.8rem;
        color: var(--text-muted);
        margin: 3px 0 0 0;
      }

      .sc-count-pill {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;
        background: var(--color-primary-light);
        color: var(--color-primary);
        white-space: nowrap;
      }

      .sc-screens-list {
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .sc-screen-card {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 14px 16px;
        border-radius: 12px;
        border: 1.5px solid var(--border-subtle);
        background: var(--bg-card);
        cursor: pointer;
        transition: all 0.16s ease;
      }

      .sc-screen-card:hover {
        border-color: var(--color-primary-border);
        background: var(--bg-hover);
      }

      .sc-screen-card-selected {
        border-color: var(--color-primary);
        background: var(--color-primary-light);
        box-shadow: 0 2px 10px rgba(30, 94, 58, 0.08);
      }

      .sc-screen-card-inactive {
        opacity: 0.82;
      }

      .sc-screen-card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 10px;
      }

      .sc-screen-identity {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        min-width: 0;
        flex: 1;
      }

      .sc-screen-icon-box {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: var(--bg-subtle);
        border: 1px solid var(--border-subtle);
        color: var(--text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .sc-screen-icon-active {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: #ffffff;
      }

      .sc-screen-title-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
        flex: 1;
      }

      .sc-screen-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sc-seq-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        border-radius: 6px;
        background: var(--bg-subtle);
        border: 1px solid var(--border-subtle);
        font-size: 0.74rem;
        font-weight: 800;
        color: var(--text-muted);
        flex-shrink: 0;
      }

      .sc-screen-name {
        font-size: 0.94rem;
        font-weight: 800;
        color: var(--text-main);
        margin: 0;
        line-height: 1.25;
      }

      .sc-screen-meta-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        font-size: 0.77rem;
        color: var(--text-muted);
      }

      .sc-meta-route {
        color: var(--color-primary);
        font-weight: 700;
      }

      .sc-meta-dot {
        color: var(--text-dim);
      }

      .sc-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.73rem;
        font-weight: 700;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .sc-status-visible {
        background: rgba(16, 185, 129, 0.12);
        color: #047857;
      }

      .sc-status-hidden {
        background: rgba(239, 68, 68, 0.12);
        color: #b91c1c;
      }

      .sc-status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }

      .sc-screen-card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        padding-top: 10px;
        border-top: 1px solid var(--border-subtle);
        flex-wrap: wrap;
      }

      .sc-screen-stats {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .sc-permission-count-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.76rem;
        font-weight: 700;
        color: var(--text-main);
      }

      .sc-order-hint {
        font-size: 0.73rem;
        color: var(--text-dim);
      }

      .sc-screen-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }

      .sc-card-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 10px;
        border-radius: 8px;
        border: 1px solid var(--border-subtle);
        background: var(--bg-card);
        color: var(--text-main);
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.14s ease;
      }

      .sc-card-btn:hover {
        border-color: var(--border-highlight);
        background: var(--bg-subtle);
      }

      .sc-card-btn-danger {
        color: #dc2626;
      }

      .sc-card-btn-success {
        color: #059669;
      }

      .sc-permissions-header {
        flex-wrap: wrap;
        align-items: center;
      }

      .sc-permissions-header-info {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: 1;
        min-width: 240px;
      }

      .sc-permissions-title-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .sc-permissions-meta-bar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 0.8rem;
        color: var(--text-muted);
      }

      .sc-permissions-header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .sc-permissions-toolbar {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 12px 20px;
        border-bottom: 1px solid var(--border-subtle);
        background: var(--bg-card);
      }

      .sc-perm-search-wrap {
        position: relative;
        flex: 1;
        min-width: 220px;
        max-width: 400px;
        display: flex;
        align-items: center;
      }

      .sc-perm-search-input {
        padding-left: 34px;
        padding-right: 78px;
        font-size: 0.82rem;
        height: 36px;
      }

      .sc-operation-filters {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .sc-op-chip {
        padding: 5px 11px;
        border-radius: 8px;
        border: 1px solid var(--border-subtle);
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
      }

      .sc-op-chip-active {
        background: var(--color-primary-light);
        border-color: var(--color-primary);
        color: var(--color-primary);
      }

      .sc-table-wrapper {
        width: 100%;
        overflow-x: auto;
      }

      .sc-permissions-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: auto;
      }

      .sc-permissions-table th {
        padding: 12px 16px;
        text-align: left;
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
        background: var(--bg-table-th);
        border-bottom: 1px solid var(--border-subtle);
        white-space: nowrap;
      }

      .sc-permissions-table td {
        padding: 14px 16px;
        vertical-align: middle;
        border-bottom: 1px solid var(--border-subtle);
      }

      .sc-permissions-table tbody tr:hover {
        background: var(--bg-table-hover);
      }

      .sc-row-disabled {
        opacity: 0.72;
      }

      .sc-col-permission {
        width: 26%;
      }

      .sc-col-description {
        width: 32%;
      }

      .sc-col-operation {
        width: 16%;
      }

      .sc-col-status {
        width: 12%;
      }

      .sc-col-options {
        width: 14%;
      }

      .sc-perm-name {
        font-size: 0.88rem;
        font-weight: 800;
        color: var(--text-main);
        margin-bottom: 3px;
      }

      .sc-perm-code {
        font-size: 0.74rem;
        color: var(--text-muted);
        font-family: monospace;
        word-break: break-all;
      }

      .sc-perm-desc-text {
        font-size: 0.82rem;
        color: var(--text-muted);
        margin: 0;
        line-height: 1.4;
      }

      .sc-cell-operation {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 3px;
      }

      .sc-operation-badge {
        font-size: 0.73rem;
        font-weight: 800;
      }

      .sc-operation-sublabel {
        font-size: 0.71rem;
        color: var(--text-dim);
      }

      .sc-table-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: nowrap;
      }

      .sc-table-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 10px;
        border-radius: 8px;
        border: 1px solid var(--border-subtle);
        background: var(--bg-card);
        color: var(--text-main);
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        transition: all 0.14s ease;
      }

      .sc-table-btn:hover {
        background: var(--bg-hover);
        border-color: var(--border-highlight);
      }

      .sc-table-btn-danger {
        color: #dc2626;
      }

      .sc-table-btn-success {
        color: #059669;
      }

      .sc-pagination-bar {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        padding: 12px 18px;
        border-top: 1px solid var(--border-subtle);
        background: var(--bg-subtle);
      }

      .sc-pagination-info {
        font-size: 0.79rem;
        color: var(--text-muted);
      }

      .sc-pagination-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sc-page-btn {
        padding: 5px 12px;
        border-radius: 8px;
        border: 1px solid var(--border-subtle);
        background: var(--bg-card);
        color: var(--text-main);
        font-size: 0.76rem;
        font-weight: 700;
        cursor: pointer;
      }

      .sc-page-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .sc-page-indicator {
        font-size: 0.77rem;
        font-weight: 700;
        color: var(--text-muted);
      }

      .sc-empty-state {
        padding: 36px 24px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .sc-empty-state-compact {
        padding: 24px 16px;
      }

      .sc-empty-detail {
        min-height: 320px;
        justify-content: center;
      }

      .sc-empty-icon {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--bg-subtle);
        color: var(--text-dim);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 4px;
      }

      .sc-empty-title {
        font-size: 0.98rem;
        font-weight: 800;
        color: var(--text-main);
        margin: 0;
      }

      .sc-empty-text {
        font-size: 0.83rem;
        color: var(--text-muted);
        max-width: 420px;
        margin: 0;
      }

      .sc-empty-table-cell {
        padding: 0 !important;
      }

      .sc-modal-dialog {
        max-width: 620px;
        width: 95%;
      }

      .sc-modal-subtitle {
        font-size: 0.81rem;
        color: var(--text-muted);
        margin: 3px 0 0 0;
        font-weight: 400;
      }

      .sc-modal-body {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .sc-form-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }

      @media (max-width: 640px) {
        .sc-form-grid-2 {
          grid-template-columns: 1fr;
        }
      }

      .sc-field-hint {
        display: block;
        margin-top: 4px;
        font-size: 0.74rem;
        color: var(--text-muted);
      }

      .sc-quick-suggestions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        margin-top: 6px;
      }

      .sc-suggestion-label {
        font-size: 0.72rem;
        color: var(--text-muted);
        font-weight: 700;
      }

      .sc-suggestion-chip {
        padding: 2px 8px;
        border-radius: 999px;
        border: 1px solid var(--border-subtle);
        background: var(--bg-subtle);
        color: var(--text-main);
        font-size: 0.71rem;
        font-weight: 700;
        cursor: pointer;
      }

      .sc-suggestion-chip:hover {
        border-color: var(--color-primary);
        color: var(--color-primary);
      }

      .sc-icon-selector-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
        gap: 8px;
      }

      .sc-icon-option-btn {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        padding: 8px 10px;
        border-radius: 9px;
        border: 1.5px solid var(--border-subtle);
        background: var(--bg-subtle);
        cursor: pointer;
        text-align: left;
      }

      .sc-icon-option-selected {
        border-color: var(--color-primary);
        background: var(--color-primary-light);
      }

      .sc-icon-option-title {
        font-size: 0.78rem;
        font-weight: 800;
        color: var(--text-main);
      }

      .sc-icon-option-hint {
        font-size: 0.69rem;
        color: var(--text-muted);
      }

      .sc-operation-selector-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 8px;
      }

      .sc-operation-option-card {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1.5px solid var(--border-subtle);
        background: var(--bg-subtle);
        cursor: pointer;
        text-align: left;
      }

      .sc-operation-option-selected {
        border-color: var(--color-primary);
        background: var(--color-primary-light);
      }

      .sc-operation-option-top {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sc-operation-option-title {
        font-size: 0.81rem;
        color: var(--text-main);
      }

      .sc-operation-option-desc {
        font-size: 0.73rem;
        color: var(--text-muted);
        margin: 0;
        line-height: 1.35;
      }

      .sc-toggle-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 14px;
        border-radius: 10px;
        background: var(--bg-subtle);
        border: 1px solid var(--border-subtle);
        cursor: pointer;
      }

      .sc-toggle-row input[type='checkbox'] {
        accent-color: var(--color-primary);
        width: 18px;
        height: 18px;
        margin-top: 2px;
        cursor: pointer;
        flex-shrink: 0;
      }

      .sc-toggle-copy {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 0.83rem;
      }

      .sc-toggle-copy span {
        font-size: 0.75rem;
        color: var(--text-muted);
      }
    `
  ]
})
export class SystemCatalogComponent implements OnInit {
  /** HTTP API service for modules and actions CRUD. */
  private readonly api = inject(ApiService);
  /** Authentication and dynamic navigation state service. */
  private readonly auth = inject(AuthService);
  /** Toast notification service for user feedback. */
  private readonly notification = inject(NotificationService);

  /** Active view tab between the screens/permissions catalog and SQL backups. */
  readonly activeTab = signal<'catalog' | 'backups'>('catalog');
  /** Full list of dynamic system modules loaded from the backend. */
  readonly modules = signal<SystemModuleCatalogDto[]>([]);
  /** Identifier of the currently selected screen module. */
  readonly selectedModuleId = signal<number | null>(null);
  /** Indicates whether the catalog is currently loading from the server. */
  readonly isLoading = signal<boolean>(false);
  /** Search query used to filter screens by name, area, route, or permission. */
  readonly searchQuery = signal<string>('');
  /** Selected menu section filter (`ALL` or a specific section name). */
  readonly sectionFilter = signal<string>('ALL');

  /** Current page index (1-based) for the left-hand screens list pagination. */
  readonly modulesCurrentPage = signal<number>(1);
  /** Number of screen cards displayed per page in the left-hand panel. */
  readonly modulesPageSize = signal<number>(6);

  /** Search query used to filter permissions inside the selected screen. */
  readonly actionSearchQuery = signal<string>('');
  /** Operation type filter (`ALL`, `GET`, `POST`, `PUT`, `PATCH`, `DELETE`) for the permissions table. */
  readonly actionOperationFilter = signal<string>('ALL');
  /** Current page index (1-based) for the right-hand permissions table pagination. */
  readonly actionsCurrentPage = signal<number>(1);
  /** Number of permissions displayed per page in the right-hand table. */
  readonly actionsPageSize = signal<number>(6);

  /** Controls visibility of the create/edit screen modal. */
  readonly showModuleModal = signal<boolean>(false);
  /** Indicates whether the screen modal is in edit mode. */
  readonly isEditingModule = signal<boolean>(false);
  /** Identifier of the screen currently being edited. */
  readonly editingModuleId = signal<number | null>(null);

  /** Screen name bound to the modal form. */
  readonly moduleName = signal<string>('');
  /** Internal screen slug bound to the modal form. */
  readonly moduleSlug = signal<string>('');
  /** Menu section/category name bound to the modal form. */
  readonly moduleMenuSection = signal<string>('');
  /** Frontend route path bound to the modal form. */
  readonly moduleFrontendRoute = signal<string>('');
  /** Visual icon key bound to the modal form. */
  readonly moduleIcon = signal<string>('grid');
  /** Display order position bound to the modal form. */
  readonly moduleDisplayOrder = signal<number>(1);
  /** Visibility status bound to the modal form. */
  readonly moduleIsActive = signal<boolean>(true);

  /** Controls visibility of the create/edit permission modal. */
  readonly showActionModal = signal<boolean>(false);
  /** Indicates whether the permission modal is in edit mode. */
  readonly isEditingAction = signal<boolean>(false);
  /** Identifier of the permission currently being edited. */
  readonly editingActionId = signal<number | null>(null);

  /** Parent module identifier for the permission being created or edited. */
  readonly actionModuleId = signal<number>(0);
  /** Human-friendly permission name bound to the modal form. */
  readonly actionName = signal<string>('');
  /** Internal permission slug bound to the modal form. */
  readonly actionSlug = signal<string>('');
  /** Operation HTTP verb (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) bound to the modal form. */
  readonly actionHttpMethod = signal<string>('GET');
  /** Plain-language description of what the permission allows. */
  readonly actionDescription = signal<string>('');
  /** Enabled status of the permission bound to the modal form. */
  readonly actionIsActive = signal<boolean>(true);

  /**
   * Curated list of human-friendly icon options for the screen creation/edition modal.
   */
  readonly iconOptions: readonly SystemCatalogIconOption[] = [
    { key: 'grid', label: 'Tablero General', hint: 'Resumen y paneles' },
    { key: 'truck', label: 'Pedidos y Envíos', hint: 'Despacho y rutas' },
    { key: 'box', label: 'Inventario y Stock', hint: 'Productos y cava' },
    { key: 'clock', label: 'Turnos y Horarios', hint: 'Control de jornada' },
    { key: 'users', label: 'Personal y Equipo', hint: 'Talento humano' },
    { key: 'dollar', label: 'Clientes y Finanzas', hint: 'Ventas y recaudos' },
    { key: 'chart', label: 'Reportes y Metas', hint: 'Indicadores y análisis' },
    { key: 'settings', label: 'Configuración', hint: 'Ajustes del sistema' },
    { key: 'shield', label: 'Seguridad y Roles', hint: 'Permisos y accesos' },
    { key: 'globe', label: 'Portal Web', hint: 'Catálogo público' }
  ];

  /**
   * Human-friendly operation type options translating HTTP verbs into plain Spanish.
   */
  readonly operationTypeOptions: readonly SystemCatalogOperationOption[] = [
    {
      method: 'GET',
      shortLabel: 'Consulta',
      fullLabel: 'Consulta y lectura',
      helperText: 'Permite ver pantallas, listados o reportes sin modificar datos.',
      badgeClass: 'badge-info'
    },
    {
      method: 'POST',
      shortLabel: 'Registro',
      fullLabel: 'Creación y registro',
      helperText: 'Permite crear o registrar nuevos datos en el sistema.',
      badgeClass: 'badge-emerald'
    },
    {
      method: 'PUT',
      shortLabel: 'Modificación',
      fullLabel: 'Edición y actualización',
      helperText: 'Permite editar o actualizar información existente.',
      badgeClass: 'badge-purple'
    },
    {
      method: 'PATCH',
      shortLabel: 'Modificación',
      fullLabel: 'Actualización de estado',
      helperText: 'Permite aprobar, activar o cambiar el estado de un registro.',
      badgeClass: 'badge-warning'
    },
    {
      method: 'DELETE',
      shortLabel: 'Eliminación',
      fullLabel: 'Eliminación',
      helperText: 'Permite eliminar o anular registros de forma controlada.',
      badgeClass: 'badge-danger'
    }
  ];

  /**
   * Computes the list of distinct menu sections present in the catalog.
   */
  readonly availableMenuSections = computed<string[]>(() => {
    try {
      const custom = this.modules()
        .map((m: SystemModuleCatalogDto) => m.menuSection)
        .filter(Boolean);
      return Array.from(new Set(custom));
    } catch {
      return [];
    }
  });

  /**
   * Computes the filtered and sorted list of screens matching the search query and area filter.
   */
  readonly filteredModules = computed<SystemModuleCatalogDto[]>(() => {
    try {
      const query = this.searchQuery().trim().toLowerCase();
      const section = this.sectionFilter();
      return [...this.modules()]
        .filter((mod: SystemModuleCatalogDto) => {
          if (section !== 'ALL' && mod.menuSection !== section) {
            return false;
          }
          if (!query) {
            return true;
          }
          const matchesModule =
            mod.name.toLowerCase().includes(query) ||
            mod.slug.toLowerCase().includes(query) ||
            mod.frontendRoute.toLowerCase().includes(query) ||
            mod.menuSection.toLowerCase().includes(query);
          const matchesAction = (mod.actions || []).some(
            (a: SystemActionCatalogDto) =>
              a.name.toLowerCase().includes(query) ||
              a.slug.toLowerCase().includes(query) ||
              (a.description || '').toLowerCase().includes(query)
          );
          return matchesModule || matchesAction;
        })
        .sort((a: SystemModuleCatalogDto, b: SystemModuleCatalogDto) => a.displayOrder - b.displayOrder);
    } catch {
      return [];
    }
  });

  /**
   * Computes the total number of pages for the filtered screens list.
   */
  readonly modulesTotalPages = computed<number>(() => {
    try {
      const total = this.filteredModules().length;
      const size = Math.max(1, this.modulesPageSize());
      return Math.max(1, Math.ceil(total / size));
    } catch {
      return 1;
    }
  });

  /**
   * Computes the slice of screens to display on the current page of the left panel.
   */
  readonly paginatedModules = computed<SystemModuleCatalogDto[]>(() => {
    try {
      const list = this.filteredModules();
      const size = Math.max(1, this.modulesPageSize());
      const safePage = Math.min(Math.max(1, this.modulesCurrentPage()), this.modulesTotalPages());
      const start = (safePage - 1) * size;
      return list.slice(start, start + size);
    } catch {
      return [];
    }
  });

  /**
   * Computes the 1-based start index of the currently visible screens range.
   */
  readonly modulesRangeStart = computed<number>(() => {
    try {
      const total = this.filteredModules().length;
      if (total === 0) {
        return 0;
      }
      const size = Math.max(1, this.modulesPageSize());
      const safePage = Math.min(Math.max(1, this.modulesCurrentPage()), this.modulesTotalPages());
      return (safePage - 1) * size + 1;
    } catch {
      return 0;
    }
  });

  /**
   * Computes the 1-based end index of the currently visible screens range.
   */
  readonly modulesRangeEnd = computed<number>(() => {
    try {
      const total = this.filteredModules().length;
      if (total === 0) {
        return 0;
      }
      const size = Math.max(1, this.modulesPageSize());
      const safePage = Math.min(Math.max(1, this.modulesCurrentPage()), this.modulesTotalPages());
      return Math.min(total, safePage * size);
    } catch {
      return 0;
    }
  });

  /**
   * Resolves the currently selected screen module or defaults to the first available module.
   */
  readonly selectedModule = computed<SystemModuleCatalogDto | null>(() => {
    try {
      const id = this.selectedModuleId();
      const list = this.modules();
      if (list.length === 0) {
        return null;
      }
      return list.find((m: SystemModuleCatalogDto) => m.id === id) ?? list[0];
    } catch {
      return null;
    }
  });

  /**
   * Computes the filtered list of permissions belonging to the currently selected screen.
   */
  readonly filteredSelectedModuleActions = computed<SystemActionCatalogDto[]>(() => {
    try {
      const mod = this.selectedModule();
      if (!mod || !Array.isArray(mod.actions)) {
        return [];
      }
      const query = this.actionSearchQuery().trim().toLowerCase();
      const opFilter = this.actionOperationFilter().toUpperCase();
      return mod.actions.filter((act: SystemActionCatalogDto) => {
        const method = (act.httpMethod || 'GET').toUpperCase();
        if (opFilter !== 'ALL') {
          if (opFilter === 'PUT' && method !== 'PUT' && method !== 'PATCH') {
            return false;
          } else if (opFilter !== 'PUT' && method !== opFilter) {
            return false;
          }
        }
        if (!query) {
          return true;
        }
        return (
          act.name.toLowerCase().includes(query) ||
          act.slug.toLowerCase().includes(query) ||
          (act.description || '').toLowerCase().includes(query)
        );
      });
    } catch {
      return [];
    }
  });

  /**
   * Computes the total number of pages for the permissions table of the selected screen.
   */
  readonly actionsTotalPages = computed<number>(() => {
    try {
      const total = this.filteredSelectedModuleActions().length;
      const size = Math.max(1, this.actionsPageSize());
      return Math.max(1, Math.ceil(total / size));
    } catch {
      return 1;
    }
  });

  /**
   * Computes the slice of permissions displayed on the current page of the permissions table.
   */
  readonly paginatedSelectedModuleActions = computed<SystemActionCatalogDto[]>(() => {
    try {
      const list = this.filteredSelectedModuleActions();
      const size = Math.max(1, this.actionsPageSize());
      const safePage = Math.min(Math.max(1, this.actionsCurrentPage()), this.actionsTotalPages());
      const start = (safePage - 1) * size;
      return list.slice(start, start + size);
    } catch {
      return [];
    }
  });

  /**
   * Computes the 1-based start index of the currently visible permissions range.
   */
  readonly actionsRangeStart = computed<number>(() => {
    try {
      const total = this.filteredSelectedModuleActions().length;
      if (total === 0) {
        return 0;
      }
      const size = Math.max(1, this.actionsPageSize());
      const safePage = Math.min(Math.max(1, this.actionsCurrentPage()), this.actionsTotalPages());
      return (safePage - 1) * size + 1;
    } catch {
      return 0;
    }
  });

  /**
   * Computes the 1-based end index of the currently visible permissions range.
   */
  readonly actionsRangeEnd = computed<number>(() => {
    try {
      const total = this.filteredSelectedModuleActions().length;
      if (total === 0) {
        return 0;
      }
      const size = Math.max(1, this.actionsPageSize());
      const safePage = Math.min(Math.max(1, this.actionsCurrentPage()), this.actionsTotalPages());
      return Math.min(total, safePage * size);
    } catch {
      return 0;
    }
  });

  /**
   * Computes the total number of permissions configured across all screens.
   */
  readonly totalActionsCount = computed<number>(() => {
    try {
      return this.modules().reduce(
        (sum: number, m: SystemModuleCatalogDto) => sum + (m.actions?.length ?? 0),
        0
      );
    } catch {
      return 0;
    }
  });

  /**
   * Computes the count of screens that are currently visible/active in the sidebar menu.
   */
  readonly activeModulesCount = computed<number>(() => {
    try {
      return this.modules().filter((m: SystemModuleCatalogDto) => m.isActive).length;
    } catch {
      return 0;
    }
  });

  /**
   * Computes the count of screens that are currently hidden/inactive in the sidebar menu.
   */
  readonly hiddenModulesCount = computed<number>(() => {
    try {
      return this.modules().filter((m: SystemModuleCatalogDto) => !m.isActive).length;
    } catch {
      return 0;
    }
  });

  /**
   * Computes the total number of enabled permissions across all registered screens.
   */
  readonly activeActionsCount = computed<number>(() => {
    try {
      return this.modules().reduce(
        (sum: number, m: SystemModuleCatalogDto) =>
          sum + (m.actions || []).filter((a: SystemActionCatalogDto) => a.isActive).length,
        0
      );
    } catch {
      return 0;
    }
  });

  /**
   * Initializes the System Catalog by loading all screens and permissions from `/api/modules`.
   */
  ngOnInit(): void {
    try {
      this.loadSystemCatalog();
    } catch {
      return;
    }
  }

  /**
   * Loads all system screens and their nested permissions from the backend API.
   */
  loadSystemCatalog(): void {
    try {
      this.isLoading.set(true);
      this.api.getSystemModules(false).subscribe({
        next: (response: SystemModuleCatalogDto[]) => {
          this.isLoading.set(false);
          if (Array.isArray(response) && response.length > 0) {
            const sorted = [...response]
              .filter((m: SystemModuleCatalogDto) => !this.auth.isRemovedCalculatorModule(m))
              .map((m: SystemModuleCatalogDto) => ({
                ...m,
                actions: (m.actions || []).filter(
                  (a: SystemActionCatalogDto) => !this.auth.isRemovedCalculatorActionSlug?.(a.slug)
                )
              }))
              .sort(
                (a: SystemModuleCatalogDto, b: SystemModuleCatalogDto) => a.displayOrder - b.displayOrder
              );
            this.modules.set(sorted);
            this.saveCatalogToStorage(sorted);
            if (!this.selectedModuleId() && sorted.length > 0) {
              this.selectedModuleId.set(sorted[0].id);
            }
          } else {
            this.modules.set([]);
            this.selectedModuleId.set(null);
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.modules.set([]);
          this.selectedModuleId.set(null);
          this.notification.error(
            'Error de Conexión',
            'No se pudo cargar el listado de pantallas y permisos desde el servidor.'
          );
        }
      });
    } catch {
      this.isLoading.set(false);
      this.modules.set([]);
      this.selectedModuleId.set(null);
    }
  }

  /**
   * Selects a screen to inspect and manage its available permissions, resetting permission pagination.
   */
  selectModule(moduleId: number): void {
    try {
      this.selectedModuleId.set(moduleId);
      this.actionsCurrentPage.set(1);
    } catch {
      return;
    }
  }

  /**
   * Updates the main screen search query and resets the screen list pagination to page 1.
   */
  onSearchQueryChange(query: string): void {
    try {
      this.searchQuery.set(query);
      this.modulesCurrentPage.set(1);
    } catch {
      return;
    }
  }

  /**
   * Clears the main screen search query and resets pagination to page 1.
   */
  clearSearchQuery(): void {
    try {
      this.searchQuery.set('');
      this.modulesCurrentPage.set(1);
    } catch {
      return;
    }
  }

  /**
   * Selects a menu section filter and resets the screen list pagination to page 1.
   */
  selectSectionFilter(section: string): void {
    try {
      this.sectionFilter.set(section);
      this.modulesCurrentPage.set(1);
    } catch {
      return;
    }
  }

  /**
   * Returns the number of screens registered under a specific menu section.
   */
  getSectionModulesCount(section: string): number {
    try {
      return this.modules().filter((m: SystemModuleCatalogDto) => m.menuSection === section).length;
    } catch {
      return 0;
    }
  }

  /**
   * Navigates to a specific page in the left-hand screens list.
   */
  setModulesPage(page: number): void {
    try {
      const clamped = Math.min(Math.max(1, page), this.modulesTotalPages());
      this.modulesCurrentPage.set(clamped);
    } catch {
      return;
    }
  }

  /**
   * Advances to the next page of screens if available.
   */
  nextModulesPage(): void {
    try {
      if (this.modulesCurrentPage() < this.modulesTotalPages()) {
        this.modulesCurrentPage.update((p: number) => p + 1);
      }
    } catch {
      return;
    }
  }

  /**
   * Returns to the previous page of screens if available.
   */
  prevModulesPage(): void {
    try {
      if (this.modulesCurrentPage() > 1) {
        this.modulesCurrentPage.update((p: number) => p - 1);
      }
    } catch {
      return;
    }
  }

  /**
   * Computes a clean sequential number (1, 2, 3...) for a screen card on the current page.
   */
  getSequentialNumber(indexOnPage: number): number {
    try {
      const safePage = Math.min(Math.max(1, this.modulesCurrentPage()), this.modulesTotalPages());
      return (safePage - 1) * Math.max(1, this.modulesPageSize()) + indexOnPage + 1;
    } catch {
      return indexOnPage + 1;
    }
  }

  /**
   * Updates the permissions search query inside the selected screen and resets table pagination.
   */
  onActionSearchChange(query: string): void {
    try {
      this.actionSearchQuery.set(query);
      this.actionsCurrentPage.set(1);
    } catch {
      return;
    }
  }

  /**
   * Selects an operation type filter (`ALL`, `GET`, `POST`, `PUT`, `DELETE`) for the permissions table.
   */
  selectActionOperationFilter(method: string): void {
    try {
      this.actionOperationFilter.set(method);
      this.actionsCurrentPage.set(1);
    } catch {
      return;
    }
  }

  /**
   * Resets both the permission search input and operation type filter.
   */
  clearActionFilters(): void {
    try {
      this.actionSearchQuery.set('');
      this.actionOperationFilter.set('ALL');
      this.actionsCurrentPage.set(1);
    } catch {
      return;
    }
  }

  /**
   * Navigates to a specific page in the permissions table.
   */
  setActionsPage(page: number): void {
    try {
      const clamped = Math.min(Math.max(1, page), this.actionsTotalPages());
      this.actionsCurrentPage.set(clamped);
    } catch {
      return;
    }
  }

  /**
   * Advances to the next page in the permissions table if available.
   */
  nextActionsPage(): void {
    try {
      if (this.actionsCurrentPage() < this.actionsTotalPages()) {
        this.actionsCurrentPage.update((p: number) => p + 1);
      }
    } catch {
      return;
    }
  }

  /**
   * Returns to the previous page in the permissions table if available.
   */
  prevActionsPage(): void {
    try {
      if (this.actionsCurrentPage() > 1) {
        this.actionsCurrentPage.update((p: number) => p - 1);
      }
    } catch {
      return;
    }
  }

  /**
   * Opens the modal to register a new screen in the system menu.
   */
  openCreateModuleModal(): void {
    try {
      const nextOrder = Math.max(0, ...this.modules().map((m: SystemModuleCatalogDto) => m.displayOrder)) + 1;
      this.isEditingModule.set(false);
      this.editingModuleId.set(null);
      this.moduleName.set('');
      this.moduleSlug.set('');
      this.moduleMenuSection.set('');
      this.moduleFrontendRoute.set('');
      this.moduleIcon.set('grid');
      this.moduleDisplayOrder.set(nextOrder);
      this.moduleIsActive.set(true);
      this.showModuleModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Opens the modal to edit an existing system screen.
   */
  openEditModuleModal(mod: SystemModuleCatalogDto): void {
    try {
      this.isEditingModule.set(true);
      this.editingModuleId.set(mod.id);
      this.moduleName.set(mod.name);
      this.moduleSlug.set(mod.slug);
      this.moduleMenuSection.set(mod.menuSection);
      this.moduleFrontendRoute.set(mod.frontendRoute);
      this.moduleIcon.set(mod.icon || 'grid');
      this.moduleDisplayOrder.set(mod.displayOrder);
      this.moduleIsActive.set(mod.isActive);
      this.showModuleModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Automatically generates an internal identifier (`slug`) and screen route when typing the screen name during creation.
   */
  onModuleNameChange(name: string): void {
    try {
      this.moduleName.set(name);
      if (!this.isEditingModule()) {
        const generatedSlug = name
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        this.moduleSlug.set(generatedSlug);
        this.moduleFrontendRoute.set(generatedSlug ? `/${generatedSlug}` : '');
      }
    } catch {
      return;
    }
  }

  /**
   * Saves a new or edited screen via `/api/modules`.
   */
  saveModule(): void {
    try {
      const name = this.moduleName().trim();
      const slug = this.moduleSlug().trim().toLowerCase();
      const menuSection = this.moduleMenuSection().trim();
      const rawRoute = this.moduleFrontendRoute().trim() || `/${slug}`;
      const frontendRoute = rawRoute.startsWith('/') ? rawRoute : `/${rawRoute}`;

      if (!name || !slug) {
        this.notification.warning(
          'Datos Requeridos',
          'Por favor ingresa el nombre de la pantalla y su identificador interno.'
        );
        return;
      }

      if (this.isEditingModule() && this.editingModuleId() !== null) {
        const targetId = this.editingModuleId()!;
        const updateDto: UpdateSystemModuleDto = {
          name,
          slug,
          menuSection,
          frontendRoute,
          icon: this.moduleIcon().trim() || 'grid',
          displayOrder: Number(this.moduleDisplayOrder()) || 1,
          isActive: this.moduleIsActive()
        };

        this.api.updateSystemModule(targetId, updateDto).subscribe({
          next: (updated: SystemModuleCatalogDto) => {
            this.modules.update((list: SystemModuleCatalogDto[]) =>
              list.map((m: SystemModuleCatalogDto) =>
                m.id === targetId ? { ...m, ...updated, actions: updated.actions ?? m.actions } : m
              )
            );
            this.saveCatalogToStorage(this.modules());
            this.showModuleModal.set(false);
            this.notification.success(
              'Pantalla Actualizada',
              `La pantalla "${name}" fue actualizada correctamente.`
            );
          },
          error: () => {
            this.notification.error(
              'Error al Actualizar',
              `No se pudo actualizar la pantalla "${name}" en el servidor.`
            );
          }
        });
      } else {
        const createDto: CreateSystemModuleDto = {
          name,
          slug,
          menuSection,
          frontendRoute,
          icon: this.moduleIcon().trim() || 'grid',
          displayOrder: Number(this.moduleDisplayOrder()) || 1,
          isActive: this.moduleIsActive()
        };

        this.api.createSystemModule(createDto).subscribe({
          next: (created: SystemModuleCatalogDto) => {
            const newMod: SystemModuleCatalogDto = {
              ...created,
              actions: created.actions ?? []
            };
            const updatedList = [...this.modules(), newMod].sort(
              (a: SystemModuleCatalogDto, b: SystemModuleCatalogDto) => a.displayOrder - b.displayOrder
            );
            this.modules.set(updatedList);
            this.selectedModuleId.set(newMod.id);
            this.saveCatalogToStorage(updatedList);
            this.showModuleModal.set(false);
            this.notification.success(
              'Pantalla Creada',
              `La pantalla "${name}" fue registrada en el área "${menuSection || 'General'}".`
            );
          },
          error: () => {
            this.notification.error(
              'Error al Crear Pantalla',
              `No se pudo registrar la pantalla "${name}" en el servidor.`
            );
          }
        });
      }
    } catch {
      return;
    }
  }

  /**
   * Toggles the visibility status of a screen via `PUT /api/modules/{id}`.
   */
  toggleModuleStatus(mod: SystemModuleCatalogDto, event?: Event): void {
    try {
      event?.stopPropagation();
      const nextActive = !mod.isActive;
      const dto: UpdateSystemModuleDto = {
        name: mod.name,
        slug: mod.slug,
        menuSection: mod.menuSection,
        frontendRoute: mod.frontendRoute,
        icon: mod.icon,
        displayOrder: mod.displayOrder,
        isActive: nextActive
      };

      this.api.updateSystemModule(mod.id, dto).subscribe({
        next: () => {
          this.modules.update((list: SystemModuleCatalogDto[]) =>
            list.map((m: SystemModuleCatalogDto) => (m.id === mod.id ? { ...m, isActive: nextActive } : m))
          );
          this.saveCatalogToStorage(this.modules());
          this.notification.info(
            nextActive ? 'Pantalla Visible' : 'Pantalla Oculta',
            `La pantalla "${mod.name}" ahora está ${nextActive ? 'visible en el menú' : 'oculta del menú'}.`
          );
        },
        error: () => {
          this.notification.error(
            'Error de Estado',
            `No se pudo cambiar la visibilidad de la pantalla "${mod.name}".`
          );
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Deletes or deactivates a screen via `DELETE /api/modules/{id}`.
   */
  deleteModule(mod: SystemModuleCatalogDto, event?: Event): void {
    try {
      event?.stopPropagation();
      this.api.deleteSystemModule(mod.id).subscribe({
        next: () => {
          const remaining = this.modules().filter((m: SystemModuleCatalogDto) => m.id !== mod.id);
          this.modules.set(remaining);
          if (this.selectedModuleId() === mod.id) {
            this.selectedModuleId.set(remaining.length > 0 ? remaining[0].id : null);
          }
          this.saveCatalogToStorage(remaining);
          this.notification.info('Pantalla Eliminada', `La pantalla "${mod.name}" fue retirada del catálogo.`);
        },
        error: () => {
          this.notification.error('Error al Eliminar', `No se pudo retirar la pantalla "${mod.name}".`);
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Opens the modal to create a new permission inside the selected screen.
   */
  openCreateActionModal(mod?: SystemModuleCatalogDto): void {
    try {
      const targetMod = mod ?? this.selectedModule();
      if (!targetMod) {
        return;
      }
      this.isEditingAction.set(false);
      this.editingActionId.set(null);
      this.actionModuleId.set(targetMod.id);
      this.actionName.set('');
      this.actionSlug.set(`${targetMod.slug}.`);
      this.actionHttpMethod.set('GET');
      this.actionDescription.set('');
      this.actionIsActive.set(true);
      this.showActionModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Opens the modal to edit an existing screen permission.
   */
  openEditActionModal(action: SystemActionCatalogDto): void {
    try {
      this.isEditingAction.set(true);
      this.editingActionId.set(action.id);
      this.actionModuleId.set(action.moduleId);
      this.actionName.set(action.name);
      this.actionSlug.set(action.slug);
      this.actionHttpMethod.set(action.httpMethod || 'GET');
      this.actionDescription.set(action.description || '');
      this.actionIsActive.set(action.isActive);
      this.showActionModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Automatically generates the internal permission identifier (`slug`) from the permission name during creation.
   */
  onActionNameChange(name: string): void {
    try {
      this.actionName.set(name);
      if (!this.isEditingAction()) {
        const targetMod = this.modules().find((m: SystemModuleCatalogDto) => m.id === this.actionModuleId()) ?? this.selectedModule();
        const prefix = targetMod?.slug ? `${targetMod.slug}.` : '';
        const cleanSuffix = name
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        this.actionSlug.set(`${prefix}${cleanSuffix}`);
      }
    } catch {
      return;
    }
  }

  /**
   * Saves a new or edited permission via `/api/actions`.
   */
  saveAction(): void {
    try {
      const moduleId = Number(this.actionModuleId());
      const name = this.actionName().trim();
      const slug = this.actionSlug().trim().toLowerCase();
      const httpMethod = (this.actionHttpMethod() || 'GET').trim().toUpperCase();
      const description = this.actionDescription().trim();

      if (!name || !slug) {
        this.notification.warning(
          'Datos Requeridos',
          'Por favor ingresa el nombre del permiso y su identificador interno.'
        );
        return;
      }

      if (this.isEditingAction() && this.editingActionId() !== null) {
        const actionId = this.editingActionId()!;
        const dto: UpdateSystemActionDto = {
          moduleId,
          name,
          slug,
          httpMethod,
          description,
          isActive: this.actionIsActive()
        };

        this.api.updateSystemAction(actionId, dto).subscribe({
          next: (updated: SystemActionCatalogDto) => {
            this.applyActionUpdateLocally(actionId, updated);
            this.showActionModal.set(false);
            this.notification.success(
              'Permiso Actualizado',
              `El permiso "${name}" fue actualizado correctamente.`
            );
          },
          error: () => {
            this.notification.error(
              'Error al Actualizar',
              `No se pudo actualizar el permiso "${name}".`
            );
          }
        });
      } else {
        const dto: CreateSystemActionDto = {
          moduleId,
          name,
          slug,
          httpMethod,
          description,
          isActive: this.actionIsActive()
        };

        this.api.createSystemAction(dto).subscribe({
          next: (created: SystemActionCatalogDto) => {
            this.appendActionLocally(moduleId, created);
            this.showActionModal.set(false);
            this.notification.success('Permiso Registrado', `El permiso "${name}" fue agregado a la pantalla.`);
          },
          error: () => {
            this.notification.error(
              'Error al Crear Permiso',
              `No se pudo registrar el permiso "${name}".`
            );
          }
        });
      }
    } catch {
      return;
    }
  }

  /**
   * Toggles the enabled status of a screen permission via `PUT /api/actions/{id}`.
   */
  toggleActionStatus(action: SystemActionCatalogDto): void {
    try {
      const nextActive = !action.isActive;
      const dto: UpdateSystemActionDto = {
        moduleId: action.moduleId,
        name: action.name,
        slug: action.slug,
        httpMethod: action.httpMethod || 'GET',
        description: action.description || '',
        isActive: nextActive
      };

      this.api.updateSystemAction(action.id, dto).subscribe({
        next: (updated: SystemActionCatalogDto) => {
          this.applyActionUpdateLocally(action.id, updated);
          this.notification.info(
            nextActive ? 'Permiso Habilitado' : 'Permiso Deshabilitado',
            `El permiso "${action.name}" ahora está ${nextActive ? 'habilitado' : 'deshabilitado'}.`
          );
        },
        error: () => {
          this.notification.error(
            'Error de Estado',
            `No se pudo cambiar el estado del permiso "${action.name}".`
          );
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Deletes or deactivates a screen permission via `DELETE /api/actions/{id}`.
   */
  deleteAction(action: SystemActionCatalogDto): void {
    try {
      this.api.deleteSystemAction(action.id).subscribe({
        next: () => {
          this.modules.update((list: SystemModuleCatalogDto[]) =>
            list.map((mod: SystemModuleCatalogDto) => ({
              ...mod,
              actions: (mod.actions || []).filter((a: SystemActionCatalogDto) => a.id !== action.id)
            }))
          );
          this.saveCatalogToStorage(this.modules());
          this.notification.info('Permiso Eliminado', `El permiso "${action.name}" fue eliminado.`);
        },
        error: () => {
          this.notification.error('Error al Eliminar', `No se pudo eliminar el permiso "${action.name}".`);
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Reloads the permissions of a specific screen from `GET /api/actions/by-module/{moduleId}`.
   */
  refreshModuleActions(moduleId: number): void {
    try {
      this.api.getSystemActions(moduleId).subscribe({
        next: (actions: SystemActionCatalogDto[]) => {
          this.modules.update((list: SystemModuleCatalogDto[]) =>
            list.map((mod: SystemModuleCatalogDto) =>
              mod.id === moduleId
                ? {
                    ...mod,
                    actions: (actions || []).filter(
                      (a: SystemActionCatalogDto) => !this.auth.isRemovedCalculatorActionSlug?.(a.slug)
                    )
                  }
                : mod
            )
          );
          this.saveCatalogToStorage(this.modules());
        },
        error: () => {
          this.notification.error('Error de Sincronización', 'No se pudieron recargar los permisos de la pantalla.');
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Returns a semantic badge CSS class for a given HTTP operation method.
   */
  getHttpMethodBadgeClass(method: string): string {
    try {
      switch ((method || 'GET').toUpperCase()) {
        case 'GET':
          return 'badge-info';
        case 'POST':
          return 'badge-emerald';
        case 'PUT':
          return 'badge-purple';
        case 'PATCH':
          return 'badge-warning';
        case 'DELETE':
          return 'badge-danger';
        default:
          return 'badge-subtle';
      }
    } catch {
      return 'badge-info';
    }
  }

  /**
   * Returns a short, user-friendly Spanish label for an operation type (`Consulta`, `Registro`, `Modificación`, `Eliminación`).
   */
  getOperationShortLabel(method: string): string {
    try {
      switch ((method || 'GET').toUpperCase()) {
        case 'GET':
          return 'Consulta';
        case 'POST':
          return 'Registro';
        case 'PUT':
        case 'PATCH':
          return 'Modificación';
        case 'DELETE':
          return 'Eliminación';
        default:
          return 'Consulta';
      }
    } catch {
      return 'Consulta';
    }
  }

  /**
   * Returns a full descriptive Spanish label for an operation type.
   */
  getOperationFullLabel(method: string): string {
    try {
      switch ((method || 'GET').toUpperCase()) {
        case 'GET':
          return 'Consulta y lectura';
        case 'POST':
          return 'Creación y registro';
        case 'PUT':
          return 'Edición y actualización';
        case 'PATCH':
          return 'Actualización de estado';
        case 'DELETE':
          return 'Eliminación';
        default:
          return 'Consulta y lectura';
      }
    } catch {
      return 'Consulta y lectura';
    }
  }

  /**
   * Returns a clear, human-readable description of what a permission allows the user to do.
   */
  getFriendlyActionDescription(action: SystemActionCatalogDto): string {
    try {
      const explicit = (action.description || '').trim();
      if (explicit.length > 0) {
        return explicit;
      }
      const opLabel = this.getOperationFullLabel(action.httpMethod).toLowerCase();
      return `Habilita la función "${action.name}" (${opLabel}) dentro de esta pantalla.`;
    } catch {
      return '';
    }
  }

  /**
   * Resolves a normalized SVG icon category (`grid`, `truck`, `box`, `clock`, `users`, `dollar`, `settings`, `shield`, `chart`, `globe`)
   * from the module's icon property, route, or slug.
   */
  resolveIconType(iconKey: string, route: string = '', slug: string = ''): string {
    try {
      const raw = `${iconKey || ''} ${route || ''} ${slug || ''}`.toLowerCase();
      if (raw.includes('truck') || raw.includes('order') || raw.includes('pedido') || raw.includes('despacho')) {
        return 'truck';
      }
      if (raw.includes('box') || raw.includes('package') || raw.includes('invent')) {
        return 'box';
      }
      if (raw.includes('clock') || raw.includes('shift') || raw.includes('turno')) {
        return 'clock';
      }
      if (raw.includes('user') || raw.includes('hr') || raw.includes('emplead') || raw.includes('nomina') || raw.includes('personal')) {
        return 'users';
      }
      if (raw.includes('dollar') || raw.includes('account') || raw.includes('client') || raw.includes('finanz') || raw.includes('contab')) {
        return 'dollar';
      }
      if (raw.includes('setting') || raw.includes('config') || raw.includes('gear')) {
        return 'settings';
      }
      if (raw.includes('shield') || raw.includes('secur') || raw.includes('role') || raw.includes('audit') || raw.includes('catalog')) {
        return 'shield';
      }
      if (raw.includes('chart') || raw.includes('report') || raw.includes('metric')) {
        return 'chart';
      }
      if (raw.includes('globe') || raw.includes('portal') || raw.includes('web')) {
        return 'globe';
      }
      return 'grid';
    } catch {
      return 'grid';
    }
  }

  /**
   * Updates an action inside the local `modules` signal and persists to browser storage.
   */
  private applyActionUpdateLocally(actionId: number, updated: SystemActionCatalogDto): void {
    try {
      this.modules.update((list: SystemModuleCatalogDto[]) =>
        list.map((mod: SystemModuleCatalogDto) => ({
          ...mod,
          actions: (mod.actions || []).map((a: SystemActionCatalogDto) =>
            a.id === actionId ? { ...a, ...updated } : a
          )
        }))
      );
      this.saveCatalogToStorage(this.modules());
    } catch {
      return;
    }
  }

  /**
   * Appends a newly created action to its parent module inside the `modules` signal.
   */
  private appendActionLocally(moduleId: number, created: SystemActionCatalogDto): void {
    try {
      this.modules.update((list: SystemModuleCatalogDto[]) =>
        list.map((mod: SystemModuleCatalogDto) => {
          if (mod.id === moduleId) {
            return {
              ...mod,
              actions: [...(mod.actions || []), created]
            };
          }
          return mod;
        })
      );
      this.saveCatalogToStorage(this.modules());
    } catch {
      return;
    }
  }

  /**
   * Persists the catalog to `localStorage` and synchronizes the active developer session sidebar.
   */
  private saveCatalogToStorage(catalog: SystemModuleCatalogDto[]): void {
    try {
      localStorage.setItem(STORAGE_SYSTEM_MODULES_KEY, JSON.stringify(catalog));
      if (this.auth.isSystemDeveloper()) {
        const activeNavModules: NavigationModuleDto[] = catalog
          .filter((m: SystemModuleCatalogDto) => m.isActive)
          .map((m: SystemModuleCatalogDto) => ({
            moduleId: m.id,
            name: m.name,
            slug: m.slug,
            menuSection: m.menuSection,
            frontendRoute: m.frontendRoute,
            icon: m.icon,
            displayOrder: m.displayOrder,
            allowedActionSlugs: (m.actions || [])
              .filter((a: SystemActionCatalogDto) => a.isActive)
              .map((a: SystemActionCatalogDto) => a.slug)
          }));
        this.auth.syncNavigationModules(activeNavModules);
      }
      const optionalRefresh = (
        this.auth as unknown as { refreshCurrentUserNavigationModules?: () => void }
      ).refreshCurrentUserNavigationModules;
      if (typeof optionalRefresh === 'function') {
        optionalRefresh.call(this.auth);
      }
    } catch {
      return;
    }
  }
}
