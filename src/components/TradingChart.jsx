import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';

function hexToFill(hex, alpha = 0.08) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

class FibonacciRenderer {
  constructor(source) { this._source = source; }
  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const { context: ctx, horizontalPixelRatio: hr, verticalPixelRatio: vr } = scope;
      const s = this._source;
      if (!s._chart || !s._series) return;

      const x1 = s._chart.timeScale().timeToCoordinate(s._p1.time);
      const x2 = s._chart.timeScale().timeToCoordinate(s._p2.time);
      if (x1 == null || x2 == null) return;

      const left = Math.round(Math.min(x1, x2) * hr);
      const right = Math.round(Math.max(x1, x2) * hr);
      const w = right - left;
      if (w < 2) return;

      const coords = s._levels.map(lv => {
        const y = s._series.priceToCoordinate(lv.price);
        return y != null ? Math.round(y * vr) : null;
      });

      for (let i = 0; i < coords.length - 1; i++) {
        if (coords[i] == null || coords[i + 1] == null) continue;
        const top = Math.min(coords[i], coords[i + 1]);
        const h = Math.abs(coords[i + 1] - coords[i]);
        ctx.fillStyle = hexToFill(s._levels[i]?.color || '#ffffff');
        ctx.fillRect(left, top, w, h);
      }

      ctx.font = `${Math.round(11 * hr)}px 'JetBrains Mono', monospace`;
      ctx.textBaseline = 'middle';

      for (let i = 0; i < coords.length; i++) {
        if (coords[i] == null) continue;
        const lv = s._levels[i];
        const y = coords[i];

        ctx.strokeStyle = lv.color;
        ctx.globalAlpha = s._preview ? 0.45 : 0.85;
        ctx.lineWidth = Math.max(1, Math.round(hr));
        ctx.setLineDash(s._preview ? [4 * hr, 4 * hr] : [6 * hr, 3 * hr]);
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.globalAlpha = s._preview ? 0.4 : 0.8;
        ctx.fillStyle = lv.color;
        const label = s._preview
          ? `${(lv.level * 100).toFixed(1)}%`
          : `${(lv.level * 100).toFixed(1)}%  ${lv.price.toFixed(s._dec)}`;
        ctx.fillText(label, left + 6 * hr, y - 6 * vr);
      }
      ctx.globalAlpha = 1;
    });
  }
}

class FibonacciPaneView {
  constructor(source) { this._source = source; this._renderer = new FibonacciRenderer(source); }
  update() {}
  renderer() { return this._renderer; }
}

class FibonacciPrimitive {
  constructor(p1, p2, levels, dec, preview = false) {
    this._p1 = p1;
    this._p2 = p2;
    this._levels = levels;
    this._dec = dec;
    this._preview = preview;
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
    this._paneViews = [new FibonacciPaneView(this)];
  }
  attached({ chart, series, requestUpdate }) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }
  detached() { this._chart = null; this._series = null; this._requestUpdate = null; }
  updateAllViews() {}
  paneViews() { return this._paneViews; }
  updatePoints(p1, p2, levels) {
    this._p1 = p1;
    this._p2 = p2;
    this._levels = levels;
    if (this._requestUpdate) this._requestUpdate();
  }
}

class TrendlineRenderer {
  constructor(source) { this._source = source; }
  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const { context: ctx, horizontalPixelRatio: hr, verticalPixelRatio: vr } = scope;
      const s = this._source;
      if (!s._chart || !s._series) return;

      const x1 = s._chart.timeScale().timeToCoordinate(s._p1.time);
      const x2 = s._chart.timeScale().timeToCoordinate(s._p2.time);
      const y1 = s._series.priceToCoordinate(s._p1.price);
      const y2 = s._series.priceToCoordinate(s._p2.price);
      if (x1 == null || x2 == null || y1 == null || y2 == null) return;

