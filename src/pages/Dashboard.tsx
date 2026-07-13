import { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Calendar, Clock } from 'lucide-react';
import { useStore, usePortfolioStats } from '../store/useStore';
import { SummaryCard } from '../components/SummaryCard';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { formatCurrency, formatPercent, formatPercentPlain, formatDate, colorClass } from '../utils/format';

// Upcoming dividend schedule — approximate months for demo
const DIVIDEND_MONTHS: Record<string, number[]> = {
  '2914': [3, 9],   // JT
  '8591': [3, 9],   // オリックス
  '8316': [3, 9],   // 三井住友FG
  '8058': [3, 9],   // 三菱商事
  '8766': [3, 9],   // 東京海上
  '8053': [3, 9],   // 住友商事
  '8031': [3, 9],   // 三井物産
  '9433': [3, 9],   // KDDI
  '4502': [3, 9],   // 武田薬品
};

export function Dashboard() {
  const { holdings, effectiveTransactions } = useStore();
  const stats = usePortfolioStats(holdings);
  const [showModal, setShowModal] = useState(false);

  // Build upcoming dividends (next 3 payment events)
  const now = new Date();
  const upcomingDividends = holdings
    .flatMap(h => {
      const months = DIVIDEND_MONTHS[h.stockCode] ?? [3, 9];
      return months.map(month => {
        let year = now.getFullYear();
        const date = new Date(year, month - 1, 20);
        if (date <= now) date.setFullYear(year + 1);
        return {
          stockCode: h.stockCode,
          stockName: h.stockName,
          date,
          amount: (h.dividendPerShare / 2) * h.quantity, // semi-annual
          perShare: h.dividendPerShare / 2,
        };
      });
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  // Recent transactions (last 5)
  const recentTx = [...effectiveTransactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-0.5">ポートフォリオの概要</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          + 取引を追加
        </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming dividends */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar size={16} className="text-blue-500" />
              直近の配当予定
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingDividends.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">配当予定がありません</p>
            ) : (
              upcomingDividends.map((div, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-900">{div.stockCode} {div.stockName}</span>
                    <span className="text-xs text-gray-500">
                      {div.date.getFullYear()}/{String(div.date.getMonth() + 1).padStart(2, '0')}/20
                      <span className="ml-2 text-gray-400">¥{div.perShare.toLocaleString('ja-JP')}/株</span>
                    </span>
                  </div>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(div.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={16} className="text-blue-500" />
              最近の取引
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentTx.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">取引履歴がありません</p>
            ) : (
              recentTx.map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      tx.type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {tx.type === 'buy' ? '買' : '売'}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{tx.stockCode} {tx.stockName}</div>
                      <div className="text-xs text-gray-500">{formatDate(tx.date)} · {tx.quantity}株</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${colorClass(tx.type === 'buy' ? -1 : 1)}`}>
                      {tx.type === 'buy' ? '−' : '+'}{formatCurrency(tx.quantity * tx.price)}
                    </div>
                    <div className="text-xs text-gray-400">@{formatCurrency(tx.price)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showModal && <AddTransactionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
