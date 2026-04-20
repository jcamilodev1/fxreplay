import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import { calculateSMA, calculateEMA } from './MovingAverageSettings';
import { calculateRSI } from './RSISettings';
import { calculateStochastic } from './StochasticSettings';

function hexToFill(hex, alpha = 0.08) {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getFibonacciCoords(series, levels, verticalRatio) {
  return levels.map((lv) => {
    const y = series.priceToCoordinate(lv.price);
    return y == null ? null : Math.round(y * verticalRatio);
  });
}

function drawFibonacciBands(ctx, coords, left, width, levels) {
  for (let i = 0; i < coords.length - 1; i++) {
    if (coords[i] == null || coords[i + 1] == null) continue;
    const top = Math.min(coords[i], coords[i + 1]);
    const height = Math.abs(coords[i + 1] - coords[i]);
    ctx.fillStyle = hexToFill(levels[i]?.color || '#ffffff');
    ctx.fillRect(left, top, width, height);
  }
}

function drawFibonacciLevels({
  ctx,
  coords,
  left,
  right,
  levels,
  horizontalRatio,
  decimalPlaces,
  isPreview,
  lineStyle,
  lineWidth,
}) {
  ctx.font = `${Math.round(11 * horizontalRatio)}px 'JetBrains Mono', monospace`;
  ctx.textBaseline = 'middle';

  for (let i = 0; i < coords.length; i++) {
    if (coords[i] == null) continue;
    const level = levels[i];
    const y = coords[i];

    ctx.strokeStyle = level.color;
    ctx.globalAlpha = isPreview ? 0.45 : 0.85;
    ctx.lineWidth = Math.max(1, Math.round((lineWidth || 1) * horizontalRatio));
    let dash = [6 * horizontalRatio, 3 * horizontalRatio];
    if (lineStyle === 'solid') dash = [];
    if (lineStyle === 'dotted') dash = [2 * horizontalRatio, 8 * horizontalRatio];
    if (lineStyle === 'dashed') dash = [12 * horizontalRatio, 10 * horizontalRatio];
    ctx.setLineDash(isPreview ? [4 * horizontalRatio, 4 * horizontalRatio] : dash);
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.globalAlpha = isPreview ? 0.4 : 0.8;
    ctx.fillStyle = level.color;
    const label = isPreview
      ? `${(level.level * 100).toFixed(1)}%`
      : `${(level.level * 100).toFixed(1)}%  ${level.price.toFixed(decimalPlaces)}`;
    ctx.fillText(label, left + 6 * horizontalRatio, y - 6);
  }
}

function drawFibonacciSelectionOutline(ctx, coords, left, width, horizontalRatio, isSelected) {
  if (!isSelected) return;
  const valid = coords.filter((v) => v != null);
  if (valid.length === 0) return;

  const topY = Math.min(...valid);
  const bottomY = Math.max(...valid);
  if (!Number.isFinite(topY) || !Number.isFinite(bottomY)) return;

  ctx.strokeStyle = 'rgba(248,250,252,0.9)';
  ctx.lineWidth = Math.max(1, Math.round(1.5 * horizontalRatio));
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.95;
  ctx.strokeRect(left, topY, Math.max(1, width), Math.max(1, bottomY - topY));
}

function drawFibonacciSelectionHandles(ctx, coords, left, width, horizontalRatio, isSelected) {
  if (!isSelected) return;
  const valid = coords.filter((v) => v != null);
  if (valid.length === 0) return;

  const topY = Math.min(...valid);
  const bottomY = Math.max(...valid);
  if (!Number.isFinite(topY) || !Number.isFinite(bottomY)) return;

  const right = left + width;
  const centerX = Math.round((left + right) / 2);
  const centerY = Math.round((topY + bottomY) / 2);
  const radius = Math.max(3, Math.round(3.5 * horizontalRatio));
  const points = [
    [left, topY],
    [centerX, topY],
    [right, topY],
    [left, centerY],
    [right, centerY],
    [left, bottomY],
    [centerX, bottomY],
    [right, bottomY],
  ];

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0b1220';
  ctx.strokeStyle = 'rgba(248,250,252,0.95)';
  ctx.lineWidth = Math.max(1, Math.round(1.2 * horizontalRatio));
  points.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y), radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

class FibonacciRenderer {
  constructor(source) { this._source = source; }
  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const { context: ctx, horizontalPixelRatio: hr, verticalPixelRatio: vr } = scope;
      const s = this._source;
      if (!s._chart || !s._series) return;
      const isSelected = !!s._selected && !s._preview;

      const x1 = s._chart.timeScale().timeToCoordinate(s._p1.time);
      const x2 = s._chart.timeScale().timeToCoordinate(s._p2.time);
      if (x1 == null || x2 == null) return;

      const left = Math.round(Math.min(x1, x2) * hr);
      const right = Math.round(Math.max(x1, x2) * hr);
      const w = right - left;
      if (w < 2) return;

      const coords = getFibonacciCoords(s._series, s._levels, vr);
      drawFibonacciBands(ctx, coords, left, w, s._levels);
      drawFibonacciLevels({
        ctx,
        coords,
        left,
        right,
        levels: s._levels,
        horizontalRatio: hr,
        decimalPlaces: s._dec,
        isPreview: s._preview,
        lineStyle: s._lineStyle,
        lineWidth: s._lineWidth,
      });
      drawFibonacciSelectionOutline(ctx, coords, left, w, hr, isSelected);
      drawFibonacciSelectionHandles(ctx, coords, left, w, hr, isSelected);
      ctx.globalAlpha = 1;
    });
  }
}

class FibonacciPaneView {
  constructor(source) { this._source = source; this._renderer = new FibonacciRenderer(source); }
  update() {
    // No-op: el renderer lee estado directamente desde la fuente.
  }
  renderer() { return this._renderer; }
}

class FibonacciPrimitive {
  constructor(p1, p2, levels, dec, preview = false) {
    this._p1 = p1;
    this._p2 = p2;
    this._levels = levels;
    this._dec = dec;
    this._preview = preview;
    this._selected = false;
    this._lineStyle = 'dashed';
    this._lineWidth = 1;
    this._accentColor = levels?.[0]?.color || '#22d3ee';
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
  updateAppearance({ color, lineStyle, lineWidth }) {
    if (typeof color === 'string') {
      this._accentColor = color;
    }
    if (lineStyle === 'solid' || lineStyle === 'dashed' || lineStyle === 'dotted') {
      this._lineStyle = lineStyle;
    }
    if (typeof lineWidth === 'number' && Number.isFinite(lineWidth)) {
      this._lineWidth = Math.min(6, Math.max(1, lineWidth));
    }
    if (this._requestUpdate) this._requestUpdate();
  }
  getAppearance() {
    return {
      color: this._accentColor,
      lineStyle: this._lineStyle,
      lineWidth: this._lineWidth,
    };
  }
  getLevelConfig() {
    return this._levels.map((level) => ({
      value: level.level,
      color: level.color,
    }));
  }
  setSelected(selected) {
    this._selected = selected;
    if (this._requestUpdate) this._requestUpdate();
  }
}

function resolveTrendlineDash(lineStyle, horizontalRatio) {
  if (lineStyle === 'dashed') return [12 * horizontalRatio, 14 * horizontalRatio];
  if (lineStyle === 'dotted') return [2 * horizontalRatio, 10 * horizontalRatio];
  return [];
}

function drawTrendlinePath(ctx, source, { x1, y1, x2, y2, hr, vr, isSelected }) {
  ctx.strokeStyle = source._color;
  ctx.globalAlpha = source._preview ? 0.5 : 1;
  const baseLineWidth = Math.max(1, source._lineWidth ?? 2);
  const finalLineWidth = source._preview
    ? Math.max(1, baseLineWidth - 1)
    : (isSelected ? baseLineWidth + 1 : baseLineWidth);
  ctx.lineWidth = Math.max(1, Math.round(finalLineWidth * hr));
  const styleDash = resolveTrendlineDash(source._lineStyle, hr);
  ctx.setLineDash(source._preview ? [6 * hr, 4 * hr] : styleDash);
  ctx.beginPath();
  ctx.moveTo(Math.round(x1 * hr), Math.round(y1 * vr));
  ctx.lineTo(Math.round(x2 * hr), Math.round(y2 * vr));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawTrendlineHandles(ctx, source, { x1, y1, x2, y2, hr, vr, isSelected }) {
  const r = 4 * hr;
  const x1Px = Math.round(x1 * hr);
  const y1Px = Math.round(y1 * vr);
  const x2Px = Math.round(x2 * hr);
  const y2Px = Math.round(y2 * vr);
  ctx.fillStyle = source._color;
  ctx.beginPath();
  ctx.arc(x1Px, y1Px, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x2Px, y2Px, r, 0, Math.PI * 2);
  ctx.fill();

  if (!isSelected) return;
  const outerRadius = r + Math.max(1, Math.round(2 * hr));
  ctx.strokeStyle = 'rgba(248,250,252,0.95)';
  ctx.lineWidth = Math.max(1, Math.round(1.2 * hr));
  ctx.beginPath();
  ctx.arc(x1Px, y1Px, outerRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x2Px, y2Px, outerRadius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawTrendlineArrow(ctx, source, { x1, y1, x2, y2, hr, vr }) {
  if (source._preview || !source._showArrow) return;
  const dx = (x2 - x1) * hr;
  const dy = (y2 - y1) * vr;
  const len = Math.hypot(dx, dy);
  if (len <= 0.001) return;

  const ux = dx / len;
  const uy = dy / len;
  const arrowLength = Math.max(8, Math.round(12 * hr));
  const arrowHalfWidth = Math.max(4, Math.round(5 * hr));
  const tipX = Math.round(x2 * hr);
  const tipY = Math.round(y2 * vr);
  const baseX = tipX - ux * arrowLength;
  const baseY = tipY - uy * arrowLength;
  const nx = -uy;
  const ny = ux;

  ctx.fillStyle = source._color;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(baseX + nx * arrowHalfWidth, baseY + ny * arrowHalfWidth);
  ctx.lineTo(baseX - nx * arrowHalfWidth, baseY - ny * arrowHalfWidth);
  ctx.closePath();
  ctx.fill();
}

function drawTrendlineLabel(ctx, source, { x1, y1, x2, y2, hr, vr }) {
  if (source._preview || !source._label) return;
  const labelPosition = source._labelPosition || 'above';
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const labelOffset = labelPosition === 'above' ? -10 : labelPosition === 'below' ? 14 : 2;
  const xPx = Math.round(mx * hr);
  const yPx = Math.round(my * vr) + Math.round(labelOffset * vr);
  const textSize = Math.max(8, source._textSize || 11);
  ctx.fillStyle = source._color;
  ctx.globalAlpha = 0.95;
  ctx.font = `${Math.round(textSize * hr)}px 'Outfit', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = labelPosition === 'above' ? 'bottom' : labelPosition === 'below' ? 'top' : 'middle';
  if (labelPosition === 'center') {
    const textW = ctx.measureText(source._label).width;
    const padX = Math.round(6 * hr);
    const boxH = Math.round(14 * vr);
    const bgColor = source._bgColor || '#0d0f14';
    ctx.fillStyle = bgColor;
    ctx.globalAlpha = 1;
    ctx.fillRect(
      Math.round(xPx - textW / 2 - padX),
      Math.round(yPx - boxH / 2),
      Math.round(textW + padX * 2),
      boxH
    );
    ctx.fillStyle = source._color;
    ctx.globalAlpha = 0.95;
  }
  ctx.fillText(source._label, xPx, yPx);
}

function attachPrimitiveContext(instance, { chart, series, requestUpdate }) {
  instance._chart = chart;
  instance._series = series;
  instance._requestUpdate = requestUpdate;
}

class TrendlineRenderer {
  constructor(source) { this._source = source; }
  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const { context: ctx, horizontalPixelRatio: hr, verticalPixelRatio: vr } = scope;
      const s = this._source;
      if (!s._chart || !s._series) return;
      const isSelected = !!s._selected && !s._preview;

      const x1 = s._chart.timeScale().timeToCoordinate(s._p1.time);
      const x2 = s._chart.timeScale().timeToCoordinate(s._p2.time);
      const y1 = s._series.priceToCoordinate(s._p1.price);
      const y2 = s._series.priceToCoordinate(s._p2.price);
      if (x1 == null || x2 == null || y1 == null || y2 == null) return;

      drawTrendlinePath(ctx, s, { x1, y1, x2, y2, hr, vr, isSelected });
      drawTrendlineHandles(ctx, s, { x1, y1, x2, y2, hr, vr, isSelected });
      drawTrendlineArrow(ctx, s, { x1, y1, x2, y2, hr, vr });
      drawTrendlineLabel(ctx, s, { x1, y1, x2, y2, hr, vr });
      ctx.globalAlpha = 1;
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
    this._lineStyle = 'solid';
    this._lineWidth = 2;
    this._label = '';
    this._labelPosition = 'above';
    this._textSize = 11;
    this._showArrow = false;
    this._bgColor = '#0d0f14';
    this._preview = preview;
    this._selected = false;
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
    this._paneViews = [new TrendlinePaneView(this)];
  }
  attached({ chart, series, requestUpdate }) {
    attachPrimitiveContext(this, { chart, series, requestUpdate });
  }
  detached() { this._chart = null; this._series = null; this._requestUpdate = null; }
  updateAllViews() {}
  paneViews() { return this._paneViews; }
  updatePoints(p1, p2) {
    this._p1 = p1;
    this._p2 = p2;
    if (this._requestUpdate) this._requestUpdate();
  }
  setSelected(selected) {
    this._selected = selected;
    if (this._requestUpdate) this._requestUpdate();
  }
  updateAppearance({ color, lineStyle, lineWidth, label, labelPosition, textSize, showArrow }) {
    if (typeof color === 'string') this._color = color;
    if (typeof lineStyle === 'string') this._lineStyle = lineStyle;
    if (typeof lineWidth === 'number' && Number.isFinite(lineWidth)) {
      this._lineWidth = Math.min(6, Math.max(1, lineWidth));
    }
    if (typeof label === 'string') this._label = label;
    if (labelPosition === 'above' || labelPosition === 'center' || labelPosition === 'below') {
      this._labelPosition = labelPosition;
    }
    if (typeof textSize === 'number' && Number.isFinite(textSize)) {
      this._textSize = Math.min(24, Math.max(8, textSize));
    }
    if (typeof showArrow === 'boolean') this._showArrow = showArrow;
    if (this._requestUpdate) this._requestUpdate();
  }
  getAppearance() {
    return {
      color: this._color,
      lineStyle: this._lineStyle,
      lineWidth: this._lineWidth,
      label: this._label,
      labelPosition: this._labelPosition,
      textSize: this._textSize,
      showArrow: this._showArrow,
    };
  }
}

class CurveRenderer {
  constructor(source) { this._source = source; }
  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const { context: ctx, horizontalPixelRatio: hr, verticalPixelRatio: vr } = scope;
      const s = this._source;
      if (!s._chart || !s._series) return;
      const isSelected = !!s._selected && !s._preview;

      const x1 = s._chart.timeScale().timeToCoordinate(s._p1.time);
      const y1 = s._series.priceToCoordinate(s._p1.price);
      const cx = s._chart.timeScale().timeToCoordinate(s._cp.time);
      const cy = s._series.priceToCoordinate(s._cp.price);
      const x2 = s._chart.timeScale().timeToCoordinate(s._p2.time);
      const y2 = s._series.priceToCoordinate(s._p2.price);

      if (x1 == null || y1 == null || cx == null || cy == null || x2 == null || y2 == null) return;

      const mx = 0.25 * x1 + 0.5 * cx + 0.25 * x2;
      const my = 0.25 * y1 + 0.5 * cy + 0.25 * y2;

      ctx.strokeStyle = s._color;
      ctx.globalAlpha = s._preview ? 0.55 : 1;
      const curveBaseLineWidth = Math.max(1, s._lineWidth ?? 2);
      ctx.lineWidth = Math.max(
        1,
        Math.round((s._preview ? Math.max(1, curveBaseLineWidth - 1) : (isSelected ? curveBaseLineWidth + 1 : curveBaseLineWidth)) * hr)
      );
      const styleDash = s._lineStyle === 'dashed'
        ? [12 * hr, 14 * hr]
        : s._lineStyle === 'dotted'
          ? [2 * hr, 10 * hr]
          : [];
      ctx.setLineDash(s._preview ? [6 * hr, 4 * hr] : styleDash);
      ctx.beginPath();
      ctx.moveTo(Math.round(x1 * hr), Math.round(y1 * vr));
      ctx.quadraticCurveTo(
        Math.round(cx * hr),
        Math.round(cy * vr),
        Math.round(x2 * hr),
        Math.round(y2 * vr)
      );
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      const r = Math.max(3, Math.round(4 * hr));
      const drawHandle = (x, y, alpha = 1) => {
        const selected = !!s._selected && !s._preview;
        const handleRadius = selected ? r + Math.max(1, Math.round(hr)) : r;
        ctx.fillStyle = selected ? '#f8fafc' : s._color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(Math.round(x * hr), Math.round(y * vr), handleRadius, 0, Math.PI * 2);
        ctx.fill();
        if (selected) {
          ctx.strokeStyle = s._color;
          ctx.lineWidth = Math.max(1, Math.round(hr));
          ctx.stroke();
        }
      };
      drawHandle(x1, y1, 1);
      drawHandle(x2, y2, 1);
      drawHandle(mx, my, s._preview ? 0.75 : 0.95);

      if (!s._preview && s._label) {
        const labelPosition = s._labelPosition || 'above';
        const labelOffset = labelPosition === 'above' ? -10 : labelPosition === 'below' ? 14 : 2;
        const xPx = Math.round(mx * hr);
        const yPx = Math.round(my * vr) + Math.round(labelOffset * vr);
        const textSize = Math.max(8, s._textSize || 11);
        ctx.fillStyle = s._color;
        ctx.globalAlpha = 0.95;
        ctx.font = `${Math.round(textSize * hr)}px 'Outfit', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = labelPosition === 'above' ? 'bottom' : labelPosition === 'below' ? 'top' : 'middle';
        if (labelPosition === 'center') {
          const textW = ctx.measureText(s._label).width;
          const padX = Math.round(6 * hr);
          const boxH = Math.round(14 * vr);
          const bgColor = s._bgColor || '#0d0f14';
          ctx.fillStyle = bgColor;
          ctx.globalAlpha = 1;
          ctx.fillRect(
            Math.round(xPx - textW / 2 - padX),
            Math.round(yPx - boxH / 2),
            Math.round(textW + padX * 2),
            boxH
          );
          ctx.fillStyle = s._color;
          ctx.globalAlpha = 0.95;
        }
        ctx.fillText(s._label, xPx, yPx);
      }
      ctx.globalAlpha = 1;
    });
  }
}

