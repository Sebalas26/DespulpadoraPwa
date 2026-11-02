import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

/**
 * Represents the live connection and QR code status of the self-hosted WhatsApp Gateway.
 */
export interface WhatsAppGatewayStatusDto {
  status: 'DISCONNECTED' | 'QR_READY' | 'CONNECTING' | 'CONNECTED';
  connected: boolean;
  qrDataUrl: string | null;
  phoneNumber: string | null;
  name: string | null;
  lastUpdatedAt?: string;
}

/**
 * Represents the response returned after dispatching a WhatsApp message through the Gateway.
 */
export interface WhatsAppSendResponseDto {
  success: boolean;
  to?: string;
  messageId?: string | null;
  timestamp?: string;
  error?: string;
}

const DEFAULT_GATEWAY_BASE_URL = 'http://localhost:3005/api/whatsapp';
const GATEWAY_URL_STORAGE_KEY = 'despulpadora_whatsapp_gateway_url';

/**
 * Service for interacting with the self-hosted WhatsApp Multi-Device QR Gateway.
 */
@Injectable({
  providedIn: 'root'
})
export class WhatsAppGatewayService {
  private readonly http = inject(HttpClient);

  /**
   * Returns the configured base URL for the WhatsApp Gateway.
   */
  getGatewayBaseUrl(): string {
    try {
      const saved = localStorage.getItem(GATEWAY_URL_STORAGE_KEY);
      if (saved && saved.trim().length > 0) {
        return saved.trim().replace(/\/+$/, '');
      }
      return DEFAULT_GATEWAY_BASE_URL;
    } catch {
      return DEFAULT_GATEWAY_BASE_URL;
    }
  }

  /**
   * Updates and persists a custom base URL for the WhatsApp Gateway.
   */
  setGatewayBaseUrl(url: string): void {
    try {
      const trimmed = (url || '').trim().replace(/\/+$/, '');
      if (trimmed) {
        localStorage.setItem(GATEWAY_URL_STORAGE_KEY, trimmed);
      } else {
        localStorage.removeItem(GATEWAY_URL_STORAGE_KEY);
      }
    } catch {
      return;
    }
  }

  /**
   * Fetches the current connection state and QR code from the WhatsApp Gateway.
   */
  getStatus(): Observable<WhatsAppGatewayStatusDto> {
    try {
      const baseUrl = this.getGatewayBaseUrl();
      return this.http.get<WhatsAppGatewayStatusDto>(`${baseUrl}/status`).pipe(
        catchError(() =>
          of({
            status: 'DISCONNECTED' as const,
            connected: false,
            qrDataUrl: null,
            phoneNumber: null,
            name: null
          })
        )
      );
    } catch {
      return of({
        status: 'DISCONNECTED' as const,
        connected: false,
        qrDataUrl: null,
        phoneNumber: null,
        name: null
      });
    }
  }

  /**
   * Sends a text message to the specified phone number via the linked WhatsApp session.
   */
  sendMessage(phone: string, message: string): Observable<WhatsAppSendResponseDto> {
    try {
      const baseUrl = this.getGatewayBaseUrl();
      return this.http
        .post<WhatsAppSendResponseDto>(`${baseUrl}/send`, {
          phone: (phone || '').trim(),
          message: (message || '').trim()
        })
        .pipe(
          catchError((err: unknown) => {
            const errObj = err as { error?: { error?: string }; message?: string };
            const msg =
              errObj?.error?.error ||
              errObj?.message ||
              'No se pudo contactar con el Gateway de WhatsApp.';
            return of({
              success: false,
              error: msg
            });
          })
        );
    } catch {
      return of({
        success: false,
        error: 'Error inesperado al enviar mensaje de WhatsApp.'
      });
    }
  }

  /**
   * Forces a reconnection or new QR code generation on the WhatsApp Gateway.
   */
  reconnect(): Observable<{ success: boolean } & Partial<WhatsAppGatewayStatusDto>> {
    try {
      const baseUrl = this.getGatewayBaseUrl();
      return this.http
        .post<{ success: boolean } & Partial<WhatsAppGatewayStatusDto>>(`${baseUrl}/reconnect`, {})
        .pipe(catchError(() => of({ success: false })));
    } catch {
      return of({ success: false });
    }
  }

  /**
   * Logs out the currently linked WhatsApp account and clears its session on the Gateway.
   */
  logout(): Observable<{ success: boolean } & Partial<WhatsAppGatewayStatusDto>> {
    try {
      const baseUrl = this.getGatewayBaseUrl();
      return this.http
        .post<{ success: boolean } & Partial<WhatsAppGatewayStatusDto>>(`${baseUrl}/logout`, {})
        .pipe(catchError(() => of({ success: false })));
    } catch {
      return of({ success: false });
    }
  }
}

