import { ExpenseDto, PayrollSettlementDto, PaymentMethodDto } from '../models/business.models';

export interface FruitConfig {
  id: string;
  fruitId?: number;
  name: string;
  scientificName: string;
  description?: string;
  imageUrl?: string;
  isVisibleInPortal?: boolean;
  color: string;
  bgColor: string;
  borderColor: string;
  emoji: string;
  yieldRate: number; // e.g. 0.58 = 58%
  waterAdditionDefault: number;
  freshStockKg: number;
  stock: {
    g140: number;
    g250: number;
    g500: number;
    g1000: number;
  };
  minStock: { g140: number; g250: number; g500: number; g1000: number };
  prices: { g140: number; g250: number; g500: number; g1000: number };
  category: string;
}

export interface PortalCmsConfig {
  brandTagline: string;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  chip1Text: string;
  chip2Text: string;
  chip3Text: string;
  whatsappPhone: string;
}

export const INITIAL_FRUITS: FruitConfig[] = [
  {
    id: 'maracuya',
    fruitId: 1,
    name: 'Maracuyá',
    scientificName: 'Passiflora edulis',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#D97706',
    emoji: '',
    yieldRate: 0.58,
    waterAdditionDefault: 0.10,
    freshStockKg: 280,
    stock: { g140: 120, g250: 85, g500: 40, g1000: 32 },
    minStock: { g140: 50, g250: 30, g500: 20, g1000: 15 },
    prices: { g140: 2000, g250: 3500, g500: 6200, g1000: 11000 },
    category: 'Ácida / Cítrica'
  },
  {
    id: 'mango',
    fruitId: 2,
    name: 'Mango Tommy',
    scientificName: 'Mangifera indica',
    color: '#EA580C',
    bgColor: 'rgba(234, 88, 12, 0.15)',
    borderColor: '#C2410C',
    emoji: '',
    yieldRate: 0.65,
    waterAdditionDefault: 0.08,
    freshStockKg: 350,
    stock: { g140: 160, g250: 110, g500: 65, g1000: 48 },
    minStock: { g140: 60, g250: 40, g500: 25, g1000: 20 },
    prices: { g140: 1800, g250: 3200, g500: 5800, g1000: 10500 },
    category: 'Dulce'
  },
  {
    id: 'lulo',
    fruitId: 3,
    name: 'Lulo de Castilla',
    scientificName: 'Solanum quitoense',
    color: '#65A30D',
    bgColor: 'rgba(101, 163, 13, 0.15)',
    borderColor: '#4D7C0F',
    emoji: '',
    yieldRate: 0.62,
    waterAdditionDefault: 0.10,
    freshStockKg: 190,
    stock: { g140: 45, g250: 30, g500: 18, g1000: 12 },
    minStock: { g140: 50, g250: 30, g500: 20, g1000: 15 },
    prices: { g140: 2200, g250: 3800, g500: 6800, g1000: 12500 },
    category: 'Ácida'
  },
  {
    id: 'mora',
    fruitId: 4,
    name: 'Mora de Castilla',
    scientificName: 'Rubus glaucus',
    color: '#9333EA',
    bgColor: 'rgba(147, 51, 234, 0.15)',
    borderColor: '#7E22CE',
    emoji: '',
    yieldRate: 0.72,
    waterAdditionDefault: 0.08,
    freshStockKg: 240,
    stock: { g140: 95, g250: 55, g500: 30, g1000: 22 },
    minStock: { g140: 50, g250: 30, g500: 15, g1000: 10 },
    prices: { g140: 2100, g250: 3600, g500: 6500, g1000: 11800 },
    category: 'Dulce'
  },
  {
    id: 'guanabana',
    fruitId: 5,
    name: 'Guanábana Criolla',
    scientificName: 'Annona muricata',
    color: '#0D9488',
    bgColor: 'rgba(13, 148, 136, 0.15)',
    borderColor: '#0F766E',
    emoji: '',
    yieldRate: 0.52,
    waterAdditionDefault: 0.08,
    freshStockKg: 130,
    stock: { g140: 35, g250: 24, g500: 15, g1000: 8 },
    minStock: { g140: 45, g250: 25, g500: 15, g1000: 10 },
    prices: { g140: 2400, g250: 4200, g500: 7500, g1000: 13800 },
    category: 'Dulce / Cremosa'
  },
  {
    id: 'guayaba',
    fruitId: 6,
    name: 'Guayaba Coronilla',
    scientificName: 'Psidium guajava',
    color: '#FB7185',
    bgColor: 'rgba(251, 113, 133, 0.15)',
    borderColor: '#F43F5E',
    emoji: '',
    yieldRate: 0.70,
    waterAdditionDefault: 0.08,
    freshStockKg: 210,
    stock: { g140: 140, g250: 80, g500: 38, g1000: 26 },
    minStock: { g140: 40, g250: 25, g500: 15, g1000: 10 },
    prices: { g140: 1700, g250: 3000, g500: 5500, g1000: 9800 },
    category: 'Semidulce'
  },
  {
    id: 'pina',
    fruitId: 7,
    name: 'Piña Oro Miel',
    scientificName: 'Ananas comosus',
    color: '#EAB308',
    bgColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: '#CA8A04',
    emoji: '',
    yieldRate: 0.60,
    waterAdditionDefault: 0.05,
    freshStockKg: 290,
    stock: { g140: 110, g250: 65, g500: 45, g1000: 35 },
    minStock: { g140: 40, g250: 25, g500: 15, g1000: 12 },
    prices: { g140: 1800, g250: 3200, g500: 5800, g1000: 10500 },
    category: 'Dulce'
  },
  {
    id: 'feijoa',
    fruitId: 8,
    name: 'Feijoa Boyacense',
    scientificName: 'Acca sellowiana',
    color: '#16A34A',
    bgColor: 'rgba(22, 163, 74, 0.15)',
    borderColor: '#15803D',
    emoji: '',
    yieldRate: 0.64,
    waterAdditionDefault: 0.08,
    freshStockKg: 95,
    stock: { g140: 50, g250: 35, g500: 20, g1000: 14 },
    minStock: { g140: 30, g250: 20, g500: 10, g1000: 8 },
    prices: { g140: 2100, g250: 3700, g500: 6600, g1000: 12000 },
    category: 'Ácida / Aromática'
  },
  {
    id: 'fresa',
    fruitId: 9,
    name: 'Fresa',
    scientificName: 'Fragaria vesca',
    color: '#E11D48',
    bgColor: 'rgba(225, 29, 72, 0.15)',
    borderColor: '#BE123C',
    emoji: '',
    yieldRate: 0.85,
    waterAdditionDefault: 0.05,
    freshStockKg: 220,
    stock: { g140: 90, g250: 60, g500: 35, g1000: 25 },
    minStock: { g140: 40, g250: 25, g500: 15, g1000: 10 },
    prices: { g140: 2200, g250: 3800, g500: 6800, g1000: 12500 },
    category: 'Dulce'
  },
  {
    id: 'tomate_arbol',
    fruitId: 10,
    name: 'Tomate de Árbol',
    scientificName: 'Solanum betaceum',
    color: '#DC2626',
    bgColor: 'rgba(220, 38, 38, 0.15)',
    borderColor: '#B91C1C',
    emoji: '',
    yieldRate: 0.65,
    waterAdditionDefault: 0.08,
    freshStockKg: 180,
    stock: { g140: 75, g250: 50, g500: 30, g1000: 20 },
    minStock: { g140: 35, g250: 20, g500: 15, g1000: 10 },
    prices: { g140: 1900, g250: 3300, g500: 5900, g1000: 10800 },
    category: 'Semidulce'
  },
  {
    id: 'uva',
    fruitId: 11,
    name: 'Uva Isabela',
    scientificName: 'Vitis labrusca',
    color: '#7E22CE',
    bgColor: 'rgba(126, 34, 206, 0.15)',
    borderColor: '#6B21A8',
    emoji: '',
    yieldRate: 0.70,
    waterAdditionDefault: 0.06,
    freshStockKg: 160,
    stock: { g140: 60, g250: 45, g500: 25, g1000: 18 },
    minStock: { g140: 30, g250: 20, g500: 12, g1000: 8 },
    prices: { g140: 2100, g250: 3600, g500: 6500, g1000: 11900 },
    category: 'Dulce'
  },
  {
    id: 'frutos_rojos',
    fruitId: 12,
    name: 'Frutos Rojos',
    scientificName: 'Mix Silvestre Premium',
    color: '#BE185D',
    bgColor: 'rgba(190, 24, 93, 0.15)',
    borderColor: '#9D174D',
    emoji: '',
    yieldRate: 0.78,
    waterAdditionDefault: 0.05,
    freshStockKg: 140,
    stock: { g140: 80, g250: 55, g500: 35, g1000: 22 },
    minStock: { g140: 35, g250: 25, g500: 15, g1000: 10 },
    prices: { g140: 2500, g250: 4400, g500: 7800, g1000: 14200 },
    category: 'Mix Especial'
  },
  {
    id: 'frutos_amarillos',
    fruitId: 13,
    name: 'Frutos Amarillos',
    scientificName: 'Mix Tropical Exótico',
    color: '#D97706',
    bgColor: 'rgba(217, 119, 6, 0.15)',
    borderColor: '#B45309',
    emoji: '',
    yieldRate: 0.68,
    waterAdditionDefault: 0.06,
    freshStockKg: 150,
    stock: { g140: 70, g250: 50, g500: 30, g1000: 20 },
    minStock: { g140: 35, g250: 25, g500: 15, g1000: 10 },
    prices: { g140: 2500, g250: 4400, g500: 7800, g1000: 14200 },
    category: 'Mix Especial'
  },
  {
    id: 'tamarindo',
    fruitId: 14,
    name: 'Tamarindo',
    scientificName: 'Tamarindus indica',
    color: '#92400E',
    bgColor: 'rgba(146, 64, 14, 0.15)',
    borderColor: '#78350F',
    emoji: '',
    yieldRate: 0.55,
    waterAdditionDefault: 0.10,
    freshStockKg: 110,
    stock: { g140: 55, g250: 38, g500: 22, g1000: 15 },
    minStock: { g140: 25, g250: 18, g500: 10, g1000: 8 },
    prices: { g140: 2200, g250: 3800, g500: 6900, g1000: 12600 },
    category: 'Ácida'
  },
  {
    id: 'borojo',
    fruitId: 15,
    name: 'Borojó del Chocó',
    scientificName: 'Borojoa patinoi',
    color: '#713F12',
    bgColor: 'rgba(113, 63, 18, 0.15)',
    borderColor: '#5B330F',
    emoji: '',
    yieldRate: 0.60,
    waterAdditionDefault: 0.08,
    freshStockKg: 90,
    stock: { g140: 40, g250: 28, g500: 16, g1000: 12 },
    minStock: { g140: 20, g250: 15, g500: 8, g1000: 6 },
    prices: { g140: 2600, g250: 4500, g500: 8200, g1000: 15000 },
    category: 'Nutricional / Energética'
  },
  {
    id: 'curuba',
    fruitId: 16,
    name: 'Curuba Sabanera',
    scientificName: 'Passiflora tarminiana',
    color: '#CA8A04',
    bgColor: 'rgba(202, 138, 4, 0.15)',
    borderColor: '#A16207',
    emoji: '',
    yieldRate: 0.62,
    waterAdditionDefault: 0.08,
    freshStockKg: 120,
    stock: { g140: 50, g250: 35, g500: 20, g1000: 14 },
    minStock: { g140: 25, g250: 18, g500: 10, g1000: 8 },
    prices: { g140: 2000, g250: 3500, g500: 6300, g1000: 11500 },
    category: 'Semidulce'
  }
];

