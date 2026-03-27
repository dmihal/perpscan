'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Search } from 'lucide-react';
import { Market } from '@/lib/api';
import { useSortable } from '@/hooks/use-sortable';
import { SortableHeader } from '@/components/SortableHeader';
import { formatCurrency } from '@/lib/utils';

export default function MarketsTable({ markets }: { markets: Market[] }) {
  const [search, setSearch] = useState('');

  const filtered = markets.filter(
    m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const { sortedData, sortKey, sortOrder, toggleSort } = useSortable(filtered, 'market_cap');

  return (
    <div>
      <div className="flex justify-end mb-6">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search markets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-8"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Market</th>
                <SortableHeader label="Price" sortKey="current_price" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
                <SortableHeader label="24h Change" sortKey="price_change_percentage_24h" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
                <SortableHeader label="Market Cap" sortKey="market_cap" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
                <SortableHeader label="24h Volume" sortKey="total_volume" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
                <th className="px-6 py-4 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedData.length > 0 ? (
                sortedData.map(market => (
                  <tr key={market.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/assets/${market.symbol.toLowerCase()}`} className="flex items-center gap-3">
                        {market.image && (
                          <Image
                            src={market.image}
                            alt={market.name}
                            width={32}
                            height={32}
                            className="rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div>
                          <div className="font-medium text-base">{market.name}</div>
                          <div className="text-xs text-muted-foreground uppercase">{market.symbol}-USD</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      ${market.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                    <td className={`px-6 py-4 text-right font-mono ${market.price_change_percentage_24h >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                      {market.price_change_percentage_24h >= 0 ? '+' : ''}
                      {market.price_change_percentage_24h?.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                      {formatCurrency(market.market_cap)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                      {formatCurrency(market.total_volume)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/assets/${market.symbol.toLowerCase()}`}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-9 w-9"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        <span className="sr-only">View {market.name}</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No markets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
