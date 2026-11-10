import { useEffect, useRef, useState } from 'react';
import type { Analysis, Candle, PaneKind } from '../types';
import { lastValue } from '../lib/indicators';
import { clamp, fmtNum, fmtPrice } from '../lib/format';

interface Props {
  analysis: Analysis | null;
  candles: Candle[];
  pane: PaneKind;
  onPaneChange: (pane: PaneKind) => void;
  range: { start: number; end: number } | null;
}

const MONO = '"JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = '"Inter Variable", "PingFang SC", "Noto Sans SC", sans-serif';

const PANE_META: Record<PaneKind, { label: string; color: string; desc: (a: Analysis) => string }> = {
  rsi: {
    label: 'RSI',
    color: '#E7B84B',
    desc: (a) => `RSI(${a.profile.rsi}) · 70 超买 / 30 超卖，用于过滤追单与识别衰竭`,
  },
  macd: {
    label: 'MACD',
    color: '#E7B84B',
    desc: (a) =>
      `MACD ${a.profile.macd?.join(' / ') ?? '12 / 26 / 9'} · 柱状体衡量动能强弱，零轴区分多空`,
  },
  atr: {
    label: 'ATR',
    color: '#5FD0C4',
    desc: (a) => `ATR(${a.profile.atr}) · 用于校准止损距离与仓位，不判断方向`,
  },
  volume: {
    label: 'VOL',
    color: '#7C93B8',
    desc: () => '成交量 · 与 20 周期均量比较，判断突破是否获得参与度支持',
  },
};

