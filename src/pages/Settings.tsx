import { useState } from 'react';
import { ToggleLeft, ToggleRight, Trash2, Database, Shield, Info, Download } from 'lucide-react';
import { useStore } from '../store/useStore';
import { exportHoldingsCsv, exportTransactionsCsv } from '../utils/exportCsv';

export function Settings() {
  const { state, dispatch, holdings, effectiveTransactions } = useStore();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleToggleDemo() {
    dispatch({ type: 'SET_DEMO_MODE', payload: !state.isDemoMode });
  }

  function handleClearData() {
    dispatch({ type: 'CLEAR_DATA' });
    setShowConfirm(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="text-sm text-gray-500 mt-0.5">アプリケーションの設定を管理</p>
      </div>

      {/* Demo mode */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Database size={16} className="text-blue-500" />
            データ設定
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {/* Demo mode toggle */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex-1 mr-4">
              <div className="text-sm font-medium text-gray-900">デモモード</div>
              <div className="text-xs text-gray-500 mt-0.5">
                サンプルデータを表示してアプリを体験できます。オフにすると実際のデータのみ表示されます。
              </div>
            </div>
            <button
              onClick={handleToggleDemo}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors text-sm font-medium"
              style={{
                borderColor: state.isDemoMode ? '#3b82f6' : '#d1d5db',
                background: state.isDemoMode ? '#eff6ff' : 'white',
                color: state.isDemoMode ? '#2563eb' : '#374151',
              }}
            >
              {state.isDemoMode ? (
                <ToggleRight size={20} className="text-blue-600" />
              ) : (
                <ToggleLeft size={20} className="text-gray-400" />
              )}
              {state.isDemoMode ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Clear data */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex-1 mr-4">
              <div className="text-sm font-medium text-gray-900">データをクリア</div>
              <div className="text-xs text-gray-500 mt-0.5">
                保存されたすべての取引・ウォッチリストデータを削除します。この操作は取り消せません。
              </div>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} />
              クリア
            </button>
          </div>
        </div>
      </div>

      {/* CSV Export */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Download size={16} className="text-blue-500" />
            CSVエクスポート
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex-1 mr-4">
              <div className="text-sm font-medium text-gray-900">保有銘柄をエクスポート</div>
              <div className="text-xs text-gray-500 mt-0.5">
                現在の保有銘柄・損益・配当情報をCSVファイルとして保存します
              </div>
            </div>
            <button
              onClick={() => exportHoldingsCsv(holdings)}
              disabled={holdings.length === 0}
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={15} />
              ダウンロード
            </button>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex-1 mr-4">
              <div className="text-sm font-medium text-gray-900">取引履歴をエクスポート</div>
              <div className="text-xs text-gray-500 mt-0.5">
                すべての取引記録をCSVファイルとして保存します
              </div>
            </div>
            <button
              onClick={() => exportTransactionsCsv(effectiveTransactions)}
              disabled={effectiveTransactions.length === 0}
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={15} />
              ダウンロード
            </button>
          </div>
        </div>
      </div>

      {/* Currency */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Shield size={16} className="text-blue-500" />
            表示設定
          </h2>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">通貨表示</div>
              <div className="text-xs text-gray-500 mt-0.5">金額の表示通貨を選択</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold border border-blue-200">
                ¥ JPY
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Info size={16} className="text-blue-500" />
            アプリについて
          </h2>
        </div>
        <div className="px-5 py-5 space-y-3 text-sm text-gray-600">
          <div className="flex justify-between">
            <span className="text-gray-500">アプリ名</span>
            <span className="font-medium text-gray-900">Haito~ 配当管理</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">バージョン</span>
            <span className="font-medium text-gray-900">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">データ保存</span>
            <span className="font-medium text-gray-900">ブラウザ（localStorage）</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">株価データ</span>
            <span className="font-medium text-gray-900">デモ用固定値（リアルタイム非対応）</span>
          </div>
          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            ※ 本アプリは投資助言を行うものではありません。投資判断はご自身でご判断ください。
          </p>
        </div>
      </div>

      {/* Current state summary */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">現在のデータ状態</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">{state.transactions.length}</div>
            <div className="text-xs text-gray-500">取引件数</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{state.watchlist.length}</div>
            <div className="text-xs text-gray-500">ウォッチ銘柄</div>
          </div>
          <div>
            <div className={`text-lg font-bold ${state.isDemoMode ? 'text-blue-600' : 'text-gray-900'}`}>
              {state.isDemoMode ? 'DEMO' : 'LIVE'}
            </div>
            <div className="text-xs text-gray-500">モード</div>
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-3">
                <Trash2 size={22} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">データをクリアしますか？</h3>
              <p className="text-sm text-gray-500 mt-1">
                すべての取引とウォッチリストが削除されます。この操作は取り消せません。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleClearData}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
