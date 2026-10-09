/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_CUSTOM_RANKINGS,
  applyCustomRankingFormula,
  createCustomRanking,
  customRankingValue,
  recalculateCustomRanking,
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
  name: ' My Board ', baseRankingSource: 'sleeper', baseStrategy: 'max-vorp', multiplier: 2, modifier: -15,
};

function board(id: string, leagueId = 'league-a', season = '2026') {
  return createCustomRanking({ id, leagueId, season, config: { ...config, name: `Board ${id}` }, rows, now: '2026-10-09T00:00:00.000Z' });
}

describe('custom ranking model', () => {
  beforeEach(() => {
    localStorage.clear();
    useCustomRankingStore.setState({ boardsByScope: {}, lastUsedByScope: {} });
  });

  it('creates a deterministic frozen baseline with a $0 floor', () => {
    const created = createCustomRanking({ id: 'board-1', leagueId: 'league-a', season: '2026', config, rows, now: '2026-10-09T00:00:00.000Z' });
    expect(created.name).toBe('My Board');
    expect(created.schemaVersion).toBe(1);
    expect(created.players.p1.baselineValue).toBe(65);
    expect(created.players.p2.baselineValue).toBe(0);
    expect(applyCustomRankingFormula(2, 3, -20)).toBe(0);
  });

  it('keeps manual overrides explicit and preserves them when settings alone are saved', () => {
    const store = useCustomRankingStore.getState();
    store.addBoard(board('one'));
    store.setOverride('league-a', '2026', 'one', 'p1', 91);
    store.updateBoardSettings('league-a', '2026', 'one', { ...config, name: 'Renamed', multiplier: 4 });
    const updated = getLastUsedCustomRanking(useCustomRankingStore.getState(), 'league-a', '2026')!;
    expect(updated.name).toBe('Renamed');
    expect(updated.multiplier).toBe(2);
    expect(updated.modifier).toBe(-15); // formula metadata still describes the frozen baseline
    expect(updated.players.p1.baselineValue).toBe(65);
    expect(customRankingValue(updated, 'p1')).toBe(91);
  });

  it('only clears manual work through explicit reset or recalculation', () => {
    const original = { ...board('one'), overrides: { p1: 91 } };
    useCustomRankingStore.getState().addBoard(original);
    useCustomRankingStore.getState().clearOverrides('league-a', '2026', 'one');
    expect(customRankingValue(getLastUsedCustomRanking(useCustomRankingStore.getState(), 'league-a', '2026')!, 'p1')).toBe(65);

    useCustomRankingStore.getState().setOverride('league-a', '2026', 'one', 'p1', 99);
    const recalculated = recalculateCustomRanking(
      getLastUsedCustomRanking(useCustomRankingStore.getState(), 'league-a', '2026')!,
      { ...config, baseStrategy: 'safe', multiplier: 1, modifier: 3 },
      rows,
      '2026-10-10T00:00:00.000Z',
    );
    useCustomRankingStore.getState().replaceBoard(recalculated);
    const result = getLastUsedCustomRanking(useCustomRankingStore.getState(), 'league-a', '2026')!;
    expect(result.overrides).toEqual({});
    expect(result.players.p1.baselineValue).toBe(23);
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

  it('rehydrates versioned browser storage including the last-used board', async () => {
    const one = board('one');
    const two = board('two');
    localStorage.setItem('guillotine-companion-custom-rankings', JSON.stringify({
      state: {
        boardsByScope: { 'league-a::2026': [one, two] },
        lastUsedByScope: { 'league-a::2026': 'two' },
      },
      version: 1,
    }));
    await useCustomRankingStore.persist.rehydrate();
    expect(getCustomRankingsForScope(useCustomRankingStore.getState(), 'league-a', '2026')).toHaveLength(2);
    expect(getLastUsedCustomRanking(useCustomRankingStore.getState(), 'league-a', '2026')?.id).toBe('two');
  });

});
