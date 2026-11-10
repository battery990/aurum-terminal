import type { DataMode } from '../types';
import { useNow } from '../hooks/useNow';
import { clamp } from '../lib/format';
import Logo from './Logo';
import { IconRefresh, IconSliders } from './icons';

interface Props {
  mode: DataMode;
  refreshAt: number;
  refreshMs: number;
  refreshing: boolean;
  onRefresh: () => void;
  onSettings: () => void;
}

const MODE_META: Record<DataMode, { label: string; className: string }> = {
  live: { label: 'LIVE', className: 'is-live' },
  cached: { label: '缓存', className: 'is-cached' },
  demo: { label: '演示', className: 'is-demo' },
};

export default function Header({
  mode,
  refreshAt,
  refreshMs,
  refreshing,
  onRefresh,
  onSettings,
}: Props) {
  const now = useNow(1000);
  const remaining = clamp(refreshAt - now, 0, refreshMs);
  const fraction = refreshMs > 0 ? remaining / refreshMs : 0;
  const r = 16;
  const circumference = 2 * Math.PI * r;
  const meta = MODE_META[mode];

  return (
    <header className="appbar">
      <div className="brand">
        <Logo size={30} />
        <div className="brand__text">
          <span className="brand__name">AURUM</span>
          <span className="brand__sub">GOLD CFD TERMINAL</span>
        </div>
      </div>

      <div className="appbar__actions">
        <span className={`status ${meta.className}`}>
          <i />
          {meta.label}
        </span>
        <button
          type="button"
          className={`iconbtn refreshbtn ${refreshing ? 'is-spinning' : ''}`}
          onClick={onRefresh}
          aria-label="立即刷新行情"
        >
          <svg className="ring" viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r={r} className="ring__track" />
            <circle
              cx="18"
              cy="18"
              r={r}
              className="ring__bar"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - fraction)}
            />
          </svg>
          <IconRefresh size={15} />
        </button>
        <button type="button" className="iconbtn" onClick={onSettings} aria-label="打开设置">
          <IconSliders size={19} />
        </button>
      </div>
    </header>
  );
}
