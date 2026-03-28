import type { VenueMarket, ChartDataPoint } from '../api';

export async function getParadexMarkets(): Promise<VenueMarket[]> {
  try {
    const res = await fetch('https://api.prod.paradex.trade/v1/markets/summary?market=ALL', {
      next: { revalidate: 60 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results: any[] = data.results || [];

    return results.map((m: any) => {
      const markPrice = parseFloat(m.mark_price || "0");
      const bid = parseFloat(m.bid || "0");
      const ask = parseFloat(m.ask || "0");
      const spread = markPrice > 0 && ask > 0 && bid > 0 ? ((ask - bid) / markPrice) * 100 : undefined;
      const coin = m.symbol.replace('-USD-PERP', '');

      return {
        id: `paradex-${coin.toLowerCase()}`,
        venue: 'Paradex',
        symbol: `${coin}-USD`,
        price: markPrice,
        volume24h: parseFloat(m.volume_24h || "0"),
        openInterest: parseFloat(m.open_interest || "0") * markPrice,
        spread: spread === undefined ? undefined : Math.abs(spread),
        fundingRate: parseFloat(m.funding_rate || "0") * 100,
      };
    });
  } catch (error) {
    console.error('Paradex markets error:', error);
    return [];
  }
}

export async function getParadexCandles(coin: string, days: number = 30): Promise<ChartDataPoint[]> {
  try {
    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60 * 1000;
    const res = await fetch(
      `https://api.prod.paradex.trade/v1/markets/klines?symbol=${coin}-USD-PERP&resolution=60&start_at=${startTime}&end_at=${endTime}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const candles: number[][] = data.results || [];
    // Take daily samples (every 24 entries for hourly candles)
    return candles.filter((_, i) => i % 24 === 0).map(c => ({
      date: new Date(c[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: c[4], // close price
    }));
  } catch {
    return [];
  }
}

export async function getParadexFundingHistory(coin: string, days: number = 30): Promise<ChartDataPoint[]> {
  try {
    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60 * 1000;
    const res = await fetch(
      `https://api.prod.paradex.trade/v1/markets/funding-data?market=${coin}-USD-PERP&start_at=${startTime}&end_at=${endTime}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const entries: { created_at: number; funding_rate: string }[] = data.results || [];
    return entries.map(e => ({
      date: new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }),
      value: parseFloat(e.funding_rate) * 100,
    }));
  } catch {
    return [];
  }
}
