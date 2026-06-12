import { describe, it, expect } from 'vitest';
import {
  salaryDeduction, salaryIncome, basicDeduction, progressiveIncomeTax,
  lifeInsuranceDeduction, medicalDeduction, spouseDeduction,
  depreciationForYear, businessIncome, calculate,
} from './engine';
import type { BusinessInput, DeductionInput, SalaryInput } from './types';

const emptyDeductions: DeductionInput = {
  socialInsurance: 0, smallBusinessMutualAid: 0,
  lifeInsuranceGeneral: 0, lifeInsuranceCare: 0, lifeInsurancePension: 0,
  earthquakeInsurance: 0, medicalExpenses: 0, medicalReimbursed: 0,
  donations: 0, spouse: 'none', spouseIncome: 0,
  dependentsGeneral: 0, dependentsSpecific: 0, dependentsElderly: 0,
  singleParent: 'none',
};

const emptyBusiness: BusinessInput = { revenues: [], expenses: [], assets: [], blueDeductionType: 0 };

describe('給与所得控除（令和7年分以降）', () => {
  it('最低保障65万円', () => {
    expect(salaryDeduction(1_000_000)).toBe(650_000);
    expect(salaryDeduction(1_900_000)).toBe(650_000);
  });
  it('300万円: 30%+8万=98万', () => {
    expect(salaryDeduction(3_000_000)).toBe(980_000);
  });
  it('500万円: 20%+44万=144万', () => {
    expect(salaryDeduction(5_000_000)).toBe(1_440_000);
    expect(salaryIncome(5_000_000)).toBe(3_560_000);
  });
  it('上限195万円', () => {
    expect(salaryDeduction(10_000_000)).toBe(1_950_000);
  });
  it('収入を超えない', () => {
    expect(salaryDeduction(500_000)).toBe(500_000);
  });
});

describe('基礎控除（令和7・8年分）', () => {
  it('低所得は95万円', () => expect(basicDeduction(1_320_000)).toBe(950_000));
  it('336万円以下は88万円', () => expect(basicDeduction(3_000_000)).toBe(880_000));
  it('一般は58万円', () => expect(basicDeduction(10_000_000)).toBe(580_000));
  it('2500万円超は0', () => expect(basicDeduction(26_000_000)).toBe(0));
});

describe('所得税速算表', () => {
  it('195万円以下5%', () => expect(progressiveIncomeTax(1_950_000)).toBe(97_500));
  it('330万円: 10%-97500', () => expect(progressiveIncomeTax(3_300_000)).toBe(232_500));
  it('695万円: 20%-427500', () => expect(progressiveIncomeTax(6_950_000)).toBe(962_500));
});

describe('生命保険料控除（新制度）', () => {
  it('8万円超は4万円', () => expect(lifeInsuranceDeduction(100_000, 0, 0, false)).toBe(40_000));
  it('3区分合計上限12万円', () =>
    expect(lifeInsuranceDeduction(100_000, 100_000, 100_000, false)).toBe(120_000));
  it('住民税は上限7万円', () =>
    expect(lifeInsuranceDeduction(100_000, 100_000, 100_000, true)).toBe(70_000));
});

describe('医療費控除', () => {
  it('10万円の足切り', () =>
    expect(medicalDeduction(300_000, 0, 5_000_000)).toBe(200_000));
  it('所得200万円未満は5%足切り', () =>
    expect(medicalDeduction(150_000, 0, 1_000_000)).toBe(100_000));
});

describe('配偶者控除（令和7年分: 配偶者所得58万円以下）', () => {
  it('一般38万円', () => expect(spouseDeduction(5_000_000, 500_000, false)).toBe(380_000));
  it('58万円ちょうどは配偶者控除', () => expect(spouseDeduction(5_000_000, 580_000, false)).toBe(380_000));
  it('95万円以下は特別控除38万円', () => expect(spouseDeduction(5_000_000, 900_000, false)).toBe(380_000));
  it('本人所得1000万円超は0', () => expect(spouseDeduction(10_000_001, 500_000, false)).toBe(0));
  it('配偶者所得133万円超は0', () => expect(spouseDeduction(5_000_000, 1_400_000, false)).toBe(0));
});

