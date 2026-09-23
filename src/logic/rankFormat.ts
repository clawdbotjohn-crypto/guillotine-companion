export function ordinal(value: number): string {
  const mod100 = value % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th'
    : value % 10 === 1 ? 'st'
      : value % 10 === 2 ? 'nd'
        : value % 10 === 3 ? 'rd' : 'th';
  return `${value}${suffix}`;
}

export function formatHistoricalWeekRank(rank: number, entrants: number): string {
  return `${rank}/${entrants}`;
}
