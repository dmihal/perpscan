'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';

interface SearchItem {
  type: 'exchange' | 'market' | 'account';
  label: string;
  sublabel?: string;
  href: string;
}

interface SearchData {
  exchanges: { name: string; defillamaId: string }[];
  markets: { symbol: string; venue: string }[];
}

export default function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [data, setData] = useState<SearchData | null>(null);

  useEffect(() => {
    fetch('/api/search-data')
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getResults = useCallback((): SearchItem[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const results: SearchItem[] = [];

    if (q.startsWith('0x') && q.length >= 6) {
      results.push({
        type: 'account',
        label: q.length > 20 ? `${q.slice(0, 10)}...${q.slice(-8)}` : q,
        sublabel: 'Look up account',
        href: `/accounts/${q}`,
      });
    }

    if (data) {
      const exchangeMatches = data.exchanges
        .filter(ex => ex.name.toLowerCase().includes(q))
        .slice(0, 5);
      for (const ex of exchangeMatches) {
        results.push({
          type: 'exchange',
          label: ex.name,
          sublabel: 'Exchange',
          href: `/exchanges/${ex.defillamaId}`,
        });
      }

      const seen = new Set<string>();
      const marketMatches = data.markets
        .filter(m => m.symbol.toLowerCase().includes(q))
        .slice(0, 10);
      for (const m of marketMatches) {
        const sym = m.symbol.split('-')[0].toLowerCase();
        if (!seen.has(sym)) {
          seen.add(sym);
          results.push({
            type: 'market',
            label: m.symbol,
            sublabel: 'Asset',
            href: `/assets/${sym}`,
          });
        }
      }
    }

    return results.slice(0, 12);
  }, [query, data]);

  const results = getResults();

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      router.push(results[selectedIndex].href);
      setQuery('');
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const typeLabels: Record<string, string> = {
    account: 'Accounts',
    exchange: 'Exchanges',
    market: 'Assets',
  };

  const groupedResults: { type: string; items: { item: SearchItem; globalIndex: number }[] }[] = [];
  let globalIndex = 0;
  for (const type of ['account', 'exchange', 'market']) {
    const items = results
      .map((item, i) => ({ item, globalIndex: i }))
      .filter(({ item }) => item.type === type);
    if (items.length > 0) {
      groupedResults.push({ type, items });
    }
    globalIndex += items.length;
  }

  return (
    <div ref={containerRef} className="relative w-full md:w-auto md:flex-none">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        placeholder="Search... (press /)"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
      />
      {open && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden z-50 min-w-[300px]">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            <div className="py-1">
              {groupedResults.map(group => (
                <div key={group.type}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                    {typeLabels[group.type]}
                  </div>
                  {group.items.map(({ item, globalIndex: gi }) => (
                    <button
                      key={gi}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        router.push(item.href);
                        setQuery('');
                        setOpen(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(gi)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                        gi === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-foreground'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
