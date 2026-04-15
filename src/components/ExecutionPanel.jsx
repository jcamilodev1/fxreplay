import { ShoppingBag, XCircle, Wallet } from 'lucide-react';

const ExecutionPanel = ({
  activePosition,
  lotInput,
  slPrice,
  tpPrice,
  onLotInputChange,
  onLotInputBlur,
  onSlChange,
  onTpChange,
  onBuy,
  onSell,
  onClose,
  metrics,
  decimals,
  riskMode,
  onRiskModeChange,
  riskPercentInput,
  onRiskPercentChange,
  onRiskPercentBlur,
  balanceInput,
  onBalanceChange,
  onBalanceBlur,
  currentBalance,
}) => (
  <div className="flex flex-wrap gap-4 items-stretch">
    
    {/* Controles de Riesgo */}
    <div className="flex-auto md:flex-[2] min-w-[320px] metrics-card animate p-4 flex flex-col justify-center border border-white/5 bg-[#151921]/80 backdrop-blur-md relative overflow-hidden" style={{ animationDelay: '0.1s' }}>
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Wallet size={64} />
      </div>
      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Controles de Riesgo</h3>
      
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 relative z-10">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
            Balance
          </label>
          <input
            type="text"
            value={activePosition ? `$${currentBalance.toFixed(2)}` : balanceInput}
            onChange={activePosition ? undefined : onBalanceChange}
            onBlur={activePosition ? undefined : onBalanceBlur}
            readOnly={!!activePosition}
            placeholder="10000"
            className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white font-mono text-sm focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between pl-1">
            <button
              onClick={() => onRiskModeChange('lots')}
              className={`text-[9px] font-bold uppercase transition-colors px-1.5 py-0.5 rounded ${riskMode === 'lots' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Lotes
            </button>
            <button
              onClick={() => onRiskModeChange('percent')}
              className={`text-[9px] font-bold uppercase transition-colors px-1.5 py-0.5 rounded ${riskMode === 'percent' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              % Riesgo
            </button>
          </div>
          {riskMode === 'lots' ? (
            <input
              type="text"
              value={lotInput}
              onChange={onLotInputChange}
              onBlur={onLotInputBlur}
              placeholder="0.01"
              className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white font-mono text-sm focus:border-blue-500 focus:outline-none transition-colors"
            />
          ) : (
            <div className="relative w-full">
              <input
                type="text"
                value={riskPercentInput}
                onChange={onRiskPercentChange}
                onBlur={onRiskPercentBlur}
                placeholder="1.0"
                className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white font-mono text-sm focus:border-blue-500 focus:outline-none transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">%</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
            Stop Loss
          </label>
          <input
            type="text"
            value={slPrice}
            onChange={onSlChange}
            placeholder="Auto"
            className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white font-mono text-sm focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
            Take Profit
          </label>
          <input
            type="text"
            value={tpPrice}
            onChange={onTpChange}
            placeholder="Auto"
            className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white font-mono text-sm focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>
    </div>

    {/* Botones de Ejecución */}
    <div className="flex-auto md:flex-1 min-w-[200px] flex gap-3">
      {!activePosition ? (
        <div className="flex w-full gap-3">
          <button
            onClick={onBuy}
            className="flex-1 metrics-card animate relative overflow-hidden group p-4 border border-emerald-500/20 hover:border-emerald-500/50 bg-gradient-to-br from-[#151921] to-emerald-950/20 hover:from-emerald-900/20 hover:to-emerald-900/40 active:scale-95 transition-all text-emerald-400 flex flex-col items-center justify-center gap-3 shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]"
            style={{ animationDelay: '0.15s' }}
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 blur-xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-emerald-500/20 transition-all text-transparent">.</div>
            <ShoppingBag size={24} className="group-hover:scale-110 transition-transform" />
            <span className="text-[12px] font-bold uppercase tracking-widest">Buy</span>
          </button>
          
          <button
            onClick={onSell}
            className="flex-1 metrics-card animate relative overflow-hidden group p-4 border border-rose-500/20 hover:border-rose-500/50 bg-gradient-to-br from-[#151921] to-rose-950/20 hover:from-rose-900/20 hover:to-rose-900/40 active:scale-95 transition-all text-rose-400 flex flex-col items-center justify-center gap-3 shadow-[0_0_15px_rgba(244,63,94,0.05)] hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="absolute top-0 left-0 w-16 h-16 bg-rose-500/10 blur-xl rounded-full -translate-x-1/2 -translate-y-1/2 group-hover:bg-rose-500/20 transition-all text-transparent">.</div>
            <XCircle size={24} className="group-hover:scale-110 transition-transform" />
            <span className="text-[12px] font-bold uppercase tracking-widest">Sell</span>
          </button>
        </div>
      ) : (
        <button
          onClick={onClose}
          className="flex-1 metrics-card animate relative overflow-hidden group p-4 border border-amber-500/30 hover:border-amber-500/50 bg-gradient-to-br from-[#151921] to-amber-950/30 hover:from-amber-900/30 hover:to-amber-900/50 active:scale-95 transition-all text-amber-400 flex flex-col items-center justify-center gap-2 w-full text-center shadow-[0_0_15px_rgba(245,158,11,0.1)] hover:shadow-[0_0_25px_rgba(245,158,11,0.2)]"
        >
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2 group-hover:bg-amber-500/20 transition-all text-transparent">.</div>
          <span className="text-[10px] opacity-80 border border-amber-500/30 bg-amber-500/10 rounded-full px-3 py-1 font-mono">
            {activePosition.lotSize} lots
          </span>
          <span className="text-sm font-bold uppercase tracking-widest mt-1">Cerrar {activePosition.type}</span>
          <span className="text-xl font-mono font-bold text-amber-300">@{activePosition?.entry?.toFixed(decimals) || '0.00000'}</span>
        </button>
      )}
    </div>

    {/* Métricas */}
    <div className="flex-auto min-w-[140px] metrics-card animate flex flex-col justify-center items-center text-center p-4 bg-[#151921]/80 backdrop-blur-md" style={{ animationDelay: '0.25s' }}>
      <div className="stat-name uppercase text-[10px] font-bold tracking-widest mb-1 text-slate-400">Balance</div>
      <div className="text-lg md:text-xl font-bold font-mono" style={{ color: currentBalance >= (parseFloat(balanceInput) || 10000) ? 'var(--bull)' : 'var(--bear)' }}>
        ${currentBalance.toFixed(2)}
      </div>
      <div className="w-8 h-[1px] bg-white/10 my-2"></div>
      <div className="stat-name uppercase text-[10px] font-bold tracking-widest mb-1 text-slate-400">Profit</div>
      <div className="text-sm md:text-base font-bold font-mono" style={{ color: parseFloat(metrics.profit) >= 0 ? 'var(--bull)' : 'var(--bear)' }}>
        {parseFloat(metrics.profit) >= 0 ? '+' : ''}${parseFloat(metrics.profit).toFixed(2)}
      </div>
    </div>

    <div className="flex-auto min-w-[140px] metrics-card animate flex flex-col justify-center items-center text-center p-4 bg-[#151921]/80 backdrop-blur-md relative overflow-hidden" style={{ animationDelay: '0.3s' }}>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full"></div>
      <div className="stat-name uppercase text-[10px] font-bold tracking-widest mb-2 text-slate-400 relative z-10">Win Rate</div>
      <div className="text-2xl md:text-3xl font-bold font-mono text-blue-400 relative z-10">
        {metrics.winRate.toFixed(1)}%
      </div>
    </div>
  </div>
);

export default ExecutionPanel;
