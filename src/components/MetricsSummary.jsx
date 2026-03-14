import { Settings, DollarSign, Target, ArrowDownCircle } from 'lucide-react';

const StatItem = ({ label, value, color, icon: Icon }) => (
  <div className="stat-row">
    <div className="flex items-center gap-3">
      {Icon && <div className="p-2 rounded-lg bg-white/5 text-slate-400"><Icon size={14} /></div>}
      <span className="stat-name">{label}</span>
    </div>
    <span className="stat-value" style={{ color: color || 'var(--text-main)' }}>{value}</span>
  </div>
);

const MetricsSummary = ({ metrics, tradesCount }) => (
  <div className="metrics-card animate">
    <div className="card-title">
      Resumen Ejecutivo
      <Settings size={14} className="opacity-40" />
    </div>
    <StatItem
      label="Beneficio Bruto"
      value={`$${metrics.grossProfit.toFixed(2)}`}
      icon={DollarSign}
      color={metrics.grossProfit > 0 ? 'var(--bull)' : undefined}
    />
    <StatItem label="Total Trades" value={tradesCount} icon={Target} />
    <StatItem
      label="Pérdida Máx"
      value={metrics.maxLoss > 0 ? `-$${metrics.maxLoss.toFixed(2)}` : '$0.00'}
      icon={ArrowDownCircle}
      color={metrics.maxLoss > 0 ? 'var(--bear)' : undefined}
    />
  </div>
);

export default MetricsSummary;
