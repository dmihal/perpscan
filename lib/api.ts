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

export interface VenueMarket {
  id: string;
  venue: string;
  symbol: string;
  price: number;
  volume24h: number;
  openInterest: number;
  spread: number;
  fundingRate: number;
  isHip3?: boolean;
  onlyIsolated?: boolean;
}

export async function getHyperliquidSpotMeta() {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "spotMeta" }),
      next: { revalidate: 3600 }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function getAllVenueMarkets(): Promise<VenueMarket[]> {
  try {
    const [hlData, spotMeta] = await Promise.all([
      getHyperliquidContexts(),
      getHyperliquidSpotMeta()
    ]);
    if (!hlData || !hlData[0] || !hlData[1]) return [];

    const meta = hlData[0].universe;
    const ctxs = hlData[1];
    
    const spotTokens = new Set<string>();
    if (spotMeta && spotMeta.tokens) {
      spotMeta.tokens.forEach((t: any) => spotTokens.add(t.name));
    }

    const markets: VenueMarket[] = [];

    meta.forEach((m: any, idx: number) => {
      const ctx = ctxs[idx];
      if (ctx) {
        let spread = 0;
        if (ctx.impactPxs && ctx.impactPxs.length === 2 && parseFloat(ctx.midPx) > 0) {
          spread = ((parseFloat(ctx.impactPxs[1]) - parseFloat(ctx.impactPxs[0])) / parseFloat(ctx.midPx)) * 100;
        }

        markets.push({
          id: `hyperliquid-${m.name.toLowerCase()}`,
          venue: 'Hyperliquid',
          symbol: `${m.name}-USD`,
          price: parseFloat(ctx.markPx || "0"),
          volume24h: parseFloat(ctx.dayNtlVlm || "0"),
          openInterest: parseFloat(ctx.openInterest || "0") * parseFloat(ctx.markPx || "0"),
          spread: spread,
          fundingRate: parseFloat(ctx.funding || "0") * 100, // Convert to percentage
          isHip3: spotTokens.has(m.name),
          onlyIsolated: !!m.onlyIsolated
        });
      }
    });

    // Sort by 24h volume descending
    return markets.sort((a, b) => b.volume24h - a.volume24h);
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getHyperliquidContexts() {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      next: { revalidate: 60 }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function getHyperliquidAccount(address: string) {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "clearinghouseState", user: address }),
      next: { revalidate: 10 }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function getTopExchanges(): Promise<Protocol[]> {
  try {
    const [res, hlData] = await Promise.all([
      fetch('https://api.llama.fi/overview/derivatives?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume', {
        next: { revalidate: 3600 }
      }),
      getHyperliquidContexts()
    ]);
    
    if (!res.ok) throw new Error('Failed to fetch exchanges');
    const data = await res.json();
    
    let hlVolume = 0;
    let hlOI = 0;
    let hlSpreadSum = 0;
    let hlSpreadCount = 0;

    if (hlData && hlData[0] && hlData[1]) {
      const ctxs = hlData[1];
      ctxs.forEach((ctx: any) => {
        hlVolume += parseFloat(ctx.dayNtlVlm || "0");
        hlOI += parseFloat(ctx.openInterest || "0") * parseFloat(ctx.markPx || "0");
        if (ctx.impactPxs && ctx.impactPxs.length === 2 && parseFloat(ctx.midPx) > 0) {
           const spread = (parseFloat(ctx.impactPxs[1]) - parseFloat(ctx.impactPxs[0])) / parseFloat(ctx.midPx);
           hlSpreadSum += spread;
           hlSpreadCount++;
        }
      });
    }
    
    // Filter out non-exchanges or sort by volume
    const protocols: Protocol[] = data.protocols || [];
    return protocols
      .sort((a, b) => (b.total24h || 0) - (a.total24h || 0))
      .slice(0, 10)
      .map(p => {
        const isHL = p.name.toLowerCase() === 'hyperliquid' || p.defillamaId === 'hyperliquid' || p.defillamaId === '5507';
        if (isHL) {
          return {
            ...p,
            defillamaId: 'hyperliquid', // Force consistent ID
            total24h: (hlData && hlVolume > 0) ? hlVolume : p.total24h,
            openInterest: hlData ? hlOI : (p.total24h || 0) * (0.2 + Math.random() * 0.8),
            avgSpread: (hlData && hlSpreadCount > 0) ? (hlSpreadSum / hlSpreadCount) * 100 : 0.02
          };
        }
        return {
          ...p,
          // Mocking Open Interest and Avg Spread for UI purposes
          openInterest: (p.total24h || 0) * (0.2 + Math.random() * 0.8),
          avgSpread: 0.01 + Math.random() * 0.05
        };
      });
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getTopMarkets(): Promise<Market[]> {
  try {
    const [res, hlData] = await Promise.all([
      fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false', {
        next: { revalidate: 3600 }
      }),
      getHyperliquidContexts()
    ]);
    if (!res.ok) throw new Error('Failed to fetch markets');
    const markets: Market[] = await res.json();
    
    const hlMap = new Map();
    if (hlData && hlData[0] && hlData[1]) {
      const meta = hlData[0].universe;
      const ctxs = hlData[1];
      meta.forEach((m: any, idx: number) => {
        const ctx = ctxs[idx];
        if (ctx) {
          let spread = 0.01 + Math.random() * 0.05;
          if (ctx.impactPxs && ctx.impactPxs.length === 2 && parseFloat(ctx.midPx) > 0) {
             spread = ((parseFloat(ctx.impactPxs[1]) - parseFloat(ctx.impactPxs[0])) / parseFloat(ctx.midPx)) * 100;
          }
          hlMap.set(m.name.toLowerCase(), {
            volume: parseFloat(ctx.dayNtlVlm || "0"),
            spread: spread
          });
        }
      });
    }

    return markets.map(m => {
      const hlMatch = hlMap.get(m.symbol.toLowerCase());
      return {
        ...m,
        total_volume: hlMatch && hlMatch.volume > 0 ? hlMatch.volume : m.total_volume,
        // Use real HL spread if available, otherwise mock
        avgSpread: hlMatch ? hlMatch.spread : 0.005 + Math.random() * 0.04
      };
    });
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getMarket(id: string): Promise<Market | null> {
  try {
    const topMarkets = await getTopMarkets();
    const found = topMarkets.find(m => m.id === id || m.symbol.toLowerCase() === id.toLowerCase());
    if (found) return found;

    const searchRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${id}`, { next: { revalidate: 3600 } });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    if (!searchData.coins || searchData.coins.length === 0) return null;
    
    const coinId = searchData.coins[0].id;
    
    const [coinRes, hlData] = await Promise.all([
      fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`, { next: { revalidate: 60 } }),
      getHyperliquidContexts()
    ]);
    
    if (!coinRes.ok) return null;
    const coinData = await coinRes.json();
    
    let volume = coinData.market_data?.total_volume?.usd || 0;
    let spread = 0.005 + Math.random() * 0.04;
    
    if (hlData && hlData[0] && hlData[1]) {
      const meta = hlData[0].universe;
      const ctxs = hlData[1];
      const idx = meta.findIndex((m: any) => m.name.toLowerCase() === coinData.symbol.toLowerCase());
      if (idx !== -1 && ctxs[idx]) {
        const ctx = ctxs[idx];
        if (parseFloat(ctx.dayNtlVlm || "0") > 0) {
          volume = parseFloat(ctx.dayNtlVlm);
        }
        if (ctx.impactPxs && ctx.impactPxs.length === 2 && parseFloat(ctx.midPx) > 0) {
          spread = ((parseFloat(ctx.impactPxs[1]) - parseFloat(ctx.impactPxs[0])) / parseFloat(ctx.midPx)) * 100;
        }
      }
    }

    return {
      id: coinData.id,
      symbol: coinData.symbol,
      name: coinData.name,
      image: coinData.image?.small,
      current_price: coinData.market_data?.current_price?.usd || 0,
      market_cap: coinData.market_data?.market_cap?.usd || 0,
      total_volume: volume,
      price_change_percentage_24h: coinData.market_data?.price_change_percentage_24h || 0,
      avgSpread: spread
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}
