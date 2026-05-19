import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useStore, usePortfolioStats } from '../store/useStore';
import { formatCurrency, formatPercent, formatPercentPlain } from '../utils/format';
import { TrendingUp, TrendingDown } from 'lucide-react';

const navLinks = [
  { to: '/dashboard', label: 'ダッシュボード' },
  { to: '/portfolio', label: 'ポートフォリオ' },
  { to: '/analysis', label: '分析' },
  { to: '/stocks', label: '銘柄' },
  { to: '/watchlist', label: 'ウォッチ' },
  { to: '/settings', label: '設定' },
];

export function Layout() {
  const { state, holdings } = useStore();
  const stats = usePortfolioStats(holdings);
  const location = useLocation();

  const currentNav = navLinks.find(l => location.pathname.startsWith(l.to));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 flex items-center h-14 gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-lg font-bold text-blue-600 tracking-tight">Haito~</span>
            <span className="text-xs text-gray-400 font-medium hidden sm:inline">配当管理</span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sub-header stats bar */}
        <div className="bg-gray-900 text-white">
          <div className="max-w-screen-2xl mx-auto px-4 flex items-center h-9 gap-6 text-xs overflow-x-auto no-scrollbar">
            {/* LIVE indicator */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-semibold text-green-400 tracking-widest">LIVE</span>
            </div>

            {/* YLD */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-gray-400 font-medium">YLD</span>
              <span className="font-bold text-white">{formatPercentPlain(stats.yieldOnMarket)}</span>
            </div>

            {/* MV */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-gray-400 font-medium">MV</span>
              <span className="font-bold text-white">{formatCurrency(stats.totalMarketValue)}</span>
            </div>

            {/* P/L */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-gray-400 font-medium">P/L</span>
              <span className={`font-bold flex items-center gap-0.5 ${stats.totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.totalPL >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {formatPercent(stats.plPercent)}
              </span>
            </div>

            {/* POS */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-gray-400 font-medium">POS</span>
              <span className="font-bold text-white">{holdings.length}</span>
            </div>

            {/* Page title */}
            {currentNav && (
              <div className="ml-auto flex-shrink-0 text-gray-400 font-medium">
                {currentNav.label}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Demo banner */}
      {state.isDemoMode && (
        <div className="bg-blue-600 text-white text-xs text-center py-2 px-4">
          <span className="font-bold mr-2">DEMO</span>
          — サンプルデータで動作中。あなたが入力した内容はあなたのブラウザにのみ保存されます。
        </div>
      )}

      {/* Page content */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
