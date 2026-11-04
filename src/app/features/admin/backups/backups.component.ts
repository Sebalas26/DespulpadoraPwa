import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DatabaseBackupInfoDto } from '../../../core/models/business.models';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

/**
 * Supported sorting criteria for the database backups history table.
 */
export type BackupSortOption = 'newest' | 'oldest' | 'largest' | 'smallest';

/**
 * Executive protection status indicator displayed in the KPI summary grid.
 */
export interface BackupProtectionStatus {
  label: string;
  subtitle: string;
  isProtected: boolean;
}

/**
 * Human-readable summary of the modules and records stored inside a backup file.
 */
export interface BackupContentSummary {
  modulesText: string;
  recordsText: string;
}

/**
 * SuperAdmin Backup Center component (`/admin/backups`).
 * Provides a human-friendly executive interface to create 1-click backups, download them
 * directly to the local computer, search, sort, paginate, and manage server storage.
 */
@Component({
  selector: 'app-backups',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective],
  templateUrl: './backups.component.html',
  styles: [
    `
      :host {
        display: block;
      }

      .backups-page {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .backups-hero {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1.25rem;
        flex-wrap: wrap;
        background: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle, #eef2ef);
        border-radius: var(--radius-md, 16px);
        padding: 1.5rem 1.75rem;
        box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.04));
      }

      .backups-hero-content {
        max-width: 720px;
      }

      .backups-badges {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex-wrap: wrap;
        margin-bottom: 0.65rem;
      }

      .backups-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.3rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.01em;
      }

      .backups-pill-primary {
        background: var(--color-primary-light, #eaf5ee);
        color: var(--color-primary, #1e5e3a);
        border: 1px solid var(--color-primary-border, #d1e7d8);
      }

      .backups-pill-emerald {
        background: rgba(37, 99, 235, 0.08);
        color: #1d4ed8;
        border: 1px solid rgba(37, 99, 235, 0.18);
      }

      .backups-title {
        margin: 0;
        font-size: 1.65rem;
        font-weight: 800;
        color: var(--text-main, #111827);
        letter-spacing: -0.01em;
      }

      .backups-subtitle {
        margin: 0.4rem 0 0;
        font-size: 0.94rem;
        line-height: 1.5;
        color: var(--text-muted, #6b7280);
      }

      .backups-hero-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .backups-btn-secondary,
      .backups-btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0.65rem 1.15rem;
        border-radius: 10px;
        font-size: 0.88rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.18s ease;
      }

      .backups-icon {
        flex-shrink: 0;
      }

      @keyframes backupsSpinAnimation {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .backups-spin {
        animation: backupsSpinAnimation 0.9s linear infinite;
      }

      .backups-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(235px, 1fr));
        gap: 1rem;
      }

      .backups-kpi-card {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        background: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle, #eef2ef);
        border-radius: var(--radius-md, 16px);
        padding: 1.25rem;
        box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.04));
      }

      .backups-kpi-icon {
        width: 46px;
        height: 46px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .backups-kpi-icon-green {
        background: #eaf5ee;
        color: #1e5e3a;
      }

      .backups-kpi-icon-blue {
        background: #eff6ff;
        color: #2563eb;
      }

      .backups-kpi-icon-purple {
        background: #f5f3ff;
        color: #6d28d9;
      }

      .backups-kpi-icon-amber {
        background: #fffbeb;
        color: #d97706;
      }

      .backups-kpi-body {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .backups-kpi-label {
        font-size: 0.78rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--text-muted, #6b7280);
      }

      .backups-kpi-value {
        font-size: 1.35rem;
        font-weight: 800;
        color: var(--text-main, #111827);
        margin-top: 0.25rem;
        line-height: 1.25;
      }

      .backups-kpi-value-md {
        font-size: 1.08rem;
      }

      .backups-kpi-caption {
        font-size: 0.8rem;
        color: var(--text-muted, #6b7280);
        margin-top: 0.2rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .backups-text-success {
        color: #1e5e3a;
      }

      .backups-text-warning {
        color: #d97706;
      }

      .backups-table-card {
        background: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle, #eef2ef);
        border-radius: var(--radius-md, 16px);
        padding: 0;
        overflow: hidden;
        box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.04));
      }

      .backups-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border-subtle, #eef2ef);
      }

      .backups-section-title {
        margin: 0;
        font-size: 1.12rem;
        font-weight: 800;
        color: var(--text-main, #111827);
      }

      .backups-section-subtitle {
        margin: 0.2rem 0 0;
        font-size: 0.85rem;
        color: var(--text-muted, #6b7280);
      }

      .backups-toolbar-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .backups-search-box {
        position: relative;
        display: inline-flex;
        align-items: center;
        min-width: 260px;
      }

      .backups-search-icon {
        position: absolute;
        left: 0.75rem;
        color: var(--text-muted, #6b7280);
        pointer-events: none;
      }

      .backups-search-input {
        width: 100%;
        padding: 0.55rem 2.1rem 0.55rem 2.25rem;
        border: 1px solid var(--border-highlight, #e2e8f0);
        border-radius: 10px;
        background: var(--bg-input, #ffffff);
        color: var(--text-main, #111827);
        font-size: 0.86rem;
        outline: none;
        transition: border-color 0.15s ease;
      }

      .backups-search-input:focus {
        border-color: var(--color-primary, #1e5e3a);
      }

      .backups-search-clear {
        position: absolute;
        right: 0.5rem;
        background: transparent;
        border: none;
        color: var(--text-muted, #6b7280);
        cursor: pointer;
        padding: 0.25rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
      }

      .backups-select-group {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
      }

      .backups-select-label {
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--text-muted, #6b7280);
      }

      .backups-select {
        padding: 0.52rem 0.75rem;
        border: 1px solid var(--border-highlight, #e2e8f0);
        border-radius: 10px;
        background: var(--bg-input, #ffffff);
        color: var(--text-main, #111827);
        font-size: 0.84rem;
        font-weight: 600;
        outline: none;
        cursor: pointer;
      }

      .backups-table-wrapper {
        overflow-x: auto;
      }

      .backups-table {
        width: 100%;
        border-collapse: collapse;
      }

      .backups-table th {
        padding: 0.85rem 1.25rem;
        font-size: 0.76rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted, #6b7280);
        background: var(--bg-table-th, #f9fafb);
        border-bottom: 1px solid var(--border-subtle, #eef2ef);
        text-align: left;
      }

      .backups-table td {
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--border-subtle, #eef2ef);
        vertical-align: middle;
      }

      .backups-file-cell {
        display: flex;
        align-items: center;
        gap: 0.85rem;
      }

      .backups-file-badge {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: var(--color-primary-light, #eaf5ee);
        color: var(--color-primary, #1e5e3a);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .backups-file-info {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .backups-file-title {
        font-size: 0.92rem;
        font-weight: 700;
        color: var(--text-main, #111827);
      }

      .backups-file-name {
        font-size: 0.78rem;
        color: var(--text-muted, #6b7280);
        font-family: monospace;
        margin-top: 0.15rem;
      }

      .backups-content-cell {
        display: flex;
        flex-direction: column;
      }

      .backups-content-primary {
        font-size: 0.88rem;
        font-weight: 700;
        color: var(--text-main, #111827);
      }

      .backups-content-secondary {
        font-size: 0.79rem;
        color: var(--text-muted, #6b7280);
        margin-top: 0.15rem;
      }

      .backups-size-pill {
        display: inline-flex;
        align-items: center;
        padding: 0.3rem 0.7rem;
        border-radius: 9999px;
        background: var(--bg-subtle, #f8faf8);
        border: 1px solid var(--border-highlight, #e2e8f0);
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--text-main, #111827);
      }

      .backups-date-cell {
        display: flex;
        flex-direction: column;
      }

      .backups-date-primary {
        font-size: 0.88rem;
        font-weight: 600;
        color: var(--text-main, #111827);
      }

      .backups-date-secondary {
        font-size: 0.77rem;
        color: var(--text-muted, #6b7280);
        margin-top: 0.12rem;
      }

      .backups-author-cell {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
      }

      .backups-author-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--color-primary-light, #eaf5ee);
        color: var(--color-primary, #1e5e3a);
        font-size: 0.73rem;
        font-weight: 800;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .backups-author-name {
        font-size: 0.86rem;
        font-weight: 600;
        color: var(--text-main, #111827);
      }

      .backups-row-actions {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        justify-content: flex-end;
      }

      .backups-action-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.45rem 0.85rem;
        border-radius: 8px;
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .backups-action-download {
        background: var(--color-primary-light, #eaf5ee);
        color: var(--color-primary, #1e5e3a);
        border: 1px solid var(--color-primary-border, #d1e7d8);
      }

      .backups-action-download:hover:not(:disabled) {
        background: var(--color-primary, #1e5e3a);
        color: #ffffff;
      }

      .backups-action-delete {
        background: rgba(220, 38, 38, 0.06);
        color: #dc2626;
        border: 1px solid rgba(220, 38, 38, 0.22);
      }

      .backups-action-delete:hover:not(:disabled) {
        background: #dc2626;
        color: #ffffff;
      }

      .backups-action-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .backups-empty-state {
        padding: 3rem 1.5rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
      }

      .backups-empty-icon {
        width: 60px;
        height: 60px;
        border-radius: 16px;
        background: var(--color-primary-light, #eaf5ee);
        color: var(--color-primary, #1e5e3a);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .backups-empty-icon-muted {
        background: var(--bg-subtle, #f8faf8);
        color: var(--text-muted, #6b7280);
      }

      .backups-empty-title {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--text-main, #111827);
      }

      .backups-empty-text {
        margin: 0;
        max-width: 480px;
        font-size: 0.9rem;
        line-height: 1.5;
        color: var(--text-muted, #6b7280);
      }

      .backups-pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
        padding: 1rem 1.5rem;
        background: var(--bg-subtle, #f8faf8);
      }

      .backups-pagination-summary {
        font-size: 0.85rem;
        color: var(--text-muted, #6b7280);
      }

      .backups-pagination-controls {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
      }

      .backups-page-btn,
      .backups-page-number {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.42rem 0.75rem;
        border-radius: 8px;
        border: 1px solid var(--border-highlight, #e2e8f0);
        background: var(--bg-card, #ffffff);
        color: var(--text-main, #111827);
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
      }

      .backups-page-number-active {
        background: var(--color-primary, #1e5e3a);
        color: #ffffff;
        border-color: var(--color-primary, #1e5e3a);
      }

      .backups-page-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .backups-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        z-index: 1100;
      }

      .backups-modal-card {
        width: 100%;
        max-width: 460px;
        background: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle, #eef2ef);
        border-radius: 18px;
        padding: 1.5rem;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.18);
      }

      .backups-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
      }

      .backups-modal-icon-danger {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: rgba(220, 38, 38, 0.1);
        color: #dc2626;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .backups-modal-close {
        background: transparent;
        border: none;
        color: var(--text-muted, #6b7280);
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 8px;
      }

      .backups-modal-title {
        margin: 0 0 0.5rem;
        font-size: 1.18rem;
        font-weight: 800;
        color: var(--text-main, #111827);
      }

      .backups-modal-description {
        margin: 0 0 1rem;
        font-size: 0.9rem;
        line-height: 1.5;
        color: var(--text-muted, #6b7280);
      }

      .backups-modal-summary {
        background: var(--bg-subtle, #f8faf8);
        border: 1px solid var(--border-subtle, #eef2ef);
        border-radius: 12px;
        padding: 0.85rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        margin-bottom: 1.25rem;
      }

      .backups-modal-summary-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.82rem;
        color: var(--text-muted, #6b7280);
      }

      .backups-modal-summary-row strong {
        color: var(--text-main, #111827);
        word-break: break-all;
        text-align: right;
      }

      .backups-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
      }

      .backups-btn-danger {
        background: #dc2626;
        color: #ffffff;
        border: 1px solid #dc2626;
        padding: 0.6rem 1.15rem;
        border-radius: 10px;
        font-size: 0.88rem;
        font-weight: 700;
        cursor: pointer;
      }

      .backups-btn-danger:hover:not(:disabled) {
        background: #b91c1c;
      }
    `
  ]
})
export class BackupsComponent implements OnInit {
  /**
   * Central HTTP API service used to query, create, download, and delete backups.
   */
  private readonly api = inject(ApiService);

