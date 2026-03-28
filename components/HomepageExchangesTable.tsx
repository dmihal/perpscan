'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Protocol } from '@/lib/api';
import { useSortable } from '@/hooks/use-sortable';
import { SortableHeader } from '@/components/SortableHeader';

const fmt = (value: number | undefined) => {
  if (value == null) return 'N/A';
  if (value === 0) return '$0.00';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function HomepageExchangesTable({ exchanges }: { exchanges: Protocol[] }) {
  const { sortedData, sortKey, sortOrder, toggleSort } = useSortable(exchanges, 'total24h');

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-medium">Exchange</th>
              <SortableHeader label="Open Interest" sortKey="openInterest" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" className="px-4 py-3 text-xs" />
              <SortableHeader label="24h Volume" sortKey="total24h" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" className="px-4 py-3 text-xs" />
              <SortableHeader label="7d Volume" sortKey="total7d" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" className="px-4 py-3 text-xs" />
              <SortableHeader label="Avg Spread" sortKey="avgSpread" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" className="px-4 py-3 text-xs" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData.map(exchange => (
              <tr key={exchange.defillamaId} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/exchanges/${exchange.defillamaId}`} className="flex items-center gap-3">
                    {exchange.logo && (
                      <Image src={exchange.logo} alt={exchange.name} width={24} height={24} className="rounded-full" referrerPolicy="no-referrer" />
                    )}
                    <span className="font-medium">{exchange.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">{fmt(exchange.openInterest)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{fmt(exchange.total24h)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{fmt(exchange.total7d)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                  {exchange.avgSpread == null ? 'N/A' : `${exchange.avgSpread.toFixed(3)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
