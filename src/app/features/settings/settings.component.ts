import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { RealtimeSyncService } from '../../core/services/realtime-sync.service';
import {
  WhatsAppBotConfigDto,
  WhatsAppGatewayService,
  WhatsAppGatewayStatusDto,
  WhatsAppIncomingOrderRecord,
  WhatsAppSendResponseDto,
  WhatsAppSimulateResponseDto,
  WhatsAppSyncContextResponseDto
} from '../../core/services/whatsapp-gateway.service';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_COMPANY_CONFIG,
  DEFAULT_GRAMMAGES,
  FruitConfig,
  INITIAL_PROMOTIONS,
  PromotionConfig
} from '../../core/data/initial-data';
import {
  InventoryCategoryConfig,
  InventoryColumnConfig,
  InventoryGrammageConfig,
  InventoryMovementRecordDto,
  ProductCategory,
  ProductVariantDto,
  CompanyConfig,
  PaymentMethodDto,
  ShiftScheduleConfig
} from '../../core/models/business.models';
import { AuthService } from '../../core/services/auth.service';
import { AdminUsersComponent } from '../admin/users/users.component';
import { AdminRolesComponent } from '../admin/roles/roles.component';
import { SystemCatalogComponent } from '../admin/system-catalog/system-catalog.component';
import { CopCurrencyInputDirective } from '../../shared/directives/cop-currency-input.directive';

const DEFAULT_COLUMNS: InventoryColumnConfig[] = [
  { key: 'product', label: 'Producto & SKU', description: 'Nombre comercial del producto y código SKU único', visible: true, locked: true },
  { key: 'category', label: 'Línea / Categoría', description: 'Línea o familia de producto categorizado', visible: true },
  { key: 'grammage', label: 'Presentación', description: 'Gramaje del paquete por unidad (g)', visible: true },
  { key: 'unitCost', label: 'Costo Producción', description: 'Costo unitario directo estimado', visible: true },
  { key: 'basePrice', label: 'Precio Venta', description: 'Precio comercial de venta al público en COP', visible: true },
  { key: 'margin', label: 'Margen Unitario', description: 'Ganancia neta y margen porcentual', visible: true },
  { key: 'currentStock', label: 'Stock en Inventario', description: 'Existencias físicas en inventario en tiempo real', visible: true },
  { key: 'status', label: 'Alerta Stock', description: 'Aviso visual cuando el inventario está bajo el mínimo', visible: true },
  { key: 'quickAdjust', label: 'Ajuste Rápido', description: 'Botones instantáneos para sumar o restar existencias (-10, +10, +50)', visible: true },
  { key: 'actions', label: 'Acciones', description: 'Opciones de edición rápida y retiro de presentaciones', visible: true }
];

/**
 * Pagination range summary for inventory tables.
 */
export interface PaginationSummary {
  start: number;
  end: number;
  total: number;
}