export const INITIAL_PROMOTIONS = [
  {
    id: 'promo-lonchera-6',
    name: 'Combo Lonchera 6x140g (Surtidas)',
    description: '6 pulpas de 140g surtidas + 1 vaso termo dosificador de obsequio',
    discountPercent: 12,
    freeItemName: '1 Vaso Termo Promocional + 1 Pulpa 140g Mango',
    badge: 'MÁS VENDIDO'
  },
  {
    id: 'promo-familiar-10',
    name: 'Combo Familiar 10x140g + Obsequio',
    description: '10 pulpas de 140g a elección + 1 Pulpa de 140g gratis',
    discountPercent: 15,
    freeItemName: '1 Pulpa 140g Maracuyá Obsequio',
    badge: 'SUPER AHORRO'
  },
  {
    id: 'promo-restaurante-5k',
    name: 'Combo Horeca 5x1000g (Restaurantes/Cafés)',
    description: '5 Kilos de pulpa pura 100% pasteurizada con 10% de descuento',
    discountPercent: 10,
    freeItemName: 'Envío Gratis + 1 Kg Lulo de Degustación',
    badge: 'MAYORISTA'
  }
];

export const INITIAL_EMPLOYEES_SAMPLE = [
  {
    employeeId: 1,
    firstName: 'Hernando',
    lastName: 'Ruiz Gómez',
    fullName: 'Hernando Ruiz Gómez',
    identificationNumber: '79.845.120',
    gender: 'MASCULINO' as const,
    area: 'PRODUCCION' as const,
    phone: '310 456 1234',
    email: 'hernando.ruiz@pulpaspro.com',
    position: 'Jefe de Planta & Producción',
    department: 'Producción',
    baseSalary: 2800000,
    transportAllowance: 162000,
    deliveryBonusRate: 0,
    hireDate: '2022-03-15',
    isActive: true,
    bankName: 'Bancolombia',
    bankAccountType: 'Cuenta de Ahorros',
    bankAccountNumber: '458-921478-12'
  },
  {
    employeeId: 2,
    firstName: 'María Fernanda',
    lastName: 'Castillo',
    fullName: 'María Fernanda Castillo',
    identificationNumber: '1.018.445.990',
    gender: 'FEMENINO' as const,
    area: 'PRODUCCION' as const,
    phone: '315 789 4521',
    email: 'maria.castillo@pulpaspro.com',
    position: 'Operaria de Despulpado & Calidad',
    department: 'Producción',
    baseSalary: 1600000,
    transportAllowance: 162000,
    deliveryBonusRate: 0,
    hireDate: '2023-05-10',
    isActive: true,
    bankName: 'Davivienda',
    bankAccountType: 'Cuenta de Ahorros',
    bankAccountNumber: '0089-7412-5563'
  },
  {
    employeeId: 3,
    firstName: 'Carlos Andrés',
    lastName: 'Montoya',
    fullName: 'Carlos Andrés Montoya',
    identificationNumber: '98.324.551',
    gender: 'MASCULINO' as const,
    area: 'PRODUCCION' as const,
    phone: '312 901 2345',
    email: 'carlos.montoya@pulpaspro.com',
    position: 'Operario de Cava y Empaque',
    department: 'Producción',
    baseSalary: 1550000,
    transportAllowance: 162000,
    deliveryBonusRate: 0,
    hireDate: '2023-01-20',
    isActive: true,
    bankName: 'Bancolombia',
    bankAccountType: 'Cuenta de Ahorros',
    bankAccountNumber: '312-901234-55'
  },
  {
    employeeId: 4,
    firstName: 'Julián David',
    lastName: 'Pérez Silva',
    fullName: 'Julián David Pérez Silva',
    identificationNumber: '1.020.334.887',
    gender: 'MASCULINO' as const,
    area: 'DOMICILIOS' as const,
    phone: '311 889 0012',
    email: 'julian.perez@pulpaspro.com',
    position: 'Domiciliario & Entregas Flota',
    department: 'Logística',
    baseSalary: 1400000,
    transportAllowance: 162000,
    deliveryBonusRate: 3500,
    hireDate: '2023-08-15',
    isActive: true,
    bankName: 'Nequi / Bancolombia',
    bankAccountType: 'Cuenta de Ahorros',
    bankAccountNumber: '311-8890012'
  },
  {
    employeeId: 5,
    firstName: 'Sandra Patricia',
    lastName: 'Ospina',
    fullName: 'Sandra Patricia Ospina',
    identificationNumber: '52.981.233',
    gender: 'FEMENINO' as const,
    area: 'ADMINISTRACION' as const,
    phone: '320 333 4455',
    email: 'sandra.ospina@pulpaspro.com',
    position: 'Auxiliar Contable y Facturación',
    department: 'Administración',
    baseSalary: 1900000,
    transportAllowance: 162000,
    deliveryBonusRate: 0,
    hireDate: '2022-08-01',
    isActive: true,
    bankName: 'Banco de Bogotá',
    bankAccountType: 'Cuenta de Ahorros',
    bankAccountNumber: '145-889230-01'
  }
];

