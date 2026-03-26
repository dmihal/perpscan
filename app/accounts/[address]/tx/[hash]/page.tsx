import Link from 'next/link';
import { ArrowLeft, ExternalLink, ArrowRightLeft, TrendingUp, TrendingDown, Landmark, AlertTriangle } from 'lucide-react';
import { getHyperliquidFills, getHyperliquidLedgerUpdates } from '@/lib/api';
import type { Fill, LedgerUpdate } from '@/lib/api';

export const revalidate = 60;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export default async function TransactionDetailPage({ params }: { params: Promise<{ address: string; hash: string }> }) {
  const { address, hash } = await params;

  const [fills, ledger] = await Promise.all([
    getHyperliquidFills(address, 2000),
    getHyperliquidLedgerUpdates(address),
  ]);

  const matchingFills = fills.filter((f: Fill) => f.hash === hash);
  const matchingLedger = ledger.find((u: LedgerUpdate) => u.hash === hash);

  if (matchingFills.length === 0 && !matchingLedger) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
        <Link href={`/accounts/${address}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Account
        </Link>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Transaction Not Found</h2>
          <p className="text-muted-foreground">
            Could not find a transaction with this hash for this account. It may be outside the 90-day window.
          </p>
        </div>
      </div>
    );
  }

  const timestamp = matchingFills.length > 0 ? matchingFills[0].time : matchingLedger!.time;

  return (
    <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
      <Link href={`/accounts/${address}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Account
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {matchingFills.length > 0 ? (
              <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-blue-500/10 text-blue-500">Trade</span>
            ) : (
              <TypeBadge type={matchingLedger!.delta.type} />
            )}
            <span className="text-sm text-muted-foreground">
              {new Date(timestamp).toLocaleString()}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight font-mono break-all">{hash}</h1>
        </div>
        <a
          href={`https://hypurrscan.io/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-6 shrink-0"
        >
          View on Hypurrscan
          <ExternalLink className="ml-2 h-4 w-4" />
        </a>
      </div>

      {/* Trade detail */}
      {matchingFills.length > 0 && <TradeDetail fills={matchingFills} address={address} />}

      {/* Ledger detail */}
      {matchingLedger && matchingFills.length === 0 && <LedgerDetail update={matchingLedger} address={address} />}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, { className: string; label: string }> = {
    deposit: { className: 'bg-emerald-500/10 text-emerald-500', label: 'Deposit' },
    withdraw: { className: 'bg-orange-500/10 text-orange-500', label: 'Withdrawal' },
    accountClassTransfer: { className: 'bg-purple-500/10 text-purple-500', label: 'Transfer' },
    internalTransfer: { className: 'bg-purple-500/10 text-purple-500', label: 'Internal Transfer' },
    subAccountTransfer: { className: 'bg-purple-500/10 text-purple-500', label: 'Sub-account Transfer' },
    spotTransfer: { className: 'bg-indigo-500/10 text-indigo-500', label: 'Spot Transfer' },
    liquidation: { className: 'bg-destructive/10 text-destructive', label: 'Liquidation' },
    vaultDeposit: { className: 'bg-cyan-500/10 text-cyan-500', label: 'Vault Deposit' },
    vaultWithdraw: { className: 'bg-cyan-500/10 text-cyan-500', label: 'Vault Withdrawal' },
    cStakingTransfer: { className: 'bg-yellow-500/10 text-yellow-500', label: 'Staking' },
    spotGenesis: { className: 'bg-indigo-500/10 text-indigo-500', label: 'Spot Genesis' },
  };
  const s = styles[type] || { className: 'bg-secondary text-secondary-foreground', label: type };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${s.className}`}>
      {s.label}
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{children}</span>
    </div>
  );
}

