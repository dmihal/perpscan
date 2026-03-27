# Ostium Integration

**Last updated**: 2026-03-27
**Status**: Research complete, ready to implement

---

## Overview

Ostium is a decentralized perpetuals exchange on **Arbitrum** focused on Real World Assets (RWAs). It offers synthetic perpetual swaps across forex, commodities, indices, stocks, and crypto — ~57 pairs total. Settlement in USDC. Up to 200x leverage.

What makes Ostium interesting for Perpscan: it's one of the few perp DEXs with real stocks (NVDA, TSLA, AAPL, META), indices (SPX, NDX, DJI, DAX, FTSE, Nikkei), forex, and commodities alongside crypto. Trading hours are enforced for RWA assets (markets close on weekends/holidays).

- **App**: https://app.ostium.io
- **Docs**: https://ostium-labs.gitbook.io/ostium-docs
- **API Docs**: https://ostium-labs.gitbook.io/ostium-docs/developer/api-and-sdk

---

## API Details

Ostium has two data sources, both fully public with no auth required:

1. **REST API** — Real-time prices and trading hours
2. **Subgraph (GraphQL)** — Market metadata, positions, trade history, funding rates, OI

**REST Base URL**: `https://metadata-backend.ostium.io`

**Subgraph URL (Mainnet)**: `https://api.subgraph.ormilabs.com/api/public/67a599d5-c8d2-4cc4-9c4d-2975a97bc5d8/subgraphs/ost-prod/live/gn`

No API key or auth required for any read operations.

---

## REST Endpoints

### Latest Prices — `GET /PricePublish/latest-prices`

Returns bid/mid/ask for all pairs with market open status.

```
GET /PricePublish/latest-prices
```

Response per pair:
| Field | Type | Description |
|---|---|---|
| `feed_id` | string | Price feed identifier |
| `bid` | number | Bid price |
| `mid` | number | Mid price |
| `ask` | number | Ask price |
| `isMarketOpen` | boolean | Whether market is currently open |
| `isDayTradingClosed` | boolean | Whether day trading is closed |
| `from` | string | Base asset (e.g. `"EUR"`) |
| `to` | string | Quote asset (e.g. `"USD"`) |
| `timestampSeconds` | number | Unix timestamp |

### Single Price — `GET /PricePublish/latest-price`

```
GET /PricePublish/latest-price?asset=EURUSD
```

### Trading Hours — `GET /trading-hours/asset-schedule`

Returns market schedule for RWA assets.

```
GET /trading-hours/asset-schedule?asset=EURUSD
```

Returns timezone, opening hours array, next public holiday, `isOpenNow`, `secondsToToggleMarketStatus`.

---

## Subgraph Queries (GraphQL)

The subgraph is the primary data source for market metadata, positions, and history.

### Pairs (Markets)

```graphql
{
  pairs {
    id
    from
    to
    feed
    group
    spreadP
    longOI
    shortOI
    maxOI
    maxLeverage
    curFundingLong
    curFundingShort
    lastFundingRate
    accFundingLong
    accFundingShort
    accRollover
    rolloverFeePerBlock
    makerFeeP
    takerFeeP
    volume
    totalOpenTrades
    totalOpenLimitOrders
  }
}
```

Key fields:
| Field | Type | Description |
|---|---|---|
| `from` / `to` | string | Pair symbols |
| `group` | string | Category (crypto, forex, commodities, indices, stocks) |
| `longOI` / `shortOI` | BigInt | Open interest per side (18 decimals) |
| `maxOI` | BigInt | Maximum OI cap |
| `maxLeverage` | BigInt | Max leverage (divide by 1000, e.g. `200000` = 200x) |
| `curFundingLong` / `curFundingShort` | BigInt | Current funding rates |
| `lastFundingRate` | BigInt | Last funding rate |
| `makerFeeP` / `takerFeeP` | BigInt | Fee percentages (6 decimals) |
| `spreadP` | BigInt | Spread percentage (6 decimals) |
| `volume` | BigInt | Cumulative volume |
| `totalOpenTrades` | BigInt | Number of open positions |

### Open Positions (by address)

```graphql
{
  trades(where: { trader: "0x...", isOpen: true }) {
    id
    trader
    pair
    tradeID
    openPrice
    closePrice
    takeProfitPrice
    stopLossPrice
    collateral
    notional
    leverage
    isBuy
    isOpen
    funding
    rollover
    timestamp
  }
}
```

