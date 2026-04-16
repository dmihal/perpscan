import type { HyperliquidUserFees, VaultEquity } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

function fmtRate(r: string) {
  return `${(parseFloat(r) * 100).toFixed(4)}%`;
}

function FeeStat({ label, value, base }: { label: string; value: string; base: string }) {
  const isBase = value === base;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm font-semibold ${isBase ? '' : 'text-emerald-500'}`}>
        {fmtRate(value)}
      </span>
    </div>
  );
}

export function HyperliquidVenueCard({
  fees,
  vaults,
}: {
  fees: HyperliquidUserFees | null;
  vaults: VaultEquity[];
}) {
  const hasVaults = vaults.length > 0;
  const referralDiscount = fees ? parseFloat(fees.activeReferralDiscount) : 0;
  const stakingDiscount = fees ? parseFloat(fees.activeStakingDiscount.discount) : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-6">
      <h3 className="font-semibold text-base flex items-center gap-2">
        Hyperliquid
      </h3>

      {fees && (
        <div>
          <p className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide text-xs">Fee Tier</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FeeStat label="Perp Taker" value={fees.userCrossRate} base={fees.feeSchedule.cross} />
            <FeeStat label="Perp Maker" value={fees.userAddRate} base={fees.feeSchedule.add} />
            <FeeStat label="Spot Taker" value={fees.userSpotCrossRate} base={fees.feeSchedule.spotCross} />
            <FeeStat label="Spot Maker" value={fees.userSpotAddRate} base={fees.feeSchedule.spotAdd} />
          </div>
          {(referralDiscount > 0 || stakingDiscount > 0) && (
            <div className="flex gap-3 mt-3">
              {referralDiscount > 0 && (
                <span className="text-xs bg-emerald-500/10 text-emerald-500 rounded-full px-2 py-0.5">
                  {(referralDiscount * 100).toFixed(0)}% referral discount
                </span>
              )}
              {stakingDiscount > 0 && (
                <span className="text-xs bg-emerald-500/10 text-emerald-500 rounded-full px-2 py-0.5">
                  {(stakingDiscount * 100).toFixed(0)}% staking discount
                </span>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Base tier — VIP tiers start at {formatCurrency(parseFloat(fees.feeSchedule.tiers.vip[0]?.ntlCutoff ?? '0'))} 30-day volume
          </p>
        </div>
      )}

      {hasVaults && (
        <div>
          <p className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide text-xs">Vault Positions</p>
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {vaults.map((v) => (
              <div key={v.vault} className="flex items-center justify-between px-4 py-3 text-sm">
                <a
                  href={`https://app.hyperliquid.xyz/vaults/${v.vault}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-mono text-xs"
                >
                  {v.vault.slice(0, 10)}…{v.vault.slice(-6)}
                </a>
                <span className="font-mono font-semibold">{formatCurrency(parseFloat(v.equity))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