function TradeDetail({ fills, address }: { fills: Fill[]; address: string }) {
  const first = fills[0];
  const totalSize = fills.reduce((s, f) => s + parseFloat(f.sz), 0);
  const totalNotional = fills.reduce((s, f) => s + parseFloat(f.px) * parseFloat(f.sz), 0);
  const totalFee = fills.reduce((s, f) => s + parseFloat(f.fee), 0);
  const totalPnl = fills.reduce((s, f) => s + parseFloat(f.closedPnl), 0);
  const avgPrice = totalNotional / totalSize;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          {first.side === 'B' ? (
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-destructive" />
          )}
          Trade Details
        </h2>
        <div className="divide-y divide-border">
          <DetailRow label="Market">
            <Link href={`/exchanges/hyperliquid/markets/${first.coin}`} className="text-primary hover:underline">
              {first.coin}-USD
            </Link>
          </DetailRow>
          <DetailRow label="Direction">
            <span className={first.side === 'B' ? 'text-emerald-500' : 'text-destructive'}>
              {first.dir}
            </span>
          </DetailRow>
          <DetailRow label="Side">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${first.side === 'B' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
              {first.side === 'B' ? 'Buy' : 'Sell'}
            </span>
          </DetailRow>
          <DetailRow label="Avg Price">{formatCurrency(avgPrice)}</DetailRow>
          <DetailRow label="Total Size">
            <span className="font-mono">{totalSize.toLocaleString()}</span>
          </DetailRow>
          <DetailRow label="Notional Value">{formatCurrency(totalNotional)}</DetailRow>
          <DetailRow label="Fee">
            <span className="font-mono text-muted-foreground">
              {totalFee.toLocaleString()} {first.feeToken}
            </span>
          </DetailRow>
          {totalPnl !== 0 && (
            <DetailRow label="Realized PnL">
              <span className={`font-mono font-medium ${totalPnl >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
              </span>
            </DetailRow>
          )}
          <DetailRow label="Exchange">Hyperliquid</DetailRow>
        </div>
      </div>

      {/* Multi-fill table */}
      {fills.length > 1 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <h3 className="text-sm font-bold px-6 py-4 bg-secondary/50 border-b border-border">
            Fills ({fills.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-medium">Time</th>
                  <th className="px-6 py-3 font-medium">Side</th>
                  <th className="px-6 py-3 font-medium text-right">Price</th>
                  <th className="px-6 py-3 font-medium text-right">Size</th>
                  <th className="px-6 py-3 font-medium text-right">Fee</th>
                  <th className="px-6 py-3 font-medium text-right">PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fills.map((f, idx) => (
                  <tr key={f.tid || idx} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3 text-muted-foreground text-xs font-mono">
                      {new Date(f.time).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${f.side === 'B' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                        {f.side === 'B' ? 'Buy' : 'Sell'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono">{formatCurrency(parseFloat(f.px))}</td>
                    <td className="px-6 py-3 text-right font-mono">{parseFloat(f.sz).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right font-mono text-muted-foreground">{parseFloat(f.fee).toLocaleString()} {f.feeToken}</td>
                    <td className={`px-6 py-3 text-right font-mono ${parseFloat(f.closedPnl) >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                      {parseFloat(f.closedPnl) !== 0 ? (
                        <>{parseFloat(f.closedPnl) >= 0 ? '+' : ''}{formatCurrency(parseFloat(f.closedPnl))}</>
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
      )}
    </div>
  );
}

function LedgerDetail({ update, address }: { update: LedgerUpdate; address: string }) {
  const d = update.delta;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        {d.type === 'deposit' && <Landmark className="h-5 w-5 text-emerald-500" />}
        {d.type === 'withdraw' && <Landmark className="h-5 w-5 text-orange-500" />}
        {(d.type === 'accountClassTransfer' || d.type === 'internalTransfer' || d.type === 'subAccountTransfer' || d.type === 'spotTransfer') && <ArrowRightLeft className="h-5 w-5 text-purple-500" />}
        {d.type === 'liquidation' && <AlertTriangle className="h-5 w-5 text-destructive" />}
        Transaction Details
      </h2>
      <div className="divide-y divide-border">
        {d.type === 'deposit' && (
          <DetailRow label="Amount Deposited">
            <span className="font-mono text-emerald-500">+{formatCurrency(parseFloat(d.usdc))}</span>
          </DetailRow>
        )}

        {d.type === 'withdraw' && (
          <>
            <DetailRow label="Amount Withdrawn">
              <span className="font-mono text-orange-500">-{formatCurrency(Math.abs(parseFloat(d.usdc)))}</span>
            </DetailRow>
            <DetailRow label="Fee">
              <span className="font-mono text-muted-foreground">{formatCurrency(parseFloat(d.fee))}</span>
            </DetailRow>
          </>
        )}

        {d.type === 'accountClassTransfer' && (
          <>
            <DetailRow label="Amount">
              <span className="font-mono">{formatCurrency(Math.abs(parseFloat(d.usdc)))}</span>
            </DetailRow>
            <DetailRow label="Direction">{d.toPerp ? 'Spot → Perp' : 'Perp → Spot'}</DetailRow>
          </>
        )}

        {d.type === 'internalTransfer' && (
          <>
            <DetailRow label="Amount">
              <span className="font-mono">{formatCurrency(Math.abs(parseFloat(d.usdc)))}</span>
            </DetailRow>
            <DetailRow label="From">
              <Link href={`/accounts/${d.user}`} className="text-primary hover:underline font-mono text-xs">
                {d.user}
              </Link>
            </DetailRow>
            <DetailRow label="To">
              <Link href={`/accounts/${d.destination}`} className="text-primary hover:underline font-mono text-xs">
                {d.destination}
              </Link>
            </DetailRow>
            <DetailRow label="Fee">
              <span className="font-mono text-muted-foreground">{formatCurrency(parseFloat(d.fee))}</span>
            </DetailRow>
          </>
        )}

        {d.type === 'subAccountTransfer' && (
          <>
            <DetailRow label="Amount">
              <span className="font-mono">{formatCurrency(Math.abs(parseFloat(d.usdc)))}</span>
            </DetailRow>
            <DetailRow label="From">
              <Link href={`/accounts/${d.user}`} className="text-primary hover:underline font-mono text-xs">
                {d.user}
              </Link>
            </DetailRow>
            <DetailRow label="To">
              <Link href={`/accounts/${d.destination}`} className="text-primary hover:underline font-mono text-xs">
                {d.destination}
              </Link>
            </DetailRow>
          </>
        )}

        {d.type === 'spotTransfer' && (
          <>
            <DetailRow label="Token">{d.token}</DetailRow>
            <DetailRow label="Amount">
              <span className="font-mono">{parseFloat(d.amount).toLocaleString()} {d.token}</span>
            </DetailRow>
            <DetailRow label="USD Value">
              <span className="font-mono">{formatCurrency(parseFloat(d.usdcValue))}</span>
            </DetailRow>
            <DetailRow label="From">
              <Link href={`/accounts/${d.user}`} className="text-primary hover:underline font-mono text-xs">
                {d.user}
              </Link>
            </DetailRow>
            <DetailRow label="To">
              <Link href={`/accounts/${d.destination}`} className="text-primary hover:underline font-mono text-xs">
                {d.destination}
              </Link>
            </DetailRow>
            <DetailRow label="Fee">
              <span className="font-mono text-muted-foreground">{formatCurrency(parseFloat(d.fee))}</span>
            </DetailRow>
          </>
        )}

        {d.type === 'liquidation' && (
          <>
            <DetailRow label="Account Value at Liquidation">
              <span className="font-mono">{formatCurrency(parseFloat(d.accountValue))}</span>
            </DetailRow>
            <DetailRow label="Total Notional Liquidated">
              <span className="font-mono text-destructive">{formatCurrency(parseFloat(d.liquidatedNtlPos))}</span>
            </DetailRow>
            <DetailRow label="Leverage Type">{d.leverageType}</DetailRow>
            {d.liquidatedPositions.length > 0 && (
              <div className="py-3">
                <span className="text-sm text-muted-foreground block mb-2">Liquidated Positions</span>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Market</th>
                        <th className="px-4 py-2 text-right font-medium">Size</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {d.liquidatedPositions.map((p, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2">
                            <Link href={`/exchanges/hyperliquid/markets/${p.coin}`} className="text-primary hover:underline">
                              {p.coin}-USD
                            </Link>
                          </td>
                          <td className="px-4 py-2 text-right font-mono">{parseFloat(p.szi).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {d.type === 'vaultDeposit' && (
          <>
            <DetailRow label="Amount">
              <span className="font-mono">{formatCurrency(parseFloat(d.usdc))}</span>
            </DetailRow>
            <DetailRow label="Vault">
              <span className="font-mono text-xs">{d.vault}</span>
            </DetailRow>
          </>
        )}

        {d.type === 'vaultWithdraw' && (
          <>
            <DetailRow label="Net Withdrawn">
              <span className="font-mono">{formatCurrency(parseFloat(d.netWithdrawnUsd))}</span>
            </DetailRow>
            <DetailRow label="Requested">
              <span className="font-mono text-muted-foreground">{formatCurrency(parseFloat(d.requestedUsd))}</span>
            </DetailRow>
            <DetailRow label="Commission">
              <span className="font-mono text-muted-foreground">{formatCurrency(parseFloat(d.commission))}</span>
            </DetailRow>
            <DetailRow label="Vault">
              <span className="font-mono text-xs">{d.vault}</span>
            </DetailRow>
          </>
        )}

        {d.type === 'cStakingTransfer' && (
          <>
            <DetailRow label="Action">{d.isDeposit ? 'Stake' : 'Unstake'}</DetailRow>
            <DetailRow label="Token">{d.token}</DetailRow>
            <DetailRow label="Amount">
              <span className="font-mono">{parseFloat(d.amount).toLocaleString()} {d.token}</span>
            </DetailRow>
          </>
        )}

        {d.type === 'spotGenesis' && (
          <>
            <DetailRow label="Token">{d.token}</DetailRow>
            <DetailRow label="Amount Received">
              <span className="font-mono text-emerald-500">+{parseFloat(d.amount).toLocaleString()} {d.token}</span>
            </DetailRow>
          </>
        )}

        <DetailRow label="Exchange">Hyperliquid</DetailRow>
      </div>
    </div>
  );
}
