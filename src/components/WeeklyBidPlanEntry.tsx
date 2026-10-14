import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Card } from './ui';

export function WeeklyBidPlanEntry({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full text-left mb-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]"
      aria-label="Open your weekly bid plan"
    >
      <Card hover className="p-4 border-[#6366f1]/35 bg-gradient-to-br from-[#11132c] to-[#0b0c1d]">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6366f1]/15 text-[#a5b4fc]">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-['Orbitron'] text-xs font-bold uppercase tracking-[0.08em] text-[#f0f0ff]">
              Your Weekly Bid Plan
            </span>
            <span className="mt-1 block text-xs leading-5 text-[#8b8eb8]">
              Personalized add, drop, and bid scenarios for the next waiver run.
            </span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#10b981]">
              Read-only advisory
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[#818cf8]" aria-hidden="true" />
        </div>
      </Card>
    </button>
  );
}
