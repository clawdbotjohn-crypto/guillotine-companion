# SeaMex 2026 bidding-strategy accuracy analysis

Deterministic offline report generated from anonymized fixture version 1. Data are complete through **2026-09-25T23:00:08.539Z**; there is no wall-clock generation timestamp. Regenerate byte-for-byte with `npm run analyze:bidding`.

## Executive result

Among 47 usable winning bids, **Aggressive** has the lowest in-sample MAE (26.4). After the predeclared token rule, **Aggressive** is lowest (38.5). Robust-filter leaders are ratio-gap flag removed: Aggressive; MAD flag removed: Max VORP; IQR flag removed: Max VORP; the serious-bid leader is **not** stable across them. This is descriptive evidence from one 32-team league, 2 reconstructed decision weeks, not a universal strategy ranking. Do **not** change the production default from this study alone.

The executable comparison uses the five strategies that actually exist in the registry: Max VORP, VoRP, Safe, Aggressive, and Weeks-as-Starter. The P0 label “Weekly” is **not** silently mapped to VoRP; the naming audit below establishes why it is excluded as undefined.

## Naming audit: requested “Weekly” is not an implemented strategy

| Evidence | Authoritative finding |
| --- | --- |
| Initial strategy implementation `c331281` (2026-09-21) | Registry keys were `safe`, `exponential`, `weeks-starter`, and `vorp`; UI label for `vorp` was “VoRP.” |
| Rename `1656925` (2026-09-23) | `exponential` became `aggressive`; no Weekly strategy was introduced. |
| Max-VORP addition `7c32a1f` (2026-09-25) | Added `max-vorp`; the other keys remained `weeks-starter`, `safe`, `aggressive`, and `vorp`. |
| Exhaustive local history/ref search | No commit, branch, registry, type, or UI label defines a `weekly` strategy or an alias from Weekly to `vorp`. |
| PR #10 terminology | “historicalWeeklyBaseline” is explicitly documented as reusing the existing **Weeks-as-Starter** formula, and the implementation selected `weeks-starter`. It is a time-indexed baseline description, not a separate strategy and not a VoRP alias. |

**Resolution:** there is no authoritative basis to rename `vorp` to Weekly, and treating “weekly baseline” as a separate strategy would merely duplicate Weeks-as-Starter, which P0 already lists separately. Therefore requested **Weekly is excluded with reason `no-authoritative-formula-or-key`**, while the current registry's `vorp` output is analyzed under its real label, **VoRP**. If John intended a sixth/distinct Weekly formula, its definition must be supplied before it can be replayed without fabrication.

## Provenance and replay contract

- Sleeper public API base: `https://api.sleeper.app/v1`; season 2026; transaction payload SHA-256 `e1dea5063abf1613ac98fe92fc8e1c2d725a6eec7847e3d7b9ec55164474a297`. The private league identifier is intentionally absent.
- Projection source: read-only Supabase project ref `xduqpomhjdlgmtmmkfed`, verified before every refresh. Refresh uses GET only. No credential, raw payload, player ID/name, manager ID/name, or league ID is stored.
- League settings observed at refresh: 32 starting teams, $500 initial FAAB, ppr, lineup `QB,RB,RB,WR,WR,TE,FLEX,K,DEF,BN,BN,BN,BN`. Sleeper provides no historical settings endpoint, so season stability is an explicit assumption, not silently inferred history.
- Active teams use the production progression estimator, not current rosters: W2=30, W3=28. Every transaction week is translated to decision week as `transactionWeek + 1`.
- Fixture refresh (private environment only): `SUPABASE_PROJECT_REF=xduqpomhjdlgmtmmkfed SUPABASE_URL=https://xduqpomhjdlgmtmmkfed.supabase.co SUPABASE_READ_KEY=<private> LEAGUE_ID=<private> npm run analyze:bidding -- --refresh`. Offline report: `npm run analyze:bidding`. Focused tests: `npm test -- --run scripts/__tests__/bidding-strategy-analysis.test.ts`. Full verification: `npm test -- --run`, `npm run lint`, script-only `tsc --ignoreConfig --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --allowImportingTsExtensions --types node scripts/analyze-bidding-strategies.ts scripts/bidding-strategy-analysis.ts`, `git diff --check`, and changed-file secret/identifier scan.

### Projection snapshots

