# Perpscan — Product Requirements Document

**Version**: 1.0
**Date**: 2026-03-22
**Status**: Draft

---

## 1. Overview

### 1.1 Product Summary

Perpscan is a neutral, public-good analytics and account explorer for decentralized perpetuals exchanges. It provides a unified interface for retail DeFi users to explore perpetuals markets, compare exchanges, and inspect wallet positions across multiple DEXs — without requiring authentication, account creation, or any custodial interaction.

Think of it as the intersection of **CoinGlass** (global perps analytics) and **Etherscan** (utilitarian wallet lookup) — but scoped exclusively to decentralized perpetuals venues.

### 1.2 The Problem

The decentralized perpetuals ecosystem is fragmented. A trader active across Hyperliquid, GMX, and Lighter has no single place to:
- See all their positions and balances at a glance
- Compare funding rates, spreads, and liquidity across venues for a given asset
- Explore market statistics and historical data in one interface

Existing tools either focus on CEXs (CoinGlass), are exchange-specific (Hyperliquid's own UI), or require wallet connections and accounts (portfolio trackers).

### 1.3 Solution

Perpscan aggregates publicly available data from exchange APIs and presents it in a clean, unified, read-only interface. No wallet connection required — users simply enter any EVM (or Starknet) address to inspect an account.

### 1.4 Secondary Purpose

Perpscan is also an internal debugging and monitoring tool for the team's own perpetuals aggregator product. It provides a convenient way to inspect account states and verify integrations across supported venues.

---

## 2. Goals & Non-Goals

### Goals

- Provide comprehensive, cross-exchange market data for decentralized perpetuals
- Allow anyone to look up any wallet address and see positions, balances, and trade history across all supported venues
- Surface key trading metrics: price, volume, open interest, funding rates, spreads, and liquidation data (where APIs permit)
- Be fast, reliable, and require zero authentication or user data storage
- Degrade gracefully: if an exchange API doesn't expose a data point, hide that data rather than show placeholders

### Non-Goals (v1)

- No CEX data (Binance, Bybit, OKX, etc.)
- No user authentication or accounts
- No backend database or custom indexer
- No trading functionality (read-only)
- No leaderboards / top traders by PnL
- No AI features
- No monetization
- No portfolio value over time chart (nice-to-have, deferred)
- No cross-exchange net exposure view (nice-to-have, deferred)

---

## 3. Target Users

### Primary: Retail DeFi Traders

- Active on one or more decentralized perpetuals exchanges
- Want a quick, neutral place to check their positions and the state of markets
- May want to look up other wallets (friends, known traders, whales)
- Value simplicity and speed over deep customization

### Secondary: Internal Team

- Use Perpscan to debug and monitor the team's perp aggregator
- Need reliable account state visibility across all integrated venues

---

## 4. Supported Exchanges (v1)

| Exchange    | Chain / Type       | Status         | Notes                                      |
|-------------|-------------------|----------------|--------------------------------------------|
| Hyperliquid | L1 (EVM-compatible) | Integrated   | Full integration: markets, accounts, positions |
| GMX         | Arbitrum / Avalanche | Planned      | Public API available                       |
| Lighter     | zkSync / L2       | Planned        | REST API available                         |
| Pacifica    | TBD               | Planned        | Scope TBD based on API availability        |
| Paradex     | Starknet          | Planned        | Complex — Starknet address format differs from EVM; scope TBD |
| Ostium      | TBD               | Planned        | Scope TBD based on API availability        |
| Aster      | TBD               | Planned        | Scope TBD based on API availability        |

**Integration principle**: All data must be fetchable directly from each exchange's public API or SDK — no reliance on aggregators (DeFiLlama, etc.) for exchange-specific data. No custom indexers. Features that are unavailable via API are simply not shown for that exchange.

---

## 5. Architecture Principles

- **Framework**: Next.js (App Router) with TypeScript
- **Rendering**: Server components + Incremental Static Regeneration (ISR); no client-side data fetching except where interactivity requires it
- **Data layer**: Direct HTTP calls to exchange APIs and aggregators (DeFiLlama, CoinGecko) from Next.js server components / route handlers
- **No backend**: No database, no auth, no user sessions
- **Caching**: ISR with appropriate revalidation per data type (e.g., 10s for account data, 60s for market data, 1h for exchange metadata)
- **Responsive**: Mobile-first, works across all screen sizes
- **Graceful degradation**: Sections that depend on unavailable API data are hidden, not stubbed

---

## 6. Pages & Features

### 6.1 Homepage / Dashboard (`/`)

**Purpose**: High-level snapshot of the global decentralized perpetuals market.

**Content**:
- Global stats strip: total 24h volume, total open interest, number of active markets, number of tracked DEXs
- Top Exchanges table (sortable): exchange name, 24h volume, 7d volume, open interest, avg spread
- Top Markets / Assets table (sortable): asset symbol, price, 24h change, 24h volume, best funding rate across venues

---

### 6.2 Exchanges Directory (`/exchanges`)

**Purpose**: Browse and compare all supported perpetuals venues.

**Content**:
- Table of all supported exchanges with:
  - Name + logo
  - Supported chains
  - 24h, 7d, 30d, all-time volume
  - Total open interest
  - Number of markets
- Sortable columns
- Search/filter by name

---

### 6.3 Exchange Detail (`/exchanges/[id]`)

**Purpose**: Deep dive into a single exchange — its statistics and all its markets.

**Content**:
- Exchange header: logo, name, supported chains, link to exchange
- Stats cards: 24h volume, 7d volume, 30d volume, all-time volume, open interest
- Charts (where API data available):
  - Volume over time
  - Open interest over time
  - Funding rate trends
  - Liquidation data
- Markets table:
  - Columns: symbol, price, 24h change, 24h volume, open interest, funding rate, avg spread, margin type
  - **Sortable columns**
  - **Filterable by category** (e.g., cross margin / isolated, asset category like crypto/forex/commodities where applicable)
  - Search by symbol

---

### 6.4 Asset Overview (`/assets/[symbol]`)

**Purpose**: View a single asset (e.g., BTC) across all exchanges that have a perpetual market for it.

**Content**:
- Asset header: name, symbol, logo, current spot price
- **Cross-exchange markets table**: Lists every exchange that has a perpetual market for this asset. This is the primary content of the page.
  - Columns: exchange name, mark price, 24h volume, open interest, funding rate, avg spread
  - Sortable columns
  - Each row links to that exchange's specific market page (`/exchanges/[id]/markets/[symbol]`)
- Charts (aggregated or per-exchange where data permits):
  - Funding rate comparison across venues
  - Open interest distribution

> **Note**: This is a distinct page from the exchange-specific market page. It answers "where can I trade BTC perps and how do the venues compare?"

---

### 6.5 Market Detail (`/exchanges/[id]/markets/[symbol]`)

**Purpose**: Deep dive into a specific market on a specific exchange (e.g., BTC-USD on Hyperliquid).

**Content**:
- Market header: asset + exchange name, mark price, 24h change
- Stats cards: 24h volume, open interest, funding rate, avg spread, leverage limits
- Charts (where API data permits):
  - Price / mark price over time
  - Open interest over time
  - Funding rate history
  - Liquidation history
- Link to the asset overview page (cross-exchange view)
- Link to the exchange's own UI for this market

---

### 6.6 Markets Directory (`/markets`)

**Purpose**: Browse all perpetual markets across all exchanges.

**Content**:
- Unified markets table:
  - Columns: asset, exchange, price, 24h change, 24h volume, open interest, funding rate, spread
  - **Sortable columns**
  - **Filterable by**: exchange, asset category, margin type
  - Search by symbol
- Pagination or virtual scrolling for large lists

---

### 6.7 Global Search Bar

**Purpose**: Unified search across all content types — accounts, exchanges, and assets/markets — accessible from the top navigation on every page.

**Behavior**:
- Single search input in the top nav bar
- As the user types, a dropdown appears with categorized results:
  - **Accounts**: If input looks like a wallet address (`0x...`), show a link to `/accounts/[address]`
  - **Exchanges**: Fuzzy-match against supported exchange names. Each result links to `/exchanges/[id]`
  - **Assets / Markets**: Match against known asset names and symbols. Show both the asset overview (`/assets/[symbol]`) and exchange-specific markets (`/exchanges/[id]/markets/[symbol]`) for that asset
- Results are grouped by category with clear section headers (e.g., "Exchanges", "Assets", "Markets on Hyperliquid")
- Keyboard navigable (arrow keys + enter)
- Dropdown dismisses on blur or Escape
- On enter with no selection, navigate to a search results page or the best match

**Data sources for search**:
- Exchange list: from `getTopExchanges()` (cached)
- Asset/market list: from `getAllVenueMarkets()` (cached)
- Account addresses: no validation needed, just pattern-match `0x` prefix

---

### 6.9 Account Explorer (`/accounts`)

**Purpose**: Entry point for wallet lookup.

**Content**:
- Address input field (supports EVM `0x...` addresses; Starknet addresses for Paradex if integrated)
- Info panel: what data will be shown, which exchanges are supported
- Recent lookups (client-side session only, no persistence)

---

### 6.10 Account Detail (`/accounts/[address]`)

**Purpose**: Full cross-exchange portfolio view for a given wallet address.

**Content**:

**Summary strip**:
- Total account value (sum of balances + unrealized PnL across all venues)
- Total unrealized PnL
- Number of open positions

**Open Positions table**:
- Columns: exchange, market, side (long/short), size, entry price, mark price, unrealized PnL, leverage, liquidation price
- Sortable
- Each market cell links to the relevant Market Detail page (`/exchanges/[id]/markets/[symbol]`)

**Balances table**:
- Exchange, asset, balance
- Shows per-exchange collateral balances

**Transaction History table** (where exchange API supports it):
- Unified list of all account activity: trades (fills), deposits, withdrawals, internal transfers, sub-account transfers, liquidations, spot transfers, staking operations
- Columns: time, type (trade/deposit/withdrawal/transfer/liquidation/etc.), summary, amount
- Each row is clickable, linking to a **Transaction Detail page** (`/accounts/[address]/tx/[hash]`)
- Filterable by exchange and by transaction type
- Paginated

**Subaccounts** (where exchange API supports it):
- Show subaccount selector / tabs if the address has multiple subaccounts (e.g., Hyperliquid subaccounts)
- Each subaccount shows its own positions and balances

**Data status indicators**:
- Show which exchanges returned live data vs. which failed to respond

---

### 6.11 Transaction Detail (`/accounts/[address]/tx/[hash]`)

**Purpose**: Deep dive into a single transaction for a given account. Users reach this page by clicking a row in the transaction history table on the account page.

**Content varies by transaction type**:

**For trades (fills)**:
- Transaction header: type badge ("Trade"), timestamp, tx hash (linked to Hypurrscan)
- Trade details card: market (linked to market detail page), side (buy/sell), size, price, fee, realized PnL, direction (Open/Close)
- If multiple fills share the same hash (e.g., a market order filled across price levels), show all fills in a table

**For deposits**:
- Transaction header: type badge ("Deposit"), timestamp, tx hash
- Amount deposited (USDC)

**For withdrawals**:
- Transaction header: type badge ("Withdrawal"), timestamp, tx hash
- Amount withdrawn, fee, nonce

**For internal / sub-account / spot transfers**:
- Transaction header: type badge ("Transfer"), timestamp, tx hash
- From → To addresses (linked to their account pages where applicable)
- Amount, token, fee
- Transfer direction (to perp / to spot for accountClassTransfer)

**For liquidations**:
- Transaction header: type badge ("Liquidation"), timestamp, tx hash
- Account value at liquidation, total notional liquidated
- Table of liquidated positions: coin, size

**For staking operations**:
- Transaction header: type badge ("Stake" / "Unstake"), timestamp, tx hash
- Token, amount, direction (deposit/withdrawal)

**Navigation**:
- Back link to the account page (`/accounts/[address]`)
- Tx hash links to Hypurrscan (`https://hypurrscan.io/tx/[hash]`)
- Market links to exchange-specific market detail page
- Address links to account pages

---

## 7. Data & API Strategy

### 7.1 Data Sources

| Source         | Used For                                              |
|----------------|-------------------------------------------------------|
| Hyperliquid API | Markets, positions, balances, trade history, non-funding ledger updates (deposits, withdrawals, transfers, liquidations) |
| GMX subgraph / API | Markets, positions, trade history                |
| Lighter API    | Markets, positions, balances                          |
| Pacifica API   | TBD                                                   |
| Paradex API    | Markets, positions (Starknet address mapping TBD)    |
| Ostium API     | TBD                                                   |
| Aster API     | TBD                                                   |
| DeFiLlama      | Exchange volume rankings, protocol metadata           |
| CoinGecko      | Spot prices, market caps, asset logos                 |

### 7.2 Caching Strategy

| Data Type                | Revalidation |
|--------------------------|-------------|
| Exchange metadata        | 1 hour      |
| Market prices / funding  | 60 seconds  |
| Account positions        | 10 seconds  |
| Trade history            | 60 seconds  |
| Transaction detail       | 60 seconds  |
| Charts / historical data | 5 minutes   |

### 7.3 Feature Availability Matrix

Features are shown conditionally based on what each exchange's API exposes. If a data point is unavailable, the column or section is hidden — no "N/A" placeholders.

---

## 8. UI & UX Requirements

### 8.1 Tables

- All data tables must be **sortable** by any column
- Tables with large datasets must support **filtering by category** (asset type, exchange, margin type, etc.)
- All tables must support **search by symbol / name**
- Tables must handle hundreds of rows gracefully (pagination or virtualization)

### 8.2 Charts

- Show charts only where historical data is available from the exchange API
- Charts to include: volume over time, open interest over time, funding rate history, liquidation history
- Use Recharts (already in the stack)

### 8.3 Navigation & Linking

- From any market row on an Exchange page → link to **exchange-specific** Market Detail page (`/exchanges/[id]/markets/[symbol]`), NOT the asset overview
- From any position row on an Account page → link to the relevant exchange-specific Market Detail page
- From any transaction row on an Account page → link to Transaction Detail page (`/accounts/[address]/tx/[hash]`)
- From any Market Detail page → link to Asset Overview (cross-exchange) page as a secondary "view on all exchanges" link
- From any Asset Overview row → link to exchange-specific Market Detail page
- From any exchange reference → link to Exchange Detail page

### 8.4 Responsive Design

- All pages must work on mobile and tablet screen sizes
- Tables should scroll horizontally on small screens
- Critical information (price, PnL, side) must be visible without horizontal scrolling on mobile

### 8.5 Design Language

- Dark theme (current aesthetic)
- Minimal, utilitarian — data-first
- Green for positive / longs, red for negative / shorts (current convention, keep it)
- No redesign planned for v1; incremental improvements only

---

## 9. Nice-to-Haves (Post-v1)

These features are out of scope for v1 but worth noting for future planning:

| Feature                             | Notes                                              |
|-------------------------------------|----------------------------------------------------|
| Portfolio value over time chart     | Requires historical balance snapshots              |
| Cross-exchange net exposure view    | Aggregate long/short exposure by asset             |
| Additional exchanges                | dYdX, Drift, Synthetix, Kwenta, etc.              |
| Mobile app                          | React Native or PWA                               |
| Alerts / notifications              | Funding rate alerts, liquidation warnings          |
| Open source release                 | Public GitHub repo                                 |
| TradingView Lightweight Charts      | Replace Recharts with TradingView charts for price/candlestick views; better suited for financial data |

---

## 10. Open Questions

| # | Question                                                                 | Owner |
|---|--------------------------------------------------------------------------|-------|
| 1 | What address format does Paradex use for account lookup — Starknet L2 addresses or an EVM-compatible abstraction? | Engineering |
| 2 | Does Lighter expose a public REST API with no API key required?          | Engineering |
| 3 | Does Pacifica / Ostium have public APIs, or is integration blocked by access requirements? | Engineering |
| 4 | What chart library / charting approach for historical data — Recharts (already installed) or something more capable like TradingView Lightweight Charts? | Engineering |
| 5 | For GMX: use the subgraph (TheGraph) or the GMX REST API?               | Engineering |
