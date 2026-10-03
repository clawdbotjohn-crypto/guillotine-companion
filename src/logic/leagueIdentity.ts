import type { UserLeague } from '../api/types';
import { classifyGuillotineLeague } from './elimination';

/** Keep unsupported and malformed native identities visible without making them selectable. */
export function groupLeagueChoices(leagues: UserLeague[] = []) {
  return {
    guillotine: leagues.filter((league) => classifyGuillotineLeague(league) === 'guillotine'),
    other: leagues.filter((league) => classifyGuillotineLeague(league) === 'other'),
    unknown: leagues.filter((league) => classifyGuillotineLeague(league) === 'unknown'),
  };
}
