// 確定申告 計算エンジン（令和7年分以降の所得税制を実装）
// 注意: 本ツールは試算用です。実際の申告は国税庁の確定申告書等作成コーナー等で確認してください。

import type {
  BusinessInput, SalaryInput, DeductionInput, DeductionBreakdown,
  TaxResult, FixedAsset,
} from './types';

const floorTo = (n: number, unit: number) => Math.floor(n / unit) * unit;

/** 給与所得控除（令和7年分改正後: 最低保障65万円） */
export function salaryDeduction(gross: number): number {
  if (gross <= 0) return 0;
  let d: number;
  if (gross <= 1_900_000) d = 650_000;
  else if (gross <= 3_600_000) d = gross * 0.3 + 80_000;
  else if (gross <= 6_600_000) d = gross * 0.2 + 440_000;
  else if (gross <= 8_500_000) d = gross * 0.1 + 1_100_000;
  else d = 1_950_000;
  return Math.min(Math.floor(d), gross);
}

export function salaryIncome(gross: number): number {
  return Math.max(0, gross - salaryDeduction(gross));
}

/** 定額法による当年分の減価償却費（対象年で計算） */
export function depreciationForYear(asset: FixedAsset, taxYear: number): number {
  const acquired = new Date(asset.acquisitionDate);
  if (isNaN(acquired.getTime()) || asset.acquisitionCost <= 0 || asset.usefulLifeYears <= 0) return 0;
  const acqYear = acquired.getFullYear();
  if (acqYear > taxYear) return 0;

  const rate = 1 / asset.usefulLifeYears;
  const annual = asset.acquisitionCost * rate;
  // 取得年は月割（取得月を含む）
  const monthsFirstYear = 13 - (acquired.getMonth() + 1);
  const firstYearAmount = (annual * monthsFirstYear) / 12;

  // 償却累計を計算し、残存簿価1円まで
  let accumulated = 0;
  let current = 0;
  for (let y = acqYear; y <= taxYear; y++) {
    const raw = y === acqYear ? firstYearAmount : annual;
    const remaining = asset.acquisitionCost - 1 - accumulated;
    current = Math.max(0, Math.min(Math.floor(raw), remaining));
    accumulated += current;
  }
  return Math.floor(current * asset.businessUseRatio);
}

export interface BusinessResult {
  revenue: number;
  expenses: number;
  depreciation: number;
  profit: number; // 青色控除前
  blueDeduction: number;
  income: number; // 事業所得
}

export function businessIncome(input: BusinessInput, taxYear: number): BusinessResult {
  const revenue = input.revenues.reduce((s, r) => s + r.amount, 0);
  const expenses = input.expenses.reduce((s, e) => s + e.amount, 0);
  const depreciation = input.assets.reduce((s, a) => s + depreciationForYear(a, taxYear), 0);
  const profit = revenue - expenses - depreciation;
  // 青色申告特別控除は事業所得の黒字を限度に適用
  const blueDeduction = Math.max(0, Math.min(input.blueDeductionType * 10_000, profit));
  return { revenue, expenses, depreciation, profit, income: profit - blueDeduction, blueDeduction };
}

/** 基礎控除（令和7・8年分: 上乗せ特例込み） */
export function basicDeduction(totalIncome: number): number {
  if (totalIncome <= 1_320_000) return 950_000;
  if (totalIncome <= 3_360_000) return 880_000;
  if (totalIncome <= 4_890_000) return 680_000;
  if (totalIncome <= 6_550_000) return 630_000;
  if (totalIncome <= 23_500_000) return 580_000;
  if (totalIncome <= 24_000_000) return 480_000;
  if (totalIncome <= 24_500_000) return 320_000;
  if (totalIncome <= 25_000_000) return 160_000;
  return 0;
}

/** 住民税の基礎控除（改正なし: 43万円） */
export function basicDeductionResident(totalIncome: number): number {
  if (totalIncome <= 24_000_000) return 430_000;
  if (totalIncome <= 24_500_000) return 290_000;
  if (totalIncome <= 25_000_000) return 150_000;
  return 0;
}

