import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { FruitConfig } from '../../core/data/initial-data';
import { ProductionBatchDto } from '../../core/models/business.models';
import confetti from 'canvas-confetti';

const EMPTY_FRUIT_CONFIG: FruitConfig = {
  id: '',
  fruitId: 0,
  name: '',
  scientificName: '',
  emoji: '',
  color: '',
  bgColor: '',
  yieldRate: 0,
  waterAdditionDefault: 0,
  freshStockKg: 0,
  category: 'PULPAS',
  prices: { g140: 0, g250: 0, g500: 0, g1000: 0 },
  stock: { g140: 0, g250: 0, g500: 0, g1000: 0 },
  minStock: { g140: 0, g250: 0, g500: 0, g1000: 0 }
};

/**
 * Component for production batch formulation, mass balance calculation, and loss audit reconciliation.
 */
@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calculator.component.html',
  styleUrls: ['./calculator.component.scss']
})
export class CalculatorComponent {
  readonly stateService = inject(StateService);
  private readonly route = inject(ActivatedRoute);

  readonly activeTab = signal<'formulation' | 'loss-audit'>('formulation');

  readonly selectedFruitId = signal<string>('');
  readonly freshKg = signal<number>(0);
  readonly waterPercent = signal<number>(0);
  readonly operator = signal<string>('');
  readonly brixValue = signal<string>('');
  readonly costPerKg = signal<number>(0);

  readonly distribution = signal<{ g140: number; g250: number; g500: number; g1000: number }>({
    g140: 50,
    g250: 30,
    g500: 10,
    g1000: 10
  });

  readonly filterFruit = signal<string>('all');
  readonly searchTerm = signal<string>('');

  readonly totalLossUnits = computed<number>(() => {
    try {
      return this.stateService.idealVsRealLossAudit().reduce((sum, a) => sum + Math.max(0, -a.unitsDifference), 0);
    } catch {
      return 0;
    }
  });

  readonly totalLossMoney = computed<number>(() => {
    try {
      return this.stateService.idealVsRealLossAudit().reduce((sum, a) => sum + Math.max(0, -a.moneyDifference), 0);
    } catch {
      return 0;
    }
  });

  readonly totalIdealRevenue = computed<number>(() => {
    try {
      return this.stateService.idealVsRealLossAudit().reduce((sum, a) => sum + a.idealRevenue, 0);
    } catch {
      return 0;
    }
  });

  readonly totalRealRevenue = computed<number>(() => {
    try {
      return this.stateService.idealVsRealLossAudit().reduce((sum, a) => sum + a.realRevenue, 0);
    } catch {
      return 0;
    }
  });

  readonly selectedFruit = computed<FruitConfig>(() => {
    try {
      const fruits = this.stateService.fruits();
      const found = fruits.find(f => f.id === this.selectedFruitId());
      return found || fruits[0] || EMPTY_FRUIT_CONFIG;
    } catch {
      return EMPTY_FRUIT_CONFIG;
    }
  });

  readonly yieldRate = computed<number>(() => {
    try {
      return this.selectedFruit().yieldRate || 0;
    } catch {
      return 0;
    }
  });

  readonly fruitPulpWeight = computed<number>(() => {
    try {
      return this.freshKg() * this.yieldRate();
    } catch {
      return 0;
    }
  });

  readonly waterKg = computed<number>(() => {
    try {
      return this.freshKg() * (this.waterPercent() / 100);
    } catch {
      return 0;
    }
  });

  readonly totalNetPulpKg = computed<number>(() => {
    try {
      return Number((this.fruitPulpWeight() + this.waterKg()).toFixed(1));
    } catch {
      return 0;
    }
  });

  readonly wasteKg = computed<number>(() => {
    try {
      return Number(Math.max(0, this.freshKg() - this.fruitPulpWeight()).toFixed(1));
    } catch {
      return 0;
    }
  });

  readonly effectiveYield = computed<number>(() => {
    try {
      return this.freshKg() > 0 ? Number(((this.totalNetPulpKg() / this.freshKg()) * 100).toFixed(1)) : 0;
    } catch {
      return 0;
    }
  });

  readonly portions140 = computed<number>(() => {
    try {
      return Math.floor((this.totalNetPulpKg() * (this.distribution().g140 / 100)) / 0.14);
    } catch {
      return 0;
    }
  });

  readonly portions250 = computed<number>(() => {
    try {
      return Math.floor((this.totalNetPulpKg() * (this.distribution().g250 / 100)) / 0.25);
    } catch {
      return 0;
    }
  });

  readonly portions500 = computed<number>(() => {
    try {
      return Math.floor((this.totalNetPulpKg() * (this.distribution().g500 / 100)) / 0.50);
    } catch {
      return 0;
    }
  });

  readonly portions1000 = computed<number>(() => {
    try {
      return Math.floor((this.totalNetPulpKg() * (this.distribution().g1000 / 100)) / 1.0);
    } catch {
      return 0;
    }
  });

  readonly estimatedValue = computed<number>(() => {
    try {
      const p = this.selectedFruit().prices;
      return (
        (this.portions140() * p.g140) +
        (this.portions250() * p.g250) +
        (this.portions500() * p.g500) +
        (this.portions1000() * p.g1000)
      );
    } catch {
      return 0;
    }
  });

  readonly filteredBatches = computed<ProductionBatchDto[]>(() => {
    try {
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
    } catch {
      return [];
    }
  });

  /**
   * Initializes the component and binds route query parameters to the active tab.
   */
  constructor() {
    try {
      this.route.queryParams.subscribe(params => {
        if (params['tab'] === 'loss-audit') {
          this.activeTab.set('loss-audit');
        } else if (params['tab'] === 'formulation') {
          this.activeTab.set('formulation');
        }
      });
    } catch {
      this.activeTab.set('formulation');
    }
  }

  /**
   * Selects a fruit configuration and applies its default water addition percentage.
   */
  selectFruit(fruit: FruitConfig): void {
    try {
      this.selectedFruitId.set(fruit.id);
      this.waterPercent.set(Math.round(fruit.waterAdditionDefault * 100));
    } catch {
      this.selectedFruitId.set('');
    }
  }

  /**
   * Updates the packaging distribution percentage for a specific presentation.
   */
  updateDistribution(key: 'g140' | 'g250' | 'g500' | 'g1000', value: number): void {
    try {
      const val = Math.max(0, Math.min(100, Number(value) || 0));
      this.distribution.update(d => ({ ...d, [key]: val }));
    } catch {
      return;
    }
  }

  /**
   * Registers a new production batch in the global application state.
   */
  saveBatch(): void {
    try {
      this.stateService.createBatch({
        fruitId: this.selectedFruit().id,
        fruitName: this.selectedFruit().name,
        grossKg: this.freshKg(),
        waterPct: this.waterPercent(),
        costPerKg: this.costPerKg(),
        operatorName: this.operator(),
        notes: `Brix ${this.brixValue()}° - Formulación estándar`
      });

      confetti({
        particleCount: 90,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      return;
    }
  }

  /**
   * Formats a numeric value as Colombian Peso currency.
   */
  formatCOP(num: number): string {
    try {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
      }).format(num || 0);
    } catch {
      return '$0';
    }
  }
}
