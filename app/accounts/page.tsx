'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Wallet, ArrowRight } from 'lucide-react';

export default function AccountsPage() {
  const [address, setAddress] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      router.push(`/accounts/${address.trim()}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-screen-md">
      <div className="flex flex-col items-center text-center mb-12">
        <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-6">
          <Wallet className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">Cross-Exchange Account Search</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Enter an EVM address to view positions, balances, and history across all supported decentralized perpetual exchanges.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter EVM Address (0x...)"
              className="flex h-14 w-full rounded-lg border border-input bg-background px-4 py-2 text-lg shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 pl-12"
              required
              pattern="^0x[a-fA-F0-9]{40}$"
              title="Please enter a valid EVM address starting with 0x"
            />
          </div>
          <button
            type="submit"
            disabled={!address.trim()}
            className="inline-flex items-center justify-center rounded-lg text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-14 px-8 w-full sm:w-auto sm:self-end"
          >
            Search Account
            <ArrowRight className="ml-2 h-5 w-5" />
          </button>
        </form>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold mb-2">Supported Exchanges</h3>
          <p className="text-sm text-muted-foreground mb-4">
            We currently track positions and balances on Hyperliquid. More exchanges coming soon.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Hyperliquid'].map(ex => (
              <span key={ex} className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-secondary text-secondary-foreground">
                {ex}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold mb-2">What you can see</h3>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Open positions and unrealized PnL</li>
            <li>Account balances and margin usage</li>
            <li>Recent trade history and liquidations</li>
            <li>Cross-exchange portfolio overview</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