/** 生命保険料控除（新制度）1区分あたり */
export function lifeInsuranceOne(paid: number, capUnit: number): number {
  // capUnit: 所得税 40,000 / 住民税 28,000
  const p = paid;
  let d: number;
  if (capUnit === 40_000) {
    if (p <= 20_000) d = p;
    else if (p <= 40_000) d = p / 2 + 10_000;
    else if (p <= 80_000) d = p / 4 + 20_000;
    else d = 40_000;
  } else {
    if (p <= 12_000) d = p;
    else if (p <= 32_000) d = p / 2 + 6_000;
    else if (p <= 56_000) d = p / 4 + 14_000;
    else d = 28_000;
  }
  return Math.floor(d);
}

export function lifeInsuranceDeduction(
  general: number, care: number, pension: number, forResident: boolean,
): number {
  const unit = forResident ? 28_000 : 40_000;
  const total = lifeInsuranceOne(general, unit) + lifeInsuranceOne(care, unit) + lifeInsuranceOne(pension, unit);
  return Math.min(total, forResident ? 70_000 : 120_000);
}

export function earthquakeDeduction(paid: number, forResident: boolean): number {
  return forResident ? Math.min(Math.floor(paid / 2), 25_000) : Math.min(paid, 50_000);
}

export function medicalDeduction(paid: number, reimbursed: number, totalIncome: number): number {
  const threshold = Math.min(100_000, Math.floor(totalIncome * 0.05));
  return Math.max(0, Math.min(paid - reimbursed - threshold, 2_000_000));
}

export function donationDeduction(paid: number, totalIncome: number): number {
  return Math.max(0, Math.min(paid, Math.floor(totalIncome * 0.4)) - 2_000);
}

/** 配偶者控除・配偶者特別控除（令和7年分: 配偶者所得58万円以下で配偶者控除） */
export function spouseDeduction(
  myIncome: number, spouseIncome: number, forResident: boolean,
): number {
  if (myIncome > 10_000_000) return 0;
  const tier = myIncome <= 9_000_000 ? 0 : myIncome <= 9_500_000 ? 1 : 2;
  const man = (v: number) => v * 10_000;

  if (spouseIncome <= 580_000) {
    // 配偶者控除（一般）
    const itax = [38, 26, 13][tier];
    const rtax = [33, 22, 11][tier];
    return man(forResident ? rtax : itax);
  }
  // 配偶者特別控除
  const bracketsUpper = [950_000, 1_000_000, 1_050_000, 1_100_000, 1_150_000, 1_200_000, 1_250_000, 1_300_000, 1_330_000];
  const itaxTable = [
    [38, 36, 31, 26, 21, 16, 11, 6, 3],
    [26, 24, 21, 18, 14, 11, 8, 4, 2],
    [13, 12, 11, 9, 7, 6, 4, 2, 1],
  ];
  const rtaxTable = [
    [33, 33, 31, 26, 21, 16, 11, 6, 3],
    [22, 22, 21, 18, 14, 11, 8, 4, 2],
    [11, 11, 11, 9, 7, 6, 4, 2, 1],
  ];
  for (let i = 0; i < bracketsUpper.length; i++) {
    if (spouseIncome <= bracketsUpper[i]) {
      return man((forResident ? rtaxTable : itaxTable)[tier][i]);
    }
  }
  return 0;
}

export function dependentsDeduction(
  general: number, specific: number, elderly: number, forResident: boolean,
): number {
  return forResident
    ? general * 330_000 + specific * 450_000 + elderly * 380_000
    : general * 380_000 + specific * 630_000 + elderly * 480_000;
}

export function singleParentDeduction(
  status: DeductionInput['singleParent'], forResident: boolean,
): number {
  if (status === 'singleParent') return forResident ? 300_000 : 350_000;
  if (status === 'widow') return forResident ? 260_000 : 270_000;
  return 0;
}

