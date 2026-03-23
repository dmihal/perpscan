'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search } from 'lucide-react';
import { VenueMarket } from '@/lib/api';
import { useSortable } from '@/hooks/use-sortable';
import { SortableHeader } from '@/components/SortableHeader';

const formatCurrency = (value: number | undefined) => {
  if (!value) return '$0.00';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function VenueMarketsTable({ markets }: { markets: VenueMarket[] }) {
  const [search, setSearch] = useState('');
  const [venueFilter, setVenueFilter] = useState('');

  const venues = [...new Set(markets.map(m => m.venue))].sort();

  const filtered = markets.filter(m => {
    if (search && !m.symbol.toLowerCase().includes(search.toLowerCase())) return false;
    if (venueFilter && m.venue !== venueFilter) return false;
    return true;
  });

  const { sortedData, sortKey, sortOrder, toggleSort } = useSortable(filtered, 'volume24h');

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setVenueFilter('')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${!venueFilter ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
          >
            All Venues
          </button>
          {venues.map(venue => (
            <button
              key={venue}
              onClick={() => setVenueFilter(venue === venueFilter ? '' : venue)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${venueFilter === venue ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
            >
              {venue}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
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
                <SortableHeader label="Market" sortKey="symbol" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} />
                <th className="px-6 py-4 font-medium">Venue</th>
                <SortableHeader label="Price" sortKey="price" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
                <SortableHeader label="24h Volume" sortKey="volume24h" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
                <SortableHeader label="Open Interest" sortKey="openInterest" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
                <SortableHeader label="Funding Rate" sortKey="fundingRate" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
                <SortableHeader label="Avg Spread" sortKey="spread" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
                <th className="px-6 py-4 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedData.length > 0 ? (
                sortedData.map(market => (
                  <tr key={market.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/markets/${market.symbol.split('-')[0].toLowerCase()}`} className="font-medium text-base hover:underline">
                        {market.symbol}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-secondary text-secondary-foreground">
                        {market.venue}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      ${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                      {formatCurrency(market.volume24h)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                      {formatCurrency(market.openInterest)}
                    </td>
                    <td className={`px-6 py-4 text-right font-mono ${market.fundingRate >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                      {market.fundingRate > 0 ? '+' : ''}{market.fundingRate.toFixed(4)}%
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                      {market.spread.toFixed(3)}%
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/markets/${market.symbol.split('-')[0].toLowerCase()}`}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-9 w-9"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        <span className="sr-only">View {market.symbol}</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    No markets found matching your filters.
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
