import { getTopMarkets, getAllVenueMarkets } from '@/lib/api';
import MarketsTable from '@/components/MarketsTable';
import VenueMarketsTable from '@/components/VenueMarketsTable';

export const dynamic = 'force-dynamic';

export default async function MarketsPage() {
  const [markets, venueMarkets] = await Promise.all([
    getTopMarkets(),
    getAllVenueMarkets(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Markets</h1>
        <p className="text-muted-foreground mt-1">
          Explore perpetual markets across all decentralized exchanges.
        </p>
      </div>

      <MarketsTable markets={markets} />

      <div className="mt-12 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Markets by Venue</h2>
        <p className="text-muted-foreground mt-1">
          Top perpetual markets across all supported venues.
        </p>
      </div>

      <VenueMarketsTable markets={venueMarkets} />
    </div>
  );
}
