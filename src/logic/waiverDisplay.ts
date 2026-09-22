import type { StrategyKey } from './waivers';

export const DEFAULT_WAIVER_STRATEGY: StrategyKey = 'weeks-starter';

export const WAIVER_STRATEGIES: { key: StrategyKey; label: string }[] = [
  { key: 'weeks-starter', label: 'Weeks-as-Starter' },
  { key: 'safe', label: 'Safe' },
  { key: 'aggressive', label: 'Aggressive' },
  { key: 'vorp', label: 'VoRP' },
];

export const WAIVER_STRATEGY_EXPLANATIONS: Record<StrategyKey, string> = {
  'weeks-starter': 'Values players by how many remaining weeks they project to stay in a starting lineup.',
  safe: 'Uses a conservative position-and-rank baseline for steady bidding.',
  aggressive: 'The maximum you should consider bidding: a spending ceiling, not intrinsic player value. It intentionally accepts overpay risk to land elite players, with a lower ceiling later in the season.',
  vorp: 'Values each player by projected weekly advantage over the replacement option at their position.',
};
