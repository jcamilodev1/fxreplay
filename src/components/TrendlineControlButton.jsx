/* eslint-disable react/prop-types */
import { TrendingUp } from 'lucide-react';

function TrendlineControlButton({ drawingMode, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`control-btn ${drawingMode === 'trendline' ? 'active' : ''}`}
      title="Línea de tendencia"
    >
      <TrendingUp size={18} />
    </button>
  );
}

export default TrendlineControlButton;
