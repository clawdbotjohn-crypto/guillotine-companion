import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  artifactFilename,
  computePrewaiverCapture,
  stableHash,
  writeImmutablePanel,
  type PrewaiverCaptureInput,
} from '../prewaiver-capture.ts';

const SALT = 'fixture-test-salt-2026-not-private';
let fixture: PrewaiverCaptureInput;

beforeAll(async () => {
  fixture = JSON.parse(await readFile('scripts/fixtures/prewaiver-capture-input.json', 'utf8')) as PrewaiverCaptureInput;
});

function clone(): PrewaiverCaptureInput {
  return structuredClone(fixture);
}

describe('prospective pre-waiver opportunity capture', () => {
  it('uses production lineup ranks, tie-breaks, percentiles, and buyer likelihood over active managers only', () => {
    const result = computePrewaiverCapture(clone(), SALT);
    expect(result.timing).toMatchObject({ eligible: true, state: 'pre-waiver-exact' });
    expect(result.validation).toMatchObject({
      managerCount: 6,
      activeManagerCount: 5,
      targetCount: 2,
      expectedRowCount: 12,
      actualRowCount: 12,
      uniqueRowCount: 12,
    });
    const wr = result.panel!.rows.filter((row) => row.targetPosition === 'WR' && row.active);
    expect(wr.map((row) => row.positionalStrengthRank).sort()).toEqual([1, 2, 3, 4, 5]);
    const tied = wr.filter((row) => row.positionalStrengthPoints === 18)
      .sort((a, b) => a.positionalStrengthRank! - b.positionalStrengthRank!);
    expect(tied.map((row) => row.positionalStrengthRank)).toEqual([2, 3]);
    expect(tied.map((row) => row.needPercentile)).toEqual([0.25, 0.5]);
    expect(wr.find((row) => row.positionalStrengthRank === 1)?.likelihood).toBe('Unlikely');
    expect(wr.find((row) => row.positionalStrengthRank === 5)?.likelihood).toBe('Likely');
    const eliminated = result.panel!.rows.filter((row) => !row.active);
    expect(eliminated).toHaveLength(2);
    expect(eliminated.every((row) => row.eliminatedWeek === 4
      && row.positionalStrengthRank == null
      && row.predictedBid == null
      && row.feasiblePrediction == null)).toBe(true);
  });

  it('preserves raw willingness separately from the production FAAB-capped feasible prediction', () => {
    const rows = computePrewaiverCapture(clone(), SALT).panel!.rows;
    const capped = rows.find((row) => row.predictedBid === 560)!;
    expect(capped).toMatchObject({ preWaiverFaab: 40, feasiblePrediction: 40, cappedByFaab: true });
    const uncapped = rows.find((row) => row.predictedBid === 112)!;
    expect(uncapped).toMatchObject({ feasiblePrediction: 112, cappedByFaab: false });
    expect(rows.every((row) => row.targetStrategies.maxVorp != null
      && row.targetStrategies.safe != null
      && row.targetStrategies.weeksAsStarter != null
      && row.targetStrategies.aggressive != null)).toBe(true);
  });

  it('makes an unconfigured/no-rank target neutral without inventing a rank', () => {
    const input = clone();
    input.league.rosterPositions = input.league.rosterPositions.filter((position) => position !== 'WR' && position !== 'FLEX');
    const wr = computePrewaiverCapture(input, SALT).panel!.rows.filter((row) => row.targetPosition === 'WR');
    expect(wr.every((row) => row.positionalStrengthRank == null
      && row.positionalStrengthOutOf == null
      && row.needPercentile == null
      && row.needScore == null
      && row.likelihood === 'Possible')).toBe(true);
  });

  it('validates week mapping, missing references, and the explicit exact timing gate', () => {
    const badWeek = clone();
    badWeek.playingWeek = badWeek.decisionWeek;
    expect(() => computePrewaiverCapture(badWeek, SALT)).toThrow('playingWeek must equal decisionWeek - 1');

    const missing = clone();
    missing.managers[0].playerSourceIds.push('missing-private-player-id');
    expect(() => computePrewaiverCapture(missing, SALT)).toThrow('references missing player');

    const late = clone();
    late.captureAt = late.captureWindow.closesAt;
    const result = computePrewaiverCapture(late, SALT);
    expect(result.timing).toMatchObject({ eligible: false, state: 'post-waiver' });
    expect(result.panel).toBeNull();
    expect(result.validation.actualRowCount).toBe(12);
    expect(result.timing.reason).toContain('must not be reconstructed');

    const staleTimestamp = clone();
    const wallClockLate = computePrewaiverCapture(staleTimestamp, SALT, staleTimestamp.captureWindow.closesAt);
    expect(wallClockLate.timing).toMatchObject({ eligible: false, state: 'post-waiver' });
    expect(wallClockLate.panel).toBeNull();
    expect(wallClockLate.timing.reason).toContain('stale timestamps cannot create an exact panel');
  });

  it('is deterministic, hashes rows/input, writes idempotently, and refuses immutable conflicts', async () => {
    const first = computePrewaiverCapture(clone(), SALT).panel!;
    const second = computePrewaiverCapture(clone(), SALT).panel!;
    expect(first).toEqual(second);
    expect(first.audit.inputHash).toBe(stableHash(fixture));
    expect(first.audit.rowsHash).toBe(stableHash(first.rows));

    const outputDir = await mkdtemp(join(tmpdir(), 'prewaiver-capture-'));
    await expect(writeImmutablePanel(first, outputDir)).resolves.toMatchObject({ status: 'written' });
    await expect(writeImmutablePanel(second, outputDir)).resolves.toMatchObject({ status: 'unchanged' });
    const outputPath = join(outputDir, artifactFilename(first));
    const conflict = JSON.parse(await readFile(outputPath, 'utf8'));
    conflict.context.activeTeamCount += 1;
    await writeFile(outputPath, `${JSON.stringify(conflict, null, 2)}\n`);
    await expect(writeImmutablePanel(first, outputDir)).rejects.toThrow('Immutable artifact conflict');
  });

  it('does not persist private source identifiers, names, league IDs, or the alias salt', () => {
    const input = clone();
    const panel = computePrewaiverCapture(input, SALT).panel!;
    const serialized = JSON.stringify(panel);
    expect(serialized).not.toContain(SALT);
    for (const manager of input.managers) expect(serialized).not.toContain(manager.sourceRosterId);
    for (const player of input.players) expect(serialized).not.toContain(player.sourceId);
    expect(panel.rows.every((row) => /^manager_[a-f0-9]{16}$/.test(row.managerKey))).toBe(true);
    expect(panel.rows.every((row) => /^player_[a-f0-9]{16}$/.test(row.targetKey))).toBe(true);
  });

  it('preserves honest missing rank/profile data instead of inventing values', () => {
    const input = clone();
    const target = input.players.find((player) => player.sourceId === 'target_fixture_wr')!;
    delete target.sourceRank;
    input.managers[0].profile.managerMultiplier = null;
    const rows = computePrewaiverCapture(input, SALT).panel!.rows;
    const targetRows = rows.filter((row) => row.targetPosition === 'WR');
    expect(targetRows.every((row) => row.targetRank == null && row.targetPositionRank > 0)).toBe(true);
    expect(targetRows.find((row) => row.preWaiverFaab === 200)).toMatchObject({
      predictedBid: null,
      feasiblePrediction: null,
      cappedByFaab: null,
      predictionInputs: { managerMultiplier: null },
    });
  });

  it('fails closed on insufficient salt and unsupported K/DEF targets', () => {
    expect(() => computePrewaiverCapture(clone(), 'short')).toThrow('at least 16 characters');
    const input = clone();
    input.targetSourceIds = ['player_fixture_m01_k'];
    expect(() => computePrewaiverCapture(input, SALT)).toThrow('is not eligible for the production waiver board');
  });
});
