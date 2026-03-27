import Link from 'next/link';
import { ArrowLeft, Wallet, Activity, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { getTopExchanges, getHyperliquidAccount, getLighterAccounts, getLighterAssetPriceMap, getOstiumPositions } from '@/lib/api';
import type { LighterAccount, OstiumPosition } from '@/lib/api';
import { parseNumber, toArray, formatCurrency } from '@/lib/utils';
import { getLeverageFromMarginFraction } from '@/lib/exchanges/lighter';

export const dynamic = 'force-dynamic';

const supportedAccountExchanges = ['hyperliquid', '5507', 'lighter', 'ostium'];

export default async function ExchangeAccountPage({ params }: { params: Promise<{ id: string, address: string }> }) {
  const { id, address } = await params;
  const exchanges = await getTopExchanges();
  const exchange = exchanges.find(
    ex => ex.defillamaId === id || (id === '5507' && ex.defillamaId === 'hyperliquid')
  );

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

  const isSupported = supportedAccountExchanges.includes(id);
  const isHyperliquid = id === 'hyperliquid' || id === '5507';
  const isLighter = id === 'lighter';
  const isOstium = id === 'ostium';

  if (!isSupported) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
        <Link href={`/accounts/${address}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cross-Exchange Overview
        </Link>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Account Data Not Available</h2>
          <p className="text-muted-foreground">
            Account data for {exchange.name} is not yet supported.
          </p>
        </div>
      </div>
    );
  }

  if (isHyperliquid) {
    const hlAccount = await getHyperliquidAccount(address);

    if (!hlAccount || !hlAccount.marginSummary) {
      return (
        <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
          <Link href={`/accounts/${address}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cross-Exchange Overview
          </Link>
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Account Data</h2>
            <p className="text-muted-foreground">
              Could not find account data for this address on Hyperliquid.
            </p>
          </div>
        </div>
      );
    }

    const hlValue = parseFloat(hlAccount.marginSummary.accountValue || '0');
    const hlMarginUsed = parseFloat(hlAccount.marginSummary.totalMarginUsed || '0');

    const positions: { id: string; market: string; side: string; size: number; entryPrice: number; markPrice: number; pnl: number; leverage: number }[] =
      (hlAccount.assetPositions || []).flatMap((p: any, idx: number) => {
        const pos = p.position;
        const size = parseFloat(pos.szi);
        if (!Number.isFinite(size) || size === 0) return [];
        const pnl = parseFloat(pos.unrealizedPnl || '0');
        return [{
          id: `hl-${idx}`,
          market: `${pos.coin}-USD`,
          side: size > 0 ? 'Long' : 'Short',
          size: Math.abs(size),
          entryPrice: parseFloat(pos.entryPx),
          markPrice: parseFloat(pos.entryPx),
          pnl,
          leverage: pos.leverage ? pos.leverage.value : 1,
        }];
      });
    const hlPnl = positions.reduce((total, position) => total + position.pnl, 0);

    const marginUsage = hlValue > 0 ? (hlMarginUsed / hlValue) * 100 : 0;

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
                <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                  {exchange.name} Account
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-8 flex items-start gap-3 text-emerald-500">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Live Account Data</p>
            <p>The data displayed below is fetched directly from the Hyperliquid API.</p>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3 mb-16">
          <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Account Value</h3>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold font-mono">{formatCurrency(hlValue)}</div>
          </div>
          <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Unrealized PnL</h3>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className={`text-3xl font-bold font-mono ${hlPnl >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
              {hlPnl >= 0 ? '+' : ''}
              {formatCurrency(hlPnl)}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Margin Usage</h3>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold font-mono">{marginUsage.toFixed(1)}%</div>
          </div>
        </section>

        <div className="space-y-8">
          {positions.length > 0 && (
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
                      {positions.map((pos) => (
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
          )}

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
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium">USDC</td>
                      <td className="px-6 py-4 text-right font-mono">{hlValue.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (isOstium) {
    const ostiumPositions = await getOstiumPositions(address);

    if (ostiumPositions.length === 0) {
      return (
        <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
          <Link href={`/accounts/${address}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cross-Exchange Overview
          </Link>
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Account Data</h2>
            <p className="text-muted-foreground">
              Could not find open positions for this address on Ostium.
            </p>
          </div>
        </div>
      );
    }

    const totalCollateral = ostiumPositions.reduce((sum, p) => sum + p.collateral, 0);
    const totalPnl = ostiumPositions.reduce((sum, p) => sum + p.pnl, 0);
    const totalNotional = ostiumPositions.reduce((sum, p) => sum + p.size, 0);

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
                <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                  {exchange.name} Account
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-8 flex items-start gap-3 text-emerald-500">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Live Account Data</p>
            <p>The data displayed below is fetched directly from the Ostium subgraph on Arbitrum.</p>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3 mb-16">
          <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Total Collateral</h3>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold font-mono">{formatCurrency(totalCollateral)}</div>
          </div>
          <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Unrealized PnL</h3>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className={`text-3xl font-bold font-mono ${totalPnl >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
              {totalPnl >= 0 ? '+' : ''}
              {formatCurrency(totalPnl)}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Total Notional</h3>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold font-mono">{formatCurrency(totalNotional)}</div>
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
                      <th className="px-6 py-4 font-medium text-right">Collateral</th>
                      <th className="px-6 py-4 font-medium text-right">Size</th>
                      <th className="px-6 py-4 font-medium text-right">Entry Price</th>
                      <th className="px-6 py-4 font-medium text-right">Mark Price</th>
                      <th className="px-6 py-4 font-medium text-right">Unrealized PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ostiumPositions.map((pos) => (
                      <tr key={pos.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 font-medium">{pos.pairFrom}-{pos.pairTo}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${pos.side === 'Long' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                            {pos.side} {pos.leverage.toFixed(0)}x
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono">{formatCurrency(pos.collateral)}</td>
                        <td className="px-6 py-4 text-right font-mono">{formatCurrency(pos.size)}</td>
                        <td className="px-6 py-4 text-right font-mono">{formatCurrency(pos.entryPrice)}</td>
                        <td className="px-6 py-4 text-right font-mono">{formatCurrency(pos.currentPrice)}</td>
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
        </div>
      </div>
    );
  }

  const [lighterAccounts, lighterAssetPrices] = await Promise.all([
    getLighterAccounts(address),
    getLighterAssetPriceMap(),
  ]);

  if (!isLighter || lighterAccounts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
        <Link href={`/accounts/${address}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cross-Exchange Overview
        </Link>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Account Data</h2>
          <p className="text-muted-foreground">
            Could not find account data for this address on Lighter.
          </p>
        </div>
      </div>
    );
  }

  const assetPriceMap: Record<string, number> = { USDC: 1, USD: 1, ...lighterAssetPrices };
  let totalValue = 0;
  let totalAvailableBalance = 0;
  let unrealizedPnl = 0;
  const positions: {
    id: string;
    subAccount: number;
    market: string;
    side: string;
    size: number;
    entryPrice: number;
    markPrice: number;
    pnl: number;
    leverage: number;
  }[] = [];
  const balances: { id: string; subAccount: number; asset: string; value: number }[] = [];
  const subAccounts: { index: number; accountValue: number; availableBalance: number; openPositions: number }[] = [];

  lighterAccounts.forEach((account: LighterAccount) => {
    const accountValue = parseNumber(account.total_asset_value) || parseNumber(account.collateral);
    const availableBalance = parseNumber(account.available_balance);
    totalValue += accountValue;
    totalAvailableBalance += availableBalance;

    const openPositions = toArray(account.positions).filter(position => {
      const size = parseNumber(position.position);
      return size !== 0 && position.sign !== 0;
    });

    subAccounts.push({
      index: account.index,
      accountValue,
      availableBalance,
      openPositions: openPositions.length,
    });

    openPositions.forEach((position, idx) => {
      const size = Math.abs(parseNumber(position.position));
      const pnl = parseNumber(position.unrealized_pnl);
      const markPrice = size > 0 ? parseNumber(position.position_value) / size : parseNumber(position.avg_entry_price);
      unrealizedPnl += pnl;
      positions.push({
        id: `lighter-${account.index}-${idx}`,
        subAccount: account.index,
        market: position.symbol,
        side: position.sign > 0 ? 'Long' : 'Short',
        size,
        entryPrice: parseNumber(position.avg_entry_price),
        markPrice: Number.isFinite(markPrice) && markPrice > 0 ? markPrice : parseNumber(position.avg_entry_price),
        pnl,
        leverage: getLeverageFromMarginFraction(position.initial_margin_fraction),
      });
    });

    let addedBalance = false;
    toArray(account.assets).forEach((asset) => {
      const amount = parseNumber(asset.balance) + parseNumber(asset.locked_balance);
      if (amount <= 0) return;
      const unitPrice = assetPriceMap[asset.symbol.toUpperCase()];
      if (!unitPrice) return;
      balances.push({
        id: `lighter-balance-${account.index}-${asset.asset_id}`,
        subAccount: account.index,
        asset: asset.symbol,
        value: amount * unitPrice,
      });
      addedBalance = true;
    });

    if (!addedBalance && accountValue > 0) {
      balances.push({
        id: `lighter-balance-${account.index}-account`,
        subAccount: account.index,
        asset: 'USDC Collateral',
        value: accountValue,
      });
    }
  });

  const marginUsage = totalValue > 0 ? ((totalValue - totalAvailableBalance) / totalValue) * 100 : 0;

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
              <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                {exchange.name} Account
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-8 flex items-start gap-3 text-emerald-500">
        <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold mb-1">Live Account Data</p>
          <p>The data displayed below is fetched directly from the Lighter public API.</p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4 mb-16">
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
            {unrealizedPnl >= 0 ? '+' : ''}
            {formatCurrency(unrealizedPnl)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Available Balance</h3>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold font-mono">{formatCurrency(totalAvailableBalance)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Margin Usage</h3>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold font-mono">{marginUsage.toFixed(1)}%</div>
        </div>
      </section>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Sub-Accounts</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">Index</th>
                    <th className="px-6 py-4 font-medium text-right">Account Value</th>
                    <th className="px-6 py-4 font-medium text-right">Available Balance</th>
                    <th className="px-6 py-4 font-medium text-right">Open Positions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subAccounts.map((subAccount) => (
                    <tr key={subAccount.index} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-mono">{subAccount.index}</td>
                      <td className="px-6 py-4 text-right font-mono">{formatCurrency(subAccount.accountValue)}</td>
                      <td className="px-6 py-4 text-right font-mono">{formatCurrency(subAccount.availableBalance)}</td>
                      <td className="px-6 py-4 text-right font-mono">{subAccount.openPositions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Open Positions</h2>
          {positions.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-medium">Sub-Account</th>
                      <th className="px-6 py-4 font-medium">Market</th>
                      <th className="px-6 py-4 font-medium">Side</th>
                      <th className="px-6 py-4 font-medium text-right">Size</th>
                      <th className="px-6 py-4 font-medium text-right">Entry Price</th>
                      <th className="px-6 py-4 font-medium text-right">Mark Price</th>
                      <th className="px-6 py-4 font-medium text-right">Unrealized PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {positions.map((pos) => (
                      <tr key={pos.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 font-mono">{pos.subAccount}</td>
                        <td className="px-6 py-4 font-medium">{pos.market}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${pos.side === 'Long' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                            {pos.side} {pos.leverage.toFixed(0)}x
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
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              No open positions.
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Balances</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">Sub-Account</th>
                    <th className="px-6 py-4 font-medium">Asset</th>
                    <th className="px-6 py-4 font-medium text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {balances.map((balance) => (
                    <tr key={balance.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-mono">{balance.subAccount}</td>
                      <td className="px-6 py-4 font-medium">{balance.asset}</td>
                      <td className="px-6 py-4 text-right font-mono">{formatCurrency(balance.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-xl font-semibold tracking-tight mb-2">History Availability</h2>
          <p className="text-sm text-muted-foreground">
            Lighter exposes positions, balances, and sub-account state publicly, but public trade and transfer history endpoints require authentication. Those records are not shown here.
          </p>
        </section>
      </div>
    </div>
  );
}
