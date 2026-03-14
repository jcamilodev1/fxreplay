import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';

const FIBO_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIBO_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6', '#ec4899'];

const TradingChart = forwardRef(({
  data, drawingMode, activePosition,
  onNeedMoreData, focusIndex, priceDecimals = 5, minMove = 0.00001,
  onSLTPDrag, dataKey,
}, ref) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();
  const prevDataLenRef = useRef(0);
  const prevFirstTimeRef = useRef(null);
  const prevLastTimeRef = useRef(null);

  const drawingModeRef = useRef(drawingMode);
  const needMoreDataRef = useRef(onNeedMoreData);
  const dataRef = useRef(data);
  const priceDecimalsRef = useRef(priceDecimals);
  const minMoveRef = useRef(minMove);
  const activePositionRef = useRef(activePosition);
  const onSLTPDragRef = useRef(onSLTPDrag);

  const entryLineRef = useRef(null);
  const slLineRef = useRef(null);
  const tpLineRef = useRef(null);

  const drawingsRef = useRef([]);
  const firstPointRef = useRef(null);

  useEffect(() => {
    drawingModeRef.current = drawingMode;
    firstPointRef.current = null;
    if (chartContainerRef.current) {
      chartContainerRef.current.style.cursor = drawingMode ? 'crosshair' : '';
    }
  }, [drawingMode]);

  useEffect(() => { needMoreDataRef.current = onNeedMoreData; }, [onNeedMoreData]);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { activePositionRef.current = activePosition; }, [activePosition]);
  useEffect(() => { onSLTPDragRef.current = onSLTPDrag; }, [onSLTPDrag]);

  useEffect(() => {
    priceDecimalsRef.current = priceDecimals;
    minMoveRef.current = minMove;
    if (seriesRef.current) {
      seriesRef.current.applyOptions({
        priceFormat: { type: 'price', precision: priceDecimals, minMove },
      });
    }
  }, [priceDecimals, minMove]);

  const clearAllDrawings = () => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    drawingsRef.current.forEach(drawing => {
      drawing.items.forEach(item => {
        try {
          if (item.kind === 'series' && chart) chart.removeSeries(item.ref);
          if (item.kind === 'priceLine' && series) series.removePriceLine(item.ref);
        } catch {}
      });
    });
    drawingsRef.current = [];
  };

  const removeLastDrawing = () => {
    if (drawingsRef.current.length === 0) return;
    const last = drawingsRef.current.pop();
    const chart = chartRef.current;
    const series = seriesRef.current;
    last.items.forEach(item => {
      try {
        if (item.kind === 'series' && chart) chart.removeSeries(item.ref);
        if (item.kind === 'priceLine' && series) series.removePriceLine(item.ref);
      } catch {}
    });
  };

  useImperativeHandle(ref, () => ({
    clearDrawings: clearAllDrawings,
    removeLastDrawing,
  }));

  const prevDataKeyRef = useRef(dataKey);
  useEffect(() => {
    if (dataKey !== prevDataKeyRef.current) {
      clearAllDrawings();
      prevDataKeyRef.current = dataKey;
    }
  }, [dataKey]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0d0f14' },
        textColor: '#94a3b8',
        fontSize: 12,
        fontFamily: "'Outfit', sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.02)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#3b82f6', width: 1, style: 3,
          labelBackgroundColor: '#3b82f6',
        },
        horzLine: {
          color: '#3b82f6', width: 1, style: 3,
          labelBackgroundColor: '#3b82f6',
        },
      },
      rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.05)' },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: true,
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
      priceFormat: {
        type: 'price',
        precision: priceDecimalsRef.current,
        minMove: minMoveRef.current,
      },
    });
    seriesRef.current = candlestickSeries;

    // --- Drawing click handler ---
    chart.subscribeClick((param) => {
      const mode = drawingModeRef.current;
      if (!param.time || !mode || !param.point) return;

      const price = candlestickSeries.coordinateToPrice(param.point.y);
      if (price == null || isNaN(price)) return;

      const dec = priceDecimalsRef.current;
      const rounded = parseFloat(price.toFixed(dec));

      switch (mode) {
        case 'horizontal': {
          const pl = candlestickSeries.createPriceLine({
            price: rounded,
            color: '#8b5cf6',
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: `S/R ${rounded.toFixed(dec)}`,
          });
          drawingsRef.current.push({ type: 'horizontal', items: [{ kind: 'priceLine', ref: pl }] });
          break;
        }

        case 'trendline': {
          if (!firstPointRef.current) {
            firstPointRef.current = { time: param.time, price: rounded };
          } else {
            const ls = chart.addSeries(LineSeries, {
              color: '#3b82f6', lineWidth: 2, lineType: 0,
              lastValueVisible: false, priceLineVisible: false,
            });
            ls.setData([
              { time: firstPointRef.current.time, value: firstPointRef.current.price },
              { time: param.time, value: rounded },
            ]);
            drawingsRef.current.push({ type: 'trendline', items: [{ kind: 'series', ref: ls }] });
            firstPointRef.current = null;
          }
          break;
        }

        case 'ray': {
          if (!firstPointRef.current) {
            firstPointRef.current = { time: param.time, price: rounded };
          } else {
            const t1 = firstPointRef.current.time;
            const p1 = firstPointRef.current.price;
            const t2 = param.time;
            const p2 = rounded;

            const dt = t2 - t1;
            if (dt === 0) { firstPointRef.current = null; break; }

            const slope = (p2 - p1) / dt;
            const extend = Math.abs(dt) * 200;
            const farTime = t2 + extend;
            const farPrice = parseFloat((p2 + slope * extend).toFixed(dec));

            const ls = chart.addSeries(LineSeries, {
              color: '#f59e0b', lineWidth: 2, lineType: 0,
              lastValueVisible: false, priceLineVisible: false,
            });
            ls.setData([
              { time: t1, value: p1 },
              { time: t2, value: p2 },
              { time: farTime, value: farPrice },
            ]);
            drawingsRef.current.push({ type: 'ray', items: [{ kind: 'series', ref: ls }] });
            firstPointRef.current = null;
          }
          break;
        }

        case 'fibonacci': {
          if (!firstPointRef.current) {
            firstPointRef.current = { time: param.time, price: rounded };
          } else {
            const high = Math.max(firstPointRef.current.price, rounded);
            const low = Math.min(firstPointRef.current.price, rounded);
            const diff = high - low;
            if (diff === 0) { firstPointRef.current = null; break; }

            const items = [];
            FIBO_LEVELS.forEach((level, i) => {
              const levelPrice = parseFloat((high - diff * level).toFixed(dec));
              const pl = candlestickSeries.createPriceLine({
                price: levelPrice,
                color: FIBO_COLORS[i],
                lineWidth: 1,
                lineStyle: 2,
                axisLabelVisible: true,
                title: `${(level * 100).toFixed(1)}%`,
              });
              items.push({ kind: 'priceLine', ref: pl });
            });

            drawingsRef.current.push({ type: 'fibonacci', items });
            firstPointRef.current = null;
          }
          break;
        }
      }
    });

    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range) return;
      if (range.from < 10 && needMoreDataRef.current) {
        needMoreDataRef.current();
      }
    });

    // --- SL/TP drag logic ---
    let isDragging = false;
    let dragType = null;

    const getChartY = (e) => {
      const rect = chartContainerRef.current.getBoundingClientRect();
      return e.clientY - rect.top;
    };

    const DRAG_THRESHOLD = 12;

    const handlePointerDown = (e) => {
      if (!seriesRef.current) return;
      const pos = activePositionRef.current;
      if (!pos || pos.status !== 'open') return;

      const y = getChartY(e);

      if (pos.sl != null && slLineRef.current) {
        const coord = seriesRef.current.priceToCoordinate(pos.sl);
        if (coord != null && Math.abs(y - coord) < DRAG_THRESHOLD) {
          isDragging = true;
          dragType = 'sl';
          chart.applyOptions({ handleScroll: false, handleScale: false });
          chartContainerRef.current.style.cursor = 'ns-resize';
          try { chartContainerRef.current.setPointerCapture(e.pointerId); } catch {}
          e.preventDefault();
          return;
        }
      }

      if (pos.tp != null && tpLineRef.current) {
        const coord = seriesRef.current.priceToCoordinate(pos.tp);
        if (coord != null && Math.abs(y - coord) < DRAG_THRESHOLD) {
          isDragging = true;
          dragType = 'tp';
          chart.applyOptions({ handleScroll: false, handleScale: false });
          chartContainerRef.current.style.cursor = 'ns-resize';
          try { chartContainerRef.current.setPointerCapture(e.pointerId); } catch {}
          e.preventDefault();
          return;
        }
      }
    };

    const handlePointerMove = (e) => {
      if (!seriesRef.current) return;

      const y = getChartY(e);

      if (isDragging) {
        e.preventDefault();
        const newPrice = seriesRef.current.coordinateToPrice(y);
        if (newPrice == null) return;

        const dec = priceDecimalsRef.current;
        const r = parseFloat(newPrice.toFixed(dec));

        if (dragType === 'sl' && slLineRef.current) {
          slLineRef.current.applyOptions({ price: r, title: `SL  ${r.toFixed(dec)}` });
        } else if (dragType === 'tp' && tpLineRef.current) {
          tpLineRef.current.applyOptions({ price: r, title: `TP  ${r.toFixed(dec)}` });
        }
        return;
      }

      const pos = activePositionRef.current;
      if (!pos || pos.status !== 'open') {
        chartContainerRef.current.style.cursor = drawingModeRef.current ? 'crosshair' : '';
        return;
      }

      let near = false;
      if (pos.sl != null && slLineRef.current) {
        const coord = seriesRef.current.priceToCoordinate(pos.sl);
        if (coord != null && Math.abs(y - coord) < DRAG_THRESHOLD) near = true;
      }
      if (!near && pos.tp != null && tpLineRef.current) {
        const coord = seriesRef.current.priceToCoordinate(pos.tp);
        if (coord != null && Math.abs(y - coord) < DRAG_THRESHOLD) near = true;
      }
      chartContainerRef.current.style.cursor = near ? 'ns-resize' : (drawingModeRef.current ? 'crosshair' : '');
    };

    const handlePointerUp = (e) => {
      if (!isDragging) return;

      const y = getChartY(e);
      const newPrice = seriesRef.current?.coordinateToPrice(y);
      const type = dragType;

      isDragging = false;
      dragType = null;
      chart.applyOptions({ handleScroll: true, handleScale: true });
      chartContainerRef.current.style.cursor = drawingModeRef.current ? 'crosshair' : '';
      try { chartContainerRef.current.releasePointerCapture(e.pointerId); } catch {}

      if (newPrice != null && onSLTPDragRef.current) {
        const dec = priceDecimalsRef.current;
        onSLTPDragRef.current(type, parseFloat(newPrice.toFixed(dec)));
      }
    };

    const container = chartContainerRef.current;
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);

    // --- Resize (ResizeObserver detects sidebar collapse, window resize, etc.) ---
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          chart.applyOptions({ width, height });
        }
      }
    });
    resizeObserver.observe(container);

    if (dataRef.current && dataRef.current.length > 0) {
      candlestickSeries.setData(dataRef.current);
      prevDataLenRef.current = dataRef.current.length;
    }

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Update data
  useEffect(() => {
    if (!seriesRef.current || !data || data.length === 0) return;

    const prevLen = prevDataLenRef.current;
    const newLen = data.length;
    const newFirstTime = data[0]?.time ?? null;
    const newLastTime = data[newLen - 1]?.time ?? null;
    const chart = chartRef.current;

    if (
      prevLen === newLen &&
      prevFirstTimeRef.current === newFirstTime &&
      prevLastTimeRef.current === newLastTime
    ) {
      return;
    }

    if (prevLen > 0 && newLen === prevLen + 1 && newFirstTime === prevFirstTimeRef.current) {
      seriesRef.current.update(data[newLen - 1]);
    } else if (prevLen > 0 && newLen > prevLen && newFirstTime < (prevFirstTimeRef.current ?? Infinity)) {
      let savedRange = null;
      if (chart) {
        try { savedRange = chart.timeScale().getVisibleLogicalRange(); } catch {}
      }
      seriesRef.current.setData(data);
      if (savedRange && chart) {
        const addedCount = newLen - prevLen;
        try {
          chart.timeScale().setVisibleLogicalRange({
            from: savedRange.from + addedCount,
            to: savedRange.to + addedCount,
          });
        } catch {}
      }
    } else {
      seriesRef.current.setData(data);
      if (chart && newLen > 0) {
        const barsToShow = Math.min(150, newLen);
        try {
          chart.timeScale().setVisibleLogicalRange({
            from: newLen - barsToShow,
            to: newLen + 10,
          });
        } catch {}
      }
    }

    prevDataLenRef.current = newLen;
    prevFirstTimeRef.current = newFirstTime;
    prevLastTimeRef.current = newLastTime;
  }, [data]);

  // Scroll to focusIndex
  const lastScrolledRef = useRef(null);
  useEffect(() => {
    if (focusIndex == null || !chartRef.current || !data || data.length === 0) return;
    if (focusIndex >= data.length) {
      lastScrolledRef.current = null;
      return;
    }
    if (lastScrolledRef.current === focusIndex) return;
    lastScrolledRef.current = focusIndex;

    const barsToShow = 150;
    const from = Math.max(0, focusIndex - Math.floor(barsToShow * 0.7));
    const to = from + barsToShow;
    try {
      chartRef.current.timeScale().setVisibleLogicalRange({ from, to });
    } catch { /* chart not ready */ }
  }, [focusIndex, data]);

  // Update price lines (SL/TP/Entry)
  useEffect(() => {
    if (!seriesRef.current) return;

    [entryLineRef, slLineRef, tpLineRef].forEach(r => {
      if (r.current) {
        try { seriesRef.current.removePriceLine(r.current); } catch {}
        r.current = null;
      }
    });

    if (activePosition && activePosition.status === 'open') {
      const dec = priceDecimals;

      entryLineRef.current = seriesRef.current.createPriceLine({
        price: activePosition.entry,
        color: '#3b82f6', lineWidth: 2, lineStyle: 0,
        axisLabelVisible: true,
        title: `ENTRY  ${activePosition.entry.toFixed(dec)}`,
      });

      if (activePosition.sl != null) {
        slLineRef.current = seriesRef.current.createPriceLine({
          price: activePosition.sl,
          color: '#f43f5e', lineWidth: 2, lineStyle: 2,
          axisLabelVisible: true,
          title: `SL  ${activePosition.sl.toFixed(dec)}`,
        });
      }

      if (activePosition.tp != null) {
        tpLineRef.current = seriesRef.current.createPriceLine({
          price: activePosition.tp,
          color: '#10b981', lineWidth: 2, lineStyle: 2,
          axisLabelVisible: true,
          title: `TP  ${activePosition.tp.toFixed(dec)}`,
        });
      }
    }
  }, [activePosition, priceDecimals]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full h-full"
      style={{ minHeight: '300px', background: '#0a0b0d' }}
    />
  );
});

TradingChart.displayName = 'TradingChart';

export default TradingChart;
