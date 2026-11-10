export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const round = (v: number, digits = 2) => {
  const p = 10 ** digits;
  return Math.round(v * p) / p;
};

export function fmtPrice(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '--';
  return v.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtNum(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return '--';
  return v.toFixed(digits);
}

export function fmtSigned(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return '--';
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}`;
}

export function fmtPct(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return '--';
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`;
}

export function fmtCompact(v: number): string {
  if (!Number.isFinite(v)) return '--';
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(1);
}

const pad = (n: number) => String(n).padStart(2, '0');

export function fmtClock(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function fmtTime(ts: number, intraday: boolean): string {
  const d = new Date(ts);
  if (intraday) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

export function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtFullDateTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${s}s`;
}

export interface SessionInfo {
  label: string;
  detail: string;
  active: boolean;
}

/** 以 UTC 划分黄金主要交易时段 */
export function marketSession(date = new Date()): SessionInfo {
  const h = date.getUTCHours() + date.getUTCMinutes() / 60;
  if (h >= 12 && h < 16) return { label: '伦敦 · 纽约重叠', detail: '流动性最高', active: true };
  if (h >= 8 && h < 12) return { label: '伦敦盘', detail: '机构活跃', active: true };
  if (h >= 16 && h < 21) return { label: '纽约盘', detail: '美盘活跃', active: true };
  if (h >= 0 && h < 8) return { label: '亚洲盘', detail: '流动性偏低', active: true };
  return { label: '结算时段', detail: '流动性下降', active: false };
}

export function regimeToneClass(tone: 'bull' | 'bear' | 'neutral'): string {
  return tone === 'bull' ? 'is-up' : tone === 'bear' ? 'is-down' : 'is-flat';
}

export function actionLabel(action: 'long' | 'short' | 'wait'): string {
  return action === 'long' ? '做多' : action === 'short' ? '做空' : '观望';
}
