export interface Phase {
  id: number;
  label: string;
  startDate: Date;
  endDate: Date | null;
  monthlyAmount: number;
  color: string;
  note: string;
}

export const PHASES: Phase[] = [
  {
    id: 1,
    label: 'Phase 1',
    startDate: new Date(2022, 3, 1),
    endDate: new Date(2024, 7, 31),
    monthlyAmount: 1000,
    color: '#818cf8',
    note: 'Started small — building the habit',
  },
  {
    id: 2,
    label: 'Phase 2',
    startDate: new Date(2024, 8, 1),
    endDate: new Date(2025, 3, 30),
    monthlyAmount: 2000,
    color: '#a78bfa',
    note: 'First step-up — doubled the commitment',
  },
  {
    id: 3,
    label: 'Phase 3',
    startDate: new Date(2025, 4, 1),
    endDate: new Date(2026, 3, 30),
    monthlyAmount: 5000,
    color: '#38bdf8',
    note: 'Major step-up — 2.5× increase',
  },
  {
    id: 4,
    label: 'Phase 4',
    startDate: new Date(2026, 4, 1),
    endDate: new Date(2026, 9, 31),
    monthlyAmount: 7000,
    color: '#34d399',
    note: 'Current phase',
  },
  {
    id: 5,
    label: 'Phase 5',
    startDate: new Date(2026, 10, 1),
    endDate: new Date(2027, 11, 31),
    monthlyAmount: 10000,
    color: '#fbbf24',
    note: 'Pre-job acceleration',
  },
  {
    id: 6,
    label: 'Phase 6',
    startDate: new Date(2028, 0, 1),
    endDate: null,
    monthlyAmount: 20000,
    color: '#fb923c',
    note: 'Post-job target',
  },
];

export const REFERENCE = {
  date: new Date(2026, 4, 1),
  corpus: 120233,
  totalInvested: 104995,
  xirr: 0.1056,
};

export const DEFAULTS = {
  birthYear: 2003,
  projectedXIRR: 0.12,
};

export const MILESTONES = [
  { label: '₹2L', value: 200000 },
  { label: '₹5L', value: 500000 },
  { label: '₹10L', value: 1000000 },
  { label: '₹25L', value: 2500000 },
  { label: '₹50L', value: 5000000 },
  { label: '₹1 Cr', value: 10000000 },
];