  /**
   * Authentication and permission evaluation service.
   */
  readonly auth = inject(AuthService);

  /**
   * User toast notification service.
   */
  private readonly notification = inject(NotificationService);

  /**
   * Complete list of backups stored on the server.
   */
  readonly backups = signal<DatabaseBackupInfoDto[]>([]);

  /**
   * Indicates whether the backups list is currently being fetched.
   */
  readonly isLoading = signal<boolean>(false);

  /**
   * Indicates whether a new backup is currently being created.
   */
  readonly isGenerating = signal<boolean>(false);

  /**
   * Tracks the file name currently being downloaded to the user's computer.
   */
  readonly downloadingFileName = signal<string | null>(null);

  /**
   * Tracks the file name currently being deleted from the server.
   */
  readonly deletingFileName = signal<string | null>(null);

  /**
   * Real-time search query entered by the user in the table toolbar.
   */
  readonly searchQuery = signal<string>('');

  /**
   * Active sorting option for the backups table.
   */
  readonly sortBy = signal<BackupSortOption>('newest');

  /**
   * Current 1-based page index in the backups table pagination.
   */
  readonly currentPage = signal<number>(1);

  /**
   * Number of backup records displayed per page.
   */
  readonly pageSize = signal<number>(10);

  /**
   * Available page-size options for the pagination toolbar selector.
   */
  readonly pageSizeOptions: readonly number[] = [5, 10, 20];

