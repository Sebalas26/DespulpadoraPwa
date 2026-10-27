import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { FruitConfig, INITIAL_PROMOTIONS, DEFAULT_COMPANY_CONFIG, PromotionConfig } from '../../core/data/initial-data';
import {
  InventoryCategoryConfig,
  InventoryColumnConfig,
  InventoryGrammageConfig,
  ProductCategory,
  ProductVariantDto,
  CompanyConfig,
  PaymentMethodDto
} from '../../core/models/business.models';
import { AuthService } from '../../core/services/auth.service';
import { AdminUsersComponent } from '../admin/users/users.component';
import { AdminRolesComponent } from '../admin/roles/roles.component';
import { SystemCatalogComponent } from '../admin/system-catalog/system-catalog.component';
import { CopCurrencyInputDirective } from '../../shared/directives/cop-currency-input.directive';

const DEFAULT_CATEGORIES: InventoryCategoryConfig[] = [
  { id: 'PULPAS', name: 'Pulpas Puras', icon: '', badgeClass: 'badge-warning', isActive: true },
  { id: 'LIMONADAS', name: 'Bases Limonadas', icon: '', badgeClass: 'badge-info', isActive: true },
  { id: 'BATIDOS', name: 'Batidos Funcionales', icon: '', badgeClass: 'badge-emerald', isActive: true },
  { id: 'ESPECIAL', name: 'Especiales / Combos', icon: '', badgeClass: 'badge-purple', isActive: true }
];

const DEFAULT_GRAMMAGES: InventoryGrammageConfig[] = [
  { key: 'g140', value: 140, label: '140g', isActive: true },
  { key: 'g250', value: 250, label: '250g', isActive: true },
  { key: 'g500', value: 500, label: '500g (1/2 Kg)', isActive: true },
  { key: 'g1000', value: 1000, label: '1000g (1 Kg)', isActive: true }
];

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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly Math = Math;

  readonly activeTab = signal<'general' | 'inventory' | 'users' | 'roles' | 'catalog' | 'parameters'>('general');
  readonly inventorySubTab = signal<'variants' | 'fruits'>('variants');
  readonly parametersSubTab = signal<'paymentMethods' | 'grammages' | 'categories'>('paymentMethods');
  readonly mobileConfigModuleSelected = signal<boolean>(false);

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

  readonly categoriesConfig = signal<InventoryCategoryConfig[]>(this.loadCategories());
  readonly grammagesConfig = signal<InventoryGrammageConfig[]>(this.loadGrammages());
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

  readonly promotions = signal<PromotionConfig[]>(INITIAL_PROMOTIONS);

  readonly totalPulpUnitsStock = computed<number>(() => {
    try {
      return this.stateService.productVariants().reduce((sum, v) => sum + (v.currentStock || 0), 0);
    } catch {
      return 0;
    }
  });

  readonly activeCategories = computed<InventoryCategoryConfig[]>(() => {
    try {
      return this.categoriesConfig().filter(c => c.isActive);
    } catch {
      return [];
    }
  });

  readonly activeGrammages = computed<InventoryGrammageConfig[]>(() => {
    try {
      return this.grammagesConfig().filter(g => g.isActive);
    } catch {
      return [];
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
    subTab?: 'paymentMethods' | 'grammages' | 'categories'
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
      this.categoriesConfig.update(cats =>
        cats.map(c => {
          if (c.id === id) {
            return { ...c, isActive: !c.isActive };
          }
          return c;
        })
      );
      this.saveCategories();
    } catch {
      return;
    }
  }

  /**
   * Toggles the active state of a grammage presentation.
   */
  toggleGrammage(key: string): void {
    try {
      this.grammagesConfig.update(grams =>
        grams.map(g => {
          if (g.key === key) {
            return { ...g, isActive: !g.isActive };
          }
          return g;
        })
      );
      this.saveGrammages();
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

      this.categoriesConfig.update(cats => [...cats, newCat]);
      this.saveCategories();
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
          this.categoriesConfig.update(cats => cats.filter(c => c.id !== cat.id));
          if (this.categoryFilter() === cat.id) {
            this.categoryFilter.set('ALL');
          }
          this.saveCategories();
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

      this.grammagesConfig.update(grams => [...grams, newGram]);
      this.saveGrammages();
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

      this.grammagesConfig.update(grams => grams.filter(g => g.key !== key));
      if (this.grammageFilter() === gram.value) {
        this.grammageFilter.set('ALL');
      }
      this.saveGrammages();
      this.notification.info('Gramaje Eliminado', `Gramaje de ${gram.label} eliminado.`);
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
}