export const INITIAL_SHIFTS_SAMPLE = [
  {
    shiftId: 201,
    employeeId: 1,
    employeeName: 'Hernando Ruiz Gómez',
    branchId: 1,
    branchName: 'Planta Principal',
    startTime: '06:00 AM',
    shiftType: 'MORNING' as const,
    status: 'ACTIVE' as const,
    notes: 'Supervisión de despulpado de maracuyá y mora'
  },
  {
    shiftId: 202,
    employeeId: 2,
    employeeName: 'María Fernanda Castillo',
    branchId: 1,
    branchName: 'Planta Principal',
    startTime: '06:30 AM',
    shiftType: 'MORNING' as const,
    status: 'ACTIVE' as const,
    notes: 'Línea de dosificación y sellado 140g'
  },
  {
    shiftId: 203,
    employeeId: 3,
    employeeName: 'Carlos Andrés Montoya',
    branchId: 1,
    branchName: 'Planta Principal',
    startTime: '07:00 AM',
    shiftType: 'MORNING' as const,
    status: 'ACTIVE' as const,
    notes: 'Control de cava y despacho de pedidos'
  }
];

export const INITIAL_BATCHES_SAMPLE = [
  {
    batchId: 101,
    batchCode: 'LOTE-2026-0310-01',
    fruitId: 1,
    fruitName: 'Maracuyá',
    branchId: 1,
    branchName: 'Planta Principal',
    grossFruitKg: 150,
    pulpProducedKg: 91.5,
    realYieldPercentage: 61.0,
    costPerKg: 3200,
    status: 'COMPLETED' as const,
    operatorName: 'Hernando Ruiz',
    productionDate: '2026-03-10T08:00:00',
    createdAt: '2026-03-10T08:00:00'
  },
  {
    batchId: 102,
    batchCode: 'LOTE-2026-0311-01',
    fruitId: 2,
    fruitName: 'Mango Tommy',
    branchId: 1,
    branchName: 'Planta Principal',
    grossFruitKg: 200,
    pulpProducedKg: 134.0,
    realYieldPercentage: 67.0,
    costPerKg: 2800,
    status: 'COMPLETED' as const,
    operatorName: 'María Fernanda Castillo',
    productionDate: '2026-03-11T09:30:00',
    createdAt: '2026-03-11T09:30:00'
  },
  {
    batchId: 103,
    batchCode: 'LOTE-2026-0312-01',
    fruitId: 4,
    fruitName: 'Mora de Castilla',
    branchId: 1,
    branchName: 'Planta Principal',
    grossFruitKg: 120,
    pulpProducedKg: 87.6,
    realYieldPercentage: 73.0,
    costPerKg: 3500,
    status: 'COMPLETED' as const,
    operatorName: 'Hernando Ruiz',
    productionDate: '2026-03-12T07:15:00',
    createdAt: '2026-03-12T07:15:00'
  }
];

