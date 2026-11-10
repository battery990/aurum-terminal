import type { Timeframe } from '../types';
import { TF_META, TF_ORDER } from '../lib/timeframes';
import { hapticLight } from '../lib/native';

interface Props {
  value: Timeframe;
  onChange: (tf: Timeframe) => void;
  compact?: boolean;
}

export default function TimeframeBar({ value, onChange, compact = false }: Props) {
  return (
    <div className={`tfbar ${compact ? 'tfbar--compact' : ''}`} role="tablist" aria-label="选择 K 线周期">
      {TF_ORDER.map((tf) => {
        const active = tf === value;
        return (
          <button
            key={tf}
            type="button"
            role="tab"
            aria-selected={active}
            className={`tfbar__item ${active ? 'is-active' : ''}`}
            onClick={() => {
              if (active) return;
              hapticLight();
              onChange(tf);
            }}
          >
            {TF_META[tf].label}
          </button>
        );
      })}
    </div>
  );
}
