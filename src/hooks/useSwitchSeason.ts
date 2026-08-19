// Hook to handle season switching with auto-team-selection

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { getLeagueRosters, getLeagueUsers } from '../api/client';

export function useSwitchSeason() {
  const navigate = useNavigate();
  const { userId, username, switchSeason, setTeam } = useAppStore();

  const handleSwitchSeason = useCallback(
    async (leagueId: string, name: string, season: string) => {
      switchSeason(leagueId, name, season);

      // Try to auto-match the user's roster in the new season
      if (userId) {
        try {
          const [rosters, users] = await Promise.all([
            getLeagueRosters(leagueId),
            getLeagueUsers(leagueId),
          ]);

          const myRoster = rosters.find((r) => r.owner_id === userId);
          if (myRoster) {
            const myUser = users.find((u) => u.user_id === userId);
            const displayName = myUser?.display_name ?? username;
            setTeam(myRoster.roster_id, displayName);
            return; // Stay on current page
          }
        } catch {
          // Fall through to team select
        }
      }

      // No auto-match — navigate to team select
      navigate('/team-select');
    },
    [userId, username, switchSeason, setTeam, navigate],
  );

  return handleSwitchSeason;
}
