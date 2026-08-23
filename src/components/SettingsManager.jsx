import React, { useState } from 'react';
import { 
  Settings, 
  Boxes, 
  Users, 
  Building2, 
  Plus, 
  Edit3, 
  Save, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  Scale,
  ShieldCheck
} from 'lucide-react';
import InventoryManager from './InventoryManager';
import confetti from 'canvas-confetti';

export default function SettingsManager({
  fruits,
  employees,
  companySettings,
  onUpdateStock,
  onAddFruit,
  onUpdateFruit,
  onAddEmployee,
  onUpdateEmployee,
  onUpdateCompanySettings,
  setActiveTab
}) {
  const [activeSettingsTab, setActiveSettingsTab] = useState('fruits'); // 'fruits' | 'employees' | 'company'
  
  // New Fruit Modal
  const [showAddFruitModal, setShowAddFruitModal] = useState(false);
  const [newFruit, setNewFruit] = useState({
    name: '',
    scientificName: '',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#D97706',
    emoji: '🥭',
    yieldRate: 0.65,
    waterAdditionDefault: 0.08,
    freshStockKg: 100,
    stock: { g140: 50, g250: 30, g500: 20, g1000: 10 },
    minStock: { g140: 40, g250: 25, g500: 15, g1000: 10 },
    prices: { g140: 2000, g250: 3500, g500: 6200, g1000: 11000 },
    category: 'Dulce'
  });

  // New Employee Modal
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    document: '',
    role: 'Operario de Despulpado',
    department: 'Producción',
    baseSalary: 1600000,
    transportAllowance: 162000,
    hireDate: new Date().toISOString().slice(0, 10),
    contractType: 'Término Indefinido',
    eps: 'Sura EPS',
    arl: 'Positiva ARL (Riesgo 3)',
    pensionFund: 'Porvenir',
    phone: '310 000 0000',
    email: '',
    status: 'activo',
    avatar: '👨🏽‍🏭'
  });

  // Company Settings local state
  const [companyForm, setCompanyForm] = useState(companySettings);

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  };

  const handleCreateFruit = (e) => {
    e.preventDefault();
    if (!newFruit.name) return;
    const fruitId = newFruit.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
    onAddFruit({
      ...newFruit,
      id: fruitId
    });
    setShowAddFruitModal(false);
    try {
      confetti({ particleCount: 50, spread: 45, origin: { y: 0.7 } });
    } catch (e) {}
  };

  const handleCreateEmployee = (e) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.document) return;
    const empId = `EMP-${String(employees.length + 1).padStart(3, '0')}`;
    onAddEmployee({
      ...newEmployee,
      id: empId
    });
    setShowAddEmployeeModal(false);
    try {
      confetti({ particleCount: 50, spread: 45, origin: { y: 0.7 } });
    } catch (e) {}
  };

  const handleSaveCompanySettings = (e) => {
    e.preventDefault();
    onUpdateCompanySettings(companyForm);
    try {
      confetti({ particleCount: 40, spread: 35, origin: { y: 0.7 } });
    } catch (e) {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-purple">Panel de Administración</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Configuración Global del Sistema</span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800' }}>
            Configuración & Catálogos
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '700px' }}>
            Personaliza el catálogo de frutas y gramajes, administra la lista de colaboradores y configura los parámetros de facturación legal.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {activeSettingsTab === 'fruits' && (
            <button
              onClick={() => setShowAddFruitModal(true)}
              className="btn btn-primary"
              style={{ gap: '6px' }}
            >
              <Plus size={16} /> Agregar Nueva Fruta
            </button>
          )}

          {activeSettingsTab === 'employees' && (
            <button
              onClick={() => setShowAddEmployeeModal(true)}
              className="btn btn-primary"
              style={{ gap: '6px' }}
            >
              <Plus size={16} /> Registrar Nuevo Empleado
            </button>
          )}
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveSettingsTab('fruits')}
          className={`btn ${activeSettingsTab === 'fruits' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ gap: '8px' }}
        >
          <Boxes size={16} />
          1. Frutas, Precios & Stock (Módulo 2)
        </button>

        <button
          onClick={() => setActiveSettingsTab('employees')}
          className={`btn ${activeSettingsTab === 'employees' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ gap: '8px' }}
        >
          <Users size={16} />
          2. Gestión de Empleados ({employees.length})
        </button>

        <button
          onClick={() => setActiveSettingsTab('company')}
          className={`btn ${activeSettingsTab === 'company' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ gap: '8px' }}
        >
          <Building2 size={16} />
          3. Datos Empresa & DIAN
        </button>
      </div>

      {/* Tab 1: Frutas, Precios & Stock (Antiguo Módulo 2 integrado aquí) */}
      {activeSettingsTab === 'fruits' && (
        <InventoryManager
          fruits={fruits}
          onUpdateStock={onUpdateStock}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Tab 2: Empleados Configuración */}
      {activeSettingsTab === 'employees' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Users size={20} color="#10b981" />
                Directorio y Configuración de Empleados
              </h2>
              <p className="card-subtitle">Edición de cargos, salarios, seguridad social y contratos</p>
            </div>
            <button
              onClick={() => setShowAddEmployeeModal(true)}
              className="btn btn-primary btn-sm"
              style={{ gap: '6px' }}
            >
              <Plus size={14} /> Nuevo Colaborador
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Cédula</th>
                  <th>Cargo / Área</th>
                  <th>Sueldo Base</th>
                  <th>Aux. Transporte</th>
                  <th>Seguridad Social</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ fontSize: '1.4rem' }}>{emp.avatar || '👤'}</div>
                        <div>
                          <strong>{emp.name}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>{emp.email}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>
                      {emp.document}
                    </td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{emp.role}</div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>{emp.department}</span>
                    </td>
                    <td>
                      <strong style={{ color: '#10b981' }}>{formatCOP(emp.baseSalary)}</strong>
                    </td>
                    <td>
                      {emp.transportAllowance > 0 ? formatCOP(emp.transportAllowance) : 'No Aplica'}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {emp.eps} • {emp.pensionFund}
                    </td>
                    <td>
                      <span className="badge badge-success">{emp.status || 'Activo'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Datos Empresa & DIAN */}
      {activeSettingsTab === 'company' && (
        <div className="card" style={{ maxWidth: '800px' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Building2 size={20} color="#3b82f6" />
                Información Legal & Parámetros DIAN
              </h2>
              <p className="card-subtitle">Datos impresos en facturas electrónicas y certificados laborales</p>
            </div>
            <span className="badge badge-info">Vigente 2026</span>
          </div>

          <form onSubmit={handleSaveCompanySettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
              <div>
                <label className="input-label">Razón Social Legal:</label>
                <input
                  type="text"
                  className="input"
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="input-label">Nombre Comercial:</label>
                <input
                  type="text"
                  className="input"
                  value={companyForm.commercialName}
                  onChange={(e) => setCompanyForm({ ...companyForm, commercialName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="input-label">NIT / Identificación Tributaria:</label>
                <input
                  type="text"
                  className="input"
                  value={companyForm.nit}
                  onChange={(e) => setCompanyForm({ ...companyForm, nit: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="input-label">Régimen Tributario:</label>
                <input
                  type="text"
                  className="input"
                  value={companyForm.regime}
                  onChange={(e) => setCompanyForm({ ...companyForm, regime: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="input-label">Representante Legal:</label>
                <input
                  type="text"
                  className="input"
                  value={companyForm.legalRepresentative}
                  onChange={(e) => setCompanyForm({ ...companyForm, legalRepresentative: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="input-label">Documento Representante Legal:</label>
                <input
                  type="text"
                  className="input"
                  value={companyForm.repDocument}
                  onChange={(e) => setCompanyForm({ ...companyForm, repDocument: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="input-label">Dirección de Planta:</label>
                <input
                  type="text"
                  className="input"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="input-label">Ciudad / País:</label>
                <input
                  type="text"
                  className="input"
                  value={companyForm.city}
                  onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="input-label">Resolución DIAN:</label>
                <input
                  type="text"
                  className="input"
                  value={companyForm.dianResolution}
                  onChange={(e) => setCompanyForm({ ...companyForm, dianResolution: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="input-label">Prefijo y Rango Facturación:</label>
                <input
                  type="text"
                  className="input"
                  value={`${companyForm.invoicePrefix} (${companyForm.invoiceRange})`}
                  onChange={(e) => setCompanyForm({ ...companyForm, invoicePrefix: e.target.value })}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '10px', gap: '8px' }}
            >
              <Save size={16} /> Guardar Configuración de Empresa
            </button>
          </form>
        </div>
      )}

      {/* Modal: Add New Fruit */}
      {showAddFruitModal && (
        <div className="modal-overlay" onClick={() => setShowAddFruitModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Añadir Nueva Fruta al Catálogo</h2>
              <button onClick={() => setShowAddFruitModal(false)} className="btn-icon">✕</button>
            </div>

            <form onSubmit={handleCreateFruit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '10px' }}>
                  <div>
                    <label className="input-label">Emoji:</label>
                    <input
                      type="text"
                      className="input"
                      style={{ textAlign: 'center', fontSize: '1.3rem' }}
                      value={newFruit.emoji}
                      onChange={(e) => setNewFruit({ ...newFruit, emoji: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="input-label">Nombre de la Fruta:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ej. Curuba Criolla"
                      value={newFruit.name}
                      onChange={(e) => setNewFruit({ ...newFruit, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="input-label">Rendimiento Despulpado (%):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="1.0"
                      className="input"
                      value={newFruit.yieldRate}
                      onChange={(e) => setNewFruit({ ...newFruit, yieldRate: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="input-label">Categoría:</label>
                    <select
                      className="select"
                      value={newFruit.category}
                      onChange={(e) => setNewFruit({ ...newFruit, category: e.target.value })}
                    >
                      <option value="Ácida / Cítrica">Ácida / Cítrica</option>
                      <option value="Dulce">Dulce</option>
                      <option value="Semidulce">Semidulce</option>
                      <option value="Cremosa">Cremosa</option>
                    </select>
                  </div>
                </div>

                {/* Pricing per size */}
                <div>
                  <label className="input-label">Precios Sugeridos por Presentación ($ COP):</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>140g:</span>
                      <input
                        type="number"
                        className="input"
                        value={newFruit.prices.g140}
                        onChange={(e) => setNewFruit({ ...newFruit, prices: { ...newFruit.prices, g140: Number(e.target.value) } })}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>250g:</span>
                      <input
                        type="number"
                        className="input"
                        value={newFruit.prices.g250}
                        onChange={(e) => setNewFruit({ ...newFruit, prices: { ...newFruit.prices, g250: Number(e.target.value) } })}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>500g:</span>
                      <input
                        type="number"
                        className="input"
                        value={newFruit.prices.g500}
                        onChange={(e) => setNewFruit({ ...newFruit, prices: { ...newFruit.prices, g500: Number(e.target.value) } })}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>1000g (1 Kg):</span>
                      <input
                        type="number"
                        className="input"
                        value={newFruit.prices.g1000}
                        onChange={(e) => setNewFruit({ ...newFruit, prices: { ...newFruit.prices, g1000: Number(e.target.value) } })}
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddFruitModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Fruta en Catálogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New Employee */}
      {showAddEmployeeModal && (
        <div className="modal-overlay" onClick={() => setShowAddEmployeeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Registrar Nuevo Colaborador</h2>
              <button onClick={() => setShowAddEmployeeModal(false)} className="btn-icon">✕</button>
            </div>

            <form onSubmit={handleCreateEmployee}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="input-label">Nombre Completo:</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ej. Carlos Eduardo Ramos"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="input-label">Cédula de Ciudadanía:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ej. 1.019.234.567"
                      value={newEmployee.document}
                      onChange={(e) => setNewEmployee({ ...newEmployee, document: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label">Teléfono:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ej. 312 000 1122"
                      value={newEmployee.phone}
                      onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="input-label">Cargo:</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ej. Operario de Cava"
                      value={newEmployee.role}
                      onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label">Área / Departamento:</label>
                    <select
                      className="select"
                      value={newEmployee.department}
                      onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    >
                      <option value="Producción">Producción</option>
                      <option value="Logística & Despachos">Logística & Despachos</option>
                      <option value="Administración">Administración</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="input-label">Salario Básico ($ COP):</label>
                    <input
                      type="number"
                      className="input"
                      value={newEmployee.baseSalary}
                      onChange={(e) => setNewEmployee({ ...newEmployee, baseSalary: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label">EPS:</label>
                    <input
                      type="text"
                      className="input"
                      value={newEmployee.eps}
                      onChange={(e) => setNewEmployee({ ...newEmployee, eps: e.target.value })}
                    />
                  </div>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddEmployeeModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar Empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
