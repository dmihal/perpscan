# Perpscan Build Plan

**Last updated**: 2026-03-23
**Overall progress**: ~75% of PRD implemented

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
  - [ ] Sortable columns
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
- [ ] Link to exchange's own UI

### 2.3 Navigation & Cross-Linking
- [x] Exchange markets table: each row links to `/exchanges/[id]/markets/[symbol]`
- [ ] Account positions table: each market cell links to `/exchanges/[id]/markets/[symbol]`
- [x] Exchange-specific market detail page: secondary link to `/assets/[symbol]` for cross-exchange view
- [x] Asset overview page: each exchange row links to `/exchanges/[id]/markets/[symbol]`
- [x] Homepage tables: proper deep links to all relevant pages

### 2.4 Global Search Bar
- [x] Build a search input component in the top navigation bar (visible on all pages)
- [ ] Implement dropdown with categorized results:
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
- [ ] Research Paradex API — determine address format (Starknet L2 vs EVM abstraction)
- [ ] Implement market data fetching
- [ ] Implement account position fetching (Starknet address handling)
- [ ] Implement trade history fetching
- [ ] Add to exchange detail page
- [ ] Add to account detail page
- [ ] Handle address format differences in account search UI
- [ ] Test with real Paradex addresses

---

## Phase 4: Account Page Enhancements

### 4.1 Trade History
- [x] Fetch real trade history from Hyperliquid API (fills endpoint)
- [x] Display in trade history table on account page
- [ ] Add exchange filter for trade history
- [x] Paginate trade history results

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
- [ ] Clean up unused mock data references (dYdX, Synthetix, Kwenta, Polynomial)
- [ ] Remove or repurpose Gemini API integration (unused)
- [ ] Add proper error boundaries and loading states
- [ ] SEO: meta titles, descriptions for all pages

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

## Issues & Blockers

_(Updated by the build agent as it encounters problems)_

_None yet._
