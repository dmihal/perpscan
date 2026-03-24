'use client';

import Link from 'next/link';
import { useSortable } from '@/hooks/use-sortable';
import { SortableHeader } from '@/components/SortableHeader';

interface Position {
  id: string;
  exchange: string;
  market: string;
  side: string;
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  leverage: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export default function PositionsTable({
  positions,
  address,
}: {
  positions: Position[];
  address: string;
}) {
  const { sortedData, sortKey, sortOrder, toggleSort } = useSortable(positions, 'pnl');

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
            <tr>
              <SortableHeader label="Exchange" sortKey="exchange" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} />
              <SortableHeader label="Market" sortKey="market" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} />
              <th className="px-6 py-4 font-medium">Side</th>
              <SortableHeader label="Size" sortKey="size" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
              <SortableHeader label="Entry Price" sortKey="entryPrice" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
              <SortableHeader label="Mark Price" sortKey="markPrice" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
              <SortableHeader label="Unrealized PnL" sortKey="pnl" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData.map(pos => (
              <tr key={pos.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 font-medium">
                  <Link href={`/exchanges/${pos.exchange.toLowerCase()}/accounts/${address}`} className="text-primary hover:underline">
                    {pos.exchange}
                  </Link>
                </td>
                <td className="px-6 py-4 font-medium">
                  <Link href={`/exchanges/${pos.exchange.toLowerCase()}/markets/${pos.market.split('-')[0].toLowerCase()}`} className="hover:underline">
                    {pos.market}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${pos.side === 'Long' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                    {pos.side} {pos.leverage}x
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-mono">{pos.size}</td>
                <td className="px-6 py-4 text-right font-mono">{formatCurrency(pos.entryPrice)}</td>
                <td className="px-6 py-4 text-right font-mono">{formatCurrency(pos.markPrice)}</td>
                <td className={`px-6 py-4 text-right font-mono font-medium ${pos.pnl >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {pos.pnl >= 0 ? '+' : ''}{formatCurrency(pos.pnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
