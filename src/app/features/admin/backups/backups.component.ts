import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DatabaseBackupInfoDto } from '../../../core/models/business.models';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

/**
 * SuperAdmin One-Click Database Backup manager (`/admin/backups`).
 * Generates physical `.sql` backups on the server (`/app/Backups`), triggers immediate browser download
 * to the local computer, and manages indefinite server retention until manual deletion.
 */
@Component({
  selector: 'app-backups',
  standalone: true,
  imports: [CommonModule, HasPermissionDirective],
  templateUrl: './backups.component.html'
})
export class BackupsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly backups = signal<DatabaseBackupInfoDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isGenerating = signal<boolean>(false);
  readonly downloadingFileName = signal<string | null>(null);
  readonly deletingFileName = signal<string | null>(null);

  readonly totalBackupsCount = computed<number>(() => this.backups().length);
  readonly totalStorageFormatted = computed<string>(() => {
    try {
      const totalBytes = this.backups().reduce((acc, item) => acc + (item.sizeBytes || 0), 0);
      if (totalBytes < 1024) {
        return `${totalBytes} B`;
      }
      if (totalBytes < 1024 * 1024) {
        return `${(totalBytes / 1024).toFixed(2)} KB`;
      }
      return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
    } catch {
      return '0 KB';
    }
  });

  readonly latestBackup = computed<DatabaseBackupInfoDto | null>(() => {
    try {
      const list = this.backups();
      return list.length > 0 ? list[0] : null;
    } catch {
      return null;
    }
  });

  /**
   * Initializes the component and loads existing `.sql` backups from the server.
   */
  ngOnInit(): void {
    try {
      this.loadBackups();
    } catch {
      this.isLoading.set(false);
    }
  }

  /**
   * Loads all `.sql` backups stored on the server via `GET /api/database-backups`.
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
            'Error al consultar copias',
            'No se pudo obtener el listado de copias de seguridad alojadas en el servidor.'
          );
        }
      });
    } catch {
      this.isLoading.set(false);
    }
  }

  /**
   * Executes a 1-click database backup: generates and stores the `.sql` file on the server
   * and immediately downloads it to the local computer.
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
          this.notification.success(
            'Copia de Seguridad Generada (.SQL)',
            `Archivo ${created.fileName} (${created.sizeFormatted}) guardado en el servidor. Iniciando descarga al PC...`
          );
          this.downloadBackupToComputer(created.fileName);
        },
        error: () => {
          this.isGenerating.set(false);
          this.notification.error(
            'Error al generar copia .SQL',
            'No fue posible generar el respaldo de la base de datos en el servidor.'
          );
        }
      });
    } catch {
      this.isGenerating.set(false);
    }
  }

  /**
   * Downloads a `.sql` backup file from the server directly to the local computer.
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
            'Error en descarga',
            `No se pudo descargar el archivo ${fileName} desde el servidor.`
          );
        }
      });
    } catch {
      this.downloadingFileName.set(null);
    }
  }

  /**
   * Permanently deletes a `.sql` backup file from the server storage upon SuperAdmin confirmation.
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
          this.backups.update(list => list.filter(item => item.fileName !== fileName));
          this.notification.info(
            'Copia Eliminada del Servidor',
            `El respaldo ${fileName} fue eliminado del almacenamiento del servidor.`
          );
        },
        error: () => {
          this.deletingFileName.set(null);
          this.notification.error(
            'Error al eliminar copia',
            `No fue posible eliminar el archivo ${fileName} del servidor.`
          );
        }
      });
    } catch {
      this.deletingFileName.set(null);
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

