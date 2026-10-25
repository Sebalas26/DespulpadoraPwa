import { Injectable, signal } from '@angular/core';

/**
 * Represents a transient UI toast notification item.
 */
export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

/**
 * Reactive service for displaying and managing toast notifications across the PWA.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  readonly toasts = signal<ToastItem[]>([]);

  /**
   * Enqueues a toast notification and schedules its automatic dismissal when `duration > 0`.
   */
  show(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    duration: number = 4000
  ): void {
    try {
      const id = Math.random().toString(36).substring(2, 9);
      const toast: ToastItem = { id, type, title, message, duration };

      this.toasts.update(list => [...list, toast]);

      if (duration > 0) {
        setTimeout(() => {
          this.remove(id);
        }, duration);
      }
    } catch {
      return;
    }
  }

  /**
   * Displays a success toast notification.
   */
  success(title: string, message: string = ''): void {
    try {
      this.show('success', title, message);
    } catch {
      return;
    }
  }

  /**
   * Displays an error toast notification.
   */
  error(title: string, message: string = ''): void {
    try {
      this.show('error', title, message, 6000);
    } catch {
      return;
    }
  }

  /**
   * Displays a warning toast notification.
   */
  warning(title: string, message: string = ''): void {
    try {
      this.show('warning', title, message, 5000);
    } catch {
      return;
    }
  }

  /**
   * Displays an informational toast notification.
   */
  info(title: string, message: string = ''): void {
    try {
      this.show('info', title, message);
    } catch {
      return;
    }
  }

  /**
   * Removes a toast notification by its unique identifier.
   */
  remove(id: string): void {
    try {
      this.toasts.update(list => list.filter(t => t.id !== id));
    } catch {
      return;
    }
  }

  /**
   * Clears all active toast notifications.
   */
  clear(): void {
    try {
      this.toasts.set([]);
    } catch {
      return;
    }
  }
}