      ctx.strokeStyle = s._color;
      ctx.globalAlpha = s._preview ? 0.5 : 1;
      ctx.lineWidth = Math.max(1, Math.round((s._preview ? 1 : 2) * hr));
      ctx.setLineDash(s._preview ? [6 * hr, 4 * hr] : []);
      ctx.beginPath();
      ctx.moveTo(Math.round(x1 * hr), Math.round(y1 * vr));
      ctx.lineTo(Math.round(x2 * hr), Math.round(y2 * vr));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      const r = 4 * hr;
      ctx.fillStyle = s._color;
      ctx.beginPath();
      ctx.arc(Math.round(x1 * hr), Math.round(y1 * vr), r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(Math.round(x2 * hr), Math.round(y2 * vr), r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

class TrendlinePaneView {
  constructor(source) { this._source = source; this._renderer = new TrendlineRenderer(source); }
  update() {}
  renderer() { return this._renderer; }
}

class TrendlinePrimitive {
  constructor(p1, p2, color, preview = false) {
    this._p1 = p1;
    this._p2 = p2;
    this._color = color;
    this._preview = preview;
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
    this._paneViews = [new TrendlinePaneView(this)];
  }
  attached({ chart, series, requestUpdate }) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }
  detached() { this._chart = null; this._series = null; this._requestUpdate = null; }
  updateAllViews() {}
  paneViews() { return this._paneViews; }
  updatePoints(p1, p2) {
    this._p1 = p1;
    this._p2 = p2;
    if (this._requestUpdate) this._requestUpdate();
  }
}

class RectangleRenderer {
  constructor(source) { this._source = source; }
  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const { context: ctx, horizontalPixelRatio: hr, verticalPixelRatio: vr } = scope;
      const s = this._source;
      if (!s._chart || !s._series) return;

      const x1 = s._chart.timeScale().timeToCoordinate(s._p1.time);
      const x2 = s._chart.timeScale().timeToCoordinate(s._p2.time);
      const y1 = s._series.priceToCoordinate(s._p1.price);
      const y2 = s._series.priceToCoordinate(s._p2.price);
      if (x1 == null || x2 == null || y1 == null || y2 == null) return;

      const left = Math.round(Math.min(x1, x2) * hr);
      const top = Math.round(Math.min(y1, y2) * vr);
      const width = Math.round(Math.abs(x2 - x1) * hr);
      const height = Math.round(Math.abs(y2 - y1) * vr);

      ctx.fillStyle = s._fillColor;
      ctx.fillRect(left, top, width, height);

      ctx.strokeStyle = s._borderColor;
      ctx.lineWidth = Math.max(1, Math.round(hr));
      ctx.strokeRect(left, top, width, height);
    });
  }
}

class RectanglePaneView {
  constructor(source) { this._source = source; this._renderer = new RectangleRenderer(source); }
  update() {}
  renderer() { return this._renderer; }
}

class RectanglePrimitive {
  constructor(p1, p2, fillColor, borderColor) {
    this._p1 = p1;
    this._p2 = p2;
    this._fillColor = fillColor;
    this._borderColor = borderColor;
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
    this._paneViews = [new RectanglePaneView(this)];
  }
  attached({ chart, series, requestUpdate }) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }
  detached() { this._chart = null; this._series = null; this._requestUpdate = null; }
  updateAllViews() {}
  paneViews() { return this._paneViews; }
  updateCorners(p1, p2) {
    this._p1 = p1;
    this._p2 = p2;
    if (this._requestUpdate) this._requestUpdate();
  }
}

class SessionsRenderer {
  constructor(source) { this._source = source; }
  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const { context: ctx, horizontalPixelRatio: hr, verticalPixelRatio: vr } = scope;
      const s = this._source;
      if (!s._chart || !s._series || !s._data || !s._show) {
        console.log("SessionsRenderer: Salida temprana", { 
          chart: !!s._chart, 
          series: !!s._series, 
          hasData: !!s._data, 
          show: s._show 
        });
        return;
      }

