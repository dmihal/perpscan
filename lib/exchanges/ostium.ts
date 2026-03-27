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

interface OstiumTradePair {
  id: string;
  from: string;
  to: string;
}

interface OstiumTrade {
  id: string;
  trader: string;
  pair: OstiumTradePair | null;
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

interface OstiumOrder {
  id: string;
  trader: string;
  pair: OstiumTradePair | null;
  tradeID: string;
  orderType: string;
  orderAction: string;
  price: string;
  priceAfterImpact: string;
  collateral: string;
  notional: string;
  tradeNotional: string;
  leverage: string;
  isBuy: boolean;
  initiatedAt: string;
  executedAt: string | null;
  initiatedTx: string;
  executedTx: string | null;
  isPending: boolean;
  isCancelled: boolean;
  amountSentToTrader: string;
  devFee: string;
  vaultFee: string;
  oracleFee: string;
  liquidationFee: string;
  fundingFee: string;
  rolloverFee: string;
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

export interface OstiumTradeHistoryEntry {
  id: string;
  tradeId: string;
  pairIndex: string;
  pairFrom: string;
  pairTo: string;
  side: string;
  action: string;
  orderType: string;
  size: number;
  collateral: number;
  leverage: number;
  price: number;
  priceAfterImpact: number;
  fees: number;
  pnl: number;
  amountSentToTrader: number;
  timestamp: number;
  txHash: string;
  initiatedTxHash: string;
  executedTxHash: string;
}

function ostiumBigInt(value: string, decimals: number): number {
  if (!value || value === '0') return 0;
  const n = Number(value) / Math.pow(10, decimals);
  return Number.isFinite(n) ? n : 0;
}

function getOstiumPairData(pair: OstiumTrade['pair']) {
  return {
    id: pair?.id || '',
    from: pair?.from || '',
    to: pair?.to || '',
  };
}

function getOstiumOrderPairData(pair: OstiumOrder['pair']) {
  return {
    id: pair?.id || '',
    from: pair?.from || '',
    to: pair?.to || '',
  };
}

function getOstiumTradeLeverage(collateral: number, notional: number, encodedLeverage: string): number {
  if (collateral > 0 && notional > 0) {
    return notional / collateral;
  }
  return ostiumBigInt(encodedLeverage, 3);
}

function calculateOstiumPnl({
  entryPrice,
  exitPrice,
  size,
  isBuy,
  funding,
  rollover,
}: {
  entryPrice: number;
  exitPrice: number;
  size: number;
  isBuy: boolean;
  funding: number;
  rollover: number;
}) {
  if (entryPrice <= 0 || exitPrice <= 0 || size <= 0) return 0;
  const priceChange = (exitPrice - entryPrice) / entryPrice;
  const grossPnl = size * (isBuy ? priceChange : -priceChange);
  return grossPnl - funding - rollover;
}

function getOstiumOrderFees(order: OstiumOrder) {
  return [
    order.devFee,
    order.vaultFee,
    order.oracleFee,
    order.liquidationFee,
    order.fundingFee,
    order.rolloverFee,
  ].reduce((sum, fee) => sum + ostiumBigInt(fee, 6), 0);
}

function mapOstiumOrder(order: OstiumOrder): OstiumTradeHistoryEntry {
  const pair = getOstiumOrderPairData(order.pair);
  const collateral = ostiumBigInt(order.collateral, 6);
  const size = ostiumBigInt(order.notional, 6);
  const amountSentToTrader = ostiumBigInt(order.amountSentToTrader, 6);

  return {
    id: order.id,
    tradeId: order.tradeID,
    pairIndex: pair.id,
    pairFrom: pair.from,
    pairTo: pair.to,
    side: order.isBuy ? 'Long' : 'Short',
    action: order.orderAction,
    orderType: order.orderType,
    size,
    collateral,
    leverage: getOstiumTradeLeverage(collateral, size, order.leverage),
    price: ostiumBigInt(order.price, 18),
    priceAfterImpact: ostiumBigInt(order.priceAfterImpact, 18),
    fees: getOstiumOrderFees(order),
    pnl: amountSentToTrader > 0 ? amountSentToTrader - collateral : 0,
    amountSentToTrader,
    timestamp: Number(order.executedAt || order.initiatedAt) * 1000,
    txHash: order.executedTx || order.initiatedTx,
    initiatedTxHash: order.initiatedTx,
    executedTxHash: order.executedTx || '',
  };
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
        id trader tradeID openPrice closePrice
        takeProfitPrice stopLossPrice collateral notional
        leverage isBuy isOpen funding rollover timestamp
        pair { id from to }
      }
    }`),
    getOstiumPrices(),
  ]);

  if (!tradesData?.trades?.length) return [];

  const priceMap = new Map<string, number>();
  prices.forEach(p => {
    priceMap.set(`${p.from}${p.to}`.toUpperCase(), p.mid);
  });

  return tradesData.trades.map(trade => {
    const pair = getOstiumPairData(trade.pair);
    const pairKey = pair.from && pair.to ? `${pair.from}${pair.to}`.toUpperCase() : '';
    const currentPrice = priceMap.get(pairKey) || 0;
    const entryPrice = ostiumBigInt(trade.openPrice, 18);
    const collateral = ostiumBigInt(trade.collateral, 6);
    const size = ostiumBigInt(trade.notional, 6) || collateral * ostiumBigInt(trade.leverage, 3);
    const leverage = getOstiumTradeLeverage(collateral, size, trade.leverage);
    const funding = ostiumBigInt(trade.funding, 18);
    const rollover = ostiumBigInt(trade.rollover, 18);
    const pnl = calculateOstiumPnl({
      entryPrice,
      exitPrice: currentPrice,
      size,
      isBuy: trade.isBuy,
      funding,
      rollover,
    });

    return {
      id: trade.id,
      pairIndex: pair.id,
      pairFrom: pair.from,
      pairTo: pair.to,
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

export async function getOstiumTradeHistory(address: string): Promise<OstiumTradeHistoryEntry[]> {
  const lowerAddress = address.toLowerCase();
  const ordersData = await ostiumSubgraphQuery<{ orders: OstiumOrder[] }>(`{
    orders(
      where: { trader: "${lowerAddress}", isPending: false, isCancelled: false }
      first: 100
      orderBy: executedAt
      orderDirection: desc
    ) {
      id trader tradeID orderType orderAction
      price priceAfterImpact collateral notional tradeNotional leverage isBuy
      initiatedAt executedAt initiatedTx executedTx isPending isCancelled
      amountSentToTrader devFee vaultFee oracleFee liquidationFee fundingFee rolloverFee
      pair { id from to }
    }
  }`);

  if (!ordersData?.orders?.length) return [];

  return ordersData.orders.map(mapOstiumOrder);
}

export async function getOstiumOrderByTxHash(txHash: string): Promise<OstiumTradeHistoryEntry | null> {
  const normalizedTxHash = txHash.toLowerCase().replace(/[^a-f0-9x]/g, '');
  if (!normalizedTxHash) return null;

  const executedOrderData = await ostiumSubgraphQuery<{ orders: OstiumOrder[] }>(`{
    orders(where: { executedTx: "${normalizedTxHash}" }, first: 1) {
      id trader tradeID orderType orderAction
      price priceAfterImpact collateral notional tradeNotional leverage isBuy
      initiatedAt executedAt initiatedTx executedTx isPending isCancelled
      amountSentToTrader devFee vaultFee oracleFee liquidationFee fundingFee rolloverFee
      pair { id from to }
    }
  }`);

  const executedOrder = executedOrderData?.orders?.[0];
  if (executedOrder) return mapOstiumOrder(executedOrder);

  const initiatedOrderData = await ostiumSubgraphQuery<{ orders: OstiumOrder[] }>(`{
    orders(where: { initiatedTx: "${normalizedTxHash}" }, first: 1) {
      id trader tradeID orderType orderAction
      price priceAfterImpact collateral notional tradeNotional leverage isBuy
      initiatedAt executedAt initiatedTx executedTx isPending isCancelled
      amountSentToTrader devFee vaultFee oracleFee liquidationFee fundingFee rolloverFee
      pair { id from to }
    }
  }`);

  const initiatedOrder = initiatedOrderData?.orders?.[0];
  return initiatedOrder ? mapOstiumOrder(initiatedOrder) : null;
}

export async function getOstiumTradeById(tradeId: string): Promise<OstiumTradeHistoryEntry | null> {
  const normalizedTradeId = tradeId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!normalizedTradeId) return null;

  const ordersData = await ostiumSubgraphQuery<{ orders: OstiumOrder[] }>(`{
    orders(
      where: { tradeID: "${normalizedTradeId}", isPending: false, isCancelled: false }
      first: 10
      orderBy: executedAt
      orderDirection: desc
    ) {
      id trader tradeID orderType orderAction
      price priceAfterImpact collateral notional tradeNotional leverage isBuy
      initiatedAt executedAt initiatedTx executedTx isPending isCancelled
      amountSentToTrader devFee vaultFee oracleFee liquidationFee fundingFee rolloverFee
      pair { id from to }
    }
  }`);

  const order = ordersData?.orders?.[0];
  return order ? mapOstiumOrder(order) : null;
}
