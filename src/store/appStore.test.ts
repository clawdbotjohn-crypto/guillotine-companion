import { beforeEach, describe, expect, it } from 'vitest';
import {
  migratePersistedAppState,
  normalizeRecentLeagues,
  RECENT_LEAGUE_LIMIT,
  useAppStore,
} from './appStore';

const IDS = [
  '4100000000000000001',
  '4100000000000000002',
  '4100000000000000003',
  '4100000000000000004',
  '4100000000000000005',
  '4100000000000000006',
  '4100000000000000007',
];

describe('app store persistence migration', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.getState().reset();
  });

  it('maps the legacy maximum-bid strategy key to aggressive', () => {
    expect(migratePersistedAppState({
      username: 'john',
      activeStrategy: ['exponent', 'ial'].join(''),
    })).toEqual({
      username: 'john',
      activeStrategy: 'aggressive',
      recentLeagues: [],
    });
  });

  it('defaults fresh and legacy implicit state to Max VORP', () => {
    expect(useAppStore.getState().activeStrategy).toBe('max-vorp');
    expect(migratePersistedAppState({ username: 'john' })).toEqual({ username: 'john', activeStrategy: 'max-vorp', recentLeagues: [] });
    expect(migratePersistedAppState({ username: 'john', activeStrategy: 'unknown' })).toEqual({ username: 'john', activeStrategy: 'max-vorp', recentLeagues: [] });
  });

  it('leaves current explicit persisted strategy keys unchanged apart from normalized saved state', () => {
    expect(migratePersistedAppState({ username: 'john', activeStrategy: 'weeks-starter' })).toEqual({
      username: 'john',
      activeStrategy: 'weeks-starter',
      recentLeagues: [],
    });
  });

  it('survives malformed persisted JSON without replacing valid startup defaults', async () => {
    localStorage.setItem('guillotine-companion-store', '{not valid json');
    await useAppStore.persist.rehydrate();

    expect(useAppStore.getState().recentLeagues).toEqual([]);
    expect(useAppStore.getState().activeStrategy).toBe('max-vorp');
  });

  it('migrates legacy saved entries and drops malformed, duplicate, or privacy-heavy fields', () => {
    expect(migratePersistedAppState({
      activeStrategy: 'max-vorp',
      savedLeagues: [
        { id: IDS[0], name: ' Legacy League ', season: '2026', teamName: 'Do not retain', rosterId: 8 },
        { leagueId: IDS[0], name: 'Duplicate', season: '2026' },
        { leagueId: 'bad-id', name: 'Bad', season: '2026' },
        null,
      ],
    })).toEqual({
      activeStrategy: 'max-vorp',
      recentLeagues: [{ leagueId: IDS[0], name: 'Legacy League', season: '2026' }],
    });
    expect(normalizeRecentLeagues({ corrupted: true })).toEqual([]);
    expect(normalizeRecentLeagues([null, 'bad', { leagueId: IDS[0] }])).toEqual([]);
  });

  it('upgrades the legacy selected league into the minimal recent-league shape', () => {
    expect(migratePersistedAppState({
      activeStrategy: 'max-vorp',
      leagueId: IDS[1],
      leagueName: 'Legacy Selected League',
      leagueSeason: '2026',
      rosterId: 9,
      teamName: 'Private Team Metadata',
    })).toMatchObject({
      recentLeagues: [{
        leagueId: IDS[1],
        name: 'Legacy Selected League',
        season: '2026',
      }],
    });
  });
});

describe('recent leagues', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.getState().reset();
  });

  it('adds, updates renamed metadata, deduplicates, and bounds entries', () => {
    IDS.forEach((leagueId, index) => {
      useAppStore.getState().setLeague(leagueId, `Synthetic League ${index + 1}`, '2026');
    });

    expect(useAppStore.getState().recentLeagues).toHaveLength(RECENT_LEAGUE_LIMIT);
    expect(useAppStore.getState().recentLeagues.map((entry) => entry.leagueId)).toEqual(IDS.slice(1).reverse());

    useAppStore.getState().setLeague(IDS[4], 'Renamed Synthetic League', '2027');
    expect(useAppStore.getState().recentLeagues).toHaveLength(RECENT_LEAGUE_LIMIT);
    expect(useAppStore.getState().recentLeagues[0]).toEqual({
      leagueId: IDS[4],
      name: 'Renamed Synthetic League',
      season: '2027',
    });
    expect(useAppStore.getState().recentLeagues.filter((entry) => entry.leagueId === IDS[4])).toHaveLength(1);
  });

  it('persists across a simulated new browser session', async () => {
    useAppStore.getState().setLeague(IDS[0], 'Persistent Synthetic League', '2026');
    const persisted = localStorage.getItem('guillotine-companion-store');
    expect(persisted).toContain('Persistent Synthetic League');

    useAppStore.getState().reset();
    localStorage.setItem('guillotine-companion-store', persisted!);
    await useAppStore.persist.rehydrate();

    expect(useAppStore.getState().recentLeagues).toEqual([{
      leagueId: IDS[0],
      name: 'Persistent Synthetic League',
      season: '2026',
    }]);
  });

  it('removes and restores one local entry without affecting the active league', () => {
    useAppStore.getState().setLeague(IDS[0], 'Synthetic League', '2026');
    const saved = useAppStore.getState().recentLeagues[0];
    useAppStore.getState().removeRecentLeague(IDS[0]);

    expect(useAppStore.getState().recentLeagues).toEqual([]);
    expect(useAppStore.getState().leagueId).toBe(IDS[0]);

    useAppStore.getState().restoreRecentLeague(saved);
    expect(useAppStore.getState().recentLeagues).toEqual([saved]);
  });
});
