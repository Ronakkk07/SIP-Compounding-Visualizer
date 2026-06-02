import { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { UserSettingsProvider } from './context/UserSettingsContext';
import Nav, { type Page } from './components/Nav';
import SettingsModal from './components/SettingsModal';
import MyJourney from './pages/MyJourney';
import CompoundingArc from './pages/CompoundingArc';
import StrategySimulator from './pages/StrategySimulator';
import WhatIfExplorer from './pages/WhatIfExplorer';
import MilestoneTracker from './pages/MilestoneTracker';

function Shell() {
  const [page, setPage] = useState<Page>('journey');
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Nav active={page} onChange={setPage} onSettings={() => setSettingsOpen(true)} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {page === 'journey'    && <MyJourney />}
        {page === 'arc'        && <CompoundingArc />}
        {page === 'simulator'  && <StrategySimulator />}
        {page === 'whatif'     && <WhatIfExplorer />}
        {page === 'milestones' && <MilestoneTracker />}
      </main>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <UserSettingsProvider>
        <Shell />
      </UserSettingsProvider>
    </ThemeProvider>
  );
}
