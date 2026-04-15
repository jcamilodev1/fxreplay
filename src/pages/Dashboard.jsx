import { useState, useEffect, useCallback, useRef } from 'react';
import { useChart } from '../contexts/ChartContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Minus, MousePointer2, TrendingUp, RectangleHorizontal,
  GitBranch, Undo2, Trash2, Loader2, Rewind,
  ArrowBigLeftDash, ArrowBigRightDash, AlertTriangle, Clock,
} from 'lucide-react';
import TradingChart from '../components/TradingChart';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ExecutionPanel from '../components/ExecutionPanel';
import TradeHistory from '../components/TradeHistory';
import MetricsSummary from '../components/MetricsSummary';
import FiboSettings from '../components/FiboSettings';
import SessionsSettings from '../components/SessionsSettings';
import { useBacktest } from '../hooks/useBacktest';
import SettingsModal from '../components/SettingsModal';
import { useSymbolState } from '../hooks/useSymbolState';
import { useRiskManager } from '../hooks/useRiskManager';
import { useDrawingState } from '../hooks/useDrawingState';
import { useReplayControls } from '../hooks/useReplayControls';

const SYMBOLS = [
  { id: 'eurusd', label: 'EUR/USD', decimals: 5, pipMult: 10000, minMove: 0.00001, pipValue: 10, defaultSL: 0.00300, defaultTP: 0.00600 },
  { id: 'usdjpy', label: 'USD/JPY', decimals: 3, pipMult: 100,   minMove: 0.001,   pipValue: 7,  defaultSL: 0.300,   defaultTP: 0.600 },
  { id: 'us100',  label: 'US100',   decimals: 2, pipMult: 1,     minMove: 0.01,    pipValue: 1,  defaultSL: 50,      defaultTP: 100 },
  { id: 'xauusd', label: 'XAU/USD', decimals: 2, pipMult: 10,    minMove: 0.01,    pipValue: 10, defaultSL: 3.00,    defaultTP: 6.00 },
];

const TF_SL_SCALE = {
  M1: 0.15, M5: 0.3, M15: 0.5, M30: 0.7,
  H1: 1, H4: 2, D1: 5, W1: 10,
};

