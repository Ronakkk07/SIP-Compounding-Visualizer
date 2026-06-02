import { createContext, useContext, useState, type ReactNode } from 'react';
import { PHASES, REFERENCE, DEFAULTS, type Phase } from '../data/sipData';

export interface UserSettings {
  birthYear: number;
  phases: Phase[];
  referenceCorpus: number;
  referenceInvested: number;
  historicalXIRR: number;
  projectedXIRR: number;
}

interface CtxType extends UserSettings {
  update: (p: Partial<UserSettings>) => void;
  reset: () => void;
}

const defaultSettings: UserSettings = {
  birthYear: DEFAULTS.birthYear,
  phases: PHASES,
  referenceCorpus: REFERENCE.corpus,
  referenceInvested: REFERENCE.totalInvested,
  historicalXIRR: REFERENCE.xirr,
  projectedXIRR: DEFAULTS.projectedXIRR,
};

const Ctx = createContext<CtxType>({ ...defaultSettings, update: () => {}, reset: () => {} });

function revive(raw: UserSettings): UserSettings {
  return {
    ...raw,
    phases: raw.phases.map((p) => ({
      ...p,
      startDate: new Date(p.startDate),
      endDate: p.endDate ? new Date(p.endDate) : null,
    })),
  };
}

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<UserSettings>(() => {
    try {
      const raw = localStorage.getItem('fs-settings');
      return raw ? revive(JSON.parse(raw)) : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  function update(partial: Partial<UserSettings>) {
    const next = { ...s, ...partial };
    setS(next);
    localStorage.setItem('fs-settings', JSON.stringify(next));
  }

  function reset() {
    setS(defaultSettings);
    localStorage.removeItem('fs-settings');
  }

  return <Ctx.Provider value={{ ...s, update, reset }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
