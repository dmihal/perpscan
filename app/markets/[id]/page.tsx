import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Activity, BarChart3, TrendingUp, Shield } from 'lucide-react';
import { getTopMarkets } from '@/lib/api';

export default async function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const markets = await getTopMarkets();
  const market = markets.find(m => m.id === id);

  if (!market) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Market Not Found</h1>
        <p className="text-muted-foreground mb-8">We could not find the market you are looking for.</p>
        <Link href="/markets" className="text-primary hover:underline">
          Return to Markets
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
      <Link href="/markets" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Markets
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-12">
        <div className="flex items-center gap-6">
          {market.image && (
            <Image
              src={market.image}
              alt={market.name}
              width={80}
              height={80}
              className="rounded-full border border-border shadow-sm"
              referrerPolicy="no-referrer"
            />
          )}
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">{market.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-secondary text-secondary-foreground uppercase">
                {market.symbol}-USD
              </span>
              <span>Asset ID: {market.id}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <a
            href={`https://www.coingecko.com/en/coins/${market.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-6"
          >
            View on CoinGecko
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4 mb-16">
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Current Price</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono">
            ${market.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">24h Change</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className={`text-2xl font-bold font-mono ${market.price_change_percentage_24h >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
            {market.price_change_percentage_24h >= 0 ? '+' : ''}
            {market.price_change_percentage_24h?.toFixed(2)}%
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">24h Volume</h3>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono">
            {formatCurrency(market.total_volume)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Market Cap</h3>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono">
            {formatCurrency(market.market_cap)}
          </div>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Available on Exchanges</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-8 text-center text-muted-foreground">
                <p>Cross-exchange aggregation for {market.name} is currently syncing.</p>
                <p className="text-sm mt-2">Check back soon for a list of all DEXs offering {market.symbol}-USD perpetuals.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Price Chart</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden h-96 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Interactive charts are being generated.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-4">About {market.name}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {market.name} ({market.symbol.toUpperCase()}) is currently trading at ${market.current_price.toLocaleString()} with a market capitalization of {formatCurrency(market.market_cap)}.
              Over the last 24 hours, it has seen {formatCurrency(market.total_volume)} in trading volume.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
