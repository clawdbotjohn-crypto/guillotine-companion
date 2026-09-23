import type { StrategyKey } from './waivers';

export const DEFAULT_WAIVER_STRATEGY: StrategyKey = 'weeks-starter';

export const WAIVER_STRATEGIES: { key: StrategyKey; label: string }[] = [
  { key: 'weeks-starter', label: 'Weeks-as-Starter' },
  { key: 'safe', label: 'Safe' },
  { key: 'aggressive', label: 'Aggressive' },
  { key: 'vorp', label: 'Value over Replacement Player (VoRP)' },
];

export const WAIVER_STRATEGY_EXPLANATIONS: Record<Exclude<StrategyKey, 'vorp'>, string> = {
  'weeks-starter': 'Values players according to how many weeks they project to be starting caliber.',
  safe: 'Conservative bidding style aimed at preserving budget and avoiding overspending.',
  aggressive: 'Aggressive spending style aimed at winning players early, at the risk of running out of FAAB.',
};

export function getWaiverStrategyExplanation(
  strategy: StrategyKey,
  _replacementTeamCount: number,
  vorpAvailable: boolean,
  unavailableReason?: string,
): string {
  if (strategy !== 'vorp') return WAIVER_STRATEGY_EXPLANATIONS[strategy];
  const explanation = 'Calculates VoRP from the replacement-team count you set, estimates the average VoRP required for a top-four roster, and prices players relative to that benchmark.';
  if (vorpAvailable) return explanation;
  return `${explanation} VoRP is unavailable${unavailableReason ? `: ${unavailableReason}` : ' because a valid Sleeper ROS calibration could not be built'}.`;
}
