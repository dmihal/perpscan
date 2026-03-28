// Re-export exchange-specific modules
export { getHyperliquidContexts, getHyperliquidSpotMeta, getHyperliquidMarkets, getHyperliquidAccount, getHyperliquidFills, getHyperliquidLedgerUpdates, getHyperliquidCandles, getHyperliquidFundingHistory } from './exchanges/hyperliquid';
export type { Fill, LedgerDelta, LedgerUpdate } from './exchanges/hyperliquid';

export { isDydxAddress, getDydxMarkets, getDydxExchangeStats, getDydxSubaccounts, getDydxPositions, getDydxBalance, getDydxFills, getDydxTransfers, getDydxCandles, getDydxFundingHistory } from './exchanges/dydx';
export type { DydxSubaccount, DydxPerpetualPosition, DydxAssetPosition, DydxFill, DydxTransfer } from './exchanges/dydx';

export { getLighterMarkets, getLighterExchangeStats, getLighterMarketSpread, getLighterSubAccounts, getLighterAccounts, getLighterAccountLogs, getLighterLog, getLighterLogsForAddress, getLighterAssetPriceMap, getLeverageFromMarginFraction } from './exchanges/lighter';
export type { LighterSubAccount, LighterAccountAsset, LighterAccountPosition, LighterAccount, LighterExplorerLog } from './exchanges/lighter';

export { getParadexMarkets, getParadexCandles, getParadexFundingHistory } from './exchanges/paradex';

export { getOstiumMarkets, getOstiumExchangeStats, getOstiumPositions, getOstiumTradeHistory, getOstiumTradeById, getOstiumOrderByTxHash } from './exchanges/ostium';
export type { OstiumPosition, OstiumTradeHistoryEntry } from './exchanges/ostium';

// Shared types

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
  marketId?: number;
  maxLeverage?: number;
  makerFee?: number;
  takerFee?: number;
  tradingHours?: string;
  reduceOnly?: boolean;
  fundingIntervalHours?: number;
  isHip3?: boolean;
  onlyIsolated?: boolean;
}

export interface ChartDataPoint {
  date: string;
  value: number;
}

// Aggregation functions

import { getHyperliquidContexts } from './exchanges/hyperliquid';
import { getHyperliquidMarkets } from './exchanges/hyperliquid';
import { getLighterExchangeStats } from './exchanges/lighter';
import { getParadexMarkets } from './exchanges/paradex';
import { getLighterMarkets } from './exchanges/lighter';
import { getOstiumMarkets } from './exchanges/ostium';
import { getOstiumExchangeStats } from './exchanges/ostium';
import { getDydxMarkets } from './exchanges/dydx';
import { getDydxExchangeStats } from './exchanges/dydx';