export const INITIAL_ORDERS_SAMPLE = [
  {
    orderId: 1001,
    orderNumber: 'PED-2026-001',
    branchId: 1,
    branchName: 'Planta Principal',
    clientId: 1,
    clientName: 'Restaurante Wok Parque 93',
    clientPhone: '315 456 7890',
    clientAddress: 'Calle 93A # 13-25, Chicó Norte, Bogotá',
    status: 'DELIVERED' as const,
    orderDate: '2026-03-11',
    totalAmount: 184000,
    isPaid: true,
    paymentMethodName: 'Transferencia Bancolombia',
    notes: 'Entregar antes de las 11:00 AM en cocina principal',
    createdAt: '2026-03-11T08:30:00',
    items: [
      { fruitId: 1, fruitName: 'Maracuyá', grammage: 1000 as const, quantity: 8, unitPrice: 11000, subtotal: 88000, pickedQuantity: 8 },
      { fruitId: 2, fruitName: 'Mango Tommy', grammage: 1000 as const, quantity: 6, unitPrice: 10500, subtotal: 63000, pickedQuantity: 6 },
      { fruitId: 3, fruitName: 'Lulo de Castilla', grammage: 500 as const, quantity: 5, unitPrice: 6600, subtotal: 33000, pickedQuantity: 5 }
    ]
  },
  {
    orderId: 1002,
    orderNumber: 'PED-2026-002',
    branchId: 1,
    branchName: 'Planta Principal',
    clientId: 2,
    clientName: 'Café & Panadería Usaquén Gourmet',
    clientPhone: '310 987 6543',
    clientAddress: 'Cra 6A # 119-24, Usaquén, Bogotá',
    status: 'DISPATCHED' as const,
    orderDate: '2026-03-12',
    totalAmount: 126400,
    isPaid: false,
    paymentMethodName: 'Contra Entrega Efectivo',
    notes: 'Verificar cadena de frío al entregar',
    createdAt: '2026-03-12T09:15:00',
    items: [
      { fruitId: 4, fruitName: 'Mora de Castilla', grammage: 140 as const, quantity: 24, unitPrice: 2100, subtotal: 50400, pickedQuantity: 24 },
      { fruitId: 1, fruitName: 'Maracuyá', grammage: 140 as const, quantity: 20, unitPrice: 2000, subtotal: 40000, pickedQuantity: 20 },
      { fruitId: 5, fruitName: 'Guanábana Criolla', grammage: 250 as const, quantity: 8, unitPrice: 4500, subtotal: 36000, pickedQuantity: 8 }
    ]
  },
  {
    orderId: 1003,
    orderNumber: 'PED-2026-003',
    branchId: 1,
    branchName: 'Planta Principal',
    clientId: 3,
    clientName: 'Bistro Gourmet Chapinero Alto Zona G',
    clientPhone: '318 222 3344',
    clientAddress: 'Cra 5 # 69-18, Chapinero, Bogotá',
    status: 'PICKING' as const,
    orderDate: '2026-03-12',
    totalAmount: 95500,
    isPaid: false,
    paymentMethodName: 'Nequi',
    notes: 'Pedido confirmado vía WhatsApp',
    createdAt: '2026-03-12T10:00:00',
    items: [
      { fruitId: 2, fruitName: 'Mango Tommy', grammage: 500 as const, quantity: 10, unitPrice: 5800, subtotal: 58000, pickedQuantity: 5 },
      { fruitId: 3, fruitName: 'Lulo de Castilla', grammage: 250 as const, quantity: 10, unitPrice: 3750, subtotal: 37500, pickedQuantity: 0 }
    ]
  }
];

