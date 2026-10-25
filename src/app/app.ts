import { Component, HostListener, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { PwaUpdateService } from './core/services/pwa-update.service';

/**
 * Root application component managing PWA update initialization and mobile row expansion interactions.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  private readonly pwaUpdate: PwaUpdateService = inject(PwaUpdateService);

  /**
   * Initializes the Service Worker update listener when the root component boots.
   */
  ngOnInit(): void {
    try {
      this.pwaUpdate.init();
    } catch {
      return;
    }
  }

  /**
   * Toggles the mobile expanded row state when tapping collapsible table rows on mobile viewports.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    try {
      if (typeof window === 'undefined' || window.innerWidth > 768) {
        return;
      }
      const target: HTMLElement | null = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (target.closest('button, a, input, select, textarea, label')) {
        return;
      }
      const collapsibleEl: HTMLElement | null = target.closest(
        '.table-responsive tbody tr, .table-container tbody tr, .clients-table tbody tr, .dgl-table tbody tr, .data-table tbody tr, .active-shift-card'
      ) as HTMLElement | null;
      if (
        collapsibleEl &&
        !collapsibleEl.querySelector('td[colspan]') &&
        !collapsibleEl.closest('.pro-invoice-table')
      ) {
        collapsibleEl.classList.toggle('mobile-row-expanded');
      }
    } catch {
      return;
    }
  }
}
