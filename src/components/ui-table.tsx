'use client';

import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export interface Column<T = any> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface TableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: any, index: number) => void;
  minWidth?: string;
}

export default function Table({
  columns,
  data,
  loading,
  emptyMessage = 'No data found',
  onRowClick,
  minWidth = '800px',
}: TableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-[#E2E6F1] overflow-hidden">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#735DFF]" size={32} />
          <span className="ml-3 text-[#6B7280] text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#E2E6F1] overflow-hidden">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[rgba(115,93,255,0.1)] flex items-center justify-center">
              <span className="text-[#735DFF] text-2xl">📋</span>
            </div>
            <p className="text-[#6B7280] text-sm font-medium">{emptyMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#E2E6F1] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth }}>
          <thead>
            <tr className="bg-gray-50 border-b border-[#E2E6F1]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E6F1]">
            {data.map((item, index) => (
              <tr
                key={item.id || index}
                className={`hover:bg-[rgba(115,93,255,0.04)] transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(item, index)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-[#222F36] whitespace-nowrap ${col.className || ''}`}
                  >
                    {col.render
                      ? col.render(item, index)
                      : (item[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
