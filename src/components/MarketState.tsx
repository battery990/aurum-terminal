import type { Analysis } from '../types';
import { clamp } from '../lib/format';
import { IconActivity } from './icons';

interface Props {
  analysis: Analysis | null;
}

function rsiZone(v: number): string {
  if (v >= 70) return '超买区';
  if (v >= 55) return '强势区';
  if (v > 45) return '中性区';
  if (v > 30) return '弱势区';
  return '超卖区';
}

export default function MarketState({ analysis }: Props) {
  if (!analysis) {
    return (
      <section className="card state">
        <div className="card__head">
          <h2 className="card__title">市场状态</h2>
        </div>
        <div className="skeleton skeleton--block" />
      </section>
    );
  }

  const { regime, metrics, profile } = analysis;
  const tone = regime.tone;
  const adxPct = clamp((metrics.adx / 50) * 100, 0, 100);
  const atrPct = clamp(metrics.atrPercentile * 100, 0, 100);
  const volPct = clamp((metrics.volRatio / 2) * 100, 0, 100);

  const metricsList = [
    {
      label: '趋势强度',
      value: metrics.adx.toFixed(1),
      pct: adxPct,
      tone: metrics.adx >= 25 ? 'bull' : metrics.adx < 18 ? 'neutral' : 'neutral',
      sub: `ADX(${profile.adx}) · ${metrics.adx >= 25 ? '强' : metrics.adx < 18 ? '弱' : '中'}`,
    },
    {
      label: '波动率',
      value: `${metrics.atrPct.toFixed(2)}%`,
      pct: atrPct,
      tone: metrics.atrPercentile > 0.85 ? 'bear' : 'neutral',
      sub: `ATR(${profile.atr}) · ${Math.round(atrPct)}% 分位`,
    },
    {
      label: '相对强弱',
      value: metrics.rsi.toFixed(1),
      pct: metrics.rsi,
      tone: metrics.rsi >= 55 ? 'bull' : metrics.rsi <= 45 ? 'bear' : 'neutral',
      sub: `RSI(${profile.rsi}) · ${rsiZone(metrics.rsi)}`,
    },
    {
      label: '量能水平',
      value: `${metrics.volRatio.toFixed(2)}×`,
      pct: volPct,
      tone: metrics.volRatio >= 1.2 ? 'bull' : metrics.volRatio < 0.7 ? 'bear' : 'neutral',
      sub: '相对 20 周期均量',
    },
  ];

  return (
    <section className="card state">
      <div className="card__head">
        <h2 className="card__title">市场状态</h2>
        <span className="live-tag">
          <i />
          实时评估
        </span>
      </div>

      <div className="state__top">
        <div className={`state__icon is-${tone}`}>
          <IconActivity size={19} />
        </div>
        <div className="state__names">
          <span className="state__eyebrow">当前时段结构</span>
          <div className="state__name">
            {regime.label}
            <span className={`state__badge is-${tone}`}>
              {regime.kind === 'trend-up' || regime.kind === 'trend-down'
                ? '趋势成立'
                : regime.kind === 'range'
                  ? '区间运行'
                  : regime.kind === 'volatile'
                    ? '风险升高'
                    : '等待选择'}
            </span>
          </div>
        </div>
      </div>

      <p className="state__desc">{regime.description}</p>

      <div className="state__grid">
        {metricsList.map((m) => (
          <div className="metric" key={m.label}>
            <div className="metric__top">
              <span>{m.label}</span>
              <b>{m.value}</b>
            </div>
            <div className="meter">
              <i className={`is-${m.tone}`} style={{ width: `${m.pct}%` }} />
            </div>
            <span className="metric__sub">{m.sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