export async function getExchangeVolumeHistory(id: string): Promise<ChartDataPoint[]> {
  try {
    const res = await fetch(
      `https://api.llama.fi/summary/derivatives/${id}?dataType=dailyVolume`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const chart: [number, number][] = data.totalDataChart || [];
    return chart.slice(-30).map(([ts, val]) => ({
      date: new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: val,
    }));
  } catch {
    return [];
  }
}

export async function getAllVenueMarkets(): Promise<VenueMarket[]> {
  try {
    const [hlMarkets, paradexMarkets, lighterMarkets, ostiumMarkets, dydxMarkets] = await Promise.all([
      getHyperliquidMarkets(),
      getParadexMarkets(),
      getLighterMarkets(),
      getOstiumMarkets(),
      getDydxMarkets(),
    ]);

    const markets = [...hlMarkets, ...paradexMarkets, ...lighterMarkets, ...ostiumMarkets, ...dydxMarkets];
    return markets.sort((a, b) => b.volume24h - a.volume24h);
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getTopExchanges(): Promise<Protocol[]> {
  try {
    const [res, hlData, lighterStats, ostiumStats, dydxStats] = await Promise.all([
      fetch('https://api.llama.fi/overview/derivatives?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume', {
        next: { revalidate: 3600 }
      }),
      getHyperliquidContexts(),
      getLighterExchangeStats(),
      getOstiumExchangeStats(),
      getDydxExchangeStats(),
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
    
    const protocols: Protocol[] = data.protocols || [];
    const sortedProtocols = [...protocols].sort((a, b) => (b.total24h || 0) - (a.total24h || 0));
    const selectedProtocols = sortedProtocols.slice(0, 10);
    const lighterProtocol = protocols.find(
      p => p.name.toLowerCase() === 'lighter' || p.defillamaId?.toLowerCase() === 'lighter'
    );

    if (lighterProtocol && !selectedProtocols.some(p => p.name.toLowerCase() === 'lighter' || p.defillamaId?.toLowerCase() === 'lighter')) {
      selectedProtocols.push(lighterProtocol);
    }

    if (!lighterProtocol && lighterStats.marketCount > 0) {
      selectedProtocols.push({
        defillamaId: 'lighter',
        name: 'Lighter',
        displayName: 'Lighter',
        module: 'lighter',
        category: 'Derivatives',
        logo: '',
        chains: ['Ethereum'],
        total24h: lighterStats.total24h,
        total7d: 0,
        total30d: 0,
        totalAllTime: 0,
      });
    }

    const ostiumProtocol = protocols.find(
      p => p.name.toLowerCase() === 'ostium' || p.defillamaId?.toLowerCase() === 'ostium'
    );

    if (ostiumProtocol && !selectedProtocols.some(p => p.name.toLowerCase() === 'ostium' || p.defillamaId?.toLowerCase() === 'ostium')) {
      selectedProtocols.push(ostiumProtocol);
    }

    if (!ostiumProtocol && ostiumStats.marketCount > 0) {
      selectedProtocols.push({
        defillamaId: 'ostium',
        name: 'Ostium',
        displayName: 'Ostium',
        module: 'ostium',
        category: 'Derivatives',
        logo: '',
        chains: ['Arbitrum'],
        total24h: ostiumStats.total24h,
        total7d: 0,
        total30d: 0,
        totalAllTime: 0,
      });
    }

    const dydxProtocol = protocols.find(
      p => p.name.toLowerCase().includes('dydx') || p.defillamaId?.toLowerCase().includes('dydx')
    );

    if (dydxProtocol && !selectedProtocols.some(p => p.name.toLowerCase().includes('dydx') || p.defillamaId?.toLowerCase().includes('dydx'))) {
      selectedProtocols.push(dydxProtocol);
    }

    if (!dydxProtocol && dydxStats.marketCount > 0) {
      selectedProtocols.push({
        defillamaId: 'dydx',
        name: 'dYdX',
        displayName: 'dYdX',
        module: 'dydx',
        category: 'Derivatives',
        logo: '',
        chains: ['dYdX Chain'],
        total24h: dydxStats.total24h,
        total7d: 0,
        total30d: 0,
        totalAllTime: 0,
      });
    }

    return selectedProtocols
      .map(p => {
        const isHL = p.name.toLowerCase() === 'hyperliquid' || p.defillamaId === 'hyperliquid' || p.defillamaId === '5507';
        const isLighter = p.name.toLowerCase() === 'lighter' || p.defillamaId?.toLowerCase() === 'lighter';
        if (isHL) {
          return {
            ...p,
            defillamaId: 'hyperliquid',
            total24h: (hlData && hlVolume > 0) ? hlVolume : p.total24h,
            openInterest: hlData ? hlOI : (p.total24h || 0) * (0.2 + Math.random() * 0.8),
            avgSpread: (hlData && hlSpreadCount > 0) ? (hlSpreadSum / hlSpreadCount) * 100 : 0.02
          };
        }
        if (isLighter) {
          return {
            ...p,
            defillamaId: 'lighter',
            name: 'Lighter',
            displayName: 'Lighter',
            module: p.module || 'lighter',
            category: p.category || 'Derivatives',
            chains: p.chains?.length ? p.chains : ['Ethereum'],
            total24h: lighterStats.total24h || p.total24h,
            total7d: p.total7d || 0,
            total30d: p.total30d || 0,
            totalAllTime: p.totalAllTime || 0,
            openInterest: lighterStats.openInterest,
            avgSpread: lighterStats.marketCount > 0 ? lighterStats.avgSpread / lighterStats.marketCount : 0,
          };
        }
        const isOstium = p.name.toLowerCase() === 'ostium' || p.defillamaId?.toLowerCase() === 'ostium';
        if (isOstium) {
          return {
            ...p,
            defillamaId: 'ostium',
            name: 'Ostium',
            displayName: 'Ostium',
            module: p.module || 'ostium',
            category: p.category || 'Derivatives',
            chains: p.chains?.length ? p.chains : ['Arbitrum'],
            total24h: ostiumStats.total24h || p.total24h,
            total7d: p.total7d || 0,
            total30d: p.total30d || 0,
            totalAllTime: p.totalAllTime || 0,
            openInterest: ostiumStats.openInterest,
            avgSpread: ostiumStats.marketCount > 0 ? ostiumStats.avgSpread / ostiumStats.marketCount : 0,
          };
        }
        const isDydx = p.name.toLowerCase().includes('dydx') || p.defillamaId?.toLowerCase().includes('dydx');
        if (isDydx) {
          return {
            ...p,
            defillamaId: 'dydx',
            name: 'dYdX',
            displayName: 'dYdX',
            module: p.module || 'dydx',
            category: p.category || 'Derivatives',
            chains: p.chains?.length ? p.chains : ['dYdX Chain'],
            total24h: dydxStats.total24h || p.total24h,
            total7d: p.total7d || 0,
            total30d: p.total30d || 0,
            totalAllTime: p.totalAllTime || 0,
            openInterest: dydxStats.openInterest,
            avgSpread: 0,
          };
        }
        return {
          ...p,
          openInterest: (p.total24h || 0) * (0.2 + Math.random() * 0.8),
          avgSpread: 0.01 + Math.random() * 0.05
        };
      })
      .filter((protocol, index, list) => list.findIndex(item => item.defillamaId === protocol.defillamaId) === index)
      .sort((a, b) => (b.total24h || 0) - (a.total24h || 0));
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
