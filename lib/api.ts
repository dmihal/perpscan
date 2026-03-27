export interface Protocol {
  defillamaId: string;
  name: string;
  displayName: string;
  module: string;
  category: string;
  logo: string;
  chains: string[];
  total24h: number;
  total7d: number;
  total30d: number;
  totalAllTime: number;
  openInterest?: number;
  avgSpread?: number;
}

export interface Market {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  avgSpread?: number;
}

export interface VenueMarket {
  id: string;
  venue: string;
  symbol: string;
  price: number;
  volume24h: number;
  openInterest: number;
  spread: number;
  fundingRate: number;
  marketId?: number;
  maxLeverage?: number;
  makerFee?: number;
  takerFee?: number;
  tradingHours?: string;
  reduceOnly?: boolean;
  fundingIntervalHours?: number;
  isHip3?: boolean;
  onlyIsolated?: boolean;
}

const LIGHTER_BASE_URL = 'https://mainnet.zklighter.elliot.ai/api/v1';
const LIGHTER_VENUE_NAME = 'Lighter';
const OSTIUM_REST_URL = 'https://metadata-backend.ostium.io';
const OSTIUM_SUBGRAPH_URL = 'https://api.subgraph.ormilabs.com/api/public/67a599d5-c8d2-4cc4-9c4d-2975a97bc5d8/subgraphs/ost-prod/live/gn';
const OSTIUM_VENUE_NAME = 'Ostium';
const KECCAK_64_MASK = (BigInt(1) << BigInt(64)) - BigInt(1);
const KECCAK_RATE_BYTES = 136;
const KECCAK_ROUND_CONSTANTS = [
  BigInt('0x0000000000000001'),
  BigInt('0x0000000000008082'),
  BigInt('0x800000000000808a'),
  BigInt('0x8000000080008000'),
  BigInt('0x000000000000808b'),
  BigInt('0x0000000080000001'),
  BigInt('0x8000000080008081'),
  BigInt('0x8000000000008009'),
  BigInt('0x000000000000008a'),
  BigInt('0x0000000000000088'),
  BigInt('0x0000000080008009'),
  BigInt('0x000000008000000a'),
  BigInt('0x000000008000808b'),
  BigInt('0x800000000000008b'),
  BigInt('0x8000000000008089'),
  BigInt('0x8000000000008003'),
  BigInt('0x8000000000008002'),
  BigInt('0x8000000000000080'),
  BigInt('0x000000000000800a'),
  BigInt('0x800000008000000a'),
  BigInt('0x8000000080008081'),
  BigInt('0x8000000000008080'),
  BigInt('0x0000000080000001'),
  BigInt('0x8000000080008008'),
] as const;
const KECCAK_ROTATION_OFFSETS = [
  0, 1, 62, 28, 27,
  36, 44, 6, 55, 20,
  3, 10, 43, 25, 39,
  41, 45, 15, 21, 8,
  18, 2, 61, 56, 14,
] as const;

interface LighterMarketConfig {
  trading_hours?: string;
  force_reduce_only?: boolean;
}

interface LighterOrderBookDetail {
  symbol: string;
  market_id: number;
  status?: string;
  last_trade_price?: string | number;
  daily_quote_token_volume?: string | number;
  daily_price_change?: string | number;
  open_interest?: string | number;
  default_initial_margin_fraction?: string | number;
  maker_fee?: string | number;
  taker_fee?: string | number;
  market_config?: LighterMarketConfig;
}

interface LighterFundingRate {
  market_id: number;
  symbol: string;
  rate?: string | number;
}

interface LighterOrderBookOrder {
  price?: string;
}

interface LighterOrderBookOrders {
  asks?: LighterOrderBookOrder[];
  bids?: LighterOrderBookOrder[];
}

export interface LighterSubAccount {
  index: number;
  l1_address: string;
  collateral?: string;
  account_type?: number;
}

export interface LighterAccountAsset {
  symbol: string;
  asset_id: number;
  balance: string;
  locked_balance?: string;
}

export interface LighterAccountPosition {
  market_id: number;
  symbol: string;
  initial_margin_fraction?: string;
  sign: number;
  position: string;
  avg_entry_price: string;
  position_value: string;
  unrealized_pnl: string;
  realized_pnl: string;
  liquidation_price?: string;
  margin_mode?: number;
}

