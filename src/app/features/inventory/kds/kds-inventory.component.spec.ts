import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { KdsInventoryComponent } from './kds-inventory.component';
import { StateService } from '../../../core/services/state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FruitConfig, ProductVariantDto } from '../../../core/models/business.models';

/**
 * Unit tests for KdsInventoryComponent verifying real yieldRate pulp estimation and stock adjustments.
 */
describe('KdsInventoryComponent', () => {
  let component: KdsInventoryComponent;
  let fixture: ComponentFixture<KdsInventoryComponent>;
  let adjustFreshFruitStockSpy: jasmine.Spy;
  let adjustVariantStockSpy: jasmine.Spy;

  const mockFruits = signal<FruitConfig[]>([
    {
      id: 'mora',
      fruitId: 1,
      name: 'Mora',
      scientificName: 'Rubus glaucus',
      emoji: '',
      color: '#16a34a',
      bgColor: '#f0fdf4',
      yieldRate: 0.8,
      waterAdditionDefault: 0.05,
      freshStockKg: 100,
      category: 'PULPAS',
      prices: { g140: 2000, g250: 3500, g500: 6500, g1000: 12000 },
      stock: { g140: 10, g250: 20, g500: 10, g1000: 5 },
      minStock: { g140: 5, g250: 5, g500: 5, g1000: 5 }
    },
    {
      id: 'lulo',
      fruitId: 2,
      name: 'Lulo',
      scientificName: 'Solanum quitoense',
      emoji: '',
      color: '#10b981',
      bgColor: '#ecfdf5',
      yieldRate: 0.5,
      waterAdditionDefault: 0.05,
      freshStockKg: 40,
      category: 'PULPAS',
      prices: { g140: 2200, g250: 3800, g500: 7000, g1000: 13000 },
      stock: { g140: 2, g250: 10, g500: 10, g1000: 10 },
      minStock: { g140: 5, g250: 5, g500: 5, g1000: 5 }
    }
  ]);

  const mockProductVariants = signal<ProductVariantDto[]>([
    {
      variantId: 10,
      fruitId: 1,
      fruitName: 'Mora',
      category: 'PULPAS',
      name: 'Mora 1000g',
      sku: 'MOR-1000',
      grammage: 1000,
      basePrice: 12000,
      unitCost: 7000,
      currentStock: 25,
      minStockAlert: 5,
      isActive: true
    }
  ]);

  beforeEach(async () => {
    adjustFreshFruitStockSpy = jasmine.createSpy('adjustFreshFruitStock');
    adjustVariantStockSpy = jasmine.createSpy('adjustVariantStock');

    const stateServiceMock: Partial<StateService> = {
      fruits: mockFruits,
      productVariants: mockProductVariants,
      totalFreshStockKg: signal<number>(140) as unknown as StateService['totalFreshStockKg'],
      totalStockKg: signal<number>(25) as unknown as StateService['totalStockKg'],
      adjustFreshFruitStock: adjustFreshFruitStockSpy,
      adjustVariantStock: adjustVariantStockSpy
    };

    const notificationMock: Partial<NotificationService> = {
      success: jasmine.createSpy('success'),
      warning: jasmine.createSpy('warning'),
      error: jasmine.createSpy('error'),
      info: jasmine.createSpy('info')
    };

    await TestBed.configureTestingModule({
      imports: [KdsInventoryComponent],
      providers: [
        provideRouter([]),
        { provide: StateService, useValue: stateServiceMock },
        { provide: NotificationService, useValue: notificationMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KdsInventoryComponent);
    component = fixture.componentInstance;
    component.soundEnabled.set(false);
    fixture.detectChanges();
  });

  it('should create and compute estimatedPulpKg from each fruit real yieldRate', () => {
    expect(component).toBeTruthy();
    expect(component.estimatedPulpKg()).toBe(100);
  });

  it('should compute totalPulpUnits and lowStockFruitsCount accurately', () => {
    expect(component.totalPulpUnits()).toBe(25);
    expect(component.lowStockFruitsCount()).toBe(1);
  });

  it('should adjust fresh fruit stock and record transaction in adjustFruit', () => {
    component.adjustFruit('mora', 'Mora', 15);
    expect(adjustFreshFruitStockSpy).toHaveBeenCalledWith('mora', 15);
    expect(component.recentTransactions().length).toBe(1);
    expect(component.recentTransactions()[0].name).toBe('Mora');
    expect(component.recentTransactions()[0].delta).toBe(15);
  });

  it('should adjust variant stock and record transaction in adjustVariant', () => {
    component.adjustVariant(10, 'Mora 1000g', 5);
    expect(adjustVariantStockSpy).toHaveBeenCalledWith(10, 5);
    expect(component.recentTransactions().length).toBe(1);
    expect(component.recentTransactions()[0].type).toBe('variant');
  });

  it('should apply numpad custom adjustment', () => {
    component.openNumpad('variant', 10, 'Mora 1000g', 25, 'uds');
    component.tapDigit('1');
    component.tapDigit('2');
    component.confirmNumpadAdjustment();

    expect(adjustVariantStockSpy).toHaveBeenCalledWith(10, 12);
    expect(component.showNumpadModal()).toBeFalse();
  });
});
