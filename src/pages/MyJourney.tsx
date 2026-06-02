import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { formatINR } from '../utils/financialCalc';
import { useSettings } from '../context/UserSettingsContext';
import { useSimulate } from '../hooks/useSimulate';
import MetricCard from '../components/MetricCard';

function ChartTip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
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
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}K`;
  return `₹${v}`;
}

function PhaseLabel({ viewBox, label, color }: { viewBox?: { x: number; y: number }; label: string; color: string }) {
  if (!viewBox) return <g />;
  const { x, y } = viewBox;
  const w = label.length * 6 + 10;
  return (
    <g>
      <rect x={x + 3} y={y - 28} width={w} height={17} rx={3} fill={color} fillOpacity={0.2} />
      <text x={x + 3 + w / 2} y={y - 15} textAnchor="middle"
        fill={color} fontSize={10} fontWeight={700} fontFamily="Inter, sans-serif">
        {label}
      </text>
    </g>
  );
}

export default function MyJourney() {
  const settings = useSettings();
  const sim = useSimulate();
  const data = useMemo(() => sim({ endYear: 2028 }), [sim]);

  const historical = data.filter((d) => !d.isProjection);
  const corpus = settings.referenceCorpus;
  const invested = settings.referenceInvested;
  const returns = corpus - invested;
  const returnsPct = ((returns / invested) * 100).toFixed(1);
  const xirrPct = (settings.historicalXIRR * 100).toFixed(2);

  const chartData = data.map((d) => ({
    label: d.label,
    Corpus: Math.round(d.corpus),
    Invested: Math.round(d.invested),
  }));

  const transitions = settings.phases.slice(1).map((p) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const match = chartData.find((d) => {
      const [m, y] = d.label.split(' ');
      return +y === p.startDate.getFullYear() && months.indexOf(m) === p.startDate.getMonth();
    });
    return { ...p, xLabel: match?.label };
  });

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-1)' }}>
          My SIP Journey
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>
          Your personal compounding story from ₹1,000 a month to where you're headed.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Current Corpus" value={formatINR(corpus)} sub="reference anchor" tone="accent" large />
        <MetricCard label="Total Invested" value={formatINR(invested)} sub={`${historical.length} monthly SIPs`} tone="neutral" />
        <MetricCard label="Total Returns" value={formatINR(returns)} sub={`+${returnsPct}% on invested`} tone="green" />
        <MetricCard label="XIRR" value={`${xirrPct}%`} sub="annualised return" tone="gold" />
      </div>

      {/* Chart */}
      <div className="rounded-2xl border p-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>Corpus Growth</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              History · Dashed lines mark each SIP step-up
            </p>
          </div>
          <div className="flex gap-4 text-xs" style={{ color: 'var(--text-2)' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded inline-block" style={{ background: 'var(--ch-corpus)' }} />
              Corpus
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-px inline-block border-t border-dashed" style={{ borderColor: 'var(--ch-invested)' }} />
              Invested
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fill: 'var(--ch-axis)', fontSize: 11 }}
              tickLine={false} axisLine={false} interval={11} />
            <YAxis tickFormatter={yFmt} tick={{ fill: 'var(--ch-axis)', fontSize: 11 }}
              tickLine={false} axisLine={false} width={52} />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ch-grid)" />
            <Tooltip content={<ChartTip />} />
            {transitions.map((p) =>
              p.xLabel ? (
                <ReferenceLine key={p.id} x={p.xLabel} stroke={p.color}
                  strokeDasharray="4 3" strokeOpacity={0.8}
                  label={(props: { viewBox?: { x: number; y: number } }) => (
                    <PhaseLabel viewBox={props.viewBox} label={`₹${p.monthlyAmount / 1000}K`} color={p.color} />
                  )} />
              ) : null
            )}
            <Area type="monotone" dataKey="Corpus" stroke="var(--ch-corpus)" strokeWidth={2}
              fill="var(--ch-corpus)" fillOpacity={0.1} dot={false} activeDot={{ r: 4 }} />
            <Area type="monotone" dataKey="Invested" stroke="var(--ch-invested)" strokeWidth={1.5}
              strokeDasharray="5 3" fill="var(--ch-invested)" fillOpacity={0.04}
              dot={false} activeDot={{ r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Phase grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {settings.phases.map((p) => (
          <div key={p.id} className="rounded-xl border p-3.5"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>{p.label}</span>
            </div>
            <p className="font-bold text-base" style={{ color: 'var(--text-1)' }}>
              ₹{p.monthlyAmount >= 1000 ? (p.monthlyAmount / 1000).toFixed(0) : p.monthlyAmount}K
              <span className="font-normal text-xs" style={{ color: 'var(--text-3)' }}>/mo</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{p.note}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
        Edit your corpus, invested amount, XIRR, or birth year via Profile in the top nav
      </p>
    </div>
  );
}
