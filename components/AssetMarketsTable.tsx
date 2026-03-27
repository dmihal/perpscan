'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useSortable } from '@/hooks/use-sortable';
import { SortableHeader } from '@/components/SortableHeader';
import { formatCurrency } from '@/lib/utils';

interface AssetMarket {
  id: string;
  venue: string;
  symbol: string;
  price: number;
  volume24h: number;
  openInterest: number;
  fundingRate: number;
  spread: number;
}

export default function AssetMarketsTable({
  markets,
  symbol,
}: {
  markets: AssetMarket[];
  symbol: string;
}) {
  const { sortedData, sortKey, sortOrder, toggleSort } = useSortable(markets, 'volume24h');

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
            <tr>
              <SortableHeader label="Exchange" sortKey="venue" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} />
              <SortableHeader label="Mark Price" sortKey="price" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
              <SortableHeader label="24h Volume" sortKey="volume24h" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
              <SortableHeader label="Open Interest" sortKey="openInterest" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
              <SortableHeader label="Funding Rate" sortKey="fundingRate" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
              <SortableHeader label="Spread" sortKey="spread" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
              <th className="px-6 py-4 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData.map(market => (
              <tr key={market.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 font-medium">
                  <Link href={`/exchanges/${market.venue.toLowerCase()}`} className="hover:underline">
                    {market.venue}
                  </Link>
                </td>
                <td className="px-6 py-4 text-right font-mono">
                  ${market.price.toLocaleString(undefined, { minimumFractionDigits: market.price < 1 ? 4 : 2, maximumFractionDigits: market.price < 1 ? 6 : 2 })}
                </td>
                <td className="px-6 py-4 text-right font-mono">
                  {formatCurrency(market.volume24h)}
                </td>
                <td className="px-6 py-4 text-right font-mono">
                  {formatCurrency(market.openInterest)}
                </td>
                <td className={`px-6 py-4 text-right font-mono ${market.fundingRate >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {market.fundingRate >= 0 ? '+' : ''}{market.fundingRate.toFixed(4)}%
                </td>
                <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                  {market.spread.toFixed(4)}%
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/exchanges/${market.venue.toLowerCase()}/markets/${symbol}`}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span className="sr-only">View on {market.venue}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
