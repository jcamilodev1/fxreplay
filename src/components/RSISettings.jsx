import { useState } from 'react';
import { Plus, X, RotateCcw } from 'lucide-react';

export const DEFAULT_RSI_CONFIG = {
  period: 14,
  overbought: 70,
  oversold: 30,
  color: '#8b5cf6',
  lineWidth: 2,
};

const LS_KEY = 'fxreplay_rsi_config';

export function loadRSIConfig() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_RSI_CONFIG;
    return JSON.parse(raw);
  } catch {}
  return DEFAULT_RSI_CONFIG;
}

export function saveRSIConfig(config) {
  localStorage.setItem(LS_KEY, JSON.stringify(config));
}

function calculateRSI(data, period = 14) {
  if (!data || data.length < period + 1) return [];
  const result = [];
  let gains = [];
  let losses = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    gains.push(gain);
    losses.push(loss);

    if (i < period) continue;

    let avgGain, avgLoss;
    if (i === period) {
      avgGain = gains.reduce((a, b) => a + b, 0) / period;
      avgLoss = losses.reduce((a, b) => a + b, 0) / period;
    } else {
      const prevGain = result[result.length - 1]?.avgGain || 0;
      const prevLoss = result[result.length - 1]?.avgLoss || 0;
      avgGain = (prevGain * (period - 1) + gain) / period;
      avgLoss = (prevLoss * (period - 1) + loss) / period;
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
    result.push({
      time: data[i].time,
      value: rsi,
      avgGain,
      avgLoss,
    });
  }
  return result;
}

export { calculateRSI };

export default function RSISettings({ config, onChange, onClose }) {
  const [draft, setDraft] = useState(() => ({ ...config }));

  const handleSave = () => {
    const cleaned = {
      period: parseInt(draft.period) || 14,
      overbought: parseInt(draft.overbought) || 70,
      oversold: parseInt(draft.oversold) || 30,
      color: draft.color || '#8b5cf6',
      lineWidth: parseInt(draft.lineWidth) || 2,
    };
    saveRSIConfig(cleaned);
    onChange(cleaned);
    onClose();
  };

  const handleReset = () => {
    setDraft(DEFAULT_RSI_CONFIG);
  };

  return (
    <div className="fibo-settings-popover" style={{ width: '220px' }}>
      <div className="fibo-settings-header">
        <span className="fibo-settings-title">RSI Config</span>
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
        <div className="fibo-settings-row" style={{ gridTemplateColumns: '24px 1fr' }}>
          <input
            type="color"
            value={draft.color}
            onChange={(e) => setDraft({ ...draft, color: e.target.value })}
            className="fibo-color-input"
            title="Color"
            style={{ width: '20px', height: '20px' }}
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">Período:</span>
            <input
              type="number"
              value={draft.period}
              onChange={(e) => setDraft({ ...draft, period: e.target.value })}
              min="1"
              max="100"
              className="fibo-value-input"
              style={{ width: '50px' }}
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
      </div>

      <div className="fibo-settings-actions">
        <button onClick={onClose} className="fibo-cancel-btn">Cancelar</button>
        <button onClick={handleSave} className="fibo-save-btn">Guardar</button>
      </div>
    </div>
  );
}