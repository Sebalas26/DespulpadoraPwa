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
  botEnabled?: boolean;
  autoReplyEnabled?: boolean;
  error?: string | null;
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

/**
 * Represents the configuration state of the automatic WhatsApp order reception bot.
 */
export interface WhatsAppBotConfigDto {
  ok: boolean;
  botEnabled: boolean;
  autoReplyEnabled: boolean;
  hasGeminiApiKey: boolean;
  geminiApiKeyMasked: string;
  backendApiUrl: string;
  fruitsCount: number;
  clientsCount: number;
  ordersHistoryCount: number;
  incomingOrdersCount: number;
  lastSyncedAt: string | null;
}

/**
 * Payload used to update the automatic WhatsApp order reception bot settings.
 */
export interface WhatsAppBotConfigPayload {
  botEnabled?: boolean;
  autoReplyEnabled?: boolean;
  geminiApiKey?: string;
  backendApiUrl?: string;
}

/**
 * Represents an order item inside an incoming WhatsApp order record.
 */
export interface WhatsAppIncomingOrderItemDto {
  fruitId: number;
  fruitName: string;
  grammage: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  pickedQuantity?: number;
}

/**
 * Represents an order automatically created by the WhatsApp Gateway bot.
 */
export interface WhatsAppIncomingOrderRecord {
  orderId: number;
  orderNumber: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  status: 'PENDING' | 'PICKING' | 'BILLED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  orderDate: string;
  scheduledDay: string;
  isPriority: boolean;
  totalAmount: number;
  isPaid: boolean;
  paymentMethodName: string;
  notes?: string;
  sourceType?: 'TEXTO' | 'AUDIO' | 'HISTORIAL';
  rawMessage?: string;
  createdAt: string;
  items: WhatsAppIncomingOrderItemDto[];
}

/**
 * Payload used to synchronize the live fruit catalog, clients, and historical orders with the Gateway.
 */
export interface WhatsAppSyncContextPayload {
  fruits: {
    fruitId?: number;
    name: string;
    prices: {
      g140: number;
      g250: number;
      g500: number;
      g1000: number;
    };
  }[];
  clients: {
    clientId?: number;
    fullName: string;
    phone: string;
    address: string;
  }[];
  orders: {
    orderId: number;
    orderNumber: string;
    clientName: string;
    clientPhone?: string;
    clientAddress?: string;
    status: string;
    orderDate: string;
    createdAt: string;
    items: {
      fruitId: number;
      fruitName: string;
      grammage: number;
      quantity: number;
      unitPrice: number;
    }[];
  }[];
}

/**
 * Response returned after synchronizing catalog and order history context with the Gateway.
 */
export interface WhatsAppSyncContextResponseDto {
  ok: boolean;
  fruitsCount: number;
  clientsCount: number;
  ordersCount: number;
  lastSyncedAt: string | null;
}

/**
 * Payload used to simulate an incoming WhatsApp message from a customer.
 */
export interface WhatsAppSimulatePayload {
  phone: string;
  pushName?: string;
  message: string;
  autoConfirm?: boolean;
}

/**
 * Response returned when simulating an incoming customer order message on the Gateway.
 */
export interface WhatsAppSimulateResponseDto {
  ok: boolean;
  handled: boolean;
  action?: string;
  reason?: string;
  replyText?: string | null;
  createdOrder?: WhatsAppIncomingOrderRecord | null;
  error?: string;
}

/**
 * Default local development base URL for the self-hosted WhatsApp Gateway.
 */
const DEFAULT_GATEWAY_BASE_URL = 'http://localhost:3005/api/whatsapp';

/**
 * LocalStorage key used to persist a custom WhatsApp Gateway base URL.
 */
const GATEWAY_URL_STORAGE_KEY = 'despulpadora_whatsapp_gateway_url';

/**
 * Service for interacting with the self-hosted WhatsApp Multi-Device QR Gateway.
 */
@Injectable({
  providedIn: 'root'
})
export class WhatsAppGatewayService {
  /**
   * Injected Angular HTTP client for communicating with the WhatsApp Gateway REST API.
   */
  private readonly http: HttpClient = inject(HttpClient);