export default function IndicatorPanel({ analysis, candles, pane, onPaneChange, range }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const height = 118;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(Math.floor(entries[0]?.contentRect.width ?? 0)));
    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  const profile = analysis?.profile;
  const available: PaneKind[] = ['rsi'];
  if (profile?.macd) available.push('macd');
  available.push('atr', 'volume');

  useEffect(() => {
    if (!analysis) return;
    if (!available.includes(pane)) onPaneChange(available[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pane, analysis?.profile.tf, analysis]);

  const readout = (() => {
    if (!analysis) return { value: '--', sub: '' };
    const s = analysis.series;
    if (pane === 'rsi') {
      const v = lastValue(s.rsi);
      return {
        value: fmtNum(v, 1),
        sub: v >= 70 ? '超买' : v <= 30 ? '超卖' : v >= 55 ? '强势' : v <= 45 ? '弱势' : '中性',
      };
    }
    if (pane === 'macd') {
      const h = lastValue(s.macd?.hist ?? []);
      return { value: `${h >= 0 ? '+' : ''}${fmtNum(h, 2)}`, sub: h >= 0 ? '多头动能' : '空头动能' };
    }
    if (pane === 'atr') {
      const v = lastValue(s.atr);
      const pct = analysis.metrics.atrPct;
      return { value: fmtPrice(v), sub: `${fmtNum(pct, 2)}%` };
    }
    const ratio = analysis.metrics.volRatio;
    return { value: `${fmtNum(ratio, 2)}×`, sub: '相对均量' };
  })();

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
    const padR = 52;
    const padT = 12;
    const padB = 14;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    if (!analysis || !candles.length) {
      ctx.fillStyle = 'rgba(139,146,156,0.5)';
      ctx.font = `500 11px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText('指标计算中…', padL + plotW / 2, padT + plotH / 2);
      return;
    }

    const n = candles.length;
    const start = clamp(range?.start ?? Math.max(0, n - 90), 0, n - 1);
    const end = clamp(range?.end ?? n - 1, start, n - 1);
    const count = end - start + 1;
    const barW = plotW / count;
    const xAt = (i: number) => padL + (i - start + 0.5) * barW;

    const yGrid = (fraction: number) => padT + plotH * fraction;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (const f of [0, 0.5, 1]) {
      ctx.beginPath();
      ctx.moveTo(padL, yGrid(f));
      ctx.lineTo(padL + plotW, yGrid(f));
      ctx.stroke();
    }

    ctx.font = `500 9px ${MONO}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const drawSeries = (values: number[], color: string, yFn: (v: number) => number, lw = 1.5) => {
      ctx.beginPath();
      let began = false;
      for (let i = start; i <= end; i++) {
        const v = values[i];
        if (!Number.isFinite(v)) {
          began = false;
          continue;
        }
        const x = xAt(i);
        const y = yFn(v);
        if (!began) {
          ctx.moveTo(x, y);
          began = true;
        } else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineJoin = 'round';
      ctx.stroke();
    };

    const label = (text: string, y: number) => {
      ctx.fillStyle = 'rgba(139,146,156,0.7)';
      ctx.fillText(text, padL + plotW + 7, y);
    };

    if (pane === 'rsi') {
      const values = analysis.series.rsi;
      const yFn = (v: number) => padT + ((100 - v) / 100) * plotH;
      ctx.fillStyle = 'rgba(255,93,108,0.05)';
      ctx.fillRect(padL, yFn(100), plotW, yFn(70) - yFn(100));
      ctx.fillStyle = 'rgba(47,208,138,0.05)';
      ctx.fillRect(padL, yFn(30), plotW, yFn(0) - yFn(30));

      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(255,93,108,0.35)';
      ctx.beginPath();
      ctx.moveTo(padL, yFn(70));
      ctx.lineTo(padL + plotW, yFn(70));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(47,208,138,0.35)';
      ctx.beginPath();
      ctx.moveTo(padL, yFn(30));
      ctx.lineTo(padL + plotW, yFn(30));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath();
      ctx.moveTo(padL, yFn(50));
      ctx.lineTo(padL + plotW, yFn(50));
      ctx.stroke();
      ctx.setLineDash([]);
      label('70', yFn(70));
      label('50', yFn(50));
      label('30', yFn(30));

      // 面积
      ctx.beginPath();
      let started = false;
      for (let i = start; i <= end; i++) {
        const v = values[i];
        if (!Number.isFinite(v)) {
          started = false;
          continue;
        }
        const x = xAt(i);
        const y = yFn(v);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else ctx.lineTo(x, y);
      }
      if (started) {
        const lastX = xAt(end);
        const firstX = xAt(start);
        ctx.lineTo(lastX, yFn(0));
        ctx.lineTo(firstX, yFn(0));
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
        grad.addColorStop(0, 'rgba(231,184,75,0.16)');
        grad.addColorStop(1, 'rgba(231,184,75,0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }
      drawSeries(values, '#E7B84B', yFn, 1.7);

      const lastV = lastValue(values);
      if (Number.isFinite(lastV)) {
        ctx.fillStyle = '#E7B84B';
        ctx.beginPath();
        ctx.arc(xAt(end), yFn(lastV), 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (pane === 'macd' && analysis.series.macd) {
      const { line, signal, hist } = analysis.series.macd;
      let maxAbs = 0;
      for (let i = start; i <= end; i++) {
        for (const arr of [line, signal, hist]) {
          if (Number.isFinite(arr[i])) maxAbs = Math.max(maxAbs, Math.abs(arr[i]));
        }
      }
      maxAbs = maxAbs || 1;
      const zeroY = padT + plotH / 2;
      const yFn = (v: number) => zeroY - (v / maxAbs) * (plotH / 2 - 3);
      label(`+${maxAbs.toFixed(2)}`, padT + 4);
      label('0', zeroY);
      label(`-${maxAbs.toFixed(2)}`, padT + plotH - 4);

      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath();
      ctx.moveTo(padL, zeroY);
      ctx.lineTo(padL + plotW, zeroY);
      ctx.stroke();

      const bw = Math.max(1, Math.min(barW * 0.55, 7));
      for (let i = start; i <= end; i++) {
        const v = hist[i];
        if (!Number.isFinite(v)) continue;
        const x = xAt(i);
        const y = yFn(v);
        ctx.fillStyle = v >= 0 ? 'rgba(47,208,138,0.5)' : 'rgba(255,93,108,0.5)';
        ctx.fillRect(x - bw / 2, Math.min(y, zeroY), bw, Math.max(1, Math.abs(y - zeroY)));
      }
      drawSeries(line, '#E7B84B', yFn, 1.5);
      drawSeries(signal, '#7C93B8', yFn, 1.2);
    }

    if (pane === 'atr') {
      const values = analysis.series.atr;
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = start; i <= end; i++) {
        const v = values[i];
        if (Number.isFinite(v)) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
      if (!Number.isFinite(lo)) lo = 0;
      if (!Number.isFinite(hi)) hi = 1;
      const pad = (hi - lo) * 0.15 || 1;
      lo -= pad;
      hi += pad;
      const yFn = (v: number) => padT + ((hi - v) / (hi - lo)) * plotH;
      label(hi.toFixed(2), padT + 4);
      label(lo.toFixed(2), padT + plotH - 4);

      ctx.beginPath();
      let began = false;
      for (let i = start; i <= end; i++) {
        const v = values[i];
        if (!Number.isFinite(v)) continue;
        const x = xAt(i);
        const y = yFn(v);
        if (!began) {
          ctx.moveTo(x, y);
          began = true;
        } else ctx.lineTo(x, y);
      }
      if (began) {
        ctx.lineTo(xAt(end), padT + plotH);
        ctx.lineTo(xAt(start), padT + plotH);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
        grad.addColorStop(0, 'rgba(95,208,196,0.18)');
        grad.addColorStop(1, 'rgba(95,208,196,0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }
      drawSeries(values, '#5FD0C4', yFn, 1.7);
    }

    if (pane === 'volume') {
      let max = 0;
      for (let i = start; i <= end; i++) max = Math.max(max, candles[i].volume);
      max = max || 1;
      const yFn = (v: number) => padT + plotH - (v / max) * plotH;
      label(max.toFixed(0), padT + 4);
      const bw = Math.max(1, Math.min(barW * 0.55, 7));
      for (let i = start; i <= end; i++) {
        const c = candles[i];
        const x = xAt(i);
        const y = yFn(c.volume);
        ctx.fillStyle = c.close >= c.open ? 'rgba(47,208,138,0.42)' : 'rgba(255,93,108,0.42)';
        ctx.fillRect(x - bw / 2, y, bw, Math.max(1, padT + plotH - y));
      }
      drawSeries(analysis.series.volumeMa, '#E7B84B', yFn, 1.2);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.fillRect(padL, padT + plotH, plotW, 1);
  }, [analysis, candles, pane, range, width]);

  return (
    <section className="card panel">
      <div className="panel__head">
        <div className="panel__titlewrap">
          <h2 className="card__title">技术指标</h2>
          <span className="panel__auto">参数随周期优化</span>
        </div>
        <div className="panel__readout">
          <b>{readout.value}</b>
          <span>{readout.sub}</span>
        </div>
      </div>

      <div className="panes" role="tablist" aria-label="指标面板切换">
        {available.map((key) => {
          const isAuto = profile?.pane === key;
          const tabLabel =
            key === 'rsi'
              ? `RSI ${profile?.rsi ?? 14}`
              : key === 'macd'
                ? 'MACD'
                : key === 'atr'
                  ? `ATR ${profile?.atr ?? 14}`
                  : '成交量';
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={pane === key}
              className={`pane-tab ${pane === key ? 'is-active' : ''}`}
              onClick={() => onPaneChange(key)}
            >
              {tabLabel}
              {isAuto && <i className="pane-tab__auto" title="该周期推荐指标" />}
            </button>
          );
        })}
      </div>

      <div className="panel__canvas" ref={wrapRef}>
        <canvas ref={canvasRef} aria-label={`${PANE_META[pane].label} 指标图`} />
      </div>
      <p className="panel__foot">
        {analysis ? PANE_META[pane].desc(analysis) : '指标计算中…'}
        {profile && pane !== profile.pane && (
          <button type="button" className="linkbtn" onClick={() => onPaneChange(profile.pane)}>
            恢复推荐
          </button>
        )}
      </p>
    </section>
  );
}
