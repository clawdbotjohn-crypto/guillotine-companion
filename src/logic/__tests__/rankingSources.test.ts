import { describe, expect, it } from 'vitest';
import type { ExternalRanking, League } from '../../api/types';
import type { PlayerRecord } from '../../store/players';
import { buildWaiverBoard, type LeagueContext } from '../waivers';
import {
  buildExternalRankingMap,
  getReceptionScoring,
  hasSuperflex,
  getFantasyProsScoring,
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
  it('prefers FantasyCalc Sleeper IDs and robustly matches suffix-normalized external names', () => {
    const result = buildExternalRankingMap([
      ranking('Different upstream spelling', 9000, '202'),
      ranking('Marvin Harrison', 100),
    ], players);

    expect([...result.projections.keys()].sort()).toEqual(['101', '202']);
    expect(result.projections.get('202')?.sourceValue).toBe(9000);
    expect(result.projections.get('202')?.sourceRank).toBe(1);
    expect(result.unmatched).toBe(0);
  });

  it('switching source values genuinely changes eligible positional rank and board order', () => {
    const fantasyCalc = buildExternalRankingMap([
      ranking('Marvin Harrison Jr.', 9000, '101'),
      ranking('Puka Nacua', 8000, '202'),
    ], players).projections;
    const fantasyPros = buildExternalRankingMap([
      ranking('Marvin Harrison Jr.', 3, '101'),
      ranking('Puka Nacua', 14, '202'),
    ], players).projections;

    const fcRows = buildWaiverBoard(['101', '202'], fantasyCalc, context, [], (id) => players.get(id)!.full_name);
    const ecrRows = buildWaiverBoard(['101', '202'], fantasyPros, context, [], (id) => players.get(id)!.full_name);

    expect(fcRows.map((row) => row.playerId)).toEqual(['101', '202']);
    expect(ecrRows.map((row) => row.playerId)).toEqual(['202', '101']);
    expect(fcRows.find((row) => row.playerId === '101')?.posRank).toBe(1);
    // The normalized source minimum is exactly zero and therefore intentionally ineligible.
    expect(ecrRows.find((row) => row.playerId === '101')?.posRank).toBe(0);
  });

  it('maps league reception scoring to the exact FantasyPros ECR page variant', () => {
    const league: League = {
      league_id: '1', name: 'Test', total_rosters: 14, settings: {}, season: '2026',
      season_type: 'regular', status: 'in_season', draft_id: 'd', previous_league_id: null,
      roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'SUPER_FLEX', 'BN'],
      scoring_settings: { rec: 0.5, pass_td: 6, pass_int: -3 },
    };

    expect(getReceptionScoring(league)).toBe(0.5);
    expect(hasSuperflex(league)).toBe(true);
    expect(getFantasyProsScoring(league)).toBe('half');
  });
});

it('gives Sleeper, FantasyCalc, and FantasyPros full ownership of positional and FLEX ordering', () => {
  const sourcePlayers = new Map([
    ['rb1', player('rb1', 'Running One', 'RB', 'SEA')],
    ['rb2', player('rb2', 'Running Two', 'RB', 'SEA')],
    ['rb3', player('rb3', 'Running Three', 'RB', 'SEA')],
    ['wr1', player('wr1', 'Wide One', 'WR', 'SEA')],
    ['wr2', player('wr2', 'Wide Two', 'WR', 'SEA')],
    ['wr3', player('wr3', 'Wide Three', 'WR', 'SEA')],
  ]);
  const sourceContext: LeagueContext = {
    budget: 1000,
    teamsRemaining: 1,
    weeksRemaining: 1,
    currentWeek: 1,
    startersPerPos: { QB: 0, RB: 1, WR: 1, TE: 0, FLEX: 1, SUPER_FLEX: 0 },
  };
  const sleeper = new Map([
    ['rb1', { playerId: 'rb1', position: 'RB', totalPoints: 60, pointsPerWeek: 60, projectedWeeks: 1 }],
    ['rb2', { playerId: 'rb2', position: 'RB', totalPoints: 50, pointsPerWeek: 50, projectedWeeks: 1 }],
    ['rb3', { playerId: 'rb3', position: 'RB', totalPoints: 10, pointsPerWeek: 10, projectedWeeks: 1 }],
    ['wr1', { playerId: 'wr1', position: 'WR', totalPoints: 40, pointsPerWeek: 40, projectedWeeks: 1 }],
    ['wr2', { playerId: 'wr2', position: 'WR', totalPoints: 30, pointsPerWeek: 30, projectedWeeks: 1 }],
    ['wr3', { playerId: 'wr3', position: 'WR', totalPoints: 5, pointsPerWeek: 5, projectedWeeks: 1 }],
  ]);
  const external = (values: Record<string, number>) => buildExternalRankingMap(
    [...sourcePlayers].map(([id, record], index) => ({
      name: record.full_name,
      sleeperId: id,
      position: record.position,
      team: record.team,
      value: values[id],
      rank: index + 1,
    })),
    sourcePlayers,
  ).projections;
  const fantasyCalc = external({ rb1: 60, rb2: 20, rb3: 1, wr1: 50, wr2: 40, wr3: 2 });
  const fantasyPros = external({ rb1: 40, rb2: 35, rb3: 1, wr1: 60, wr2: 20, wr3: 2 });

  for (const [name, projections, flexBoundary] of [
    ['Sleeper', sleeper, 'rb2'],
    ['FantasyCalc', fantasyCalc, 'wr2'],
    ['FantasyPros', fantasyPros, 'rb2'],
  ] as const) {
    const rows = buildWaiverBoard(
      [...sourcePlayers.keys()], projections, sourceContext, [], (id) => id,
      { maxPerPos: Number.POSITIVE_INFINITY },
    );
    const safe = (id: string) => rows.find((row) => row.playerId === id)!
      .suggestions.find((suggestion) => suggestion.strategy === 'safe')!.value;
    const boundaryPosition = flexBoundary.slice(0, 2).toUpperCase();
    const otherPosition = boundaryPosition === 'RB' ? 'WR' : 'RB';

    expect(rows.find((row) => row.playerId === flexBoundary)?.position, name).toBe(boundaryPosition);
    expect(safe(flexBoundary), name).toBe(0);
    expect(safe(`${boundaryPosition.toLowerCase()}1`), name).toBeGreaterThan(0);
    expect(safe(`${otherPosition.toLowerCase()}1`), name).toBe(0);
  }
});