  /**
   * Determines whether the current runtime environment is a remote production host or HTTPS origin.
   */
  private isProductionOrigin(): boolean {
    try {
      if (typeof window === 'undefined' || !window.location) {
        return false;
      }
      const isHttps: boolean = window.location.protocol === 'https:';
      const hostname: string = window.location.hostname || '';
      const isRemoteHost: boolean =
        hostname !== '' &&
        hostname !== 'localhost' &&
        hostname !== '127.0.0.1' &&
        hostname !== '::1';
      return isHttps || isRemoteHost;
    } catch {
      return false;
    }
  }

  /**
   * Returns the configured base URL for the WhatsApp Gateway.
   * In production or remote HTTPS environments, defaults to the same-origin relative endpoint '/api/whatsapp'.
   * In local development or testing environments, defaults to 'http://localhost:3005/api/whatsapp'.
   */
  getGatewayBaseUrl(): string {
    try {
      const isProdOrigin: boolean = this.isProductionOrigin();
      const saved: string | null = localStorage.getItem(GATEWAY_URL_STORAGE_KEY);
      if (saved && saved.trim().length > 0) {
        const normalizedSaved: string = saved.trim().replace(/\/+$/, '');
        const pointsToLoopback: boolean = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(\/|$)/i.test(
          normalizedSaved
        );
        if (!isProdOrigin || !pointsToLoopback) {
          return normalizedSaved;
        }
      }
      if (isProdOrigin) {
        return '/api/whatsapp';
      }
      return DEFAULT_GATEWAY_BASE_URL;
    } catch {
      return this.isProductionOrigin() ? '/api/whatsapp' : DEFAULT_GATEWAY_BASE_URL;
    }
  }

