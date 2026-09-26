import type { Roster, SleeperUser } from '../api';
import { predictManagerBid, type ManagerBiddingProfile } from './biddingProfiles';
import { rankQuartile } from './rankingQuartiles';

export type BuyerLikelihood = 'Likely' | 'Possible' | 'Unlikely';

export interface ManagerPredictionDisplay {
  rosterId: number;
  managerName: string;
  predictedBid: number;
  currentFaab: number;
  cappedByFaab: boolean;
  likelihood: BuyerLikelihood;
  profile: ManagerBiddingProfile;
}

export function managerName(rosterId: number, rosters: Roster[], users: SleeperUser[]): string {
  const roster = rosters.find((row) => row.roster_id === rosterId);
  const user = users.find((row) => row.user_id === roster?.owner_id);
  return user?.display_name || user?.username || `Roster ${rosterId}`;
}

export function currentFaab(rosterId: number, rosters: Roster[], initialBudget: number): number {
  const used = rosters.find((row) => row.roster_id === rosterId)?.settings.waiver_budget_used ?? 0;
  return Math.max(0, initialBudget - used);
}

/** Map the shared active-team position quartiles to buyer likelihood. */
export function buyerLikelihood(rank: number | null, outOf: number | null): BuyerLikelihood {
  const quartile = rankQuartile(rank, outOf);
  if (quartile === 'top') return 'Unlikely';
  if (quartile === 'bottom') return 'Likely';
  return 'Possible';
}

const likelihoodOrder: Record<BuyerLikelihood, number> = { Likely: 0, Possible: 1, Unlikely: 2 };

export function isEligibleBuyerPrediction(prediction: Pick<ManagerPredictionDisplay, 'likelihood'>): boolean {
  return prediction.likelihood === 'Likely' || prediction.likelihood === 'Possible';
}

/**
 * Keep every eligible buyer ahead of Unlikely buyers, then put the largest
 * feasible (FAAB-capped) eligible prediction first. This makes the first
 * expanded eligible row the same value summarized on the collapsed card.
 */
export function orderManagerPredictions(
  predictions: readonly ManagerPredictionDisplay[],
): ManagerPredictionDisplay[] {
  return [...predictions].sort((a, b) => {
    const byEligibility = Number(isEligibleBuyerPrediction(b)) - Number(isEligibleBuyerPrediction(a));
    return byEligibility
      || b.predictedBid - a.predictedBid
      || likelihoodOrder[a.likelihood] - likelihoodOrder[b.likelihood]
      || a.managerName.localeCompare(b.managerName)
      || a.rosterId - b.rosterId;
  });
}

export function buildManagerPredictions({
  profiles,
  baseline,
  rosters,
  users,
  initialFaab,
  activeRosterIds,
  positionRanks,
}: {
  profiles: ManagerBiddingProfile[];
  baseline: number;
  rosters: Roster[];
  users: SleeperUser[];
  initialFaab: number;
  activeRosterIds: ReadonlySet<number>;
  positionRanks: ReadonlyMap<number, { rank: number; outOf: number }>;
}): ManagerPredictionDisplay[] {
  const predictions = profiles.flatMap((profile) => {
    if (!activeRosterIds.has(profile.managerRosterId)) return [];
    const faab = currentFaab(profile.managerRosterId, rosters, initialFaab);
    const prediction = predictManagerBid(profile, baseline, faab);
    if (!prediction) return [];
    const positionRank = positionRanks.get(profile.managerRosterId);
    return [{
      rosterId: profile.managerRosterId,
      managerName: managerName(profile.managerRosterId, rosters, users),
      predictedBid: Math.round(prediction.feasiblePredictedBid),
      currentFaab: faab,
      cappedByFaab: prediction.cappedByFaab,
      likelihood: buyerLikelihood(positionRank?.rank ?? null, positionRank?.outOf ?? null),
      profile,
    }];
  });
  return orderManagerPredictions(predictions);
}
