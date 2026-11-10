import type { StrategyProfile } from '../types';
import { OVERLAY_COLORS } from '../lib/timeframes';

export default function ChartLegend({
  profile,
  showBands,
}: {
  profile: StrategyProfile;
  showBands: boolean;
}) {
  return (
    <div className="legend">
      <span>
        <i style={{ background: OVERLAY_COLORS.fast }} />
        {profile.maType} {profile.fast}
      </span>
      <span>
        <i style={{ background: OVERLAY_COLORS.slow }} />
        {profile.maType} {profile.slow}
      </span>
      {profile.vwap && (
        <span>
          <i style={{ background: OVERLAY_COLORS.vwap }} />
          VWAP
        </span>
      )}
      {showBands && profile.bb && (
        <span>
          <i style={{ background: 'rgba(110,168,255,0.7)' }} />
          BB {profile.bb[0]},{profile.bb[1]}
        </span>
      )}
    </div>
  );
}
