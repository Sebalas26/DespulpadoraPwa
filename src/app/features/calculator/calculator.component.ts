import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../core/services/state.service';
import { FruitConfig } from '../../core/data/initial-data';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calculator.component.html',
  styleUrls: ['./calculator.component.scss']
})
export class CalculatorComponent {
  readonly stateService = inject(StateService);

  // Form inputs
  readonly selectedFruitId = signal<string>('maracuya');
  readonly freshKg = signal<number>(100);
  readonly waterPercent = signal<number>(8);
  readonly operator = signal<string>('Hernando Ruiz (Jefe de Planta)');
  readonly brixValue = signal<string>('15.0');

  // Packaging distribution %
  readonly distribution = signal<{ g140: number; g250: number; g500: number; g1000: number }>({
    g140: 50,
    g250: 30,
    g500: 10,
    g1000: 10
  });

  // Search & Filter for History
  readonly filterFruit = signal<string>('all');
  readonly searchTerm = signal<string>('');

  // Computed Selected Fruit
  readonly selectedFruit = computed<FruitConfig>(() => {
    const found = this.stateService.fruits().find(f => f.id === this.selectedFruitId());
    return found || this.stateService.fruits()[0];
  });

  // Formulas
  readonly yieldRate = computed(() => this.selectedFruit().yieldRate || 0.6);
  readonly fruitPulpWeight = computed(() => this.freshKg() * this.yieldRate());
  readonly waterKg = computed(() => this.freshKg() * (this.waterPercent() / 100));
  readonly totalNetPulpKg = computed(() => Number((this.fruitPulpWeight() + this.waterKg()).toFixed(1)));
  readonly wasteKg = computed(() => Number(Math.max(0, this.freshKg() - this.fruitPulpWeight()).toFixed(1)));
  readonly effectiveYield = computed(() => {
    return this.freshKg() > 0 ? Number(((this.totalNetPulpKg() / this.freshKg()) * 100).toFixed(1)) : 0;
  });

  // Units per packaging size
  readonly portions140 = computed(() => {
    return Math.floor((this.totalNetPulpKg() * (this.distribution().g140 / 100)) / 0.14);
  });
  readonly portions250 = computed(() => {
    return Math.floor((this.totalNetPulpKg() * (this.distribution().g250 / 100)) / 0.25);
  });
  readonly portions500 = computed(() => {
    return Math.floor((this.totalNetPulpKg() * (this.distribution().g500 / 100)) / 0.50);
  });
  readonly portions1000 = computed(() => {
    return Math.floor((this.totalNetPulpKg() * (this.distribution().g1000 / 100)) / 1.0);
  });

  // Estimated Retail Value
  readonly estimatedValue = computed(() => {
    const p = this.selectedFruit().prices;
    return (
      (this.portions140() * p.g140) +
      (this.portions250() * p.g250) +
      (this.portions500() * p.g500) +
      (this.portions1000() * p.g1000)
    );
  });

  // Filtered Batches
  readonly filteredBatches = computed(() => {
    let list = this.stateService.batches();
    const fruitFilter = this.filterFruit();
    const search = this.searchTerm().toLowerCase();

    if (fruitFilter !== 'all') {
      list = list.filter(b => b.fruitName?.toLowerCase() === fruitFilter.toLowerCase());
    }
    if (search) {
      list = list.filter(b =>
        b.batchCode.toLowerCase().includes(search) ||
        b.fruitName?.toLowerCase().includes(search) ||
        b.operatorName?.toLowerCase().includes(search)
      );
    }
    return list;
  });

  selectFruit(fruit: FruitConfig) {
    this.selectedFruitId.set(fruit.id);
    this.waterPercent.set(Math.round(fruit.waterAdditionDefault * 100));
  }

  updateDistribution(key: 'g140' | 'g250' | 'g500' | 'g1000', value: number) {
    const val = Math.max(0, Math.min(100, Number(value) || 0));
    this.distribution.update(d => ({ ...d, [key]: val }));
  }

  saveBatch() {
    this.stateService.createBatch({
      fruitId: this.selectedFruit().id,
      fruitName: this.selectedFruit().name,
      grossKg: this.freshKg(),
      waterPct: this.waterPercent(),
      costPerKg: 3200,
      operatorName: this.operator(),
      notes: `Brix ${this.brixValue()}° - Formulación estándar`
    });

    // Confetti
    try {
      confetti({
        particleCount: 90,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  }

  formatCOP(num: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num);
  }
}
