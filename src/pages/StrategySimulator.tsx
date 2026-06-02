import { useState, useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { simulate, formatINR, findMilestone, corpusAt } from '../utils/financialCalc';
import { useSettings } from '../context/UserSettingsContext';
import { type Phase } from '../data/sipData';
import MetricCard from '../components/MetricCard';

function ChartTip({ active, payload, label }: {
  active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string;
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

function yFmt(v: number) {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(0)}L`;
  return `₹${(v / 1_000).toFixed(0)}K`;
}

function Knob({ label, value, min, max, step, display, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  display?: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-2 text-sm">
        <span style={{ color: 'var(--text-2)' }}>{label}</span>
        <span className="font-semibold" style={{ color: 'var(--text-1)' }}>
          {display ?? value}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

function buildPhases(base: Phase[], postJobSIP: number, stepUpPct: number): Phase[] {
  const fixed = base.slice(0, 5);
  const stepUps: Phase[] = [];
  let amount = postJobSIP;
  for (let y = 2028; y <= 2042; y++) {
    stepUps.push({
      id: 100 + y, label: 'Phase 6+',
      startDate: new Date(y, 0, 1), endDate: new Date(y, 11, 31),
      monthlyAmount: Math.round(amount), color: '#818cf8', note: `Post-job ${y}`,
    });
    amount *= 1 + stepUpPct / 100;
  }
  return [...fixed, ...stepUps];
}

export default function StrategySimulator() {
  const settings = useSettings();
  const [postJobSIP, setPostJobSIP] = useState(20000);
  const [stepUp, setStepUp] = useState(0);
  const [xirr, setXirr] = useState(12);

  const data = useMemo(() => {
    const phases = buildPhases(settings.phases, postJobSIP, stepUp);
    return simulate({
      projectedXIRR: xirr / 100, endYear: 2042, phases,
      birthYear: settings.birthYear,
      referenceCorpus: settings.referenceCorpus,
      referenceInvested: settings.referenceInvested,
      historicalXIRR: settings.historicalXIRR,
    });
  }, [postJobSIP, stepUp, xirr, settings]);

  const crossover = useMemo(() =>
    data.filter((d) => d.isProjection && d.phaseId >= 100).find((d) => d.annualReturns > d.annualSIP),
    [data]);
  const crore = useMemo(() => findMilestone(data, 10_000_000), [data]);
  const corpus2035 = useMemo(() => corpusAt(data, 2035), [data]);

  const chartData = useMemo(
    () => data.filter((_, i) => i % 2 === 0).map((d) => ({
      label: d.label,
      Corpus: Math.round(d.corpus),
      Invested: Math.round(d.invested),
      'Annual Returns': Math.round(d.annualReturns),
    })),
    [data]
  );

  const crossoverLabel = crossover
    ? data.filter((_, i) => i % 2 === 0).find((d) => d.date >= crossover.date)?.label
    : undefined;

  const presets = [
    { label: 'Conservative', sip: 15000, su: 0, r: 10 },
    { label: 'Balanced',     sip: 20000, su: 10, r: 12 },
    { label: 'Aggressive',   sip: 25000, su: 15, r: 14 },
  ];

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-1)' }}>
          Strategy Simulator
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>
          Adjust your post-job SIP, step-up, and assumed returns. The crossover year moves in real time.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Crossover Year"
          value={crossover ? String(crossover.date.getFullYear()) : '—'}
          sub={crossover ? `age ${crossover.date.getFullYear() - settings.birthYear}` : 'not reached by 2042'}
          tone="green" large />
        <MetricCard label="₹1 Cr Age"
          value={crore ? String(crore.date.getFullYear() - settings.birthYear) : '—'}
          sub={crore ? `in ${crore.date.getFullYear()}` : 'beyond 2042'}
          tone="gold" />
        <MetricCard label="Corpus in 2035" value={formatINR(corpus2035)} sub="at current settings" tone="accent" />
        <MetricCard label="Monthly returns at ₹1Cr"
          value={crore ? formatINR(crore.annualReturns / 12) : '—'}
          sub="passive income" tone="neutral" />
      </div>

      {/* Chart */}
      <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-6 mb-5 text-xs flex-wrap" style={{ color: 'var(--text-2)' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 rounded inline-block" style={{ background: 'var(--ch-corpus)' }} />
            Corpus
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-px inline-block border-t border-dashed" style={{ borderColor: 'var(--ch-invested)' }} />
            Invested
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 rounded inline-block" style={{ background: 'var(--ch-returns)' }} />
            Annual Returns
          </span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fill: 'var(--ch-axis)', fontSize: 11 }}
              tickLine={false} axisLine={false} interval={7} />
            <YAxis tickFormatter={yFmt} tick={{ fill: 'var(--ch-axis)', fontSize: 11 }}
              tickLine={false} axisLine={false} width={52} />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ch-grid)" />
            <Tooltip content={<ChartTip />} />
            {crossoverLabel && (
              <ReferenceLine x={crossoverLabel} stroke="var(--ch-corpus)" strokeDasharray="4 3"
                label={{ value: 'Crossover', fill: 'var(--ch-corpus)', fontSize: 10, position: 'top' }} />
            )}
            <Area type="monotone" dataKey="Corpus" stroke="var(--ch-corpus)" strokeWidth={2.5}
              fill="var(--ch-corpus)" fillOpacity={0.1} dot={false} />
            <Line type="monotone" dataKey="Invested" stroke="var(--ch-invested)"
              strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
            <Line type="monotone" dataKey="Annual Returns" stroke="var(--ch-returns)"
              strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border p-6 space-y-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>Parameters</h2>

        <Knob label="Post-job SIP (Jan 2028 onwards)"
          value={postJobSIP} min={10000} max={50000} step={1000}
          display={formatINR(postJobSIP, false) + '/month'}
          onChange={setPostJobSIP} />

        <Knob label="Annual step-up"
          value={stepUp} min={0} max={20} step={1}
          display={stepUp === 0 ? 'None' : `+${stepUp}% per year`}
          onChange={setStepUp} />

        <Knob label="Assumed XIRR"
          value={xirr} min={8} max={18} step={0.5}
          display={`${xirr}% p.a.`}
          onChange={setXirr} />

        <div className="grid grid-cols-3 gap-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {presets.map((p) => (
            <button key={p.label}
              onClick={() => { setPostJobSIP(p.sip); setStepUp(p.su); setXirr(p.r); }}
              className="rounded-xl border py-3 px-3 text-left transition-all"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
            >
              <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{p.label}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                ₹{p.sip / 1000}K · {p.su}% step · {p.r}%
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
