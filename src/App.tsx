import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import type { PaneKind, Prefs, Timeframe } from './types';
import { PROFILES, TF_META } from './lib/timeframes';
import { analyze } from './lib/signal';
import { loadPrefs, savePrefs } from './lib/storage';
import { clearSnapshots } from './lib/api';
import { fmtClock } from './lib/format';
import { hapticMedium } from './lib/native';
import { useMarket } from './hooks/useMarket';
import { useMtf } from './hooks/useMtf';
import Header from './components/Header';
import PriceHero from './components/PriceHero';
import TimeframeBar from './components/TimeframeBar';
import StrategyStrip from './components/StrategyStrip';
import CandleChart from './components/CandleChart';
import ChartLegend from './components/ChartLegend';
import IndicatorPanel from './components/IndicatorPanel';
import MtfStrip from './components/MtfStrip';
import MarketState from './components/MarketState';
import Recommendation from './components/Recommendation';
import SettingsSheet from './components/SettingsSheet';
import StrategySheet from './components/StrategySheet';
import Sheet from './components/Sheet';
import { IconAlert, IconExpand, IconLayers, IconRefresh } from './components/icons';

type SheetKind = 'settings' | 'strategy' | 'chart' | null;

export default function App() {
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [pane, setPane] = useState<PaneKind>(() => PROFILES[loadPrefs().tf].pane);
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const profile = PROFILES[prefs.tf];
  const market = useMarket(prefs.tf, prefs.refreshMs);
  const mtf = useMtf();

  const analysis = useMemo(
    () => (market.candles.length ? analyze(market.candles, profile) : null),
    [market.candles, profile],
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }, []);

  const changeTf = useCallback(
    (tf: Timeframe) => {
      setPrefs((prev) => ({ ...prev, tf }));
      hapticMedium();
    },
    [],
  );

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    setPane(PROFILES[prefs.tf].pane);
    setRange(null);
  }, [prefs.tf]);

  useEffect(() => {
    if (market.error) showToast(market.error);
  }, [market.error, showToast]);

  useEffect(() => {
    const boot = document.getElementById('boot');
    if (!boot) return;
    const timer = window.setTimeout(() => {
      boot.style.opacity = '0';
      window.setTimeout(() => boot.remove(), 400);
    }, 220);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void SplashScreen.hide({ fadeOutDuration: 220 }).catch(() => undefined);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const openStrategy = () => setSheet('strategy');
  const openSettings = () => setSheet('settings');

  return (
    <div className="app">
      <div className="app__glow" aria-hidden="true" />

      <Header
        mode={market.mode}
        refreshAt={market.refreshAt}
        refreshMs={prefs.refreshMs}
        refreshing={market.refreshing}
        onRefresh={market.refresh}
        onSettings={openSettings}
      />

      <main className="content">
        <PriceHero ticker={market.ticker} mode={market.mode} loading={market.loading} lastUpdate={market.lastUpdate} />

        <section className="tf-section">
          <TimeframeBar value={prefs.tf} onChange={changeTf} />
          <StrategyStrip profile={profile} onInfo={openStrategy} />
        </section>

        {market.mode !== 'live' && (
          <div className={`notice is-${market.mode}`}>
            <IconAlert size={14} />
            <span>
              {market.mode === 'demo'
                ? '实时行情暂不可达，正在展示演示数据'
                : '实时连接中断，正在展示本地缓存行情'}
            </span>
            <button type="button" onClick={market.refresh}>
              重试
            </button>
          </div>
        )}

        <section className="card chart-card">
          <div className="card__head">
            <div>
              <h2 className="card__title">K 线图</h2>
              <span className="card__sub">
                XAU/USD · {TF_META[prefs.tf].name} · {market.candles.length || 0} 根
              </span>
            </div>
            <div className="chart-actions">
              <button
                type="button"
                className={`ghostbtn ${prefs.showBands ? 'is-on' : ''}`}
                onClick={() => updatePrefs({ showBands: !prefs.showBands })}
                aria-label={prefs.showBands ? '隐藏布林带' : '显示布林带'}
                aria-pressed={prefs.showBands}
              >
                <IconLayers size={16} />
              </button>
              <button
                type="button"
                className="ghostbtn"
                onClick={() => setSheet('chart')}
                aria-label="全屏查看图表"
              >
                <IconExpand size={16} />
              </button>
            </div>
          </div>
          <ChartLegend profile={profile} showBands={prefs.showBands} />
          <CandleChart
            candles={market.candles}
            analysis={analysis}
            tf={prefs.tf}
            showBands={prefs.showBands}
            showPlan={prefs.showPlan}
            height={306}
            loading={market.loading}
            onRangeChange={setRange}
          />
        </section>

        <IndicatorPanel
          analysis={analysis}
          candles={market.candles}
          pane={pane}
          onPaneChange={setPane}
          range={range}
        />

        <MtfStrip items={mtf} current={prefs.tf} onSelect={changeTf} />

        <MarketState analysis={analysis} />

        <Recommendation analysis={analysis} tf={prefs.tf} />

        <footer className="footer">
          <div className="footer__row">
            <span>PAXG/USDT · BINANCE</span>
            <span>更新 {market.lastUpdate ? fmtClock(market.lastUpdate) : '--:--:--'}</span>
          </div>
          <p>
            AURUM 黄金 CFD 分析终端 · 行情延迟约 3 秒
            <br />
            仅供研究，不构成投资建议
          </p>
        </footer>
      </main>

      <SettingsSheet
        open={sheet === 'settings'}
        prefs={prefs}
        onClose={() => setSheet(null)}
        onChange={updatePrefs}
        onClearCache={() => {
          clearSnapshots();
          showToast('本地行情缓存已清除');
        }}
      />

      <StrategySheet open={sheet === 'strategy'} profile={profile} onClose={() => setSheet(null)} />

      <Sheet
        open={sheet === 'chart'}
        title={`K 线图 · ${TF_META[prefs.tf].name}`}
        subtitle="双指缩放 · 拖动查看历史 · 双击复位"
        onClose={() => setSheet(null)}
      >
        <div className="fullchart">
          <TimeframeBar value={prefs.tf} onChange={changeTf} compact />
          <ChartLegend profile={profile} showBands={prefs.showBands} />
          <CandleChart
            candles={market.candles}
            analysis={analysis}
            tf={prefs.tf}
            showBands={prefs.showBands}
            showPlan={prefs.showPlan}
            height={430}
            loading={market.loading}
          />
          <div className="fullchart__foot">
            <span>
              <IconRefresh size={12} /> 报价 3 秒刷新
            </span>
            <span>K 线 {prefs.refreshMs / 1000} 秒刷新</span>
          </div>
        </div>
      </Sheet>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
