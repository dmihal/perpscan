import Link from 'next/link';
import { ArrowLeft, Wallet, ExternalLink, Activity, Shield, AlertTriangle } from 'lucide-react';
import { parseNumber, toArray, formatCurrency } from '@/lib/utils';
import { getLeverageFromMarginFraction } from '@/lib/exchanges/lighter';
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
  getOstiumTradeHistory,
  isDydxAddress,
  getDydxSubaccounts,
  getDydxPositions,
  getDydxBalance,
  getDydxFills,
  getDydxTransfers,
  isSolanaAddress,
  getPacificaAccount,
  getPacificaPositions,
  getPacificaPrices,
  getPacificaPositionHistory,
  getPacificaBalanceHistory,
} from '@/lib/api';
import type {
  Fill,
  LedgerUpdate,
  LighterAccount,
  LighterExplorerLog,
  OstiumTradeHistoryEntry,
  DydxSubaccount,
  DydxPerpetualPosition,
  DydxFill,
  DydxTransfer,
  PacificaPosition,
  PacificaPositionHistory,
  PacificaBalanceHistory,
} from '@/lib/api';
import PositionsTable from '@/components/PositionsTable';
import BalancesTable from '@/components/BalancesTable';
import TransactionHistoryTable from '@/components/TransactionHistoryTable';
import DydxPositionsSection from '@/components/DydxPositionsSection';
import type { DydxPositionRow, DydxSubaccountSummary } from '@/components/DydxPositionsSection';

export const revalidate = 10;

function formatOstiumTradeSummary(trade: OstiumTradeHistoryEntry) {
  const market = `${trade.pairFrom}-${trade.pairTo}`;
  return `${trade.action} ${market} @ ${formatCurrency(trade.price)} (${formatCurrency(trade.size)} notional)`;
}

// ────────────────────────────────────────────────────────────────────────────
// Solana (Pacifica) account page
// ────────────────────────────────────────────────────────────────────────────

