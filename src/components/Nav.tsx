import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import type { User } from '@supabase/supabase-js';

type Page = 'journey' | 'arc' | 'simulator' | 'whatif' | 'milestones';

interface Props {
  active: Page;
  onChange: (p: Page) => void;
  onSettings: () => void;
  user: User | null;
  onSignOut: () => void;
}

const tabs: { id: Page; label: string }[] = [
  { id: 'journey',    label: 'My Journey' },
  { id: 'arc',        label: 'Compounding Arc' },
  { id: 'simulator',  label: 'Simulator' },
  { id: 'whatif',     label: 'What-If' },
  { id: 'milestones', label: 'Milestones' },
];

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function UserMenu({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (user.email?.[0] ?? 'U').toUpperCase();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white select-none"
        style={{ background: 'var(--accent)' }}
        title={user.email}
      >
        {initial}
      </button>

      {open && (
        <div
          className="absolute right-0 top-9 w-52 rounded-xl border"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 200,
          }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>
              {user.email}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--green)' }}>✓ Cloud synced</p>
          </div>
          <button
            onClick={() => { setOpen(false); onSignOut(); }}
            className="w-full text-left px-4 py-3 text-xs font-medium rounded-b-xl"
            style={{ color: 'var(--rose)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--rose-dim)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Nav({ active, onChange, onSettings, user, onSignOut }: Props) {
  const { isDark, toggle } = useTheme();

  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-md border-b"
      style={{
        background: isDark ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.92)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center">

          {/* Logo — fixed, never scrolls */}
          <div className="mr-4 shrink-0 flex items-center gap-2 py-3.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'var(--accent)' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M2 12 L6 7 L9 10 L14 3" stroke="white" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text-1)' }}>
              FinSight
            </span>
          </div>

          {/* Tabs — scrollable middle section */}
          <div
            className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto self-stretch"
            style={{ scrollbarWidth: 'none' }}
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                className="px-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 self-stretch flex items-center"
                style={{
                  borderColor: active === t.id ? 'var(--accent)' : 'transparent',
                  color: active === t.id ? 'var(--accent)' : 'var(--text-2)',
                }}
                onMouseEnter={(e) => { if (active !== t.id) (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'; }}
                onMouseLeave={(e) => { if (active !== t.id) (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Right actions — fixed, dropdown-safe (not inside overflow container) */}
          <div className="pl-4 shrink-0 flex items-center gap-2.5">
            <button
              onClick={toggle}
              className="p-2 rounded-lg transition-all duration-150"
              style={{ color: 'var(--text-2)' }}
              title={isDark ? 'Light mode' : 'Dark mode'}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-2)')}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            <button
              onClick={onSettings}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-150"
              style={{ color: 'var(--text-2)', borderColor: 'var(--border)', background: 'transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--accent)';
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.background = 'var(--accent-dim)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-2)';
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <GearIcon />
              Profile
            </button>

            {user && <UserMenu user={user} onSignOut={onSignOut} />}
          </div>
        </div>
      </div>
    </nav>
  );
}

export type { Page };