  /**
   * Holds the backup record awaiting deletion confirmation in the custom modal.
   */
  readonly backupPendingDelete = signal<DatabaseBackupInfoDto | null>(null);

  /**
   * Total count of backups stored on the server.
   */
  readonly totalBackupsCount = computed<number>(() => {
    try {
      return this.backups().length;
    } catch {
      return 0;
    }
  });

  /**
   * Human-friendly singular or plural label for the total count of stored backups.
   */
  readonly totalBackupsLabel = computed<string>(() => {
    try {
      const count = this.totalBackupsCount();
      if (count === 1) {
        return '1 copia disponible';
      }
      return `${count} copias disponibles`;
    } catch {
      return '0 copias disponibles';
    }
  });

  /**
   * Total storage space consumed by all backups formatted in human-readable units.
   */
  readonly totalStorageFormatted = computed<string>(() => {
    try {
      const totalBytes = this.backups().reduce((acc, item) => acc + (item.sizeBytes || 0), 0);
      if (totalBytes <= 0) {
        return '0 KB';
      }
      if (totalBytes < 1024) {
        return `${totalBytes} B`;
      }
      if (totalBytes < 1024 * 1024) {
        return `${(totalBytes / 1024).toFixed(2)} KB`;
      }
      if (totalBytes < 1024 * 1024 * 1024) {
        return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
      }
      return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } catch {
      return '0 KB';
    }
  });

