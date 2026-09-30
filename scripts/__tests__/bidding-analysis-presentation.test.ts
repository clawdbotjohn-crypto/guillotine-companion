import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AnalysisFixture } from '../analyze-bidding-strategies.ts';
import {
  buildPresentationModel,
  renderBiddingPresentation,
  normalizePdfMetadata,
  rSquared,
  type PresentationModel,
} from '../generate-bidding-analysis-presentation.ts';

let model: PresentationModel;
let html: string;

beforeAll(async () => {
  const fixture = JSON.parse(await readFile('scripts/fixtures/bidding-strategy-seamex-2026.json', 'utf8')) as AnalysisFixture;
  model = buildPresentationModel(fixture);
  html = renderBiddingPresentation(model);
});

describe('owner-facing bidding analysis presentation', () => {
  it('normalizes volatile Chromium PDF timestamps and tagged-node IDs', () => {
    const first = Buffer.from("%PDF /CreationDate (D:20260927101000+00'00') /ModDate (D:20260927101000+00'00') /Headers [(node00002365)] /ID (node00002365) /ID (node00002366) body", 'latin1');
    const second = Buffer.from("%PDF /CreationDate (D:20260927101159+00'00') /ModDate (D:20260927101159+00'00') /Headers [(node00001790)] /ID (node00001790) /ID (node00001791) body", 'latin1');
    expect(normalizePdfMetadata(first)).toEqual(normalizePdfMetadata(second));
    expect(normalizePdfMetadata(first).toString('latin1')).toContain("D:20260925230008+00'00'");
    expect(normalizePdfMetadata(first).toString('latin1')).toContain('/Headers [(node00000001)] /ID (node00000001) /ID (node00000002)');
  });

  it('reproduces the audited fixture values and distinguishes sample from robust result', () => {
    expect(model).toMatchObject({
      usable: { length: 355 },
      wins: { length: 72 },
      serious: { length: 240 },
      seriousWins: { length: 42 },
      managerRows: { length: 243 },
      managerWinRows: { length: 50 },
      sampleWinner: { label: 'Legacy Aggressive' },
      seriousSampleWinner: { label: 'Legacy Aggressive' },
      robustLeaders: ['Legacy Aggressive', 'Legacy Aggressive', 'Legacy Aggressive'],
    });
    expect(model.sampleWinner.metrics.mae).toBeCloseTo(20.2361111, 7);
    expect(model.sampleWinner.interval?.[0]).toBeCloseTo(12.4166667, 7);
    expect(model.sampleWinner.interval?.[1]).toBeCloseTo(29.7659722, 7);
    expect(model.seriousSampleWinner.metrics.mae).toBeCloseTo(33.452381, 7);
    expect(model.allMetrics.find((row) => row.label === 'Current-team VoRP')?.metrics.mae).toBeCloseTo(26.3464789, 7);
    expect(model.managerMetrics.mae).toBeCloseTo(28.7901235, 7);
    expect(model.managerWinMetrics.mae).toBeCloseTo(18.86, 7);
  });

  it('uses the explicit unfitted R² definition, including valid negative results', () => {
    expect(rSquared([{ actual: 1, predicted: 1 }, { actual: 2, predicted: 2 }])).toBe(1);
    expect(rSquared([{ actual: 1, predicted: 10 }, { actual: 2, predicted: 10 }])).toBeLessThan(0);
    expect(rSquared(model.managerRows)).toBeCloseTo(0.3668318, 7);
    expect(rSquared(model.managerWinRows)).toBeCloseTo(0.6412804, 7);
  });

  it('renders byte-deterministically with required caveats and no external runtime', () => {
    expect(renderBiddingPresentation(model)).toBe(html);
    expect(model.weeklyBullets).toHaveLength(5);
    expect(model.weeklyAnalysis.ownerDirected.marketMetrics[0].closest).toBe('Current-team VoRP');
    expect(html.indexOf('Five-bullet answer')).toBeLessThan(html.indexOf('Prior accuracy study'));
    expect(html).toContain('Middle VORP stays analysis-only');
    expect(html).toContain('Recommendation: retain analysis-only');
    expect(html).toContain('Current-state dollar distributions');
    expect(html).toContain('Prior-week-fitted held-out scale');
    expect(html).toContain('Weekly top-three winning multipliers');
    expect(html).toContain('Exact weekly top-three multipliers');
    expect(html).toContain('Median-market fit: overall, by week, and all-bid sensitivity');
    expect(html).toContain('Compact with-vs-without sensitivity');
    expect(html).toContain('R² = 1 − SSE / SST');
    expect(html).toContain('Raw prediction R²*');
    expect(html).toContain('not the goodness-of-fit R² from a regression');
    expect(html).not.toContain('<th scope="col">R²</th>');
    expect(html).toContain('95% bootstrap MAE CI');
    expect(html).toContain('smaller, non-comparable subset');
    expect(html).toContain('Reconstructed W2–W3–W4 projection snapshots');
    expect(html.indexOf('Five-bullet answer')).toBeLessThan(html.indexOf('id="middle-title"'));
    const ownerWeeklySection = html.slice(html.indexOf('id="weekly-title"'), html.indexOf('id="behavioral-title"'));
    expect(ownerWeeklySection).toContain('Max VORP');
    expect(ownerWeeklySection).toContain('Current-team VoRP');
    expect(ownerWeeklySection).toContain('Corrected Safe');
    expect(ownerWeeklySection).toContain('Corrected Weeks as Starter');
    expect(ownerWeeklySection).not.toContain('Middle VORP');
    expect(html).toContain('Behavioral-question audit appendix');
    expect(html).toContain('11 target rows');
    expect(html).toContain('50 manager predictions');
    expect(html).toContain('5 canonical claims');
    expect(html).toContain('4 observed players');
    expect(html).toContain('11 teams');
    expect(html).toContain('8 raw and 7 canonical claims');
    expect(html).toContain('240 serious bids and 72 winners');
    expect(html).toContain('simple 1.5× Max VORP');
    expect(html).toContain('leaving $312');
    expect(html).not.toMatch(/manager_[0-9]|roster_[0-9]|\b\d{17,20}\b/i);
    expect(html).not.toMatch(/<script\b|https?:\/\/[^<]*\.(?:js|css)/i);
  });
});
