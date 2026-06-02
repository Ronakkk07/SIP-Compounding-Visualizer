import { useState, useMemo } from 'react';
import {
  simulate, computeStages, findMilestone, corpusAt, formatINR,
  type SimOptions,
} from '../utils/financialCalc';
import { useSettings } from '../context/UserSettingsContext';
import { PHASES } from '../data/sipData';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetYear: number;
}

interface GoalResult {
  isOnTrack: boolean;
  eta?: Date;
  etaAge: number;
  corpusAtTarget: number;
  shortage: number;
  extraMonthly: number;
}

const PRESET_GOALS: Omit<Goal, 'id'>[] = [
  { name: 'Emergency Fund',     targetAmount:   500_000, targetYear: 2028 },
  { name: 'First Car',          targetAmount:   800_000, targetYear: 2029 },
  { name: 'Higher Education',   targetAmount: 2_000_000, targetYear: 2031 },
  { name: 'Home Down Payment',  targetAmount: 3_000_000, targetYear: 2034 },
  { name: '₹1 Crore Corpus',   targetAmount: 10_000_000, targetYear: 2038 },
];

const STAGE_COLORS_LIGHT = ['#64748b','#8b5cf6','#0d9e6e','#c07000','#4f46e5'];
const STAGE_COLORS_DARK  = ['#94a3b8','#a78bfa','#2dd4aa','#f5ba40','#818cf8'];

