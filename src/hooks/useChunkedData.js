import { useState, useCallback, useRef } from 'react';
import { getFromDB, setToDB } from '../utils/indexedDB';

const INITIAL_CHUNKS_TO_LOAD = 2;
const DEFAULT_DATA_URL = '/data';

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

  const getDataBaseUrls = useCallback(() => {
    const envBaseUrl = (import.meta.env.VITE_DATA_URL || '').replace(/\/$/, '');
    const fallbackBaseUrl = DEFAULT_DATA_URL;
    if (!envBaseUrl || envBaseUrl === fallbackBaseUrl) return [fallbackBaseUrl];
    return [envBaseUrl, fallbackBaseUrl];
  }, []);

  const parseJsonResponse = useCallback(async (res, url) => {
    if (!res.ok) {
      throw new Error(`Request failed (${res.status}) for ${url}`);
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const text = await res.text();

    if (!contentType.includes('application/json')) {
      const snippet = text.slice(0, 120).replace(/\s+/g, ' ').trim();
      throw new Error(`Expected JSON but received "${contentType || 'unknown'}" from ${url}: ${snippet}`);
    }

    try {
      return JSON.parse(text);
    } catch (err) {
      throw new Error(`Invalid JSON from ${url}: ${err.message}`);
    }
  }, []);

  const fetchJsonWithFallback = useCallback(async (relativePath, label) => {
    const baseUrls = getDataBaseUrls();
    let lastError = null;

    for (const baseUrl of baseUrls) {
      const url = `${baseUrl}/${relativePath}`;
      try {
        const res = await fetch(url);
        return await parseJsonResponse(res, url);
      } catch (err) {
        lastError = err;
        console.warn(`Error loading ${label} from ${url}`, err);
      }
    }

    throw new Error(`Failed to load ${label}. ${lastError?.message || 'Unknown error'}`);
  }, [getDataBaseUrls, parseJsonResponse]);

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
    const relativePath = `${baseKey}_${chunkIdx}.json`;
    const dbKey = `${baseKey}_${chunkIdx}`;
    
    try {
      const cachedData = await getFromDB('chunks', dbKey);
      if (cachedData) return cachedData;

      const data = await fetchJsonWithFallback(relativePath, `chunk ${dbKey}`);
      
      setToDB('chunks', dbKey, data);
      return data;
    } catch (err) {
      throw new Error(`Error fetching chunk ${dbKey}: ${err.message}`);
    }
  }, [fetchJsonWithFallback]);

  const loadSymbol = useCallback(async (symbol, tf) => {
    const baseKey = `${symbol}_${tf.toLowerCase()}`;

    if (baseKey === currentKeyRef.current && metaRef.current) return;

    setIsLoading(true);
    setLoadError(null);
    loadedChunksRef.current = new Set();
    allChunksRef.current = [];
    currentKeyRef.current = baseKey;

    try {
      const metaData = await fetchJsonWithFallback(`${baseKey}_meta.json`, `meta ${baseKey}`);
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

  const loadNewerChunks = useCallback(async (count = 1) => {
    if (!metaRef.current || isLoadingMore) return false;

    const loaded = loadedChunksRef.current;
    const newestLoaded = Math.max(...loaded);

    if (newestLoaded >= metaRef.current.totalChunks - 1) return false;

    setIsLoadingMore(true);
    const baseKey = currentKeyRef.current;

    try {
      const lastToLoad = Math.min(metaRef.current.totalChunks - 1, newestLoaded + count);
      const promises = [];

      for (let i = newestLoaded + 1; i <= lastToLoad; i++) {
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
      console.error('Error loading newer chunks:', err);
      return false;
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, fetchChunk, buildMergedData]);

  const loadAllChunks = useCallback(async () => {
    if (!metaRef.current || isLoadingMore) return;

    const baseKey = currentKeyRef.current;
    const loaded = loadedChunksRef.current;
    const remaining = [];

    for (let i = 0; i < metaRef.current.totalChunks; i++) {
      if (!loaded.has(i)) {
        remaining.push(i);
      }
    }

    if (remaining.length === 0) return;

    setIsLoadingMore(true);
    try {
      const BATCH_SIZE = 5; // Concurrencia limitada
      for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
        const batch = remaining.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(idx =>
            fetchChunk(baseKey, idx).then(chunkData => {
              allChunksRef.current[idx] = chunkData;
              loadedChunksRef.current.add(idx);
            })
          )
        );
      }

      if (currentKeyRef.current === baseKey) {
        setData(buildMergedData());
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchChunk, buildMergedData, isLoadingMore]);

  const loadChunkForTime = useCallback(async (targetTime) => {
    if (!metaRef.current || isLoadingMore) return false;

    const baseKey = currentKeyRef.current;
    let low = 0;
    let high = metaRef.current.totalChunks - 1;
    let targetChunkIdx = -1;

    setIsLoadingMore(true);
    try {
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        let chunk = allChunksRef.current[mid];

        if (!chunk) {
          chunk = await fetchChunk(baseKey, mid);
          allChunksRef.current[mid] = chunk;
        }

        if (!chunk || chunk.length === 0) {
          high = mid - 1;
          continue;
        }

        const firstTime = chunk[0].time;
        const lastTime = chunk[chunk.length - 1].time;

        if (targetTime >= firstTime && targetTime <= lastTime) {
          targetChunkIdx = mid;
          break;
        } else if (targetTime < firstTime) {
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }

      if (targetChunkIdx !== -1) {
        loadedChunksRef.current.add(targetChunkIdx);
        
        // Cargar bloque anterior para historial inmediato
        if (targetChunkIdx > 0) {
          let prevIdx = targetChunkIdx - 1;
          if (!allChunksRef.current[prevIdx]) {
            allChunksRef.current[prevIdx] = await fetchChunk(baseKey, prevIdx);
          }
          loadedChunksRef.current.add(prevIdx);
        }

        if (currentKeyRef.current === baseKey) {
          setData(buildMergedData());
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error in loadChunkForTime:', err);
      return false;
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchChunk, buildMergedData, isLoadingMore]);

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

  const hasOlderData = meta && loadedChunksRef.current.size > 0
    ? Math.min(...loadedChunksRef.current) > 0
    : false;

  const loadedRange = meta && loadedChunksRef.current.size > 0 ? {
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
    loadNewerChunks,
    loadAllChunks,
    loadChunksForRange,
    loadChunkForTime,
  };
};
