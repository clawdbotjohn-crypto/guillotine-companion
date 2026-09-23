import { describe, expect, it } from 'vitest';
import type { DraftPick, Roster, Transaction } from '../../api/types';
import type { TeamProjection } from '../analytics';
import type { PlayerRecord } from '../../store/players';
import {
  buildHubRosterRows,
  buildUpcomingByeWarnings,
  resolvePlayerAcquisition,
  type HubRosterRow,
} from '../hubRoster';

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    type: 'waiver',
    status: 'complete',
    transaction_id: 'txn-default',
    roster_ids: [7],
    adds: { player: 7 },
    drops: null,
    settings: { waiver_bid: 10 },
    leg: 2,
    created: 200,
    ...overrides,
  };
}

function draftPick(playerId: string, rosterId = 7): DraftPick {
  return {
    round: 1,
    pick_no: 1,
    roster_id: rosterId,
    player_id: playerId,
    metadata: { first_name: 'Drafted', last_name: 'Player', position: 'RB', team: 'KC' },
  };
}

function player(playerId: string, name: string, position: string, team: string): PlayerRecord {
  const [firstName, ...lastName] = name.split(' ');
  return {
    player_id: playerId,
    first_name: firstName,
    last_name: lastName.join(' '),
    full_name: name,
    position,
    team,
    age: 25,
    injury_status: null,
    status: 'Active',
  };
}

function rosterRow(overrides: Partial<HubRosterRow>): HubRosterRow {
  return {
    playerId: 'default',
    name: 'Default Player',
    position: 'RB',
    team: 'KC',
    isStarter: false,
    starterSlot: null,
    projection: null,
    byeWeek: null,
    injuryStatus: null,
    status: 'Active',
    acquisition: { kind: 'unknown', faab: null },
    ...overrides,
  };
}

describe('Hub roster acquisition provenance', () => {
  it('keeps a drafted player blank unless a later supported waiver reacquisition exists', () => {
    expect(resolvePlayerAcquisition('player', 7, new Map(), [draftPick('player')])).toEqual({
      kind: 'draft',
      faab: null,
    });

    const transactions = new Map([[3, [
      transaction({
        transaction_id: 'drop',
        type: 'free_agent',
        adds: null,
        drops: { player: 7 },
        settings: null,
        created: 300,
      }),
      transaction({
        transaction_id: 'reacquire',
        adds: { player: 7 },
        settings: { waiver_bid: 37 },
        created: 400,
      }),
    ]]]);

    expect(resolvePlayerAcquisition('player', 7, transactions, [draftPick('player')])).toEqual({
      kind: 'waiver',
      faab: 37,
    });
  });

  it('uses the latest supported waiver and preserves an explicit zero-dollar bid', () => {
    const transactions = new Map([[4, [
      transaction({ transaction_id: 'older', created: 100, settings: { waiver_bid: 65 } }),
      transaction({ transaction_id: 'latest', created: 500, settings: { waiver_bid: 0 } }),
    ]]]);

    expect(resolvePlayerAcquisition('player', 7, transactions, [])).toEqual({
      kind: 'waiver',
      faab: 0,
    });
  });

  it('never turns trades, direct free agents, ambiguous events, or stale drops into prices', () => {
    const cases: [string, Transaction[], string][] = [
      ['trade', [transaction({ transaction_id: 'trade', type: 'trade', roster_ids: [3, 7] })], 'trade'],
      ['free agent', [transaction({ transaction_id: 'fa', type: 'free_agent', settings: null })], 'free_agent'],
      ['ambiguous tie', [
        transaction({ transaction_id: 'tie-a', settings: { waiver_bid: 1 } }),
        transaction({ transaction_id: 'tie-b', settings: { waiver_bid: 99 } }),
      ], 'ambiguous'],
      ['stale drop', [transaction({ transaction_id: 'drop', adds: null, drops: { player: 7 } })], 'unknown'],
      ['multi-roster waiver', [transaction({ transaction_id: 'multi', roster_ids: [7, 9] })], 'ambiguous'],
    ];

    for (const [label, events, expectedKind] of cases) {
      expect(resolvePlayerAcquisition('player', 7, new Map([[2, events]]), []), label).toEqual({
        kind: expectedKind,
        faab: null,
      });
    }
  });
});

