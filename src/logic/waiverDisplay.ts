import {
  DEFAULT_WAIVER_STRATEGY,
  WAIVER_STRATEGY_REGISTRY,
  type StrategyKey,
} from './waiverStrategies';

export { DEFAULT_WAIVER_STRATEGY };

export type DisplayStrategyKey = StrategyKey | 'custom';

export const WAIVER_STRATEGIES: { key: DisplayStrategyKey; label: string }[] = [
  ...WAIVER_STRATEGY_REGISTRY.map(({ key, label }) => ({ key, label })),
  { key: 'custom', label: 'Custom' },
];

export const WAIVER_STRATEGY_EXPLANATIONS = Object.fromEntries(
  WAIVER_STRATEGY_REGISTRY
    .filter(({ key }) => key !== 'vorp')
    .map(({ key, explanation }) => [key, explanation]),
) as Record<Exclude<StrategyKey, 'vorp'>, string>;

export function getWaiverStrategyExplanation(
  strategy: DisplayStrategyKey,
  _replacementTeamCount: number,
  vorpAvailable: boolean,
  unavailableReason?: string,
): string {
  if (strategy === 'custom') {
    return 'Uses the frozen generated values and explicit manual overrides saved in the selected custom ranking.';
  }
  const definition = WAIVER_STRATEGY_REGISTRY.find(({ key }) => key === strategy)!;
  if (strategy !== 'vorp' && strategy !== 'max-vorp') return definition.explanation;
  if (vorpAvailable) return definition.explanation;
  return `${definition.explanation} ${strategy === 'max-vorp' ? 'Max VORP' : 'VoRP'} is unavailable${unavailableReason ? `: ${unavailableReason}` : ' because a valid Sleeper ROS calibration could not be built'}.`;
}
