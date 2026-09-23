import type { StrategyKey } from './waivers';

export const DEFAULT_WAIVER_STRATEGY: StrategyKey = 'weeks-starter';

export const WAIVER_STRATEGIES: { key: StrategyKey; label: string }[] = [
  { key: 'weeks-starter', label: 'Weeks-as-Starter' },
  { key: 'safe', label: 'Safe' },
  { key: 'aggressive', label: 'Aggressive' },
  { key: 'vorp', label: 'VoRP' },
];

export const WAIVER_STRATEGY_EXPLANATIONS: Record<Exclude<StrategyKey, 'vorp'>, string> = {
  'weeks-starter': 'Values players by how many remaining weeks they project to stay in a starting lineup.',
  safe: 'Uses a conservative position-and-rank baseline for steady bidding.',
  aggressive: 'The maximum you should consider bidding: a player-sensitive spending ceiling equal to Predicted Winning Bid, not intrinsic player value. It intentionally accepts overpay risk to land elite players and declines continuously as the season advances.',
};

export function getWaiverStrategyExplanation(
  strategy: StrategyKey,
  replacementTeamCount: number,
  vorpAvailable: boolean,
  unavailableReason?: string,
): string {
  if (strategy !== 'vorp') return WAIVER_STRATEGY_EXPLANATIONS[strategy];
  const basis = `VoRP uses Sleeper rest-of-season projected fantasy points and the last startable player in the optimized ${replacementTeamCount}-team lineup pool as each position's replacement baseline.`;
  if (vorpAvailable) {
    return `${basis} Dollar values are calibrated to the average final-four starter pool using one full league FAAB budget.`;
  }
  return `${basis} VoRP is unavailable${unavailableReason ? `: ${unavailableReason}` : ' because a valid Sleeper ROS calibration could not be built'}.`;
}
