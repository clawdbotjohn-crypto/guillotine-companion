import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildVorpCalibration, calculatePlayerVorp } from '../../src/logic/waivers.ts';
import {
  buildOfflinePlayerValues,
  commonHorizonTeamCount,
  summarizeDistribution,
} from '../middle-vorp-analysis.ts';
import {
  contextFor,
  fixtureProjections,
  type AnalysisFixture,
} from '../analyze-bidding-strategies.ts';

const fixture = JSON.parse(readFileSync('scripts/fixtures/bidding-strategy-seamex-2026.json', 'utf8')) as AnalysisFixture;
const w3 = fixture.snapshots.find((snapshot) => snapshot.requestedDecisionWeek === 3)!;

describe('Middle VORP offline analysis', () => {
  it('implements the specified common horizon and explicit odd-count sensitivity', () => {
    expect(commonHorizonTeamCount(28)).toBe(14);
    expect(commonHorizonTeamCount(27)).toBe(14);
    expect(commonHorizonTeamCount(27, 0.5, 'floor')).toBe(13);
    expect(commonHorizonTeamCount(5)).toBe(4);
    expect(commonHorizonTeamCount(28, 0.67)).toBe(19);
    expect(commonHorizonTeamCount(28, 0.33)).toBe(10);
  });

  it('uses one 14-team calibration for every player rather than maximizing per player', () => {
    const projections = fixtureProjections(w3);
    const ctx = contextFor(fixture, 3);
    const rows = buildOfflinePlayerValues(projections, ctx);
    const calibration = buildVorpCalibration(projections, ctx.startersPerPos, 14, ctx.budget)!;
    for (const row of rows) {
      const projection = projections.get(row.playerId)!;
      const vorp = calculatePlayerVorp(projection, calibration.replacementByPosition);
      const expected = vorp == null ? 0 : Math.max(0, Math.round(vorp * calibration.dollarsPerVorp));
      expect(row.middleVorp).toBe(expected);
    }
    expect(new Set(rows.filter((row) => row.maxVorp > 0).map((row) => row.maxVorpStage)).size).toBeGreaterThan(1);
    expect(summarizeDistribution(rows.map((row) => row.middleVorp)).positive).toBe(93);
  });

  it('keeps floor and ceil identical for observed even-team snapshots', () => {
    for (const week of [2, 3]) {
      const snapshot = fixture.snapshots.find((row) => row.requestedDecisionWeek === week)!;
      const rows = buildOfflinePlayerValues(fixtureProjections(snapshot), contextFor(fixture, week));
      expect(rows.map((row) => row.horizon50Floor)).toEqual(rows.map((row) => row.middleVorp));
    }
  });
});
