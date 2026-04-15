import { useState, useCallback } from 'react';

const TF_SL_SCALE = {
  M1: 0.15, M5: 0.3, M15: 0.5, M30: 0.7,
  H1: 1, H4: 2, D1: 5, W1: 10,
};

export function useSymbolState(initialSymbol = 'eurusd', initialTF = 'H1') {
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [selectedTF, setSelectedTF] = useState(initialTF);
  const [replayStartInput, setReplayStartInput] = useState(50);
  const [selectingStart, setSelectingStart] = useState(false);

  const getScaledSLTP = useCallback((symbolInfo) => {
    const scale = TF_SL_SCALE[selectedTF] ?? 1;
    const slDist = (symbolInfo?.defaultSL ?? 0.00300) * scale;
    const tpDist = (symbolInfo?.defaultTP ?? 0.00600) * scale;
    return { slDist, tpDist };
  }, [selectedTF]);

  const handleTFChange = useCallback((tf, replayActive, chartData, currentIndex, isPlaying, pausePlaying) => {
    if (tf === selectedTF) return;
    if (replayActive) {
      const currentCandle = chartData?.[currentIndex];
      if (currentCandle) {
        // pendingReplayTimeRef se maneja desde el componente padre
      }
      if (isPlaying) pausePlaying();
    }
    setSelectedTF(tf);
  }, [selectedTF]);

  const handleShowSelector = useCallback(async (meta, loadAllChunks) => {
    setSelectingStart(true);
    await loadAllChunks();
    if (meta?.totalCandles) {
      setReplayStartInput(Math.floor(meta.totalCandles * 0.8));
    }
  }, []);

  const handleCancelSelector = useCallback(() => {
    setSelectingStart(false);
  }, []);

  const handleEnterReplay = useCallback((chartData, enterReplay) => {
    const total = chartData?.length || 0;
    if (total === 0) return;
    const startIdx = Math.max(0, Math.min(replayStartInput, total - 1));
    enterReplay(startIdx);
    setSelectingStart(false);
  }, [replayStartInput]);

  const handleExitReplay = useCallback((exitReplay) => {
    exitReplay();
    setSelectingStart(false);
  }, []);

  return {
    selectedSymbol,
    setSelectedSymbol,
    selectedTF,
    setSelectedTF,
    replayStartInput,
    setReplayStartInput,
    selectingStart,
    setSelectingStart,
    getScaledSLTP,
    handleTFChange,
    handleShowSelector,
    handleCancelSelector,
    handleEnterReplay,
    handleExitReplay,
    TF_SL_SCALE,
  };
}
