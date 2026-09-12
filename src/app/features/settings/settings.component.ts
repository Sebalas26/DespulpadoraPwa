import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { FruitConfig, INITIAL_PROMOTIONS } from '../../core/data/initial-data';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  readonly stateService = inject(StateService);
  readonly notification = inject(NotificationService);

  readonly promotions = signal(INITIAL_PROMOTIONS);

  // Modals
  readonly showAdjustModal = signal<boolean>(false);
  readonly showEditFruitModal = signal<boolean>(false);
  readonly selectedFruitForAdjust = signal<FruitConfig | null>(null);

  // Adjust Form
  readonly adjustGrammage = signal<'g140' | 'g250' | 'g500' | 'g1000'>('g140');
  readonly adjustDelta = signal<number>(10);
  readonly adjustReason = signal<string>('Inventario físico de control');

  openAdjust(fruit: FruitConfig) {
    this.selectedFruitForAdjust.set(fruit);
    this.showAdjustModal.set(true);
  }

  submitAdjust(isAddition: boolean) {
    const fruit = this.selectedFruitForAdjust();
    if (!fruit) return;

    const delta = isAddition ? Math.abs(this.adjustDelta()) : -Math.abs(this.adjustDelta());
    this.stateService.adjustStock(fruit.name, this.adjustGrammage(), delta);
    this.showAdjustModal.set(false);
  }

  formatCOP(num: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num);
  }
}
