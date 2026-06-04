import { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserSettingsProvider } from './context/UserSettingsContext';
import AuthScreen from './components/AuthScreen';
import Nav, { type Page } from './components/Nav';
import SettingsModal from './components/SettingsModal';
import AICoachPanel from './components/AICoachPanel';
import MyJourney from './pages/MyJourney';
import CompoundingArc from './pages/CompoundingArc';
import StrategySimulator from './pages/StrategySimulator';
import WhatIfExplorer from './pages/WhatIfExplorer';
import MilestoneTracker from './pages/MilestoneTracker';

function Shell() {
  const { user, loading, configured, signOut } = useAuth();
  const [page, setPage] = useState<Page>('journey');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [skipped, setSkipped] = useState(
    () => !configured || sessionStorage.getItem('fs-skip-auth') === '1'
  );

  function handleSkip() {
    sessionStorage.setItem('fs-skip-auth', '1');
    setSkipped(true);
  }

  // Show loading spinner while Supabase resolves session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  // Show auth screen if Supabase is configured, no user, and user hasn't skipped
  if (configured && !user && !skipped) {
    return <AuthScreen onSkip={handleSkip} />;
  }

  return (
    <UserSettingsProvider userId={user?.id}>
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <Nav
          active={page}
          onChange={setPage}
          onSettings={() => setSettingsOpen(true)}
          user={user}
          onSignOut={signOut}
        />
        <main className="max-w-5xl mx-auto px-4 py-8">
          {page === 'journey'    && <MyJourney />}
          {page === 'arc'        && <CompoundingArc />}
          {page === 'simulator'  && <StrategySimulator />}
          {page === 'whatif'     && <WhatIfExplorer />}
          {page === 'milestones' && <MilestoneTracker />}
        </main>
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <AICoachPanel />
      </div>
    </UserSettingsProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ThemeProvider>
  );
}
