import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClientDto, OrderDto } from '../../core/models/business.models';

@Component({
  selector: 'app-accounting',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accounting.component.html',
  styleUrls: ['./accounting.component.scss']
})
export class AccountingComponent {
  readonly stateService = inject(StateService);
  readonly notification = inject(NotificationService);

  // Controls visibility of "Nuevo Cliente / Editar Cliente" modal
  readonly showClientForm = signal<boolean>(false);

  // Selected client for "Detalle de ventas" history modal
  readonly selectedHistoryClient = signal<ClientDto | null>(null);

  // Client Form State (Creation / Editing)
  readonly editingClientId = signal<number | null>(null);
  readonly fullName = signal<string>('');
  readonly identificationNumber = signal<string>('');
  readonly phone = signal<string>('');
  readonly email = signal<string>('');
  readonly address = signal<string>('');
  readonly city = signal<string>('Bogotá D.C.');
  readonly notes = signal<string>('');

  // Search filter for registered clients
  readonly searchQuery = signal<string>('');

  readonly filteredClients = computed<ClientDto[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.stateService.clients();
    if (!q) return list;
    return list.filter(c => {
      const hay = `${c.fullName} ${c.identificationNumber} ${c.phone} ${c.email || ''} ${c.address || ''} ${c.city || ''}`.toLowerCase();
      return hay.includes(q);
    });
  });

  // Get all orders (purchases) made by a specific client
  getClientOrders(client: ClientDto): OrderDto[] {
    const nameNorm = client.fullName.trim().toLowerCase();
    const phoneNorm = (client.phone || '').replace(/\s+/g, '');

    return this.stateService
      .orders()
      .filter(o => {
        if (o.status === 'CANCELLED') return false;
        if (o.clientId === client.clientId) return true;
        if (o.clientName && o.clientName.trim().toLowerCase() === nameNorm) return true;
        if (phoneNorm && o.clientPhone && o.clientPhone.replace(/\s+/g, '') === phoneNorm) return true;
        return false;
      })
      .sort((a, b) => (b.orderDate || b.createdAt).localeCompare(a.orderDate || a.createdAt));
  }

  getClientPurchaseCount(client: ClientDto): number {
    return this.getClientOrders(client).length;
  }

  getClientTotalSpent(client: ClientDto): number {
    return this.getClientOrders(client).reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }

  // Computed summary for the currently opened client sales history modal
  readonly selectedClientHistoryStats = computed(() => {
    const client = this.selectedHistoryClient();
    if (!client) {
      return {
        orders: [] as OrderDto[],
        recentOrders: [] as OrderDto[],
        totalPurchases: 0,
        totalSpent: 0,
        totalUnits: 0,
        totalKg: 0,
        lastPurchaseDate: 'Sin compras'
      };
    }

    const orders = this.getClientOrders(client);
    const totalSpent = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    let totalUnits = 0;
    let totalKg = 0;

    orders.forEach(o => {
      o.items.forEach(item => {
        const qty = item.quantity || 0;
        const gram = item.grammage || 250;
        totalUnits += qty;
        totalKg += (qty * gram) / 1000;
      });
    });

    const lastDate = orders.length > 0
      ? (orders[0].orderDate || orders[0].createdAt.substring(0, 10))
      : 'Sin compras registradas';

    return {
      orders,
      recentOrders: orders.slice(0, 6),
      totalPurchases: orders.length,
      totalSpent,
      totalUnits,
      totalKg: Number(totalKg.toFixed(1)),
      lastPurchaseDate: lastDate
    };
  });

  formatOrderItemsCompact(order: OrderDto): string {
    if (!order.items || order.items.length === 0) return 'Sin ítems';
    return order.items
      .map(i => `${i.quantity}x ${i.fruitName} ${i.grammage}g`)
      .join(' · ');
  }

  reorderPurchase(order: OrderDto, client: ClientDto) {
    const newOrder = this.stateService.createOrder({
      clientName: client.fullName || order.clientName,
      clientPhone: client.phone || order.clientPhone,
      clientAddress: client.address || order.clientAddress,
      paymentMethodName: order.paymentMethodName || 'Transferencia Bancolombia',
      notes: `Pedido repetido desde histórico (${order.orderNumber})`,
      items: order.items.map(i => ({
        fruitName: i.fruitName || 'Maracuyá',
        grammage: (i.grammage as 140 | 250 | 500 | 1000) || 250,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      }))
    });

    // Ensure the new order links to this clientId
    this.stateService.orders.update(list =>
      list.map(o => (o.orderId === newOrder.orderId ? { ...o, clientId: client.clientId } : o))
    );
  }

  openCreateClient() {
    this.resetForm();
    this.showClientForm.set(true);
  }

  closeClientForm() {
    this.resetForm();
    this.showClientForm.set(false);
  }

  openClientSalesHistory(client: ClientDto) {
    this.selectedHistoryClient.set(client);
  }

  closeClientSalesHistory() {
    this.selectedHistoryClient.set(null);
  }

  saveClient() {
    const name = this.fullName().trim();
    const idNum = this.identificationNumber().trim();
    const ph = this.phone().trim();

    if (!name) {
      this.notification.warning('Nombre requerido', 'Ingresa el nombre o razón social del cliente.');
      return;
    }
    if (!ph) {
      this.notification.warning('Teléfono requerido', 'Ingresa el número de contacto o WhatsApp del cliente.');
      return;
    }

    const editId = this.editingClientId();
    if (editId !== null) {
      this.stateService.updateClient(editId, {
        fullName: name,
        identificationNumber: idNum || 'N/A',
        phone: ph,
        email: this.email().trim(),
        address: this.address().trim(),
        city: this.city().trim() || 'Bogotá D.C.',
        notes: this.notes().trim()
      });
    } else {
      this.stateService.createClient({
        fullName: name,
        identificationNumber: idNum || '900.000.000-1',
        phone: ph,
        email: this.email().trim(),
        address: this.address().trim(),
        city: this.city().trim() || 'Bogotá D.C.',
        notes: this.notes().trim()
      });
    }

    this.closeClientForm();
  }

  editClient(client: ClientDto) {
    this.editingClientId.set(client.clientId);
    this.fullName.set(client.fullName);
    this.identificationNumber.set(client.identificationNumber);
    this.phone.set(client.phone);
    this.email.set(client.email || '');
    this.address.set(client.address || '');
    this.city.set(client.city || 'Bogotá D.C.');
    this.notes.set(client.notes || '');
    this.showClientForm.set(true);
  }

  deleteClient(clientId: number) {
    this.stateService.deleteClient(clientId);
    if (this.editingClientId() === clientId) {
      this.closeClientForm();
    }
    if (this.selectedHistoryClient()?.clientId === clientId) {
      this.closeClientSalesHistory();
    }
  }

  resetForm() {
    this.editingClientId.set(null);
    this.fullName.set('');
    this.identificationNumber.set('');
    this.phone.set('');
    this.email.set('');
    this.address.set('');
    this.city.set('Bogotá D.C.');
    this.notes.set('');
  }

  getOrderStatusLabel(status: string): string {
    switch (status) {
      case 'DELIVERED':
        return 'Entregado';
      case 'DISPATCHED':
        return 'En ruta';
      case 'BILLED':
        return 'Facturado';
      case 'PICKING':
        return 'En alistamiento';
      default:
        return 'Pendiente';
    }
  }

  formatCOP(val: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val || 0);
  }
}
