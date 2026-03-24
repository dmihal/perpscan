'use client';

import { useState } from 'react';
import { useSortable } from '@/hooks/use-sortable';
import { SortableHeader } from '@/components/SortableHeader';

interface Trade {
  coin: string;
  side: string;
  px: number;
  sz: number;
  time: number;
  fee: number;
  closedPnl: number;
  dir: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const PAGE_SIZE = 20;

export default function TradeHistoryTable({ trades }: { trades: Trade[] }) {
  const [page, setPage] = useState(0);
  const { sortedData, sortKey, sortOrder, toggleSort } = useSortable(trades, 'time');
  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);
  const paged = sortedData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        No trade history found for this account.
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
              <tr>
                <SortableHeader label="Time" sortKey="time" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} />
                <SortableHeader label="Market" sortKey="coin" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} />
                <th className="px-6 py-4 font-medium">Side</th>
                <SortableHeader label="Price" sortKey="px" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
                <SortableHeader label="Size" sortKey="sz" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
                <SortableHeader label="Fee" sortKey="fee" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
                <SortableHeader label="Realized PnL" sortKey="closedPnl" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map((trade, idx) => (
                <tr key={`${trade.time}-${idx}`} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 text-muted-foreground text-xs font-mono">
                    {new Date(trade.time).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-medium">{trade.coin}-USD</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      trade.side === 'B' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                    }`}>
                      {trade.side === 'B' ? 'Buy' : 'Sell'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">{formatCurrency(trade.px)}</td>
                  <td className="px-6 py-4 text-right font-mono">{trade.sz.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-mono text-muted-foreground">{formatCurrency(trade.fee)}</td>
                  <td className={`px-6 py-4 text-right font-mono font-medium ${
                    trade.closedPnl >= 0 ? 'text-emerald-500' : 'text-destructive'
                  }`}>
                    {trade.closedPnl !== 0 ? (
                      <>{trade.closedPnl >= 0 ? '+' : ''}{formatCurrency(trade.closedPnl)}</>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            {trades.length} trades total
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 disabled:opacity-50 disabled:pointer-events-none"
            >
              Previous
            </button>
            <span className="inline-flex items-center text-sm text-muted-foreground px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 disabled:opacity-50 disabled:pointer-events-none"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
