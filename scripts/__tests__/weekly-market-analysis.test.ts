import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { enrichEvents, type AnalysisFixture } from '../analyze-bidding-strategies.ts';
import {
  buildWeeklyMarketAnalysis,
  OWNER_DIRECTED_EXCLUSION,
  summarizeRatios,
  unfittedRSquared,
  type WeeklyMarketAnalysis,
} from '../weekly-market-analysis.ts';
import { plainFiveBulletAnswer, renderWeeklyMarketMarkdown } from '../weekly-market-report.ts';

let analysis: WeeklyMarketAnalysis;

beforeAll(async () => {
  const fixture = JSON.parse(await readFile('scripts/fixtures/bidding-strategy-seamex-2026.json', 'utf8')) as AnalysisFixture;
  analysis = buildWeeklyMarketAnalysis(enrichEvents(fixture).usable);
});

describe('weekly top-three and median-market analysis', () => {
  it('proves and excludes only the anonymized owner-directed W3 event', () => {
    expect(OWNER_DIRECTED_EXCLUSION).toMatchObject({ decisionWeek: 3, actualBid: 234, outcome: 'won' });
    expect(analysis.exclusion).toMatchObject({ marker: 'owner-directed-outlier-01', canonicalMatchCount: 1 });
    expect(analysis.exclusion.proof).toContain('private GET-only catalog match');
    expect(analysis.ownerDirected.topThree.map((week) => week.rows.map((row) => row.winningBid))).toEqual([
      [285, 153, 99],
      [231, 187, 103],
      [300, 187, 128],
    ]);
    expect(analysis.withExcludedTarget.topThree[1].rows.map((row) => row.winningBid)).toEqual([234, 231, 187]);
  });

  it('reports exact weekly winning and serious-median ratio aggregates', () => {
    const [week2, week3, week4] = analysis.ownerDirected.topThree;
    expect(week2.winnerMultipliers['max-vorp'].arithmeticMean).toBeCloseTo(3.3402014652, 9);
    expect(week2.winnerMultipliers.vorp.geometricMean).toBeCloseTo(3.2431277708, 9);
    expect(week2.marketMultipliers['corrected-safe'].median).toBeCloseTo(0.9868421053, 9);
    expect(week3.winnerMultipliers['max-vorp'].arithmeticMean).toBeCloseTo(2.3489010989, 9);
    expect(week3.winnerMultipliers.vorp.median).toBeCloseTo(2.4285714286, 9);
    expect(week3.marketMultipliers['corrected-weeks-starter'].geometricMean).toBeCloseTo(0.6457685686, 9);
    expect(week4.winnerMultipliers['max-vorp'].arithmeticMean).toBeCloseTo(2.7371071327, 9);
    expect(week4.marketMultipliers['corrected-weeks-starter'].geometricMean).toBeCloseTo(1.1383815404, 9);
    expect(week2.rows.map((row) => row.seriousMedianBid)).toEqual([85, 75, 56.5]);
    expect(week3.rows.map((row) => row.seriousMedianBid)).toEqual([56, 66.5, 54.5]);
    expect(week4.rows.map((row) => row.seriousMedianBid)).toEqual([171, 100, 61]);
  });

  it('finds the fixture leaders overall and for every eligible week', () => {
    const [overall, week2, week3, week4] = analysis.ownerDirected.marketMetrics;
    expect([overall.week, week2.week, week3.week, week4.week]).toEqual([null, 2, 3, 4]);
    expect(overall).toMatchObject({ seriousMedianClusters: 41, closest: 'Current-team VoRP', closestWinning: 'Corrected Safe', closestAllBid: 'Current-team VoRP' });
    expect(week2).toMatchObject({ seriousMedianClusters: 13, closest: 'Max VORP' });
    expect(week3).toMatchObject({ seriousMedianClusters: 15, closest: 'Current-team VoRP' });
    expect(week4).toMatchObject({ seriousMedianClusters: 13, closest: 'Corrected Weeks as Starter', closestWinning: 'Corrected Safe', closestAllBid: 'Max VORP' });
    expect(overall.metrics.find((row) => row.id === 'middle-vorp')?.mae).toBeCloseTo(27.2857142857, 9);
    expect(week2.metrics.find((row) => row.id === 'max-vorp')?.mae).toBeCloseTo(14.8636363636, 9);
    expect(week3.metrics.find((row) => row.id === 'vorp')?.mae).toBeCloseTo(6.6, 9);
    expect(week4.metrics.find((row) => row.id === 'corrected-weeks-starter')?.mae).toBeCloseTo(16.3, 9);
    expect(analysis.withExcludedTarget.marketMetrics[0].seriousMedianClusters).toBe(42);
    expect(analysis.withExcludedTarget.marketMetrics[0].closest).toBe('Current-team VoRP');
  });

  it('fits every prior eligible week and scores the immediately adjacent week', () => {
    const middleWinner = analysis.ownerDirected.heldOutScaleMetrics.winning.find((row) => row.id === 'middle-vorp')!;
    const middleMarket = analysis.ownerDirected.heldOutScaleMetrics.seriousMedian.find((row) => row.id === 'middle-vorp')!;
    expect(middleWinner).toMatchObject({ fitWeek: 2, testWeek: 3, n: 5, scaleEstimator: 'median' });
    expect(middleWinner.fittedMultiplier).toBeCloseTo(4.3125, 9);
    expect(middleWinner.mae).toBeCloseTo(60.15, 9);
    expect(middleMarket.fittedMultiplier).toBeCloseTo(2.1395265423, 9);
    expect(middleMarket.mae).toBeCloseTo(44.8601147776, 9);
    const nextMiddleMarket = analysis.ownerDirected.heldOutScaleMetrics.seriousMedian.find((row) => row.id === 'middle-vorp' && row.fitWeek === 3)!;
    expect(nextMiddleMarket).toMatchObject({ fitWeek: 3, testWeek: 4, n: 5, scaleEstimator: 'median' });
    expect(nextMiddleMarket.fittedMultiplier).toBeCloseTo(1.1847826087, 9);
    expect(nextMiddleMarket.mae).toBeCloseTo(31.35, 9);
    expect(analysis.ownerDirected.heldOutScaleMetrics.seriousMedian).toHaveLength(10);
  });

  it('guards zero denominators, reports coverage, and treats R² as an unfitted diagnostic', () => {
    expect(summarizeRatios([2, null, 8])).toEqual({ total: 3, defined: 2, arithmeticMean: 5, geometricMean: 4, median: 5 });
    expect(unfittedRSquared([1, 2], [1, 2])).toBe(1);
    expect(unfittedRSquared([1], [1])).toBeNull();
    expect(unfittedRSquared([2, 2], [2, 2])).toBeNull();
  });

  it('puts exactly five plain bullets first and keeps identities private', () => {
    const bullets = plainFiveBulletAnswer(analysis);
    const markdown = renderWeeklyMarketMarkdown(analysis);
    expect(bullets).toHaveLength(5);
    expect(bullets[1]).toContain('W2');
    expect(bullets[1]).toContain('W3');
    expect(bullets[1]).toContain('W4');
    expect(bullets.join('\n')).toContain('closest overall serious-median strategy is Current-team VoRP');
    expect(markdown.indexOf('## Five-bullet answer')).toBeLessThan(markdown.indexOf('## Weekly top-three'));
    expect(markdown).toContain('Max VORP 3.34×');
    expect(markdown).toContain('VoRP 3.00×');
    expect(markdown).toContain('private GET-only catalog match');
    expect(markdown).not.toMatch(/player_[0-9]|manager_[0-9]|league[_ -]?id\s*[0-9]|\b[0-9]{17,20}\b/i);
  });
});