async function SolanaAccountPage({ address }: { address: string }) {
  const [exchanges, account, rawPositions, prices, positionHistory, balanceHistory] = await Promise.all([
    getTopExchanges(),
    getPacificaAccount(address),
    getPacificaPositions(address),
    getPacificaPrices(),
    getPacificaPositionHistory(address),
    getPacificaBalanceHistory(address),
  ]);

  const priceMap = new Map(prices.map(p => [p.symbol, parseFloat(p.mark || '0')]));
  const hasData = account !== null;

  const equity = parseFloat(account?.account_equity || '0');
  const balance = parseFloat(account?.balance || '0');
  const marginUsed = parseFloat(account?.total_margin_used || '0');
  const unrealizedPnl = equity - balance;
  const marginUsage = equity > 0 ? (marginUsed / equity) * 100 : 0;

  const positions = rawPositions.map((pos, idx) => {
    const markPrice = priceMap.get(pos.symbol) || 0;
    const entryPrice = parseFloat(pos.entry_price || '0');
    const amount = parseFloat(pos.amount || '0');
    const side = pos.side === 'bid' ? 'Long' : 'Short';
    const pnl = side === 'Long'
      ? (markPrice - entryPrice) * amount
      : (entryPrice - markPrice) * amount;
    return {
      id: `pacifica-${idx}`,
      exchange: 'Pacifica',
      market: `${pos.symbol}-USD`,
      side,
      size: Math.abs(amount),
      entryPrice,
      markPrice,
      pnl,
      leverage: entryPrice * amount > 0 ? (entryPrice * Math.abs(amount)) / parseFloat(pos.margin || '1') : 1,
    };
  });

  const balances = hasData
    ? [{ exchange: 'Pacifica', asset: 'USDC', amount: balance }]
    : [];

  const balanceTxs = balanceHistory.map((b) => ({
    hash: `pacifica-balance-${b.created_at}`,
    time: b.created_at,
    type: (b.event_type === 'deposit' ? 'deposit' : b.event_type === 'withdraw' ? 'withdrawal' : 'transfer') as 'deposit' | 'withdrawal' | 'transfer',
    summary: `${b.event_type} ${parseFloat(b.amount).toLocaleString()} USDC`,
    amount: Math.abs(parseFloat(b.amount)),
    exchange: 'Pacifica',
  }));

  const tradeTxs = positionHistory.map((h) => ({
    hash: `pacifica-trade-${h.history_id}`,
    time: h.created_at,
    type: 'trade' as const,
    summary: `${h.side} ${h.symbol} @ ${parseFloat(h.price).toLocaleString()} (${h.amount} units, PnL: ${parseFloat(h.pnl).toFixed(2)})`,
    amount: parseFloat(h.price) * parseFloat(h.amount),
    exchange: 'Pacifica',
  }));

  const allTransactions = [...balanceTxs, ...tradeTxs].sort((a, b) => b.time - a.time);

  const exchangeMeta = {
    Pacifica: {
      name: 'Pacifica',
      href: '/exchanges/pacifica',
      logo: exchanges.find((e) => e.defillamaId === 'pacifica')?.logo,
    },
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
      <Link
        href="/accounts"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
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
                Solana Account
              </span>
              {positions.length > 0 && (
                <span className="flex items-center text-emerald-500">
                  <Activity className="mr-1 h-3 w-3" />
                  Active on Pacifica
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <a
            href={`https://solscan.io/account/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-6"
          >
            View on Solscan
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 mb-8">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="font-semibold">Pacifica</h2>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                hasData ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
              }`}
            >
              {hasData ? 'Found' : 'Not Found'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {hasData
              ? `Account loaded with ${positions.length} open position${positions.length === 1 ? '' : 's'}.`
              : 'No Pacifica account data found for this address.'}
          </p>
        </div>
      </section>

      {!hasData && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-8 flex items-start gap-3 text-amber-500">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">No Account Data Found</p>
            <p>This address has no public positions, balances, or trade history on Pacifica.</p>
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
              <div className="text-3xl font-bold font-mono">{formatCurrency(equity)}</div>
            </div>
            <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">Unrealized PnL</h3>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div
                className={`text-3xl font-bold font-mono ${
                  unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-destructive'
                }`}
              >
                {unrealizedPnl >= 0 ? '+' : ''}
                {formatCurrency(unrealizedPnl)}
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

// ────────────────────────────────────────────────────────────────────────────
// dYdX account page
// ────────────────────────────────────────────────────────────────────────────

async function DydxAccountPage({ address }: { address: string }) {
  const [exchanges, dydxSubaccountsRaw, dydxPositionsRaw, dydxBalanceRaw, dydxFillsRaw, dydxTransfersRaw] =
    await Promise.all([
      getTopExchanges(),
      getDydxSubaccounts(address),
      getDydxPositions(address),
      getDydxBalance(address),
      getDydxFills(address),
      getDydxTransfers(address),
    ]);

  const totalValue = dydxSubaccountsRaw.reduce((sum, s) => sum + parseFloat(s.equity || '0'), 0);
  const freeCollateral = dydxSubaccountsRaw.reduce((sum, s) => sum + parseFloat(s.freeCollateral || '0'), 0);
  const marginUsage = totalValue > 0 ? ((totalValue - freeCollateral) / totalValue) * 100 : 0;
  const unrealizedPnl = dydxPositionsRaw.reduce((sum, p) => sum + parseFloat(p.unrealizedPnl || '0'), 0);

  const positionRows: DydxPositionRow[] = dydxPositionsRaw.map((p, idx) => {
    const entryPrice = parseFloat(p.entryPrice || '0');
    const size = parseFloat(p.size || '0');
    const pnl = parseFloat(p.unrealizedPnl || '0');
    const markPrice =
      size > 0
        ? p.side === 'LONG'
          ? entryPrice + pnl / size
          : entryPrice - pnl / size
        : entryPrice;
    return {
      id: `dydx-${idx}`,
      exchange: 'dYdX',
      market: p.market,
      side: p.side === 'LONG' ? 'Long' : 'Short',
      size: Math.abs(size),
      entryPrice,
      markPrice,
      pnl,
      leverage: 1,
      subaccountNumber: p.subaccountNumber,
    };
  });

  const subaccountSummaries: DydxSubaccountSummary[] = dydxSubaccountsRaw.map((s) => ({
    subaccountNumber: s.subaccountNumber,
    equity: parseFloat(s.equity || '0'),
    freeCollateral: parseFloat(s.freeCollateral || '0'),
  }));

  // USDC balances grouped by subaccount
  const usdcBySubaccount = new Map<number, number>();
  for (const pos of dydxBalanceRaw) {
    if (pos.symbol === 'USDC' || pos.symbol === 'usdc') {
      usdcBySubaccount.set(
        pos.subaccountNumber,
        (usdcBySubaccount.get(pos.subaccountNumber) || 0) + parseFloat(pos.size || '0')
      );
    }
  }
  const balances = Array.from(usdcBySubaccount.entries()).map(([num, amount]) => ({
    exchange: num === 0 ? 'dYdX' : `dYdX (Subaccount ${num})`,
    asset: 'USDC',
    amount,
  }));

  const fillTxs = dydxFillsRaw.map((f: DydxFill) => ({
    hash: `dydx-fill-${f.id}`,
    time: new Date(f.createdAt).getTime(),
    type: 'trade' as const,
    summary: `${f.side} ${f.market} @ ${parseFloat(f.price).toLocaleString()} (${parseFloat(f.size)} units)`,
    amount: parseFloat(f.price) * parseFloat(f.size),
    exchange: 'dYdX',
  }));

  const transferTxs = dydxTransfersRaw.map((t: DydxTransfer) => {
    const isDeposit = t.type === 'DEPOSIT';
    const isWithdrawal = t.type === 'WITHDRAWAL';
    return {
      hash: t.transactionHash || `dydx-transfer-${t.id}`,
      time: new Date(t.createdAt).getTime(),
      type: (isDeposit ? 'deposit' : isWithdrawal ? 'withdrawal' : 'transfer') as
        | 'deposit'
        | 'withdrawal'
        | 'transfer',
      summary: `${t.type} ${parseFloat(t.size).toLocaleString()} ${t.symbol}`,
      amount: parseFloat(t.size),
      exchange: 'dYdX',
    };
  });

  const allTransactions = [...fillTxs, ...transferTxs].sort((a, b) => b.time - a.time);

  const hasDydxData = dydxSubaccountsRaw.length > 0 || positionRows.length > 0;

  const exchangeMeta = {
    dYdX: {
      name: 'dYdX',
      href: '/exchanges/dydx',
      logo: exchanges.find((e) => e.defillamaId === 'dydx')?.logo,
    },
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
      <Link
        href="/accounts"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
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
                dYdX Account
              </span>
              {positionRows.length > 0 && (
                <span className="flex items-center text-emerald-500">
                  <Activity className="mr-1 h-3 w-3" />
                  Active on dYdX
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <a
            href={`https://www.mintscan.io/dydx/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-6"
          >
            View on Mintscan
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 mb-8">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="font-semibold">dYdX</h2>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                hasDydxData ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
              }`}
            >
              {hasDydxData ? 'Found' : 'Not Found'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {hasDydxData
              ? `Loaded ${dydxSubaccountsRaw.length} subaccount${dydxSubaccountsRaw.length === 1 ? '' : 's'} with ${positionRows.length} open position${positionRows.length === 1 ? '' : 's'}.`
              : 'No dYdX account data found for this address.'}
          </p>
        </div>
      </section>

      {!hasDydxData && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-8 flex items-start gap-3 text-amber-500">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">No Account Data Found</p>
            <p>This address has no public positions, balances, or trade history on dYdX.</p>
          </div>
        </div>
      )}

      {hasDydxData && (
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
              <div
                className={`text-3xl font-bold font-mono ${
                  unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-destructive'
                }`}
              >
                {unrealizedPnl >= 0 ? '+' : ''}
                {formatCurrency(unrealizedPnl)}
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
              {positionRows.length > 0 ? (
                <DydxPositionsSection
                  positions={positionRows}
                  subaccounts={subaccountSummaries}
                  address={address}
                />
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

// ────────────────────────────────────────────────────────────────────────────
// EVM account page (existing logic)
// ────────────────────────────────────────────────────────────────────────────

async function EvmAccountPage({ address }: { address: string }) {
  const [exchanges, hlAccount, hlFills, hlContexts, hlLedger, lighterAccounts, lighterAssetPrices, lighterLogs, ostiumPositions, ostiumTradeHistory] = await Promise.all([
    getTopExchanges(),
    getHyperliquidAccount(address),
    getHyperliquidFills(address),
    getHyperliquidContexts(),
    getHyperliquidLedgerUpdates(address),
    getLighterAccounts(address),
    getLighterAssetPriceMap(),
    getLighterLogsForAddress(address),
    getOstiumPositions(address),
    getOstiumTradeHistory(address),
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
  const hasOstiumData = ostiumPositions.length > 0 || ostiumTradeHistory.length > 0;
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
        leverage: getLeverageFromMarginFraction(position.initial_margin_fraction),
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
    totalMarginUsed += ostiumCollateral;

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

    if (ostiumCollateral > 0) {
      balances.push({
        exchange: 'Ostium',
        asset: 'USDC Collateral',
        amount: ostiumCollateral,
      });
    }
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

  const ostiumTxs = ostiumTradeHistory.map((trade) => ({
    hash: trade.txHash,
    time: trade.timestamp,
    type: 'trade' as const,
    summary: formatOstiumTradeSummary(trade),
    amount: trade.size,
    exchange: 'Ostium',
  }));

  const allTransactions = [...fillTxs, ...ledgerTxs, ...lighterTxs, ...ostiumTxs].sort((a, b) => b.time - a.time);
  const marginUsage = totalValue > 0 ? (totalMarginUsed / totalValue) * 100 : 0;
  const activeExchanges = [
    hasHyperliquidData ? 'Hyperliquid' : null,
    hasLighterData ? 'Lighter' : null,
    hasOstiumData ? 'Ostium' : null,
  ].filter((exchange): exchange is string => Boolean(exchange));
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
    Ostium: {
      name: 'Ostium',
      href: '/exchanges/ostium',
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
    {
      name: 'Ostium',
      found: hasOstiumData,
      detail: hasOstiumData
        ? ostiumPositions.length > 0
          ? `Loaded ${ostiumPositions.length} open position${ostiumPositions.length === 1 ? '' : 's'} and ${ostiumTradeHistory.length} historical trade${ostiumTradeHistory.length === 1 ? '' : 's'}.`
          : `No open positions, but loaded ${ostiumTradeHistory.length} historical trade${ostiumTradeHistory.length === 1 ? '' : 's'}.`
        : 'No Ostium positions or trade history found for this address.',
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
            <p>This address has no public positions, balances, or trade history on Hyperliquid, Lighter, or Ostium.</p>
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

// ────────────────────────────────────────────────────────────────────────────
// Route entry point
// ────────────────────────────────────────────────────────────────────────────

export default async function AccountPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (isDydxAddress(address)) {
    return <DydxAccountPage address={address} />;
  }
  if (isSolanaAddress(address)) {
    return <SolanaAccountPage address={address} />;
  }
  return <EvmAccountPage address={address} />;
}
