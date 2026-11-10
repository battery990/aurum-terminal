export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

export type PaneKind = 'rsi' | 'macd' | 'atr' | 'volume';

export type DataMode = 'live' | 'cached' | 'demo';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Ticker {
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  volume: number;
  quoteVolume: number;
  ts: number;
}

export interface StrategyProfile {
  tf: Timeframe;
  style: string;
  headline: string;
  maType: 'EMA' | 'SMA';
  fast: number;
  slow: number;
  vwap: boolean;
  rsi: number;
  macd?: [number, number, number];
  bb?: [number, number];
  atr: number;
  adx: number;
  stoch?: [number, number];
  pane: PaneKind;
  horizon: string;
  rationale: string;
  rules: string[];
}

export interface IndicatorSeries {
  fastMa: number[];
  slowMa: number[];
  rsi: number[];
  macd?: { line: number[]; signal: number[]; hist: number[] };
  bb?: { mid: number[]; upper: number[]; lower: number[] };
  atr: number[];
  adx: number[];
  plusDi: number[];
  minusDi: number[];
  stoch?: { k: number[]; d: number[] };
  vwap?: number[];
  volumeMa: number[];
}

export type RegimeKind = 'trend-up' | 'trend-down' | 'range' | 'volatile' | 'transition';
export type Action = 'long' | 'short' | 'wait';
export type Tone = 'bull' | 'bear' | 'neutral';

export interface Reason {
  tone: Tone;
  text: string;
}

export interface TradePlan {
  action: Action;
  label: string;
  note: string;
  confidence: number;
  entry: number | null;
  entryNote: string;
  stop: number | null;
  targets: number[];
  rr: number | null;
  riskPct: number | null;
  horizon: string;
  reasons: Reason[];
  invalidation: string;
  trigger: string;
}

export interface Regime {
  kind: RegimeKind;
  label: string;
  tone: Tone;
  description: string;
}

export interface Metrics {
  adx: number;
  atrPct: number;
  atrPercentile: number;
  rsi: number;
  volRatio: number;
  macdHist: number;
  bbPosition: number;
  vwapDist: number;
}

export interface Analysis {
  profile: StrategyProfile;
  series: IndicatorSeries;
  regime: Regime;
  plan: TradePlan;
  metrics: Metrics;
  bias: number;
}

export interface MtfBias {
  tf: Timeframe;
  bias: number;
  action: Action;
  regime: RegimeKind;
  ready: boolean;
}

export interface Prefs {
  tf: Timeframe;
  refreshMs: number;
  showBands: boolean;
  showPlan: boolean;
}
