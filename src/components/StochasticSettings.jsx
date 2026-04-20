import { useState } from 'react';
import { Plus, X, RotateCcw } from 'lucide-react';

export const DEFAULT_STOCH_CONFIG = {
  kPeriod: 14,
  dPeriod: 3,
  overbought: 80,
  oversold: 20,
  colorK: '#3b82f6',
  colorD: '#f97316',
  lineWidth: 2,
};

const LS_KEY = 'fxreplay_stoch_config';

export function loadStochConfig() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_STOCH_CONFIG;
    return JSON.parse(raw);
  } catch {}
  return DEFAULT_STOCH_CONFIG;
}

export function saveStochConfig(config) {
  localStorage.setItem(LS_KEY, JSON.stringify(config));
}

function calculateStochastic(data, kPeriod = 14, dPeriod = 3) {
  if (!data || data.length < kPeriod) return [];
  const kValues = [];

  for (let i = kPeriod - 1; i < data.length; i++) {
    let high = -Infinity;
    let low = Infinity;
    for (let j = 0; j < kPeriod; j++) {
      high = Math.max(high, data[i - j].high);
      low = Math.min(low, data[i - j].low);
    }
    const close = data[i].close;
    const stoch = high === low ? 50 : ((close - low) / (high - low)) * 100;
    kValues.push(stoch);
  }

  const result = [];
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    let sum = 0;
    for (let j = 0; j < dPeriod; j++) {
      sum += kValues[i - j];
    }
    const d = sum / dPeriod;
    result.push({
      time: data[i + kPeriod].time,
      k: kValues[i],
      d: d,
    });
  }
  return result;
}

export { calculateStochastic };

export default function StochasticSettings({ config, onChange, onClose }) {
  const [draft, setDraft] = useState(() => ({ ...config }));

  const handleSave = () => {
    const cleaned = {
      kPeriod: parseInt(draft.kPeriod) || 14,
      dPeriod: parseInt(draft.dPeriod) || 3,
      overbought: parseInt(draft.overbought) || 80,
      oversold: parseInt(draft.oversold) || 20,
      colorK: draft.colorK || '#3b82f6',
      colorD: draft.colorD || '#f97316',
      lineWidth: parseInt(draft.lineWidth) || 2,
    };
    saveStochConfig(cleaned);
    onChange(cleaned);
    onClose();
  };

  const handleReset = () => {
    setDraft(DEFAULT_STOCH_CONFIG);
  };

  return (
    <div className="fibo-settings-popover" style={{ width: '220px' }}>
      <div className="fibo-settings-header">
        <span className="fibo-settings-title">Estocástico</span>
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
        <div className="fibo-settings-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">%K:</span>
            <input
              type="number"
              value={draft.kPeriod}
              onChange={(e) => setDraft({ ...draft, kPeriod: e.target.value })}
              min="1"
              max="100"
              className="fibo-value-input"
              style={{ width: '45px' }}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">%D:</span>
            <input
              type="number"
              value={draft.dPeriod}
              onChange={(e) => setDraft({ ...draft, dPeriod: e.target.value })}
              min="1"
              max="50"
              className="fibo-value-input"
              style={{ width: '45px' }}
            />
          </div>
        </div>
        <div className="fibo-settings-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">Sobrecompra:</span>
            <input
              type="number"
              value={draft.overbought}
              onChange={(e) => setDraft({ ...draft, overbought: e.target.value })}
              min="50"
              max="100"
              className="fibo-value-input"
              style={{ width: '45px' }}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">Sobreventa:</span>
            <input
              type="number"
              value={draft.oversold}
              onChange={(e) => setDraft({ ...draft, oversold: e.target.value })}
              min="0"
              max="50"
              className="fibo-value-input"
              style={{ width: '45px' }}
            />
          </div>
        </div>
        <div className="fibo-settings-row" style={{ gridTemplateColumns: '24px 1fr' }}>
          <input
            type="color"
            value={draft.colorK}
            onChange={(e) => setDraft({ ...draft, colorK: e.target.value })}
            className="fibo-color-input"
            title="%K Color"
            style={{ width: '20px', height: '20px' }}
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">%K:</span>
            <input
              type="color"
              value={draft.colorD}
              onChange={(e) => setDraft({ ...draft, colorD: e.target.value })}
              className="fibo-color-input"
              title="%D Color"
              style={{ width: '20px', height: '20px' }}
            />
            <span className="text-[10px] text-slate-400">%D:</span>
          </div>
        </div>
      </div>

      <div className="fibo-settings-actions">
        <button onClick={onClose} className="fibo-cancel-btn">Cancelar</button>
        <button onClick={handleSave} className="fibo-save-btn">Guardar</button>
      </div>
    </div>
  );
}