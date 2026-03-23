'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Search } from 'lucide-react';
import { Protocol } from '@/lib/api';
import { useSortable } from '@/hooks/use-sortable';
import { SortableHeader } from '@/components/SortableHeader';

const formatCurrency = (value: number | undefined) => {
  if (!value) return '$0.00';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function ExchangesTable({ exchanges }: { exchanges: Protocol[] }) {
  const [search, setSearch] = useState('');

  const filtered = exchanges.filter(
    ex => !search || ex.name.toLowerCase().includes(search.toLowerCase())
  );

  const { sortedData, sortKey, sortOrder, toggleSort } = useSortable(filtered, 'total24h');

  return (
    <div>
      <div className="flex justify-end mb-6">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search exchanges..."
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
                <th className="px-6 py-4 font-medium">Exchange</th>
                <th className="px-6 py-4 font-medium">Chains</th>
                <SortableHeader label="24h Volume" sortKey="total24h" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
                <SortableHeader label="7d Volume" sortKey="total7d" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
                <SortableHeader label="30d Volume" sortKey="total30d" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
                <SortableHeader label="All Time Volume" sortKey="totalAllTime" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
                <th className="px-6 py-4 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedData.length > 0 ? (
                sortedData.map(exchange => (
                  <tr key={exchange.defillamaId} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/exchanges/${exchange.defillamaId}`} className="flex items-center gap-3">
                        {exchange.logo && (
                          <Image
                            src={exchange.logo}
                            alt={exchange.name}
                            width={32}
                            height={32}
                            className="rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div>
                          <div className="font-medium text-base">{exchange.name}</div>
                          <div className="text-xs text-muted-foreground">{exchange.category}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {exchange.chains.slice(0, 3).map(chain => (
                          <span key={chain} className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                            {chain}
                          </span>
                        ))}
                        {exchange.chains.length > 3 && (
                          <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                            +{exchange.chains.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">{formatCurrency(exchange.total24h)}</td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">{formatCurrency(exchange.total7d)}</td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">{formatCurrency(exchange.total30d)}</td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">{formatCurrency(exchange.totalAllTime)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/exchanges/${exchange.defillamaId}`}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-9 w-9"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        <span className="sr-only">View {exchange.name}</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    No exchanges found.
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
