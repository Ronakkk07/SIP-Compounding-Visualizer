import { useState, useMemo, useCallback } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceDot, ReferenceLine, Area,
} from 'recharts';
import {
  simulate, computeStages, formatINR, getYearly,
  type SimOptions, type StageInfo, type MonthlyPoint,
} from '../utils/financialCalc';
import { useSettings } from '../context/UserSettingsContext';
import { REFERENCE } from '../data/sipData';

// ─── Scenario types ───────────────────────────────────────────────────────────

type ScenarioKind =
  | 'lump_sum' | 'sip_increase' | 'sip_decrease'
  | 'xirr_change' | 'pause' | 'start_earlier' | 'step_up';

interface ScenarioDef {
  id: string;
  label: string;
  color: string;
  simOpts: Partial<SimOptions>;
}

// Balanced palette visible in both dark and light
const PALETTE = ['#6366f1', '#e09000', '#10a070', '#d04060'];

function makeId() { return Math.random().toString(36).slice(2, 8); }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildSipPhases(
  base: SimOptions['phases'], amount: number, fromId: number
): SimOptions['phases'] {
  return base?.map((p) => (p.id >= fromId ? { ...p, monthlyAmount: amount } : p));
}

function buildStepUpPhases(
  base: SimOptions['phases'], pct: number
): SimOptions['phases'] {
  return base?.map((p) => p.id < 6 ? p : { ...p, monthlyAmount: Math.round(p.monthlyAmount * (1 + pct / 100)) });
}

// ─── Suggestions ─────────────────────────────────────────────────────────────

interface Suggestion {
  label: string;
  group: string;
  build: (phases: SimOptions['phases']) => Partial<SimOptions>;
}

const SUGGESTIONS: Suggestion[] = [
  { label: 'Started 1 yr earlier', group: 'Time',   build: () => ({ shiftStartYears: 1 }) },
  { label: 'Started 2 yrs earlier', group: 'Time',  build: () => ({ shiftStartYears: 2 }) },
  { label: 'Started 3 yrs earlier', group: 'Time',  build: () => ({ shiftStartYears: 3 }) },
  { label: '₹25K lump sum today',   group: 'Lump',  build: () => ({ lumpSum: { date: REFERENCE.date, amount: 25000 } }) },
  { label: '₹50K lump sum today',   group: 'Lump',  build: () => ({ lumpSum: { date: REFERENCE.date, amount: 50000 } }) },
  { label: '₹1L lump sum today',    group: 'Lump',  build: () => ({ lumpSum: { date: REFERENCE.date, amount: 100000 } }) },
  { label: 'Post-job SIP ₹25K',     group: 'SIP',   build: (p) => ({ phases: buildSipPhases(p, 25000, 6) }) },
  { label: 'Post-job SIP ₹30K',     group: 'SIP',   build: (p) => ({ phases: buildSipPhases(p, 30000, 6) }) },
  { label: 'Post-job SIP ₹15K',     group: 'SIP',   build: (p) => ({ phases: buildSipPhases(p, 15000, 6) }) },
  { label: '10% annual step-up',    group: 'SIP',   build: (p) => ({ phases: buildStepUpPhases(p, 10) }) },
  { label: '15% annual step-up',    group: 'SIP',   build: (p) => ({ phases: buildStepUpPhases(p, 15) }) },
  { label: 'XIRR 10% (bear)',       group: 'XIRR',  build: () => ({ projectedXIRR: 0.10 }) },
  { label: 'XIRR 14% (bull)',       group: 'XIRR',  build: () => ({ projectedXIRR: 0.14 }) },
  { label: 'XIRR 8% (worst case)',  group: 'XIRR',  build: () => ({ projectedXIRR: 0.08 }) },
  { label: 'Pause 6 months',        group: 'Pause', build: () => ({ pauseStart: new Date(2026,10,1), pauseEnd: new Date(2027,3,30) }) },
  { label: 'Pause 1 year',          group: 'Pause', build: () => ({ pauseStart: new Date(2026,10,1), pauseEnd: new Date(2027,9,31) }) },
];

const GROUP_ORDER = ['Time','Lump','SIP','XIRR','Pause'];

