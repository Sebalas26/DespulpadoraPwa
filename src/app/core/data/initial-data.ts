import {
  BatchDto,
  ClientDto,
  CompanyConfig,
  EmployeeDto,
  ExpenseDto,
  OrderDto,
  PaymentMethodDto,
  PayrollPeriodDto,
  PayrollSettlementDto,
  ProductVariantDto,
  SalesTargetDto,
  WorkShiftDto
} from '../models/business.models';

/**
 * Fruit master catalog configuration for plant and inventory state.
 */
export interface FruitConfig {
  id: string;
  fruitId?: number;
  name: string;
  scientificName: string;
  color: string;
  bgColor: string;
  borderColor?: string;
  emoji: string;
  yieldRate: number;
  waterAdditionDefault: number;
  freshStockKg: number;
  stock: {
    g100?: number;
    g140: number;
    g250: number;
    g500: number;
    g1000: number;
  };
  minStock: { g100?: number; g140: number; g250: number; g500: number; g1000: number };
  prices: { g100?: number; g140: number; g250: number; g500: number; g1000: number };
  costPerKg?: number;
  category: 'PULPAS' | 'CONSERVAS' | 'MERMELADAS' | 'INFUSIONES';
}

/**
 * Commercial promotion configuration.
 */
export interface PromotionConfig {
  id: string;
  name: string;
  description: string;
  discountPercent: number;
  freeItemName: string;
  badge: string;
}

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
  logoUrl: '',
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
