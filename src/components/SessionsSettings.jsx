import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';

export const DEFAULT_SESSIONS_CONFIG = {
  asia: { label: 'Asia', color: '#8b5cf6', opacity: 0.15, start: 0, end: 9 },
  london: { label: 'Londres', color: '#eab308', opacity: 0.15, start: 8, end: 17 },
  ny: { label: 'Nueva York', color: '#10b981', opacity: 0.15, start: 13, end: 22 },
};

const LS_KEY = 'fxreplay_sessions_config';

export function loadSessionsConfig() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_SESSIONS_CONFIG;
    return JSON.parse(raw);
  } catch {}
  return DEFAULT_SESSIONS_CONFIG;
}

export function saveSessionsConfig(config) {
  localStorage.setItem(LS_KEY, JSON.stringify(config));
}

export default function SessionsSettings({ config, onChange, onClose }) {
  const [draft, setDraft] = useState(() => ({ ...config }));

  const updateSession = (key, field, val) => {
    setDraft(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: val }
    }));
  };

  const handleSave = () => {
    const cleaned = { ...draft };
    saveSessionsConfig(cleaned);
    onChange(cleaned);
    onClose();
  };

  const handleReset = () => {
    setDraft(DEFAULT_SESSIONS_CONFIG);
  };

  return (
    <div className="fibo-settings-popover" style={{ width: '280px' }}>
      <div className="fibo-settings-header">
        <span className="fibo-settings-title">Configurar Sesiones</span>
        <div className="flex items-center gap-1">
          <button onClick={handleReset} className="fibo-settings-icon-btn" title="Restaurar por defecto">
            <RotateCcw size={13} />
          </button>
          <button onClick={onClose} className="fibo-settings-icon-btn" title="Cerrar">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="fibo-settings-list" style={{ maxHeight: 'max-content' }}>
        {Object.entries(draft).map(([key, ses]) => (
          <div key={key} className="flex flex-col gap-2 p-2 bg-slate-800/20 rounded-lg border border-white/5 mb-1">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={ses.color}
                onChange={(e) => updateSession(key, 'color', e.target.value)}
                className="fibo-color-input"
                style={{ width: '20px', height: '20px', padding: 0 }}
              />
              <span className="text-xs font-semibold text-slate-300 flex-1">{ses.label}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500">Opacidad:</span>
                <input
                  type="range"
                  min="0.05"
                  max="0.40"
                  step="0.01"
                  value={ses.opacity}
                  onChange={(e) => updateSession(key, 'opacity', parseFloat(e.target.value))}
                  className="w-16 h-1 bg-slate-700/50 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">Inicio (UTC):</span>
                <input
                  type="number"
                  min="0" max="23"
                  value={ses.start}
                  onChange={(e) => updateSession(key, 'start', parseInt(e.target.value))}
                  className="w-10 bg-slate-900 border border-slate-700/50 rounded px-1 py-0.5 text-xs font-mono text-center text-slate-300"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">Fin (UTC):</span>
                <input
                  type="number"
                  min="0" max="23"
                  value={ses.end}
                  onChange={(e) => updateSession(key, 'end', parseInt(e.target.value))}
                  className="w-10 bg-slate-900 border border-slate-700/50 rounded px-1 py-0.5 text-xs font-mono text-center text-slate-300"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="fibo-settings-actions mt-3">
        <button onClick={onClose} className="fibo-cancel-btn">Cancelar</button>
        <button onClick={handleSave} className="fibo-save-btn">Guardar</button>
      </div>
    </div>
  );
}