class CurvePaneView {
  constructor(source) { this._source = source; this._renderer = new CurveRenderer(source); }
  update() {}
  renderer() { return this._renderer; }
}

class CurvePrimitive {
  constructor(p1, cp, p2, color, preview = false) {
    this._p1 = p1;
    this._cp = cp;
    this._p2 = p2;
    this._color = color;
    this._lineStyle = 'solid';
    this._lineWidth = 2;
    this._label = '';
    this._labelPosition = 'above';
    this._textSize = 11;
    this._bgColor = '#0d0f14';
    this._preview = preview;
    this._selected = false;
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
    this._paneViews = [new CurvePaneView(this)];
  }
  attached({ chart, series, requestUpdate }) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }
  detached() { this._chart = null; this._series = null; this._requestUpdate = null; }
  updateAllViews() {}
  paneViews() { return this._paneViews; }
  updatePoints(p1, cp, p2) {
    this._p1 = p1;
    this._cp = cp;
    this._p2 = p2;
    if (this._requestUpdate) this._requestUpdate();
  }
  setSelected(selected) {
    this._selected = selected;
    if (this._requestUpdate) this._requestUpdate();
  }
  updateAppearance({ color, lineStyle, lineWidth, label, labelPosition, textSize }) {
    if (typeof color === 'string') this._color = color;
    if (typeof lineStyle === 'string') this._lineStyle = lineStyle;
    if (typeof lineWidth === 'number' && Number.isFinite(lineWidth)) {
      this._lineWidth = Math.min(6, Math.max(1, lineWidth));
    }
    if (typeof label === 'string') this._label = label;
    if (labelPosition === 'above' || labelPosition === 'center' || labelPosition === 'below') {
      this._labelPosition = labelPosition;
    }
    if (typeof textSize === 'number' && Number.isFinite(textSize)) {
      this._textSize = Math.min(24, Math.max(8, textSize));
    }
    if (this._requestUpdate) this._requestUpdate();
  }
  getAppearance() {
    return {
      color: this._color,
      lineStyle: this._lineStyle,
      lineWidth: this._lineWidth,
      label: this._label,
      labelPosition: this._labelPosition,
      textSize: this._textSize,
      fillColor: this._fillColor,
      borderColor: this._borderColor,
    };
  }
}

class RectangleRenderer {
  constructor(source) { this._source = source; }
  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const { context: ctx, horizontalPixelRatio: hr, verticalPixelRatio: vr } = scope;
      const s = this._source;
      if (!s._chart || !s._series) return;
      const isSelected = !!s._selected;

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
      const baseLineWidth = Math.max(1, s._lineWidth ?? 2);
      ctx.lineWidth = Math.max(1, Math.round((isSelected ? baseLineWidth + 1 : baseLineWidth) * hr));
      const styleDash = s._lineStyle === 'dashed'
        ? [12 * hr, 14 * hr]
        : s._lineStyle === 'dotted'
          ? [2 * hr, 10 * hr]
          : [];
      ctx.setLineDash(styleDash);
      ctx.strokeRect(left, top, width, height);
      ctx.setLineDash([]);
      if (isSelected) {
        ctx.strokeStyle = 'rgba(248,250,252,0.9)';
        ctx.lineWidth = Math.max(1, Math.round(1.2 * hr));
        ctx.strokeRect(
          left - Math.max(1, Math.round(2 * hr)),
          top - Math.max(1, Math.round(2 * vr)),
          width + Math.max(2, Math.round(4 * hr)),
          height + Math.max(2, Math.round(4 * vr))
        );
      }

