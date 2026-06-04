import { useState, useRef } from 'react';
import { autoparse, type ParsedPortfolio, type PhaseCandidate } from '../utils/casParser';

interface Props {
  onImport: (phases: PhaseCandidate[], corpus: number, totalInvested: number) => void;
  onClose: () => void;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtAmount(n: number) {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
}

function fmtDate(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

type Step = 'upload' | 'preview' | 'done';

export default function ImportWizard({ onImport, onClose }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedPortfolio | null>(null);
  const [parseError, setParseError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleText(t: string) {
    setText(t);
    setParseError('');
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string ?? '';
      setText(content);
      setParseError('');
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function parse() {
    const result = autoparse(text);
    if (!result || !result.phases.length) {
      setParseError('Could not detect any SIP transactions. Paste your CAMS/KFintech CAS statement text, or a CSV with Date,Amount columns.');
      return;
    }
    setParsed(result);
    setStep('preview');
  }

  function apply() {
    if (!parsed) return;
    onImport(parsed.phases, parsed.corpus, parsed.totalInvested);
    setStep('done');
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>

      <div className="w-full max-w-lg rounded-2xl border flex flex-col max-h-[90vh]"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--text-1)' }}>
              Import from CAS Statement
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              {step === 'upload' && 'Paste your CAMS / KFintech statement text or upload the file'}
              {step === 'preview' && 'Review detected SIP phases before applying'}
              {step === 'done' && 'Import complete'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--text-2)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors"
                style={{
                  borderColor: dragging ? 'var(--accent)' : 'var(--border)',
                  background: dragging ? 'var(--accent-dim)' : 'var(--surface-2)',
                }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef} type="file" accept=".txt,.csv,.text"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round" className="mx-auto mb-2"
                  style={{ color: 'var(--accent)' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                  Drop .txt file or click to browse
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                  CAMS email statement · KFintech CAS · CSV
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>or paste text</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>

              <textarea
                value={text}
                onChange={(e) => handleText(e.target.value)}
                rows={8}
                placeholder="Paste the full text of your CAMS / KFintech CAS statement here…

Example CSV format:
Date,Amount
2022-04-01,1000
2022-05-01,1000
2023-01-01,2000"
                className="w-full px-3 py-2.5 rounded-xl border text-xs outline-none font-mono resize-none"
                style={{
                  background: 'var(--surface-2)', borderColor: 'var(--border)',
                  color: 'var(--text-1)', lineHeight: 1.6,
                }}
              />

              {parseError && (
                <p className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>
                  {parseError}
                </p>
              )}

              <div className="rounded-xl p-4 text-xs space-y-1"
                style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
                <p className="font-semibold" style={{ color: 'var(--text-2)' }}>How to get your CAS statement</p>
                <p>1. Log in to MFCentral (mfcentral.com) → My Account → CAS</p>
                <p>2. Or request from CAMS/KFintech by emailing from your registered email</p>
                <p>3. Open the statement, select all text, paste here</p>
              </div>
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === 'preview' && parsed && (
            <div className="space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Transactions', value: parsed.transactions.length.toString() },
                  { label: 'Total Invested', value: fmtAmount(Math.round(parsed.totalInvested)) },
                  { label: 'Corpus', value: parsed.corpus > 0 ? fmtAmount(Math.round(parsed.corpus)) : '—' },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl border p-3 text-center"
                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border-2)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{c.label}</p>
                    <p className="font-bold text-base mt-0.5" style={{ color: 'var(--text-1)' }}>{c.value}</p>
                  </div>
                ))}
              </div>

              {/* Detected phases */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: 'var(--text-3)' }}>
                  Detected SIP Phases
                </p>
                <div className="space-y-2">
                  {parsed.phases.map((p, i) => {
                    const nextStart = parsed.phases[i + 1]?.startDate;
                    return (
                      <div key={i}
                        className="flex items-center justify-between rounded-xl border px-4 py-3"
                        style={{ background: 'var(--surface-2)', borderColor: 'var(--border-2)' }}>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
                            Phase {i + 1}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                            {fmtDate(p.startDate)}
                            {nextStart ? ` → ${fmtDate(new Date(nextStart.getFullYear(), nextStart.getMonth() - 1, 1))}` : ' → ongoing'}
                          </p>
                        </div>
                        <p className="font-bold text-sm" style={{ color: 'var(--accent)' }}>
                          {fmtAmount(p.monthlyAmount)}/mo
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {parsed.corpus === 0 && (
                <p className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: 'var(--gold-dim)', color: 'var(--gold)' }}>
                  Corpus not found in statement — update it manually in Profile → Reference Snapshot after import.
                </p>
              )}
            </div>
          )}

          {/* STEP 3: Done */}
          {step === 'done' && (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--green-dim)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" style={{ color: 'var(--green)' }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="font-bold text-base mb-2" style={{ color: 'var(--text-1)' }}>
                Import successful
              </p>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                Your SIP phases have been updated. Click Save &amp; Apply in Profile to confirm.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
          {step === 'upload' && (
            <>
              <button onClick={onClose}
                className="flex-1 text-sm py-2.5 rounded-xl border font-medium"
                style={{ color: 'var(--text-2)', borderColor: 'var(--border)', background: 'transparent' }}>
                Cancel
              </button>
              <button
                onClick={parse} disabled={!text.trim()}
                className="flex-1 text-sm py-2.5 rounded-xl font-semibold transition-opacity"
                style={{ background: 'var(--accent)', color: '#fff', opacity: text.trim() ? 1 : 0.4 }}>
                Parse Statement
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => setStep('upload')}
                className="flex-1 text-sm py-2.5 rounded-xl border font-medium"
                style={{ color: 'var(--text-2)', borderColor: 'var(--border)', background: 'transparent' }}>
                ← Back
              </button>
              <button onClick={apply}
                className="flex-1 text-sm py-2.5 rounded-xl font-semibold"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                Apply Phases
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose}
              className="flex-1 text-sm py-2.5 rounded-xl font-semibold"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
