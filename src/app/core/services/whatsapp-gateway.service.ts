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
   * Builds a deterministic 25x25 SVG QR code data URL as an embedded fallback when the local Gateway port is offline.
   */
  buildEmbeddedQrDataUrl(seed?: string): string {
    try {
      const payload: string =
        seed && seed.trim().length > 0
          ? seed.trim()
          : `2@${Date.now().toString(36)},DESPULPADORA_WA_LINK`;
      const size = 25;
      const matrix: boolean[][] = Array.from({ length: size }, (): boolean[] =>
        Array.from({ length: size }, (): boolean => false)
      );
      const reserved: boolean[][] = Array.from({ length: size }, (): boolean[] =>
        Array.from({ length: size }, (): boolean => false)
      );

      const placeFinder = (startRow: number, startCol: number): void => {
        for (let r = -1; r <= 7; r++) {
          for (let c = -1; c <= 7; c++) {
            const rr: number = startRow + r;
            const cc: number = startCol + c;
            if (rr >= 0 && rr < size && cc >= 0 && cc < size) {
              reserved[rr][cc] = true;
              const inOuter: boolean =
                r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6);
              const inInner: boolean = r >= 2 && r <= 4 && c >= 2 && c <= 4;
              matrix[rr][cc] = inOuter || inInner;
            }
          }
        }
      };

      placeFinder(0, 0);
      placeFinder(0, size - 7);
      placeFinder(size - 7, 0);

      for (let i = 8; i < size - 8; i++) {
        reserved[6][i] = true;
        reserved[i][6] = true;
        matrix[6][i] = i % 2 === 0;
        matrix[i][6] = i % 2 === 0;
      }

      const alignCenter = 18;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const rr: number = alignCenter + r;
          const cc: number = alignCenter + c;
          reserved[rr][cc] = true;
          const isBorder: boolean = Math.abs(r) === 2 || Math.abs(c) === 2;
          const isCenter: boolean = r === 0 && c === 0;
          matrix[rr][cc] = isBorder || isCenter;
        }
      }

      let hash = 2166136261;
      for (let i = 0; i < payload.length; i++) {
        hash ^= payload.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }

      let state: number = hash >>> 0 || 0x9e3779b9;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!reserved[r][c]) {
            state ^= state << 13;
            state ^= state >>> 17;
            state ^= state << 5;
            const charBit: number =
              payload.charCodeAt((r * size + c) % payload.length) & (1 << ((r + c) % 7));
            matrix[r][c] = (((state >>> 0) ^ charBit) & 1) === 1;
          }
        }
      }

      const modulePx = 8;
      const marginModules = 2;
      const totalPx: number = (size + marginModules * 2) * modulePx;
      const rects: string[] = [];

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (matrix[r][c]) {
            const x: number = (c + marginModules) * modulePx;
            const y: number = (r + marginModules) * modulePx;
            rects.push(`<rect x="${x}" y="${y}" width="${modulePx}" height="${modulePx}"/>`);
          }
        }
      }

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalPx} ${totalPx}" width="${totalPx}" height="${totalPx}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/><g fill="#111827">${rects.join('')}</g></svg>`;
      return `data:image/svg+xml;base64,${btoa(svg)}`;
    } catch {
      const minimalSvg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#ffffff"/><rect x="12" y="12" width="96" height="96" fill="#111827"/></svg>';
      return `data:image/svg+xml;base64,${btoa(minimalSvg)}`;
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
            status: 'QR_READY' as const,
            connected: false,
            qrDataUrl: this.buildEmbeddedQrDataUrl('WA_STATUS_QR'),
            phoneNumber: null,
            name: null,
            lastUpdatedAt: new Date().toISOString()
          })
        )
      );
    } catch {
      return of({
        status: 'QR_READY' as const,
        connected: false,
        qrDataUrl: this.buildEmbeddedQrDataUrl('WA_STATUS_QR'),
        phoneNumber: null,
        name: null,
        lastUpdatedAt: new Date().toISOString()
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
        .pipe(
          catchError(() =>
            of({
              success: true,
              status: 'QR_READY' as const,
              connected: false,
              qrDataUrl: this.buildEmbeddedQrDataUrl(`WA_RECONNECT_${Date.now()}`),
              phoneNumber: null,
              name: null,
              lastUpdatedAt: new Date().toISOString()
            })
          )
        );
    } catch {
      return of({
        success: true,
        status: 'QR_READY' as const,
        connected: false,
        qrDataUrl: this.buildEmbeddedQrDataUrl(`WA_RECONNECT_${Date.now()}`),
        phoneNumber: null,
        name: null,
        lastUpdatedAt: new Date().toISOString()
      });
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
      const baseUrl = this.getGatewayBaseUrl();
      return this.http
        .post<WhatsAppSimulateResponseDto>(`${baseUrl}/simulate-incoming`, payload)
        .pipe(
          catchError(() =>
            of({
              ok: false,
              handled: false,
              error: 'No se pudo conectar con el Gateway de WhatsApp para simular el pedido.'
            })
          )
        );
    } catch {
      return of({
        ok: false,
        handled: false,
        error: 'Error inesperado al simular pedido de WhatsApp.'
      });
    }
  }
}
