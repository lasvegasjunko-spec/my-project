import { useState, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Pencil } from 'lucide-react';
import type { Holding, Transaction, Sector } from '../types';
import { ALL_SECTORS, SECTOR_COLORS } from '../types';
import { formatCurrency, formatNumber, formatPercent, formatPercentPlain, colorClass, formatDate } from '../utils/format';
import { useStore } from '../store/useStore';

type SortKey = keyof Holding | 'pl' | 'plPct' | 'yieldMkt' | 'yieldCost' | 'marketValue' | 'annualDiv';
type SortDir = 'asc' | 'desc';
type EditableField = 'stockName' | 'sector' | 'quantity' | 'avgCost' | 'currentPrice' | 'dividendPerShare';

interface EditCell {
  code: string;
  field: EditableField;
}

interface HoldingsTableProps {
  holdings: Holding[];
  transactions: Transaction[];
}

// Inline cell editor — number
function NumericCell({ value, onSave, onCancel }: { value: number; onSave: (v: number) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  function commit() {
    const n = parseFloat(draft.replace(/,/g, ''));
    if (!isNaN(n) && n >= 0) onSave(n);
    else onCancel();
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={ref}
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel(); }}
        onBlur={commit}
        className="w-24 px-1.5 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
      />
    </div>
  );
}

// Inline cell editor — text
function TextCell({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  function commit() {
    if (draft.trim()) onSave(draft.trim());
    else onCancel();
  }

  return (
    <input
      ref={ref}
      type="text"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel(); }}
      onBlur={commit}
      className="w-28 px-1.5 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  );
}

