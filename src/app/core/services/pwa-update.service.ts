import { ApplicationRef, Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { catchError, concat, filter, first, interval, of } from 'rxjs';
import { NotificationService } from './notification.service';

/**
 * Service that monitors Angular Service Worker updates and activates new PWA versions.
 */
@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly appRef = inject(ApplicationRef);
  private readonly notification = inject(NotificationService);

  /**
   * Initializes periodic Service Worker update polling and version activation listeners.
   */
  init(): void {
    try {
      if (!this.swUpdate.isEnabled) {
        return;
      }

      const appIsStable$ = this.appRef.isStable.pipe(first((isStable: boolean) => isStable === true));
      const everyThirtyMinutes$ = interval(30 * 60 * 1000);
      concat(appIsStable$, everyThirtyMinutes$)
        .pipe(catchError(() => of(0)))
        .subscribe(() => {
          this.swUpdate.checkForUpdate().catch(() => {});
        });

      this.swUpdate.versionUpdates
        .pipe(
          filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
          catchError(() => of())
        )
        .subscribe(async () => {
          try {
            this.notification.info(
              'Actualizando aplicación',
              'Se detectó una nueva versión de la aplicación. Aplicando cambios...'
            );
            await this.swUpdate.activateUpdate();
            setTimeout(() => this.reloadPage(), 1200);
          } catch {
            return;
          }
        });

      this.swUpdate.unrecoverable
        .pipe(catchError(() => of()))
        .subscribe(() => {
          this.reloadPage();
        });
    } catch {
      return;
    }
  }

  /**
   * Reloads the current browser document.
   */
  reloadPage(): void {
    try {
      if (typeof document !== 'undefined' && document.location) {
        document.location.reload();
      }
    } catch {
      return;
    }
  }
}
