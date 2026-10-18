import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClientDto } from '../../core/models/business.models';

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

    this.resetForm();
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
  }

  deleteClient(clientId: number) {
    this.stateService.deleteClient(clientId);
    if (this.editingClientId() === clientId) {
      this.resetForm();
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
}
