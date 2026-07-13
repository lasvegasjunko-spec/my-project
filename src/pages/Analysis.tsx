import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { useStore, usePortfolioStats } from '../store/useStore';
import { SECTOR_COLORS } from '../types';
import type { Sector } from '../types';
import { formatCurrency } from '../utils/format';

const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

// Approximate dividend payment months per stock (semi-annual)
const DIVIDEND_MONTHS: Record<string, number[]> = {
  '2914': [3, 9],
  '8591': [3, 9],
  '8316': [3, 9],
  '8058': [3, 9],
  '8766': [3, 9],
  '8053': [3, 9],
  '8031': [3, 9],
  '9433': [3, 9],
  '4502': [9],
};

// YoY growth data (simulated)
const YOY_DATA = [
  { year: '2020', dividend: 280000 },
  { year: '2021', dividend: 340000 },
  { year: '2022', dividend: 480000 },
  { year: '2023', dividend: 580000 },
  { year: '2024', dividend: 620000 },
  { year: '2025', dividend: 680000 },
];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export function Analysis() {
  const { holdings } = useStore();
  const stats = usePortfolioStats(holdings);

  // Monthly dividend data
  const monthlyData = MONTH_LABELS.map((month, idx) => {
    const monthNum = idx + 1;
    let total = 0;
    holdings.forEach(h => {
      const months = DIVIDEND_MONTHS[h.stockCode] ?? [3, 9];
      if (months.includes(monthNum)) {
        total += (h.dividendPerShare / months.length) * h.quantity;
      }
    });
    return { month, amount: Math.round(total) };
  });

  // Sector allocation for donut
  const totalValue = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0);
  const sectorMap = new Map<Sector, number>();
  holdings.forEach(h => {
    const val = h.quantity * h.currentPrice;
    sectorMap.set(h.sector, (sectorMap.get(h.sector) ?? 0) + val);
  });
  const sectorData = Array.from(sectorMap.entries())
    .map(([sector, value]) => ({
      name: sector,
      value,
      pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
      color: SECTOR_COLORS[sector],
    }))
    .sort((a, b) => b.value - a.value);

  // Dividend YoY — scale last entry based on actual annual dividend if available
  const yoyData = stats.annualDividend > 0
    ? [...YOY_DATA.slice(0, -1), { year: '2025', dividend: stats.annualDividend }]
    : YOY_DATA;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">分析</h1>
        <p className="text-sm text-gray-500 mt-0.5">配当収入と資産配分の分析</p>
      </div>

      {/* Monthly dividend income */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-1">月別配当収入</h2>
        <p className="text-xs text-gray-400 mb-4">年間予想配当の月別分布（税引き前）</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickFormatter={v => v >= 1000 ? `¥${(v / 1000).toFixed(0)}k` : `¥${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="配当収入" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector donut */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-1">業種別配分</h2>
          <p className="text-xs text-gray-400 mb-4">評価額ベース</p>
          {sectorData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">データがありません</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={(props: PieLabelRenderProps) => {
                    const entry = sectorData[props.index as number];
                    if (!entry) return '';
                    return `${entry.name} ${entry.pct.toFixed(1)}%`;
                  }}
                  labelLine={false}
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown) => [formatCurrency(Number(value)), '評価額']}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ fontSize: 11, color: '#6b7280' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Dividend growth YoY */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-1">配当成長（前年比）</h2>
          <p className="text-xs text-gray-400 mb-4">年間配当収入の推移</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={yoyData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={v => `¥${(v / 10000).toFixed(0)}万`}
              />
              <Tooltip
                formatter={(value: unknown) => [formatCurrency(Number(value)), '年間配当']}
              />
              <Line
                type="monotone"
                dataKey="dividend"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
                name="年間配当"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
          <div className="text-xs text-gray-500 mb-1">月平均配当</div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(stats.annualDividend / 12)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
          <div className="text-xs text-gray-500 mb-1">最高配当月</div>
          <div className="text-xl font-bold text-gray-900">
            {monthlyData.reduce((max, m) => m.amount > max.amount ? m : max, monthlyData[0]).month}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
          <div className="text-xs text-gray-500 mb-1">業種数</div>
          <div className="text-xl font-bold text-gray-900">{sectorData.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
          <div className="text-xs text-gray-500 mb-1">主要業種</div>
          <div className="text-base font-bold text-gray-900 truncate">
            {sectorData[0]?.name ?? '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
