import Link from 'next/link';
import { ArrowLeft, ExternalLink, AlertTriangle } from 'lucide-react';
import { resolveTx } from '@/lib/tx';
import type { TxResult } from '@/lib/tx';
import { TradeDetail, LedgerDetail, TypeBadge } from '@/components/tx/HyperliquidDetail';
import { LighterLogDetail, LighterTypeBadge } from '@/components/tx/LighterDetail';
import { OstiumTradeDetail } from '@/components/tx/OstiumDetail';
import { DydxFillDetail, DydxTransferDetail, DydxTransferBadge } from '@/components/tx/DydxDetail';

export const revalidate = 60;

function getTxMeta(result: TxResult, hash: string): { heading: string; badge: React.ReactNode; externalHref: string; externalLabel: string } {
  switch (result.exchange) {
    case 'hyperliquid':
      return result.type === 'fill'
        ? { heading: hash, badge: <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-blue-500/10 text-blue-500">Trade</span>, externalHref: `https://hypurrscan.io/tx/${hash}`, externalLabel: 'View on Hypurrscan' }
        : { heading: hash, badge: <TypeBadge type={result.data.delta.type} />, externalHref: `https://hypurrscan.io/tx/${hash}`, externalLabel: 'View on Hypurrscan' };
    case 'lighter':
      return { heading: hash, badge: <LighterTypeBadge log={result.data} accountIndexes={result.accountIndexes} />, externalHref: `https://app.lighter.xyz/explorer/logs/${hash}`, externalLabel: 'View on Lighter Explorer' };
    case 'ostium':
      return { heading: `Ostium ${result.data.action} Tx`, badge: <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-blue-500/10 text-blue-500">Ostium Order</span>, externalHref: `https://arbiscan.io/tx/${hash}`, externalLabel: 'View on Arbiscan' };
    case 'dydx':
      return result.type === 'fill'
        ? { heading: `dYdX ${result.data.side} ${result.data.market}`, badge: <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-blue-500/10 text-blue-500">dYdX Trade</span>, externalHref: `https://www.mintscan.io/dydx`, externalLabel: 'View on Mintscan' }
        : { heading: `dYdX ${result.data.type}`, badge: <DydxTransferBadge type={result.data.type} />, externalHref: `https://www.mintscan.io/dydx`, externalLabel: 'View on Mintscan' };
  }
}

function TxDetail({ result, address, hash }: { result: TxResult; address: string; hash: string }) {
  switch (result.exchange) {
    case 'hyperliquid':
      return result.type === 'fill'
        ? <TradeDetail fills={result.data} address={address} />
        : <LedgerDetail update={result.data} address={address} />;
    case 'lighter':
      return <LighterLogDetail log={result.data} accountIndexes={result.accountIndexes} />;
    case 'ostium':
      return <OstiumTradeDetail trade={result.data} hash={hash} />;
    case 'dydx':
      return result.type === 'fill'
        ? <DydxFillDetail fill={result.data} />
        : <DydxTransferDetail transfer={result.data} address={address} />;
  }
}

export default async function TransactionDetailPage({ params }: { params: Promise<{ address: string; hash: string }> }) {
  const { address, hash } = await params;
  const result = await resolveTx(address, hash);

  if (!result) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
        <Link href={`/accounts/${address}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Account
        </Link>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Transaction Not Found</h2>
          <p className="text-muted-foreground">Could not find a transaction with this hash for this account.</p>
        </div>
      </div>
    );
  }

  const { heading, badge, externalHref, externalLabel } = getTxMeta(result, hash);

  return (
    <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
      <Link href={`/accounts/${address}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Account
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {badge}
            <span className="text-sm text-muted-foreground">{new Date(result.timestamp).toLocaleString()}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight font-mono break-all">{heading}</h1>
        </div>
        <a
          href={externalHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-6 shrink-0"
        >
          {externalLabel}
          <ExternalLink className="ml-2 h-4 w-4" />
        </a>
      </div>

      <TxDetail result={result} address={address} hash={hash} />
    </div>
  );
}
