import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getMarket, getAllVenueMarkets, getHyperliquidCandles, getHyperliquidFundingHistory } from '@/lib/api';
import PriceLineChart from '@/components/PriceLineChart';
import FundingRateChart from '@/components/FundingRateChart';
import AssetMarketsTable from '@/components/AssetMarketsTable';

export const revalidate = 60;

function matchesAssetSymbol(marketSymbol: string, routeSymbol: string) {
  const normalizedMarket = marketSymbol.toLowerCase();
  const normalizedRoute = routeSymbol.toLowerCase();
  return normalizedMarket === normalizedRoute || normalizedMarket === `${normalizedRoute}-usd`;
}

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
    m => matchesAssetSymbol(m.symbol, symbol)
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
          <AssetMarketsTable markets={matchingMarkets} symbol={symbol} />
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
