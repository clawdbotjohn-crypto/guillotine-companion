import { describe, expect, it } from 'vitest';
import type { ExternalRanking, League } from '../../api/types';
import type { PlayerRecord } from '../../store/players';
import { buildWaiverBoard, type LeagueContext } from '../waivers';
import {
  buildExternalRankingMap,
  getReceptionScoring,
  hasSuperflex,
  mapLeagueToFootballAbsurdity,
} from '../rankingSources';

function player(id: string, name: string, position: string, team: string): PlayerRecord {
  const [first_name, ...last] = name.split(' ');
  return {
    player_id: id,
    first_name,
    last_name: last.join(' '),
    full_name: name,
    position,
    team,
    age: 25,
    injury_status: null,
    status: 'Active',
  };
}

const players = new Map([
  ['101', player('101', 'Marvin Harrison Jr.', 'WR', 'ARI')],
  ['202', player('202', 'Puka Nacua', 'WR', 'LAR')],
]);

const context: LeagueContext = {
  budget: 1000,
  teamsRemaining: 8,
  weeksRemaining: 7,
  currentWeek: 10,
  startersPerPos: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPER_FLEX: 0 },
};

function ranking(name: string, value: number, sleeperId?: string): ExternalRanking {
  return { name, value, sleeperId, position: 'WR', team: name.startsWith('Marvin') ? 'ARI' : 'LAR', rank: 1 };
}

describe('external waiver ranking sources', () => {
  it('prefers FantasyCalc Sleeper IDs and robustly matches suffix-normalized FA names', () => {
    const result = buildExternalRankingMap([
      ranking('Different upstream spelling', 9000, '202'),
      ranking('Marvin Harrison', 100),
    ], players);

    expect([...result.projections.keys()].sort()).toEqual(['101', '202']);
    expect(result.projections.get('202')?.sourceValue).toBe(9000);
    expect(result.unmatched).toBe(0);
  });

  it('switching source values genuinely changes positional rank, board order, and bid value', () => {
    const fantasyCalc = buildExternalRankingMap([
      ranking('Marvin Harrison Jr.', 9000, '101'),
      ranking('Puka Nacua', 8000, '202'),
    ], players).projections;
    const footballAbsurdity = buildExternalRankingMap([
      ranking('Marvin Harrison Jr.', 3, '101'),
      ranking('Puka Nacua', 14, '202'),
    ], players).projections;

    const fcRows = buildWaiverBoard(['101', '202'], fantasyCalc, context, [], (id) => players.get(id)!.full_name);
    const faRows = buildWaiverBoard(['101', '202'], footballAbsurdity, context, [], (id) => players.get(id)!.full_name);

    expect(fcRows.map((row) => row.playerId)).toEqual(['101', '202']);
    expect(faRows.map((row) => row.playerId)).toEqual(['202', '101']);
    expect(fcRows.find((row) => row.playerId === '101')?.posRank).toBe(1);
    expect(faRows.find((row) => row.playerId === '101')?.posRank).toBe(2);
    expect(fcRows.find((row) => row.playerId === '101')?.suggestions)
      .not.toEqual(faRows.find((row) => row.playerId === '101')?.suggestions);
  });

  it('maps league scoring and lineup format into both external source configurations', () => {
    const league: League = {
      league_id: '1', name: 'Test', total_rosters: 14, settings: {}, season: '2026',
      season_type: 'regular', status: 'in_season', draft_id: 'd', previous_league_id: null,
      roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'SUPER_FLEX', 'BN'],
      scoring_settings: { rec: 0.5, pass_td: 6, pass_int: -3 },
    };

    expect(getReceptionScoring(league)).toBe(0.5);
    expect(hasSuperflex(league)).toBe(true);
    expect(mapLeagueToFootballAbsurdity(league)).toMatchObject({
      teams: 14, qb: 1, rb: 2, wr: 2, te: 1, rwt: 1, qrwt: 1,
      rec: 0.5, patd: 6, int: -3,
    });
  });
});
