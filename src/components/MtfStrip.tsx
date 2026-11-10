import type { Timeframe } from '../types';
import type { MtfMap } from '../hooks/useMtf';
import { TF_META, TF_ORDER } from '../lib/timeframes';
import { clamp } from '../lib/format';
import { hapticLight } from '../lib/native';

interface Props {
  items: MtfMap;
  current: Timeframe;
  onSelect: (tf: Timeframe) => void;
}

const WEIGHTS: Record<Timeframe, number> = {
  '1m': 0.06,
  '5m': 0.1,
  '15m': 0.15,
  '1h': 0.25,
  '4h': 0.2,
  '1d': 0.14,
  '1w': 0.1,
};

function Arrow({ bias }: { bias: number | undefined }) {
  if (bias == null) return <span className="mtf__arrow is-flat">–</span>;
  if (bias > 0.12) return <span className="mtf__arrow is-up">↑</span>;
  if (bias < -0.12) return <span className="mtf__arrow is-down">↓</span>;
  return <span className="mtf__arrow is-flat">→</span>;
}

export default function MtfStrip({ items, current, onSelect }: Props) {
  let weighted = 0;
  let totalWeight = 0;
  let alignedWeight = 0;
  let ready = 0;

  for (const tf of TF_ORDER) {
    const item = items[tf];
    if (!item) continue;
    ready++;
    weighted += item.bias * WEIGHTS[tf];
    totalWeight += WEIGHTS[tf];
  }
  const composite = totalWeight > 0 ? weighted / totalWeight : 0;
  const dir = composite > 0.12 ? 'bull' : composite < -0.12 ? 'bear' : 'neutral';
  for (const tf of TF_ORDER) {
    const item = items[tf];
    if (!item) continue;
    const same = dir === 'neutral' ? Math.abs(item.bias) <= 0.12 : Math.sign(item.bias) === Math.sign(composite);
    if (same) alignedWeight += WEIGHTS[tf];
  }
  const resonance = totalWeight > 0 ? Math.round((alignedWeight / totalWeight) * 100) : 0;
  const strength = Math.round(clamp(Math.abs(composite) * 160, 0, 100));

  return (
    <section className="card mtf">
      <div className="mtf__head">
        <div>
          <h2 className="card__title">多周期共振</h2>
          <p className="card__sub">7 个周期方向偏好 · 点击切换</p>
        </div>
        <div className={`mtf__score is-${dir}`}>
          <b>{dir === 'neutral' ? '—' : `${resonance}%`}</b>
          <span>{dir === 'bull' ? '偏多共振' : dir === 'bear' ? '偏空共振' : '信号分化'}</span>
        </div>
      </div>

      <div className="mtf__row">
        {TF_ORDER.map((tf) => {
          const item = items[tf];
          const active = tf === current;
          return (
            <button
              key={tf}
              type="button"
              className={`mtf__item ${active ? 'is-active' : ''}`}
              onClick={() => {
                hapticLight();
                onSelect(tf);
              }}
              aria-label={`切换到 ${TF_META[tf].name}，${item ? (item.bias > 0.12 ? '偏多' : item.bias < -0.12 ? '偏空' : '中性') : '加载中'}`}
            >
              <span className="mtf__tf">{TF_META[tf].label}</span>
              <Arrow bias={item?.bias} />
            </button>
          );
        })}
      </div>

      <div className="mtf__bar">
        <i style={{ width: `${dir === 'neutral' ? 0 : strength}%` }} className={`is-${dir}`} />
      </div>
      <p className="mtf__hint">
        {ready < TF_ORDER.length
          ? `正在同步 ${ready}/${TF_ORDER.length} 个周期…`
          : dir === 'neutral'
            ? '各周期方向不一致，趋势策略胜率下降，优先等待共振。'
            : `短中长期${dir === 'bull' ? '多头' : '空头'}方向一致度 ${resonance}%，${resonance >= 65 ? '趋势延续概率较高' : '仍需动能确认'}。`}
      </p>
    </section>
  );
}