export interface LighterAccount {
  index: number;
  l1_address: string;
  available_balance?: string;
  collateral?: string;
  total_asset_value?: string;
  positions?: LighterAccountPosition[] | Record<string, LighterAccountPosition>;
  assets?: LighterAccountAsset[] | Record<string, LighterAccountAsset>;
}

interface LighterL1DepositPubdata {
  account_index: string;
  l1_address: string;
  asset_index: string;
  route_type: string;
  accepted_amount: string;
}

interface LighterL2TransferPubdata {
  from_account_index: string;
  to_account_index: string;
  fee_account_index: string;
  asset_index: string;
  from_route_type: string;
  to_route_type: string;
  amount: string;
  usdc_fee: string;
}

export interface LighterExplorerLog {
  tx_type: string;
  hash: string;
  time: string;
  pubdata?: {
    l1_deposit_pubdata_v2?: LighterL1DepositPubdata;
    l2_transfer_pubdata_v2?: LighterL2TransferPubdata;
  };
  pubdata_type?: string;
  block_number?: number;
  batch_number?: number;
  status?: string;
}

interface LighterAssetDetail {
  symbol: string;
  asset_id?: number;
  asset_index?: number;
  index_price?: string | number;
  price?: string | number;
  oracle_price?: string | number;
  last_trade_price?: string | number;
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function rotateLeft64(value: bigint, shift: number): bigint {
  if (shift === 0) return value & KECCAK_64_MASK;
  const offset = BigInt(shift);
  return ((value << offset) | (value >> (BigInt(64) - offset))) & KECCAK_64_MASK;
}

function keccakF1600(state: bigint[]): void {
  for (const roundConstant of KECCAK_ROUND_CONSTANTS) {
    const c = new Array<bigint>(5).fill(BigInt(0));
    for (let x = 0; x < 5; x++) {
      c[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
    }

    const d = new Array<bigint>(5).fill(BigInt(0));
    for (let x = 0; x < 5; x++) {
      d[x] = c[(x + 4) % 5] ^ rotateLeft64(c[(x + 1) % 5], 1);
    }

    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        state[x + 5 * y] = (state[x + 5 * y] ^ d[x]) & KECCAK_64_MASK;
      }
    }

    const b = new Array<bigint>(25).fill(BigInt(0));
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const index = x + 5 * y;
        const targetX = y;
        const targetY = (2 * x + 3 * y) % 5;
        b[targetX + 5 * targetY] = rotateLeft64(state[index], KECCAK_ROTATION_OFFSETS[index]);
      }
    }

    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const index = x + 5 * y;
        const b1 = b[((x + 1) % 5) + 5 * y];
        const b2 = b[((x + 2) % 5) + 5 * y];
        state[index] = (b[index] ^ ((~b1 & KECCAK_64_MASK) & b2)) & KECCAK_64_MASK;
      }
    }

    state[0] = (state[0] ^ roundConstant) & KECCAK_64_MASK;
  }
}

function keccak256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const state = new Array<bigint>(25).fill(BigInt(0));

  for (let offset = 0; offset < bytes.length; offset += KECCAK_RATE_BYTES) {
    const block = bytes.subarray(offset, offset + KECCAK_RATE_BYTES);
    for (let i = 0; i < block.length; i++) {
      const lane = Math.floor(i / 8);
      const shift = BigInt((i % 8) * 8);
      state[lane] ^= BigInt(block[i]) << shift;
    }

    if (block.length === KECCAK_RATE_BYTES) {
      keccakF1600(state);
    } else {
      const lane = Math.floor(block.length / 8);
      const shift = BigInt((block.length % 8) * 8);
      state[lane] ^= BigInt(0x01) << shift;

      const finalLane = Math.floor((KECCAK_RATE_BYTES - 1) / 8);
      const finalShift = BigInt(((KECCAK_RATE_BYTES - 1) % 8) * 8);
      state[finalLane] ^= BigInt(0x80) << finalShift;
      keccakF1600(state);
      break;
    }
  }

  let hex = '';
  for (let i = 0; i < 32; i++) {
    const lane = Math.floor(i / 8);
    const shift = BigInt((i % 8) * 8);
    const byte = Number((state[lane] >> shift) & BigInt(0xff));
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

function toLighterL1Address(address: string): string {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return address;
  const normalized = address.slice(2).toLowerCase();
  const hash = keccak256Hex(normalized);
  let checksummed = '0x';

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (/[0-9]/.test(char)) {
      checksummed += char;
      continue;
    }
    checksummed += parseInt(hash[i], 16) >= 8 ? char.toUpperCase() : char;
  }

  return checksummed;
}

