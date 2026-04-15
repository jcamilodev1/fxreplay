import { TrendingUp, TrendingDown, X } from 'lucide-react';

/* ─────────────────────────────────────────────
   Micro-component: terminal-style field
───────────────────────────────────────────── */
const TermField = ({ label, children }) => (
  <div className="ep-field">
    <span className="ep-field-label">{label}</span>
    {children}
  </div>
);

const TermInput = (props) => (
  <input className="ep-input" {...props} />
);

/* ─────────────────────────────────────────────
   ExecutionPanel
───────────────────────────────────────────── */
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
}) => {
  const profit      = parseFloat(metrics.profit) || 0;
  const initialBal  = parseFloat(balanceInput)   || 10000;
  const isProfit    = profit >= 0;
  const isPositive  = currentBalance >= initialBal;

  return (
    <div className="ep-wrap">

      {/* ── Risk Controls ── */}
      <div className="ep-risk animate" style={{ animationDelay: '0.05s' }}>
        <header className="ep-risk-header">
          <span className="ep-section-tag">▸ RIESGO</span>
          {/* Lot / % toggle */}
          <div className="ep-mode-toggle">
            <button
              className={`ep-mode-btn${riskMode === 'lots' ? ' is-active' : ''}`}
              onClick={() => onRiskModeChange('lots')}
            >
              Lotes
            </button>
            <span className="ep-mode-sep" />
            <button
              className={`ep-mode-btn${riskMode === 'percent' ? ' is-active' : ''}`}
              onClick={() => onRiskModeChange('percent')}
            >
              % Risk
            </button>
          </div>
        </header>

        <div className="ep-risk-row">
          {/* Balance */}
          <TermField label="Balance">
            <TermInput
              type="text"
              value={activePosition ? `$${currentBalance.toFixed(2)}` : balanceInput}
              onChange={activePosition ? undefined : onBalanceChange}
              onBlur={activePosition ? undefined : onBalanceBlur}
              readOnly={!!activePosition}
              placeholder="10000"
            />
          </TermField>

          {/* Size / % */}
          <TermField label={riskMode === 'lots' ? 'Tamaño' : 'Riesgo %'}>
            {riskMode === 'lots' ? (
              <TermInput
                type="text"
                value={lotInput}
                onChange={onLotInputChange}
                onBlur={onLotInputBlur}
                placeholder="0.01"
              />
            ) : (
              <div style={{ position: 'relative' }}>
                <TermInput
                  type="text"
                  value={riskPercentInput}
                  onChange={onRiskPercentChange}
                  onBlur={onRiskPercentBlur}
                  placeholder="1.0"
                  style={{ paddingRight: '20px' }}
                />
                <span className="ep-pct-suffix">%</span>
              </div>
            )}
          </TermField>

          {/* Stop Loss */}
          <TermField label="Stop Loss">
            <TermInput
              type="text"
              value={slPrice}
              onChange={onSlChange}
              placeholder="Auto"
            />
          </TermField>

          {/* Take Profit */}
          <TermField label="Take Profit">
            <TermInput
              type="text"
              value={tpPrice}
              onChange={onTpChange}
              placeholder="Auto"
            />
          </TermField>
        </div>
      </div>

      {/* ── Execute ── */}
      <div className="ep-exec animate" style={{ animationDelay: '0.1s' }}>
        {!activePosition ? (
          <>
            <button className="ep-btn ep-btn--buy" onClick={onBuy}>
              <TrendingUp size={18} strokeWidth={2.5} />
              <span className="ep-btn-label">BUY</span>
              <span className="ep-btn-sub">Market</span>
            </button>
            <button className="ep-btn ep-btn--sell" onClick={onSell}>
              <TrendingDown size={18} strokeWidth={2.5} />
              <span className="ep-btn-label">SELL</span>
              <span className="ep-btn-sub">Market</span>
            </button>
          </>
        ) : (
          <button className="ep-btn ep-btn--close" onClick={onClose}>
            <X size={16} strokeWidth={2.5} />
            <span className="ep-btn-label">Cerrar</span>
            <span className="ep-btn-sub ep-close-meta">
              {activePosition.type} · {activePosition.lotSize}L
            </span>
            <span className="ep-close-price">
              @{activePosition?.entry?.toFixed(decimals) ?? '—'}
            </span>
          </button>
        )}
      </div>

      {/* ── P&L ── */}
      <div className="ep-stat animate" style={{ animationDelay: '0.15s' }}>
        <div className="ep-stat-row">
          <span className="ep-stat-label">Balance</span>
          <span className="ep-stat-val" style={{ color: isPositive ? 'var(--bull)' : 'var(--bear)' }}>
            ${currentBalance.toFixed(2)}
          </span>
        </div>
        <div className="ep-stat-divider" />
        <div className="ep-stat-row">
          <span className="ep-stat-label">Profit</span>
          <span
            className="ep-stat-val ep-stat-val--sm"
            style={{ color: isProfit ? 'var(--bull)' : 'var(--bear)' }}
          >
            {isProfit ? '+' : ''}${profit.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── Win Rate ── */}
      <div className="ep-stat ep-stat--accent animate" style={{ animationDelay: '0.2s' }}>
        <span className="ep-stat-label">Win Rate</span>
        <span className="ep-winrate">{metrics.winRate.toFixed(1)}%</span>
        <span className="ep-stat-label" style={{ marginTop: '2px' }}>
          {metrics.winRate >= 50 ? '↑ Positivo' : '↓ Negativo'}
        </span>
      </div>

    </div>
  );
};

export default ExecutionPanel;
