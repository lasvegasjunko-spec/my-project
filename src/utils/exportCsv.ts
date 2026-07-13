import type { Holding, Transaction } from '../types';

function downloadCsv(filename: string, rows: string[][]) {
  const bom = '﻿'; // Excel で文字化けしないよう BOM 付き UTF-8
  const csv = bom + rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportHoldingsCsv(holdings: Holding[]) {
  const header = ['銘柄コード', '銘柄名', '業種', '数量', '取得単価', '現在株価', '評価額', '損益', '損益率(%)', '配当/株(年)', '配当合計(年)', '利回り(%)', '利回り取得(%)'];
  const rows = holdings.map(h => {
    const marketValue = h.quantity * h.currentPrice;
    const cost = h.quantity * h.avgCost;
    const pl = marketValue - cost;
    const plPct = cost > 0 ? ((pl / cost) * 100).toFixed(2) : '0';
    const annualDiv = h.quantity * h.dividendPerShare;
    const yld = marketValue > 0 ? ((annualDiv / marketValue) * 100).toFixed(2) : '0';
    const yldCost = cost > 0 ? ((annualDiv / cost) * 100).toFixed(2) : '0';
    return [
      h.stockCode, h.stockName, h.sector,
      String(h.quantity), String(h.avgCost), String(h.currentPrice),
      String(marketValue), String(pl), plPct,
      String(h.dividendPerShare), String(annualDiv), yld, yldCost,
    ];
  });
  const date = new Date().toISOString().slice(0, 10);
  downloadCsv(`haito_holdings_${date}.csv`, [header, ...rows]);
}

export function exportTransactionsCsv(transactions: Transaction[]) {
  const header = ['取引日', '銘柄コード', '銘柄名', '業種', '種別', '数量', '単価', '合計金額', '配当/株(年)', 'メモ'];
  const rows = transactions.map(t => [
    t.date, t.stockCode, t.stockName, t.sector,
    t.type === 'buy' ? '買い' : '売り',
    String(t.quantity), String(t.price), String(t.quantity * t.price),
    String(t.dividendPerShare), t.memo ?? '',
  ]);
  const date = new Date().toISOString().slice(0, 10);
  downloadCsv(`haito_transactions_${date}.csv`, [header, ...rows]);
}
