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
  it('normalizes only volatile Chromium PDF timestamps', () => {
    const first = Buffer.from("%PDF /CreationDate (D:20260927101000+00'00') /ModDate (D:20260927101000+00'00') body", 'latin1');
    const second = Buffer.from("%PDF /CreationDate (D:20260927101159+00'00') /ModDate (D:20260927101159+00'00') body", 'latin1');
    expect(normalizePdfMetadata(first)).toEqual(normalizePdfMetadata(second));
    expect(normalizePdfMetadata(first).toString('latin1')).toContain("D:20260925230008+00'00'");
  });

  it('reproduces the audited fixture values and distinguishes sample from robust result', () => {
    expect(model).toMatchObject({
      usable: { length: 239 },
      wins: { length: 47 },
      serious: { length: 165 },
      seriousWins: { length: 29 },
      managerRows: { length: 133 },
      managerWinRows: { length: 27 },
      sampleWinner: { label: 'Aggressive' },
      seriousSampleWinner: { label: 'Aggressive' },
      robustLeaders: ['Aggressive', 'Max VORP', 'Max VORP'],
    });
    expect(model.sampleWinner.metrics.mae).toBeCloseTo(26.4468085, 7);
    expect(model.sampleWinner.interval?.[0]).toBeCloseTo(17.1914894, 7);
    expect(model.sampleWinner.interval?.[1]).toBeCloseTo(37.575, 7);
    expect(model.seriousSampleWinner.metrics.mae).toBeCloseTo(38.4827586, 7);
    expect(model.allMetrics.find((row) => row.label === 'VoRP')?.metrics.mae).toBeCloseTo(24.4476987, 7);
    expect(model.managerMetrics.mae).toBeCloseTo(28.0300752, 7);
    expect(model.managerWinMetrics.mae).toBeCloseTo(22.8888889, 7);
  });

  it('uses the explicit unfitted R² definition, including valid negative results', () => {
    expect(rSquared([{ actual: 1, predicted: 1 }, { actual: 2, predicted: 2 }])).toBe(1);
    expect(rSquared([{ actual: 1, predicted: 10 }, { actual: 2, predicted: 10 }])).toBeLessThan(0);
    expect(rSquared(model.managerRows)).toBeCloseTo(-0.0692019, 7);
    expect(rSquared(model.managerWinRows)).toBeCloseTo(0.4641016, 7);
  });

  it('renders byte-deterministically with required caveats and no external runtime', () => {
    expect(renderBiddingPresentation(model)).toBe(html);
    expect(model.weeklyBullets).toHaveLength(5);
    expect(model.weeklyAnalysis.ownerDirected.marketMetrics[0].closest).toBe('VoRP');
    expect(html.indexOf('Five-bullet answer')).toBeLessThan(html.indexOf('Prior accuracy study'));
    expect(html).toContain('Weekly top-three winning multipliers');
    expect(html).toContain('Exact weekly top-three multipliers');
    expect(html).toContain('Median-market fit: overall, by week, and all-bid sensitivity');
    expect(html).toContain('Compact with-vs-without sensitivity');
    expect(html).toContain('R² = 1 − SSE / SST');
    expect(html).toContain('95% bootstrap MAE CI');
    expect(html).toContain('smaller, non-comparable subset');
    expect(html).toContain('Reconstructed W2–W3 projection snapshots');
    expect(html).not.toMatch(/manager_[0-9]|roster_[0-9]|\b\d{17,20}\b/i);
    expect(html).not.toMatch(/<script\b|https?:\/\/[^<]*\.(?:js|css)/i);
  });
});