  /**
   * Updates and persists a custom base URL for the WhatsApp Gateway.
   */
  setGatewayBaseUrl(url: string): void {
    try {
      const trimmed: string = (url || '').trim().replace(/\/+$/, '');
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
   * Fetches the current connection state and cryptographic Multi-Device QR code from the WhatsApp Gateway.
   */
  getStatus(): Observable<WhatsAppGatewayStatusDto> {
    const fallbackStatus: WhatsAppGatewayStatusDto = {
      status: 'DISCONNECTED',
      connected: false,
      qrDataUrl: null,
      phoneNumber: null,
      name: null,
      error: 'GATEWAY_UNREACHABLE',
      lastUpdatedAt: new Date().toISOString()
    };

    try {
      const baseUrl: string = this.getGatewayBaseUrl();
      return this.http
        .get<WhatsAppGatewayStatusDto>(`${baseUrl}/status`)
        .pipe(catchError(() => of(fallbackStatus)));
    } catch {
      return of(fallbackStatus);
    }
  }

  /**
   * Sends a text message to the specified phone number via the linked WhatsApp session.
   */
  sendMessage(phone: string, message: string): Observable<WhatsAppSendResponseDto> {
    try {
      const baseUrl: string = this.getGatewayBaseUrl();
      return this.http
        .post<WhatsAppSendResponseDto>(`${baseUrl}/send`, {
          phone: (phone || '').trim(),
          message: (message || '').trim()
        })
        .pipe(
          catchError((err: unknown) => {
            const errObj = err as { error?: { error?: string }; message?: string };
            const msg: string =
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
   * Forces a reconnection or new cryptographic Multi-Device QR code generation on the WhatsApp Gateway.
   */
  reconnect(): Observable<{ success: boolean } & Partial<WhatsAppGatewayStatusDto>> {
    const fallbackReconnect: { success: boolean } & Partial<WhatsAppGatewayStatusDto> = {
      success: false,
      status: 'DISCONNECTED',
      connected: false,
      qrDataUrl: null,
      phoneNumber: null,
      name: null,
      error: 'GATEWAY_UNREACHABLE',
      lastUpdatedAt: new Date().toISOString()
    };

    try {
      const baseUrl: string = this.getGatewayBaseUrl();
      return this.http
        .post<{ success: boolean } & Partial<WhatsAppGatewayStatusDto>>(`${baseUrl}/reconnect`, {})
        .pipe(catchError(() => of(fallbackReconnect)));
    } catch {
      return of(fallbackReconnect);
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

  /**
   * Retrieves the current configuration of the automatic WhatsApp order reception bot.
   */
  getBotConfig(): Observable<WhatsAppBotConfigDto> {
    const fallback: WhatsAppBotConfigDto = {
      ok: false,
      botEnabled: false,
      autoReplyEnabled: true,
      hasGeminiApiKey: false,
      geminiApiKeyMasked: '',
      backendApiUrl: '',
      fruitsCount: 0,
      clientsCount: 0,
      ordersHistoryCount: 0,
      incomingOrdersCount: 0,
      lastSyncedAt: null
    };
    try {
      const baseUrl = this.getGatewayBaseUrl();
      return this.http
        .get<WhatsAppBotConfigDto>(`${baseUrl}/bot-config`)
        .pipe(catchError(() => of(fallback)));
    } catch {
      return of(fallback);
    }
  }

  /**
   * Updates the automatic WhatsApp order reception bot configuration (e.g., turning it ON/OFF or saving the Gemini key).
   */
  updateBotConfig(payload: WhatsAppBotConfigPayload): Observable<WhatsAppBotConfigDto> {
    const fallback: WhatsAppBotConfigDto = {
      ok: false,
      botEnabled: Boolean(payload.botEnabled),
      autoReplyEnabled: payload.autoReplyEnabled ?? true,
      hasGeminiApiKey: false,
      geminiApiKeyMasked: '',
      backendApiUrl: payload.backendApiUrl || '',
      fruitsCount: 0,
      clientsCount: 0,
      ordersHistoryCount: 0,
      incomingOrdersCount: 0,
      lastSyncedAt: null
    };
    try {
      const baseUrl = this.getGatewayBaseUrl();
      return this.http
        .post<WhatsAppBotConfigDto>(`${baseUrl}/bot-config`, payload)
        .pipe(catchError(() => of(fallback)));
    } catch {
      return of(fallback);
    }
  }

  /**
   * Synchronizes the live fruit catalog, clients, and historical orders with the WhatsApp Gateway.
   */
  syncContext(payload: WhatsAppSyncContextPayload): Observable<WhatsAppSyncContextResponseDto> {
    const fallback: WhatsAppSyncContextResponseDto = {
      ok: false,
      fruitsCount: 0,
      clientsCount: 0,
      ordersCount: 0,
      lastSyncedAt: null
    };
    try {
      const baseUrl = this.getGatewayBaseUrl();
      return this.http
        .post<WhatsAppSyncContextResponseDto>(`${baseUrl}/sync-context`, payload)
        .pipe(catchError(() => of(fallback)));
    } catch {
      return of(fallback);
    }
  }

  /**
   * Fetches the list of orders automatically created by the WhatsApp Gateway.
   */
  getIncomingOrders(): Observable<{ ok: boolean; orders: WhatsAppIncomingOrderRecord[] }> {
    try {
      const baseUrl = this.getGatewayBaseUrl();
      return this.http
        .get<{ ok: boolean; orders: WhatsAppIncomingOrderRecord[] }>(`${baseUrl}/incoming-orders`)
        .pipe(catchError(() => of({ ok: false, orders: [] })));
    } catch {
      return of({ ok: false, orders: [] });
    }
  }

  /**
   * Simulates an incoming customer message on the WhatsApp Gateway to test order parsing or history repeat.
   */
  simulateIncomingMessage(payload: WhatsAppSimulatePayload): Observable<WhatsAppSimulateResponseDto> {
    try {
      const baseUrl: string = this.getGatewayBaseUrl();
      return this.http
        .post<WhatsAppSimulateResponseDto>(`${baseUrl}/simulate-incoming`, payload)
        .pipe(
          catchError(() =>
            of({
              ok: false,
              handled: false,
              createdOrder: null,
              error: 'No se pudo conectar con el Gateway de WhatsApp para simular el pedido.'
            })
          )
        );
    } catch {
      return of({
        ok: false,
        handled: false,
        createdOrder: null,
        error: 'Error inesperado al simular pedido de WhatsApp.'
      });
    }
  }

  /**
   * Alias for `simulateIncomingMessage` that dispatches a simulated incoming order message to the Gateway without synthetic fallbacks.
   */
  simulateIncomingOrder(payload: WhatsAppSimulatePayload): Observable<WhatsAppSimulateResponseDto> {
    try {
      return this.simulateIncomingMessage(payload);
    } catch {
      return of({
        ok: false,
        handled: false,
        createdOrder: null,
        error: 'Error inesperado al simular pedido de WhatsApp.'
      });
    }
  }
}
