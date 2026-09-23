import { TriangleAlert } from 'lucide-react';
import type { HubByeWarning } from '../logic/hubRoster';

export function HubByeWarnings({ warnings }: { warnings: readonly HubByeWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <section
      aria-labelledby="hub-bye-warnings-heading"
      className="mb-3"
      data-testid="hub-bye-warnings"
    >
      <h2 id="hub-bye-warnings-heading" className="sr-only">Upcoming bye warnings</h2>
      <ul className="space-y-2">
        {warnings.map((warning) => {
          const teamContext = warning.team
            ? `${warning.position} · ${warning.team}`
            : warning.position;

          return (
            <li
              key={warning.playerId}
              className={warning.isStarter
                ? 'flex items-start gap-2.5 rounded-lg border border-[rgba(245,158,11,0.45)] border-l-[3px] bg-[rgba(245,158,11,0.09)] px-3 py-2.5'
                : 'flex items-start gap-2.5 rounded-lg border border-[#2a2e55] border-l-[3px] bg-[rgba(22,26,58,0.72)] px-3 py-2.5'}
              data-testid={`bye-warning-${warning.playerId}`}
            >
              <TriangleAlert
                aria-hidden="true"
                className={`mt-0.5 h-4 w-4 shrink-0 ${warning.isStarter ? 'text-[#f59e0b]' : 'text-[#6b6e99]'}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className={warning.isStarter
                    ? 'text-[9px] font-bold uppercase tracking-[0.14em] text-[#f59e0b]'
                    : 'text-[9px] font-bold uppercase tracking-[0.14em] text-[#6b6e99]'}>
                    {warning.isStarter ? 'Starter bye · Action needed' : 'Bench bye'}
                  </span>
                  <span className="text-[9px] uppercase tracking-wide text-[#4a4d77]">
                    {teamContext}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-5 text-[#d9dafe]">
                  <span className="font-semibold text-[#f0f0ff]">{warning.name}</span>
                  {' is on bye in '}
                  <span className="whitespace-nowrap font-['Space_Mono'] font-bold text-[#a5b4fc]">
                    NFL Week {warning.byeWeek}
                  </span>
                  <span className="text-[#8b8eb8]">
                    {warning.isStarter ? ' — plan a replacement.' : ' — check your depth.'}
                  </span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