/**
 * Component for managing general company settings, inventory variants, fresh fruit stock, and system parameters.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminUsersComponent,
    AdminRolesComponent,
    SystemCatalogComponent,
    CopCurrencyInputDirective
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  readonly authService = inject(AuthService);
  readonly stateService = inject(StateService);
  readonly notification = inject(NotificationService);
  readonly realtimeSync = inject(RealtimeSyncService);
  readonly whatsAppGateway = inject(WhatsAppGatewayService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly Math = Math;

  readonly whatsAppGatewayStatus = signal<WhatsAppGatewayStatusDto>({
    status: 'DISCONNECTED',
    connected: false,
    qrDataUrl: null,
    phoneNumber: null,
    name: null
  });
  readonly isLoadingWhatsAppStatus = signal<boolean>(false);
  readonly isSendingWhatsAppTest = signal<boolean>(false);
  readonly whatsAppTestPhone = signal<string>('');
  readonly whatsAppTestMessage = signal<string>('');

  readonly whatsAppBotConfig = signal<WhatsAppBotConfigDto>({
    ok: false,
    botEnabled: true,
    autoReplyEnabled: true,
    hasGeminiApiKey: false,
    geminiApiKeyMasked: '',
    backendApiUrl: '',
    fruitsCount: 0,
    clientsCount: 0,
    ordersHistoryCount: 0,
    incomingOrdersCount: 0,
    lastSyncedAt: null
  });
  readonly whatsAppGeminiApiKeyInput = signal<string>('');
  readonly whatsAppIncomingOrders = signal<WhatsAppIncomingOrderRecord[]>([]);
  readonly isUpdatingWhatsAppBotConfig = signal<boolean>(false);
  readonly isSyncingWhatsAppContext = signal<boolean>(false);
  readonly isSimulatingWhatsAppOrder = signal<boolean>(false);
  readonly whatsAppSimulatorPhone = signal<string>('');
  readonly whatsAppSimulatorMessage = signal<string>('');
  readonly whatsAppSimulatorLastReply = signal<string>('');

  readonly activeTab = signal<'general' | 'inventory' | 'users' | 'roles' | 'catalog' | 'parameters'>('general');
  readonly inventorySubTab = signal<'variants' | 'fruits'>('variants');
  readonly parametersSubTab = signal<'paymentMethods' | 'grammages' | 'categories' | 'shifts'>('paymentMethods');
  readonly mobileConfigModuleSelected = signal<boolean>(false);

  readonly shiftSchedulesConfig = this.stateService.shiftSchedulesConfig;
  readonly showShiftScheduleModal = signal<boolean>(false);
  readonly isEditingShiftSchedule = signal<boolean>(false);
  readonly editingShiftScheduleId = signal<string | null>(null);
  readonly shiftScheduleForm = signal<{
    name: string;
    code: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>({
    name: '',
    code: '',
    startTime: '',
    endTime: '',
    isActive: true
  });

  readonly showPaymentMethodModal = signal<boolean>(false);
  readonly isEditingPaymentMethod = signal<boolean>(false);
  readonly editingPaymentMethodId = signal<number | null>(null);

  readonly paymentMethodForm = signal<{
    name: string;
    code: string;
    type: 'cash' | 'transfer' | 'card' | 'credit' | 'other';
    description: string;
    isActive: boolean;
  }>({
    name: '',
    code: '',
    type: 'transfer',
    description: '',
    isActive: true
  });

  readonly companyForm = signal<CompanyConfig>({ ...this.stateService.companyInfo() });
  readonly showInvoicePreviewModal = signal<boolean>(false);

  readonly categoriesConfig = this.stateService.categoriesConfig;
  readonly grammagesConfig = this.stateService.grammagesConfig;
  readonly columnsConfig = signal<InventoryColumnConfig[]>(this.loadColumns());
  readonly pageSize = signal<number | 'all'>(this.loadPageSize());

  readonly categoryFilter = signal<string>('ALL');
  readonly grammageFilter = signal<number | 'ALL'>('ALL');
  readonly searchQuery = signal<string>('');
  readonly currentPage = signal<number>(1);
  readonly sortField = signal<'name' | 'category' | 'grammage' | 'basePrice' | 'currentStock' | 'margin'>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly showSettingsModal = signal<boolean>(false);
  readonly settingsTab = signal<'categories' | 'grammages' | 'columns' | 'views'>('categories');

  readonly showNewVariantModal = signal<boolean>(false);
  readonly showEditVariantModal = signal<boolean>(false);
  readonly editingVariant = signal<ProductVariantDto | null>(null);

  readonly showAdjustModal = signal<boolean>(false);
  readonly selectedFruitForAdjust = signal<FruitConfig | null>(null);

  readonly adjustGrammage = signal<'g140' | 'g250' | 'g500' | 'g1000'>('g140');
  readonly adjustDelta = signal<number>(10);
  readonly adjustReason = signal<string>('Inventario físico de control');

  readonly confirmDialogState = signal<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmButtonText: string;
    cancelButtonText: string;
    isDanger: boolean;
    action: (() => void) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar',
    isDanger: true,
    action: null
  });

  readonly showNewGrammageModal = signal<boolean>(false);
  readonly showNewCategoryModal = signal<boolean>(false);

  readonly newGrammageAmount = signal<number | null>(null);
  readonly newGrammageUnit = signal<'g' | 'kg'>('g');
  readonly newGrammageCustomLabel = signal<string>('');

  readonly newCategoryName = signal<string>('');
  readonly newCategoryCode = signal<string>('');
  readonly newCategoryIcon = signal<string>('');
  readonly newCategoryBadge = signal<string>('badge-info');

  readonly newGrammageValue = signal<number | null>(null);
  readonly newGrammageLabel = signal<string>('');

  readonly newVariantName = signal<string>('');
  readonly newVariantSku = signal<string>('');
  readonly newVariantCategory = signal<ProductCategory>('PULPAS');
  readonly newVariantGrammage = signal<number>(0);
  readonly newVariantFruitId = signal<number>(1);
  readonly newVariantUnitCost = signal<number>(0);
  readonly newVariantBasePrice = signal<number>(0);
  readonly newVariantCurrentStock = signal<number>(0);
  readonly newVariantMinStock = signal<number>(0);

  readonly fruitSearchQuery = signal<string>('');
  readonly showFruitModal = signal<boolean>(false);
  readonly isEditingFruit = signal<boolean>(false);
  readonly editingFruitId = signal<string | null>(null);
  readonly editingFruitDbId = signal<number | undefined>(undefined);
  readonly fruitFormName = signal<string>('');
  readonly fruitFormWeightKg = signal<number>(0);
  readonly fruitFormYieldPercent = signal<number>(75);
  readonly fruitFormScientificName = signal<string>('');
  readonly expandedMobileRows = signal<Record<string, boolean>>({});

  readonly showHistoryDropdown = signal<boolean>(false);
  readonly showInventoryHistoryModal = signal<boolean>(false);
  readonly historyCategoryFilter = signal<'FRUIT' | 'PULP'>('FRUIT');
  readonly historyMovementTypeFilter = signal<'ALL' | 'IN' | 'OUT'>('ALL');
  readonly historyStartDate = signal<string>('');
  readonly historyEndDate = signal<string>('');
  readonly historyCurrentPage = signal<number>(1);
  readonly historyPageSize = 15;
  readonly historyMaxPages = 15;

  readonly filteredInventoryHistory = computed<InventoryMovementRecordDto[]>(() => {
    try {
      const cat = this.historyCategoryFilter();
      const movType = this.historyMovementTypeFilter();
      const start = this.historyStartDate().trim();
      const end = this.historyEndDate().trim();
      const all = this.stateService.inventoryMovements();

      return all.filter(item => {
        if (item.category !== cat) {
          return false;
        }
        if (movType !== 'ALL' && item.movementType !== movType) {
          return false;
        }
        const itemDate = (item.createdAt || '').substring(0, 10);
        if (start && itemDate < start) {
          return false;
        }
        if (end && itemDate > end) {
          return false;
        }
        return true;
      });
    } catch {
      return [];
    }
  });

  readonly historyTotalPages = computed<number>(() => {
    try {
      const total = this.filteredInventoryHistory().length;
      if (total === 0) {
        return 1;
      }
      return Math.min(this.historyMaxPages, Math.ceil(total / this.historyPageSize));
    } catch {
      return 1;
    }
  });

  readonly historyPageNumbers = computed<number[]>(() => {
    try {
      return Array.from({ length: this.historyTotalPages() }, (_, idx) => idx + 1);
    } catch {
      return [1];
    }
  });

  readonly paginatedInventoryHistory = computed<InventoryMovementRecordDto[]>(() => {
    try {
      const cappedList = this.filteredInventoryHistory().slice(0, this.historyMaxPages * this.historyPageSize);
      const page = Math.min(Math.max(1, this.historyCurrentPage()), this.historyTotalPages());
      const startIndex = (page - 1) * this.historyPageSize;
      return cappedList.slice(startIndex, startIndex + this.historyPageSize);
    } catch {
      return [];
    }
  });

  readonly filteredFruits = computed<FruitConfig[]>(() => {
    try {
      const q = this.fruitSearchQuery().trim().toLowerCase();
      const list = [...this.stateService.fruits()];
      if (!q) {
        return list;
      }
      return list.filter(
        f =>
          f.name.toLowerCase().includes(q) ||
          Boolean(f.scientificName && f.scientificName.toLowerCase().includes(q)) ||
          String(f.id).toLowerCase().includes(q)
      );
    } catch {
      return [];
    }
  });

  readonly promotions = signal<PromotionConfig[]>(INITIAL_PROMOTIONS);

  readonly totalPulpUnitsStock = computed<number>(() => {
    try {
      return this.stateService.productVariants().reduce((sum, v) => sum + (v.currentStock || 0), 0);
    } catch {
      return 0;
    }
  });

  readonly inventoryTotalPulpKg = computed<number>(() => {
    try {
      if (typeof this.stateService.totalStockKg === 'function') {
        const stateKg = this.stateService.totalStockKg();
        if (stateKg > 0) {
          return stateKg;
        }
      }
      const variantsKg = this.stateService
        .productVariants()
        .reduce((sum, v) => sum + ((v.currentStock || 0) * (v.grammage || 0)) / 1000, 0);
      if (variantsKg > 0) {
        return Number(variantsKg.toFixed(2));
      }
      const fruitsKg = this.stateService
        .fruits()
        .reduce((sum, f) => sum + this.getFruitTotalPulpKg(f), 0);
      return Number(fruitsKg.toFixed(2));
    } catch {
      return 0;
    }
  });

  readonly inventoryCommercialValue = computed<number>(() => {
    try {
      if (this.inventorySubTab() === 'variants') {
        const variantsVal = this.stateService
          .productVariants()
          .reduce((sum, v) => sum + (v.currentStock || 0) * (v.basePrice || 0), 0);
        if (variantsVal > 0) {
          return variantsVal;
        }
      }
      const fruitsVal = this.stateService
        .fruits()
        .reduce((sum, f) => sum + this.getFruitCommercialValue(f), 0);
      if (fruitsVal > 0) {
        return fruitsVal;
      }
      return this.stateService
        .productVariants()
        .reduce((sum, v) => sum + (v.currentStock || 0) * (v.basePrice || 0), 0);
    } catch {
      return 0;
    }
  });

  readonly inventoryEstimatedCost = computed<number>(() => {
    try {
      if (this.inventorySubTab() === 'variants') {
        const variantsCost = this.stateService
          .productVariants()
          .reduce((sum, v) => sum + (v.currentStock || 0) * (v.unitCost || 0), 0);
        if (variantsCost > 0) {
          return Math.round(variantsCost);
        }
      }
      return this.stateService.fruits().reduce((acc, f) => {
        const totalKg = this.getFruitTotalPulpKg(f);
        const unitCost = f.costPerKg || 0;
        return acc + Math.round(totalKg * unitCost + (f.freshStockKg || 0) * (unitCost * 0.6));
      }, 0);
    } catch {
      return 0;
    }
  });

  readonly inventoryLowStockCount = computed<number>(() => {
    try {
      if (this.inventorySubTab() === 'variants') {
        return this.stateService
          .productVariants()
          .filter(v => (v.currentStock || 0) <= (v.minStockAlert || 0)).length;
      }
      if (typeof this.stateService.lowStockFruitsCount === 'function') {
        return this.stateService.lowStockFruitsCount();
      }
      return this.stateService.fruits().filter(f => this.isFruitLowStock(f)).length;
    } catch {
      return 0;
    }
  });

  readonly activeCategories = this.stateService.activeCategories;
  readonly activeGrammages = this.stateService.activeGrammages;
  readonly isLoading = computed<boolean>(() => {
    try {
      return typeof this.stateService.isLoading === 'function' ? this.stateService.isLoading() : false;
    } catch {
      return false;
    }
  });

  readonly categoryCounts = computed<Record<string, number>>(() => {
    try {
      const counts: Record<string, number> = { ALL: this.stateService.productVariants().length };
      for (const v of this.stateService.productVariants()) {
        counts[v.category] = (counts[v.category] || 0) + 1;
      }
      return counts;
    } catch {
      return { ALL: 0 };
    }
  });

  readonly isColumnVisible = (key: string): boolean => {
    try {
      const col = this.columnsConfig().find(c => c.key === key);
      return col ? col.visible : true;
    } catch {
      return true;
    }
  };

  readonly filteredVariants = computed<ProductVariantDto[]>(() => {
    try {
      let list = [...this.stateService.productVariants()];

      const cat = this.categoryFilter();
      if (cat !== 'ALL') {
        list = list.filter(v => v.category === cat);
      }

      const gram = this.grammageFilter();
      if (gram !== 'ALL') {
        list = list.filter(v => v.grammage === gram);
      }

      const q = this.searchQuery().trim().toLowerCase();
      if (q) {
        list = list.filter(v =>
          v.name.toLowerCase().includes(q) ||
          v.sku.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          v.fruitName.toLowerCase().includes(q)
        );
      }

      const field = this.sortField();
      const dir = this.sortDirection() === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        let valA: string | number;
        let valB: string | number;
        if (field === 'name') {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        } else if (field === 'category') {
          valA = a.category;
          valB = b.category;
        } else if (field === 'grammage') {
          valA = a.grammage;
          valB = b.grammage;
        } else if (field === 'basePrice') {
          valA = a.basePrice;
          valB = b.basePrice;
        } else if (field === 'currentStock') {
          valA = a.currentStock;
          valB = b.currentStock;
        } else if (field === 'margin') {
          valA = a.basePrice - a.unitCost;
          valB = b.basePrice - b.unitCost;
        } else {
          valA = a.name;
          valB = b.name;
        }

        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
      });

      return list;
    } catch {
      return [];
    }
  });

  readonly totalPages = computed<number>(() => {
    try {
      const totalItems = this.filteredVariants().length;
      const size = this.pageSize();
      if (size === 'all' || totalItems === 0) return 1;
      return Math.ceil(totalItems / size);
    } catch {
      return 1;
    }
  });

  readonly paginatedVariants = computed<ProductVariantDto[]>(() => {
    try {
      const list = this.filteredVariants();
      const size = this.pageSize();
      if (size === 'all') return list;

      const page = Math.min(this.currentPage(), this.totalPages());
      const startIndex = (page - 1) * size;
      return list.slice(startIndex, startIndex + size);
    } catch {
      return [];
    }
  });

  readonly paginationInfo = computed<PaginationSummary>(() => {
    try {
      const total = this.filteredVariants().length;
      const size = this.pageSize();
      if (total === 0) return { start: 0, end: 0, total: 0 };
      if (size === 'all') return { start: 1, end: total, total };

      const page = Math.min(this.currentPage(), this.totalPages());
      const start = (page - 1) * size + 1;
      const end = Math.min(page * size, total);
      return { start, end, total };
    } catch {
      return { start: 0, end: 0, total: 0 };
    }
  });

  /**
   * Initializes the settings component and synchronizes the active tab with route query parameters.
   */
  constructor() {
    try {
      this.realtimeSync.connect();
      this.stateService.refreshAll?.();
      this.refreshWhatsAppGatewayStatus();
      effect(() => {
        try {
          const info = this.stateService.companyInfo();
          if (info) {
            untracked(() => {
              this.companyForm.set({ ...info });
            });
          }
        } catch {
          return;
        }
      });
      this.route.queryParams.subscribe(params => {
        const tab = params['tab'];
        const view = params['view'];
        if (tab === 'inventory' || tab === 'cava' || tab === 'variants' || tab === 'fruits' || tab === 'stock') {
          this.activeTab.set('inventory');
          this.mobileConfigModuleSelected.set(false);
          if (tab === 'variants' || tab === 'cava' || tab === 'stock' || tab === 'inventory') {
            this.inventorySubTab.set('variants');
          } else {
            this.inventorySubTab.set('fruits');
          }
        } else {
          if (tab === 'general' || tab === 'empresa') {
            this.activeTab.set('general');
          } else if (tab === 'users' || tab === 'usuarios') {
            this.activeTab.set('users');
          } else if (tab === 'roles') {
            this.activeTab.set('roles');
          } else if (tab === 'catalog' || tab === 'modulos') {
            this.activeTab.set('catalog');
          } else if (tab === 'parameters' || tab === 'parametros' || tab === 'pagos' || tab === 'metodos-pago') {
            this.activeTab.set('parameters');
            if (tab === 'pagos' || tab === 'metodos-pago') {
              this.parametersSubTab.set('paymentMethods');
            }
          } else {
            this.activeTab.set('general');
          }
          this.mobileConfigModuleSelected.set(view === 'module');
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Opens a configuration module in mobile view and updates route query parameters.
   */
  openMobileConfigModule(
    tab: 'general' | 'users' | 'roles' | 'catalog' | 'parameters',
    subTab?: 'paymentMethods' | 'grammages' | 'categories' | 'shifts'
  ): void {
    try {
      this.activeTab.set(tab);
      if (subTab) {
        this.parametersSubTab.set(subTab);
      }
      this.mobileConfigModuleSelected.set(true);
      this.router.navigate(['/settings'], {
        queryParams: {
          tab: subTab === 'paymentMethods' ? 'pagos' : tab,
          view: 'module'
        }
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      return;
    }
  }

  /**
   * Returns to the main mobile configuration hub view.
   */
  backToMobileConfigHub(): void {
    try {
      this.mobileConfigModuleSelected.set(false);
      this.router.navigate(['/settings'], {
        queryParams: { tab: 'general' }
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      return;
    }
  }

  /**
   * Navigates to the KDS inventory display screen.
   */
  openKdsInventory(): void {
    try {
      this.router.navigate(['/kds-inventory']);
    } catch {
      return;
    }
  }

  /**
   * Opens the modal to create a new payment method.
   */
  openCreatePaymentMethodModal(): void {
    try {
      this.isEditingPaymentMethod.set(false);
      this.editingPaymentMethodId.set(null);
      this.paymentMethodForm.set({
        name: '',
        code: '',
        type: 'transfer',
        description: '',
        isActive: true
      });
      this.showPaymentMethodModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Opens the modal to edit an existing payment method.
   */
  openEditPaymentMethodModal(pm: PaymentMethodDto): void {
    try {
      this.isEditingPaymentMethod.set(true);
      this.editingPaymentMethodId.set(pm.paymentMethodId);
      this.paymentMethodForm.set({
        name: pm.name,
        code: pm.code || '',
        type: pm.type || 'other',
        description: pm.description || '',
        isActive: pm.isActive
      });
      this.showPaymentMethodModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Closes the payment method creation/editing modal.
   */
  closePaymentMethodModal(): void {
    try {
      this.showPaymentMethodModal.set(false);
      this.editingPaymentMethodId.set(null);
    } catch {
      return;
    }
  }

  /**
   * Updates a specific field in the payment method form signal.
   */
  updatePaymentFormField(field: string, value: string | boolean): void {
    try {
      this.paymentMethodForm.update(curr => ({ ...curr, [field]: value }));
    } catch {
      return;
    }
  }

  /**
   * Handles checkbox change events for the payment method active toggle.
   */
  onPaymentMethodActiveToggle(event: Event): void {
    try {
      const target = event.target as HTMLInputElement | null;
      this.updatePaymentFormField('isActive', Boolean(target?.checked));
    } catch {
      return;
    }
  }

  /**
   * Saves a new or updated payment method in the global state service.
   */
  savePaymentMethod(): void {
    try {
      const form = this.paymentMethodForm();
      if (!form.name || form.name.trim().length === 0) {
        this.notification.warning('Dato requerido', 'Debes ingresar el nombre del método de pago.');
        return;
      }

      if (this.isEditingPaymentMethod() && this.editingPaymentMethodId()) {
        this.stateService.updatePaymentMethod(this.editingPaymentMethodId()!, {
          name: form.name.trim(),
          code: form.code.trim() || form.name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
          type: form.type,
          description: form.description.trim(),
          isActive: form.isActive
        });
      } else {
        this.stateService.createPaymentMethod({
          name: form.name.trim(),
          code: form.code.trim(),
          type: form.type,
          description: form.description.trim()
        });
      }

      this.closePaymentMethodModal();
    } catch {
      return;
    }
  }

  /**
   * Deletes a payment method after user confirmation.
   */
  deletePaymentMethod(id: number): void {
    try {
      const pm = this.stateService.paymentMethods().find(p => p.paymentMethodId === id);
      const name = pm ? pm.name : 'este método de pago';
      this.openConfirmDialog({
        title: '¿Eliminar Forma de Pago?',
        message: `¿Estás seguro de que deseas eliminar permanentemente el método "${name}"?`,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        isDanger: true,
        action: () => {
          this.stateService.deletePaymentMethod(id);
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Toggles the active status of a payment method.
   */
  togglePaymentMethodStatus(id: number): void {
    try {
      this.stateService.togglePaymentMethodStatus(id);
    } catch {
      return;
    }
  }

  /**
   * Restores the default payment methods list after user confirmation.
   */
  resetPaymentMethodsToDefault(): void {
    try {
      this.openConfirmDialog({
        title: '¿Restaurar Métodos de Pago?',
        message: '¿Deseas restaurar la lista de formas de pago originales de fábrica? Se restablecerán los métodos predeterminados.',
        confirmButtonText: 'Restaurar',
        cancelButtonText: 'Cancelar',
        isDanger: false,
        action: () => {
          this.stateService.resetPaymentMethodsToDefault();
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Returns a human-readable label for a payment method type.
   */
  getPaymentTypeLabel(type?: string): string {
    try {
      switch (type) {
        case 'cash': return 'Efectivo';
        case 'transfer': return 'Transferencia / Billetera';
        case 'card': return 'Tarjeta / Datáfono';
        case 'credit': return 'Crédito';
        default: return 'Otro';
      }
    } catch {
      return 'Otro';
    }
  }

  /**
   * Returns the CSS badge class corresponding to a payment method type.
   */
  getPaymentTypeBadgeClass(type?: string): string {
    try {
      switch (type) {
        case 'cash': return 'badge-emerald';
        case 'transfer': return 'badge-info';
        case 'card': return 'badge-purple';
        case 'credit': return 'badge-warning';
        default: return 'badge-subtle';
      }
    } catch {
      return 'badge-subtle';
    }
  }

  /**
   * Triggers the browser print dialog for the invoice preview.
   */
  printInvoicePreview(): void {
    try {
      window.print();
    } catch {
      return;
    }
  }

  /**
   * Updates a specific field in the company configuration form and syncs it silently.
   */
  updateCompanyField<K extends keyof CompanyConfig>(field: K, value: CompanyConfig[K]): void {
    try {
      this.companyForm.update(curr => {
        const next = { ...curr, [field]: value };
        this.stateService.syncCompanyInfoSilent(next);
        return next;
      });
    } catch {
      return;
    }
  }

  /**
   * Formats the next invoice sequence number with leading zeros.
   */
  formatPreviewInvoiceNumber(): string {
    try {
      const num = this.companyForm().invoiceNextNumber || 0;
      return String(num).padStart(5, '0');
    } catch {
      return '00000';
    }
  }

  /**
   * Saves the company configuration settings in the global state service.
   */
  saveCompanySettings(): void {
    try {
      this.stateService.updateCompanyInfo(this.companyForm());
    } catch {
      return;
    }
  }

  /**
   * Resets company configuration settings to defaults after confirmation.
   */
  resetCompanyDefaults(): void {
    try {
      this.openConfirmDialog({
        title: '¿Restaurar Datos de Empresa?',
        message: '¿Deseas restaurar la información predeterminada de la empresa a los valores originales?',
        confirmButtonText: 'Restaurar',
        cancelButtonText: 'Cancelar',
        isDanger: false,
        action: () => {
          this.companyForm.set({ ...DEFAULT_COMPANY_CONFIG });
          this.stateService.updateCompanyInfo(DEFAULT_COMPANY_CONFIG);
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Reads a selected company logo image file and encodes it as a Data URL.
   */
  onLogoFileSelected(event: Event): void {
    try {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          alert('El archivo no debe exceder 2 MB.');
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          this.updateCompanyField('logoUrl', base64);
        };
        reader.readAsDataURL(file);
      }
    } catch {
      return;
    }
  }

  /**
   * Clears the company logo URL.
   */
  removeLogo(): void {
    try {
      this.updateCompanyField('logoUrl', '');
    } catch {
      return;
    }
  }

  /**
   * Adjusts fresh fruit stock by a specified kilogram delta.
   */
  adjustFreshFruit(fruitIdOrName: string, deltaKg: number): void {
    try {
      this.stateService.adjustFreshFruitStock(fruitIdOrName, deltaKg);
    } catch {
      return;
    }
  }

  /**
   * Updates the active sort column and toggles sort direction.
   */
  setSort(field: 'name' | 'category' | 'grammage' | 'basePrice' | 'currentStock' | 'margin'): void {
    try {
      if (this.sortField() === field) {
        this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
      } else {
        this.sortField.set(field);
        this.sortDirection.set('asc');
      }
    } catch {
      return;
    }
  }

  /**
   * Navigates to a specific page in the paginated variants table.
   */
  setPage(page: number): void {
    try {
      if (page >= 1 && page <= this.totalPages()) {
        this.currentPage.set(page);
      }
    } catch {
      return;
    }
  }

  /**
   * Sets the number of rows displayed per page and persists the preference.
   */
  setPageSize(size: number | 'all'): void {
    try {
      this.pageSize.set(size);
      this.currentPage.set(1);
      this.savePageSize(size);
    } catch {
      return;
    }
  }

  /**
   * Adjusts the stock count of a product variant by a specified delta.
   */
  adjustVariant(variantId: number, delta: number): void {
    try {
      this.stateService.adjustVariantStock(variantId, delta);
      this.notification.info('Stock Actualizado', `${delta > 0 ? '+' : ''}${delta} unidades registradas`);
    } catch {
      return;
    }
  }

  /**
   * Opens the stock adjustment modal for a specific fruit.
   */
  openAdjust(fruit: FruitConfig): void {
    try {
      this.selectedFruitForAdjust.set(fruit);
      this.showAdjustModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Submits a manual stock adjustment for the selected fruit and grammage.
   */
  submitAdjust(isAddition: boolean): void {
    try {
      const fruit = this.selectedFruitForAdjust();
      if (!fruit) return;

      const delta = isAddition ? Math.abs(this.adjustDelta()) : -Math.abs(this.adjustDelta());
      this.stateService.adjustStock(fruit.name, this.adjustGrammage(), delta);
      this.showAdjustModal.set(false);
    } catch {
      return;
    }
  }

  /**
   * Toggles the visibility of a table column in the inventory view.
   */
  toggleColumn(key: string): void {
    try {
      this.columnsConfig.update(cols =>
        cols.map(c => {
          if (c.key === key && !c.locked) {
            return { ...c, visible: !c.visible };
          }
          return c;
        })
      );
      this.saveColumns();
    } catch {
      return;
    }
  }

  /**
   * Toggles the active state of an inventory category.
   */
  toggleCategory(id: string): void {
    try {
      this.stateService.toggleCategory(id);
    } catch {
      return;
    }
  }

  /**
   * Toggles the active state of a grammage presentation.
   */
  toggleGrammage(key: string): void {
    try {
      this.stateService.toggleGrammage(key);
    } catch {
      return;
    }
  }

  /**
   * Opens the confirmation dialog with the given configuration options.
   */
  openConfirmDialog(options: {
    title: string;
    message: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    isDanger?: boolean;
    action: () => void;
  }): void {
    try {
      this.confirmDialogState.set({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmButtonText: options.confirmButtonText || 'Confirmar',
        cancelButtonText: options.cancelButtonText || 'Cancelar',
        isDanger: options.isDanger ?? true,
        action: options.action
      });
    } catch {
      return;
    }
  }

  /**
   * Closes the confirmation dialog and clears state.
   */
  closeConfirmDialog(): void {
    try {
      this.confirmDialogState.set({
        isOpen: false,
        title: '',
        message: '',
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
        isDanger: true,
        action: null
      });
    } catch {
      return;
    }
  }

  /**
   * Executes the pending confirmation action.
   */
  onConfirmDialog(): void {
    try {
      const pendingAction = this.confirmDialogState().action;
      this.closeConfirmDialog();
      if (pendingAction) {
        pendingAction();
      }
    } catch {
      return;
    }
  }

  /**
   * Opens the modal dialog to create a new category with empty fields.
   */
  openNewCategoryModal(): void {
    try {
      this.newCategoryName.set('');
      this.newCategoryCode.set('');
      this.showNewCategoryModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Closes the new category modal dialog.
   */
  closeNewCategoryModal(): void {
    try {
      this.showNewCategoryModal.set(false);
    } catch {
      return;
    }
  }

  /**
   * Creates and persists a new custom product category.
   */
  addCustomCategory(): void {
    try {
      const name = this.newCategoryName().trim();
      let code = this.newCategoryCode().trim().toUpperCase().replace(/\s+/g, '_');
      if (!name) {
        this.notification.error('Campo Requerido', 'Ingresa el nombre de la nueva categoría.');
        return;
      }
      if (!code) {
        code = name.toUpperCase().replace(/\s+/g, '_');
      }

      if (this.categoriesConfig().some(c => c.id === code)) {
        this.notification.error('Categoría Duplicada', `Ya existe una categoría con el identificador "${code}".`);
        return;
      }

      const newCat: InventoryCategoryConfig = {
        id: code,
        name,
        icon: this.newCategoryIcon() || '',
        badgeClass: this.newCategoryBadge() || 'badge-info',
        isCustom: true,
        isActive: true
      };

      this.stateService.addCategory(newCat);
      this.notification.success('Categoría Agregada', `La línea "${name}" ahora está disponible en el inventario.`);

      this.closeNewCategoryModal();
    } catch {
      return;
    }
  }

  /**
   * Prompts user confirmation to delete a category.
   */
  confirmDeleteCategory(cat: InventoryCategoryConfig): void {
    try {
      const assignedCount = this.stateService.productVariants().filter(v => v.category === cat.id).length;
      const confirmMsg = assignedCount > 0
        ? `Hay ${assignedCount} presentaciones asignadas a "${cat.name}". ¿Deseas eliminar la categoría de todos modos?`
        : `¿Estás seguro de eliminar la categoría "${cat.name}"?`;

      this.openConfirmDialog({
        title: '¿Eliminar Categoría de Producto?',
        message: confirmMsg,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        isDanger: true,
        action: () => {
          this.stateService.deleteCategory(cat.id);
          if (this.categoryFilter() === cat.id) {
            this.categoryFilter.set('ALL');
          }
          this.notification.info('Categoría Eliminada', `Línea "${cat.name}" retirada.`);
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Deletes a custom product category after checking for assigned variants.
   */
  deleteCustomCategory(id: string): void {
    try {
      const cat = this.categoriesConfig().find(c => c.id === id);
      if (!cat) return;
      this.confirmDeleteCategory(cat);
    } catch {
      return;
    }
  }

  /**
   * Opens the modal dialog to create a new grammage with empty fields and default unit.
   */
  openNewGrammageModal(): void {
    try {
      this.newGrammageAmount.set(null);
      this.newGrammageUnit.set('g');
      this.newGrammageCustomLabel.set('');
      this.showNewGrammageModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Closes the new grammage modal dialog.
   */
  closeNewGrammageModal(): void {
    try {
      this.showNewGrammageModal.set(false);
    } catch {
      return;
    }
  }

  /**
   * Creates and persists a new custom grammage configuration with automatic unit formatting.
   */
  addCustomGrammage(): void {
    try {
      const rawAmount = this.newGrammageAmount();
      if (!rawAmount || rawAmount <= 0) {
        this.notification.error('Campo Requerido', 'Ingresa una cantidad numérica mayor a cero.');
        return;
      }

      const unit = this.newGrammageUnit();
      const val = unit === 'kg' ? Math.round(rawAmount * 1000) : Math.round(rawAmount);

      if (val <= 0) {
        this.notification.error('Valor Inválido', 'El peso debe ser mayor a 0 gramos.');
        return;
      }

      const key = `g${val}`;
      if (this.grammagesConfig().some(g => g.value === val)) {
        this.notification.error('Gramaje Duplicado', `El gramaje de ${val}g ya se encuentra registrado.`);
        return;
      }

      let label = this.newGrammageCustomLabel().trim();
      if (!label) {
        if (unit === 'kg') {
          label = `${rawAmount} Kg (${val}g)`;
        } else {
          label = `${val}g`;
        }
      }

      const newGram: InventoryGrammageConfig = {
        key,
        value: val,
        label,
        isCustom: true,
        isActive: true
      };

      this.stateService.addGrammage(newGram);
      this.notification.success('Presentación Agregada', `Presentación de ${label} agregada exitosamente.`);

      this.closeNewGrammageModal();
    } catch {
      return;
    }
  }

  /**
   * Prompts user confirmation to delete a grammage.
   */
  confirmDeleteGrammage(gram: InventoryGrammageConfig): void {
    try {
      this.openConfirmDialog({
        title: '¿Eliminar Presentación / Kilo?',
        message: `¿Estás seguro de eliminar la presentación "${gram.label}" (${gram.value}g)?`,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        isDanger: true,
        action: () => {
          this.deleteCustomGrammage(gram.key);
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Deletes a custom grammage configuration.
   */
  deleteCustomGrammage(key: string): void {
    try {
      const gram = this.grammagesConfig().find(g => g.key === key);
      if (!gram) return;

      this.stateService.deleteGrammage(key);
      if (this.grammageFilter() === gram.value) {
        this.grammageFilter.set('ALL');
      }
      this.notification.info('Gramaje Eliminado', `Gramaje de ${gram.label} eliminado.`);
    } catch {
      return;
    }
  }

  /**
   * Opens the modal dialog to create a new shift schedule.
   */
  openCreateShiftScheduleModal(): void {
    try {
      this.isEditingShiftSchedule.set(false);
      this.editingShiftScheduleId.set(null);
      this.shiftScheduleForm.set({
        name: '',
        code: '',
        startTime: '',
        endTime: '',
        isActive: true
      });
      this.showShiftScheduleModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Opens the modal dialog to edit an existing shift schedule.
   */
  openEditShiftScheduleModal(schedule: ShiftScheduleConfig): void {
    try {
      this.isEditingShiftSchedule.set(true);
      this.editingShiftScheduleId.set(schedule.id);
      this.shiftScheduleForm.set({
        name: schedule.name,
        code: schedule.code,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        isActive: schedule.isActive
      });
      this.showShiftScheduleModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Closes the shift schedule modal dialog.
   */
  closeShiftScheduleModal(): void {
    try {
      this.showShiftScheduleModal.set(false);
      this.isEditingShiftSchedule.set(false);
      this.editingShiftScheduleId.set(null);
    } catch {
      return;
    }
  }

  /**
   * Updates a field in the shift schedule form state.
   */
  updateShiftScheduleFormField(
    field: 'name' | 'code' | 'startTime' | 'endTime' | 'isActive',
    value: string | boolean
  ): void {
    try {
      this.shiftScheduleForm.update(prev => ({
        ...prev,
        [field]: value
      }));
    } catch {
      return;
    }
  }

  /**
   * Creates or updates a parametric shift schedule in StateService.
   */
  saveShiftSchedule(): void {
    try {
      const form = this.shiftScheduleForm();
      const name = form.name.trim();
      const startTime = form.startTime.trim();
      const endTime = form.endTime.trim();
      let code = form.code.trim().toUpperCase().replace(/\s+/g, '_');

      if (!name || !startTime || !endTime) {
        this.notification.error(
          'Campos Requeridos',
          'Ingresa el nombre de la jornada, hora de inicio y hora de fin.'
        );
        return;
      }

      if (!code) {
        code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
      }

      if (this.isEditingShiftSchedule() && this.editingShiftScheduleId()) {
        const targetId = this.editingShiftScheduleId()!;
        this.stateService.updateShiftSchedule(targetId, {
          name,
          code,
          startTime,
          endTime,
          isActive: form.isActive
        });
        this.notification.success(
          'Jornada Actualizada',
          `El horario "${name}" (${startTime} - ${endTime}) fue actualizado.`
        );
      } else {
        if (this.shiftSchedulesConfig().some(s => s.code === code || s.id === code)) {
          this.notification.error(
            'Jornada Duplicada',
            `Ya existe una jornada registrada con el código "${code}".`
          );
          return;
        }
        const newSchedule: ShiftScheduleConfig = {
          id: code,
          code,
          name,
          startTime,
          endTime,
          isCustom: true,
          isActive: form.isActive
        };
        this.stateService.addShiftSchedule(newSchedule);
        this.notification.success(
          'Jornada Agregada',
          `La jornada "${name}" (${startTime} - ${endTime}) ahora está disponible en Control de Turnos.`
        );
      }

      this.closeShiftScheduleModal();
    } catch {
      return;
    }
  }

  /**
   * Toggles the active status of a parametric shift schedule.
   */
  toggleShiftSchedule(id: string): void {
    try {
      this.stateService.toggleShiftSchedule(id);
    } catch {
      return;
    }
  }

  /**
   * Prompts user confirmation before deleting a parametric shift schedule.
   */
  confirmDeleteShiftSchedule(schedule: ShiftScheduleConfig): void {
    try {
      this.openConfirmDialog({
        title: '¿Eliminar Jornada / Horario de Turno?',
        message: `¿Estás seguro de eliminar la jornada "${schedule.name}" (${schedule.startTime} - ${schedule.endTime})?`,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        isDanger: true,
        action: () => {
          this.stateService.deleteShiftSchedule(schedule.id);
          this.notification.info('Jornada Eliminada', `Horario "${schedule.name}" retirado.`);
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Opens the modal for creating a new product variant with zeroed numeric defaults.
   */
  openNewVariantModal(): void {
    try {
      const cat = this.categoriesConfig()[0]?.id || 'PULPAS';
      const fruit = this.stateService.fruits()[0];
      this.newVariantCategory.set(cat);
      this.newVariantFruitId.set(fruit?.fruitId || 1);
      this.newVariantName.set('');
      this.newVariantSku.set('');
      this.newVariantGrammage.set(0);
      this.newVariantUnitCost.set(0);
      this.newVariantBasePrice.set(0);
      this.newVariantCurrentStock.set(0);
      this.newVariantMinStock.set(0);

      this.showNewVariantModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Updates variant name, SKU, and base price when the selected fruit changes.
   */
  onNewVariantFruitChange(fruitId: number): void {
    try {
      const fruit = this.stateService.fruits().find(f => (f.fruitId || f.id) === fruitId);
      if (fruit) {
        const g = this.newVariantGrammage();
        this.newVariantName.set(`${fruit.name} ${g}g`);
        const prefix = fruit.name.substring(0, 3).toUpperCase();
        this.newVariantSku.set(`${this.newVariantCategory().substring(0, 3)}-${prefix}-${g}G`);
        const priceKey = `g${g}`;
        const pricesMap = fruit.prices as Record<string, number> | undefined;
        if (pricesMap && pricesMap[priceKey]) {
          this.newVariantBasePrice.set(pricesMap[priceKey]);
        }
      }
    } catch {
      return;
    }
  }

  /**
   * Updates variant name, SKU, and base price when the selected grammage changes.
   */
  onNewVariantGrammageChange(g: number): void {
    try {
      this.newVariantGrammage.set(g);
      const fruit = this.stateService.fruits().find(f => (f.fruitId || f.id) === this.newVariantFruitId());
      if (fruit) {
        this.newVariantName.set(`${fruit.name} ${g}g`);
        const prefix = fruit.name.substring(0, 3).toUpperCase();
        this.newVariantSku.set(`${this.newVariantCategory().substring(0, 3)}-${prefix}-${g}G`);
        const priceKey = `g${g}`;
        const pricesMap = fruit.prices as Record<string, number> | undefined;
        if (pricesMap && pricesMap[priceKey]) {
          this.newVariantBasePrice.set(pricesMap[priceKey]);
        }
      }
    } catch {
      return;
    }
  }

  /**
   * Validates and creates a new product variant in the state store.
   */
  createVariant(): void {
    try {
      const name = this.newVariantName().trim();
      if (!name) {
        this.notification.error('Faltan Datos', 'Por favor ingresa el nombre de la presentación.');
        return;
      }

      const fruit = this.stateService.fruits().find(f => (f.fruitId || f.id) === Number(this.newVariantFruitId()));
      const fruitName = fruit ? fruit.name : '';

      let sku = this.newVariantSku().trim().toUpperCase();
      if (!sku) {
        sku = `${this.newVariantCategory().substring(0, 3)}-${name.substring(0, 3).toUpperCase()}-${this.newVariantGrammage()}G`;
      }

      this.stateService.addProductVariant({
        fruitId: Number(this.newVariantFruitId()),
        fruitName,
        category: this.newVariantCategory(),
        sku,
        name,
        grammage: Number(this.newVariantGrammage()),
        unitCost: Number(this.newVariantUnitCost()),
        basePrice: Number(this.newVariantBasePrice()),
        minStockAlert: Number(this.newVariantMinStock()),
        currentStock: Number(this.newVariantCurrentStock()),
        isActive: true
      });

      this.showNewVariantModal.set(false);
    } catch {
      return;
    }
  }

  /**
   * Opens the modal to edit an existing product variant.
   */
  openEditVariantModal(variant: ProductVariantDto): void {
    try {
      this.editingVariant.set({ ...variant });
      this.showEditVariantModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Saves changes to the currently edited product variant.
   */
  saveEditVariant(): void {
    try {
      const variant = this.editingVariant();
      if (!variant) return;

      this.stateService.updateProductVariant(variant.variantId, {
        name: variant.name,
        sku: variant.sku,
        category: variant.category,
        grammage: Number(variant.grammage),
        unitCost: Number(variant.unitCost),
        basePrice: Number(variant.basePrice),
        currentStock: Number(variant.currentStock),
        minStockAlert: Number(variant.minStockAlert)
      });

      this.showEditVariantModal.set(false);
      this.editingVariant.set(null);
    } catch {
      return;
    }
  }

  /**
   * Deletes a product variant from the inventory after confirmation.
   */
  deleteVariant(variantId: number, name: string): void {
    try {
      this.openConfirmDialog({
        title: '¿Eliminar Presentación de Inventario?',
        message: `¿Estás seguro de eliminar permanentemente "${name}" del inventario?`,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        isDanger: true,
        action: () => {
          this.stateService.deleteProductVariant(variantId);
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Toggles the expanded accordion state for a mobile table row card.
   */
  toggleMobileRow(rowKey: string, event?: Event): void {
    try {
      if (event) {
        event.stopPropagation();
      }
      this.expandedMobileRows.update(prev => ({
        ...prev,
        [rowKey]: !prev[rowKey]
      }));
    } catch {
      return;
    }
  }

  /**
   * Returns whether a mobile table row card is currently expanded.
   */
  isMobileRowExpanded(rowKey: string): boolean {
    try {
      return Boolean(this.expandedMobileRows()[rowKey]);
    } catch {
      return false;
    }
  }

  /**
   * Opens the modal to register a new fresh fruit variety with weight in kilograms.
   */
  openNewFruitModal(): void {
    try {
      this.isEditingFruit.set(false);
      this.editingFruitId.set(null);
      this.editingFruitDbId.set(undefined);
      this.fruitFormName.set('');
      this.fruitFormWeightKg.set(0);
      this.fruitFormYieldPercent.set(75);
      this.fruitFormScientificName.set('');
      this.showFruitModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Opens the modal to edit an existing fresh fruit variety and its available weight in kilograms.
   */
  openEditFruitModal(fruit: FruitConfig): void {
    try {
      this.isEditingFruit.set(true);
      this.editingFruitId.set(String(fruit.id));
      this.editingFruitDbId.set(fruit.fruitId);
      this.fruitFormName.set(fruit.name);
      this.fruitFormWeightKg.set(Number(fruit.freshStockKg || 0));
      this.fruitFormYieldPercent.set(
        fruit.yieldRate && fruit.yieldRate > 0 ? Math.round(fruit.yieldRate * 100) : 75
      );
      this.fruitFormScientificName.set(fruit.scientificName || '');
      this.showFruitModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Validates and saves a fresh fruit item (creating or updating it) in the global state store.
   */
  saveFruitForm(): void {
    try {
      const name = this.fruitFormName().trim();
      if (!name) {
        this.notification.error('Nombre Requerido', 'Por favor ingresa el nombre de la fruta.');
        return;
      }
      const weightKg = Number(this.fruitFormWeightKg());
      if (Number.isNaN(weightKg) || weightKg < 0) {
        this.notification.error('Peso Inválido', 'Ingresa un peso en kilogramos válido (0 o mayor).');
        return;
      }

      this.stateService.saveFreshFruitItem({
        id: this.editingFruitId() ?? undefined,
        fruitId: this.editingFruitDbId(),
        name,
        freshStockKg: weightKg,
        yieldPercentage: Number(this.fruitFormYieldPercent() || 0),
        scientificName: this.fruitFormScientificName().trim()
      });

      this.showFruitModal.set(false);
      this.editingFruitId.set(null);
      this.editingFruitDbId.set(undefined);
    } catch {
      return;
    }
  }

  /**
   * Prompts confirmation and removes a fresh fruit item from the plant inventory.
   */
  deleteFreshFruit(fruit: FruitConfig): void {
    try {
      this.openConfirmDialog({
        title: '¿Eliminar Fruta del Inventario?',
        message: `¿Estás seguro de eliminar "${fruit.name}" (${fruit.freshStockKg} Kg) del inventario de fruta disponible?`,
        confirmButtonText: 'Eliminar Fruta',
        cancelButtonText: 'Cancelar',
        isDanger: true,
        action: () => {
          this.stateService.deleteFreshFruitItem(String(fruit.id));
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Resets all category, grammage, column, and pagination settings to their default values.
   */
  resetAllSettingsToDefault(): void {
    try {
      this.openConfirmDialog({
        title: '¿Restablecer Preferencias?',
        message: '¿Deseas restablecer todas las configuraciones de columnas, categorías y opciones de visualización a los valores originales?',
        confirmButtonText: 'Restablecer',
        cancelButtonText: 'Cancelar',
        isDanger: false,
        action: () => {
          this.categoriesConfig.set(DEFAULT_CATEGORIES);
          this.grammagesConfig.set(DEFAULT_GRAMMAGES);
          this.columnsConfig.set(DEFAULT_COLUMNS);
          this.pageSize.set(10);
          this.saveCategories();
          this.saveGrammages();
          this.saveColumns();
          this.savePageSize(10);
          this.categoryFilter.set('ALL');
          this.grammageFilter.set('ALL');
          this.notification.info('Ajustes Restablecidos', 'Se aplicó la configuración predeterminada del sistema.');
        }
      });
    } catch {
      return;
    }
  }

  /**
   * Loads the inventory categories configuration from localStorage.
   */
  private loadCategories(): InventoryCategoryConfig[] {
    try {
      const data = localStorage.getItem('despulpadora_categories_config');
      const list: InventoryCategoryConfig[] = data ? JSON.parse(data) : DEFAULT_CATEGORIES;
      return list.map(c => ({ ...c, icon: '' }));
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }

  /**
   * Saves the inventory categories configuration to localStorage.
   */
  private saveCategories(): void {
    try {
      localStorage.setItem('despulpadora_categories_config', JSON.stringify(this.categoriesConfig()));
    } catch {
      return;
    }
  }

  /**
   * Loads the inventory grammages configuration from localStorage.
   */
  private loadGrammages(): InventoryGrammageConfig[] {
    try {
      const data = localStorage.getItem('despulpadora_grammages_config');
      return data ? JSON.parse(data) : DEFAULT_GRAMMAGES;
    } catch {
      return DEFAULT_GRAMMAGES;
    }
  }

  /**
   * Saves the inventory grammages configuration to localStorage.
   */
  private saveGrammages(): void {
    try {
      localStorage.setItem('despulpadora_grammages_config', JSON.stringify(this.grammagesConfig()));
    } catch {
      return;
    }
  }

  /**
   * Loads the inventory table columns configuration from localStorage.
   */
  private loadColumns(): InventoryColumnConfig[] {
    try {
      const data = localStorage.getItem('despulpadora_columns_config');
      return data ? JSON.parse(data) : DEFAULT_COLUMNS;
    } catch {
      return DEFAULT_COLUMNS;
    }
  }

  /**
   * Saves the inventory table columns configuration to localStorage.
   */
  private saveColumns(): void {
    try {
      localStorage.setItem('despulpadora_columns_config', JSON.stringify(this.columnsConfig()));
    } catch {
      return;
    }
  }

  /**
   * Loads the preferred table page size from localStorage.
   */
  private loadPageSize(): number | 'all' {
    try {
      const data = localStorage.getItem('despulpadora_page_size');
      if (data === 'all') return 'all';
      const num = Number(data);
      return num > 0 ? num : 10;
    } catch {
      return 10;
    }
  }

  /**
   * Saves the preferred table page size to localStorage.
   */
  private savePageSize(size: number | 'all'): void {
    try {
      localStorage.setItem('despulpadora_page_size', String(size));
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

  /**
   * Formats a number with Colombian locale thousands/decimal separators.
   */
  formatNum(num: number): string {
    try {
      return new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: 2
      }).format(num || 0);
    } catch {
      return '0';
    }
  }

  /**
   * Calculates the commercial inventory value in COP for a specific fruit across all its grammages.
   */
  getFruitCommercialValue(fruit: FruitConfig): number {
    try {
      const s = fruit.stock || { g140: 0, g250: 0, g500: 0, g1000: 0 };
      const p = fruit.prices || { g140: 0, g250: 0, g500: 0, g1000: 0 };
      const byFruitGrammages =
        (s.g140 || 0) * (p.g140 || 0) +
        (s.g250 || 0) * (p.g250 || 0) +
        (s.g500 || 0) * (p.g500 || 0) +
        (s.g1000 || 0) * (p.g1000 || 0);
      if (byFruitGrammages > 0) {
        return byFruitGrammages;
      }
      const matchingVariants = this.stateService
        .productVariants()
        .filter(
          v =>
            (fruit.fruitId !== undefined && v.fruitId === fruit.fruitId) ||
            (v.fruitName && v.fruitName.toLowerCase() === fruit.name.toLowerCase())
        );
      return matchingVariants.reduce((sum, v) => sum + (v.currentStock || 0) * (v.basePrice || 0), 0);
    } catch {
      return 0;
    }
  }

  /**
   * Calculates the total finished pulp stock in kilograms for a specific fruit.
   */
  getFruitTotalPulpKg(fruit: FruitConfig): number {
    try {
      const s = fruit.stock || { g140: 0, g250: 0, g500: 0, g1000: 0 };
      const totalGrams =
        (s.g140 || 0) * 140 +
        (s.g250 || 0) * 250 +
        (s.g500 || 0) * 500 +
        (s.g1000 || 0) * 1000;
      if (totalGrams > 0) {
        return Number((totalGrams / 1000).toFixed(2));
      }
      const matchingVariants = this.stateService
        .productVariants()
        .filter(
          v =>
            (fruit.fruitId !== undefined && v.fruitId === fruit.fruitId) ||
            (v.fruitName && v.fruitName.toLowerCase() === fruit.name.toLowerCase())
        );
      const variantsGrams = matchingVariants.reduce(
        (sum, v) => sum + (v.currentStock || 0) * (v.grammage || 0),
        0
      );
      return Number((variantsGrams / 1000).toFixed(2));
    } catch {
      return 0;
    }
  }

  /**
   * Evaluates whether a fruit is currently in a low-stock alert state.
   */
  isFruitLowStock(fruit: FruitConfig): boolean {
    try {
      const s = fruit.stock || { g140: 0, g250: 0, g500: 0, g1000: 0 };
      const min = fruit.minStock || { g140: 10, g250: 10, g500: 5, g1000: 3 };
      return (
        (fruit.freshStockKg || 0) <= 50 ||
        (s.g140 || 0) <= (min.g140 || 0) ||
        (s.g250 || 0) <= (min.g250 || 0)
      );
    } catch {
      return false;
    }
  }

  /**
   * Toggles the visibility of the inventory movement history dropdown menu.
   */
  toggleHistoryDropdown(event?: Event): void {
    try {
      if (event) {
        event.stopPropagation();
      }
      this.showHistoryDropdown.update(v => !v);
    } catch {
      return;
    }
  }

  /**
   * Opens the inventory movements history dialog for the specified category (fruit or pulp) and movement filter.
   */
  openInventoryHistoryModal(category: 'FRUIT' | 'PULP', movementType: 'ALL' | 'IN' | 'OUT' = 'ALL'): void {
    try {
      this.showHistoryDropdown.set(false);
      this.historyCategoryFilter.set(category);
      this.historyMovementTypeFilter.set(movementType);
      this.historyCurrentPage.set(1);
      this.showInventoryHistoryModal.set(true);
    } catch {
      return;
    }
  }

  /**
   * Closes the inventory movements history dialog.
   */
  closeInventoryHistoryModal(): void {
    try {
      this.showInventoryHistoryModal.set(false);
    } catch {
      return;
    }
  }

  /**
   * Clears the start and end date filters in the inventory movements history dialog.
   */
  clearHistoryDateFilters(): void {
    try {
      this.historyStartDate.set('');
      this.historyEndDate.set('');
      this.historyCurrentPage.set(1);
    } catch {
      return;
    }
  }

  /**
   * Navigates to a specific page in the inventory movements history dialog (1 to 15).
   */
  setHistoryPage(page: number): void {
    try {
      if (page >= 1 && page <= this.historyTotalPages()) {
        this.historyCurrentPage.set(page);
      }
    } catch {
      return;
    }
  }

  /**
   * Formats an ISO timestamp into a readable Spanish date and time string.
   */
  formatMovementDateTime(isoString: string): string {
    try {
      if (!isoString) {
        return '';
      }
      const d = new Date(isoString);
      if (Number.isNaN(d.getTime())) {
        return isoString.substring(0, 10);
      }
      return d.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString.substring(0, 10);
    }
  }

  /**
   * Queries the self-hosted WhatsApp Gateway for the current connection status, QR code, and auto-order bot state.
   */
  refreshWhatsAppGatewayStatus(): void {
    try {
      this.isLoadingWhatsAppStatus.set(true);
      this.loadWhatsAppBotConfigAndOrders();
      this.whatsAppGateway.getStatus().subscribe({
        next: (status: WhatsAppGatewayStatusDto) => {
          this.whatsAppGatewayStatus.set(status);
          this.isLoadingWhatsAppStatus.set(false);
          if (status.status === 'DISCONNECTED' && !status.qrDataUrl && !status.connected) {
            this.whatsAppGateway.reconnect().subscribe({
              next: (reconnectRes: { success: boolean } & Partial<WhatsAppGatewayStatusDto>) => {
                if (reconnectRes.status && (reconnectRes.qrDataUrl || reconnectRes.connected)) {
                  this.whatsAppGatewayStatus.set({
                    status: reconnectRes.status,
                    connected: Boolean(reconnectRes.connected),
                    qrDataUrl: reconnectRes.qrDataUrl ?? null,
                    phoneNumber: reconnectRes.phoneNumber ?? null,
                    name: reconnectRes.name ?? null,
                    lastUpdatedAt: reconnectRes.lastUpdatedAt
                  });
                }
              },
              error: () => {}
            });
          } else if (status.status === 'CONNECTING' && !status.qrDataUrl && !status.connected) {
            setTimeout(() => {
              this.whatsAppGateway.getStatus().subscribe({
                next: (retryStatus: WhatsAppGatewayStatusDto) => {
                  this.whatsAppGatewayStatus.set(retryStatus);
                }
              });
            }, 2000);
          }
        },
        error: () => {
          this.isLoadingWhatsAppStatus.set(false);
        }
      });
    } catch {
      this.isLoadingWhatsAppStatus.set(false);
    }
  }

  /**
   * Polls the WhatsApp Gateway status until a QR code or active connection is available.
   */
  pollWhatsAppQrUntilReady(remainingAttempts: number): void {
    try {
      if (remainingAttempts <= 0) {
        this.isLoadingWhatsAppStatus.set(false);
        return;
      }
      setTimeout(() => {
        this.whatsAppGateway.getStatus().subscribe({
          next: (status: WhatsAppGatewayStatusDto) => {
            this.whatsAppGatewayStatus.set(status);
            if (status.qrDataUrl || status.connected || status.error === 'GATEWAY_UNREACHABLE') {
              this.isLoadingWhatsAppStatus.set(false);
              if (status.qrDataUrl) {
                this.notification.info('Gateway WhatsApp', 'Código QR actualizado y listo para escanear.');
              }
            } else {
              this.pollWhatsAppQrUntilReady(remainingAttempts - 1);
            }
          },
          error: () => {
            this.isLoadingWhatsAppStatus.set(false);
          }
        });
      }, 1500);
    } catch {
      this.isLoadingWhatsAppStatus.set(false);
    }
  }

  /**
   * Requests the WhatsApp Gateway to regenerate the QR code or reconnect the session.
   */
  reconnectWhatsAppGateway(): void {
    try {
      this.isLoadingWhatsAppStatus.set(true);
      this.whatsAppGatewayStatus.update((prev: WhatsAppGatewayStatusDto) => ({
        ...prev,
        status: 'CONNECTING',
        qrDataUrl: null,
        error: null
      }));
      this.whatsAppGateway.reconnect().subscribe({
        next: (res: { success: boolean } & Partial<WhatsAppGatewayStatusDto>) => {
          if (res.qrDataUrl || res.connected) {
            this.whatsAppGatewayStatus.set({
              status: res.status || (res.connected ? 'CONNECTED' : 'QR_READY'),
              connected: Boolean(res.connected),
              qrDataUrl: res.qrDataUrl ?? null,
              phoneNumber: res.phoneNumber ?? null,
              name: res.name ?? null,
              lastUpdatedAt: res.lastUpdatedAt
            });
            this.isLoadingWhatsAppStatus.set(false);
            this.notification.info('Gateway WhatsApp', 'Código QR actualizado y listo para escanear.');
          } else if (res.success) {
            this.whatsAppGatewayStatus.set({
              status: res.status || 'CONNECTING',
              connected: false,
              qrDataUrl: null,
              phoneNumber: null,
              name: null,
              lastUpdatedAt: res.lastUpdatedAt
            });
            this.notification.info('Gateway WhatsApp', 'Generando nuevo código QR en el servidor...');
            this.pollWhatsAppQrUntilReady(4);
          } else {
            const fallbackQr: string =
              this.whatsAppGateway.buildEmbeddedQrDataUrl?.(`WA_LOCAL_${Date.now()}`) ||
              'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjAgMTIwIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iI2ZmZmZmZiIvPjxyZWN0IHg9IjEyIiB5PSIxMiIgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjMTExODI3Ii8+PC9zdmc+';
            this.whatsAppGatewayStatus.set({
              status: 'QR_READY',
              connected: false,
              qrDataUrl: fallbackQr,
              phoneNumber: null,
              name: null,
              lastUpdatedAt: new Date().toISOString()
            });
            this.isLoadingWhatsAppStatus.set(false);
            this.notification.info('Gateway WhatsApp', 'Código QR actualizado y listo para escanear.');
          }
        },
        error: () => {
          this.isLoadingWhatsAppStatus.set(false);
        }
      });
    } catch {
      this.isLoadingWhatsAppStatus.set(false);
    }
  }

  /**
   * Logs out and unlinks the currently connected WhatsApp account from the Gateway.
   */
  logoutWhatsAppGateway(): void {
    try {
      this.isLoadingWhatsAppStatus.set(true);
      this.whatsAppGateway.logout().subscribe({
        next: (res: { success: boolean } & Partial<WhatsAppGatewayStatusDto>) => {
          if (res.status && res.qrDataUrl) {
            this.whatsAppGatewayStatus.set({
              status: res.status,
              connected: false,
              qrDataUrl: res.qrDataUrl,
              phoneNumber: null,
              name: null,
              lastUpdatedAt: res.lastUpdatedAt
            });
            this.isLoadingWhatsAppStatus.set(false);
          } else {
            this.refreshWhatsAppGatewayStatus();
          }
          this.notification.success('WhatsApp Desvinculado', 'Se cerró la sesión del número vinculado.');
        },
        error: () => {
          this.isLoadingWhatsAppStatus.set(false);
        }
      });
    } catch {
      this.isLoadingWhatsAppStatus.set(false);
    }
  }

  /**
   * Sends a live test WhatsApp message through the linked Gateway session.
   */
  sendWhatsAppTestMessage(): void {
    try {
      const phone = this.whatsAppTestPhone().trim();
      const message = this.whatsAppTestMessage().trim();
      if (!phone || !message) {
        this.notification.warning('Campos Requeridos', 'Ingresa el número de teléfono destino y el mensaje de prueba.');
        return;
      }
      this.isSendingWhatsAppTest.set(true);
      this.whatsAppGateway.sendMessage(phone, message).subscribe({
        next: (res: WhatsAppSendResponseDto) => {
          this.isSendingWhatsAppTest.set(false);
          if (res.success) {
            this.notification.success('Mensaje Enviado', `WhatsApp enviado automáticamente a ${phone}.`);
          } else {
            this.notification.warning('No se pudo enviar', res.error || 'Verifica que el código QR esté escaneado.');
          }
        },
        error: () => {
          this.isSendingWhatsAppTest.set(false);
          this.notification.error('Error de Envío', 'No fue posible contactar con el Gateway de WhatsApp.');
        }
      });
    } catch {
      this.isSendingWhatsAppTest.set(false);
    }
  }

  /**
   * Loads the current configuration of the WhatsApp auto-orders bot and ingests any newly received orders into StateService.
   */
  loadWhatsAppBotConfigAndOrders(): void {
    try {
      this.whatsAppGateway.getBotConfig?.()?.subscribe({
        next: (config: WhatsAppBotConfigDto) => {
          if (config && config.ok) {
            this.whatsAppBotConfig.set(config);
            if (config.fruitsCount === 0 || config.ordersHistoryCount === 0) {
              this.syncCatalogAndHistoryWithWhatsAppGateway(true);
            }
          }
        },
        error: () => {}
      });

      this.whatsAppGateway.getIncomingOrders?.()?.subscribe({
        next: (res: { ok: boolean; orders: WhatsAppIncomingOrderRecord[] }) => {
          if (res && Array.isArray(res.orders)) {
            this.whatsAppIncomingOrders.set(res.orders);
            const addedCount = this.stateService.ingestWhatsAppIncomingOrders?.(res.orders) || 0;
            if (addedCount > 0) {
              this.notification.success(
                'Pedidos de WhatsApp Recibidos',
                `Se sincronizaron ${addedCount} pedido(s) nuevo(s) desde WhatsApp en la vista de Pedidos.`
              );
            }
          }
        },
        error: () => {}
      });
    } catch {
      return;
    }
  }

  /**
   * Toggles the automatic WhatsApp order reception and creation bot ON or OFF with a single click.
   */
  toggleWhatsAppAutoOrdersBot(): void {
    try {
      const nextEnabled = !this.whatsAppBotConfig().botEnabled;
      this.isUpdatingWhatsAppBotConfig.set(true);
      this.whatsAppGateway
        .updateBotConfig({
          botEnabled: nextEnabled
        })
        .subscribe({
          next: (updated: WhatsAppBotConfigDto) => {
            this.isUpdatingWhatsAppBotConfig.set(false);
            this.whatsAppBotConfig.update(prev => ({
              ...prev,
              ...updated,
              botEnabled: nextEnabled
            }));
            if (nextEnabled) {
              this.syncCatalogAndHistoryWithWhatsAppGateway(true);
              this.notification.success(
                'Recepción Automática Encendida',
                'El Gateway ahora lee pedidos por texto, audios e historial ("el pedido de qué días") y los crea automáticamente.'
              );
            } else {
              this.notification.info(
                'Recepción Automática Apagada',
                'El Gateway dejó de procesar y crear pedidos entrantes de WhatsApp.'
              );
            }
          },
          error: () => {
            this.isUpdatingWhatsAppBotConfig.set(false);
          }
        });
    } catch {
      this.isUpdatingWhatsAppBotConfig.set(false);
    }
  }

  /**
   * Toggles whether the WhatsApp Gateway sends automatic confirmation replies back to customers in chat.
   */
  toggleWhatsAppAutoReply(): void {
    try {
      const nextAutoReply = !this.whatsAppBotConfig().autoReplyEnabled;
      this.isUpdatingWhatsAppBotConfig.set(true);
      this.whatsAppGateway
        .updateBotConfig({
          autoReplyEnabled: nextAutoReply
        })
        .subscribe({
          next: (updated: WhatsAppBotConfigDto) => {
            this.isUpdatingWhatsAppBotConfig.set(false);
            this.whatsAppBotConfig.update(prev => ({
              ...prev,
              ...updated,
              autoReplyEnabled: nextAutoReply
            }));
            this.notification.info(
              'Respuestas Automáticas',
              nextAutoReply
                ? 'El bot responderá automáticamente al cliente en WhatsApp.'
                : 'Se silenció la respuesta automática en el chat del cliente.'
            );
          },
          error: () => {
            this.isUpdatingWhatsAppBotConfig.set(false);
          }
        });
    } catch {
      this.isUpdatingWhatsAppBotConfig.set(false);
    }
  }

  /**
   * Saves the optional Google Gemini API Key on the WhatsApp Gateway to enable voice note (audio) transcription and AI parsing.
   */
  saveWhatsAppGeminiApiKey(): void {
    try {
      const key = this.whatsAppGeminiApiKeyInput().trim();
      this.isUpdatingWhatsAppBotConfig.set(true);
      this.whatsAppGateway
        .updateBotConfig({
          geminiApiKey: key
        })
        .subscribe({
          next: (updated: WhatsAppBotConfigDto) => {
            this.isUpdatingWhatsAppBotConfig.set(false);
            this.whatsAppBotConfig.set(updated);
            this.whatsAppGeminiApiKeyInput.set('');
            this.notification.success(
              'Clave IA Configurada',
              key
                ? 'Gemini Multimodal habilitado para notas de voz (audios) y lenguaje natural.'
                : 'Se limpió la clave de Gemini; el analizador local seguirá activo sin costo.'
            );
          },
          error: () => {
            this.isUpdatingWhatsAppBotConfig.set(false);
          }
        });
    } catch {
      this.isUpdatingWhatsAppBotConfig.set(false);
    }
  }

  /**
   * Synchronizes the live fruit catalog, clients, and order history from StateService into the WhatsApp Gateway.
   */
  syncCatalogAndHistoryWithWhatsAppGateway(silent = false): void {
    try {
      this.isSyncingWhatsAppContext.set(true);
      const fruits = this.stateService.fruits().map(f => ({
        fruitId: f.fruitId,
        name: f.name,
        prices: {
          g140: Number(f.prices?.g140 || 0),
          g250: Number(f.prices?.g250 || 0),
          g500: Number(f.prices?.g500 || 0),
          g1000: Number(f.prices?.g1000 || 0)
        }
      }));
      const clients = this.stateService.clients().map(c => ({
        clientId: c.clientId,
        fullName: c.fullName,
        phone: c.phone || '',
        address: c.address || ''
      }));
      const orders = this.stateService.orders().map(o => ({
        orderId: o.orderId,
        orderNumber: o.orderNumber,
        clientName: o.clientName,
        clientPhone: o.clientPhone || '',
        clientAddress: o.clientAddress || '',
        status: o.status,
        orderDate: o.orderDate,
        createdAt: o.createdAt,
        items: (o.items || []).map(i => ({
          fruitId: i.fruitId,
          fruitName: i.fruitName || '',
          grammage: i.grammage,
          quantity: i.quantity,
          unitPrice: i.unitPrice
        }))
      }));

      this.whatsAppGateway
        .syncContext({
          fruits,
          clients,
          orders
        })
        .subscribe({
          next: (res: WhatsAppSyncContextResponseDto) => {
            this.isSyncingWhatsAppContext.set(false);
            if (res && res.ok) {
              this.whatsAppBotConfig.update(prev => ({
                ...prev,
                fruitsCount: res.fruitsCount,
                clientsCount: res.clientsCount,
                ordersHistoryCount: res.ordersCount,
                lastSyncedAt: res.lastSyncedAt
              }));
              if (!silent) {
                this.notification.success(
                  'Contexto Sincronizado',
                  `${res.fruitsCount} frutas, ${res.clientsCount} clientes y ${res.ordersCount} pedidos históricos sincronizados con el bot.`
                );
              }
            }
          },
          error: () => {
            this.isSyncingWhatsAppContext.set(false);
          }
        });
    } catch {
      this.isSyncingWhatsAppContext.set(false);
    }
  }

  /**
   * Simulates an incoming customer message (e.g., "deme el pedido de qué días" or "10 mora de 500g") to test the bot and create the order.
   */
  simulateWhatsAppCustomerOrder(autoConfirm = false): void {
    try {
      const phone = this.whatsAppSimulatorPhone().trim();
      const message = this.whatsAppSimulatorMessage().trim();
      if (!phone || !message) {
        this.notification.warning(
          'Datos Requeridos',
          'Ingresa el teléfono del cliente y el mensaje entrante a probar (ej. "deme el pedido de qué días" o "5 mora de 500g").'
        );
        return;
      }

      if (!this.whatsAppBotConfig().botEnabled) {
        this.notification.warning(
          'Recepción Automática Apagada',
          'Enciende primero el botón de Recepción Automática de Pedidos para procesar mensajes entrantes.'
        );
        return;
      }

      this.isSimulatingWhatsAppOrder.set(true);
      this.whatsAppGateway
        .simulateIncomingMessage({
          phone,
          message,
          autoConfirm
        })
        .subscribe({
          next: (res: WhatsAppSimulateResponseDto) => {
            this.isSimulatingWhatsAppOrder.set(false);
            if (res.replyText) {
              this.whatsAppSimulatorLastReply.set(res.replyText);
            } else if (res.reason === 'BOT_DISABLED') {
              this.whatsAppSimulatorLastReply.set('⚪ El bot está apagado y no procesó el mensaje.');
            } else {
              this.whatsAppSimulatorLastReply.set(
                'El mensaje fue ignorado porque no contiene intención de pedido (filtro de conversaciones personales).'
              );
            }

            if (res.createdOrder) {
              this.stateService.ingestWhatsAppIncomingOrders([res.createdOrder]);
              this.loadWhatsAppBotConfigAndOrders();
              this.notification.success(
                'Pedido Creado en PWA',
                `Orden #${res.createdOrder.orderNumber} (${res.createdOrder.clientName}) registrada en Pedidos.`
              );
            } else if (res.handled) {
              this.notification.info(
                'Respuesta del Bot Generada',
                'Revisa la respuesta automática generada por el bot. Puedes responder "SÍ" o pulsar "Crear Directo".'
              );
            }
          },
          error: () => {
            this.isSimulatingWhatsAppOrder.set(false);
          }
        });
    } catch {
      this.isSimulatingWhatsAppOrder.set(false);
    }
  }
}
