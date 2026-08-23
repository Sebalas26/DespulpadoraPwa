import React, { useState } from 'react';
import { 
  ReceiptText, 
  Plus, 
  Search, 
  Printer, 
  Eye, 
  DollarSign, 
  TrendingUp, 
  Tag, 
  CheckCircle2, 
  Clock, 
  CreditCard,
  FileText,
  AlertCircle
} from 'lucide-react';
import InvoiceModal from './InvoiceModal';

export default function BillingManager({ 
  invoices, 
  orders, 
  fruits, 
  promotions, 
  clients, 
  onCreateInvoice,
  setActiveTab
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state for creating custom invoice
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [customClientName, setCustomClientName] = useState('');
  const [customClientNit, setCustomClientNit] = useState('');
  const [customClientPhone, setCustomClientPhone] = useState('');
  const [customClientAddress, setCustomClientAddress] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Nequi / Daviplata');
  const [selectedPromoId, setSelectedPromoId] = useState('');
  
  // Custom invoice line items
  const [invoiceItems, setInvoiceItems] = useState([
    { fruitId: 'maracuya', size: 'g140', qty: 10 }
  ]);

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  };

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const pendingToBillOrders = orders.filter(o => o.status === 'empacado' && !o.invoiceId);

  const filteredInvoices = invoices.filter(inv => {
    return (
      inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.client.nit && inv.client.nit.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handleAddItemRow = () => {
    setInvoiceItems(prev => [...prev, { fruitId: 'mango', size: 'g140', qty: 5 }]);
  };

  const handleRemoveItemRow = (index) => {
    setInvoiceItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    setInvoiceItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const calculateCustomInvoice = () => {
    let subtotal = 0;
    const itemsFormatted = invoiceItems.map(item => {
      const fruit = fruits.find(f => f.id === item.fruitId) || fruits[0];
      const unitPrice = fruit.prices[item.size] || 2000;
      const total = Number(item.qty) * unitPrice;
      subtotal += total;
      return {
        name: `Pulpa de ${fruit.name} ${item.size.replace('g', '')}g`,
        qty: Number(item.qty),
        unitPrice,
        total
      };
    });

    let discount = 0;
    const promo = promotions.find(p => p.id === selectedPromoId);
    if (promo) {
      discount = Math.round(subtotal * (promo.discountPercent / 100));
      if (promo.freeItemName) {
        itemsFormatted.push({
          name: `Obsequio: ${promo.freeItemName}`,
          qty: 1,
          unitPrice: 0,
          total: 0
        });
      }
    }

    const total = Math.max(0, subtotal - discount);
    return { subtotal, discount, total, itemsFormatted };
  };

  const handleSubmitNewInvoice = (e) => {
    e.preventDefault();
    const { subtotal, discount, total, itemsFormatted } = calculateCustomInvoice();
    
    let clientData;
    if (selectedClientId === 'custom') {
      clientData = {
        name: customClientName || 'Cliente Particular',
        nit: customClientNit || '222222222222',
        phone: customClientPhone || '300 000 0000',
        address: customClientAddress || 'Entrega en Mostrador'
      };
    } else {
      const existing = clients.find(c => c.id === selectedClientId) || clients[0];
      clientData = {
        name: existing.name,
        nit: existing.nit,
        phone: existing.phone,
        address: existing.address
      };
    }

    const newInvoice = {
      id: `FAC-2026-${String(invoices.length + 90).padStart(3, '0')}`,
      orderId: null,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      client: clientData,
      items: itemsFormatted,
      subtotal,
      discount,
      taxRate: 0,
      tax: 0,
      total,
      paymentMethod: selectedPaymentMethod,
      courierName: 'Mostrador / Por Enrutar',
      resolutionDIAN: 'Resolución DIAN No. 187640001923 del 2026-01-15 (Prefijo FAC Rango 001 al 5000)'
    };

    onCreateInvoice(newInvoice);
    setShowCreateModal(false);
    setSelectedInvoice(newInvoice);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-info">Paso 4 y 7 del Flujo</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Contabilidad, Facturas & DIAN</span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800' }}>
            Facturación & Comprobantes de Venta
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '700px' }}>
            Generación automática de facturas a partir de pedidos empacados o creación de facturas manuales con cálculo de promociones y código QR.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
          style={{ gap: '8px' }}
        >
          <Plus size={16} />
          Nueva Factura de Venta
        </button>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid" style={{ marginBottom: 0 }}>
        <div className="stat-card">
          <div>
            <div className="stat-label">Total Facturado Hoy</div>
            <div className="stat-value" style={{ color: '#10b981' }}>{formatCOP(totalBilled)}</div>
            <div className="stat-meta positive">
              <TrendingUp size={14} />
              <span>{invoices.length} comprobantes generados</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <DollarSign size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Pedidos Listos para Facturar</div>
            <div className="stat-value" style={{ color: pendingToBillOrders.length > 0 ? '#f59e0b' : 'inherit' }}>
              {pendingToBillOrders.length}
            </div>
            <div className="stat-meta warning">
              <Clock size={14} />
              <span>Empacados en bodega</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <FileText size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Estado Régimen Tributario</div>
            <div className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>Régimen Simple</div>
            <div className="stat-meta positive">
              <CheckCircle2 size={14} />
              <span>IVA 0% Alimentos Naturales</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <ReceiptText size={24} />
          </div>
        </div>
      </div>

      {/* Pending Orders Ready to Bill Alert Banner */}
      {pendingToBillOrders.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={22} color="#f59e0b" />
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.92rem' }}>
                Hay {pendingToBillOrders.length} pedido(s) empacado(s) pendiente(s) de generar factura:
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {pendingToBillOrders.map(o => `${o.id} (${o.client.name})`).join(' • ')}
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('pedidos')}
            className="btn btn-warning btn-sm"
          >
            Ir a Alistamiento
          </button>
        </div>
      )}

      {/* Invoices List Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <ReceiptText size={20} color="#10b981" />
              Listado de Facturas Emitidas
            </h2>
            <p className="card-subtitle">Consulta, reimpresión y comprobantes fiscales</p>
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar por Factura, Cliente o NIT..."
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
                <th>No. Factura</th>
                <th>Fecha / Hora</th>
                <th>Cliente / NIT</th>
                <th>Total Productos</th>
                <th>Método de Pago</th>
                <th>Total Facturado</th>
                <th>Mensajero / Ruta</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div style={{ fontWeight: '800', color: 'var(--text-main)' }}>{inv.id}</div>
                    {inv.orderId && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ref: {inv.orderId}</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {inv.date}
                  </td>
                  <td>
                    <div style={{ fontWeight: '700' }}>{inv.client.name}</div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>NIT: {inv.client.nit}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.82rem' }}>
                      {inv.items.reduce((s, i) => s + i.qty, 0)} pulpas
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-info">{inv.paymentMethod}</span>
                  </td>
                  <td>
                    <strong style={{ color: '#10b981', fontSize: '0.98rem' }}>{formatCOP(inv.total)}</strong>
                    {inv.discount > 0 && (
                      <span style={{ fontSize: '0.7rem', color: '#dc2626', display: 'block' }}>
                        Desc: -{formatCOP(inv.discount)}
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {inv.courierName}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="btn btn-secondary btn-sm"
                      style={{ gap: '6px' }}
                      title="Ver Factura Formal / Imprimir"
                    >
                      <Eye size={14} color="#10b981" />
                      Ver Factura
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Custom Invoice Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '800' }}>
                  Generar Nueva Factura de Venta
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Facturación directa de mostrador o pedido especial
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-icon"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewInvoice}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {/* Client Selection */}
                <div>
                  <label className="input-label">Seleccionar Cliente</label>
                  <select
                    className="select"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (NIT: {c.nit})</option>
                    ))}
                    <option value="custom">+ Crear Nuevo Cliente / Venta Mostrador</option>
                  </select>
                </div>

                {selectedClientId === 'custom' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <label className="input-label">Nombre / Razón Social</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Ej. Juan Pérez"
                        value={customClientName}
                        onChange={(e) => setCustomClientName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="input-label">NIT / Cédula</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Ej. 10203040"
                        value={customClientNit}
                        onChange={(e) => setCustomClientNit(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="input-label">Teléfono / WhatsApp</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Ej. 310 123 4567"
                        value={customClientPhone}
                        onChange={(e) => setCustomClientPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="input-label">Dirección</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Ej. Carrera 15 #80-10"
                        value={customClientAddress}
                        onChange={(e) => setCustomClientAddress(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Line Items List */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="input-label" style={{ margin: 0 }}>Ítems / Pulpas de Fruta</label>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="btn btn-secondary btn-sm"
                      style={{ gap: '4px' }}
                    >
                      <Plus size={12} /> Agregar Ítem
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {invoiceItems.map((item, idx) => {
                      const currentFruit = fruits.find(f => f.id === item.fruitId) || fruits[0];
                      const unitP = currentFruit.prices[item.size] || 2000;
                      return (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr 40px', gap: '8px', alignItems: 'center' }}>
                          <select
                            className="select"
                            value={item.fruitId}
                            onChange={(e) => handleItemChange(idx, 'fruitId', e.target.value)}
                          >
                            {fruits.map(f => (
                              <option key={f.id} value={f.id}>{f.emoji} {f.name}</option>
                            ))}
                          </select>

                          <select
                            className="select"
                            value={item.size}
                            onChange={(e) => handleItemChange(idx, 'size', e.target.value)}
                          >
                            <option value="g140">140g ({formatCOP(currentFruit.prices.g140)})</option>
                            <option value="g250">250g ({formatCOP(currentFruit.prices.g250)})</option>
                            <option value="g500">500g ({formatCOP(currentFruit.prices.g500)})</option>
                            <option value="g1000">1000g ({formatCOP(currentFruit.prices.g1000)})</option>
                          </select>

                          <input
                            type="number"
                            min="1"
                            max="500"
                            className="input"
                            value={item.qty}
                            onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                          />

                          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#10b981', textAlign: 'right' }}>
                            {formatCOP(item.qty * unitP)}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="btn-icon"
                            style={{ width: '32px', height: '32px', color: '#ef4444' }}
                            disabled={invoiceItems.length === 1}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Promotions & Payment Method */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="input-label">Aplicar Promoción / Combo Especial</label>
                    <select
                      className="select"
                      value={selectedPromoId}
                      onChange={(e) => setSelectedPromoId(e.target.value)}
                    >
                      <option value="">Sin promoción aplicada</option>
                      {promotions.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (-{p.discountPercent}%)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="input-label">Método de Pago</label>
                    <select
                      className="select"
                      value={selectedPaymentMethod}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    >
                      <option value="Nequi / Daviplata">Nequi / Daviplata</option>
                      <option value="Transferencia Bancolombia">Transferencia Bancolombia</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta Débito/Crédito">Tarjeta Débito/Crédito</option>
                      <option value="Crédito 15 Días">Crédito 15 Días (Horeca)</option>
                    </select>
                  </div>
                </div>

                {/* Summary calculation box */}
                {(() => {
                  const { subtotal, discount, total } = calculateCustomInvoice();
                  return (
                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Subtotal: {formatCOP(subtotal)} {discount > 0 && `| Desc: -${formatCOP(discount)}`}
                        </span>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981' }}>
                          Total: {formatCOP(total)}
                        </div>
                      </div>
                      <span className="badge badge-success">IVA 0% Exento</span>
                    </div>
                  );
                })()}

              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ gap: '8px' }}
                >
                  <ReceiptText size={18} />
                  Generar y Ver Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Viewer Modal */}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

    </div>
  );
}
