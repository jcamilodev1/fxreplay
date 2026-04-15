import {
  Play, Pause, ChevronLeft, ChevronRight, Gauge,
  Rewind, LogOut, XCircle, Loader2,
} from 'lucide-react';

const SYMBOLS = [
  { id: 'eurusd', label: 'EUR/USD' },
  { id: 'usdjpy', label: 'USD/JPY' },
  { id: 'us100',  label: 'US100' },
  { id: 'xauusd', label: 'XAU/USD' },
];

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];

const Header = ({
  selectedSymbol,
  selectedTF,
  onSymbolChange,
  onTFChange,
  totalCandles,
  currentIndex,
  replayActive,
  isPlaying,
  replaySpeed,
  metrics,
  selectingStart,
  isLoading,
  onSetReplaySpeed,
  onStepForward,
  onStepBackward,
  onTogglePlay,
  onExitReplay,
  onShowSelector,
  onCancelSelector,
  currentBalance,
}) => {
  const replayProgressPct = replayActive && totalCandles > 0
    ? ((currentIndex / (totalCandles - 1)) * 100).toFixed(1)
    : 0;

  return (
    <header className="header">
      <div className="flex items-center gap-4">
        <div className="selector-group">
          <select
            value={selectedSymbol}
            onChange={(e) => { if (!replayActive) onSymbolChange(e.target.value); }}
            disabled={replayActive}
            className={`bg-[#1e293b] text-white border border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-500 transition-colors ${replayActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[#2a374a]'}`}
          >
            {SYMBOLS.map(s => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="selector-group">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => onTFChange(tf)}
              className={`selector-btn tf ${selectedTF === tf ? 'active' : ''}`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="status-pills">
          <div className="pill">
            <span className="pill-label">Velas:</span>
            <span className="pill-value">{totalCandles.toLocaleString()}</span>
          </div>
          {replayActive && (
            <div className="pill" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
              <span className="pill-label">Replay:</span>
              <span className="pill-value" style={{ color: 'var(--primary)' }}>
                {currentIndex.toLocaleString()} ({replayProgressPct}%)
              </span>
            </div>
          )}
          <div className="pill">
            <span className="pill-label">Saldo:</span>
            <span className="pill-value">${(currentBalance || 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        {replayActive ? (
          <>
            <div className="flex items-center bg-white/5 rounded-lg border border-white/5 p-1 mr-1">
              <button onClick={onStepBackward} className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 transition-all" title="Vela anterior (←)">
                <ChevronLeft size={18} />
              </button>
              <button onClick={onStepForward} className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 transition-all" title="Vela siguiente (→)">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex items-center bg-white/5 rounded-lg border border-white/5 p-1 mr-1 gap-1 px-2">
              <Gauge size={14} className="text-slate-500" />
              <select
                value={replaySpeed}
                onChange={(e) => onSetReplaySpeed(parseInt(e.target.value))}
                className="bg-transparent text-[11px] font-mono text-slate-400 outline-none cursor-pointer"
              >
                <option value="2000">0.25x</option>
                <option value="1000">0.5x</option>
                <option value="500">1x</option>
                <option value="200">2x</option>
                <option value="100">4x</option>
                <option value="50">8x</option>
              </select>
            </div>

            <button
              onClick={onTogglePlay}
              className={`btn-primary ${isPlaying ? 'btn-danger' : ''}`}
              title="Reproducir/Pausar (Espacio)"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              <span className="hidden sm:inline">{isPlaying ? 'Pausar' : 'Play'}</span>
            </button>

            <button onClick={onExitReplay} className="btn-icon hover:bg-rose-500/20! hover:text-rose-400! hover:border-rose-500/30!" title="Salir del Replay (Esc)">
              <LogOut size={18} />
            </button>
          </>
        ) : selectingStart ? (
          <button onClick={onCancelSelector} className="btn-icon" title="Cancelar (Esc)">
            <XCircle size={18} />
          </button>
        ) : (
          <button
            onClick={onShowSelector}
            disabled={isLoading}
            className="btn-primary"
            title="Activar Replay"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Rewind size={18} />}
            <span className="hidden sm:inline">Iniciar Replay</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
