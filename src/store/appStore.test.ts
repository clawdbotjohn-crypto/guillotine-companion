import { describe, expect, it } from 'vitest';
import { migratePersistedAppState, useAppStore } from './appStore';

describe('app store persistence migration', () => {
  it('maps the legacy maximum-bid strategy key to aggressive', () => {
    expect(migratePersistedAppState({
      username: 'john',
      activeStrategy: ['exponent', 'ial'].join(''),
    })).toEqual({
      username: 'john',
      activeStrategy: 'aggressive',
    });
  });

  it('defaults fresh and legacy implicit state to Max VORP', () => {
    expect(useAppStore.getState().activeStrategy).toBe('max-vorp');
    expect(migratePersistedAppState({ username: 'john' })).toEqual({ username: 'john', activeStrategy: 'max-vorp' });
    expect(migratePersistedAppState({ username: 'john', activeStrategy: 'unknown' })).toEqual({ username: 'john', activeStrategy: 'max-vorp' });
  });

  it('leaves current explicit persisted strategy keys unchanged', () => {
    const state = { username: 'john', activeStrategy: 'weeks-starter' };
    expect(migratePersistedAppState(state)).toBe(state);
  });
});
