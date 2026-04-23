import { useState, useEffect, useCallback, useRef } from 'react';
import { useChart } from '../contexts/ChartContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Minus, MousePointer2, RectangleHorizontal,
  GitBranch, Undo2, Trash2, Loader2, Rewind, Spline,
  ArrowBigLeftDash, ArrowBigRightDash, AlertTriangle, Clock, Plus, Magnet, ArrowLeftRight,
  TrendingUp, TrendingDown, Activity,
} from 'lucide-react';
import TradingChart from '../components/TradingChart';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ExecutionPanel from '../components/ExecutionPanel';
import TradeHistory from '../components/TradeHistory';
import MetricsSummary from '../components/MetricsSummary';
import FiboSettings from '../components/FiboSettings';
import SessionsSettings from '../components/SessionsSettings';
import MovingAverageSettings from '../components/MovingAverageSettings';
import RSISettings from '../components/RSISettings';
import StochasticSettings from '../components/StochasticSettings';
import { useBacktest } from '../hooks/useBacktest';
import SettingsModal from '../components/SettingsModal';
import DrawingStyleModal from '../components/DrawingStyleModal';
import TrendlineControlButton from '../components/TrendlineControlButton';
import { useSymbolState } from '../hooks/useSymbolState';
import { useRiskManager } from '../hooks/useRiskManager';
import { useDrawingState } from '../hooks/useDrawingState';
import { useReplayControls } from '../hooks/useReplayControls';