      const items = s._data;
      const range = s._chart.timeScale().getVisibleLogicalRange();
      if (!range) return;

      const fromIdx = Math.max(0, Math.floor(range.from));
      const toIdx = Math.min(items.length - 1, Math.ceil(range.to));

      const config = s._config || {};
      const asiaCfg = config.asia || { color: '#8b5cf6', opacity: 0.15, start: 0, end: 9 };
      const lonCfg = config.london || { color: '#eab308', opacity: 0.15, start: 8, end: 17 };
      const nyCfg = config.ny || { color: '#10b981', opacity: 0.15, start: 13, end: 22 };

      const getUSDST = (year) => {
        const march1 = new Date(Date.UTC(year, 2, 1));
        const firstSunMarch = 1 + (7 - march1.getUTCDay()) % 7;
        const secondSunMarch = firstSunMarch + 7;
        const nov1 = new Date(Date.UTC(year, 10, 1));
        const firstSunNov = 1 + (7 - nov1.getUTCDay()) % 7;
        return {
          start: new Date(Date.UTC(year, 2, secondSunMarch, 7)),
          end: new Date(Date.UTC(year, 10, firstSunNov, 6)),
        };
      };

      const getUKDST = (year) => {
        const marchLast = new Date(Date.UTC(year, 2, 31));
        const lastSunMarch = 31 - marchLast.getUTCDay();
        const octLast = new Date(Date.UTC(year, 9, 31));
        const lastSunOct = 31 - octLast.getUTCDay();
        return {
          start: new Date(Date.UTC(year, 2, lastSunMarch, 1)),
          end: new Date(Date.UTC(year, 9, lastSunOct, 1)),
        };
      };

      const hexToRgba = (hex, opacity) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      };

      for (let i = fromIdx; i <= toIdx; i++) {
        const item = items[i];
        if (!item) continue;
        const x = s._chart.timeScale().timeToCoordinate(item.time);
        if (x == null) continue;

        let w = 4 * hr;
        if (i < items.length - 1) {
          const x_next = s._chart.timeScale().timeToCoordinate(items[i+1].time);
          if (x_next != null) w = (x_next - x) * hr;
        } else if (i > 0) {
          const x_prev = s._chart.timeScale().timeToCoordinate(items[i-1].time);
          if (x_prev != null) w = (x - x_prev) * hr;
        }

        const date = new Date(item.time * 1000);

        const hour = date.getUTCHours();

        let lonStart = lonCfg.start;
        let lonEnd = lonCfg.end;

        let nyStart = nyCfg.start;
        let nyEnd = nyCfg.end;

        let asiaStart = asiaCfg.start;
        let asiaEnd = asiaCfg.end;


        const isInSession = (h, s, e) => {
          if (s <= e) return h >= s && h < e;
          return h >= s || h < e; // Cruza la medianoche (vuelve a 0)
        };

        let fillColors = [];
        
        if (isInSession(hour, asiaStart, asiaEnd)) {
          fillColors.push(hexToRgba(asiaCfg.color, asiaCfg.opacity || 0.15));
        }
        if (isInSession(hour, lonStart, lonEnd)) {
          fillColors.push(hexToRgba(lonCfg.color, lonCfg.opacity || 0.15));
        }
        if (isInSession(hour, nyStart, nyEnd)) {
          fillColors.push(hexToRgba(nyCfg.color, nyCfg.opacity || 0.15));
        }

        const left = Math.round(x * hr);
        const top = 0;
        const height = ctx.canvas.height;
        
        for (const color of fillColors) {
          ctx.fillStyle = color;
          ctx.fillRect(left, top, Math.ceil(w), height);
        }
      }
    });
  }
}

class SessionsPaneView {
  constructor(source) { this._source = source; this._renderer = new SessionsRenderer(source); }
  update() {}
  renderer() { return this._renderer; }
}

