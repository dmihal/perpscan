import type { VenueMarket, ChartDataPoint } from '../api';

const DYDX_BASE = 'https://indexer.dydx.trade/v4';

export function isDydxAddress(address: string): boolean {
  return /^dydx1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}$/.test(address);
}

export interface DydxSubaccount {
  address: string;
  subaccountNumber: number;
  equity: string;
  freeCollateral: string;
}

export interface DydxPerpetualPosition {
  market: string;
  status: string;
  side: 'LONG' | 'SHORT';
  size: string;
  maxSize: string;
  entryPrice: string;
  exitPrice: string | null;
  unrealizedPnl: string;
  realizedPnl: string;
  createdAt: string;
  closedAt: string | null;
  sumOpen: string;
  sumClose: string;
  netFunding: string;
  subaccountNumber: number;
}

export interface DydxAssetPosition {
  symbol: string;
  side: string;
  size: string;
  assetId: string;
  subaccountNumber: number;
}

export interface DydxFill {
  id: string;
  side: string;
  liquidity: string;
  type: string;
  market: string;
  price: string;
  size: string;
  fee: string;
  createdAt: string;
  createdAtHeight: string;
  orderId: string | null;
  subaccountNumber: number;
}

export interface DydxTransfer {
  id: string;
  sender: { address: string; subaccountNumber: number | null };
  recipient: { address: string; subaccountNumber: number | null };
  size: string;
  createdAt: string;
  createdAtHeight: string;
  symbol: string;
  type: string;
  transactionHash: string;
}

async function dydxFetch<T>(path: string, revalidate = 10): Promise<T | null> {
  try {
    const res = await fetch(`${DYDX_BASE}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    console.error(`dYdX fetch error [${path}]:`, e);
    return null;
  }
}

export async function getDydxMarkets(): Promise<VenueMarket[]> {
  const data = await dydxFetch<{ markets: Record<string, any> }>('/perpetualMarkets', 60);
  if (!data?.markets) return [];

  return Object.values(data.markets)
    .filter((m) => m.status === 'ACTIVE')
    .map((m) => {
      const price = parseFloat(m.oraclePrice || '0');
      const openInterest = parseFloat(m.openInterest || '0') * price;
      const imf = parseFloat(m.initialMarginFraction || '0');
      const maxLeverage = imf > 0 ? 1 / imf : 0;
      return {
        id: `dydx-${m.ticker.toLowerCase().replace('/', '-')}`,
        venue: 'dYdX',
        symbol: m.ticker,
        price,
        volume24h: parseFloat(m.volume24H || '0'),
        openInterest,
        fundingRate: parseFloat(m.nextFundingRate || '0') * 100,
        maxLeverage,
      };
    })
    .sort((a, b) => b.volume24h - a.volume24h);
}

export async function getDydxExchangeStats() {
  const markets = await getDydxMarkets();
  return markets.reduce(
    (acc, m) => {
      acc.total24h += m.volume24h;
      acc.openInterest += m.openInterest;
      return acc;
    },
    { total24h: 0, openInterest: 0, avgSpread: 0, marketCount: markets.length, spreadCount: 0 }
  );
}

export async function getDydxSubaccounts(address: string): Promise<DydxSubaccount[]> {
  const data = await dydxFetch<{ subaccounts: DydxSubaccount[] }>(
    `/addresses/${encodeURIComponent(address)}`
  );
  return data?.subaccounts || [];
}

export async function getDydxPositions(address: string): Promise<DydxPerpetualPosition[]> {
  const data = await dydxFetch<{ positions: DydxPerpetualPosition[] }>(
    `/perpetualPositions/parentSubaccountNumber?address=${encodeURIComponent(address)}&parentSubaccountNumber=0`
  );
  return (data?.positions || []).filter((p) => p.status === 'OPEN');
}

export async function getDydxBalance(address: string): Promise<DydxAssetPosition[]> {
  const data = await dydxFetch<{ positions: DydxAssetPosition[] }>(
    `/assetPositions/parentSubaccountNumber?address=${encodeURIComponent(address)}&parentSubaccountNumber=0`
  );
  return data?.positions || [];
}

export async function getDydxFills(address: string): Promise<DydxFill[]> {
  const data = await dydxFetch<{ fills: DydxFill[] }>(
    `/fills/parentSubaccountNumber?address=${encodeURIComponent(address)}&parentSubaccountNumber=0&limit=100`
  );
  return data?.fills || [];
}

export async function getDydxTransfers(address: string): Promise<DydxTransfer[]> {
  const data = await dydxFetch<{ transfers: DydxTransfer[] }>(
    `/transfers/parentSubaccountNumber?address=${encodeURIComponent(address)}&parentSubaccountNumber=0&limit=100`
  );
  return data?.transfers || [];
}

export async function getDydxCandles(ticker: string, resolution = '1HOUR', limit = 168): Promise<ChartDataPoint[]> {
  const data = await dydxFetch<{ candles: { startedAt: string; close: string }[] }>(
    `/candles/perpetualMarkets/${encodeURIComponent(ticker)}?resolution=${resolution}&limit=${limit}`,
    300
  );
  if (!data?.candles) return [];
  return data.candles.map((c) => ({
    date: new Date(c.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }),
    value: parseFloat(c.close),
  }));
}

export async function getDydxFundingHistory(ticker: string, limit = 168): Promise<ChartDataPoint[]> {
  const data = await dydxFetch<{ historicalFunding: { effectiveAt: string; rate: string }[] }>(
    `/historicalFunding/${encodeURIComponent(ticker)}?limit=${limit}`,
    300
  );
  if (!data?.historicalFunding) return [];
  return data.historicalFunding.map((h) => ({
    date: new Date(h.effectiveAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }),
    value: parseFloat(h.rate) * 100,
  }));
}
