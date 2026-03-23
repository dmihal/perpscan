import { NextResponse } from 'next/server';
import { getTopExchanges, getAllVenueMarkets } from '@/lib/api';

export const revalidate = 120;

export async function GET() {
  const [exchanges, markets] = await Promise.all([
    getTopExchanges(),
    getAllVenueMarkets(),
  ]);

  return NextResponse.json({
    exchanges: exchanges.map(ex => ({
      name: ex.name,
      defillamaId: ex.defillamaId,
    })),
    markets: markets.map(m => ({
      symbol: m.symbol,
      venue: m.venue,
    })),
  });
}
