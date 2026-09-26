export type QuartileBand = 'top' | 'middle' | 'bottom';

/**
 * Classify a one-based rank into deterministic outer quartiles.
 *
 * Small leagues always keep distinct top/bottom teams when possible. Tied ranks receive the same
 * band because callers pass the same competition rank. A single-team league is neutral.
 */
export function rankQuartile(rank: number | null, outOf: number | null): QuartileBand {
  if (
    rank == null
    || outOf == null
    || !Number.isInteger(rank)
    || !Number.isInteger(outOf)
    || outOf < 1
    || rank < 1
    || rank > outOf
    || outOf === 1
  ) {
    return 'middle';
  }

  const outerQuartileSize = Math.max(1, Math.ceil(outOf * 0.25));
  if (rank <= outerQuartileSize) return 'top';
  if (rank > outOf - outerQuartileSize) return 'bottom';
  return 'middle';
}

export type FaabQuartileBand = QuartileBand;

/**
 * Rank an active manager's current FAAB against all active managers. Boundary ties share a band.
 * Exact zero is always bottom and a positive league maximum is always top, including tiny leagues.
 */
export function faabQuartile(
  amount: number,
  activeAmounts: readonly number[],
): FaabQuartileBand {
  if (!Number.isFinite(amount) || amount <= 0) return 'bottom';
  const sorted = activeAmounts
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => b - a);
  if (sorted.length === 0) return 'middle';

  const max = sorted[0];
  if (amount >= max) return 'top';
  if (sorted.length === 1) return 'middle';

  const outerQuartileSize = Math.max(1, Math.ceil(sorted.length * 0.25));
  const topBoundary = sorted[outerQuartileSize - 1];
  const bottomBoundary = sorted[sorted.length - outerQuartileSize];
  if (amount >= topBoundary) return 'top';
  if (amount <= bottomBoundary) return 'bottom';
  return 'middle';
}

export function faabQuartileLabel(band: FaabQuartileBand): string {
  if (band === 'top') return 'Top FAAB quartile';
  if (band === 'bottom') return 'Bottom FAAB quartile';
  return 'Middle FAAB quartiles';
}
