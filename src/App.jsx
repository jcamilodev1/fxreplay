import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, 
  Pause, 
  TrendingUp, 
  Minus,
  MousePointer2,
  LayoutDashboard, 
  History, 
  BarChart3, 
  Settings,
  DollarSign,
  Target,
  ArrowDownCircle,
  Activity,
  ChevronLeft,
  ChevronRight,
  XCircle,
  ShoppingBag,
  Gauge,
  ArrowBigLeftDash,
  ArrowBigRightDash,
  Loader2,
  Rewind,
  LogOut,
  MoveUpRight,
  Trash2,
  Undo2,
  GitBranch,
} from 'lucide-react';
import TradingChart from './components/TradingChart';
import { useBacktest } from './hooks/useBacktest';
import { useChunkedData } from './hooks/useChunkedData';

const SYMBOLS = [
  { id: 'eurusd', label: 'EUR/USD', decimals: 5, pipMult: 10000, minMove: 0.00001, pipValue: 10, defaultSL: 0.00300, defaultTP: 0.00600 },
  { id: 'usdjpy', label: 'USD/JPY', decimals: 3, pipMult: 100,   minMove: 0.001,   pipValue: 7,  defaultSL: 0.300,   defaultTP: 0.600 },
  { id: 'us100',  label: 'US100',   decimals: 2, pipMult: 1,     minMove: 0.01,    pipValue: 1,  defaultSL: 50,      defaultTP: 100 },
];

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];

