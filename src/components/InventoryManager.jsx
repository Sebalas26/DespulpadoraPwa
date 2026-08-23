import React, { useState } from 'react';
import { 
  Boxes, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Minus, 
  Edit3, 
  Grid, 
  List, 
  TrendingUp, 
  ArrowUpRight,
  Sparkles,
  Layers,
  FlaskConical
} from 'lucide-react';

export default function InventoryManager({ fruits, onUpdateStock, setActiveTab, onSelectFruitForPrep }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [editingFruit, setEditingFruit] = useState(null);

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  };

  // Filtered fruit list
  const filteredFruits = fruits.filter(fruit => {
    const matchesSearch = fruit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          fruit.scientificName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || fruit.category.toLowerCase().includes(selectedCategory.toLowerCase());
    
    const isLowStock = Object.keys(fruit.stock).some(k => fruit.stock[k] <= fruit.minStock[k]);
    if (filterLowStockOnly && !isLowStock) return false;

    return matchesSearch && matchesCategory;
  });

  // Calculate total inventory valuation
  const totalValuation = fruits.reduce((sum, fruit) => {
    const value140 = fruit.stock.g140 * fruit.prices.g140;
    const value250 = fruit.stock.g250 * fruit.prices.g250;
    const value500 = fruit.stock.g500 * fruit.prices.g500;
    const value1000 = fruit.stock.g1000 * fruit.prices.g1000;
    return sum + value140 + value250 + value500 + value1000;
  }, 0);

  const totalPortionsCount = fruits.reduce((sum, f) => 
    sum + f.stock.g140 + f.stock.g250 + f.stock.g500 + f.stock.g1000, 0
  );

  const totalFreshFruitKg = fruits.reduce((sum, f) => sum + f.freshStockKg, 0);

  const handleAdjustQuick = (fruitId, sizeKey, delta) => {
    const fruit = fruits.find(f => f.id === fruitId);
    if (!fruit) return;
    const current = fruit.stock[sizeKey] || 0;
    const nextVal = Math.max(0, current + delta);
    onUpdateStock(fruitId, {
      ...fruit.stock,
      [sizeKey]: nextVal
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-warning">Paso 2 y 6 del Flujo</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cava de Congelación & Stock Terminado</span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800' }}>
            Inventario de Stock Multigramaje
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '700px' }}>
            Control de existencias por porciones (140g, 250g, 500g, 1 Kg) y fruta fresca en cava con alertas automáticas.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('preparacion')}
          className="btn btn-primary"
          style={{ gap: '8px' }}
        >
          <FlaskConical size={16} />
          Despulpar Nueva Fruta
        </button>
      </div>

      {/* KPI Overview of Inventory */}
      <div className="stats-grid" style={{ marginBottom: 0 }}>
        <div className="stat-card">
          <div>
            <div className="stat-label">Valorización Total Stock</div>
            <div className="stat-value" style={{ color: '#10b981' }}>{formatCOP(totalValuation)}</div>
            <div className="stat-meta positive">
              <TrendingUp size={14} />
              <span>Precio venta sugerido</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Boxes size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Pulpas Empacadas</div>
            <div className="stat-value">{totalPortionsCount} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>unidades</span></div>
            <div className="stat-meta positive">
              <Layers size={14} />
              <span>Listas para despacho</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Layers size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Materia Prima en Cava</div>
            <div className="stat-value">{totalFreshFruitKg} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Kg</span></div>
            <div className="stat-meta positive">
              <Sparkles size={14} />
              <span>Fruta fresca para procesar</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Sparkles size={24} />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 300px' }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar fruta por nombre o variedad..."
              className="input"
              style={{ paddingLeft: '38px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Todas
            </button>
            <button
              onClick={() => setSelectedCategory('ácida')}
              className={`btn btn-sm ${selectedCategory === 'ácida' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Ácidas
            </button>
            <button
              onClick={() => setSelectedCategory('dulce')}
              className={`btn btn-sm ${selectedCategory === 'dulce' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Dulces
            </button>
            <button
              onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
              className={`btn btn-sm ${filterLowStockOnly ? 'btn-warning' : 'btn-secondary'}`}
              style={{ gap: '6px' }}
            >
              <AlertTriangle size={14} />
              Solo Stock Bajo
            </button>
          </div>

          {/* View Toggle */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className="btn-icon"
              style={{ width: '32px', height: '32px', background: viewMode === 'grid' ? 'rgba(255,255,255,0.15)' : 'transparent', border: 'none' }}
              title="Vista en Tarjetas"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className="btn-icon"
              style={{ width: '32px', height: '32px', background: viewMode === 'table' ? 'rgba(255,255,255,0.15)' : 'transparent', border: 'none' }}
              title="Vista en Tabla"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Mode */}
      {viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '20px' }}>
          {filteredFruits.map((fruit) => {
            const hasAlert = Object.keys(fruit.stock).some(k => fruit.stock[k] <= fruit.minStock[k]);
            const totalUnits = fruit.stock.g140 + fruit.stock.g250 + fruit.stock.g500 + fruit.stock.g1000;
            const fruitValuation = 
              (fruit.stock.g140 * fruit.prices.g140) +
              (fruit.stock.g250 * fruit.prices.g250) +
              (fruit.stock.g500 * fruit.prices.g500) +
              (fruit.stock.g1000 * fruit.prices.g1000);

            return (
              <div
                key={fruit.id}
                className="card"
                style={{
                  border: hasAlert ? '1.5px solid rgba(239, 68, 68, 0.4)' : `1px solid ${fruit.borderColor}40`,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Fruit Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-md)',
                      background: fruit.bgColor,
                      border: `1px solid ${fruit.borderColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.8rem'
                    }}>
                      {fruit.emoji}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '800', lineHeight: '1.2' }}>{fruit.name}</h3>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{fruit.scientificName}</span>
                    </div>
                  </div>

                  {hasAlert ? (
                    <span className="badge badge-danger" title="Stock bajo en una o más presentaciones">
                      <AlertTriangle size={12} /> Reponer
                    </span>
                  ) : (
                    <span className="badge badge-success">
                      <CheckCircle2 size={12} /> Stock Óptimo
                    </span>
                  )}
                </div>

                {/* Fresh Fruit in Storage */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Materia Prima (Cava):</span>
                  <strong style={{ fontSize: '0.95rem', color: '#f59e0b' }}>{fruit.freshStockKg} Kg Fruta</strong>
                </div>

                {/* Presentation Stock Boxes */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  
                  {/* 140g */}
                  <div style={{
                    background: fruit.stock.g140 <= fruit.minStock.g140 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="gram-tag">140g</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Mín: {fruit.minStock.g140}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '800' }}>{fruit.stock.g140}</span>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                          onClick={() => handleAdjustQuick(fruit.id, 'g140', -5)}
                          className="btn-icon"
                          style={{ width: '22px', height: '22px' }}
                          title="Restar 5"
                        >
                          <Minus size={10} />
                        </button>
                        <button
                          onClick={() => handleAdjustQuick(fruit.id, 'g140', 5)}
                          className="btn-icon"
                          style={{ width: '22px', height: '22px', color: '#10b981' }}
                          title="Sumar 5"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatCOP(fruit.prices.g140)} /un</div>
                  </div>

                  {/* 250g */}
                  <div style={{
                    background: fruit.stock.g250 <= fruit.minStock.g250 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="gram-tag" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>250g</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Mín: {fruit.minStock.g250}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '800' }}>{fruit.stock.g250}</span>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                          onClick={() => handleAdjustQuick(fruit.id, 'g250', -5)}
                          className="btn-icon"
                          style={{ width: '22px', height: '22px' }}
                        >
                          <Minus size={10} />
                        </button>
                        <button
                          onClick={() => handleAdjustQuick(fruit.id, 'g250', 5)}
                          className="btn-icon"
                          style={{ width: '22px', height: '22px', color: '#10b981' }}
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatCOP(fruit.prices.g250)} /un</div>
                  </div>

                  {/* 500g */}
                  <div style={{
                    background: fruit.stock.g500 <= fruit.minStock.g500 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="gram-tag" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>500g</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Mín: {fruit.minStock.g500}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '800' }}>{fruit.stock.g500}</span>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                          onClick={() => handleAdjustQuick(fruit.id, 'g500', -5)}
                          className="btn-icon"
                          style={{ width: '22px', height: '22px' }}
                        >
                          <Minus size={10} />
                        </button>
                        <button
                          onClick={() => handleAdjustQuick(fruit.id, 'g500', 5)}
                          className="btn-icon"
                          style={{ width: '22px', height: '22px', color: '#10b981' }}
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatCOP(fruit.prices.g500)} /un</div>
                  </div>

                  {/* 1000g */}
                  <div style={{
                    background: fruit.stock.g1000 <= fruit.minStock.g1000 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="gram-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>1000g (1Kg)</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Mín: {fruit.minStock.g1000}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '800' }}>{fruit.stock.g1000}</span>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                          onClick={() => handleAdjustQuick(fruit.id, 'g1000', -5)}
                          className="btn-icon"
                          style={{ width: '22px', height: '22px' }}
                        >
                          <Minus size={10} />
                        </button>
                        <button
                          onClick={() => handleAdjustQuick(fruit.id, 'g1000', 5)}
                          className="btn-icon"
                          style={{ width: '22px', height: '22px', color: '#10b981' }}
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatCOP(fruit.prices.g1000)} /un</div>
                  </div>

                </div>

                {/* Footer of Card */}
                <div style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Valoración:</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#10b981' }}>{formatCOP(fruitValuation)}</div>
                  </div>
                  <button
                    onClick={() => {
                      if (onSelectFruitForPrep) onSelectFruitForPrep(fruit.id);
                      setActiveTab('preparacion');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: '4px' }}
                  >
                    <FlaskConical size={12} /> Despulpar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table Mode */
        <div className="card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fruta</th>
                  <th>Cava (Kg)</th>
                  <th>140g (Uds)</th>
                  <th>250g (Uds)</th>
                  <th>500g (Uds)</th>
                  <th>1000g (Uds)</th>
                  <th>Valor Total</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredFruits.map(fruit => {
                  const hasAlert = Object.keys(fruit.stock).some(k => fruit.stock[k] <= fruit.minStock[k]);
                  const val = 
                    (fruit.stock.g140 * fruit.prices.g140) +
                    (fruit.stock.g250 * fruit.prices.g250) +
                    (fruit.stock.g500 * fruit.prices.g500) +
                    (fruit.stock.g1000 * fruit.prices.g1000);
                  
                  return (
                    <tr key={fruit.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.4rem' }}>{fruit.emoji}</span>
                          <div>
                            <strong>{fruit.name}</strong>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>{fruit.category}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: '#f59e0b' }}>{fruit.freshStockKg} Kg</strong>
                      </td>
                      <td>
                        <strong style={{ color: fruit.stock.g140 <= fruit.minStock.g140 ? '#ef4444' : 'inherit' }}>
                          {fruit.stock.g140}
                        </strong>
                      </td>
                      <td>
                        <strong style={{ color: fruit.stock.g250 <= fruit.minStock.g250 ? '#ef4444' : 'inherit' }}>
                          {fruit.stock.g250}
                        </strong>
                      </td>
                      <td>
                        <strong style={{ color: fruit.stock.g500 <= fruit.minStock.g500 ? '#ef4444' : 'inherit' }}>
                          {fruit.stock.g500}
                        </strong>
                      </td>
                      <td>
                        <strong style={{ color: fruit.stock.g1000 <= fruit.minStock.g1000 ? '#ef4444' : 'inherit' }}>
                          {fruit.stock.g1000}
                        </strong>
                      </td>
                      <td>
                        <strong style={{ color: '#10b981' }}>{formatCOP(val)}</strong>
                      </td>
                      <td>
                        {hasAlert ? (
                          <span className="badge badge-danger">Stock Bajo</span>
                        ) : (
                          <span className="badge badge-success">Óptimo</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            if (onSelectFruitForPrep) onSelectFruitForPrep(fruit.id);
                            setActiveTab('preparacion');
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          Procesar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