| Requested decision week | Stored week | Status/provenance | Canonical cutoff/effective at | Capture started | Provider fetched at | Content hash / exclusion | Raw rows | ROS players |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 2 | reconstructed | 2026-09-16T03:00:00+00:00 | 2026-09-25T07:57:31.224+00:00 | 2026-09-25T07:57:31.224+00:00 | c6613f6cb9a739f1… | 17847 | 1162 |
| 3 | 3 | reconstructed | 2026-09-23T03:00:00+00:00 | 2026-09-25T07:57:35.629+00:00 | 2026-09-25T07:57:35.629+00:00 | 0aea608679cb52d1… | 16867 | 1142 |
| 4 | 3 | excluded | — | — | — | only-earlier-decision-week-fallback-exists | 0 | 0 |

Per the repository's provenance rules, all W1–W3 snapshot runs—including the usable W2/W3 runs here—are labeled **reconstructed**, never exact. A same-week reconstructed capture preserves what was actually stored and its capture/effective-at provenance, but it is not proof of the pre-waiver forecast. An earlier-week fallback is not substituted: affected events are excluded.

## Extraction and exclusion audit

| Transaction week | Raw transactions | Raw waivers |
| --- | --- | --- |
| 1 | 206 | 146 |
| 2 | 226 | 194 |
| 3 | 37 | 23 |

- Raw transactions: **469**; raw waivers: **363**.
- Before dedupe: 70 completed wins and 265 same-batch/player-proven legitimate losses. After manager+player+processing-batch dedupe: **70 wins + 241 losses = 311 canonical bids**; 24 contingency/drop paths removed.
- FAAB ledger inputs: 47 completed spend rows and 0 completed transfer records. Reconstruction: transaction-ledger=311, inferred-minimum=0, uncertain=0. A claim that exceeds the reconstructed ledger is retained at an explicit inferred minimum; unreliable prior timestamps are marked uncertain.
- Formula-usable events: **239** (47 wins, 192 legitimate losses); token/low-intent: 74; serious: 165; serious competitive-cluster bids: 155 across 19 player/batches.

| Exclusion reason | Count |
| --- | --- |
| classifier:non-waiver:chopped | 4 |
| classifier:non-waiver:free_agent | 102 |
| classifier:waiver:failed-claim-without-same-batch-winner | 7 |
| classifier:waiver:failed-without-claimed-by-other-proof | 21 |
| analysis:only-earlier-decision-week-fallback-exists | 23 |
| analysis:target-missing-supported-position-projection | 49 |

## Fixed rules (declared before looking at winners)

- **Token/low intent:** bid ≤ max($1, 1% of original FAAB) = $5. Evidence is never deleted; it is separated in sensitivity views.
- **Ratio-gap isolated top:** top/second ≥ 2× and dollar gap ≥ 10% original FAAB.
- **MAD isolated top:** cluster n≥3, normalized top > median + 3×1.4826×MAD, plus ≥ 5% original-FAAB gap.
- **IQR isolated top:** cluster n≥4, normalized top > Q3 + 1.5×IQR, plus the same minimum gap.
Flags (not deletions): ratio-gap=1, MAD=3, IQR=4. Rules are applied independently and are not selected based on which strategy wins.

## Production formulas replayed

All values come from `buildWaiverBoard` using the shared production implementation and each event's reconstructed context. Max VORP maximizes unrounded championship-calibrated VORP dollars across every reachable active-team stage. VoRP uses the event's active-team replacement stage. Safe starts at $200/$1000, applies position weight and rank premium, then scales to original FAAB. Weeks-as-Starter multiplies Safe by projected starter weeks / remaining weeks. Aggressive is `round(WeeksAsStarter × 2 × (1 − (decisionWeek−1)/16))`. Intrinsic suggestions are **not** capped by manager FAAB; pre-bid normalization is reported separately. No Weekly value is computed because no authoritative production or historical formula exists.

### All valid bids

| Strategy | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias (pred−actual) | Spearman ρ | Within max($5,20%) | Predicted range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 239 | 25.2 | 17.2–32.7 | 16.0 | -2.1 | 0.72 | 27.6% | 0–84 |
| VoRP | 239 | 24.4 | 16.4–32.1 | 15.0 | -5.2 | 0.72 | 29.7% | 0–77 |
| Safe | 239 | 39.2 | 32.8–44.2 | 39.0 | 18.6 | 0.56 | 16.7% | 0–105 |
| Aggressive | 239 | 48.3 | 35.6–59.6 | 38.0 | 37.8 | 0.60 | 19.7% | 0–184 |
| Weeks as Starter | 239 | 29.3 | 21.9–35.5 | 23.0 | 4.1 | 0.61 | 23.0% | 0–105 |

