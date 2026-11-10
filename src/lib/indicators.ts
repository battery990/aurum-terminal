import type { Candle, IndicatorSeries, StrategyProfile } from '../types';

const fillNaN = (n: number): number[] => new Array<number>(n).fill(Number.NaN);

export function isNum(v: number | undefined | null): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** NaN 感知的简单移动平均 */
export function sma(values: number[], period: number): number[] {
  const out = fillNaN(values.length);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    if (isNum(values[i])) {
      sum += values[i];
      count++;
    }
    if (i >= period) {
      const old = values[i - period];
      if (isNum(old)) {
        sum -= old;
        count--;
      }
    }
    if (count === period) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  const out = fillNaN(values.length);
  const first = values.findIndex((v) => isNum(v));
  if (first < 0 || first + period > values.length) return out;
  let seed = 0;
  for (let i = first; i < first + period; i++) seed += values[i];
  let prev = seed / period;
  out[first + period - 1] = prev;
  const k = 2 / (period + 1);
  for (let i = first + period; i < values.length; i++) {
    const v = isNum(values[i]) ? values[i] : prev;
    prev = v * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function rsi(values: number[], period: number): number[] {
  const n = values.length;
  const out = fillNaN(n);
  if (n <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  const calc = () => (avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  out[period] = calc();
  for (let i = period + 1; i < n; i++) {
    const diff = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    out[i] = calc();
  }
  return out;
}

export function trueRange(candles: Candle[]): number[] {
  const tr = fillNaN(candles.length);
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (i === 0) {
      tr[i] = c.high - c.low;
    } else {
      const prevClose = candles[i - 1].close;
      tr[i] = Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
    }
  }
  return tr;
}

export function atr(candles: Candle[], period: number): number[] {
  const n = candles.length;
  const out = fillNaN(n);
  if (n <= period) return out;
  const tr = trueRange(candles);
  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr[i];
  let prev = sum / period;
  out[period] = prev;
  for (let i = period + 1; i < n; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    out[i] = prev;
  }
  return out;
}

export interface AdxResult {
  adx: number[];
  plusDi: number[];
  minusDi: number[];
}

export function adx(candles: Candle[], period: number): AdxResult {
  const n = candles.length;
  const outAdx = fillNaN(n);
  const plusDi = fillNaN(n);
  const minusDi = fillNaN(n);
  if (n <= period * 2) return { adx: outAdx, plusDi, minusDi };

  const tr = new Array<number>(n).fill(0);
  const pdm = new Array<number>(n).fill(0);
  const mdm = new Array<number>(n).fill(0);
  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < n; i++) {
    const up = candles[i].high - candles[i - 1].high;
    const down = candles[i - 1].low - candles[i].low;
    pdm[i] = up > down && up > 0 ? up : 0;
    mdm[i] = down > up && down > 0 ? down : 0;
    tr[i] = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close),
    );
  }

  let str = 0;
  let sp = 0;
  let sm = 0;
  for (let i = 1; i <= period; i++) {
    str += tr[i];
    sp += pdm[i];
    sm += mdm[i];
  }
  const writeDi = (i: number) => {
    plusDi[i] = str === 0 ? 0 : (100 * sp) / str;
    minusDi[i] = str === 0 ? 0 : (100 * sm) / str;
  };
  writeDi(period);

  const dx = fillNaN(n);
  const writeDx = (i: number) => {
    const sum = plusDi[i] + minusDi[i];
    dx[i] = sum === 0 ? 0 : (100 * Math.abs(plusDi[i] - minusDi[i])) / sum;
  };
  writeDx(period);

  for (let i = period + 1; i < n; i++) {
    str = str - str / period + tr[i];
    sp = sp - sp / period + pdm[i];
    sm = sm - sm / period + mdm[i];
    writeDi(i);
    writeDx(i);
  }

  const firstAdx = period * 2 - 1;
  let sumDx = 0;
  for (let i = period; i <= firstAdx; i++) sumDx += dx[i];
  outAdx[firstAdx] = sumDx / period;
  for (let i = firstAdx + 1; i < n; i++) {
    outAdx[i] = (outAdx[i - 1] * (period - 1) + dx[i]) / period;
  }
  return { adx: outAdx, plusDi, minusDi };
}