export const INITIAL_CLIENTS_SAMPLE = [
  {
    clientId: 1,
    fullName: 'Restaurante El Portal del Valle',
    identificationNumber: '900.876.543-1',
    phone: '315 456 7890',
    email: 'pedidos@portalvalle.com',
    address: 'Calle 45 # 12-30, Cali',
    city: 'Cali',
    isActive: true
  },
  {
    clientId: 2,
    fullName: 'Frutería y Helados Doña Luz',
    identificationNumber: '31.456.789',
    phone: '310 987 6543',
    email: 'donaluzfrutas@gmail.com',
    address: 'Cra 8 # 15-40, Palmira',
    city: 'Palmira',
    isActive: true
  },
  {
    clientId: 3,
    fullName: 'Café & Panadería La Estación',
    identificationNumber: '901.234.567-8',
    phone: '318 222 3344',
    email: 'contacto@cafelaestacion.co',
    address: 'Av 6N # 24-05, Cali',
    city: 'Cali',
    isActive: true
  }
];

// ==========================================
// INITIAL PRODUCT VARIANTS (Pulpas, Limonadas, Batidos en 140g, 250g)
// ==========================================
export const INITIAL_PRODUCT_VARIANTS = [
  // PULPAS
  {
    variantId: 101,
    fruitId: 1,
    fruitName: 'Maracuyá',
    category: 'PULPAS' as const,
    sku: 'PULP-MAR-140G',
    name: 'Pulpa de Maracuyá 140g',
    grammage: 140 as const,
    unitCost: 1100,
    basePrice: 2000,
    minStockAlert: 50,
    currentStock: 120,
    isActive: true
  },
  {
    variantId: 102,
    fruitId: 1,
    fruitName: 'Maracuyá',
    category: 'PULPAS' as const,
    sku: 'PULP-MAR-250G',
    name: 'Pulpa de Maracuyá 250g',
    grammage: 250 as const,
    unitCost: 1850,
    basePrice: 3500,
    minStockAlert: 30,
    currentStock: 85,
    isActive: true
  },
  {
    variantId: 103,
    fruitId: 2,
    fruitName: 'Mango Tommy',
    category: 'PULPAS' as const,
    sku: 'PULP-MAN-140G',
    name: 'Pulpa de Mango Tommy 140g',
    grammage: 140 as const,
    unitCost: 950,
    basePrice: 1800,
    minStockAlert: 60,
    currentStock: 160,
    isActive: true
  },
  {
    variantId: 104,
    fruitId: 2,
    fruitName: 'Mango Tommy',
    category: 'PULPAS' as const,
    sku: 'PULP-MAN-250G',
    name: 'Pulpa de Mango Tommy 250g',
    grammage: 250 as const,
    unitCost: 1650,
    basePrice: 3200,
    minStockAlert: 40,
    currentStock: 110,
    isActive: true
  },
  {
    variantId: 105,
    fruitId: 3,
    fruitName: 'Lulo de Castilla',
    category: 'PULPAS' as const,
    sku: 'PULP-LUL-140G',
    name: 'Pulpa de Lulo 140g',
    grammage: 140 as const,
    unitCost: 1200,
    basePrice: 2200,
    minStockAlert: 50,
    currentStock: 95,
    isActive: true
  },
  {
    variantId: 106,
    fruitId: 3,
    fruitName: 'Lulo de Castilla',
    category: 'PULPAS' as const,
    sku: 'PULP-LUL-250G',
    name: 'Pulpa de Lulo 250g',
    grammage: 250 as const,
    unitCost: 1950,
    basePrice: 3750,
    minStockAlert: 30,
    currentStock: 70,
    isActive: true
  },
  // LIMONADAS
  {
    variantId: 201,
    fruitId: 7, // Limón Mandarino / Coco
    fruitName: 'Limonada de Coco',
    category: 'LIMONADAS' as const,
    sku: 'LIM-COC-140G',
    name: 'Base Limonada de Coco 140g',
    grammage: 140 as const,
    unitCost: 1400,
    basePrice: 2600,
    minStockAlert: 30,
    currentStock: 45,
    isActive: true
  },
  {
    variantId: 202,
    fruitId: 7,
    fruitName: 'Limonada Cerezada',
    category: 'LIMONADAS' as const,
    sku: 'LIM-CER-140G',
    name: 'Base Limonada Cerezada 140g',
    grammage: 140 as const,
    unitCost: 1350,
    basePrice: 2500,
    minStockAlert: 30,
    currentStock: 60,
    isActive: true
  },
  // BATIDOS
  {
    variantId: 301,
    fruitId: 8,
    fruitName: 'Batido Verde Detox',
    category: 'BATIDOS' as const,
    sku: 'BAT-DTX-250G',
    name: 'Batido Verde Detox (Espinaca/Piña/Manzana) 250g',
    grammage: 250 as const,
    unitCost: 2100,
    basePrice: 4200,
    minStockAlert: 25,
    currentStock: 50,
    isActive: true
  },
  {
    variantId: 302,
    fruitId: 8,
    fruitName: 'Batido Rojo Antioxidante',
    category: 'BATIDOS' as const,
    sku: 'BAT-RED-250G',
    name: 'Batido Rojo Antioxidante (Frutos Rojos) 250g',
    grammage: 250 as const,
    unitCost: 2300,
    basePrice: 4500,
    minStockAlert: 25,
    currentStock: 40,
    isActive: true
  }
];