### Winning bids

| Strategy | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias (pred−actual) | Spearman ρ | Within max($5,20%) | Predicted range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 47 | 28.0 | 15.2–44.5 | 7.0 | -25.4 | 0.71 | 42.6% | 0–84 |
| VoRP | 47 | 29.1 | 15.8–45.6 | 7.0 | -26.5 | 0.71 | 42.6% | 0–77 |
| Safe | 47 | 32.9 | 21.4–46.0 | 11.0 | -9.1 | 0.61 | 36.2% | 0–105 |
| Aggressive | 47 | 26.4 | 17.2–37.6 | 11.0 | -5.6 | 0.62 | 40.4% | 0–184 |
| Weeks as Starter | 47 | 29.4 | 17.4–44.1 | 11.0 | -21.5 | 0.62 | 34.0% | 0–105 |

### Serious/non-token bids

| Strategy | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias (pred−actual) | Spearman ρ | Within max($5,20%) | Predicted range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 165 | 31.0 | 20.9–39.5 | 19.0 | -8.3 | 0.57 | 18.2% | 0–84 |
| VoRP | 165 | 30.0 | 19.8–38.9 | 17.0 | -12.6 | 0.57 | 21.2% | 0–77 |
| Safe | 165 | 41.0 | 34.4–46.8 | 38.0 | 11.2 | 0.42 | 15.2% | 0–105 |
| Aggressive | 165 | 54.3 | 39.0–67.0 | 38.0 | 39.3 | 0.48 | 15.2% | 0–184 |
| Weeks as Starter | 165 | 34.0 | 24.9–41.4 | 25.0 | -2.4 | 0.49 | 16.4% | 0–105 |

### Serious competitive clusters

| Strategy | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias (pred−actual) | Spearman ρ | Within max($5,20%) | Predicted range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 155 | 31.7 | 21.5–40.5 | 21.0 | -7.5 | 0.55 | 19.4% | 0–84 |
| VoRP | 155 | 30.6 | 20.3–39.9 | 18.0 | -12.1 | 0.55 | 22.6% | 0–77 |
| Safe | 155 | 42.3 | 35.9–48.1 | 39.0 | 12.6 | 0.40 | 14.2% | 11–105 |
| Aggressive | 155 | 56.4 | 41.2–71.4 | 40.0 | 42.9 | 0.46 | 15.5% | 2–184 |
| Weeks as Starter | 155 | 34.7 | 25.8–42.3 | 26.0 | -1.3 | 0.46 | 16.8% | 1–105 |

## Sensitivity of winning-bid MAE

| Sensitivity case | n wins | Max VORP MAE | VoRP MAE | Safe MAE | Aggressive MAE | Weeks as Starter MAE |
| --- | --- | --- | --- | --- | --- | --- |
| All usable winning bids | 47 | 28.0 | 29.1 | 32.9 | 26.4 | 29.4 |
| Non-token winning bids | 29 | 44.0 | 45.7 | 45.5 | 38.5 | 45.2 |
| Non-token, ratio-gap flag removed | 28 | 38.0 | 39.7 | 41.1 | 33.8 | 39.8 |
| Non-token, MAD flag removed | 26 | 30.6 | 31.6 | 35.2 | 32.6 | 33.7 |
| Non-token, IQR flag removed | 25 | 30.2 | 31.3 | 36.4 | 33.8 | 34.2 |

95% intervals are deterministic 2000-replicate cluster bootstraps (seed 20260927); resampling the player/batch cluster keeps correlated win/loss bids together. They quantify sampling variation in this observed set, not projection-history error.

## Target/player price rank and range coverage

| Strategy | Spearman vs winning price | Observed winning range | Predicted range |
| --- | --- | --- | --- |
| Max VORP | 0.71 | 0–285 | 0–84 |
| VoRP | 0.71 | 0–285 | 0–77 |
| Safe | 0.61 | 0–285 | 0–105 |
| Aggressive | 0.62 | 0–285 | 0–184 |
| Weeks as Starter | 0.62 | 0–285 | 0–105 |

