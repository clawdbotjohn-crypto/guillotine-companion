import { ArrowRight, BadgeDollarSign } from 'lucide-react';

export function WeeklyBidPlanEntry({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open Suggested Bids"
      className="mb-4 flex min-h-16 w-full items-center gap-3 rounded-xl border border-[#d6a63d]/60 bg-[#6b4d12]/20 px-3 py-2.5 text-left shadow-[0_8px_28px_rgba(214,166,61,0.10)] transition-colors hover:border-[#f0c45a]/80 hover:bg-[#6b4d12]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0c45a]"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#d6a63d]/15 text-[#f0c45a]">
        <BadgeDollarSign className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 font-['Orbitron'] text-sm font-bold uppercase tracking-[0.08em] text-[#fff4ca]">
        Suggested Bids
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[#f0c45a]" aria-hidden="true" />
    </button>
  );
}
