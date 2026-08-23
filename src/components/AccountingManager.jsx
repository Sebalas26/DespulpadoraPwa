import React, { useState } from 'react';
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  CreditCard, 
  Building2, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle,
  Receipt,
  PieChart,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AccountingManager({
  invoices,
  transactions,
  accountsReceivable,
  employees,
  fruits,
  onAddTransaction,
  onCollectReceivable
}) {
  const [activeSubTab, setActiveSubTab] = useState('pyg'); // 'pyg' | 'flujo' | 'cartera'
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Expense form state
  const [expenseCategory, setExpenseCategory] = useState('Materia Prima (Fruta Fresca)');
  const [expenseConcept, setExpenseConcept] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState('Transferencia Bancolombia');
  const [expenseThirdParty, setExpenseThirdParty] = useState('');

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  };

  // Calculations for P&G (Income Statement)
  const totalSalesRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);

  // Total recorded expenses in transactions
  const totalExpenseTransactions = transactions
    .filter(t => t.type === 'egreso')
    .reduce((sum, t) => sum + t.amount, 0);

  // Total payroll expense
  const totalMonthlyPayroll = employees.reduce((sum, e) => sum + e.baseSalary + (e.transportAllowance || 0), 0);

  // Estimated raw material costs based on sales (approx 42% COGS)
  const costOfGoodsSold = Math.round(totalSalesRevenue * 0.42);
  const grossProfit = totalSalesRevenue - costOfGoodsSold;
  const grossMargin = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

  // Total operating expenses
  const operatingExpenses = totalExpenseTransactions + Math.round(totalMonthlyPayroll / 30 * 1); // 1 day payroll for daily demo
  const netProfit = grossProfit - totalExpenseTransactions;
  const netMargin = totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;

  // Cash Flow Calculations
  const totalCashIn = transactions
    .filter(t => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalCashOut = totalExpenseTransactions;
  const netCashFlow = totalCashIn - totalCashOut;

  // Accounts Receivable total
  const totalReceivables = accountsReceivable.reduce((sum, r) => sum + r.balance, 0);

  const handleCreateExpense = (e) => {
    e.preventDefault();
    if (!expenseAmount || Number(expenseAmount) <= 0) return;

    const newTrx = {
      id: `TRX-${Date.now().toString().slice(-3)}`,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: 'egreso',
      category: expenseCategory,
      concept: expenseConcept || 'Gasto Operativo de Planta',
      amount: Number(expenseAmount),
      paymentMethod: expensePaymentMethod,
      thirdParty: expenseThirdParty || 'Proveedor General',
      status: 'Aplicado'
    };

    onAddTransaction(newTrx);
    setShowNewExpenseModal(false);
    setExpenseConcept('');
    setExpenseAmount('');
    setExpenseThirdParty('');

    try {
      confetti({
        particleCount: 50,
        spread: 45,
        origin: { y: 0.7 }
      });
    } catch (e) {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-info">Contabilidad & Finanzas</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>P&G, Flujo de Caja & Cartera Horeca</span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800' }}>
            Contabilidad General & Estado de Resultados
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '700px' }}>
            Control financiero integral: margen bruto por pulpas vendidas, costos de fruta y empaque, nómina y cuentas por cobrar.
          </p>
        </div>

        <button
          onClick={() => setShowNewExpenseModal(true)}
          className="btn btn-primary"
          style={{ gap: '8px' }}
        >
          <Plus size={16} />
          Registrar Egreso / Gasto
        </button>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 0 }}>
        <div className="stat-card">
          <div>
            <div className="stat-label">Ingresos Operacionales (Ventas)</div>
            <div className="stat-value" style={{ color: '#10b981' }}>{formatCOP(totalSalesRevenue)}</div>
            <div className="stat-meta positive">
              <ArrowUpRight size={14} />
              <span>{invoices.length} facturas emitidas</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Egresos / Gastos Totales</div>
            <div className="stat-value" style={{ color: '#ef4444' }}>{formatCOP(totalExpenseTransactions)}</div>
            <div className="stat-meta" style={{ color: '#ef4444' }}>
              <ArrowDownRight size={14} />
              <span>Fruta + Empaques + Servicios</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <TrendingDown size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Cartera / Cuentas x Cobrar</div>
            <div className="stat-value" style={{ color: '#f59e0b' }}>{formatCOP(totalReceivables)}</div>
            <div className="stat-meta warning">
              <Calendar size={14} />
              <span>Créditos a 15 y 30 días</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Receipt size={24} />
          </div>
        </div>
      </div>

      {/* Accounting Tabs Selector */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveSubTab('pyg')}
          className={`btn ${activeSubTab === 'pyg' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ gap: '8px' }}
        >
          <BarChart3 size={16} />
          1. Estado de Resultados (P&G)
        </button>

        <button
          onClick={() => setActiveSubTab('flujo')}
          className={`btn ${activeSubTab === 'flujo' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ gap: '8px' }}
        >
          <DollarSign size={16} />
          2. Flujo de Caja & Movimientos
        </button>

        <button
          onClick={() => setActiveSubTab('cartera')}
          className={`btn ${activeSubTab === 'cartera' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ gap: '8px' }}
        >
          <Receipt size={16} />
          3. Cuentas por Cobrar ({accountsReceivable.length})
        </button>
      </div>

      {/* Tab 1: Estado de Resultados (P&G) */}
      {activeSubTab === 'pyg' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          
          {/* Detailed Statement Table */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <FileSpreadsheet size={20} color="#10b981" />
                  Estado de Pérdidas y Ganancias (P&G)
                </h2>
                <p className="card-subtitle">Período Actual • Régimen Simple de Tributación</p>
              </div>
              <span className="badge badge-success">Rentable</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
              
              {/* Gross Income */}
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: '#10b981' }}>(+) INGRESOS BRUTOS OPERACIONALES</strong>
                  <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>{formatCOP(totalSalesRevenue)}</strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Venta de pulpas pasteurizadas 140g, 250g, 500g y 1000g
                </div>
              </div>

              {/* Cost of Goods Sold */}
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: '#ef4444' }}>(-) COSTO DE VENTAS (Materia Prima & Empaque)</strong>
                  <strong style={{ color: '#ef4444', fontSize: '1.05rem' }}>-{formatCOP(costOfGoodsSold)}</strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Fruta fresca comprada a agricultores + bolsas grado alimenticio (42% costo est.)
                </div>
              </div>

              {/* Gross Profit */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '2px dashed var(--border-subtle)' }}>
                <strong>(=) UTILIDAD BRUTA:</strong>
                <strong style={{ fontSize: '1.15rem', color: '#10b981' }}>{formatCOP(grossProfit)} ({grossMargin.toFixed(1)}%)</strong>
              </div>

              {/* Operating Expenses */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 16px' }}>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: '700' }}>
                  (-) GASTOS OPERACIONALES REGISTRADOS:
                </span>
                
                {transactions.filter(t => t.type === 'egreso').map(exp => (
                  <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>• {exp.category} ({exp.thirdParty}):</span>
                    <span style={{ color: '#ef4444' }}>-{formatCOP(exp.amount)}</span>
                  </div>
                ))}
              </div>

              {/* Net Profit */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)',
                border: '2px solid rgba(16, 185, 129, 0.4)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>
                    (=) UTILIDAD NETA DEL EJERCICIO:
                  </span>
                  <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#10b981' }}>
                    {formatCOP(netProfit)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.85rem' }}>
                    Margen Neto: {netMargin.toFixed(1)}%
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Expense Distribution Visualizer */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <PieChart size={20} color="#8b5cf6" />
                  Estructura de Costos de la Planta
                </h2>
                <p className="card-subtitle">Desglose de gastos por categoría</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span>🍇 Fruta Fresca & Materia Prima</span>
                  <strong>52%</strong>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '52%', height: '100%', background: '#f59e0b' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span>👥 Nómina & Seguridad Social</span>
                  <strong>28%</strong>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '28%', height: '100%', background: '#3b82f6' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span>❄️ Energía Cava & Servicios</span>
                  <strong>12%</strong>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '12%', height: '100%', background: '#8b5cf6' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span>🛵 Combustible & Logística de Envíos</span>
                  <strong>8%</strong>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '8%', height: '100%', background: '#10b981' }}></div>
                </div>
              </div>

              {/* Tax Note */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginTop: '10px',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}>
                💡 <strong>Beneficio Tributario:</strong> Las pulpas de fruta 100% naturales están exentas de IVA en Colombia conforme a la canasta familiar y el régimen simple de tributación.
              </div>

            </div>
          </div>

        </div>
      )}

      {/* Tab 2: Flujo de Caja & Movimientos */}
      {activeSubTab === 'flujo' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <DollarSign size={20} color="#10b981" />
                Libro de Ingresos y Egresos (Flujo de Caja)
              </h2>
              <p className="card-subtitle">Kardex de movimientos de dinero en caja y bancos</p>
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Buscar por concepto o tercero..."
                className="input"
                style={{ paddingLeft: '32px', padding: '6px 12px 6px 32px', fontSize: '0.82rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha / Ref</th>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Concepto / Detalle</th>
                  <th>Tercero / Cliente</th>
                  <th>Método Pago</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {transactions
                  .filter(t => t.concept.toLowerCase().includes(searchTerm.toLowerCase()) || t.thirdParty.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(t => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: '700' }}>{t.id}</div>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{t.date}</span>
                      </td>
                      <td>
                        <span className={`badge ${t.type === 'ingreso' ? 'badge-success' : 'badge-danger'}`}>
                          {t.type === 'ingreso' ? 'Ingreso (+)' : 'Egreso (-)'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                        {t.category}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {t.concept}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {t.thirdParty}
                      </td>
                      <td>
                        <span className="badge badge-info">{t.paymentMethod}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800', fontSize: '0.95rem', color: t.type === 'ingreso' ? '#10b981' : '#ef4444' }}>
                        {t.type === 'ingreso' ? '+' : '-'}{formatCOP(t.amount)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Cuentas por Cobrar (Cartera) */}
      {activeSubTab === 'cartera' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Receipt size={20} color="#f59e0b" />
                Cartera & Cuentas por Cobrar
              </h2>
              <p className="card-subtitle">Seguimiento de facturas con plazo de crédito a clientes HORECA</p>
            </div>
            <span className="badge badge-warning">{accountsReceivable.length} Facturas a Crédito</span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Factura / Cliente</th>
                  <th>Emisión</th>
                  <th>Vencimiento</th>
                  <th>Plazo</th>
                  <th>Total Factura</th>
                  <th>Saldo Pendiente</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {accountsReceivable.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: '800' }}>{item.invoiceId}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{item.clientName}</div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>NIT: {item.nit}</span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {item.issueDate}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {item.dueDate}
                    </td>
                    <td>
                      <span className="badge badge-info">{item.terms}</span>
                    </td>
                    <td>
                      <strong>{formatCOP(item.total)}</strong>
                    </td>
                    <td>
                      <strong style={{ color: '#f59e0b', fontSize: '1rem' }}>{formatCOP(item.balance)}</strong>
                    </td>
                    <td>
                      <span className="badge badge-warning">Vigente</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => onCollectReceivable(item.id)}
                        className="btn btn-success btn-sm"
                        style={{ gap: '6px' }}
                      >
                        <CheckCircle2 size={14} />
                        Registrar Cobro
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Registrar Nuevo Egreso / Gasto */}
      {showNewExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowNewExpenseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Registrar Gasto / Egreso</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Salida de dinero de caja o bancos</p>
              </div>
              <button onClick={() => setShowNewExpenseModal(false)} className="btn-icon">✕</button>
            </div>

            <form onSubmit={handleCreateExpense}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div>
                  <label className="input-label">Categoría del Gasto:</label>
                  <select
                    className="select"
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                  >
                    <option value="Materia Prima (Fruta Fresca)">Materia Prima (Fruta Fresca)</option>
                    <option value="Empaque & Insumos">Empaque & Insumos (Bolsas, Sellado)</option>
                    <option value="Combustible & Mensajería">Combustible & Mensajería</option>
                    <option value="Servicios de Planta (Energía Cava)">Servicios de Planta (Energía / Agua)</option>
                    <option value="Mantenimiento de Maquinaria">Mantenimiento de Despulpadora</option>
                    <option value="Gastos Generales / Administración">Gastos Generales / Administración</option>
                  </select>
                </div>

                <div>
                  <label className="input-label">Concepto / Detalle:</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ej. Compra 200 Kg Lulo a campesinos de Boyacá"
                    value={expenseConcept}
                    onChange={(e) => setExpenseConcept(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="input-label">Monto ($ COP):</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Ej. 250000"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="input-label">Método de Pago:</label>
                    <select
                      className="select"
                      value={expensePaymentMethod}
                      onChange={(e) => setExpensePaymentMethod(e.target.value)}
                    >
                      <option value="Transferencia Bancolombia">Transferencia Bancolombia</option>
                      <option value="Nequi">Nequi</option>
                      <option value="Daviplata">Daviplata</option>
                      <option value="Efectivo de Caja">Efectivo de Caja</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="input-label">Proveedor / Tercero Beneficiario:</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ej. Agrofrutas del Llano / Distribuidora de Bolsas"
                    value={expenseThirdParty}
                    onChange={(e) => setExpenseThirdParty(e.target.value)}
                    required
                  />
                </div>

              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowNewExpenseModal(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ gap: '8px' }}
                >
                  <CheckCircle2 size={18} />
                  Guardar Egreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
