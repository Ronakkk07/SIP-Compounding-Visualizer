import { useMemo, useState } from 'react';
import { computeStages, formatINR } from '../utils/financialCalc';
import { computePostTaxSeries, taxForYear } from '../utils/taxCalc';
import { useSettings } from '../context/UserSettingsContext';
import { useSimulate } from '../hooks/useSimulate';

const STAGE_NUMS = ['01', '02', '03', '04', '05'];

const STAGE_ACCENT = [
  { border: '#64748b', text: '#64748b', dim: 'rgba(100,116,139,0.08)' },
  { border: '#8b5cf6', text: '#8b5cf6', dim: 'rgba(139,92,246,0.08)' },
  { border: '#0d9e6e', text: '#0d9e6e', dim: 'rgba(13,158,110,0.08)' },
  { border: '#c07000', text: '#c07000', dim: 'rgba(192,112,0,0.08)'  },
  { border: '#4f46e5', text: '#4f46e5', dim: 'rgba(79,70,229,0.08)'  },
];

const STAGE_ACCENT_DARK = [
  { border: '#94a3b8', text: '#94a3b8', dim: 'rgba(148,163,184,0.07)' },
  { border: '#a78bfa', text: '#a78bfa', dim: 'rgba(167,139,250,0.08)' },
  { border: '#2dd4aa', text: '#2dd4aa', dim: 'rgba(45,212,170,0.08)'  },
  { border: '#f5ba40', text: '#f5ba40', dim: 'rgba(245,186,64,0.08)'  },
  { border: '#818cf8', text: '#818cf8', dim: 'rgba(129,140,248,0.08)' },
];

function RatioBar({ ratio, color }: { ratio: number; color: string }) {
  return (
    <div className="relative h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
      <div className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${Math.min(ratio * 100, 100)}%`, background: color, transition: 'width 0.4s ease' }} />
    </div>
  );
}

export default function CompoundingArc() {
  const settings = useSettings();
  const sim = useSimulate();
  const [showTax, setShowTax] = useState(false);

  const data = useMemo(() => sim({ endYear: 2042 }), [sim]);
  const stages = useMemo(() => computeStages(data), [data]);
  const taxSeries = useMemo(() => showTax ? computePostTaxSeries(data) : [], [data, showTax]);

  const isDark = document.documentElement.classList.contains('dark');
  const accents = isDark ? STAGE_ACCENT_DARK : STAGE_ACCENT;

  // Total projected LTCG tax drag by final stage year
  const lastStage = stages[stages.length - 1];
  const finalTax = lastStage ? taxForYear(taxSeries, lastStage.date.getFullYear()) : undefined;

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-1)' }}>
            Compounding Arc
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Five stages every long-term investor passes through — here's when you'll reach each one.
          </p>
        </div>
        <button
          onClick={() => setShowTax((v) => !v)}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all"
          style={{
            borderColor: showTax ? 'var(--gold)' : 'var(--border)',
            color: showTax ? 'var(--gold)' : 'var(--text-2)',
            background: showTax ? 'var(--gold-dim)' : 'transparent',
          }}
        >
          {showTax ? '✕ Hide LTCG' : '₹ LTCG Impact'}
        </button>
      </div>

      {/* LTCG info banner */}
      {showTax && (
        <div className="rounded-xl border px-4 py-3 flex items-start gap-3"
          style={{ background: 'var(--gold-dim)', borderColor: 'var(--gold)' }}>
          <div className="text-base leading-none mt-0.5">⚡</div>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>
              LTCG Tax — 12.5% on annual gains above ₹1.25L (Budget 2024)
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
              This shows an estimated tax drag if you were to realise gains each year.
              Long-term investors typically defer redemption — but this gives a conservative worst-case.
              {finalTax && finalTax.cumulativeTax > 0 && (
                <span> Estimated LTCG paid by {lastStage?.date.getFullYear()}: <strong>{formatINR(finalTax.cumulativeTax)}</strong> — reduces your withdrawable corpus by that amount.</span>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {stages.map((stage, i) => {
          const a = accents[i] ?? accents[0];
          const ratio = stage.annualReturns / Math.max(stage.annualSIP, 1);
          const taxPt = showTax ? taxForYear(taxSeries, stage.date.getFullYear()) : undefined;
          // cumulativeTax is always ≤ grossCorpus — avoids mid-year vs year-end mismatch
          const taxDrag = taxPt?.cumulativeTax ?? 0;

          return (
            <div
              key={stage.stage}
              className="rounded-2xl border overflow-hidden"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderLeft: `4px solid ${a.border}` }}
            >
              <div className="p-5 md:p-6">
                <div className="flex flex-col md:flex-row gap-5">
                  {/* Left: number + title + description */}
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="font-black text-4xl leading-none tabular-nums"
                        style={{ color: a.dim.replace('0.08', '0.25') }}>
                        {STAGE_NUMS[i]}
                      </span>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: a.text }}>
                          Stage {stage.stage}
                        </span>
                        <h2 className="font-bold text-lg leading-tight" style={{ color: 'var(--text-1)' }}>
                          {stage.label}
                        </h2>
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                      {stage.description}
                    </p>
                    <p className="text-xs mt-2 italic" style={{ color: 'var(--text-3)' }}>
                      {stage.psyche}
                    </p>

                    <div className="mt-4 space-y-1">
                      <div className="flex justify-between text-xs" style={{ color: 'var(--text-3)' }}>
                        <span>Returns vs SIP</span>
                        <span style={{ color: a.text, fontWeight: 600 }}>{ratio.toFixed(1)}×</span>
                      </div>
                      <RatioBar ratio={ratio} color={a.border} />
                    </div>
                  </div>

                  {/* Right: stats */}
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:w-44 shrink-0">
                    {[
                      { label: 'Year', value: String(stage.date.getFullYear()), accent: false },
                      { label: 'Your age', value: String(stage.date.getFullYear() - settings.birthYear), accent: true },
                      { label: 'Corpus', value: formatINR(stage.corpus), accent: false },
                      { label: 'Annual returns', value: formatINR(stage.annualReturns), accent: true },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-xl px-3 py-2.5"
                        style={{ background: 'var(--surface-2)' }}>
                        <p className="text-xs mb-0.5" style={{ color: 'var(--text-3)' }}>{stat.label}</p>
                        <p className="font-bold text-sm" style={{ color: stat.accent ? a.text : 'var(--text-1)' }}>
                          {stat.value}
                        </p>
                      </div>
                    ))}

                    {/* LTCG row */}
                    {showTax && taxPt && (
                      <div className="rounded-xl px-3 py-2.5 col-span-2 md:col-span-1"
                        style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold)' }}>
                        <p className="text-xs mb-0.5" style={{ color: 'var(--gold)' }}>Post-tax (yr end)</p>
                        <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>
                          {formatINR(Math.max(0, taxPt.netCorpus))}
                        </p>
                        {taxDrag > 1000 && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                            −{formatINR(taxDrag)} LTCG total
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
        Projections at {(settings.projectedXIRR * 100).toFixed(1)}% XIRR from the{' '}
        {formatINR(settings.referenceCorpus)} anchor. Edit via Profile.
      </p>
    </div>
  );
}
