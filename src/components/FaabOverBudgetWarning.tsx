import { TriangleAlert } from 'lucide-react';

export const FAAB_OVER_BUDGET_MESSAGE =
  'More than your FAAB remaining; this bid is not currently possible.';

/** Accessible warning shown without changing the underlying recommendation. */
export function FaabOverBudgetWarning() {
  return (
    <span
      role="img"
      tabIndex={0}
      aria-label={FAAB_OVER_BUDGET_MESSAGE}
      title={FAAB_OVER_BUDGET_MESSAGE}
      className="group relative inline-flex rounded-sm text-[#f59e0b] outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b]"
    >
      <TriangleAlert size={15} aria-hidden="true" />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 w-52 rounded-md border border-[#4a3a1a] bg-[#0e1025] px-2.5 py-2 text-left text-[10px] font-normal normal-case tracking-normal text-[#f0f0ff] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100"
      >
        {FAAB_OVER_BUDGET_MESSAGE}
      </span>
    </span>
  );
}
