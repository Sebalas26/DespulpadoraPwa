import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

/**
 * Global accessible confirmation modal component bound to `ConfirmDialogService`.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (dialogService.state().isOpen) {
      <div class="confirm-modal-overlay" (click)="onBackdropClick($event)">
        <div
          class="confirm-modal-box"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          (click)="$event.stopPropagation()"
        >
          <div
            class="confirm-modal-icon-wrap"
            [class.danger]="dialogService.state().options.isDanger"
            [class.warning]="!dialogService.state().options.isDanger"
          >
            @if (dialogService.state().options.isDanger) {
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            } @else {
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            }
          </div>
          <h3 id="confirm-dialog-title" class="confirm-modal-title">
            {{ dialogService.state().options.title }}
          </h3>
          <p class="confirm-modal-message">
            {{ dialogService.state().options.message }}
          </p>
          <div class="confirm-modal-footer">
            <button
              type="button"
              class="btn btn-secondary confirm-cancel-btn"
              (click)="cancel()"
            >
              {{ dialogService.state().options.cancelText || 'Cancelar' }}
            </button>
            <button
              type="button"
              class="btn confirm-action-btn"
              [class.btn-danger]="dialogService.state().options.isDanger"
              [class.btn-primary]="!dialogService.state().options.isDanger"
              (click)="accept()"
            >
              {{ dialogService.state().options.confirmText || 'Aceptar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmDialogComponent {
  readonly dialogService = inject(ConfirmDialogService);

  /**
   * Closes the dialog with rejection when the Escape key is pressed.
   */
  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.dialogService.state().isOpen) {
      this.cancel();
    }
  }

  /**
   * Handles clicking on the backdrop area to cancel and close the modal.
   */
  onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('confirm-modal-overlay')) {
      this.cancel();
    }
  }

  /**
   * Accepts the prompt and resolves the promise with true.
   */
  accept(): void {
    this.dialogService.accept();
  }

  /**
   * Rejects the prompt and resolves the promise with false.
   */
  cancel(): void {
    this.dialogService.cancel();
  }
}

