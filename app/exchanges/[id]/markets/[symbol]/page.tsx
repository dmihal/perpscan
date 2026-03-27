import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Activity, BarChart3, TrendingUp, Shield, Percent, ArrowUpRight, ExternalLink } from 'lucide-react';
import { getAllVenueMarkets, getHyperliquidCandles, getHyperliquidFundingHistory, getLighterMarketSpread, getParadexCandles, getParadexFundingHistory, getTopExchanges } from '@/lib/api';
import PriceLineChart from '@/components/PriceLineChart';
import FundingRateChart from '@/components/FundingRateChart';

export const revalidate = 60;

function formatRouteMarketSymbol(symbol: string) {
  const upper = symbol.toUpperCase();
  if (upper.includes('-') || upper.endsWith('USD')) return upper;
  return `${upper}-USD`;
}

function marketMatchesRouteSymbol(marketSymbol: string, routeSymbol: string) {
  const normalizedMarket = marketSymbol.toLowerCase();
  const normalizedRoute = routeSymbol.toLowerCase();
  return normalizedMarket === normalizedRoute || normalizedMarket === `${normalizedRoute}-usd`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; symbol: string }> }): Promise<Metadata> {
  const { id, symbol } = await params;
  const marketSymbol = formatRouteMarketSymbol(symbol);
  const exchanges = await getTopExchanges();
  const exchange = exchanges.find(ex => ex.defillamaId === id || (id === '5507' && ex.defillamaId === 'hyperliquid'));
  return {
    title: `${marketSymbol} on ${exchange?.name || id} — Perp Scan`,
    description: `${marketSymbol} perpetual market stats, price chart, and funding rate history on ${exchange?.name || id}.`,
  };
}