      if (s._label) {
        const labelPosition = s._labelPosition || 'center';
        const centerX = Math.round(((x1 + x2) / 2) * hr);
        const centerY = Math.round(((y1 + y2) / 2) * vr);
        const textSize = Math.max(8, s._textSize || 11);
        const yOffset = labelPosition === 'above' ? -14 * vr : labelPosition === 'below' ? 14 * vr : 0;
        const yText = Math.round(centerY + yOffset);
        ctx.font = `${Math.round(textSize * hr)}px 'Outfit', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = s._borderColor;
        ctx.globalAlpha = 0.95;
        if (labelPosition === 'center') {
          const textW = ctx.measureText(s._label).width;
          const padX = Math.round(6 * hr);
          const boxH = Math.round(16 * vr);
          const bgColor = s._bgColor || '#0d0f14';
          ctx.fillStyle = bgColor;
          ctx.globalAlpha = 1;
          ctx.fillRect(
            Math.round(centerX - textW / 2 - padX),
            Math.round(yText - boxH / 2),
            Math.round(textW + padX * 2),
            boxH
          );
          ctx.fillStyle = s._borderColor;
          ctx.globalAlpha = 0.95;
        }
        ctx.fillText(s._label, centerX, yText);
      }
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
    this._color = borderColor;
    this._lineStyle = 'solid';
    this._lineWidth = 2;
    this._label = '';
    this._labelPosition = 'center';
    this._textSize = 11;
    this._bgColor = '#0d0f14';
    this._selected = false;
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
  setSelected(selected) {
    this._selected = selected;
    if (this._requestUpdate) this._requestUpdate();
  }
  updateAppearance({ color, lineStyle, lineWidth, label, labelPosition, textSize }) {
    if (typeof color === 'string') {
      this._color = color;
      this._borderColor = color;
      this._fillColor = hexToFill(color, 0.15);
    }
    if (typeof lineStyle === 'string') this._lineStyle = lineStyle;
    if (typeof lineWidth === 'number' && Number.isFinite(lineWidth)) {
      this._lineWidth = Math.min(6, Math.max(1, lineWidth));
    }
    if (typeof label === 'string') this._label = label;
    if (labelPosition === 'above' || labelPosition === 'center' || labelPosition === 'below') {
      this._labelPosition = labelPosition;
    }
    if (typeof textSize === 'number' && Number.isFinite(textSize)) {
      this._textSize = Math.min(24, Math.max(8, textSize));
    }
    if (this._requestUpdate) this._requestUpdate();
  }
  getAppearance() {
    return {
      color: this._color,
      lineStyle: this._lineStyle,
      lineWidth: this._lineWidth,
      label: this._label,
      labelPosition: this._labelPosition,
      textSize: this._textSize,
    };
  }
}

class HorizontalTextRenderer {
  constructor(source) { this._source = source; }
  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const { context: ctx, horizontalPixelRatio: hr, verticalPixelRatio: vr } = scope;
      const s = this._source;
      if (!s._chart || !s._series || !s._text) return;
      const isSelected = !!s._selected;

      const y = s._series.priceToCoordinate(s._price);
      if (y == null) return;

      const labelPosition = s._labelPosition || 'above';
      const labelOffset = labelPosition === 'above' ? -10 : labelPosition === 'below' ? 14 : 2;
      // Centro real del viewport en pixeles (evita saltos al hacer pan/scroll).
      const xPx = Math.round(ctx.canvas.width / 2);
      const yPx = Math.round(y * vr) + Math.round(labelOffset * vr);
      const textSize = Math.max(8, s._textSize || 11);

      ctx.fillStyle = s._color || '#8b5cf6';
      ctx.globalAlpha = isSelected ? 1 : 0.95;
      ctx.font = `${Math.round(textSize * hr)}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = labelPosition === 'above' ? 'bottom' : labelPosition === 'below' ? 'top' : 'middle';
      if (labelPosition === 'center') {
        const textW = ctx.measureText(s._text).width;
        const padX = Math.round(6 * hr);
        const boxH = Math.round(14 * vr);
        const bgColor = s._bgColor || '#0d0f14';
        ctx.fillStyle = bgColor;
        ctx.globalAlpha = 1;
        ctx.fillRect(
          Math.round(xPx - textW / 2 - padX),
          Math.round(yPx - boxH / 2),
          Math.round(textW + padX * 2),
          boxH
        );
        ctx.fillStyle = s._color || '#8b5cf6';
        ctx.globalAlpha = 0.95;
      }
      ctx.fillText(s._text, xPx, yPx);

      // Handles visuales en los bordes de la vista para la línea horizontal.
      // Se muestran al seleccionar para dejar claro que el objeto está activo.
      if (isSelected) {
        const edgeRadius = Math.max(3, Math.round(4 * hr));
        const pad = Math.max(edgeRadius + 2, Math.round(6 * hr));
        const leftX = pad;
        const rightX = Math.max(leftX + edgeRadius * 2, Math.round(ctx.canvas.width - pad));
        const yHandle = Math.round(y * vr);

        ctx.fillStyle = s._color || '#8b5cf6';
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(leftX, yHandle, edgeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightX, yHandle, edgeRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(248,250,252,0.95)';
        ctx.lineWidth = Math.max(1, Math.round(hr));
        ctx.beginPath();
        ctx.arc(leftX, yHandle, edgeRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rightX, yHandle, edgeRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (isSelected) {
        const textW = ctx.measureText(s._text).width;
        const padX = Math.round(8 * hr);
        const boxH = Math.round(18 * vr);
        ctx.strokeStyle = 'rgba(248,250,252,0.9)';
        ctx.lineWidth = Math.max(1, Math.round(hr));
        ctx.strokeRect(
          Math.round(xPx - textW / 2 - padX),
          Math.round(yPx - boxH / 2),
          Math.round(textW + padX * 2),
          boxH
        );
      }
      ctx.globalAlpha = 1;
    });
  }
}

class HorizontalTextPaneView {
  constructor(source) { this._source = source; this._renderer = new HorizontalTextRenderer(source); }
  update() {}
  renderer() { return this._renderer; }
}

class HorizontalTextPrimitive {
  constructor(price, text, color, labelPosition = 'above', textSize = 11) {
    this._price = price;
    this._text = text;
    this._color = color;
    this._labelPosition = labelPosition;
    this._textSize = textSize;
    this._bgColor = '#0d0f14';
    this._selected = false;
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
    this._unsubscribeVisibleRange = null;
    this._paneViews = [new HorizontalTextPaneView(this)];
  }
  attached({ chart, series, requestUpdate }) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
    const timeScale = chart?.timeScale?.();
    if (timeScale && typeof timeScale.subscribeVisibleLogicalRangeChange === 'function') {
      const handler = () => {
        if (this._requestUpdate) this._requestUpdate();
      };
      timeScale.subscribeVisibleLogicalRangeChange(handler);
      this._unsubscribeVisibleRange = () => {
        try {
          timeScale.unsubscribeVisibleLogicalRangeChange(handler);
        } catch {
          // noop
        }
      };
    }
  }
  detached() {
    if (this._unsubscribeVisibleRange) {
      this._unsubscribeVisibleRange();
      this._unsubscribeVisibleRange = null;
    }
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }
  updateAllViews() {}
  paneViews() { return this._paneViews; }
  updateData({ price, text, color, labelPosition, textSize }) {
    if (typeof price === 'number') this._price = price;
    if (typeof text === 'string') this._text = text;
    if (typeof color === 'string') this._color = color;
    if (labelPosition === 'above' || labelPosition === 'center' || labelPosition === 'below') {
      this._labelPosition = labelPosition;
    }
    if (typeof textSize === 'number' && Number.isFinite(textSize)) {
      this._textSize = Math.min(24, Math.max(8, textSize));
    }
    if (this._requestUpdate) this._requestUpdate();
  }
  setSelected(selected) {
    this._selected = selected;
    if (this._requestUpdate) this._requestUpdate();
  }
}

class SessionsRenderer {
  constructor(source) { this._source = source; }
  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const { context: ctx, horizontalPixelRatio: hr } = scope;
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

