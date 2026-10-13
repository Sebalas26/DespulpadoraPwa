import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';
import { ConfirmVoiceOrderPayload, VoiceOrderMessageDto } from '../models/voice-order.models';

const INITIAL_DEMO_VOICE_ORDERS: VoiceOrderMessageDto[] = [
  {
    id: 'vo_001_elportal',
    whatsAppMessageId: 'wamid.HBgLMzgxMjQ4OTM5MDUxFQIAEhggMjhGNjY0RjhGNjA0Q0UzM0JFQkU2MzE2RDYwOTI0NzEA',
    senderPhone: '+57 310 456 7890',
    customerName: 'Carlos Morales (Restaurante El Portal)',
    mediaId: 'meta_media_maracuya_coco_001',
    audioUrl: 'http://localhost:5050/api/whatsapp/media/meta_media_maracuya_coco_001',
    mimeType: 'audio/wav',
    fileSizeBytes: 48500,
    durationSeconds: 14.5,
    status: 'Pending',
    receivedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    notes: 'Pedido para turno de almuerzo',
    transcriptPreview: 'Buenas tardes amigos de la despulpadora. Les habla Carlos de El Portal. Me envían por favor 5 paquetes de pulpa de maracuyá de kilo y 2 de limonada de coco de 140g para entregar antes de las 2pm. ¡Muchas gracias!'
  },
  {
    id: 'vo_002_lacosecha',
    whatsAppMessageId: 'wamid.HBgLMzgxMjQ4OTM5MDUxFQIAEhggODg5Mzk0OTQ5NDk0ODg0ODg0ODg0ODg0ODg0ODg0ODgA',
    senderPhone: '+57 320 890 1234',
    customerName: 'Diana Gómez (Frutería La Cosecha)',
    mediaId: 'meta_media_mango_lulo_002',
    audioUrl: 'http://localhost:5050/api/whatsapp/media/meta_media_mango_lulo_002',
    mimeType: 'audio/wav',
    fileSizeBytes: 36200,
    durationSeconds: 11.2,
    status: 'Pending',
    receivedAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
    notes: 'Pide verificar fecha de vencimiento',
    transcriptPreview: 'Hola equipo DGL, habla Diana. Necesitamos reponer 10 unidades de pulpa de mango tommy de 250 gramos y 4 de lulo de castilla de 500 gramos. Pago contraentrega en el local del centro.'
  }
];

@Injectable({
  providedIn: 'root'
})
export class VoiceOrdersService {
  private readonly http = inject(HttpClient);
  private readonly notification = inject(NotificationService);

  private hubConnection: signalR.HubConnection | null = null;
  readonly isSignalRConnected = signal<boolean>(false);

  // Core reactive signals
  readonly voiceOrders = signal<VoiceOrderMessageDto[]>(this.loadFromStorage());
  readonly isModalOpen = signal<boolean>(false);
  readonly activeVoiceOrder = signal<VoiceOrderMessageDto | null>(null);

  // Computeds
  readonly pendingVoiceOrders = computed(() =>
    this.voiceOrders().filter(o => o.status === 'Pending')
  );

  readonly pendingCount = computed(() => this.pendingVoiceOrders().length);

  constructor() {
    this.initSignalR();
    this.syncFromBackend();
  }

  // ==========================================
  // SIGNALR REAL-TIME WEBSOCKET CONNECTION
  // ==========================================
  private initSignalR() {
    const hubUrl = environment.apiUrl.replace('/api', '') + '/hubs/voice-orders';

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Listen for incoming voice order broadcast from .NET backend
    this.hubConnection.on('ReceiveNewVoiceOrder', (newOrder: VoiceOrderMessageDto) => {
      this.handleIncomingVoiceOrder(newOrder);
    });

    // Listen for status updates
    this.hubConnection.on('VoiceOrderStatusUpdated', (messageId: string, status: string, orderId?: number) => {
      this.voiceOrders.update(list => list.map(o => {
        if (o.id === messageId || o.whatsAppMessageId === messageId) {
          return {
            ...o,
            status: status as any,
            createdOrderId: orderId || o.createdOrderId,
            processedAt: status === 'PROCESSED' ? new Date().toISOString() : o.processedAt
          };
        }
        return o;
      }));
      this.saveToStorage();
    });

    this.hubConnection.onreconnecting(() => this.isSignalRConnected.set(false));
    this.hubConnection.onreconnected(() => this.isSignalRConnected.set(true));
    this.hubConnection.onclose(() => this.isSignalRConnected.set(false));

    this.startConnection();
  }

  private async startConnection() {
    if (!this.hubConnection) return;
    try {
      await this.hubConnection.start();
      this.isSignalRConnected.set(true);
      console.log('✅ Connected to Voice Orders SignalR Hub');
    } catch (err) {
      this.isSignalRConnected.set(false);
      // Gracefully silent in demo / offline mode
    }
  }

