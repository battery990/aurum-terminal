import type { Candle, DataMode, Ticker, Timeframe } from '../types';
import { TF_META } from './timeframes';
import { round } from './format';

const HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com'];
const SYMBOL = 'PAXGUSDT';
const CACHE_PREFIX = 'aurum:snap:v1:';

let activeHost = HOSTS[0];

async function getJson<T>(path: string, timeout = 12_000): Promise<T> {
  const order = [activeHost, ...HOSTS.filter((h) => h !== activeHost)];
  let lastError: unknown;
  for (const host of order) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(`${host}${path}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as T;
      activeHost = host;
      return data;
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('network unavailable');
}

export async function fetchKlines(tf: Timeframe, limit = 320): Promise<Candle[]> {
  const raw = await getJson<unknown[][]>(
    `/api/v3/klines?symbol=${SYMBOL}&interval=${TF_META[tf].binance}&limit=${limit}`,
  );
  const map = new Map<number, Candle>();
  for (const row of raw) {
    const candle: Candle = {
      time: Number(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    };
    if (
      Number.isFinite(candle.time) &&
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.close) &&
      candle.close > 0
    ) {
      map.set(candle.time, candle);
    }
  }
  return [...map.values()].sort((a, b) => a.time - b.time);
}

export async function fetchTicker(): Promise<Ticker> {
  const raw = await getJson<Record<string, string>>(`/api/v3/ticker/24hr?symbol=${SYMBOL}`);
  const price = Number(raw.lastPrice);
  return {
    price,
    change: Number(raw.priceChange),
    changePct: Number(raw.priceChangePercent),
    high: Number(raw.highPrice),
    low: Number(raw.lowPrice),
    volume: Number(raw.volume),
    quoteVolume: Number(raw.quoteVolume),
    ts: Number(raw.closeTime) || Date.now(),
  };
}

export interface Snapshot {
  candles: Candle[];
  ticker: Ticker;
  ts: number;
}

export function saveSnapshot(tf: Timeframe, snapshot: Snapshot): void {
  try {
    localStorage.setItem(CACHE_PREFIX + tf, JSON.stringify({ ...snapshot, candles: snapshot.candles.slice(-320) }));
  } catch {
    /* storage full or unavailable */
  }
}

export function loadSnapshot(tf: Timeframe): Snapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + tf);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot;
    if (!Array.isArray(parsed.candles) || parsed.candles.length < 20) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSnapshots(): void {
  try {
    for (const tf of Object.keys(TF_META)) localStorage.removeItem(CACHE_PREFIX + tf);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* 演示数据：仅在实时源不可达且无缓存时启用，UI 会明确标注            */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function demoMarket(tf: Timeframe): { candles: Candle[]; ticker: Ticker; mode: DataMode } {
  const meta = TF_META[tf];
  const rand = mulberry32(hash(tf + 'aurum'));
  const count = 320;
  const now = Date.now();
  const aligned = Math.floor(now / meta.ms) * meta.ms;
  const base = 4096;
  const volScale = Math.sqrt(meta.ms / 60_000);
  let price = base - 38;
  const candles: Candle[] = [];
  let trend = 0.18;
  for (let i = count - 1; i >= 0; i--) {
    if (i % 42 === 0) trend = (rand() - 0.42) * 0.9;
    const shock = (rand() - 0.5) * 2;
    const drift = trend * 0.55 + Math.sin(i / 23) * 0.12;
    const open = price;
    const move = (drift + shock) * 2.1 * volScale;
    const close = Math.max(100, open + move);
    const wick = (0.6 + rand() * 1.5) * 2.1 * volScale;
    const high = Math.max(open, close) + wick * rand();
    const low = Math.min(open, close) - wick * rand();
    const volume = (30 + rand() * 90) * (1 + Math.abs(move) / 3) * volScale;
    candles.push({
      time: aligned - i * meta.ms,
      open: round(open, 2),
      high: round(high, 2),
      low: round(low, 2),
      close: round(close, 2),
      volume: round(volume, 3),
    });
    price = close;
  }
  const last = candles[candles.length - 1];
  const dayBars = Math.min(candles.length - 1, Math.round(86_400_000 / meta.ms));
  const ref = candles[candles.length - 1 - dayBars] ?? candles[0];
  const recent = candles.slice(-Math.max(2, dayBars));
  const high = Math.max(...recent.map((c) => c.high));
  const low = Math.min(...recent.map((c) => c.low));
  return {
    candles,
    ticker: {
      price: last.close,
      change: round(last.close - ref.close, 2),
      changePct: round(((last.close - ref.close) / ref.close) * 100, 2),
      high: round(high, 2),
      low: round(low, 2),
      volume: round(recent.reduce((s, c) => s + c.volume, 0), 2),
      quoteVolume: 0,
      ts: now,
    },
    mode: 'demo',
  };
}
