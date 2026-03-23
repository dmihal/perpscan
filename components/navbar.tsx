import Link from 'next/link';
import { Activity, Menu } from 'lucide-react';
import GlobalSearch from '@/components/GlobalSearch';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center mx-auto px-4">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">
              Perp Scan
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/exchanges"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Exchanges
            </Link>
            <Link
              href="/markets"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Markets
            </Link>
            <Link
              href="/accounts"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Accounts
            </Link>
          </nav>
        </div>
        <button className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 py-2 mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </button>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <GlobalSearch />
        </div>
      </div>
    </header>
  );
}
