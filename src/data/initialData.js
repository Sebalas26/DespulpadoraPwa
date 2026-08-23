export const INITIAL_FRUITS = [
  {
    id: 'maracuya',
    name: 'Maracuyá',
    scientificName: 'Passiflora edulis',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#D97706',
    emoji: '🟡',
    yieldRate: 0.58, // 58% pulpa neta tras despulpado de fruta fresca
    waterAdditionDefault: 0.10, // 10% agua potable permitida según norma técnica
    freshStockKg: 280, // Fruta fresca en cava
    stock: {
      g140: 120, // unidades de 140g
      g250: 85,  // unidades de 250g
      g500: 40,  // unidades de 500g
      g1000: 32  // unidades de 1000g (1kg)
    },
    minStock: { g140: 50, g250: 30, g500: 20, g1000: 15 },
    prices: { g140: 2000, g250: 3500, g500: 6200, g1000: 11000 },
    category: 'Ácida / Cítrica'
  },
  {
    id: 'mango',
    name: 'Mango Tommy',
    scientificName: 'Mangifera indica',
    color: '#EA580C',
    bgColor: 'rgba(234, 88, 12, 0.15)',
    borderColor: '#C2410C',
    emoji: '🥭',
    yieldRate: 0.65,
    waterAdditionDefault: 0.08,
    freshStockKg: 350,
    stock: {
      g140: 160,
      g250: 110,
      g500: 65,
      g1000: 48
    },
    minStock: { g140: 60, g250: 40, g500: 25, g1000: 20 },
    prices: { g140: 1800, g250: 3200, g500: 5800, g1000: 10500 },
    category: 'Dulce'
  },
  {
    id: 'lulo',
    name: 'Lulo de Castilla',
    scientificName: 'Solanum quitoense',
    color: '#65A30D',
    bgColor: 'rgba(101, 163, 13, 0.15)',
    borderColor: '#4D7C0F',
    emoji: '🟢',
    yieldRate: 0.62,
    waterAdditionDefault: 0.10,
    freshStockKg: 190,
    stock: {
      g140: 45,
      g250: 30,
      g500: 18,
      g1000: 12
    },
    minStock: { g140: 60, g250: 40, g500: 20, g1000: 15 },
    prices: { g140: 2200, g250: 3800, g500: 6800, g1000: 12500 },
    category: 'Ácida / Cítrica'
  },
  {
    id: 'mora',
    name: 'Mora Silvestre',
    scientificName: 'Rubus glaucus',
    color: '#9333EA',
    bgColor: 'rgba(147, 51, 234, 0.15)',
    borderColor: '#7E22CE',
    emoji: '🍇',
    yieldRate: 0.78,
    waterAdditionDefault: 0.05,
    freshStockKg: 240,
    stock: {
      g140: 210,
      g250: 95,
      g500: 55,
      g1000: 40
    },
    minStock: { g140: 70, g250: 35, g500: 20, g1000: 15 },
    prices: { g140: 1800, g250: 3200, g500: 5800, g1000: 10500 },
    category: 'Semidulce'
  },
  {
    id: 'fresa',
    name: 'Fresa Festival',
    scientificName: 'Fragaria ananassa',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#DC2626',
    emoji: '🍓',
    yieldRate: 0.82,
    waterAdditionDefault: 0.05,
    freshStockKg: 160,
    stock: {
      g140: 90,
      g250: 70,
      g500: 30,
      g1000: 22
    },
    minStock: { g140: 50, g250: 30, g500: 15, g1000: 10 },
    prices: { g140: 2100, g250: 3600, g500: 6500, g1000: 11800 },
    category: 'Dulce'
  },
  {
    id: 'guanabana',
    name: 'Guanábana Criolla',
    scientificName: 'Annona muricata',
    color: '#0D9488',
    bgColor: 'rgba(13, 148, 136, 0.15)',
    borderColor: '#0F766E',
    emoji: '🍈',
    yieldRate: 0.52,
    waterAdditionDefault: 0.08,
    freshStockKg: 130,
    stock: {
      g140: 35,
      g250: 24,
      g500: 15,
      g1000: 8
    },
    minStock: { g140: 45, g250: 25, g500: 15, g1000: 10 },
    prices: { g140: 2400, g250: 4200, g500: 7500, g1000: 13800 },
    category: 'Dulce / Cremosa'
  },
  {
    id: 'guayaba',
    name: 'Guayaba Agria / Coronilla',
    scientificName: 'Psidium guajava',
    color: '#FB7185',
    bgColor: 'rgba(251, 113, 133, 0.15)',
    borderColor: '#F43F5E',
    emoji: '🍑',
    yieldRate: 0.70,
    waterAdditionDefault: 0.08,
    freshStockKg: 210,
    stock: {
      g140: 140,
      g250: 80,
      g500: 38,
      g1000: 26
    },
    minStock: { g140: 40, g250: 25, g500: 15, g1000: 10 },
    prices: { g140: 1700, g250: 3000, g500: 5500, g1000: 9800 },
    category: 'Semidulce'
  },
  {
    id: 'pina',
    name: 'Piña Oro Miel',
    scientificName: 'Ananas comosus',
    color: '#EAB308',
    bgColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: '#CA8A04',
    emoji: '🍍',
    yieldRate: 0.60,
    waterAdditionDefault: 0.05,
    freshStockKg: 290,
    stock: {
      g140: 110,
      g250: 65,
      g500: 45,
      g1000: 35
    },
    minStock: { g140: 40, g250: 25, g500: 15, g1000: 12 },
    prices: { g140: 1800, g250: 3200, g500: 5800, g1000: 10500 },
    category: 'Dulce'
  },
  {
    id: 'feijoa',
    name: 'Feijoa Boyacense',
    scientificName: 'Acca sellowiana',
    color: '#16A34A',
    bgColor: 'rgba(22, 163, 74, 0.15)',
    borderColor: '#15803D',
    emoji: '🍏',
    yieldRate: 0.64,
    waterAdditionDefault: 0.08,
    freshStockKg: 95,
    stock: {
      g140: 50,
      g250: 35,
      g500: 20,
      g1000: 14
    },
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

export const INITIAL_EMPLOYEES = [
  {
    id: 'EMP-001',
    name: 'Hernando Ruiz Gómez',
    document: '79.845.120',
    role: 'Jefe de Planta & Producción',
    department: 'Producción',
    baseSalary: 2800000,
    transportAllowance: 162000,
    hireDate: '2022-03-15',
    contractType: 'Término Indefinido',
    eps: 'Sura EPS',
    arl: 'Positiva ARL (Riesgo 3)',
    pensionFund: 'Porvenir',
    phone: '310 456 1234',
    email: 'hernando.ruiz@pulpaspro.com',
    status: 'activo',
    avatar: '👨🏽‍🏭',
    currentShiftStatus: 'en_turno', // 'en_turno', 'almuerzo', 'fuera_turno'
    lastPunchTime: '07:00 AM'
  },
  {
    id: 'EMP-002',
    name: 'María Fernanda Castillo',
    document: '1.018.445.990',
    role: 'Operaria de Despulpado & Calidad',
    department: 'Producción',
    baseSalary: 1600000,
    transportAllowance: 162000,
    hireDate: '2023-05-10',
    contractType: 'Término Indefinido',
    eps: 'Sanitas EPS',
    arl: 'Positiva ARL (Riesgo 3)',
    pensionFund: 'Protección',
    phone: '315 789 0011',
    email: 'maria.castillo@pulpaspro.com',
    status: 'activo',
    avatar: '👩🏻‍🔬',
    currentShiftStatus: 'en_turno',
    lastPunchTime: '07:05 AM'
  },
  {
    id: 'EMP-003',
    name: 'Juan Camilo Ramos',
    document: '1.032.784.512',
    role: 'Mensajero Logístico Zona Norte',
    department: 'Logística & Despachos',
    baseSalary: 1500000,
    transportAllowance: 162000,
    hireDate: '2023-08-01',
    contractType: 'Término Indefinido',
    eps: 'Compensar EPS',
    arl: 'Positiva ARL (Riesgo 4 - Motorizado)',
    pensionFund: 'Colfondos',
    phone: '312 456 7890',
    email: 'juan.ramos@pulpaspro.com',
    status: 'activo',
    avatar: '👨🏽‍💼',
    currentShiftStatus: 'en_turno',
    lastPunchTime: '07:45 AM'
  },
  {
    id: 'EMP-004',
    name: 'Andrés Felipe Pérez',
    document: '80.123.945',
    role: 'Mensajero Logístico Zona Centro/Sur',
    department: 'Logística & Despachos',
    baseSalary: 1500000,
    transportAllowance: 162000,
    hireDate: '2024-01-15',
    contractType: 'Término Indefinido',
    eps: 'Salud Total EPS',
    arl: 'Positiva ARL (Riesgo 4 - Motorizado)',
    pensionFund: 'Porvenir',
    phone: '318 987 6543',
    email: 'andres.perez@pulpaspro.com',
    status: 'activo',
    avatar: '👨🏻‍💼',
    currentShiftStatus: 'almuerzo',
    lastPunchTime: '12:30 PM'
  },
  {
    id: 'EMP-005',
    name: 'Daniel Morales C.',
    document: '79.912.440',
    role: 'Conductor Van Institucional / Carga',
    department: 'Logística & Despachos',
    baseSalary: 1800000,
    transportAllowance: 162000,
    hireDate: '2023-11-20',
    contractType: 'Término Indefinido',
    eps: 'Sura EPS',
    arl: 'Positiva ARL (Riesgo 3)',
    pensionFund: 'Protección',
    phone: '300 234 5678',
    email: 'daniel.morales@pulpaspro.com',
    status: 'activo',
    avatar: '👨🏼‍💼',
    currentShiftStatus: 'en_turno',
    lastPunchTime: '06:45 AM'
  },
  {
    id: 'EMP-006',
    name: 'Adriana Lucía Beltrán',
    document: '52.784.119',
    role: 'Contadora & Administradora',
    department: 'Administración',
    baseSalary: 3200000,
    transportAllowance: 0, // No aplica por superar 2 SMMLV
    hireDate: '2022-01-10',
    contractType: 'Término Indefinido',
    eps: 'Sanitas EPS',
    arl: 'Positiva ARL (Riesgo 1)',
    pensionFund: 'Porvenir',
    phone: '311 889 4433',
    email: 'adriana.beltran@pulpaspro.com',
    status: 'activo',
    avatar: '👩🏽‍💼',
    currentShiftStatus: 'en_turno',
    lastPunchTime: '08:00 AM'
  }
];

export const INITIAL_TIME_LOGS = [
  {
    id: 'LOG-101',
    date: '2026-08-22',
    time: '06:45 AM',
    employeeId: 'EMP-005',
    employeeName: 'Daniel Morales C.',
    event: 'entrada',
    eventLabel: 'Entrada a Turno',
    department: 'Logística',
    status: 'A tiempo'
  },
  {
    id: 'LOG-102',
    date: '2026-08-22',
    time: '07:00 AM',
    employeeId: 'EMP-001',
    employeeName: 'Hernando Ruiz Gómez',
    event: 'entrada',
    eventLabel: 'Entrada a Turno',
    department: 'Producción',
    status: 'A tiempo'
  },
  {
    id: 'LOG-103',
    date: '2026-08-22',
    time: '07:05 AM',
    employeeId: 'EMP-002',
    employeeName: 'María Fernanda Castillo',
    event: 'entrada',
    eventLabel: 'Entrada a Turno',
    department: 'Producción',
    status: 'A tiempo'
  },
  {
    id: 'LOG-104',
    date: '2026-08-22',
    time: '07:45 AM',
    employeeId: 'EMP-003',
    employeeName: 'Juan Camilo Ramos',
    event: 'entrada',
    eventLabel: 'Entrada a Turno',
    department: 'Logística',
    status: 'A tiempo'
  },
  {
    id: 'LOG-105',
    date: '2026-08-22',
    time: '08:00 AM',
    employeeId: 'EMP-006',
    employeeName: 'Adriana Lucía Beltrán',
    event: 'entrada',
    eventLabel: 'Entrada a Turno',
    department: 'Administración',
    status: 'A tiempo'
  },
  {
    id: 'LOG-106',
    date: '2026-08-22',
    time: '12:30 PM',
    employeeId: 'EMP-004',
    employeeName: 'Andrés Felipe Pérez',
    event: 'salida_almuerzo',
    eventLabel: 'Salida a Almuerzo',
    department: 'Logística',
    status: 'En descanso'
  }
];

export const INITIAL_ACCOUNTING_TRANSACTIONS = [
  {
    id: 'TRX-501',
    date: '2026-08-22 08:30',
    type: 'ingreso', // 'ingreso', 'egreso'
    category: 'Ventas de Pulpa',
    concept: 'Pago Factura FAC-2026-085 (Cafetería La 93)',
    amount: 89500,
    paymentMethod: 'Efectivo',
    thirdParty: 'Cafetería & Waffles La 93',
    status: 'Aplicado'
  },
  {
    id: 'TRX-502',
    date: '2026-08-22 09:15',
    type: 'egreso',
    category: 'Materia Prima (Fruta Fresca)',
    concept: 'Compra de 250 Kg Maracuyá a Campesinos de Viotá',
    amount: 375000,
    paymentMethod: 'Transferencia Bancolombia',
    thirdParty: 'Asociación Campesina del Tequendama',
    status: 'Aplicado'
  },
  {
    id: 'TRX-503',
    date: '2026-08-22 10:00',
    type: 'egreso',
    category: 'Empaque & Insumos',
    concept: '2.000 Bolsas de Polietileno Termosellable Grado Alimenticio',
    amount: 140000,
    paymentMethod: 'Transferencia Daviplata',
    thirdParty: 'Plásticos y Empaques Industriales S.A.S.',
    status: 'Aplicado'
  },
  {
    id: 'TRX-504',
    date: '2026-08-22 11:20',
    type: 'ingreso',
    category: 'Ventas de Pulpa',
    concept: 'Pago Factura FAC-2026-089 (Dra. Carolina Méndez)',
    amount: 16575,
    paymentMethod: 'Nequi',
    thirdParty: 'Dra. Carolina Méndez',
    status: 'Aplicado'
  },
  {
    id: 'TRX-505',
    date: '2026-08-21 16:00',
    type: 'egreso',
    category: 'Combustible & Mensajería',
    concept: 'Tanqueo y Mantenimiento Motos de Reparto (Juan y Andrés)',
    amount: 60000,
    paymentMethod: 'Efectivo',
    thirdParty: 'Estación de Servicio Terpel Calle 68',
    status: 'Aplicado'
  },
  {
    id: 'TRX-506',
    date: '2026-08-20 18:00',
    type: 'egreso',
    category: 'Servicios de Planta (Energía Cava)',
    concept: 'Pago Servicio de Energía Eléctrica Refrigeración - Enel',
    amount: 850000,
    paymentMethod: 'Débito Automático Bancolombia',
    thirdParty: 'Enel Colombia S.A. ESP',
    status: 'Aplicado'
  }
];

export const INITIAL_ACCOUNTS_RECEIVABLE = [
  {
    id: 'CAR-001',
    invoiceId: 'FAC-2026-087',
    clientName: 'Hotel Dann Carlton Salitre',
    nit: '860.034.992-8',
    issueDate: '2026-08-22',
    dueDate: '2026-09-06',
    total: 201000,
    balance: 201000,
    terms: 'Crédito 15 Días',
    status: 'vigente' // 'vigente', 'vencido', 'pagado'
  },
  {
    id: 'CAR-002',
    invoiceId: 'FAC-2026-074',
    clientName: 'Restaurante El Sabor Costeño',
    nit: '901.458.332-1',
    issueDate: '2026-08-15',
    dueDate: '2026-08-30',
    total: 320000,
    balance: 150000,
    terms: 'Crédito 15 Días',
    status: 'vigente'
  }
];

export const COMPANY_SETTINGS = {
  companyName: 'PULPASPRO COLOMBIA S.A.S.',
  commercialName: 'PulpasPro - Despulpadora & Logística',
  nit: '901.884.210-5',
  regime: 'Régimen Simple de Tributación (RST)',
  legalRepresentative: 'Carlos Alberto Salamanca',
  repDocument: '79.654.120 de Bogotá',
  address: 'Cra. 68D #18-40, Zona Industrial de Alimentos',
  city: 'Bogotá D.C., Colombia',
  phone: '+57 (601) 745-9000',
  whatsapp: '+57 312 456 7890',
  email: 'contacto@pulpaspro.com',
  website: 'www.pulpaspro.com',
  dianResolution: 'Resolución DIAN No. 187640001923 del 2026-01-15',
  invoicePrefix: 'FAC',
  invoiceRange: '001 al 5000',
  currency: 'COP ($)'
};

export const INITIAL_COURIERS = [
  {
    id: 'courier-1',
    name: 'Juan Camilo Ramos',
    phone: '+57 312 456 7890',
    vehicle: 'Moto Yamaha YBR 125',
    plate: 'HTO-44F',
    zone: 'Zona Norte (Usaquén, Suba, Chapinero)',
    status: 'en_ruta',
    activeDeliveries: 2,
    completedToday: 8,
    avatar: '👨🏽‍💼',
    cashCollected: 145000
  },
  {
    id: 'courier-2',
    name: 'Andrés Felipe Pérez',
    phone: '+57 318 987 6543',
    vehicle: 'Moto Boxer CT100',
    plate: 'KLP-12E',
    zone: 'Zona Centro / Teusaquillo / Salitre',
    status: 'disponible',
    activeDeliveries: 0,
    completedToday: 6,
    avatar: '👨🏻‍💼',
    cashCollected: 92000
  },
  {
    id: 'courier-3',
    name: 'Daniel Morales C.',
    phone: '+57 300 234 5678',
    vehicle: 'Van Refrigerada NHR',
    plate: 'WZJ-889',
    zone: 'Ruta Institucional / Mayoristas / Hoteles',
    status: 'en_ruta',
    activeDeliveries: 1,
    completedToday: 4,
    avatar: '👨🏼‍💼',
    cashCollected: 380000
  }
];

export const INITIAL_CLIENTS = [
  {
    id: 'cli-1',
    name: 'Restaurante El Sabor Costeño',
    nit: '901.458.332-1',
    contact: 'Chef Carlos Mario',
    phone: '315 789 4411',
    address: 'Calle 85 #14-22, Chicó Norte',
    zone: 'Zona Norte',
    type: 'Restaurante / Horeca'
  },
  {
    id: 'cli-2',
    name: 'Cafetería & Waffles La 93',
    nit: '900.892.110-4',
    contact: 'Marcela Gómez',
    phone: '310 334 8990',
    address: 'Carrera 11 #93-18',
    zone: 'Zona Norte',
    type: 'Cafetería'
  },
  {
    id: 'cli-3',
    name: 'Hotel Dann Carlton Salitre',
    nit: '860.034.992-8',
    contact: 'David Sandoval (Compras)',
    phone: '311 229 0012',
    address: 'Avenida La Esperanza #51-40',
    zone: 'Zona Centro / Salitre',
    type: 'Hotel'
  },
  {
    id: 'cli-4',
    name: 'Dra. Carolina Méndez',
    nit: '52.984.112',
    contact: 'Carolina Méndez',
    phone: '320 889 1234',
    address: 'Calle 127 #19-45 Apto 402',
    zone: 'Zona Norte',
    type: 'Hogar / Particular'
  },
  {
    id: 'cli-5',
    name: 'Smoothie & Fit Bar Plaza',
    nit: '901.774.231-9',
    contact: 'Esteban Valencia',
    phone: '317 654 3210',
    address: 'Carrera 7 #63-45 Local 102',
    zone: 'Zona Centro / Chapinero',
    type: 'Bar de Jugos'
  }
];

export const INITIAL_ORDERS = [
  {
    id: 'ORD-1045',
    date: '2026-08-22 10:15',
    source: 'WhatsApp',
    client: {
      name: 'Restaurante El Sabor Costeño',
      phone: '315 789 4411',
      address: 'Calle 85 #14-22, Chicó Norte',
      zone: 'Zona Norte',
      nit: '901.458.332-1'
    },
    items: [
      { fruitId: 'maracuya', fruitName: 'Maracuyá', size: 'g1000', sizeLabel: '1000g (1 Kg)', qty: 10, unitPrice: 11000, picked: false },
      { fruitId: 'mango', fruitName: 'Mango Tommy', size: 'g1000', sizeLabel: '1000g (1 Kg)', qty: 10, unitPrice: 10500, picked: false },
      { fruitId: 'lulo', fruitName: 'Lulo de Castilla', size: 'g1000', sizeLabel: '1000g (1 Kg)', qty: 5, unitPrice: 12500, picked: false }
    ],
    promotion: 'promo-restaurante-5k',
    subtotal: 277500,
    discount: 27750,
    total: 249750,
    paymentMethod: 'Transferencia Bancolombia',
    paymentStatus: 'Pendiente',
    status: 'alistamiento',
    courierId: null,
    invoiceId: null,
    notes: 'Entregar antes de las 12:00 m para el almuerzo. Dejar en bodega de cocina.'
  },
  {
    id: 'ORD-1046',
    date: '2026-08-22 11:05',
    source: 'WhatsApp Plantilla',
    client: {
      name: 'Dra. Carolina Méndez',
      phone: '320 889 1234',
      address: 'Calle 127 #19-45 Apto 402',
      zone: 'Zona Norte',
      nit: '52.984.112'
    },
    items: [
      { fruitId: 'mora', fruitName: 'Mora Silvestre', size: 'g140', sizeLabel: '140g (Porción)', qty: 4, unitPrice: 1800, picked: true },
      { fruitId: 'fresa', fruitName: 'Fresa Festival', size: 'g140', sizeLabel: '140g (Porción)', qty: 3, unitPrice: 2100, picked: true },
      { fruitId: 'maracuya', fruitName: 'Maracuyá', size: 'g140', sizeLabel: '140g (Porción)', qty: 3, unitPrice: 2000, picked: true }
    ],
    promotion: 'promo-familiar-10',
    subtotal: 19500,
    discount: 2925,
    total: 16575,
    paymentMethod: 'Nequi / Daviplata',
    paymentStatus: 'Pagado',
    status: 'empacado',
    courierId: null,
    invoiceId: 'FAC-2026-089',
    notes: 'Combo Familiar 10x140g + 1 Maracuyá de regalo empacado.'
  },
  {
    id: 'ORD-1047',
    date: '2026-08-22 09:30',
    source: 'Llamada Directa',
    client: {
      name: 'Hotel Dann Carlton Salitre',
      phone: '311 229 0012',
      address: 'Avenida La Esperanza #51-40',
      zone: 'Zona Centro / Salitre',
      nit: '860.034.992-8'
    },
    items: [
      { fruitId: 'mango', fruitName: 'Mango Tommy', size: 'g250', sizeLabel: '250g', qty: 25, unitPrice: 3200, picked: true },
      { fruitId: 'guanabana', fruitName: 'Guanábana Criolla', size: 'g250', sizeLabel: '250g', qty: 15, unitPrice: 4200, picked: true },
      { fruitId: 'pina', fruitName: 'Piña Oro Miel', size: 'g500', sizeLabel: '500g', qty: 10, unitPrice: 5800, picked: true }
    ],
    promotion: null,
    subtotal: 201000,
    discount: 0,
    total: 201000,
    paymentMethod: 'Crédito 15 Días',
    paymentStatus: 'Crédito Aprobado',
    status: 'en_ruta',
    courierId: 'courier-3',
    invoiceId: 'FAC-2026-087',
    notes: 'Entregar con remisión y copia de factura en recepción de proveedores.'
  },
  {
    id: 'ORD-1048',
    date: '2026-08-22 08:15',
    source: 'WhatsApp',
    client: {
      name: 'Cafetería & Waffles La 93',
      phone: '310 334 8990',
      address: 'Carrera 11 #93-18',
      zone: 'Zona Norte',
      nit: '900.892.110-4'
    },
    items: [
      { fruitId: 'mora', fruitName: 'Mora Silvestre', size: 'g140', sizeLabel: '140g (Porción)', qty: 20, unitPrice: 1800, picked: true },
      { fruitId: 'fresa', fruitName: 'Fresa Festival', size: 'g140', sizeLabel: '140g (Porción)', qty: 15, unitPrice: 2100, picked: true },
      { fruitId: 'lulo', fruitName: 'Lulo de Castilla', size: 'g140', sizeLabel: '140g (Porción)', qty: 10, unitPrice: 2200, picked: true }
    ],
    promotion: null,
    subtotal: 89500,
    discount: 0,
    total: 89500,
    paymentMethod: 'Efectivo Contraentrega',
    paymentStatus: 'Cobrado',
    status: 'entregado',
    courierId: 'courier-1',
    invoiceId: 'FAC-2026-085',
    notes: 'Recibir en caja con el administrador Mario.'
  },
  {
    id: 'ORD-1049',
    date: '2026-08-22 11:45',
    source: 'WhatsApp Plantilla',
    client: {
      name: 'Smoothie & Fit Bar Plaza',
      phone: '317 654 3210',
      address: 'Carrera 7 #63-45 Local 102',
      zone: 'Zona Centro / Chapinero',
      nit: '901.774.231-9'
    },
    items: [
      { fruitId: 'maracuya', fruitName: 'Maracuyá', size: 'g250', sizeLabel: '250g', qty: 12, unitPrice: 3500, picked: false },
      { fruitId: 'mango', fruitName: 'Mango Tommy', size: 'g250', sizeLabel: '250g', qty: 12, unitPrice: 3200, picked: false },
      { fruitId: 'feijoa', fruitName: 'Feijoa Boyacense', size: 'g250', sizeLabel: '250g', qty: 8, unitPrice: 3700, picked: false }
    ],
    promotion: null,
    subtotal: 110000,
    discount: 0,
    total: 110000,
    paymentMethod: 'Nequi / Daviplata',
    paymentStatus: 'Pendiente',
    status: 'nuevo',
    courierId: null,
    invoiceId: null,
    notes: 'Por favor confirmar cuando salga el mensajero para tener el pago listo.'
  }
];

export const INITIAL_INVOICES = [
  {
    id: 'FAC-2026-085',
    orderId: 'ORD-1048',
    date: '2026-08-22 08:30',
    client: {
      name: 'Cafetería & Waffles La 93',
      nit: '900.892.110-4',
      phone: '310 334 8990',
      address: 'Carrera 11 #93-18'
    },
    items: [
      { name: 'Pulpa de Mora Silvestre 140g', qty: 20, unitPrice: 1800, total: 36000 },
      { name: 'Pulpa de Fresa Festival 140g', qty: 15, unitPrice: 2100, total: 31500 },
      { name: 'Pulpa de Lulo de Castilla 140g', qty: 10, unitPrice: 2200, total: 22000 }
    ],
    subtotal: 89500,
    discount: 0,
    taxRate: 0,
    tax: 0,
    total: 89500,
    paymentMethod: 'Efectivo',
    courierName: 'Juan Camilo Ramos',
    resolutionDIAN: 'Resolución DIAN No. 187640001923 del 2026-01-15 (Prefijo FAC Rango 001 al 5000)'
  },
  {
    id: 'FAC-2026-087',
    orderId: 'ORD-1047',
    date: '2026-08-22 09:45',
    client: {
      name: 'Hotel Dann Carlton Salitre',
      nit: '860.034.992-8',
      phone: '311 229 0012',
      address: 'Avenida La Esperanza #51-40'
    },
    items: [
      { name: 'Pulpa de Mango Tommy 250g', qty: 25, unitPrice: 3200, total: 80000 },
      { name: 'Pulpa de Guanábana Criolla 250g', qty: 15, unitPrice: 4200, total: 63000 },
      { name: 'Pulpa de Piña Oro Miel 500g', qty: 10, unitPrice: 5800, total: 58000 }
    ],
    subtotal: 201000,
    discount: 0,
    taxRate: 0,
    tax: 0,
    total: 201000,
    paymentMethod: 'Crédito 15 Días',
    courierName: 'Daniel Morales C.',
    resolutionDIAN: 'Resolución DIAN No. 187640001923 del 2026-01-15 (Prefijo FAC Rango 001 al 5000)'
  },
  {
    id: 'FAC-2026-089',
    orderId: 'ORD-1046',
    date: '2026-08-22 11:20',
    client: {
      name: 'Dra. Carolina Méndez',
      nit: '52.984.112',
      phone: '320 889 1234',
      address: 'Calle 127 #19-45 Apto 402'
    },
    items: [
      { name: 'Pulpa de Mora Silvestre 140g', qty: 4, unitPrice: 1800, total: 7200 },
      { name: 'Pulpa de Fresa Festival 140g', qty: 3, unitPrice: 2100, total: 6300 },
      { name: 'Pulpa de Maracuyá 140g', qty: 3, unitPrice: 2000, total: 6000 },
      { name: 'Obsequio Pulpa Maracuyá 140g (Promo Familiar)', qty: 1, unitPrice: 0, total: 0 }
    ],
    subtotal: 19500,
    discount: 2925,
    taxRate: 0,
    tax: 0,
    total: 16575,
    paymentMethod: 'Nequi / Daviplata',
    courierName: 'Pendiente de asignación',
    resolutionDIAN: 'Resolución DIAN No. 187640001923 del 2026-01-15 (Prefijo FAC Rango 001 al 5000)'
  }
];

export const INITIAL_BATCHES = [
  {
    id: 'LOTE-20260822-01',
    date: '2026-08-22 07:00',
    fruitId: 'maracuya',
    fruitName: 'Maracuyá',
    freshKg: 100,
    waterKg: 10,
    netPulpKg: 68,
    yieldObtained: '68%',
    outputPortions: { g140: 200, g250: 100, g500: 20, g1000: 5 },
    operator: 'Hernando Ruiz Gómez',
    qualityStatus: 'Aprobado - Brix 14.5°'
  },
  {
    id: 'LOTE-20260821-03',
    date: '2026-08-21 14:30',
    fruitId: 'mango',
    fruitName: 'Mango Tommy',
    freshKg: 150,
    waterKg: 12,
    netPulpKg: 109.5,
    yieldObtained: '73%',
    outputPortions: { g140: 300, g250: 150, g500: 40, g1000: 10 },
    operator: 'María Fernanda Castillo',
    qualityStatus: 'Aprobado - Brix 16.0°'
  }
];