A serious-cluster prediction is “covered” when it falls inside that target's observed non-token bid range (minimum serious loss through winning bid).

| Strategy | Competitive clusters | Inside observed range | Coverage |
| --- | --- | --- | --- |
| Max VORP | 19 | 13 | 68.4% |
| VoRP | 19 | 13 | 68.4% |
| Safe | 19 | 9 | 47.4% |
| Aggressive | 19 | 8 | 42.1% |
| Weeks as Starter | 19 | 13 | 68.4% |

## Normalized winning-bid error

| Strategy | MAE / original FAAB | MAE of bid/pre-bid-FAAB ratio |
| --- | --- | --- |
| Max VORP | 5.6% | 6.0% |
| VoRP | 5.8% | 6.2% |
| Safe | 6.6% | 6.9% |
| Aggressive | 5.3% | 5.6% |
| Weeks as Starter | 5.9% | 6.3% |

Pre-bid normalization is shown only because the ledger denominator is positive; reconstruction confidence remains visible above. It does not reinterpret intrinsic strategy values as manager-specific willingness.

## Useful slices (winning bids)

| Dimension | Slice | n | Lowest MAE strategy (MAE) |
| --- | --- | --- | --- |
| decision week | W2 | 20 | Max VORP (29.1) |
| decision week | W3 | 27 | Aggressive (22.9) |
| position | QB | 6 | Aggressive (38.2) |
| position | RB | 13 | Max VORP (48.6) |
| position | TE | 8 | Max VORP (13.1) |
| position | WR | 20 | Aggressive (8.0) |
| Max-VORP target tier | bottom-quartile | 12 | Aggressive (9.4) |
| Max-VORP target tier | middle-half | 24 | Max VORP (18.1) |
| Max-VORP target tier | top-quartile | 11 | Aggressive (48.1) |
| cap state | below-90%-prebid | 47 | Aggressive (26.4) |

Slices are descriptive and often tiny. Player tier is a deterministic within-decision-week quartile of target Max-VORP value; cap state means actual bid ≥90% of reconstructed pre-bid FAAB.

## Manager-adjusted forecasts (strict walk-forward)

For each batch, the production Max-VORP manager profile is fit only from that anonymized manager's earlier processed batches with usable historical baselines; same-batch and future claims are excluded. The prediction is capped at reconstructed pre-bid FAAB and is analyzed separately from intrinsic strategies. Forecastable=133; omitted for insufficient prior-only evidence=106.

| Forecast subset | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias | Spearman ρ | Within max($5,20%) | Actual range | Forecast range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| All forecastable bids | 133 | 28.0 | 17.4–36.5 | 18.0 | 12.1 | 0.67 | 31.6% | 0–234 | 0–220 |
| Forecastable wins | 27 | 22.9 | 9.0–40.6 | 6.0 | -19.9 | 0.76 | 51.9% | 0–234 | 0–119 |

Because every underlying historical projection is reconstructed, these forecasts are exploratory, not historically exact. Missing forecasts are explicit prior-evidence exclusions, not zero predictions.

## Validation, limitations, and recommendation

- Leave-week-out fitting is not statistically supported: only 2 usable decision weeks (W2, W3) exist and all are reconstructed. The five intrinsic formulas have no fitted parameters here. Manager forecasts therefore use strict chronological walk-forward validation instead.
- Sleeper's transaction API reveals failed private amounts only for returned failed records. The classifier retains only failures proven by a different same-player winner in the identical processing batch; it makes no claim about unsupported or absent private bids.
- Reconstructed snapshots were captured after their canonical cutoffs. Historical player ranks and values may differ from what managers saw. No current projection is substituted for an absent decision week.
- Historical roster ownership is not required by these formulas for a known claimed target, but league settings are only observed current-season state. Active-team counts are formula-derived progression estimates.
- One league, early season, correlated bids, and small slices mean strategy ordering can change with one extreme target. Bootstrap intervals do not repair systematic snapshot error.
- Recommendation: keep production behavior unchanged. No strategy is a robust winner: **Aggressive** leads the serious-bid view, but another strategy leads at least one fixed outlier sensitivity. Collect exact Tuesday 8 PM captures and repeat across materially more weeks before drawing product conclusions.