export function bollinger(
  values: number[],
  period: number,
  mult: number,
): { mid: number[]; upper: number[]; lower: number[] } {
  const mid = sma(values, period);
  const upper = fillNaN(values.length);
  const lower = fillNaN(values.length);
  for (let i = period - 1; i < values.length; i++) {
    if (!isNum(mid[i])) continue;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (values[j] - mid[i]) ** 2;
    const sd = Math.sqrt(variance / period);
    upper[i] = mid[i] + mult * sd;
    lower[i] = mid[i] - mult * sd;
  }
  return { mid, upper, lower };
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const line = values.map((_, i) =>
    isNum(fastEma[i]) && isNum(slowEma[i]) ? fastEma[i] - slowEma[i] : Number.NaN,
  );
  const signalLine = ema(line, signal);
  const hist = line.map((v, i) => (isNum(v) && isNum(signalLine[i]) ? v - signalLine[i] : Number.NaN));
  return { line, signal: signalLine, hist };
}

export function stochastic(candles: Candle[], period: number, smooth: number) {
  const n = candles.length;
  const k = fillNaN(n);
  for (let i = period - 1; i < n; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hh = Math.max(hh, candles[j].high);
      ll = Math.min(ll, candles[j].low);
    }
    k[i] = hh === ll ? 50 : (100 * (candles[i].close - ll)) / (hh - ll);
  }
  return { k, d: sma(k, smooth) };
}

/** 以 UTC 自然日锚定的 VWAP，适用于日内周期 */
export function vwap(candles: Candle[]): number[] {
  const out = fillNaN(candles.length);
  let day = -1;
  let pv = 0;
  let vol = 0;
  for (let i = 0; i < candles.length; i++) {
    const d = Math.floor(candles[i].time / 86_400_000);
    if (d !== day) {
      day = d;
      pv = 0;
      vol = 0;
    }
    const c = candles[i];
    const typical = (c.high + c.low + c.close) / 3;
    pv += typical * c.volume;
    vol += c.volume;
    out[i] = vol > 0 ? pv / vol : Number.NaN;
  }
  return out;
}

export function lastValue(values: number[]): number {
  for (let i = values.length - 1; i >= 0; i--) {
    if (isNum(values[i])) return values[i];
  }
  return Number.NaN;
}

export function lastIndex(values: number[]): number {
  for (let i = values.length - 1; i >= 0; i--) {
    if (isNum(values[i])) return i;
  }
  return -1;
}

export function valueAgo(values: number[], bars: number): number {
  const idx = lastIndex(values);
  if (idx < 0) return Number.NaN;
  const target = idx - bars;
  if (target < 0) return Number.NaN;
  return values[target];
}

export function percentileRank(values: number[], current: number, lookback = 100): number {
  const finite = values.filter((v) => isNum(v)).slice(-lookback);
  if (!finite.length || !isNum(current)) return 0.5;
  const below = finite.filter((v) => v <= current).length;
  return below / finite.length;
}

export interface SwingLevels {
  high: number;
  low: number;
  highIndex: number;
  lowIndex: number;
}

export function swingLevels(candles: Candle[], lookback = 40): SwingLevels {
  const start = Math.max(0, candles.length - lookback);
  let high = -Infinity;
  let low = Infinity;
  let highIndex = start;
  let lowIndex = start;
  for (let i = start; i < candles.length; i++) {
    if (candles[i].high > high) {
      high = candles[i].high;
      highIndex = i;
    }
    if (candles[i].low < low) {
      low = candles[i].low;
      lowIndex = i;
    }
  }
  return { high, low, highIndex, lowIndex };
}

export function buildSeries(candles: Candle[], profile: StrategyProfile): IndicatorSeries {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const maFn = profile.maType === 'EMA' ? ema : sma;
  const adxResult = adx(candles, profile.adx);
  const series: IndicatorSeries = {
    fastMa: maFn(closes, profile.fast),
    slowMa: maFn(closes, profile.slow),
    rsi: rsi(closes, profile.rsi),
    atr: atr(candles, profile.atr),
    adx: adxResult.adx,
    plusDi: adxResult.plusDi,
    minusDi: adxResult.minusDi,
    volumeMa: sma(volumes, 20),
  };
  if (profile.macd) series.macd = macd(closes, profile.macd[0], profile.macd[1], profile.macd[2]);
  if (profile.bb) series.bb = bollinger(closes, profile.bb[0], profile.bb[1]);
  if (profile.stoch) series.stoch = stochastic(candles, profile.stoch[0], profile.stoch[1]);
  if (profile.vwap) series.vwap = vwap(candles);
  return series;
}
