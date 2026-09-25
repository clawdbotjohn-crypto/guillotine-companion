import { useState } from 'react';
import { AlertTriangle, BarChart3, Info, RefreshCw } from 'lucide-react';
import type { Roster, SleeperUser } from '../api';
import type { ManagerBiddingProfile } from '../logic';
import { BIDDING_PROFILE_MODEL_V1, predictManagerBid } from '../logic';
import type { WaiverPlayerRow } from '../logic/waivers';
import { Button, Card, Skeleton } from './ui';

interface ManagerBiddingProfilesProps {
  profiles: ManagerBiddingProfile[];
  targetRows: WaiverPlayerRow[];
  rosters: Roster[];
  users: SleeperUser[];
  initialFaab: number;
  hasCanonicalEvidence: boolean;
  isLoading: boolean;
  error: Error | null;
  partialErrorCount?: number;
  onRetry: () => void;
  getPlayerName: (playerId: string) => string;
}

const STYLE_CLASSES = {
  conservative: 'border-[#38bdf8]/30 bg-[#38bdf8]/10 text-[#7dd3fc]',
  standard: 'border-[#a78bfa]/30 bg-[#a78bfa]/10 text-[#c4b5fd]',
  aggressive: 'border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#fbbf24]',
  insufficient: 'border-[#4a4d77]/40 bg-[#161a3a] text-[#8b8eb8]',
} as const;

function money(value: number): string {
  return `$${Math.round(value)}`;
}

function multiplier(value: number | null): string {
  return value == null ? '—' : `${value.toFixed(2)}×`;
}

function managerName(rosterId: number, rosters: Roster[], users: SleeperUser[]): string {
  const roster = rosters.find((row) => row.roster_id === rosterId);
  const user = users.find((row) => row.user_id === roster?.owner_id);
  return user?.display_name || user?.username || `Roster ${rosterId}`;
}

function currentFaab(rosterId: number, rosters: Roster[], initialBudget: number): number {
  const used = rosters.find((row) => row.roster_id === rosterId)?.settings.waiver_budget_used ?? 0;
  return Math.max(0, initialBudget - used);
}

function provenanceLabel(profile: ManagerBiddingProfile, index: number): string {
  const row = profile.evidence[index];
  if (!row.provenance) return 'Unavailable';
  if (row.provenance === 'exact') return 'Exact cutoff';
  if (row.matchesRequestedDecisionWeek === false && row.snapshotDecisionWeek != null) {
    return `Reconstructed · Wk ${row.snapshotDecisionWeek} fallback`;
  }
  return 'Reconstructed';
}

function StateCard({
  icon,
  title,
  detail,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <Card hover={false} className="p-5 text-center">
      <div className="mb-2 flex justify-center text-[#4a4d77]">{icon}</div>
      <p className="text-sm font-semibold text-[#f0f0ff]">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#6b6e99]">{detail}</p>
      {action && <div className="mt-3">{action}</div>}
    </Card>
  );
}

