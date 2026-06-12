// 青色申告用勘定科目マスタ

export type AccountType = '資産' | '負債' | '資本' | '収益' | '費用';

export interface Account {
  code: string;
  name: string;
  type: AccountType;
  /** 損益計算書の行ラベル（青色申告決算書に対応する欄名） */
  plLabel?: string;
  /** 貸借対照表の行ラベル */
  bsLabel?: string;
  /** e-Tax / 青色申告決算書 欄番号（損益の場合は⑴〜 形式） */
  etaxField?: string;
}

export const ACCOUNTS: Account[] = [
  // ── 資産 ──────────────────────────────────────────────────────────────────
  { code: '1010', name: '現金',           type: '資産', bsLabel: '現金', etaxField: 'BS-現金' },
  { code: '1020', name: '普通預金',       type: '資産', bsLabel: '預貯金', etaxField: 'BS-預貯金' },
  { code: '1030', name: '当座預金',       type: '資産', bsLabel: '預貯金', etaxField: 'BS-預貯金' },
  { code: '1110', name: '売掛金',         type: '資産', bsLabel: '売掛金', etaxField: 'BS-売掛金' },
  { code: '1120', name: '受取手形',       type: '資産', bsLabel: '受取手形', etaxField: 'BS-受取手形' },
  { code: '1200', name: '棚卸資産',       type: '資産', bsLabel: '棚卸資産', etaxField: 'BS-棚卸資産' },
  { code: '1300', name: '前払費用',       type: '資産', bsLabel: '前払費用' },
  { code: '1400', name: '貸付金',         type: '資産', bsLabel: '貸付金' },
  { code: '1500', name: '建物',           type: '資産', bsLabel: '建物', etaxField: 'BS-建物' },
  { code: '1510', name: '建物附属設備',   type: '資産', bsLabel: '建物附属設備', etaxField: 'BS-建物附属設備' },
  { code: '1520', name: '機械装置',       type: '資産', bsLabel: '機械装置', etaxField: 'BS-機械装置' },
  { code: '1530', name: '車両運搬具',     type: '資産', bsLabel: '車両運搬具', etaxField: 'BS-車両運搬具' },
  { code: '1540', name: '工具器具備品',   type: '資産', bsLabel: '工具器具備品', etaxField: 'BS-工具器具備品' },
  { code: '1550', name: '土地',           type: '資産', bsLabel: '土地', etaxField: 'BS-土地' },
  { code: '1600', name: '敷金・保証金',   type: '資産', bsLabel: '敷金・保証金' },
  // ── 負債 ──────────────────────────────────────────────────────────────────
  { code: '2010', name: '買掛金',         type: '負債', bsLabel: '買掛金', etaxField: 'BS-買掛金' },
  { code: '2020', name: '支払手形',       type: '負債', bsLabel: '支払手形', etaxField: 'BS-支払手形' },
  { code: '2030', name: '未払金',         type: '負債', bsLabel: '未払金' },
  { code: '2040', name: '未払費用',       type: '負債', bsLabel: '未払費用' },
  { code: '2050', name: '前受金',         type: '負債', bsLabel: '前受金' },
  { code: '2100', name: '借入金',         type: '負債', bsLabel: '借入金', etaxField: 'BS-借入金' },
  { code: '2200', name: '預り金',         type: '負債', bsLabel: '預り金' },
  // ── 資本 ──────────────────────────────────────────────────────────────────
  { code: '3010', name: '元入金',         type: '資本', bsLabel: '元入金', etaxField: 'BS-元入金' },
  { code: '3020', name: '事業主貸',       type: '資本', bsLabel: '事業主貸', etaxField: 'BS-事業主貸' },
  { code: '3030', name: '事業主借',       type: '資本', bsLabel: '事業主借', etaxField: 'BS-事業主借' },
  // ── 収益 ──────────────────────────────────────────────────────────────────
  { code: '4010', name: '売上高',         type: '収益', plLabel: '売上（収入）金額', etaxField: 'PL-①売上' },
  { code: '4020', name: '雑収入',         type: '収益', plLabel: '雑収入', etaxField: 'PL-雑収入' },
  // ── 費用 ──────────────────────────────────────────────────────────────────
  { code: '5010', name: '期首商品棚卸高', type: '費用', plLabel: '期首商品棚卸高', etaxField: 'PL-期首商品棚卸高' },
  { code: '5020', name: '仕入高',         type: '費用', plLabel: '仕入金額', etaxField: 'PL-②仕入' },
  { code: '5030', name: '期末商品棚卸高', type: '費用', plLabel: '期末商品棚卸高', etaxField: 'PL-期末商品棚卸高' },
  { code: '5100', name: '給料賃金',       type: '費用', plLabel: '給料賃金', etaxField: 'PL-給料賃金' },
  { code: '5110', name: '外注工賃',       type: '費用', plLabel: '外注工賃', etaxField: 'PL-外注工賃' },
  { code: '5120', name: '減価償却費',     type: '費用', plLabel: '減価償却費', etaxField: 'PL-減価償却費' },
  { code: '5130', name: '貸倒金',         type: '費用', plLabel: '貸倒金' },
  { code: '5140', name: '地代家賃',       type: '費用', plLabel: '地代家賃', etaxField: 'PL-地代家賃' },
  { code: '5150', name: '利子割引料',     type: '費用', plLabel: '利子割引料', etaxField: 'PL-利子割引料' },
  { code: '5160', name: '租税公課',       type: '費用', plLabel: '租税公課', etaxField: 'PL-租税公課' },
  { code: '5170', name: '荷造運賃',       type: '費用', plLabel: '荷造運賃', etaxField: 'PL-荷造運賃' },
  { code: '5180', name: '水道光熱費',     type: '費用', plLabel: '水道光熱費', etaxField: 'PL-水道光熱費' },
  { code: '5190', name: '旅費交通費',     type: '費用', plLabel: '旅費交通費', etaxField: 'PL-旅費交通費' },
  { code: '5200', name: '通信費',         type: '費用', plLabel: '通信費', etaxField: 'PL-通信費' },
  { code: '5210', name: '広告宣伝費',     type: '費用', plLabel: '広告宣伝費', etaxField: 'PL-広告宣伝費' },
  { code: '5220', name: '接待交際費',     type: '費用', plLabel: '接待交際費', etaxField: 'PL-接待交際費' },
  { code: '5230', name: '損害保険料',     type: '費用', plLabel: '損害保険料', etaxField: 'PL-損害保険料' },
  { code: '5240', name: '修繕費',         type: '費用', plLabel: '修繕費', etaxField: 'PL-修繕費' },
  { code: '5250', name: '消耗品費',       type: '費用', plLabel: '消耗品費', etaxField: 'PL-消耗品費' },
  { code: '5260', name: '福利厚生費',     type: '費用', plLabel: '福利厚生費' },
  { code: '5270', name: '専従者給与',     type: '費用', plLabel: '専従者給与', etaxField: 'PL-専従者給与' },
  { code: '5900', name: '雑費',           type: '費用', plLabel: '雑費', etaxField: 'PL-雑費' },
];

export const ACCOUNT_MAP = new Map(ACCOUNTS.map((a) => [a.code, a]));
export const ACCOUNT_BY_NAME = new Map(ACCOUNTS.map((a) => [a.name, a]));

export const incomeAccounts = () => ACCOUNTS.filter((a) => a.type === '収益');
export const expenseAccounts = () => ACCOUNTS.filter((a) => a.type === '費用');
export const assetAccounts = () => ACCOUNTS.filter((a) => a.type === '資産');
export const liabilityAccounts = () => ACCOUNTS.filter((a) => a.type === '負債');
export const equityAccounts = () => ACCOUNTS.filter((a) => a.type === '資本');
