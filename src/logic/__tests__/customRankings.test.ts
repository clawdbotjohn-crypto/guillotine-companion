/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_CUSTOM_RANKINGS,
  applyCustomRankingFormula,
  applyPositionValueCurve,
  createCustomRanking,
  createDefaultCustomRankingConfig,
  customRankingGeneratedSettingsChanged,
  customRankingValue,
  migrateCustomRankingPersistedState,
  regenerateCustomRanking,
  type CustomRankingConfig,
} from '../customRankings';
import type { WaiverPlayerRow } from '../waivers';
import { getCustomRankingsForScope, getLastUsedCustomRanking, useCustomRankingStore } from '../../store/customRankingStore';

const rows: WaiverPlayerRow[] = [
  {
    playerId: 'p1', name: 'Alpha Runner', position: 'RB', posRank: 1, rosPoints: 100,
    projectedPointsPerWeek: 10, sourceValue: 100, sourceRank: 4, starterWeeks: 8, possibleStarterWeeks: 10,
    predictedWinningBid: 70,
    suggestions: [
      { strategy: 'max-vorp', label: 'Max VORP', value: 40, pctOfBudget: 4 },
      { strategy: 'safe', label: 'Safe', value: 20, pctOfBudget: 2 },
    ],
  },
  {
    playerId: 'p2', name: 'Beta Receiver', position: 'WR', posRank: 2, rosPoints: 80,
    projectedPointsPerWeek: 8, sourceValue: 80, sourceRank: 10, starterWeeks: 4, possibleStarterWeeks: 10,
    predictedWinningBid: 30,
    suggestions: [
      { strategy: 'max-vorp', label: 'Max VORP', value: 5, pctOfBudget: 0.5 },
      { strategy: 'safe', label: 'Safe', value: 2, pctOfBudget: 0.2 },
    ],
  },
];
const config: CustomRankingConfig = {
  ...createDefaultCustomRankingConfig('sleeper'),
  name: ' My Board ',
  multiplier: 2,
  modifier: -15,
};

function board(id: string, leagueId = 'league-a', season = '2026') {
  return createCustomRanking({ id, leagueId, season, config: { ...config, name: `Board ${id}` }, rows, now: '2026-10-09T00:00:00.000Z' });
}

