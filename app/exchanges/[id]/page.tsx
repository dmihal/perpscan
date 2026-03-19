import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Activity, BarChart3, TrendingUp, Shield } from 'lucide-react';
import { getTopExchanges } from '@/lib/api';

export default async function ExchangePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exchanges = await getTopExchanges();
  const exchange = exchanges.find(ex => ex.defillamaId === id);

  if (!exchange) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Exchange Not Found</h1>
        <p className="text-muted-foreground mb-8">We could not find the exchange you are looking for.</p>
        <Link href="/exchanges" className="text-primary hover:underline">
          Return to Exchanges
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
      <Link href="/exchanges" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Exchanges
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-12">
        <div className="flex items-center gap-6">
          {exchange.logo && (
            <Image
              src={exchange.logo}
              alt={exchange.name}
              width={80}
              height={80}
              className="rounded-2xl border border-border shadow-sm"
              referrerPolicy="no-referrer"
            />
          )}
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">{exchange.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-secondary text-secondary-foreground">
                {exchange.category}
              </span>
              <span>Module: {exchange.module}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <a
            href={`https://defillama.com/protocol/${exchange.name.toLowerCase().replace(/\s+/g, '-')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-6"
          >
            View on DeFiLlama
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4 mb-16">
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">24h Volume</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500">
            {formatCurrency(exchange.total24h)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">7d Volume</h3>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono">
            {formatCurrency(exchange.total7d)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">30d Volume</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono">
            {formatCurrency(exchange.total30d)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">All Time Volume</h3>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono">
            {formatCurrency(exchange.totalAllTime)}
          </div>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Supported Chains</h2>
            <div className="flex flex-wrap gap-2">
              {exchange.chains.map(chain => (
                <span key={chain} className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-secondary text-secondary-foreground">
                  {chain}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Top Markets on {exchange.name}</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-8 text-center text-muted-foreground">
                <p>Market data for individual exchanges is currently being aggregated.</p>
                <p className="text-sm mt-2">Check back soon for detailed order books and price charts.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-4">About {exchange.name}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {exchange.name} is a decentralized perpetual exchange operating in the {exchange.category} category.
              It currently supports trading across {exchange.chains.length} chain(s) and has processed {formatCurrency(exchange.totalAllTime)} in all-time volume.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