Position fields:
| Field | Type | Description |
|---|---|---|
| `trader` | string | Ethereum address |
| `pair` | string | Pair index (references pairs entity) |
| `openPrice` | BigInt | Entry price (18 decimals) |
| `collateral` | BigInt | Collateral in USDC (6 decimals) |
| `notional` | BigInt | Position notional value |
| `leverage` | BigInt | Leverage used (divide by 1000) |
| `isBuy` | boolean | true=long, false=short |
| `isOpen` | boolean | Position status |
| `funding` | BigInt | Accumulated funding |
| `rollover` | BigInt | Accumulated rollover fees |
| `timestamp` | BigInt | Open time |
| `takeProfitPrice` / `stopLossPrice` | BigInt | TP/SL levels |

### Trade History / Orders

```graphql
{
  orders(where: { trader: "0x...", isPending: false }, orderBy: timestamp, orderDirection: desc) {
    id
    trader
    pair
    price
    priceAfterImpact
    priceImpactP
    profitPercent
    timestamp
    isBuy
    collateral
    leverage
  }
}
```

### Groups (Fee Tiers)

```graphql
{
  groups {
    id
    name
    minLeverage
    maxLeverage
  }
}
```

---

## Precision / Decoding

This is critical — subgraph returns BigInt strings that need conversion:

| Data type | Decimals | Example |
|---|---|---|
| Prices | 18 | `"1152700000000000000"` → `1.1527` |
| Fees (maker/taker/spread) | 6 | `"100000"` → `0.1` (10%) — verify |
| Leverage | ÷1000 | `"200000"` → `200x` |
| Collateral (USDC) | 6 | `"1000000000"` → `$1000` |
| OI | 18 | Divide by 1e18 for human-readable |
| Funding rates | 18 | Divide by 1e18 |

Reference implementation for conversions: https://github.com/0xOstium/ostium-data-ts

---

## Integration Scope

### What we can build

| Feature | Data Source | Notes |
|---|---|---|
| Market list on exchange detail page | Subgraph `pairs` + REST prices | Combine for live prices + metadata |
| Market stats (price, volume, OI, funding) | Subgraph `pairs` + REST prices | OI is long+short from subgraph |
| Spread | Subgraph `pairs.spreadP` | Pre-computed, no order book needed |
| Trading hours / market status | REST `/PricePublish/latest-prices` | `isMarketOpen` per pair |
| Account positions | Subgraph `trades(trader, isOpen: true)` | Direct address lookup, no index mapping |
| Trade history | Subgraph `orders(trader)` | Full history with PnL |
| Fee breakdown | Subgraph `orders` | Dev/vault/oracle/liquidation/funding/rollover |
| Cross-exchange market comparison | Subgraph `pairs` | Feed into `/assets/[symbol]` page |
| Market categories | Subgraph `pairs.group` | crypto/forex/commodities/indices/stocks |

### What we cannot build (or may be limited)

| Feature | Reason |
|---|---|
| Price charts (candles/OHLCV) | No candle endpoint found — would need to aggregate from trades |
| Funding rate history | Subgraph has current rates but historical may need block-by-block queries |
| 24h volume | Cumulative only — use time-travel query (see below) |
| Deposit/withdrawal history | Not exposed in subgraph |

---

## Address Handling

Much simpler than Lighter. Ostium uses standard Ethereum addresses directly — no account index mapping needed.

1. User enters ETH address on Perpscan
2. Query subgraph: `trades(where: { trader: "0x...", isOpen: true })`
3. If results: show positions
4. If empty: show "no Ostium positions for this address"

Note: Address format is lowercase in the subgraph (Arbitrum convention).

---

## Data Mapping to Perpscan

| Perpscan field | Ostium source | Transform |
|---|---|---|
| Market symbol | `from` + `to` from pairs | Concat as `{from}/{to}` or `{from}-{to}` |
| Price | REST `mid` price | Direct |
| 24h Volume | `volume` delta via time-travel query | Current cumulative − 24h-ago cumulative |
| Open Interest | `longOI + shortOI` from pairs | Divide by 1e18, multiply by price for USD |
| Funding Rate | `lastFundingRate` or `curFundingLong/Short` | Divide by 1e18, convert to percentage |
| Spread | `spreadP` | Divide by 1e6, percentage |
| Max Leverage | `maxLeverage` | Divide by 1000 |
| Maker/Taker Fee | `makerFeeP` / `takerFeeP` | Divide by 1e6 (verify) |
| Position side | `isBuy` | true=Long, false=Short |
| Position size | `collateral` × `leverage` | Or use `notional` directly |
| Entry price | `openPrice` | Divide by 1e18 |
| Market status | REST `isMarketOpen` | Show open/closed badge |
| Category | `group` | Map to filter categories |

---

## 24h Volume via Subgraph Time-Travel

