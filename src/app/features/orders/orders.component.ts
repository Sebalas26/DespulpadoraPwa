import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { OrderDto, OrderStatus } from '../../core/models/business.models';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent {
  readonly stateService = inject(StateService);
  readonly notification = inject(NotificationService);

  // Active Sub-tab
  readonly activeSubTab = signal<'picking' | 'facturacion' | 'despachos'>('picking');

  // Search & Filter
  readonly searchTerm = signal<string>('');
  readonly statusFilter = signal<string>('all');

  readonly pickingOrdersCount = computed(() =>
    this.stateService.orders().filter(o => o.status === 'PENDING' || o.status === 'PICKING').length
  );
  readonly billedOrdersCount = computed(() =>
    this.stateService.orders().filter(o => o.status === 'BILLED').length
  );
  readonly dispatchedOrdersCount = computed(() =>
    this.stateService.orders().filter(o => o.status === 'DISPATCHED').length
  );

  // Modal Dialogs
  readonly showWhatsAppModal = signal<boolean>(false);
  readonly showNewOrderModal = signal<boolean>(false);
  readonly showInvoiceModal = signal<boolean>(false);
  readonly selectedOrderForInvoice = signal<OrderDto | null>(null);

  // WhatsApp Simulator inputs
  readonly whatsAppText = signal<string>(`Hola Pulpas del Valle, requiero urgente para Restaurante El Portal del Valle:
- 10 pulpas de Maracuyá de 1000g
- 8 pulpas de Mango Tommy de 1000g
- 6 pulpas de Mora de 500g
Dirección: Calle 45 # 12-30, Cali
Contacto: Chef Carlos Gómez (315 456 7890)
Pago por Transferencia Bancolombia`);

  // New Manual Order Form inputs
  readonly manualClientName = signal<string>('');
  readonly manualPhone = signal<string>('');
  readonly manualAddress = signal<string>('');
  readonly manualPaymentMethod = signal<string>('Transferencia Bancolombia');
  readonly manualNotes = signal<string>('');
  readonly manualItems = signal<{ fruitName: string; grammage: 140 | 250 | 500 | 1000; quantity: number; unitPrice: number }[]>([
    { fruitName: 'Maracuyá', grammage: 1000, quantity: 5, unitPrice: 11000 }
  ]);

  // Orders Filtered by Tab & Search
  readonly tabOrders = computed(() => {
    const tab = this.activeSubTab();
    const search = this.searchTerm().toLowerCase();
    let list = this.stateService.orders();

    if (tab === 'picking') {
      list = list.filter(o => o.status === 'PENDING' || o.status === 'PICKING');
    } else if (tab === 'facturacion') {
      list = list.filter(o => o.status === 'BILLED' || o.status === 'PICKING');
    } else if (tab === 'despachos') {
      list = list.filter(o => o.status === 'DISPATCHED' || o.status === 'DELIVERED');
    }

    if (search) {
      list = list.filter(o =>
        o.orderNumber.toLowerCase().includes(search) ||
        o.clientName.toLowerCase().includes(search) ||
        o.clientPhone?.toLowerCase().includes(search)
      );
    }

    return list;
  });

  // Picking checklist toggle
  toggleItemPicked(orderId: number, fruitId: number, grammage: number, totalQty: number, currentPicked?: number) {
    const nextPicked = (currentPicked || 0) >= totalQty ? 0 : totalQty;
    this.stateService.updateItemPickedQuantity(orderId, fruitId, grammage, nextPicked);

    if (nextPicked === totalQty) {
      try {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      } catch {}
    }
  }

  advanceOrderStatus(order: OrderDto, nextStatus: OrderStatus) {
    this.stateService.updateOrderStatus(order.orderId, nextStatus);
    if (nextStatus === 'DELIVERED') {
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
      } catch {}
    }
  }

  // Invoice Modal Opener
  openInvoice(order: OrderDto) {
    this.selectedOrderForInvoice.set(order);
    this.showInvoiceModal.set(true);
  }

  printInvoice() {
    window.print();
  }

  // WhatsApp Parsing Engine
  parseAndCreateWhatsAppOrder() {
    const text = this.whatsAppText();
    let clientName = 'Cliente WhatsApp';
    let phone = '310 000 0000';
    let address = 'Sede Principal';

    const lines = text.split('\n');
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('para ') || lower.includes('nombre:') || lower.includes('contacto:')) {
        clientName = line.replace(/(hola|requiero|urgente|pedido|para|nombre:|contacto:)/gi, '').trim() || clientName;
      }
      if (lower.includes('dirección:') || lower.includes('calle') || lower.includes('carrera') || lower.includes('av')) {
        address = line.replace(/dirección:/gi, '').trim() || address;
      }
      const phoneMatch = line.match(/\b3\d{2}[- ]?\d{3}[- ]?\d{4}\b/);
      if (phoneMatch) phone = phoneMatch[0];
    });

    // Extract items
    const parsedItems: { fruitName: string; grammage: 140 | 250 | 500 | 1000; quantity: number; unitPrice: number }[] = [];

    this.stateService.fruits().forEach(fruit => {
      const baseName = fruit.name.split(' ')[0];
      const regex = new RegExp(`(\\d+)\\s*(pulpas?|unidades?|de)?\\s*(de)?\\s*${baseName}`, 'i');
      const match = text.match(regex);
      if (match) {
        const qty = parseInt(match[1], 10) || 5;
        let grammage: 140 | 250 | 500 | 1000 = 140;

        if (text.toLowerCase().includes(baseName.toLowerCase()) && text.toLowerCase().includes('1000g')) {
          grammage = 1000;
        } else if (text.toLowerCase().includes('500g')) {
          grammage = 500;
        } else if (text.toLowerCase().includes('250g')) {
          grammage = 250;
        }

        const priceKey = `g${grammage}` as 'g140' | 'g250' | 'g500' | 'g1000';
        const unitPrice = fruit.prices[priceKey] || 5000;

        parsedItems.push({
          fruitName: fruit.name,
          grammage,
          quantity: qty,
          unitPrice
        });
      }
    });

    if (parsedItems.length === 0) {
      // Fallback sample item
      parsedItems.push({
        fruitName: 'Maracuyá',
        grammage: 1000,
        quantity: 10,
        unitPrice: 11000
      });
    }

    this.stateService.createOrder({
      clientName,
      clientPhone: phone,
      clientAddress: address,
      items: parsedItems,
      notes: 'Pedido procesado automáticamente desde WhatsApp',
      paymentMethodName: 'Transferencia Bancolombia'
    });

    this.showWhatsAppModal.set(false);
    this.activeSubTab.set('picking');

    try {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    } catch {}
  }

  // Manual Order Management
  addManualItem() {
    this.manualItems.update(list => [
      ...list,
      { fruitName: 'Mango Tommy', grammage: 1000, quantity: 1, unitPrice: 10500 }
    ]);
  }

  removeManualItem(index: number) {
    this.manualItems.update(list => list.filter((_, i) => i !== index));
  }

  updateManualItemFruit(index: number, fruitName: string) {
    const fruit = this.stateService.fruits().find(f => f.name === fruitName);
    this.manualItems.update(list => list.map((item, i) => {
      if (i === index && fruit) {
        const pKey = `g${item.grammage}` as 'g140' | 'g250' | 'g500' | 'g1000';
        return { ...item, fruitName: fruit.name, unitPrice: fruit.prices[pKey] };
      }
      return item;
    }));
  }

  updateManualItemGrammage(index: number, grammage: 140 | 250 | 500 | 1000) {
    this.manualItems.update(list => list.map((item, i) => {
      if (i === index) {
        const fruit = this.stateService.fruits().find(f => f.name === item.fruitName);
        const pKey = `g${grammage}` as 'g140' | 'g250' | 'g500' | 'g1000';
        const price = fruit ? fruit.prices[pKey] : item.unitPrice;
        return { ...item, grammage, unitPrice: price };
      }
      return item;
    }));
  }

  submitManualOrder() {
    if (!this.manualClientName() || this.manualItems().length === 0) {
      this.notification.warning('Campos incompletos', 'Indique el nombre del cliente y al menos 1 producto');
      return;
    }

    this.stateService.createOrder({
      clientName: this.manualClientName(),
      clientPhone: this.manualPhone(),
      clientAddress: this.manualAddress(),
      items: this.manualItems(),
      paymentMethodName: this.manualPaymentMethod(),
      notes: this.manualNotes()
    });

    this.showNewOrderModal.set(false);
    this.manualClientName.set('');
    this.manualPhone.set('');
    this.manualAddress.set('');
  }

  formatCOP(val: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  }
}
