interface Props {
  label: string;
  value: string;
  sub?: string;
  tone?: 'accent' | 'green' | 'gold' | 'rose' | 'neutral';
  large?: boolean;
}

const toneVars: Record<NonNullable<Props['tone']>, { value: string; bg: string }> = {
  accent:  { value: 'var(--accent)', bg: 'var(--accent-dim)' },
  green:   { value: 'var(--green)',  bg: 'var(--green-dim)'  },
  gold:    { value: 'var(--gold)',   bg: 'var(--gold-dim)'   },
  rose:    { value: 'var(--rose)',   bg: 'var(--rose-dim)'   },
  neutral: { value: 'var(--text-2)', bg: 'var(--surface-2)'  },
};

export default function MetricCard({ label, value, sub, tone = 'accent', large }: Props) {
  const { value: color } = toneVars[tone];
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-2"
        style={{ color: 'var(--text-3)' }}
      >
        {label}
      </p>
      <p
        className={`font-bold leading-none ${large ? 'text-3xl' : 'text-2xl'}`}
        style={{ color }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}
