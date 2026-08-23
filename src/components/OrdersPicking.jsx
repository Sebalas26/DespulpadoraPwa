import React, { useState } from 'react';
import { 
  PackageCheck, 
  MessageSquare, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Receipt, 
  CheckSquare, 
  Square, 
  Sparkles, 
  Eye, 
  Plus, 
  ArrowRight,
  User,
  Phone,
  MapPin,
  Tag
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function OrdersPicking({ 
  orders, 
  onUpdateOrderStatus, 
  onToggleItemPicked, 
  onOpenWhatsAppModal, 
  onGenerateInvoiceForOrder,
  setActiveTab
}) {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activePickingOrder, setActivePickingOrder] = useState(null);

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client.address.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleStartPicking = (order) => {
    setActivePickingOrder(order);
    if (order.status === 'nuevo') {
      onUpdateOrderStatus(order.id, 'alistamiento');
    }
  };

  const handleCompletePicking = (order) => {
    onUpdateOrderStatus(order.id, 'empacado');
    setActivePickingOrder(null);
    try {
      confetti({
        particleCount: 60,
        spread: 50,
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
            <span className="badge badge-danger">Paso 3 del Flujo</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bodega, Checklist & Alistamiento</span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800' }}>
            Alistamiento de Pedidos (Picking)
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '700px' }}>
            Recepción de pedidos por WhatsApp o llamada, verificación física en cava y empaque con obsequios y promociones.
          </p>
        </div>

        <button
          onClick={onOpenWhatsAppModal}
          className="btn btn-primary"
          style={{ gap: '8px' }}
        >
          <MessageSquare size={16} />
          Ingresar Pedido WhatsApp (Plantilla)
        </button>
      </div>

      {/* Search and Status Filters */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
          
          <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 280px' }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar por ID, cliente, dirección..."
              className="input"
              style={{ paddingLeft: '38px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'nuevo', label: 'Nuevos (WA)' },
              { id: 'alistamiento', label: 'En Picking' },
              { id: 'empacado', label: 'Empacados' },
              { id: 'en_ruta', label: 'En Ruta 🛵' },
              { id: 'entregado', label: 'Entregados ✓' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`btn btn-sm ${selectedStatus === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Orders Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {filteredOrders.map((order) => {
          const totalUnits = order.items.reduce((s, i) => s + i.qty, 0);
          const pickedUnits = order.items.filter(i => i.picked).reduce((s, i) => s + i.qty, 0);
          const isFullyPicked = totalUnits > 0 && pickedUnits === totalUnits;
          const progressPercent = totalUnits > 0 ? (pickedUnits / totalUnits) * 100 : 0;

          const statusBadgeConfig = {
            nuevo: { label: 'Nuevo WhatsApp', badgeClass: 'badge-purple' },
            alistamiento: { label: 'En Alistamiento', badgeClass: 'badge-warning' },
            empacado: { label: 'Empacado / Listo', badgeClass: 'badge-info' },
            facturado: { label: 'Facturado', badgeClass: 'badge-info' },
            en_ruta: { label: 'En Ruta 🛵', badgeClass: 'badge-warning' },
            entregado: { label: 'Entregado ✓', badgeClass: 'badge-success' }
          }[order.status] || { label: order.status, badgeClass: 'badge-info' };

          return (
            <div
              key={order.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                border: order.status === 'nuevo' || order.status === 'alistamiento' 
                  ? '1.5px solid rgba(245, 158, 11, 0.4)' 
                  : '1px solid var(--border-subtle)'
              }}
            >
              <div>
                {/* Order Top Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-main)' }}>{order.id}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.date}</span>
                  </div>
                  <span className={`badge ${statusBadgeConfig.badgeClass}`}>{statusBadgeConfig.label}</span>
                </div>

                {/* Client info */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={15} color="#10b981" />
                    {order.client.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <MapPin size={13} />
                    {order.client.address}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <Phone size={13} />
                    {order.client.phone}
                  </div>
                </div>

                {/* Items Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: '700' }}>
                    Ítems a Alistar ({totalUnits} unidades):
                  </span>
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.82rem',
                        padding: '4px 0',
                        borderBottom: '1px dashed rgba(255,255,255,0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {item.picked ? (
                          <CheckSquare size={15} color="#10b981" />
                        ) : (
                          <Square size={15} color="var(--text-dim)" />
                        )}
                        <span style={{ color: item.picked ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: item.picked ? 'line-through' : 'none' }}>
                          <strong>{item.qty}x</strong> Pulpa {item.fruitName}
                        </span>
                      </div>
                      <span className="gram-tag">{item.sizeLabel}</span>
                    </div>
                  ))}
                </div>

                {/* Promotion badge if any */}
                {order.promotion && (
                  <div style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    color: '#c084fc',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '12px'
                  }}>
                    <Tag size={14} />
                    <span>Promo Aplicada: <strong>Descuento {formatCOP(order.discount)}</strong> + Obsequio</span>
                  </div>
                )}

                {/* Picking Progress Bar */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>Progreso de Alistamiento</span>
                    <span>{pickedUnits} de {totalUnits} ({progressPercent.toFixed(0)}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPercent}%`, height: '100%', background: progressPercent === 100 ? '#10b981' : '#f59e0b', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              </div>

              {/* Order Footer & Actions */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Total Pedido:</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#10b981' }}>{formatCOP(order.total)}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.paymentMethod}</span>
                </div>

                {/* Conditional Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(order.status === 'nuevo' || order.status === 'alistamiento') && (
                    <button
                      onClick={() => handleStartPicking(order)}
                      className="btn btn-warning btn-sm"
                      style={{ flex: 1, gap: '6px' }}
                    >
                      <PackageCheck size={14} />
                      Alistar en Bodega
                    </button>
                  )}

                  {order.status === 'empacado' && (
                    <button
                      onClick={() => {
                        onGenerateInvoiceForOrder(order);
                        setActiveTab('facturacion');
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, gap: '6px' }}
                    >
                      <Receipt size={14} />
                      Generar Factura
                    </button>
                  )}

                  {order.status === 'facturado' && (
                    <button
                      onClick={() => setActiveTab('despachos')}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, gap: '6px', color: '#3b82f6' }}
                    >
                      <Truck size={14} />
                      Asignar Mensajero
                    </button>
                  )}

                  {order.status === 'en_ruta' && (
                    <div style={{ fontSize: '0.78rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Truck size={14} /> En camino al destino
                    </div>
                  )}

                  {order.status === 'entregado' && (
                    <div style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={14} /> Pedido completado y cobrado
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Picking Modal Checklist (Interactive Bodega Picking) */}
      {activePickingOrder && (
        <div className="modal-overlay" onClick={() => setActivePickingOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '800' }}>
                  Checklist de Alistamiento - {activePickingOrder.id}
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {activePickingOrder.client.name} • {activePickingOrder.client.address}
                </p>
              </div>
              <button
                onClick={() => setActivePickingOrder(null)}
                className="btn-icon"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: '18px',
                fontSize: '0.82rem',
                color: 'var(--text-muted)'
              }}>
                ℹ️ <strong>Instrucción de Bodega:</strong> Extraer de cava los paquetes congelados correspondientes y verificar sello hermético y fecha de lote.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activePickingOrder.items.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => onToggleItemPicked(activePickingOrder.id, idx)}
                    style={{
                      background: item.picked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1.5px solid ${item.picked ? '#10b981' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      {item.picked ? (
                        <CheckSquare size={22} color="#10b981" />
                      ) : (
                        <Square size={22} color="var(--text-muted)" />
                      )}
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: item.picked ? '#10b981' : 'var(--text-main)' }}>
                          {item.fruitName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Presentación: <strong>{item.sizeLabel}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                        {item.qty} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>unidades</span>
                      </div>
                      <span className="badge badge-info">{item.picked ? 'Listo ✓' : 'Pendiente'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {activePickingOrder.notes && (
                <div style={{
                  marginTop: '16px',
                  padding: '10px 14px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  color: '#f59e0b'
                }}>
                  <strong>Nota del Cliente:</strong> {activePickingOrder.notes}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setActivePickingOrder(null)}
                className="btn btn-secondary"
              >
                Cerrar
              </button>
              <button
                onClick={() => handleCompletePicking(activePickingOrder)}
                className="btn btn-primary"
                style={{ gap: '8px' }}
              >
                <CheckCircle2 size={18} />
                Completar y Marcar como Empacado
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