  /**
   * Most recent backup available on the server, sorted by creation date.
   */
  readonly latestBackup = computed<DatabaseBackupInfoDto | null>(() => {
    try {
      const list = [...this.backups()];
      if (list.length === 0) {
        return null;
      }
      list.sort(
        (a, b) => new Date(b.createdAtUtc || '').getTime() - new Date(a.createdAtUtc || '').getTime()
      );
      return list[0] ?? null;
    } catch {
      return null;
    }
  });

  /**
   * Executive protection indicator summarizing whether the system has available backups.
   */
  readonly protectionStatus = computed<BackupProtectionStatus>(() => {
    try {
      if (this.totalBackupsCount() > 0) {
        return {
          label: 'Protección al día',
          subtitle: 'Información respaldada y disponible',
          isProtected: true
        };
      }
      return {
        label: 'Se recomienda crear respaldo',
        subtitle: 'Crea tu primera copia de seguridad',
        isProtected: false
      };
    } catch {
      return {
        label: 'Se recomienda crear respaldo',
        subtitle: 'Crea tu primera copia de seguridad',
        isProtected: false
      };
    }
  });

  /**
   * Backups list filtered by `searchQuery` and ordered according to `sortBy`.
   */
  readonly filteredBackups = computed<DatabaseBackupInfoDto[]>(() => {
    try {
      const query = this.searchQuery().trim().toLowerCase();
      const sortOption = this.sortBy();
      const rawList = this.backups();

      const matching = rawList.filter((item: DatabaseBackupInfoDto) => {
        if (!query) {
          return true;
        }
        const friendlyTitle = this.getBackupFriendlyTitle(item).toLowerCase();
        const friendlyDate = this.formatFriendlyDate(item.createdAtUtc).toLowerCase();
        const fileName = (item.fileName || '').toLowerCase();
        const author = (item.createdByUsername || '').toLowerCase();
        const sizeText = (item.sizeFormatted || '').toLowerCase();
        return (
          friendlyTitle.includes(query) ||
          friendlyDate.includes(query) ||
          fileName.includes(query) ||
          author.includes(query) ||
          sizeText.includes(query)
        );
      });

      return [...matching].sort((a: DatabaseBackupInfoDto, b: DatabaseBackupInfoDto) => {
        if (sortOption === 'largest') {
          return (b.sizeBytes || 0) - (a.sizeBytes || 0);
        }
        if (sortOption === 'smallest') {
          return (a.sizeBytes || 0) - (b.sizeBytes || 0);
        }
        const timeA = new Date(a.createdAtUtc || '').getTime() || 0;
        const timeB = new Date(b.createdAtUtc || '').getTime() || 0;
        if (sortOption === 'oldest') {
          return timeA - timeB;
        }
        return timeB - timeA;
      });
    } catch {
      return [];
    }
  });

