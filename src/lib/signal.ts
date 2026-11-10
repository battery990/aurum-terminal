import type {
  Action,
  Analysis,
  Candle,
  Metrics,
  Reason,
  Regime,
  StrategyProfile,
  Tone,
  TradePlan,
} from '../types';
import {
  buildSeries,
  isNum,
  lastValue,
  percentileRank,
  swingLevels,
  valueAgo,
} from './indicators';
import { clamp, fmtPrice, round } from './format';

function neutralPlan(profile: StrategyProfile): TradePlan {
  return {
    action: 'wait',
    label: '数据不足',
    note: '等待更多 K 线数据以完成指标预热。',
    confidence: 0,
    entry: null,
    entryNote: '--',
    stop: null,
    targets: [],
    rr: null,
    riskPct: null,
    horizon: profile.horizon,
    reasons: [],
    invalidation: '数据恢复后自动重新评估。',
    trigger: '等待行情数据接入。',
  };
}

function toneOf(value: number, bullThreshold = 0, bearThreshold = 0): Tone {
  if (value > bullThreshold) return 'bull';
  if (value < bearThreshold) return 'bear';
  return 'neutral';
}

export function analyze(candles: Candle[], profile: StrategyProfile): Analysis {
  if (candles.length < 40) {
    return {
      profile,
      series: buildSeries(candles, profile),
      regime: {
        kind: 'transition',
        label: '数据预热',
        tone: 'neutral',
        description: 'K 线数量不足，指标正在预热。',
      },
      plan: neutralPlan(profile),
      metrics: {
        adx: 0,
        atrPct: 0,
        atrPercentile: 0.5,
        rsi: 50,
        volRatio: 1,
        macdHist: 0,
        bbPosition: 0.5,
        vwapDist: 0,
      },
      bias: 0,
    };
  }

  const n = candles.length;
  const last = candles[n - 1];
  const close = last.close;
  const series = buildSeries(candles, profile);

  const fast = lastValue(series.fastMa);
  const slow = lastValue(series.slowMa);
  const slowAgo = valueAgo(series.slowMa, 8);
  const rawRsi = lastValue(series.rsi);
  const rawAdx = lastValue(series.adx);
  const plusDi = lastValue(series.plusDi);
  const minusDi = lastValue(series.minusDi);
  const rawAtr = lastValue(series.atr);
  const volumeMa = lastValue(series.volumeMa);
  const vwapVal = series.vwap ? lastValue(series.vwap) : Number.NaN;
  const macdLine = series.macd ? lastValue(series.macd.line) : Number.NaN;
  const macdSignal = series.macd ? lastValue(series.macd.signal) : Number.NaN;
  const rawHist = series.macd ? lastValue(series.macd.hist) : Number.NaN;
  const histPrev = series.macd ? valueAgo(series.macd.hist, 1) : Number.NaN;
  const macdLinePrev = series.macd ? valueAgo(series.macd.line, 1) : Number.NaN;
  const macdSignalPrev = series.macd ? valueAgo(series.macd.signal, 1) : Number.NaN;
  const bbUpper = series.bb ? lastValue(series.bb.upper) : Number.NaN;
  const bbLower = series.bb ? lastValue(series.bb.lower) : Number.NaN;
  const bbMid = series.bb ? lastValue(series.bb.mid) : Number.NaN;
  const stochK = series.stoch ? lastValue(series.stoch.k) : Number.NaN;
  const stochD = series.stoch ? lastValue(series.stoch.d) : Number.NaN;

  const atrVal = isNum(rawAtr) && rawAtr > 0 ? rawAtr : close * 0.002;
  const rsiVal = isNum(rawRsi) ? rawRsi : 50;
  const adxVal = isNum(rawAdx) ? rawAdx : 0;
  const volRatio = isNum(volumeMa) && volumeMa > 0 ? last.volume / volumeMa : 1;
  const hist = isNum(rawHist) ? rawHist : 0;
  const atrPct = (atrVal / close) * 100;
  const atrPctSeries = series.atr.map((v, i) =>
    isNum(v) && candles[i].close > 0 ? (v / candles[i].close) * 100 : Number.NaN,
  );
  const atrPercentile = percentileRank(atrPctSeries, atrPct, 100);
  const bbPosition =
    isNum(bbUpper) && isNum(bbLower) && bbUpper > bbLower
      ? clamp((close - bbLower) / (bbUpper - bbLower), 0, 1)
      : 0.5;
  const vwapDist = isNum(vwapVal) ? (close - vwapVal) / atrVal : 0;
  const slope = isNum(slowAgo) && slowAgo !== 0 ? ((slow - slowAgo) / slowAgo) * 100 : 0;

  /* ----------------------------- 趋势评分 ----------------------------- */
  let trend = 0;
  if (isNum(fast) && isNum(slow)) trend += fast > slow ? 0.32 : -0.32;
  if (isNum(slow)) trend += close > slow ? 0.16 : -0.16;
  trend += clamp(slope / 0.25, -1, 1) * 0.14;
  if (isNum(plusDi) && isNum(minusDi)) trend += (plusDi > minusDi ? 1 : -1) * 0.16;
  if (isNum(vwapVal)) trend += clamp(vwapDist / 1.2, -1, 1) * 0.22;
  trend = clamp(trend, -1, 1);

  /* ----------------------------- 动能评分 ----------------------------- */
  let momentum = 0;
  if (isNum(rawHist)) {
    const rising = isNum(histPrev) ? hist >= histPrev : hist > 0;
    if (hist >= 0) momentum += rising ? 0.42 : 0.16;
    else momentum += rising ? -0.16 : -0.42;
  }
  if (rsiVal >= 55) momentum += 0.22;
  else if (rsiVal <= 45) momentum -= 0.22;
  if (rsiVal >= 74) momentum -= 0.28;
  if (rsiVal <= 26) momentum += 0.28;
  if (isNum(stochK) && isNum(stochD)) {
    if (stochK > stochD && stochK < 82) momentum += 0.08;
    if (stochK < stochD && stochK > 18) momentum -= 0.08;
  }
  if (isNum(macdLine) && isNum(macdSignal) && isNum(macdLinePrev) && isNum(macdSignalPrev)) {
    const cross = macdLine - macdSignal;
    const prevCross = macdLinePrev - macdSignalPrev;
    if (cross > 0 && prevCross <= 0) momentum += 0.26;
    if (cross < 0 && prevCross >= 0) momentum -= 0.26;
  }
  momentum = clamp(momentum, -1, 1);

  let bias = clamp(0.64 * trend + 0.36 * momentum, -1, 1);
  if (isNum(bbUpper) && close > bbUpper && rsiVal > 70) bias -= 0.1;
  if (isNum(bbLower) && close < bbLower && rsiVal < 30) bias += 0.1;
  if (volRatio < 0.7) bias *= 0.82;
  bias = clamp(bias, -1, 1);

  /* ----------------------------- 市场状态 ----------------------------- */
  let kind: Regime['kind'];
  if (adxVal >= 25 && isNum(plusDi) && isNum(minusDi)) {
    kind = plusDi >= minusDi ? 'trend-up' : 'trend-down';
  } else if (adxVal < 18) {
    kind = 'range';
  } else {
    kind = 'transition';
  }
  if (atrPercentile > 0.86 && adxVal < 28) kind = 'volatile';

  const stretch = isNum(slow) ? (close - slow) / atrVal : 0;
  const nearLower = isNum(bbUpper) ? bbPosition <= 0.15 : stretch <= -1;
  const nearUpper = isNum(bbUpper) ? bbPosition >= 0.85 : stretch >= 1;

  const adxText = adxVal >= 25 ? '趋势成立' : adxVal < 18 ? '方向性不足' : '趋势过渡';
  const diText = isNum(plusDi) && isNum(minusDi) ? (plusDi > minusDi ? '+DI 占优' : '-DI 占优') : '';
  const volText =
    atrPercentile > 0.86
      ? '波动显著放大'
      : atrPercentile < 0.25
        ? '波动处于低位'
        : '波动处于常态区间';

  const regimeDescriptions: Record<Regime['kind'], string> = {
    'trend-up': `ADX(${profile.adx}) ${adxVal.toFixed(1)} 显示趋势成立，${diText}。价格运行于 ${profile.maType}${profile.slow} 上方，回踩 ${profile.maType}${profile.fast} 附近通常获得支撑。${volText}，处于近 100 根的 ${Math.round(atrPercentile * 100)}% 分位。`,
    'trend-down': `ADX(${profile.adx}) ${adxVal.toFixed(1)} 显示下行趋势成立，${diText}。价格位于 ${profile.maType}${profile.slow} 下方，反弹至 ${profile.maType}${profile.fast} 附近易遇抛压。${volText}，处于近 100 根的 ${Math.round(atrPercentile * 100)}% 分位。`,
    range: `ADX(${profile.adx}) ${adxVal.toFixed(1)} 低于 18，方向性不足。价格在均衡区间内反复，RSI ${rsiVal.toFixed(0)} 未给出极值信号，适合等待区间边缘高抛低吸，而非追突破。`,
    volatile: `ATR(${profile.atr}) 占价格 ${atrPct.toFixed(2)}%，处于近 100 根的 ${Math.round(atrPercentile * 100)}% 分位，波动显著放大。假突破与滑点风险上升，建议降低仓位并放宽止损。`,
    transition: `ADX(${profile.adx}) ${adxVal.toFixed(1)} 位于 18–25 过渡区，趋势尚未确立，${diText}。等待放量突破或均线方向一致后再提高仓位。`,
  };

  const regime: Regime = {
    kind,
    label:
      kind === 'trend-up'
        ? '多头趋势'
        : kind === 'trend-down'
          ? '空头趋势'
          : kind === 'range'
            ? '区间震荡'
            : kind === 'volatile'
              ? '高波动'
              : '趋势过渡',
    tone: kind === 'trend-up' ? 'bull' : kind === 'trend-down' ? 'bear' : 'neutral',
    description: regimeDescriptions[kind],
  };

  if (kind === 'range') {
    bias = clamp((0.5 - bbPosition) * 1.2 + ((50 - rsiVal) / 100) * 0.5, -0.8, 0.8);
  }

  /* ----------------------------- 交易决策 ----------------------------- */
  let action: Action = 'wait';
  if (kind === 'range') {
    if (rsiVal <= 34 && nearLower) action = 'long';
    else if (rsiVal >= 66 && nearUpper) action = 'short';
  } else {
    const threshold = kind === 'transition' ? 0.38 : 0.3;
    if (bias >= threshold) action = 'long';
    else if (bias <= -threshold) action = 'short';
    if (kind === 'volatile' && Math.abs(bias) < 0.5) action = 'wait';
  }

  const swing = swingLevels(candles, 40);
  const entryRef = isNum(fast) ? fast : close;
  const structureRef = isNum(bbMid) ? Math.max(entryRef, bbMid) : entryRef;

  let entry = close;
  let entryNote = '现价市价入场';
  let stop: number | null = null;
  let targets: number[] = [];
  let rr: number | null = null;
  let riskPct: number | null = null;

  if (action === 'long') {
    if (close - structureRef > 0.8 * atrVal) {
      entry = round(structureRef + 0.1 * atrVal, 2);
      entryNote = `回踩 ${profile.maType}${profile.fast} 挂单`;
    } else {
      entryNote = kind === 'range' ? '区间下沿分批' : '现价市价入场';
    }
    let s = Math.min(swing.low, entry - 1.25 * atrVal);
    s = Math.max(s, entry - 2.2 * atrVal);
    s = Math.min(s, entry - 0.7 * atrVal);
    stop = round(s, 2);
    const risk = entry - stop;
    let t1 = entry + 1.6 * risk;
    let t2 = entry + 2.6 * risk;
    if (kind === 'range' && isNum(bbMid) && isNum(bbUpper)) {
      t1 = Math.max(bbMid, entry + 0.8 * risk);
      t2 = Math.max(bbUpper, entry + 1.8 * risk);
    }
    targets = [round(t1, 2), round(t2, 2)];
    rr = round((targets[0] - entry) / risk, 1);
    riskPct = round((risk / entry) * 100, 2);
  } else if (action === 'short') {
    if (structureRef - close > 0.8 * atrVal) {
      entry = round(structureRef - 0.1 * atrVal, 2);
      entryNote = `反弹 ${profile.maType}${profile.fast} 挂单`;
    } else {
      entryNote = kind === 'range' ? '区间上沿分批' : '现价市价入场';
    }
    let s = Math.max(swing.high, entry + 1.25 * atrVal);
    s = Math.min(s, entry + 2.2 * atrVal);
    s = Math.max(s, entry + 0.7 * atrVal);
    stop = round(s, 2);
    const risk = stop - entry;
    let t1 = entry - 1.6 * risk;
    let t2 = entry - 2.6 * risk;
    if (kind === 'range' && isNum(bbMid) && isNum(bbLower)) {
      t1 = Math.min(bbMid, entry - 0.8 * risk);
      t2 = Math.min(bbLower, entry - 1.8 * risk);
    }
    targets = [round(t1, 2), round(t2, 2)];
    rr = round((entry - targets[0]) / risk, 1);
    riskPct = round((risk / entry) * 100, 2);
  }

  let confidence = 48 + Math.abs(bias) * 38;
  if (adxVal >= 25) confidence += 6;
  else if (adxVal < 18) confidence -= 3;
  if (volRatio >= 1.1) confidence += 3;
  else if (volRatio < 0.7) confidence -= 5;
  if (atrPercentile > 0.9) confidence -= 7;
  if (kind === 'range') confidence = Math.min(confidence, 74);
  if (action === 'wait') confidence = Math.min(confidence, 66);
  confidence = Math.round(clamp(confidence, 35, 92));

  /* ----------------------------- 理由链 ----------------------------- */
  const reasons: Reason[] = [];
  if (isNum(fast) && isNum(slow)) {
    const diff = fast - slow;
    reasons.push({
      tone: diff >= 0 ? 'bull' : 'bear',
      text: `${profile.maType}${profile.fast} ${diff >= 0 ? '高于' : '低于'} ${profile.maType}${profile.slow} ${fmtPrice(Math.abs(diff))} 美元，${diff >= 0 ? '短期结构偏多' : '短期结构偏空'}。`,
    });
  }
  reasons.push({
    tone: toneOf(slope, 0.02, -0.02),
    text: `慢线 8 根 K 线斜率 ${slope >= 0 ? '+' : ''}${slope.toFixed(2)}%，${slope > 0.02 ? '稳步上行' : slope < -0.02 ? '持续下行' : '走平，趋势动能有限'}。`,
  });
  if (series.macd && isNum(rawHist)) {
    const rising = isNum(histPrev) ? hist >= histPrev : hist > 0;
    reasons.push({
      tone: hist >= 0 ? 'bull' : 'bear',
      text: `MACD 柱 ${hist >= 0 ? '+' : ''}${hist.toFixed(2)}，较前一根${rising ? '放大' : '收窄'}，${hist >= 0 ? '多头' : '空头'}动能${rising ? '占优' : '减弱'}。`,
    });
  }
  if (isNum(vwapVal)) {
    reasons.push({
      tone: toneOf(close - vwapVal, 0, 0),
      text: `价格位于日内 VWAP ${fmtPrice(vwapVal)} 美元${close >= vwapVal ? '上方' : '下方'}（${vwapDist >= 0 ? '+' : ''}${vwapDist.toFixed(2)} ATR），${close >= vwapVal ? '买方成本区之上' : '卖方成本区之下'}。`,
    });
  }
  reasons.push({
    tone: rsiVal >= 55 ? 'bull' : rsiVal <= 45 ? 'bear' : 'neutral',
    text: `RSI(${profile.rsi}) = ${rsiVal.toFixed(1)}，${rsiVal >= 70 ? '进入超买区，追多需谨慎' : rsiVal >= 55 ? '处于强势区但未超买' : rsiVal > 45 ? '处于中性区间' : rsiVal > 30 ? '处于弱势区' : '进入超卖区，追空需谨慎'}。`,
  });
  reasons.push({
    tone: adxVal >= 25 ? (plusDi > minusDi ? 'bull' : 'bear') : 'neutral',
    text: `ADX(${profile.adx}) = ${adxVal.toFixed(1)}（${adxText}），${isNum(plusDi) && isNum(minusDi) ? `+DI ${plusDi.toFixed(1)} / -DI ${minusDi.toFixed(1)}` : '方向指标尚未就绪'}。`,
  });
  reasons.push({
    tone: volRatio >= 1.1 ? (last.close >= last.open ? 'bull' : 'bear') : 'neutral',
    text: `当前成交量为 20 周期均量的 ${volRatio.toFixed(2)} 倍，${volRatio >= 1.2 ? '量能明显配合' : volRatio < 0.7 ? '量能不足，突破可信度下降' : '量能中性'}。`,
  });
  if (isNum(bbUpper) && isNum(bbLower)) {
    reasons.push({
      tone: bbPosition >= 0.85 ? 'bear' : bbPosition <= 0.15 ? 'bull' : 'neutral',
      text: `价格位于布林带 ${(bbPosition * 100).toFixed(0)}% 位置${bbPosition >= 0.85 ? '，逼近上轨，追多性价比下降' : bbPosition <= 0.15 ? '，逼近下轨，追空性价比下降' : '，处于通道中部'}。`,
    });
  }
  reasons.push({
    tone: 'neutral',
    text: `ATR(${profile.atr}) 占价格 ${atrPct.toFixed(2)}%，处于近 100 根 ${Math.round(atrPercentile * 100)}% 分位，${volText}。`,
  });

  const label =
    action === 'long'
      ? kind === 'range'
        ? '区间低吸'
        : '顺势做多'
      : action === 'short'
        ? kind === 'range'
          ? '区间高抛'
          : '顺势做空'
        : '暂不入场';

  const note =
    action === 'long'
      ? '趋势与动能形成同向共振，回踩支撑后分批入场，止损放在结构低点下方。'
      : action === 'short'
        ? '空头结构与动能一致，反弹承压后分批入场，止损放在结构高点上方。'
        : '多空信号尚未形成共振，等待区间边缘或突破确认，不追单。';

  const trigger =
    action !== 'wait'
      ? ''
      : kind === 'range'
        ? isNum(bbLower) && isNum(bbUpper)
          ? `RSI(${profile.rsi}) 回到 33 下方且价格触及布林下轨 ${fmtPrice(bbLower)}，或 RSI 升至 67 上方并触及上轨 ${fmtPrice(bbUpper)}。`
          : `RSI(${profile.rsi}) 回到 33 下方或升至 67 上方，并出现反转 K 线确认。`
        : kind === 'volatile'
          ? '等待 ATR 分位回落至 80% 以下，并出现带量的方向突破。'
          : bias >= 0
            ? `收盘站上 ${fmtPrice(Math.max(close, isNum(bbUpper) ? bbUpper : close + atrVal))}，且 ${profile.macd ? 'MACD 柱转正' : `${profile.maType} 快线上穿慢线`}。`
            : `收盘跌破 ${fmtPrice(Math.min(close, isNum(bbLower) ? bbLower : close - atrVal))}，且 ${profile.macd ? 'MACD 柱转负' : `${profile.maType} 快线下穿慢线`}。`;

  const invalidation =
    action === 'long' && stop != null
      ? `若收盘跌破 ${fmtPrice(stop)}（止损距离 ${riskPct?.toFixed(2)}%），多头逻辑失效，立即离场。`
      : action === 'short' && stop != null
        ? `若收盘站上 ${fmtPrice(stop)}（止损距离 ${riskPct?.toFixed(2)}%），空头逻辑失效，立即离场。`
        : '触发条件出现前保持空仓；若价格先突破关键结构，则重新评估。';

  const plan: TradePlan = {
    action,
    label,
    note,
    confidence,
    entry: action === 'wait' ? null : entry,
    entryNote,
    stop,
    targets,
    rr,
    riskPct,
    horizon: profile.horizon,
    reasons,
    invalidation,
    trigger,
  };

  const metrics: Metrics = {
    adx: adxVal,
    atrPct,
    atrPercentile,
    rsi: rsiVal,
    volRatio,
    macdHist: hist,
    bbPosition,
    vwapDist,
  };

  return { profile, series, regime, plan, metrics, bias };
}
