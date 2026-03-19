import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Search } from 'lucide-react';
import { getTopExchanges } from '@/lib/api';

export default async function ExchangesPage() {
  const exchanges = await getTopExchanges();

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '$0.00';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exchanges</h1>
          <p className="text-muted-foreground mt-1">
            Browse and compare decentralized perpetual exchanges.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search exchanges..."
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-8"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Exchange</th>
                <th className="px-6 py-4 font-medium">Chains</th>
                <th className="px-6 py-4 font-medium text-right">24h Volume</th>
                <th className="px-6 py-4 font-medium text-right">7d Volume</th>
                <th className="px-6 py-4 font-medium text-right">30d Volume</th>
                <th className="px-6 py-4 font-medium text-right">All Time Volume</th>
                <th className="px-6 py-4 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {exchanges.map((exchange) => (
                <tr key={exchange.defillamaId} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/exchanges/${exchange.defillamaId}`} className="flex items-center gap-3">
                      {exchange.logo && (
                        <Image
                          src={exchange.logo}
                          alt={exchange.name}
                          width={32}
                          height={32}
                          className="rounded-full"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div>
                        <div className="font-medium text-base">{exchange.name}</div>
                        <div className="text-xs text-muted-foreground">{exchange.category}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {exchange.chains.slice(0, 3).map(chain => (
                        <span key={chain} className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-secondary text-secondary-foreground">
                          {chain}
                        </span>
                      ))}
                      {exchange.chains.length > 3 && (
                        <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-secondary text-secondary-foreground">
                          +{exchange.chains.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">
                    {formatCurrency(exchange.total24h)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                    {formatCurrency(exchange.total7d)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                    {formatCurrency(exchange.total30d)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                    {formatCurrency(exchange.totalAllTime)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/exchanges/${exchange.defillamaId}`}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      <span className="sr-only">View {exchange.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
