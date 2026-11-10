import type { Prefs } from '../types';

const KEY = 'aurum:prefs:v1';

export const DEFAULT_PREFS: Prefs = {
  tf: '15m',
  refreshMs: 15_000,
  showBands: true,
  showPlan: true,
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      tf: parsed.tf ?? DEFAULT_PREFS.tf,
      refreshMs: parsed.refreshMs ?? DEFAULT_PREFS.refreshMs,
      showBands: parsed.showBands ?? DEFAULT_PREFS.showBands,
      showPlan: parsed.showPlan ?? DEFAULT_PREFS.showPlan,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}
