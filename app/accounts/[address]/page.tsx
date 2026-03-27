import Link from 'next/link';
import { ArrowLeft, Wallet, ExternalLink, Activity, Shield, AlertTriangle } from 'lucide-react';
import {
  getTopExchanges,
  getHyperliquidAccount,
  getHyperliquidFills,
  getHyperliquidContexts,
  getHyperliquidLedgerUpdates,
  getLighterAccounts,
  getLighterAssetPriceMap,
  getLighterLogsForAddress,
  getOstiumPositions,
} from '@/lib/api';
import type { Fill, LedgerUpdate, LighterAccount, LighterExplorerLog, OstiumPosition } from '@/lib/api';
import PositionsTable from '@/components/PositionsTable';
import BalancesTable from '@/components/BalancesTable';
import TransactionHistoryTable from '@/components/TransactionHistoryTable';

export const revalidate = 10;

function parseNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toArray<T>(value: T[] | Record<string, T> | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : Object.values(value);
}

function getLighterLeverage(initialMarginFraction?: string): number {
  const marginFraction = parseNumber(initialMarginFraction);
  if (marginFraction <= 0) return 1;
  const leverage = marginFraction > 1 ? 100 / marginFraction : 1 / marginFraction;
  return Number.isFinite(leverage) && leverage > 0 ? leverage : 1;
}

