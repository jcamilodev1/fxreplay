import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Minus, MousePointer2, TrendingUp, MoveUpRight,
  GitBranch, Undo2, Trash2, Loader2, Rewind,
  ArrowBigLeftDash, ArrowBigRightDash, AlertTriangle,
} from 'lucide-react';
import TradingChart from './components/TradingChart';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ExecutionPanel from './components/ExecutionPanel';
import TradeHistory from './components/TradeHistory';
import MetricsSummary from './components/MetricsSummary';
import { useBacktest } from './hooks/useBacktest';
import { useChunkedData } from './hooks/useChunkedData';

const SYMBOLS = [
  { id: 'eurusd', label: 'EUR/USD', decimals: 5, pipMult: 10000, minMove: 0.00001, pipValue: 10, defaultSL: 0.00300, defaultTP: 0.00600 },
  { id: 'usdjpy', label: 'USD/JPY', decimals: 3, pipMult: 100,   minMove: 0.001,   pipValue: 7,  defaultSL: 0.300,   defaultTP: 0.600 },
  { id: 'us100',  label: 'US100',   decimals: 2, pipMult: 1,     minMove: 0.01,    pipValue: 1,  defaultSL: 50,      defaultTP: 100 },
];

function App() {
  const [drawingMode, setDrawingMode] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState('eurusd');
  const [selectedTF, setSelectedTF] = useState('H1');
  const [replayStartInput, setReplayStartInput] = useState(50);
  const [selectingStart, setSelectingStart] = useState(false);
  const [lotSize, setLotSize] = useState(0.01);
  const [lotInput, setLotInput] = useState('0.01');
  const chartComponentRef = useRef(null);
  const loadMoreThrottleRef = useRef(false);

  const symbolInfo = SYMBOLS.find(s => s.id === selectedSymbol);

  const {
    data: chartData,
    meta,
    isLoading,
    isLoadingMore,
    loadError,
    hasOlderData,
    loadSymbol,
    loadOlderChunks,
    loadAllChunks,
  } = useChunkedData();

  useEffect(() => {
    loadSymbol(selectedSymbol, selectedTF);
  }, [selectedSymbol, selectedTF, loadSymbol]);

  const handleNeedMoreData = useCallback(() => {
    if (loadMoreThrottleRef.current || !hasOlderData) return;
    loadMoreThrottleRef.current = true;
    loadOlderChunks(2).finally(() => {
      setTimeout(() => { loadMoreThrottleRef.current = false; }, 500);
    });
  }, [hasOlderData, loadOlderChunks]);

  const {
    replayActive,
    isPlaying,
    currentIndex,
    totalCandles,
    visibleData,
    metrics,
    trades,
    activePosition,
    replaySpeed,
    setReplaySpeed,
    enterReplay,
    exitReplay,
    startPlaying,
    pausePlaying,
    stepForward,
    stepBackward,
    jumpTo,
    executeBuy: executeBuyHook,
    executeSell: executeSellHook,
    closePosition,
    updateSLTP,
    setReplayIndex
  } = useBacktest(chartData, selectedSymbol, symbolInfo?.pipMult || 10000, lotSize, symbolInfo?.pipValue || 10);

  const pendingReplayTimeRef = useRef(null);

  const [slPrice, setSlPrice] = useState('');
  const [tpPrice, setTpPrice] = useState('');

  useEffect(() => {
    setSlPrice('');
    setTpPrice('');
  }, [selectedSymbol, selectedTF]);

  const parsePrice = (val) => {
    if (!val) return null;
    const parsed = parseFloat(val.toString().replace(',', '.'));
    return isNaN(parsed) ? null : parsed;
  };

  const handleBuy = () => {
    if (!chartData?.length) return;
    const entry = chartData[currentIndex]?.close;
    if (!entry) return;
    const dec = symbolInfo?.decimals || 5;
    const slDist = symbolInfo?.defaultSL ?? 0.00300;
    const tpDist = symbolInfo?.defaultTP ?? 0.00600;
    const sl = parsePrice(slPrice) ?? parseFloat((entry - slDist).toFixed(dec));
    const tp = parsePrice(tpPrice) ?? parseFloat((entry + tpDist).toFixed(dec));
    if (!parsePrice(slPrice)) setSlPrice((entry - slDist).toFixed(dec));
    if (!parsePrice(tpPrice)) setTpPrice((entry + tpDist).toFixed(dec));
    executeBuyHook(sl, tp);
  };

  const handleSell = () => {
    if (!chartData?.length) return;
    const entry = chartData[currentIndex]?.close;
    if (!entry) return;
    const dec = symbolInfo?.decimals || 5;
    const slDist = symbolInfo?.defaultSL ?? 0.00300;
    const tpDist = symbolInfo?.defaultTP ?? 0.00600;
    const sl = parsePrice(slPrice) ?? parseFloat((entry + slDist).toFixed(dec));
    const tp = parsePrice(tpPrice) ?? parseFloat((entry - tpDist).toFixed(dec));
    if (!parsePrice(slPrice)) setSlPrice((entry + slDist).toFixed(dec));
    if (!parsePrice(tpPrice)) setTpPrice((entry - tpDist).toFixed(dec));
    executeSellHook(sl, tp);
  };

  const handleSLTPDrag = useCallback((type, price) => {
    updateSLTP(type, price);
    const dec = symbolInfo?.decimals || 5;
    if (type === 'sl') setSlPrice(price.toFixed(dec));
    else if (type === 'tp') setTpPrice(price.toFixed(dec));
  }, [updateSLTP, symbolInfo]);

  const handleTFChange = useCallback((tf) => {
    if (tf === selectedTF) return;
    if (replayActive) {
      const currentCandle = chartData?.[currentIndex];
      if (currentCandle) {
        pendingReplayTimeRef.current = currentCandle.time;
      }
      if (isPlaying) pausePlaying();
    }
    setSelectedTF(tf);
  }, [selectedTF, replayActive, chartData, currentIndex, isPlaying, pausePlaying]);

  useEffect(() => {
    if (!pendingReplayTimeRef.current || isLoading || isLoadingMore) return;
    if (hasOlderData) {
      loadAllChunks();
      return;
    }
    if (!chartData || chartData.length === 0) return;

    const targetTime = pendingReplayTimeRef.current;
    pendingReplayTimeRef.current = null;

    let closestIdx = 0;
    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].time <= targetTime) {
        closestIdx = i;
      } else {
        break;
      }
    }

    setReplayIndex(closestIdx);
  }, [chartData, isLoading, isLoadingMore, hasOlderData, loadAllChunks, setReplayIndex]);

  const handleShowSelector = useCallback(async () => {
    setSelectingStart(true);
    await loadAllChunks();
    if (meta?.totalCandles) {
      setReplayStartInput(Math.floor(meta.totalCandles * 0.8));
    }
  }, [meta, loadAllChunks]);

  const handleCancelSelector = useCallback(() => {
    setSelectingStart(false);
  }, []);

  const handleEnterReplay = useCallback(() => {
    const total = chartData?.length || 0;
    if (total === 0) return;
    const startIdx = Math.max(0, Math.min(replayStartInput, total - 1));
    enterReplay(startIdx);
    setSelectingStart(false);
  }, [replayStartInput, chartData, enterReplay]);

  const handleExitReplay = useCallback(() => {
    exitReplay();
    setSelectingStart(false);
  }, [exitReplay]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;

      switch(e.key) {
        case 'ArrowRight':
          stepForward();
          break;
        case 'ArrowLeft':
          stepBackward();
          break;
        case ' ':
          e.preventDefault();
          if (replayActive) {
            if (isPlaying) pausePlaying();
            else startPlaying();
          }
          break;
        case 'Escape':
          if (replayActive) { exitReplay(); setSelectingStart(false); }
          else if (selectingStart) setSelectingStart(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stepForward, stepBackward, isPlaying, pausePlaying, startPlaying, replayActive, exitReplay, selectingStart]);

  const handleLotInputChange = useCallback((e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setLotInput(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0) setLotSize(num);
  }, []);

  const handleLotInputBlur = useCallback(() => {
    const num = parseFloat(lotInput);
    if (isNaN(num) || num <= 0) {
      setLotInput('0.01');
      setLotSize(0.01);
    } else {
      setLotInput(num.toString());
    }
  }, [lotInput]);

  return (
    <div className="app-container">
      <Sidebar />

      <main className="main-wrapper">
        <Header
          selectedSymbol={selectedSymbol}
          selectedTF={selectedTF}
          onSymbolChange={setSelectedSymbol}
          onTFChange={replayActive ? handleTFChange : setSelectedTF}
          totalCandles={totalCandles}
          currentIndex={currentIndex}
          replayActive={replayActive}
          isPlaying={isPlaying}
          replaySpeed={replaySpeed}
          metrics={metrics}
          selectingStart={selectingStart}
          isLoading={isLoading}
          onSetReplaySpeed={setReplaySpeed}
          onStepForward={stepForward}
          onStepBackward={stepBackward}
          onTogglePlay={() => isPlaying ? pausePlaying() : startPlaying()}
          onExitReplay={handleExitReplay}
          onShowSelector={handleShowSelector}
          onCancelSelector={handleCancelSelector}
        />

        <div className="dashboard-grid glass-blur">
          {/* Chart Section */}
          <section className="chart-section">
            <div className="chart-card animate">
              <div className="chart-controls">
                <button
                  onClick={() => setDrawingMode(null)}
                  className={`control-btn ${!drawingMode ? 'active' : ''}`}
                  title="Puntero"
                >
                  <MousePointer2 size={18} />
                </button>
                <div className="controls-divider" />
                <button
                  onClick={() => setDrawingMode(drawingMode === 'horizontal' ? null : 'horizontal')}
                  className={`control-btn ${drawingMode === 'horizontal' ? 'active' : ''}`}
                  title="Línea horizontal (S/R)"
                >
                  <Minus size={18} />
                </button>
                <button
                  onClick={() => setDrawingMode(drawingMode === 'trendline' ? null : 'trendline')}
                  className={`control-btn ${drawingMode === 'trendline' ? 'active' : ''}`}
                  title="Línea de tendencia"
                >
                  <TrendingUp size={18} />
                </button>
                <button
                  onClick={() => setDrawingMode(drawingMode === 'ray' ? null : 'ray')}
                  className={`control-btn ${drawingMode === 'ray' ? 'active' : ''}`}
                  title="Rayo"
                >
                  <MoveUpRight size={18} />
                </button>
                <button
                  onClick={() => setDrawingMode(drawingMode === 'fibonacci' ? null : 'fibonacci')}
                  className={`control-btn ${drawingMode === 'fibonacci' ? 'active' : ''}`}
                  title="Fibonacci"
                >
                  <GitBranch size={18} />
                </button>
                <div className="controls-divider" />
                <button
                  onClick={() => chartComponentRef.current?.removeLastDrawing()}
                  className="control-btn"
                  title="Deshacer último dibujo"
                >
                  <Undo2 size={18} />
                </button>
                <button
                  onClick={() => chartComponentRef.current?.clearDrawings()}
                  className="control-btn"
                  title="Borrar todos los dibujos"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div id="chart-container" className="w-full h-full" style={{ position: 'relative' }}>
                {isLoading && (
                  <div className="chart-loading-overlay">
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                    <span className="ml-3 text-slate-400 text-sm">Cargando {symbolInfo?.label} {selectedTF}...</span>
                  </div>
                )}

                {loadError && !isLoading && (
                  <div className="chart-loading-overlay">
                    <AlertTriangle size={32} className="text-amber-500" />
                    <div className="ml-3 flex flex-col">
                      <span className="text-amber-400 text-sm font-semibold">Error al cargar datos</span>
                      <span className="text-slate-500 text-xs mt-1">{loadError}</span>
                    </div>
                  </div>
                )}

                <TradingChart
                  ref={chartComponentRef}
                  data={visibleData}
                  drawingMode={drawingMode}
                  activePosition={activePosition}
                  onNeedMoreData={!replayActive ? handleNeedMoreData : undefined}
                  focusIndex={selectingStart && !replayActive ? replayStartInput : null}
                  priceDecimals={symbolInfo?.decimals || 5}
                  minMove={symbolInfo?.minMove || 0.00001}
                  onSLTPDrag={replayActive ? handleSLTPDrag : undefined}
                  dataKey={selectedSymbol}
                />
              </div>

              {isLoadingMore && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg backdrop-blur-md">
                  <Loader2 size={14} className="animate-spin text-blue-400" />
                  <span className="text-[11px] font-semibold text-blue-300">Cargando más datos...</span>
                </div>
              )}

              {selectingStart && !replayActive && (
                <div className="replay-start-bar">
                  {isLoadingMore ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-blue-400" />
                      <span className="text-[11px] font-semibold text-slate-300">Cargando datos completos para replay...</span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mr-4">
                        <Rewind size={14} className="text-blue-400" />
                        <span className="text-[11px] font-semibold text-slate-300 whitespace-nowrap">Punto de inicio:</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={Math.max((chartData?.length || 1) - 1, 0)}
                        value={Math.min(replayStartInput, (chartData?.length || 1) - 1)}
                        onChange={(e) => setReplayStartInput(parseInt(e.target.value))}
                        className="timeline-slider"
                      />
                      <span className="text-[10px] font-mono text-slate-400 min-w-[90px] text-center">
                        {replayStartInput.toLocaleString()} / {(chartData?.length || 0).toLocaleString()}
                      </span>
                      <button
                        onClick={handleEnterReplay}
                        className="ml-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg transition-all whitespace-nowrap"
                      >
                        GO
                      </button>
                    </>
                  )}
                </div>
              )}

              {replayActive && (
                <div className="replay-start-bar">
                  <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                    <button
                      onClick={() => jumpTo(currentIndex - 10)}
                      className="p-1 hover:text-white text-slate-400 transition-all"
                      title="-10 Velas"
                    >
                      <ArrowBigLeftDash size={16} />
                    </button>
                    <span className="text-[10px] font-mono text-slate-300 min-w-[90px] text-center">
                      {currentIndex.toLocaleString()} / {totalCandles.toLocaleString()}
                    </span>
                    <button
                      onClick={() => jumpTo(currentIndex + 10)}
                      className="p-1 hover:text-white text-slate-400 transition-all"
                      title="+10 Velas"
                    >
                      <ArrowBigRightDash size={16} />
                    </button>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={totalCandles - 1}
                    value={currentIndex}
                    onChange={(e) => jumpTo(parseInt(e.target.value))}
                    className="timeline-slider"
                  />

                  <button
                    onClick={handleExitReplay}
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-all underline decoration-rose-500/30 whitespace-nowrap"
                  >
                    SALIR REPLAY
                  </button>
                </div>
              )}
            </div>

            {replayActive && (
              <ExecutionPanel
                activePosition={activePosition}
                lotInput={lotInput}
                slPrice={slPrice}
                tpPrice={tpPrice}
                onLotInputChange={handleLotInputChange}
                onLotInputBlur={handleLotInputBlur}
                onSlChange={(e) => setSlPrice(e.target.value.replace(/[^0-9.,]/g, ''))}
                onTpChange={(e) => setTpPrice(e.target.value.replace(/[^0-9.,]/g, ''))}
                onBuy={handleBuy}
                onSell={handleSell}
                onClose={closePosition}
                metrics={metrics}
                decimals={symbolInfo?.decimals || 5}
              />
            )}

            {selectingStart && !replayActive && (
              <div className="flex gap-6">
                <div className="flex-1 metrics-card animate flex items-center justify-center gap-4 py-3" style={{ animationDelay: '0.1s' }}>
                  <Rewind size={18} className="text-blue-400" />
                  <span className="text-sm text-slate-400">
                    Mueve el slider para elegir el punto de inicio y presiona <strong className="text-blue-400">GO</strong> para comenzar el replay
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Right Sidebar */}
          <aside className="metrics-section">
            <MetricsSummary metrics={metrics} tradesCount={trades.length} />
            <TradeHistory
              trades={trades}
              replayActive={replayActive}
              decimals={symbolInfo?.decimals || 5}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
