import type { StrategyKey } from './waivers';

export const DEFAULT_WAIVER_STRATEGY: StrategyKey = 'weeks-starter';

export const WAIVER_STRATEGIES: { key: StrategyKey; label: string }[] = [
  { key: 'weeks-starter', label: 'Weeks-as-Starter' },
  { key: 'safe', label: 'Safe' },
  { key: 'exponential', label: 'Exp. Starter' },
  { key: 'vorp', label: 'VoRP' },
];

export const WAIVER_STRATEGY_EXPLANATIONS: Record<StrategyKey, string> = {
  'weeks-starter': 'Values players by how many remaining weeks they project to stay in a starting lineup.',
  safe: 'Uses a conservative position-and-rank baseline for steady bidding.',
  exponential: 'Spends aggressively on elite starters early, then lowers the ceiling as the season advances.',
  vorp: 'Values each player by projected weekly advantage over the replacement option at their position.',
};
