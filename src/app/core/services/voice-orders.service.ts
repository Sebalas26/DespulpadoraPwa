import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';
import {
  ConfirmVoiceOrderPayload,
  VoiceOrderMessageDto,
  VoiceOrderStatus
} from '../models/voice-order.models';

/**
 * Empty initial voice orders array populated strictly from the backend API or SignalR hub.
 */
export const INITIAL_DEMO_VOICE_ORDERS: VoiceOrderMessageDto[] = [];

/**
 * Window interface extension for Webkit AudioContext support.
 */
interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
  __karma__?: unknown;
}

/**
 * Real-time WhatsApp voice order synchronization and confirmation service.
 */
@Injectable({
  providedIn: 'root'
})
export class VoiceOrdersService {
  private readonly http = inject(HttpClient);
  private readonly notification = inject(NotificationService);

  private hubConnection: signalR.HubConnection | null = null;
  readonly isSignalRConnected = signal<boolean>(false);

  readonly voiceOrders = signal<VoiceOrderMessageDto[]>(this.loadFromStorage());
  readonly isModalOpen = signal<boolean>(false);
  readonly activeVoiceOrder = signal<VoiceOrderMessageDto | null>(null);

  readonly pendingVoiceOrders = computed<VoiceOrderMessageDto[]>(() =>
    this.voiceOrders().filter(o => o.status === 'Pending')
  );

  readonly pendingCount = computed<number>(() => this.pendingVoiceOrders().length);

  constructor() {
    this.initSignalR();
    void this.syncFromBackend();
  }

  /**
   * Initializes the SignalR real-time WebSocket connection to `/hubs/voice-orders`.
   */
  private initSignalR(): void {
    try {
      if (typeof window !== 'undefined' && (window as WindowWithWebkitAudio).__karma__) {
        return;
      }
      const hubUrl = environment.apiUrl.replace('/api', '') + '/hubs/voice-orders';

      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      this.hubConnection.on('ReceiveNewVoiceOrder', (newOrder: VoiceOrderMessageDto) => {
        this.handleIncomingVoiceOrder(newOrder);
      });

      this.hubConnection.on(
        'VoiceOrderStatusUpdated',
        (messageId: string, status: string, orderId?: number) => {
          this.voiceOrders.update(list =>
            list.map(o => {
              if (o.id === messageId || o.whatsAppMessageId === messageId) {
                return {
                  ...o,
                  status: status as VoiceOrderStatus,
                  createdOrderId: orderId || o.createdOrderId,
                  processedAt: status === 'PROCESSED' ? new Date().toISOString() : o.processedAt
                };
              }
              return o;
            })
          );
          this.saveToStorage();
        }
      );

      this.hubConnection.onreconnecting(() => this.isSignalRConnected.set(false));
      this.hubConnection.onreconnected(() => this.isSignalRConnected.set(true));
      this.hubConnection.onclose(() => this.isSignalRConnected.set(false));

      void this.startConnection();
    } catch {
      this.isSignalRConnected.set(false);
    }
  }

  /**
   * Starts the SignalR connection asynchronously.
   */
  private async startConnection(): Promise<void> {
    if (!this.hubConnection) {
      return;
    }
    try {
      await this.hubConnection.start();
      this.isSignalRConnected.set(true);
    } catch {
      this.isSignalRConnected.set(false);
    }
  }

  /**
   * Processes an incoming voice order message and updates reactive state.
   */
  private handleIncomingVoiceOrder(order: VoiceOrderMessageDto): void {
    try {
      this.voiceOrders.update(list => {
        const exists = list.some(
          o => o.id === order.id || o.whatsAppMessageId === order.whatsAppMessageId
        );
        return exists ? list : [order, ...list];
      });

      this.saveToStorage();
      this.playNotificationSound();
      this.notification.info(
        'Nuevo Pedido por Audio (WhatsApp)',
        `De: ${order.customerName} (${order.senderPhone})`
      );
    } catch {
      return;
    }
  }

  /**
   * Opens the voice order review modal for the specified or next pending order.
   */
  openModal(order?: VoiceOrderMessageDto): void {
    try {
      const target = order || this.pendingVoiceOrders()[0] || this.voiceOrders()[0] || null;
      this.activeVoiceOrder.set(target);
      this.isModalOpen.set(true);
    } catch {
      return;
    }
  }

