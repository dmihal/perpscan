import { ArrowRightLeft } from 'lucide-react';
import type { LighterExplorerLog } from '@/lib/api';
import { DetailRow } from './DetailRow';

export function LighterTypeBadge({ log, accountIndexes }: { log: LighterExplorerLog; accountIndexes: Set<string> }) {
  const deposit = log.pubdata?.l1_deposit_pubdata_v2;
  const transfer = log.pubdata?.l2_transfer_pubdata_v2;

  if (deposit) {
    return (
      <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-emerald-500/10 text-emerald-500">
        Lighter Deposit
      </span>
    );
  }

  if (transfer) {
    const isOutgoing = accountIndexes.has(transfer.from_account_index);
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${isOutgoing ? 'bg-purple-500/10 text-purple-500' : 'bg-sky-500/10 text-sky-500'}`}>
        {isOutgoing ? 'Lighter Transfer Out' : 'Lighter Transfer In'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-secondary text-secondary-foreground">
      Lighter Log
    </span>
  );
}

export function LighterLogDetail({ log, accountIndexes }: { log: LighterExplorerLog; accountIndexes: Set<string> }) {
  const deposit = log.pubdata?.l1_deposit_pubdata_v2;
  const transfer = log.pubdata?.l2_transfer_pubdata_v2;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        {(deposit || transfer) && <ArrowRightLeft className="h-5 w-5 text-purple-500" />}
        Lighter Explorer Details
      </h2>
      <div className="divide-y divide-border">
        <DetailRow label="Exchange">Lighter</DetailRow>
        <DetailRow label="Type">{log.tx_type}</DetailRow>
        {log.status && <DetailRow label="Status">{log.status}</DetailRow>}
        {log.block_number !== undefined && <DetailRow label="Block">{log.block_number}</DetailRow>}
        {log.batch_number !== undefined && <DetailRow label="Batch">{log.batch_number}</DetailRow>}

        {deposit && (
          <>
            <DetailRow label="Asset">{deposit.asset_index}</DetailRow>
            <DetailRow label="Amount">
              <span className="font-mono text-emerald-500">+{deposit.accepted_amount} {deposit.asset_index}</span>
            </DetailRow>
            <DetailRow label="Route">{deposit.route_type}</DetailRow>
            <DetailRow label="Account Index"><span className="font-mono">{deposit.account_index}</span></DetailRow>
            <DetailRow label="Address"><span className="font-mono text-xs">{deposit.l1_address}</span></DetailRow>
          </>
        )}

        {transfer && (
          <>
            <DetailRow label="Direction">
              {accountIndexes.has(transfer.from_account_index) ? 'Outgoing' : 'Incoming'}
            </DetailRow>
            <DetailRow label="Asset">{transfer.asset_index}</DetailRow>
            <DetailRow label="Amount"><span className="font-mono">{transfer.amount} {transfer.asset_index}</span></DetailRow>
            <DetailRow label="From Account"><span className="font-mono">{transfer.from_account_index}</span></DetailRow>
            <DetailRow label="To Account"><span className="font-mono">{transfer.to_account_index}</span></DetailRow>
            <DetailRow label="From Route">{transfer.from_route_type}</DetailRow>
            <DetailRow label="To Route">{transfer.to_route_type}</DetailRow>
            <DetailRow label="Fee"><span className="font-mono">{transfer.usdc_fee} USDC</span></DetailRow>
          </>
        )}
      </div>
    </div>
  );
}
