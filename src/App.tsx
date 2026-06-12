import { useEffect, useMemo, useState } from 'react';
import type {
  SalaryInput, BusinessInput, DeductionInput, ExpenseEntry, RevenueEntry,
  FixedAsset, ExpenseCategory, BlueDeductionType, JournalEntry,
} from './tax/types';
import { EXPENSE_CATEGORIES } from './tax/types';
import { calculate } from './tax/engine';
import { parseExpenseCsv, parseRevenueCsv } from './tax/csv';
import { derivePL, deriveBS, parseJournalCsv, isBalanced } from './tax/journal';
import { ACCOUNTS } from './tax/accounts';
import './App.css';

const STORAGE_KEY = 'kakutei-shinkoku-data-v2';

const defaultSalary: SalaryInput = { grossSalary: 0, withheldTax: 0 };
const defaultBusiness: BusinessInput = {
  revenues: [], expenses: [], assets: [], blueDeductionType: 65,
  journal: [], dedicatedSpouseWage: 0,
};
const defaultDeductions: DeductionInput = {
  socialInsurance: 0, smallBusinessMutualAid: 0,
  lifeInsuranceGeneral: 0, lifeInsuranceCare: 0, lifeInsurancePension: 0,
  earthquakeInsurance: 0, medicalExpenses: 0, medicalReimbursed: 0,
  donations: 0, spouse: 'none', spouseIncome: 0,
  dependentsGeneral: 0, dependentsSpecific: 0, dependentsElderly: 0,
  singleParent: 'none',
};

interface AppData {
  taxYear: number;
  salary: SalaryInput;
  business: BusinessInput;
  deductions: DeductionInput;
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<AppData>;
      // 旧バージョンのデータを移行
      if (d.business && !d.business.journal) d.business.journal = [];
      if (d.business && d.business.dedicatedSpouseWage === undefined) d.business.dedicatedSpouseWage = 0;
      return { taxYear: 2025, salary: defaultSalary, business: defaultBusiness, deductions: defaultDeductions, ...d };
    }
  } catch { /* 破損時は初期値 */ }
  return { taxYear: 2025, salary: defaultSalary, business: defaultBusiness, deductions: defaultDeductions };
}

const yen = (n: number) =>
  `${n < 0 ? '−' : ''}¥${Math.abs(Math.round(n)).toLocaleString('ja-JP')}`;

let seq = 0;
const newId = () => `${Date.now()}-${seq++}`;

function NumberField({ label, value, onChange, note }: {
  label: string; value: number; onChange: (v: number) => void; note?: string;
}) {
  return (
    <label className="field">
      <span>{label}{note && <small> {note}</small>}</span>
      <input
        type="text" inputMode="numeric"
        value={value === 0 ? '' : value.toLocaleString('ja-JP')}
        placeholder="0"
        onChange={(e) => {
          const n = Number(e.target.value.replace(/[,，¥\s]/g, ''));
          if (!isNaN(n)) onChange(n);
        }}
      />
    </label>
  );
}

type Tab = 'salary' | 'business' | 'journal' | 'financials' | 'deductions' | 'result' | 'etax';

