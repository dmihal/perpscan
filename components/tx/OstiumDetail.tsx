import Link from 'next/link';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { OstiumTradeHistoryEntry } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { DetailRow } from './DetailRow';

export function OstiumTradeDetail({ trade, hash }: { trade: OstiumTradeHistoryEntry; hash: string }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          {trade.side === 'Long' ? (
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-destructive" />
          )}
          Trade Details
        </h2>
        <div className="divide-y divide-border">
          <DetailRow label="Market">
            <Link href={`/exchanges/ostium/markets/${trade.pairFrom.toLowerCase()}`} className="text-primary hover:underline">
              {trade.pairFrom}-{trade.pairTo}
            </Link>
          </DetailRow>
          <DetailRow label="Direction">
            <span className={trade.side === 'Long' ? 'text-emerald-500' : 'text-destructive'}>{trade.side}</span>
          </DetailRow>
          <DetailRow label="Action">{trade.action}</DetailRow>
          <DetailRow label="Order Type">{trade.orderType}</DetailRow>
          <DetailRow label="Collateral">{formatCurrency(trade.collateral)}</DetailRow>
          <DetailRow label="Notional Value">{formatCurrency(trade.size)}</DetailRow>
          <DetailRow label="Leverage">{trade.leverage.toFixed(1)}x</DetailRow>
          <DetailRow label="Execution Price">{formatCurrency(trade.price)}</DetailRow>
          <DetailRow label="Price After Impact">
            <span className="font-mono">{formatCurrency(trade.priceAfterImpact)}</span>
          </DetailRow>
          <DetailRow label="Fees">
            <span className="font-mono text-muted-foreground">{formatCurrency(trade.fees)}</span>
          </DetailRow>
          <DetailRow label="Amount Returned">
            <span className="font-mono">{formatCurrency(trade.amountSentToTrader)}</span>
          </DetailRow>
          <DetailRow label="Realized PnL">
            <span className={`font-mono font-medium ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
              {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
            </span>
          </DetailRow>
          <DetailRow label="Tx Hash">
            <a href={`https://arbiscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono break-all">
              {hash}
            </a>
          </DetailRow>
          <DetailRow label="Exchange">Ostium</DetailRow>
        </div>
      </div>
    </div>
  );
}