function loadGoals(): Goal[] {
  try {
    const raw = localStorage.getItem('fs-goals');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveGoalsToStorage(goals: Goal[]) {
  localStorage.setItem('fs-goals', JSON.stringify(goals));
}

function findExtraSIP(
  opts: SimOptions,
  targetAmount: number,
  targetYear: number,
): number {
  const today = new Date(2026, 4, 1);
  let lo = 0, hi = 500_000;
  for (let iter = 0; iter < 28; iter++) {
    const mid = (lo + hi) / 2;
    const phases = (opts.phases ?? PHASES).map((p) =>
      p.startDate >= today ? { ...p, monthlyAmount: p.monthlyAmount + mid } : p
    );
    const d = simulate({ ...opts, phases });
    if (corpusAt(d, targetYear) >= targetAmount) hi = mid;
    else lo = mid;
  }
  return hi > 499_000 ? Infinity : Math.ceil(hi / 500) * 500;
}

export default function MilestoneTracker() {
  const settings = useSettings();
  const [goals, setGoals] = useState<Goal[]>(loadGoals);
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: '', targetAmount: 500_000, targetYear: new Date().getFullYear() + 4,
  });

  const isDark = document.documentElement.classList.contains('dark');
  const stageColors = isDark ? STAGE_COLORS_DARK : STAGE_COLORS_LIGHT;

  const opts: SimOptions = useMemo(() => ({
    projectedXIRR: settings.projectedXIRR,
    endYear: 2045,
    phases: settings.phases,
    birthYear: settings.birthYear,
    referenceCorpus: settings.referenceCorpus,
    referenceInvested: settings.referenceInvested,
    historicalXIRR: settings.historicalXIRR,
  }), [
    settings.projectedXIRR, settings.birthYear,
    settings.referenceCorpus, settings.referenceInvested,
    settings.historicalXIRR, JSON.stringify(settings.phases),
  ]);

  const baseData = useMemo(() => simulate(opts), [opts]);
  const stages   = useMemo(() => computeStages(baseData), [baseData]);

  const goalResults = useMemo<GoalResult[]>(() =>
    goals.map((goal) => {
      const corpus = corpusAt(baseData, goal.targetYear);
      const etaPt  = findMilestone(baseData, goal.targetAmount);
      const isOnTrack = corpus >= goal.targetAmount;
      const shortage = Math.max(0, goal.targetAmount - corpus);
      const extraMonthly = isOnTrack ? 0 : findExtraSIP(opts, goal.targetAmount, goal.targetYear);
      return {
        isOnTrack,
        eta: etaPt?.date,
        etaAge: etaPt ? etaPt.date.getFullYear() - settings.birthYear : 0,
        corpusAtTarget: corpus,
        shortage,
        extraMonthly,
      };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [goals, baseData, opts]
  );

  function saveGoals(next: Goal[]) {
    setGoals(next);
    saveGoalsToStorage(next);
  }

  function addPreset(preset: Omit<Goal, 'id'>) {
    saveGoals([...goals, { ...preset, id: Date.now().toString() }]);
  }

  function addCustomGoal() {
    if (!newGoal.name.trim()) return;
    saveGoals([...goals, { ...newGoal, id: Date.now().toString() }]);
    setNewGoal({ name: '', targetAmount: 500_000, targetYear: new Date().getFullYear() + 4 });
    setShowAdd(false);
  }

  function removeGoal(id: string) {
    saveGoals(goals.filter((g) => g.id !== id));
  }

  const existingNames = new Set(goals.map((g) => g.name));

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-1)' }}>
          Goals &amp; Planning
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>
          Set what you're saving for. We'll tell you if your current trajectory hits each goal and what extra SIP closes the gap if not.
        </p>
      </div>

      {/* Quick-add presets + custom goal */}
      <div className="rounded-2xl border p-5 space-y-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            Quick Add
          </p>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
            style={{ color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-dim)' }}>
            + Custom Goal
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_GOALS.map((p) => {
            const active = existingNames.has(p.name);
            return (
              <button key={p.name} disabled={active}
                onClick={() => addPreset(p)}
                className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                style={{
                  background: active ? 'var(--accent-dim)' : 'var(--surface-2)',
                  borderColor: active ? 'var(--accent)' : 'var(--border)',
                  color: active ? 'var(--accent)' : 'var(--text-2)',
                  cursor: active ? 'default' : 'pointer',
                }}>
                {active && '✓ '}{p.name}
                <span className="ml-1.5 opacity-60">
                  {formatINR(p.targetAmount)} · {p.targetYear}
                </span>
              </button>
            );
          })}
        </div>

        {showAdd && (
          <div className="rounded-xl border p-4 space-y-3"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', borderStyle: 'dashed' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--text-3)' }}>Goal name</p>
                <input type="text" placeholder="e.g. Dream Vacation"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal((n) => ({ ...n, name: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-1)' }} />
              </div>
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--text-3)' }}>Target Amount (₹)</p>
                <input type="number" step={50000} min={10000}
                  value={newGoal.targetAmount}
                  onChange={(e) => setNewGoal((n) => ({ ...n, targetAmount: +e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-1)' }} />
              </div>
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--text-3)' }}>By Year</p>
                <select value={newGoal.targetYear}
                  onChange={(e) => setNewGoal((n) => ({ ...n, targetYear: +e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-1)' }}>
                  {Array.from({ length: 20 }, (_, i) => 2026 + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)}
                className="text-xs px-3 py-1.5 rounded-lg border"
                style={{ color: 'var(--text-2)', borderColor: 'var(--border)', background: 'transparent' }}>
                Cancel
              </button>
              <button onClick={addCustomGoal}
                className="text-xs font-semibold px-4 py-1.5 rounded-lg text-white"
                style={{ background: 'var(--accent)' }}>
                Add Goal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Goal cards */}
      {goals.length === 0 ? (
        <div className="rounded-2xl border py-14 text-center"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderStyle: 'dashed' }}>
          <p className="font-medium text-sm" style={{ color: 'var(--text-2)' }}>No goals yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
            Add a preset above or create a custom goal to see your trajectory analysis
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal, i) => {
            const result = goalResults[i];
            if (!result) return null;
            const pct = Math.min((settings.referenceCorpus / goal.targetAmount) * 100, 100);
            return (
              <div key={goal.id}
                className="rounded-2xl border overflow-hidden"
                style={{
                  background: 'var(--surface)',
                  borderColor: result.isOnTrack ? 'var(--green)' : 'var(--border)',
                }}>
                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg leading-tight" style={{ color: 'var(--text-1)' }}>
                        {goal.name}
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                        {formatINR(goal.targetAmount, false)} by {goal.targetYear}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{
                          background: result.isOnTrack ? 'var(--green-dim)' : 'var(--rose-dim)',
                          color: result.isOnTrack ? 'var(--green)' : 'var(--rose)',
                        }}>
                        {result.isOnTrack ? 'On Track' : 'Behind'}
                      </span>
                      <button onClick={() => removeGoal(goal.id)}
                        className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                        style={{ color: 'var(--text-3)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--rose)'; e.currentTarget.style.background = 'var(--rose-dim)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: result.isOnTrack ? 'var(--green)' : 'var(--accent)',
                          transition: 'width 0.5s ease',
                        }} />
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: 'var(--text-3)' }}>
                      <span>{formatINR(settings.referenceCorpus)} today</span>
                      <span>{pct.toFixed(1)}% of goal</span>
                    </div>
                  </div>

                  {/* Analysis box */}
                  <div className="rounded-xl px-4 py-3 space-y-1"
                    style={{ background: 'var(--surface-2)' }}>
                    {result.isOnTrack ? (
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                          Your trajectory reaches this goal
                          {result.eta
                            ? ` in ${result.eta.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
                            : ' within the projection window'}
                        </p>
                        {result.eta && (
                          <p className="text-xs font-semibold shrink-0" style={{ color: 'var(--green)' }}>
                            Age {result.etaAge}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                            Corpus by {goal.targetYear}: {formatINR(result.corpusAtTarget)}
                          </p>
                          <p className="text-xs font-semibold" style={{ color: 'var(--rose)' }}>
                            Short by {formatINR(result.shortage)}
                          </p>
                        </div>
                        {result.extraMonthly < Infinity ? (
                          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                            Increase your monthly SIP by{' '}
                            <span className="font-bold" style={{ color: 'var(--gold)' }}>
                              ₹{result.extraMonthly.toLocaleString('en-IN')}/month
                            </span>
                            {' '}from today to close this gap
                          </p>
                        ) : (
                          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                            Target year may be too aggressive — consider extending the timeline
                          </p>
                        )}
                        {result.eta && (
                          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                            At current SIP: reaches {formatINR(goal.targetAmount)} in {result.eta.getFullYear()}
                            {' '}(age {result.etaAge})
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compounding stages overview */}
      {stages.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--text-1)' }}>Your Compounding Stages</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              Five milestones every long-term investor passes through
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {stages.map((stage, i) => {
              const color = stageColors[i] ?? stageColors[0];
              return (
                <div key={stage.stage}
                  className="rounded-xl border p-4"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderLeft: `3px solid ${color}` }}>
                  <span className="text-xs font-bold tabular-nums" style={{ color }}>
                    {String(stage.stage).padStart(2, '0')}
                  </span>
                  <p className="font-semibold text-sm mt-1 leading-tight" style={{ color: 'var(--text-1)' }}>
                    {stage.shortLabel}
                  </p>
                  <p className="font-bold text-xl mt-2 tabular-nums" style={{ color }}>
                    {stage.date.getFullYear()}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                    Age {stage.date.getFullYear() - settings.birthYear}
                  </p>
                  <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-2)' }}>
                    {formatINR(stage.corpus)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
        All projections at {(settings.projectedXIRR * 100).toFixed(1)}% XIRR · Edit assumptions via Profile
      </p>
    </div>
  );
}
