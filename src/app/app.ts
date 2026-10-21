import { Component, HostListener, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { PwaUpdateService } from './core/services/pwa-update.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  private readonly pwaUpdate = inject(PwaUpdateService);

  ngOnInit(): void {
    this.pwaUpdate.init();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (typeof window === 'undefined' || window.innerWidth > 768) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }
    // No colapsar/expandir si el clic fue en un botón, enlace, input o select interactivo
    if (target.closest('button, a, input, select, textarea, label')) {
      return;
    }
    const collapsibleEl = target.closest(
      '.table-responsive tbody tr, .table-container tbody tr, .clients-table tbody tr, .dgl-table tbody tr, .data-table tbody tr, .active-shift-ticket'
    ) as HTMLElement | null;
    if (collapsibleEl && !collapsibleEl.querySelector('td[colspan]') && !collapsibleEl.closest('.pro-invoice-table')) {
      collapsibleEl.classList.toggle('mobile-row-expanded');
    }
  }
}
