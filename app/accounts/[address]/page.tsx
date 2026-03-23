import Link from 'next/link';
import { ArrowLeft, Wallet, ExternalLink, Activity, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getHyperliquidAccount } from '@/lib/api';
import PositionsTable from '@/components/PositionsTable';
import BalancesTable from '@/components/BalancesTable';

export const dynamic = 'force-dynamic';

export default async function AccountPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  // Fetch real Hyperliquid data
  const hlAccount = await getHyperliquidAccount(address);

  // Mock data for the account
  let accountData = {
    totalValue: 125430.50,
    unrealizedPnl: 4520.75,
    marginUsage: 35.2,
    positions: [
      { id: '2', exchange: 'dYdX', market: 'ETH-USD', side: 'Short', size: 15, entryPrice: 3500, markPrice: 3480, pnl: 300, leverage: 5 },
      { id: '3', exchange: 'GMX', market: 'SOL-USD', side: 'Long', size: 100, entryPrice: 150, markPrice: 147.2, pnl: -279.25, leverage: 3 },
    ],
    balances: [
      { exchange: 'dYdX', asset: 'USDC', amount: 25000 },
      { exchange: 'GMX', asset: 'USDC', amount: 15000 },
    ]
  };

  let hasRealData = false;

  // Merge real Hyperliquid data if available
  if (hlAccount && hlAccount.marginSummary) {
    hasRealData = true;
    const hlValue = parseFloat(hlAccount.marginSummary.accountValue || "0");
    const hlMarginUsed = parseFloat(hlAccount.marginSummary.totalMarginUsed || "0");
    
    let hlPnl = 0;
    const hlPositions = (hlAccount.assetPositions || []).map((p: any, idx: number) => {
      const pos = p.position;
      const size = parseFloat(pos.szi);
      const pnl = parseFloat(pos.unrealizedPnl || "0");
      hlPnl += pnl;
      return {
        id: `hl-${idx}`,
        exchange: 'Hyperliquid',
        market: `${pos.coin}-USD`,
        side: size > 0 ? 'Long' : 'Short',
        size: Math.abs(size),
        entryPrice: parseFloat(pos.entryPx),
        markPrice: parseFloat(pos.entryPx), // We don't have markPx in this endpoint without ctxs, using entry as fallback or we could fetch ctxs
        pnl: pnl,
        leverage: pos.leverage ? pos.leverage.value : 1
      };
    });

    accountData.totalValue += hlValue;
    accountData.unrealizedPnl += hlPnl;
    
    // Recalculate margin usage roughly
    const totalMargin = (accountData.totalValue * (accountData.marginUsage / 100)) + hlMarginUsed;
    accountData.marginUsage = accountData.totalValue > 0 ? (totalMargin / accountData.totalValue) * 100 : 0;

    accountData.positions = [...hlPositions, ...accountData.positions];
    accountData.balances = [
      { exchange: 'Hyperliquid', asset: 'USDC', amount: hlValue },
      ...accountData.balances
    ];
  } else {
    // Fallback to mock HL data if no real data found (or 0 balance)
    accountData.positions.unshift({ id: '1', exchange: 'Hyperliquid', market: 'BTC-USD', side: 'Long', size: 2.5, entryPrice: 62400, markPrice: 64200, pnl: 4500, leverage: 10 });
    accountData.balances.unshift({ exchange: 'Hyperliquid', asset: 'USDC', amount: 45000 });
  }

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
              <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-secondary text-secondary-foreground">
                EVM Account
              </span>
              <span className="flex items-center text-emerald-500">
                <Activity className="mr-1 h-3 w-3" />
                Active on 3 DEXs
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <a
            href={`https://etherscan.io/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-6"
          >
            View on Etherscan
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>

      {hasRealData ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-8 flex items-start gap-3 text-emerald-500">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Live Hyperliquid Data Included</p>
            <p>The data displayed below includes live positions and balances from Hyperliquid, merged with simulated data for other exchanges.</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-8 flex items-start gap-3 text-amber-500">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Demo Account Data</p>
            <p>The data displayed below is simulated for demonstration purposes. Real cross-exchange account aggregation requires connecting to individual DEX APIs or indexing blockchain events.</p>
          </div>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3 mb-16">
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total Account Value</h3>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold font-mono">
            {formatCurrency(accountData.totalValue)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Unrealized PnL</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className={`text-3xl font-bold font-mono ${accountData.unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
            {accountData.unrealizedPnl >= 0 ? '+' : ''}
            {formatCurrency(accountData.unrealizedPnl)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Margin Usage</h3>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold font-mono">
            {accountData.marginUsage.toFixed(2)}%
          </div>
        </div>
      </section>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Open Positions</h2>
          <PositionsTable positions={accountData.positions} address={address} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Balances</h2>
          <BalancesTable balances={accountData.balances} address={address} />
        </section>
      </div>
    </div>
  );
}
