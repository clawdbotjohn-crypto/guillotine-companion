import { UNAVAILABLE_BIDDING_TEAM_STATUS, type BiddingTeamStatus } from '../logic';

const BIDDING_TEAM_STATUS_STYLES: Record<BiddingTeamStatus['kind'], { name: string; badge: string }> = {
  eliminated: { name: 'text-[#9ca3af] line-through decoration-[#8b8eac]', badge: 'border-[#6b7280]/60 bg-[#374151]/35 text-[#d1d5db]' },
  safe: { name: 'text-[#6ee7b7]', badge: 'border-[#10b981]/35 bg-[#064e3b]/25 text-[#6ee7b7]' },
  warning: { name: 'text-[#fbbf24]', badge: 'border-[#f59e0b]/35 bg-[#78350f]/20 text-[#fbbf24]' },
  danger: { name: 'text-[#fb7185]', badge: 'border-[#f43f5e]/35 bg-[#881337]/20 text-[#fb7185]' },
  unavailable: { name: 'text-[#9ca3c7]', badge: 'border-[#6b6e99]/35 bg-[#1a1e3a]/45 text-[#9ca3c7]' },
};

export function BiddingTeamIdentity({
  name,
  status,
}: {
  name: string;
  status?: BiddingTeamStatus;
}) {
  const resolved = status ?? UNAVAILABLE_BIDDING_TEAM_STATUS;
  const style = BIDDING_TEAM_STATUS_STYLES[resolved.kind];
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5" data-bidding-team-status={resolved.kind}>
      <span className={`min-w-0 ${style.name}`} data-testid="bidding-team-name">{name}</span>
      <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide no-underline ${style.badge}`}>
        {resolved.label}
      </span>
    </span>
  );
}