export default async function ExchangeMarketPage({ params }: { params: Promise<{ id: string; symbol: string }> }) {
  const { id, symbol } = await params;
  const coin = symbol.toUpperCase();
  const routeMarketSymbol = formatRouteMarketSymbol(symbol);

  const exchanges = await getTopExchanges();
  const exchange = exchanges.find(ex => ex.defillamaId === id || (id === '5507' && ex.defillamaId === 'hyperliquid'));

  const isHyperliquid = id === 'hyperliquid' || id === '5507';
  const isParadex = id === 'paradex';
  const isLighter = id === 'lighter';

  const [allMarkets, priceHistory, fundingHistory] = await Promise.all([
    getAllVenueMarkets(),
    isHyperliquid ? getHyperliquidCandles(coin) : isParadex ? getParadexCandles(coin) : Promise.resolve([]),
    isHyperliquid ? getHyperliquidFundingHistory(coin) : isParadex ? getParadexFundingHistory(coin) : Promise.resolve([]),
  ]);

  const venueName = exchange?.name || id.charAt(0).toUpperCase() + id.slice(1);
  const marketMatch = allMarkets.find(
    m => m.venue.toLowerCase() === venueName.toLowerCase() && marketMatchesRouteSymbol(m.symbol, symbol)
  );
  const lighterSpread = isLighter && marketMatch?.marketId ? await getLighterMarketSpread(marketMatch.marketId) : null;
  const market = marketMatch && lighterSpread !== null
    ? { ...marketMatch, spread: lighterSpread || marketMatch.spread }
    : marketMatch;

  if (!market) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Market Not Found</h1>
        <p className="text-muted-foreground mb-8">
          Could not find {routeMarketSymbol} on {exchange?.name || id}.
        </p>
        <Link href={`/exchanges/${id}`} className="text-primary hover:underline">
          Back to Exchange
        </Link>
      </div>
    );
  }

  const exchangeTradeUrls: Record<string, string> = {
    hyperliquid: `https://app.hyperliquid.xyz/trade/${coin}`,
    paradex: `https://app.paradex.trade/trade/${coin}-USD-PERP`,
    lighter: 'https://app.lighter.xyz',
  };
  const tradeUrl = exchangeTradeUrls[id] || exchangeTradeUrls[exchange?.defillamaId || ''];

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '$0.00';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
      <Link href={`/exchanges/${id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to {exchange?.name || venueName}
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{market.symbol}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
              {exchange?.name || venueName}
            </span>
            {market.isHip3 && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold border-transparent bg-indigo-500/10 text-indigo-500">
                HIP-3
              </span>
            )}
            {market.onlyIsolated ? (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold border-transparent bg-amber-500/10 text-amber-500">
                Isolated Only
              </span>
            ) : isHyperliquid ? (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold border-transparent bg-emerald-500/10 text-emerald-500">
                Cross Margin
              </span>
            ) : null}
            {market.reduceOnly && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold border-transparent bg-orange-500/10 text-orange-500">
                Reduce Only
              </span>
            )}
            {market.fundingIntervalHours && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold border-transparent bg-sky-500/10 text-sky-500">
                {market.fundingIntervalHours}h Funding
              </span>
            )}
            {market.makerFee === 0 && market.takerFee === 0 && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold border-transparent bg-emerald-500/10 text-emerald-500">
                0% Fees
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/assets/${coin.toLowerCase()}`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-6"
          >
            Cross-Exchange View
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
          {tradeUrl && (
            <a
              href={tradeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-6"
            >
              Trade on {exchange?.name || venueName}
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-5 mb-12">
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Mark Price</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono">
            ${market.price.toLocaleString(undefined, { minimumFractionDigits: market.price < 1 ? 4 : 2, maximumFractionDigits: market.price < 1 ? 6 : 2 })}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">24h Volume</h3>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500">
            {formatCurrency(market.volume24h)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Open Interest</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono">
            {formatCurrency(market.openInterest)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Funding Rate</h3>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className={`text-2xl font-bold font-mono ${market.fundingRate >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
            {market.fundingRate >= 0 ? '+' : ''}{market.fundingRate.toFixed(4)}%
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Spread</h3>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono text-muted-foreground">
            {market.spread.toFixed(4)}%
          </div>
        </div>
      </section>

      {(market.maxLeverage || market.tradingHours || market.reduceOnly || market.makerFee !== undefined || market.takerFee !== undefined) && (
        <section className="grid gap-4 md:grid-cols-4 mb-12">
          {market.maxLeverage && (
            <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
              <div className="text-sm font-medium text-muted-foreground mb-2">Max Leverage</div>
              <div className="text-2xl font-bold font-mono">{market.maxLeverage.toFixed(0)}x</div>
            </div>
          )}
          {market.takerFee !== undefined && (
            <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
              <div className="text-sm font-medium text-muted-foreground mb-2">Taker Fee</div>
              <div className="text-2xl font-bold font-mono">{market.takerFee.toFixed(4)}%</div>
            </div>
          )}
          {market.makerFee !== undefined && (
            <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
              <div className="text-sm font-medium text-muted-foreground mb-2">Maker Fee</div>
              <div className="text-2xl font-bold font-mono">{market.makerFee.toFixed(4)}%</div>
            </div>
          )}
          {market.tradingHours !== undefined && (
            <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
              <div className="text-sm font-medium text-muted-foreground mb-2">Trading Hours</div>
              <div className="text-base font-medium">{market.tradingHours || '24 / 7'}</div>
            </div>
          )}
        </section>
      )}

      <div className="grid gap-8 md:grid-cols-2 mb-12">
        {priceHistory.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold tracking-tight mb-4">Price (30d)</h2>
            <div className="rounded-xl border border-border bg-card p-6">
              <PriceLineChart data={priceHistory} />
            </div>
          </section>
        )}
        {fundingHistory.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold tracking-tight mb-4">Funding Rate History</h2>
            <div className="rounded-xl border border-border bg-card p-6">
              <FundingRateChart data={fundingHistory} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
