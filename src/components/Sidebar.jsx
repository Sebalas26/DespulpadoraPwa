import React from 'react';
import {
  LayoutDashboard,
  FlaskConical,
  Package,
  Clock,
  Users,
  BarChart3,
  Settings,
  Sparkles,
  Smartphone,
  CheckCircle2
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, counts, isInstallable, installApp }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard General', icon: LayoutDashboard, badge: null },
    { id: 'preparacion', label: '1. Calculadora & Rendimiento', icon: FlaskConical, badge: 'Planta' },
    {
      id: 'pedidos',
      label: '2. Módulo de Pedidos',
      icon: Package,
      badge: counts.pendingOrders > 0 ? `${counts.pendingOrders} activos` : null,
      badgeClass: 'danger'
    },
    {
      id: 'turnos',
      label: '3. Registro Entrada / Salida',
      icon: Clock,
      badge: counts.inShiftCount > 0 ? `${counts.inShiftCount} en planta` : null,
      badgeClass: 'success'
    },
    {
      id: 'gestion_humana',
      label: '4. Gestión Humana & Nómina',
      icon: Users,
      badge: `${counts.employeeCount} colab.`,
      badgeClass: 'purple'
    },
    {
      id: 'contabilidad',
      label: '5. Contabilidad & Finanzas',
      icon: BarChart3,
      badge: 'P&G',
      badgeClass: 'info'
    },
    {
      id: 'configuracion',
      label: '6. Configuración & Catálogo',
      icon: Settings,
      badge: counts.lowStock > 0 ? `${counts.lowStock} alerta` : null,
      badgeClass: 'warning'
    },
  ];

  return (
    <>
      <aside className="sidebar">
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="brand-logo-wrap">
            <span style={{ fontSize: '1.5rem' }}>🍹</span>
          </div>
          <div>
            <span className="brand-title">PulpasPro</span>
            <span className="brand-subtitle">Despulpadora & ERP</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="sidebar-nav">
          <span className="nav-section-title">Módulos del Sistema</span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={19} strokeWidth={isActive ? 2.4 : 1.8} />
                <span style={{ fontSize: '0.88rem' }}>{item.label}</span>
                {item.badge && (
                  <span className={`nav-badge ${item.badgeClass || ''}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Info Box */}
          <div style={{
            marginTop: 'auto',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(245, 158, 11, 0.08))',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Sparkles size={16} color="#10b981" />
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#10b981' }}>PWA Activa & Offline</span>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Nómina legal, certificados, control de turnos y facturación DIAN listos.
            </p>
            {isInstallable && (
              <button
                onClick={installApp}
                className="btn btn-primary btn-sm"
                style={{ width: '100%', marginTop: '10px', gap: '6px' }}
              >
                <Smartphone size={14} /> Instalar en Pantalla
              </button>
            )}
          </div>
        </nav>

        {/* Footer info */}
        <div className="sidebar-footer">
          <div className="user-quick-profile">
            <div className="user-avatar">🏭</div>
            <div>
              <div className="user-info-name">Sede Principal Bogotá</div>
              <div className="user-info-role">● Conectado en Línea</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <div className="mobile-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label.split('.')[1]?.trim().split(' ')[0] || item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
