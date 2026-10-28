import {
  BatchDto,
  ClientDto,
  CompanyConfig,
  EmployeeDto,
  ExpenseDto,
  FruitConfig,
  InventoryCategoryConfig,
  InventoryGrammageConfig,
  OrderDto,
  PaymentMethodDto,
  PayrollPeriodDto,
  PayrollSettlementDto,
  PortalCmsConfig,
  ProductVariantDto,
  PromotionConfig,
  SalesTargetDto,
  WorkShiftDto
} from '../models/business.models';

export type { FruitConfig, PromotionConfig, PortalCmsConfig, InventoryCategoryConfig, InventoryGrammageConfig };

/**
 * Alias for production batch record.
 */
export type ProductionBatch = BatchDto;

/**
 * Alias for monthly commercial sales target record.
 */
export type MonthlySalesTargetDto = SalesTargetDto;

/**
 * Empty initial fruit catalog array populated strictly from the backend API.
 */
export const INITIAL_FRUITS: FruitConfig[] = [];

/**
 * Empty initial promotions catalog array populated strictly from the backend API.
 */
export const INITIAL_PROMOTIONS: PromotionConfig[] = [];

/**
 * Empty initial employees array populated strictly from the backend API.
 */
export const INITIAL_EMPLOYEES_SAMPLE: EmployeeDto[] = [];

/**
 * Empty initial work shifts array populated strictly from the backend API.
 */
export const INITIAL_SHIFTS_SAMPLE: WorkShiftDto[] = [];

/**
 * Empty initial production batches array populated strictly from the backend API.
 */
export const INITIAL_BATCHES_SAMPLE: ProductionBatch[] = [];

/**
 * Empty initial commercial orders array populated strictly from the backend API.
 */
export const INITIAL_ORDERS_SAMPLE: OrderDto[] = [];

/**
 * Empty initial clients array populated strictly from the backend API.
 */
export const INITIAL_CLIENTS_SAMPLE: ClientDto[] = [];

/**
 * Empty initial product variants array populated strictly from the backend API.
 */
export const INITIAL_PRODUCT_VARIANTS: ProductVariantDto[] = [];

/**
 * Empty initial monthly sales targets array populated strictly from the backend API.
 */
export const INITIAL_SALES_TARGETS_SAMPLE: MonthlySalesTargetDto[] = [];

/**
 * Empty initial fortnightly payroll periods array populated strictly from the backend API.
 */
export const INITIAL_PAYROLL_PERIODS_SAMPLE: PayrollPeriodDto[] = [];

/**
 * Empty initial operational expenses array populated strictly from the backend API.
 */
export const INITIAL_EXPENSES_SAMPLE: ExpenseDto[] = [];

/**
 * Empty initial payroll settlements array populated strictly from the backend API.
 */
export const INITIAL_PAYROLL_SETTLEMENTS_SAMPLE: PayrollSettlementDto[] = [];

/**
 * Default unpopulated company configuration state prior to backend API synchronization.
 */
export const DEFAULT_COMPANY_CONFIG: CompanyConfig = {
  companyName: '',
  legalName: '',
  nit: '',
  logoUrl: '/logo-dgl.png',
  tagline: '',
  address: '',
  city: '',
  department: '',
  country: '',
  phone: '',
  whatsapp: '',
  email: '',
  billingEmail: '',
  operatingHours: '',
  dispatchHours: '',
  taxRegime: '',
  dianResolution: '',
  invoicePrefix: '',
  invoiceNextNumber: 1,
  invoiceFooterNote: '',
  taxPercentage: 0,
  monthlySalesTarget: 0
};

/**
 * Empty initial payment methods array populated strictly from the backend API.
 */
export const INITIAL_PAYMENT_METHODS: PaymentMethodDto[] = [];

/**
 * Default unpopulated client portal CMS configuration state.
 */
export const DEFAULT_PORTAL_CMS_CONFIG: PortalCmsConfig = {
  brandTagline: '',
  heroBadge: '',
  heroTitle: '',
  heroDescription: '',
  chip1Text: '',
  chip2Text: '',
  chip3Text: '',
  whatsappPhone: ''
};

/**
 * Default product categories configuration for inventory and catalog.
 */
export const DEFAULT_CATEGORIES: InventoryCategoryConfig[] = [
  { id: 'PULPAS', name: 'Pulpas Puras', icon: '', badgeClass: 'badge-warning', isActive: true },
  { id: 'LIMONADAS', name: 'Bases Limonadas', icon: '', badgeClass: 'badge-info', isActive: true },
  { id: 'BATIDOS', name: 'Batidos Funcionales', icon: '', badgeClass: 'badge-emerald', isActive: true },
  { id: 'ESPECIAL', name: 'Especiales / Combos', icon: '', badgeClass: 'badge-purple', isActive: true }
];

/**
 * Default product grammages and presentation sizes for inventory, catalog, and store.
 */
export const DEFAULT_GRAMMAGES: InventoryGrammageConfig[] = [
  { key: 'g140', value: 140, label: '140g', isActive: true },
  { key: 'g250', value: 250, label: '250g', isActive: true },
  { key: 'g500', value: 500, label: '500g (1/2 Kg)', isActive: true },
  { key: 'g1000', value: 1000, label: '1000g (1 Kg)', isActive: true }
];

