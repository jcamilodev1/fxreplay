/* eslint-disable react/prop-types */
import { X } from 'lucide-react';

const resolveAxisPosition = (positionValue, anchorValue, offset) => {
  if (typeof positionValue === 'number') return `${positionValue}px`;
  if (typeof anchorValue === 'number') return `${Math.max(12, anchorValue + offset)}px`;
  return '12px';
};

function DrawingStyleModal({
  selectedStyle,
  modalPosition,
  modalAnchor,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClose,
  onChangeStyle,
}) {
  if (!selectedStyle) return null;

  const left = resolveAxisPosition(modalPosition?.x, modalAnchor?.x, 12);
  const top = resolveAxisPosition(modalPosition?.y, modalAnchor?.y, -12);

  return (
    <div
      data-curve-modal="true"
      className="absolute z-20 box-border w-[320px] rounded-2xl border border-white/10 bg-slate-950/90 backdrop-blur-md shadow-xl"
      style={{
        left,
        top,
        padding: '14px 16px 16px',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[14px] font-semibold text-slate-200 pl-0.5">
          {selectedStyle.type === 'horizontal'
            ? 'Editar línea'
            : selectedStyle.type === 'trendline'
              ? 'Editar tendencia'
              : selectedStyle.type === 'rectangle'
                ? 'Editar rectángulo'
                : selectedStyle.type === 'fibonacci'
                  ? 'Editar Fibonacci'
              : 'Editar curva'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
          title="Cerrar"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-3" style={{ paddingTop: '14px' }}>
        <div className="text-[12px] text-slate-300">
          <span className="inline-block" style={{ marginBottom: '10px' }}>Texto</span>
          <div className="flex items-center gap-2">
            <input
              value={selectedStyle.text}
              onChange={(e) => onChangeStyle({ text: e.target.value })}
              className="w-full rounded-sm bg-slate-900/80 px-3 py-2 text-[12px] text-slate-200 border border-white/10"
              style={{ padding: '8px 12px' }}
              placeholder="Ej: resistencia"
              title="Texto de curva"
            />
            <input
              type="color"
              value={selectedStyle.color}
              onChange={(e) => onChangeStyle({ color: e.target.value })}
              className="h-8 w-8 shrink-0 cursor-pointer rounded-full border border-white/20 bg-transparent p-0 overflow-hidden appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-full"
              title="Color de curva"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[12px] text-slate-300">
            <span className="inline-block" style={{ marginBottom: '10px' }}>Tipo de línea</span>
            <select
              value={selectedStyle.lineStyle}
              onChange={(e) => onChangeStyle({ lineStyle: e.target.value })}
              className="w-full rounded-sm bg-slate-900/80 px-3 py-2 text-[12px] text-slate-200 border border-white/10"
              style={{ padding: '8px 12px' }}
              title="Tipo de línea"
            >
              <option value="solid">Sólida</option>
              <option value="dashed">Discontinua</option>
              <option value="dotted">Punteada</option>
            </select>
          </label>
          <label className="block text-[12px] text-slate-300">
            <span className="inline-block" style={{ marginBottom: '10px' }}>Posición texto</span>
            <select
              value={selectedStyle.textPosition || 'above'}
              onChange={(e) => onChangeStyle({ textPosition: e.target.value })}
              className="w-full rounded-sm bg-slate-900/80 px-3 py-2 text-[12px] text-slate-200 border border-white/10"
              style={{ padding: '8px 12px' }}
              title="Posición del texto"
            >
              <option value="above">Encima</option>
              <option value="center">Centro</option>
              <option value="below">Debajo</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="block text-[12px] text-slate-300">
            <div className="mb-1 flex items-center justify-between">
              <span>Tamaño texto</span>
              <span className="text-slate-400">{selectedStyle.textSize ?? 11}px</span>
            </div>
            <input
              type="range"
              min="8"
              max="24"
              step="1"
              value={selectedStyle.textSize ?? 11}
              onChange={(e) => onChangeStyle({ textSize: Number.parseInt(e.target.value, 10) })}
              className="w-full h-1 cursor-pointer accent-slate-200"
              style={{ height: '3px' }}
              title="Tamaño del texto"
            />
          </div>
          <div className="block text-[12px] text-slate-300">
            <div className="mb-1 flex items-center justify-between">
              <span>Grosor</span>
              <span className="text-slate-400">{selectedStyle.lineWidth ?? 2}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="6"
              step="1"
              value={selectedStyle.lineWidth ?? 2}
              onChange={(e) => onChangeStyle({ lineWidth: Number.parseInt(e.target.value, 10) })}
              className="w-full h-1 cursor-pointer accent-slate-200"
              style={{ height: '3px' }}
              title="Grosor de línea"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DrawingStyleModal;
