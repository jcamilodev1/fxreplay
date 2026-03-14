import { useState } from 'react';
import { Plus, X, RotateCcw } from 'lucide-react';

export const DEFAULT_FIBO_LEVELS = [
  { value: 0,     color: '#ef4444' },
  { value: 0.236, color: '#f97316' },
  { value: 0.382, color: '#eab308' },
  { value: 0.5,   color: '#84cc16' },
  { value: 0.618, color: '#06b6d4' },
  { value: 0.786, color: '#8b5cf6' },
  { value: 1,     color: '#ec4899' },
];

const LS_KEY = 'fxreplay_fibo_levels';

export function loadFiboLevels() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_FIBO_LEVELS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return DEFAULT_FIBO_LEVELS;
}

export function saveFiboLevels(levels) {
  localStorage.setItem(LS_KEY, JSON.stringify(levels));
}

export default function FiboSettings({ levels, onChange, onClose }) {
  const [draft, setDraft] = useState(() => levels.map(l => ({ ...l })));

  const updateLevel = (idx, field, val) => {
    setDraft(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  };

  const removeLevel = (idx) => {
    if (draft.length <= 2) return;
    setDraft(prev => prev.filter((_, i) => i !== idx));
  };

  const addLevel = () => {
    const maxVal = Math.max(...draft.map(l => l.value));
    const newVal = Math.min(maxVal + 0.5, 10);
    const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#f472b6', '#a855f7'];
    setDraft(prev => [...prev, { value: parseFloat(newVal.toFixed(3)), color: colors[prev.length % colors.length] }]);
  };

  const handleSave = () => {
    const cleaned = draft
      .map(l => ({ value: parseFloat(l.value) || 0, color: l.color }))
      .filter(l => !isNaN(l.value))
      .sort((a, b) => a.value - b.value);
    if (cleaned.length < 2) return;
    saveFiboLevels(cleaned);
    onChange(cleaned);
    onClose();
  };

  const handleReset = () => {
    setDraft(DEFAULT_FIBO_LEVELS.map(l => ({ ...l })));
  };

  return (
    <div className="fibo-settings-popover">
      <div className="fibo-settings-header">
        <span className="fibo-settings-title">Niveles Fibonacci</span>
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
        {draft.map((lv, i) => (
          <div key={i} className="fibo-settings-row">
            <input
              type="color"
              value={lv.color}
              onChange={(e) => updateLevel(i, 'color', e.target.value)}
              className="fibo-color-input"
              title="Color del nivel"
            />
            <input
              type="number"
              value={lv.value}
              onChange={(e) => updateLevel(i, 'value', e.target.value)}
              step="0.001"
              className="fibo-value-input"
              placeholder="0.618"
            />
            <span className="fibo-pct-label">{(parseFloat(lv.value) * 100 || 0).toFixed(1)}%</span>
            <button
              onClick={() => removeLevel(i)}
              className="fibo-remove-btn"
              disabled={draft.length <= 2}
              title="Eliminar nivel"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <button onClick={addLevel} className="fibo-add-btn">
        <Plus size={13} />
        <span>Añadir nivel</span>
      </button>

      <div className="fibo-settings-actions">
        <button onClick={onClose} className="fibo-cancel-btn">Cancelar</button>
        <button onClick={handleSave} className="fibo-save-btn">Guardar</button>
      </div>
    </div>
  );
}
