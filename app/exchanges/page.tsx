import { getTopExchanges } from '@/lib/api';
import ExchangesTable from '@/components/ExchangesTable';

export const revalidate = 3600;

export default async function ExchangesPage() {
  const exchanges = await getTopExchanges();

  return (
    <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Exchanges</h1>
        <p className="text-muted-foreground mt-1">
          Browse and compare decentralized perpetual exchanges.
        </p>
      </div>
      <ExchangesTable exchanges={exchanges} />
    </div>
  );
}
