import type { StrategyProfile } from '../types';
import { IconInfo, IconSpark } from './icons';

interface Props {
  profile: StrategyProfile;
  onInfo: () => void;
}

export function profileChips(profile: StrategyProfile): string[] {
  const chips = [`${profile.maType} ${profile.fast}/${profile.slow}`];
  if (profile.vwap) chips.push('VWAP');
  chips.push(`RSI ${profile.rsi}`);
  if (profile.macd) chips.push(`MACD ${profile.macd.join('/')}`);
  if (profile.bb) chips.push(`BB ${profile.bb.join(',')}`);
  chips.push(`ATR ${profile.atr}`);
  if (profile.adx) chips.push(`ADX ${profile.adx}`);
  return chips;
}

export default function StrategyStrip({ profile, onInfo }: Props) {
  const chips = profileChips(profile);
  return (
    <section className="strategy">
      <div className="strategy__head">
        <span className="auto-pill">
          <IconSpark size={11} />
          自动匹配
        </span>
        <span className="strategy__title">
          {profile.style}策略 · {profile.headline}
        </span>
        <button type="button" className="strategy__more" onClick={onInfo} aria-label="查看策略参数说明">
          <IconInfo size={16} />
        </button>
      </div>
      <div className="chips" aria-label="当前周期启用的技术指标">
        {chips.map((c) => (
          <span className="chip" key={c}>
            {c}
          </span>
        ))}
      </div>
    </section>
  );
}
