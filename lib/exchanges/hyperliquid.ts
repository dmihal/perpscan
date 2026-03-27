import type { ChartDataPoint, VenueMarket } from '../api';

export async function getHyperliquidContexts() {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      next: { revalidate: 60 }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function getHyperliquidSpotMeta() {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "spotMeta" }),
      next: { revalidate: 3600 }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function getHyperliquidMarkets(): Promise<VenueMarket[]> {
  try {
    const [hlData, spotMeta] = await Promise.all([
      getHyperliquidContexts(),
      getHyperliquidSpotMeta()
    ]);
    if (!hlData || !hlData[0] || !hlData[1]) return [];

    const meta = hlData[0].universe;
    const ctxs = hlData[1];

    const spotTokens = new Set<string>();
    if (spotMeta && spotMeta.tokens) {
      spotMeta.tokens.forEach((t: any) => spotTokens.add(t.name));
    }

    const markets: VenueMarket[] = [];

    meta.forEach((m: any, idx: number) => {
      const ctx = ctxs[idx];
      if (ctx) {
        let spread = 0;
        if (ctx.impactPxs && ctx.impactPxs.length === 2 && parseFloat(ctx.midPx) > 0) {
          spread = ((parseFloat(ctx.impactPxs[1]) - parseFloat(ctx.impactPxs[0])) / parseFloat(ctx.midPx)) * 100;
        }

        markets.push({
          id: `hyperliquid-${m.name.toLowerCase()}`,
          venue: 'Hyperliquid',
          symbol: `${m.name}-USD`,
          price: parseFloat(ctx.markPx || "0"),
          volume24h: parseFloat(ctx.dayNtlVlm || "0"),
          openInterest: parseFloat(ctx.openInterest || "0") * parseFloat(ctx.markPx || "0"),
          spread: spread,
          fundingRate: parseFloat(ctx.funding || "0") * 100,
          isHip3: spotTokens.has(m.name),
          onlyIsolated: !!m.onlyIsolated
        });
      }
    });

    return markets;
  } catch (error) {
    console.error('Hyperliquid markets error:', error);
    return [];
  }
}

export async function getHyperliquidAccount(address: string) {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "clearinghouseState", user: address }),
      next: { revalidate: 10 }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

export interface Fill {
  coin: string;
  side: string;
  px: string;
  sz: string;
  time: number;
  fee: string;
  closedPnl: string;
  dir: string;
  hash: string;
  oid: number;
  tid: number;
  feeToken: string;
  crossed: boolean;
}

export async function getHyperliquidFills(address: string, limit: number = 100): Promise<Fill[]> {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "userFills", user: address }),
      next: { revalidate: 30 }
    });
    if (!res.ok) return [];
    const fills: Fill[] = await res.json();
    return fills.slice(0, limit);
  } catch {
    return [];
  }
}

// Ledger update delta types
export type LedgerDelta =
  | { type: 'deposit'; usdc: string }
  | { type: 'withdraw'; usdc: string; nonce: number; fee: string }
  | { type: 'accountClassTransfer'; usdc: string; toPerp: boolean }
  | { type: 'spotTransfer'; token: string; amount: string; usdcValue: string; user: string; destination: string; fee: string; nativeTokenFee: string; nonce: number | null }
  | { type: 'internalTransfer'; usdc: string; user: string; destination: string; fee: string }
  | { type: 'subAccountTransfer'; usdc: string; user: string; destination: string }
  | { type: 'liquidation'; liquidatedNtlPos: string; accountValue: string; leverageType: string; liquidatedPositions: { coin: string; szi: string }[] }
  | { type: 'vaultDeposit'; vault: string; usdc: string }
  | { type: 'vaultWithdraw'; vault: string; user: string; requestedUsd: string; commission: string; closingCost: string; basis: string; netWithdrawnUsd: string }
  | { type: 'cStakingTransfer'; token: string; amount: string; isDeposit: boolean }
  | { type: 'spotGenesis'; token: string; amount: string };

export interface LedgerUpdate {
  time: number;
  hash: string;
  delta: LedgerDelta;
}

export async function getHyperliquidLedgerUpdates(address: string, days: number = 90): Promise<LedgerUpdate[]> {
  try {
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "userNonFundingLedgerUpdates", user: address, startTime }),
      next: { revalidate: 60 }
    });
    if (!res.ok) return [];
    const updates: LedgerUpdate[] = await res.json();
    return updates;
  } catch {
    return [];
  }
}

export async function getHyperliquidCandles(coin: string, interval: string = '1d', days: number = 30): Promise<ChartDataPoint[]> {
  try {
    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60 * 1000;
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "candleSnapshot", req: { coin, interval, startTime, endTime } }),
      next: { revalidate: 300 }
    });
    if (!res.ok) return [];
    const candles: { t: number; c: string }[] = await res.json();
    return candles.map(c => ({
      date: new Date(c.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: parseFloat(c.c),
    }));
  } catch {
    return [];
  }
}

export async function getHyperliquidFundingHistory(coin: string, days: number = 30): Promise<ChartDataPoint[]> {
  try {
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "fundingHistory", coin, startTime }),
      next: { revalidate: 300 }
    });
    if (!res.ok) return [];
    const history: { time: number; coin: string; fundingRate: string }[] = await res.json();
    return history.map(h => ({
      date: new Date(h.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }),
      value: parseFloat(h.fundingRate) * 100,
    }));
  } catch {
    return [];
  }
}
