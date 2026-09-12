import { Injectable, signal } from '@angular/core';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  readonly toasts = signal<ToastItem[]>([]);

  show(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, duration: number = 4000) {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastItem = { id, type, title, message, duration };

    this.toasts.update(list => [...list, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  success(title: string, message: string = '') {
    this.show('success', title, message);
  }

  error(title: string, message: string = '') {
    this.show('error', title, message, 6000);
  }

  warning(title: string, message: string = '') {
    this.show('warning', title, message, 5000);
  }

  info(title: string, message: string = '') {
    this.show('info', title, message);
  }

  remove(id: string) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  clear() {
    this.toasts.set([]);
  }
}
