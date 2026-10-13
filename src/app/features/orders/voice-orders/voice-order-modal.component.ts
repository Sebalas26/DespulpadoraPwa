import { Component, computed, effect, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoiceOrdersService } from '../../../core/services/voice-orders.service';
import { StateService } from '../../../core/services/state.service';
import { ConfirmVoiceOrderPayload, VoiceOrderItemDto, VoiceOrderMessageDto } from '../../../core/models/voice-order.models';
import { FruitConfig } from '../../../core/data/initial-data';
import confetti from 'canvas-confetti';

interface EditableOrderItem {
  fruitName: string;
  grammage: 140 | 250 | 500 | 1000;
  quantity: number;
  unitPrice: number;
}

@Component({
  selector: 'app-voice-order-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './voice-order-modal.component.html',
  styleUrls: ['./voice-order-modal.component.scss']
})
export class VoiceOrderModalComponent {
  readonly voiceOrdersService = inject(VoiceOrdersService);
  readonly stateService = inject(StateService);

  @ViewChild('audioPlayerRef') audioPlayerRef?: ElementRef<HTMLAudioElement>;

  // Audio player state
  readonly isPlaying = signal<boolean>(false);
  readonly currentTime = signal<number>(0);
  readonly duration = signal<number>(0);
  readonly playbackRate = signal<number>(1.0);
  readonly volume = signal<number>(1.0);
  readonly isMuted = signal<boolean>(false);
  readonly audioLoading = signal<boolean>(false);
  readonly audioError = signal<string | null>(null);

  // Manual Order Form state
  readonly clientName = signal<string>('');
  readonly clientPhone = signal<string>('');
  readonly deliveryAddress = signal<string>('');
  readonly estimatedDeliveryTime = signal<string>('Hoy antes de las 2:00 PM');
  readonly paymentMethod = signal<string>('Contra Entrega Efectivo');
  readonly customNotes = signal<string>('');
  readonly items = signal<EditableOrderItem[]>([]);
  readonly isSubmitting = signal<boolean>(false);

  // Computed order values
  readonly totalUnits = computed(() =>
    this.items().reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  );

  readonly totalKg = computed(() =>
    this.items().reduce((sum, item) => {
      const kgPerUnit = (item.grammage || 1000) / 1000;
      return sum + ((Number(item.quantity) || 0) * kgPerUnit);
    }, 0)
  );

