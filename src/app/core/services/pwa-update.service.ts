import { ApplicationRef, Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { concat, filter, first, interval } from 'rxjs';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly appRef = inject(ApplicationRef);
  private readonly notification = inject(NotificationService);

  init(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    // 1. Verificar actualizaciones periódicamente (cada 30 min) una vez la app esté estable
    const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable === true));
    const everyThirtyMinutes$ = interval(30 * 60 * 1000);
    concat(appIsStable$, everyThirtyMinutes$).subscribe(() => {
      this.swUpdate.checkForUpdate().catch(() => {});
    });

    // 2. Activar y recargar automáticamente cuando una nueva versión del PWA esté lista
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(async () => {
        this.notification.info(
          'Actualizando aplicación',
          'Se detectó una nueva versión de DGL Despulpadora. Aplicando cambios...'
        );
        await this.swUpdate.activateUpdate();
        setTimeout(() => document.location.reload(), 1200);
      });

    // 3. Recuperación automática si el Service Worker entra en estado corrupto/irrecuperable
    this.swUpdate.unrecoverable.subscribe(() => {
      document.location.reload();
    });
  }
}