// ─── Custom builder ───────────────────────────────────────────────────────────

type KindLabel = Record<ScenarioKind, string>;
const KIND_LABELS: KindLabel = {
  lump_sum:      'Lump Sum',
  sip_increase:  'SIP Increase',
  sip_decrease:  'SIP Decrease',
  xirr_change:   'Change XIRR',
  pause:         'Pause SIP',
  start_earlier: 'Start Earlier',
  step_up:       'Step-Up',
};

interface CustomP {
  kind: ScenarioKind;
  lumpAmount: number; lumpMonth: number; lumpYear: number;
  sipAmount: number; sipFromPhase: number;
  xirr: number;
  pauseM: number; pauseY: number; pauseDur: number;
  yearsEarlier: number; stepUpPct: number;
}

function buildCustomOpts(p: CustomP, phases: SimOptions['phases']): Partial<SimOptions> {
  switch (p.kind) {
    case 'lump_sum':
      return { lumpSum: { date: new Date(p.lumpYear, p.lumpMonth, 1), amount: p.lumpAmount } };
    case 'sip_increase': case 'sip_decrease':
      return { phases: buildSipPhases(phases, p.sipAmount, p.sipFromPhase) };
    case 'xirr_change':
      return { projectedXIRR: p.xirr / 100 };
    case 'pause': {
      const s = new Date(p.pauseY, p.pauseM, 1);
      const e = new Date(s.getFullYear(), s.getMonth() + p.pauseDur - 1, 28);
      return { pauseStart: s, pauseEnd: e };
    }
    case 'start_earlier': return { shiftStartYears: p.yearsEarlier };
    case 'step_up': return { phases: buildStepUpPhases(phases, p.stepUpPct) };
  }
}

function buildCustomLabel(p: CustomP): string {
  switch (p.kind) {
    case 'lump_sum':     return `₹${(p.lumpAmount / 1000).toFixed(0)}K lump sum`;
    case 'sip_increase': return `SIP ₹${(p.sipAmount / 1000).toFixed(0)}K (Ph.${p.sipFromPhase}+)`;
    case 'sip_decrease': return `SIP ₹${(p.sipAmount / 1000).toFixed(0)}K (reduced)`;
    case 'xirr_change':  return `XIRR ${p.xirr}%`;
    case 'pause':        return `Pause ${p.pauseDur}mo from ${MONTH_NAMES[p.pauseM]} ${p.pauseY}`;
    case 'start_earlier': return `Started ${p.yearsEarlier}yr earlier`;
    case 'step_up':      return `${p.stepUpPct}% annual step-up`;
  }
}

