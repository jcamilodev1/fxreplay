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
  <div className="flex gap-6">
    <div className="flex-2 metrics-card animate flex items-center gap-6" style={{ animationDelay: '0.1s' }}>
      <div className="risk-input-group">
        <div className="risk-field">
          <label className="flex items-center gap-1">
            <Wallet size={10} />
            Balance
          </label>
          <input
            type="text"
            value={activePosition ? `$${currentBalance.toFixed(2)}` : balanceInput}
            onChange={activePosition ? undefined : onBalanceChange}
            onBlur={activePosition ? undefined : onBalanceBlur}
            readOnly={!!activePosition}
            placeholder="10000"
            className="lot-input"
            style={{ width: 90, fontSize: '0.75rem' }}
          />
        </div>

        <div className="risk-field">
          <div className="risk-mode-toggle">
            <button
              onClick={() => onRiskModeChange('lots')}
              className={`risk-mode-btn ${riskMode === 'lots' ? 'active' : ''}`}
            >
              Lotes
            </button>
            <button
              onClick={() => onRiskModeChange('percent')}
              className={`risk-mode-btn ${riskMode === 'percent' ? 'active' : ''}`}
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
              className="lot-input"
            />
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={riskPercentInput}
                onChange={onRiskPercentChange}
                onBlur={onRiskPercentBlur}
                placeholder="1"
                className="lot-input"
                style={{ width: 45 }}
              />
              <span className="text-[10px] text-slate-500 font-mono">%</span>
            </div>
          )}
        </div>

        <div className="risk-field">
          <label>Stop Loss</label>
          <input
            type="text"
            value={slPrice}
            onChange={onSlChange}
            placeholder="Auto"
          />
        </div>
        <div className="risk-field">
          <label>Take Profit</label>
          <input
            type="text"
            value={tpPrice}
            onChange={onTpChange}
            placeholder="Auto"
          />
        </div>
      </div>

      <div className="flex-1 flex gap-3">
        {!activePosition ? (
          <>
            <button
              onClick={onBuy}
              className="flex-1 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-1 group"
            >
              <ShoppingBag size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-xs">MARKET BUY</span>
            </button>
            <button
              onClick={onSell}
              className="flex-1 py-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-1 group"
            >
              <XCircle size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-xs">MARKET SELL</span>
            </button>
          </>
        ) : (
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-xl font-bold transition-all flex items-center justify-center gap-3 group"
          >
            <div className="flex flex-col items-start">
              <span className="text-[10px] opacity-70">POSICIÓN ACTIVA · {activePosition.lotSize} lots</span>
              <span className="text-lg">CERRAR {activePosition.type}</span>
            </div>
            <div className="w-px h-8 bg-amber-500/20" />
            <div className="text-xl font-mono">
              @{activePosition?.entry?.toFixed(decimals) || '0.00000'}
            </div>
          </button>
        )}
      </div>
    </div>

    <div className="flex-1 metrics-card animate flex flex-col justify-center" style={{ animationDelay: '0.2s' }}>
      <div className="stat-name uppercase text-[10px] font-bold tracking-widest mb-1">Balance</div>
      <div className="text-lg font-bold font-mono" style={{ color: currentBalance >= (parseFloat(balanceInput) || 10000) ? 'var(--bull)' : 'var(--bear)' }}>
        ${currentBalance.toFixed(2)}
      </div>
      <div className="stat-name uppercase text-[10px] font-bold tracking-widest mt-2 mb-1">Profit</div>
      <div className="text-lg font-bold font-mono" style={{ color: parseFloat(metrics.profit) >= 0 ? 'var(--bull)' : 'var(--bear)' }}>
        {parseFloat(metrics.profit) >= 0 ? '+' : ''}${parseFloat(metrics.profit).toFixed(2)}
      </div>
    </div>

    <div className="flex-1 metrics-card animate flex flex-col justify-center" style={{ animationDelay: '0.3s' }}>
      <div className="stat-name uppercase text-[10px] font-bold tracking-widest mb-1">Win Rate</div>
      <div className="text-2xl font-bold font-mono text-blue-400">
        {metrics.winRate.toFixed(1)}%
      </div>
    </div>
  </div>
);

export default ExecutionPanel;
