import React, { useState } from 'react';
import { 
  Truck, 
  UserCheck, 
  MapPin, 
  Phone, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Smartphone, 
  Navigation, 
  ChevronRight, 
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function DispatchLogistics({
  orders,
  couriers,
  onAssignCourier,
  onMarkOrderDelivered,
  onToggleCourierStatus
}) {
  const [selectedCourierId, setSelectedCourierId] = useState(couriers[0]?.id || 'courier-1');
  const [courierMobileView, setCourierMobileView] = useState(false);
  const [activeManifestModal, setActiveManifestModal] = useState(false);

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  };

  const unassignedOrders = orders.filter(
    o => (o.status === 'empacado' || o.status === 'facturado') && !o.courierId
  );

  const activeSelectedCourier = couriers.find(c => c.id === selectedCourierId) || couriers[0];
  const courierAssignedOrders = orders.filter(o => o.courierId === selectedCourierId);
  const courierPendingOrders = courierAssignedOrders.filter(o => o.status === 'en_ruta');
  const courierDeliveredOrders = courierAssignedOrders.filter(o => o.status === 'entregado');

  const handleDeliverOrder = (orderId) => {
    onMarkOrderDelivered(orderId);
    try {
      confetti({
        particleCount: 50,
        spread: 45,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-success">Paso 5 y 8 del Flujo</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Logística, Asignación & Planilla de Ruta</span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800' }}>
            Enrutamiento & Asignación a Mensajeros
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '700px' }}>
            Asigna facturas y pedidos a los mensajeros por zonas geográficas, genera la planilla de entrega y haz seguimiento al recaudo.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveManifestModal(true)}
            className="btn btn-secondary"
            style={{ gap: '6px' }}
          >
            <Printer size={16} />
            Imprimir Planilla de Ruta
          </button>
          <button
            onClick={() => setCourierMobileView(!courierMobileView)}
            className={`btn ${courierMobileView ? 'btn-warning' : 'btn-primary'}`}
            style={{ gap: '6px' }}
          >
            <Smartphone size={16} />
            {courierMobileView ? 'Volver a Vista Despachador' : 'Modo Celular Mensajero'}
          </button>
        </div>
      </div>

      {/* Courier Mobile View Simulation */}
      {courierMobileView ? (
        <div style={{
          maxWidth: '460px',
          margin: '0 auto',
          width: '100%',
          background: 'var(--bg-card-solid)',
          border: '2px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '28px',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '1.8rem' }}>{activeSelectedCourier.avatar}</div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{activeSelectedCourier.name}</h3>
                <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: '700' }}>📱 APP DEL MENSAJERO</span>
              </div>
            </div>
            <select
              className="select"
              style={{ width: 'auto', fontSize: '0.8rem', padding: '6px 10px' }}
              value={selectedCourierId}
              onChange={(e) => setSelectedCourierId(e.target.value)}
            >
              {couriers.map(c => (
                <option key={c.id} value={c.id}>{c.name.split(' ')[0]}</option>
              ))}
            </select>
          </div>

          {/* Courier Mobile Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            background: 'rgba(255,255,255,0.03)',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '18px'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Entregas Pendientes:</span>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#f59e0b' }}>
                {courierPendingOrders.length}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Recaudo Hoy:</span>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#10b981' }}>
                {formatCOP(activeSelectedCourier.cashCollected)}
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: '700' }}>
            Tus Entregas Asignadas ({courierAssignedOrders.length})
          </h4>

          {courierAssignedOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-dim)' }}>
              No tienes pedidos asignados en este momento.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {courierAssignedOrders.map(order => {
                const isDelivered = order.status === 'entregado';
                return (
                  <div
                    key={order.id}
                    style={{
                      background: isDelivered ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1.5px solid ${isDelivered ? '#10b981' : 'var(--border-highlight)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '0.95rem' }}>{order.id}</span>
                      <span className={`badge ${isDelivered ? 'badge-success' : 'badge-warning'}`}>
                        {isDelivered ? 'Entregado ✓' : 'En Camino 🛵'}
                      </span>
                    </div>

                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{order.client.name}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                        <MapPin size={13} color="#10b981" /> {order.client.address}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Phone size={13} /> {order.client.phone}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Monto a Cobrar:</span>
                      <strong style={{ fontSize: '1rem', color: '#10b981' }}>{formatCOP(order.total)}</strong>
                    </div>

                    {!isDelivered ? (
                      <button
                        onClick={() => handleDeliverOrder(order.id)}
                        className="btn btn-success"
                        style={{ width: '100%', gap: '8px', padding: '12px' }}
                      >
                        <CheckCircle2 size={18} />
                        Marcar como Entregado & Cobrado
                      </button>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: '#10b981', textAlign: 'center', fontWeight: '700' }}>
                        ✓ Pago Recaudado y Entrega Confirmada
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Dispatcher Desktop/Tablet View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          
          {/* Left Column: Couriers List & Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">
                    <UserCheck size={20} color="#10b981" />
                    Equipo de Mensajeros
                  </h2>
                  <p className="card-subtitle">Flota de despacho y zonas de cobertura</p>
                </div>
                <span className="badge badge-success">{couriers.length} Mensajeros</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {couriers.map((courier) => {
                  const isSelected = courier.id === selectedCourierId;
                  const assignedCount = orders.filter(o => o.courierId === courier.id && o.status === 'en_ruta').length;

                  return (
                    <div
                      key={courier.id}
                      onClick={() => setSelectedCourierId(courier.id)}
                      style={{
                        background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1.5px solid ${isSelected ? '#10b981' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.6rem'
                        }}>
                          {courier.avatar}
                        </div>

                        <div>
                          <div style={{ fontWeight: '800', fontSize: '0.98rem' }}>{courier.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {courier.vehicle} • {courier.plate}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#60a5fa', marginTop: '2px' }}>
                            📍 {courier.zone}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span className={`badge ${courier.status === 'en_ruta' ? 'badge-warning' : 'badge-success'}`}>
                          {courier.status === 'en_ruta' ? `${assignedCount} en ruta` : 'Disponible'}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700', marginTop: '6px' }}>
                          Recaudo: {formatCOP(courier.cashCollected)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Unassigned Orders Waiting for Courier */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">
                    <Clock size={20} color="#f59e0b" />
                    Pedidos Listos para Asignar
                  </h2>
                  <p className="card-subtitle">Empacados o facturados esperando ruta</p>
                </div>
                <span className="badge badge-warning">{unassignedOrders.length} Pendientes</span>
              </div>

              {unassignedOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-dim)', fontSize: '0.88rem' }}>
                  ✓ Todos los pedidos listos ya tienen mensajero asignado.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {unassignedOrders.map((order) => (
                    <div
                      key={order.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '800' }}>{order.id}</span>
                          <span className="badge badge-info">{order.status}</span>
                        </div>
                        <div style={{ fontWeight: '600', fontSize: '0.88rem', marginTop: '2px' }}>{order.client.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {order.client.address} ({order.client.zone})</div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <strong style={{ color: '#10b981', fontSize: '0.9rem' }}>{formatCOP(order.total)}</strong>
                        <button
                          onClick={() => onAssignCourier(order.id, selectedCourierId)}
                          className="btn btn-primary btn-sm"
                          style={{ gap: '4px' }}
                        >
                          Asignar a {activeSelectedCourier.name.split(' ')[0]} <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Active Route Details for Selected Courier */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <Navigation size={20} color="#3b82f6" />
                  Ruta Activa: {activeSelectedCourier.name}
                </h2>
                <p className="card-subtitle">{activeSelectedCourier.zone} • {activeSelectedCourier.vehicle}</p>
              </div>
              <span className="badge badge-info">{courierAssignedOrders.length} Envíos</span>
            </div>

            {/* Courier Route Summary Box */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(15, 23, 42, 0.7) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>En Ruta:</span>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f59e0b' }}>
                  {courierPendingOrders.length}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Entregados:</span>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981' }}>
                  {courierDeliveredOrders.length}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total a Recaudar:</span>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#10b981' }}>
                  {formatCOP(courierAssignedOrders.reduce((s, o) => s + o.total, 0))}
                </div>
              </div>
            </div>

            {/* Assigned Orders Timeline */}
            {courierAssignedOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-dim)' }}>
                Selecciona pedidos de la lista de la izquierda y haz clic en "Asignar" para construir la ruta de este mensajero.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {courierAssignedOrders.map((order, idx) => {
                  const isDelivered = order.status === 'entregado';
                  return (
                    <div
                      key={order.id}
                      style={{
                        background: isDelivered ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${isDelivered ? '#10b981' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: 'var(--radius-full)',
                            background: isDelivered ? '#10b981' : 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{ fontWeight: '800', fontSize: '0.92rem' }}>{order.id}</span>
                        </div>
                        <span className={`badge ${isDelivered ? 'badge-success' : 'badge-warning'}`}>
                          {isDelivered ? 'Entregado ✓' : 'En Ruta 🛵'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.92rem' }}>{order.client.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>📍 {order.client.address}</div>
                          <div style={{ fontSize: '0.75rem', color: '#60a5fa' }}>📞 {order.client.phone}</div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '800', color: '#10b981', fontSize: '0.95rem' }}>{formatCOP(order.total)}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{order.paymentMethod}</div>
                        </div>
                      </div>

                      {!isDelivered && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                          <button
                            onClick={() => handleDeliverOrder(order.id)}
                            className="btn btn-success btn-sm"
                            style={{ gap: '6px' }}
                          >
                            <Check size={14} /> Marcar como Entregado
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Route Manifest Printable Modal */}
      {activeManifestModal && (
        <div className="modal-overlay" onClick={() => setActiveManifestModal(false)}>
          <div 
            className="modal-content modal-lg" 
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', color: '#0f172a' }}
          >
            <div className="no-print" style={{ background: '#0f172a', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
              <span style={{ fontWeight: '700' }}>Planilla / Manifiesto de Despacho & Entrega</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => window.print()} className="btn btn-primary btn-sm" style={{ gap: '6px' }}>
                  <Printer size={15} /> Imprimir Planilla
                </button>
                <button onClick={() => setActiveManifestModal(false)} className="btn-icon">✕</button>
              </div>
            </div>

            <div style={{ padding: '30px 36px', background: '#fff', color: '#1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #10b981', paddingBottom: '14px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ color: '#047857', margin: 0 }}>PULPASPRO S.A.S. - PLANILLA DE RUTA</h2>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Control y Liquidación de Envíos</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><strong>Mensajero:</strong> {activeSelectedCourier.name}</div>
                  <div><strong>Vehículo:</strong> {activeSelectedCourier.vehicle} ({activeSelectedCourier.plate})</div>
                  <div><strong>Fecha:</strong> {new Date().toLocaleDateString('es-CO')}</div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}># Pedido</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Cliente</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Dirección / Zona</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Teléfono</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Valor a Cobrar</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Firma / Recibido</th>
                  </tr>
                </thead>
                <tbody>
                  {courierAssignedOrders.map((order, idx) => (
                    <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px 8px', fontWeight: '700' }}>{order.id}</td>
                      <td style={{ padding: '10px 8px' }}>{order.client.name}</td>
                      <td style={{ padding: '10px 8px' }}>{order.client.address}</td>
                      <td style={{ padding: '10px 8px' }}>{order.client.phone}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', color: '#047857' }}>
                        {formatCOP(order.total)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px dashed #cbd5e1' }}>
                        ____________________
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #1e293b', paddingTop: '12px' }}>
                <div>
                  <strong>Total Envíos en Planilla:</strong> {courierAssignedOrders.length} pedidos
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#047857' }}>
                  Total a Liquidar en Caja: {formatCOP(courierAssignedOrders.reduce((s, o) => s + o.total, 0))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