  /**
   * Total number of pages available for the current filtered backups list.
   */
  readonly totalPages = computed<number>(() => {
    try {
      const count = this.filteredBackups().length;
      const size = Math.max(1, this.pageSize());
      return Math.max(1, Math.ceil(count / size));
    } catch {
      return 1;
    }
  });

  /**
   * Current page clamped safely within `[1, totalPages]`.
   */
  readonly safeCurrentPage = computed<number>(() => {
    try {
      const page = this.currentPage();
      const maxPage = this.totalPages();
      if (page < 1) {
        return 1;
      }
      if (page > maxPage) {
        return maxPage;
      }
      return page;
    } catch {
      return 1;
    }
  });

  /**
   * Slice of filtered backups corresponding to the active pagination page.
   */
  readonly paginatedBackups = computed<DatabaseBackupInfoDto[]>(() => {
    try {
      const list = this.filteredBackups();
      const size = Math.max(1, this.pageSize());
      const start = (this.safeCurrentPage() - 1) * size;
      return list.slice(start, start + size);
    } catch {
      return [];
    }
  });

  /**
   * 1-based start record number shown in the pagination summary footer.
   */
  readonly paginationStartIndex = computed<number>(() => {
    try {
      const total = this.filteredBackups().length;
      if (total === 0) {
        return 0;
      }
      return (this.safeCurrentPage() - 1) * Math.max(1, this.pageSize()) + 1;
    } catch {
      return 0;
    }
  });

  /**
   * 1-based end record number shown in the pagination summary footer.
   */
  readonly paginationEndIndex = computed<number>(() => {
    try {
      const total = this.filteredBackups().length;
      if (total === 0) {
        return 0;
      }
      return Math.min(total, this.safeCurrentPage() * Math.max(1, this.pageSize()));
    } catch {
      return 0;
    }
  });

  /**
   * Visible page numbers rendered as buttons in the pagination bar.
   */
  readonly visiblePageNumbers = computed<number[]>(() => {
    try {
      const total = this.totalPages();
      const current = this.safeCurrentPage();
      const maxButtons = 5;
      let start = Math.max(1, current - Math.floor(maxButtons / 2));
      const end = Math.min(total, start + maxButtons - 1);
      start = Math.max(1, end - maxButtons + 1);

      const pages: number[] = [];
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    } catch {
      return [1];
    }
  });

  /**
   * Initializes the component and loads existing backups from the server.
   */
  ngOnInit(): void {
    try {
      this.loadBackups();
    } catch {
      this.isLoading.set(false);
    }
  }

  /**
   * Loads all backups stored on the server via `GET /api/database-backups`.
   */
  loadBackups(): void {
    try {
      this.isLoading.set(true);
      this.api.getDatabaseBackups().subscribe({
        next: (items: DatabaseBackupInfoDto[]) => {
          this.backups.set(items || []);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notification.error(
            'No se pudo actualizar el historial',
            'En este momento no fue posible consultar las copias de seguridad guardadas en el servidor.'
          );
        }
      });
    } catch {
      this.isLoading.set(false);
    }
  }

