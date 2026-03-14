import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { calculateMetrics } from '../utils/backtestEngine';

const EMPTY_DATA = [];
const INITIAL_METRICS = { profit: 0, winRate: 0, drawdown: 0, grossProfit: 0, grossLoss: 0, maxLoss: 0 };

export const useBacktest = (fullData, dataKey, pipMultiplier = 10000, lotSize = 0.01, pipValue = 10) => {
  const [replayActive, setReplayActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [manualTrades, setManualTrades] = useState([]);
  const [activePosition, setActivePosition] = useState(null);
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const [replaySpeed, setReplaySpeed] = useState(500);
  const timerRef = useRef(null);
  const isExecutingRef = useRef(false);
  const dataKeyRef = useRef(dataKey);
  const lotSizeRef = useRef(lotSize);
  const pipValueRef = useRef(pipValue);
  const fullDataRef = useRef(fullData);
  const activePositionRef = useRef(activePosition);

  useEffect(() => { lotSizeRef.current = lotSize; }, [lotSize]);
  useEffect(() => { pipValueRef.current = pipValue; }, [pipValue]);
  useEffect(() => { fullDataRef.current = fullData; }, [fullData]);
  useEffect(() => { activePositionRef.current = activePosition; }, [activePosition]);

  useEffect(() => {
    if (dataKey !== dataKeyRef.current) {
      dataKeyRef.current = dataKey;
      setIsPlaying(false);
      setReplayActive(false);
      setCurrentIndex(0);
      setManualTrades([]);
      setActivePosition(null);
      setMetrics(INITIAL_METRICS);
    }
  }, [dataKey]);

  const safeIndex = Math.min(currentIndex, Math.max((fullData?.length || 1) - 1, 0));

  const visibleData = useMemo(() => {
    if (!fullData || fullData.length === 0) return EMPTY_DATA;
    return replayActive ? fullData.slice(0, safeIndex + 1) : fullData;
  }, [fullData, replayActive, safeIndex]);

  const calcPnl = useCallback((entryPrice, exitPrice, type, tradeLotSize, tradePipValue) => {
    const pips = type === 'BUY'
      ? (exitPrice - entryPrice) * pipMultiplier
      : (entryPrice - exitPrice) * pipMultiplier;
    return pips * tradeLotSize * tradePipValue;
  }, [pipMultiplier]);

  const enterReplay = useCallback((startIndex) => {
    setReplayActive(true);
    setIsPlaying(false);
    setCurrentIndex(startIndex);
    setManualTrades([]);
    setActivePosition(null);
    setMetrics(INITIAL_METRICS);
  }, []);

  const exitReplay = useCallback(() => {
    setReplayActive(false);
    setIsPlaying(false);
    setCurrentIndex(0);
    setManualTrades([]);
    setActivePosition(null);
    setMetrics(INITIAL_METRICS);
  }, []);

  const startPlaying = useCallback(() => {
    if (!replayActive) return;
    setIsPlaying(true);
  }, [replayActive]);

  const pausePlaying = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const closeTrade = useCallback((position, exitPrice, exitTime, reason) => {
    const pnl = calcPnl(
      position.entry, exitPrice, position.type,
      position.lotSize, position.pipValue
    );

    const completedTrade = {
      ...position,
      exit: exitPrice,
      exitTime,
      pnl: pnl.toFixed(2),
      status: pnl >= 0 ? 'win' : 'loss',
      exitReason: reason
    };

    setManualTrades(prev => {
      const newTrades = [...prev, completedTrade];
      setMetrics(calculateMetrics(newTrades, 10000));
      return newTrades;
    });
    setActivePosition(null);
  }, [calcPnl]);

  const checkSLTP = useCallback((index) => {
    const pos = activePositionRef.current;
    const fd = fullDataRef.current;
    if (!pos || !fd || index >= fd.length) return;

    const candle = fd[index];
    if (candle.time <= pos.time) return;

    let exitPrice = 0;
    let reason = '';

    if (pos.type === 'BUY') {
      const slHit = pos.sl && candle.low <= pos.sl;
      const tpHit = pos.tp && candle.high >= pos.tp;

      if (slHit && tpHit) {
        const slDist = Math.abs(candle.open - pos.sl);
        const tpDist = Math.abs(pos.tp - candle.open);
        if (slDist <= tpDist) {
          exitPrice = pos.sl; reason = 'SL';
        } else {
          exitPrice = pos.tp; reason = 'TP';
        }
      } else if (slHit) {
        exitPrice = pos.sl; reason = 'SL';
      } else if (tpHit) {
        exitPrice = pos.tp; reason = 'TP';
      }
    } else {
      const slHit = pos.sl && candle.high >= pos.sl;
      const tpHit = pos.tp && candle.low <= pos.tp;

      if (slHit && tpHit) {
        const slDist = Math.abs(candle.open - pos.sl);
        const tpDist = Math.abs(candle.open - pos.tp);
        if (slDist <= tpDist) {
          exitPrice = pos.sl; reason = 'SL';
        } else {
          exitPrice = pos.tp; reason = 'TP';
        }
      } else if (slHit) {
        exitPrice = pos.sl; reason = 'SL';
      } else if (tpHit) {
        exitPrice = pos.tp; reason = 'TP';
      }
    }

    if (reason) {
      closeTrade(pos, exitPrice, candle.time, reason);
    }
  }, [closeTrade]);

  const stepForward = useCallback(() => {
    if (!replayActive || !fullData || !fullData.length) return;
    setCurrentIndex(prev => {
      const next = prev + 1;
      if (next >= fullData.length) return prev;
      return next;
    });
  }, [replayActive, fullData]);

  useEffect(() => {
    if (replayActive && activePosition) {
      checkSLTP(safeIndex);
    }
  }, [safeIndex, replayActive, activePosition, checkSLTP]);

  const stepBackward = useCallback(() => {
    if (!replayActive) return;
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, [replayActive]);

  const jumpTo = useCallback((index) => {
    if (!replayActive || !fullData) return;
    const len = fullData.length;
    const newIndex = Math.max(0, Math.min(index, len - 1));

    setCurrentIndex(prev => {
      const currentSafe = Math.min(prev, len - 1);
      if (newIndex < currentSafe) {
        setActivePosition(null);
        const newTime = fullData[newIndex]?.time;
        if (newTime != null) {
          setManualTrades(prevTrades => {
            const validTrades = prevTrades.filter(t => t.exitTime <= newTime);
            setMetrics(calculateMetrics(validTrades, 10000));
            return validTrades;
          });
        }
      }
      return newIndex;
    });
  }, [replayActive, fullData]);

  const executeBuy = useCallback((sl, tp) => {
    if (!replayActive || activePosition || isExecutingRef.current || !fullData?.length) return;
    isExecutingRef.current = true;

    const currentCandle = fullData[safeIndex];
    if (!currentCandle) { isExecutingRef.current = false; return; }

    setActivePosition({
      type: 'BUY',
      entry: currentCandle.close,
      time: currentCandle.time,
      sl: sl || null,
      tp: tp || null,
      lotSize: lotSizeRef.current,
      pipValue: pipValueRef.current,
      status: 'open'
    });

    setTimeout(() => { isExecutingRef.current = false; }, 100);
  }, [replayActive, activePosition, safeIndex, fullData]);

  const executeSell = useCallback((sl, tp) => {
    if (!replayActive || activePosition || isExecutingRef.current || !fullData?.length) return;
    isExecutingRef.current = true;

    const currentCandle = fullData[safeIndex];
    if (!currentCandle) { isExecutingRef.current = false; return; }

    setActivePosition({
      type: 'SELL',
      entry: currentCandle.close,
      time: currentCandle.time,
      sl: sl || null,
      tp: tp || null,
      lotSize: lotSizeRef.current,
      pipValue: pipValueRef.current,
      status: 'open'
    });

    setTimeout(() => { isExecutingRef.current = false; }, 100);
  }, [replayActive, activePosition, safeIndex, fullData]);

  const updateSLTP = useCallback((type, price) => {
    setActivePosition(prev => {
      if (!prev) return prev;
      if (type === 'sl') return { ...prev, sl: price };
      if (type === 'tp') return { ...prev, tp: price };
      return prev;
    });
  }, []);

  const setReplayIndex = useCallback((index) => {
    if (!replayActive) return;
    const len = fullData?.length || 0;
    if (len === 0) return;
    setCurrentIndex(Math.max(0, Math.min(index, len - 1)));
  }, [replayActive, fullData]);

  const closePosition = useCallback(() => {
    if (!activePosition || !fullData?.length) return;
    const currentCandle = fullData[safeIndex];
    if (!currentCandle) return;
    closeTrade(activePosition, currentCandle.close, currentCandle.time, 'Manual');
  }, [activePosition, safeIndex, fullData, closeTrade]);

  useEffect(() => {
    if (!isPlaying || !replayActive) {
      clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      const fd = fullDataRef.current;
      setCurrentIndex(prev => {
        const next = prev + 1;
        if (!fd || next >= fd.length) {
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, replaySpeed);

    return () => clearInterval(timerRef.current);
  }, [isPlaying, replayActive, replaySpeed]);

  return {
    replayActive,
    isPlaying,
    currentIndex: safeIndex,
    totalCandles: fullData?.length || 0,
    visibleData,
    metrics,
    trades: manualTrades,
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
    executeBuy,
    executeSell,
    closePosition,
    updateSLTP,
    setReplayIndex
  };
};
