import { useState, useRef, useEffect, useMemo } from 'react';
import { useSettings } from '../context/UserSettingsContext';
import { useSimulate } from '../hooks/useSimulate';
import { computeStages } from '../utils/financialCalc';
import { buildContext, queryCoach, type CoachMsg } from '../utils/aiCoach';

const GROQ_KEY = import.meta.env.VITE_GROQ_KEY as string | undefined;

const QUICK_QS = [
  'When is my crossover year?',
  'How much extra SIP to reach ₹1Cr by 40?',
  'What happens if I pause SIP 6 months?',
  'How does 10% annual step-up change my arc?',
  'Should I add ₹50K lump sum now?',
];

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export default function AICoachPanel() {
  const settings = useSettings();
  const sim = useSimulate();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<CoachMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => sim({ endYear: 2042 }), [sim]);
  const stages = useMemo(() => computeStages(data), [data]);
  const context = useMemo(() => {
    const corpus = settings.referenceCorpus;
    return buildContext(settings, stages, corpus);
  }, [settings, stages]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    if (!GROQ_KEY || GROQ_KEY.includes('your-groq')) {
      setMsgs((m) => [...m,
        { role: 'user', text: question },
        { role: 'assistant', text: 'Add VITE_GROQ_KEY=gsk_xxxx to your .env.local and restart. Get a free key at console.groq.com (no credit card needed).' },
      ]);
      setInput('');
      return;
    }

    setMsgs((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const reply = await queryCoach(question, context, GROQ_KEY!);
      setMsgs((m) => [...m, { role: 'assistant', text: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setError(msg);
      setMsgs((m) => [...m, { role: 'assistant', text: `⚠ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  const configured = GROQ_KEY && !GROQ_KEY.includes('your-groq');

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-transform"
        style={{
          background: open ? 'var(--surface-2)' : 'var(--accent)',
          color: open ? 'var(--accent)' : '#fff',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          transform: open ? 'rotate(45deg)' : 'none',
        }}
        title="AI Coach"
      >
        {open
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          : <SparkleIcon />}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 rounded-2xl border flex flex-col"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
            width: 'min(360px, calc(100vw - 3rem))',
            maxHeight: '65vh',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-dim)' }}>
                <SparkleIcon />
              </div>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>AI Coach</span>
              <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>Beta</span>
            </div>
            {!configured && (
              <span className="text-xs" style={{ color: 'var(--gold)' }}>⚠ No HF token</span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {msgs.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Ask anything about your SIP journey.
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                  Context: {context.split(',').slice(0, 2).join(',')}…
                </p>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                  style={{
                    background: m.role === 'user' ? 'var(--accent)' : 'var(--surface-2)',
                    color: m.role === 'user' ? '#fff' : 'var(--text-1)',
                    borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl px-3 py-2 text-xs flex items-center gap-1.5"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)', animationDelay: '0.2s' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)', animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            {error && !loading && (
              <p className="text-xs text-center" style={{ color: 'var(--rose)' }}>{error}</p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick question chips */}
          {msgs.length === 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_QS.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  disabled={loading}
                  className="text-xs px-2.5 py-1.5 rounded-xl border transition-all"
                  style={{
                    borderColor: 'var(--border)', background: 'var(--surface-2)',
                    color: 'var(--text-2)', opacity: loading ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } }}
              placeholder="Ask about your SIP…"
              className="flex-1 text-xs px-3 py-2 rounded-xl border outline-none"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-1)' }}
            />
            <button
              onClick={() => ask(input)}
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-opacity text-white"
              style={{ background: 'var(--accent)', opacity: !input.trim() || loading ? 0.4 : 1 }}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
