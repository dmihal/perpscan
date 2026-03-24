import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Activity, BarChart3, TrendingUp, Shield, Percent, ArrowUpRight } from 'lucide-react';
import { getAllVenueMarkets, getHyperliquidCandles, getHyperliquidFundingHistory, getParadexCandles, getTopExchanges } from '@/lib/api';
import PriceLineChart from '@/components/PriceLineChart';
import FundingRateChart from '@/components/FundingRateChart';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string; symbol: string }> }): Promise<Metadata> {
  const { id, symbol } = await params;
  const coin = symbol.toUpperCase();
  const exchanges = await getTopExchanges();
  const exchange = exchanges.find(ex => ex.defillamaId === id || (id === '5507' && ex.defillamaId === 'hyperliquid'));
  return {
    title: `${coin}-USD on ${exchange?.name || id} — Perp Scan`,
    description: `${coin}-USD perpetual market stats, price chart, and funding rate history on ${exchange?.name || id}.`,
  };
}

export default async function ExchangeMarketPage({ params }: { params: Promise<{ id: string; symbol: string }> }) {
  const { id, symbol } = await params;
  const coin = symbol.toUpperCase();

  const exchanges = await getTopExchanges();
  const exchange = exchanges.find(ex => ex.defillamaId === id || (id === '5507' && ex.defillamaId === 'hyperliquid'));

  const isHyperliquid = id === 'hyperliquid' || id === '5507';
  const isParadex = id === 'paradex';

  const [allMarkets, priceHistory, fundingHistory] = await Promise.all([
    getAllVenueMarkets(),
    isHyperliquid ? getHyperliquidCandles(coin) : isParadex ? getParadexCandles(coin) : Promise.resolve([]),
    isHyperliquid ? getHyperliquidFundingHistory(coin) : Promise.resolve([]),
  ]);

  const venueName = exchange?.name || id.charAt(0).toUpperCase() + id.slice(1);
  const market = allMarkets.find(
    m => m.venue.toLowerCase() === venueName.toLowerCase() && m.symbol.toLowerCase() === `${coin.toLowerCase()}-usd`
  );

  if (!market) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Market Not Found</h1>
        <p className="text-muted-foreground mb-8">
          Could not find {coin}-USD on {exchange?.name || id}.
        </p>
        <Link href={`/exchanges/${id}`} className="text-primary hover:underline">
          Back to Exchange
        </Link>
      </div>
    );
  }

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
            ) : (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold border-transparent bg-emerald-500/10 text-emerald-500">
                Cross Margin
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