export function ManagerBiddingProfiles({
  profiles,
  targetRows,
  rosters,
  users,
  initialFaab,
  hasCanonicalEvidence,
  isLoading,
  error,
  partialErrorCount = 0,
  onRetry,
  getPlayerName,
}: ManagerBiddingProfilesProps) {
  const [targetPlayerId, setTargetPlayerId] = useState<string | null>(null);
  const target = targetRows.find((row) => row.playerId === targetPlayerId) ?? targetRows[0] ?? null;
  const leagueBudget = Math.max(0, initialFaab);

  return (
    <section className="mb-5" aria-labelledby="manager-bid-profiles-title">
      <div className="mb-2 flex items-start gap-2">
        <BarChart3 size={16} className="mt-0.5 shrink-0 text-[#a78bfa]" />
        <div>
          <h2 id="manager-bid-profiles-title" className="text-sm font-semibold text-[#f0f0ff]">
            Manager bid profiles
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#6b6e99]">
            Top three canonical bids per manager, compared with the app&apos;s historical baseline.
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card hover={false} className="p-4" aria-live="polite">
          <p className="mb-3 text-xs text-[#6b6e99]">Loading historical projection evidence…</p>
          <Skeleton lines={4} />
        </Card>
      ) : error ? (
        <StateCard
          icon={<AlertTriangle size={28} className="text-[#f59e0b]" />}
          title="Historical evidence unavailable"
          detail={error.message}
          action={<Button size="sm" variant="ghost" onClick={onRetry}><RefreshCw size={13} className="mr-1.5 inline" />Retry</Button>}
        />
      ) : !hasCanonicalEvidence ? (
        <StateCard
          icon={<BarChart3 size={28} />}
          title="No canonical bids yet"
          detail="Wins and proved same-batch losses will appear here. Invalid roster failures and unmatched claims are excluded."
        />
      ) : targetRows.length === 0 ? (
        <StateCard
          icon={<Info size={28} />}
          title="Current prediction unavailable"
          detail="Historical evidence exists, but live Sleeper ROS projections did not produce a current waiver baseline. No other source was substituted."
        />
      ) : (
        <>
          {partialErrorCount > 0 && (
            <div role="status" className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-2">
              <p className="text-[10px] leading-relaxed text-[#fbbf24]">
                {partialErrorCount} historical snapshot {partialErrorCount === 1 ? 'week is' : 'weeks are'} unavailable. Successful weeks remain modeled; affected evidence is marked unavailable.
              </p>
              <Button size="sm" variant="ghost" onClick={onRetry} aria-label="Retry unavailable snapshot weeks">
                <RefreshCw size={12} />
              </Button>
            </div>
          )}
          <Card hover={false} className="mb-2 p-3">
            <label htmlFor="bid-profile-target" className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#6b6e99]">
              Predict bids for
            </label>
            <select
              id="bid-profile-target"
              value={target?.playerId ?? ''}
              onChange={(event) => setTargetPlayerId(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-[#2a2e55] bg-[#0e1025] px-3 py-2.5 text-xs text-[#f0f0ff] outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
            >
              {targetRows.slice(0, 50).map((row) => (
                <option key={row.playerId} value={row.playerId}>
                  {row.name} · {row.position}{row.posRank} · baseline {money(row.predictedWinningBid)}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[10px] leading-relaxed text-[#6b6e99]">
              Current raw baseline uses live Sleeper projections. Historical rows use immutable snapshot evidence; reconstructed never means exact. V1 replays static league setup, not unavailable historical rosters, ownership, needs, or survivor state.
            </p>
          </Card>

          <div className="space-y-2">
            {profiles.map((profile) => {
              const roster = rosters.find((row) => row.roster_id === profile.managerRosterId);
              const faab = currentFaab(profile.managerRosterId, rosters, leagueBudget);
              const prediction = target
                ? predictManagerBid(profile, target.predictedWinningBid, faab)
                : null;
              return (
                <details key={profile.managerRosterId} className="group rounded-xl border border-[#242849] bg-[#10132b] open:border-[#4f46e5]/50">
                  <summary className="min-h-14 cursor-pointer list-none px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6366f1] [&::-webkit-details-marker]:hidden">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#f0f0ff]">
                          {managerName(profile.managerRosterId, rosters, users)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[#6b6e99]">
                          {multiplier(profile.managerMultiplier)} multiplier · {profile.confidence} confidence · {profile.usableEvidenceCount}/{profile.evidence.length} usable
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${STYLE_CLASSES[profile.style]}`}>
                        {profile.style}
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-[#242849] px-4 pb-4 pt-3">
                    {prediction ? (
                      <div className="grid grid-cols-3 gap-2" aria-label={`Prediction for ${target?.name}`}>
                        <div className="rounded-lg bg-[#0a0d1a] p-2">
                          <p className="text-[9px] uppercase tracking-wider text-[#4a4d77]">Raw baseline</p>
                          <p className="mt-1 font-['Space_Mono'] text-sm text-[#f0f0ff]">{money(prediction.rawBaseline)}</p>
                        </div>
                        <div className="rounded-lg bg-[#0a0d1a] p-2">
                          <p className="text-[9px] uppercase tracking-wider text-[#4a4d77]">Willingness</p>
                          <p className="mt-1 font-['Space_Mono'] text-sm text-[#c4b5fd]">{money(prediction.predictedWillingness)}</p>
                        </div>
                        <div className="rounded-lg bg-[#0a0d1a] p-2">
                          <p className="text-[9px] uppercase tracking-wider text-[#4a4d77]">Feasible bid</p>
                          <p className="mt-1 font-['Space_Mono'] text-sm text-[#34d399]">{money(prediction.feasiblePredictedBid)}</p>
                          {prediction.cappedByFaab && <p className="mt-0.5 text-[9px] text-[#f59e0b]">FAAB capped</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-[#2a2e55] p-3 text-xs text-[#6b6e99]">
                        Insufficient usable ratios for a current prediction.
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between text-[10px] text-[#6b6e99]">
                      <span>Current FAAB {money(faab)}</span>
                      <span>Model {BIDDING_PROFILE_MODEL_V1.version}</span>
                    </div>

                    <h3 className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-[#8b8eb8]">Evidence</h3>
                    {profile.evidence.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-[#2a2e55] p-3 text-xs text-[#6b6e99]">
                        No usable canonical claims for this manager.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {profile.evidence.map((row, index) => (
                          <div key={row.transactionId} className="rounded-lg bg-[#0a0d1a] p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold text-[#f0f0ff]">{getPlayerName(row.playerId)}</p>
                                <p className="mt-0.5 text-[9px] text-[#6b6e99]">
                                  Transaction Wk {row.transactionWeek} · decision Wk {row.decisionWeek} · {row.outcome === 'won' ? 'Won' : 'Legitimate loss'}
                                </p>
                              </div>
                              <span className={`rounded-full border px-2 py-0.5 text-[9px] ${row.provenance === 'exact' ? 'border-[#34d399]/30 bg-[#34d399]/10 text-[#6ee7b7]' : 'border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#fbbf24]'}`}>
                                {provenanceLabel(profile, index)}
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-['Space_Mono'] text-[10px]">
                              <span className="text-[#6b6e99]">Actual <strong className="text-[#f0f0ff]">{money(row.actualBid)}</strong></span>
                              <span className="text-[#6b6e99]">Raw baseline <strong className="text-[#f0f0ff]">{row.baseline == null ? '—' : money(row.baseline)}</strong></span>
                              <span className="text-[#6b6e99]">Effective <strong className="text-[#f0f0ff]">{row.effectiveBaseline == null ? '—' : money(row.effectiveBaseline)}</strong></span>
                              <span className="text-[#6b6e99]">Ratio <strong className="text-[#f0f0ff]">{row.eventRatio == null ? '—' : `${row.eventRatio.toFixed(2)}×`}</strong></span>
                              <span className="text-[#6b6e99]">Pre-bid FAAB <strong className="text-[#f0f0ff]">{money(row.faabAvailableBeforeBid)}</strong></span>
                              <span className="text-[#6b6e99]">Ledger <strong className="text-[#f0f0ff]">{row.faabReconstruction}</strong></span>
                            </div>
                            {(row.budgetConstrained || row.duplicateCount > 1 || row.unavailableReason) && (
                              <p className="mt-2 text-[9px] leading-relaxed text-[#f59e0b]">
                                {[
                                  row.budgetConstrained ? 'Budget-constrained observation' : null,
                                  row.duplicateCount > 1 ? `${row.duplicateCount} contingency/drop paths collapsed` : null,
                                  row.unavailableReason ?? null,
                                ].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {!roster && <p className="mt-2 text-[9px] text-[#6b6e99]">Current roster record unavailable; FAAB cap may be stale.</p>}
                  </div>
                </details>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