function toArray<T>(value: T[] | Record<string, T> | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : Object.values(value);
}

function normalizeLighterSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  if (normalized.includes('-')) return normalized;
  if (normalized.endsWith('USD')) return normalized;
  return `${normalized}-USD`;
}

function getBaseMarketSymbol(symbol: string): string {
  const normalized = normalizeLighterSymbol(symbol);
  return normalized.endsWith('-USD') ? normalized.slice(0, -4) : normalized;
}

function getLeverageFromMarginFraction(value: string | number | undefined): number {
  const marginFraction = parseNumber(value);
  if (marginFraction <= 0) return 1;
  const leverage = marginFraction > 1 ? 100 / marginFraction : 1 / marginFraction;
  return Number.isFinite(leverage) && leverage > 0 ? leverage : 1;
}

async function getLighterOrderBookDetails(): Promise<LighterOrderBookDetail[]> {
  try {
    const res = await fetch(`${LIGHTER_BASE_URL}/orderBookDetails`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.order_books)) return data.order_books;
    if (Array.isArray(data.orderBooks)) return data.orderBooks;
    return [];
  } catch (error) {
    console.error('Lighter orderBookDetails error:', error);
    return [];
  }
}

async function getLighterFundingRates(): Promise<LighterFundingRate[]> {
  try {
    const res = await fetch(`${LIGHTER_BASE_URL}/funding-rates`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    return [];
  } catch (error) {
    console.error('Lighter funding-rates error:', error);
    return [];
  }
}

async function getLighterAssetDetails(): Promise<LighterAssetDetail[]> {
  try {
    const res = await fetch(`${LIGHTER_BASE_URL}/assetDetails`, {
      next: { revalidate: 300 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.assets)) return data.assets;
    return [];
  } catch (error) {
    console.error('Lighter assetDetails error:', error);
    return [];
  }
}

export async function getLighterAccountLogs(accountKey: string | number, limit: number = 100): Promise<LighterExplorerLog[]> {
  try {
    const params = new URLSearchParams({ limit: limit.toString() });
    const res = await fetch(`https://explorer.elliot.ai/api/accounts/${accountKey}/logs?${params.toString()}`, {
      next: { revalidate: 30 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Lighter explorer account logs error:', error);
    return [];
  }
}

export async function getLighterLog(hash: string): Promise<LighterExplorerLog | null> {
  try {
    const res = await fetch(`https://explorer.elliot.ai/api/logs/${hash}`, {
      next: { revalidate: 30 }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.hash ? data : null;
  } catch (error) {
    console.error('Lighter explorer log error:', error);
    return null;
  }
}

export async function getLighterMarketSpread(marketId: number): Promise<number> {
  try {
    const params = new URLSearchParams({
      market_id: marketId.toString(),
      limit: '1',
    });
    const res = await fetch(`${LIGHTER_BASE_URL}/orderBookOrders?${params.toString()}`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return 0;
    const data: LighterOrderBookOrders = await res.json();
    const bestAsk = parseNumber(data.asks?.[0]?.price);
    const bestBid = parseNumber(data.bids?.[0]?.price);
    const mid = (bestAsk + bestBid) / 2;
    if (bestAsk <= 0 || bestBid <= 0 || mid <= 0) return 0;
    return ((bestAsk - bestBid) / mid) * 100;
  } catch (error) {
    console.error('Lighter orderBookOrders error:', error);
    return 0;
  }
}

async function getLighterExchangeStats() {
  const markets = await getLighterMarkets();
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

export async function getLighterSubAccounts(address: string): Promise<LighterSubAccount[]> {
  try {
    const params = new URLSearchParams({ l1_address: toLighterL1Address(address) });
    const res = await fetch(`${LIGHTER_BASE_URL}/accountsByL1Address?${params.toString()}`, {
      next: { revalidate: 10 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data?.code === 21100) return [];
    return Array.isArray(data?.sub_accounts) ? data.sub_accounts : [];
  } catch (error) {
    console.error('Lighter accountsByL1Address error:', error);
    return [];
  }
}

async function getLighterAccountByIndex(index: number): Promise<LighterAccount | null> {
  try {
    const params = new URLSearchParams({ by: 'index', value: index.toString() });
    const res = await fetch(`${LIGHTER_BASE_URL}/account?${params.toString()}`, {
      next: { revalidate: 10 }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.index !== undefined) return data;
    if (Array.isArray(data?.accounts) && data.accounts[0]?.index !== undefined) return data.accounts[0];
    return null;
  } catch (error) {
    console.error('Lighter account error:', error);
    return null;
  }
}

export async function getLighterAccounts(address: string): Promise<LighterAccount[]> {
  const subAccounts = await getLighterSubAccounts(address);
  if (subAccounts.length === 0) return [];

  const accounts = await Promise.all(
    subAccounts.map(subAccount => getLighterAccountByIndex(subAccount.index))
  );

  return accounts.filter((account): account is LighterAccount => account !== null);
}

export async function getLighterLogsForAddress(address: string, limit: number = 100): Promise<LighterExplorerLog[]> {
  const subAccounts = await getLighterSubAccounts(address);
  if (subAccounts.length === 0) return [];

  const logsByAccount = await Promise.all(
    subAccounts.map((subAccount) => getLighterAccountLogs(subAccount.index, limit))
  );

  const uniqueLogs = new Map<string, LighterExplorerLog>();
  logsByAccount.flat().forEach((log) => {
    if (!uniqueLogs.has(log.hash)) uniqueLogs.set(log.hash, log);
  });

  return Array.from(uniqueLogs.values()).sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );
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

async function getHyperliquidMarkets(): Promise<VenueMarket[]> {
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

async function getParadexMarkets(): Promise<VenueMarket[]> {
  try {
    const res = await fetch('https://api.prod.paradex.trade/v1/markets/summary?market=ALL', {
      next: { revalidate: 60 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results: any[] = data.results || [];

    return results.map((m: any) => {
      const markPrice = parseFloat(m.mark_price || "0");
      const bid = parseFloat(m.bid || "0");
      const ask = parseFloat(m.ask || "0");
      const spread = markPrice > 0 ? ((ask - bid) / markPrice) * 100 : 0;
      const coin = m.symbol.replace('-USD-PERP', '');

      return {
        id: `paradex-${coin.toLowerCase()}`,
        venue: 'Paradex',
        symbol: `${coin}-USD`,
        price: markPrice,
        volume24h: parseFloat(m.volume_24h || "0"),
        openInterest: parseFloat(m.open_interest || "0") * markPrice,
        spread: Math.abs(spread),
        fundingRate: parseFloat(m.funding_rate || "0") * 100,
      };
    });
  } catch (error) {
    console.error('Paradex markets error:', error);
    return [];
  }
}

async function getLighterMarkets(): Promise<VenueMarket[]> {
  try {
    const [details, fundingRates] = await Promise.all([
      getLighterOrderBookDetails(),
      getLighterFundingRates(),
    ]);

    const fundingByMarketId = new Map<number, number>();
    fundingRates.forEach(rate => {
      fundingByMarketId.set(rate.market_id, parseNumber(rate.rate) * 100);
    });

    return details
      .filter(market => !market.status || market.status === 'active')
      .map((market) => {
        const symbol = normalizeLighterSymbol(market.symbol);
        const baseSymbol = getBaseMarketSymbol(symbol);
        const price = parseNumber(market.last_trade_price);
        const openInterestBase = parseNumber(market.open_interest);
        const defaultInitialMarginFraction = parseNumber(market.default_initial_margin_fraction);

        return {
          id: `lighter-${market.market_id}-${baseSymbol.toLowerCase()}`,
          marketId: market.market_id,
          venue: LIGHTER_VENUE_NAME,
          symbol,
          price,
          volume24h: parseNumber(market.daily_quote_token_volume),
          openInterest: openInterestBase * price,
          spread: 0,
          fundingRate: fundingByMarketId.get(market.market_id) ?? 0,
          maxLeverage: getLeverageFromMarginFraction(defaultInitialMarginFraction),
          makerFee: parseNumber(market.maker_fee),
          takerFee: parseNumber(market.taker_fee),
          tradingHours: market.market_config?.trading_hours || '',
          reduceOnly: !!market.market_config?.force_reduce_only,
          fundingIntervalHours: 1,
        };
      });
  } catch (error) {
    console.error('Lighter markets error:', error);
    return [];
  }
}

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

async function getOstiumMarkets(): Promise<VenueMarket[]> {
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

async function getOstiumExchangeStats() {
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

export async function getParadexCandles(coin: string, days: number = 30): Promise<ChartDataPoint[]> {
  try {
    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60 * 1000;
    const res = await fetch(
      `https://api.prod.paradex.trade/v1/markets/klines?symbol=${coin}-USD-PERP&resolution=60&start_at=${startTime}&end_at=${endTime}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const candles: number[][] = data.results || [];
    // Take daily samples (every 24 entries for hourly candles)
    return candles.filter((_, i) => i % 24 === 0).map(c => ({
      date: new Date(c[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: c[4], // close price
    }));
  } catch {
    return [];
  }
}

export async function getAllVenueMarkets(): Promise<VenueMarket[]> {
  try {
    const [hlMarkets, paradexMarkets, lighterMarkets, ostiumMarkets] = await Promise.all([
      getHyperliquidMarkets(),
      getParadexMarkets(),
      getLighterMarkets(),
      getOstiumMarkets(),
    ]);

    const markets = [...hlMarkets, ...paradexMarkets, ...lighterMarkets, ...ostiumMarkets];
    return markets.sort((a, b) => b.volume24h - a.volume24h);
  } catch (error) {
    console.error(error);
    return [];
  }
}

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

export async function getTopExchanges(): Promise<Protocol[]> {
  try {
    const [res, hlData, lighterStats, ostiumStats] = await Promise.all([
      fetch('https://api.llama.fi/overview/derivatives?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume', {
        next: { revalidate: 3600 }
      }),
      getHyperliquidContexts(),
      getLighterExchangeStats(),
      getOstiumExchangeStats(),
    ]);
    
    if (!res.ok) throw new Error('Failed to fetch exchanges');
    const data = await res.json();
    
    let hlVolume = 0;
    let hlOI = 0;
    let hlSpreadSum = 0;
    let hlSpreadCount = 0;

    if (hlData && hlData[0] && hlData[1]) {
      const ctxs = hlData[1];
      ctxs.forEach((ctx: any) => {
        hlVolume += parseFloat(ctx.dayNtlVlm || "0");
        hlOI += parseFloat(ctx.openInterest || "0") * parseFloat(ctx.markPx || "0");
        if (ctx.impactPxs && ctx.impactPxs.length === 2 && parseFloat(ctx.midPx) > 0) {
           const spread = (parseFloat(ctx.impactPxs[1]) - parseFloat(ctx.impactPxs[0])) / parseFloat(ctx.midPx);
           hlSpreadSum += spread;
           hlSpreadCount++;
        }
      });
    }
    
    // Filter out non-exchanges or sort by volume
    const protocols: Protocol[] = data.protocols || [];
    const sortedProtocols = [...protocols].sort((a, b) => (b.total24h || 0) - (a.total24h || 0));
    const selectedProtocols = sortedProtocols.slice(0, 10);
    const lighterProtocol = protocols.find(
      p => p.name.toLowerCase() === 'lighter' || p.defillamaId?.toLowerCase() === 'lighter'
    );

    if (lighterProtocol && !selectedProtocols.some(p => p.name.toLowerCase() === 'lighter' || p.defillamaId?.toLowerCase() === 'lighter')) {
      selectedProtocols.push(lighterProtocol);
    }

    if (!lighterProtocol && lighterStats.marketCount > 0) {
      selectedProtocols.push({
        defillamaId: 'lighter',
        name: LIGHTER_VENUE_NAME,
        displayName: LIGHTER_VENUE_NAME,
        module: 'lighter',
        category: 'Derivatives',
        logo: '',
        chains: ['Ethereum'],
        total24h: lighterStats.total24h,
        total7d: 0,
        total30d: 0,
        totalAllTime: 0,
      });
    }

    const ostiumProtocol = protocols.find(
      p => p.name.toLowerCase() === 'ostium' || p.defillamaId?.toLowerCase() === 'ostium'
    );

    if (ostiumProtocol && !selectedProtocols.some(p => p.name.toLowerCase() === 'ostium' || p.defillamaId?.toLowerCase() === 'ostium')) {
      selectedProtocols.push(ostiumProtocol);
    }

    if (!ostiumProtocol && ostiumStats.marketCount > 0) {
      selectedProtocols.push({
        defillamaId: 'ostium',
        name: OSTIUM_VENUE_NAME,
        displayName: OSTIUM_VENUE_NAME,
        module: 'ostium',
        category: 'Derivatives',
        logo: '',
        chains: ['Arbitrum'],
        total24h: ostiumStats.total24h,
        total7d: 0,
        total30d: 0,
        totalAllTime: 0,
      });
    }

    return selectedProtocols
      .map(p => {
        const isHL = p.name.toLowerCase() === 'hyperliquid' || p.defillamaId === 'hyperliquid' || p.defillamaId === '5507';
        const isLighter = p.name.toLowerCase() === 'lighter' || p.defillamaId?.toLowerCase() === 'lighter';
        if (isHL) {
          return {
            ...p,
            defillamaId: 'hyperliquid', // Force consistent ID
            total24h: (hlData && hlVolume > 0) ? hlVolume : p.total24h,
            openInterest: hlData ? hlOI : (p.total24h || 0) * (0.2 + Math.random() * 0.8),
            avgSpread: (hlData && hlSpreadCount > 0) ? (hlSpreadSum / hlSpreadCount) * 100 : 0.02
          };
        }
        if (isLighter) {
          return {
            ...p,
            defillamaId: 'lighter',
            name: LIGHTER_VENUE_NAME,
            displayName: LIGHTER_VENUE_NAME,
            module: p.module || 'lighter',
            category: p.category || 'Derivatives',
            chains: p.chains?.length ? p.chains : ['Ethereum'],
            total24h: lighterStats.total24h || p.total24h,
            total7d: p.total7d || 0,
            total30d: p.total30d || 0,
            totalAllTime: p.totalAllTime || 0,
            openInterest: lighterStats.openInterest,
            avgSpread: lighterStats.marketCount > 0 ? lighterStats.avgSpread / lighterStats.marketCount : 0,
          };
        }
        const isOstium = p.name.toLowerCase() === 'ostium' || p.defillamaId?.toLowerCase() === 'ostium';
        if (isOstium) {
          return {
            ...p,
            defillamaId: 'ostium',
            name: OSTIUM_VENUE_NAME,
            displayName: OSTIUM_VENUE_NAME,
            module: p.module || 'ostium',
            category: p.category || 'Derivatives',
            chains: p.chains?.length ? p.chains : ['Arbitrum'],
            total24h: ostiumStats.total24h || p.total24h,
            total7d: p.total7d || 0,
            total30d: p.total30d || 0,
            totalAllTime: p.totalAllTime || 0,
            openInterest: ostiumStats.openInterest,
            avgSpread: ostiumStats.marketCount > 0 ? ostiumStats.avgSpread / ostiumStats.marketCount : 0,
          };
        }
        return {
          ...p,
          // Mocking Open Interest and Avg Spread for UI purposes
          openInterest: (p.total24h || 0) * (0.2 + Math.random() * 0.8),
          avgSpread: 0.01 + Math.random() * 0.05
        };
      })
      .filter((protocol, index, list) => list.findIndex(item => item.defillamaId === protocol.defillamaId) === index)
      .sort((a, b) => (b.total24h || 0) - (a.total24h || 0));
  } catch (error) {
    console.error(error);
    return [];
  }
}

export interface ChartDataPoint {
  date: string;
  value: number;
}

export async function getExchangeVolumeHistory(id: string): Promise<ChartDataPoint[]> {
  try {
    const res = await fetch(
      `https://api.llama.fi/summary/derivatives/${id}?dataType=dailyVolume`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const chart: [number, number][] = data.totalDataChart || [];
    return chart.slice(-30).map(([ts, val]) => ({
      date: new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: val,
    }));
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

export async function getParadexFundingHistory(coin: string, days: number = 30): Promise<ChartDataPoint[]> {
  try {
    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60 * 1000;
    const res = await fetch(
      `https://api.prod.paradex.trade/v1/markets/funding-data?market=${coin}-USD-PERP&start_at=${startTime}&end_at=${endTime}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const entries: { created_at: number; funding_rate: string }[] = data.results || [];
    return entries.map(e => ({
      date: new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }),
      value: parseFloat(e.funding_rate) * 100,
    }));
  } catch {
    return [];
  }
}

export async function getTopMarkets(): Promise<Market[]> {
  try {
    const [res, hlData] = await Promise.all([
      fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false', {
        next: { revalidate: 3600 }
      }),
      getHyperliquidContexts()
    ]);
    if (!res.ok) throw new Error('Failed to fetch markets');
    const markets: Market[] = await res.json();
    
    const hlMap = new Map();
    if (hlData && hlData[0] && hlData[1]) {
      const meta = hlData[0].universe;
      const ctxs = hlData[1];
      meta.forEach((m: any, idx: number) => {
        const ctx = ctxs[idx];
        if (ctx) {
          let spread = 0.01 + Math.random() * 0.05;
          if (ctx.impactPxs && ctx.impactPxs.length === 2 && parseFloat(ctx.midPx) > 0) {
             spread = ((parseFloat(ctx.impactPxs[1]) - parseFloat(ctx.impactPxs[0])) / parseFloat(ctx.midPx)) * 100;
          }
          hlMap.set(m.name.toLowerCase(), {
            volume: parseFloat(ctx.dayNtlVlm || "0"),
            spread: spread
          });
        }
      });
    }

    return markets.map(m => {
      const hlMatch = hlMap.get(m.symbol.toLowerCase());
      return {
        ...m,
        total_volume: hlMatch && hlMatch.volume > 0 ? hlMatch.volume : m.total_volume,
        // Use real HL spread if available, otherwise mock
        avgSpread: hlMatch ? hlMatch.spread : 0.005 + Math.random() * 0.04
      };
    });
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getMarket(id: string): Promise<Market | null> {
  try {
    const topMarkets = await getTopMarkets();
    const found = topMarkets.find(m => m.id === id || m.symbol.toLowerCase() === id.toLowerCase());
    if (found) return found;

    const searchRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${id}`, { next: { revalidate: 3600 } });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    if (!searchData.coins || searchData.coins.length === 0) return null;
    
    const coinId = searchData.coins[0].id;
    
    const [coinRes, hlData] = await Promise.all([
      fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`, { next: { revalidate: 60 } }),
      getHyperliquidContexts()
    ]);
    
    if (!coinRes.ok) return null;
    const coinData = await coinRes.json();
    
    let volume = coinData.market_data?.total_volume?.usd || 0;
    let spread = 0.005 + Math.random() * 0.04;
    
    if (hlData && hlData[0] && hlData[1]) {
      const meta = hlData[0].universe;
      const ctxs = hlData[1];
      const idx = meta.findIndex((m: any) => m.name.toLowerCase() === coinData.symbol.toLowerCase());
      if (idx !== -1 && ctxs[idx]) {
        const ctx = ctxs[idx];
        if (parseFloat(ctx.dayNtlVlm || "0") > 0) {
          volume = parseFloat(ctx.dayNtlVlm);
        }
        if (ctx.impactPxs && ctx.impactPxs.length === 2 && parseFloat(ctx.midPx) > 0) {
          spread = ((parseFloat(ctx.impactPxs[1]) - parseFloat(ctx.impactPxs[0])) / parseFloat(ctx.midPx)) * 100;
        }
      }
    }

    return {
      id: coinData.id,
      symbol: coinData.symbol,
      name: coinData.name,
      image: coinData.image?.small,
      current_price: coinData.market_data?.current_price?.usd || 0,
      market_cap: coinData.market_data?.market_cap?.usd || 0,
      total_volume: volume,
      price_change_percentage_24h: coinData.market_data?.price_change_percentage_24h || 0,
      avgSpread: spread
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getLighterAssetPriceMap(): Promise<Record<string, number>> {
  const assetDetails = await getLighterAssetDetails();
  return assetDetails.reduce<Record<string, number>>((acc, asset) => {
    const price =
      parseNumber(asset.index_price) ||
      parseNumber(asset.price) ||
      parseNumber(asset.oracle_price) ||
      parseNumber(asset.last_trade_price);
    acc[asset.symbol.toUpperCase()] = price;
    return acc;
  }, {});
}
