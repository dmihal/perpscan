import { VenueMarket } from '../api';

const OSTIUM_REST_URL = 'https://metadata-backend.ostium.io';
const OSTIUM_SUBGRAPH_URL = 'https://api.subgraph.ormilabs.com/api/public/67a599d5-c8d2-4cc4-9c4d-2975a97bc5d8/subgraphs/ost-prod/live/gn';
const OSTIUM_VENUE_NAME = 'Ostium';

interface OstiumPair {
  id: string;
  from: string;
  to: string;
  group: { id: string; name: string; minLeverage: string; maxLeverage: string } | null;
  spreadP: string;
  longOI: string;
  shortOI: string;
  maxOI: string;
  maxLeverage: string;
  curFundingLong: string;
  curFundingShort: string;
  lastFundingRate: string;
  makerFeeP: string;
  takerFeeP: string;
  volume: string;
  totalOpenTrades: string;
}

interface OstiumPrice {
  feed_id: string;
  bid: number;
  mid: number;
  ask: number;
  isMarketOpen: boolean;
  isDayTradingClosed: boolean;
  from: string;
  to: string;
  timestampSeconds: number;
}

interface OstiumTrade {
  id: string;
  trader: string;
  pair: string;
  tradeID: string;
  openPrice: string;
  closePrice: string;
  takeProfitPrice: string;
  stopLossPrice: string;
  collateral: string;
  notional: string;
  leverage: string;
  isBuy: boolean;
  isOpen: boolean;
  funding: string;
  rollover: string;
  timestamp: string;
}

export interface OstiumPosition {
  id: string;
  pairIndex: string;
  pairFrom: string;
  pairTo: string;
  side: string;
  size: number;
  collateral: number;
  leverage: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  funding: number;
  rollover: number;
  isOpen: boolean;
}

function ostiumBigInt(value: string, decimals: number): number {
  if (!value || value === '0') return 0;
  const n = Number(value) / Math.pow(10, decimals);
  return Number.isFinite(n) ? n : 0;
}

async function ostiumSubgraphQuery<T>(query: string): Promise<T | null> {
  try {
    const res = await fetch(OSTIUM_SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (error) {
    console.error('Ostium subgraph error:', error);
    return null;
  }
}

async function getOstiumPairs(): Promise<OstiumPair[]> {
  const data = await ostiumSubgraphQuery<{ pairs: OstiumPair[] }>(`{
    pairs(first: 100) {
      id from to
      group { id name minLeverage maxLeverage }
      spreadP longOI shortOI maxOI maxLeverage
      curFundingLong curFundingShort lastFundingRate
      makerFeeP takerFeeP volume totalOpenTrades
    }
  }`);
  return data?.pairs || [];
}

async function getOstiumPrices(): Promise<OstiumPrice[]> {
  try {
    const res = await fetch(`${OSTIUM_REST_URL}/PricePublish/latest-prices`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Ostium prices error:', error);
    return [];
  }
}

async function getArbitrumBlockFromTimestamp(timestamp: number): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.arbiscan.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === '1' && data.result) {
      return parseInt(data.result, 10);
    }
    return null;
  } catch {
    return null;
  }
}

async function getOstiumPairsAtBlock(blockNumber: number): Promise<OstiumPair[]> {
  const data = await ostiumSubgraphQuery<{ pairs: OstiumPair[] }>(`{
    pairs(first: 100, block: { number: ${blockNumber} }) {
      id from to volume
      group { id name minLeverage maxLeverage }
      spreadP longOI shortOI maxOI maxLeverage
      curFundingLong curFundingShort lastFundingRate
      makerFeeP takerFeeP totalOpenTrades
    }
  }`);
  return data?.pairs || [];
}

async function getOstium24hVolumes(): Promise<Map<string, number>> {
  const volumeMap = new Map<string, number>();
  try {
    const timestamp24hAgo = Math.floor(Date.now() / 1000) - 86400;
    const blockNumber = await getArbitrumBlockFromTimestamp(timestamp24hAgo);
    if (!blockNumber) return volumeMap;

    const historicalPairs = await getOstiumPairsAtBlock(blockNumber);
    const historicalVolumeMap = new Map<string, number>();
    historicalPairs.forEach(pair => {
      historicalVolumeMap.set(pair.id, ostiumBigInt(pair.volume, 6));
    });

    return historicalVolumeMap;
  } catch (error) {
    console.error('Ostium 24h volume error:', error);
    return volumeMap;
  }
}

