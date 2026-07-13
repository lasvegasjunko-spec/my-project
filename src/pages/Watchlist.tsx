import { useState } from 'react';
import { Plus, Trash2, Eye } from 'lucide-react';
import { useStore } from '../store/useStore';
import { SECTOR_COLORS, ALL_SECTORS } from '../types';
import type { Sector, WatchItem } from '../types';
import { formatCurrency, formatPercentPlain } from '../utils/format';

function generateId(): string {
  return 'watch-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

const defaultForm = {
  code: '',
  name: '',
  sector: '卸売業' as Sector,
  currentPrice: '',
  dividendPerShare: '',
};

export function Watchlist() {
  const { state, dispatch } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.code.trim()) errs.code = '銘柄コードを入力してください';
    if (!form.name.trim()) errs.name = '銘柄名を入力してください';
    if (!form.currentPrice || Number(form.currentPrice) <= 0) errs.currentPrice = '株価を入力してください';
    if (form.dividendPerShare === '' || Number(form.dividendPerShare) < 0) errs.dividendPerShare = '配当を入力してください';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const item: WatchItem = {
      id: generateId(),
      code: form.code.trim(),
      name: form.name.trim(),
      sector: form.sector,
      currentPrice: Number(form.currentPrice),
      dividendPerShare: Number(form.dividendPerShare),
    };
    dispatch({ type: 'ADD_WATCH', payload: item });
    setForm(defaultForm);
    setErrors({});
    setShowAdd(false);
  }

  function handleRemove(id: string) {
    if (confirm('ウォッチリストから削除しますか？')) {
      dispatch({ type: 'REMOVE_WATCH', payload: id });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ウォッチリスト</h1>
          <p className="text-sm text-gray-500 mt-0.5">注目銘柄の配当利回りを追跡</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          銘柄を追加
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">新しい銘柄をウォッチ</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">銘柄コード</label>
              <input
                type="text"
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="例: 9984"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.code ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.code && <p className="mt-0.5 text-xs text-red-500">{errors.code}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">銘柄名</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="例: ソフトバンクG"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.name && <p className="mt-0.5 text-xs text-red-500">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">業種</label>
              <select
                name="sector"
                value={form.sector}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {ALL_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">現在株価（円）</label>
              <input
                type="number"
                name="currentPrice"
                value={form.currentPrice}
                onChange={handleChange}
                placeholder="5000"
                min="1"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.currentPrice ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.currentPrice && <p className="mt-0.5 text-xs text-red-500">{errors.currentPrice}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">配当/株（円・年）</label>
              <input
                type="number"
                name="dividendPerShare"
                value={form.dividendPerShare}
                onChange={handleChange}
                placeholder="100"
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.dividendPerShare ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.dividendPerShare && <p className="mt-0.5 text-xs text-red-500">{errors.dividendPerShare}</p>}
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                追加
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setForm(defaultForm); setErrors({}); }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Watchlist table */}
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
              {state.watchlist.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Eye size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-400 text-sm">ウォッチリストに銘柄がありません</p>
                    <p className="text-gray-400 text-xs mt-1">「銘柄を追加」ボタンから登録できます</p>
                  </td>
                </tr>
              )}
              {state.watchlist.map(item => {
                const yld = item.currentPrice > 0 ? (item.dividendPerShare / item.currentPrice) * 100 : 0;
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: SECTOR_COLORS[item.sector] }}
                        />
                        <div>
                          <div className="font-semibold text-gray-900">{item.code}</div>
                          <div className="text-xs text-gray-500">{item.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: SECTOR_COLORS[item.sector] + '20',
                          color: SECTOR_COLORS[item.sector],
                        }}
                      >
                        {item.sector}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(item.currentPrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(item.dividendPerShare)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${yld >= 3 ? 'text-green-600' : yld >= 2 ? 'text-blue-600' : 'text-gray-600'}`}>
                        {formatPercentPlain(yld)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="inline-flex items-center p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="削除"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