export function computeDeductions(
  d: DeductionInput, totalIncome: number, forResident: boolean,
): DeductionBreakdown {
  const b: DeductionBreakdown = {
    socialInsurance: d.socialInsurance,
    smallBusinessMutualAid: d.smallBusinessMutualAid,
    lifeInsurance: lifeInsuranceDeduction(d.lifeInsuranceGeneral, d.lifeInsuranceCare, d.lifeInsurancePension, forResident),
    earthquakeInsurance: earthquakeDeduction(d.earthquakeInsurance, forResident),
    medical: medicalDeduction(d.medicalExpenses, d.medicalReimbursed, totalIncome),
    // 住民税の寄附金は税額控除のため所得控除には含めない（概算簡略化）
    donation: forResident ? 0 : donationDeduction(d.donations, totalIncome),
    spouse: d.spouse === 'present' ? spouseDeduction(totalIncome, d.spouseIncome, forResident) : 0,
    dependents: dependentsDeduction(d.dependentsGeneral, d.dependentsSpecific, d.dependentsElderly, forResident),
    singleParent: singleParentDeduction(d.singleParent, forResident),
    basic: forResident ? basicDeductionResident(totalIncome) : basicDeduction(totalIncome),
    total: 0,
  };
  b.total = b.socialInsurance + b.smallBusinessMutualAid + b.lifeInsurance +
    b.earthquakeInsurance + b.medical + b.donation + b.spouse + b.dependents +
    b.singleParent + b.basic;
  return b;
}

/** 所得税の速算表 */
export function progressiveIncomeTax(taxable: number): number {
  if (taxable <= 0) return 0;
  if (taxable <= 1_950_000) return taxable * 0.05;
  if (taxable <= 3_300_000) return taxable * 0.1 - 97_500;
  if (taxable <= 6_950_000) return taxable * 0.2 - 427_500;
  if (taxable <= 9_000_000) return taxable * 0.23 - 636_000;
  if (taxable <= 18_000_000) return taxable * 0.33 - 1_536_000;
  if (taxable <= 40_000_000) return taxable * 0.4 - 2_796_000;
  return taxable * 0.45 - 4_796_000;
}

export function calculate(
  salary: SalaryInput, business: BusinessInput, deductions: DeductionInput, taxYear: number,
): TaxResult {
  const sIncome = salaryIncome(salary.grossSalary);
  const biz = businessIncome(business, taxYear);
  // 損益通算: 事業所得の赤字は給与所得と通算できる
  const combined = Math.max(0, sIncome + biz.income);

  // 所得税
  const ded = computeDeductions(deductions, combined, false);
  const taxable = floorTo(Math.max(0, combined - ded.total), 1_000);
  const baseTax = Math.floor(progressiveIncomeTax(taxable));
  const reconstruction = Math.floor(baseTax * 0.021);
  const totalTax = floorTo(baseTax + reconstruction, 100);
  const due = totalTax - salary.withheldTax;

  // 住民税（概算: 所得割10% + 均等割5,000円 − 調整控除2,500円）
  const rDed = computeDeductions(deductions, combined, true);
  const rTaxable = floorTo(Math.max(0, combined - rDed.total), 1_000);
  let residentTax = 0;
  if (combined > 450_000) {
    const shotokuwari = Math.max(0, rTaxable * 0.10 - 2_500);
    // ふるさと納税等の寄附金税額控除（基本分10%のみの簡略計算）
    const donationCredit = Math.max(0, Math.min(deductions.donations, combined * 0.3) - 2_000) * 0.1;
    residentTax = Math.max(0, Math.floor(shotokuwari - donationCredit)) + 5_000;
  }

  return {
    salaryIncome: sIncome,
    salaryDeduction: salaryDeduction(salary.grossSalary),
    businessRevenue: biz.revenue,
    businessExpenses: biz.expenses,
    depreciation: biz.depreciation,
    blueDeduction: biz.blueDeduction,
    businessIncome: biz.income,
    totalIncome: combined,
    deductions: ded,
    taxableIncome: taxable,
    incomeTaxBase: baseTax,
    reconstructionTax: reconstruction,
    incomeTaxTotal: totalTax,
    withheldTax: salary.withheldTax,
    taxDue: due,
    residentTaxableIncome: rTaxable,
    residentTaxDeductions: rDed,
    residentTax,
  };
}