  /**
   * Executes a 1-click database backup: creates and stores the backup on the server
   * and immediately downloads it to the user's computer.
   */
  generateAndDownloadOneClickBackup(): void {
    try {
      if (this.isGenerating()) {
        return;
      }

      this.isGenerating.set(true);
      this.api.createDatabaseBackup().subscribe({
        next: (created: DatabaseBackupInfoDto) => {
          this.isGenerating.set(false);
          this.backups.update(prev => [
            created,
            ...prev.filter(item => item.fileName !== created.fileName)
          ]);
          this.currentPage.set(1);
          this.notification.success(
            'Copia de seguridad creada',
            `Tu respaldo (${created.sizeFormatted}) se guardó en el servidor y su descarga a tu computador ha comenzado.`
          );
          this.downloadBackupToComputer(created.fileName);
        },
        error: () => {
          this.isGenerating.set(false);
          this.notification.error(
            'No se pudo crear la copia de seguridad',
            'Ocurrió un inconveniente al generar el respaldo en el servidor. Intenta nuevamente.'
          );
        }
      });
    } catch {
      this.isGenerating.set(false);
    }
  }

  /**
   * Downloads a backup file from the server directly to the local computer.
   */
  downloadBackupToComputer(fileName: string): void {
    try {
      if (!fileName) {
        return;
      }

      this.downloadingFileName.set(fileName);
      this.api.downloadDatabaseBackup(fileName).subscribe({
        next: (blob: Blob) => {
          this.downloadingFileName.set(null);
          this.triggerBrowserFileDownload(blob, fileName);
        },
        error: () => {
          this.downloadingFileName.set(null);
          this.notification.error(
            'No se pudo descargar la copia',
            `No fue posible descargar el respaldo seleccionado (${fileName}) a tu computador.`
          );
        }
      });
    } catch {
      this.downloadingFileName.set(null);
    }
  }

  /**
   * Opens the confirmation modal prior to deleting a backup from the server.
   */
  requestDeleteBackup(backup: DatabaseBackupInfoDto): void {
    try {
      if (!backup || this.deletingFileName()) {
        return;
      }
      this.backupPendingDelete.set(backup);
    } catch {
      return;
    }
  }

  /**
   * Closes the delete confirmation modal without deleting the backup.
   */
  cancelDeleteBackup(): void {
    try {
      this.backupPendingDelete.set(null);
    } catch {
      return;
    }
  }

  /**
   * Confirms deletion of the currently selected backup in the confirmation modal.
   */
  confirmDeleteBackup(): void {
    try {
      const pending = this.backupPendingDelete();
      if (!pending) {
        return;
      }
      this.deleteBackupFromServer(pending.fileName);
    } catch {
      return;
    }
  }

  /**
   * Permanently deletes a backup file from the server storage.
   */
  deleteBackupFromServer(fileName: string): void {
    try {
      if (!fileName || this.deletingFileName()) {
        return;
      }

      this.deletingFileName.set(fileName);
      this.api.deleteDatabaseBackup(fileName).subscribe({
        next: () => {
          this.deletingFileName.set(null);
          this.backupPendingDelete.set(null);
          this.backups.update(list => list.filter(item => item.fileName !== fileName));
          if (this.currentPage() > this.totalPages()) {
            this.currentPage.set(this.totalPages());
          }
          this.notification.info(
            'Copia de seguridad eliminada',
            'El respaldo seleccionado fue retirado del almacenamiento del servidor correctamente.'
          );
        },
        error: () => {
          this.deletingFileName.set(null);
          this.notification.error(
            'No se pudo eliminar la copia',
            'Ocurrió un inconveniente al intentar retirar el respaldo del servidor.'
          );
        }
      });
    } catch {
      this.deletingFileName.set(null);
    }
  }

  /**
   * Updates the search query and resets pagination to the first page.
   */
  onSearchChange(query: string): void {
    try {
      this.searchQuery.set(query ?? '');
      this.currentPage.set(1);
    } catch {
      return;
    }
  }

  /**
   * Clears the active search filter and resets pagination to the first page.
   */
  clearSearch(): void {
    try {
      this.searchQuery.set('');
      this.currentPage.set(1);
    } catch {
      return;
    }
  }

  /**
   * Updates the active sorting criteria and resets pagination to the first page.
   */
  onSortChange(sortOption: BackupSortOption): void {
    try {
      this.sortBy.set(sortOption || 'newest');
      this.currentPage.set(1);
    } catch {
      return;
    }
  }

  /**
   * Updates the number of items displayed per page and resets to the first page.
   */
  onPageSizeChange(size: number | string): void {
    try {
      const parsed = Number(size);
      if (!Number.isNaN(parsed) && parsed > 0) {
        this.pageSize.set(parsed);
        this.currentPage.set(1);
      }
    } catch {
      return;
    }
  }

