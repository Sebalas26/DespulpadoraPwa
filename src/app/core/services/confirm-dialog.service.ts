import { Injectable, signal } from '@angular/core';

/**
 * Visual and behavioral configuration options for the global confirmation dialog.
 */
export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

/**
 * Internal state contract for the active confirmation dialog.
 */
export interface ConfirmDialogState {
  isOpen: boolean;
  options: ConfirmDialogOptions;
  resolve: ((confirmed: boolean) => void) | null;
}

/**
 * Centralized confirmation dialog service providing reactive, promise-based confirm modals across the PWA.
 */
@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  private readonly defaultOptions: ConfirmDialogOptions = {
    title: 'Confirmar acción',
    message: '¿Está seguro de continuar con esta acción?',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    isDanger: false
  };

  readonly state = signal<ConfirmDialogState>({
    isOpen: false,
    options: this.defaultOptions,
    resolve: null
  });

  /**
   * Opens the confirmation dialog and returns a Promise that resolves to true if accepted, false if canceled.
   */
  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.state.set({
        isOpen: true,
        options: {
          ...this.defaultOptions,
          ...options
        },
        resolve
      });
    });
  }

  /**
   * Accepts the prompt, resolving the pending promise with true and closing the modal.
   */
  accept(): void {
    const current = this.state();
    if (current.resolve) {
      current.resolve(true);
    }
    this.close();
  }

  /**
   * Dismisses or cancels the prompt, resolving the pending promise with false and closing the modal.
   */
  cancel(): void {
    const current = this.state();
    if (current.resolve) {
      current.resolve(false);
    }
    this.close();
  }

  /**
   * Resets the dialog state to closed.
   */
  private close(): void {
    this.state.set({
      isOpen: false,
      options: this.defaultOptions,
      resolve: null
    });
  }
}

