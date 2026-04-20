import { useState } from 'react';
import { Plus, X, RotateCcw } from 'lucide-react';

export const DEFAULT_MA_CONFIG = [
  { period: 20, color: '#3b82f6', lineWidth: 2, type: 'SMA' },
  { period: 50, color: '#f97316', lineWidth: 2, type: 'SMA' },
];

const LS_KEY = 'fxreplay_ma_config';

export function loadMAConfig() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_MA_CONFIG;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return DEFAULT_MA_CONFIG;
}

export function saveMAConfig(config) {
  localStorage.setItem(LS_KEY, JSON.stringify(config));
}

function calculateMA(data, period, type = 'SMA') {
  if (!data || data.length < period) return [];
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    if (type === 'SMA') {
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      sum /= period;
    } else if (type === 'EMA') {
      if (i === period - 1) {
        for (let j = 0; j < period; j++) {
          sum += data[i - j].close;
        }
        sum /= period;
      } else {
        const prev = result[result.length - 1]?.value;
        const k = 2 / (period + 1);
        sum = (data[i].close - prev) * k + prev;
      }
    }
    result.push({ time: data[i].time, value: sum });
  }
  return result;
}

function calculateSMA(data, period) {
  return calculateMA(data, period, 'SMA');
}

function calculateEMA(data, period) {
  return calculateMA(data, period, 'EMA');
}

export { calculateSMA, calculateEMA };

export default function MovingAverageSettings({ config, onChange, onClose }) {
  const [draft, setDraft] = useState(() => config.map(c => ({ ...c })));

  const updateMA = (idx, field, val) => {
    setDraft(prev => prev.map((ma, i) => i === idx ? { ...ma, [field]: val } : ma));
  };

  const removeMA = (idx) => {
    if (draft.length <= 1) return;
    setDraft(prev => prev.filter((_, i) => i !== idx));
  };

  const addMA = () => {
    const colors = ['#3b82f6', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#f472b6', '#a855f7'];
    const periods = [100, 200, 9, 21];
    const usedPeriods = draft.map(p => p.period);
    const newPeriod = periods.find(p => !usedPeriods.includes(p)) || 100;
    setDraft(prev => [...prev, {
      period: newPeriod,
      color: colors[prev.length % colors.length],
      lineWidth: 2,
      type: 'SMA'
    }]);
  };

  const handleSave = () => {
    const cleaned = draft
      .map(ma => ({
        period: parseInt(ma.period) || 20,
        color: ma.color || '#3b82f6',
        lineWidth: parseInt(ma.lineWidth) || 2,
        type: ma.type || 'SMA',
      }))
      .filter(ma => ma.period > 0)
      .sort((a, b) => a.period - b.period);
    if (cleaned.length < 1) return;
    saveMAConfig(cleaned);
    onChange(cleaned);
    onClose();
  };

  const handleReset = () => {
    setDraft(DEFAULT_MA_CONFIG.map(c => ({ ...c })));
  };

  return (
    <div className="fibo-settings-popover" style={{ width: '260px' }}>
      <div className="fibo-settings-header">
        <span className="fibo-settings-title">Medias Móviles</span>
        <div className="flex items-center gap-1">
          <button onClick={handleReset} className="fibo-settings-icon-btn" title="Restaurar por defecto">
            <RotateCcw size={13} />
          </button>
          <button onClick={onClose} className="fibo-settings-icon-btn" title="Cerrar">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="fibo-settings-list">
        {draft.map((ma, i) => (
          <div key={i} className="fibo-settings-row" style={{ gridTemplateColumns: '24px 50px 60px 24px' }}>
            <input
              type="color"
              value={ma.color}
              onChange={(e) => updateMA(i, 'color', e.target.value)}
              className="fibo-color-input"
              title="Color"
              style={{ width: '20px', height: '20px' }}
            />
            <select
              value={ma.type}
              onChange={(e) => updateMA(i, 'type', e.target.value)}
              className="bg-slate-900 border border-slate-700/50 rounded px-1 py-0.5 text-xs font-mono text-slate-300"
              style={{ width: '48px' }}
            >
              <option value="SMA">SMA</option>
              <option value="EMA">EMA</option>
            </select>
            <input
              type="number"
              value={ma.period}
              onChange={(e) => updateMA(i, 'period', e.target.value)}
              min="1"
              max="500"
              className="fibo-value-input"
              style={{ width: '58px' }}
            />
            <button
              onClick={() => removeMA(i)}
              className="fibo-remove-btn"
              disabled={draft.length <= 1}
              title="Eliminar"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <button onClick={addMA} className="fibo-add-btn">
        <Plus size={13} />
        <span>Añadir media</span>
      </button>

      <div className="fibo-settings-actions">
        <button onClick={onClose} className="fibo-cancel-btn">Cancelar</button>
        <button onClick={handleSave} className="fibo-save-btn">Guardar</button>
      </div>
    </div>
  );
}