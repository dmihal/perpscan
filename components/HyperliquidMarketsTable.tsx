'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search, Filter } from 'lucide-react';
import { VenueMarket } from '@/lib/api';

export default function HyperliquidMarketsTable({ markets }: { markets: VenueMarket[] }) {
  const [filter, setFilter] = useState<'all' | 'hip3' | 'isolated' | 'cross'>('all');
  const [search, setSearch] = useState('');

  const filteredMarkets = markets.filter(market => {
    // Search filter
    if (search && !market.symbol.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    // Category filter
    if (filter === 'hip3' && !market.isHip3) return false;
    if (filter === 'isolated' && !market.onlyIsolated) return false;
    if (filter === 'cross' && market.onlyIsolated) return false; // Cross margin means NOT onlyIsolated

    return true;
  });

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '$0.00';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
          >
            All Markets
          </button>
          <button
            onClick={() => setFilter('cross')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${filter === 'cross' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
          >
            Cross Margin
          </button>
          <button
            onClick={() => setFilter('isolated')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${filter === 'isolated' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
          >
            Isolated Only
          </button>
          <button
            onClick={() => setFilter('hip3')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${filter === 'hip3' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
          >
            HIP-3
          </button>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-8"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Market</th>
                <th className="px-6 py-4 font-medium">Tags</th>
                <th className="px-6 py-4 font-medium text-right">Price</th>
                <th className="px-6 py-4 font-medium text-right">24h Volume</th>
                <th className="px-6 py-4 font-medium text-right">Open Interest</th>
                <th className="px-6 py-4 font-medium text-right">Avg Spread</th>
                <th className="px-6 py-4 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMarkets.length > 0 ? (
                filteredMarkets.map((market) => (
                  <tr key={market.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <Link href={`/markets/${market.symbol.split('-')[0].toLowerCase()}`} className="flex items-center gap-2 hover:underline">
                        {market.symbol}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {market.isHip3 && (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-indigo-500/10 text-indigo-500">
                            HIP-3
                          </span>
                        )}
                        {market.onlyIsolated ? (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-amber-500/10 text-amber-500">
                            Isolated Only
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-emerald-500/10 text-emerald-500">
                            Cross Margin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: market.price < 1 ? 4 : 2, maximumFractionDigits: market.price < 1 ? 4 : 2 }).format(market.price)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {formatCurrency(market.volume24h)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {formatCurrency(market.openInterest)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                      {market.spread.toFixed(4)}%
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/markets/${market.symbol.split('-')[0].toLowerCase()}`}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        <span className="sr-only">View {market.symbol}</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
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
