import type { StrategyProfile, Timeframe } from '../types';

export const TF_ORDER: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

export const TF_META: Record<
  Timeframe,
  { binance: string; ms: number; label: string; name: string; tick: string }
> = {
  '1m': { binance: '1m', ms: 60_000, label: '1分', name: '1 分钟', tick: '超短线' },
  '5m': { binance: '5m', ms: 300_000, label: '5分', name: '5 分钟', tick: '短线' },
  '15m': { binance: '15m', ms: 900_000, label: '15分', name: '15 分钟', tick: '日内' },
  '1h': { binance: '1h', ms: 3_600_000, label: '1时', name: '1 小时', tick: '日内趋势' },
  '4h': { binance: '4h', ms: 14_400_000, label: '4时', name: '4 小时', tick: '波段' },
  '1d': { binance: '1d', ms: 86_400_000, label: '日线', name: '日线', tick: '趋势' },
  '1w': { binance: '1w', ms: 604_800_000, label: '周线', name: '周线', tick: '配置' },
};

/**
 * 每个周期只启用「该周期最适宜」的指标组合，并给出参数优化理由。
 * 原则：
 *  - 超短周期压缩均线长度、缩短 RSI 以降低滞后，用 VWAP 做日内公允价锚；
 *  - 日内周期以 EMA + MACD 捕捉动能，RSI 过滤过热；
 *  - 高周期使用 SMA 50/200 作为机构趋势基准，ADX 判定趋势是否成立。
 */
