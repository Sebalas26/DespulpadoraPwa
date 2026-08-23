import React, { useState } from 'react';
import { 
  FlaskConical, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Plus, 
  Layers, 
  RotateCcw, 
  Scale, 
  Droplet, 
  History, 
  Info,
  Sliders,
  DollarSign
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PreparationCalculator({ fruits, onAddBatch, batches }) {
  const [selectedFruitId, setSelectedFruitId] = useState(fruits[0]?.id || 'maracuya');
  const [freshKg, setFreshKg] = useState(100);
  const [waterPercent, setWaterPercent] = useState(8); // % de agua potable permitida
  const [operator, setOperator] = useState('Hernando Ruiz (Jefe de Planta)');
  const [brixValue, setBrixValue] = useState('15.0');
  
  // Presentation distribution split (% for each packaging size)
  const [distribution, setDistribution] = useState({
    g140: 50, // 50% de la pulpa neta se empaca en 140g
    g250: 30, // 30% en 250g
    g500: 10, // 10% en 500g
    g1000: 10 // 10% en 1Kg
  });

  const selectedFruit = fruits.find(f => f.id === selectedFruitId) || fruits[0];

  // Mathematical Calculations
  const yieldRate = selectedFruit ? selectedFruit.yieldRate : 0.6;
  const fruitPulpWeight = freshKg * yieldRate;
  const waterKg = freshKg * (waterPercent / 100);
  const totalNetPulpKg = fruitPulpWeight + waterKg;
  const wasteKg = Math.max(0, freshKg - fruitPulpWeight);

  // Portions calculation based on distribution %
  const portions140 = Math.floor((totalNetPulpKg * (distribution.g140 / 100)) / 0.14);
  const portions250 = Math.floor((totalNetPulpKg * (distribution.g250 / 100)) / 0.25);
  const portions500 = Math.floor((totalNetPulpKg * (distribution.g500 / 100)) / 0.50);
  const portions1000 = Math.floor((totalNetPulpKg * (distribution.g1000 / 100)) / 1.0);

  // Total Estimated Retail Value
  const estimatedValue = 
    (portions140 * selectedFruit.prices.g140) +
    (portions250 * selectedFruit.prices.g250) +
    (portions500 * selectedFruit.prices.g500) +
    (portions1000 * selectedFruit.prices.g1000);

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  };

  const handleDistributionChange = (key, value) => {
    const num = Math.max(0, Math.min(100, Number(value) || 0));
    setDistribution(prev => ({
      ...prev,
      [key]: num
    }));
  };

  const handleSaveBatch = (e) => {
    e.preventDefault();
    const batchId = `LOTE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(batches.length + 1).padStart(2, '0')}`;
    
    const newBatch = {
      id: batchId,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      fruitId: selectedFruit.id,
      fruitName: selectedFruit.name,
      freshKg: Number(freshKg),
      waterKg: Number(waterKg.toFixed(1)),
      netPulpKg: Number(totalNetPulpKg.toFixed(1)),
      yieldObtained: `${((totalNetPulpKg / freshKg) * 100).toFixed(0)}%`,
      outputPortions: {
        g140: portions140,
        g250: portions250,
        g500: portions500,
        g1000: portions1000
      },
      operator,
      qualityStatus: `Aprobado - Brix ${brixValue}°`
    };

    onAddBatch(newBatch);

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-purple">Paso 1 del Flujo</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fórmula y Rendimiento de Planta</span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800' }}>
            Calculadora de Preparación & Despulpado
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '700px' }}>
            Calcula en tiempo real la cantidad de pulpa pura obtenida a partir de fruta fresca y agua según gramajes de 140g, 250g, 500g y 1 Kg.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Left Card: Input Parameters Form */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <FlaskConical size={20} color="#10b981" />
              Parámetros de Formulación
            </h2>
            <span className="badge badge-success">Materia Prima</span>
          </div>

          <form onSubmit={handleSaveBatch} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Fruit Selector */}
            <div>
              <label className="input-label">Seleccionar Fruta a Despulpar</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: '8px', marginTop: '6px' }}>
                {fruits.map(fruit => {
                  const isSelected = fruit.id === selectedFruitId;
                  return (
                    <button
                      key={fruit.id}
                      type="button"
                      onClick={() => {
                        setSelectedFruitId(fruit.id);
                        setWaterPercent(Math.round(fruit.waterAdditionDefault * 100));
                      }}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? fruit.bgColor : 'rgba(255, 255, 255, 0.03)',
                        border: `1.5px solid ${isSelected ? fruit.borderColor : 'var(--border-subtle)'}`,
                        color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{ fontSize: '1.4rem' }}>{fruit.emoji}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? '700' : '500', textAlign: 'center' }}>
                        {fruit.name}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                        Rend: {(fruit.yieldRate * 100).toFixed(0)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Weight and Water Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="input-label">
                  <Scale size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Fruta Fresca (Kg)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  step="1"
                  className="input"
                  value={freshKg}
                  onChange={(e) => setFreshKg(Number(e.target.value))}
                  required
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                  En Cava: {selectedFruit.freshStockKg} Kg disp.
                </span>
              </div>

              <div>
                <label className="input-label">
                  <Droplet size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Agua Potable (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="25"
                  step="1"
                  className="input"
                  value={waterPercent}
                  onChange={(e) => setWaterPercent(Number(e.target.value))}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                  Añadido: {waterKg.toFixed(1)} Litros / Kg
                </span>
              </div>
            </div>

            {/* Distribution sliders / inputs for Packaging */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '700' }}>
                  <Sliders size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Distribución del Lote por Presentación
                </span>
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>
                  Total: {distribution.g140 + distribution.g250 + distribution.g500 + distribution.g1000}%
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>140g (Jugo Individual %)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input"
                    value={distribution.g140}
                    onChange={(e) => handleDistributionChange('g140', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>250g (Doble Porción %)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input"
                    value={distribution.g250}
                    onChange={(e) => handleDistributionChange('g250', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>500g (Medio Kilo %)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input"
                    value={distribution.g500}
                    onChange={(e) => handleDistributionChange('g500', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>1000g (1 Kilo Horeca %)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input"
                    value={distribution.g1000}
                    onChange={(e) => handleDistributionChange('g1000', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Quality & Operator info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="input-label">Operario de Despulpado</label>
                <input
                  type="text"
                  className="input"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">°Brix (Grados de Dulzor)</label>
                <input
                  type="text"
                  className="input"
                  value={brixValue}
                  onChange={(e) => setBrixValue(e.target.value)}
                />
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '0.95rem', gap: '8px' }}
            >
              <CheckCircle2 size={18} />
              Guardar Lote y Transferir a Stock de Producto Terminado
            </button>
          </form>
        </div>

        {/* Right Card: Real-time Calculated Yield & Portions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            <div className="card-header">
              <h2 className="card-title">
                <Sparkles size={20} color="#10b981" />
                Rendimiento Calculado
              </h2>
              <span className="badge badge-success">{selectedFruit.emoji} {selectedFruit.name}</span>
            </div>

            {/* Big Yield Stat */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pulpa Neta Total</div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#10b981', fontFamily: 'var(--font-heading)' }}>
                  {totalNetPulpKg.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>Kg</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Rendimiento real: {((totalNetPulpKg / freshKg) * 100).toFixed(1)}%
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Merma / Cáscara / Semilla</div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f59e0b', fontFamily: 'var(--font-heading)' }}>
                  {wasteKg.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>Kg</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Compostable / Subproducto
                </div>
              </div>
            </div>

            {/* Packaging Results Breakdown */}
            <h3 style={{ fontSize: '0.92rem', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={16} color="#8b5cf6" />
              Pulpas Resultantes a Empacar:
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="gram-tag">140 gramos</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{formatCOP(selectedFruit.prices.g140)}/un</span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
                  {portions140} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>unidades</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#10b981' }}>Valor: {formatCOP(portions140 * selectedFruit.prices.g140)}</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="gram-tag" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>250 gramos</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{formatCOP(selectedFruit.prices.g250)}/un</span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
                  {portions250} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>unidades</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#10b981' }}>Valor: {formatCOP(portions250 * selectedFruit.prices.g250)}</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="gram-tag" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>500 gramos</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{formatCOP(selectedFruit.prices.g500)}/un</span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
                  {portions500} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>unidades</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#10b981' }}>Valor: {formatCOP(portions500 * selectedFruit.prices.g500)}</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="gram-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>1000g (1 Kg)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{formatCOP(selectedFruit.prices.g1000)}/un</span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
                  {portions1000} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>unidades</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#10b981' }}>Valor: {formatCOP(portions1000 * selectedFruit.prices.g1000)}</div>
              </div>
            </div>

            {/* Total Batch Estimated Value */}
            <div style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Valor Comercial Total Estimado:</span>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#10b981' }}>
                  {formatCOP(estimatedValue)}
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textAlign: 'right' }}>
                Total Unidades: <strong>{portions140 + portions250 + portions500 + portions1000}</strong> pulpas
              </div>
            </div>
          </div>

          {/* Quick Technical Tip Card */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Info size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              <strong>Control de Calidad:</strong> Las pulpas son selladas herméticamente y congeladas a -18°C inmediatamente después del despulpado para preservar aromas, color y nutrientes.
            </div>
          </div>

        </div>
      </div>

      {/* Recent Batches History Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <History size={20} color="#8b5cf6" />
              Historial de Lotes de Producción Recientes
            </h2>
            <p className="card-subtitle">Registro de formulación, rendimiento y operarios</p>
          </div>
          <span className="badge badge-purple">{batches.length} Lotes Registrados</span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Lote / Fecha</th>
                <th>Fruta</th>
                <th>Fruta Entrada</th>
                <th>Pulpa Obtenida</th>
                <th>Rendimiento</th>
                <th>Desglose Porciones</th>
                <th>Operario / Calidad</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => (
                <tr key={batch.id}>
                  <td>
                    <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{batch.id}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{batch.date}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{batch.fruitName}</div>
                  </td>
                  <td>
                    <strong>{batch.freshKg} Kg</strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>+{batch.waterKg}L agua</span>
                  </td>
                  <td>
                    <strong style={{ color: '#10b981' }}>{batch.netPulpKg} Kg</strong>
                  </td>
                  <td>
                    <span className="badge badge-success">{batch.yieldObtained}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      <span className="gram-tag">140g: {batch.outputPortions.g140}</span>
                      <span className="gram-tag">250g: {batch.outputPortions.g250}</span>
                      <span className="gram-tag">500g: {batch.outputPortions.g500}</span>
                      <span className="gram-tag">1Kg: {batch.outputPortions.g1000}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>{batch.operator}</div>
                    <span style={{ fontSize: '0.72rem', color: '#10b981' }}>{batch.qualityStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