function Dashboard() {
  const { logout } = useAuth();
  const {
    data: chartData,
    meta,
    isLoading,
    isLoadingMore,
    loadError,
    loadedRange,
    loadSymbol,
    loadNewerChunks,
    loadAllChunks,
    loadChunksForRange,
    loadChunkForTime,
    handleNeedMoreData,
    pendingReplayTimeRef,
    pendingReplayIndexRef,
  } = useChart();

  const {
    selectedSymbol,
    setSelectedSymbol,
    selectedTF,
    setSelectedTF,
    replayStartInput,
    setReplayStartInput,
    selectingStart,
    setSelectingStart,
    handleShowSelector,
    handleCancelSelector,
  } = useSymbolState();

  const symbolInfo = SYMBOLS.find(s => s.id === selectedSymbol);

  const {
    lotSize,
    setLotSize,
    lotInput,
    setLotInput,
    riskMode,
    setRiskMode,
    riskPercentInput,
    accountBalance,
    balanceInput,
    parsePrice,
    calcLotFromPercent,
    handleLotInputChange,
    handleLotInputBlur,
    handleRiskPercentChange,
    handleRiskPercentBlur,
    handleBalanceChange,
    handleBalanceBlur,
    handleSaveSettings,
  } = useRiskManager();

  const {
    drawingMode,
    setDrawingMode,
    fiboLevels,
    setFiboLevels,
    showFiboSettings,
    setShowFiboSettings,
    showSessions,
    setShowSessions,
    sessionsConfig,
    setSessionsConfig,
    showSessionsSettings,
    setShowSessionsSettings,
  } = useDrawingState();

  const [slPrice, setSlPrice] = useState('');
  const [tpPrice, setTpPrice] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const chartComponentRef = useRef(null);

  useEffect(() => {
    loadSymbol(selectedSymbol, selectedTF);
  }, [selectedSymbol, selectedTF, loadSymbol]);

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
    setReplayIndex,
  } = useBacktest(chartData, selectedSymbol, symbolInfo?.pipMult || 10000, lotSize, symbolInfo?.pipValue || 10, accountBalance);

  useReplayControls({
    stepForward,
    stepBackward,
    isPlaying,
    pausePlaying,
    startPlaying,
    replayActive,
    exitReplay,
    selectingStart,
  });

  const absoluteIndex = loadedRange?.startCandle != null ? loadedRange.startCandle + currentIndex : currentIndex;

  useEffect(() => {
    if (pendingReplayIndexRef.current !== null && !isLoading && !isLoadingMore && chartData?.length > 0) {
      const targetAbsIndex = pendingReplayIndexRef.current;
      pendingReplayIndexRef.current = null;
      const targetLocal = loadedRange?.startCandle != null ? targetAbsIndex - loadedRange.startCandle : targetAbsIndex;
      jumpTo(targetLocal);
    }
  }, [chartData, isLoading, isLoadingMore, loadedRange, jumpTo, pendingReplayIndexRef]);

  const handleJumpAbs = useCallback(async (targetAbsIndex) => {
    if (!meta || targetAbsIndex < 0 || targetAbsIndex >= meta.totalCandles) return;

    const targetLocal = loadedRange?.startCandle != null ? targetAbsIndex - loadedRange.startCandle : targetAbsIndex;

    if (targetLocal < 0 || targetLocal >= (chartData?.length || 0)) {
       pausePlaying();
       pendingReplayIndexRef.current = targetAbsIndex;
       const chunkSize = meta.chunkSize;
       const startChunk = Math.floor(targetAbsIndex / chunkSize);
       const firstChunk = Math.max(0, startChunk - 1);
       const endChunk = startChunk + 1;
       const startCandle = firstChunk * chunkSize;
       const endCandle = Math.min(meta.totalCandles - 1, (endChunk + 1) * chunkSize - 1);
       await loadChunksForRange(startCandle, endCandle);
    } else {
       jumpTo(targetLocal);
    }
  }, [meta, loadedRange, chartData, pausePlaying, loadChunksForRange, jumpTo, pendingReplayIndexRef]);

  useEffect(() => {
    setSlPrice('');
    setTpPrice('');
  }, [selectedSymbol, selectedTF]);

  useEffect(() => {
    if (!activePosition) {
      setSlPrice('');
      setTpPrice('');
    }
  }, [activePosition]);

  const currentBalance = accountBalance + (metrics?.profit || 0);

  const getScaledSLTP = () => {
    const scale = TF_SL_SCALE[selectedTF] ?? 1;
    const slDist = (symbolInfo?.defaultSL ?? 0.00300) * scale;
    const tpDist = (symbolInfo?.defaultTP ?? 0.00600) * scale;
    return { slDist, tpDist };
  };

  const handleBuy = () => {
    if (!chartData?.length) return;
    const entry = chartData[currentIndex]?.close;
    if (!entry) return;
    const dec = symbolInfo?.decimals || 5;
    const { slDist, tpDist } = getScaledSLTP();

    const userSL = parsePrice(slPrice);
    const userTP = parsePrice(tpPrice);
    const sl = (userSL != null && userSL < entry) ? userSL : parseFloat((entry - slDist).toFixed(dec));
    const tp = (userTP != null && userTP > entry) ? userTP : parseFloat((entry + tpDist).toFixed(dec));
    setSlPrice(sl.toFixed(dec));
    setTpPrice(tp.toFixed(dec));

    if (riskMode === 'percent') {
      const lots = calcLotFromPercent(Math.abs(entry - sl), currentBalance, symbolInfo);
      setLotSize(lots);
      setLotInput(lots.toString());
    }
    executeBuyHook(sl, tp);
  };

  const handleSell = () => {
    if (!chartData?.length) return;
    const entry = chartData[currentIndex]?.close;
    if (!entry) return;
    const dec = symbolInfo?.decimals || 5;
    const { slDist, tpDist } = getScaledSLTP();

    const userSL = parsePrice(slPrice);
    const userTP = parsePrice(tpPrice);
    const sl = (userSL != null && userSL > entry) ? userSL : parseFloat((entry + slDist).toFixed(dec));
    const tp = (userTP != null && userTP < entry) ? userTP : parseFloat((entry - tpDist).toFixed(dec));
    setSlPrice(sl.toFixed(dec));
    setTpPrice(tp.toFixed(dec));

    if (riskMode === 'percent') {
      const lots = calcLotFromPercent(Math.abs(sl - entry), currentBalance, symbolInfo);
      setLotSize(lots);
      setLotInput(lots.toString());
    }
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
  }, [selectedTF, replayActive, chartData, currentIndex, isPlaying, pausePlaying, setSelectedTF, pendingReplayTimeRef]);

  useEffect(() => {
    if (!pendingReplayTimeRef.current || isLoading || isLoadingMore) return;
    if (!chartData || chartData.length === 0) return;

    const targetTime = pendingReplayTimeRef.current;

    let closestIdx = -1;
    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].time <= targetTime) {
        closestIdx = i;
      } else {
        break;
      }
    }

    const isPastEarliest = chartData[0].time > targetTime;

    if (!isPastEarliest && closestIdx !== -1) {
      pendingReplayTimeRef.current = null;
      setReplayIndex(closestIdx);
      return;
    }

    if (isPastEarliest) {
      loadChunkForTime(targetTime).then(success => {
        if (!success) {
          pendingReplayTimeRef.current = null;
          setReplayIndex(0);
        }
      });
    } else if (closestIdx !== -1) {
      pendingReplayTimeRef.current = null;
      setReplayIndex(closestIdx);
    }
  }, [chartData, isLoading, isLoadingMore, loadChunkForTime, setReplayIndex, pendingReplayTimeRef]);

  useEffect(() => {
    if (replayActive && chartData && chartData.length > 0) {
      if (currentIndex >= chartData.length - 1000) {
        if (!isLoadingMore) {
          loadNewerChunks(2);
        }
      }
    }
  }, [replayActive, currentIndex, chartData, isLoadingMore, loadNewerChunks]);

  const handleEnterReplay = useCallback(() => {
    const total = chartData?.length || 0;
    if (total === 0) return;
    const startIdx = Math.max(0, Math.min(replayStartInput, total - 1));
    enterReplay(startIdx);
    setSelectingStart(false);
  }, [replayStartInput, chartData, enterReplay, setSelectingStart]);

  const handleExitReplay = useCallback(() => {
    exitReplay();
    setSelectingStart(false);
  }, [exitReplay, setSelectingStart]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="app-container">
      <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />

      <main className="main-wrapper">
        <Header
          selectedSymbol={selectedSymbol}
          selectedTF={selectedTF}
          onSymbolChange={setSelectedSymbol}
          onTFChange={replayActive ? handleTFChange : setSelectedTF}
          totalCandles={totalCandles}
          currentIndex={absoluteIndex}
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
          onShowSelector={() => handleShowSelector(meta, loadAllChunks)}
          onCancelSelector={handleCancelSelector}
          onLogout={handleLogout}
          currentBalance={currentBalance}
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
                  onClick={() => setDrawingMode(drawingMode === 'rectangle' ? null : 'rectangle')}
                  className={`control-btn ${drawingMode === 'rectangle' ? 'active' : ''}`}
                  title="Zona / Rectángulo"
                >
                  <RectangleHorizontal size={18} />
                </button>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setDrawingMode(drawingMode === 'fibonacci' ? null : 'fibonacci')}
                    onDoubleClick={() => setShowFiboSettings(v => !v)}
                    className={`control-btn ${drawingMode === 'fibonacci' ? 'active' : ''}`}
                    title="Clic: Fibonacci | Doble Clic: Configurar"
                  >
                    <GitBranch size={18} />
                  </button>
                  {showFiboSettings && (
                    <div style={{ position: 'absolute', left: '100%', top: 0, marginLeft: '8px', zIndex: 1000 }}>
                      <FiboSettings
                        levels={fiboLevels}
                        onChange={setFiboLevels}
                        onClose={() => setShowFiboSettings(false)}
                      />
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowSessions(v => !v)}
                    onDoubleClick={() => setShowSessionsSettings(v => !v)}
                    className={`control-btn ${showSessions ? 'active' : ''}`}
                    title="Clic: Sesiones (Alternar) | Doble Clic: Configurar"
                  >
                    <Clock size={16} />
                  </button>
                  {showSessionsSettings && (
                    <div style={{ position: 'absolute', left: '100%', top: 0, marginLeft: '8px', zIndex: 1000 }}>
                      <SessionsSettings
                        config={sessionsConfig}
                        onChange={setSessionsConfig}
                        onClose={() => setShowSessionsSettings(false)}
                      />
                    </div>
                  )}
                </div>
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
                  fiboLevels={fiboLevels}
                  pipMultiplier={symbolInfo?.pipMult || 10000}
                  lotSize={lotSize}
                  pipValue={symbolInfo?.pipValue || 10}
                  showSessions={showSessions}
                  sessionsConfig={sessionsConfig}
                />
              </div>

              {isLoadingMore && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg backdrop-blur-md">
                  <Loader2 size={14} className="animate-spin text-blue-400" />
                  <span className="text-[11px] font-semibold text-blue-300">Cargando más datos...</span>
                </div>
              )}
            </div>

            {selectingStart && !replayActive && (
              <div className="replay-start-bar flex-wrap">
                {isLoadingMore ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-blue-400" />
                    <span className="text-[11px] font-semibold text-slate-300">Cargando datos completos para replay...</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 md:mr-4 flex-shrink-0">
                      <Rewind size={14} className="text-blue-400 hidden sm:block" />
                      <span className="text-[10px] md:text-[11px] font-semibold text-slate-300 whitespace-nowrap">Punto de inicio:</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={Math.max((chartData?.length || 1) - 1, 0)}
                      value={Math.min(replayStartInput, (chartData?.length || 1) - 1)}
                      onChange={(e) => setReplayStartInput(parseInt(e.target.value))}
                      className="timeline-slider flex-1 min-w-[150px]"
                    />
                    <span className="text-[10px] font-mono text-slate-400 min-w-[70px] md:min-w-[90px] text-center flex-shrink-0">
                      {replayStartInput.toLocaleString()} / {(chartData?.length || 0).toLocaleString()}
                    </span>
                    <button
                      onClick={handleEnterReplay}
                      className="md:ml-2 px-3 md:px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] md:text-[11px] font-bold rounded-lg transition-all whitespace-nowrap flex-shrink-0"
                    >
                      GO
                    </button>
                  </>
                )}
              </div>
            )}

            {replayActive && (
              <div className="replay-start-bar flex-wrap">
                <div className="flex items-center gap-1 md:gap-2 pr-2 md:pr-4 border-r border-white/10 flex-shrink-0">
                  <button
                    onClick={() => handleJumpAbs(absoluteIndex - 10)}
                    className="p-1 hover:text-white text-slate-400 transition-all"
                    title="-10 Velas"
                  >
                    <ArrowBigLeftDash size={16} />
                  </button>
                  <span className="text-[10px] font-mono text-slate-300 min-w-[70px] md:min-w-[90px] text-center">
                    {absoluteIndex.toLocaleString()} / {totalCandles.toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleJumpAbs(absoluteIndex + 10)}
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
                  value={absoluteIndex}
                  onChange={(e) => handleJumpAbs(parseInt(e.target.value))}
                  className="timeline-slider flex-1 min-w-[150px]"
                />

                <button
                  onClick={handleExitReplay}
                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-all underline decoration-rose-500/30 whitespace-nowrap flex-shrink-0"
                >
                  SALIR
                </button>
              </div>
            )}

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
                riskMode={riskMode}
                onRiskModeChange={setRiskMode}
                riskPercentInput={riskPercentInput}
                onRiskPercentChange={handleRiskPercentChange}
                onRiskPercentBlur={handleRiskPercentBlur}
                balanceInput={balanceInput}
                onBalanceChange={handleBalanceChange}
                onBalanceBlur={handleBalanceBlur}
                currentBalance={currentBalance}
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

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialBalance={accountBalance}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

export default Dashboard;
