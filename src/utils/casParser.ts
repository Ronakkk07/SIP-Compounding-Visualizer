export interface CasTransaction {
  date: Date;
  amount: number;
}

export interface PhaseCandidate {
  startDate: Date;
  monthlyAmount: number;
}

export interface ParsedPortfolio {
  transactions: CasTransaction[];
  phases: PhaseCandidate[];
  corpus: number;
  totalInvested: number;
  statementDate: Date;
}

function parseMonthStr(mon: string): number {
  const m: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  return m[mon.toLowerCase()] ?? -1;
}

function detectPhases(transactions: CasTransaction[]): PhaseCandidate[] {
  if (!transactions.length) return [];

  // Group SIP amounts by month, summing multiple SIPs in same month
  const monthly = new Map<string, { date: Date; total: number }>();
  for (const t of transactions) {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth()).padStart(2, '0')}`;
    if (!monthly.has(key)) {
      monthly.set(key, { date: new Date(t.date.getFullYear(), t.date.getMonth(), 1), total: 0 });
    }
    monthly.get(key)!.total += t.amount;
  }

  const sorted = [...monthly.values()].sort((a, b) => a.date.getTime() - b.date.getTime());

  const phases: PhaseCandidate[] = [];
  let prevAmount = -1;

  for (const { date, total } of sorted) {
    const rounded = Math.round(total / 500) * 500; // round to nearest ₹500
    if (prevAmount < 0 || Math.abs(rounded - prevAmount) / Math.max(prevAmount, 1) > 0.08) {
      phases.push({ startDate: date, monthlyAmount: rounded });
      prevAmount = rounded;
    }
  }

  return phases;
}

// Parse CAMS / KFintech Consolidated Account Statement text
export function parseCAS(text: string): ParsedPortfolio | null {
  const transactions: CasTransaction[] = [];

  // Match: DD-Mon-YYYY followed by SIP/Purchase keyword then amount
  // Handles various CAMS formats
  const txnRe = /(\d{2})[- ]([A-Za-z]{3})[- ](\d{4})\s+(?:[^\n]*?(?:SIP|Purchase|Systematic)[^\n]*?\s+)?([\d,]+\.\d{2})/gi;

  let match;
  while ((match = txnRe.exec(text)) !== null) {
    const day = parseInt(match[1]);
    const month = parseMonthStr(match[2]);
    const year = parseInt(match[3]);
    const amount = parseFloat(match[4].replace(/,/g, ''));

    if (month === -1 || isNaN(amount) || amount < 100 || amount > 10_000_000) continue;
    transactions.push({ date: new Date(year, month, day), amount });
  }

  if (!transactions.length) return null;

  // Extract corpus from closing balance
  let corpus = 0;
  const closingRe = /Closing Balance[\s\S]{0,200}?(?:₹\s*)?([\d,]+\.\d{2})\s*$/im;
  const closingMatch = text.match(closingRe);
  if (closingMatch) corpus = parseFloat(closingMatch[1].replace(/,/g, ''));

  // Fall back: look for total portfolio value line
  if (!corpus) {
    const totalRe = /Total\s+Portfolio\s+Value[^\d]*([\d,]+\.\d{2})/i;
    const tm = text.match(totalRe);
    if (tm) corpus = parseFloat(tm[1].replace(/,/g, ''));
  }

  // Statement "To" date
  let statementDate = new Date();
  const toDateRe = /(?:To|As\s+on|Up\s+to)\s+(\d{2})[- ]([A-Za-z]{3})[- ](\d{4})/i;
  const tdm = text.match(toDateRe);
  if (tdm) {
    const m = parseMonthStr(tdm[2]);
    if (m !== -1) statementDate = new Date(parseInt(tdm[3]), m, parseInt(tdm[1]));
  }

  const phases = detectPhases(transactions);
  const totalInvested = transactions.reduce((s, t) => s + t.amount, 0);

  return { transactions, phases, corpus, totalInvested, statementDate };
}

// Parse simple CSV: Date,Amount (one transaction per row)
export function parseCSV(text: string): ParsedPortfolio | null {
  const transactions: CasTransaction[] = [];
  const lines = text.trim().split('\n');

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.toLowerCase().startsWith('date')) continue;

    const parts = line.split(',');
    if (parts.length < 2) continue;

    const date = new Date(parts[0].trim());
    const amount = parseFloat(parts[1].trim().replace(/[₹\s,]/g, ''));

    if (isNaN(date.getTime()) || isNaN(amount) || amount <= 0) continue;
    transactions.push({ date, amount });
  }

  if (!transactions.length) return null;

  const phases = detectPhases(transactions);
  const totalInvested = transactions.reduce((s, t) => s + t.amount, 0);

  return { transactions, phases, corpus: 0, totalInvested, statementDate: new Date() };
}

export function autoparse(text: string): ParsedPortfolio | null {
  return parseCAS(text) ?? parseCSV(text);
}
