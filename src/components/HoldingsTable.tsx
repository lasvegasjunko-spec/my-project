import { useState, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Pencil, ExternalLink, Trash2 } from 'lucide-react';
import type { Holding, Transaction, Sector } from '../types';
import { ALL_SECTORS, BROKERAGES, SECTOR_COLORS } from '../types';
import { formatCurrency, formatNumber, formatPercent, formatPercentPlain, colorClass, formatDate } from '../utils/format';
import { useStore } from '../store/useStore';

type SortKey = keyof Holding | 'pl' | 'plPct' | 'yieldMkt' | 'yieldCost' | 'marketValue' | 'annualDiv';
type SortDir = 'asc' | 'desc';
type HoldingEditField = 'stockName' | 'sector' | 'quantity' | 'avgCost' | 'currentPrice' | 'dividendPerShare';
type TxEditField = 'date' | 'stockCode' | 'stockName' | 'brokerage' | 'quantity' | 'price' | 'dividendPerShare';

interface HoldingsTableProps {
  holdings: Holding[];
  transactions: Transaction[];
}

function yahooUrl(code: string) {
  return `https://finance.yahoo.co.jp/quote/${code}.T`;
}

// ---- shared inline editors ----

function NumericCell({ value, onSave, onCancel }: { value: number; onSave: (v: number) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  function commit() {
    const n = parseFloat(draft.replace(/,/g, ''));
    if (!isNaN(n) && n >= 0) onSave(n); else onCancel();
  }
  return (
    <input
      ref={ref}
      type="text"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel(); }}
      onBlur={commit}
      className="w-24 px-1.5 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
    />
  );
}

function TextCell({ value, onSave, onCancel, width = 'w-28' }: { value: string; onSave: (v: string) => void; onCancel: () => void; width?: string }) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  function commit() { if (draft.trim()) onSave(draft.trim()); else onCancel(); }
  return (
    <input
      ref={ref}
      type="text"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel(); }}
      onBlur={commit}
      className={`${width} px-1.5 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500`}
    />
  );
}

