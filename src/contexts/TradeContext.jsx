import { createContext, useContext } from 'react';
import { useBacktest } from '../hooks/useBacktest';

const TradeContext = createContext(null);

export function TradeProvider({ children, chartData, selectedSymbol, symbolInfo, accountBalance = 10000 }) {
  const pipMult = symbolInfo?.pipMult || 10000;
  const pipValue = symbolInfo?.pipValue || 10;

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
    executeBuy,
    executeSell,
    closePosition,
    updateSLTP,
    setReplayIndex,
  } = useBacktest(chartData, selectedSymbol, pipMult, 0.01, pipValue, accountBalance);

  return (
    <TradeContext.Provider
      value={{
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
        executeBuy,
        executeSell,
        closePosition,
        updateSLTP,
        setReplayIndex,
      }}
    >
      {children}
    </TradeContext.Provider>
  );
}

export function useTrade() {
  const context = useContext(TradeContext);
  if (!context) {
    throw new Error('useTrade debe usarse dentro de un TradeProvider');
  }
  return context;
}
