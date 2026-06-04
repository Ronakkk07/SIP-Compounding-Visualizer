import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
  onSkip: () => void;
}

export default function AuthScreen({ onSkip }: Props) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (mode === 'signin') {
      const err = await signIn(email, password);
      if (err) setError(err);
    } else {
      const err = await signUp(email, password);
      if (err) setError(err);
      else setSuccess('Account created! Check your email to confirm, then sign in.');
    }
    setLoading(false);
  }

  function switchMode() {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError('');
    setSuccess('');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent)' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 12 L6 7 L9 10 L14 3" stroke="white" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="font-bold text-2xl tracking-tight" style={{ color: 'var(--text-1)' }}>
          FinSight
        </span>
      </div>

      {/* Tagline */}
      <p className="text-sm mb-8 text-center max-w-xs" style={{ color: 'var(--text-2)' }}>
        See exactly when your SIP will make more money than you contribute.
      </p>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border p-8"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-1)' }}>
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="text-xs mb-6" style={{ color: 'var(--text-3)' }}>
          {mode === 'signin'
            ? 'Sign in to access your SIP journey from any device'
            : 'Free account — sync your journey across devices'}
        </p>

        {success ? (
          <div className="rounded-xl p-4 text-sm mb-4"
            style={{ background: 'var(--green-dim)', color: 'var(--green)' }}>
            {success}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-2)' }}>
                Email
              </label>
              <input
                type="email" required value={email} autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-1)' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-2)' }}>
                Password
              </label>
              <input
                type="password" required value={password} autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min 6 characters"
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-1)' }}
              />
            </div>

            {error && (
              <p className="text-xs rounded-lg px-3 py-2"
                style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>
                {error}
              </p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity"
              style={{ background: 'var(--accent)', color: '#fff', opacity: loading ? 0.65 : 1 }}>
              {loading
                ? 'Please wait…'
                : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="mt-5 pt-5 border-t text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {mode === 'signin' ? "New here? " : 'Already have an account? '}
            <button onClick={switchMode} className="font-semibold" style={{ color: 'var(--accent)' }}>
              {mode === 'signin' ? 'Create account' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      {/* Skip */}
      <button
        onClick={onSkip}
        className="mt-6 text-xs transition-colors"
        style={{ color: 'var(--text-3)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-2)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
      >
        Continue without account — data saved locally only
      </button>
    </div>
  );
}
