import { useState, useCallback, useRef, useEffect } from 'react';

const INITIAL_CHUNKS_TO_LOAD = 2;

export const useChunkedData = () => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadedChunksRef = useRef(new Set());
  const allChunksRef = useRef([]);
  const currentKeyRef = useRef('');
  const metaRef = useRef(null);

  const buildMergedData = useCallback(() => {
    const sorted = [...loadedChunksRef.current].sort((a, b) => a - b);
    const merged = [];
    for (const idx of sorted) {
      const chunk = allChunksRef.current[idx];
      if (chunk) merged.push(...chunk);
    }
    return merged;
  }, []);

  const fetchChunk = useCallback(async (baseKey, chunkIdx) => {
    const url = `/data/${baseKey}_${chunkIdx}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Chunk not found: ${url}`);
    return res.json();
  }, []);

  const loadSymbol = useCallback(async (symbol, tf) => {
    const baseKey = `${symbol}_${tf.toLowerCase()}`;

    if (baseKey === currentKeyRef.current && metaRef.current) return;

    setIsLoading(true);
    setLoadError(null);
    loadedChunksRef.current = new Set();
    allChunksRef.current = [];
    currentKeyRef.current = baseKey;

    try {
      const metaRes = await fetch(`/data/${baseKey}_meta.json`);
      if (!metaRes.ok) throw new Error(`No data for ${symbol} ${tf}`);
      const metaData = await metaRes.json();
      metaRef.current = metaData;
      setMeta(metaData);

      allChunksRef.current = new Array(metaData.totalChunks).fill(null);

      const lastChunk = metaData.totalChunks - 1;
      const firstToLoad = Math.max(0, lastChunk - INITIAL_CHUNKS_TO_LOAD + 1);

      const promises = [];
      for (let i = firstToLoad; i <= lastChunk; i++) {
        promises.push(
          fetchChunk(baseKey, i).then(chunkData => {
            allChunksRef.current[i] = chunkData;
            loadedChunksRef.current.add(i);
          })
        );
      }
      await Promise.all(promises);

      if (currentKeyRef.current === baseKey) {
        setData(buildMergedData());
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setLoadError(err.message);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchChunk, buildMergedData]);

  const loadOlderChunks = useCallback(async (count = 2) => {
    if (!metaRef.current || isLoadingMore) return false;

    const loaded = loadedChunksRef.current;
    const oldestLoaded = Math.min(...loaded);

    if (oldestLoaded <= 0) return false;

    setIsLoadingMore(true);
    const baseKey = currentKeyRef.current;

    try {
      const firstToLoad = Math.max(0, oldestLoaded - count);
      const promises = [];

      for (let i = firstToLoad; i < oldestLoaded; i++) {
        if (!loaded.has(i)) {
          promises.push(
            fetchChunk(baseKey, i).then(chunkData => {
              allChunksRef.current[i] = chunkData;
              loadedChunksRef.current.add(i);
            })
          );
        }
      }

      if (promises.length === 0) {
        setIsLoadingMore(false);
        return false;
      }

      await Promise.all(promises);

      if (currentKeyRef.current === baseKey) {
        setData(buildMergedData());
      }
      return true;
    } catch (err) {
      console.error('Error loading older chunks:', err);
      return false;
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, fetchChunk, buildMergedData]);

  const loadAllChunks = useCallback(async () => {
    if (!metaRef.current) return;

    const baseKey = currentKeyRef.current;
    const loaded = loadedChunksRef.current;
    const promises = [];

    for (let i = 0; i < metaRef.current.totalChunks; i++) {
      if (!loaded.has(i)) {
        promises.push(
          fetchChunk(baseKey, i).then(chunkData => {
            allChunksRef.current[i] = chunkData;
            loadedChunksRef.current.add(i);
          })
        );
      }
    }

    if (promises.length === 0) return;

    setIsLoadingMore(true);
    try {
      await Promise.all(promises);
      if (currentKeyRef.current === baseKey) {
        setData(buildMergedData());
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchChunk, buildMergedData]);

  const loadChunksForRange = useCallback(async (startCandle, endCandle) => {
    if (!metaRef.current) return;

    const chunkSize = metaRef.current.chunkSize;
    const startChunk = Math.floor(startCandle / chunkSize);
    const endChunk = Math.min(
      Math.floor(endCandle / chunkSize),
      metaRef.current.totalChunks - 1
    );

    const baseKey = currentKeyRef.current;
    const loaded = loadedChunksRef.current;
    const promises = [];

    for (let i = startChunk; i <= endChunk; i++) {
      if (!loaded.has(i)) {
        promises.push(
          fetchChunk(baseKey, i).then(chunkData => {
            allChunksRef.current[i] = chunkData;
            loadedChunksRef.current.add(i);
          })
        );
      }
    }

    if (promises.length === 0) return;

    setIsLoadingMore(true);
    try {
      await Promise.all(promises);
      if (currentKeyRef.current === baseKey) {
        setData(buildMergedData());
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchChunk, buildMergedData]);

  const hasOlderData = meta
    ? Math.min(...loadedChunksRef.current) > 0
    : false;

  const loadedRange = meta ? {
    startCandle: Math.min(...loadedChunksRef.current) * meta.chunkSize,
    endCandle: Math.min(
      (Math.max(...loadedChunksRef.current) + 1) * meta.chunkSize,
      meta.totalCandles
    ),
  } : { startCandle: 0, endCandle: 0 };

  return {
    data,
    meta,
    isLoading,
    isLoadingMore,
    loadError,
    hasOlderData,
    loadedRange,
    loadSymbol,
    loadOlderChunks,
    loadAllChunks,
    loadChunksForRange,
  };
};
