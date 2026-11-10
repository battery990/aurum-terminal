import type { Prefs } from '../types';
import Sheet from './Sheet';
import { IconDatabase, IconRefresh, IconShield } from './icons';

interface Props {
  open: boolean;
  prefs: Prefs;
  onClose: () => void;
  onChange: (next: Partial<Prefs>) => void;
  onClearCache: () => void;
}

const REFRESH_OPTIONS = [
  { value: 5000, label: '5 秒' },
  { value: 15000, label: '15 秒' },
  { value: 30000, label: '30 秒' },
  { value: 60000, label: '60 秒' },
];

export default function SettingsSheet({ open, prefs, onClose, onChange, onClearCache }: Props) {
  return (
    <Sheet open={open} title="设置" subtitle="行情刷新、图表显示与数据来源" onClose={onClose}>
      <div className="settings">
        <section className="settings__group">
          <div className="settings__label">
            <IconRefresh size={15} />
            <span>K 线刷新频率</span>
            <em>报价仍为 3 秒实时更新</em>
          </div>
          <div className="segmented">
            {REFRESH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={prefs.refreshMs === opt.value ? 'is-active' : ''}
                onClick={() => onChange({ refreshMs: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <section className="settings__group">
          <div className="settings__label">
            <span>图表显示</span>
          </div>
          <div className="setting-row">
            <div>
              <b>布林带通道</b>
              <span>显示 20 周期、2 倍标准差的波动区间</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.showBands}
              className={`switch ${prefs.showBands ? 'is-on' : ''}`}
              onClick={() => onChange({ showBands: !prefs.showBands })}
            >
              <i />
            </button>
          </div>
          <div className="setting-row">
            <div>
              <b>交易计划线</b>
              <span>在图表上标注入场、止损与目标位</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.showPlan}
              className={`switch ${prefs.showPlan ? 'is-on' : ''}`}
              onClick={() => onChange({ showPlan: !prefs.showPlan })}
            >
              <i />
            </button>
          </div>
        </section>

        <section className="settings__group">
          <div className="settings__label">
            <IconDatabase size={15} />
            <span>数据来源</span>
          </div>
          <div className="source-card">
            <div className="source-card__row">
              <span>交易对</span>
              <b>PAXG / USDT</b>
            </div>
            <div className="source-card__row">
              <span>行情源</span>
              <b>Binance 公共行情</b>
            </div>
            <div className="source-card__row">
              <span>映射标的</span>
              <b>XAU / USD 现货参考</b>
            </div>
            <div className="source-card__row">
              <span>报价延迟</span>
              <b>约 3 秒</b>
            </div>
            <p className="source-card__note">
              PAXG 为 1:1 实物黄金锚定的代币，与 XAU/USD 走势高度同步，基差通常在 ±0.3% 内。行情仅用于研究，非交易所成交价。
            </p>
          </div>
          <button type="button" className="btn btn--ghost" onClick={onClearCache}>
            清除本地行情缓存
          </button>
        </section>

        <section className="settings__group">
          <div className="settings__label">
            <IconShield size={15} />
            <span>风险声明</span>
          </div>
          <p className="settings__text">
            AURUM 为行情分析工具，不提供交易执行、不代管资金。所有指标与建议均由公开行情计算得出，存在滞后与失效可能。CFD
            杠杆交易风险极高，请独立决策并控制仓位。
          </p>
        </section>

        <footer className="settings__footer">
          <span>AURUM · 金衡终端</span>
          <span>v1.0.0 (build 1)</span>
        </footer>
      </div>
    </Sheet>
  );
}
