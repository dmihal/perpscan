import Link from 'next/link';
import { ArrowRight, TrendingUp, BarChart3, Shield } from 'lucide-react';
import { getAllVenueMarkets, getTopExchanges, getTopMarkets } from '@/lib/api';
import HomepageExchangesTable from '@/components/HomepageExchangesTable';
import HomepageMarketsTable from '@/components/HomepageMarketsTable';

export const revalidate = 60;

export default async function Home() {
  const [exchanges, markets, venueMarkets] = await Promise.all([
    getTopExchanges(),
    getTopMarkets(),
    getAllVenueMarkets(),
  ]);

  const integratedVenueCount = new Set(venueMarkets.map((market) => market.venue)).size;

  const fmt = (value: number | undefined) => {
    if (value == null) return 'N/A';
    if (value === 0) return '$0.00';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
      {/* Stats Grid */}
      <section className="grid gap-4 md:grid-cols-3 mb-12">
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total 24h Volume</h3>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {fmt(exchanges.reduce((acc, ex) => acc + (ex.total24h || 0), 0))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Across {exchanges.length.toLocaleString()} listed exchanges
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Active Markets</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{venueMarkets.length.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Live venue markets loaded
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Integrated Venues</h3>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{integratedVenueCount.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Venues with live market data
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-12">
        {/* Top Exchanges */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold tracking-tight">Top Exchanges</h2>
            <Link href="/exchanges" className="text-sm text-primary hover:underline flex items-center">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <HomepageExchangesTable exchanges={exchanges} />
        </section>

        {/* Top Markets */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold tracking-tight">Top Markets</h2>
            <Link href="/markets" className="text-sm text-primary hover:underline flex items-center">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <HomepageMarketsTable markets={markets.slice(0, 10)} />
        </section>
      </div>
    </div>
  );
}
