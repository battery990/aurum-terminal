import { useEffect, useRef, useState } from 'react';
import type { DataMode, Ticker } from '../types';
import { fmtClock, fmtCompact, fmtPct, fmtPrice, marketSession } from '../lib/format';

interface Props {
  ticker: Ticker | null;
  mode: DataMode;
  loading: boolean;
  lastUpdate: number;
}

export default function PriceHero({ ticker, mode, loading, lastUpdate }: Props) {
  const prev = useRef<number | null>(null);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const session = marketSession();

  useEffect(() => {
    if (!ticker) return;
    if (prev.current != null && ticker.price !== prev.current) {
      setFlash(ticker.price > prev.current ? 'up' : 'down');
      const id = window.setTimeout(() => setFlash(null), 720);
      prev.current = ticker.price;
      return () => window.clearTimeout(id);
    }
    prev.current = ticker.price;
  }, [ticker]);

  const up = (ticker?.changePct ?? 0) >= 0;
  const isDemo = mode === 'demo';

  return (
    <section className="hero">
      <div className="hero__meta">
        <span className="hero__symbol">
          XAU / USD
          <em>{isDemo ? '演示报价' : '现货黄金参考'}</em>
        </span>
        <span className={`session ${session.active ? '' : 'is-off'}`}>
          <i />
          {session.label}
          <span className="session__detail">{session.detail}</span>
        </span>
      </div>

      <div className="hero__main">
        <div className={`hero__price ${flash ? `flash-${flash}` : ''}`}>
          <span className="hero__currency">$</span>
          {loading && !ticker ? <span className="skeleton skeleton--price" /> : fmtPrice(ticker?.price)}
        </div>
        <div className={`hero__change ${up ? 'is-up' : 'is-down'}`}>
          <span className="hero__change-pct">{ticker ? fmtPct(ticker.changePct) : '--'}</span>
          <span className="hero__change-abs">
            {ticker ? `${ticker.change >= 0 ? '+' : ''}${fmtPrice(ticker.change)}` : '--'}
          </span>
        </div>
      </div>

      <div className="hero__stats">
        <div className="hero__stat">
          <span>24H 最高</span>
          <b>{fmtPrice(ticker?.high)}</b>
        </div>
        <div className="hero__stat">
          <span>24H 最低</span>
          <b>{fmtPrice(ticker?.low)}</b>
        </div>
        <div className="hero__stat">
          <span>24H 成交</span>
          <b>{ticker ? fmtCompact(ticker.volume) : '--'}</b>
        </div>
        <div className="hero__stat hero__stat--right">
          <span>最后更新</span>
          <b className="muted-value">{lastUpdate ? fmtClock(lastUpdate) : '--:--:--'}</b>
        </div>
      </div>
    </section>
  );
}
