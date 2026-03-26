'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSortable } from '@/hooks/use-sortable';
import { SortableHeader } from '@/components/SortableHeader';

interface UnifiedTransaction {
  hash: string;
  time: number;
  type: 'trade' | 'deposit' | 'withdrawal' | 'transfer' | 'liquidation' | 'staking' | 'vault' | 'spot';
  summary: string;
  amount: number;
  exchange: string;
}

interface TransactionHistoryTableProps {
  transactions: UnifiedTransaction[];
  address: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const TYPE_BADGE_STYLES: Record<UnifiedTransaction['type'], string> = {
  trade: 'bg-blue-500/10 text-blue-500',
  deposit: 'bg-emerald-500/10 text-emerald-500',
  withdrawal: 'bg-orange-500/10 text-orange-500',
  transfer: 'bg-purple-500/10 text-purple-500',
  liquidation: 'bg-destructive/10 text-destructive',
  staking: 'bg-yellow-500/10 text-yellow-500',
  vault: 'bg-cyan-500/10 text-cyan-500',
  spot: 'bg-indigo-500/10 text-indigo-500',
};

const TYPE_LABELS: Record<UnifiedTransaction['type'], string> = {
  trade: 'Trade',
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  transfer: 'Transfer',
  liquidation: 'Liquidation',
  staking: 'Staking',
  vault: 'Vault',
  spot: 'Spot',
};

type FilterKey = 'all' | 'trade' | 'deposit' | 'withdrawal' | 'transfer' | 'other';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'trade', label: 'Trades' },
  { key: 'deposit', label: 'Deposits' },
  { key: 'withdrawal', label: 'Withdrawals' },
  { key: 'transfer', label: 'Transfers' },
  { key: 'other', label: 'Other' },
];

const OTHER_TYPES: UnifiedTransaction['type'][] = ['liquidation', 'staking', 'vault', 'spot'];

const PAGE_SIZE = 20;

export default function TransactionHistoryTable({ transactions, address }: TransactionHistoryTableProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [page, setPage] = useState(0);

  const filtered = transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'other') return OTHER_TYPES.includes(tx.type);
    return tx.type === filter;
  });

  const { sortedData, sortKey, sortOrder, toggleSort } = useSortable(filtered, 'time');
  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);
  const paged = sortedData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleFilterChange = (key: FilterKey) => {
    setFilter(key);
    setPage(0);
  };

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        No transaction history found for this account.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => handleFilterChange(f.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
              <tr>
                <SortableHeader label="Time" sortKey="time" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} />
                <th className="px-6 py-4 font-medium">Type</th>
                <SortableHeader label="Summary" sortKey="summary" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} />
                <SortableHeader label="Amount" sortKey="amount" currentSortKey={sortKey} sortOrder={sortOrder} onSort={toggleSort} align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map((tx, idx) => (
                <tr
                  key={`${tx.hash}-${idx}`}
                  onClick={() => router.push(`/accounts/${address}/tx/${tx.hash}`)}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 text-muted-foreground text-xs font-mono">
                    {new Date(tx.time).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_BADGE_STYLES[tx.type]}`}>
                      {TYPE_LABELS[tx.type]}
                    </span>
                  </td>
                  <td className="px-6 py-4">{tx.summary}</td>
                  <td className="px-6 py-4 text-right font-mono">{formatCurrency(tx.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            {sortedData.length} transactions total
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