  /**
   * Navigates directly to a specific page number within valid bounds.
   */
  goToPage(page: number): void {
    try {
      const max = this.totalPages();
      const target = Math.min(Math.max(1, page), max);
      this.currentPage.set(target);
    } catch {
      return;
    }
  }

  /**
   * Navigates to the previous page in the pagination bar if available.
   */
  previousPage(): void {
    try {
      if (this.safeCurrentPage() > 1) {
        this.currentPage.set(this.safeCurrentPage() - 1);
      }
    } catch {
      return;
    }
  }

  /**
   * Navigates to the next page in the pagination bar if available.
   */
  nextPage(): void {
    try {
      if (this.safeCurrentPage() < this.totalPages()) {
        this.currentPage.set(this.safeCurrentPage() + 1);
      }
    } catch {
      return;
    }
  }

  /**
   * Builds a human-friendly title for a backup record based on its creation date.
   */
  getBackupFriendlyTitle(backup: DatabaseBackupInfoDto): string {
    try {
      if (!backup?.createdAtUtc) {
        return 'Respaldo general del sistema';
      }
      const parsed = new Date(backup.createdAtUtc);
      if (Number.isNaN(parsed.getTime())) {
        return 'Respaldo general del sistema';
      }
      const formattedDay = new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(parsed);
      return `Respaldo del ${formattedDay}`;
    } catch {
      return 'Respaldo general del sistema';
    }
  }

  /**
   * Formats the module and record counts of a backup into non-technical business terms.
   */
  getBackupContentSummary(backup: DatabaseBackupInfoDto): BackupContentSummary {
    try {
      const tables = backup?.tablesCount ?? 0;
      const rows = backup?.totalRowsCount ?? 0;

      const modulesText =
        tables > 0
          ? tables === 1
            ? '1 módulo de datos'
            : `${tables} módulos de datos`
          : 'Sistema completo';

      const recordsText =
        rows > 0
          ? rows === 1
            ? '1 registro guardado'
            : `${rows.toLocaleString('es-CO')} registros guardados`
          : 'Estructura completa del sistema';

      return { modulesText, recordsText };
    } catch {
      return {
        modulesText: 'Sistema completo',
        recordsText: 'Estructura completa del sistema'
      };
    }
  }

  /**
   * Formats an ISO UTC timestamp into a friendly local Spanish date and time string.
   */
  formatFriendlyDate(isoDate: string): string {
    try {
      if (!isoDate) {
        return 'Fecha no disponible';
      }
      const parsed = new Date(isoDate);
      if (Number.isNaN(parsed.getTime())) {
        return isoDate;
      }
      return new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(parsed);
    } catch {
      return isoDate || 'Fecha no disponible';
    }
  }

  /**
   * Returns a human-friendly relative time description or backup status label.
   */
  formatRelativeTime(isoDate: string): string {
    try {
      if (!isoDate) {
        return 'Copia verificada';
      }
      const parsed = new Date(isoDate);
      if (Number.isNaN(parsed.getTime())) {
        return 'Copia verificada';
      }
      const diffMs = Date.now() - parsed.getTime();
      if (diffMs < 0) {
        return 'Copia reciente';
      }
      const diffMinutes = Math.floor(diffMs / 60000);
      if (diffMinutes < 1) {
        return 'Hace unos segundos';
      }
      if (diffMinutes < 60) {
        return diffMinutes === 1 ? 'Hace 1 minuto' : `Hace ${diffMinutes} minutos`;
      }
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) {
        return diffHours === 1 ? 'Hace 1 hora' : `Hace ${diffHours} horas`;
      }
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) {
        return diffDays === 1 ? 'Hace 1 día' : `Hace ${diffDays} días`;
      }
      return 'Guardado en el servidor';
    } catch {
      return 'Copia verificada';
    }
  }

  /**
   * Extracts up to two uppercase initials from a username for the author avatar badge.
   */
  getUserInitials(username: string): string {
    try {
      const cleaned = (username || '').trim();
      if (!cleaned) {
        return 'US';
      }
      const parts = cleaned.split(/[\s._-]+/).filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return cleaned.slice(0, 2).toUpperCase();
    } catch {
      return 'US';
    }
  }

  /**
   * Triggers a native browser file download for a binary `.sql` Blob.
   */
  triggerBrowserFileDownload(blob: Blob, fileName: string): void {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
      }
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName.endsWith('.sql') ? fileName : `${fileName}.sql`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      return;
    }
  }
}
