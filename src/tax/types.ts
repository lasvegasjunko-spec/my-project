// 確定申告計算エンジンの型定義（令和7年分以降の税制を想定）
import type { JournalEntry } from './journal';

export type ExpenseCategory =
  | '仕入'
  | '外注工賃'
  | '地代家賃'
  | '水道光熱費'
  | '旅費交通費'
  | '通信費'
  | '広告宣伝費'
  | '接待交際費'
  | '損害保険料'
  | '修繕費'
  | '消耗品費'
  | '租税公課'
  | '荷造運賃'
  | '利子割引料'
  | '雑費';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  '仕入', '外注工賃', '地代家賃', '水道光熱費', '旅費交通費', '通信費',
  '広告宣伝費', '接待交際費', '損害保険料', '修繕費', '消耗品費',
  '租税公課', '荷造運賃', '利子割引料', '雑費',
];

export interface ExpenseEntry {
  id: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  description: string;
  amount: number;
}

export interface RevenueEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
}

/** 固定資産（定額法による減価償却） */
export interface FixedAsset {
  id: string;
  name: string;
  acquisitionDate: string; // YYYY-MM-DD
  acquisitionCost: number;
  usefulLifeYears: number; // 法定耐用年数
  businessUseRatio: number; // 事業専用割合 0-1
}

export type BlueDeductionType = 65 | 55 | 10 | 0; // 万円ではなく区分（0は白色）

export interface BusinessInput {
  revenues: RevenueEntry[];
  expenses: ExpenseEntry[];
  assets: FixedAsset[];
  blueDeductionType: BlueDeductionType;
  /** 複式簿記モードの仕訳帳。1件以上あればこちらで事業所得を計算 */
  journal: JournalEntry[];
  /** 青色専従者給与（仕訳帳に含める場合は0） */
  dedicatedSpouseWage: number;
}

export type { JournalEntry };

export interface SalaryInput {
  /** 給与収入（源泉徴収票の「支払金額」） */
  grossSalary: number;
  /** 源泉徴収税額 */
  withheldTax: number;
}

export type SpouseStatus = 'none' | 'present';

export interface DeductionInput {
  /** 社会保険料（国民年金・国保・健康保険など支払額全額） */
  socialInsurance: number;
  /** 小規模企業共済・iDeCo等掛金 */
  smallBusinessMutualAid: number;
  /** 生命保険料 支払額（新制度・一般） */
  lifeInsuranceGeneral: number;
  /** 生命保険料 支払額（新制度・介護医療） */
  lifeInsuranceCare: number;
  /** 生命保険料 支払額（新制度・個人年金） */
  lifeInsurancePension: number;
  /** 地震保険料 支払額 */
  earthquakeInsurance: number;
  /** 医療費 支払額 */
  medicalExpenses: number;
  /** 医療費のうち保険金等で補填された額 */
  medicalReimbursed: number;
  /** 寄附金（ふるさと納税含む）支払額 */
  donations: number;
  /** 配偶者の有無 */
  spouse: SpouseStatus;
  /** 配偶者の合計所得金額 */
  spouseIncome: number;
  /** 一般扶養親族の人数（16-18歳・23-69歳） */
  dependentsGeneral: number;
  /** 特定扶養親族の人数（19-22歳） */
  dependentsSpecific: number;
  /** 老人扶養親族の人数（70歳以上・同居老親以外） */
  dependentsElderly: number;
  /** ひとり親・寡婦 */
  singleParent: 'none' | 'singleParent' | 'widow';
}

export interface DeductionBreakdown {
  socialInsurance: number;
  smallBusinessMutualAid: number;
  lifeInsurance: number;
  earthquakeInsurance: number;
  medical: number;
  donation: number;
  spouse: number;
  dependents: number;
  singleParent: number;
  basic: number;
  total: number;
}

export interface TaxResult {
  // 所得
  salaryIncome: number; // 給与所得（控除後）
  salaryDeduction: number; // 給与所得控除額
  businessRevenue: number;
  businessExpenses: number;
  depreciation: number;
  blueDeduction: number; // 実際に適用された青色申告特別控除
  businessIncome: number; // 事業所得（青色控除後）
  totalIncome: number; // 合計所得金額

  // 控除
  deductions: DeductionBreakdown;

  // 所得税
  taxableIncome: number; // 課税所得（1,000円未満切捨）
  incomeTaxBase: number; // 基準所得税額
  reconstructionTax: number; // 復興特別所得税（2.1%）
  incomeTaxTotal: number; // 所得税及び復興特別所得税の合計（100円未満切捨）
  withheldTax: number;
  taxDue: number; // 納付額（マイナスは還付）

  // 住民税（概算）
  residentTaxableIncome: number;
  residentTaxDeductions: DeductionBreakdown;
  residentTax: number; // 所得割+均等割の概算
}
