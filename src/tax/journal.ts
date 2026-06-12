// 仕訳帳の型定義と損益計算書・貸借対照表の導出

import { ACCOUNT_MAP, ACCOUNT_BY_NAME } from './accounts';
import type { Account } from './accounts';

export interface JournalLine {
  accountCode: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  lines: JournalLine[];
}

/** 仕訳の借方・貸方合計が一致しているか検証 */
export function isBalanced(entry: JournalEntry): boolean {
  const d = entry.lines.reduce((s, l) => s + l.debit, 0);
  const c = entry.lines.reduce((s, l) => s + l.credit, 0);
  return Math.abs(d - c) < 1;
}

/** 科目コードごとの期末残高（借方残 - 貸方残）を集計 */
export function trialBalance(entries: JournalEntry[]): Map<string, number> {
  const bal = new Map<string, number>();
  for (const entry of entries) {
    for (const line of entry.lines) {
      const prev = bal.get(line.accountCode) ?? 0;
      bal.set(line.accountCode, prev + line.debit - line.credit);
    }
  }
  return bal;
}

export interface PLAccount {
  account: Account;
  amount: number; // 収益はプラスが収益、費用はプラスが費用
}

export interface PLStatement {
  revenues: PLAccount[];
  expenses: PLAccount[];
  totalRevenue: number;
  totalExpense: number;
  grossProfit: number; // 売上総利益（売上 - 仕入）
  netProfit: number;   // 事業利益（青色控除前）
}

export interface BSAccount {
  account: Account;
  amount: number;
}

export interface BSStatement {
  assets: BSAccount[];
  liabilities: BSAccount[];
  equities: BSAccount[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  // 当期純利益は P&L から転記（元入金調整前）
  retainedEarnings: number;
}

export function derivePL(entries: JournalEntry[]): PLStatement {
  const bal = trialBalance(entries);
  const revenues: PLAccount[] = [];
  const expenses: PLAccount[] = [];

  for (const [code, balance] of bal) {
    const acct = ACCOUNT_MAP.get(code);
    if (!acct) continue;
    if (acct.type === '収益') {
      // 収益勘定は貸方が増加 → balance（借方-貸方）がマイナスになるので符号反転
      revenues.push({ account: acct, amount: -balance });
    } else if (acct.type === '費用') {
      expenses.push({ account: acct, amount: balance });
    }
  }

  revenues.sort((a, b) => a.account.code.localeCompare(b.account.code));
  expenses.sort((a, b) => a.account.code.localeCompare(b.account.code));

  const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);

  const sales = revenues.find((r) => r.account.code === '4010')?.amount ?? 0;
  const cogs = (expenses.find((e) => e.account.code === '5010')?.amount ?? 0)
    + (expenses.find((e) => e.account.code === '5020')?.amount ?? 0)
    - (expenses.find((e) => e.account.code === '5030')?.amount ?? 0);
  const grossProfit = sales - cogs;

  return {
    revenues, expenses,
    totalRevenue, totalExpense,
    grossProfit,
    netProfit: totalRevenue - totalExpense,
  };
}

export function deriveBS(entries: JournalEntry[], netProfit: number): BSStatement {
  const bal = trialBalance(entries);
  const assets: BSAccount[] = [];
  const liabilities: BSAccount[] = [];
  const equities: BSAccount[] = [];

  for (const [code, balance] of bal) {
    const acct = ACCOUNT_MAP.get(code);
    if (!acct) continue;
    if (acct.type === '資産') assets.push({ account: acct, amount: balance });
    else if (acct.type === '負債') liabilities.push({ account: acct, amount: -balance });
    else if (acct.type === '資本') {
      // 事業主貸は資産的性質（借方が増加）、事業主借は負債的性質（貸方が増加）
      if (acct.code === '3020') assets.push({ account: acct, amount: balance });
      else equities.push({ account: acct, amount: -balance });
    }
  }

  assets.sort((a, b) => a.account.code.localeCompare(b.account.code));
  liabilities.sort((a, b) => a.account.code.localeCompare(b.account.code));
  equities.sort((a, b) => a.account.code.localeCompare(b.account.code));

  const totalAssets = assets.reduce((s, a) => s + a.amount, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0);
  const totalEquity = equities.reduce((s, e) => s + e.amount, 0);

  return {
    assets, liabilities, equities,
    totalAssets, totalLiabilities,
    totalEquity,
    retainedEarnings: netProfit,
  };
}

// ── CSV インポート ─────────────────────────────────────────────────────────────
// フォーマット（freee/MF互換）: 日付,借方科目,借方金額,貸方科目,貸方金額,摘要
// 複合仕訳は同一摘要の複数行として扱う（グルーピングはしない）

let seq = 0;
const newId = () => `${Date.now()}-${seq++}`;

function parseAmt(s: string) {
  return Number(s.replace(/[,，¥\s]/g, '')) || 0;
}

function resolveAccount(name: string): string {
  const a = ACCOUNT_BY_NAME.get(name.trim());
  if (a) return a.code;
  // 部分一致フォールバック
  for (const acct of ACCOUNT_MAP.values()) {
    if (acct.name.includes(name.trim())) return acct.code;
  }
  return '5900'; // 雑費にフォールバック
}

export function parseJournalCsv(text: string): { entries: JournalEntry[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const entries: JournalEntry[] = [];

  lines.forEach((line, i) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (i === 0 && isNaN(parseAmt(cols[2]))) return; // ヘッダ行スキップ
    if (cols.length < 5) {
      errors.push(`${i + 1}行目: 列不足（日付,借方科目,借方金額,貸方科目,貸方金額[,摘要]）`);
      return;
    }
    const [date, debitName, debitAmtStr, creditName, creditAmtStr, desc = ''] = cols;
    const debitAmt = parseAmt(debitAmtStr);
    const creditAmt = parseAmt(creditAmtStr);
    if (debitAmt !== creditAmt) {
      errors.push(`${i + 1}行目: 借方(${debitAmt})と貸方(${creditAmt})が不一致。スキップします`);
      return;
    }
    const debitCode = resolveAccount(debitName);
    const creditCode = resolveAccount(creditName);
    if (debitCode === '5900' && !['雑費'].includes(debitName))
      errors.push(`${i + 1}行目: 借方科目「${debitName}」が不明のため雑費として取込み`);
    if (creditCode === '5900' && !['雑費'].includes(creditName))
      errors.push(`${i + 1}行目: 貸方科目「${creditName}」が不明のため雑費として取込み`);
    entries.push({
      id: newId(), date, description: desc || `${debitName}/${creditName}`,
      lines: [
        { accountCode: debitCode, debit: debitAmt, credit: 0 },
        { accountCode: creditCode, debit: 0, credit: creditAmt },
      ],
    });
  });

  return { entries, errors };
}
