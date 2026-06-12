import { useEffect, useMemo, useState } from 'react';
import type {
  SalaryInput, BusinessInput, DeductionInput, ExpenseEntry, RevenueEntry,
  FixedAsset, ExpenseCategory, BlueDeductionType,
} from './tax/types';
import { EXPENSE_CATEGORIES } from './tax/types';
import { calculate } from './tax/engine';
import { parseExpenseCsv, parseRevenueCsv } from './tax/csv';
import './App.css';

const STORAGE_KEY = 'kakutei-shinkoku-data-v1';

const defaultSalary: SalaryInput = { grossSalary: 0, withheldTax: 0 };
const defaultBusiness: BusinessInput = { revenues: [], expenses: [], assets: [], blueDeductionType: 65 };
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
    if (raw) return JSON.parse(raw);
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

type Tab = 'salary' | 'business' | 'deductions' | 'result';

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

  const setSalary = (p: Partial<SalaryInput>) => setData((d) => ({ ...d, salary: { ...d.salary, ...p } }));
  const setBusiness = (p: Partial<BusinessInput>) => setData((d) => ({ ...d, business: { ...d.business, ...p } }));
  const setDed = (p: Partial<DeductionInput>) => setData((d) => ({ ...d, deductions: { ...d.deductions, ...p } }));

  const importCsv = (kind: 'expense' | 'revenue') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (kind === 'expense') {
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

      <nav className="tabs">
        {([['salary', '給与所得'], ['business', '事業所得'], ['deductions', '所得控除'], ['result', '計算結果']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{label}</button>
        ))}
      </nav>

      {tab === 'salary' && (
        <section>
          <h2>給与所得（源泉徴収票から転記）</h2>
          <NumberField label="支払金額（給与収入）" value={data.salary.grossSalary} onChange={(v) => setSalary({ grossSalary: v })} />
          <NumberField label="源泉徴収税額" value={data.salary.withheldTax} onChange={(v) => setSalary({ withheldTax: v })} />
          <p className="summary">給与所得控除 {yen(result.salaryDeduction)} → 給与所得 <strong>{yen(result.salaryIncome)}</strong></p>
        </section>
      )}

      {tab === 'business' && (
        <section>
          <h2>事業所得</h2>
          <label className="field">
            <span>青色申告特別控除</span>
            <select
              value={data.business.blueDeductionType}
              onChange={(e) => setBusiness({ blueDeductionType: Number(e.target.value) as BlueDeductionType })}
            >
              <option value={65}>65万円（複式簿記＋e-Tax/電子帳簿）</option>
              <option value={55}>55万円（複式簿記・書面提出）</option>
              <option value={10}>10万円（簡易簿記）</option>
              <option value={0}>なし（白色申告）</option>
            </select>
          </label>

          <h3>売上 <small>合計 {yen(result.businessRevenue)}</small></h3>
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

          <h3>経費 <small>合計 {yen(result.businessExpenses)}</small></h3>
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
              <summary>経費の科目別内訳（収支内訳書/決算書用）</summary>
              <table className="breakdown">
                <tbody>
                  {[...expenseByCategory.entries()].map(([c, v]) => (
                    <tr key={c}><td>{c}</td><td className="num">{yen(v)}</td></tr>
                  ))}
                  {result.depreciation > 0 && <tr><td>減価償却費</td><td className="num">{yen(result.depreciation)}</td></tr>}
                </tbody>
              </table>
            </details>
          )}

          <h3>固定資産（定額法・減価償却） <small>当年償却費 {yen(result.depreciation)}</small></h3>
          <AssetTable assets={data.business.assets} onChange={(assets) => setBusiness({ assets })} taxYear={data.taxYear} />

          <p className="summary">
            売上 {yen(result.businessRevenue)} − 経費 {yen(result.businessExpenses)} − 減価償却 {yen(result.depreciation)}
            − 青色控除 {yen(result.blueDeduction)} → 事業所得 <strong>{yen(result.businessIncome)}</strong>
          </p>
        </section>
      )}

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
          <table className="result">
            <tbody>
              <tr><td>課税所得（住民税ベース）</td><td className="num">{yen(result.residentTaxableIncome)}</td></tr>
              <tr className="total"><td>住民税 概算（所得割10%＋均等割）</td><td className="num">{yen(result.residentTax)}</td></tr>
            </tbody>
          </table>

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
            ※ 本ツールは試算用です（令和7年分税制で計算・住民税や寄附金税額控除は簡略計算）。
            実際の申告は国税庁「確定申告書等作成コーナー」等でご確認ください。
            予定納税・特定親族特別控除・障害者控除・住宅ローン控除などは未対応です。
          </p>
        </section>
      )}
    </div>
  );
}

// ---- 汎用エントリ表 ----

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