The subgraph `volume` field is cumulative. To get 24h volume, query at two points in time using the subgraph's `block` parameter.

### Step 1: Get the Arbitrum block from 24h ago

**Arbiscan API** (recommended — single call, cache-friendly):
```
GET https://api.arbiscan.io/api?module=block&action=getblocknobytime&timestamp={unix_24h_ago}&closest=before
```

Returns: `{ "result": "284000000" }` — the block number.

Free tier: 1 req/5s without key, 5 req/s with free key. Since we only need this once per revalidation cycle (~60s), the free tier is fine. Cache the result for 5-10 minutes.

**Alternative — RPC binary search** (no key at all):
Binary search `arb1.arbitrum.io/rpc` using `eth_getBlockByNumber` to find the block closest to the target timestamp. ~15-30 RPC calls. Works but slower.

Arbitrum block time is ~0.25s (~4 blocks/sec), so 24h ≈ 345,600 blocks. As a rough shortcut: `currentBlock - 345600` gets close, then the Arbiscan call gets exact.

### Step 2: Query pairs at both points

```graphql
# Current state
{ pairs { id volume } }

# State 24h ago
{ pairs(block: { number: 284000000 }) { id volume } }
```

### Step 3: Compute delta

```typescript
const volume24h = currentVolume - historicalVolume; // per pair, BigInt math
```

Cache both queries on the same revalidation cycle so they stay in sync.

---

## Implementation Notes

- **GraphQL, not REST for most data**: Unlike Hyperliquid (POST JSON-RPC) and Lighter (REST), Ostium's primary data source is a subgraph. We'll need a GraphQL fetch helper or just use raw `fetch` with query strings.
- **No SDK needed**: Direct HTTP + GraphQL is cleaner for read-only. The `ostium-ts-sdk` is brand new (v0.1.0) and not worth the dependency.
- **BigInt precision is the main complexity**: Every numeric field needs decimal conversion. Should create a small set of helper functions (`toPrice()`, `toCollateral()`, `toLeverage()`, etc.) or one generic `fromBigInt(value, decimals)`.
- **Trading hours are a unique feature**: Ostium is the first exchange in Perpscan with market hours. Worth surfacing `isMarketOpen` status in the UI — show "Market Closed" badges for RWA pairs.
- **24h volume gap**: The biggest open question. The subgraph may only have cumulative volume. Options: (a) compute 24h delta by caching, (b) use DeFiLlama for volume, (c) skip 24h volume and show cumulative. Need to verify during implementation.
- **Pair groups enable richer filtering**: crypto, forex, commodities, indices, stocks. This is more granular than our current category system and worth exposing.
- **Hosted subgraph risk**: Uses Ormi Labs infrastructure, not The Graph decentralized network. Single provider dependency — if it goes down, Ostium data disappears. Same risk profile as any centralized API though.
- **Pair indexing**: Pairs use numeric IDs in the subgraph (`pair` field on trades). Need to build a pair index → symbol mapping from the `pairs` query.

---

## Implementation Plan

### Phase 1: Market Data (exchange detail page)

1. Add `getOstiumPairs()` — GraphQL query for all pairs with metadata
2. Add `getOstiumPrices()` — REST call for live prices
3. Add `getOstiumMarkets()` — combine pairs + prices into `VenueMarket[]`
4. Wire into `getAllVenueMarkets()` aggregation
5. Add Ostium to exchange config/routing
6. Handle BigInt precision conversions
7. Add market status (open/closed) indicator

### Phase 2: Account Data

1. Add `getOstiumPositions(address)` — subgraph query for open trades
2. Add `getOstiumTradeHistory(address)` — subgraph query for closed orders
3. Wire into account page with Ostium tab
4. Map pair indices to symbols for display

### Phase 3: Polish

1. Add category filters (crypto/forex/commodities/indices/stocks)
2. Add trading hours display for RWA markets
3. Add "Trade on Ostium" link (`https://app.ostium.io/trade/{pair}`)
4. Investigate 24h volume solution
5. Add Ostium to cross-exchange asset comparison pages

---

## Open Questions

1. ~~**24h volume**~~ — Resolved: use subgraph time-travel queries with Arbiscan block lookup.
2. **Funding rate history**: Can we query historical funding rates via time-travel queries too? Same block-based approach could work for `curFundingLong/Short` deltas.
3. **Price charts**: Any undocumented candle/OHLCV endpoint? If not, time-travel queries at regular intervals could approximate it (expensive though).
4. **Rate limits**: No documented rate limits on REST or subgraph — need to test in practice.
5. **Pair symbol format**: What format works best for cross-exchange matching? `BTC/USD` vs `BTCUSD` vs `BTC-USD`?
