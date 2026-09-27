export const WAIVER_STRATEGY_REGISTRY = [
  {
    key: 'max-vorp',
    label: 'Max VORP',
    explanation: 'Uses each player’s highest positive, championship-calibrated VORP across every valid remaining-team stage from now through the final four.',
  },
  {
    key: 'weeks-starter',
    label: 'Weeks-as-Starter',
    explanation: 'Values players according to how many weeks they project to be starting caliber.',
  },
  {
    key: 'safe',
    label: 'Safe',
    explanation: 'Conservative bidding style aimed at preserving budget and avoiding overspending.',
  },
  {
    key: 'aggressive',
    label: 'Aggressive',
    explanation: 'Aggressive spending style aimed at winning players early, at the risk of running out of FAAB.',
  },
  {
    key: 'vorp',
    label: 'VoRP',
    explanation: 'Value over Replacement Player (VoRP) calculates value from the replacement-team count you set, estimates the average VoRP required for a top-four roster, and prices players relative to that benchmark.',
  },
] as const;

export type StrategyKey = typeof WAIVER_STRATEGY_REGISTRY[number]['key'];

export const DEFAULT_WAIVER_STRATEGY: StrategyKey = 'max-vorp';

/**
 * One explicit, versioned switch controls both historical profile ratios and current predictions.
 * Change this descriptor (and its version) to intentionally migrate the bidding baseline.
 */
export const BIDDING_BASELINE = Object.freeze({
  strategyId: 'max-vorp' as StrategyKey,
  version: 'max-vorp-v1',
});

interface StrategyRow {
  suggestions: readonly { strategy: StrategyKey; value: number | null }[];
}

export function resolveStrategyBid(row: StrategyRow, strategy: StrategyKey): number | null {
  return row.suggestions.find((suggestion) => suggestion.strategy === strategy)?.value ?? null;
}

export function resolveBiddingBaseline(row: StrategyRow): number | null {
  return resolveStrategyBid(row, BIDDING_BASELINE.strategyId);
}
