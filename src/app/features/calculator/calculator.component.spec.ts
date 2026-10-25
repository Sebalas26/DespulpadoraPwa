import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { CalculatorComponent } from './calculator.component';
import { StateService } from '../../core/services/state.service';
import { FruitConfig } from '../../core/data/initial-data';
import { IdealVsRealLossAuditDto, ProductionBatchDto } from '../../core/models/business.models';

/**
 * Unit tests for CalculatorComponent verifying zeroed initial signals, mass balance formulas, and batch creation.
 */
describe('CalculatorComponent', () => {
  let component: CalculatorComponent;
  let fixture: ComponentFixture<CalculatorComponent>;
  let createBatchSpy: jasmine.Spy;

  const mockFruits = signal<FruitConfig[]>([
    {
      id: 'maracuya',
      fruitId: 1,
      name: 'Maracuyá',
      scientificName: 'Passiflora edulis',
      emoji: '',
      color: '#eab308',
      bgColor: '#fef9c3',
      yieldRate: 0.5,
      waterAdditionDefault: 0.1,
      freshStockKg: 100,
      category: 'PULPAS',
      prices: { g140: 2000, g250: 3500, g500: 6500, g1000: 12000 },
      stock: { g140: 10, g250: 10, g500: 10, g1000: 10 },
      minStock: { g140: 5, g250: 5, g500: 5, g1000: 5 }
    }
  ]);

  const mockBatches = signal<ProductionBatchDto[]>([
    {
      batchId: 1,
      batchCode: 'LOTE-001',
      fruitId: 1,
      fruitName: 'Maracuyá',
      branchId: 1,
      grossFruitKg: 100,
      pulpProducedKg: 58,
      realYieldPercentage: 58,
      costPerKg: 2500,
      operatorName: 'Operador 1',
      productionDate: '2026-10-01T10:00:00Z',
      createdAt: '2026-10-01T10:00:00Z',
      status: 'COMPLETED'
    }
  ]);

  const mockLossAudit = signal<IdealVsRealLossAuditDto[]>([
    {
      auditId: 1,
      fruitId: 1,
      fruitName: 'Maracuyá',
      periodLabel: '2026-10',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      totalPulpKgProduced: 25,
      unitsProduced: 100,
      unitsBilled: 90,
      unitsDifference: -10,
      differenceUnits: -10,
      idealRevenue: 300000,
      realRevenue: 270000,
      moneyDifference: -30000,
      differenceRevenue: -30000,
      lossPercentage: 10,
      alertLevel: 'NORMAL',
      notes: 'Merma controlada',
      createdAt: '2026-10-31T00:00:00Z'
    }
  ]);

  beforeEach(async () => {
    createBatchSpy = jasmine.createSpy('createBatch');

    const stateServiceMock: Partial<StateService> = {
      fruits: mockFruits,
      batches: mockBatches,
      idealVsRealLossAudit: mockLossAudit,
      createBatch: createBatchSpy
    };

    await TestBed.configureTestingModule({
      imports: [CalculatorComponent],
      providers: [
        { provide: StateService, useValue: stateServiceMock },
        { provide: ActivatedRoute, useValue: { queryParams: of({ tab: 'formulation' }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize with empty/zeroed form signals and no hardcoded defaults', () => {
    expect(component).toBeTruthy();
    expect(component.selectedFruitId()).toBe('');
    expect(component.freshKg()).toBe(0);
    expect(component.waterPercent()).toBe(0);
    expect(component.operator()).toBe('');
    expect(component.brixValue()).toBe('');
    expect(component.costPerKg()).toBe(0);
  });

  it('should compute mass balance and packaging portions when inputs are set', () => {
    component.selectFruit(mockFruits()[0]);
    component.freshKg.set(100);

    expect(component.selectedFruitId()).toBe('maracuya');
    expect(component.waterPercent()).toBe(10);
    expect(component.yieldRate()).toBe(0.5);
    expect(component.fruitPulpWeight()).toBe(50);
    expect(component.waterKg()).toBe(10);
    expect(component.totalNetPulpKg()).toBe(60);
    expect(component.wasteKg()).toBe(50);
    expect(component.effectiveYield()).toBe(60);
    expect(component.portions140()).toBeGreaterThan(0);
    expect(component.estimatedValue()).toBeGreaterThan(0);
  });

  it('should update packaging distribution within 0-100 bounds', () => {
    component.updateDistribution('g140', 40);
    expect(component.distribution().g140).toBe(40);

    component.updateDistribution('g250', 150);
    expect(component.distribution().g250).toBe(100);
  });

  it('should save batch using dynamic costPerKg signal instead of hardcoded 3200', () => {
    component.selectFruit(mockFruits()[0]);
    component.freshKg.set(80);
    component.costPerKg.set(4100);
    component.operator.set('Ana Gómez');
    component.brixValue.set('14.2');

    component.saveBatch();

    expect(createBatchSpy).toHaveBeenCalledWith({
      fruitId: 'maracuya',
      fruitName: 'Maracuyá',
      grossKg: 80,
      waterPct: 10,
      costPerKg: 4100,
      operatorName: 'Ana Gómez',
      notes: 'Brix 14.2° - Formulación estándar'
    });
  });

  it('should compute loss audit totals and filter batches by search term', () => {
    expect(component.totalLossUnits()).toBe(10);
    expect(component.totalLossMoney()).toBe(30000);
    expect(component.totalIdealRevenue()).toBe(300000);
    expect(component.totalRealRevenue()).toBe(270000);

    component.searchTerm.set('LOTE-001');
    expect(component.filteredBatches().length).toBe(1);
    component.searchTerm.set('NON-EXISTENT');
    expect(component.filteredBatches().length).toBe(0);
  });
});
