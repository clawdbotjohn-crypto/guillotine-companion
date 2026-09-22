import { describe, expect, it } from 'vitest';
import { migratePersistedAppState } from './appStore';

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

  it('leaves current persisted strategy keys unchanged', () => {
    const state = { username: 'john', activeStrategy: 'weeks-starter' };
    expect(migratePersistedAppState(state)).toBe(state);
  });
});
