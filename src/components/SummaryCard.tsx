import React from 'react';
import { colorClass } from '../utils/format';

interface SummaryCardProps {
  title: string;
  value: string;
  sub?: string;
  subColor?: number; // if provided, colorize based on sign
  icon?: React.ReactNode;
}

export function SummaryCard({ title, value, sub, subColor, icon }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 font-medium">{title}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-gray-900 tracking-tight">{value}</div>
      {sub !== undefined && (
        <div className={`text-sm font-medium ${subColor !== undefined ? colorClass(subColor) : 'text-gray-500'}`}>
          {sub}
        </div>
      )}
    </div>
  );
}