export default async function AccountPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const [exchanges, hlAccount, hlFills, hlContexts, hlLedger, lighterAccounts, lighterAssetPrices, lighterLogs, ostiumPositions] = await Promise.all([
    getTopExchanges(),
    getHyperliquidAccount(address),
    getHyperliquidFills(address),
    getHyperliquidContexts(),
    getHyperliquidLedgerUpdates(address),
    getLighterAccounts(address),
    getLighterAssetPriceMap(),
    getLighterLogsForAddress(address),
    getOstiumPositions(address),
  ]);

  const assetPriceMap: Record<string, number> = { USDC: 1, USD: 1, ...lighterAssetPrices };

  const markPrices: Record<string, number> = {};
  if (hlContexts && hlContexts[0] && hlContexts[1]) {
    hlContexts[0].universe.forEach((m: any, idx: number) => {
      const ctx = hlContexts[1][idx];
      if (ctx) markPrices[m.name] = parseFloat(ctx.markPx || '0');
    });
  }

  const hasHyperliquidData = Boolean(hlAccount && hlAccount.marginSummary);
  const hasLighterData = lighterAccounts.length > 0;
  const hasOstiumData = ostiumPositions.length > 0;
  const hasData = hasHyperliquidData || hasLighterData || hasOstiumData;

  let totalValue = 0;
  let unrealizedPnl = 0;
  let totalMarginUsed = 0;
  const positions: {
    id: string;
    exchange: string;
    market: string;
    side: string;
    size: number;
    entryPrice: number;
    markPrice: number;
    pnl: number;
    leverage: number;
  }[] = [];
  const balances: { exchange: string; asset: string; amount: number }[] = [];

  if (hasHyperliquidData && hlAccount?.marginSummary) {
    const hlValue = parseFloat(hlAccount.marginSummary.accountValue || '0');
    const hlMarginUsed = parseFloat(hlAccount.marginSummary.totalMarginUsed || '0');
    totalValue += hlValue;
    totalMarginUsed += hlMarginUsed;

    (hlAccount.assetPositions || []).forEach((p: any, idx: number) => {
      const pos = p.position;
      const size = parseFloat(pos.szi);
      if (!Number.isFinite(size) || size === 0) return;
      const pnl = parseFloat(pos.unrealizedPnl || '0');
      unrealizedPnl += pnl;
      positions.push({
        id: `hl-${idx}`,
        exchange: 'Hyperliquid',
        market: `${pos.coin}-USD`,
        side: size > 0 ? 'Long' : 'Short',
        size: Math.abs(size),
        entryPrice: parseFloat(pos.entryPx),
        markPrice: markPrices[pos.coin] || parseFloat(pos.entryPx),
        pnl,
        leverage: pos.leverage ? pos.leverage.value : 1,
      });
    });

    balances.push({ exchange: 'Hyperliquid', asset: 'USDC', amount: hlValue });
  }

  lighterAccounts.forEach((account: LighterAccount) => {
    const accountValue = parseNumber(account.total_asset_value) || parseNumber(account.collateral);
    const availableBalance = parseNumber(account.available_balance);
    totalValue += accountValue;
    totalMarginUsed += Math.max(accountValue - availableBalance, 0);

    toArray(account.positions).forEach((position, idx) => {
      const rawSize = parseNumber(position.position);
      if (!rawSize || position.sign === 0) return;
      const size = Math.abs(rawSize);
      const pnl = parseNumber(position.unrealized_pnl);
      const markPrice = size > 0 ? parseNumber(position.position_value) / size : parseNumber(position.avg_entry_price);
      unrealizedPnl += pnl;
      positions.push({
        id: `lighter-${account.index}-${idx}`,
        exchange: 'Lighter',
        market: position.symbol,
        side: position.sign > 0 ? 'Long' : 'Short',
        size,
        entryPrice: parseNumber(position.avg_entry_price),
        markPrice: Number.isFinite(markPrice) && markPrice > 0 ? markPrice : parseNumber(position.avg_entry_price),
        pnl,
        leverage: getLighterLeverage(position.initial_margin_fraction),
      });
    });

    let addedBalanceRow = false;
    toArray(account.assets).forEach((asset) => {
      const amount = parseNumber(asset.balance) + parseNumber(asset.locked_balance);
      if (amount <= 0) return;
      const symbol = asset.symbol.toUpperCase();
      const unitPrice = assetPriceMap[symbol];
      if (!unitPrice) return;
      balances.push({
        exchange: 'Lighter',
        asset: asset.symbol,
        amount: amount * unitPrice,
      });
      addedBalanceRow = true;
    });

    if (!addedBalanceRow && accountValue > 0) {
      balances.push({
        exchange: 'Lighter',
        asset: 'USDC Collateral',
        amount: accountValue,
      });
    }
  });

  if (hasOstiumData) {
    const ostiumCollateral = ostiumPositions.reduce((sum, p) => sum + p.collateral, 0);
    totalValue += ostiumCollateral;

    ostiumPositions.forEach((pos, idx) => {
      unrealizedPnl += pos.pnl;
      positions.push({
        id: `ostium-${idx}`,
        exchange: 'Ostium',
        market: `${pos.pairFrom}-${pos.pairTo}`,
        side: pos.side,
        size: pos.size,
        entryPrice: pos.entryPrice,
        markPrice: pos.currentPrice,
        pnl: pos.pnl,
        leverage: pos.leverage,
      });
    });

    balances.push({
      exchange: 'Ostium',
      asset: 'USDC Collateral',
      amount: ostiumCollateral,
    });
  }

  const lighterAccountIndexes = new Set(lighterAccounts.map((account) => account.index.toString()));

  const fillTxs = hlFills.map((f: Fill) => ({
    hash: f.hash,
    time: f.time,
    type: 'trade' as const,
    summary: `${f.dir} ${f.coin}-USD @ $${parseFloat(f.px).toLocaleString()} (${parseFloat(f.sz)} units)`,
    amount: parseFloat(f.px) * parseFloat(f.sz),
    exchange: 'Hyperliquid',
  }));

  const ledgerTxs = hlLedger.map((u: LedgerUpdate) => {
    const d = u.delta;
    let type: 'deposit' | 'withdrawal' | 'transfer' | 'liquidation' | 'staking' | 'vault' | 'spot' = 'transfer';
    let summary = '';
    let amount = 0;

    switch (d.type) {
      case 'deposit':
        type = 'deposit';
        summary = `Deposited ${parseFloat(d.usdc).toLocaleString()} USDC`;
        amount = Math.abs(parseFloat(d.usdc));
        break;
      case 'withdraw':
        type = 'withdrawal';
        summary = `Withdrew ${parseFloat(d.usdc).toLocaleString()} USDC (fee: $${parseFloat(d.fee)})`;
        amount = Math.abs(parseFloat(d.usdc));
        break;
      case 'accountClassTransfer':
        type = 'transfer';
        summary = `Transferred ${parseFloat(d.usdc).toLocaleString()} USDC ${d.toPerp ? 'to Perp' : 'to Spot'}`;
        amount = Math.abs(parseFloat(d.usdc));
        break;
      case 'internalTransfer':
        type = 'transfer';
        summary = `Internal transfer ${parseFloat(d.usdc).toLocaleString()} USDC -> ${d.destination.slice(0, 8)}...`;
        amount = Math.abs(parseFloat(d.usdc));
        break;
      case 'subAccountTransfer':
        type = 'transfer';
        summary = `Sub-account transfer ${parseFloat(d.usdc).toLocaleString()} USDC -> ${d.destination.slice(0, 8)}...`;
        amount = Math.abs(parseFloat(d.usdc));
        break;
      case 'spotTransfer':
        type = 'spot';
        summary = `Spot transfer ${parseFloat(d.amount)} ${d.token} -> ${d.destination.slice(0, 8)}...`;
        amount = Math.abs(parseFloat(d.usdcValue));
        break;
      case 'liquidation':
        type = 'liquidation';
        summary = `Liquidated ${d.leverageType} - ${parseFloat(d.liquidatedNtlPos).toLocaleString()} notional`;
        amount = Math.abs(parseFloat(d.liquidatedNtlPos));
        break;
      case 'vaultDeposit':
        type = 'vault';
        summary = `Vault deposit ${parseFloat(d.usdc).toLocaleString()} USDC to ${d.vault.slice(0, 8)}...`;
        amount = Math.abs(parseFloat(d.usdc));
        break;
      case 'vaultWithdraw':
        type = 'vault';
        summary = `Vault withdrawal ${parseFloat(d.netWithdrawnUsd).toLocaleString()} USDC from ${d.vault.slice(0, 8)}...`;
        amount = Math.abs(parseFloat(d.netWithdrawnUsd));
        break;
      case 'cStakingTransfer':
        type = 'staking';
        summary = `${d.isDeposit ? 'Staked' : 'Unstaked'} ${parseFloat(d.amount)} ${d.token}`;
        amount = Math.abs(parseFloat(d.amount));
        break;
      case 'spotGenesis':
        type = 'spot';
        summary = `Spot genesis: received ${parseFloat(d.amount)} ${d.token}`;
        amount = Math.abs(parseFloat(d.amount));
        break;
    }

    return { hash: u.hash, time: u.time, type, summary, amount, exchange: 'Hyperliquid' };
  });

  const lighterTxs = lighterLogs.map((log: LighterExplorerLog) => {
    const deposit = log.pubdata?.l1_deposit_pubdata_v2;
    const transfer = log.pubdata?.l2_transfer_pubdata_v2;
    let type: 'deposit' | 'transfer' = 'transfer';
    let summary = `Lighter ${log.tx_type}`;
    let amount = 0;

    if (deposit) {
      type = 'deposit';
      amount = parseNumber(deposit.accepted_amount);
      summary = `Lighter deposit ${amount.toLocaleString()} ${deposit.asset_index}`;
    } else if (transfer) {
      type = 'transfer';
      amount = parseNumber(transfer.amount);
      const isOutgoing = lighterAccountIndexes.has(transfer.from_account_index);
      const counterpartyIndex = isOutgoing ? transfer.to_account_index : transfer.from_account_index;
      summary = `${isOutgoing ? 'Lighter transfer out' : 'Lighter transfer in'} ${amount.toLocaleString()} ${transfer.asset_index} ${isOutgoing ? 'to' : 'from'} acct ${counterpartyIndex}`;
    }

    return {
      hash: log.hash,
      time: new Date(log.time).getTime(),
      type,
      summary,
      amount,
      exchange: 'Lighter',
    };
  });

  const allTransactions = [...fillTxs, ...ledgerTxs, ...lighterTxs].sort((a, b) => b.time - a.time);
  const marginUsage = totalValue > 0 ? (totalMarginUsed / totalValue) * 100 : 0;
  const activeExchanges = ['Hyperliquid', 'Lighter'].filter((exchange) =>
    exchange === 'Hyperliquid' ? hasHyperliquidData : hasLighterData
  );
  const exchangeMeta = {
    Hyperliquid: {
      name: 'Hyperliquid',
      href: '/exchanges/hyperliquid',
      logo: exchanges.find((exchange) => exchange.defillamaId === 'hyperliquid')?.logo,
    },
    Lighter: {
      name: 'Lighter',
      href: '/exchanges/lighter',
      logo: '/brands/lighter-iconmark.svg',
    },
  };
  const exchangeStatuses = [
    {
      name: 'Hyperliquid',
      found: hasHyperliquidData,
      detail: hasHyperliquidData ? 'Live positions and balances loaded.' : 'No public account state found for this address.',
    },
    {
      name: 'Lighter',
      found: hasLighterData,
      detail: hasLighterData
        ? `Loaded ${lighterAccounts.length} sub-account${lighterAccounts.length === 1 ? '' : 's'}.`
        : 'Lighter public APIs return account not found for this address.',
    },
  ];

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
              {activeExchanges.length > 0 && (
                <span className="flex items-center text-emerald-500">
                  <Activity className="mr-1 h-3 w-3" />
                  Active on {activeExchanges.join(', ')}
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

      <section className="grid gap-4 md:grid-cols-2 mb-8">
        {exchangeStatuses.map((status) => (
          <div key={status.name} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="font-semibold">{status.name}</h2>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${status.found ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                {status.found ? 'Found' : 'Not Found'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{status.detail}</p>
          </div>
        ))}
      </section>

      {!hasData && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-8 flex items-start gap-3 text-amber-500">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">No Account Data Found</p>
            <p>This address has no positions or balance on Hyperliquid or Lighter.</p>
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
              {balances.length > 0 ? (
                <BalancesTable balances={balances} address={address} />
              ) : (
                <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                  No balances found.
                </div>
              )}
            </section>
          </div>
        </>
      )}

      <section className="mt-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Transaction History</h2>
        <TransactionHistoryTable transactions={allTransactions} address={address} exchangeMeta={exchangeMeta} />
      </section>
    </div>
  );
}
