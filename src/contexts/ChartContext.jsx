import { createContext, useContext, useRef, useCallback, useState, useEffect } from 'react';
import { useChunkedData } from '../hooks/useChunkedData';

const ChartContext = createContext(null);

export function ChartProvider({ children }) {
  const loadMoreThrottleRef = useRef(false);
  const pendingReplayTimeRef = useRef(null);
  const pendingReplayIndexRef = useRef(null);

  const {
    data,
    meta,
    isLoading,
    isLoadingMore,
    loadError,
    hasOlderData,
    loadedRange,
    loadSymbol,
    loadOlderChunks,
    loadNewerChunks,
    loadAllChunks,
    loadChunksForRange,
    loadChunkForTime,
  } = useChunkedData();

  const handleNeedMoreData = useCallback(() => {
    if (loadMoreThrottleRef.current || !hasOlderData) return;
    loadMoreThrottleRef.current = true;
    loadOlderChunks(2).finally(() => {
      setTimeout(() => { loadMoreThrottleRef.current = false; }, 500);
    });
  }, [hasOlderData, loadOlderChunks]);

  return (
    <ChartContext.Provider
      value={{
        data,
        meta,
        isLoading,
        isLoadingMore,
        loadError,
        hasOlderData,
        loadedRange,
        loadSymbol,
        loadOlderChunks,
        loadNewerChunks,
        loadAllChunks,
        loadChunksForRange,
        loadChunkForTime,
        handleNeedMoreData,
        pendingReplayTimeRef,
        pendingReplayIndexRef,
      }}
    >
      {children}
    </ChartContext.Provider>
  );
}

export function useChart() {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error('useChart debe usarse dentro de un ChartProvider');
  }
  return context;
}
