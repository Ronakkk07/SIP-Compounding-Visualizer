import { getYearly, type MonthlyPoint } from './financialCalc';

export interface TaxPoint {
  year: number;
  grossCorpus: number;
  yearlyGain: number;
  yearlyTax: number;
  cumulativeTax: number;
  netCorpus: number;
}

const LTCG_EXEMPTION = 125_000;  // ₹1.25L per year
const LTCG_RATE = 0.125;          // 12.5% post July 2024 budget

export function computePostTaxSeries(data: MonthlyPoint[]): TaxPoint[] {
  const yearly = getYearly(data);
  const result: TaxPoint[] = [];
  let prevCorpus = 0;
  let prevInvested = 0;
  let cumulativeTax = 0;

  for (const pt of yearly) {
    const sipAdded = pt.invested - prevInvested;
    const rawGain = pt.corpus - prevCorpus - sipAdded;

    let yearlyTax = 0;
    if (rawGain > 0 && pt.isProjection) {
      const taxable = Math.max(0, rawGain - LTCG_EXEMPTION);
      yearlyTax = taxable * LTCG_RATE;
    }
    cumulativeTax += yearlyTax;

    result.push({
      year: pt.year,
      grossCorpus: Math.round(pt.corpus),
      yearlyGain: Math.max(0, Math.round(rawGain)),
      yearlyTax: Math.round(yearlyTax),
      cumulativeTax: Math.round(cumulativeTax),
      netCorpus: Math.round(pt.corpus - cumulativeTax),
    });

    prevCorpus = pt.corpus;
    prevInvested = pt.invested;
  }

  return result;
}

export function taxForYear(series: TaxPoint[], year: number): TaxPoint | undefined {
  return series.find((t) => t.year === year);
}
