import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Analysis, Candle, Timeframe } from '../types';
import { TF_META, OVERLAY_COLORS } from '../lib/timeframes';
import { clamp, fmtDateTime, fmtPrice, fmtTime } from '../lib/format';

interface Props {
  candles: Candle[];
  analysis: Analysis | null;
  tf: Timeframe;
  showBands: boolean;
  showPlan: boolean;
  height?: number;
  loading?: boolean;
  onRangeChange?: (range: { start: number; end: number }) => void;
}

interface View {
  end: number;
  bars: number;
}

interface Hover {
  index: number;
  x: number;
  y: number;
}

const MONO = '"JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = '"Inter Variable", "PingFang SC", "Noto Sans SC", sans-serif';

const UP = '#2FD08A';
const DOWN = '#FF5D6C';

export default function CandleChart({
  candles,
  analysis,
  tf,
  showBands,
  showPlan,
  height = 300,
  loading = false,
  onRangeChange,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [view, setView] = useState<View>({ end: 0, bars: 0 });
  const [hover, setHover] = useState<Hover | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef<{ startX: number; startEnd: number; moved: boolean } | null>(null);
  const pinchRef = useRef<{ dist: number; bars: number } | null>(null);
  const metricsRef = useRef({ barW: 1, padL: 8, plotW: 100, start: 0 });
  const reportedRef = useRef('');

  const n = candles.length;
  const intraday = tf !== '1d' && tf !== '1w';

  /* ------------------------------ 尺寸 ------------------------------ */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.floor(w));
    });
    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  /* --------------------------- 视图初始化 --------------------------- */
  useEffect(() => {
    setView({ end: Math.max(0, n - 1), bars: Math.min(90, Math.max(20, n)) });
    setHover(null);
  }, [tf, n === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setView((v) => {
      if (!v.bars) return { end: Math.max(0, n - 1), bars: Math.min(90, Math.max(20, n)) };
      if (n === 0) return v;
      const wasAtEnd = v.end >= n - 3;
      const bars = clamp(v.bars, 20, Math.max(20, n));
      return { bars, end: wasAtEnd ? n - 1 : Math.min(v.end, n - 1) };
    });
  }, [n]);

  const end = clamp(view.end, 0, Math.max(0, n - 1));
  const bars = clamp(view.bars || 80, 20, Math.max(20, n));
  const start = Math.max(0, end - bars + 1);
  const visible = useMemo(() => candles.slice(start, end + 1), [candles, start, end]);

  const hoverCandle = hover ? candles[hover.index] : null;
  const prevClose = hover && hover.index > 0 ? candles[hover.index - 1].close : null;

  useEffect(() => {
    if (!onRangeChange) return;
    const key = `${start}:${end}`;
    if (reportedRef.current === key) return;
    reportedRef.current = key;
    onRangeChange({ start, end });
  }, [start, end, onRangeChange]);

  /* ------------------------------ 绘制 ------------------------------ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const padL = 6;
    const padR = 58;
    const padT = 10;
    const padB = 22;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const volH = Math.max(20, plotH * 0.17);
    const priceH = plotH - volH - 8;
    const priceTop = padT;
    const priceBottom = padT + priceH;
    const volTop = priceBottom + 8;
    const volBottom = padT + plotH;

    if (!visible.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (let i = 0; i < 4; i++) {
        const y = priceTop + (priceH / 3) * i;
        ctx.fillRect(padL, y, plotW, 1);
      }
      ctx.fillStyle = 'rgba(139,146,156,0.55)';
      ctx.font = `500 11px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(loading ? '正在接入实时行情…' : '暂无行情数据', padL + plotW / 2, priceTop + priceH / 2);
      return;
    }

    const barW = plotW / visible.length;
    metricsRef.current = { barW, padL, plotW, start };

    /* -------- 价格范围 -------- */
    let lo = Infinity;
    let hi = -Infinity;
    for (const c of visible) {
      if (c.low < lo) lo = c.low;
      if (c.high > hi) hi = c.high;
    }
    const series = analysis?.series;
    const include = (arr: number[] | undefined) => {
      if (!arr) return;
      for (let i = start; i <= end; i++) {
        const v = arr[i];
        if (Number.isFinite(v)) {
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
    };
    include(series?.fastMa);
    include(series?.slowMa);
    include(series?.vwap);
    if (showBands) {
      include(series?.bb?.upper);
      include(series?.bb?.lower);
    }
    const plan = analysis?.plan;
    if (showPlan && plan && plan.action !== 'wait') {
      if (plan.entry != null) {
        lo = Math.min(lo, plan.entry);
        hi = Math.max(hi, plan.entry);
      }
      if (plan.stop != null) {
        lo = Math.min(lo, plan.stop);
        hi = Math.max(hi, plan.stop);
      }
      for (const t of plan.targets) {
        lo = Math.min(lo, t);
        hi = Math.max(hi, t);
      }
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      lo = 0;
      hi = 1;
    }
    const span = Math.max(hi - lo, 0.001);
    lo -= span * 0.08;
    hi += span * 0.08;

    const yPrice = (v: number) => priceBottom - ((v - lo) / (hi - lo)) * priceH;
    const xAt = (i: number) => padL + (i - start + 0.5) * barW;

    /* -------- 网格与坐标 -------- */
    ctx.font = `500 9.5px ${MONO}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const gridCount = 4;
    for (let i = 0; i < gridCount; i++) {
      const y = priceTop + (priceH / (gridCount - 1)) * i;
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.fillRect(padL, y, plotW, 1);
      const price = hi - ((hi - lo) / (gridCount - 1)) * i;
      ctx.fillStyle = 'rgba(139,146,156,0.72)';
      ctx.fillText(fmtPrice(price), padL + plotW + 8, y);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.fillRect(padL, volBottom, plotW, 1);
    ctx.fillRect(padL, volTop, plotW, 1);

    const timeTicks = 3;
    for (let i = 0; i < timeTicks; i++) {
      const idx = Math.round(start + ((visible.length - 1) / (timeTicks - 1)) * i);
      const x = xAt(idx);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(x, priceTop, 1, priceH);
      ctx.fillStyle = 'rgba(139,146,156,0.66)';
      ctx.font = `500 9.5px ${MONO}`;
      ctx.textAlign = i === 0 ? 'left' : i === timeTicks - 1 ? 'right' : 'center';
      ctx.fillText(fmtTime(candles[idx].time, intraday), clamp(x, padL, padL + plotW), height - 9);
    }

    /* -------- 布林带 -------- */
    if (showBands && series?.bb) {
      const pts: Array<[number, number, number]> = [];
      for (let i = start; i <= end; i++) {
        const u = series.bb.upper[i];
        const l = series.bb.lower[i];
        if (Number.isFinite(u) && Number.isFinite(l)) pts.push([i, u, l]);
      }
      if (pts.length > 1) {
        ctx.beginPath();
        pts.forEach(([i, u], k) => {
          const x = xAt(i);
          const y = yPrice(u);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        for (let k = pts.length - 1; k >= 0; k--) {
          const [i, , l] = pts[k];
          ctx.lineTo(xAt(i), yPrice(l));
        }
        ctx.closePath();
        ctx.fillStyle = OVERLAY_COLORS.bandFill;
        ctx.fill();

        ctx.strokeStyle = 'rgba(110,168,255,0.34)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        for (const key of [1, 2] as const) {
          ctx.beginPath();
          pts.forEach(([i, u, l], k) => {
            const x = xAt(i);
            const y = yPrice(key === 1 ? u : l);
            if (k === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    }

    /* -------- 交易计划区间 -------- */
    if (showPlan && plan && plan.action !== 'wait' && plan.entry != null && plan.stop != null) {
      const entryY = yPrice(plan.entry);
      const stopY = yPrice(plan.stop);
      const t1 = plan.targets[0];
      if (Number.isFinite(t1)) {
        const t1Y = yPrice(t1);
        ctx.fillStyle = 'rgba(47,208,138,0.055)';
        ctx.fillRect(padL, Math.min(entryY, t1Y), plotW, Math.abs(t1Y - entryY));
        ctx.fillStyle = 'rgba(255,93,108,0.06)';
        ctx.fillRect(padL, Math.min(entryY, stopY), plotW, Math.abs(stopY - entryY));
      }
      const levels: Array<{ v: number; color: string; label: string }> = [
        { v: plan.entry, color: OVERLAY_COLORS.entry, label: '入' },
        { v: plan.stop, color: OVERLAY_COLORS.stop, label: '损' },
        ...plan.targets.map((v, i) => ({ v, color: OVERLAY_COLORS.target, label: `T${i + 1}` })),
      ];
      for (const lv of levels) {
        const y = yPrice(lv.v);
        if (y < priceTop || y > priceBottom) continue;
        ctx.strokeStyle = lv.color;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 5]);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + plotW, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.fillStyle = lv.color;
        ctx.fillRect(padL + plotW - 2, y - 2, 3, 4);
      }
    }

    /* -------- 均线与 VWAP -------- */
    const drawLine = (arr: number[] | undefined, color: string, width: number, dash: number[] = []) => {
      if (!arr) return;
      ctx.beginPath();
      let began = false;
      for (let i = start; i <= end; i++) {
        const v = arr[i];
        if (!Number.isFinite(v)) {
          began = false;
          continue;
        }
        const x = xAt(i);
        const y = yPrice(v);
        if (!began) {
          ctx.moveTo(x, y);
          began = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash(dash);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    drawLine(series?.fastMa, OVERLAY_COLORS.fast, 1.6);
    drawLine(series?.slowMa, OVERLAY_COLORS.slow, 1.5);
    drawLine(series?.vwap, OVERLAY_COLORS.vwap, 1.2, [4, 4]);

    /* -------- 成交量 -------- */
    let maxVol = 0;
    for (const c of visible) maxVol = Math.max(maxVol, c.volume);
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const up = c.close >= c.open;
      const x = xAt(start + i);
      const h = Math.max(1, Math.sqrt(c.volume / (maxVol || 1)) * (volBottom - volTop));
      ctx.fillStyle = up ? 'rgba(47,208,138,0.34)' : 'rgba(255,93,108,0.34)';
      const bw = Math.max(1, Math.min(barW * 0.62, 10));
      ctx.fillRect(x - bw / 2, volBottom - h, bw, h);
    }

    /* -------- K 线 -------- */
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const up = c.close >= c.open;
      const x = xAt(start + i);
      const color = up ? UP : DOWN;
      const bw = Math.max(1, Math.min(barW * 0.62, 12));
      const yHigh = yPrice(c.high);
      const yLow = yPrice(c.low);
      const yOpen = yPrice(c.open);
      const yClose = yPrice(c.close);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, Math.min(1.4, barW * 0.12));
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();
      const bodyTop = Math.min(yOpen, yClose);
      const bodyH = Math.max(1, Math.abs(yClose - yOpen));
      ctx.fillStyle = color;
      if (bw > 2.5) {
        roundRect(ctx, x - bw / 2, bodyTop, bw, bodyH, Math.min(1.5, bw / 3));
        ctx.fill();
      } else {
        ctx.fillRect(x - bw / 2, bodyTop, bw, bodyH);
      }
    }

    /* -------- 最新价 -------- */
    const last = candles[n - 1];
    if (last) {
      const lastY = yPrice(last.close);
      if (lastY >= priceTop && lastY <= priceBottom) {
        const up = last.close >= last.open;
        const color = up ? UP : DOWN;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.55;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padL, lastY);
        ctx.lineTo(padL + plotW, lastY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        const label = fmtPrice(last.close);
        ctx.font = `600 10px ${MONO}`;
        const tw = Math.max(padR - 8, ctx.measureText(label).width + 10);
        ctx.fillStyle = color;
        roundRect(ctx, width - padR + 3, lastY - 8, tw, 16, 4);
        ctx.fill();
        ctx.fillStyle = '#06110C';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, width - padR + 3 + tw / 2, lastY + 0.5);
      }
    }

    /* -------- 十字光标 -------- */
    if (hover) {
      const c = candles[hover.index];
      if (c) {
        const x = xAt(hover.index);
        const y = clamp(hover.y, priceTop, priceBottom);
        ctx.strokeStyle = 'rgba(236,238,241,0.32)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(x, priceTop);
        ctx.lineTo(x, volBottom);
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + plotW, y);
        ctx.stroke();
        ctx.setLineDash([]);

        const price = hi - ((y - priceTop) / priceH) * (hi - lo);
        ctx.font = `600 9.5px ${MONO}`;
        const pText = fmtPrice(price);
        const pWidth = ctx.measureText(pText).width + 12;
        ctx.fillStyle = '#2A3038';
        roundRect(ctx, width - padR + 3, y - 8, pWidth, 16, 4);
        ctx.fill();
        ctx.fillStyle = '#E8EAED';
        ctx.textAlign = 'center';
        ctx.fillText(pText, width - padR + 3 + pWidth / 2, y + 0.5);

        const tText = fmtDateTime(c.time);
        const tWidth = ctx.measureText(tText).width + 14;
        ctx.fillStyle = '#2A3038';
        roundRect(ctx, clamp(x - tWidth / 2, padL, width - padR - tWidth), height - 19, tWidth, 16, 4);
        ctx.fill();
        ctx.fillStyle = '#E8EAED';
        ctx.textAlign = 'center';
        ctx.fillText(tText, clamp(x, padL + tWidth / 2, width - padR - tWidth / 2), height - 10.5);
      }
    }
  }, [candles, visible, start, end, width, height, analysis, showBands, showPlan, hover, loading, n, intraday]);

  /* ---------------------------- 交互 ---------------------------- */
  const localPoint = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const updateHover = (x: number, y: number) => {
    const { barW, padL, plotW, start: st } = metricsRef.current;
    if (x < padL || x > padL + plotW) {
      setHover(null);
      return;
    }
    const idx = clamp(st + Math.floor((x - padL) / barW), 0, n - 1);
    setHover({ index: idx, x, y });
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = localPoint(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 1) {
      dragRef.current = { startX: p.x, startEnd: end, moved: false };
      updateHover(p.x, p.y);
    } else if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      pinchRef.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), bars };
      dragRef.current = null;
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = localPoint(e);
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, p);

    if (pointers.current.size === 2 && pinchRef.current) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (dist > 10 && pinchRef.current.dist > 10) {
        const nextBars = clamp(Math.round(pinchRef.current.bars * (pinchRef.current.dist / dist)), 20, n);
        setView((v) => ({ ...v, bars: nextBars }));
      }
      return;
    }

    const drag = dragRef.current;
    if (drag) {
      const dx = p.x - drag.startX;
      if (Math.abs(dx) > 3) drag.moved = true;
      const { barW } = metricsRef.current;
      if (barW > 0) {
        const shift = Math.round(dx / barW);
        setView((v) => ({ ...v, end: clamp(drag.startEnd - shift, Math.min(bars - 1, n - 1), n - 1) }));
      }
      return;
    }
    updateHover(p.x, p.y);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchRef.current = null;
    if (pointers.current.size === 0) dragRef.current = null;
  };

  const onPointerLeave = () => {
    if (pointers.current.size === 0) setHover(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.12 : 0.89;
      setView((v) => ({ ...v, bars: clamp(Math.round((v.bars || 80) * factor), 20, n) }));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [n]);

  const reset = useCallback(() => {
    setView({ end: Math.max(0, n - 1), bars: Math.min(90, Math.max(20, n)) });
    setHover(null);
  }, [n]);

  const last = candles[candles.length - 1];
  const up = last ? last.close >= last.open : true;

  return (
    <div className="chart" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="chart-canvas"
        style={{ height }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        onDoubleClick={reset}
        role="img"
        aria-label={`${TF_META[tf].name}黄金 K 线图`}
      />
      {hoverCandle && (
        <div
          className="chart-tip"
          style={{
            left: clamp((hover?.x ?? 0) > width * 0.55 ? (hover?.x ?? 0) - 172 : (hover?.x ?? 0) + 14, 8, Math.max(8, width - 180)),
            top: 26,
          }}
        >
          <div className="chart-tip__time">{fmtDateTime(hoverCandle.time)}</div>
          <div className="chart-tip__grid">
            <span>开</span>
            <b>{fmtPrice(hoverCandle.open)}</b>
            <span>高</span>
            <b className="is-up">{fmtPrice(hoverCandle.high)}</b>
            <span>低</span>
            <b className="is-down">{fmtPrice(hoverCandle.low)}</b>
            <span>收</span>
            <b className={hoverCandle.close >= hoverCandle.open ? 'is-up' : 'is-down'}>
              {fmtPrice(hoverCandle.close)}
            </b>
            <span>量</span>
            <b>{hoverCandle.volume.toFixed(1)}</b>
          </div>
          {prevClose != null && (
            <div className="chart-tip__chg">
              较前收{' '}
              <b className={hoverCandle.close >= prevClose ? 'is-up' : 'is-down'}>
                {hoverCandle.close >= prevClose ? '+' : ''}
                {(((hoverCandle.close - prevClose) / prevClose) * 100).toFixed(2)}%
              </b>
            </div>
          )}
        </div>
      )}
      <div className="chart-badge">
        <span className={`chart-badge__dot ${up ? 'is-up' : 'is-down'}`} />
        {TF_META[tf].name}
        <span className="chart-badge__hint">拖动 / 双指缩放</span>
      </div>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
