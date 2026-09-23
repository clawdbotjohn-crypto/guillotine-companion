import type { TeamProjection } from './analytics';

/**
 * Apply only the Teams-page visibility preference after standings have been calculated.
 * This keeps eliminated teams out of active rank pools regardless of whether their cards show.
 */
export function filterTeamsByEliminatedVisibility(
  teams: TeamProjection[],
  showEliminatedTeams: boolean,
): TeamProjection[] {
  return showEliminatedTeams ? teams : teams.filter((team) => !team.eliminated);
}