describe('Hub roster ordering and weekly context', () => {
  it('uses shared optimized starter order first, then orders bench by the same weekly projections', () => {
    const roster: Roster = {
      roster_id: 7,
      owner_id: 'owner',
      players: ['bench-low', 'starter-flex', 'bench-high', 'starter-qb'],
      starters: ['starter-qb', 'bench-low'],
      settings: { wins: 1, losses: 0, fpts: 100, waiver_budget_used: 0 },
    };
    const teamProjection: TeamProjection = {
      rosterId: 7,
      displayName: 'Team Seven',
      projPoints: 60,
      eliminated: false,
      projRank: 1,
      projOutOf: 4,
      risk: 'safe',
      starters: [
        { playerId: 'starter-qb', position: 'QB', proj: 25 },
        { playerId: 'starter-flex', position: 'FLEX', proj: 20 },
      ],
    };
    const players = new Map([
      ['bench-low', player('bench-low', 'Low Bench', 'WR', 'DAL')],
      ['starter-flex', player('starter-flex', 'Flex Starter', 'RB', 'KC')],
      ['bench-high', player('bench-high', 'High Bench', 'TE', 'CAR')],
      ['starter-qb', player('starter-qb', 'Quarterback Starter', 'QB', 'BUF')],
    ]);
    players.get('bench-high')!.injury_status = 'Questionable';
    const weekly = new Map([
      ['starter-qb', { playerId: 'starter-qb', position: 'QB', points: 25 }],
      ['starter-flex', { playerId: 'starter-flex', position: 'RB', points: 20 }],
      ['bench-high', { playerId: 'bench-high', position: 'TE', points: 11 }],
      ['bench-low', { playerId: 'bench-low', position: 'WR', points: 4 }],
    ]);

    const rows = buildHubRosterRows({
      roster,
      teamProjection,
      weeklyProjections: weekly,
      players,
      season: '2026',
      transactions: new Map(),
      draftPicks: [],
    });

    expect(rows.map((row) => row.playerId)).toEqual([
      'starter-qb',
      'starter-flex',
      'bench-high',
      'bench-low',
    ]);
    expect(rows.map((row) => row.isStarter)).toEqual([true, true, false, false]);
    expect(rows[1]).toMatchObject({ position: 'RB', starterSlot: 'FLEX', projection: 20, byeWeek: 5 });
    expect(rows[2]).toMatchObject({ projection: 11, byeWeek: 5, injuryStatus: 'Questionable' });
  });

  it('falls back to current Sleeper starter labels without inventing unavailable projections or byes', () => {
    const roster: Roster = {
      roster_id: 7,
      owner_id: 'owner',
      players: ['starter', 'bench'],
      starters: ['starter'],
      settings: { wins: 0, losses: 0, fpts: 0, waiver_budget_used: 0 },
    };

    const rows = buildHubRosterRows({
      roster,
      teamProjection: undefined,
      weeklyProjections: null,
      players: new Map([
        ['starter', player('starter', 'Current Starter', 'RB', 'KC')],
        ['bench', player('bench', 'Current Bench', 'WR', 'DAL')],
      ]),
      season: '2025',
      transactions: undefined,
      draftPicks: undefined,
    });

    expect(rows[0]).toMatchObject({ playerId: 'starter', isStarter: true, projection: null, byeWeek: null });
    expect(rows[1]).toMatchObject({ playerId: 'bench', isStarter: false, projection: null, byeWeek: null });
    expect(buildUpcomingByeWarnings(rows, 5)).toEqual([]);
  });
});

describe('Hub upcoming bye warnings', () => {
  it('uses exactly the projection week plus two and puts every starter before every bench player', () => {
    const warnings = buildUpcomingByeWarnings([
      rosterRow({ playerId: 'past', name: 'Past Bye', byeWeek: 4, isStarter: true }),
      rosterRow({ playerId: 'bench-now', name: 'Bench Now', byeWeek: 5 }),
      rosterRow({ playerId: 'starter-later', name: 'Later Starter', byeWeek: 7, isStarter: true }),
      rosterRow({ playerId: 'starter-z', name: 'Zed Starter', byeWeek: 5, isStarter: true }),
      rosterRow({ playerId: 'starter-a', name: 'Alpha Starter', byeWeek: 5, isStarter: true }),
      rosterRow({ playerId: 'starter-a', name: 'Duplicate Starter', byeWeek: 6, isStarter: true }),
      rosterRow({ playerId: 'after', name: 'After Window', byeWeek: 8, isStarter: true }),
    ], 5);

    expect(warnings.map((warning) => warning.playerId)).toEqual([
      'starter-a',
      'starter-z',
      'starter-later',
      'bench-now',
    ]);
    expect(warnings.map((warning) => warning.byeWeek)).toEqual([5, 5, 7, 5]);
  });

  it('stays within season bounds and silently skips unsupported weeks and bye data', () => {
    const rows = [
      rosterRow({ playerId: 'week-17', byeWeek: 17 }),
      rosterRow({ playerId: 'week-18', byeWeek: 18 }),
      rosterRow({ playerId: 'week-19', byeWeek: 19 }),
      rosterRow({ playerId: 'unsupported', team: 'UNKNOWN', byeWeek: null }),
    ];

    expect(buildUpcomingByeWarnings(rows, 17).map((warning) => warning.playerId)).toEqual([
      'week-17',
      'week-18',
    ]);
    expect(buildUpcomingByeWarnings(rows, 18).map((warning) => warning.playerId)).toEqual([
      'week-18',
    ]);
    expect(buildUpcomingByeWarnings(rows, null)).toEqual([]);
    expect(buildUpcomingByeWarnings(rows, 19)).toEqual([]);
  });
});
