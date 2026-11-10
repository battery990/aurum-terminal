import type { StrategyProfile } from '../types';
import { TF_META } from '../lib/timeframes';
import Sheet from './Sheet';
import { IconClock, IconSpark } from './icons';

interface Props {
  open: boolean;
  profile: StrategyProfile;
  onClose: () => void;
}

export default function StrategySheet({ open, profile, onClose }: Props) {
  const rows: Array<{ name: string; params: string; role: string }> = [
    {
      name: `${profile.maType} 均线`,
      params: `${profile.fast} / ${profile.slow}`,
      role: '趋势结构与动态支撑',
    },
  ];
  if (profile.vwap) rows.push({ name: 'VWAP', params: 'UTC 日内锚定', role: '机构公允价过滤' });
  rows.push({ name: 'RSI', params: `${profile.rsi}`, role: '动量强弱与超买超卖' });
  if (profile.macd) rows.push({ name: 'MACD', params: profile.macd.join(' / '), role: '动能确认与背离' });
  if (profile.bb) rows.push({ name: '布林带', params: `${profile.bb[0]} / ${profile.bb[1]}σ`, role: '波动区间与延伸' });
  rows.push({ name: 'ATR', params: `${profile.atr}`, role: '止损距离与仓位校准' });
  rows.push({ name: 'ADX', params: `${profile.adx}`, role: '趋势强度判定' });
  if (profile.stoch) rows.push({ name: '随机指标', params: `${profile.stoch[0]} / ${profile.stoch[1]}`, role: '回调结束识别' });

  return (
    <Sheet
      open={open}
      title={`${TF_META[profile.tf].name} · ${profile.style}参数组`}
      subtitle="切换周期时自动匹配并应用，无需手动调参"
      onClose={onClose}
    >
      <div className="strategy-sheet">
        <div className="strategy-sheet__hero">
          <span className="auto-pill">
            <IconSpark size={11} />
            自动匹配
          </span>
          <h3>{profile.headline}</h3>
          <p>{profile.rationale}</p>
          <div className="strategy-sheet__meta">
            <span>
              <IconClock size={12} /> 建议持有 {profile.horizon}
            </span>
            <span>{TF_META[profile.tf].name} K 线</span>
          </div>
        </div>

        <h4 className="section-label">指标与优化参数</h4>
        <div className="ind-table">
          <div className="ind-table__head">
            <span>指标</span>
            <span>参数</span>
            <span>作用</span>
          </div>
          {rows.map((r) => (
            <div className="ind-table__row" key={r.name}>
              <b>{r.name}</b>
              <code>{r.params}</code>
              <span>{r.role}</span>
            </div>
          ))}
        </div>

        <h4 className="section-label">信号规则</h4>
        <ol className="rules">
          {profile.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>

        <div className="strategy-sheet__foot">
          <p>
            参数经过该周期的流动性与噪声特征校准。短周期侧重灵敏度，长周期侧重稳定性；ADX 决定是否允许趋势跟随，ATR
            决定止损宽度。
          </p>
        </div>
      </div>
    </Sheet>
  );
}
