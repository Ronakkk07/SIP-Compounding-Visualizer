import { useTheme } from '../context/ThemeContext';

type Page = 'journey' | 'arc' | 'simulator' | 'whatif' | 'milestones';

interface Props {
  active: Page;
  onChange: (p: Page) => void;
  onSettings: () => void;
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function Nav({ active, onChange, onSettings }: Props) {
  const { isDark, toggle } = useTheme();

  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-md border-b"
      style={{
        background: isDark ? 'rgba(12,22,38,0.92)' : 'rgba(255,255,255,0.92)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {/* Logo */}
          <div className="mr-6 py-3.5 shrink-0 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'var(--accent)' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M2 12 L6 7 L9 10 L14 3" stroke="white" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-bold text-base tracking-tight"
              style={{ color: 'var(--text-1)' }}>
              FinSight
            </span>
          </div>

          {/* Tabs */}
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className="px-3.5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150"
              style={{
                borderColor: active === t.id ? 'var(--accent)' : 'transparent',
                color: active === t.id ? 'var(--accent)' : 'var(--text-2)',
              }}
              onMouseEnter={(e) => {
                if (active !== t.id)
                  (e.target as HTMLElement).style.color = 'var(--text-1)';
              }}
              onMouseLeave={(e) => {
                if (active !== t.id)
                  (e.target as HTMLElement).style.color = 'var(--text-2)';
              }}
            >
              {t.label}
            </button>
          ))}

          {/* Right actions */}
          <div className="ml-auto pl-4 flex items-center gap-2 shrink-0">
            <button
              onClick={toggle}
              className="p-2 rounded-lg transition-all duration-150"
              style={{ color: 'var(--text-2)' }}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-2)')}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            <button
              onClick={onSettings}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-150"
              style={{
                color: 'var(--text-2)',
                borderColor: 'var(--border)',
                background: 'transparent',
              }}
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
          </div>
        </div>
      </div>
    </nav>
  );
}

export type { Page };
