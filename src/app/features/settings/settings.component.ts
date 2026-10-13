import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { NotificationService } from '../../core/services/notification.service';
import { FruitConfig, INITIAL_PROMOTIONS, DEFAULT_COMPANY_CONFIG } from '../../core/data/initial-data';
import {
  InventoryCategoryConfig,
  InventoryColumnConfig,
  InventoryGrammageConfig,
  ProductCategory,
  ProductVariantDto,
  CompanyConfig
} from '../../core/models/business.models';
import { AdminUsersComponent } from '../admin/users/users.component';
import { AdminRolesComponent } from '../admin/roles/roles.component';

const DEFAULT_CATEGORIES: InventoryCategoryConfig[] = [
  { id: 'PULPAS', name: 'Pulpas Puras', icon: '🥭', badgeClass: 'badge-warning', isActive: true },
  { id: 'LIMONADAS', name: 'Bases Limonadas', icon: '🥥', badgeClass: 'badge-info', isActive: true },
  { id: 'BATIDOS', name: 'Batidos Funcionales', icon: '🌿', badgeClass: 'badge-emerald', isActive: true },
  { id: 'ESPECIAL', name: 'Especiales / Combos', icon: '✨', badgeClass: 'badge-purple', isActive: true }
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
  { key: 'currentStock', label: 'Stock en Cava', description: 'Existencias físicas en bodega/cava en tiempo real', visible: true },
  { key: 'status', label: 'Alerta Stock', description: 'Aviso visual cuando el inventario está bajo el mínimo', visible: true },
  { key: 'quickAdjust', label: 'Ajuste Rápido', description: 'Botones instantáneos para sumar o restar existencias (-10, +10, +50)', visible: true },
  { key: 'actions', label: 'Acciones', description: 'Opciones de edición rápida y retiro de presentaciones', visible: true }
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminUsersComponent, AdminRolesComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  readonly stateService = inject(StateService);
  readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  readonly Math = Math;

  readonly activeTab = signal<'general' | 'inventory' | 'users' | 'roles'>('general');
  readonly inventorySubTab = signal<'variants' | 'fruits'>('variants');

  // ==========================================
  // COMPANY GENERAL & BILLING CONFIGURATION
  // ==========================================
  readonly companyForm = signal<CompanyConfig>({ ...this.stateService.companyInfo() });

  updateCompanyField<K extends keyof CompanyConfig>(field: K, value: CompanyConfig[K]) {
    this.companyForm.update(curr => ({ ...curr, [field]: value }));
  }

  saveCompanySettings() {
    this.stateService.updateCompanyInfo(this.companyForm());
  }

  resetCompanyDefaults() {
    if (confirm('¿Deseas restaurar la información predeterminada de la empresa?')) {
      this.companyForm.set({ ...DEFAULT_COMPANY_CONFIG });
      this.stateService.updateCompanyInfo(DEFAULT_COMPANY_CONFIG);
    }
  }

  onLogoFileSelected(event: Event) {
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
  }

  removeLogo() {
    this.updateCompanyField('logoUrl', '');
  }

  // ==========================================
  // PARAMETRIZED INVENTORY CONFIGURATION SIGNALS
  // ==========================================
  readonly categoriesConfig = signal<InventoryCategoryConfig[]>(this.loadCategories());
  readonly grammagesConfig = signal<InventoryGrammageConfig[]>(this.loadGrammages());
  readonly columnsConfig = signal<InventoryColumnConfig[]>(this.loadColumns());
  readonly pageSize = signal<number | 'all'>(this.loadPageSize());

  // Search & Filters
  readonly categoryFilter = signal<string>('ALL');
  readonly grammageFilter = signal<number | 'ALL'>('ALL');
  readonly searchQuery = signal<string>('');
  readonly currentPage = signal<number>(1);
  readonly sortField = signal<'name' | 'category' | 'grammage' | 'basePrice' | 'currentStock' | 'margin'>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  // ==========================================
  // MODALS
  // ==========================================
  readonly showSettingsModal = signal<boolean>(false);
  readonly settingsTab = signal<'categories' | 'grammages' | 'columns' | 'views'>('categories');

  readonly showNewVariantModal = signal<boolean>(false);
  readonly showEditVariantModal = signal<boolean>(false);
  readonly editingVariant = signal<ProductVariantDto | null>(null);

  readonly showAdjustModal = signal<boolean>(false);
  readonly selectedFruitForAdjust = signal<FruitConfig | null>(null);

  // Fruit stock adjust form
  readonly adjustGrammage = signal<'g140' | 'g250' | 'g500' | 'g1000'>('g140');
  readonly adjustDelta = signal<number>(10);
  readonly adjustReason = signal<string>('Inventario físico de control');

  // New Category Form
  readonly newCategoryName = signal<string>('');
  readonly newCategoryCode = signal<string>('');
  readonly newCategoryIcon = signal<string>('🍹');
  readonly newCategoryBadge = signal<string>('badge-info');

  // New Grammage Form
  readonly newGrammageValue = signal<number>(300);
  readonly newGrammageLabel = signal<string>('300g');

  // New Variant Form
  readonly newVariantName = signal<string>('');
  readonly newVariantSku = signal<string>('');
  readonly newVariantCategory = signal<ProductCategory>('PULPAS');
  readonly newVariantGrammage = signal<number>(140);
  readonly newVariantFruitId = signal<number>(1);
  readonly newVariantUnitCost = signal<number>(1200);
  readonly newVariantBasePrice = signal<number>(2500);
  readonly newVariantCurrentStock = signal<number>(100);
  readonly newVariantMinStock = signal<number>(30);

  // Promotions
  readonly promotions = signal(INITIAL_PROMOTIONS);

  constructor() {
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'general' || tab === 'empresa') {
        this.activeTab.set('general');
      } else if (tab === 'users' || tab === 'usuarios') {
        this.activeTab.set('users');
      } else if (tab === 'roles') {
        this.activeTab.set('roles');
      } else if (tab === 'inventory' || tab === 'cava' || tab === 'variants' || tab === 'fruits') {
        this.activeTab.set('inventory');
        if (tab === 'fruits') {
          this.inventorySubTab.set('fruits');
        } else {
          this.inventorySubTab.set('variants');
        }
      }
    });
  }

  // ==========================================
  // COMPUTED PROPERTIES
  // ==========================================
  readonly activeCategories = computed(() => {
    return this.categoriesConfig().filter(c => c.isActive);
  });

  readonly activeGrammages = computed(() => {
    return this.grammagesConfig().filter(g => g.isActive);
  });

  readonly categoryCounts = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = { ALL: this.stateService.productVariants().length };
    for (const v of this.stateService.productVariants()) {
      counts[v.category] = (counts[v.category] || 0) + 1;
    }
    return counts;
  });

  readonly isColumnVisible = (key: string): boolean => {
    const col = this.columnsConfig().find(c => c.key === key);
    return col ? col.visible : true;
  };

  readonly filteredVariants = computed<ProductVariantDto[]>(() => {
    let list = [...this.stateService.productVariants()];

    // Filter by Category
    const cat = this.categoryFilter();
    if (cat !== 'ALL') {
      list = list.filter(v => v.category === cat);
    }

    // Filter by Grammage
    const gram = this.grammageFilter();
    if (gram !== 'ALL') {
      list = list.filter(v => v.grammage === gram);
    }

    // Filter by Search
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.sku.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        v.fruitName.toLowerCase().includes(q)
      );
    }

    // Sort
    const field = this.sortField();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let valA: any;
      let valB: any;
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
  });

  readonly totalPages = computed<number>(() => {
    const totalItems = this.filteredVariants().length;
    const size = this.pageSize();
    if (size === 'all' || totalItems === 0) return 1;
    return Math.ceil(totalItems / size);
  });

  readonly paginatedVariants = computed<ProductVariantDto[]>(() => {
    const list = this.filteredVariants();
    const size = this.pageSize();
    if (size === 'all') return list;

    const page = Math.min(this.currentPage(), this.totalPages());
    const startIndex = (page - 1) * size;
    return list.slice(startIndex, startIndex + size);
  });

  readonly paginationInfo = computed(() => {
    const total = this.filteredVariants().length;
    const size = this.pageSize();
    if (total === 0) return { start: 0, end: 0, total: 0 };
    if (size === 'all') return { start: 1, end: total, total };

    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return { start, end, total };
  });

  // ==========================================
  // NAVIGATION & SORT ACTIONS
  // ==========================================
  setSort(field: 'name' | 'category' | 'grammage' | 'basePrice' | 'currentStock' | 'margin') {
    if (this.sortField() === field) {
      this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  setPageSize(size: number | 'all') {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.savePageSize(size);
  }

  // ==========================================
  // STOCK ADJUSTMENTS
  // ==========================================
  adjustVariant(variantId: number, delta: number) {
    this.stateService.adjustVariantStock(variantId, delta);
    this.notification.info('Stock Actualizado', `${delta > 0 ? '+' : ''}${delta} unidades registradas`);
  }

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

  // ==========================================
  // PARAMETRIZATION / CONFIGURATION METHODS
  // ==========================================
  toggleColumn(key: string) {
    this.columnsConfig.update(cols =>
      cols.map(c => {
        if (c.key === key && !c.locked) {
          return { ...c, visible: !c.visible };
        }
        return c;
      })
    );
    this.saveColumns();
  }

  toggleCategory(id: string) {
    this.categoriesConfig.update(cats =>
      cats.map(c => {
        if (c.id === id) {
          return { ...c, isActive: !c.isActive };
        }
        return c;
      })
    );
    this.saveCategories();
  }

  toggleGrammage(key: string) {
    this.grammagesConfig.update(grams =>
      grams.map(g => {
        if (g.key === key) {
          return { ...g, isActive: !g.isActive };
        }
        return g;
      })
    );
    this.saveGrammages();
  }

  addCustomCategory() {
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
      icon: this.newCategoryIcon() || '📦',
      badgeClass: this.newCategoryBadge() || 'badge-info',
      isCustom: true,
      isActive: true
    };

    this.categoriesConfig.update(cats => [...cats, newCat]);
    this.saveCategories();
    this.notification.success('Categoría Agregada', `La línea "${name}" ahora está disponible en el inventario.`);

    // Reset inputs
    this.newCategoryName.set('');
    this.newCategoryCode.set('');
    this.newCategoryIcon.set('🍹');
  }

  deleteCustomCategory(id: string) {
    const cat = this.categoriesConfig().find(c => c.id === id);
    if (!cat) return;

    // Check if variants are using this category
    const count = this.stateService.productVariants().filter(v => v.category === id).length;
    if (count > 0) {
      const confirmMsg = `Hay ${count} presentaciones asignadas a "${cat.name}". ¿Deseas eliminar la categoría de todos modos?`;
      if (!confirm(confirmMsg)) return;
    }

    this.categoriesConfig.update(cats => cats.filter(c => c.id !== id));
    if (this.categoryFilter() === id) {
      this.categoryFilter.set('ALL');
    }
    this.saveCategories();
    this.notification.info('Categoría Eliminada', `Línea "${cat.name}" retirada.`);
  }

  addCustomGrammage() {
    const val = Number(this.newGrammageValue());
    if (!val || val <= 0) {
      this.notification.error('Valor Inválido', 'Ingresa un gramaje mayor a cero.');
      return;
    }

    const key = `g${val}`;
    if (this.grammagesConfig().some(g => g.value === val)) {
      this.notification.error('Gramaje Duplicado', `El gramaje de ${val}g ya se encuentra registrado.`);
      return;
    }

    const label = this.newGrammageLabel().trim() || `${val}g`;
    const newGram: InventoryGrammageConfig = {
      key,
      value: val,
      label,
      isCustom: true,
      isActive: true
    };

    this.grammagesConfig.update(grams => [...grams, newGram]);
    this.saveGrammages();
    this.notification.success('Gramaje Agregado', `Presentación de ${label} disponible para configuración.`);

    this.newGrammageValue.set(val + 100);
    this.newGrammageLabel.set(`${val + 100}g`);
  }

  deleteCustomGrammage(key: string) {
    const gram = this.grammagesConfig().find(g => g.key === key);
    if (!gram) return;

    this.grammagesConfig.update(grams => grams.filter(g => g.key !== key));
    if (this.grammageFilter() === gram.value) {
      this.grammageFilter.set('ALL');
    }
    this.saveGrammages();
    this.notification.info('Gramaje Eliminado', `Gramaje de ${gram.label} eliminado.`);
  }

  // ==========================================
  // PRODUCT VARIANT CRUD
  // ==========================================
  openNewVariantModal() {
    // Generate default SKU
    const cat = this.categoriesConfig()[0]?.id || 'PULPAS';
    const fruit = this.stateService.fruits()[0];
    this.newVariantCategory.set(cat);
    this.newVariantFruitId.set(fruit?.fruitId || 1);
    this.newVariantName.set('');
    this.newVariantSku.set('');
    this.newVariantGrammage.set(140);
    this.newVariantUnitCost.set(1200);
    this.newVariantBasePrice.set(2500);
    this.newVariantCurrentStock.set(100);
    this.newVariantMinStock.set(30);

    this.showNewVariantModal.set(true);
  }

  onNewVariantFruitChange(fruitId: number) {
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
  }

  onNewVariantGrammageChange(g: number) {
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
  }

  createVariant() {
    const name = this.newVariantName().trim();
    if (!name) {
      this.notification.error('Faltan Datos', 'Por favor ingresa el nombre de la presentación.');
      return;
    }

    const fruit = this.stateService.fruits().find(f => (f.fruitId || f.id) === Number(this.newVariantFruitId()));
    const fruitName = fruit ? fruit.name : 'Fruta Genérica';

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
  }

  openEditVariantModal(variant: ProductVariantDto) {
    this.editingVariant.set({ ...variant });
    this.showEditVariantModal.set(true);
  }

  saveEditVariant() {
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
  }

  deleteVariant(variantId: number, name: string) {
    if (confirm(`¿Estás seguro de eliminar "${name}" del inventario?`)) {
      this.stateService.deleteProductVariant(variantId);
    }
  }

  // ==========================================
  // RESET DEFAULTS
  // ==========================================
  resetAllSettingsToDefault() {
    if (confirm('¿Deseas restablecer todas las configuraciones de columnas, categorías y opciones de visualización a los valores originales?')) {
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
  }

  // ==========================================
  // STORAGE HELPERS
  // ==========================================
  private loadCategories(): InventoryCategoryConfig[] {
    try {
      const data = localStorage.getItem('despulpadora_categories_config');
      return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }

  private saveCategories() {
    localStorage.setItem('despulpadora_categories_config', JSON.stringify(this.categoriesConfig()));
  }

  private loadGrammages(): InventoryGrammageConfig[] {
    try {
      const data = localStorage.getItem('despulpadora_grammages_config');
      return data ? JSON.parse(data) : DEFAULT_GRAMMAGES;
    } catch {
      return DEFAULT_GRAMMAGES;
    }
  }

  private saveGrammages() {
    localStorage.setItem('despulpadora_grammages_config', JSON.stringify(this.grammagesConfig()));
  }

  private loadColumns(): InventoryColumnConfig[] {
    try {
      const data = localStorage.getItem('despulpadora_columns_config');
      return data ? JSON.parse(data) : DEFAULT_COLUMNS;
    } catch {
      return DEFAULT_COLUMNS;
    }
  }

  private saveColumns() {
    localStorage.setItem('despulpadora_columns_config', JSON.stringify(this.columnsConfig()));
  }

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

  private savePageSize(size: number | 'all') {
    localStorage.setItem('despulpadora_page_size', String(size));
  }

  formatCOP(num: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num || 0);
  }
}
