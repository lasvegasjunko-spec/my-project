import { useState } from 'react';
import { Search } from 'lucide-react';
import { SECTOR_COLORS } from '../types';
import type { Sector } from '../types';
import { formatCurrency, formatPercentPlain } from '../utils/format';
import { AddTransactionModal } from '../components/AddTransactionModal';

interface StockInfo {
  code: string;
  name: string;
  sector: Sector;
  price: number;
  dividendPerShare: number;
  marketCap?: string;
}

const STOCK_DATABASE: StockInfo[] = [
  { code: '2914', name: 'JT（日本たばこ産業）', sector: '食料品', price: 6343, dividendPerShare: 395 },
  { code: '8591', name: 'オリックス', sector: 'その他金融業', price: 5778, dividendPerShare: 300 },
  { code: '8316', name: '三井住友フィナンシャルグループ', sector: '銀行業', price: 5732, dividendPerShare: 890 },
  { code: '8058', name: '三菱商事', sector: '卸売業', price: 5500, dividendPerShare: 172 },
  { code: '8766', name: '東京海上ホールディングス', sector: '保険業', price: 7627, dividendPerShare: 370 },
  { code: '8053', name: '住友商事', sector: '卸売業', price: 7257, dividendPerShare: 250 },
  { code: '8031', name: '三井物産', sector: '卸売業', price: 5883, dividendPerShare: 185 },
  { code: '9433', name: 'KDDI', sector: '情報・通信業', price: 2689, dividendPerShare: 295 },
  { code: '4502', name: '武田薬品工業', sector: '医薬品', price: 5249, dividendPerShare: 260 },
  { code: '9984', name: 'ソフトバンクグループ', sector: '情報・通信業', price: 9200, dividendPerShare: 44 },
  { code: '7203', name: 'トヨタ自動車', sector: 'その他', price: 3750, dividendPerShare: 75 },
  { code: '6758', name: 'ソニーグループ', sector: 'その他', price: 13500, dividendPerShare: 90 },
  { code: '8001', name: '伊藤忠商事', sector: '卸売業', price: 8200, dividendPerShare: 200 },
  { code: '7267', name: 'ホンダ', sector: 'その他', price: 1450, dividendPerShare: 68 },
  { code: '8802', name: '三菱地所', sector: 'その他', price: 2300, dividendPerShare: 52 },
  { code: '4661', name: 'オリエンタルランド', sector: 'その他', price: 4800, dividendPerShare: 15 },
  { code: '6501', name: '日立製作所', sector: 'その他', price: 4250, dividendPerShare: 80 },
  { code: '9432', name: 'NTT（日本電信電話）', sector: '情報・通信業', price: 153, dividendPerShare: 5 },
  { code: '7741', name: 'HOYA', sector: 'その他', price: 19500, dividendPerShare: 110 },
  { code: '6367', name: 'ダイキン工業', sector: 'その他', price: 22000, dividendPerShare: 240 },
  { code: '8035', name: '東京エレクトロン', sector: 'その他', price: 24000, dividendPerShare: 570 },
  { code: '6954', name: 'ファナック', sector: 'その他', price: 4600, dividendPerShare: 113 },
  { code: '4519', name: '中外製薬', sector: '医薬品', price: 6200, dividendPerShare: 120 },
  { code: '4568', name: '第一三共', sector: '医薬品', price: 4700, dividendPerShare: 90 },
  { code: '8309', name: '三井住友トラスト', sector: '銀行業', price: 3200, dividendPerShare: 185 },
];

export function Stocks() {
  const [query, setQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<Sector | 'すべて'>('すべて');
  const [showModal, setShowModal] = useState(false);

  const sectors: Array<Sector | 'すべて'> = [
    'すべて', '卸売業', '食料品', 'その他金融業', '銀行業', '保険業',
    '情報・通信業', '医薬品', '石油', 'ETF', '建設業', 'その他',
  ];

  const filtered = STOCK_DATABASE.filter(s => {
    const matchQuery = query === '' ||
      s.code.includes(query) ||
      s.name.toLowerCase().includes(query.toLowerCase());
    const matchSector = sectorFilter === 'すべて' || s.sector === sectorFilter;
    return matchQuery && matchSector;
  });

  function handleAddClick(_stock: StockInfo) {
    setShowModal(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">銘柄</h1>
        <p className="text-sm text-gray-500 mt-0.5">日本株の配当情報を検索</p>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="銘柄コードまたは銘柄名で検索..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={sectorFilter}
          onChange={e => setSectorFilter(e.target.value as Sector | 'すべて')}
          className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {sectors.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className="text-xs text-gray-500">{filtered.length}件の銘柄</div>

      {/* Stock list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">銘柄</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">業種</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">現在株価</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">配当/株</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">配当利回り</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    該当する銘柄がありません
                  </td>
                </tr>
              )}
              {filtered.map(stock => {
                const yld = stock.price > 0 ? (stock.dividendPerShare / stock.price) * 100 : 0;
                return (
                  <tr key={stock.code} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: SECTOR_COLORS[stock.sector] }}
                        />
                        <div>
                          <div className="font-semibold text-gray-900">{stock.code}</div>
                          <div className="text-xs text-gray-500 max-w-48 truncate">{stock.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: SECTOR_COLORS[stock.sector] + '20',
                          color: SECTOR_COLORS[stock.sector],
                        }}
                      >
                        {stock.sector}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(stock.price)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(stock.dividendPerShare)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${yld >= 3 ? 'text-green-600' : yld >= 2 ? 'text-blue-600' : 'text-gray-600'}`}>
                        {formatPercentPlain(yld)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleAddClick(stock)}
                        className="inline-flex items-center px-3 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        + 追加
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <AddTransactionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
