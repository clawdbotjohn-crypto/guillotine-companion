const SCORING_INJURY_STATUS_SHORTHAND: Record<string, string> = {
  questionable: 'Q',
  doubtful: 'D',
  'injured reserve': 'IR',
  ir: 'IR',
  out: 'O',
  suspended: 'S',
};

export function formatScoringInjuryStatus(status: string): string {
  return SCORING_INJURY_STATUS_SHORTHAND[status.trim().toLowerCase()] ?? status;
}
