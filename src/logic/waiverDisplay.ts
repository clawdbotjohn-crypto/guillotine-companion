import {
  DEFAULT_WAIVER_STRATEGY,
  WAIVER_STRATEGY_REGISTRY,
  type StrategyKey,
} from './waiverStrategies';

export { DEFAULT_WAIVER_STRATEGY };

export const WAIVER_STRATEGIES: { key: StrategyKey; label: string }[] =
  WAIVER_STRATEGY_REGISTRY.map(({ key, label }) => ({ key, label }));

export const WAIVER_STRATEGY_EXPLANATIONS = Object.fromEntries(
  WAIVER_STRATEGY_REGISTRY
    .filter(({ key }) => key !== 'vorp')
    .map(({ key, explanation }) => [key, explanation]),
) as Record<Exclude<StrategyKey, 'vorp'>, string>;

export function getWaiverStrategyExplanation(
  strategy: StrategyKey,
  _replacementTeamCount: number,
  vorpAvailable: boolean,
  unavailableReason?: string,
): string {
  const definition = WAIVER_STRATEGY_REGISTRY.find(({ key }) => key === strategy)!;
  if (strategy !== 'vorp' && strategy !== 'max-vorp') return definition.explanation;
  if (vorpAvailable) return definition.explanation;
  return `${definition.explanation} ${strategy === 'max-vorp' ? 'Max VORP' : 'VoRP'} is unavailable${unavailableReason ? `: ${unavailableReason}` : ' because a valid Sleeper ROS calibration could not be built'}.`;
}