export default function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [tab, setTab] = useState<Tab>('salary');
  const [csvMessages, setCsvMessages] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const result = useMemo(
    () => calculate(data.salary, data.business, data.deductions, data.taxYear),
    [data],
  );

  const pl = useMemo(() => derivePL(data.business.journal), [data.business.journal]);
  const bs = useMemo(() => deriveBS(data.business.journal, pl.netProfit), [data.business.journal, pl.netProfit]);

  const setSalary = (p: Partial<SalaryInput>) => setData((d) => ({ ...d, salary: { ...d.salary, ...p } }));
  const setBusiness = (p: Partial<BusinessInput>) => setData((d) => ({ ...d, business: { ...d.business, ...p } }));
  const setDed = (p: Partial<DeductionInput>) => setData((d) => ({ ...d, deductions: { ...d.deductions, ...p } }));

  const importCsv = (kind: 'expense' | 'revenue' | 'journal') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (kind === 'journal') {
      const { entries, errors } = parseJournalCsv(text);
      setBusiness({ journal: [...data.business.journal, ...entries] });
      setCsvMessages([`仕訳 ${entries.length}件を取込みました`, ...errors]);
    } else if (kind === 'expense') {
      const { entries, errors } = parseExpenseCsv(text);
      setBusiness({ expenses: [...data.business.expenses, ...entries] });
      setCsvMessages([`経費 ${entries.length}件を取込みました`, ...errors]);
    } else {
      const { entries, errors } = parseRevenueCsv(text);
      setBusiness({ revenues: [...data.business.revenues, ...entries] });
      setCsvMessages([`売上 ${entries.length}件を取込みました`, ...errors]);
    }
    e.target.value = '';
  };

  const expenseByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const ex of data.business.expenses) m.set(ex.category, (m.get(ex.category) ?? 0) + ex.amount);
    return m;
  }, [data.business.expenses]);

  const useJournal = data.business.journal.length > 0;

  const TAB_LABELS: [Tab, string][] = [
    ['salary', '給与所得'],
    ['business', '事業（簡易）'],
    ['journal', '仕訳帳'],
    ['financials', '財務諸表'],
    ['deductions', '所得控除'],
    ['result', '計算結果'],
    ['etax', 'e-Tax入力ガイド'],
  ];

  return (
    <div className="app">
      <header>
        <h1>確定申告シミュレーター</h1>
        <label className="year">
          対象年分:
          <select value={data.taxYear} onChange={(e) => setData((d) => ({ ...d, taxYear: Number(e.target.value) }))}>
            <option value={2025}>令和7年分（2025）</option>
            <option value={2026}>令和8年分（2026）</option>
          </select>
        </label>
      </header>
      {useJournal && (
        <p className="mode-badge">複式簿記モード（仕訳帳から事業所得を計算）</p>
      )}

      <nav className="tabs">
        {TAB_LABELS.map(([t, label]) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{label}</button>
        ))}
      </nav>

      {/* ── 給与所得 ───────────────────────────────────────────────────────── */}
      {tab === 'salary' && (
        <section>
          <h2>給与所得（源泉徴収票から転記）</h2>
          <NumberField label="支払金額（給与収入）" value={data.salary.grossSalary} onChange={(v) => setSalary({ grossSalary: v })} />
          <NumberField label="源泉徴収税額" value={data.salary.withheldTax} onChange={(v) => setSalary({ withheldTax: v })} />
          <p className="summary">給与所得控除 {yen(result.salaryDeduction)} → 給与所得 <strong>{yen(result.salaryIncome)}</strong></p>
        </section>
      )}

      {/* ── 事業所得（簡易） ─────────────────────────────────────────────── */}
      {tab === 'business' && (
        <section>
          <h2>事業所得（簡易入力）</h2>
          <p className="note">仕訳帳タブに1件以上入力すると、仕訳帳から事業所得を計算します（このタブの値は無視されます）。</p>
          <label className="field">
            <span>青色申告特別控除</span>
            <select value={data.business.blueDeductionType} onChange={(e) => setBusiness({ blueDeductionType: Number(e.target.value) as BlueDeductionType })}>
              <option value={65}>65万円（複式簿記＋e-Tax/電子帳簿）</option>
              <option value={55}>55万円（複式簿記・書面提出）</option>
              <option value={10}>10万円（簡易簿記）</option>
              <option value={0}>なし（白色申告）</option>
            </select>
          </label>

          <h3>売上 <small>合計 {yen(data.business.revenues.reduce((s, r) => s + r.amount, 0))}</small></h3>
          <EntryTable<RevenueEntry>
            entries={data.business.revenues}
            columns={[
              { key: 'date', label: '日付', type: 'date' },
              { key: 'description', label: '摘要', type: 'text' },
              { key: 'amount', label: '金額', type: 'amount' },
            ]}
            onChange={(revenues) => setBusiness({ revenues })}
            newEntry={() => ({ id: newId(), date: `${data.taxYear}-01-01`, description: '', amount: 0 })}
          />
          <label className="csv">売上CSV取込（日付,摘要,金額）<input type="file" accept=".csv,text/csv" onChange={importCsv('revenue')} /></label>

          <h3>経費 <small>合計 {yen(data.business.expenses.reduce((s, e) => s + e.amount, 0))}</small></h3>
          <EntryTable<ExpenseEntry>
            entries={data.business.expenses}
            columns={[
              { key: 'date', label: '日付', type: 'date' },
              { key: 'category', label: '区分', type: 'category' },
              { key: 'description', label: '摘要', type: 'text' },
              { key: 'amount', label: '金額', type: 'amount' },
            ]}
            onChange={(expenses) => setBusiness({ expenses })}
            newEntry={() => ({ id: newId(), date: `${data.taxYear}-01-01`, category: '消耗品費', description: '', amount: 0 })}
          />
          <label className="csv">経費CSV取込（日付,区分,摘要,金額）<input type="file" accept=".csv,text/csv" onChange={importCsv('expense')} /></label>
          {csvMessages.length > 0 && <ul className="messages">{csvMessages.map((m, i) => <li key={i}>{m}</li>)}</ul>}

          {expenseByCategory.size > 0 && (
            <details>
              <summary>経費の科目別内訳</summary>
              <table className="breakdown"><tbody>
                {[...expenseByCategory.entries()].map(([c, v]) => (
                  <tr key={c}><td>{c}</td><td className="num">{yen(v)}</td></tr>
                ))}
                {result.depreciation > 0 && <tr><td>減価償却費</td><td className="num">{yen(result.depreciation)}</td></tr>}
              </tbody></table>
            </details>
          )}

          <h3>固定資産（定額法）<small>当年償却費 {yen(result.depreciation)}</small></h3>
          <AssetTable assets={data.business.assets} onChange={(assets) => setBusiness({ assets })} taxYear={data.taxYear} />
        </section>
      )}

      {/* ── 仕訳帳 ───────────────────────────────────────────────────────── */}
      {tab === 'journal' && (
        <section>
          <h2>仕訳帳（複式簿記）</h2>
          <p className="note">
            1件以上入力すると複式簿記モードになり、仕訳帳から損益計算書・貸借対照表を生成します。
            青色申告65万円控除（e-Tax提出）には複式簿記が必要です。
          </p>
          <label className="field">
            <span>青色申告特別控除</span>
            <select value={data.business.blueDeductionType} onChange={(e) => setBusiness({ blueDeductionType: Number(e.target.value) as BlueDeductionType })}>
              <option value={65}>65万円（複式簿記＋e-Tax/電子帳簿）</option>
              <option value={55}>55万円（複式簿記・書面提出）</option>
              <option value={10}>10万円（簡易簿記）</option>
            </select>
          </label>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => {
              const e: JournalEntry = {
                id: newId(), date: `${data.taxYear}-01-01`, description: '',
                lines: [
                  { accountCode: '1010', debit: 0, credit: 0 },
                  { accountCode: '4010', debit: 0, credit: 0 },
                ],
              };
              setBusiness({ journal: [...data.business.journal, e] });
            }}>＋ 仕訳を追加</button>
            <label className="csv" style={{ margin: 0 }}>
              仕訳CSV取込（日付,借方科目,借方金額,貸方科目,貸方金額[,摘要]）
              <input type="file" accept=".csv,text/csv" onChange={importCsv('journal')} />
            </label>
            {data.business.journal.length > 0 && (
              <button onClick={() => { if (confirm('仕訳帳をすべて削除しますか？')) setBusiness({ journal: [] }); }}
                style={{ color: '#c0392b' }}>仕訳帳をクリア</button>
            )}
          </div>

          {csvMessages.length > 0 && <ul className="messages">{csvMessages.map((m, i) => <li key={i}>{m}</li>)}</ul>}

          <JournalTable
            entries={data.business.journal}
            onChange={(journal) => setBusiness({ journal })}
          />

          {data.business.journal.length > 0 && (
            <p className="summary">
              仕訳件数 {data.business.journal.length}件 ／
              貸借不一致: {data.business.journal.filter((e) => !isBalanced(e)).length}件
              {data.business.journal.filter((e) => !isBalanced(e)).length > 0 && (
                <span style={{ color: '#c0392b' }}> ⚠ 確認してください</span>
              )}
            </p>
          )}
        </section>
      )}

      {/* ── 財務諸表 ─────────────────────────────────────────────────────── */}
      {tab === 'financials' && (
        <section>
          <h2>財務諸表（仕訳帳から自動生成）</h2>
          {!useJournal ? (
            <p className="note">仕訳帳タブに仕訳を入力すると、損益計算書と貸借対照表が生成されます。</p>
          ) : (
            <>
              <h3>損益計算書</h3>
              <table className="result">
                <tbody>
                  <tr className="section-header"><td colSpan={2}>【収益】</td></tr>
                  {pl.revenues.map(({ account, amount }) => (
                    <tr key={account.code}><td>{account.plLabel ?? account.name}</td><td className="num">{yen(amount)}</td></tr>
                  ))}
                  <tr className="total"><td>収益合計</td><td className="num">{yen(pl.totalRevenue)}</td></tr>
                  <tr className="section-header"><td colSpan={2}>【費用】</td></tr>
                  {pl.expenses.map(({ account, amount }) => (
                    <tr key={account.code}><td>{account.plLabel ?? account.name}</td><td className="num">{yen(amount)}</td></tr>
                  ))}
                  {result.depreciation > 0 && !pl.expenses.some((e) => e.account.code === '5120') && (
                    <tr><td>減価償却費（資産台帳計算）</td><td className="num">{yen(result.depreciation)}</td></tr>
                  )}
                  <tr className="total"><td>費用合計</td><td className="num">{yen(pl.totalExpense)}</td></tr>
                  <tr className="total"><td>差引利益（青色控除前）</td><td className="num">{yen(pl.netProfit)}</td></tr>
                  <tr><td>青色申告特別控除</td><td className="num">−{yen(result.blueDeduction).slice(1)}</td></tr>
                  <tr className="total"><td>事業所得</td><td className="num">{yen(result.businessIncome)}</td></tr>
                </tbody>
              </table>

              <h3>貸借対照表（期末残高）</h3>
              <div className="bs-grid">
                <div>
                  <strong>資産の部</strong>
                  <table className="result"><tbody>
                    {bs.assets.map(({ account, amount }) => (
                      <tr key={account.code}><td>{account.bsLabel ?? account.name}</td><td className="num">{yen(amount)}</td></tr>
                    ))}
                    <tr className="total"><td>資産合計</td><td className="num">{yen(bs.totalAssets)}</td></tr>
                  </tbody></table>
                </div>
                <div>
                  <strong>負債・資本の部</strong>
                  <table className="result"><tbody>
                    {bs.liabilities.map(({ account, amount }) => (
                      <tr key={account.code}><td>{account.bsLabel ?? account.name}</td><td className="num">{yen(amount)}</td></tr>
                    ))}
                    <tr className="total"><td>負債合計</td><td className="num">{yen(bs.totalLiabilities)}</td></tr>
                    {bs.equities.map(({ account, amount }) => (
                      <tr key={account.code}><td>{account.bsLabel ?? account.name}</td><td className="num">{yen(amount)}</td></tr>
                    ))}
                    <tr><td>当期純利益</td><td className="num">{yen(bs.retainedEarnings)}</td></tr>
                    <tr className="total"><td>資本合計</td><td className="num">{yen(bs.totalEquity + bs.retainedEarnings)}</td></tr>
                  </tbody></table>
                  {Math.abs(bs.totalAssets - (bs.totalLiabilities + bs.totalEquity + bs.retainedEarnings)) > 1 && (
                    <p style={{ color: '#c0392b', fontSize: '.85rem' }}>
                      ⚠ 貸借が一致しません。仕訳を確認してください。
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* ── 所得控除 ─────────────────────────────────────────────────────── */}
      {tab === 'deductions' && (
        <section>
          <h2>所得控除</h2>
          <div className="grid">
            <NumberField label="社会保険料" note="国民年金・国保・健保等の支払全額" value={data.deductions.socialInsurance} onChange={(v) => setDed({ socialInsurance: v })} />
            <NumberField label="小規模企業共済・iDeCo掛金" value={data.deductions.smallBusinessMutualAid} onChange={(v) => setDed({ smallBusinessMutualAid: v })} />
            <NumberField label="生命保険料（一般・新制度）" note="支払額" value={data.deductions.lifeInsuranceGeneral} onChange={(v) => setDed({ lifeInsuranceGeneral: v })} />
            <NumberField label="生命保険料（介護医療）" note="支払額" value={data.deductions.lifeInsuranceCare} onChange={(v) => setDed({ lifeInsuranceCare: v })} />
            <NumberField label="生命保険料（個人年金）" note="支払額" value={data.deductions.lifeInsurancePension} onChange={(v) => setDed({ lifeInsurancePension: v })} />
            <NumberField label="地震保険料" note="支払額" value={data.deductions.earthquakeInsurance} onChange={(v) => setDed({ earthquakeInsurance: v })} />
            <NumberField label="医療費" note="支払額" value={data.deductions.medicalExpenses} onChange={(v) => setDed({ medicalExpenses: v })} />
            <NumberField label="医療費の保険補填額" value={data.deductions.medicalReimbursed} onChange={(v) => setDed({ medicalReimbursed: v })} />
            <NumberField label="寄附金（ふるさと納税含む）" value={data.deductions.donations} onChange={(v) => setDed({ donations: v })} />
          </div>
          <h3>人的控除</h3>
          <div className="grid">
            <label className="field"><span>配偶者</span>
              <select value={data.deductions.spouse} onChange={(e) => setDed({ spouse: e.target.value as DeductionInput['spouse'] })}>
                <option value="none">なし</option><option value="present">あり</option>
              </select>
            </label>
            {data.deductions.spouse === 'present' && (
              <NumberField label="配偶者の合計所得金額" note="給与のみなら収入−給与所得控除" value={data.deductions.spouseIncome} onChange={(v) => setDed({ spouseIncome: v })} />
            )}
            <NumberField label="一般扶養親族（人数）" value={data.deductions.dependentsGeneral} onChange={(v) => setDed({ dependentsGeneral: v })} />
            <NumberField label="特定扶養親族 19-22歳（人数）" value={data.deductions.dependentsSpecific} onChange={(v) => setDed({ dependentsSpecific: v })} />
            <NumberField label="老人扶養親族 70歳以上（人数）" value={data.deductions.dependentsElderly} onChange={(v) => setDed({ dependentsElderly: v })} />
            <label className="field"><span>ひとり親・寡婦控除</span>
              <select value={data.deductions.singleParent} onChange={(e) => setDed({ singleParent: e.target.value as DeductionInput['singleParent'] })}>
                <option value="none">該当なし</option>
                <option value="singleParent">ひとり親（35万円）</option>
                <option value="widow">寡婦（27万円）</option>
              </select>
            </label>
          </div>
          <p className="summary">所得控除合計（所得税）<strong>{yen(result.deductions.total)}</strong>（うち基礎控除 {yen(result.deductions.basic)}）</p>
        </section>
      )}

      {/* ── 計算結果 ─────────────────────────────────────────────────────── */}
      {tab === 'result' && (
        <section>
          <h2>計算結果</h2>
          <table className="result">
            <tbody>
              <tr><td>給与所得</td><td className="num">{yen(result.salaryIncome)}</td></tr>
              <tr><td>事業所得（青色控除 {yen(result.blueDeduction)} 適用後）</td><td className="num">{yen(result.businessIncome)}</td></tr>
              <tr className="total"><td>合計所得金額</td><td className="num">{yen(result.totalIncome)}</td></tr>
              <tr><td>所得控除合計</td><td className="num">{yen(-result.deductions.total)}</td></tr>
              <tr className="total"><td>課税所得金額</td><td className="num">{yen(result.taxableIncome)}</td></tr>
              <tr><td>所得税（基準額）</td><td className="num">{yen(result.incomeTaxBase)}</td></tr>
              <tr><td>復興特別所得税（2.1%）</td><td className="num">{yen(result.reconstructionTax)}</td></tr>
              <tr className="total"><td>所得税及び復興特別所得税</td><td className="num">{yen(result.incomeTaxTotal)}</td></tr>
              <tr><td>源泉徴収税額</td><td className="num">{yen(-result.withheldTax)}</td></tr>
              <tr className={`total ${result.taxDue < 0 ? 'refund' : 'due'}`}>
                <td>{result.taxDue < 0 ? '還付される税額' : '納付する税額'}</td>
                <td className="num">{yen(Math.abs(result.taxDue))}</td>
              </tr>
            </tbody>
          </table>

          <h3>住民税（翌年度・概算）</h3>
          <table className="result"><tbody>
            <tr><td>課税所得（住民税ベース）</td><td className="num">{yen(result.residentTaxableIncome)}</td></tr>
            <tr className="total"><td>住民税 概算（所得割10%＋均等割）</td><td className="num">{yen(result.residentTax)}</td></tr>
          </tbody></table>

          <details>
            <summary>所得控除の内訳</summary>
            <table className="breakdown"><tbody>
              {([
                ['社会保険料控除', result.deductions.socialInsurance],
                ['小規模企業共済等掛金控除', result.deductions.smallBusinessMutualAid],
                ['生命保険料控除', result.deductions.lifeInsurance],
                ['地震保険料控除', result.deductions.earthquakeInsurance],
                ['医療費控除', result.deductions.medical],
                ['寄附金控除', result.deductions.donation],
                ['配偶者（特別）控除', result.deductions.spouse],
                ['扶養控除', result.deductions.dependents],
                ['ひとり親・寡婦控除', result.deductions.singleParent],
                ['基礎控除', result.deductions.basic],
              ] as [string, number][]).filter(([, v]) => v > 0).map(([k, v]) => (
                <tr key={k}><td>{k}</td><td className="num">{yen(v)}</td></tr>
              ))}
            </tbody></table>
          </details>
          <p className="disclaimer">
            ※ 本ツールは試算用です。住民税・寄附金税額控除は簡略計算。
            実際の申告は国税庁「確定申告書等作成コーナー」等でご確認ください。
          </p>
        </section>
      )}

      {/* ── e-Tax 入力ガイド ─────────────────────────────────────────────── */}
      {tab === 'etax' && (
        <EtaxGuide result={result} pl={pl} bs={bs} data={data} useJournal={useJournal} />
      )}
    </div>
  );
}

// ── e-Tax 入力ガイドコンポーネント ──────────────────────────────────────────

function EtaxGuide({ result, pl, bs, data, useJournal }: {
  result: ReturnType<typeof calculate>;
  pl: ReturnType<typeof derivePL>;
  bs: ReturnType<typeof deriveBS>;
  data: AppData;
  useJournal: boolean;
}) {
  const getPlAmt = (code: string) =>
    [...pl.revenues, ...pl.expenses].find((x) => x.account.code === code)?.amount ?? 0;

  const fields: { section: string; rows: { label: string; value: number | string; note?: string }[] }[] = [
    {
      section: '確定申告書B 第一表',
      rows: [
        { label: '⑥ 事業（営業等）', value: result.businessIncome, note: '事業所得欄' },
        { label: '⑦ 給与', value: result.salaryIncome, note: '給与所得欄' },
        { label: '⑫ 合計', value: result.totalIncome, note: '合計所得金額' },
        { label: '㉔ 社会保険料控除', value: result.deductions.socialInsurance },
        { label: '㉕ 小規模企業共済等掛金控除', value: result.deductions.smallBusinessMutualAid },
        { label: '㉖ 生命保険料控除', value: result.deductions.lifeInsurance },
        { label: '㉗ 地震保険料控除', value: result.deductions.earthquakeInsurance },
        { label: '㉛ 医療費控除', value: result.deductions.medical },
        { label: '㊱ 寄附金控除', value: result.deductions.donation },
        { label: '㊲ 配偶者（特別）控除', value: result.deductions.spouse },
        { label: '㊳ 扶養控除', value: result.deductions.dependents },
        { label: '㊵ 基礎控除', value: result.deductions.basic },
        { label: '㊶ 合計（所得から差し引かれる金額）', value: result.deductions.total },
        { label: '㊷ 課税される所得金額', value: result.taxableIncome },
        { label: '㊸ 上の㊷に対する税額', value: result.incomeTaxBase },
        { label: '㊺ 復興特別所得税額', value: result.reconstructionTax },
        { label: '㊻ 所得税及び復興特別所得税の額', value: result.incomeTaxTotal },
        { label: '㊿ 源泉徴収税額', value: result.withheldTax },
        { label: '納める税金 / 還付される税金', value: Math.abs(result.taxDue), note: result.taxDue >= 0 ? '納付' : '還付（マイナス）' },
      ],
    },
    {
      section: '青色申告決算書（損益計算書）',
      rows: [
        { label: '① 売上（収入）金額', value: getPlAmt('4010') || data.business.revenues.reduce((s, r) => s + r.amount, 0) },
        { label: '② 仕入金額', value: getPlAmt('5020') },
        { label: '給料賃金', value: getPlAmt('5100') },
        { label: '外注工賃', value: getPlAmt('5110') },
        { label: '減価償却費', value: result.depreciation || getPlAmt('5120') },
        { label: '地代家賃', value: getPlAmt('5140') },
        { label: '利子割引料', value: getPlAmt('5150') },
        { label: '租税公課', value: getPlAmt('5160') },
        { label: '水道光熱費', value: getPlAmt('5180') },
        { label: '旅費交通費', value: getPlAmt('5190') },
        { label: '通信費', value: getPlAmt('5200') },
        { label: '広告宣伝費', value: getPlAmt('5210') },
        { label: '接待交際費', value: getPlAmt('5220') },
        { label: '損害保険料', value: getPlAmt('5230') },
        { label: '修繕費', value: getPlAmt('5240') },
        { label: '消耗品費', value: getPlAmt('5250') },
        { label: '専従者給与', value: getPlAmt('5270') },
        { label: '雑費', value: getPlAmt('5900') },
        { label: '差引金額（青色控除前の利益）', value: pl.netProfit || result.businessIncome + result.blueDeduction },
        { label: '青色申告特別控除額', value: result.blueDeduction },
        { label: '所得金額（事業所得）', value: result.businessIncome },
      ],
    },
    ...(useJournal ? [{
      section: '青色申告決算書（貸借対照表）期末残高',
      rows: [
        ...bs.assets.map(({ account, amount }) => ({
          label: account.bsLabel ?? account.name,
          value: amount,
        })),
        { label: '資産合計', value: bs.totalAssets },
        ...bs.liabilities.map(({ account, amount }) => ({
          label: account.bsLabel ?? account.name,
          value: amount,
        })),
        { label: '負債合計', value: bs.totalLiabilities },
        ...bs.equities.map(({ account, amount }) => ({
          label: account.bsLabel ?? account.name,
          value: amount,
        })),
        { label: '当期純利益', value: bs.retainedEarnings },
      ],
    }] : []),
  ];

  return (
    <section>
      <h2>e-Tax 入力ガイド</h2>
      <p className="note">
        e-Taxの「確定申告書等作成コーナー」に入力する際の数値一覧です。
        e-Taxソフトウェア上の欄番号と照合しながらご利用ください。
      </p>
      {fields.map(({ section, rows }) => (
        <div key={section}>
          <h3>{section}</h3>
          <table className="result etax">
            <tbody>
              {rows.map(({ label, value, note }) => (
                typeof value === 'number' && value === 0 ? null : (
                  <tr key={label}>
                    <td>{label}</td>
                    <td className="num">{typeof value === 'number' ? yen(value) : value}</td>
                    {note && <td className="note-col">{note}</td>}
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <p className="disclaimer">
        ※ 欄番号は令和7年分の様式に基づきます。実際の入力時は国税庁の手引きと照合してください。
        住宅ローン控除・予定納税・第三表（分離課税）などには非対応です。
      </p>
    </section>
  );
}

// ── 仕訳帳テーブル ───────────────────────────────────────────────────────────

const ACCOUNT_OPTIONS = ACCOUNTS.filter((a) => a.type !== '資本' || true).map((a) => (
  <option key={a.code} value={a.code}>[{a.code}] {a.name}（{a.type}）</option>
));

function JournalTable({ entries, onChange }: {
  entries: JournalEntry[]; onChange: (e: JournalEntry[]) => void;
}) {
  const updateEntry = (id: string, p: Partial<JournalEntry>) =>
    onChange(entries.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const updateLine = (entryId: string, lineIdx: number, p: Partial<{ accountCode: string; debit: number; credit: number }>) =>
    onChange(entries.map((e) => {
      if (e.id !== entryId) return e;
      const lines = e.lines.map((l, i) => i === lineIdx ? { ...l, ...p } : l);
      return { ...e, lines };
    }));
  const addLine = (entryId: string) =>
    onChange(entries.map((e) =>
      e.id === entryId ? { ...e, lines: [...e.lines, { accountCode: '5900', debit: 0, credit: 0 }] } : e,
    ));
  const removeLine = (entryId: string, lineIdx: number) =>
    onChange(entries.map((e) =>
      e.id === entryId ? { ...e, lines: e.lines.filter((_, i) => i !== lineIdx) } : e,
    ));

  if (entries.length === 0) {
    return <p className="note">仕訳がありません。「＋ 仕訳を追加」またはCSV取込でデータを入力してください。</p>;
  }

  return (
    <div>
      {entries.map((entry) => {
        const balanced = isBalanced(entry);
        return (
          <div key={entry.id} className={`journal-entry ${balanced ? '' : 'unbalanced'}`}>
            <div className="journal-header">
              <input type="date" value={entry.date} onChange={(e) => updateEntry(entry.id, { date: e.target.value })} />
              <input type="text" placeholder="摘要" value={entry.description}
                onChange={(e) => updateEntry(entry.id, { description: e.target.value })}
                style={{ flex: 1 }} />
              {!balanced && <span className="badge-error">貸借不一致</span>}
              <button className="del" onClick={() => onChange(entries.filter((e) => e.id !== entry.id))}>×</button>
            </div>
            <table className="journal-lines">
              <thead><tr><th>借方科目</th><th>借方金額</th><th>貸方科目</th><th>貸方金額</th><th /></tr></thead>
              <tbody>
                {entry.lines.map((line, li) => {
                  return (
                    <tr key={li}>
                      <td>
                        <select value={line.accountCode}
                          onChange={(e) => updateLine(entry.id, li, { accountCode: e.target.value })}>
                          {ACCOUNT_OPTIONS}
                        </select>
                      </td>
                      <td>
                        <input type="text" inputMode="numeric" className="num" placeholder="0"
                          value={line.debit === 0 ? '' : line.debit.toLocaleString('ja-JP')}
                          onChange={(e) => {
                            const n = Number(e.target.value.replace(/[,，¥\s]/g, ''));
                            if (!isNaN(n)) updateLine(entry.id, li, { debit: n });
                          }} />
                      </td>
                      <td>
                        <select value={line.accountCode}
                          onChange={(e) => updateLine(entry.id, li, { accountCode: e.target.value })}>
                          {ACCOUNT_OPTIONS}
                        </select>
                      </td>
                      <td>
                        <input type="text" inputMode="numeric" className="num" placeholder="0"
                          value={line.credit === 0 ? '' : line.credit.toLocaleString('ja-JP')}
                          onChange={(e) => {
                            const n = Number(e.target.value.replace(/[,，¥\s]/g, ''));
                            if (!isNaN(n)) updateLine(entry.id, li, { credit: n });
                          }} />
                      </td>
                      <td>
                        {entry.lines.length > 2 && (
                          <button className="del" onClick={() => removeLine(entry.id, li)}>×</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button onClick={() => addLine(entry.id)} style={{ fontSize: '.8rem', marginTop: '.25rem' }}>
              ＋ 行を追加（複合仕訳）
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── 汎用エントリ表 ───────────────────────────────────────────────────────────

interface Column<T> {
  key: keyof T & string;
  label: string;
  type: 'date' | 'text' | 'amount' | 'category';
}

function EntryTable<T extends { id: string; amount: number }>({ entries, columns, onChange, newEntry }: {
  entries: T[]; columns: Column<T>[]; onChange: (entries: T[]) => void; newEntry: () => T;
}) {
  const update = (id: string, key: string, value: unknown) =>
    onChange(entries.map((e) => (e.id === id ? { ...e, [key]: value } : e)));
  return (
    <div>
      <table className="entries">
        <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}<th /></tr></thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              {columns.map((c) => (
                <td key={c.key}>
                  {c.type === 'category' ? (
                    <select value={String(e[c.key])} onChange={(ev) => update(e.id, c.key, ev.target.value as ExpenseCategory)}>
                      {EXPENSE_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  ) : c.type === 'amount' ? (
                    <input type="text" inputMode="numeric" className="num"
                      value={e.amount === 0 ? '' : e.amount.toLocaleString('ja-JP')} placeholder="0"
                      onChange={(ev) => {
                        const n = Number(ev.target.value.replace(/[,，¥\s]/g, ''));
                        if (!isNaN(n)) update(e.id, 'amount', n);
                      }} />
                  ) : (
                    <input type={c.type} value={String(e[c.key])} onChange={(ev) => update(e.id, c.key, ev.target.value)} />
                  )}
                </td>
              ))}
              <td><button className="del" onClick={() => onChange(entries.filter((x) => x.id !== e.id))}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => onChange([...entries, newEntry()])}>＋ 行を追加</button>
    </div>
  );
}

function AssetTable({ assets, onChange, taxYear }: {
  assets: FixedAsset[]; onChange: (a: FixedAsset[]) => void; taxYear: number;
}) {
  const update = (id: string, p: Partial<FixedAsset>) =>
    onChange(assets.map((a) => (a.id === id ? { ...a, ...p } : a)));
  return (
    <div>
      <table className="entries">
        <thead><tr><th>名称</th><th>取得日</th><th>取得価額</th><th>耐用年数</th><th>事業割合%</th><th /></tr></thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.id}>
              <td><input type="text" value={a.name} onChange={(e) => update(a.id, { name: e.target.value })} /></td>
              <td><input type="date" value={a.acquisitionDate} onChange={(e) => update(a.id, { acquisitionDate: e.target.value })} /></td>
              <td><input type="text" inputMode="numeric" className="num"
                value={a.acquisitionCost === 0 ? '' : a.acquisitionCost.toLocaleString('ja-JP')} placeholder="0"
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/[,，¥\s]/g, ''));
                  if (!isNaN(n)) update(a.id, { acquisitionCost: n });
                }} /></td>
              <td><input type="number" min={2} value={a.usefulLifeYears} onChange={(e) => update(a.id, { usefulLifeYears: Number(e.target.value) })} /></td>
              <td><input type="number" min={1} max={100} value={Math.round(a.businessUseRatio * 100)} onChange={(e) => update(a.id, { businessUseRatio: Number(e.target.value) / 100 })} /></td>
              <td><button className="del" onClick={() => onChange(assets.filter((x) => x.id !== a.id))}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => onChange([...assets, {
        id: newId(), name: '', acquisitionDate: `${taxYear}-01-01`,
        acquisitionCost: 0, usefulLifeYears: 4, businessUseRatio: 1,
      }])}>＋ 資産を追加</button>
    </div>
  );
}
