import { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Calendar, ClipboardList } from 'lucide-react';
import { useStore, usePortfolioStats } from '../store/useStore';
import { SummaryCard } from '../components/SummaryCard';
import { SectorAllocation } from '../components/SectorAllocation';
import { HoldingsTable } from '../components/HoldingsTable';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { formatCurrency, formatPercent, formatPercentPlain } from '../utils/format';

export function Portfolio() {
  const { holdings, effectiveTransactions } = useStore();
  const stats = usePortfolioStats(holdings);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ポートフォリオ</h1>
          <p className="text-sm text-gray-500 mt-0.5">保有銘柄と資産配分</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            + 取引を追加
          </button>
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            title="CSVを貼り付けてインポート（準備中）"
          >
            <ClipboardList size={16} />
            データ 貼り付け
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="評価額"
          value={formatCurrency(stats.totalMarketValue)}
          sub={`取得額 ${formatCurrency(stats.totalCost)}`}
          icon={<DollarSign size={18} />}
        />
        <SummaryCard
          title="損益"
          value={formatCurrency(stats.totalPL)}
          sub={formatPercent(stats.plPercent)}
          subColor={stats.totalPL}
          icon={stats.totalPL >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
        />
        <SummaryCard
          title="予想年間配当"
          value={formatCurrency(stats.annualDividend)}
          sub="税引き前・年間合計"
          icon={<Calendar size={18} />}
        />
        <SummaryCard
          title="配当利回り"
          value={formatPercentPlain(stats.yieldOnMarket)}
          sub={`保有銘柄 ${holdings.length}銘柄`}
          icon={<PieChart size={18} />}
        />
      </div>

      {/* Sector allocation */}
      <SectorAllocation holdings={holdings} />

      {/* Holdings table */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">保有銘柄一覧</h2>
        <HoldingsTable holdings={holdings} transactions={effectiveTransactions} />
      </div>

      {showModal && <AddTransactionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