// ==========================================
// INITIAL SALES TARGETS (Metas de Venta)
// ==========================================
export const INITIAL_SALES_TARGETS_SAMPLE = [
  {
    targetId: 1,
    year: 2026,
    month: 10, // Octubre 2026
    targetRevenue: 18000000, // Meta $18'000.000 COP
    targetUnits: 6500,
    workingDays: 26,
    notes: 'Meta comercial temporada regular',
    createdAt: '2026-10-01T08:00:00'
  },
  {
    targetId: 2,
    year: 2026,
    month: 9, // Septiembre 2026
    targetRevenue: 16500000,
    targetUnits: 6000,
    workingDays: 26,
    notes: 'Meta comercial septiembre',
    createdAt: '2026-09-01T08:00:00'
  }
];

// ==========================================
// INITIAL PAYROLL PERIODS
// ==========================================
export const INITIAL_PAYROLL_PERIODS_SAMPLE = [
  {
    periodId: 1,
    year: 2026,
    month: 10,
    fortnight: 1 as const, // 1 - 15 Octubre
    startDate: '2026-10-01',
    endDate: '2026-10-15',
    isClosed: false
  },
  {
    periodId: 2,
    year: 2026,
    month: 9,
    fortnight: 2 as const, // 16 - 30 Septiembre
    startDate: '2026-09-16',
    endDate: '2026-09-30',
    isClosed: true,
    closedAt: '2026-09-30T18:00:00'
  }
];