export const PROFILES: Record<Timeframe, StrategyProfile> = {
  '1m': {
    tf: '1m',
    style: '剥头皮',
    headline: '动量 + 日内公允价',
    maType: 'EMA',
    fast: 9,
    slow: 21,
    vwap: true,
    rsi: 7,
    bb: [20, 2],
    atr: 14,
    adx: 14,
    stoch: [9, 3],
    pane: 'rsi',
    horizon: '5 – 30 分钟',
    rationale:
      '1 分钟噪声极高，慢速均线会严重滞后。采用 EMA 9/21 保留灵敏度，叠加日内 VWAP 作为机构成本锚；RSI 缩短到 7 以提前捕捉衰竭，布林带 20/2 用于识别过度延伸。',
    rules: [
      '价格在 VWAP 上方且 EMA 9 > EMA 21，只做多不做空',
      'RSI(7) > 78 或触及布林上轨，禁止追多',
      '止损距离不得小于 1.2 × ATR(14)，避免被噪声扫损',
    ],
  },
  '5m': {
    tf: '5m',
    style: '短线',
    headline: '动能确认 + 量价配合',
    maType: 'EMA',
    fast: 12,
    slow: 26,
    vwap: true,
    rsi: 9,
    macd: [12, 26, 9],
    bb: [20, 2],
    atr: 14,
    adx: 14,
    pane: 'macd',
    horizon: '15 – 90 分钟',
    rationale:
      '5 分钟是日内动能的起点。EMA 12/26 与 MACD 12/26/9 同源，交叉信号一致性更高；RSI 9 比标准 14 更早反映拐点，仍保留 VWAP 过滤假突破。',
    rules: [
      'MACD 柱状体连续两根同向放大，才确认动能',
      '价格跌破 VWAP 后反抽不过，视为空头结构',
      '量能低于 20 周期均量 70% 时，信号降级',
    ],
  },
  '15m': {
    tf: '15m',
    style: '日内',
    headline: '趋势 + 动能共振',
    maType: 'EMA',
    fast: 20,
    slow: 50,
    vwap: false,
    rsi: 14,
    macd: [12, 26, 9],
    bb: [20, 2],
    atr: 14,
    adx: 14,
    stoch: [14, 3],
    pane: 'macd',
    horizon: '1 – 6 小时',
    rationale:
      '15 分钟适合日内波段。EMA 20/50 构成短中期结构，MACD 标准参数 12/26/9 稳定性最佳；引入随机指标 14/3 识别回调结束，避免在趋势中过早逆势。',
    rules: [
      'EMA 20 上穿 EMA 50 且价格站上两者，趋势转多',
      'MACD 顶背离 + RSI > 70，减仓而非追多',
      'ADX < 18 时按区间震荡处理，不追突破',
    ],
  },
  '1h': {
    tf: '1h',
    style: '日内趋势',
    headline: '机构均线 + 动能过滤',
    maType: 'EMA',
    fast: 50,
    slow: 200,
    vwap: false,
    rsi: 14,
    macd: [12, 26, 9],
    atr: 14,
    adx: 14,
    stoch: [14, 3],
    pane: 'rsi',
    horizon: '4 – 24 小时',
    rationale:
      '1 小时级别资金参与度最高。EMA 50/200 是日内趋势的机构参考，金叉/死叉需结合 ADX 确认；RSI 14 作为标准超买超卖过滤器，随机指标用于捕捉回调末端。',
    rules: [
      'EMA 50 与 EMA 200 的相对位置决定日内主方向',
      'ADX(14) ≥ 25 才允许顺势加仓',
      'RSI 与价格背离时，优先相信结构而非指标',
    ],
  },
  '4h': {
    tf: '4h',
    style: '波段',
    headline: '趋势基准 + 动量背离',
    maType: 'SMA',
    fast: 50,
    slow: 200,
    vwap: false,
    rsi: 14,
    macd: [12, 26, 9],
    atr: 14,
    adx: 14,
    pane: 'macd',
    horizon: '2 – 7 天',
    rationale:
      '4 小时用于波段定位。SMA 50/200 比 EMA 更平滑，能过滤日内噪声；MACD 12/26/9 识别波段动能衰竭，ADX 用于区分趋势与宽幅震荡。',
    rules: [
      '价格在 SMA 200 上方视为多头市场，只做多或观望',
      'MACD 柱状体与价格背离，警惕波段反转',
      'ATR 分位 > 85% 时，止损放宽、仓位减半',
    ],
  },
  '1d': {
    tf: '1d',
    style: '趋势',
    headline: '长期趋势 + 波动率',
    maType: 'SMA',
    fast: 50,
    slow: 200,
    vwap: false,
    rsi: 14,
    bb: [20, 2],
    atr: 14,
    adx: 14,
    pane: 'rsi',
    horizon: '1 – 4 周',
    rationale:
      '日线决定中期方向。SMA 50/200 是黄金市场最广泛跟踪的长期均线；RSI 14 识别超买超卖，布林带衡量价格相对波动区间，ATR 用于校准止损与目标。',
    rules: [
      'SMA 50 > SMA 200 且价格在上方，定义为多头趋势',
      'RSI > 75 时减少追多，等待回踩均线',
      '日线收盘跌破 SMA 50，趋势策略降级为观望',
    ],
  },
  '1w': {
    tf: '1w',
    style: '配置',
    headline: '周期配置 + 趋势强度',
    maType: 'SMA',
    fast: 20,
    slow: 50,
    vwap: false,
    rsi: 14,
    atr: 14,
    adx: 14,
    pane: 'atr',
    horizon: '1 – 3 个月',
    rationale:
      '周线用于战略配置。SMA 20/50 反映中期成本与趋势，ADX 判断大级别趋势是否仍然有效；ATR 以周为单位衡量真实波动，避免用日内参数管理长线仓位。',
    rules: [
      'SMA 20 上穿 SMA 50 视为中期配置窗口',
      'ADX < 20 时，长期趋势可能进入休整',
      '周线止损参考 2 × ATR，仓位按 0.5% 风险计',
    ],
  },
};

export const OVERLAY_COLORS = {
  fast: '#E7B84B',
  slow: '#7C93B8',
  vwap: '#5FD0C4',
  band: 'rgba(110, 168, 255, 0.55)',
  bandFill: 'rgba(110, 168, 255, 0.055)',
  entry: '#E7B84B',
  stop: '#FF5D6C',
  target: '#2FD08A',
};
