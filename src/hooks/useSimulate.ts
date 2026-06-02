import { useSettings } from '../context/UserSettingsContext';
import { simulate, type SimOptions } from '../utils/financialCalc';

export function useSimulate() {
  const s = useSettings();
  return (opts: SimOptions = {}) =>
    simulate({
      projectedXIRR: s.projectedXIRR,
      birthYear: s.birthYear,
      phases: s.phases,
      referenceCorpus: s.referenceCorpus,
      referenceInvested: s.referenceInvested,
      historicalXIRR: s.historicalXIRR,
      ...opts,
    });
}