const SYMBOLS = [
  { id: 'eurusd', label: 'EUR/USD', decimals: 5, pipMult: 10000, minMove: 0.00001, pipValue: 10, defaultSL: 0.003, defaultTP: 0.006 },
  { id: 'usdjpy', label: 'USD/JPY', decimals: 3, pipMult: 100,   minMove: 0.001,   pipValue: 7,  defaultSL: 0.3,   defaultTP: 0.6 },
  { id: 'us100',  label: 'US100',   decimals: 2, pipMult: 1,     minMove: 0.01,    pipValue: 1,  defaultSL: 50,      defaultTP: 100 },
  { id: 'xauusd', label: 'XAU/USD', decimals: 2, pipMult: 10,    minMove: 0.01,    pipValue: 10, defaultSL: 3,       defaultTP: 6 },
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
    crosshairMode,
    setCrosshairMode,
    crosshairVisible,
    setCrosshairVisible,
    fiboLevels,
    setFiboLevels,
    fiboVisible,
    setFiboVisible,
    showSessions,
    setShowSessions,
    sessionsConfig,
    setSessionsConfig,
    showSessionsSettings,
    setShowSessionsSettings,
    maConfig,
    setMAConfig,
    maVisible,
    setMAVisible,
    showMASettings,
    setShowMASettings,
    rsiConfig,
    setRSIConfig,
    showRSISettings,
    setShowRSISettings,
    rsiVisible,
    setRSIVisible,
    stochConfig,
    setStochConfig,
    showStochSettings,
    setShowStochSettings,
    stochVisible,
    setStochVisible,
  } = useDrawingState();

  const [slPrice, setSlPrice] = useState('');
  const [tpPrice, setTpPrice] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCurveStyle, setSelectedCurveStyle] = useState(null);
  const [curveModalAnchor, setCurveModalAnchor] = useState(null);
  const [curveModalPosition, setCurveModalPosition] = useState(null);
  const [selectedFiboSettings, setSelectedFiboSettings] = useState(null);
  const [fiboModalAnchor, setFiboModalAnchor] = useState(null);
  const [fiboModalPosition, setFiboModalPosition] = useState(null);
  const [maModalAnchor, setMaModalAnchor] = useState(null);
  const [maModalPosition, setMaModalPosition] = useState(null);
  const [controlsOrientation, setControlsOrientation] = useState('vertical');
  const [controlsPosition, setControlsPosition] = useState({ x: 12, y: 12 });
  const chartComponentRef = useRef(null);
  const chartOverlayRef = useRef(null);
  const chartCardRef = useRef(null);
  const controlsRef = useRef(null);
  const dragModalRef = useRef({ active: false, offsetX: 0, offsetY: 0 });
  const dragFiboModalRef = useRef({ active: false, offsetX: 0, offsetY: 0 });
  const dragControlsRef = useRef({ active: false, offsetX: 0, offsetY: 0 });
  const selectedDrawingIdRef = useRef(null);

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

  const absoluteIndex = loadedRange?.startCandle == null ? currentIndex : loadedRange.startCandle + currentIndex;

  useEffect(() => {
    if (pendingReplayIndexRef.current !== null && !isLoading && !isLoadingMore && chartData?.length > 0) {
      const targetAbsIndex = pendingReplayIndexRef.current;
      pendingReplayIndexRef.current = null;
      const targetLocal = loadedRange?.startCandle == null ? targetAbsIndex : targetAbsIndex - loadedRange.startCandle;
      jumpTo(targetLocal);
    }
  }, [chartData, isLoading, isLoadingMore, loadedRange, jumpTo, pendingReplayIndexRef]);

  const handleJumpAbs = useCallback(async (targetAbsIndex) => {
    if (!meta || targetAbsIndex < 0 || targetAbsIndex >= meta.totalCandles) return;

    const targetLocal = loadedRange?.startCandle == null ? targetAbsIndex : targetAbsIndex - loadedRange.startCandle;

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

  const currentBalance = accountBalance + (metrics?.profit || 0);

  const getScaledSLTP = () => {
    const scale = TF_SL_SCALE[selectedTF] ?? 1;
    const slDist = (symbolInfo?.defaultSL ?? 0.003) * scale;
    const tpDist = (symbolInfo?.defaultTP ?? 0.006) * scale;
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
    const sl = (userSL != null && userSL < entry) ? userSL : Number.parseFloat((entry - slDist).toFixed(dec));
    const tp = (userTP != null && userTP > entry) ? userTP : Number.parseFloat((entry + tpDist).toFixed(dec));
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
    const sl = (userSL != null && userSL > entry) ? userSL : Number.parseFloat((entry + slDist).toFixed(dec));
    const tp = (userTP != null && userTP < entry) ? userTP : Number.parseFloat((entry - tpDist).toFixed(dec));
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
    setSlPrice('');
    setTpPrice('');
    setSelectedTF(tf);
  }, [selectedTF, replayActive, chartData, currentIndex, isPlaying, pausePlaying, setSelectedTF, pendingReplayTimeRef]);

  const handleSymbolChange = useCallback((symbol) => {
    setSlPrice('');
    setTpPrice('');
    setSelectedSymbol(symbol);
  }, [setSelectedSymbol]);

  const handleClosePosition = useCallback(() => {
    closePosition();
    setSlPrice('');
    setTpPrice('');
  }, [closePosition]);

  const handleSelectionChange = useCallback((selection) => {
    if (!selection) {
      setSelectedCurveStyle(null);
      setCurveModalAnchor(null);
      setSelectedFiboSettings(null);
      setFiboModalAnchor(null);
      selectedDrawingIdRef.current = null;
      return;
    }
    selectedDrawingIdRef.current = selection.id ?? null;
    if (selection.type === 'fibonacci') {
      setSelectedCurveStyle(null);
      setCurveModalAnchor(null);
      setSelectedFiboSettings({
        id: selection.id ?? null,
        levels: Array.isArray(selection.levels) && selection.levels.length > 0 ? selection.levels : fiboLevels,
      });
      setFiboModalAnchor(selection.anchor || null);
      if (selection.anchor && fiboModalPosition == null) {
        setFiboModalPosition({
          x: Math.max(12, selection.anchor.x + 12),
          y: Math.max(12, selection.anchor.y - 12),
        });
      }
      return;
    }
    if (selection.type !== 'curve' && selection.type !== 'horizontal' && selection.type !== 'trendline' && selection.type !== 'rectangle') {
      setSelectedCurveStyle(null);
      setCurveModalAnchor(null);
      setSelectedFiboSettings(null);
      setFiboModalAnchor(null);
      selectedDrawingIdRef.current = null;
      return;
    }
    setSelectedFiboSettings(null);
    setFiboModalAnchor(null);
    setSelectedCurveStyle({
      id: selection.id ?? null,
      type: selection.type,
      color: selection.color || (
        selection.type === 'horizontal'
          ? '#8b5cf6'
          : selection.type === 'rectangle'
            ? '#f59e0b'
            : '#a855f7'
      ),
      lineStyle: selection.lineStyle || 'solid',
      lineWidth: selection.lineWidth || 2,
      text: selection.text || (selection.type === 'horizontal' ? 'S/R' : ''),
      textPosition: selection.textPosition || 'above',
      textSize: selection.textSize || 11,
    });
    setCurveModalAnchor(selection.anchor || null);
    if (selection.anchor && curveModalPosition == null) {
      setCurveModalPosition({
        x: Math.max(12, selection.anchor.x + 12),
        y: Math.max(12, selection.anchor.y - 12),
      });
    }
  }, [curveModalPosition, fiboLevels, fiboModalPosition]);

  const updateSelectedCurveStyle = useCallback((patch) => {
    setSelectedCurveStyle((prev) => (prev ? { ...prev, ...patch } : prev));
    chartComponentRef.current?.updateSelectedCurveStyle({
      ...patch,
      id: selectedDrawingIdRef.current,
    });
  }, []);

  const updateSelectedFibonacciLevels = useCallback((levels) => {
    setSelectedFiboSettings((prev) => (prev ? { ...prev, levels } : prev));
    setFiboLevels(levels);
    chartComponentRef.current?.updateSelectedFibonacciLevels(levels);
  }, [setFiboLevels]);

  const handleModalPointerDown = useCallback((e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('button, input, select, textarea')) return;
    const modal = target.closest('[data-curve-modal="true"]');
    if (!(modal instanceof HTMLElement)) return;
    const overlay = chartOverlayRef.current;
    if (!(overlay instanceof HTMLElement)) return;
    const rect = modal.getBoundingClientRect();
    dragModalRef.current = {
      active: true,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    try { modal.setPointerCapture?.(e.pointerId); } catch { /* ignore unsupported browsers */ }
    e.preventDefault();
  }, []);

  const handleModalPointerMove = useCallback((e) => {
    if (!dragModalRef.current.active) return;
    const overlay = chartOverlayRef.current;
    if (!(overlay instanceof HTMLElement)) return;
    const overlayRect = overlay.getBoundingClientRect();
    setCurveModalPosition({
      x: Math.max(8, e.clientX - overlayRect.left - dragModalRef.current.offsetX),
      y: Math.max(8, e.clientY - overlayRect.top - dragModalRef.current.offsetY),
    });
  }, []);

  const handleModalPointerUp = useCallback(() => {
    dragModalRef.current.active = false;
  }, []);

  const handleFiboModalPointerDown = useCallback((e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('button, input, select, textarea')) return;
    const modal = target.closest('[data-fibo-modal="true"]');
    if (!(modal instanceof HTMLElement)) return;
    const overlay = chartOverlayRef.current;
    if (!(overlay instanceof HTMLElement)) return;
    const rect = modal.getBoundingClientRect();
    dragFiboModalRef.current = {
      active: true,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    try { modal.setPointerCapture?.(e.pointerId); } catch { /* ignore unsupported browsers */ }
    e.preventDefault();
  }, []);

  const handleFiboModalPointerMove = useCallback((e) => {
    if (!dragFiboModalRef.current.active) return;
    const overlay = chartOverlayRef.current;
    if (!(overlay instanceof HTMLElement)) return;
    const overlayRect = overlay.getBoundingClientRect();
    setFiboModalPosition({
      x: Math.max(8, e.clientX - overlayRect.left - dragFiboModalRef.current.offsetX),
      y: Math.max(8, e.clientY - overlayRect.top - dragFiboModalRef.current.offsetY),
    });
  }, []);

  const handleFiboModalPointerUp = useCallback(() => {
    dragFiboModalRef.current.active = false;
  }, []);

  const handleControlsPointerDown = useCallback((e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('button, input, select, textarea')) return;
    const controls = controlsRef.current;
    if (!(controls instanceof HTMLElement)) return;
    const rect = controls.getBoundingClientRect();
    dragControlsRef.current = {
      active: true,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    try { controls.setPointerCapture?.(e.pointerId); } catch { /* ignore unsupported browsers */ }
    e.preventDefault();
  }, []);

  const handleControlsPointerMove = useCallback((e) => {
    if (!dragControlsRef.current.active) return;
    const chartCard = chartCardRef.current;
    const controls = controlsRef.current;
    if (!(chartCard instanceof HTMLElement) || !(controls instanceof HTMLElement)) return;
    const cardRect = chartCard.getBoundingClientRect();
    const controlsRect = controls.getBoundingClientRect();
    const edgePadding = 8;
    const rightScaleSafeArea = 56;
    const bottomScaleSafeArea = 42;
    const usableWidth = Math.max(1, cardRect.width - rightScaleSafeArea);
    const usableHeight = Math.max(1, cardRect.height - bottomScaleSafeArea);
    const nextX = e.clientX - cardRect.left - dragControlsRef.current.offsetX;
    const nextY = e.clientY - cardRect.top - dragControlsRef.current.offsetY;
    const minX = edgePadding;
    const minY = edgePadding;
    const maxX = Math.max(minX, usableWidth - controlsRect.width - edgePadding);
    const maxY = Math.max(minY, usableHeight - controlsRect.height - edgePadding);

    if (controlsOrientation === 'horizontal') {
      const overflowsHorizontally = controlsRect.width > usableWidth || nextX > maxX;
      if (overflowsHorizontally) {
        setControlsOrientation('vertical');
        setControlsPosition({
          x: Math.min(maxX, Math.max(minX, nextX)),
          y: maxY,
        });
        return;
      }
    }

    setControlsPosition({
      x: Math.min(maxX, Math.max(minX, nextX)),
      y: Math.min(maxY, Math.max(minY, nextY)),
    });
  }, [controlsOrientation]);

  const handleControlsPointerUp = useCallback(() => {
    dragControlsRef.current.active = false;
  }, []);

  useEffect(() => {
    const handleWindowPointerMove = (e) => {
      handleModalPointerMove(e);
      handleFiboModalPointerMove(e);
      handleControlsPointerMove(e);
    };
    const handleWindowPointerUp = () => {
      handleModalPointerUp();
      handleFiboModalPointerUp();
      handleControlsPointerUp();
    };
    globalThis.addEventListener('pointermove', handleWindowPointerMove);
    globalThis.addEventListener('pointerup', handleWindowPointerUp);
    globalThis.addEventListener('pointercancel', handleWindowPointerUp);
    return () => {
      globalThis.removeEventListener('pointermove', handleWindowPointerMove);
      globalThis.removeEventListener('pointerup', handleWindowPointerUp);
      globalThis.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [
    handleControlsPointerMove,
    handleControlsPointerUp,
    handleFiboModalPointerMove,
    handleFiboModalPointerUp,
    handleModalPointerMove,
    handleModalPointerUp,
  ]);

  useEffect(() => {
    const clampControlsInsideChart = () => {
      const chartCard = chartCardRef.current;
      const controls = controlsRef.current;
      if (!(chartCard instanceof HTMLElement) || !(controls instanceof HTMLElement)) return;
      const edgePadding = 8;
      const rightScaleSafeArea = 56;
      const bottomScaleSafeArea = 42;
      const usableWidth = Math.max(1, chartCard.clientWidth - rightScaleSafeArea);
      const usableHeight = Math.max(1, chartCard.clientHeight - bottomScaleSafeArea);
      const maxX = Math.max(edgePadding, usableWidth - controls.offsetWidth - edgePadding);
      const maxY = Math.max(edgePadding, usableHeight - controls.offsetHeight - edgePadding);
      setControlsPosition((prev) => ({
        x: Math.min(maxX, Math.max(edgePadding, prev.x)),
        y: Math.min(maxY, Math.max(edgePadding, prev.y)),
      }));
    };

    const rafId = requestAnimationFrame(clampControlsInsideChart);
    globalThis.addEventListener('resize', clampControlsInsideChart);
    return () => {
      cancelAnimationFrame(rafId);
      globalThis.removeEventListener('resize', clampControlsInsideChart);
    };
  }, [controlsOrientation]);

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
          onSymbolChange={handleSymbolChange}
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
            <div className="chart-card animate" ref={chartCardRef}>
              <div
                ref={controlsRef}
                className={`chart-controls ${controlsOrientation === 'horizontal' ? 'is-horizontal' : ''}`}
                style={{ left: `${controlsPosition.x}px`, top: `${controlsPosition.y}px` }}
                onPointerDown={handleControlsPointerDown}
                onPointerUp={handleControlsPointerUp}
                onPointerCancel={handleControlsPointerUp}
              >
                <button
                  onClick={() => setControlsOrientation((prev) => (prev === 'vertical' ? 'horizontal' : 'vertical'))}
                  className={`control-btn ${controlsOrientation === 'horizontal' ? 'active' : ''}`}
                  title="Alternar menú horizontal/vertical"
                >
                  <ArrowLeftRight size={16} />
                </button>
                <div className="controls-divider" />
                <button
                  onClick={() => {
                    setDrawingMode(null);
                    setCrosshairVisible(false);
                  }}
                  className={`control-btn ${drawingMode === null && !crosshairVisible ? 'active' : ''}`}
                  title="Puntero (sin cruz)"
                >
                  <MousePointer2 size={18} />
                </button>
                <button
                  onClick={() => {
                    setDrawingMode(null);
                    setCrosshairVisible(true);
                  }}
                  className={`control-btn ${drawingMode === null && crosshairVisible ? 'active' : ''}`}
                  title="Cruz libre"
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={() => {
                    setDrawingMode(null);
                    setCrosshairMode(crosshairMode === 1 ? 0 : 1);
                  }}
                  className={`control-btn ${crosshairMode === 1 ? 'active' : ''}`}
                  title="Snap"
                >
                  <Magnet size={16} />
                </button>
                <div className="controls-divider" />
                <button
                  onClick={() => setDrawingMode(drawingMode === 'horizontal' ? null : 'horizontal')}
                  className={`control-btn ${drawingMode === 'horizontal' ? 'active' : ''}`}
                  title="Línea horizontal (S/R)"
                >
                  <Minus size={18} />
                </button>
                <TrendlineControlButton
                  drawingMode={drawingMode}
                  onToggle={() => setDrawingMode(drawingMode === 'trendline' ? null : 'trendline')}
                />
                <button
                  onClick={() => setDrawingMode(drawingMode === 'rectangle' ? null : 'rectangle')}
                  className={`control-btn ${drawingMode === 'rectangle' ? 'active' : ''}`}
                  title="Zona / Rectángulo"
                >
                  <RectangleHorizontal size={18} />
                </button>
                <button
                  onClick={() => setDrawingMode(drawingMode === 'curve' ? null : 'curve')}
                  className={`control-btn ${drawingMode === 'curve' ? 'active' : ''}`}
                  title="Curva (3 clics: inicio, final, punto medio)"
                >
                  <Spline size={18} />
                </button>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => { if (e.detail >= 2) return; setFiboVisible(v => !v); }}
                    onDoubleClick={() => setDrawingMode(drawingMode === 'fibonacci' ? null : 'fibonacci')}
                    className={`control-btn ${fiboVisible ? 'active' : ''}`}
                    title="Clic: Fibonacci (Mostrar/Ocultar) | Doble Clic: Dibujar"
                  >
                    <GitBranch size={18} />
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => { if (e.detail >= 2) return; setShowSessions(v => !v); }}
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
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => { if (e.detail >= 2) return; setMAVisible(v => !v); }}
                    onDoubleClick={() => setShowMASettings(true)}
                    className={`control-btn ${maVisible ? 'active' : ''}`}
                    title="Clic: Medias Móviles (Mostrar/Ocultar) | Doble Clic: Configurar"
                  >
                    <TrendingUp size={16} />
                  </button>
                  {showMASettings && (
                    <div style={{ position: 'absolute', left: '100%', top: 0, marginLeft: '8px', zIndex: 1000 }}>
                      <MovingAverageSettings
                        config={maConfig}
                        onChange={(cfg) => { setMAConfig(cfg); setMAVisible(cfg.length > 0); }}
                        onClose={() => setShowMASettings(false)}
                      />
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => { if (e.detail >= 2) return; setRSIVisible(v => !v); }}
                    onDoubleClick={() => setShowRSISettings(true)}
                    className={`control-btn ${rsiVisible ? 'active' : ''}`}
                    title="Clic: RSI (Mostrar/Ocultar) | Doble Clic: Configurar"
                  >
                    <TrendingDown size={16} />
                  </button>
                  {showRSISettings && (
                    <div style={{ position: 'absolute', left: '100%', top: 0, marginLeft: '8px', zIndex: 1000 }}>
                      <RSISettings
                        config={rsiConfig}
                        onChange={(cfg) => { setRSIConfig(cfg); setRSIVisible(!!cfg?.period); }}
                        onClose={() => setShowRSISettings(false)}
                      />
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => { if (e.detail >= 2) return; setStochVisible(v => !v); }}
                    onDoubleClick={() => setShowStochSettings(true)}
                    className={`control-btn ${stochVisible ? 'active' : ''}`}
                    title="Clic: Estocástico (Mostrar/Ocultar) | Doble Clic: Configurar"
                  >
                    <Activity size={16} />
                  </button>
                  {showStochSettings && (
                    <div style={{ position: 'absolute', left: '100%', top: 0, marginLeft: '8px', zIndex: 1000 }}>
                      <StochasticSettings
                        config={stochConfig}
                        onChange={(cfg) => { setStochConfig(cfg); setStochVisible(!!cfg?.kPeriod); }}
                        onClose={() => setShowStochSettings(false)}
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

              <div id="chart-container" ref={chartOverlayRef} className="w-full h-full" style={{ position: 'relative' }}>
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

                <DrawingStyleModal
                  selectedStyle={selectedCurveStyle}
                  modalPosition={curveModalPosition}
                  modalAnchor={curveModalAnchor}
                  onPointerDown={handleModalPointerDown}
                  onPointerMove={handleModalPointerMove}
                  onPointerUp={handleModalPointerUp}
                  onClose={() => {
                    setSelectedCurveStyle(null);
                    setCurveModalAnchor(null);
                    chartComponentRef.current?.clearSelection();
                  }}
                  onChangeStyle={updateSelectedCurveStyle}
                />

                {selectedFiboSettings && (
                  <div
                    data-fibo-modal="true"
                    style={{
                      position: 'absolute',
                      left: `${typeof fiboModalPosition?.x === 'number' ? fiboModalPosition.x : Math.max(12, (fiboModalAnchor?.x ?? 0) + 12)}px`,
                      top: `${typeof fiboModalPosition?.y === 'number' ? fiboModalPosition.y : Math.max(12, (fiboModalAnchor?.y ?? 0) - 12)}px`,
                      zIndex: 20,
                    }}
                    onPointerDown={handleFiboModalPointerDown}
                    onPointerMove={handleFiboModalPointerMove}
                    onPointerUp={handleFiboModalPointerUp}
                    onPointerCancel={handleFiboModalPointerUp}
                  >
                    <FiboSettings
                      key={selectedFiboSettings.id ?? 'fibo-selected'}
                      levels={selectedFiboSettings.levels}
                      onChange={updateSelectedFibonacciLevels}
                      onClose={() => {
                        setSelectedFiboSettings(null);
                        setFiboModalAnchor(null);
                        chartComponentRef.current?.clearSelection();
                      }}
                    />
                  </div>
                )}

                <TradingChart
                  ref={chartComponentRef}
                  data={visibleData}
                  drawingMode={drawingMode}
                  activePosition={activePosition}
                  focusIndex={absoluteIndex}
                  priceDecimals={symbolInfo?.decimals || 5}
                  minMove={symbolInfo?.minMove || 0.00001}
                  pipMultiplier={symbolInfo?.pipMult || 10000}
                  lotSize={lotSize}
                  pipValue={symbolInfo?.pipValue || 10}
                  onSLTPDrag={handleSLTPDrag}
                  onNeedMoreData={replayActive ? undefined : handleNeedMoreData}
                  dataKey={`${selectedSymbol}-${selectedTF}-${loadedRange?.start}-${loadedRange?.end}`}
                  fiboLevels={fiboVisible ? fiboLevels : []}
                  showSessions={showSessions}
                  sessionsConfig={sessionsConfig}
                  crosshairMode={crosshairMode}
                  crosshairVisible={crosshairVisible}
                  maConfig={maVisible ? maConfig : []}
                  rsiConfig={rsiConfig}
                  rsiVisible={rsiVisible}
                  stochConfig={stochConfig}
                  stochVisible={stochVisible}
                  onDrawingComplete={() => setDrawingMode(null)}
                  onSelectionChange={handleSelectionChange}
                />

                {isLoadingMore && (
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg backdrop-blur-md">
                    <Loader2 size={14} className="animate-spin text-blue-400" />
                    <span className="text-[11px] font-semibold text-blue-300">Cargando más datos...</span>
                  </div>
                )}
              </div>

            {replayActive && (
              <div className="replay-start-bar flex-wrap">
                <div className="flex items-center gap-1 md:gap-2 pr-2 md:pr-4 border-r border-white/10 shrink-0">
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
                  onChange={(e) => handleJumpAbs(Number.parseInt(e.target.value, 10))}
                  className="timeline-slider flex-1 min-w-[150px]"
                />

                <button
                  onClick={handleExitReplay}
                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-all underline decoration-rose-500/30 whitespace-nowrap shrink-0"
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
                onSlChange={(e) => setSlPrice(e.target.value.replaceAll(/[^0-9.,]/g, ''))}
                onTpChange={(e) => setTpPrice(e.target.value.replaceAll(/[^0-9.,]/g, ''))}
                onBuy={handleBuy}
                onSell={handleSell}
                onClose={handleClosePosition}
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
            </div>
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
