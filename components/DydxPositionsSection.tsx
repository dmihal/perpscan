'use client';

import { useState } from 'react';
import PositionsTable from '@/components/PositionsTable';
import { formatCurrency } from '@/lib/utils';

export type DydxPositionRow = {
  id: string;
  exchange: string;
  market: string;
  side: string;
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  leverage: number;
  subaccountNumber: number;
};

export type DydxSubaccountSummary = {
  subaccountNumber: number;
  equity: number;
  freeCollateral: number;
};

function subaccountLabel(num: number): string {
  if (num === 0) return 'Cross-Margin (Subaccount 0)';
  if (num < 128) return `Cross-Margin (Subaccount ${num})`;
  return `Isolated (Subaccount ${num})`;
}

export default function DydxPositionsSection({
  positions,
  subaccounts,
  address,
}: {
  positions: DydxPositionRow[];
  subaccounts: DydxSubaccountSummary[];
  address: string;
}) {
  const [view, setView] = useState<'flat' | 'grouped'>('flat');
  const distinctSubaccountNums = Array.from(new Set(positions.map((p) => p.subaccountNumber))).sort(
    (a, b) => a - b
  );
  const showToggle = distinctSubaccountNums.length > 1;

  return (
    <div>
      {showToggle && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setView('flat')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              view === 'flat'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            All Positions
          </button>
          <button
            onClick={() => setView('grouped')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              view === 'grouped'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            By Subaccount
          </button>
        </div>
      )}

      {view === 'flat' ? (
        <PositionsTable positions={positions} address={address} />
      ) : (
        <div className="space-y-6">
          {distinctSubaccountNums.map((num) => {
            const subPositions = positions.filter((p) => p.subaccountNumber === num);
            const sub = subaccounts.find((s) => s.subaccountNumber === num);
            return (
              <div key={num}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold">{subaccountLabel(num)}</h3>
                  {sub && (
                    <span className="text-sm text-muted-foreground">
                      Equity: {formatCurrency(sub.equity)} · Free:{' '}
                      {formatCurrency(sub.freeCollateral)}
                    </span>
                  )}
                </div>
                {subPositions.length > 0 ? (
                  <PositionsTable positions={subPositions} address={address} />
                ) : (
                  <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
                    No open positions in this subaccount.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
