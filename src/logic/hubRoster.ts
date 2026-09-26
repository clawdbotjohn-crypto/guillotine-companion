import type { DraftPick, Roster, Transaction } from '../api/types';
import type { PlayerRecord } from '../store/players';
import { getTeamByeWeek } from './projections';
import type { TeamProjection } from './analytics';
import type { WeeklyScoredPlayer } from './projections';
import { isUpcomingByeWeek } from './byeProximity';

export type AcquisitionKind = 'draft' | 'waiver' | 'free_agent' | 'trade' | 'ambiguous' | 'unknown';

export interface PlayerAcquisition {
  kind: AcquisitionKind;
  /** Present only for a completed, unambiguous waiver acquisition by this roster. */
  faab: number | null;
}

export interface HubRosterRow {
  playerId: string;
  name: string;
  position: string;
  team: string | null;
  isStarter: boolean;
  starterSlot: string | null;
  projection: number | null;
  byeWeek: number | null;
  injuryStatus: string | null;
  status: string | null;
  acquisition: PlayerAcquisition;
}

export interface HubByeWarning {
  playerId: string;
  name: string;
  position: string;
  team: string | null;
  isStarter: boolean;
  byeWeek: number;
}

function compareIdentity(
  a: Pick<HubByeWarning, 'name' | 'playerId'>,
  b: Pick<HubByeWarning, 'name' | 'playerId'>,
): number {
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  if (a.playerId === b.playerId) return 0;
  return a.playerId < b.playerId ? -1 : 1;
}

/**
 * Select exact supported byes from the projection week's three-scoring-week window. Optimized
 * starters are intentionally grouped ahead of every bench warning, then warnings are ordered by
 * bye week and stable player identity. Missing weeks/byes stay silent rather than being inferred.
 */
export function buildUpcomingByeWarnings(
  rows: readonly HubRosterRow[],
  projectionWeek: number | null,
): HubByeWarning[] {
  const seenPlayerIds = new Set<string>();

  return rows
    .filter((row) => {
      if (!isUpcomingByeWeek(row.byeWeek, projectionWeek) || seenPlayerIds.has(row.playerId)) return false;
      seenPlayerIds.add(row.playerId);
      return true;
    })
    .map(({ playerId, name, position, team, isStarter, byeWeek }) => ({
      playerId,
      name,
      position,
      team,
      isStarter,
      byeWeek: byeWeek as number,
    }))
    .sort((a, b) => {
      if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
      return a.byeWeek - b.byeWeek || compareIdentity(a, b);
    });
}

function completedPlayerTransactions(
  playerId: string,
  transactions: ReadonlyMap<number, readonly Transaction[]> | undefined,
): Transaction[] {
  if (!transactions) return [];

  const unique = new Map<string, Transaction>();
  for (const weekTransactions of transactions.values()) {
    for (const transaction of weekTransactions) {
      if (transaction.status !== 'complete') continue;
      if (!(playerId in (transaction.adds ?? {})) && !(playerId in (transaction.drops ?? {}))) continue;
      unique.set(transaction.transaction_id, transaction);
    }
  }
  return [...unique.values()];
}

/**
 * Resolve only provenance that Sleeper explicitly supports. A price is exposed only when the
 * latest completed ownership event is one unique waiver transaction adding the player to this
 * roster, with one matching roster ID and a finite non-negative bid. Draft, trade, direct free
 * agent, stale/drop, and ambiguous evidence intentionally carry no dollar amount.
 */