// ==========================================
// INITIAL EXPENSES & LOGISTICS SAMPLE
// ==========================================
export const INITIAL_EXPENSES_SAMPLE: ExpenseDto[] = [
  {
    expenseId: 101,
    branchId: 1,
    branchName: 'Cava Principal',
    categoryId: 1,
    categoryName: 'Combustible y Logística',
    description: 'Gasolina y rodamiento moto domicilios (Carlos Rodríguez)',
    amount: 145000,
    expenseDate: '2026-10-18',
    paymentMethodName: 'Efectivo Caja Menor',
    receiptNumber: 'FAC-GAS-9012',
    createdAt: '2026-10-18T14:30:00'
  },
  {
    expenseId: 102,
    branchId: 1,
    branchName: 'Cava Principal',
    categoryId: 2,
    categoryName: 'Empaques y Bolsas',
    description: 'Lote 5.000 bolsas termosellables calibre 3 para 250g y 500g',
    amount: 420000,
    expenseDate: '2026-10-17',
    paymentMethodName: 'Transferencia Bancolombia',
    receiptNumber: 'FACT-PLAS-441',
    createdAt: '2026-10-17T11:00:00'
  },
  {
    expenseId: 103,
    branchId: 1,
    branchName: 'Cava Principal',
    categoryId: 3,
    categoryName: 'Inocuidad y Desinfección',
    description: 'Hipoclorito grado alimentario, cofias, guantes nitrilo y detergente neutro',
    amount: 98000,
    expenseDate: '2026-10-16',
    paymentMethodName: 'Efectivo Caja Menor',
    receiptNumber: 'REC-INOC-112',
    createdAt: '2026-10-16T09:15:00'
  },
  {
    expenseId: 104,
    branchId: 1,
    branchName: 'Cava Principal',
    categoryId: 4,
    categoryName: 'Mantenimiento Maquinaria',
    description: 'Afilado de cuchillas despulpadora industrial y calibración de motor',
    amount: 280000,
    expenseDate: '2026-10-14',
    paymentMethodName: 'Transferencia Bancolombia',
    receiptNumber: 'MAN-IND-8820',
    createdAt: '2026-10-14T16:45:00'
  },
  {
    expenseId: 105,
    branchId: 1,
    branchName: 'Cava Principal',
    categoryId: 1,
    categoryName: 'Combustible y Logística',
    description: 'Gasolina ruta norte domicilios (Andrés Morales)',
    amount: 130000,
    expenseDate: '2026-10-13',
    paymentMethodName: 'Efectivo Caja Menor',
    receiptNumber: 'FAC-GAS-8845',
    createdAt: '2026-10-13T15:20:00'
  },
  {
    expenseId: 106,
    branchId: 1,
    branchName: 'Cava Principal',
    categoryId: 5,
    categoryName: 'Servicios Públicos',
    description: 'Energía Enel Condensa - Conservación cava congelación (-18°C)',
    amount: 850000,
    expenseDate: '2026-10-10',
    paymentMethodName: 'Débito Automático',
    receiptNumber: 'ENEL-CUENTA-5412',
    createdAt: '2026-10-10T10:00:00'
  },
  {
    expenseId: 107,
    branchId: 1,
    branchName: 'Cava Principal',
    categoryId: 1,
    categoryName: 'Combustible y Logística',
    description: 'Flete camión abastecimiento fruta desde Corabastos a planta',
    amount: 190000,
    expenseDate: '2026-10-08',
    paymentMethodName: 'Transferencia Bancolombia',
    receiptNumber: 'FLET-TRANS-091',
    createdAt: '2026-10-08T07:30:00'
  }
];

// ==========================================
// INITIAL PAYROLL SETTLEMENTS SAMPLE
// ==========================================
export const INITIAL_PAYROLL_SETTLEMENTS_SAMPLE: PayrollSettlementDto[] = [
  {
    settlementId: 1,
    periodId: 1,
    employeeId: 1,
    employeeName: 'Hernando Ruiz Gómez',
    gender: 'MASCULINO',
    area: 'PRODUCCION',
    baseSalaryMonthly: 2800000,
    daysWorked: 15,
    baseSalaryEarned: 1400000,
    transportAllowanceEarned: 81000,
    deliveryBonuses: 0,
    overtimeAmount: 110000,
    otherBonuses: 50000,
    totalEarnings: 1641000,
    healthDeduction: 56000,
    pensionDeduction: 56000,
    otherDeductions: 0,
    totalDeductions: 112000,
    netPayable: 1529000,
    paymentStatus: 'PAID',
    settledAt: '2026-10-15T17:00:00'
  },
  {
    settlementId: 2,
    periodId: 1,
    employeeId: 2,
    employeeName: 'María Fernanda Castillo',
    gender: 'FEMENINO',
    area: 'PRODUCCION',
    baseSalaryMonthly: 1600000,
    daysWorked: 15,
    baseSalaryEarned: 800000,
    transportAllowanceEarned: 81000,
    deliveryBonuses: 0,
    overtimeAmount: 65000,
    otherBonuses: 0,
    totalEarnings: 946000,
    healthDeduction: 32000,
    pensionDeduction: 32000,
    otherDeductions: 0,
    totalDeductions: 64000,
    netPayable: 882000,
    paymentStatus: 'PAID',
    settledAt: '2026-10-15T17:00:00'
  },
  {
    settlementId: 3,
    periodId: 1,
    employeeId: 3,
    employeeName: 'Carlos Andrés Montoya',
    gender: 'MASCULINO',
    area: 'PRODUCCION',
    baseSalaryMonthly: 1550000,
    daysWorked: 15,
    baseSalaryEarned: 775000,
    transportAllowanceEarned: 81000,
    deliveryBonuses: 0,
    overtimeAmount: 45000,
    otherBonuses: 0,
    totalEarnings: 901000,
    healthDeduction: 31000,
    pensionDeduction: 31000,
    otherDeductions: 0,
    totalDeductions: 62000,
    netPayable: 839000,
    paymentStatus: 'PAID',
    settledAt: '2026-10-15T17:00:00'
  },
  {
    settlementId: 4,
    periodId: 1,
    employeeId: 4,
    employeeName: 'Jhonatan Valencia',
    gender: 'MASCULINO',
    area: 'DOMICILIOS',
    baseSalaryMonthly: 1450000,
    daysWorked: 14,
    baseSalaryEarned: 676667,
    transportAllowanceEarned: 75600,
    deliveryBonuses: 195000,
    overtimeAmount: 0,
    otherBonuses: 30000,
    totalEarnings: 977267,
    healthDeduction: 27067,
    pensionDeduction: 27067,
    otherDeductions: 0,
    totalDeductions: 54134,
    netPayable: 923133,
    paymentStatus: 'PAID',
    settledAt: '2026-10-15T17:00:00'
  },
  {
    settlementId: 5,
    periodId: 1,
    employeeId: 5,
    employeeName: 'Andrés Morales',
    gender: 'MASCULINO',
    area: 'DOMICILIOS',
    baseSalaryMonthly: 1450000,
    daysWorked: 15,
    baseSalaryEarned: 725000,
    transportAllowanceEarned: 81000,
    deliveryBonuses: 220000,
    overtimeAmount: 0,
    otherBonuses: 25000,
    totalEarnings: 1051000,
    healthDeduction: 29000,
    pensionDeduction: 29000,
    otherDeductions: 0,
    totalDeductions: 58000,
    netPayable: 993000,
    paymentStatus: 'PAID',
    settledAt: '2026-10-15T17:00:00'
  }
];

