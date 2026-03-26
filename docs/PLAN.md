# Perpscan Build Plan

**Last updated**: 2026-03-23
**Overall progress**: ~80% of PRD implemented

---

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Complete
- [!] Blocked / has issues

---

## Phase 1: Core UI Infrastructure

These tasks make every existing page production-quality before adding new pages or integrations.

### 1.1 Sortable Tables
- [x] Create a reusable `SortableTable` component (or a `useSortableTable` hook)
- [x] Apply to: Homepage top exchanges table
- [x] Apply to: Homepage top markets table
- [x] Apply to: Exchanges directory table
- [x] Apply to: Markets directory tables (both global + venue-specific)
- [x] Apply to: Exchange detail markets table (HyperliquidMarketsTable)
- [x] Apply to: Account detail positions table
- [x] Apply to: Account detail balances table

### 1.2 Table Filtering & Search
- [x] Make search inputs functional across all pages (was already implemented)
- [x] Add category filters to markets tables (venue filter in VenueMarketsTable; margin type filter in HyperliquidMarketsTable)
- [x] Add exchange filter to `/markets` page (venue filter buttons in VenueMarketsTable)
- [x] Pagination or virtual scrolling for large tables (50-row pages added to VenueMarketsTable + HyperliquidMarketsTable)

### 1.3 Charts Foundation
- [x] Build reusable chart components using Recharts (already installed, not used)
- [x] Line chart component (for price, OI, volume over time)
- [x] Bar chart component (for volume comparison)
- [x] Area chart component (for funding rate history)
- [x] Charts should handle "no data available" gracefully (hide, don't show empty)

### 1.4 Caching & Rendering Fixes
- [x] Remove `force-dynamic` from pages that don't need it
- [x] Implement proper ISR revalidation per data type (see PRD Section 7.2)
- [x] Market prices/funding: 60s revalidation
- [x] Exchange metadata: 1 hour revalidation
- [x] Account data: 10s revalidation (already done)

---

## Phase 2: Missing Pages

### 2.1 Asset Overview Page (`/assets/[symbol]`)
- [x] Create route at `app/assets/[symbol]/page.tsx`
- [x] Asset header: name, symbol, logo, current spot price (from CoinGecko)
- [x] **Cross-exchange markets table** (primary content): show this asset's perp market on every integrated exchange
  - [x] Columns: exchange name, mark price, 24h volume, OI, funding rate, spread
  - [x] Sortable columns
  - [x] Each row links to `/exchanges/[id]/markets/[symbol]`
- [x] Funding rate comparison chart (if data available from multiple exchanges)
- [ ] OI distribution chart

### 2.2 Exchange Market Detail Page (`/exchanges/[id]/markets/[symbol]`)
- [x] Create route at `app/exchanges/[id]/markets/[symbol]/page.tsx`
- [x] Market header: asset + exchange name, mark price, 24h change
- [x] Stats cards: 24h volume, OI, funding rate, spread
- [x] Price chart (if historical data available from exchange API)
- [ ] OI over time chart
- [x] Funding rate history chart
- [ ] Liquidation history chart
- [x] Link to asset overview page (cross-exchange view)
- [x] Link to exchange's own UI

### 2.3 Navigation & Cross-Linking
- [x] Exchange markets table: each row links to `/exchanges/[id]/markets/[symbol]`
- [x] Account positions table: each market cell links to `/exchanges/[id]/markets/[symbol]`
- [x] Exchange-specific market detail page: secondary link to `/assets/[symbol]` for cross-exchange view
- [x] Asset overview page: each exchange row links to `/exchanges/[id]/markets/[symbol]`
- [x] Homepage tables: proper deep links to all relevant pages

### 2.4 Global Search Bar
- [x] Build a search input component in the top navigation bar (visible on all pages)
- [x] Implement dropdown with categorized results:
  - [x] Account addresses: detect `0x` prefix, link to `/accounts/[address]`
  - [x] Exchanges: fuzzy-match against exchange names, link to `/exchanges/[id]`
  - [x] Assets/Markets: match against known symbols/names, show both asset overview and exchange-specific market links
- [x] Group results by category with section headers
- [x] Keyboard navigation (arrow keys + enter)
- [x] Dismiss on blur / Escape
- [x] Data sources: `getTopExchanges()` + `getAllVenueMarkets()` (cached, client-side filtering)

---

## Phase 3: Exchange Integrations

Each integration follows the same pattern:
1. Research the exchange's public API (endpoints, rate limits, auth requirements)
2. Add API functions to `lib/api.ts` (or create exchange-specific files like `lib/exchanges/gmx.ts`)
3. Integrate market data into `getAllVenueMarkets()` and exchange-specific pages
4. Integrate account data (positions, balances, trade history if available)
5. Test with real addresses
6. Remove mock data for that exchange

### 3.1 GMX (Arbitrum / Avalanche)
- [ ] Research GMX v2 API / subgraph endpoints
- [ ] Implement market data fetching (pairs, prices, volume, OI, funding)
- [ ] Implement account position fetching
- [ ] Implement trade history fetching
- [ ] Add to exchange detail page
- [ ] Add to account detail page (replace mock data)
- [ ] Test with real GMX addresses

### 3.2 Lighter
- [ ] Research Lighter public API
- [ ] Implement market data fetching
- [ ] Implement account position fetching
- [ ] Implement trade history fetching
- [ ] Add to exchange detail page
- [ ] Add to account detail page
- [ ] Test with real addresses

### 3.3 Ostium
- [ ] Research Ostium public API
- [ ] Implement market data fetching
- [ ] Implement account position fetching
- [ ] Implement trade history fetching
- [ ] Add to exchange detail page
- [ ] Add to account detail page
- [ ] Test with real addresses

### 3.4 Pacifica
- [ ] Research Pacifica public API
- [ ] Implement market data fetching
- [ ] Implement account position fetching
- [ ] Implement trade history fetching
- [ ] Add to exchange detail page
- [ ] Add to account detail page
- [ ] Test with real addresses

### 3.5 Aster
- [ ] Research Aster public API / SDK
- [ ] Implement market data fetching
- [ ] Implement account position fetching
- [ ] Implement trade history fetching
- [ ] Add to exchange detail page
- [ ] Add to account detail page
- [ ] Test with real addresses

### 3.6 Paradex (Starknet)
- [x] Research Paradex API — determine address format (Starknet L2 vs EVM abstraction)
- [x] Implement market data fetching
- [ ] Implement account position fetching (Starknet address handling — requires JWT auth)
- [ ] Implement trade history fetching (requires JWT auth)
- [x] Add to exchange detail page
- [ ] Add to account detail page
- [ ] Handle address format differences in account search UI
- [ ] Test with real Paradex addresses

---

## Phase 4: Account Page Enhancements

### 4.1 Unified Transaction History & Transaction Detail Page

The account page's "Trade History" table is being replaced with a unified **Transaction History** that includes all account activity (trades, deposits, withdrawals, transfers, liquidations, staking). Each transaction row links to a dedicated **Transaction Detail page**.

#### 4.1.1 API Layer — `getHyperliquidLedgerUpdates()`
- [x] Add `getHyperliquidLedgerUpdates(address, startTime?)` to `lib/api.ts`
  - Calls `userNonFundingLedgerUpdates` endpoint on Hyperliquid API
  - Returns typed array of ledger events (deposit, withdraw, accountClassTransfer, spotTransfer, internalTransfer, subAccountTransfer, liquidation, vaultDeposit, vaultWithdraw, cStakingTransfer, etc.)
- [x] Define TypeScript types for all ledger update delta shapes in `lib/api.ts`

#### 4.1.2 Unified Transaction History on Account Page
- [x] Replace `TradeHistoryTable` on `/accounts/[address]` with a new `TransactionHistoryTable` component
  - Merges fills (from `userFills`) and ledger updates (from `userNonFundingLedgerUpdates`) into a single chronological list
  - Columns: Time, Type (badge), Summary (context-dependent one-liner), Amount
  - Each row clickable, navigates to `/accounts/[address]/tx/[hash]`
  - Type filter buttons (All / Trades / Deposits / Withdrawals / Transfers / Other)
  - Paginated (reuse existing pagination pattern)
- [ ] Update the exchange-specific account page (`/exchanges/[id]/accounts/[address]`) similarly

#### 4.1.3 Transaction Detail Page (`/accounts/[address]/tx/[hash]`)
- [x] Create route at `app/accounts/[address]/tx/[hash]/page.tsx`
- [x] Server component that fetches:
  - Fills by hash: filter `userFills` response for matching `hash`
  - Ledger update by hash: filter `userNonFundingLedgerUpdates` response for matching `hash`
- [x] Render type-specific detail layout:
  - **Trade**: market link, side, price, size, fee, realized PnL, direction (Open/Close); if multi-fill, show fills table
  - **Deposit**: amount
  - **Withdrawal**: amount, fee, nonce
  - **Transfer**: from/to addresses (linked), amount, token, fee, direction
  - **Liquidation**: account value, notional liquidated, liquidated positions table
  - **Staking**: token, amount, deposit/withdrawal
  - **Vault deposit/withdraw**: amount, vault address, commission details
  - **Spot genesis**: token, amount received
- [x] Back link to account page
- [x] Tx hash linked to Hypurrscan (`https://hypurrscan.io/tx/[hash]`)
- [x] Market references link to `/exchanges/hyperliquid/markets/[symbol]`
- [x] Address references link to `/accounts/[address]`

#### 4.1.4 Cleanup
- [ ] Remove old `TradeHistoryTable` component (no longer used on main account page)
- [ ] Update exchange-specific account page to use unified tx table
- [ ] Add exchange filter for transaction history (for future multi-exchange support)

### 4.2 Subaccounts
- [ ] Check which exchanges support subaccounts via API
- [ ] Implement subaccount discovery for Hyperliquid
- [ ] Add subaccount selector/tabs to account detail page
- [ ] Show per-subaccount positions and balances

### 4.3 Account Page Polish
- [x] Add data status indicators per exchange (live vs failed vs not supported)
- [x] Remove mock data for exchanges that aren't integrated (only show real data)
- [x] Clean up exchange list on `/accounts` page to only show actually supported exchanges

---

## Phase 5: Polish & Nice-to-Haves

### 5.1 Responsive / Mobile
- [ ] Audit all pages on mobile viewports
- [ ] Ensure critical columns (price, PnL, side) visible without horizontal scroll
- [ ] Test navigation on mobile
- [ ] Optimize table layouts for small screens

### 5.2 Miscellaneous
- [x] Clean up unused mock data references (dYdX, Synthetix, Kwenta, Polynomial)
- [x] Remove or repurpose Gemini API integration (unused)
- [ ] Add proper error boundaries and loading states
- [x] SEO: meta titles, descriptions for all pages

---

## Learnings & Notes

_(Updated by the build agent as it works)_

- Recharts is integrated into VolumeBarChart, PriceLineChart, and FundingRateChart components
- Hyperliquid candle and funding rate history APIs added for market detail charts
- ISR caching implemented across all pages
- Hyperliquid API is the only real integration; all other exchanges are mocked
- The exchange detail page has hard-coded Hyperliquid-specific logic — needs abstraction for multi-exchange support
- CoinGecko and DeFiLlama APIs are used for supplementary data (prices, logos, volume rankings)
- Next.js image domains whitelisted: `icons.llamao.fi`, `coin-images.coingecko.com`, `picsum.photos`

---

## Exchange API Research

### Paradex (Starknet) — READY TO INTEGRATE
- **Base URL:** `https://api.prod.paradex.trade/v1`
- **Auth:** None required for public endpoints
- **Market list:** `GET /markets` → 87 perp markets, returns symbol, base/quote currency, fees, position limits
- **Market summary:** `GET /markets/summary?market=ALL` → mark_price, bid, ask, volume_24h, open_interest, funding_rate per market
- **Candles:** `GET /markets/klines?symbol=BTC-USD-PERP&resolution=60&start_at=<ms>&end_at=<ms>` → OHLCV arrays
- **Funding:** Available in market summary (current rate); historical funding via `/markets/funding-data`
- **Account/positions:** `GET /account/positions` — requires JWT auth (Starknet signature)
- **Trade history:** `GET /account/fills` — requires JWT auth
- **Address format:** Starknet L2 addresses (not EVM)
- **Notes:** Market data is fully public. Account data requires Paradex-specific auth flow with Starknet keys. Symbol format: `BTC-USD-PERP`

### GMX v2 (Arbitrum) — PARTIALLY AVAILABLE
- **Price API:** `https://arbitrum-api.gmxinfra.io/prices/tickers` → token prices (120 tokens)
- **Signed prices:** `https://arbitrum-api.gmxinfra.io/signed_prices/latest` → oracle prices with token addresses
- **Volume/OI:** Not available via simple REST — requires subgraph queries or on-chain reads
- **Account data:** On-chain only (no REST API for positions)
- **Notes:** GMX v2 is heavily on-chain. Market data requires combining multiple data sources (subgraph for volume/OI, oracle for prices). More complex integration than Paradex.

### Ostium — NEEDS MORE RESEARCH
- No public API found at `api.ostium.io`
- Likely subgraph-based or on-chain only

### Lighter — NEEDS MORE RESEARCH
- Check `docs.lighter.xyz` for REST API or SDK documentation

### Pacifica / Aster — NEEDS MORE RESEARCH
- Newer protocols, documentation not yet confirmed

---

## Issues & Blockers

_(Updated by the build agent as it encounters problems)_

- GMX v2 integration is complex — no single REST endpoint for volume/OI. May need subgraph integration.
- Paradex account data requires Starknet signature auth — market data only for now.
- Ostium/Lighter/Pacifica/Aster APIs not yet confirmed — need web search access to find docs.
