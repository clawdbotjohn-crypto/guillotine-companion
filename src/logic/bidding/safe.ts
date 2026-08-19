// Safe Bidding Strategy
// Goal: Budget to survive to last ~5 teams
// Allocates budget across needed positions using VoRP weights

export interface RosterNeed {
  position: string;
  slots: number; // VoRP-weighted slots needed
  currentRank: number | null; // Best player rank at this position
  needLevel: 'high' | 'medium' | 'low' | 'none';
}

export interface SafeBidResult {
  playerId: string;
  position: string;
  suggestedBid: number;
  rationale: string;
  isTopTarget: boolean;
}

// VoRP position weights (how much of a "slot" each position is worth)
const POSITION_WEIGHTS: Record<string, number> = {
  QB: 0.75,
  RB: 1.0,
  WR: 1.0,
  TE: 0.25,
  K: 0, // Don't bid on kickers
  DEF: 0, // Don't bid on DST
};

// Thresholds for "don't need this position"
const DONT_NEED_THRESHOLD: Record<string, number> = {
  QB: 5, // Top 5 QB = don't need
  RB: 10, // Top 10 RB = don't need
  WR: 10, // Top 10 WR = don't need
  TE: 5, // Top 5 TE = don't need
};

interface SafeStrategyInput {
  totalBudget: number; // League FAAB budget (e.g., 1000)
  budgetRemaining: number; // What the user has left
  neededPositions: RosterNeed[];
  playerRank: number; // Rank of the player being bid on
  position: string;
  isTopAvailable: boolean; // Is this the #1 available at this position?
}

/**
 * Calculate a safe bid amount for a player.
 * 
 * Logic:
 * - 90% of remaining budget for starters, 10% for depth
 * - Divide starter budget by total weighted slots needed
 * - Scale up for #1 available (~25% premium)
 * - Scale down for lower-ranked targets
 */
export function calculateSafeBid(input: SafeStrategyInput): number {
  const { totalBudget, budgetRemaining, neededPositions, position, isTopAvailable } = input;

  const weight = POSITION_WEIGHTS[position] ?? 0;
  if (weight === 0) return 0;

  // Total weighted slots needed
  const totalSlots = neededPositions.reduce((sum, n) => sum + n.slots * (POSITION_WEIGHTS[n.position] ?? 0), 0);
  if (totalSlots === 0) return 0;

  // Starter budget = 90% of remaining
  const starterBudget = budgetRemaining * 0.9;

  // Base bid per weighted slot
  const baseBidPerSlot = starterBudget / totalSlots;

  // Adjusted for position weight
  let bid = baseBidPerSlot * weight;

  // Premium for top available player
  if (isTopAvailable) {
    bid *= 1.25;
  }

  // Floor: at least 1% of total budget
  bid = Math.max(bid, totalBudget * 0.01);

  // Ceiling: never bid more than 50% of remaining
  bid = Math.min(bid, budgetRemaining * 0.5);

  return Math.round(bid);
}

export { POSITION_WEIGHTS, DONT_NEED_THRESHOLD };
