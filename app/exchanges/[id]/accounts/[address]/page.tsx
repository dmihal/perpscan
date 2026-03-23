import Link from 'next/link';
import { ArrowLeft, Wallet, ExternalLink, Activity, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getTopExchanges, getHyperliquidAccount } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function ExchangeAccountPage({ params }: { params: Promise<{ id: string, address: string }> }) {
  const { id, address } = await params;
  const exchanges = await getTopExchanges();
  const exchange = exchanges.find(ex => ex.defillamaId === id || (id === '5507' && ex.defillamaId === 'hyperliquid'));

  if (!exchange) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Exchange Not Found</h1>
        <p className="text-muted-foreground mb-8">We could not find the exchange you are looking for.</p>
        <Link href="/accounts" className="text-primary hover:underline">
          Return to Account Search
        </Link>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  // Mock data for the account on this specific exchange
  let accountData = {
    totalValue: 45000.00,
    unrealizedPnl: 4500.00,
    marginUsage: 45.5,
    positions: [
      { id: '1', market: 'BTC-USD', side: 'Long', size: 2.5, entryPrice: 62400, markPrice: 64200, pnl: 4500, leverage: 10 },
      { id: '2', market: 'SOL-USD', side: 'Short', size: 50, entryPrice: 155, markPrice: 147.2, pnl: 390, leverage: 5 },
    ],
    balances: [
      { asset: 'USDC', amount: 45000 },
      { asset: 'ETH', amount: 0.5 },
    ],
    history: [
      { id: 'tx1', type: 'Trade', market: 'BTC-USD', side: 'Long', size: 2.5, price: 62400, fee: 15.60, time: '2024-05-15T10:30:00Z' },
      { id: 'tx2', type: 'Deposit', asset: 'USDC', amount: 50000, time: '2024-05-10T14:20:00Z' },
      { id: 'tx3', type: 'Trade', market: 'SOL-USD', side: 'Short', size: 50, price: 155, fee: 3.10, time: '2024-05-12T09:15:00Z' },
    ]
  };

  let isRealData = false;

  if (id === 'hyperliquid' || id === '5507') {
    const hlAccount = await getHyperliquidAccount(address);
    if (hlAccount && hlAccount.marginSummary) {
      isRealData = true;
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
          market: `${pos.coin}-USD`,
          side: size > 0 ? 'Long' : 'Short',
          size: Math.abs(size),
          entryPrice: parseFloat(pos.entryPx),
          markPrice: parseFloat(pos.entryPx), // Using entry as fallback
          pnl: pnl,
          leverage: pos.leverage ? pos.leverage.value : 1
        };
      });

      // Fetch Hyperliquid transaction history
      let hlHistory: any[] = [];
      try {
        const res = await fetch('https://api.hyperliquid.xyz/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'userFills', user: address })
        });
        const fills = await res.json();
        if (Array.isArray(fills)) {
          hlHistory = fills.slice(0, 50).map((fill: any, idx: number) => ({
            id: fill.oid?.toString() || `fill-${idx}`,
            type: 'Trade',
            market: `${fill.coin}-USD`,
            side: fill.side === 'B' ? 'Long' : 'Short',
            size: parseFloat(fill.sz),
            price: parseFloat(fill.px),
            fee: parseFloat(fill.fee),
            time: new Date(fill.time).toISOString()
          }));
        }
      } catch (e) {
        console.error("Failed to fetch HL fills", e);
      }

      accountData = {
        totalValue: hlValue,
        unrealizedPnl: hlPnl,
        marginUsage: hlValue > 0 ? (hlMarginUsed / hlValue) * 100 : 0,
        positions: hlPositions,
        balances: [
          { asset: 'USDC', amount: hlValue }
        ],
        history: hlHistory
      };
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
      <Link href={`/accounts/${address}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Cross-Exchange Overview
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
                {exchange.name} Account
              </span>
            </div>
          </div>
        </div>
      </div>

      {isRealData ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-8 flex items-start gap-3 text-emerald-500">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Live Account Data</p>
            <p>The data displayed below is fetched directly from the Hyperliquid API.</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-8 flex items-start gap-3 text-amber-500">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Demo Account Data</p>
            <p>The data displayed below is simulated for demonstration purposes.</p>
          </div>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3 mb-16">
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Account Value</h3>
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
            {accountData.marginUsage}%
          </div>
        </div>
      </section>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Open Positions</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">Market</th>
                    <th className="px-6 py-4 font-medium">Side</th>
                    <th className="px-6 py-4 font-medium text-right">Size</th>
                    <th className="px-6 py-4 font-medium text-right">Entry Price</th>
                    <th className="px-6 py-4 font-medium text-right">Mark Price</th>
                    <th className="px-6 py-4 font-medium text-right">Unrealized PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {accountData.positions.map((pos) => (
                    <tr key={pos.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium">{pos.market}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${pos.side === 'Long' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                          {pos.side} {pos.leverage}x
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">{pos.size}</td>
                      <td className="px-6 py-4 text-right font-mono">{formatCurrency(pos.entryPrice)}</td>
                      <td className="px-6 py-4 text-right font-mono">{formatCurrency(pos.markPrice)}</td>
                      <td className={`px-6 py-4 text-right font-mono font-medium ${pos.pnl >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                        {pos.pnl >= 0 ? '+' : ''}{formatCurrency(pos.pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Balances</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">Asset</th>
                    <th className="px-6 py-4 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {accountData.balances.map((bal, idx) => (
                    <tr key={idx} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium">{bal.asset}</td>
                      <td className="px-6 py-4 text-right font-mono">{bal.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Transaction History</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">Time</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Details</th>
                    <th className="px-6 py-4 font-medium text-right">Amount/Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {accountData.history.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(tx.time).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-medium">{tx.type}</td>
                      <td className="px-6 py-4">
                        {tx.type === 'Trade' ? (
                          <span>{tx.side} {tx.market} @ {formatCurrency(tx.price!)}</span>
                        ) : (
                          <span>{tx.asset}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {tx.type === 'Trade' ? tx.size : formatCurrency(tx.amount!)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
