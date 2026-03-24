import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { getMarket, getAllVenueMarkets, getHyperliquidCandles, getHyperliquidFundingHistory, ChartDataPoint } from '@/lib/api';
import PriceLineChart from '@/components/PriceLineChart';
import FundingRateChart from '@/components/FundingRateChart';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  const coin = symbol.toUpperCase();
  return {
    title: `${coin} Perpetual Markets — Perp Scan`,
    description: `Compare ${coin}-USD perpetual markets across decentralized exchanges with funding rates, volume, and open interest.`,
  };
}

export default async function AssetPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const coin = symbol.toUpperCase();

  const [spotData, allMarkets, priceHistory, fundingHistory] = await Promise.all([
    getMarket(symbol),
    getAllVenueMarkets(),
    getHyperliquidCandles(coin),
    getHyperliquidFundingHistory(coin),
  ]);

  const matchingMarkets = allMarkets.filter(
    m => m.symbol.toLowerCase() === `${coin.toLowerCase()}-usd`
  );

  if (!spotData && matchingMarkets.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Asset Not Found</h1>
        <p className="text-muted-foreground mb-8">Could not find data for {coin}.</p>
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

      <div className="flex items-center gap-6 mb-12">
        {spotData?.image && (
          <Image
            src={spotData.image}
            alt={spotData.name || coin}
            width={80}
            height={80}
            className="rounded-full border border-border shadow-sm"
            referrerPolicy="no-referrer"
          />
        )}
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{spotData?.name || coin}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground uppercase">
              {coin}-USD PERP
            </span>
            {spotData && (
              <span className="font-mono">
                Spot: ${spotData.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
              </span>
            )}
            {spotData && (
              <span className={`font-mono ${spotData.price_change_percentage_24h >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                {spotData.price_change_percentage_24h >= 0 ? '+' : ''}{spotData.price_change_percentage_24h?.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Perpetual Markets by Exchange</h2>
        {matchingMarkets.length > 0 ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">Exchange</th>
                    <th className="px-6 py-4 font-medium text-right">Mark Price</th>
                    <th className="px-6 py-4 font-medium text-right">24h Volume</th>
                    <th className="px-6 py-4 font-medium text-right">Open Interest</th>
                    <th className="px-6 py-4 font-medium text-right">Funding Rate</th>
                    <th className="px-6 py-4 font-medium text-right">Spread</th>
                    <th className="px-6 py-4 font-medium text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {matchingMarkets.map(market => (
                    <tr key={market.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        <Link href={`/exchanges/${market.venue.toLowerCase()}`} className="hover:underline">
                          {market.venue}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        ${market.price.toLocaleString(undefined, { minimumFractionDigits: market.price < 1 ? 4 : 2, maximumFractionDigits: market.price < 1 ? 6 : 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {formatCurrency(market.volume24h)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {formatCurrency(market.openInterest)}
                      </td>
                      <td className={`px-6 py-4 text-right font-mono ${market.fundingRate >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                        {market.fundingRate >= 0 ? '+' : ''}{market.fundingRate.toFixed(4)}%
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                        {market.spread.toFixed(4)}%
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/exchanges/${market.venue.toLowerCase()}/markets/${symbol}`}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                          <span className="sr-only">View on {market.venue}</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            <p>No perpetual markets found for {coin} across integrated exchanges.</p>
          </div>
        )}
      </section>

      <div className="grid gap-8 md:grid-cols-2">
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
