import { useEffect, useState } from 'react';
import type { MtfBias, Timeframe } from '../types';
import { TF_ORDER, PROFILES } from '../lib/timeframes';
import { fetchKlines } from '../lib/api';
import { analyze } from '../lib/signal';

export type MtfMap = Partial<Record<Timeframe, MtfBias>>;

export function useMtf(): MtfMap {
  const [items, setItems] = useState<MtfMap>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const results = await Promise.all(
        TF_ORDER.map(async (tf) => {
          try {
            const candles = await fetchKlines(tf, 180);
            if (candles.length < 60) return null;
            const a = analyze(candles, PROFILES[tf]);
            const item: MtfBias = {
              tf,
              bias: a.bias,
              action: a.plan.action,
              regime: a.regime.kind,
              ready: true,
            };
            return item;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      const next: MtfMap = {};
      for (const r of results) if (r) next[r.tf] = r;
      setItems(next);
    };

    void load();
    const id = window.setInterval(load, 120_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return items;
}
