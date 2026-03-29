import { TrendingUp, TrendingDown } from 'lucide-react';
import type { PacificaPositionHistory } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { DetailRow } from './DetailRow';

export function PacificaTradeDetail({ trade }: { trade: PacificaPositionHistory }) {
  const isLong = trade.side.includes('long');
  const pnl = parseFloat(trade.pnl || '0');

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          {isLong ? (
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-destructive" />
          )}
          Trade Details
        </h2>
        <div className="divide-y divide-border">
          <DetailRow label="Market">{trade.symbol}-USD</DetailRow>
          <DetailRow label="Direction">
            <span className={isLong ? 'text-emerald-500' : 'text-destructive'}>
              {isLong ? 'Long' : 'Short'}
            </span>
          </DetailRow>
          <DetailRow label="Side">{trade.side}</DetailRow>
          <DetailRow label="Event Type">{trade.event_type}</DetailRow>
          <DetailRow label="Amount">{trade.amount}</DetailRow>
          <DetailRow label="Execution Price">{formatCurrency(parseFloat(trade.price))}</DetailRow>
          <DetailRow label="Entry Price">{formatCurrency(parseFloat(trade.entry_price))}</DetailRow>
          <DetailRow label="Fee">
            <span className="font-mono text-muted-foreground">{formatCurrency(parseFloat(trade.fee))}</span>
          </DetailRow>
          <DetailRow label="PnL">
            <span className={`font-mono font-medium ${pnl >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
              {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
            </span>
          </DetailRow>
          <DetailRow label="Cause">{trade.cause}</DetailRow>
          <DetailRow label="Time">{new Date(trade.created_at).toLocaleString()}</DetailRow>
          <DetailRow label="Exchange">Pacifica</DetailRow>
        </div>
      </div>
    </div>
  );
}