export function resolvePlayerAcquisition(
  playerId: string,
  rosterId: number,
  transactions: ReadonlyMap<number, readonly Transaction[]> | undefined,
  draftPicks: readonly DraftPick[] | undefined,
): PlayerAcquisition {
  const relevant = completedPlayerTransactions(playerId, transactions);
  if (relevant.length === 0) {
    const draftedHere = draftPicks?.some(
      (pick) => pick.player_id === playerId && pick.roster_id === rosterId,
    );
    return { kind: draftedHere ? 'draft' : 'unknown', faab: null };
  }

  const latestCreated = Math.max(...relevant.map((transaction) => transaction.created));
  const latest = relevant.filter((transaction) => transaction.created === latestCreated);
  if (!Number.isFinite(latestCreated) || latest.length !== 1) {
    return { kind: 'ambiguous', faab: null };
  }

  const transaction = latest[0];
  const destination = transaction.adds?.[playerId];
  if (destination !== rosterId) return { kind: 'unknown', faab: null };

  if (transaction.type === 'trade') return { kind: 'trade', faab: null };
  if (transaction.type === 'free_agent') return { kind: 'free_agent', faab: null };
  if (transaction.type !== 'waiver') return { kind: 'unknown', faab: null };

  const bid = transaction.settings?.waiver_bid;
  const rosterEvidenceIsExact = transaction.roster_ids.length === 1
    && transaction.roster_ids[0] === rosterId;
  if (!rosterEvidenceIsExact || typeof bid !== 'number' || !Number.isFinite(bid) || bid < 0) {
    return { kind: 'ambiguous', faab: null };
  }

  return { kind: 'waiver', faab: bid };
}

export interface BuildHubRosterRowsOptions {
  roster: Roster;
  teamProjection: TeamProjection | undefined;
  weeklyProjections: ReadonlyMap<string, WeeklyScoredPlayer> | null;
  players: ReadonlyMap<string, PlayerRecord> | undefined;
  season: string | undefined;
  transactions: ReadonlyMap<number, readonly Transaction[]> | undefined;
  draftPicks: readonly DraftPick[] | undefined;
}

/**
 * Build the Hub roster from the same optimized starter IDs and per-player projection map used by
 * projectAllTeams. When weekly projections are unavailable, the current Sleeper lineup is used
 * only for starter/bench labeling; no projection or optimization is invented.
 */
export function buildHubRosterRows({
  roster,
  teamProjection,
  weeklyProjections,
  players,
  season,
  transactions,
  draftPicks,
}: BuildHubRosterRowsOptions): HubRosterRow[] {
  const optimizedStarters = teamProjection?.starters ?? [];
  const optimizedStarterIndex = new Map(
    optimizedStarters.map((starter, index) => [starter.playerId, { index, slot: starter.position }]),
  );
  const sleeperStarters = new Map(
    (roster.starters ?? [])
      .filter((playerId) => playerId && playerId !== '0')
      .map((playerId, index) => [playerId, index]),
  );
  const hasOptimizedLineup = optimizedStarters.length > 0;

  return (roster.players ?? [])
    .filter((playerId) => playerId && playerId !== '0')
    .map((playerId): HubRosterRow & { order: number } => {
      const player = players?.get(playerId);
      const weekly = weeklyProjections?.get(playerId);
      const optimized = optimizedStarterIndex.get(playerId);
      const fallbackIndex = sleeperStarters.get(playerId);
      const isStarter = hasOptimizedLineup ? optimized != null : fallbackIndex != null;
      const starterOrder = hasOptimizedLineup ? optimized?.index : fallbackIndex;
      const position = player?.position || weekly?.position || 'UNK';
      const team = player?.team || null;

      return {
        playerId,
        name: player?.full_name || playerId,
        position,
        team,
        isStarter,
        starterSlot: isStarter ? optimized?.slot ?? position : null,
        projection: weekly?.points ?? null,
        byeWeek: season ? getTeamByeWeek(season, team) : null,
        injuryStatus: player?.injury_status || null,
        status: player?.status || null,
        acquisition: resolvePlayerAcquisition(playerId, roster.roster_id, transactions, draftPicks),
        order: isStarter ? starterOrder ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((a, b) => {
      if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
      if (a.isStarter) return a.order - b.order || a.playerId.localeCompare(b.playerId);
      return (b.projection ?? Number.NEGATIVE_INFINITY)
        - (a.projection ?? Number.NEGATIVE_INFINITY)
        || a.position.localeCompare(b.position)
        || a.name.localeCompare(b.name)
        || a.playerId.localeCompare(b.playerId);
    })
    .map(({ order: _order, ...row }) => row);
}
