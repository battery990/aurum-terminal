import { useCallback, useEffect, useRef, useState } from 'react';
import type { Candle, DataMode, Ticker, Timeframe } from '../types';
import { demoMarket, fetchKlines, fetchTicker, loadSnapshot, saveSnapshot } from '../lib/api';
import { TF_META } from '../lib/timeframes';

export interface MarketData {
  candles: Candle[];
  ticker: Ticker | null;
  mode: DataMode;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdate: number;
  refreshAt: number;
  refresh: () => void;
}

export function useMarket(tf: Timeframe, refreshMs: number): MarketData {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [mode, setMode] = useState<DataMode>('live');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [refreshAt, setRefreshAt] = useState(0);

  const tfRef = useRef(tf);
  const refreshMsRef = useRef(refreshMs);
  const candlesRef = useRef(candles);
  const modeRef = useRef(mode);
  const seqRef = useRef(0);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    tfRef.current = tf;
  }, [tf]);
  useEffect(() => {
    refreshMsRef.current = refreshMs;
    setRefreshAt(Date.now() + refreshMs);
  }, [refreshMs]);
  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const loadKlines = useCallback(async (showSpinner = false) => {
    const seq = ++seqRef.current;
    const reqTf = tfRef.current;
    lastFetchRef.current = Date.now();
    if (showSpinner) setRefreshing(true);
    try {
      const [nextCandles, nextTicker] = await Promise.all([fetchKlines(reqTf, 320), fetchTicker()]);
      if (seq !== seqRef.current || reqTf !== tfRef.current) return;
      if (!nextCandles.length) throw new Error('empty klines');
      setCandles(nextCandles);
      setTicker(nextTicker);
      setMode('live');
      setError(null);
      setLastUpdate(Date.now());
      saveSnapshot(reqTf, { candles: nextCandles, ticker: nextTicker, ts: Date.now() });
    } catch {
      if (seq !== seqRef.current || reqTf !== tfRef.current) return;
      if (!candlesRef.current.length) {
        const demo = demoMarket(reqTf);
        setCandles(demo.candles);
        setTicker(demo.ticker);
        setMode('demo');
        setError('实时行情暂不可达，当前展示演示数据');
        setLastUpdate(Date.now());
      } else {
        setError('行情刷新失败，已保留最近一次数据');
        setMode((m) => (m === 'demo' ? 'demo' : 'cached'));
      }
    } finally {
      if (seq === seqRef.current) {
        setLoading(false);
        setRefreshing(false);
        setRefreshAt(Date.now() + refreshMsRef.current);
      }
    }
  }, []);

  /* 切换周期：先渲染缓存，再拉取实时 */
  useEffect(() => {
    const cached = loadSnapshot(tf);
    setError(null);
    setRefreshing(false);
    if (cached) {
      setCandles(cached.candles);
      setTicker(cached.ticker);
      setMode('cached');
      setLastUpdate(cached.ts);
      setLoading(false);
    } else {
      setCandles([]);
      setTicker(null);
      setMode('live');
      setLoading(true);
    }
    setRefreshAt(Date.now() + refreshMsRef.current);
    void loadKlines(false);
  }, [tf, loadKlines]);

  /* 高频轻量报价：3 秒一次，合并进当前 K 线 */
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (document.hidden || modeRef.current === 'demo') return;
      try {
        const t = await fetchTicker();
        if (cancelled) return;
        setTicker(t);
        setLastUpdate(Date.now());
        setCandles((prev) => {
          if (!prev.length) return prev;
          const last = prev[prev.length - 1];
          const interval = TF_META[tf].ms;
          if (t.ts >= last.time + interval) return prev;
          const close = t.price;
          if (!Number.isFinite(close) || close <= 0) return prev;
          const updated: Candle = {
            ...last,
            close,
            high: Math.max(last.high, close),
            low: Math.min(last.low, close),
          };
          return [...prev.slice(0, -1), updated];
        });
        const last = candlesRef.current[candlesRef.current.length - 1];
        if (
          last &&
          t.ts >= last.time + TF_META[tf].ms &&
          Date.now() - lastFetchRef.current > 6000
        ) {
          void loadKlines(false);
        }
      } catch {
        /* 单次报价失败不打断界面，等待下一次轮询 */
      }
    };
    void tick();
    const id = window.setInterval(tick, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [tf, loadKlines]);

  /* 周期刷新 K 线 */
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden) void loadKlines(false);
    }, refreshMs);
    return () => window.clearInterval(id);
  }, [refreshMs, loadKlines]);

  /* 回到前台立即刷新 */
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) void loadKlines(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadKlines]);

  const refresh = useCallback(() => {
    void loadKlines(true);
  }, [loadKlines]);

  return {
    candles,
    ticker,
    mode,
    loading,
    refreshing,
    error,
    lastUpdate,
    refreshAt,
    refresh,
  };
}
