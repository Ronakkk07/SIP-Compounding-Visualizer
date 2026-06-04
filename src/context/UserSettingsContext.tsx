import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { PHASES, REFERENCE, DEFAULTS, type Phase } from '../data/sipData';
import { supabase } from '../lib/supabase';

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

export function revive(raw: UserSettings): UserSettings {
  return {
    ...raw,
    phases: raw.phases.map((p) => ({
      ...p,
      startDate: new Date(p.startDate),
      endDate: p.endDate ? new Date(p.endDate) : null,
    })),
  };
}

function fromDB(row: Record<string, unknown>): UserSettings {
  return revive({
    birthYear: row.birth_year as number,
    phases: row.phases as Phase[],
    referenceCorpus: row.reference_corpus as number,
    referenceInvested: row.reference_invested as number,
    historicalXIRR: row.historical_xirr as number,
    projectedXIRR: row.projected_xirr as number,
  });
}

function toDB(userId: string, s: UserSettings) {
  return {
    id: userId,
    birth_year: s.birthYear,
    phases: s.phases,
    reference_corpus: s.referenceCorpus,
    reference_invested: s.referenceInvested,
    historical_xirr: s.historicalXIRR,
    projected_xirr: s.projectedXIRR,
  };
}

interface ProviderProps {
  children: ReactNode;
  userId?: string;
}

export function UserSettingsProvider({ children, userId }: ProviderProps) {
  const [s, setS] = useState<UserSettings>(() => {
    try {
      const raw = localStorage.getItem('fs-settings');
      return raw ? revive(JSON.parse(raw)) : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  // Sync from cloud on login
  useEffect(() => {
    if (!userId || !supabase) return;
    supabase
      .from('user_settings')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          const revived = fromDB(data as Record<string, unknown>);
          setS(revived);
          localStorage.setItem('fs-settings', JSON.stringify(revived));
        } else {
          // First login — seed cloud with current local settings
          supabase!.from('user_settings').insert(toDB(userId, s));
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function update(partial: Partial<UserSettings>) {
    const next = { ...s, ...partial };
    setS(next);
    localStorage.setItem('fs-settings', JSON.stringify(next));
    if (userId && supabase) {
      supabase.from('user_settings').upsert(toDB(userId, next));
    }
  }

  function reset() {
    setS(defaultSettings);
    localStorage.removeItem('fs-settings');
    if (userId && supabase) {
      supabase.from('user_settings').upsert(toDB(userId, defaultSettings));
    }
  }

  return <Ctx.Provider value={{ ...s, update, reset }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
