import Link from 'next/link';
import { TrendingUp, TrendingDown, Landmark } from 'lucide-react';
import type { DydxFill, DydxTransfer } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { DetailRow } from './DetailRow';

export function DydxTransferBadge({ type }: { type: string }) {
  const styles: Record<string, { className: string; label: string }> = {
    DEPOSIT:      { className: 'bg-emerald-500/10 text-emerald-500', label: 'dYdX Deposit' },
    WITHDRAWAL:   { className: 'bg-orange-500/10 text-orange-500',   label: 'dYdX Withdrawal' },
    TRANSFER_IN:  { className: 'bg-sky-500/10 text-sky-500',         label: 'dYdX Transfer In' },
    TRANSFER_OUT: { className: 'bg-purple-500/10 text-purple-500',   label: 'dYdX Transfer Out' },
  };
  const s = styles[type] || { className: 'bg-secondary text-secondary-foreground', label: `dYdX ${type}` };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${s.className}`}>
      {s.label}
    </span>
  );
}

export function DydxFillDetail({ fill }: { fill: DydxFill }) {
  const notional = parseFloat(fill.price) * parseFloat(fill.size);
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          {fill.side === 'BUY' ? (
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-destructive" />
          )}
          Trade Details
        </h2>
        <div className="divide-y divide-border">
          <DetailRow label="Market">
            <Link href={`/exchanges/dydx/markets/${fill.market.replace('/', '-').toLowerCase()}`} className="text-primary hover:underline">
              {fill.market}
            </Link>
          </DetailRow>
          <DetailRow label="Side">
            <span className={fill.side === 'BUY' ? 'text-emerald-500' : 'text-destructive'}>{fill.side}</span>
          </DetailRow>
          <DetailRow label="Type">{fill.type}</DetailRow>
          <DetailRow label="Liquidity">{fill.liquidity}</DetailRow>
          <DetailRow label="Price">{formatCurrency(parseFloat(fill.price))}</DetailRow>
          <DetailRow label="Size"><span className="font-mono">{parseFloat(fill.size).toString()}</span></DetailRow>
          <DetailRow label="Notional Value">{formatCurrency(notional)}</DetailRow>
          <DetailRow label="Fee"><span className="font-mono text-muted-foreground">{formatCurrency(parseFloat(fill.fee))}</span></DetailRow>
          {fill.subaccountNumber > 0 && <DetailRow label="Subaccount">{fill.subaccountNumber}</DetailRow>}
          <DetailRow label="Fill ID"><span className="font-mono text-xs break-all">{fill.id}</span></DetailRow>
          <DetailRow label="Exchange">dYdX</DetailRow>
        </div>
      </div>
    </div>
  );
}

export function DydxTransferDetail({ transfer, address }: { transfer: DydxTransfer; address: string }) {
  const isDeposit = transfer.type === 'DEPOSIT';
  const isWithdrawal = transfer.type === 'WITHDRAWAL';
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Landmark className={`h-5 w-5 ${isDeposit ? 'text-emerald-500' : isWithdrawal ? 'text-orange-500' : 'text-purple-500'}`} />
        Transfer Details
      </h2>
      <div className="divide-y divide-border">
        <DetailRow label="Type">{transfer.type}</DetailRow>
        <DetailRow label="Amount">
          <span className={`font-mono ${isDeposit ? 'text-emerald-500' : isWithdrawal ? 'text-orange-500' : ''}`}>
            {isDeposit ? '+' : isWithdrawal ? '-' : ''}{parseFloat(transfer.size).toLocaleString()} {transfer.symbol}
          </span>
        </DetailRow>
        <DetailRow label="From">
          {transfer.sender.address ? (
            <Link href={`/accounts/${transfer.sender.address}`} className="text-primary hover:underline font-mono text-xs">
              {transfer.sender.address}
              {transfer.sender.subaccountNumber != null ? ` (sub ${transfer.sender.subaccountNumber})` : ''}
            </Link>
          ) : <span className="text-muted-foreground">—</span>}
        </DetailRow>
        <DetailRow label="To">
          {transfer.recipient.address ? (
            <Link href={`/accounts/${transfer.recipient.address}`} className="text-primary hover:underline font-mono text-xs">
              {transfer.recipient.address}
              {transfer.recipient.subaccountNumber != null ? ` (sub ${transfer.recipient.subaccountNumber})` : ''}
            </Link>
          ) : <span className="text-muted-foreground">—</span>}
        </DetailRow>
        {transfer.transactionHash && (
          <DetailRow label="Tx Hash">
            <span className="font-mono text-xs break-all">{transfer.transactionHash}</span>
          </DetailRow>
        )}
        <DetailRow label="Exchange">dYdX</DetailRow>
      </div>
    </div>
  );
}
