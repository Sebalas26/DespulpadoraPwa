import React, { useState } from 'react';
import { PackageCheck, ReceiptText, Truck, Sparkles, MessageSquare, Layers } from 'lucide-react';
import OrdersPicking from './OrdersPicking';
import BillingManager from './BillingManager';
import DispatchLogistics from './DispatchLogistics';

export default function OrdersUnified({
  orders,
  invoices,
  fruits,
  promotions,
  clients,
  couriers,
  onUpdateOrderStatus,
  onToggleItemPicked,
  onOpenWhatsAppModal,
  onGenerateInvoiceForOrder,
  onCreateInvoice,
  onAssignCourier,
  onMarkOrderDelivered,
  initialSubTab = 'picking'
}) {
  const [subTab, setSubTab] = useState(initialSubTab);

  const pickingCount = orders.filter(o => o.status === 'nuevo' || o.status === 'alistamiento').length;
  const readyToInvoiceCount = orders.filter(o => o.status === 'empacado' && !o.invoiceId).length;
  const dispatchReadyCount = orders.filter(o => (o.status === 'empacado' || o.status === 'facturado') && !o.courierId).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-success">Flujo Comercial Completo</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Alistamiento (3), Facturación (4) y Mensajería (5)</span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800' }}>
            Módulo de Pedidos & Despachos
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '700px' }}>
            Control unificado del ciclo de pedidos: recepción por WhatsApp, alistamiento físico en bodega, generación de factura formal y asignación de ruta a mensajeros.
          </p>
        </div>

        <button
          onClick={onOpenWhatsAppModal}
          className="btn btn-primary"
          style={{ gap: '8px' }}
        >
          <MessageSquare size={16} />
          Simular Pedido WhatsApp
        </button>
      </div>

      {/* Internal Sub-tabs navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSubTab('picking')}
          className={`btn ${subTab === 'picking' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ gap: '8px' }}
        >
          <PackageCheck size={16} />
          1. Alistamiento (Picking & Bodega)
          {pickingCount > 0 && (
            <span className="nav-badge danger" style={{ marginLeft: '4px' }}>{pickingCount}</span>
          )}
        </button>

        <button
          onClick={() => setSubTab('facturacion')}
          className={`btn ${subTab === 'facturacion' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ gap: '8px' }}
        >
          <ReceiptText size={16} />
          2. Facturación & Ventas
          {readyToInvoiceCount > 0 && (
            <span className="nav-badge warning" style={{ marginLeft: '4px' }}>{readyToInvoiceCount}</span>
          )}
        </button>

        <button
          onClick={() => setSubTab('despachos')}
          className={`btn ${subTab === 'despachos' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ gap: '8px' }}
        >
          <Truck size={16} />
          3. Mensajeros & Rutas
          {dispatchReadyCount > 0 && (
            <span className="nav-badge" style={{ marginLeft: '4px', background: '#3b82f6' }}>{dispatchReadyCount}</span>
          )}
        </button>
      </div>

      {/* Sub-tab Views */}
      {subTab === 'picking' && (
        <OrdersPicking
          orders={orders}
          onUpdateOrderStatus={onUpdateOrderStatus}
          onToggleItemPicked={onToggleItemPicked}
          onOpenWhatsAppModal={onOpenWhatsAppModal}
          onGenerateInvoiceForOrder={(order) => {
            onGenerateInvoiceForOrder(order);
            setSubTab('facturacion');
          }}
          setActiveTab={(tab) => {
            if (tab === 'facturacion') setSubTab('facturacion');
            else if (tab === 'despachos') setSubTab('despachos');
          }}
        />
      )}

      {subTab === 'facturacion' && (
        <BillingManager
          invoices={invoices}
          orders={orders}
          fruits={fruits}
          promotions={promotions}
          clients={clients}
          onCreateInvoice={onCreateInvoice}
          setActiveTab={(tab) => {
            if (tab === 'pedidos') setSubTab('picking');
            else if (tab === 'despachos') setSubTab('despachos');
          }}
        />
      )}

      {subTab === 'despachos' && (
        <DispatchLogistics
          orders={orders}
          couriers={couriers}
          onAssignCourier={onAssignCourier}
          onMarkOrderDelivered={onMarkOrderDelivered}
        />
      )}

    </div>
  );
}
