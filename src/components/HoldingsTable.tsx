import { useState } from 'react';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown } from 'lucide-react';
import type { Holding } from '../types';
import type { Transaction } from '../types';
import { formatCurrency, formatNumber, formatPercent, formatPercentPlain, colorClass, formatDate } from '../utils/format';
import { SECTOR_COLORS } from '../types';

type SortKey = keyof Holding | 'pl' | 'plPct' | 'yieldMkt' | 'yieldCost' | 'marketValue' | 'annualDiv';
type SortDir = 'asc' | 'desc';

interface HoldingsTableProps {
  holdings: Holding[];
  transactions: Transaction[];
}

export function HoldingsTable({ holdings, transactions }: HoldingsTableProps) {
  const [tab, setTab] = useState<'summary' | 'history'>('summary');
  const [sortKey, setSortKey] = useState<SortKey>('stockCode');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
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
    let av: number | string = a[sortKey as keyof typeof a] as number | string;
    let bv: number | string = b[sortKey as keyof typeof b] as number | string;
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv, 'ja') : bv.localeCompare(av, 'ja');
    }
    const an = Number(av);
    const bn = Number(bv);
    return sortDir === 'asc' ? an - bn : bn - an;
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
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  const allSelected = sorted.length > 0 && sorted.every(h => selected.has(h.stockCode));
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(sorted.map(h => h.stockCode)));
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-4 pt-3">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'summary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('summary')}
        >
          サマリー
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('history')}
        >
          取引履歴
        </button>
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
                <Th label="利回り%" col="yieldMkt" className="text-right" />
                <Th label="利回り(取得)%" col="yieldCost" className="text-right" />
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
                  <td className="px-3 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={selected.has(h.stockCode)}
                      onChange={() => toggleSelect(h.stockCode)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: SECTOR_COLORS[h.sector] }}
                      />
                      <div>
                        <div className="font-semibold text-gray-900">{h.stockCode}</div>
                        <div className="text-xs text-gray-500">{h.stockName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{h.sector}</td>
                  <td className="px-3 py-3 text-right text-gray-800">{formatNumber(h.quantity)}</td>
                  <td className="px-3 py-3 text-right text-gray-800">{formatCurrency(h.avgCost)}</td>
                  <td className="px-3 py-3 text-right text-gray-800">{formatCurrency(h.currentPrice)}</td>
                  <td className="px-3 py-3 text-right font-medium text-gray-900">{formatCurrency(h.marketValue)}</td>
                  <td className="px-3 py-3 text-right">
                    <div className={`flex items-center justify-end gap-1 font-medium ${colorClass(h.pl)}`}>
                      {h.pl >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      <div>
                        <div>{formatCurrency(h.pl)}</div>
                        <div className="text-xs">{formatPercent(h.plPct)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-gray-800">{formatCurrency(h.annualDiv)}</td>
                  <td className={`px-3 py-3 text-right font-medium ${colorClass(h.yieldMkt)}`}>
                    {formatPercentPlain(h.yieldMkt)}
                  </td>
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
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">日付</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">銘柄</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">種別</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">数量</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">単価</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">合計</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">メモ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                    取引履歴がありません。
                  </td>
                </tr>
              )}
              {[...transactions].sort((a, b) => b.date.localeCompare(a.date)).map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatDate(tx.date)}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-900">{tx.stockCode}</div>
                    <div className="text-xs text-gray-500">{tx.stockName}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tx.type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {tx.type === 'buy' ? '買い' : '売り'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-gray-800">{formatNumber(tx.quantity)}</td>
                  <td className="px-3 py-3 text-right text-gray-800">{formatCurrency(tx.price)}</td>
                  <td className="px-3 py-3 text-right font-medium text-gray-900">{formatCurrency(tx.quantity * tx.price)}</td>
                  <td className="px-3 py-3 text-gray-500 text-xs max-w-32 truncate">{tx.memo ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