  readonly totalAmount = computed(() =>
    this.items().reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0)
  );

  // WhatsApp structured response live preview
  readonly whatsAppMessagePreview = computed(() => {
    const name = this.clientName().trim() || 'Cliente';
    const itemsList = this.items()
      .filter(i => i.quantity > 0)
      .map(i => `• ${i.quantity}x Pulpa de ${i.fruitName} (${i.grammage}g) - $${((i.quantity * i.unitPrice) || 0).toLocaleString('es-CO')}`)
      .join('\n');

    const totalStr = `$${this.totalAmount().toLocaleString('es-CO')} COP`;
    const addressStr = this.deliveryAddress().trim() || 'Dirección registrada';
    const timeStr = this.estimatedDeliveryTime().trim() || 'Horario coordinado';
    const paymentStr = this.paymentMethod();

    return `✅ *Confirmación de Pedido - Pulpas DGL*\n\n` +
      `Hola *${name}*, recibimos tu nota de voz y confirmamos tu pedido:\n\n` +
      (itemsList || '• [Sin productos digitados]') + `\n\n` +
      `💰 *Total:* ${totalStr}\n` +
      `📍 *Entrega:* ${addressStr} (${timeStr})\n` +
      `💳 *Pago:* ${paymentStr}\n\n` +
      `¡Tu pedido ya está en preparación en cava! Muchas gracias por confiar en DGL. 🌿`;
  });

  constructor() {
    // When the active order changes, update the form defaults and reset audio player
    effect(() => {
      const active = this.voiceOrdersService.activeVoiceOrder();
      if (active) {
        this.resetAudioPlayer();
        this.initFormForOrder(active);
      }
    });
  }

  private initFormForOrder(order: VoiceOrderMessageDto) {
    this.clientName.set(order.customerName);
    this.clientPhone.set(order.senderPhone);
    this.customNotes.set(order.notes || '');

    // Set intelligent default items based on customer context
    if (order.id.includes('elportal') || order.transcriptPreview?.includes('maracuyá')) {
      this.deliveryAddress.set('Calle 93A # 13-25, Bogotá Norte (Restaurante El Portal)');
      this.estimatedDeliveryTime.set('Hoy antes de las 2:00 PM');
      this.paymentMethod.set('Contra Entrega Efectivo');
      this.items.set([
        { fruitName: 'Maracuyá', grammage: 1000, quantity: 5, unitPrice: 11000 },
        { fruitName: 'Limonada de Coco', grammage: 140, quantity: 2, unitPrice: 2200 }
      ]);
    } else if (order.id.includes('lacosecha') || order.transcriptPreview?.includes('mango')) {
      this.deliveryAddress.set('Carrera 15 # 78-42, Local 104 (Frutería La Cosecha)');
      this.estimatedDeliveryTime.set('Hoy a las 4:00 PM');
      this.paymentMethod.set('Transferencia Bancolombia');
      this.items.set([
        { fruitName: 'Mango Tommy', grammage: 250, quantity: 10, unitPrice: 3200 },
        { fruitName: 'Lulo de Castilla', grammage: 500, quantity: 4, unitPrice: 6500 }
      ]);
    } else {
      this.deliveryAddress.set('Sede Comercial Cliente');
      this.estimatedDeliveryTime.set('Hoy en la tarde');
      this.paymentMethod.set('Contra Entrega Efectivo');
      // Default to first available fruit
      const firstFruit = this.stateService.fruits()[0]?.name || 'Maracuyá';
      this.items.set([
        { fruitName: firstFruit, grammage: 1000, quantity: 5, unitPrice: 11000 }
      ]);
    }
  }

  // ==========================================
  // AUDIO CONTROLS
  // ==========================================
  togglePlayPause() {
    const audio = this.audioPlayerRef?.nativeElement;
    if (!audio) return;

    if (this.isPlaying()) {
      audio.pause();
      this.isPlaying.set(false);
    } else {
      this.audioError.set(null);
      this.audioLoading.set(true);
      audio.play()
        .then(() => {
          this.isPlaying.set(true);
          this.audioLoading.set(false);
        })
        .catch(err => {
          console.warn('Audio playback notice:', err);
          this.audioLoading.set(false);
          this.audioError.set('Audio en procesamiento o formato simulado. Puedes avanzar con la digitación manual.');
        });
    }
  }

  onAudioTimeUpdate() {
    const audio = this.audioPlayerRef?.nativeElement;
    if (audio) {
      this.currentTime.set(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        this.duration.set(audio.duration);
      }
    }
  }

  onAudioLoadedMetadata() {
    const audio = this.audioPlayerRef?.nativeElement;
    if (audio && audio.duration && !isNaN(audio.duration)) {
      this.duration.set(audio.duration);
      this.audioLoading.set(false);
    }
  }

  onAudioEnded() {
    this.isPlaying.set(false);
    this.currentTime.set(0);
  }

  onAudioError() {
    this.audioLoading.set(false);
    this.isPlaying.set(false);
    this.audioError.set('No se pudo cargar el audio remoto. Puedes utilizar el preview de transcripción o continuar digitando.');
  }

  seek(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));

    const dur = this.duration() || this.voiceOrdersService.activeVoiceOrder()?.durationSeconds || 14;
    const targetTime = pct * dur;

    const audio = this.audioPlayerRef?.nativeElement;
    if (audio) {
      audio.currentTime = targetTime;
      this.currentTime.set(targetTime);
    }
  }

  setPlaybackRate(rate: number) {
    this.playbackRate.set(rate);
    const audio = this.audioPlayerRef?.nativeElement;
    if (audio) {
      audio.playbackRate = rate;
    }
  }

  restartAudio() {
    const audio = this.audioPlayerRef?.nativeElement;
    if (audio) {
      audio.currentTime = 0;
      this.currentTime.set(0);
      if (!this.isPlaying()) {
        this.togglePlayPause();
      }
    }
  }

  toggleMute() {
    const audio = this.audioPlayerRef?.nativeElement;
    if (audio) {
      audio.muted = !audio.muted;
      this.isMuted.set(audio.muted);
    }
  }

  resetAudioPlayer() {
    this.isPlaying.set(false);
    this.currentTime.set(0);
    this.audioError.set(null);
    const active = this.voiceOrdersService.activeVoiceOrder();
    this.duration.set(active?.durationSeconds || 14);

    const audio = this.audioPlayerRef?.nativeElement;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.playbackRate = this.playbackRate();
      audio.load();
    }
  }

  formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // ==========================================
  // ORDER ITEMS MANAGEMENT
  // ==========================================
  addItem() {
    const fruits = this.stateService.fruits();
    const defaultFruit = fruits[0]?.name || 'Maracuyá';
    const defaultPrice = this.getPriceFor(defaultFruit, 1000);

    this.items.update(list => [
      ...list,
      {
        fruitName: defaultFruit,
        grammage: 1000,
        quantity: 1,
        unitPrice: defaultPrice
      }
    ]);
  }

  removeItem(index: number) {
    this.items.update(list => list.filter((_, i) => i !== index));
  }

  updateItemFruit(index: number, fruitName: string) {
    this.items.update(list => list.map((item, i) => {
      if (i === index) {
        const newPrice = this.getPriceFor(fruitName, item.grammage);
        return { ...item, fruitName, unitPrice: newPrice };
      }
      return item;
    }));
  }

  updateItemGrammage(index: number, grammageVal: any) {
    const grammage = (Number(grammageVal) || 1000) as (140 | 250 | 500 | 1000);
    this.items.update(list => list.map((item, i) => {
      if (i === index) {
        const newPrice = this.getPriceFor(item.fruitName, grammage);
        return { ...item, grammage, unitPrice: newPrice };
      }
      return item;
    }));
  }

  incrementQuantity(index: number) {
    this.items.update(list => list.map((item, i) => {
      if (i === index) {
        return { ...item, quantity: item.quantity + 1 };
      }
      return item;
    }));
  }

  decrementQuantity(index: number) {
    this.items.update(list => list.map((item, i) => {
      if (i === index && item.quantity > 1) {
        return { ...item, quantity: item.quantity - 1 };
      }
      return item;
    }));
  }

  getPriceFor(fruitName: string, grammage: 140 | 250 | 500 | 1000): number {
    const fruit = this.stateService.fruits().find(f => f.name.toLowerCase() === fruitName.toLowerCase());
    if (!fruit || !fruit.prices) {
      if (grammage === 140) return 2000;
      if (grammage === 250) return 3500;
      if (grammage === 500) return 6000;
      return 11000;
    }
    const szKey = `g${grammage}` as 'g140' | 'g250' | 'g500' | 'g1000';
    return fruit.prices[szKey] || 10000;
  }

  // ==========================================
  // PROCESS ORDER & SEND CONFIRMATION
  // ==========================================
  async submitOrder() {
    const active = this.voiceOrdersService.activeVoiceOrder();
    if (!active) return;

    if (this.items().length === 0) {
      alert('Por favor agrega al menos un producto al pedido.');
      return;
    }

    this.isSubmitting.set(true);

    try {
      // 1. Create the official order in the application state (Moves directly to Picking in Cava)
      const createdOrder = this.stateService.createOrder({
        clientName: this.clientName(),
        clientPhone: this.clientPhone(),
        clientAddress: this.deliveryAddress(),
        items: this.items().map(i => ({
          fruitName: i.fruitName,
          grammage: i.grammage,
          quantity: i.quantity,
          unitPrice: i.unitPrice
        })),
        notes: `Pedido originado por nota de voz WhatsApp. ${this.customNotes() || ''}`.trim(),
        paymentMethodName: this.paymentMethod()
      });

      // 2. Prepare payload for WhatsApp Webhook / Confirmation Endpoint
      const payload: ConfirmVoiceOrderPayload = {
        messageId: active.id,
        orderId: createdOrder.orderId,
        customerName: this.clientName(),
        customerPhone: this.clientPhone(),
        items: this.items().map(i => ({
          fruitName: i.fruitName,
          grammage: i.grammage,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.quantity * i.unitPrice
        })),
        totalAmount: this.totalAmount(),
        deliveryAddress: this.deliveryAddress(),
        estimatedDeliveryTime: this.estimatedDeliveryTime(),
        customNote: this.customNotes()
      };

      // 3. Notify backend API and trigger WhatsApp response
      await this.voiceOrdersService.confirmAndSendWhatsApp(active.id, payload);

      // 4. Celebration confetti
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch {
        // Non-critical
      }
    } catch (err) {
      console.error('Error procesando pedido de audio:', err);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // Helper to switch active order
  selectOrder(order: VoiceOrderMessageDto) {
    this.voiceOrdersService.selectOrder(order);
  }

  closeModal() {
    this.resetAudioPlayer();
    this.voiceOrdersService.closeModal();
  }

  // Trigger test simulation
  simulateNewAudio() {
    this.voiceOrdersService.simulateIncomingAudio();
  }
}
