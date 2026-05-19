import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { AppState, Transaction, WatchItem } from '../types';
import { demoTransactions, demoWatchlist, demoPrices } from '../data/demoData';
import type { Holding } from '../types';

// ---------- helpers ----------

export function computeHoldings(transactions: Transaction[], isDemoMode: boolean): Holding[] {
  const map = new Map<string, {
    stockCode: string;
    stockName: string;
    sector: import('../types').Sector;
    totalQty: number;
    totalCost: number;
    dividendPerShare: number;
  }>();

  for (const tx of transactions) {
    const existing = map.get(tx.stockCode);
    if (tx.type === 'buy') {
      if (existing) {
        existing.totalQty += tx.quantity;
        existing.totalCost += tx.quantity * tx.price;
        existing.dividendPerShare = tx.dividendPerShare; // use latest
      } else {
        map.set(tx.stockCode, {
          stockCode: tx.stockCode,
          stockName: tx.stockName,
          sector: tx.sector,
          totalQty: tx.quantity,
          totalCost: tx.quantity * tx.price,
          dividendPerShare: tx.dividendPerShare,
        });
      }
    } else if (tx.type === 'sell') {
      if (existing) {
        existing.totalQty -= tx.quantity;
        existing.totalCost -= tx.quantity * (existing.totalCost / Math.max(existing.totalQty + tx.quantity, 1));
      }
    }
  }

  const holdings: Holding[] = [];
  map.forEach((v) => {
    if (v.totalQty > 0) {
      const currentPrice = isDemoMode
        ? (demoPrices[v.stockCode] ?? Math.round(v.totalCost / v.totalQty))
        : Math.round(v.totalCost / v.totalQty);
      holdings.push({
        stockCode: v.stockCode,
        stockName: v.stockName,
        sector: v.sector,
        quantity: v.totalQty,
        avgCost: v.totalQty > 0 ? Math.round(v.totalCost / v.totalQty) : 0,
        currentPrice,
        dividendPerShare: v.dividendPerShare,
      });
    }
  });

  return holdings;
}

// ---------- actions ----------

type Action =
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'ADD_WATCH'; payload: WatchItem }
  | { type: 'REMOVE_WATCH'; payload: string }
  | { type: 'SET_DEMO_MODE'; payload: boolean }
  | { type: 'CLEAR_DATA' }
  | { type: 'LOAD_STATE'; payload: AppState };

const initialState: AppState = {
  transactions: [],
  watchlist: [],
  isDemoMode: true,
  currency: 'JPY',
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [...state.transactions, action.payload] };
    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };
    case 'ADD_WATCH':
      return { ...state, watchlist: [...state.watchlist, action.payload] };
    case 'REMOVE_WATCH':
      return { ...state, watchlist: state.watchlist.filter(w => w.id !== action.payload) };
    case 'SET_DEMO_MODE':
      return { ...state, isDemoMode: action.payload };
    case 'CLEAR_DATA':
      return { ...initialState, isDemoMode: false };
    case 'LOAD_STATE':
      return action.payload;
    default:
      return state;
  }
}

// ---------- context ----------

interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  holdings: Holding[];
  effectiveTransactions: Transaction[];
}

const StoreContext = createContext<StoreContextValue | null>(null);

const STORAGE_KEY = 'haito_app_state';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...init, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return init;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const effectiveTransactions = state.isDemoMode
    ? demoTransactions
    : state.transactions;

  const demoWatchlistActive = state.isDemoMode
    ? demoWatchlist
    : state.watchlist;

  const effectiveState = state.isDemoMode
    ? { ...state, watchlist: demoWatchlistActive }
    : state;

  const holdings = computeHoldings(effectiveTransactions, state.isDemoMode);

  const value: StoreContextValue = {
    state: effectiveState,
    dispatch,
    holdings,
    effectiveTransactions,
  };

  return React.createElement(StoreContext.Provider, { value }, children);
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export function usePortfolioStats(holdings: Holding[]) {
  const totalMarketValue = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0);
  const totalCost = holdings.reduce((s, h) => s + h.quantity * h.avgCost, 0);
  const totalPL = totalMarketValue - totalCost;
  const plPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  const annualDividend = holdings.reduce((s, h) => s + h.quantity * h.dividendPerShare, 0);
  const yieldOnMarket = totalMarketValue > 0 ? (annualDividend / totalMarketValue) * 100 : 0;

  return { totalMarketValue, totalCost, totalPL, plPercent, annualDividend, yieldOnMarket };
}

export { demoWatchlist };
export type { Holding };
export const useCallback_ = useCallback;
