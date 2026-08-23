import React from 'react';
import { 
  DollarSign, 
  Package, 
  Boxes, 
  Truck, 
  TrendingUp, 
  AlertTriangle, 
  PlusCircle, 
  MessageSquare, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function DashboardOverview({
  fruits,
  orders,
  invoices,
  couriers,
  batches,
  setActiveTab,
  onOpenWhatsAppModal
}) {
  // Calculations for KPI Cards
  const totalSalesToday = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const pulpProducedKg = batches.reduce((sum, b) => sum + (b.netPulpKg || 0), 0);
  
  const pendingOrdersCount = orders.filter(o => o.status === 'nuevo' || o.status === 'alistamiento').length;
  const inRouteOrdersCount = orders.filter(o => o.status === 'en_ruta').length;
  const deliveredOrdersCount = orders.filter(o => o.status === 'entregado').length;

  // Low stock alerts calculation
  const lowStockItems = [];
  fruits.forEach(fruit => {
    Object.keys(fruit.stock).forEach(sizeKey => {
      if (fruit.stock[sizeKey] <= fruit.minStock[sizeKey]) {
        lowStockItems.push({
          fruitName: fruit.name,
          size: sizeKey.replace('g', '') + 'g',
          current: fruit.stock[sizeKey],
          min: fruit.minStock[sizeKey],
          color: fruit.color,
          emoji: fruit.emoji
        });
      }
    });
  });

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Welcome Banner with Quick Shortcuts */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.9) 60%, rgba(245, 158, 11, 0.1) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-success">Flujo Activo</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', lineHeight: '1.2' }}>
              Panel de Control Despulpadora 🍍
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '4px', maxWidth: '650px' }}>
              Monitoreo integral desde la recepción y formulación de fruta fresca hasta el alistamiento por WhatsApp, facturación y entrega por mensajeros.
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <button
              onClick={() => setActiveTab('preparacion')}
              className="btn btn-secondary"
              style={{ gap: '8px' }}
            >
              <PlusCircle size={16} color="#10b981" />
              Nueva Formulación
            </button>
            <button
              onClick={onOpenWhatsAppModal}
              className="btn btn-primary"
              style={{ gap: '8px' }}
            >
              <MessageSquare size={16} />
              Simular Pedido WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        {/* Card 1: Ventas Hoy */}
        <div className="stat-card">
          <div>
            <div className="stat-label">Ventas Facturadas Hoy</div>
            <div className="stat-value" style={{ color: '#10b981' }}>{formatCOP(totalSalesToday)}</div>
            <div className="stat-meta positive">
              <TrendingUp size={14} />
              <span>{invoices.length} facturas emitidas</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <DollarSign size={24} />
          </div>
        </div>

        {/* Card 2: Pulpa Producida */}
        <div className="stat-card">
          <div>
            <div className="stat-label">Pulpa Neta Procesada</div>
            <div className="stat-value">{pulpProducedKg.toFixed(1)} <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Kg</span></div>
            <div className="stat-meta positive">
              <Sparkles size={14} />
              <span>{batches.length} lotes de despulpado</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Boxes size={24} />
          </div>
        </div>

        {/* Card 3: Pedidos en Alistamiento */}
        <div className="stat-card">
          <div>
            <div className="stat-label">Pedidos en Alistamiento</div>
            <div className="stat-value" style={{ color: pendingOrdersCount > 0 ? '#f59e0b' : 'inherit' }}>
              {pendingOrdersCount}
            </div>
            <div className="stat-meta warning">
              <Clock size={14} />
              <span>Revisar bodega y picking</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <Package size={24} />
          </div>
        </div>

        {/* Card 4: Despachos Activos */}
        <div className="stat-card">
          <div>
            <div className="stat-label">En Ruta / Entregados</div>
            <div className="stat-value">{inRouteOrdersCount} <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>/ {deliveredOrdersCount}</span></div>
            <div className="stat-meta positive">
              <Truck size={14} />
              <span>{couriers.filter(c => c.status === 'en_ruta').length} mensajeros en calle</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Truck size={24} />
          </div>
        </div>
      </div>

      {/* Main Grid: Orders Flow + Stock Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Left Col: Flujo de Pedidos en Vivo */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Package size={20} color="#10b981" />
                Flujo de Pedidos en Vivo
              </h2>
              <p className="card-subtitle">Seguimiento desde WhatsApp hasta entrega final</p>
            </div>
            <button
              onClick={() => setActiveTab('pedidos')}
              className="btn btn-secondary btn-sm"
              style={{ gap: '4px' }}
            >
              Ver todos <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders.slice(0, 4).map((order) => {
              const statusConfig = {
                nuevo: { label: 'Nuevo WhatsApp', badge: 'badge-purple' },
                alistamiento: { label: 'En Alistamiento', badge: 'badge-warning' },
                empacado: { label: 'Empacado / Listo', badge: 'badge-info' },
                facturado: { label: 'Facturado', badge: 'badge-info' },
                en_ruta: { label: 'En Ruta 🛵', badge: 'badge-warning' },
                entregado: { label: 'Entregado ✓', badge: 'badge-success' }
              }[order.status] || { label: order.status, badge: 'badge-info' };

              return (
                <div
                  key={order.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '0.9rem' }}>{order.id}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({order.source})</span>
                    </div>
                    <span className={`badge ${statusConfig.badge}`}>{statusConfig.label}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.88rem' }}>{order.client.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{order.client.address}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', color: '#10b981', fontSize: '0.92rem' }}>{formatCOP(order.total)}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{order.items.reduce((s, i) => s + i.qty, 0)} unidades</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Stock por Fruta & Alertas */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Boxes size={20} color="#f59e0b" />
                Resumen de Stock & Cava
              </h2>
              <p className="card-subtitle">Disponibilidad en porciones y materia prima</p>
            </div>
            <button
              onClick={() => setActiveTab('inventario')}
              className="btn btn-secondary btn-sm"
              style={{ gap: '4px' }}
            >
              Inventario <ChevronRight size={14} />
            </button>
          </div>

          {/* Stock Alerts Notice */}
          {lowStockItems.length > 0 && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem', color: '#fca5a5' }}>
                <strong>{lowStockItems.length} alertas de stock bajo:</strong> {lowStockItems.map(i => `${i.fruitName} ${i.size} (${i.current} un)`).join(', ')}
              </div>
            </div>
          )}

          {/* Quick Fruit Stock Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {fruits.slice(0, 5).map((fruit) => {
              const totalPortions = fruit.stock.g140 + fruit.stock.g250 + fruit.stock.g500 + fruit.stock.g1000;
              return (
                <div key={fruit.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                      <span>{fruit.emoji}</span>
                      <span>{fruit.name}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <strong>{totalPortions}</strong> pulpas | <strong>{fruit.freshStockKg} Kg</strong> fruta fresca
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ width: `${(fruit.stock.g140 / (totalPortions || 1)) * 100}%`, background: fruit.color }} title={`140g: ${fruit.stock.g140}`} />
                    <div style={{ width: `${(fruit.stock.g250 / (totalPortions || 1)) * 100}%`, background: '#3b82f6' }} title={`250g: ${fruit.stock.g250}`} />
                    <div style={{ width: `${(fruit.stock.g500 / (totalPortions || 1)) * 100}%`, background: '#8b5cf6' }} title={`500g: ${fruit.stock.g500}`} />
                    <div style={{ width: `${(fruit.stock.g1000 / (totalPortions || 1)) * 100}%`, background: '#10b981' }} title={`1000g: ${fruit.stock.g1000}`} />
                  </div>

                  <div style={{ display: 'flex', gap: '6px', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    <span>140g: <strong style={{ color: 'var(--text-main)' }}>{fruit.stock.g140}</strong></span>
                    <span>• 250g: <strong style={{ color: 'var(--text-main)' }}>{fruit.stock.g250}</strong></span>
                    <span>• 500g: <strong style={{ color: 'var(--text-main)' }}>{fruit.stock.g500}</strong></span>
                    <span>• 1Kg: <strong style={{ color: 'var(--text-main)' }}>{fruit.stock.g1000}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Couriers Active Status Section */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Truck size={20} color="#3b82f6" />
              Estado de Mensajeros & Enrutamiento
            </h2>
            <p className="card-subtitle">Seguimiento de entregas y recaudo en efectivo</p>
          </div>
          <button
            onClick={() => setActiveTab('despachos')}
            className="btn btn-secondary btn-sm"
            style={{ gap: '4px' }}
          >
            Ver Logística <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {couriers.map((courier) => (
            <div
              key={courier.id}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem'
              }}>
                {courier.avatar}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.92rem' }}>{courier.name}</span>
                  <span className={`badge ${courier.status === 'en_ruta' ? 'badge-warning' : 'badge-success'}`}>
                    {courier.status === 'en_ruta' ? 'En Ruta' : 'Disponible'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {courier.vehicle} • {courier.plate}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Activos: <strong style={{ color: 'var(--text-main)' }}>{courier.activeDeliveries}</strong></span>
                  <span style={{ color: '#10b981', fontWeight: '600' }}>Recaudo: {formatCOP(courier.cashCollected)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