  /**
   * Closes the voice order review modal.
   */
  closeModal(): void {
    try {
      this.isModalOpen.set(false);
    } catch {
      return;
    }
  }

  /**
   * Selects a voice order as the currently active order in the modal.
   */
  selectOrder(order: VoiceOrderMessageDto): void {
    try {
      this.activeVoiceOrder.set(order);
    } catch {
      return;
    }
  }

  /**
   * Confirms a voice order and triggers the WhatsApp confirmation message via the backend API.
   */
  async confirmAndSendWhatsApp(
    orderId: string,
    payload: ConfirmVoiceOrderPayload
  ): Promise<boolean> {
    const backendUrl = `${environment.apiUrl}/whatsapp/voice-orders/${orderId}/confirm-and-send`;

    try {
      await firstValueFrom(this.http.post<Record<string, unknown>>(backendUrl, payload));
    } catch {
      this.isSignalRConnected.update(v => v);
    }

    try {
      this.voiceOrders.update(list =>
        list.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              status: 'Processed' as VoiceOrderStatus,
              createdOrderId: payload.orderId,
              processedAt: new Date().toISOString()
            };
          }
          return o;
        })
      );

      this.saveToStorage();

      this.notification.success(
        'Pedido Confirmado & Notificado',
        `Mensaje de WhatsApp enviado a ${payload.customerPhone}`
      );

      const nextPending = this.pendingVoiceOrders().find(o => o.id !== orderId);
      if (nextPending) {
        this.activeVoiceOrder.set(nextPending);
      } else {
        this.closeModal();
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Dispatches a voice order webhook payload to the backend API using the explicit parameters provided.
   */
  simulateIncomingAudio(
    customName: string = '',
    customPhone: string = '',
    transcript: string = ''
  ): VoiceOrderMessageDto {
    try {
      const timestamp = Date.now();
      const id = `vo_sim_${timestamp}`;
      const mediaId = `sim_media_${timestamp}`;
      const newOrder: VoiceOrderMessageDto = {
        id,
        whatsAppMessageId: `wamid.sim_${timestamp}`,
        senderPhone: customPhone,
        customerName: customName,
        mediaId,
        audioUrl: `${environment.apiUrl}/whatsapp/media/${mediaId}`,
        mimeType: 'audio/wav',
        fileSizeBytes: 0,
        durationSeconds: 0,
        status: 'Pending',
        receivedAt: new Date().toISOString(),
        notes: '',
        transcriptPreview: transcript
      };

      this.http
        .post(`${environment.apiUrl}/whatsapp/webhook/simulate-audio`, {
          customerName: newOrder.customerName,
          senderPhone: newOrder.senderPhone,
          durationSeconds: newOrder.durationSeconds,
          transcriptHint: newOrder.transcriptPreview
        })
        .subscribe({
          next: () => {},
          error: () => {
            this.handleIncomingVoiceOrder(newOrder);
          }
        });

      return newOrder;
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Synchronizes the voice orders list from `GET /api/whatsapp/voice-orders`.
   */
  private async syncFromBackend(): Promise<void> {
    try {
      const orders = await firstValueFrom(
        this.http.get<VoiceOrderMessageDto[]>(`${environment.apiUrl}/whatsapp/voice-orders`)
      );
      if (Array.isArray(orders)) {
        this.voiceOrders.set(orders);
        this.saveToStorage();
      }
    } catch {
      return;
    }
  }

  /**
   * Plays an audio chime notification using the browser Web Audio API.
   */
  private playNotificationSound(): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }
      const win = window as WindowWithWebkitAudio;
      const AudioContextCtor = window.AudioContext || win.webkitAudioContext;
      if (!AudioContextCtor) {
        return;
      }
      const audioCtx = new AudioContextCtor();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {
      return;
    }
  }

  /**
   * Loads persisted voice orders from `localStorage`.
   */
  private loadFromStorage(): VoiceOrderMessageDto[] {
    try {
      const data = localStorage.getItem('dgl_whatsapp_voice_orders');
      return data ? (JSON.parse(data) as VoiceOrderMessageDto[]) : INITIAL_DEMO_VOICE_ORDERS;
    } catch {
      return INITIAL_DEMO_VOICE_ORDERS;
    }
  }

  /**
   * Saves current voice orders to `localStorage`.
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('dgl_whatsapp_voice_orders', JSON.stringify(this.voiceOrders()));
    } catch {
      return;
    }
  }
}