function DateCell({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <input
      ref={ref}
      type="date"
      defaultValue={value}
      onChange={e => { if (e.target.value) onSave(e.target.value); }}
      onBlur={e => { if (e.target.value) onSave(e.target.value); else onCancel(); }}
      onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
      className="w-32 px-1.5 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  );
}

function SelectCell({ value, options, onSave, onCancel }: { value: string; options: readonly string[]; onSave: (v: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLSelectElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <select
      ref={ref}
      defaultValue={value}
      onChange={e => onSave(e.target.value)}
      onBlur={onCancel}
      onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
      className="text-xs border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// Editable display cell (shows pencil icon on hover)
function EditableValue({ display, onClick }: { display: React.ReactNode; onClick: () => void }) {
  return (
    <span
      className="cursor-pointer hover:bg-blue-50 px-1 rounded group inline-flex items-center gap-1"
      onClick={onClick}
      title="クリックして編集"
    >
      {display}
      <Pencil size={10} className="opacity-0 group-hover:opacity-40 text-blue-400 flex-shrink-0" />
    </span>
  );
}

export function HoldingsTable({ holdings, transactions }: HoldingsTableProps) {
  const { dispatch } = useStore();
  const [tab, setTab] = useState<'summary' | 'history'>('summary');
  const [sortKey, setSortKey] = useState<SortKey>('stockCode');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [holdingEdit, setHoldingEdit] = useState<{ code: string; field: HoldingEditField } | null>(null);
  const [txEdit, setTxEdit] = useState<{ id: string; field: TxEditField } | null>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const enriched = holdings.map(h => ({
    ...h,
    marketValue: h.quantity * h.currentPrice,
    pl: h.quantity * (h.currentPrice - h.avgCost),
    plPct: h.avgCost > 0 ? ((h.currentPrice - h.avgCost) / h.avgCost) * 100 : 0,
    annualDiv: h.quantity * h.dividendPerShare,
    yieldMkt: h.currentPrice > 0 ? (h.dividendPerShare / h.currentPrice) * 100 : 0,
    yieldCost: h.avgCost > 0 ? (h.dividendPerShare / h.avgCost) * 100 : 0,
  }));

  const sorted = [...enriched].sort((a, b) => {
    const av = a[sortKey as keyof typeof a] as number | string;
    const bv = b[sortKey as keyof typeof b] as number | string;
    if (typeof av === 'string' && typeof bv === 'string')
      return sortDir === 'asc' ? av.localeCompare(bv, 'ja') : bv.localeCompare(av, 'ja');
    return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-gray-300 ml-0.5">↕</span>;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="inline text-blue-500 ml-0.5" />
      : <ArrowDown size={12} className="inline text-blue-500 ml-0.5" />;
  }

  function Th({ label, col, className = '' }: { label: string; col: SortKey; className?: string }) {
    return (
      <th
        className={`px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none whitespace-nowrap ${className}`}
        onClick={() => toggleSort(col)}
      >
        {label}<SortIcon col={col} />
      </th>
    );
  }

  const allSelected = sorted.length > 0 && sorted.every(h => selected.has(h.stockCode));
  function toggleAll() { setSelected(allSelected ? new Set() : new Set(sorted.map(h => h.stockCode))); }

  function saveHolding(code: string, field: HoldingEditField, value: string | number) {
    dispatch({ type: 'UPDATE_HOLDING', payload: { stockCode: code, overrides: { [field]: value } } });
    setHoldingEdit(null);
  }

  function saveTx(id: string, field: TxEditField, value: string | number) {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: { id, [field]: value } });
    setTxEdit(null);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-4 pt-3">
        {(['summary', 'history'] as const).map(t => (
          <button
            key={t}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setTab(t)}
          >
            {t === 'summary' ? 'サマリー' : '取引履歴'}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-gray-400 pb-1 flex items-center gap-1">
          <Pencil size={11} />セルをクリックして編集
        </span>
      </div>

      {/* ===== SUMMARY TAB ===== */}
      {tab === 'summary' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                </th>
                <Th label="銘柄" col="stockCode" />
                <Th label="業種" col="sector" />
                <Th label="数量" col="quantity" className="text-right" />
                <Th label="取得単価" col="avgCost" className="text-right" />
                <Th label="現在株価" col="currentPrice" className="text-right" />
                <Th label="評価額" col="marketValue" className="text-right" />
                <Th label="損益" col="pl" className="text-right" />
                <Th label="配当" col="annualDiv" className="text-right" />
                <Th label="利回り" col="yieldMkt" className="text-right" />
                <Th label="利回り(取得)" col="yieldCost" className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400 text-sm">保有銘柄がありません。取引を追加してください。</td></tr>
              )}
              {sorted.map(h => {
                const isEditingH = (field: HoldingEditField) => holdingEdit?.code === h.stockCode && holdingEdit.field === field;
                const startH = (field: HoldingEditField) => setHoldingEdit({ code: h.stockCode, field });
                return (
                  <tr key={h.stockCode} className={`hover:bg-gray-50 transition-colors ${selected.has(h.stockCode) ? 'bg-blue-50' : ''}`}>
                    <td className="px-3 py-3 w-8">
                      <input type="checkbox" checked={selected.has(h.stockCode)} onChange={() => setSelected(p => { const n = new Set(p); n.has(h.stockCode) ? n.delete(h.stockCode) : n.add(h.stockCode); return n; })} className="rounded" />
                    </td>

                    {/* 銘柄 */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SECTOR_COLORS[h.sector] }} />
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-gray-900">{h.stockCode}</span>
                            <a href={yahooUrl(h.stockCode)} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-500 transition-colors" title="Yahoo!ファイナンスで開く">
                              <ExternalLink size={11} />
                            </a>
                          </div>
                          <div className="text-xs text-gray-500">
                            {isEditingH('stockName') ? (
                              <TextCell value={h.stockName} onSave={v => saveHolding(h.stockCode, 'stockName', v)} onCancel={() => setHoldingEdit(null)} />
                            ) : (
                              <EditableValue display={h.stockName} onClick={() => startH('stockName')} />
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 業種 */}
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      {isEditingH('sector') ? (
                        <SelectCell value={h.sector} options={ALL_SECTORS} onSave={v => saveHolding(h.stockCode, 'sector', v as Sector)} onCancel={() => setHoldingEdit(null)} />
                      ) : (
                        <EditableValue display={<span className="text-gray-600">{h.sector}</span>} onClick={() => startH('sector')} />
                      )}
                    </td>

                    {/* 数量 */}
                    <td className="px-3 py-3 text-right">
                      {isEditingH('quantity') ? (
                        <NumericCell value={h.quantity} onSave={v => saveHolding(h.stockCode, 'quantity', Math.floor(v))} onCancel={() => setHoldingEdit(null)} />
                      ) : (
                        <EditableValue display={<span className="text-gray-800">{formatNumber(h.quantity)}</span>} onClick={() => startH('quantity')} />
                      )}
                    </td>

                    {/* 取得単価 */}
                    <td className="px-3 py-3 text-right">
                      {isEditingH('avgCost') ? (
                        <NumericCell value={h.avgCost} onSave={v => saveHolding(h.stockCode, 'avgCost', v)} onCancel={() => setHoldingEdit(null)} />
                      ) : (
                        <EditableValue display={<span className="text-gray-800">{formatCurrency(h.avgCost)}</span>} onClick={() => startH('avgCost')} />
                      )}
                    </td>

                    {/* 現在株価 */}
                    <td className="px-3 py-3 text-right">
                      {isEditingH('currentPrice') ? (
                        <NumericCell value={h.currentPrice} onSave={v => saveHolding(h.stockCode, 'currentPrice', v)} onCancel={() => setHoldingEdit(null)} />
                      ) : (
                        <EditableValue display={<span className="text-gray-800">{formatCurrency(h.currentPrice)}</span>} onClick={() => startH('currentPrice')} />
                      )}
                    </td>

                    {/* 評価額 */}
                    <td className="px-3 py-3 text-right font-medium text-gray-900">{formatCurrency(h.marketValue)}</td>

                    {/* 損益 */}
                    <td className="px-3 py-3 text-right">
                      <div className={`flex items-center justify-end gap-1 font-medium ${colorClass(h.pl)}`}>
                        {h.pl >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        <div>
                          <div>{formatCurrency(h.pl)}</div>
                          <div className="text-xs">{formatPercent(h.plPct)}</div>
                        </div>
                      </div>
                    </td>

                    {/* 配当 */}
                    <td className="px-3 py-3 text-right text-gray-800">
                      <div>{formatCurrency(h.annualDiv)}</div>
                      <div className="text-xs text-gray-400">
                        {isEditingH('dividendPerShare') ? (
                          <NumericCell value={h.dividendPerShare} onSave={v => saveHolding(h.stockCode, 'dividendPerShare', v)} onCancel={() => setHoldingEdit(null)} />
                        ) : (
                          <EditableValue display={`¥${h.dividendPerShare.toLocaleString('ja-JP')}/株`} onClick={() => startH('dividendPerShare')} />
                        )}
                      </div>
                    </td>

                    {/* 利回り */}
                    <td className={`px-3 py-3 text-right font-medium ${colorClass(h.yieldMkt)}`}>{formatPercentPlain(h.yieldMkt)}</td>
                    <td className={`px-3 py-3 text-right font-medium ${colorClass(h.yieldCost)}`}>{formatPercentPlain(h.yieldCost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== HISTORY TAB ===== */}
      {tab === 'history' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">約定日</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">コード</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">銘柄名</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">証券会社</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">数量</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">単価</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">購入額</th>
                <th className="px-3 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">取引履歴がありません。</td></tr>
              )}
              {[...transactions].sort((a, b) => b.date.localeCompare(a.date)).map(tx => {
                const demoRow = tx.id.startsWith('demo-');
                const isEditingT = (field: TxEditField) => txEdit?.id === tx.id && txEdit.field === field;
                const startT = (field: TxEditField) => { if (!demoRow) setTxEdit({ id: tx.id, field }); };
                const saveT = (field: TxEditField, value: string | number) => saveTx(tx.id, field, value);

                return (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    {/* 約定日 */}
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                      {isEditingT('date') ? (
                        <DateCell value={tx.date} onSave={v => saveT('date', v)} onCancel={() => setTxEdit(null)} />
                      ) : (
                        <EditableValue display={formatDate(tx.date)} onClick={() => startT('date')} />
                      )}
                    </td>

                    {/* コード */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {isEditingT('stockCode') ? (
                          <TextCell value={tx.stockCode} onSave={v => saveT('stockCode', v)} onCancel={() => setTxEdit(null)} width="w-16" />
                        ) : (
                          <EditableValue display={<span className="font-medium text-gray-900">{tx.stockCode}</span>} onClick={() => startT('stockCode')} />
                        )}
                        <a href={yahooUrl(tx.stockCode)} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-500 transition-colors" title="Yahoo!ファイナンスで開く">
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </td>

                    {/* 銘柄名 */}
                    <td className="px-3 py-3">
                      {isEditingT('stockName') ? (
                        <TextCell value={tx.stockName} onSave={v => saveT('stockName', v)} onCancel={() => setTxEdit(null)} />
                      ) : (
                        <EditableValue display={<span className="text-gray-800">{tx.stockName}</span>} onClick={() => startT('stockName')} />
                      )}
                    </td>

                    {/* 証券会社 */}
                    <td className="px-3 py-3">
                      {isEditingT('brokerage') ? (
                        <SelectCell value={tx.brokerage ?? 'その他'} options={BROKERAGES} onSave={v => saveT('brokerage', v)} onCancel={() => setTxEdit(null)} />
                      ) : (
                        <EditableValue
                          onClick={() => startT('brokerage')}
                          display={
                            tx.brokerage
                              ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{tx.brokerage}</span>
                              : <span className="text-gray-400 text-xs">—</span>
                          }
                        />
                      )}
                    </td>

                    {/* 数量 */}
                    <td className="px-3 py-3 text-right">
                      {isEditingT('quantity') ? (
                        <NumericCell value={tx.quantity} onSave={v => saveT('quantity', Math.floor(v))} onCancel={() => setTxEdit(null)} />
                      ) : (
                        <EditableValue display={<span className="text-gray-800">{formatNumber(tx.quantity)}</span>} onClick={() => startT('quantity')} />
                      )}
                    </td>

                    {/* 単価 */}
                    <td className="px-3 py-3 text-right">
                      {isEditingT('price') ? (
                        <NumericCell value={tx.price} onSave={v => saveT('price', v)} onCancel={() => setTxEdit(null)} />
                      ) : (
                        <EditableValue display={<span className="text-gray-800">{formatCurrency(tx.price)}</span>} onClick={() => startT('price')} />
                      )}
                    </td>

                    {/* 購入額 */}
                    <td className="px-3 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(tx.quantity * tx.price)}
                    </td>

                    {/* 削除 */}
                    <td className="px-3 py-3 text-center">
                      {!demoRow && (
                        <button
                          onClick={() => dispatch({ type: 'DELETE_TRANSACTION', payload: tx.id })}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                          title="削除"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
