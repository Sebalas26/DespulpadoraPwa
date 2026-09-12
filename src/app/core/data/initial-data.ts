export interface FruitConfig {
  id: string;
  fruitId?: number;
  name: string;
  scientificName: string;
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

export const INITIAL_FRUITS: FruitConfig[] = [
  {
    id: 'maracuya',
    fruitId: 1,
    name: 'Maracuyá',
    scientificName: 'Passiflora edulis',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#D97706',
    emoji: '🟡',
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
    emoji: '🥭',
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
    emoji: '🟢',
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
    emoji: '🟣',
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
    emoji: '🍈',
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
    emoji: '🍑',
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
    emoji: '🍍',
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
    emoji: '🍏',
    yieldRate: 0.64,
    waterAdditionDefault: 0.08,
    freshStockKg: 95,
    stock: { g140: 50, g250: 35, g500: 20, g1000: 14 },
    minStock: { g140: 30, g250: 20, g500: 10, g1000: 8 },
    prices: { g140: 2100, g250: 3700, g500: 6600, g1000: 12000 },
    category: 'Ácida / Aromática'
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
    phone: '310 456 1234',
    email: 'hernando.ruiz@pulpaspro.com',
    position: 'Jefe de Planta & Producción',
    department: 'Producción',
    baseSalary: 2800000,
    hireDate: '2022-03-15',
    isActive: true
  },
  {
    employeeId: 2,
    firstName: 'María Fernanda',
    lastName: 'Castillo',
    fullName: 'María Fernanda Castillo',
    identificationNumber: '1.018.445.990',
    phone: '315 789 4521',
    email: 'maria.castillo@pulpaspro.com',
    position: 'Operaria de Despulpado & Calidad',
    department: 'Producción',
    baseSalary: 1600000,
    hireDate: '2023-05-10',
    isActive: true
  },
  {
    employeeId: 3,
    firstName: 'Carlos Andrés',
    lastName: 'Montoya',
    fullName: 'Carlos Andrés Montoya',
    identificationNumber: '98.324.551',
    phone: '312 901 2345',
    email: 'carlos.montoya@pulpaspro.com',
    position: 'Operario de Cava y Empaque',
    department: 'Logística',
    baseSalary: 1550000,
    hireDate: '2023-01-20',
    isActive: true
  },
  {
    employeeId: 4,
    firstName: 'Sandra Patricia',
    lastName: 'Ospina',
    fullName: 'Sandra Patricia Ospina',
    identificationNumber: '52.981.233',
    phone: '320 333 4455',
    email: 'sandra.ospina@pulpaspro.com',
    position: 'Auxiliar Contable y Facturación',
    department: 'Administración',
    baseSalary: 1900000,
    hireDate: '2022-08-01',
    isActive: true
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
