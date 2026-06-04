import { useState } from 'react';
import { useSettings } from '../context/UserSettingsContext';
import { useAuth } from '../context/AuthContext';
import { type Phase } from '../data/sipData';
import ImportWizard from './ImportWizard';
import type { PhaseCandidate } from '../utils/casParser';

interface Props { open: boolean; onClose: () => void; }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PHASE_COLORS = ['#818cf8','#a78bfa','#38bdf8','#2dd4aa','#fbbf24','#fb923c','#f87171','#4ade80'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{label}</label>
        {hint && <span className="text-xs" style={{ color: 'var(--text-3)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function NumInput({
  value, onChange, prefix, min, max, step,
}: {
  value: number; onChange: (v: number) => void;
  prefix?: string; min?: number; max?: number; step?: number;
}) {
  return (
    <div className="flex items-center rounded-lg border overflow-hidden"
      style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
      {prefix && (
        <span className="px-3 text-sm border-r" style={{ color: 'var(--text-2)', borderColor: 'var(--border)' }}>
          {prefix}
        </span>
      )}
      <input
        type="number" value={value} min={min} max={max} step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 bg-transparent text-sm px-3 py-2 outline-none"
        style={{ color: 'var(--text-1)' }}
      />
    </div>
  );
}

function clonePhases(phases: Phase[]): Phase[] {
  return phases.map(p => ({
    ...p,
    startDate: new Date(p.startDate),
    endDate: p.endDate ? new Date(p.endDate) : null,
  }));
}

function candidatesToPhases(candidates: PhaseCandidate[]): Phase[] {
  const sorted = [...candidates].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  return sorted.map((c, i): Phase => {
    const next = sorted[i + 1];
    let endDate: Date | null = null;
    if (next) {
      const y = next.startDate.getMonth() === 0 ? next.startDate.getFullYear() - 1 : next.startDate.getFullYear();
      const m = next.startDate.getMonth() === 0 ? 11 : next.startDate.getMonth() - 1;
      endDate = new Date(y, m, 28);
    }
    return {
      id: i + 1,
      label: `Phase ${i + 1}`,
      startDate: new Date(c.startDate),
      endDate,
      monthlyAmount: c.monthlyAmount,
      color: PHASE_COLORS[i % PHASE_COLORS.length],
      note: '',
    };
  });
}

export default function SettingsModal({ open, onClose }: Props) {
  const settings = useSettings();
  const { user, configured, signOut } = useAuth();
  const [local, setLocal] = useState(() => ({
    ...settings,
    phases: clonePhases(settings.phases),
  }));
  const [importing, setImporting] = useState(false);

  if (!open) return null;

  function updatePhaseField(id: number, field: 'month' | 'year' | 'amount', value: number) {
    setLocal((prev) => ({
      ...prev,
      phases: prev.phases.map((p) => {
        if (p.id !== id) return p;
        if (field === 'month') return { ...p, startDate: new Date(p.startDate.getFullYear(), value, 1) };
        if (field === 'year') return { ...p, startDate: new Date(value, p.startDate.getMonth(), 1) };
        return { ...p, monthlyAmount: value };
      }),
    }));
  }

  function addPhase() {
    const sorted = [...local.phases].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    const last = sorted[sorted.length - 1];
    const newStart = last
      ? new Date(last.startDate.getFullYear() + 1, 0, 1)
      : new Date(new Date().getFullYear(), 0, 1);
    const newId = Math.max(0, ...local.phases.map((p) => p.id)) + 1;
    const color = PHASE_COLORS[local.phases.length % PHASE_COLORS.length];
    setLocal((prev) => ({
      ...prev,
      phases: [
        ...prev.phases,
        {
          id: newId, label: `Phase ${newId}`,
          startDate: newStart, endDate: null,
          monthlyAmount: 5000, color, note: '',
        },
      ],
    }));
  }

  function removePhase(id: number) {
    if (local.phases.length <= 1) return;
    setLocal((prev) => ({ ...prev, phases: prev.phases.filter((p) => p.id !== id) }));
  }

  function handleImport(candidates: PhaseCandidate[], corpus: number, totalInvested: number) {
    const phases = candidatesToPhases(candidates);
    setLocal((prev) => ({
      ...prev,
      phases,
      ...(corpus > 0 ? { referenceCorpus: Math.round(corpus) } : {}),
      ...(totalInvested > 0 ? { referenceInvested: Math.round(totalInvested) } : {}),
    }));
    setImporting(false);
  }

  function save() {
    const sorted = [...local.phases].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    const withEnds = sorted.map((p, i): Phase => {
      if (i >= sorted.length - 1) return { ...p, endDate: null };
      const next = sorted[i + 1].startDate;
      const endYear = next.getMonth() === 0 ? next.getFullYear() - 1 : next.getFullYear();
      const endMonth = next.getMonth() === 0 ? 11 : next.getMonth() - 1;
      return { ...p, endDate: new Date(endYear, endMonth, 28) };
    });
    settings.update({ ...local, phases: withEnds });
    onClose();
  }

  const sorted = [...local.phases].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        <div
          className="flex-1 cursor-pointer"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
        <div
          className="w-full max-w-md flex flex-col overflow-hidden border-l"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b"
            style={{ borderColor: 'var(--border)' }}>
            <div>
              <h2 className="font-bold text-lg" style={{ color: 'var(--text-1)' }}>Your Profile</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                All projections update when you save
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ color: 'var(--text-2)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">

            {/* Account — only show when Supabase is configured */}
            {configured && (
              <Section title="Account">
                {user ? (
                  <div className="flex items-center justify-between rounded-xl border px-4 py-3"
                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border-2)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: 'var(--accent)' }}>
                        {(user.email?.[0] ?? 'U').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[180px]"
                          style={{ color: 'var(--text-1)' }}>{user.email}</p>
                        <p className="text-xs" style={{ color: 'var(--green)' }}>
                          ✓ Synced to cloud
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { signOut(); onClose(); }}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg"
                      style={{ color: 'var(--rose)', background: 'var(--rose-dim)' }}>
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border px-4 py-3 flex items-center justify-between"
                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border-2)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                      Data saved locally only
                    </p>
                    <button
                      onClick={onClose}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
                      Sign in
                    </button>
                  </div>
                )}
              </Section>
            )}

            <Section title="About You">
              <Row label="Birth Year" hint="used to calculate your age at each milestone">
                <NumInput value={local.birthYear} onChange={(v) => setLocal({ ...local, birthYear: v })}
                  min={1970} max={2010} step={1} />
              </Row>
            </Section>

            <Section title="Your SIP Journey">
              {/* Import button */}
              <button
                onClick={() => setImporting(true)}
                className="w-full text-xs py-2 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-all"
                style={{ color: 'var(--text-2)', borderColor: 'var(--border)', background: 'var(--surface-2)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import from CAS Statement
              </button>

              <div className="space-y-2">
                {sorted.map((p, idx) => (
                  <div key={p.id}
                    className="rounded-xl border p-3.5"
                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border-2)', borderLeft: `3px solid ${p.color}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold" style={{ color: p.color }}>
                        Phase {idx + 1}
                      </span>
                      <button
                        disabled={local.phases.length <= 1}
                        onClick={() => removePhase(p.id)}
                        className="text-xs px-2 py-0.5 rounded transition-all"
                        style={{
                          color: local.phases.length <= 1 ? 'var(--text-3)' : 'var(--rose)',
                          opacity: local.phases.length <= 1 ? 0.3 : 1,
                          cursor: local.phases.length <= 1 ? 'default' : 'pointer',
                        }}>
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs mb-1.5" style={{ color: 'var(--text-3)' }}>Starts from</p>
                        <div className="flex gap-1">
                          <select
                            value={p.startDate.getMonth()}
                            onChange={(e) => updatePhaseField(p.id, 'month', +e.target.value)}
                            className="text-xs px-1.5 py-1.5 rounded-lg border outline-none flex-1 min-w-0"
                            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-1)' }}>
                            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                          </select>
                          <input
                            type="number" value={p.startDate.getFullYear()} min={2010} max={2040}
                            onChange={(e) => updatePhaseField(p.id, 'year', +e.target.value)}
                            className="text-xs px-1.5 py-1.5 rounded-lg border outline-none w-[3.8rem]"
                            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-1)' }} />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs mb-1.5" style={{ color: 'var(--text-3)' }}>Monthly SIP (₹)</p>
                        <input
                          type="number" value={p.monthlyAmount} min={0} step={500}
                          onChange={(e) => updatePhaseField(p.id, 'amount', +e.target.value)}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border outline-none"
                          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-1)' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={addPhase}
                className="w-full text-xs py-2.5 rounded-xl border font-semibold transition-all"
                style={{ color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-dim)', borderStyle: 'dashed' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
                + Add Phase
              </button>
            </Section>

            <Section title="Reference Snapshot">
              <p className="text-xs -mt-1" style={{ color: 'var(--text-3)' }}>
                Your actual corpus and amount invested as of your last check — used as an anchor for all projections.
              </p>
              <Row label="Current Corpus">
                <NumInput value={local.referenceCorpus} onChange={(v) => setLocal({ ...local, referenceCorpus: v })}
                  prefix="₹" min={0} step={1000} />
              </Row>
              <Row label="Total Invested">
                <NumInput value={local.referenceInvested} onChange={(v) => setLocal({ ...local, referenceInvested: v })}
                  prefix="₹" min={0} step={1000} />
              </Row>
            </Section>

            <Section title="Return Assumptions">
              <Row label="Historical XIRR" hint={`${(local.historicalXIRR * 100).toFixed(2)}%`}>
                <input type="range" min={4} max={20} step={0.1}
                  value={local.historicalXIRR * 100}
                  onChange={(e) => setLocal({ ...local, historicalXIRR: +e.target.value / 100 })} />
              </Row>
              <Row label="Projected XIRR" hint={`${(local.projectedXIRR * 100).toFixed(1)}%`}>
                <input type="range" min={8} max={18} step={0.5}
                  value={local.projectedXIRR * 100}
                  onChange={(e) => setLocal({ ...local, projectedXIRR: +e.target.value / 100 })} />
              </Row>
            </Section>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => { settings.reset(); setLocal({ ...settings, phases: clonePhases(settings.phases) }); }}
              className="flex-1 text-sm py-2.5 rounded-xl border transition-all font-medium"
              style={{ color: 'var(--text-2)', borderColor: 'var(--border)', background: 'transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Reset to defaults
            </button>
            <button
              onClick={save}
              className="flex-1 text-sm py-2.5 rounded-xl font-semibold text-white transition-all"
              style={{ background: 'var(--accent)' }}
            >
              Save &amp; Apply
            </button>
          </div>
        </div>
      </div>

      {importing && (
        <ImportWizard
          onImport={handleImport}
          onClose={() => setImporting(false)}
        />
      )}
    </>
  );
}
