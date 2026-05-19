export type Sector =
  | '卸売業'
  | '食料品'
  | 'その他金融業'
  | '銀行業'
  | '保険業'
  | '情報・通信業'
  | '医薬品'
  | '石油'
  | 'ETF'
  | '建設業'
  | 'その他';

export interface Stock {
  code: string;
  name: string;
  sector: Sector;
}

export interface Transaction {
  id: string;
  stockCode: string;
  stockName: string;
  sector: Sector;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  date: string;
  dividendPerShare: number;
  memo?: string;
}

export interface Holding {
  stockCode: string;
  stockName: string;
  sector: Sector;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  dividendPerShare: number;
}

export interface WatchItem {
  id: string;
  code: string;
  name: string;
  sector: Sector;
  currentPrice: number;
  dividendPerShare: number;
}

export type HoldingOverride = Partial<Pick<Holding, 'stockName' | 'sector' | 'quantity' | 'avgCost' | 'currentPrice' | 'dividendPerShare'>>;

export interface AppState {
  transactions: Transaction[];
  watchlist: WatchItem[];
  holdingOverrides: Record<string, HoldingOverride>;
  isDemoMode: boolean;
  currency: 'JPY';
}

export const SECTOR_COLORS: Record<Sector, string> = {
  '卸売業': '#ef4444',
  '食料品': '#3b82f6',
  'その他金融業': '#8b5cf6',
  '銀行業': '#10b981',
  '保険業': '#f97316',
  '情報・通信業': '#06b6d4',
  '医薬品': '#84cc16',
  '石油': '#f59e0b',
  'ETF': '#14b8a6',
  '建設業': '#a855f7',
  'その他': '#6b7280',
};

export const ALL_SECTORS: Sector[] = [
  '卸売業', '食料品', 'その他金融業', '銀行業', '保険業',
  '情報・通信業', '医薬品', '石油', 'ETF', '建設業', 'その他',
];
