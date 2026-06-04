import { PHASES, REFERENCE, DEFAULTS, type Phase } from '../data/sipData';

export interface MonthlyPoint {
  date: Date;
  label: string;
  year: number;
  month: number;
  invested: number;
  corpus: number;
  returns: number;
  contribution: number;
  phaseId: number;
  isProjection: boolean;
  annualReturns: number;
  annualSIP: number;
  age: number;
}

export interface SimOptions {
  projectedXIRR?: number;
  endYear?: number;
  phases?: Phase[];
  lumpSum?: { date: Date; amount: number };
  pauseStart?: Date;
  pauseEnd?: Date;
  shiftStartYears?: number;
  birthYear?: number;
  referenceCorpus?: number;
  referenceInvested?: number;
  historicalXIRR?: number;
  xirrSchedule?: { startDate: Date; endDate: Date | null; rate: number }[];
  stepUpPercent?: number;
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getPhase(d: Date, phases: Phase[]): Phase | undefined {
  const sorted = [...phases].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  let match: Phase | undefined;
  for (const p of sorted) {
    if (d >= p.startDate) match = p;
    else break;
  }
  return match;
}

function getScheduledRate(d: Date, schedule: SimOptions['xirrSchedule'], fallback: number): number {
  if (!schedule) return fallback;
  const match = schedule.find(
    (s) => d >= s.startDate && (s.endDate === null || d <= s.endDate)
  );
  return match ? match.rate : fallback;
}

export function formatINR(v: number, compact = true): string {
  if (compact) {
    if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)}Cr`;
    if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
    if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}K`;
    return `₹${Math.round(v)}`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function simulate(opts: SimOptions = {}): MonthlyPoint[] {
  const {
    projectedXIRR = DEFAULTS.projectedXIRR,
    endYear = 2042,
    phases = PHASES,
    lumpSum,
    pauseStart,
    pauseEnd,
    shiftStartYears = 0,
    birthYear = DEFAULTS.birthYear,
    referenceCorpus = REFERENCE.corpus,
    referenceInvested = REFERENCE.totalInvested,
    historicalXIRR = REFERENCE.xirr,
    xirrSchedule,
    stepUpPercent = 0,
  } = opts;

  const sortedPhases = [...phases].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const baseStart = sortedPhases[0]?.startDate ?? new Date(2022, 3, 1);
  const simStart = new Date(baseStart.getFullYear() - shiftStartYears, baseStart.getMonth(), 1);
  const refDate = REFERENCE.date;
  const endDate = new Date(endYear, 11, 1);

  let corpus = 0;
  let invested = 0;
  let cur = new Date(simStart);
  const data: MonthlyPoint[] = [];

  while (cur <= endDate) {
    const isProjection = cur > refDate;

    const annualRate = isProjection
      ? getScheduledRate(cur, xirrSchedule, projectedXIRR)
      : historicalXIRR;
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

    const paused = pauseStart && pauseEnd && cur >= pauseStart && cur <= pauseEnd;
    const phase = getPhase(cur, phases);
    const baseAmount = phase?.monthlyAmount ?? 0;
    const yearsSinceSIPStart = Math.max(0, cur.getFullYear() - baseStart.getFullYear());
    const stepFactor = stepUpPercent > 0 ? Math.pow(1 + stepUpPercent / 100, yearsSinceSIPStart) : 1;
    const contribution = paused ? 0 : Math.round(baseAmount * stepFactor);

    if (!isProjection && sameMonth(cur, refDate)) {
      corpus = referenceCorpus;
      invested = referenceInvested;
    } else {
      if (lumpSum && sameMonth(cur, lumpSum.date)) {
        corpus += lumpSum.amount;
        invested += lumpSum.amount;
      }
      corpus = corpus * (1 + monthlyRate) + contribution;
      invested += contribution;
    }

    const annualSIP = (phase?.monthlyAmount ?? 0) * 12;
    const annualReturns = corpus * projectedXIRR;

    data.push({
      date: new Date(cur),
      label: formatDate(cur),
      year: cur.getFullYear(),
      month: cur.getMonth(),
      invested,
      corpus,
      returns: corpus - invested,
      contribution,
      phaseId: phase?.id ?? 0,
      isProjection,
      annualReturns,
      annualSIP,
      age: cur.getFullYear() - birthYear,
    });

    cur = addMonths(cur, 1);
  }

  return data;
}

export interface StageInfo {
  stage: number;
  label: string;
  shortLabel: string;
  date: Date;
  age: number;
  corpus: number;
  annualReturns: number;
  annualSIP: number;
  description: string;
  psyche: string;
}

export function computeStages(data: MonthlyPoint[]): StageInfo[] {
  const stages: StageInfo[] = [];
  const proj = data.filter((d) => d.isProjection);

  const crossover = proj.find((d) => d.annualReturns > d.annualSIP);
  const accel = proj.find((d) => d.annualReturns > 2 * d.annualSIP);
  const crore = proj.find((d) => d.corpus >= 10_000_000);

  const stage1End = data.find((d) => d.returns > 5000) ?? data[11];
  const stage2End = crossover
    ? data.find((_d, i) => data[i + 1] === crossover)
    : undefined;

  stages.push({
    stage: 1,
    label: 'Quiet Phase',
    shortLabel: 'Quiet',
    date: stage1End.date,
    age: stage1End.age,
    corpus: stage1End.corpus,
    annualReturns: stage1End.annualReturns,
    annualSIP: stage1End.annualSIP,
    description: 'Returns are invisible. SIP contributions dominate the corpus. Every rupee in looks almost the same as the rupee out.',
    psyche: "This is where most people quit — nothing feels like it's happening. But compounding is silently loading.",
  });

  if (stage2End) {
    stages.push({
      stage: 2,
      label: 'Snowball',
      shortLabel: 'Snowball',
      date: stage2End.date,
      age: stage2End.age,
      corpus: stage2End.corpus,
      annualReturns: stage2End.annualReturns,
      annualSIP: stage2End.annualSIP,
      description: 'Momentum is building. The corpus is visibly growing each month. Returns are becoming a meaningful fraction of invested.',
      psyche: 'You notice the number moving faster than expected. The habit is paying off — emotionally and mathematically.',
    });
  }

  if (crossover) {
    stages.push({
      stage: 3,
      label: 'Crossover',
      shortLabel: 'Crossover',
      date: crossover.date,
      age: crossover.age,
      corpus: crossover.corpus,
      annualReturns: crossover.annualReturns,
      annualSIP: crossover.annualSIP,
      description: 'Annual returns now exceed the annual SIP contribution. The market is adding more to your wealth than you are.',
      psyche: "The hockey stick inflects here. Money starts making money faster than you can earn it.",
    });
  }

  if (accel) {
    stages.push({
      stage: 4,
      label: 'Acceleration',
      shortLabel: 'Accel',
      date: accel.date,
      age: accel.age,
      corpus: accel.corpus,
      annualReturns: accel.annualReturns,
      annualSIP: accel.annualSIP,
      description: 'Annual returns are 2× the annual SIP. Even if you stopped contributing, the corpus would still grow at twice your SIP rate.',
      psyche: "You've crossed the point of no return. Financial independence is no longer abstract — it's a date.",
    });
  }

  if (crore) {
    stages.push({
      stage: 5,
      label: '₹1 Crore',
      shortLabel: '₹1Cr',
      date: crore.date,
      age: crore.age,
      corpus: crore.corpus,
      annualReturns: crore.annualReturns,
      annualSIP: crore.annualSIP,
      description: `Annual returns of ${formatINR(crore.annualReturns)} — more than most salaries, generated passively.`,
      psyche: "The corpus itself is now a wealth engine. What took years of saving now happens in months from returns alone.",
    });
  }

  return stages;
}

export function findMilestone(data: MonthlyPoint[], target: number): MonthlyPoint | undefined {
  return data.find((d) => d.corpus >= target);
}

export function corpusAt(data: MonthlyPoint[], year: number): number {
  const pts = data.filter((d) => d.year === year);
  return pts[pts.length - 1]?.corpus ?? 0;
}

export function getYearly(data: MonthlyPoint[]): MonthlyPoint[] {
  const seen = new Set<number>();
  const result: MonthlyPoint[] = [];
  for (const d of [...data].reverse()) {
    if (!seen.has(d.year)) {
      seen.add(d.year);
      result.unshift(d);
    }
  }
  return result;
}