class SessionsPrimitive {
  constructor(data, show = false, config = null) {
    this._data = data;
    this._show = show;
    this._config = config;
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
    this._paneViews = [new SessionsPaneView(this)];
  }
  attached({ chart, series, requestUpdate }) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }
  detached() { this._chart = null; this._series = null; this._requestUpdate = null; }
  updateAllViews() {}
  paneViews() { return this._paneViews; }
  updateData(data, show, config) {
    this._data = data;
    this._show = show;
    this._config = config;
    if (this._requestUpdate) this._requestUpdate();
  }
}

const TradingChart = forwardRef(({
  data, drawingMode, activePosition,
  onNeedMoreData, focusIndex, priceDecimals = 5, minMove = 0.00001,
  onSLTPDrag, dataKey, fiboLevels,
  pipMultiplier = 10000, lotSize = 0.01, pipValue = 10,
  showSessions = false, sessionsConfig = null,
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

  const fiboLevelsRef = useRef(fiboLevels);

  const drawingsRef = useRef([]);
  const firstPointRef = useRef(null);
  const cleanupPreviewRef = useRef(null);
  const sessionsPrimitiveRef = useRef(null);

  useEffect(() => {
    drawingModeRef.current = drawingMode;
    firstPointRef.current = null;
    if (cleanupPreviewRef.current) cleanupPreviewRef.current();
    if (chartContainerRef.current) {
      chartContainerRef.current.style.cursor = drawingMode ? 'crosshair' : '';
    }
  }, [drawingMode]);

  useEffect(() => { needMoreDataRef.current = onNeedMoreData; }, [onNeedMoreData]);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { activePositionRef.current = activePosition; }, [activePosition]);
  useEffect(() => { onSLTPDragRef.current = onSLTPDrag; }, [onSLTPDrag]);
  useEffect(() => { fiboLevelsRef.current = fiboLevels; }, [fiboLevels]);

  useEffect(() => {
    if (sessionsPrimitiveRef.current) {
      sessionsPrimitiveRef.current.updateData(data, showSessions, sessionsConfig);
    }
  }, [data, showSessions, sessionsConfig]);

  useEffect(() => {
    priceDecimalsRef.current = priceDecimals;
    minMoveRef.current = minMove;
    if (seriesRef.current) {
      seriesRef.current.applyOptions({
        priceFormat: { type: 'price', precision: priceDecimals, minMove },
      });
    }
  }, [priceDecimals, minMove]);

  const removeDrawingItem = (item, chart, series) => {
    try {
      if (item.kind === 'series' && chart) chart.removeSeries(item.ref);
      if (item.kind === 'priceLine' && series) series.removePriceLine(item.ref);
      if (item.kind === 'primitive' && series) series.detachPrimitive(item.ref);
    } catch {}
  };

  const clearAllDrawings = () => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    drawingsRef.current.forEach(d => d.items.forEach(i => removeDrawingItem(i, chart, series)));
    drawingsRef.current = [];
  };

  const removeLastDrawing = () => {
    if (drawingsRef.current.length === 0) return;
    const last = drawingsRef.current.pop();
    const chart = chartRef.current;
    const series = seriesRef.current;
    last.items.forEach(i => removeDrawingItem(i, chart, series));
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
      localization: {
        timeFormatter: (time) => {
          if (typeof time === 'string') return time;
          const date = new Date(time * 1000);
          return new Intl.DateTimeFormat('es-ES', { 
            timeZone: 'UTC', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          }).format(date) + ' (UTC)';
        }
      },
      rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.05)' },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: true,
        tickMarkFormatter: (time, tickMarkType) => {
          if (typeof time === 'string') return time;
          const date = new Date(time * 1000);
          const hours = date.getUTCHours().toString().padStart(2, '0');
          const mins = date.getUTCMinutes().toString().padStart(2, '0');
          
          if (tickMarkType <= 2) { // 0=Year, 1=Month, 2=DayOfMonth
             return new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(date);
          }
          return `${hours}:${mins}`;
        }
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

    const sessionsPrim = new SessionsPrimitive(dataRef.current, showSessions, sessionsConfig);
    candlestickSeries.attachPrimitive(sessionsPrim);
    sessionsPrimitiveRef.current = sessionsPrim;

    // --- Drawing helpers ---
    let previewLines = [];
    let previewPrimitive = null;

    const cleanupPreview = () => {
      previewLines.forEach(pl => {
        try { candlestickSeries.removePriceLine(pl); } catch {}
      });
      previewLines = [];
      if (previewPrimitive) {
        try { candlestickSeries.detachPrimitive(previewPrimitive); } catch {}
        previewPrimitive = null;
      }
    };
    cleanupPreviewRef.current = cleanupPreview;

    const buildFiboLevels = (startPrice, endPrice, dec) => {
      const diff = endPrice - startPrice;
      if (Math.abs(diff) === 0) return null;
      const cfg = fiboLevelsRef.current || [];
      return cfg.map(lv => ({
        level: lv.value,
        price: parseFloat((endPrice - diff * lv.value).toFixed(dec)),
        color: lv.color,
      }));
    };

    // --- Live preview on crosshair move ---
    chart.subscribeCrosshairMove((param) => {
      const mode = drawingModeRef.current;
      const fp = firstPointRef.current;
      if (!mode || !fp || !param.point || !param.time) return;

      const price = candlestickSeries.coordinateToPrice(param.point.y);
      if (price == null || isNaN(price)) return;
      const dec = priceDecimalsRef.current;
      const cur = parseFloat(price.toFixed(dec));

      switch (mode) {
        case 'trendline': {
          const p2 = { time: param.time, price: cur };
          if (!previewPrimitive) {
            previewPrimitive = new TrendlinePrimitive(fp, p2, '#3b82f6', true);
            candlestickSeries.attachPrimitive(previewPrimitive);
          } else {
            previewPrimitive.updatePoints(fp, p2);
          }
          break;
        }
        case 'rectangle': {
          if (fp.price === cur) break;
          const corner2 = { time: param.time, price: cur };
          if (!previewPrimitive) {
            previewPrimitive = new RectanglePrimitive(
              fp, corner2,
              'rgba(245, 158, 11, 0.08)', 'rgba(245, 158, 11, 0.35)'
            );
            candlestickSeries.attachPrimitive(previewPrimitive);
          } else {
            previewPrimitive.updateCorners(fp, corner2);
          }
          break;
        }
        case 'fibonacci': {
          const levels = buildFiboLevels(fp.price, cur, dec);
          if (!levels) break;
          const corner2 = { time: param.time, price: cur };
          if (!previewPrimitive) {
            previewPrimitive = new FibonacciPrimitive(fp, corner2, levels, dec, true);
            candlestickSeries.attachPrimitive(previewPrimitive);
          } else {
            previewPrimitive.updatePoints(fp, corner2, levels);
          }
          break;
        }
      }
    });

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
            price: rounded, color: '#8b5cf6',
            lineWidth: 2, lineStyle: 0,
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
            const fp = firstPointRef.current;
            firstPointRef.current = null;
            cleanupPreview();

            if (fp.time === param.time && fp.price === rounded) break;

            const line = new TrendlinePrimitive(
              fp, { time: param.time, price: rounded }, '#3b82f6', false
            );
            candlestickSeries.attachPrimitive(line);
            drawingsRef.current.push({
              type: 'trendline',
              items: [{ kind: 'primitive', ref: line }],
            });
          }
          break;
        }

        case 'rectangle': {
          if (!firstPointRef.current) {
            firstPointRef.current = { time: param.time, price: rounded };
          } else {
            const fp = firstPointRef.current;
            firstPointRef.current = null;
            cleanupPreview();

            if (fp.time === param.time && fp.price === rounded) break;

            const rect = new RectanglePrimitive(
              fp, { time: param.time, price: rounded },
              'rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.7)'
            );
            candlestickSeries.attachPrimitive(rect);
            drawingsRef.current.push({
              type: 'rectangle',
              items: [{ kind: 'primitive', ref: rect }],
            });
          }
          break;
        }

        case 'fibonacci': {
          if (!firstPointRef.current) {
            firstPointRef.current = { time: param.time, price: rounded };
          } else {
            const fp = firstPointRef.current;
            firstPointRef.current = null;
            cleanupPreview();

            const levels = buildFiboLevels(fp.price, rounded, dec);
            if (!levels) break;

            const fib = new FibonacciPrimitive(
              fp, { time: param.time, price: rounded }, levels, dec, false
            );
            candlestickSeries.attachPrimitive(fib);
            drawingsRef.current.push({
              type: 'fibonacci',
              items: [{ kind: 'primitive', ref: fib }],
            });
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
        const pos = activePositionRef.current;

        if (pos) {
          const entry = pos.entry;
          const pMult = pos.type === 'BUY' ? 1 : -1;
          const pips = ((r - entry) * pipMultiplier * pMult).toFixed(1);
          const usd = ((r - entry) * pipMultiplier * pMult * (pos.lotSize || lotSize) * (pos.pipValue || pipValue)).toFixed(2);

          if (dragType === 'sl' && slLineRef.current) {
            slLineRef.current.applyOptions({ price: r, title: `SL  ${r.toFixed(dec)}  (${pips} pips / $${usd})` });
          } else if (dragType === 'tp' && tpLineRef.current) {
            tpLineRef.current.applyOptions({ price: r, title: `TP  ${r.toFixed(dec)}  (${pips} pips / $${usd})` });
          }
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
      cleanupPreviewRef.current = null;
      
      if (sessionsPrimitiveRef.current) {
        try { candlestickSeries.detachPrimitive(sessionsPrimitiveRef.current); } catch {}
        sessionsPrimitiveRef.current = null;
      }

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
      const entry = activePosition.entry;
      const posLot = activePosition.lotSize || lotSize;
      const posPipVal = activePosition.pipValue || pipValue;

      const calcPnl = (targetPrice) => {
        const pips = activePosition.type === 'BUY'
          ? (targetPrice - entry) * pipMultiplier
          : (entry - targetPrice) * pipMultiplier;
        const dollars = pips * posLot * posPipVal;
        return { pips: pips.toFixed(1), dollars: dollars.toFixed(2) };
      };

      entryLineRef.current = seriesRef.current.createPriceLine({
        price: entry,
        color: '#3b82f6', lineWidth: 2, lineStyle: 0,
        axisLabelVisible: true,
        title: `${activePosition.type}  ${entry.toFixed(dec)}`,
      });

      if (activePosition.sl != null) {
        const { pips, dollars } = calcPnl(activePosition.sl);
        slLineRef.current = seriesRef.current.createPriceLine({
          price: activePosition.sl,
          color: '#f43f5e', lineWidth: 2, lineStyle: 2,
          axisLabelVisible: true,
          title: `SL  ${activePosition.sl.toFixed(dec)}  (${pips} pips / $${dollars})`,
        });
      }

      if (activePosition.tp != null) {
        const { pips, dollars } = calcPnl(activePosition.tp);
        tpLineRef.current = seriesRef.current.createPriceLine({
          price: activePosition.tp,
          color: '#10b981', lineWidth: 2, lineStyle: 2,
          axisLabelVisible: true,
          title: `TP  ${activePosition.tp.toFixed(dec)}  (+${pips} pips / +$${dollars})`,
        });
      }
    }
  }, [activePosition, priceDecimals, pipMultiplier, lotSize, pipValue]);

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
