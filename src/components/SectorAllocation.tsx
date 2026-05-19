import React from 'react';
import { SECTOR_COLORS } from '../types';
import type { Holding, Sector } from '../types';

interface SectorAllocationProps {
  holdings: Holding[];
}

export function SectorAllocation({ holdings }: SectorAllocationProps) {
  const totalValue = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0);

  const sectorMap = new Map<Sector, number>();
  for (const h of holdings) {
    const val = h.quantity * h.currentPrice;
    sectorMap.set(h.sector, (sectorMap.get(h.sector) ?? 0) + val);
  }

  const sectors = Array.from(sectorMap.entries())
    .map(([sector, value]) => ({
      sector,
      value,
      pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
      color: SECTOR_COLORS[sector],
    }))
    .sort((a, b) => b.value - a.value);

  if (sectors.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-800 mb-4">業種割合</h3>
        <p className="text-gray-400 text-sm">保有銘柄がありません</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-800 mb-4">業種割合</h3>

      {/* Stacked horizontal bar */}
      <div className="flex h-8 rounded-lg overflow-hidden mb-5 w-full">
        {sectors.map(({ sector, pct, color }) => (
          <div
            key={sector}
            style={{ width: `${pct}%`, backgroundColor: color }}
            title={`${sector}: ${pct.toFixed(1)}%`}
            className="transition-all"
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {sectors.map(({ sector, pct, color }) => (
          <div key={sector} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-700 flex-1 truncate">{sector}</span>
            <span className="text-gray-500 font-medium ml-auto">{pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