// Inline sector selector
function SectorCell({ value, onSave, onCancel }: { value: Sector; onSave: (v: Sector) => void; onCancel: () => void }) {
  const ref = useRef<HTMLSelectElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <select
      ref={ref}
      defaultValue={value}
      onChange={e => onSave(e.target.value as Sector)}
      onBlur={onCancel}
      onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
      className="text-xs border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      {ALL_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

export function HoldingsTable({ holdings, transactions }: HoldingsTableProps) {
  const { dispatch } = useStore();
  const [tab, setTab] = useState<'summary' | 'history'>('summary');
  const [sortKey, setSortKey] = useState<SortKey>('stockCode');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editCell, setEditCell] = useState<EditCell | null>(null);

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

  function toggleSelect(code: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  const allSelected = sorted.length > 0 && sorted.every(h => selected.has(h.stockCode));
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(sorted.map(h => h.stockCode)));
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

  function saveField(stockCode: string, field: EditableField, value: string | number) {
    dispatch({ type: 'UPDATE_HOLDING', payload: { stockCode, overrides: { [field]: value } } });
    setEditCell(null);
  }

  function startEdit(code: string, field: EditableField) {
    setEditCell({ code, field });
  }

  // Editable number cell renderer
  function EditableNum({ h, field, display }: { h: typeof enriched[0]; field: EditableField; display: string }) {
    const isEditing = editCell?.code === h.stockCode && editCell?.field === field;
    if (isEditing) {
      const raw = h[field as keyof typeof h] as number;
      return (
        <NumericCell
          value={raw}
          onSave={v => saveField(h.stockCode, field, v)}
          onCancel={() => setEditCell(null)}
        />
      );
    }
    return (
      <span
        className="cursor-pointer hover:bg-blue-50 px-1 rounded group inline-flex items-center gap-1"
        onClick={() => startEdit(h.stockCode, field)}
        title="クリックして編集"
      >
        {display}
        <Pencil size={10} className="opacity-0 group-hover:opacity-40 text-blue-400" />
      </span>
    );
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
        {tab === 'summary' && (
          <span className="ml-auto self-center text-xs text-gray-400 pb-1 flex items-center gap-1">
            <Pencil size={11} />セルをクリックして編集
          </span>
        )}
      </div>

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
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-400 text-sm">
                    保有銘柄がありません。取引を追加してください。
                  </td>
                </tr>
              )}
              {sorted.map(h => (
                <tr key={h.stockCode} className={`hover:bg-gray-50 transition-colors ${selected.has(h.stockCode) ? 'bg-blue-50' : ''}`}>
                  {/* Checkbox */}
                  <td className="px-3 py-3 w-8">
                    <input type="checkbox" checked={selected.has(h.stockCode)} onChange={() => toggleSelect(h.stockCode)} className="rounded" />
                  </td>

                  {/* 銘柄 */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SECTOR_COLORS[h.sector] }} />
                      <div>
                        <div className="font-semibold text-gray-900">{h.stockCode}</div>
                        <div className="text-xs text-gray-500">
                          {editCell?.code === h.stockCode && editCell.field === 'stockName' ? (
                            <TextCell value={h.stockName} onSave={v => saveField(h.stockCode, 'stockName', v)} onCancel={() => setEditCell(null)} />
                          ) : (
                            <span className="cursor-pointer hover:text-blue-500 group inline-flex items-center gap-1" onClick={() => startEdit(h.stockCode, 'stockName')} title="クリックして編集">
                              {h.stockName}
                              <Pencil size={9} className="opacity-0 group-hover:opacity-40 text-blue-400" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 業種 */}
                  <td className="px-3 py-3 text-xs whitespace-nowrap">
                    {editCell?.code === h.stockCode && editCell.field === 'sector' ? (
                      <SectorCell value={h.sector} onSave={v => saveField(h.stockCode, 'sector', v)} onCancel={() => setEditCell(null)} />
                    ) : (
                      <span className="cursor-pointer hover:text-blue-500 group inline-flex items-center gap-1 text-gray-600" onClick={() => startEdit(h.stockCode, 'sector')} title="クリックして編集">
                        {h.sector}
                        <Pencil size={9} className="opacity-0 group-hover:opacity-40 text-blue-400" />
                      </span>
                    )}
                  </td>

                  {/* 数量 */}
                  <td className="px-3 py-3 text-right text-gray-800">
                    <EditableNum h={h} field="quantity" display={formatNumber(h.quantity)} />
                  </td>

                  {/* 取得単価 */}
                  <td className="px-3 py-3 text-right text-gray-800">
                    <EditableNum h={h} field="avgCost" display={formatCurrency(h.avgCost)} />
                  </td>

                  {/* 現在株価 */}
                  <td className="px-3 py-3 text-right text-gray-800">
                    <EditableNum h={h} field="currentPrice" display={formatCurrency(h.currentPrice)} />
                  </td>

                  {/* 評価額 (computed) */}
                  <td className="px-3 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(h.marketValue)}
                  </td>

                  {/* 損益 (computed) */}
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
                    <div>
                      <div>{formatCurrency(h.annualDiv)}</div>
                      <div className="text-xs text-gray-400">
                        <EditableNum h={h} field="dividendPerShare" display={`¥${h.dividendPerShare.toLocaleString('ja-JP')}/株`} />
                      </div>
                    </div>
                  </td>

                  {/* 利回り (computed) */}
                  <td className={`px-3 py-3 text-right font-medium ${colorClass(h.yieldMkt)}`}>
                    {formatPercentPlain(h.yieldMkt)}
                  </td>

                  {/* 利回り(取得) (computed) */}
                  <td className={`px-3 py-3 text-right font-medium ${colorClass(h.yieldCost)}`}>
                    {formatPercentPlain(h.yieldCost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">取引履歴がありません。</td>
                </tr>
              )}
              {[...transactions].sort((a, b) => b.date.localeCompare(a.date)).map(tx => {
                const isDemo = tx.id.startsWith('demo-');
                return (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatDate(tx.date)}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">{tx.stockCode}</td>
                    <td className="px-3 py-3 text-gray-800">{tx.stockName}</td>
                    <td className="px-3 py-3">
                      {tx.brokerage ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {tx.brokerage}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-800">{formatNumber(tx.quantity)}</td>
                    <td className="px-3 py-3 text-right text-gray-800">{formatCurrency(tx.price)}</td>
                    <td className="px-3 py-3 text-right font-medium text-gray-900">{formatCurrency(tx.quantity * tx.price)}</td>
                    <td className="px-3 py-3 text-center">
                      {!isDemo && (
                        <button
                          onClick={() => dispatch({ type: 'DELETE_TRANSACTION', payload: tx.id })}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                          title="削除"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
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
