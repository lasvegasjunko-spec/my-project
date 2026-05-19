export function formatCurrency(value: number): string {
  return '¥' + Math.round(value).toLocaleString('ja-JP');
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ja-JP');
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : '';
  return sign + value.toFixed(decimals) + '%';
}

export function formatPercentPlain(value: number, decimals = 2): string {
  return value.toFixed(decimals) + '%';
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export function colorClass(value: number): string {
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-600';
}

export function bgColorClass(value: number): string {
  if (value > 0) return 'bg-green-50 text-green-700';
  if (value < 0) return 'bg-red-50 text-red-700';
  return 'bg-gray-50 text-gray-600';
}
