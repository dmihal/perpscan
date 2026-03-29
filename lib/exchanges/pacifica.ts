import { parseNumber } from '../utils';
import type { VenueMarket, ChartDataPoint } from '../api';

const PACIFICA_BASE_URL = 'https://api.pacifica.fi/api/v1';
const PACIFICA_VENUE_NAME = 'Pacifica';

// Solana addresses: base58-encoded, 32-44 characters, no 0x prefix
export function isSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// ── Types ────────────────────────────────────────────────────────────────────

interface PacificaMarketInfo {
  symbol: string;
  tick_size: string;
  min_tick: string;
  max_tick: string;
  lot_size: string;
  max_leverage: number;
  isolated_only: boolean;
  min_order_size: string;
  max_order_size: string;
  funding_rate: string;
  next_funding_rate: string;
  created_at: number;
}

interface PacificaPriceInfo {
  symbol: string;
  funding: string;
  mark: string;
  mid: string;
  next_funding: string;
  open_interest: string;
  oracle: string;
  timestamp: number;
  volume_24h: string;
  yesterday_price: string;
}

interface PacificaBookResponse {
  s: string;
  l: { p: string; a: string; n: number }[][];
  t: number;
}

export interface PacificaAccountInfo {
  balance: string;
  fee_level: number;
  maker_fee: string;
  taker_fee: string;
  account_equity: string;
  available_to_spend: string;
  available_to_withdraw: string;
  pending_balance: string;
  total_margin_used: string;
  cross_mmr: string;
  positions_count: number;
  orders_count: number;
  stop_orders_count: number;
  updated_at: number;
}

export interface PacificaPosition {
  symbol: string;
  side: string;
  amount: string;
  entry_price: string;
  margin: string;
  isolated: boolean;
  created_at: string;
  updated_at: string;
}

export interface PacificaPositionHistory {
  history_id: number;
  order_id: number;
  symbol: string;
  amount: string;
  price: string;
  entry_price: string;
  fee: string;
  pnl: string;
  event_type: string;
  side: string;
  created_at: number;
  cause: string;
}

export interface PacificaBalanceHistory {
  amount: string;
  balance: string;
  pending_balance: string;
  event_type: string;
  created_at: number;
}

export interface PacificaOrderHistory {
  history_id: number;
  order_id: number;
  symbol: string;
  amount: string;
  price: string;
  side: string;
  event_type: string;
  created_at: number;
}

interface PacificaKline {
  t: number;
  T: number;
  s: string;
  i: string;
  o: string;
  c: string;
  h: string;
  l: string;
  v: string;
  n: number;
}

// ── API helpers ──────────────────────────────────────────────────────────────

function unwrap<T>(data: any): T {
  if (data && typeof data === 'object' && 'success' in data) {
    return data.data as T;
  }
  return data as T;
}

async function pacificaFetch<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${PACIFICA_BASE_URL}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    const json = await res.json();
    return unwrap<T>(json);
  } catch (error) {
    console.error(`Pacifica ${path} error:`, error);
    return null;
  }
}

// ── Market data ──────────────────────────────────────────────────────────────

async function getPacificaInfo(): Promise<PacificaMarketInfo[]> {
  const data = await pacificaFetch<PacificaMarketInfo[]>('/info', 60);
  return Array.isArray(data) ? data : [];
}

export async function getPacificaPrices(): Promise<PacificaPriceInfo[]> {
  const data = await pacificaFetch<PacificaPriceInfo[]>('/info/prices', 30);
  return Array.isArray(data) ? data : [];
}

export async function getPacificaMarkets(): Promise<VenueMarket[]> {
  try {
    const [info, prices] = await Promise.all([getPacificaInfo(), getPacificaPrices()]);
    const priceMap = new Map(prices.map(p => [p.symbol, p]));

    return info.map(market => {
      const priceData = priceMap.get(market.symbol);
      const markPrice = parseNumber(priceData?.mark);
      const oi = parseNumber(priceData?.open_interest) * markPrice;

      return {
        id: `pacifica-${market.symbol.toLowerCase()}`,
        venue: PACIFICA_VENUE_NAME,
        symbol: `${market.symbol}-USD`,
        price: markPrice,
        volume24h: parseNumber(priceData?.volume_24h),
        openInterest: oi,
        fundingRate: parseNumber(priceData?.funding) * 100,
        maxLeverage: market.max_leverage,
        onlyIsolated: market.isolated_only,
      };
    });
  } catch (error) {
    console.error('Pacifica markets error:', error);
    return [];
  }
}

export async function getPacificaExchangeStats() {
  const markets = await getPacificaMarkets();
  return markets.reduce(
    (acc, market) => {
      acc.total24h += market.volume24h;
      acc.openInterest += market.openInterest;
      if (market.spread !== undefined) {
        acc.avgSpread += market.spread;
        acc.spreadCount += 1;
      }
      return acc;
    },
    { total24h: 0, openInterest: 0, avgSpread: 0, marketCount: markets.length, spreadCount: 0 }
  );
}

export async function getPacificaSpread(symbol: string): Promise<number> {
  try {
    const data = await pacificaFetch<PacificaBookResponse>(`/book?symbol=${symbol}&limit=1`, 60);
    if (!data?.l || data.l.length < 2) return 0;
    const bestBid = parseNumber(data.l[0]?.[0]?.p);
    const bestAsk = parseNumber(data.l[1]?.[0]?.p);
    const mid = (bestAsk + bestBid) / 2;
    if (bestAsk <= 0 || bestBid <= 0 || mid <= 0) return 0;
    return ((bestAsk - bestBid) / mid) * 100;
  } catch {
    return 0;
  }
}

// ── Account data ─────────────────────────────────────────────────────────────

export async function getPacificaAccount(address: string): Promise<PacificaAccountInfo | null> {
  return pacificaFetch<PacificaAccountInfo>(`/account?account=${address}`, 10);
}

export async function getPacificaPositions(address: string): Promise<PacificaPosition[]> {
  const data = await pacificaFetch<PacificaPosition[]>(`/positions?account=${address}`, 10);
  return Array.isArray(data) ? data : [];
}

export async function getPacificaPositionHistory(address: string): Promise<PacificaPositionHistory[]> {
  const data = await pacificaFetch<PacificaPositionHistory[]>(`/positions/history?account=${address}&limit=100`, 30);
  return Array.isArray(data) ? data : [];
}

export async function getPacificaBalanceHistory(address: string): Promise<PacificaBalanceHistory[]> {
  const data = await pacificaFetch<PacificaBalanceHistory[]>(`/account/balance/history?account=${address}`, 30);
  return Array.isArray(data) ? data : [];
}

export async function getPacificaOrderHistory(address: string): Promise<PacificaOrderHistory[]> {
  const data = await pacificaFetch<PacificaOrderHistory[]>(`/orders/history?account=${address}&limit=100`, 30);
  return Array.isArray(data) ? data : [];
}

// ── Charts ───────────────────────────────────────────────────────────────────

export async function getPacificaCandles(symbol: string, days: number = 30): Promise<ChartDataPoint[]> {
  try {
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const data = await pacificaFetch<PacificaKline[]>(
      `/kline?symbol=${symbol}&interval=1d&start_time=${startTime}`,
      300
    );
    if (!Array.isArray(data)) return [];
    return data.map(k => ({
      date: new Date(k.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: parseFloat(k.c),
    }));
  } catch {
    return [];
  }
}