describe('custom ranking model', () => {
  beforeEach(() => {
    localStorage.clear();
    useCustomRankingStore.setState({ boardsByScope: {}, lastUsedByScope: {} });
  });

  it('creates a deterministic built-in baseline with a negative additive modifier and $0 floor', () => {
    const created = createCustomRanking({ id: 'board-1', leagueId: 'league-a', season: '2026', config, rows, now: '2026-10-09T00:00:00.000Z' });
    expect(created.name).toBe('My Board');
    expect(created.schemaVersion).toBe(2);
    expect(created.mode).toBe('built-in');
    expect(created.players.p1.baselineValue).toBe(65);
    expect(created.players.p2.baselineValue).toBe(0);
    expect(applyCustomRankingFormula(2, 3, -20)).toBe(0);
  });

  it('builds deterministic per-position curves, applies the global multiplier, and clamps at zero', () => {
    const curveConfig: CustomRankingConfig = {
      ...config,
      mode: 'position-curve',
      multiplier: 0.5,
      positionCurves: {
        ...config.positionCurves,
        RB: { maxValue: 250, step: 25 },
        WR: { maxValue: 100, step: 30 },
      },
    };
    const created = createCustomRanking({ id: 'curve', leagueId: 'league-a', season: '2026', config: curveConfig, rows: [...rows].reverse(), now: '2026-10-09T00:00:00.000Z' });
    expect(Object.keys(created.players)).toEqual(['p1', 'p2']);
    expect(created.players.p1.baselineValue).toBe(125);
    expect(created.players.p2.baselineValue).toBe(35);
    expect(applyPositionValueCurve(20, { maxValue: 50, step: 10 }, 1)).toBe(0);
  });

  it('does not treat a name-only edit as generated-value change', () => {
    const created = board('one');
    expect(customRankingGeneratedSettingsChanged(created, { ...config, name: 'Renamed' })).toBe(false);
    expect(customRankingGeneratedSettingsChanged(created, { ...config, multiplier: 3 })).toBe(true);
    expect(customRankingGeneratedSettingsChanged(created, { ...config, baseRankingSource: 'fantasypros' })).toBe(true);
    expect(customRankingGeneratedSettingsChanged(created, { ...config, mode: 'position-curve' })).toBe(true);
  });

  it('keeps explicit overrides on confirmed regeneration only when requested', () => {
    const original = { ...board('one'), overrides: { p1: 91 } };
    const changed = { ...config, baseStrategy: 'safe' as const, multiplier: 1, modifier: 3 };
    const preserved = regenerateCustomRanking(original, changed, rows, '2026-10-10T00:00:00.000Z', true);
    expect(preserved.players.p1.baselineValue).toBe(23);
    expect(preserved.overrides).toEqual({ p1: 91 });
    expect(customRankingValue(preserved, 'p1')).toBe(91);

    const cleared = regenerateCustomRanking(original, changed, rows, '2026-10-10T00:00:00.000Z', false);
    expect(cleared.overrides).toEqual({});
    expect(customRankingValue(cleared, 'p1')).toBe(23);
  });

  it('saves a rename without changing settings or manual values, and only stores actual overrides', () => {
    const store = useCustomRankingStore.getState();
    store.addBoard(board('one'));
    store.setOverride('league-a', '2026', 'one', 'p1', 91);
    store.updateBoardSettings('league-a', '2026', 'one', { ...config, name: 'Renamed', multiplier: 4 });
    let updated = getLastUsedCustomRanking(useCustomRankingStore.getState(), 'league-a', '2026')!;
    expect(updated.name).toBe('Renamed');
    expect(updated.multiplier).toBe(2);
    expect(customRankingValue(updated, 'p1')).toBe(91);

    store.setOverride('league-a', '2026', 'one', 'p1', updated.players.p1.baselineValue);
    updated = getLastUsedCustomRanking(useCustomRankingStore.getState(), 'league-a', '2026')!;
    expect(updated.overrides).toEqual({});
  });

  it('enforces ten per league-season while isolating leagues and seasons', () => {
    for (let index = 0; index < MAX_CUSTOM_RANKINGS; index++) {
      expect(useCustomRankingStore.getState().addBoard(board(`a-${index}`))).toBe(true);
    }
    expect(useCustomRankingStore.getState().addBoard(board('overflow'))).toBe(false);
    expect(useCustomRankingStore.getState().addBoard(board('other-league', 'league-b'))).toBe(true);
    expect(useCustomRankingStore.getState().addBoard(board('other-season', 'league-a', '2025'))).toBe(true);
    expect(getCustomRankingsForScope(useCustomRankingStore.getState(), 'league-a', '2026')).toHaveLength(10);
    expect(getCustomRankingsForScope(useCustomRankingStore.getState(), 'league-b', '2026')).toHaveLength(1);
    expect(getCustomRankingsForScope(useCustomRankingStore.getState(), 'league-a', '2025')).toHaveLength(1);
  });

  it('restores last-used selection and advances it after confirmed deletion is dispatched', () => {
    useCustomRankingStore.getState().addBoard(board('one'));
    useCustomRankingStore.getState().addBoard(board('two'));
    useCustomRankingStore.getState().selectBoard('league-a', '2026', 'one');
    expect(getLastUsedCustomRanking(useCustomRankingStore.getState(), 'league-a', '2026')?.id).toBe('one');
    useCustomRankingStore.getState().deleteBoard('league-a', '2026', 'one');
    expect(getLastUsedCustomRanking(useCustomRankingStore.getState(), 'league-a', '2026')?.id).toBe('two');
  });

  it('defensively rejects duplicate names on create, rename, and replacement', () => {
    const first = board('one');
    const second = board('two');
    useCustomRankingStore.getState().addBoard(first);
    useCustomRankingStore.getState().addBoard(second);
    expect(useCustomRankingStore.getState().addBoard({ ...board('three'), name: '  BOARD ONE  ' })).toBe(false);
    useCustomRankingStore.getState().updateBoardSettings('league-a', '2026', 'two', { ...config, name: ' board ONE ' });
    expect(getCustomRankingsForScope(useCustomRankingStore.getState(), 'league-a', '2026').find(({ id }) => id === 'two')?.name).toBe('Board two');
    useCustomRankingStore.getState().replaceBoard({ ...second, name: 'BOARD ONE' });
    expect(getCustomRankingsForScope(useCustomRankingStore.getState(), 'league-a', '2026').find(({ id }) => id === 'two')?.name).toBe('Board two');
  });

  it('migrates v1 storage without changing frozen rankings or overrides', async () => {
    const current = { ...board('one'), overrides: { p1: 37 } };
    const { mode: _mode, positionCurves: _curves, ...v1Board } = current;
    const migrated = migrateCustomRankingPersistedState({
      boardsByScope: { 'league-a::2026': [{ ...v1Board, schemaVersion: 1 }] },
      lastUsedByScope: { 'league-a::2026': 'one' },
    });
    expect(migrated.boardsByScope['league-a::2026'][0]).toMatchObject({
      schemaVersion: 2,
      mode: 'built-in',
      overrides: { p1: 37 },
      players: current.players,
    });

    localStorage.setItem('guillotine-companion-custom-rankings', JSON.stringify({
      state: { boardsByScope: { 'league-a::2026': [{ ...v1Board, schemaVersion: 1 }] }, lastUsedByScope: { 'league-a::2026': 'one' } },
      version: 1,
    }));
    await useCustomRankingStore.persist.rehydrate();
    const rehydrated = getLastUsedCustomRanking(useCustomRankingStore.getState(), 'league-a', '2026')!;
    expect(rehydrated.schemaVersion).toBe(2);
    expect(customRankingValue(rehydrated, 'p1')).toBe(37);
  });
});