      const hexToRgba = (hex, opacity) => {
        const r = Number.parseInt(hex.slice(1, 3), 16);
        const g = Number.parseInt(hex.slice(3, 5), 16);
        const b = Number.parseInt(hex.slice(5, 7), 16);
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
  crosshairMode = 0,
  crosshairVisible = true,
  maConfig = [],
  rsiConfig = null,
  rsiVisible = false,
  stochConfig = null,
  stochVisible = false,
  onDrawingComplete,
  onSelectionChange,
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
  const onSelectionChangeRef = useRef(onSelectionChange);

  const entryLineRef = useRef(null);
  const slLineRef = useRef(null);
  const tpLineRef = useRef(null);

  const fiboLevelsRef = useRef(fiboLevels);
  const crosshairModeRef = useRef(crosshairMode);
  const crosshairVisibleRef = useRef(crosshairVisible);
  const maConfigRef = useRef(maConfig);
  const maSeriesRefs = useRef([]);
  const rsiConfigRef = useRef(rsiConfig);
  const rsiPaneRef = useRef(null);
  const rsiVisibleRef = useRef(rsiVisible);
  const stochConfigRef = useRef(stochConfig);
  const stochPaneRef = useRef(null);
  const stochVisibleRef = useRef(stochVisible);

  const drawingsRef = useRef([]);
  const selectedDrawingIdRef = useRef(null);
  const drawingIdCounterRef = useRef(1);
  const trendlineChainCounterRef = useRef(1);
  const activeTrendlineChainIdRef = useRef(null);
  const trendlineChainIdsRef = useRef([]);
  const firstPointRef = useRef(null);
  const secondPointRef = useRef(null);
  const cleanupPreviewRef = useRef(null);
  const sessionsPrimitiveRef = useRef(null);

  useEffect(() => {
    drawingModeRef.current = drawingMode;
    firstPointRef.current = null;
    secondPointRef.current = null;
    activeTrendlineChainIdRef.current = null;
    trendlineChainIdsRef.current = [];
    if (cleanupPreviewRef.current) cleanupPreviewRef.current();
    if (chartContainerRef.current) {
      chartContainerRef.current.style.cursor = drawingMode ? 'crosshair' : '';
    }
  }, [drawingMode]);

  useEffect(() => { needMoreDataRef.current = onNeedMoreData; }, [onNeedMoreData]);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { activePositionRef.current = activePosition; }, [activePosition]);
  useEffect(() => { onSLTPDragRef.current = onSLTPDrag; }, [onSLTPDrag]);
  useEffect(() => { onSelectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);
  useEffect(() => { fiboLevelsRef.current = fiboLevels; }, [fiboLevels]);
  useEffect(() => { maConfigRef.current = maConfig; }, [maConfig]);
  useEffect(() => { rsiConfigRef.current = rsiConfig; }, [rsiConfig]);
  useEffect(() => { rsiVisibleRef.current = rsiVisible; }, [rsiVisible]);
  useEffect(() => { stochConfigRef.current = stochConfig; }, [stochConfig]);
  useEffect(() => { stochVisibleRef.current = stochVisible; }, [stochVisible]);
  useEffect(() => {
    crosshairModeRef.current = crosshairMode;
    crosshairVisibleRef.current = crosshairVisible;
    if (chartRef.current) {
      chartRef.current.applyOptions({
        crosshair: {
          mode: crosshairMode,
          vertLine: { visible: crosshairVisible },
          horzLine: { visible: crosshairVisible },
        },
      });
    }
  }, [crosshairMode, crosshairVisible]);

  useEffect(() => {
    if (sessionsPrimitiveRef.current) {
      sessionsPrimitiveRef.current.updateData(data, showSessions, sessionsConfig);
    }
  }, [data, showSessions, sessionsConfig]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data || data.length === 0) return;
    maSeriesRefs.current.forEach(ref => {
      try { chart.removeSeries(ref); } catch {}
    });
    maSeriesRefs.current = [];
    if (!maConfig || maConfig.length === 0) return;
    maConfig.forEach(ma => {
      const maData = ma.type === 'EMA'
        ? calculateEMA(data, ma.period)
        : calculateSMA(data, ma.period);
      if (!maData || maData.length === 0) return;
      const lineSeries = chart.addSeries(LineSeries, {
        color: ma.color,
        lineWidth: ma.lineWidth || 2,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
      });
      lineSeries.setData(maData);
      maSeriesRefs.current.push(lineSeries);
    });
  }, [maConfig, data]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data || data.length === 0) return;
    rsiPaneRef.current?.forEach(ref => {
      try { chart.removeSeries(ref); } catch {}
    });
    rsiPaneRef.current = [];
    if (!rsiVisibleRef.current || !rsiConfig || !rsiConfig.period) return;
    const rsiData = calculateRSI(data, rsiConfig.period);
    if (!rsiData || rsiData.length === 0) return;
    const rsiSeries = chart.addSeries(LineSeries, {
      color: rsiConfig.color || '#8b5cf6',
      lineWidth: rsiConfig.lineWidth || 2,
      priceLineVisible: false,
      lastValueVisible: true,
      priceScaleId: 'rsi',
    });
    rsiSeries.setData(rsiData);
    rsiPaneRef.current = [rsiSeries];
    chart.priceScale('rsi').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
  }, [rsiConfig, data, rsiVisible]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data || data.length === 0) return;
    stochPaneRef.current?.forEach(ref => {
      try { chart.removeSeries(ref); } catch {}
    });
    stochPaneRef.current = [];
    if (!stochVisibleRef.current || !stochConfig || !stochConfig.kPeriod) return;
    const stochData = calculateStochastic(data, stochConfig.kPeriod, stochConfig.dPeriod);
    if (!stochData || stochData.length === 0) return;
    const kSeries = chart.addSeries(LineSeries, {
      color: stochConfig.colorK || '#3b82f6',
      lineWidth: stochConfig.lineWidth || 2,
      priceLineVisible: false,
      lastValueVisible: true,
      priceScaleId: 'stoch',
    });
    const dData = stochData.map(d => ({ time: d.time, value: d.d }));
    kSeries.setData(stochData.map(d => ({ time: d.time, value: d.k })));
    const dSeries = chart.addSeries(LineSeries, {
      color: stochConfig.colorD || '#f97316',
      lineWidth: stochConfig.lineWidth || 2,
      priceLineVisible: false,
      lastValueVisible: false,
      priceScaleId: 'stoch',
    });
    dSeries.setData(dData);
    stochPaneRef.current = [kSeries, dSeries];
    chart.priceScale('stoch').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
  }, [stochConfig, data, stochVisible]);

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
    } catch {
      // ignore detach/remove failures from stale chart refs
    }
  };

  const lineStyleToCode = (lineStyle) => {
    if (lineStyle === 'dashed') return 2;
    if (lineStyle === 'dotted') return 1;
    return 0;
  };

  const buildHorizontalTitle = (drawing, dec) => {
    const baseText = (drawing?.text || '').trim() || 'S/R';
    const price = drawing?.price;
    if (typeof price !== 'number') return baseText;
    return `${baseText} ${price.toFixed(dec)}`;
  };

  const applySelectionState = (drawing, selected) => {
    if (!drawing?.items) return;
    if (drawing.type === 'horizontal') {
      const lineRef = drawing.items.find((item) => item.kind === 'priceLine')?.ref;
      if (lineRef) {
        lineRef.applyOptions({
          color: drawing.color || '#8b5cf6',
          lineStyle: lineStyleToCode(drawing.lineStyle || 'solid'),
          lineWidth: selected ? Math.min(6, (drawing.lineWidth || 2) + 1) : (drawing.lineWidth || 2),
          title: '',
        });
      }
    }
    drawing.items.forEach((item) => {
      if (item.kind === 'primitive' && typeof item.ref?.setSelected === 'function') {
        item.ref.setSelected(selected);
      }
    });
  };

  const notifyEditorSelection = (selected) => {
    if (!selected) {
      onSelectionChangeRef.current?.(null);
      return;
    }
    if (selected.type === 'curve' && selected.items?.[0]?.ref?.getAppearance) {
      const appearance = selected.items[0].ref.getAppearance();
      const anchorX = chartRef.current?.timeScale().timeToCoordinate(selected.p1?.time);
      const anchorY = seriesRef.current?.priceToCoordinate(selected.p1?.price);
      onSelectionChangeRef.current?.({
        id: selected.id,
        type: 'curve',
        color: appearance.color,
        lineStyle: appearance.lineStyle,
        lineWidth: appearance.lineWidth,
        text: appearance.label,
        textPosition: appearance.labelPosition,
        textSize: appearance.textSize,
        anchor: (anchorX != null && anchorY != null)
          ? { x: anchorX, y: anchorY }
          : null,
      });
      return;
    }
    if (selected.type === 'trendline' && selected.items?.[0]?.ref?.getAppearance) {
      const chainSegments = drawingsRef.current
        .filter((d) => d.type === 'trendline' && d.chainId === selected.chainId)
        .sort((a, b) => a.id - b.id);
      const lastSegment = chainSegments.at(-1) || selected;
      const appearance = lastSegment.items?.[0]?.ref?.getAppearance
        ? lastSegment.items[0].ref.getAppearance()
        : selected.items[0].ref.getAppearance();
      const anchorX = chartRef.current?.timeScale().timeToCoordinate(selected.p1?.time);
      const anchorY = seriesRef.current?.priceToCoordinate(selected.p1?.price);
      onSelectionChangeRef.current?.({
        id: selected.id,
        type: 'trendline',
        color: appearance.color,
        lineStyle: appearance.lineStyle,
        lineWidth: appearance.lineWidth,
        text: appearance.label,
        textPosition: appearance.labelPosition,
        textSize: appearance.textSize,
        anchor: (anchorX != null && anchorY != null)
          ? { x: anchorX, y: anchorY }
          : null,
      });
      return;
    }
    if (selected.type === 'rectangle' && selected.items?.[0]?.ref?.getAppearance) {
      const appearance = selected.items[0].ref.getAppearance();
      const anchorX = chartRef.current?.timeScale().timeToCoordinate(selected.p1?.time);
      const anchorY = seriesRef.current?.priceToCoordinate(selected.p1?.price);
      onSelectionChangeRef.current?.({
        id: selected.id,
        type: 'rectangle',
        color: appearance.color,
        lineStyle: appearance.lineStyle,
        lineWidth: appearance.lineWidth,
        text: appearance.label,
        textPosition: appearance.labelPosition,
        textSize: appearance.textSize,
        anchor: (anchorX != null && anchorY != null)
          ? { x: anchorX, y: anchorY }
          : null,
      });
      return;
    }
    if (selected.type === 'fibonacci' && selected.items?.[0]?.ref?.getAppearance) {
      const fibRef = selected.items[0].ref;
      const appearance = fibRef.getAppearance();
      const anchorX = chartRef.current?.timeScale().timeToCoordinate(selected.p1?.time);
      const anchorY = seriesRef.current?.priceToCoordinate(selected.p1?.price);
      onSelectionChangeRef.current?.({
        id: selected.id,
        type: 'fibonacci',
        color: appearance.color,
        lineStyle: appearance.lineStyle,
        lineWidth: appearance.lineWidth,
        levels: fibRef.getLevelConfig?.() || [],
        text: '',
        textPosition: 'above',
        textSize: 11,
        anchor: (anchorX != null && anchorY != null)
          ? { x: anchorX, y: anchorY }
          : null,
      });
      return;
    }
    if (selected.type === 'horizontal') {
      const anchorX = chartRef.current?.timeScale().timeToCoordinate(selected.anchorTime);
      const anchorY = seriesRef.current?.priceToCoordinate(selected.price);
      onSelectionChangeRef.current?.({
        id: selected.id,
        type: 'horizontal',
        color: selected.color || '#8b5cf6',
        lineStyle: selected.lineStyle || 'solid',
        lineWidth: selected.lineWidth || 2,
        text: selected.text || 'S/R',
        textPosition: selected.textPosition || 'above',
        textSize: selected.textSize || 11,
        anchor: (anchorX != null && anchorY != null)
          ? { x: anchorX, y: anchorY }
          : null,
      });
      return;
    }
    onSelectionChangeRef.current?.({
      id: selected.id,
      type: selected.type,
    });
  };

  const setSelectedDrawingId = (id, notifyEditor = false) => {
    selectedDrawingIdRef.current = id ?? null;
    drawingsRef.current.forEach((drawing) => {
      applySelectionState(drawing, drawing.id === selectedDrawingIdRef.current);
    });
    if (!notifyEditor) return;
    const selected = drawingsRef.current.find((drawing) => drawing.id === selectedDrawingIdRef.current);
    notifyEditorSelection(selected);
  };

  const clearAllDrawings = () => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    drawingsRef.current.forEach(d => d.items.forEach(i => removeDrawingItem(i, chart, series)));
    drawingsRef.current = [];
    selectedDrawingIdRef.current = null;
    onSelectionChangeRef.current?.(null);
  };

  const removeLastDrawing = () => {
    if (drawingsRef.current.length === 0) return;
    const last = drawingsRef.current.pop();
    const chart = chartRef.current;
    const series = seriesRef.current;
    last.items.forEach(i => removeDrawingItem(i, chart, series));
    if (selectedDrawingIdRef.current === last.id) {
      const nextLast = drawingsRef.current.at(-1);
      setSelectedDrawingId(nextLast?.id ?? null);
    }
  };

  const removeSelectedDrawing = () => {
    const selectedId = selectedDrawingIdRef.current;
    if (selectedId == null) return;
    const idx = drawingsRef.current.findIndex((d) => d.id === selectedId);
    if (idx === -1) return;
    const selected = drawingsRef.current[idx];
    const chart = chartRef.current;
    const series = seriesRef.current;
    selected.items.forEach((i) => removeDrawingItem(i, chart, series));
    drawingsRef.current.splice(idx, 1);
    const nextCandidate = drawingsRef.current.at(-1);
      setSelectedDrawingId(nextCandidate?.id ?? null, nextCandidate == null);
  };

  useImperativeHandle(ref, () => ({
    clearDrawings: clearAllDrawings,
    removeLastDrawing,
    removeSelectedDrawing,
    clearSelection: () => setSelectedDrawingId(null),
    updateSelectedCurveStyle: (patch) => {
      const selectedId = selectedDrawingIdRef.current ?? patch?.id ?? null;
      const selected = drawingsRef.current.find((d) => d.id === selectedId);
      if (!selected) return;
      if (selected.type === 'curve') {
        selected.items?.[0]?.ref?.updateAppearance({
          color: patch?.color,
          lineStyle: patch?.lineStyle,
          lineWidth: patch?.lineWidth,
          label: patch?.text,
          labelPosition: patch?.textPosition,
          textSize: patch?.textSize,
        });
      } else if (selected.type === 'trendline') {
        const sameChainDrawings = drawingsRef.current.filter(
          (d) => d.type === 'trendline' && d.chainId === selected.chainId
        );
        const targets = sameChainDrawings.length > 0 ? sameChainDrawings : [selected];
        const sortedTargets = [...targets].sort((a, b) => a.id - b.id);
        const lastTarget = sortedTargets.at(-1) || selected;
        targets.forEach((trend) => {
          const applyLabel = trend.id === lastTarget.id
            ? (typeof patch?.text === 'string' ? patch.text : undefined)
            : '';
          trend.items?.[0]?.ref?.updateAppearance({
            color: patch?.color,
            lineStyle: patch?.lineStyle,
            lineWidth: patch?.lineWidth,
            label: applyLabel,
            labelPosition: patch?.textPosition,
            textSize: patch?.textSize,
          });
        });
      } else if (selected.type === 'rectangle') {
        selected.items?.[0]?.ref?.updateAppearance({
          color: patch?.color,
          lineStyle: patch?.lineStyle,
          lineWidth: patch?.lineWidth,
          label: patch?.text,
          labelPosition: patch?.textPosition,
          textSize: patch?.textSize,
        });
      } else if (selected.type === 'fibonacci') {
        selected.items?.[0]?.ref?.updateAppearance({
          color: patch?.color,
          lineStyle: patch?.lineStyle,
          lineWidth: patch?.lineWidth,
        });
      } else if (selected.type === 'horizontal') {
        if (typeof patch?.color === 'string') selected.color = patch.color;
        if (typeof patch?.lineStyle === 'string') selected.lineStyle = patch.lineStyle;
        if (typeof patch?.lineWidth === 'number' && Number.isFinite(patch.lineWidth)) {
          selected.lineWidth = Math.min(6, Math.max(1, patch.lineWidth));
        }
        if (typeof patch?.text === 'string') selected.text = patch.text;
        if (patch?.textPosition === 'above' || patch?.textPosition === 'center' || patch?.textPosition === 'below') {
          selected.textPosition = patch.textPosition;
        }
        if (typeof patch?.textSize === 'number' && Number.isFinite(patch.textSize)) {
          selected.textSize = Math.min(24, Math.max(8, patch.textSize));
        }
        const ref = selected.items?.[0]?.ref;
        const textPrimitive = selected.items?.find((item) => item.kind === 'primitive')?.ref;
        if (ref) {
          ref.applyOptions({
            color: selected.color,
            lineStyle: lineStyleToCode(selected.lineStyle),
            lineWidth: selected.lineWidth,
            title: buildHorizontalTitle(selected, priceDecimalsRef.current),
          });
        }
        textPrimitive?.updateData({
          price: selected.price,
          text: selected.text,
          color: selected.color,
          labelPosition: selected.textPosition,
            textSize: selected.textSize,
        });
      } else return;
      setSelectedDrawingId(selected.id, true);
    },
    updateSelectedFibonacciLevels: (levelsConfig) => {
      const selectedId = selectedDrawingIdRef.current;
      const selected = drawingsRef.current.find((d) => d.id === selectedId && d.type === 'fibonacci');
      if (!selected || !Array.isArray(levelsConfig) || levelsConfig.length < 2) return;
      const refItem = selected.items?.[0]?.ref;
      if (!refItem) return;
      const dec = priceDecimalsRef.current;
      const startPrice = selected.p1?.price;
      const endPrice = selected.p2?.price;
      const diff = endPrice - startPrice;
      if (!Number.isFinite(diff) || diff === 0) return;
      const levels = levelsConfig
        .map((lv) => ({
          level: Number.parseFloat(lv.value),
          color: lv.color,
        }))
        .filter((lv) => Number.isFinite(lv.level) && typeof lv.color === 'string')
        .sort((a, b) => a.level - b.level)
        .map((lv) => ({
          level: lv.level,
          color: lv.color,
          price: Number.parseFloat((endPrice - diff * lv.level).toFixed(dec)),
        }));
      if (levels.length < 2) return;
      refItem.updatePoints(selected.p1, selected.p2, levels);
      setSelectedDrawingId(selected.id, true);
    },
  }));

  const prevDataKeyRef = useRef(dataKey);
  useEffect(() => {
    if (dataKey !== prevDataKeyRef.current) {
      clearAllDrawings();
      firstPointRef.current = null;
      secondPointRef.current = null;
      if (cleanupPreviewRef.current) cleanupPreviewRef.current();
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
        // Modo libre: evita que el cursor se "imante" a cada vela.
        mode: crosshairModeRef.current,
        vertLine: {
          visible: crosshairVisibleRef.current,
          color: '#3b82f6', width: 1, style: 3,
          labelBackgroundColor: '#3b82f6',
        },
        horzLine: {
          visible: crosshairVisibleRef.current,
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

    // --- Moving Averages ---
    const maSeriesRefsArr = [];
    const updateMovingAverages = (config, chartInstance) => {
      maSeriesRefsArr.forEach(ref => {
        try { chartInstance.removeSeries(ref); } catch {}
      });
      maSeriesRefsArr.length = 0;
      if (!config || config.length === 0 || !dataRef.current || dataRef.current.length === 0) return;
      config.forEach(ma => {
        const maData = ma.type === 'EMA'
          ? calculateEMA(dataRef.current, ma.period)
          : calculateSMA(dataRef.current, ma.period);
        if (!maData || maData.length === 0) return;
        const lineSeries = chartInstance.addSeries(LineSeries, {
          color: ma.color,
          lineWidth: ma.lineWidth || 2,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
        });
        lineSeries.setData(maData);
        maSeriesRefsArr.push(lineSeries);
      });
      maSeriesRefs.current = maSeriesRefsArr;
    };
    updateMovingAverages(maConfigRef.current, chart);
    const cleanupMA = () => {
      maSeriesRefsArr.forEach(ref => {
        try { chart.removeSeries(ref); } catch {}
      });
      maSeriesRefsArr.length = 0;
    };

    // --- RSI (as line on separate price scale) ---
    const rsiSeriesRefArr = [];
    const createRSISeries = (config, chartInstance) => {
      rsiSeriesRefArr.forEach(ref => {
        try { chartInstance.removeSeries(ref); } catch {}
      });
      rsiSeriesRefArr.length = 0;
      if (!config || !dataRef.current || dataRef.current.length === 0) return;
      const rsiData = calculateRSI(dataRef.current, config.period);
      if (!rsiData || rsiData.length === 0) return;
      const rsiSeries = chartInstance.addSeries(LineSeries, {
        color: config.color || '#8b5cf6',
        lineWidth: config.lineWidth || 2,
        priceLineVisible: false,
        lastValueVisible: true,
        priceScaleId: 'rsi',
      });
      rsiSeries.setData(rsiData);
      rsiSeriesRefArr.push(rsiSeries);
      rsiPaneRef.current = rsiSeriesRefArr;
      chartInstance.priceScale('rsi').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
    };
    if (rsiConfigRef.current) {
      createRSISeries(rsiConfigRef.current, chart);
    }

    // --- Drawing helpers ---
    let previewLines = [];
    let previewPrimitive = null;

    const cleanupPreview = () => {
      previewLines.forEach(pl => {
        try { candlestickSeries.removePriceLine(pl); } catch {
          // ignore stale preview line detach
        }
      });
      previewLines = [];
      if (previewPrimitive) {
        try { candlestickSeries.detachPrimitive(previewPrimitive); } catch {
          // ignore stale preview primitive detach
        }
        previewPrimitive = null;
      }
    };
    cleanupPreviewRef.current = cleanupPreview;

    const buildFiboLevels = (startPrice, endPrice, dec, config = fiboLevelsRef.current || []) => {
      const diff = endPrice - startPrice;
      if (Math.abs(diff) === 0) return null;
      return config.map(lv => ({
        level: lv.value,
        price: Number.parseFloat((endPrice - diff * lv.value).toFixed(dec)),
        color: lv.color,
      }));
    };

    // --- Live preview on crosshair move ---
    chart.subscribeCrosshairMove((param) => {
      const mode = drawingModeRef.current;
      const fp = firstPointRef.current;
      if (!mode || !fp || !param.point || !param.time) return;

      const price = candlestickSeries.coordinateToPrice(param.point.y);
      if (price == null || Number.isNaN(price)) return;
      const dec = priceDecimalsRef.current;
      const cur = Number.parseFloat(price.toFixed(dec));
      const getMidControlPoint = (p1, p2) => {
        const t1 = Number(p1.time);
        const t2 = Number(p2.time);
        const midTime = Number.isFinite(t1) && Number.isFinite(t2)
          ? Math.round((t1 + t2) / 2)
          : p1.time;
        return {
          time: midTime,
          price: Number.parseFloat(((p1.price + p2.price) / 2).toFixed(dec)),
        };
      };

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
        case 'curve': {
          const sp = secondPointRef.current;
          if (!sp) {
            const p2 = { time: param.time, price: cur };
            const cp = getMidControlPoint(fp, p2);
            if (!previewPrimitive) {
              previewPrimitive = new CurvePrimitive(fp, cp, p2, '#a855f7', true);
              candlestickSeries.attachPrimitive(previewPrimitive);
            } else {
              previewPrimitive.updatePoints(fp, cp, p2);
            }
          } else {
            const desiredMidPoint = { time: param.time, price: cur };
            // Durante creación, el tercer clic representa el punto medio visual de la curva.
            const p1x = chart.timeScale().timeToCoordinate(fp.time);
            const p2x = chart.timeScale().timeToCoordinate(sp.time);
            const mx = param.point.x;
            let nextControlTime = desiredMidPoint.time;
            if (p1x != null && p2x != null) {
              const cx = 2 * mx - 0.5 * (p1x + p2x);
              const cTime = getNearestDataTimeFromX(cx);
              if (cTime != null) nextControlTime = cTime;
            }
            const cp = {
              time: nextControlTime,
              price: Number.parseFloat(
                (2 * desiredMidPoint.price - 0.5 * (fp.price + sp.price)).toFixed(dec)
              ),
            };
            if (!previewPrimitive) {
              previewPrimitive = new CurvePrimitive(fp, cp, sp, '#a855f7', true);
              candlestickSeries.attachPrimitive(previewPrimitive);
            } else {
              previewPrimitive.updatePoints(fp, cp, sp);
            }
          }
          break;
        }
      }
    });

    // --- Drawing click handler ---
    let suppressNextSelectionClick = false;
    chart.subscribeClick((param) => {
      if (suppressNextSelectionClick) {
        suppressNextSelectionClick = false;
        return;
      }
      const mode = drawingModeRef.current;
      if (!param.point) return;

      if (!mode) {
        const curveHandle = findCurveHandleNearPointer(param.point.x, param.point.y);
        if (curveHandle) {
          setSelectedDrawingId(curveHandle.drawing.id);
          return;
        }
        const curveBody = findCurveBodyNearPointer(param.point.x, param.point.y);
        if (curveBody) {
          setSelectedDrawingId(curveBody.id);
          return;
        }
        const drawing = findNonCurveDrawingNearPointer(param.point.x, param.point.y);
        if (drawing) {
          setSelectedDrawingId(drawing.id);
          return;
        }
        setSelectedDrawingId(null, true);
        return;
      }
      if (!param.time) return;

      const price = candlestickSeries.coordinateToPrice(param.point.y);
      if (price == null || Number.isNaN(price)) return;
      const dec = priceDecimalsRef.current;
      const rounded = Number.parseFloat(price.toFixed(dec));

      switch (mode) {
        case 'horizontal': {
          const baseColor = '#8b5cf6';
          const baseLineStyle = 'solid';
          const baseLineWidth = 2;
          const pl = candlestickSeries.createPriceLine({
            price: rounded, color: baseColor,
            lineWidth: baseLineWidth, lineStyle: lineStyleToCode(baseLineStyle),
            axisLabelVisible: true,
            title: '',
          });
          const textPrimitive = new HorizontalTextPrimitive(rounded, 'S/R', baseColor, 'above', 11);
          candlestickSeries.attachPrimitive(textPrimitive);
          const drawing = {
            id: drawingIdCounterRef.current++,
            type: 'horizontal',
            price: rounded,
            anchorTime: param.time,
            color: baseColor,
            lineStyle: baseLineStyle,
            lineWidth: baseLineWidth,
            text: 'S/R',
            textPosition: 'above',
            textSize: 11,
            items: [
              { kind: 'priceLine', ref: pl },
              { kind: 'primitive', ref: textPrimitive },
            ],
          };
          drawingsRef.current.push(drawing);
          setSelectedDrawingId(null);
          onDrawingComplete?.();
          break;
        }

        case 'trendline': {
          if (!firstPointRef.current) {
            if (activeTrendlineChainIdRef.current == null) {
              activeTrendlineChainIdRef.current = trendlineChainCounterRef.current++;
            }
            firstPointRef.current = { time: param.time, price: rounded };
          } else {
            const fp = firstPointRef.current;
            cleanupPreview();

            if (fp.time === param.time && fp.price === rounded) {
              firstPointRef.current = fp;
              break;
            }

            const nextPoint = { time: param.time, price: rounded };
            const line = new TrendlinePrimitive(
              fp, nextPoint, '#3b82f6', false
            );
            candlestickSeries.attachPrimitive(line);
            line.updateAppearance({
              color: '#3b82f6',
              lineStyle: 'solid',
              lineWidth: 2,
              label: '',
              labelPosition: 'above',
              textSize: 11,
            });
            const drawing = {
              id: drawingIdCounterRef.current++,
              type: 'trendline',
              chainId: activeTrendlineChainIdRef.current,
              p1: fp,
              p2: nextPoint,
              color: '#3b82f6',
              lineStyle: 'solid',
              lineWidth: 2,
              text: '',
              textPosition: 'above',
              textSize: 11,
              items: [{ kind: 'primitive', ref: line }],
            };
            drawingsRef.current.push(drawing);
            trendlineChainIdsRef.current.push(drawing.id);
            setSelectedDrawingId(drawing.id);
            // Modo encadenado: el siguiente tramo arranca en el último punto.
            firstPointRef.current = nextPoint;
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
            rect.updateAppearance({
              color: '#f59e0b',
              lineStyle: 'solid',
              lineWidth: 2,
              label: '',
              labelPosition: 'center',
              textSize: 11,
            });
            const drawing = {
              id: drawingIdCounterRef.current++,
              type: 'rectangle',
              p1: fp,
              p2: { time: param.time, price: rounded },
              color: '#f59e0b',
              lineStyle: 'solid',
              lineWidth: 2,
              text: '',
              textPosition: 'center',
              textSize: 11,
              items: [{ kind: 'primitive', ref: rect }],
            };
            drawingsRef.current.push(drawing);
            setSelectedDrawingId(drawing.id);
            onDrawingComplete?.();
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
            fib.updateAppearance({
              color: '#22d3ee',
              lineStyle: 'dashed',
              lineWidth: 1,
            });
            const drawing = {
              id: drawingIdCounterRef.current++,
              type: 'fibonacci',
              p1: fp,
              p2: { time: param.time, price: rounded },
              color: '#22d3ee',
              lineStyle: 'dashed',
              lineWidth: 1,
              items: [{ kind: 'primitive', ref: fib }],
            };
            drawingsRef.current.push(drawing);
            setSelectedDrawingId(drawing.id);
            onDrawingComplete?.();
          }
          break;
        }
        case 'curve': {
          if (!firstPointRef.current) {
            firstPointRef.current = { time: param.time, price: rounded };
          } else if (!secondPointRef.current) {
            secondPointRef.current = { time: param.time, price: rounded };
          } else {
            const fp = firstPointRef.current;
            const p2 = secondPointRef.current;
            firstPointRef.current = null;
            secondPointRef.current = null;
            cleanupPreview();

            const desiredMidPoint = { time: param.time, price: rounded };
            const p1x = chart.timeScale().timeToCoordinate(fp.time);
            const p2x = chart.timeScale().timeToCoordinate(p2.time);
            const mx = param.point.x;
            let nextControlTime = desiredMidPoint.time;
            if (p1x != null && p2x != null) {
              const cx = 2 * mx - 0.5 * (p1x + p2x);
              const cTime = getNearestDataTimeFromX(cx);
              if (cTime != null) nextControlTime = cTime;
            }
            const cp = {
              time: nextControlTime,
              price: Number.parseFloat(
                (2 * desiredMidPoint.price - 0.5 * (fp.price + p2.price)).toFixed(dec)
              ),
            };
            if (fp.time === p2.time && fp.price === p2.price) break;

            const curve = new CurvePrimitive(fp, cp, p2, '#a855f7', false);
            candlestickSeries.attachPrimitive(curve);
            const drawing = {
              id: drawingIdCounterRef.current++,
              type: 'curve',
              p1: fp,
              cp,
              p2,
              items: [{ kind: 'primitive', ref: curve }],
            };
            drawingsRef.current.push(drawing);
            setSelectedDrawingId(null);
            onDrawingComplete?.();
          }
          break;
        }
      }
    });

    const openEditorAtPoint = (x, y) => {
      const mode = drawingModeRef.current;
      if (mode) return;
      const curveHandle = findCurveHandleNearPointer(x, y);
      if (curveHandle) {
        setSelectedDrawingId(curveHandle.drawing.id, true);
        return;
      }
      const curveBody = findCurveBodyNearPointer(x, y);
      if (curveBody) {
        setSelectedDrawingId(curveBody.id, true);
        return;
      }
      const drawing = findNonCurveDrawingNearPointer(x, y, {
        hitThreshold: DRAWING_HIT_THRESHOLD + 8,
        fibonacciUseBoxHit: true,
      });
      if (drawing) {
        setSelectedDrawingId(drawing.id, true);
        return;
      }
      setSelectedDrawingId(null, true);
    };

    chart.subscribeDblClick((param) => {
      if (!param.point) return;
      openEditorAtPoint(param.point.x, param.point.y);
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
    let draggingCurve = null;
    let draggingTrendlineHandle = null;
    let draggingRectangle = null;
    let draggingFibonacci = null;
    let draggingHorizontalDrawing = null;
    let pendingHorizontalDrawing = null;
    let horizontalPointerStartY = 0;
    let horizontalPointerDownAt = 0;
    let horizontalDragMoved = false;
    const HORIZONTAL_DRAG_START_THRESHOLD = 4;
    const HORIZONTAL_HOLD_MS = 220;

    const getChartY = (e) => {
      const rect = chartContainerRef.current.getBoundingClientRect();
      return e.clientY - rect.top;
    };
    const getChartX = (e) => {
      const rect = chartContainerRef.current.getBoundingClientRect();
      return e.clientX - rect.left;
    };
    const getNearestDataTimeFromX = (x) => {
      const logical = chart.timeScale().coordinateToLogical(x);
      const items = dataRef.current;
      if (logical == null || !items || items.length === 0) return null;
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(logical)));
      return items[idx]?.time ?? null;
    };

    const DRAG_THRESHOLD = 12;
    const CURVE_HANDLE_THRESHOLD = 16;
    const CURVE_MID_HANDLE_THRESHOLD = 22;
    const CURVE_BODY_THRESHOLD = 10;
    const DRAWING_HIT_THRESHOLD = 10;
    const TRENDLINE_HANDLE_THRESHOLD = 14;
    const RECTANGLE_HANDLE_THRESHOLD = 12;
    const FIBONACCI_HANDLE_THRESHOLD = 12;

    const findCurveHandleNearPointer = (x, y) => {
      for (let i = drawingsRef.current.length - 1; i >= 0; i--) {
        const d = drawingsRef.current[i];
        if (d.type !== 'curve' || !d.items?.[0]?.ref || !d.p1 || !d.cp || !d.p2) continue;

        const x1 = chart.timeScale().timeToCoordinate(d.p1.time);
        const y1 = candlestickSeries.priceToCoordinate(d.p1.price);
        const cx = chart.timeScale().timeToCoordinate(d.cp.time);
        const cy = candlestickSeries.priceToCoordinate(d.cp.price);
        const x2 = chart.timeScale().timeToCoordinate(d.p2.time);
        const y2 = candlestickSeries.priceToCoordinate(d.p2.price);
        if (x1 == null || y1 == null || cx == null || cy == null || x2 == null || y2 == null) continue;

        const mx = 0.25 * x1 + 0.5 * cx + 0.25 * x2;
        const my = 0.25 * y1 + 0.5 * cy + 0.25 * y2;

        const points = [
          ['p1', x1, y1, CURVE_HANDLE_THRESHOLD],
          ['mid', mx, my, CURVE_MID_HANDLE_THRESHOLD],
          ['p2', x2, y2, CURVE_HANDLE_THRESHOLD],
        ];

        let nearest = null;
        let nearestDistance = Infinity;

        for (const [key, px, py, threshold] of points) {
          const dist = Math.hypot(x - px, y - py);
          const weightedDist = dist / threshold;
          if (weightedDist < nearestDistance) {
            nearestDistance = weightedDist;
            nearest = key;
          }
        }

        if (nearest && nearestDistance <= 1) {
          return { drawing: d, key: nearest };
        }
      }
      return null;
    };

    const distToSegment = (px, py, x1, y1, x2, y2) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
      const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
      const sx = x1 + t * dx;
      const sy = y1 + t * dy;
      return Math.hypot(px - sx, py - sy);
    };

    const findCurveBodyNearPointer = (x, y) => {
      for (let i = drawingsRef.current.length - 1; i >= 0; i--) {
        const d = drawingsRef.current[i];
        if (d.type !== 'curve' || !d.p1 || !d.cp || !d.p2) continue;
        const x1 = chart.timeScale().timeToCoordinate(d.p1.time);
        const y1 = candlestickSeries.priceToCoordinate(d.p1.price);
        const cx = chart.timeScale().timeToCoordinate(d.cp.time);
        const cy = candlestickSeries.priceToCoordinate(d.cp.price);
        const x2 = chart.timeScale().timeToCoordinate(d.p2.time);
        const y2 = candlestickSeries.priceToCoordinate(d.p2.price);
        if (x1 == null || y1 == null || cx == null || cy == null || x2 == null || y2 == null) continue;

        let minDist = Infinity;
        let prevX = x1;
        let prevY = y1;
        const steps = 24;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const mt = 1 - t;
          const qx = mt * mt * x1 + 2 * mt * t * cx + t * t * x2;
          const qy = mt * mt * y1 + 2 * mt * t * cy + t * t * y2;
          const segDist = distToSegment(x, y, prevX, prevY, qx, qy);
          if (segDist < minDist) minDist = segDist;
          prevX = qx;
          prevY = qy;
        }
        if (minDist <= CURVE_BODY_THRESHOLD) return d;
      }
      return null;
    };

    const findTrendlineHandleNearPointer = (x, y) => {
      for (let i = drawingsRef.current.length - 1; i >= 0; i--) {
        const d = drawingsRef.current[i];
        if (d.type !== 'trendline' || !d.p1 || !d.p2) continue;
        const p1 = getPointXY(d.p1);
        const p2 = getPointXY(d.p2);
        if (!p1 || !p2) continue;

        const d1 = Math.hypot(x - p1.x, y - p1.y);
        const d2 = Math.hypot(x - p2.x, y - p2.y);
        if (d1 <= TRENDLINE_HANDLE_THRESHOLD || d2 <= TRENDLINE_HANDLE_THRESHOLD) {
          return {
            drawing: d,
            key: d1 <= d2 ? 'p1' : 'p2',
          };
        }
      }
      return null;
    };

    const findFibonacciHandleNearPointer = (x, y) => {
      const edgeThreshold = FIBONACCI_HANDLE_THRESHOLD + 2;
      for (let i = drawingsRef.current.length - 1; i >= 0; i--) {
        const d = drawingsRef.current[i];
        if (d.type !== 'fibonacci' || !d.p1 || !d.p2) continue;
        const p1 = getPointXY(d.p1);
        const p2 = getPointXY(d.p2);
        if (!p1 || !p2) continue;
        const left = Math.min(p1.x, p2.x);
        const right = Math.max(p1.x, p2.x);
        const top = Math.min(p1.y, p2.y);
        const bottom = Math.max(p1.y, p2.y);
        const leftTime = p1.x <= p2.x ? d.p1.time : d.p2.time;
        const rightTime = p1.x <= p2.x ? d.p2.time : d.p1.time;
        const topPrice = Math.max(d.p1.price, d.p2.price);
        const bottomPrice = Math.min(d.p1.price, d.p2.price);
        const corners = {
          tl: { time: leftTime, price: topPrice },
          tr: { time: rightTime, price: topPrice },
          bl: { time: leftTime, price: bottomPrice },
          br: { time: rightTime, price: bottomPrice },
        };
        const handleCoords = [
          ['tl', left, top],
          ['tr', right, top],
          ['bl', left, bottom],
          ['br', right, bottom],
        ];
        for (const [handle, hx, hy] of handleCoords) {
          if (Math.hypot(x - hx, y - hy) <= FIBONACCI_HANDLE_THRESHOLD) {
            return { drawing: d, key: handle, corners };
          }
        }
        const nearTop = Math.abs(y - top) <= edgeThreshold && x >= left && x <= right;
        const nearBottom = Math.abs(y - bottom) <= edgeThreshold && x >= left && x <= right;
        const nearLeft = Math.abs(x - left) <= edgeThreshold && y >= top && y <= bottom;
        const nearRight = Math.abs(x - right) <= edgeThreshold && y >= top && y <= bottom;
        if (nearTop) return { drawing: d, key: 't', corners };
        if (nearBottom) return { drawing: d, key: 'b', corners };
        if (nearLeft) return { drawing: d, key: 'l', corners };
        if (nearRight) return { drawing: d, key: 'r', corners };
      }
      return null;
    };

    const getFibonacciResizeCursor = (handle) => {
      if (handle === 't' || handle === 'b') return 'ns-resize';
      if (handle === 'l' || handle === 'r') return 'ew-resize';
      return handle === 'tr' || handle === 'bl' ? 'nesw-resize' : 'nwse-resize';
    };

    const getFibonacciResizePoints = (handle, corners, nextPoint) => {
      const { tl, tr, bl, br } = corners;
      if (handle === 'tl') return { p1: { ...br }, p2: { ...nextPoint } };
      if (handle === 'tr') return { p1: { ...bl }, p2: { ...nextPoint } };
      if (handle === 'bl') return { p1: { ...tr }, p2: { ...nextPoint } };
      if (handle === 'br') return { p1: { ...tl }, p2: { ...nextPoint } };
      if (handle === 't') return { p1: { ...bl }, p2: { time: br.time, price: nextPoint.price } };
      if (handle === 'b') return { p1: { ...tl }, p2: { time: tr.time, price: nextPoint.price } };
      if (handle === 'l') return { p1: { ...tr }, p2: { time: nextPoint.time, price: bl.price } };
      if (handle === 'r') return { p1: { ...tl }, p2: { time: nextPoint.time, price: br.price } };
      return { p1: { ...tl }, p2: { ...br } };
    };

    const getRectangleGeometry = (drawing) => {
      if (!drawing?.p1 || !drawing?.p2) return null;
      const x1 = chart.timeScale().timeToCoordinate(drawing.p1.time);
      const y1 = candlestickSeries.priceToCoordinate(drawing.p1.price);
      const x2 = chart.timeScale().timeToCoordinate(drawing.p2.time);
      const y2 = candlestickSeries.priceToCoordinate(drawing.p2.price);
      if (x1 == null || y1 == null || x2 == null || y2 == null) return null;
      const leftTime = x1 <= x2 ? drawing.p1.time : drawing.p2.time;
      const rightTime = x1 <= x2 ? drawing.p2.time : drawing.p1.time;
      const topPrice = Math.max(drawing.p1.price, drawing.p2.price);
      const bottomPrice = Math.min(drawing.p1.price, drawing.p2.price);
      const left = Math.min(x1, x2);
      const right = Math.max(x1, x2);
      const top = Math.min(y1, y2);
      const bottom = Math.max(y1, y2);
      return {
        left,
        right,
        top,
        bottom,
        corners: {
          tl: { time: leftTime, price: topPrice },
          tr: { time: rightTime, price: topPrice },
          bl: { time: leftTime, price: bottomPrice },
          br: { time: rightTime, price: bottomPrice },
        },
      };
    };

    const findRectangleHandleNearPointer = (x, y) => {
      const edgeThreshold = RECTANGLE_HANDLE_THRESHOLD + 2;
      for (let i = drawingsRef.current.length - 1; i >= 0; i--) {
        const d = drawingsRef.current[i];
        if (d.type !== 'rectangle') continue;
        const geo = getRectangleGeometry(d);
        if (!geo) continue;
        const handleCoords = [
          ['tl', geo.left, geo.top],
          ['tr', geo.right, geo.top],
          ['bl', geo.left, geo.bottom],
          ['br', geo.right, geo.bottom],
        ];
        for (const [handle, hx, hy] of handleCoords) {
          if (Math.hypot(x - hx, y - hy) <= RECTANGLE_HANDLE_THRESHOLD) {
            return { drawing: d, handle, geo };
          }
        }
        const nearTop = Math.abs(y - geo.top) <= edgeThreshold && x >= geo.left && x <= geo.right;
        const nearBottom = Math.abs(y - geo.bottom) <= edgeThreshold && x >= geo.left && x <= geo.right;
        const nearLeft = Math.abs(x - geo.left) <= edgeThreshold && y >= geo.top && y <= geo.bottom;
        const nearRight = Math.abs(x - geo.right) <= edgeThreshold && y >= geo.top && y <= geo.bottom;
        if (nearTop) return { drawing: d, handle: 't', geo };
        if (nearBottom) return { drawing: d, handle: 'b', geo };
        if (nearLeft) return { drawing: d, handle: 'l', geo };
        if (nearRight) return { drawing: d, handle: 'r', geo };
      }
      return null;
    };

    const getRectangleResizeCursor = (handle) => {
      if (handle === 't' || handle === 'b') return 'ns-resize';
      if (handle === 'l' || handle === 'r') return 'ew-resize';
      return handle === 'tr' || handle === 'bl' ? 'nesw-resize' : 'nwse-resize';
    };

    const getRectangleResizePoints = (handle, geo, nextPoint) => {
      const { tl, tr, bl, br } = geo.corners;
      if (handle === 'tl') return { p1: { ...br }, p2: { ...nextPoint } };
      if (handle === 'tr') return { p1: { ...bl }, p2: { ...nextPoint } };
      if (handle === 'bl') return { p1: { ...tr }, p2: { ...nextPoint } };
      if (handle === 'br') return { p1: { ...tl }, p2: { ...nextPoint } };
      if (handle === 't') return { p1: { ...bl }, p2: { time: br.time, price: nextPoint.price } };
      if (handle === 'b') return { p1: { ...tl }, p2: { time: tr.time, price: nextPoint.price } };
      if (handle === 'l') return { p1: { ...tr }, p2: { time: nextPoint.time, price: bl.price } };
      if (handle === 'r') return { p1: { ...tl }, p2: { time: nextPoint.time, price: br.price } };
      return { p1: { ...tl }, p2: { ...br } };
    };

    const getPointXY = (p) => {
      if (!p) return null;
      const px = chart.timeScale().timeToCoordinate(p.time);
      const py = candlestickSeries.priceToCoordinate(p.price);
      if (px == null || py == null) return null;
      return { x: px, y: py };
    };

    const findNonCurveDrawingNearPointer = (x, y, options = {}) => {
      const hitThreshold = options.hitThreshold ?? DRAWING_HIT_THRESHOLD;
      const fibonacciUseBoxHit = options.fibonacciUseBoxHit ?? false;
      for (let i = drawingsRef.current.length - 1; i >= 0; i--) {
        const d = drawingsRef.current[i];
        if (d.type === 'curve') continue;

        if (d.type === 'horizontal' && typeof d.price === 'number') {
          const yLine = candlestickSeries.priceToCoordinate(d.price);
          if (yLine != null && Math.abs(y - yLine) <= hitThreshold) return d;
          continue;
        }

        const p1 = getPointXY(d.p1);
        const p2 = getPointXY(d.p2);
        if (!p1 || !p2) continue;

        if (d.type === 'trendline' || d.type === 'fibonacci') {
          if (d.type === 'fibonacci' && fibonacciUseBoxHit) {
            const left = Math.min(p1.x, p2.x);
            const right = Math.max(p1.x, p2.x);
            const top = Math.min(p1.y, p2.y);
            const bottom = Math.max(p1.y, p2.y);
            const inside =
              x >= left - hitThreshold &&
              x <= right + hitThreshold &&
              y >= top - hitThreshold &&
              y <= bottom + hitThreshold;
            if (inside) return d;
          }
          if (distToSegment(x, y, p1.x, p1.y, p2.x, p2.y) <= hitThreshold) return d;
          continue;
        }

        if (d.type === 'rectangle') {
          const left = Math.min(p1.x, p2.x);
          const right = Math.max(p1.x, p2.x);
          const top = Math.min(p1.y, p2.y);
          const bottom = Math.max(p1.y, p2.y);
          const inside = x >= left && x <= right && y >= top && y <= bottom;
          if (inside) return d;
          const nearBorder =
            distToSegment(x, y, left, top, right, top) <= hitThreshold ||
            distToSegment(x, y, right, top, right, bottom) <= hitThreshold ||
            distToSegment(x, y, right, bottom, left, bottom) <= hitThreshold ||
            distToSegment(x, y, left, bottom, left, top) <= hitThreshold;
          if (nearBorder) return d;
        }
      }
      return null;
    };

    const handlePointerDown = (e) => {
      if (!seriesRef.current) return;
      pendingHorizontalDrawing = null;
      const x = getChartX(e);
      const y = getChartY(e);

      const canEditCurves =
        !drawingModeRef.current ||
        (drawingModeRef.current === 'curve' && firstPointRef.current == null && secondPointRef.current == null);

      if (canEditCurves) {
        const curveHandle = findCurveHandleNearPointer(x, y);
        if (curveHandle) {
          setSelectedDrawingId(curveHandle.drawing.id);
          isDragging = true;
          dragType = 'curve';
          draggingCurve = curveHandle;
          chart.applyOptions({ handleScroll: false, handleScale: false });
          chartContainerRef.current.style.cursor = 'grabbing';
          try { chartContainerRef.current.setPointerCapture(e.pointerId); } catch {
            // unsupported pointer capture
          }
          e.preventDefault();
          return;
        }
        const trendlineHandle = findTrendlineHandleNearPointer(x, y);
        if (trendlineHandle) {
          setSelectedDrawingId(trendlineHandle.drawing.id);
          isDragging = true;
          dragType = 'trendline-handle';
          draggingTrendlineHandle = {
            ...trendlineHandle,
            original: {
              time: trendlineHandle.drawing[trendlineHandle.key].time,
              price: trendlineHandle.drawing[trendlineHandle.key].price,
            },
          };
          chart.applyOptions({ handleScroll: false, handleScale: false });
          chartContainerRef.current.style.cursor = 'grabbing';
          try { chartContainerRef.current.setPointerCapture(e.pointerId); } catch {
            // unsupported pointer capture
          }
          e.preventDefault();
          return;
        }
        const fibonacciHandle = findFibonacciHandleNearPointer(x, y);
        if (fibonacciHandle) {
          setSelectedDrawingId(fibonacciHandle.drawing.id);
          isDragging = true;
          dragType = 'fibonacci-resize';
          draggingFibonacci = fibonacciHandle;
          chart.applyOptions({ handleScroll: false, handleScale: false });
          chartContainerRef.current.style.cursor = getFibonacciResizeCursor(fibonacciHandle.key);
          try { chartContainerRef.current.setPointerCapture(e.pointerId); } catch {
            // unsupported pointer capture
          }
          e.preventDefault();
          return;
        }
        if (!drawingModeRef.current) {
          const rectangleHandle = findRectangleHandleNearPointer(x, y);
          if (rectangleHandle) {
            setSelectedDrawingId(rectangleHandle.drawing.id);
            isDragging = true;
            dragType = 'rectangle-resize';
            draggingRectangle = {
              drawing: rectangleHandle.drawing,
              mode: 'resize',
              handle: rectangleHandle.handle,
              geo: rectangleHandle.geo,
              startX: x,
              startY: y,
            };
            chart.applyOptions({ handleScroll: false, handleScale: false });
            chartContainerRef.current.style.cursor = getRectangleResizeCursor(rectangleHandle.handle);
            try { chartContainerRef.current.setPointerCapture(e.pointerId); } catch {
              // unsupported pointer capture
            }
            e.preventDefault();
            return;
          }
          const drawing = findNonCurveDrawingNearPointer(x, y);
          if (drawing?.type === 'rectangle') {
            setSelectedDrawingId(drawing.id);
            isDragging = true;
            dragType = 'rectangle-move';
            draggingRectangle = {
              drawing,
              mode: 'move',
              startX: x,
              startY: y,
              startP1: { ...drawing.p1 },
              startP2: { ...drawing.p2 },
            };
            chart.applyOptions({ handleScroll: false, handleScale: false });
            chartContainerRef.current.style.cursor = 'move';
            try { chartContainerRef.current.setPointerCapture(e.pointerId); } catch {
              // unsupported pointer capture
            }
            e.preventDefault();
            return;
          }
          if (drawing?.type === 'fibonacci') {
            setSelectedDrawingId(drawing.id);
            isDragging = true;
            dragType = 'fibonacci-move';
            draggingFibonacci = {
              drawing,
              startX: x,
              startY: y,
              startP1: { ...drawing.p1 },
              startP2: { ...drawing.p2 },
            };
            chart.applyOptions({ handleScroll: false, handleScale: false });
            chartContainerRef.current.style.cursor = 'move';
            try { chartContainerRef.current.setPointerCapture(e.pointerId); } catch {
              // unsupported pointer capture
            }
            e.preventDefault();
            return;
          }
          if (drawing?.type === 'horizontal') {
            setSelectedDrawingId(drawing.id);
            pendingHorizontalDrawing = drawing;
            horizontalPointerStartY = y;
            horizontalPointerDownAt = Date.now();
            draggingHorizontalDrawing = drawing;
            horizontalDragMoved = false;
            chartContainerRef.current.style.cursor = 'ns-resize';
            e.preventDefault();
            return;
          }
        }
      }

      const pos = activePositionRef.current;
      if (!pos || pos.status !== 'open') return;

      if (pos.sl != null && slLineRef.current) {
        const coord = seriesRef.current.priceToCoordinate(pos.sl);
        if (coord != null && Math.abs(y - coord) < DRAG_THRESHOLD) {
          isDragging = true;
          dragType = 'sl';
          chart.applyOptions({ handleScroll: false, handleScale: false });
          chartContainerRef.current.style.cursor = 'ns-resize';
          try { chartContainerRef.current.setPointerCapture(e.pointerId); } catch {
            // unsupported pointer capture
          }
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
          try { chartContainerRef.current.setPointerCapture(e.pointerId); } catch {
            // unsupported pointer capture
          }
          e.preventDefault();
          return;
        }
      }
    };

    const handlePointerMove = (e) => {
      if (!seriesRef.current) return;

      const y = getChartY(e);
      const x = getChartX(e);

      if (!isDragging && pendingHorizontalDrawing) {
        if (Math.abs(y - horizontalPointerStartY) >= HORIZONTAL_DRAG_START_THRESHOLD) {
          isDragging = true;
          dragType = 'drawing-horizontal';
          chart.applyOptions({ handleScroll: false, handleScale: false });
          chartContainerRef.current.style.cursor = 'ns-resize';
        }
      }

      if (isDragging) {
        e.preventDefault();
        if (dragType === 'curve' && draggingCurve) {
          const newTime = getNearestDataTimeFromX(x);
          const newPrice = seriesRef.current.coordinateToPrice(y);
          if (newPrice == null) return;
          const dec = priceDecimalsRef.current;
          const nextPoint = {
            time: newTime ?? draggingCurve.drawing[draggingCurve.key]?.time ?? draggingCurve.drawing.cp.time,
            price: Number.parseFloat(newPrice.toFixed(dec)),
          };
          if (draggingCurve.key === 'mid') {
            const p1 = draggingCurve.drawing.p1;
            const p2 = draggingCurve.drawing.p2;
            const p1x = chart.timeScale().timeToCoordinate(p1.time);
            const p2x = chart.timeScale().timeToCoordinate(p2.time);
            const mx = x;
            let nextControlTime = draggingCurve.drawing.cp.time;
            if (p1x != null && p2x != null) {
              const cx = 2 * mx - 0.5 * (p1x + p2x);
              const cTime = getNearestDataTimeFromX(cx);
              if (cTime != null) nextControlTime = cTime;
            }
            draggingCurve.drawing.cp = {
              time: nextControlTime,
              price: Number.parseFloat((2 * nextPoint.price - 0.5 * (p1.price + p2.price)).toFixed(dec)),
            };
          } else {
            draggingCurve.drawing[draggingCurve.key] = nextPoint;
          }
          draggingCurve.drawing.items[0].ref.updatePoints(
            draggingCurve.drawing.p1,
            draggingCurve.drawing.cp,
            draggingCurve.drawing.p2
          );
        } else if (dragType === 'trendline-handle' && draggingTrendlineHandle) {
          const newTime = getNearestDataTimeFromX(x);
          const newPrice = seriesRef.current.coordinateToPrice(y);
          if (newTime == null || newPrice == null) return;
          const dec = priceDecimalsRef.current;
          const nextPoint = {
            time: newTime,
            price: Number.parseFloat(newPrice.toFixed(dec)),
          };
          const original = draggingTrendlineHandle.original;
          const chainId = draggingTrendlineHandle.drawing.chainId;
          const sameChain = drawingsRef.current.filter(
            (d) => d.type === 'trendline' && d.chainId === chainId
          );
          const targets = sameChain.length > 0 ? sameChain : [draggingTrendlineHandle.drawing];
          targets.forEach((segment) => {
            let changed = false;
            if (segment.p1?.time === original.time && segment.p1?.price === original.price) {
              segment.p1 = { ...nextPoint };
              changed = true;
            }
            if (segment.p2?.time === original.time && segment.p2?.price === original.price) {
              segment.p2 = { ...nextPoint };
              changed = true;
            }
            if (changed) {
              segment.items?.[0]?.ref?.updatePoints(segment.p1, segment.p2);
            }
          });
          draggingTrendlineHandle.original = { ...nextPoint };
        } else if ((dragType === 'rectangle-move' || dragType === 'rectangle-resize') && draggingRectangle) {
          const newTime = getNearestDataTimeFromX(x);
          const newPrice = seriesRef.current.coordinateToPrice(y);
          if (newTime == null || newPrice == null) return;
          const dec = priceDecimalsRef.current;
          const nextPoint = {
            time: newTime,
            price: Number.parseFloat(newPrice.toFixed(dec)),
          };
          const rect = draggingRectangle.drawing;
          if (dragType === 'rectangle-resize') {
            const geo = draggingRectangle.geo;
            if (!geo) return;
            const resized = getRectangleResizePoints(draggingRectangle.handle, geo, nextPoint);
            rect.p1 = resized.p1;
            rect.p2 = resized.p2;
          } else {
            const dx = x - draggingRectangle.startX;
            const dy = y - draggingRectangle.startY;
            const movePoint = (p) => {
              const px = chart.timeScale().timeToCoordinate(p.time);
              const py = seriesRef.current.priceToCoordinate(p.price);
              if (px == null || py == null) return p;
              const t = getNearestDataTimeFromX(px + dx);
              const price = seriesRef.current.coordinateToPrice(py + dy);
              if (t == null || price == null) return p;
              return {
                time: t,
                price: Number.parseFloat(price.toFixed(dec)),
              };
            };
            rect.p1 = movePoint(draggingRectangle.startP1);
            rect.p2 = movePoint(draggingRectangle.startP2);
          }
          rect.items?.[0]?.ref?.updateCorners(rect.p1, rect.p2);
        } else if ((dragType === 'fibonacci-move' || dragType === 'fibonacci-resize') && draggingFibonacci) {
          const newTime = getNearestDataTimeFromX(x);
          const newPrice = seriesRef.current.coordinateToPrice(y);
          if (newTime == null || newPrice == null) return;
          const dec = priceDecimalsRef.current;
          const fib = draggingFibonacci.drawing;
          if (dragType === 'fibonacci-resize') {
            const resized = getFibonacciResizePoints(draggingFibonacci.key, draggingFibonacci.corners, {
              time: newTime,
              price: Number.parseFloat(newPrice.toFixed(dec)),
            });
            fib.p1 = resized.p1;
            fib.p2 = resized.p2;
          } else {
            const dx = x - draggingFibonacci.startX;
            const dy = y - draggingFibonacci.startY;
            const movePoint = (p) => {
              const px = chart.timeScale().timeToCoordinate(p.time);
              const py = seriesRef.current.priceToCoordinate(p.price);
              if (px == null || py == null) return p;
              const t = getNearestDataTimeFromX(px + dx);
              const price = seriesRef.current.coordinateToPrice(py + dy);
              if (t == null || price == null) return p;
              return {
                time: t,
                price: Number.parseFloat(price.toFixed(dec)),
              };
            };
            fib.p1 = movePoint(draggingFibonacci.startP1);
            fib.p2 = movePoint(draggingFibonacci.startP2);
          }
          const fibRef = fib.items?.[0]?.ref;
          const currentConfig = fibRef?.getLevelConfig?.() || fiboLevelsRef.current || [];
          const levels = buildFiboLevels(fib.p1.price, fib.p2.price, dec, currentConfig);
          if (!levels) return;
          fibRef?.updatePoints(fib.p1, fib.p2, levels);
          const appearance = fibRef?.getAppearance?.();
          if (appearance) {
            fibRef.updateAppearance({
              color: appearance.color,
              lineStyle: appearance.lineStyle,
              lineWidth: appearance.lineWidth,
            });
          }
        } else if (dragType === 'drawing-horizontal' && draggingHorizontalDrawing) {
          const newPrice = seriesRef.current.coordinateToPrice(y);
          if (newPrice == null) return;
          const dec = priceDecimalsRef.current;
          const rounded = Number.parseFloat(newPrice.toFixed(dec));
          if (Math.abs(rounded - draggingHorizontalDrawing.price) > Math.pow(10, -dec)) {
            horizontalDragMoved = true;
          }
          draggingHorizontalDrawing.price = rounded;
          const ref = draggingHorizontalDrawing.items?.[0]?.ref;
          const textPrimitive = draggingHorizontalDrawing.items?.find((item) => item.kind === 'primitive')?.ref;
          if (ref) {
            ref.applyOptions({
              price: rounded,
              color: draggingHorizontalDrawing.color || '#8b5cf6',
              lineStyle: lineStyleToCode(draggingHorizontalDrawing.lineStyle || 'solid'),
              lineWidth: draggingHorizontalDrawing.lineWidth || 2,
              title: buildHorizontalTitle(draggingHorizontalDrawing, dec),
            });
          }
          textPrimitive?.updateData({
            price: rounded,
            text: draggingHorizontalDrawing.text || 'S/R',
            color: draggingHorizontalDrawing.color || '#8b5cf6',
            labelPosition: draggingHorizontalDrawing.textPosition || 'above',
            textSize: draggingHorizontalDrawing.textSize || 11,
          });
        } else {
          const newPrice = seriesRef.current.coordinateToPrice(y);
          if (newPrice == null) return;

          const dec = priceDecimalsRef.current;
          const r = Number.parseFloat(newPrice.toFixed(dec));
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
        }
        return;
      }

      const canHoverCurveHandles =
        !drawingModeRef.current ||
        (drawingModeRef.current === 'curve' && firstPointRef.current == null && secondPointRef.current == null);

      if (canHoverCurveHandles) {
        const curveHandle = findCurveHandleNearPointer(x, y);
        if (curveHandle) {
          chartContainerRef.current.style.cursor = 'grab';
          return;
        }
        const trendlineHandle = findTrendlineHandleNearPointer(x, y);
        if (trendlineHandle) {
          chartContainerRef.current.style.cursor = 'grab';
          return;
        }
        const fibonacciHandle = findFibonacciHandleNearPointer(x, y);
        if (fibonacciHandle) {
          chartContainerRef.current.style.cursor = getFibonacciResizeCursor(fibonacciHandle.key);
          return;
        }
        if (!drawingModeRef.current) {
          const rectangleHandle = findRectangleHandleNearPointer(x, y);
          if (rectangleHandle) {
            chartContainerRef.current.style.cursor = getRectangleResizeCursor(rectangleHandle.handle);
            return;
          }
          const drawing = findNonCurveDrawingNearPointer(x, y);
          if (drawing?.type === 'rectangle') {
            chartContainerRef.current.style.cursor = 'move';
            return;
          }
          if (drawing?.type === 'fibonacci') {
            chartContainerRef.current.style.cursor = 'move';
            return;
          }
        }
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
      if (!isDragging && pendingHorizontalDrawing) {
        const heldMs = Date.now() - horizontalPointerDownAt;
        if (heldMs >= HORIZONTAL_HOLD_MS) {
          suppressNextSelectionClick = true;
        }
        pendingHorizontalDrawing = null;
        draggingHorizontalDrawing = null;
        horizontalDragMoved = false;
        chartContainerRef.current.style.cursor = drawingModeRef.current ? 'crosshair' : '';
        return;
      }
      if (!isDragging) return;

      const y = getChartY(e);
      const newPrice = seriesRef.current?.coordinateToPrice(y);
      const type = dragType;

      isDragging = false;
      dragType = null;
      draggingCurve = null;
      draggingTrendlineHandle = null;
      draggingRectangle = null;
      draggingFibonacci = null;
      draggingHorizontalDrawing = null;
      pendingHorizontalDrawing = null;
      if (type === 'drawing-horizontal' && horizontalDragMoved) {
        suppressNextSelectionClick = true;
      }
      horizontalDragMoved = false;
      chart.applyOptions({ handleScroll: true, handleScale: true });
      chartContainerRef.current.style.cursor = drawingModeRef.current ? 'crosshair' : '';
      try { chartContainerRef.current.releasePointerCapture(e.pointerId); } catch {
        // unsupported pointer capture
      }

      if ((type === 'sl' || type === 'tp') && newPrice != null && onSLTPDragRef.current) {
        const dec = priceDecimalsRef.current;
        onSLTPDragRef.current(type, Number.parseFloat(newPrice.toFixed(dec)));
      }
    };

    const container = chartContainerRef.current;
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    const handleNativeDblClick = (e) => {
      const x = getChartX(e);
      const y = getChartY(e);
      openEditorAtPoint(x, y);
    };
    container.addEventListener('dblclick', handleNativeDblClick);

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.code === 'Enter') {
        if (drawingModeRef.current !== 'trendline') return;
        e.preventDefault();
        const lastTrendlineId = trendlineChainIdsRef.current.at(-1);
        if (lastTrendlineId != null) {
          const lastTrendline = drawingsRef.current.find((d) => d.id === lastTrendlineId && d.type === 'trendline');
          lastTrendline?.items?.[0]?.ref?.updateAppearance({ showArrow: true });
        }
        firstPointRef.current = null;
        secondPointRef.current = null;
        activeTrendlineChainIdRef.current = null;
        trendlineChainIdsRef.current = [];
        cleanupPreviewRef.current?.();
        onDrawingComplete?.();
        return;
      }

      const isEscapeKey = e.key === 'Escape' || e.key === 'Esc';
      if (isEscapeKey) {
        if (drawingModeRef.current === 'trendline') {
          e.preventDefault();
          firstPointRef.current = null;
          activeTrendlineChainIdRef.current = null;
          trendlineChainIdsRef.current = [];
          cleanupPreviewRef.current?.();
          onDrawingComplete?.();
          return;
        }
        if (selectedDrawingIdRef.current == null) return;
        e.preventDefault();
        setSelectedDrawingId(null, true);
        return;
      }

      const target = e.target;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (isTypingTarget) return;

      const isDeleteKey =
        e.key === 'Delete' ||
        e.key === 'Backspace' ||
        e.code === 'Delete' ||
        e.code === 'Backspace';
      if (!isDeleteKey) return;
      if (selectedDrawingIdRef.current == null) return;
      e.preventDefault();
      removeSelectedDrawing();
    };
    globalThis.addEventListener('keydown', handleKeyDown);

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
        try { candlestickSeries.detachPrimitive(sessionsPrimitiveRef.current); } catch {
          // ignore stale primitive detach
        }
        sessionsPrimitiveRef.current = null;
      }

      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('dblclick', handleNativeDblClick);
      globalThis.removeEventListener('keydown', handleKeyDown);
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
        try { savedRange = chart.timeScale().getVisibleLogicalRange(); } catch {
          // chart may be mid-dispose
        }
      }
      seriesRef.current.setData(data);
      if (savedRange && chart) {
        const addedCount = newLen - prevLen;
        try {
          chart.timeScale().setVisibleLogicalRange({
            from: savedRange.from + addedCount,
            to: savedRange.to + addedCount,
          });
        } catch {
          // best-effort restore of viewport
        }
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
        } catch {
          // chart not ready yet
        }
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
        try { seriesRef.current.removePriceLine(r.current); } catch {
          // line may already be removed
        }
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