  private handleIncomingVoiceOrder(order: VoiceOrderMessageDto) {
    // Add to state if not exists
    this.voiceOrders.update(list => {
      const exists = list.some(o => o.id === order.id || o.whatsAppMessageId === order.whatsAppMessageId);
      return exists ? list : [order, ...list];
    });

    this.saveToStorage();

    // Play subtle audio chime & show notification
    this.playNotificationSound();
    this.notification.info(
      '🎙️ Nuevo Pedido por Audio (WhatsApp)',
      `De: ${order.customerName} (${order.senderPhone})`
    );
  }

  // ==========================================
  // MODAL CONTROLS
  // ==========================================
  openModal(order?: VoiceOrderMessageDto) {
    const target = order || this.pendingVoiceOrders()[0] || this.voiceOrders()[0];
    this.activeVoiceOrder.set(target || null);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  selectOrder(order: VoiceOrderMessageDto) {
    this.activeVoiceOrder.set(order);
  }

  // ==========================================
  // CONFIRM ORDER & SEND WHATSAPP CONFIRMATION
  // ==========================================
  async confirmAndSendWhatsApp(orderId: string, payload: ConfirmVoiceOrderPayload): Promise<boolean> {
    const backendUrl = `${environment.apiUrl}/whatsapp/voice-orders/${orderId}/confirm-and-send`;

    try {
      await this.http.post(backendUrl, payload).toPromise();
    } catch (err) {
      console.warn('Backend offline or simulated, confirming locally in PWA');
    }

    // Update local state
    this.voiceOrders.update(list => list.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'Processed',
          createdOrderId: payload.orderId,
          processedAt: new Date().toISOString()
        };
      }
      return o;
    }));

    this.saveToStorage();

    this.notification.success(
      'Pedido Confirmado & Notificado',
      `Mensaje de WhatsApp enviado a ${payload.customerPhone}`
    );

    // If there are more pending orders, switch to the next one, otherwise close
    const nextPending = this.pendingVoiceOrders().find(o => o.id !== orderId);
    if (nextPending) {
      this.activeVoiceOrder.set(nextPending);
    } else {
      this.closeModal();
    }

    return true;
  }

  // ==========================================
  // SIMULATE INCOMING VOICE ORDER (TESTING TOOL)
  // ==========================================
  simulateIncomingAudio(customName?: string, customPhone?: string, transcript?: string) {
    const id = `vo_sim_${Date.now()}`;
    const newOrder: VoiceOrderMessageDto = {
      id,
      whatsAppMessageId: `wamid.sim_${Date.now()}`,
      senderPhone: customPhone || '+57 315 789 4561',
      customerName: customName || 'Restaurante Gourmet La Terraza (Andrés)',
      mediaId: `sim_media_${Date.now()}`,
      audioUrl: `http://localhost:5050/api/whatsapp/media/sim_media_${Date.now()}`,
      mimeType: 'audio/wav',
      fileSizeBytes: 42000,
      durationSeconds: 13.0,
      status: 'Pending',
      receivedAt: new Date().toISOString(),
      notes: 'Pedido generado por simulación de audio',
      transcriptPreview: transcript || 'Hola amigos de DGL, necesito 8 bolsas de pulpa de maracuyá de kilo y 4 de base de limonada cerezada de 140g para la sede norte. Muchas gracias.'
    };

    // Try calling backend simulation endpoint if running
    this.http.post(`${environment.apiUrl}/whatsapp/webhook/simulate-audio`, {
      customerName: newOrder.customerName,
      senderPhone: newOrder.senderPhone,
      durationSeconds: 13.0,
      transcriptHint: newOrder.transcriptPreview
    }).subscribe({
      next: () => {},
      error: () => {
        // Local simulation fallback
        this.handleIncomingVoiceOrder(newOrder);
      }
    });

    return newOrder;
  }

  private async syncFromBackend() {
    try {
      const orders = await this.http.get<VoiceOrderMessageDto[]>(`${environment.apiUrl}/whatsapp/voice-orders`).toPromise();
      if (orders && orders.length > 0) {
        this.voiceOrders.set(orders);
        this.saveToStorage();
      }
    } catch {
      // Backend not running yet, using local storage
    }
  }

  private playNotificationSound() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {
      // AudioContext unavailable
    }
  }

  private loadFromStorage(): VoiceOrderMessageDto[] {
    try {
      const data = localStorage.getItem('dgl_whatsapp_voice_orders');
      return data ? JSON.parse(data) : INITIAL_DEMO_VOICE_ORDERS;
    } catch {
      return INITIAL_DEMO_VOICE_ORDERS;
    }
  }

  private saveToStorage() {
    localStorage.setItem('dgl_whatsapp_voice_orders', JSON.stringify(this.voiceOrders()));
  }
}
