'use client';

import Link from 'next/link';
import { useSortable } from '@/hooks/use-sortable';
import { SortableHeader } from '@/components/SortableHeader';
import { formatCurrency } from '@/lib/utils';

interface Balance {
  exchange: string;
  asset: string;
  amount: number;
}

export default function BalancesTable({
  balances,
  address,
}: {
  balances: Balance[];
  address: string;
}) {
  const { sortedData, sortKey, sortOrder, toggleSort } = useSortable(balances, 'amount');

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
            <tr>
              <SortableHeader label="Exchange" sortKey="exchange" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} />
              <SortableHeader label="Asset" sortKey="asset" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} />
              <SortableHeader label="Amount" sortKey="amount" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData.map((bal, idx) => (
              <tr key={idx} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 font-medium">
                  <Link href={`/exchanges/${bal.exchange.toLowerCase()}/accounts/${address}`} className="text-primary hover:underline">
                    {bal.exchange}
                  </Link>
                </td>
                <td className="px-6 py-4">{bal.asset}</td>
                <td className="px-6 py-4 text-right font-mono">{formatCurrency(bal.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
