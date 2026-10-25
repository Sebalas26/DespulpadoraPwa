import { Component, computed, effect, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoiceOrdersService } from '../../../core/services/voice-orders.service';
import { StateService } from '../../../core/services/state.service';
import { ConfirmVoiceOrderPayload, VoiceOrderItemDto, VoiceOrderMessageDto } from '../../../core/models/voice-order.models';
import { FruitConfig } from '../../../core/models/business.models';
import confetti from 'canvas-confetti';

/**
 * Represents an editable line item in the voice order transcription form.
 */
export interface EditableOrderItem {
  fruitName: string;
  grammage: 140 | 250 | 500 | 1000;
  quantity: number;
  unitPrice: number;
}

/**
 * Modal component for listening to WhatsApp voice notes, transcribing order items, and confirming orders.
 */
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

  readonly isPlaying = signal<boolean>(false);
  readonly currentTime = signal<number>(0);
  readonly duration = signal<number>(0);
  readonly playbackRate = signal<number>(1.0);
  readonly volume = signal<number>(1.0);
  readonly isMuted = signal<boolean>(false);
  readonly audioLoading = signal<boolean>(false);
  readonly audioError = signal<string | null>(null);

  readonly clientName = signal<string>('');
  readonly clientPhone = signal<string>('');
  readonly deliveryAddress = signal<string>('');
  readonly estimatedDeliveryTime = signal<string>('');
  readonly paymentMethod = signal<string>('');
  readonly activePaymentMethods = computed(() => this.stateService.activePaymentMethods());
  readonly customNotes = signal<string>('');
  readonly items = signal<EditableOrderItem[]>([]);
  readonly isSubmitting = signal<boolean>(false);

  readonly totalUnits = computed<number>(() =>
    this.items().reduce((sum: number, item: EditableOrderItem) => sum + (Number(item.quantity) || 0), 0)
  );

  readonly totalKg = computed<number>(() =>
    this.items().reduce((sum: number, item: EditableOrderItem) => {
      const kgPerUnit = (item.grammage || 1000) / 1000;
      return sum + ((Number(item.quantity) || 0) * kgPerUnit);
    }, 0)
  );

  readonly totalAmount = computed<number>(() =>
    this.items().reduce(
      (sum: number, item: EditableOrderItem) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
      0
    )
  );

  readonly whatsAppMessagePreview = computed<string>(() => {
    const name = this.clientName().trim() || 'Cliente';
    const itemsList = this.items()
      .filter((i: EditableOrderItem) => i.quantity > 0)
      .map(
        (i: EditableOrderItem) =>
          `• ${i.quantity}x Pulpa de ${i.fruitName} (${i.grammage}g) - $${((i.quantity * i.unitPrice) || 0).toLocaleString('es-CO')}`
      )
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
      `¡Tu pedido ya está en preparación en cava! Muchas gracias por confiar en DGL.`;
  });

  /**
   * Initializes reactive effect to synchronize form state with the active voice order.
   */
  constructor() {
    try {
      effect(() => {
        const active = this.voiceOrdersService.activeVoiceOrder();
        if (active) {
          this.resetAudioPlayer();
          this.initFormForOrder(active);
        }
      });
    } catch (error: unknown) {
      console.error('Error initializing VoiceOrderModalComponent:', error);
    }
  }

  /**
   * Populates the transcription form from the selected voice order message without hardcoded client presets.
   */
  private initFormForOrder(order: VoiceOrderMessageDto): void {
    try {
      this.clientName.set(order.customerName || '');
      this.clientPhone.set(order.senderPhone || '');
      this.customNotes.set(order.notes || '');
      this.deliveryAddress.set('');
      this.estimatedDeliveryTime.set('');
      this.paymentMethod.set('');

      if (order.extractedItems && order.extractedItems.length > 0) {
        this.items.set(
          order.extractedItems.map((it: VoiceOrderItemDto) => ({
            fruitName: it.fruitName,
            grammage: it.grammage,
            quantity: it.quantity,
            unitPrice: it.unitPrice || this.getPriceFor(it.fruitName, it.grammage)
          }))
        );
      } else {
        const firstFruit = this.stateService.fruits()[0];
        if (firstFruit) {
          this.items.set([
            {
              fruitName: firstFruit.name,
              grammage: 1000,
              quantity: 1,
              unitPrice: this.getPriceFor(firstFruit.name, 1000)
            }
          ]);
        } else {
          this.items.set([]);
        }
      }
    } catch (error: unknown) {
      console.error('Error initializing form for voice order:', error);
    }
  }

  /**
   * Toggles audio playback between playing and paused states.
   */
  togglePlayPause(): void {
    try {
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
          .catch((err: unknown) => {
            console.warn('Audio playback notice:', err);
            this.audioLoading.set(false);
            this.audioError.set('Audio en procesamiento o formato simulado. Puedes avanzar con la digitación manual.');
          });
      }
    } catch (error: unknown) {
      console.error('Error toggling play/pause:', error);
    }
  }

  /**
   * Synchronizes the current playback time and duration from the HTMLAudioElement.
   */
  onAudioTimeUpdate(): void {
    try {
      const audio = this.audioPlayerRef?.nativeElement;
      if (audio) {
        this.currentTime.set(audio.currentTime);
        if (audio.duration && !isNaN(audio.duration)) {
          this.duration.set(audio.duration);
        }
      }
    } catch (error: unknown) {
      console.error('Error on audio time update:', error);
    }
  }

  /**
   * Updates duration and loading state when audio metadata finishes loading.
   */
  onAudioLoadedMetadata(): void {
    try {
      const audio = this.audioPlayerRef?.nativeElement;
      if (audio && audio.duration && !isNaN(audio.duration)) {
        this.duration.set(audio.duration);
        this.audioLoading.set(false);
      }
    } catch (error: unknown) {
      console.error('Error on audio loaded metadata:', error);
    }
  }

  /**
   * Resets playback state when the audio clip finishes playing.
   */
  onAudioEnded(): void {
    try {
      this.isPlaying.set(false);
      this.currentTime.set(0);
    } catch (error: unknown) {
      console.error('Error on audio ended:', error);
    }
  }

  /**
   * Handles audio element loading errors.
   */
  onAudioError(): void {
    try {
      this.audioLoading.set(false);
      this.isPlaying.set(false);
      this.audioError.set('No se pudo cargar el audio remoto. Puedes utilizar el preview de transcripción o continuar digitando.');
    } catch (error: unknown) {
      console.error('Error handling audio error:', error);
    }
  }

  /**
   * Seeks to a specific position in the audio track based on click coordinates.
   */
  seek(event: MouseEvent): void {
    try {
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
    } catch (error: unknown) {
      console.error('Error seeking audio:', error);
    }
  }

  /**
   * Updates the playback speed multiplier of the audio player.
   */
  setPlaybackRate(rate: number): void {
    try {
      this.playbackRate.set(rate);
      const audio = this.audioPlayerRef?.nativeElement;
      if (audio) {
        audio.playbackRate = rate;
      }
    } catch (error: unknown) {
      console.error('Error setting playback rate:', error);
    }
  }

  /**
   * Restarts audio playback from the beginning of the voice note.
   */
  restartAudio(): void {
    try {
      const audio = this.audioPlayerRef?.nativeElement;
      if (audio) {
        audio.currentTime = 0;
        this.currentTime.set(0);
        if (!this.isPlaying()) {
          this.togglePlayPause();
        }
      }
    } catch (error: unknown) {
      console.error('Error restarting audio:', error);
    }
  }

  /**
   * Toggles the mute state of the audio player.
   */
  toggleMute(): void {
    try {
      const audio = this.audioPlayerRef?.nativeElement;
      if (audio) {
        audio.muted = !audio.muted;
        this.isMuted.set(audio.muted);
      }
    } catch (error: unknown) {
      console.error('Error toggling mute:', error);
    }
  }

  /**
   * Resets the audio player state when switching between voice orders.
   */
  resetAudioPlayer(): void {
    try {
      this.isPlaying.set(false);
      this.currentTime.set(0);
      this.audioError.set(null);
      const active = this.voiceOrdersService.activeVoiceOrder();
      this.duration.set(active?.durationSeconds || 0);

      const audio = this.audioPlayerRef?.nativeElement;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.playbackRate = this.playbackRate();
        audio.load();
      }
    } catch (error: unknown) {
      console.error('Error resetting audio player:', error);
    }
  }

  /**
   * Formats a duration in seconds into MM:SS string format.
   */
  formatTime(seconds: number): string {
    try {
      if (isNaN(seconds) || seconds < 0) return '00:00';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } catch (error: unknown) {
      console.error('Error formatting time:', error);
      return '00:00';
    }
  }

  /**
   * Appends a new editable order item using the first configured fruit in StateService.
   */
  addItem(): void {
    try {
      const fruits = this.stateService.fruits();
      const defaultFruit = fruits[0]?.name || '';
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
    } catch (error: unknown) {
      console.error('Error adding voice order item:', error);
    }
  }

  /**
   * Removes an editable order item by its index.
   */
  removeItem(index: number): void {
    try {
      this.items.update(list => list.filter((_: EditableOrderItem, i: number) => i !== index));
    } catch (error: unknown) {
      console.error('Error removing voice order item:', error);
    }
  }

  /**
   * Updates the selected fruit and recalculates the unit price for an item row.
   */
  updateItemFruit(index: number, fruitName: string): void {
    try {
      this.items.update(list =>
        list.map((item: EditableOrderItem, i: number) => {
          if (i === index) {
            const newPrice = this.getPriceFor(fruitName, item.grammage);
            return { ...item, fruitName, unitPrice: newPrice };
          }
          return item;
        })
      );
    } catch (error: unknown) {
      console.error('Error updating voice order item fruit:', error);
    }
  }

  /**
   * Updates the selected grammage and recalculates the unit price for an item row.
   */
  updateItemGrammage(index: number, grammageVal: number | string): void {
    try {
      const grammage = (Number(grammageVal) || 1000) as (140 | 250 | 500 | 1000);
      this.items.update(list =>
        list.map((item: EditableOrderItem, i: number) => {
          if (i === index) {
            const newPrice = this.getPriceFor(item.fruitName, grammage);
            return { ...item, grammage, unitPrice: newPrice };
          }
          return item;
        })
      );
    } catch (error: unknown) {
      console.error('Error updating voice order item grammage:', error);
    }
  }

  /**
   * Increments the quantity of an item row by 1.
   */
  incrementQuantity(index: number): void {
    try {
      this.items.update(list =>
        list.map((item: EditableOrderItem, i: number) => {
          if (i === index) {
            return { ...item, quantity: item.quantity + 1 };
          }
          return item;
        })
      );
    } catch (error: unknown) {
      console.error('Error incrementing item quantity:', error);
    }
  }

  /**
   * Decrements the quantity of an item row by 1 down to a minimum of 1.
   */
  decrementQuantity(index: number): void {
    try {
      this.items.update(list =>
        list.map((item: EditableOrderItem, i: number) => {
          if (i === index && item.quantity > 1) {
            return { ...item, quantity: item.quantity - 1 };
          }
          return item;
        })
      );
    } catch (error: unknown) {
      console.error('Error decrementing item quantity:', error);
    }
  }

  /**
   * Resolves the real unit price for a fruit and grammage from StateService without hardcoded fallbacks.
   */
  getPriceFor(fruitName: string, grammage: 140 | 250 | 500 | 1000): number {
    try {
      if (!fruitName) return 0;
      const fruit = this.stateService
        .fruits()
        .find((f: FruitConfig) => f.name.toLowerCase() === fruitName.toLowerCase());
      if (!fruit || !fruit.prices) {
        return 0;
      }
      const priceRecord = fruit.prices as unknown as Record<string, number | undefined>;
      const szKey = `g${grammage}`;
      if (priceRecord[szKey] !== undefined) {
        return priceRecord[szKey] ?? 0;
      }
      if (grammage === 140 && fruit.prices.g100 !== undefined) {
        return fruit.prices.g100 ?? 0;
      }
      return 0;
    } catch (error: unknown) {
      console.error('Error resolving fruit price:', error);
      return 0;
    }
  }

  /**
   * Submits the transcribed voice order, creates the official order in StateService, and sends WhatsApp confirmation.
   */
  async submitOrder(): Promise<void> {
    try {
      const active = this.voiceOrdersService.activeVoiceOrder();
      if (!active) return;

      if (this.items().length === 0) {
        return;
      }

      this.isSubmitting.set(true);

      try {
        const createdOrder = this.stateService.createOrder({
          clientName: this.clientName(),
          clientPhone: this.clientPhone(),
          clientAddress: this.deliveryAddress(),
          items: this.items().map((i: EditableOrderItem) => ({
            fruitName: i.fruitName,
            grammage: i.grammage,
            quantity: i.quantity,
            unitPrice: i.unitPrice
          })),
          notes: `Pedido originado por nota de voz WhatsApp. ${this.customNotes() || ''}`.trim(),
          paymentMethodName: this.paymentMethod()
        });

        const payload: ConfirmVoiceOrderPayload = {
          messageId: active.id,
          orderId: createdOrder.orderId,
          customerName: this.clientName(),
          customerPhone: this.clientPhone(),
          items: this.items().map((i: EditableOrderItem) => ({
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

        await this.voiceOrdersService.confirmAndSendWhatsApp(active.id, payload);

        try {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch {
          void 0;
        }
      } catch (err: unknown) {
        console.error('Error processing voice order:', err);
      } finally {
        this.isSubmitting.set(false);
      }
    } catch (error: unknown) {
      console.error('Error submitting voice order:', error);
    }
  }

  /**
   * Selects a voice order message from the sidebar queue.
   */
  selectOrder(order: VoiceOrderMessageDto): void {
    try {
      this.voiceOrdersService.selectOrder(order);
    } catch (error: unknown) {
      console.error('Error selecting voice order:', error);
    }
  }

  /**
   * Resets the audio player and closes the voice orders modal.
   */
  closeModal(): void {
    try {
      this.resetAudioPlayer();
      this.voiceOrdersService.closeModal();
    } catch (error: unknown) {
      console.error('Error closing voice orders modal:', error);
    }
  }

  /**
   * Triggers a simulated incoming voice note for testing purposes.
   */
  simulateNewAudio(): void {
    try {
      this.voiceOrdersService.simulateIncomingAudio();
    } catch (error: unknown) {
      console.error('Error simulating new audio:', error);
    }
  }
}