// ==========================================
// DEFAULT COMPANY CONFIGURATION (BILLING & GENERAL)
// ==========================================
export const DEFAULT_COMPANY_CONFIG = {
  companyName: 'DGL Despulpadora',
  legalName: 'DG Distribuidores Logísticos S.A.S.',
  nit: '901801042-5',
  logoUrl: '/logo-dgl.png',
  tagline: 'Pulpa de Fruta 100% Natural · Calidad Premium',
  address: 'Bogotá D.C., Colombia',
  city: 'Bogotá D.C.',
  department: 'Cundinamarca',
  country: 'Colombia',
  phone: '3124450389',
  whatsapp: '+57 312 445 0389',
  email: 'dgdistribuidores.l@gmail.com',
  billingEmail: 'dgdistribuidores.l@gmail.com',
  operatingHours: 'Lunes a Sábado: 6:00 AM - 5:00 PM',
  dispatchHours: 'Rutas de Entrega: 7:00 AM y 2:00 PM',
  taxRegime: 'Responsable de IVA - Régimen Común',
  dianResolution: 'Resolución Facturación Electrónica DIAN · Prefijo INV/2026',
  invoicePrefix: 'INV/2026/',
  invoiceNextNumber: 7750,
  invoiceFooterNote: '¡Gracias por preferir DGL Despulpadora — Pulpas 100% Naturales! Consérvese congelado a -18°C'
};

// ==========================================
// DEFAULT SYSTEM PARAMETERS: PAYMENT METHODS
// ==========================================
export const INITIAL_PAYMENT_METHODS: PaymentMethodDto[] = [
  {
    paymentMethodId: 1,
    name: 'Transferencia Bancolombia',
    code: 'BANCOLOMBIA',
    isActive: true,
    type: 'transfer',
    description: 'Cuenta Ahorros Bancolombia # 123-456789-00'
  },
  {
    paymentMethodId: 2,
    name: 'Contra Entrega Efectivo',
    code: 'EFECTIVO',
    isActive: true,
    type: 'cash',
    description: 'Pago en efectivo recibido al momento de la entrega'
  },
  {
    paymentMethodId: 3,
    name: 'Nequi / Daviplata',
    code: 'NEQUI',
    isActive: true,
    type: 'transfer',
    description: 'Billetera digital Nequi / Daviplata'
  },
  {
    paymentMethodId: 4,
    name: 'Datáfono / Tarjeta',
    code: 'DATAFONO',
    isActive: true,
    type: 'card',
    description: 'Cobro presencial con tarjeta débito o crédito'
  },
  {
    paymentMethodId: 5,
    name: 'Crédito Corporativo 15 días',
    code: 'CREDITO_15',
    isActive: true,
    type: 'credit',
    description: 'Facturación a crédito autorizada a 15 días calendario'
  }
];

export const DEFAULT_PORTAL_CMS_CONFIG: PortalCmsConfig = {
  brandTagline: 'Pulpas 100% Puras de Fruta Natural · Pedidos Directos de Fábrica',
  heroBadge: 'CALIDAD CERTIFICADA DGL · 100% NATURAL',
  heroTitle: 'Pulpas Pasteurizadas de Fruta Seleccionada',
  heroDescription: 'Explora nuestras variedades en 4 presentaciones (140g, 250g, 500g y 1000g). Sin agua añadida ni conservantes artificiales.',
  chip1Text: 'Pura Fruta',
  chip2Text: 'Congelación Rápida',
  chip3Text: 'Despacho el Mismo Día',
  whatsappPhone: '573154567890'
};



