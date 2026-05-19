import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Transaction, Sector } from '../types';
import { ALL_SECTORS } from '../types';

interface AddTransactionModalProps {
  onClose: () => void;
}

function generateId(): string {
  return 'tx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

const defaultForm = {
  stockCode: '',
  stockName: '',
  sector: '卸売業' as Sector,
  type: 'buy' as 'buy' | 'sell',
  quantity: '',
  price: '',
  date: new Date().toISOString().slice(0, 10),
  dividendPerShare: '',
  memo: '',
};

export function AddTransactionModal({ onClose }: AddTransactionModalProps) {
  const { dispatch } = useStore();
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.stockCode.trim()) errs.stockCode = '銘柄コードを入力してください';
    if (!form.stockName.trim()) errs.stockName = '銘柄名を入力してください';
    if (!form.quantity || Number(form.quantity) <= 0) errs.quantity = '数量は1以上を入力してください';
    if (!form.price || Number(form.price) <= 0) errs.price = '取得単価は0より大きい値を入力してください';
    if (!form.date) errs.date = '取引日を入力してください';
    if (form.dividendPerShare === '' || Number(form.dividendPerShare) < 0) errs.dividendPerShare = '配当/株を入力してください（0以上）';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const tx: Transaction = {
      id: generateId(),
      stockCode: form.stockCode.trim(),
      stockName: form.stockName.trim(),
      sector: form.sector,
      type: form.type,
      quantity: Number(form.quantity),
      price: Number(form.price),
      date: form.date,
      dividendPerShare: Number(form.dividendPerShare),
      memo: form.memo.trim() || undefined,
    };

    dispatch({ type: 'ADD_TRANSACTION', payload: tx });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">取引を追加</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* 取引種別 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">取引種別</label>
            <div className="flex gap-3">
              {(['buy', 'sell'] as const).map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={form.type === t}
                    onChange={handleChange}
                    className="text-blue-600"
                  />
                  <span className={`text-sm font-medium px-3 py-1 rounded-full border transition-colors ${
                    form.type === t
                      ? t === 'buy' ? 'bg-green-100 border-green-300 text-green-700' : 'bg-red-100 border-red-300 text-red-700'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}>
                    {t === 'buy' ? '買い' : '売り'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Row: code + name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">銘柄コード</label>
              <input
                type="text"
                name="stockCode"
                value={form.stockCode}
                onChange={handleChange}
                placeholder="例: 2914"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  errors.stockCode ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {errors.stockCode && <p className="mt-1 text-xs text-red-500">{errors.stockCode}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">銘柄名</label>
              <input
                type="text"
                name="stockName"
                value={form.stockName}
                onChange={handleChange}
                placeholder="例: JT"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  errors.stockName ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {errors.stockName && <p className="mt-1 text-xs text-red-500">{errors.stockName}</p>}
            </div>
          </div>

          {/* 業種 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">業種</label>
            <select
              name="sector"
              value={form.sector}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition"
            >
              {ALL_SECTORS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Row: quantity + price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">数量（株）</label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                placeholder="100"
                min="1"
                step="1"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  errors.quantity ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {errors.quantity && <p className="mt-1 text-xs text-red-500">{errors.quantity}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">取得単価（円）</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="3000"
                min="1"
                step="1"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  errors.price ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
            </div>
          </div>

          {/* Row: date + dividend */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">取引日</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  errors.date ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">配当/株（円・年）</label>
              <input
                type="number"
                name="dividendPerShare"
                value={form.dividendPerShare}
                onChange={handleChange}
                placeholder="100"
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  errors.dividendPerShare ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {errors.dividendPerShare && <p className="mt-1 text-xs text-red-500">{errors.dividendPerShare}</p>}
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
            <textarea
              name="memo"
              value={form.memo}
              onChange={handleChange}
              placeholder="備考・メモ"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
            />
          </div>

          {/* Preview total */}
          {form.quantity && form.price && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>合計金額</span>
                <span className="font-bold text-gray-900">
                  ¥{(Number(form.quantity) * Number(form.price)).toLocaleString('ja-JP')}
                </span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              追加する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