const StatItem = ({ label, value, color, icon: Icon }) => (
  <div className="stat-row">
    <div className="flex items-center gap-3">
      {Icon && <div className="p-2 rounded-lg bg-white/5 text-slate-400"><Icon size={14} /></div>}
      <span className="stat-name">{label}</span>
    </div>
    <span className="stat-value" style={{ color: color || 'var(--text-main)' }}>{value}</span>
  </div>
);

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
    loadChunksForRange,
  } = useChunkedData();

  useEffect(() => {
    loadSymbol(selectedSymbol, selectedTF);
  }, [selectedSymbol, selectedTF]);


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

  const replayProgressPct = replayActive && totalCandles > 0
    ? ((currentIndex / (totalCandles - 1)) * 100).toFixed(1)
    : 0;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-area">
          <div className="logo-icon">
            <Activity className="text-white" size={24} />
          </div>
          <div className="brand-name">
            <h1>FX Replay</h1>
            <p>Backtesting Pro</p>
          </div>
        </div>

        <nav className="nav-section">
          <div className="nav-link active">
            <LayoutDashboard size={18} />
            Dashboard
          </div>
          <div className="nav-link">
            <BarChart3 size={18} />
            Analizador
          </div>
          <div className="nav-link">
            <History size={18} />
            Historial
          </div>
          <div className="nav-link">
            <Settings size={18} />
            Configuración
          </div>
        </nav>

        <div className="mt-auto p-4 bg-white/5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-500 to-purple-500" />
            <div>
              <div className="text-sm font-bold">Trader Pro</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-tighter">Premium Plan</div>
            </div>
          </div>
          <button className="w-full py-2 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-600/30 transition-all border border-blue-500/20">
            Mejorar Plan
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="main-wrapper">
        <header className="header">
          <div className="flex items-center gap-4">
            {/* Symbol selector */}
            <div className="selector-group">
              {SYMBOLS.map(s => (
                <button
                  key={s.id}
                  onClick={() => { if (!replayActive) setSelectedSymbol(s.id); }}
                  className={`selector-btn ${selectedSymbol === s.id ? 'active' : ''} ${replayActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Timeframe selector */}
            <div className="selector-group">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf}
                  onClick={() => replayActive ? handleTFChange(tf) : setSelectedTF(tf)}
                  className={`selector-btn tf ${selectedTF === tf ? 'active' : ''}`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Status pills */}
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
                <span className="pill-value">${(10000 + parseFloat(metrics.profit)).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Header right controls */}
          <div className="flex items-center gap-2">
            {replayActive ? (
              <>
                {/* Replay step controls */}
                <div className="flex items-center bg-white/5 rounded-lg border border-white/5 p-1 mr-1">
                  <button onClick={stepBackward} className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 transition-all" title="Vela anterior (←)">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={stepForward} className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 transition-all" title="Vela siguiente (→)">
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Speed control */}
                <div className="flex items-center bg-white/5 rounded-lg border border-white/5 p-1 mr-1 gap-1 px-2">
                  <Gauge size={14} className="text-slate-500" />
                  <select 
                    value={replaySpeed} 
                    onChange={(e) => setReplaySpeed(parseInt(e.target.value))}
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

                {/* Play/Pause */}
                <button 
                  onClick={() => isPlaying ? pausePlaying() : startPlaying()}
                  className={`btn-primary ${isPlaying ? 'btn-danger' : ''}`}
                  title="Reproducir/Pausar (Espacio)"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  {isPlaying ? 'Pausar' : 'Play'}
                </button>

                {/* Exit replay */}
                <button onClick={() => { exitReplay(); setSelectingStart(false); }} className="btn-icon hover:bg-rose-500/20! hover:text-rose-400! hover:border-rose-500/30!" title="Salir del Replay (Esc)">
                  <LogOut size={18} />
                </button>
              </>
            ) : selectingStart ? (
              <button 
                onClick={handleCancelSelector}
                className="btn-icon"
                title="Cancelar (Esc)"
              >
                <XCircle size={18} />
              </button>
            ) : (
              <button 
                onClick={handleShowSelector}
                className="btn-primary"
                title="Activar Replay"
              >
                <Rewind size={18} />
                Iniciar Replay
              </button>
            )}
          </div>
        </header>

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

              {/* Loading more indicator */}
              {isLoadingMore && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg backdrop-blur-md">
                  <Loader2 size={14} className="animate-spin text-blue-400" />
                  <span className="text-[11px] font-semibold text-blue-300">Cargando más datos...</span>
                </div>
              )}

              {/* Bottom bar: only during selection or replay */}
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
                    onClick={() => { exitReplay(); setSelectingStart(false); }}
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-all underline decoration-rose-500/30 whitespace-nowrap"
                  >
                    SALIR REPLAY
                  </button>
                </div>
              )}
            </div>
            
            {/* Execution Controls & Risk Management - only in replay mode */}
            {replayActive && (
              <div className="flex gap-6">
                <div className="flex-2 metrics-card animate flex items-center gap-6" style={{ animationDelay: '0.1s' }}>
                  <div className="risk-input-group">
                    <div className="risk-field">
                      <label>Lotaje</label>
                      <input
                        type="text"
                        value={lotInput}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, '');
                          setLotInput(raw);
                          const num = parseFloat(raw);
                          if (!isNaN(num) && num > 0) setLotSize(num);
                        }}
                        onBlur={() => {
                          const num = parseFloat(lotInput);
                          if (isNaN(num) || num <= 0) {
                            setLotInput('0.01');
                            setLotSize(0.01);
                          } else {
                            setLotInput(num.toString());
                          }
                        }}
                        placeholder="0.01"
                        className="lot-input"
                      />
                    </div>
                    <div className="risk-field">
                      <label>Stop Loss</label>
                      <input 
                        type="text" 
                        value={slPrice} 
                        onChange={(e) => setSlPrice(e.target.value.replace(/[^0-9.,]/g, ''))}
                        placeholder="Ej: 1.05200"
                      />
                    </div>
                    <div className="risk-field">
                      <label>Take Profit</label>
                      <input 
                        type="text" 
                        value={tpPrice} 
                        onChange={(e) => setTpPrice(e.target.value.replace(/[^0-9.,]/g, ''))}
                        placeholder="Ej: 1.05600"
                      />
                    </div>
                  </div>

                  <div className="flex-1 flex gap-3">
                    {!activePosition ? (
                      <>
                        <button 
                          onClick={handleBuy}
                          className="flex-1 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-1 group"
                        >
                          <ShoppingBag size={20} className="group-hover:scale-110 transition-transform" /> 
                          <span className="text-xs">MARKET BUY</span>
                        </button>
                        <button 
                          onClick={handleSell}
                          className="flex-1 py-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-1 group"
                        >
                          <XCircle size={20} className="group-hover:scale-110 transition-transform" /> 
                          <span className="text-xs">MARKET SELL</span>
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={closePosition}
                        className="flex-1 py-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-xl font-bold transition-all flex items-center justify-center gap-3 group"
                      >
                        <div className="flex flex-col items-start">
                          <span className="text-[10px] opacity-70">POSICIÓN ACTIVA · {activePosition.lotSize} lots</span>
                          <span className="text-lg">CERRAR {activePosition.type}</span>
                        </div>
                        <div className="w-px h-8 bg-amber-500/20" />
                        <div className="text-xl font-mono">
                          @{activePosition?.entry?.toFixed(symbolInfo?.decimals || 5) || '0.00000'}
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 metrics-card animate flex flex-col justify-center" style={{ animationDelay: '0.2s' }}>
                  <div className="stat-name uppercase text-[10px] font-bold tracking-widest mb-1">Profit Actual</div>
                  <div className="text-2xl font-bold font-mono" style={{ color: parseFloat(metrics.profit) >= 0 ? 'var(--bull)' : 'var(--bear)' }}>
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
            )}

            {/* Info bar when selecting start point */}
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
            <div className="metrics-card animate">
              <div className="card-title">
                Resumen Ejecutivo
                <Settings size={14} className="opacity-40" />
              </div>
              <StatItem label="Beneficio Bruto" value={`$${(parseFloat(metrics.profit) * 1.2).toFixed(2)}`} icon={DollarSign} />
              <StatItem label="Total Trades" value={trades.length} icon={Target} />
              <StatItem label="Pérdida Máx" value={`-$${(parseFloat(metrics.profit) * -0.15).toFixed(2)}`} icon={ArrowDownCircle} color="var(--bear)" />
            </div>

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
                    price={trade.entry.toFixed(symbolInfo?.decimals || 5)} 
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
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
