'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Market } from '@/lib/api';
import { useSortable } from '@/hooks/use-sortable';
import { SortableHeader } from '@/components/SortableHeader';

export default function HomepageMarketsTable({ markets }: { markets: Market[] }) {
  const { sortedData, sortKey, sortOrder, toggleSort } = useSortable(markets, 'market_cap');

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-medium">Asset</th>
              <SortableHeader label="Price" sortKey="current_price" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" className="px-4 py-3 text-xs" />
              <SortableHeader label="24h Change" sortKey="price_change_percentage_24h" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" className="px-4 py-3 text-xs" />
              <SortableHeader label="Avg Spread" sortKey="avgSpread" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" className="px-4 py-3 text-xs" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData.map(market => (
              <tr key={market.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/assets/${market.symbol.toLowerCase()}`} className="flex items-center gap-3">
                    {market.image && (
                      <Image src={market.image} alt={market.name} width={24} height={24} className="rounded-full" referrerPolicy="no-referrer" />
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{market.name}</span>
                      <span className="text-xs text-muted-foreground uppercase">{market.symbol}-USD</span>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  ${market.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                </td>
                <td className={`px-4 py-3 text-right font-mono text-xs ${market.price_change_percentage_24h >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {market.price_change_percentage_24h >= 0 ? '+' : ''}
                  {market.price_change_percentage_24h?.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                  {market.avgSpread?.toFixed(3)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