function CustomBuilder({ phases, onAdd }: { phases: SimOptions['phases']; onAdd: (l: string, o: Partial<SimOptions>) => void }) {
  const [p, setP] = useState<CustomP>({
    kind: 'lump_sum',
    lumpAmount: 50000, lumpMonth: 4, lumpYear: 2026,
    sipAmount: 25000, sipFromPhase: 6,
    xirr: 14,
    pauseM: 10, pauseY: 2026, pauseDur: 6,
    yearsEarlier: 2, stepUpPct: 10,
  });

  const inp = 'text-sm px-2.5 py-1.5 rounded-lg border outline-none w-24';
  const sel = 'text-sm px-2.5 py-1.5 rounded-lg border outline-none';

  return (
    <div className="rounded-xl border p-4 space-y-4"
      style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', borderStyle: 'dashed' }}>
      {/* Kind selector */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.entries(KIND_LABELS) as [ScenarioKind, string][]).map(([k, lbl]) => (
          <button key={k} onClick={() => setP({ ...p, kind: k })}
            className="text-xs px-2.5 py-1.5 rounded-lg border transition-all"
            style={{
              background: p.kind === k ? 'var(--accent-dim)' : 'var(--surface)',
              borderColor: p.kind === k ? 'var(--accent)' : 'var(--border)',
              color: p.kind === k ? 'var(--accent)' : 'var(--text-2)',
            }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Dynamic fields */}
      <div className="flex flex-wrap gap-3 items-end">
        {p.kind === 'lump_sum' && (<>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Amount (₹)</p>
            <input type="number" value={p.lumpAmount} step={5000} min={1000}
              onChange={(e) => setP({ ...p, lumpAmount: +e.target.value })}
              className={inp} style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-1)' }} />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Month</p>
            <select value={p.lumpMonth} onChange={(e) => setP({ ...p, lumpMonth: +e.target.value })}
              className={sel} style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-1)' }}>
              {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Year</p>
            <input type="number" value={p.lumpYear} min={2026} max={2035}
              onChange={(e) => setP({ ...p, lumpYear: +e.target.value })}
              className={inp} style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-1)' }} />
          </div>
        </>)}

        {(p.kind === 'sip_increase' || p.kind === 'sip_decrease') && (<>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>New SIP (₹/mo)</p>
            <input type="number" value={p.sipAmount} step={1000} min={1000}
              onChange={(e) => setP({ ...p, sipAmount: +e.target.value })}
              className={inp} style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-1)' }} />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>From Phase</p>
            <select value={p.sipFromPhase} onChange={(e) => setP({ ...p, sipFromPhase: +e.target.value })}
              className={sel} style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-1)' }}>
              {phases?.filter(ph => ph.id >= 4).map(ph => (
                <option key={ph.id} value={ph.id}>{ph.label}</option>
              ))}
            </select>
          </div>
        </>)}

        {p.kind === 'xirr_change' && (
          <div className="flex-1 min-w-40">
            <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>XIRR: {p.xirr}%</p>
            <input type="range" min={6} max={20} step={0.5} value={p.xirr}
              onChange={(e) => setP({ ...p, xirr: +e.target.value })} />
          </div>
        )}

        {p.kind === 'pause' && (<>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>From</p>
            <div className="flex gap-1">
              <select value={p.pauseM} onChange={(e) => setP({ ...p, pauseM: +e.target.value })}
                className={sel} style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-1)' }}>
                {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <input type="number" value={p.pauseY} min={2026} max={2035}
                onChange={(e) => setP({ ...p, pauseY: +e.target.value })}
                className={inp} style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-1)' }} />
            </div>
          </div>
          <div className="flex-1 min-w-32">
            <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Duration: {p.pauseDur} months</p>
            <input type="range" min={1} max={24} value={p.pauseDur}
              onChange={(e) => setP({ ...p, pauseDur: +e.target.value })} />
          </div>
        </>)}

        {p.kind === 'start_earlier' && (
          <div className="flex-1 min-w-40">
            <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Earlier by: {p.yearsEarlier} years</p>
            <input type="range" min={1} max={5} value={p.yearsEarlier}
              onChange={(e) => setP({ ...p, yearsEarlier: +e.target.value })} />
          </div>
        )}

        {p.kind === 'step_up' && (
          <div className="flex-1 min-w-40">
            <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Step-up: {p.stepUpPct}% / year</p>
            <input type="range" min={5} max={25} step={1} value={p.stepUpPct}
              onChange={(e) => setP({ ...p, stepUpPct: +e.target.value })} />
          </div>
        )}

        <button
          onClick={() => onAdd(buildCustomLabel(p), buildCustomOpts(p, phases))}
          className="text-sm font-semibold px-4 py-1.5 rounded-lg text-white transition-all"
          style={{ background: 'var(--accent)' }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─── Arc chart ────────────────────────────────────────────────────────────────

const STAGE_DOT_COLORS = ['#94a3b8','#a78bfa','#2dd4aa','#f5ba40','#818cf8'];

function ArcTip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--tt-bg)', border: '1px solid var(--tt-border)',
      boxShadow: '0 8px 32px var(--tt-shadow)',
      borderRadius: 12, padding: '10px 14px', fontSize: 12,
    }}>
      <p style={{ color: 'var(--text-2)', marginBottom: 8, fontWeight: 500 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 3 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{formatINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

interface ArcScenario {
  id: string; label: string; color: string;
  yearly: MonthlyPoint[]; stages: StageInfo[];
}

function ArcChart({ base, scenarios }: { base: MonthlyPoint[]; scenarios: ArcScenario[] }) {
  const baseYearly = useMemo(() => getYearly(base), [base]);
  const baseStages = useMemo(() => computeStages(base), [base]);

  const chartData = useMemo(() => {
    const years: number[] = [];
    for (let y = 2022; y <= 2042; y++) years.push(y);
    return years.map((y) => {
      const b = baseYearly.find((d) => d.year === y);
      const pt: Record<string, number> = { year: y, Base: b ? Math.round(b.corpus) : 0 };
      scenarios.forEach((s) => {
        const m = s.yearly.find((d) => d.year === y);
        if (m) pt[s.label] = Math.round(m.corpus);
      });
      return pt;
    });
  }, [baseYearly, scenarios]);

  return (
    <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-5">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-2)' }}>
          <span className="w-5 h-0.5 rounded inline-block" style={{ background: 'var(--ch-base)' }} />
          Base
        </div>
        {scenarios.map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-xs" style={{ color: s.color }}>
            <span className="w-5 h-0.5 rounded inline-block" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
        <div className="ml-auto flex items-center gap-3 text-xs flex-wrap" style={{ color: 'var(--text-3)' }}>
          {['Quiet','Snowball','Crossover','Accel','₹1Cr'].map((l, i) => (
            <span key={l} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: STAGE_DOT_COLORS[i] }} />
              {l}
            </span>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 12, left: 4, bottom: 0 }}>
          <XAxis dataKey="year" tick={{ fill: 'var(--ch-axis)', fontSize: 11 }}
            tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v) => {
            if (v >= 10_000_000) return `₹${v / 10_000_000}Cr`;
            if (v >= 100_000) return `₹${v / 100_000}L`;
            return `₹${v / 1_000}K`;
          }} tick={{ fill: 'var(--ch-axis)', fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ch-grid)" />
          <Tooltip content={<ArcTip />} />
          <ReferenceLine x={2026} stroke="var(--ch-axis)" strokeDasharray="4 3"
            label={{ value: 'Today', fill: 'var(--text-3)', fontSize: 10, position: 'top' }} />

          <Area type="monotone" dataKey="Base" stroke="var(--ch-base)" strokeWidth={1.5}
            fill="var(--ch-base)" fillOpacity={0.08} dot={false} name="Base" />

          {scenarios.map((s) => (
            <Line key={s.id} type="monotone" dataKey={s.label}
              stroke={s.color} strokeWidth={2.5} dot={false} />
          ))}

          {/* Base stage markers (S3+) */}
          {baseStages.filter(st => st.stage >= 3).map((st) => (
            <ReferenceDot key={`b-s${st.stage}`}
              x={st.date.getFullYear()} y={Math.round(st.corpus)}
              r={6} fill={STAGE_DOT_COLORS[st.stage - 1]} stroke="var(--surface)" strokeWidth={2}
              label={{ value: `S${st.stage}`, position: 'top', fontSize: 9,
                fill: STAGE_DOT_COLORS[st.stage - 1], offset: 6 }} />
          ))}

          {/* Scenario stage markers */}
          {scenarios.flatMap((s) =>
            s.stages.filter(st => st.stage >= 3).map((st) => (
              <ReferenceDot key={`${s.id}-s${st.stage}`}
                x={st.date.getFullYear()} y={Math.round(st.corpus)}
                r={5} fill={s.color} stroke="var(--surface)" strokeWidth={1.5} />
            ))
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Stage table ──────────────────────────────────────────────────────────────

const STAGE_NAMES = ['Quiet','Snowball','Crossover','Acceleration','₹1 Crore'];

function StageTable({ baseStages, scenarios, birthYear }: {
  baseStages: StageInfo[]; scenarios: ArcScenario[]; birthYear: number;
}) {
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Stage Arrival Comparison</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
          When each stage is reached — base vs scenarios
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="text-left text-xs font-semibold px-5 py-3 w-36"
                style={{ color: 'var(--text-3)' }}>Stage</th>
              <th className="text-center text-xs font-semibold px-4 py-3"
                style={{ color: 'var(--text-2)' }}>Base</th>
              {scenarios.map((s) => (
                <th key={s.id} className="text-center text-xs font-semibold px-4 py-3"
                  style={{ color: s.color }}>{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1,2,3,4,5].map((n) => {
              const bs = baseStages.find(s => s.stage === n);
              const c = STAGE_DOT_COLORS[n - 1];
              return (
                <tr key={n} className="border-b" style={{ borderColor: 'var(--border-2)' }}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
                      <div>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-1)' }}>
                          {STAGE_NAMES[n - 1]}
                        </span>
                        {bs && <div className="text-xs" style={{ color: 'var(--text-3)' }}>{formatINR(bs.corpus)}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {bs ? (
                      <div>
                        <span className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {bs.date.getFullYear()}
                        </span>
                        <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                          age {bs.date.getFullYear() - birthYear}
                        </div>
                      </div>
                    ) : <span style={{ color: 'var(--text-3)', fontSize: 11 }}>&gt; 2042</span>}
                  </td>
                  {scenarios.map((s) => {
                    const ss = s.stages.find(st => st.stage === n);
                    const delta = bs && ss ? ss.date.getFullYear() - bs.date.getFullYear() : undefined;
                    return (
                      <td key={s.id} className="px-4 py-3 text-center">
                        {ss ? (
                          <div>
                            <span className="font-semibold" style={{ color: s.color }}>
                              {ss.date.getFullYear()}
                            </span>
                            <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                              age {ss.date.getFullYear() - birthYear}
                            </div>
                            {delta !== undefined && delta !== 0 && (
                              <div className="text-xs font-semibold mt-0.5"
                                style={{ color: delta < 0 ? 'var(--green)' : 'var(--rose)' }}>
                                {delta < 0 ? `${delta}yr` : `+${delta}yr`}
                              </div>
                            )}
                          </div>
                        ) : <span style={{ color: 'var(--text-3)', fontSize: 11 }}>&gt; 2042</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WhatIfExplorer() {
  const settings = useSettings();
  const [scenarios, setScenarios] = useState<ScenarioDef[]>([]);
  const [showCustom, setShowCustom] = useState(false);

  const baseOpts: SimOptions = {
    projectedXIRR: settings.projectedXIRR, endYear: 2042,
    phases: settings.phases, birthYear: settings.birthYear,
    referenceCorpus: settings.referenceCorpus,
    referenceInvested: settings.referenceInvested,
    historicalXIRR: settings.historicalXIRR,
  };

  const baseData = useMemo(
    () => simulate(baseOpts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.projectedXIRR, settings.birthYear, JSON.stringify(settings.phases),
     settings.referenceCorpus, settings.referenceInvested, settings.historicalXIRR]
  );
  const baseStages = useMemo(() => computeStages(baseData), [baseData]);

  const arcScenarios = useMemo<ArcScenario[]>(() =>
    scenarios.map((s) => {
      const d = simulate({ ...baseOpts, ...s.simOpts });
      return { id: s.id, label: s.label, color: s.color, yearly: getYearly(d), stages: computeStages(d) };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenarios, settings]
  );

  const addScenario = useCallback((label: string, simOpts: Partial<SimOptions>) => {
    if (scenarios.length >= 4) return;
    const color = PALETTE[scenarios.length % PALETTE.length];
    setScenarios((prev) => [...prev, { id: makeId(), label, color, simOpts }]);
  }, [scenarios.length]);

  const removeScenario = useCallback((id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const activeLabels = new Set(scenarios.map((s) => s.label));
  const groups = GROUP_ORDER.map((g) => ({
    name: g, items: SUGGESTIONS.filter((s) => s.group === g),
  }));

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-1)' }}>
          What-If Explorer
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>
          Add up to 4 scenarios. See exactly how each one shifts your five compounding stages.
        </p>
      </div>

      {/* Suggestions panel */}
      <div className="rounded-2xl border p-5 space-y-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            Quick Scenarios
          </p>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>
            {scenarios.length}/4 active
          </span>
        </div>

        {groups.map((g) => (
          <div key={g.name}>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>{g.name}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map((sg) => {
                const active = activeLabels.has(sg.label);
                const full = !active && scenarios.length >= 4;
                return (
                  <button key={sg.label} disabled={active || full}
                    onClick={() => addScenario(sg.label, sg.build(settings.phases))}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                    style={{
                      cursor: active || full ? 'default' : 'pointer',
                      opacity: full ? 0.35 : 1,
                      background: active ? 'var(--accent-dim)' : 'var(--surface-2)',
                      borderColor: active ? 'var(--accent)' : 'var(--border)',
                      color: active ? 'var(--accent)' : 'var(--text-2)',
                    }}>
                    {sg.label}
                    {active && <span style={{ marginLeft: 5, opacity: 0.7 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <button
            onClick={() => setShowCustom((v) => !v)}
            className="text-xs font-medium flex items-center gap-2 transition-all"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-2)')}
          >
            <span className={`transition-transform ${showCustom ? 'rotate-90' : ''}`}
              style={{ display: 'inline-block' }}>▶</span>
            Build a custom scenario
          </button>
          {showCustom && (
            <div className="mt-3">
              <CustomBuilder phases={settings.phases} onAdd={addScenario} />
            </div>
          )}
        </div>
      </div>

      {/* Active chips */}
      {scenarios.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>Comparing:</span>
          {scenarios.map((s) => (
            <span key={s.id}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border"
              style={{ borderColor: s.color + '55', background: s.color + '18', color: s.color }}>
              {s.label}
              <button onClick={() => removeScenario(s.id)}
                className="opacity-50 hover:opacity-100 transition-opacity leading-none">
                ✕
              </button>
            </span>
          ))}
          <button onClick={() => setScenarios([])}
            className="text-xs transition-all"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--rose)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}>
            Clear all
          </button>
        </div>
      )}

      {/* Empty state */}
      {scenarios.length === 0 && (
        <div className="rounded-2xl border py-14 text-center"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderStyle: 'dashed' }}>
          <div className="w-11 h-11 rounded-xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--surface-2)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: 'var(--text-3)' }}>
              <path d="M21 3L3 10.5l7.5 3L14 21l3-9 4-9z" />
            </svg>
          </div>
          <p className="font-medium text-sm" style={{ color: 'var(--text-2)' }}>
            Select a scenario above
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
            See how it shifts your five compounding stages on the arc chart
          </p>
        </div>
      )}

      {/* Arc chart + table */}
      {scenarios.length > 0 && (
        <>
          <ArcChart base={baseData} scenarios={arcScenarios} />
          <StageTable baseStages={baseStages} scenarios={arcScenarios} birthYear={settings.birthYear} />

          {/* Delta summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {arcScenarios.map((s) => {
              const baseCrore = baseStages.find(st => st.stage === 5);
              const sCrore = s.stages.find(st => st.stage === 5);
              const baseCross = baseStages.find(st => st.stage === 3);
              const sCross = s.stages.find(st => st.stage === 3);
              const baseEnd = baseData[baseData.length - 1];
              const sData = simulate({ ...baseOpts, ...scenarios.find(sc => sc.id === s.id)!.simOpts });
              const sEnd = sData[sData.length - 1];
              const delta = sEnd.corpus - baseEnd.corpus;
              const pos = delta >= 0;
              const crDelta = baseCrore && sCrore ? sCrore.date.getFullYear() - baseCrore.date.getFullYear() : undefined;
              const cxDelta = baseCross && sCross ? sCross.date.getFullYear() - baseCross.date.getFullYear() : undefined;

              return (
                <div key={s.id} className="rounded-2xl border p-5 space-y-4"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderLeft: `4px solid ${s.color}` }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    <h4 className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{s.label}</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Corpus delta (2042)', val: (pos ? '+' : '') + formatINR(delta), good: pos },
                      { label: 'Crossover shift', val: cxDelta === undefined ? '—' : cxDelta === 0 ? 'Same' : `${cxDelta < 0 ? cxDelta : '+' + cxDelta}yr`, good: (cxDelta ?? 0) <= 0 },
                      { label: '₹1Cr shift', val: crDelta === undefined ? '—' : crDelta === 0 ? 'Same' : `${crDelta < 0 ? crDelta : '+' + crDelta}yr`, good: (crDelta ?? 0) <= 0 },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-xl p-3"
                        style={{ background: 'var(--surface-2)' }}>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{stat.label}</p>
                        <p className="font-bold text-sm"
                          style={{ color: stat.val === '—' || stat.val === 'Same' ? 'var(--text-2)' : stat.good ? 'var(--green)' : 'var(--rose)' }}>
                          {stat.val}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
