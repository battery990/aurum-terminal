import { useEffect, useState } from 'react';
import type { Analysis, Timeframe } from '../types';
import { TF_META } from '../lib/timeframes';
import { fmtPrice } from '../lib/format';
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconChevron,
  IconClock,
  IconMinus,
  IconShield,
  IconTarget,
} from './icons';

interface Props {
  analysis: Analysis | null;
  tf: Timeframe;
}

const C = 2 * Math.PI * 25;

function ConfidenceRing({ value, action }: { value: number; action: 'long' | 'short' | 'wait' }) {
  const cls = action === 'long' ? 'is-up' : action === 'short' ? 'is-down' : 'is-flat';
  return (
    <div className={`ring-chart ${cls}`}>
      <svg viewBox="0 0 60 60" aria-hidden="true">
        <circle cx="30" cy="30" r="25" className="ring-chart__track" />
        <circle
          cx="30"
          cy="30"
          r="25"
          className="ring-chart__value"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - value / 100)}
          transform="rotate(-90 30 30)"
        />
      </svg>
      <div className="ring-chart__label">
        <b>{value}</b>
        <span>{action === 'wait' ? '强度' : '置信度'}</span>
      </div>
    </div>
  );
}

export default function Recommendation({ analysis, tf }: Props) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [tf]);

  if (!analysis) {
    return (
      <section className="card rec">
        <div className="card__head">
          <h2 className="card__title">交易建议</h2>
        </div>
        <div className="skeleton skeleton--block" />
      </section>
    );
  }

  const { plan, profile, bias } = analysis;
  const action = plan.action;
  const dirIcon =
    action === 'long' ? (
      <IconArrowUpRight size={22} />
    ) : action === 'short' ? (
      <IconArrowDownRight size={22} />
    ) : (
      <IconMinus size={22} />
    );
  const biasLabel = bias > 0.12 ? '偏多' : bias < -0.12 ? '偏空' : '中性';
  const visibleReasons = expanded ? plan.reasons : plan.reasons.slice(0, 4);

  return (
    <section className={`card rec rec--${action}`}>
      <div className="card__head">
        <div>
          <h2 className="card__title">交易建议</h2>
          <span className="rec__model">AUTO ENGINE · {TF_META[tf].tick}</span>
        </div>
        <span className="rec__horizon">
          <IconClock size={12} />
          {plan.horizon}
        </span>
      </div>

      <div className="rec__hero">
        <div className={`rec__dir is-${action}`}>
          <span className="rec__diricon">{dirIcon}</span>
          <div className="rec__dirtext">
            <div className="rec__label">{plan.label}</div>
            <p className="rec__note">{plan.note}</p>
          </div>
        </div>
        <ConfidenceRing value={plan.confidence} action={action} />
      </div>

      <div className="rec__tags">
        <span className={`tag is-${bias > 0.12 ? 'bull' : bias < -0.12 ? 'bear' : 'neutral'}`}>
          方向偏好 {biasLabel}
        </span>
        <span className="tag">模型 {plan.confidence}%</span>
        <span className="tag">{profile.style}参数组</span>
      </div>

      {action !== 'wait' && plan.entry != null && plan.stop != null ? (
        <>
          <div className="ladder">
            <div className="ladder__item is-entry">
              <span>入场</span>
              <b>{fmtPrice(plan.entry)}</b>
              <em>{plan.entryNote}</em>
            </div>
            <div className="ladder__item is-stop">
              <span>止损</span>
              <b>{fmtPrice(plan.stop)}</b>
              <em>风险 {plan.riskPct?.toFixed(2)}%</em>
            </div>
            <div className="ladder__item is-tp">
              <span>目标 1</span>
              <b>{fmtPrice(plan.targets[0])}</b>
              <em>盈亏比 {plan.rr}:1</em>
            </div>
            <div className="ladder__item is-tp2">
              <span>目标 2</span>
              <b>{fmtPrice(plan.targets[1])}</b>
              <em>结构延伸</em>
            </div>
          </div>

          <div className="rec__metaRow">
            <span className="pill-soft">
              <IconTarget size={12} /> R:R {plan.rr}:1
            </span>
            <span className="pill-soft">
              <IconShield size={12} /> 单笔风险 ≤ 1%
            </span>
            <span className="pill-soft">按止损距离折算仓位</span>
          </div>
        </>
      ) : (
        <div className="trigger">
          <div className="trigger__head">
            <IconTarget size={14} /> 触发条件
          </div>
          <p>{plan.trigger}</p>
          <span className="trigger__hint">条件未满足前保持空仓，避免情绪化交易</span>
        </div>
      )}

      <div className="reasons">
        <div className="reasons__head">
          <span>决策依据</span>
          {plan.reasons.length > 4 && (
            <button type="button" className="linkbtn" onClick={() => setExpanded((v) => !v)}>
              {expanded ? '收起' : `展开 ${plan.reasons.length - 4} 条`}
              <IconChevron size={12} className={expanded ? 'is-rotated' : ''} />
            </button>
          )}
        </div>
        <ul>
          {visibleReasons.map((r, i) => (
            <li key={i} className={`is-${r.tone}`}>
              <i />
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rec__invalid">
        <IconShield size={14} />
        <span>{plan.invalidation}</span>
      </div>

      <p className="disclaimer">
        模型基于技术指标的概率评估，仅供研究参考，不构成投资建议。CFD 为杠杆产品，亏损可能超过本金。
      </p>
    </section>
  );
}
