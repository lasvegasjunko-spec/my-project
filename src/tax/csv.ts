// 経費・売上のCSVインポート
// フォーマット: 日付,区分,摘要,金額（ヘッダ行は自動スキップ）
// 売上CSV: 日付,摘要,金額

import type { ExpenseEntry, RevenueEntry, ExpenseCategory } from './types';
import { EXPENSE_CATEGORIES } from './types';

let seq = 0;
const newId = () => `${Date.now()}-${seq++}`;

function parseLines(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
}

const isHeader = (cols: string[]) => isNaN(Number(cols[cols.length - 1].replace(/[,¥\s]/g, '')));

const parseAmount = (s: string) => Number(s.replace(/[,¥\s]/g, ''));

export function parseExpenseCsv(text: string): { entries: ExpenseEntry[]; errors: string[] } {
  const entries: ExpenseEntry[] = [];
  const errors: string[] = [];
  parseLines(text).forEach((cols, i) => {
    if (i === 0 && isHeader(cols)) return;
    if (cols.length < 4) {
      errors.push(`${i + 1}行目: 列が不足しています（日付,区分,摘要,金額）`);
      return;
    }
    const [date, category, description, amountStr] = cols;
    const amount = parseAmount(amountStr);
    if (isNaN(amount)) {
      errors.push(`${i + 1}行目: 金額を読み取れません: ${amountStr}`);
      return;
    }
    const cat = (EXPENSE_CATEGORIES as string[]).includes(category)
      ? (category as ExpenseCategory)
      : '雑費';
    if (cat === '雑費' && category !== '雑費') {
      errors.push(`${i + 1}行目: 区分「${category}」が不明のため「雑費」として取込みました`);
    }
    entries.push({ id: newId(), date, category: cat, description, amount });
  });
  return { entries, errors };
}

export function parseRevenueCsv(text: string): { entries: RevenueEntry[]; errors: string[] } {
  const entries: RevenueEntry[] = [];
  const errors: string[] = [];
  parseLines(text).forEach((cols, i) => {
    if (i === 0 && isHeader(cols)) return;
    if (cols.length < 3) {
      errors.push(`${i + 1}行目: 列が不足しています（日付,摘要,金額）`);
      return;
    }
    const [date, description, amountStr] = cols;
    const amount = parseAmount(amountStr);
    if (isNaN(amount)) {
      errors.push(`${i + 1}行目: 金額を読み取れません: ${amountStr}`);
      return;
    }
    entries.push({ id: newId(), date, description, amount });
  });
  return { entries, errors };
}
