import Link from 'next/link';
import { ArrowLeft, Wallet, ExternalLink, Activity, Shield, AlertTriangle } from 'lucide-react';
import { getHyperliquidAccount, getHyperliquidFills, getHyperliquidContexts } from '@/lib/api';
import PositionsTable from '@/components/PositionsTable';
import BalancesTable from '@/components/BalancesTable';
import TradeHistoryTable from '@/components/TradeHistoryTable';

export const revalidate = 10;

export default async function AccountPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const [hlAccount, hlFills, hlContexts] = await Promise.all([
    getHyperliquidAccount(address),
    getHyperliquidFills(address),
    getHyperliquidContexts(),
  ]);

  // Build mark price lookup from contexts
  const markPrices: Record<string, number> = {};
  if (hlContexts && hlContexts[0] && hlContexts[1]) {
    hlContexts[0].universe.forEach((m: any, idx: number) => {
      const ctx = hlContexts[1][idx];
      if (ctx) markPrices[m.name] = parseFloat(ctx.markPx || "0");
    });
  }

  const hasData = hlAccount && hlAccount.marginSummary;

  let totalValue = 0;
  let unrealizedPnl = 0;
  let marginUsage = 0;
  let positions: any[] = [];
  let balances: any[] = [];

  if (hasData) {
    totalValue = parseFloat(hlAccount.marginSummary.accountValue || "0");
    const marginUsed = parseFloat(hlAccount.marginSummary.totalMarginUsed || "0");
    marginUsage = totalValue > 0 ? (marginUsed / totalValue) * 100 : 0;

    positions = (hlAccount.assetPositions || []).map((p: any, idx: number) => {
      const pos = p.position;
      const size = parseFloat(pos.szi);
      const pnl = parseFloat(pos.unrealizedPnl || "0");
      unrealizedPnl += pnl;
      return {
        id: `hl-${idx}`,
        exchange: 'Hyperliquid',
        market: `${pos.coin}-USD`,
        side: size > 0 ? 'Long' : 'Short',
        size: Math.abs(size),
        entryPrice: parseFloat(pos.entryPx),
        markPrice: markPrices[pos.coin] || parseFloat(pos.entryPx),
        pnl,
        leverage: pos.leverage ? pos.leverage.value : 1,
      };
    });

    balances = [{ exchange: 'Hyperliquid', asset: 'USDC', amount: totalValue }];
  }

  const trades = hlFills.map(f => ({
    coin: f.coin,
    side: f.side,
    px: parseFloat(f.px),
    sz: parseFloat(f.sz),
    time: f.time,
    fee: parseFloat(f.fee),
    closedPnl: parseFloat(f.closedPnl),
    dir: f.dir,
  }));

  const activeExchanges = hasData ? 1 : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
      <Link href="/accounts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Search
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-12">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-primary/10 rounded-full">
            <Wallet className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 font-mono break-all">{address}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                EVM Account
              </span>
              {activeExchanges > 0 && (
                <span className="flex items-center text-emerald-500">
                  <Activity className="mr-1 h-3 w-3" />
                  Active on Hyperliquid
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <a
            href={`https://etherscan.io/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-6"
          >
            View on Etherscan
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>

      {!hasData && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-8 flex items-start gap-3 text-amber-500">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">No Account Data Found</p>
            <p>This address has no positions or balance on Hyperliquid. More exchanges will be supported soon.</p>
          </div>
        </div>
      )}

      {hasData && (
        <>
          <section className="grid gap-4 md:grid-cols-3 mb-16">
            <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">Account Value</h3>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold font-mono">{formatCurrency(totalValue)}</div>
            </div>
            <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">Unrealized PnL</h3>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className={`text-3xl font-bold font-mono ${unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                {unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(unrealizedPnl)}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">Margin Usage</h3>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold font-mono">{marginUsage.toFixed(2)}%</div>
            </div>
          </section>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold tracking-tight mb-4">Open Positions</h2>
              {positions.length > 0 ? (
                <PositionsTable positions={positions} address={address} />
              ) : (
                <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                  No open positions.
                </div>
              )}
            </section>

            <section>
              <h2 className="text-2xl font-bold tracking-tight mb-4">Balances</h2>
              <BalancesTable balances={balances} address={address} />
            </section>
          </div>
        </>
      )}

      <section className="mt-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Trade History</h2>
        <TradeHistoryTable trades={trades} />
      </section>
    </div>
  );
}
