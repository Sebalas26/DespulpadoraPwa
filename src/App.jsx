import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import PreparationCalculator from './components/PreparationCalculator';
import OrdersUnified from './components/OrdersUnified';
import TimeTracking from './components/TimeTracking';
import HumanResources from './components/HumanResources';
import AccountingManager from './components/AccountingManager';
import SettingsManager from './components/SettingsManager';
import WhatsAppSimulatorModal from './components/WhatsAppSimulatorModal';
import InvoiceModal from './components/InvoiceModal';

import {
  INITIAL_FRUITS,
  INITIAL_ORDERS,
  INITIAL_INVOICES,
  INITIAL_COURIERS,
  INITIAL_BATCHES,
  INITIAL_CLIENTS,
  INITIAL_PROMOTIONS,
  INITIAL_EMPLOYEES,
  INITIAL_TIME_LOGS,
  INITIAL_ACCOUNTING_TRANSACTIONS,
  INITIAL_ACCOUNTS_RECEIVABLE,
  COMPANY_SETTINGS
} from './data/initialData';

import {
  Sun,
  Moon,
  RefreshCw,
  Bell,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState('dashboard');

  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('pulpaspro_theme') || 'dark');

  // Core application state with LocalStorage persistence
  const [fruits, setFruits] = useState(() => {
    const saved = localStorage.getItem('pulpaspro_fruits');
    return saved ? JSON.parse(saved) : INITIAL_FRUITS;
  });

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('pulpaspro_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [invoices, setInvoices] = useState(() => {
    const saved = localStorage.getItem('pulpaspro_invoices');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  const [couriers, setCouriers] = useState(() => {
    const saved = localStorage.getItem('pulpaspro_couriers');
    return saved ? JSON.parse(saved) : INITIAL_COURIERS;
  });

  const [batches, setBatches] = useState(() => {
    const saved = localStorage.getItem('pulpaspro_batches');
    return saved ? JSON.parse(saved) : INITIAL_BATCHES;
  });

  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem('pulpaspro_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [timeLogs, setTimeLogs] = useState(() => {
    const saved = localStorage.getItem('pulpaspro_timelogs');
    return saved ? JSON.parse(saved) : INITIAL_TIME_LOGS;
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('pulpaspro_transactions');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTING_TRANSACTIONS;
  });

  const [accountsReceivable, setAccountsReceivable] = useState(() => {
    const saved = localStorage.getItem('pulpaspro_receivables');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS_RECEIVABLE;
  });

  const [companySettings, setCompanySettings] = useState(() => {
    const saved = localStorage.getItem('pulpaspro_company');
    return saved ? JSON.parse(saved) : COMPANY_SETTINGS;
  });

  // UI state for modals and notifications
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [activeInvoicePreview, setActiveInvoicePreview] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Sync with LocalStorage
  useEffect(() => { localStorage.setItem('pulpaspro_fruits', JSON.stringify(fruits)); }, [fruits]);
  useEffect(() => { localStorage.setItem('pulpaspro_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('pulpaspro_invoices', JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem('pulpaspro_couriers', JSON.stringify(couriers)); }, [couriers]);
  useEffect(() => { localStorage.setItem('pulpaspro_batches', JSON.stringify(batches)); }, [batches]);
  useEffect(() => { localStorage.setItem('pulpaspro_employees', JSON.stringify(employees)); }, [employees]);
  useEffect(() => { localStorage.setItem('pulpaspro_timelogs', JSON.stringify(timeLogs)); }, [timeLogs]);
  useEffect(() => { localStorage.setItem('pulpaspro_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('pulpaspro_receivables', JSON.stringify(accountsReceivable)); }, [accountsReceivable]);
  useEffect(() => { localStorage.setItem('pulpaspro_company', JSON.stringify(companySettings)); }, [companySettings]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pulpaspro_theme', theme);
  }, [theme]);

  // PWA install prompt handler
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      showToast('¡PulpasPro PWA instalada exitosamente!', 'success');
    }
  };

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Reset all mock data to factory initial state
  const handleResetData = () => {
    if (window.confirm('¿Deseas reiniciar todos los datos a la demostración inicial?')) {
      setFruits(INITIAL_FRUITS);
      setOrders(INITIAL_ORDERS);
      setInvoices(INITIAL_INVOICES);
      setCouriers(INITIAL_COURIERS);
      setBatches(INITIAL_BATCHES);
      setEmployees(INITIAL_EMPLOYEES);
      setTimeLogs(INITIAL_TIME_LOGS);
      setTransactions(INITIAL_ACCOUNTING_TRANSACTIONS);
      setAccountsReceivable(INITIAL_ACCOUNTS_RECEIVABLE);
      setCompanySettings(COMPANY_SETTINGS);
      localStorage.clear();
      showToast('Datos reiniciados al estado inicial del demo', 'success');
    }
  };

  // Business Action: Add new production batch from calculator
  const handleAddBatch = (newBatch) => {
    setBatches(prev => [newBatch, ...prev]);

    setFruits(prevFruits => {
      return prevFruits.map(fruit => {
        if (fruit.id === newBatch.fruitId) {
          const nextStock = {
            g140: fruit.stock.g140 + newBatch.outputPortions.g140,
            g250: fruit.stock.g250 + newBatch.outputPortions.g250,
            g500: fruit.stock.g500 + newBatch.outputPortions.g500,
            g1000: fruit.stock.g1000 + newBatch.outputPortions.g1000,
          };
          const nextFresh = Math.max(0, fruit.freshStockKg - newBatch.freshKg);
          return {
            ...fruit,
            stock: nextStock,
            freshStockKg: nextFresh
          };
        }
        return fruit;
      });
    });

    showToast(`Lote ${newBatch.id} procesado: +${newBatch.netPulpKg}Kg transferidos a stock`, 'success');
    setActiveTab('configuracion');
  };

  // Business Action: Update fruit stock manually
  const handleUpdateStock = (fruitId, updatedStock) => {
    setFruits(prev => prev.map(f => f.id === fruitId ? { ...f, stock: updatedStock } : f));
    showToast('Inventario de frutas actualizado correctamente', 'success');
  };

  // Business Action: Add new fruit
  const handleAddFruit = (newFruit) => {
    setFruits(prev => [...prev, newFruit]);
    showToast(`Fruta ${newFruit.name} agregada al catálogo`, 'success');
  };

  // Business Action: Add Employee
  const handleAddEmployee = (newEmp) => {
    setEmployees(prev => [...prev, newEmp]);
    showToast(`Colaborador ${newEmp.name} registrado con éxito`, 'success');
  };

  // Business Action: Update Employee
  const handleUpdateEmployee = (updatedEmp) => {
    setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
    showToast(`Datos de ${updatedEmp.name} actualizados`, 'success');
  };

  // Business Action: Record Time Tracking Punch
  const handleRecordPunch = (newPunch, nextShiftStatus) => {
    setTimeLogs(prev => [newPunch, ...prev]);
    setEmployees(prev => prev.map(e => {
      if (e.id === newPunch.employeeId) {
        return {
          ...e,
          currentShiftStatus: nextShiftStatus,
          lastPunchTime: newPunch.time
        };
      }
      return e;
    }));
    showToast(`Marca registrada: ${newPunch.eventLabel} para ${newPunch.employeeName}`, 'success');
  };

  // Business Action: Add Accounting Transaction (Egreso/Gasto)
  const handleAddTransaction = (newTrx) => {
    setTransactions(prev => [newTrx, ...prev]);
    showToast(`Egreso ${newTrx.id} por $${newTrx.amount.toLocaleString('es-CO')} registrado en contabilidad`, 'success');
  };

  // Business Action: Collect Accounts Receivable
  const handleCollectReceivable = (receivableId) => {
    const item = accountsReceivable.find(r => r.id === receivableId);
    if (!item) return;

    // Remove from receivables
    setAccountsReceivable(prev => prev.filter(r => r.id !== receivableId));

    // Add cash inflow transaction
    const newTrx = {
      id: `TRX-${Date.now().toString().slice(-3)}`,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: 'ingreso',
      category: 'Recaudo de Cartera (Crédito)',
      concept: `Cobro Factura ${item.invoiceId} - ${item.clientName}`,
      amount: item.balance,
      paymentMethod: 'Transferencia Bancaria',
      thirdParty: item.clientName,
      status: 'Aplicado'
    };
    setTransactions(prev => [newTrx, ...prev]);

    showToast(`Cobro de cartera por $${item.balance.toLocaleString('es-CO')} ingresado al flujo de caja`, 'success');
  };

  // Business Action: Create new order (e.g. from WhatsApp)
  const handleOrderCreated = (newOrder) => {
    setOrders(prev => [newOrder, ...prev]);
    showToast(`Pedido ${newOrder.id} de ${newOrder.client.name} ingresado a bodega`, 'success');
    setActiveTab('pedidos');
  };

  // Business Action: Update order status
  const handleUpdateOrderStatus = (orderId, newStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    showToast(`Pedido ${orderId} marcado como: ${newStatus.toUpperCase()}`, 'success');
  };

  // Business Action: Toggle item picked inside picking checklist
  const handleToggleItemPicked = (orderId, itemIndex) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      const nextItems = [...order.items];
      nextItems[itemIndex] = {
        ...nextItems[itemIndex],
        picked: !nextItems[itemIndex].picked
      };
      return { ...order, items: nextItems };
    }));
  };

  // Business Action: Generate invoice directly from an order
  const handleGenerateInvoiceForOrder = (order) => {
    const newInvoiceId = `FAC-2026-${String(invoices.length + 90).padStart(3, '0')}`;
    const invoiceItems = order.items.map(item => ({
      name: `Pulpa de ${item.fruitName} ${item.sizeLabel}`,
      qty: item.qty,
      unitPrice: item.unitPrice,
      total: item.qty * item.unitPrice
    }));

    if (order.promotion) {
      invoiceItems.push({
        name: `Obsequio Promoción (${order.promotion})`,
        qty: 1,
        unitPrice: 0,
        total: 0
      });
    }

    const newInvoice = {
      id: newInvoiceId,
      orderId: order.id,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      client: {
        name: order.client.name,
        nit: order.client.nit || '222222222222',
        phone: order.client.phone,
        address: order.client.address
      },
      items: invoiceItems,
      subtotal: order.subtotal,
      discount: order.discount,
      taxRate: 0,
      tax: 0,
      total: order.total,
      paymentMethod: order.paymentMethod,
      courierName: 'Pendiente de Asignación',
      resolutionDIAN: companySettings.dianResolution
    };

    setInvoices(prev => [newInvoice, ...prev]);
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'facturado', invoiceId: newInvoiceId } : o));

    // Register income in accounting transactions
    const incomeTrx = {
      id: `TRX-${Date.now().toString().slice(-3)}`,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: 'ingreso',
      category: 'Ventas de Pulpa',
      concept: `Factura ${newInvoiceId} - ${order.client.name}`,
      amount: order.total,
      paymentMethod: order.paymentMethod,
      thirdParty: order.client.name,
      status: 'Aplicado'
    };
    setTransactions(prev => [incomeTrx, ...prev]);

    showToast(`Factura ${newInvoiceId} generada exitosamente para ${order.client.name}`, 'success');
    setActiveInvoicePreview(newInvoice);
  };

  // Business Action: Create manual invoice
  const handleCreateInvoice = (newInvoice) => {
    setInvoices(prev => [newInvoice, ...prev]);
    const incomeTrx = {
      id: `TRX-${Date.now().toString().slice(-3)}`,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: 'ingreso',
      category: 'Ventas de Pulpa',
      concept: `Factura Mostrador ${newInvoice.id} - ${newInvoice.client.name}`,
      amount: newInvoice.total,
      paymentMethod: newInvoice.paymentMethod,
      thirdParty: newInvoice.client.name,
      status: 'Aplicado'
    };
    setTransactions(prev => [incomeTrx, ...prev]);
    showToast(`Factura ${newInvoice.id} registrada en el sistema`, 'success');
  };

  // Business Action: Assign courier to order
  const handleAssignCourier = (orderId, courierId) => {
    const courier = couriers.find(c => c.id === courierId);
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          courierId,
          status: 'en_ruta'
        };
      }
      return o;
    }));

    setInvoices(prev => prev.map(inv => {
      if (inv.orderId === orderId) {
        return { ...inv, courierName: courier ? courier.name : 'Mensajero Asignado' };
      }
      return inv;
    }));

    setCouriers(prev => prev.map(c => {
      if (c.id === courierId) {
        return { ...c, status: 'en_ruta', activeDeliveries: c.activeDeliveries + 1 };
      }
      return c;
    }));

    showToast(`Pedido ${orderId} asignado a ${courier ? courier.name : 'mensajero'}`, 'success');
  };

  // Business Action: Mark order as delivered by courier
  const handleMarkOrderDelivered = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'entregado', paymentStatus: 'Cobrado' } : o));

    if (order.courierId) {
      setCouriers(prev => prev.map(c => {
        if (c.id === order.courierId) {
          const nextAct = Math.max(0, c.activeDeliveries - 1);
          return {
            ...c,
            activeDeliveries: nextAct,
            completedToday: c.completedToday + 1,
            cashCollected: c.cashCollected + (order.paymentMethod.includes('Efectivo') ? order.total : 0),
            status: nextAct === 0 ? 'disponible' : 'en_ruta'
          };
        }
        return c;
      }));
    }

    showToast(`¡Entrega de ${orderId} confirmada!`, 'success');
  };

  // Navigation badge counts
  const counts = {
    lowStock: fruits.filter(f => Object.keys(f.stock).some(k => f.stock[k] <= f.minStock[k])).length,
    pendingOrders: orders.filter(o => o.status === 'nuevo' || o.status === 'alistamiento' || o.status === 'empacado').length,
    inShiftCount: employees.filter(e => e.currentShiftStatus === 'en_turno').length,
    employeeCount: employees.length
  };

  return (
    <div className="app-container">

      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        counts={counts}
        isInstallable={!!deferredPrompt}
        installApp={handleInstallApp}
      />

      {/* Main App Workspace */}
      <div className="main-content">

        {/* Topbar Header */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="page-title">
              {activeTab === 'dashboard' && '📊 Dashboard Operativo'}
              {activeTab === 'preparacion' && '🧪 1. Calculadora de Preparación'}
              {activeTab === 'pedidos' && '📦 2. Módulo de Pedidos (Alistamiento, Facturación & Mensajería)'}
              {activeTab === 'turnos' && '⏰ 3. Registro de Entrada / Salida (Turnos)'}
              {activeTab === 'gestion_humana' && '👥 4. Gestión Humana (Nómina & Certificados)'}
              {activeTab === 'contabilidad' && '📈 5. Contabilidad General & P&G'}
              {activeTab === 'configuracion' && '⚙️ 6. Configuración (Frutas, Empleados & DIAN)'}
            </div>
            <span className="page-subtitle-badge">
              Planta Despulpadora • V3.0 ERP
            </span>
          </div>

          <div className="topbar-actions">
            {/* Reset mock data button */}
            <button
              onClick={handleResetData}
              className="btn btn-secondary btn-sm"
              title="Reiniciar datos de prueba"
              style={{ gap: '4px' }}
            >
              <RefreshCw size={13} /> Reiniciar Demo
            </button>

            {/* Dark / Light Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="btn-icon"
              title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
            >
              {theme === 'dark' ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        {/* Page Container Body */}
        <main className="page-container">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              fruits={fruits}
              orders={orders}
              invoices={invoices}
              couriers={couriers}
              batches={batches}
              setActiveTab={setActiveTab}
              onOpenWhatsAppModal={() => setShowWhatsAppModal(true)}
            />
          )}

          {activeTab === 'preparacion' && (
            <PreparationCalculator
              fruits={fruits}
              onAddBatch={handleAddBatch}
              batches={batches}
            />
          )}

          {activeTab === 'pedidos' && (
            <OrdersUnified
              orders={orders}
              invoices={invoices}
              fruits={fruits}
              promotions={INITIAL_PROMOTIONS}
              clients={INITIAL_CLIENTS}
              couriers={couriers}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onToggleItemPicked={handleToggleItemPicked}
              onOpenWhatsAppModal={() => setShowWhatsAppModal(true)}
              onGenerateInvoiceForOrder={handleGenerateInvoiceForOrder}
              onCreateInvoice={handleCreateInvoice}
              onAssignCourier={handleAssignCourier}
              onMarkOrderDelivered={handleMarkOrderDelivered}
            />
          )}

          {activeTab === 'turnos' && (
            <TimeTracking
              employees={employees}
              timeLogs={timeLogs}
              onRecordPunch={handleRecordPunch}
            />
          )}

          {activeTab === 'gestion_humana' && (
            <HumanResources
              employees={employees}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
            />
          )}

          {activeTab === 'contabilidad' && (
            <AccountingManager
              invoices={invoices}
              transactions={transactions}
              accountsReceivable={accountsReceivable}
              employees={employees}
              fruits={fruits}
              onAddTransaction={handleAddTransaction}
              onCollectReceivable={handleCollectReceivable}
            />
          )}

          {activeTab === 'configuracion' && (
            <SettingsManager
              fruits={fruits}
              employees={employees}
              companySettings={companySettings}
              onUpdateStock={handleUpdateStock}
              onAddFruit={handleAddFruit}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onUpdateCompanySettings={(newSett) => {
                setCompanySettings(newSett);
                showToast('Parámetros de empresa actualizados', 'success');
              }}
              setActiveTab={setActiveTab}
            />
          )}
        </main>
      </div>

      {/* WhatsApp Parser Modal */}
      {showWhatsAppModal && (
        <WhatsAppSimulatorModal
          fruits={fruits}
          promotions={INITIAL_PROMOTIONS}
          onOrderCreated={handleOrderCreated}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}

      {/* Invoice Quick Preview Modal */}
      {activeInvoicePreview && (
        <InvoiceModal
          invoice={activeInvoicePreview}
          onClose={() => setActiveInvoicePreview(null)}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          background: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '600',
          fontSize: '0.88rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          <CheckCircle2 size={18} />
          <span>{toastMessage.message}</span>
        </div>
      )}

    </div>
  );
}