export async function getOstiumMarkets(): Promise<VenueMarket[]> {
  try {
    const [pairs, prices, historicalVolumes] = await Promise.all([
      getOstiumPairs(),
      getOstiumPrices(),
      getOstium24hVolumes(),
    ]);

    const priceMap = new Map<string, OstiumPrice>();
    prices.forEach(p => {
      const key = `${p.from}${p.to}`.toUpperCase();
      priceMap.set(key, p);
    });

    return pairs.map(pair => {
      const pairKey = `${pair.from}${pair.to}`.toUpperCase();
      const priceData = priceMap.get(pairKey);
      const price = priceData?.mid || 0;
      const symbol = `${pair.from}-${pair.to}`;

      const longOI = ostiumBigInt(pair.longOI, 18);
      const shortOI = ostiumBigInt(pair.shortOI, 18);
      const openInterest = (longOI + shortOI) * price;

      const cumulativeVolume = ostiumBigInt(pair.volume, 6);
      const historicalVolume = historicalVolumes.get(pair.id) ?? cumulativeVolume;
      const volume24h = Math.max(cumulativeVolume - historicalVolume, 0);

      // Funding rate from subgraph is often 0; accFunding has data but it's accumulated
      const fundingRate = ostiumBigInt(pair.lastFundingRate, 18) * 100;

      // Spread from bid/ask if available, spreadP in subgraph is typically 0
      const spread = priceData && priceData.bid > 0 && priceData.ask > 0
        ? ((priceData.ask - priceData.bid) / priceData.mid) * 100
        : 0;

      // Leverage lives on the group, not the pair — divide by 100 (10000 = 100x)
      const maxLeverage = pair.group ? Number(pair.group.maxLeverage) / 100 : 0;

      // Fees: divide by 1e7 gives percentage (100000 = 0.01%, 50000 = 0.005%)
      const makerFee = ostiumBigInt(pair.makerFeeP, 7);
      const takerFee = ostiumBigInt(pair.takerFeeP, 7);

      const isMarketOpen = priceData?.isMarketOpen ?? true;

      return {
        id: `ostium-${pair.id}-${pair.from.toLowerCase()}`,
        venue: OSTIUM_VENUE_NAME,
        symbol,
        price,
        volume24h,
        openInterest,
        spread: Math.abs(spread),
        fundingRate,
        maxLeverage,
        makerFee,
        takerFee,
        tradingHours: isMarketOpen ? '' : 'Closed',
        marketId: parseInt(pair.id, 10) || 0,
      };
    });
  } catch (error) {
    console.error('Ostium markets error:', error);
    return [];
  }
}

export async function getOstiumExchangeStats() {
  const markets = await getOstiumMarkets();
  return markets.reduce(
    (acc, market) => {
      acc.total24h += market.volume24h;
      acc.openInterest += market.openInterest;
      acc.avgSpread += market.spread;
      return acc;
    },
    { total24h: 0, openInterest: 0, avgSpread: 0, marketCount: markets.length }
  );
}

export async function getOstiumPositions(address: string): Promise<OstiumPosition[]> {
  const lowerAddress = address.toLowerCase();
  const [tradesData, prices] = await Promise.all([
    ostiumSubgraphQuery<{ trades: OstiumTrade[] }>(`{
      trades(where: { trader: "${lowerAddress}", isOpen: true }, first: 100) {
        id trader pair tradeID openPrice closePrice
        takeProfitPrice stopLossPrice collateral notional
        leverage isBuy isOpen funding rollover timestamp
      }
    }`),
    getOstiumPrices(),
  ]);

  if (!tradesData?.trades?.length) return [];

  const pairs = await getOstiumPairs();
  const pairMap = new Map<string, OstiumPair>();
  pairs.forEach(p => pairMap.set(p.id, p));

  const priceMap = new Map<string, number>();
  prices.forEach(p => {
    priceMap.set(`${p.from}${p.to}`.toUpperCase(), p.mid);
  });

  return tradesData.trades.map(trade => {
    const pair = pairMap.get(trade.pair);
    const pairKey = pair ? `${pair.from}${pair.to}`.toUpperCase() : '';
    const currentPrice = priceMap.get(pairKey) || 0;
    const entryPrice = ostiumBigInt(trade.openPrice, 18);
    const collateral = ostiumBigInt(trade.collateral, 6);
    const leverage = ostiumBigInt(trade.leverage, 3);
    const size = collateral * leverage;
    const funding = ostiumBigInt(trade.funding, 6);
    const rollover = ostiumBigInt(trade.rollover, 6);

    let pnl = 0;
    if (entryPrice > 0 && currentPrice > 0) {
      const priceChange = (currentPrice - entryPrice) / entryPrice;
      pnl = size * (trade.isBuy ? priceChange : -priceChange) - funding - rollover;
    }

    return {
      id: trade.id,
      pairIndex: trade.pair,
      pairFrom: pair?.from || '',
      pairTo: pair?.to || '',
      side: trade.isBuy ? 'Long' : 'Short',
      size,
      collateral,
      leverage,
      entryPrice,
      currentPrice,
      pnl,
      funding,
      rollover,
      isOpen: trade.isOpen,
    };
  });
}
