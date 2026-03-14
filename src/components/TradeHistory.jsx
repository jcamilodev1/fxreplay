import { History } from 'lucide-react';

const TradeItem = ({ type, price, pnl, status, lots }) => (
  <div className="trade-item animate-fade-in">
    <div className="trade-info">
      <div className="flex items-center gap-2">
        <span className={`trade-type ${type === 'Buy' ? 'type-buy' : 'type-sell'}`}>
          {type}
        </span>
        {lots && <span className="text-[10px] text-slate-500 font-mono">{lots} lots</span>}
      </div>
      <span className="trade-price">{price}</span>
    </div>
    <div className="trade-pnl" style={{ color: status === 'win' ? 'var(--bull)' : 'var(--bear)' }}>
      <div className="text-xs uppercase font-bold opacity-50 mb-1">{status === 'win' ? 'Gain' : 'Loss'}</div>
      <span className="font-bold">${pnl}</span>
    </div>
  </div>
);

const TradeHistory = ({ trades, replayActive, decimals }) => (
  <div className="trade-log flex-1 animate">
    <div className="card-title">
      Historial de Operaciones
      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px]">{trades.length}</span>
    </div>
    <div className="log-scroll">
      {[...trades].reverse().map((trade, idx) => (
        <TradeItem
          key={idx}
          type={trade.type === 'BUY' ? 'Buy' : 'Sell'}
          price={trade.entry.toFixed(decimals)}
          pnl={(parseFloat(trade.pnl) >= 0 ? '+' : '') + parseFloat(trade.pnl).toFixed(2)}
          status={trade.status}
          lots={trade.lotSize}
        />
      ))}
      {trades.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/5 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 text-slate-600">
            <History size={24} />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            {replayActive
              ? 'Opera manualmente con Buy/Sell durante el replay para ver tu historial.'
              : 'Inicia el replay para comenzar a operar.'}
          </p>
        </div>
      )}
    </div>
  </div>
);

export default TradeHistory;
