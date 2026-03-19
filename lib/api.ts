export interface Protocol {
  defillamaId: string;
  name: string;
  displayName: string;
  module: string;
  category: string;
  logo: string;
  chains: string[];
  total24h: number;
  total7d: number;
  total30d: number;
  totalAllTime: number;
  openInterest?: number;
  avgSpread?: number;
}

export interface Market {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  avgSpread?: number;
}

export async function getTopExchanges(): Promise<Protocol[]> {
  try {
    const res = await fetch('https://api.llama.fi/overview/derivatives?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume', {
      next: { revalidate: 3600 }
    });
    if (!res.ok) throw new Error('Failed to fetch exchanges');
    const data = await res.json();
    
    // Filter out non-exchanges or sort by volume
    const protocols: Protocol[] = data.protocols || [];
    return protocols
      .sort((a, b) => (b.total24h || 0) - (a.total24h || 0))
      .slice(0, 10)
      .map(p => ({
        ...p,
        // Mocking Open Interest and Avg Spread for UI purposes
        openInterest: (p.total24h || 0) * (0.2 + Math.random() * 0.8),
        avgSpread: 0.01 + Math.random() * 0.05
      }));
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getTopMarkets(): Promise<Market[]> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false', {
      next: { revalidate: 3600 }
    });
    if (!res.ok) throw new Error('Failed to fetch markets');
    const markets: Market[] = await res.json();
    return markets.map(m => ({
      ...m,
      // Mocking Avg Spread for UI purposes
      avgSpread: 0.005 + Math.random() * 0.04
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
}
