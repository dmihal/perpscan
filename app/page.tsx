import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, TrendingUp, Activity, BarChart3, Shield } from 'lucide-react';
import { getTopExchanges, getTopMarkets } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [exchanges, markets] = await Promise.all([
    getTopExchanges(),
    getTopMarkets(),
  ]);

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '$0.00';
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
            {formatCurrency(exchanges.reduce((acc, ex) => acc + (ex.total24h || 0), 0))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Across top 10 exchanges
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Active Markets</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">1,204+</div>
          <p className="text-xs text-muted-foreground mt-1">
            Trading pairs available
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Tracked DEXs</h3>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">54</div>
          <p className="text-xs text-muted-foreground mt-1">
            Protocols integrated
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
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium">Exchange</th>
                    <th className="px-4 py-3 font-medium text-right">Open Interest</th>
                    <th className="px-4 py-3 font-medium text-right">24h Volume</th>
                    <th className="px-4 py-3 font-medium text-right">7d Volume</th>
                    <th className="px-4 py-3 font-medium text-right">Avg Spread</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {exchanges.map((exchange) => (
                    <tr key={exchange.defillamaId} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/exchanges/${exchange.defillamaId}`} className="flex items-center gap-3">
                          {exchange.logo && (
                            <Image
                              src={exchange.logo}
                              alt={exchange.name}
                              width={24}
                              height={24}
                              className="rounded-full"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <span className="font-medium">{exchange.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {formatCurrency(exchange.openInterest)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {formatCurrency(exchange.total24h)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                        {formatCurrency(exchange.total7d)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                        {exchange.avgSpread?.toFixed(3)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Top Markets */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold tracking-tight">Top Markets</h2>
            <Link href="/markets" className="text-sm text-primary hover:underline flex items-center">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium">Asset</th>
                    <th className="px-4 py-3 font-medium text-right">Price</th>
                    <th className="px-4 py-3 font-medium text-right">24h Change</th>
                    <th className="px-4 py-3 font-medium text-right">Avg Spread</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {markets.slice(0, 10).map((market) => (
                    <tr key={market.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/markets/${market.id}`} className="flex items-center gap-3">
                          {market.image && (
                            <Image
                              src={market.image}
                              alt={market.name}
                              width={24}
                              height={24}
                              className="rounded-full"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="flex flex-col">
                            <span className="font-medium">{market.name}</span>
                            <span className="text-xs text-muted-foreground uppercase">{market.symbol}-USD</span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        ${market.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono text-xs ${market.price_change_percentage_24h >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                        {market.price_change_percentage_24h >= 0 ? '+' : ''}
                        {market.price_change_percentage_24h?.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                        {market.avgSpread?.toFixed(3)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
