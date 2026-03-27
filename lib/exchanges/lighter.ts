import { parseNumber, toArray } from '../utils';
import type { VenueMarket } from '../api';

const LIGHTER_BASE_URL = 'https://mainnet.zklighter.elliot.ai/api/v1';
const LIGHTER_VENUE_NAME = 'Lighter';
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

export function getLeverageFromMarginFraction(value: string | number | undefined): number {
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

export async function getLighterMarkets(): Promise<VenueMarket[]> {
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

export async function getLighterExchangeStats() {
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

export async function getLighterAccounts(address: string): Promise<LighterAccount[]> {
  const subAccounts = await getLighterSubAccounts(address);
  if (subAccounts.length === 0) return [];

  const accounts = await Promise.all(
    subAccounts.map(subAccount => getLighterAccountByIndex(subAccount.index))
  );

  return accounts.filter((account): account is LighterAccount => account !== null);
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