describe('減価償却（定額法）', () => {
  const asset = {
    id: '1', name: 'PC', acquisitionDate: '2025-07-15',
    acquisitionCost: 240_000, usefulLifeYears: 4, businessUseRatio: 1,
  };
  it('取得年は月割（7月取得→6ヶ月分）', () => {
    expect(depreciationForYear(asset, 2025)).toBe(30_000);
  });
  it('2年目は満額', () => {
    expect(depreciationForYear(asset, 2026)).toBe(60_000);
  });
  it('最終年は残存1円まで', () => {
    // 30,000 + 60,000×4 = 270,000 > 239,999 なので最終年は調整される
    expect(depreciationForYear(asset, 2029)).toBe(239_999 - 30_000 - 60_000 * 3);
  });
  it('事業専用割合を反映', () => {
    expect(depreciationForYear({ ...asset, businessUseRatio: 0.5 }, 2026)).toBe(30_000);
  });
});

describe('事業所得と青色申告特別控除', () => {
  it('青色65万円控除', () => {
    const biz: BusinessInput = {
      revenues: [{ id: '1', date: '2025-01-01', description: '売上', amount: 3_000_000 }],
      expenses: [{ id: '1', date: '2025-01-01', category: '通信費', description: '', amount: 500_000 }],
      assets: [], blueDeductionType: 65,
    };
    const r = businessIncome(biz, 2025);
    expect(r.profit).toBe(2_500_000);
    expect(r.blueDeduction).toBe(650_000);
    expect(r.income).toBe(1_850_000);
  });
  it('控除は黒字を限度', () => {
    const biz: BusinessInput = {
      revenues: [{ id: '1', date: '2025-01-01', description: '', amount: 400_000 }],
      expenses: [], assets: [], blueDeductionType: 65,
    };
    expect(businessIncome(biz, 2025).blueDeduction).toBe(400_000);
    expect(businessIncome(biz, 2025).income).toBe(0);
  });
});

describe('総合計算', () => {
  it('給与400万円のみ・控除なし', () => {
    const salary: SalaryInput = { grossSalary: 4_000_000, withheldTax: 0 };
    const r = calculate(salary, emptyBusiness, { ...emptyDeductions, socialInsurance: 600_000 }, 2025);
    // 給与所得 = 400万 - 124万 = 276万
    expect(r.salaryIncome).toBe(2_760_000);
    // 控除 = 社保60万 + 基礎88万 = 148万 → 課税所得128万
    expect(r.taxableIncome).toBe(1_280_000);
    // 税額 64,000 + 復興 1,344 → 65,300（100円未満切捨）
    expect(r.incomeTaxTotal).toBe(65_300);
  });
  it('事業赤字は給与と損益通算される', () => {
    const salary: SalaryInput = { grossSalary: 4_000_000, withheldTax: 0 };
    const biz: BusinessInput = {
      revenues: [{ id: '1', date: '2025-01-01', description: '', amount: 100_000 }],
      expenses: [{ id: '1', date: '2025-01-01', category: '雑費', description: '', amount: 1_100_000 }],
      assets: [], blueDeductionType: 65,
    };
    const r = calculate(salary, biz, emptyDeductions, 2025);
    expect(r.totalIncome).toBe(2_760_000 - 1_000_000);
  });
  it('源泉徴収税額を引いた納付/還付額', () => {
    const salary: SalaryInput = { grossSalary: 4_000_000, withheldTax: 100_000 };
    const r = calculate(salary, emptyBusiness, { ...emptyDeductions, socialInsurance: 600_000 }, 2025);
    expect(r.taxDue).toBe(65_300 - 100_000); // 還付
  });
});
