import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NavigationModuleDto } from '../../core/models/auth.models';

/**
 * Intelligent fallback view rendered when a new dynamic module has been registered
 * in the database (`Modules` table) and authorized in `navigationModules`,
 * but its dedicated Angular feature component has not yet been coded.
 */
@Component({
  selector: 'app-dynamic-module-placeholder',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      @if (matchedModule(); as mod) {
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 16px;">
          <div>
            <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span class="badge badge-emerald">{{ mod.menuSection }}</span>
              <span class="badge badge-info">Orden #{{ mod.displayOrder }}</span>
              <span class="badge badge-warning">Módulo Registrado en Sistema (Pendiente de Implementación de Vista)</span>
            </div>
            <h1 style="font-size: 1.85rem; font-weight: 800; margin-bottom: 6px; color: var(--text-main);">
              {{ mod.name }}
            </h1>
            <p style="color: var(--text-muted); font-size: 0.92rem; margin: 0;">
              Este módulo ya existe en el catálogo maestro de base de datos (MySQL) y se encuentra autorizado para tu rol en el menú dinámico.
            </p>
          </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            @if (authService.isSystemDeveloper()) {
              <a routerLink="/admin/catalog" class="btn btn-primary" style="text-decoration: none; gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
                  <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
                  <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
                  <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
                </svg>
                <span>Ir al Catálogo Maestro</span>
              </a>
            }
            <a routerLink="/dashboard" class="btn btn-outline" style="text-decoration: none;">
              Volver al Panel General
            </a>
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="justify-content: space-between;">
            <h3 class="card-title">Metadatos de Configuración Server-Driven UI</h3>
            <span class="badge badge-purple">ID #{{ mod.moduleId }}</span>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
              <div style="padding: 14px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); background: rgba(16, 185, 129, 0.04);">
                <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Nombre del Módulo (Name)</div>
                <div style="font-size: 1rem; font-weight: 800; color: var(--text-main); margin-top: 4px;">{{ mod.name }}</div>
              </div>

              <div style="padding: 14px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
                <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Identificador Único (Slug)</div>
                <div style="font-size: 0.95rem; font-weight: 700; font-family: monospace; color: var(--color-primary); margin-top: 4px;">{{ mod.slug }}</div>
              </div>

              <div style="padding: 14px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
                <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Carpeta / Sección (MenuSection)</div>
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin-top: 4px;">{{ mod.menuSection }}</div>
              </div>

              <div style="padding: 14px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
                <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Ruta en Angular (FrontendRoute)</div>
                <div style="font-size: 0.95rem; font-weight: 700; font-family: monospace; color: var(--text-main); margin-top: 4px;">{{ mod.frontendRoute }}</div>
              </div>

              <div style="padding: 14px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
                <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Ícono Configurado (Icon)</div>
                <div style="font-size: 0.95rem; font-weight: 700; font-family: monospace; color: var(--text-main); margin-top: 4px;">{{ mod.icon || 'grid' }}</div>
              </div>

              <div style="padding: 14px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
                <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Orden de Visualización (DisplayOrder)</div>
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin-top: 4px;">{{ mod.displayOrder }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="justify-content: space-between;">
            <h3 class="card-title">Acciones Autorizadas en este Módulo (AllowedActionSlugs)</h3>
            <span class="badge badge-emerald">{{ mod.allowedActionSlugs.length }} acciones habilitadas</span>
          </div>
          <div class="card-body">
            @if (mod.allowedActionSlugs.length > 0) {
              <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                @for (actionSlug of mod.allowedActionSlugs; track actionSlug) {
                  <span class="badge badge-info" style="font-family: monospace; font-size: 0.82rem; padding: 6px 12px;">
                    {{ actionSlug }}
                  </span>
                }
              </div>
            } @else {
              <p style="color: var(--text-muted); margin: 0; font-size: 0.88rem;">
                Este módulo no tiene acciones granulares asignadas actualmente para tu rol.
              </p>
            }
          </div>
        </div>
      } @else {
        <div class="card">
          <div class="card-body" style="padding: 36px; text-align: center;">
            <span class="badge badge-warning" style="margin-bottom: 12px;">Ruta No Vinculada</span>
            <h2 style="font-size: 1.45rem; font-weight: 800; margin-bottom: 8px;">
              Módulo Registrado en Sistema (Pendiente de Implementación de Vista)
            </h2>
            <p style="color: var(--text-muted); max-width: 560px; margin: 0 auto 20px auto; font-size: 0.92rem;">
              La ruta solicitada (<code>{{ currentUrl() }}</code>) aún no cuenta con un componente de vista dedicado o no está asignada en tu árbol de navegación actual.
            </p>
            <a routerLink="/dashboard" class="btn btn-primary" style="text-decoration: none;">
              Ir al Panel General
            </a>
          </div>
        </div>
      }
    </div>
  `
})
export class DynamicModulePlaceholderComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUrl = computed<string>(() => {
    try {
      return this.router.url || '/';
    } catch {
      return '/';
    }
  });

  readonly matchedModule = computed<NavigationModuleDto | null>(() => {
    try {
      return this.authService.findNavigationModuleByRoute(this.currentUrl());
    } catch {
      return null;
    }
  });
}

