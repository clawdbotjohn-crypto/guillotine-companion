export function getCurrentNflSeason(date = new Date()): string {
  const year = date.getFullYear();
  return String(date.getMonth() >= 2 ? year : year - 1);
}

/** Sleeper league identifiers are numeric snowflakes. */
export function isValidSleeperLeagueId(value: string): boolean {
  return /^\d{16,20}$/.test(value);
}
