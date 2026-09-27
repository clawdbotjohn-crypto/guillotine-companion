# SeaMex 2026 bidding-strategy accuracy analysis

Deterministic offline report generated from anonymized fixture version 1. Data are complete through **2026-09-25T23:00:08.539Z**; there is no wall-clock generation timestamp. Regenerate byte-for-byte with `npm run analyze:bidding`.

## Five-bullet answer: weekly price multipliers

- Scope: W2 and W3 have same-week reconstructed snapshots. The top three are unique canonical winners after owner-directed-outlier-01 (private GET-only catalog match plus exact position/total fingerprints in both reconstructed snapshots map uniquely to one canonical completed W3 win at $234; proof matches=1); the closest overall serious-median strategy is VoRP.
- W2 top-three winning-price arithmetic multipliers (observed/intrinsic): Max VORP 3.34× (3/3); VoRP 3.38× (3/3); Safe 2.95× (3/3); Weeks as Starter 3.37× (3/3).
- W3 top-three winning-price arithmetic multipliers (observed/intrinsic): Max VORP 2.35× (3/3); VoRP 3.00× (3/3); Safe 2.87× (3/3); Weeks as Starter 2.87× (3/3).
- W2 top-three serious-market-median arithmetic multipliers: Max VORP 1.40× (3/3); VoRP 1.42× (3/3); Safe 1.35× (3/3); Weeks as Starter 1.53× (3/3); closest across all W2 eligible market clusters: Max VORP.
- W3 top-three serious-market-median arithmetic multipliers: Max VORP 0.78× (3/3); VoRP 1.00× (3/3); Safe 1.13× (3/3); Weeks as Starter 1.13× (3/3); closest across all W3 eligible market clusters: VoRP.

## Weekly top-three and median-market appendix

This owner-directed view compares only **Max VORP, VoRP, Safe, and Weeks as Starter**. Aggressive is excluded because it is derived from Safe. Only events with an exact decision-week snapshot join are eligible; W4 is absent because only a W3 fallback existed. “Serious” is strictly **bid > $5**. Ratios are **observed/intrinsic**, not intrinsic/observed. A zero intrinsic denominator is undefined, excluded from arithmetic/geometric/median aggregation, and counted in coverage. A winning or competing bid at its reconstructed pre-bid FAAB is marked as FAAB-censored because latent willingness may be higher.

### W2 — Analysis A: top-three winning prices

| Privacy-safe target | Winning bid | FAAB-censored? | Max VORP ratio | VoRP ratio | Safe ratio | Weeks as Starter ratio |
| --- | --- | --- | --- | --- | --- | --- |
| W2 target 1 | $285 | no | 4.75 | 4.83 | 3.17 | 3.65 |
| W2 target 2 | $153 | no | 2.73 | 2.78 | 1.72 | 2.15 |
| W2 target 3 | $99 | no | 2.54 | 2.54 | 3.96 | 4.30 |

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 3/3 | 3.34 | 3.21 | 2.73 |
| VoRP | 3/3 | 3.38 | 3.24 | 2.78 |
| Safe | 3/3 | 2.95 | 2.78 | 3.17 |
| Weeks as Starter | 3/3 | 3.37 | 3.24 | 3.65 |

### W2 — Analysis C: top-three median-market prices

| Privacy-safe target | Serious median | Serious/all n | Censored observations | All-bid median | Max VORP ratio | VoRP ratio | Safe ratio | Weeks as Starter ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W2 target 1 | $85.0 | 21/21 | 0 | $85.0 | 1.42 | 1.44 | 0.94 | 1.09 |
| W2 target 2 | $75.0 | 19/19 | 0 | $75.0 | 1.34 | 1.36 | 0.84 | 1.06 |
| W2 target 3 | $56.5 | 8/9 | 0 | $53.0 | 1.45 | 1.45 | 2.26 | 2.46 |

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 3/3 | 1.40 | 1.40 | 1.42 |
| VoRP | 3/3 | 1.42 | 1.42 | 1.44 |
| Safe | 3/3 | 1.35 | 1.22 | 0.94 |
| Weeks as Starter | 3/3 | 1.53 | 1.41 | 1.09 |

† All-bid median differs from the serious-bid median by at least $5.

### W3 — Analysis A: top-three winning prices

| Privacy-safe target | Winning bid | FAAB-censored? | Max VORP ratio | VoRP ratio | Safe ratio | Weeks as Starter ratio |
| --- | --- | --- | --- | --- | --- | --- |
| W3 target 1 | $231 | no | 3.50 | 4.62 | 3.00 | 3.00 |
| W3 target 2 | $187 | no | 2.23 | 2.43 | 1.78 | 1.78 |
| W3 target 3 | $103 | no | 1.32 | 1.94 | 3.81 | 3.81 |

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 3/3 | 2.35 | 2.17 | 2.23 |
| VoRP | 3/3 | 3.00 | 2.79 | 2.43 |
| Safe | 3/3 | 2.87 | 2.73 | 3.00 |
| Weeks as Starter | 3/3 | 2.87 | 2.73 | 3.00 |

### W3 — Analysis C: top-three median-market prices

| Privacy-safe target | Serious median | Serious/all n | Censored observations | All-bid median | Max VORP ratio | VoRP ratio | Safe ratio | Weeks as Starter ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W3 target 1 | $56.0 | 13/14 | 0 | $53.0 | 0.85 | 1.12 | 0.73 | 0.73 |
| W3 target 2 | $66.5 | 14/15 | 0 | $66.0 | 0.79 | 0.86 | 0.63 | 0.63 |
| W3 target 3 | $54.5 | 14/14 | 0 | $54.5 | 0.70 | 1.03 | 2.02 | 2.02 |

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 3/3 | 0.78 | 0.78 | 0.79 |
| VoRP | 3/3 | 1.00 | 1.00 | 1.03 |
| Safe | 3/3 | 1.13 | 0.98 | 0.73 |
| Weeks as Starter | 3/3 | 1.13 | 0.98 | 0.73 |

† All-bid median differs from the serious-bid median by at least $5.

## Analysis B: median serious market versus intrinsic strategy

Each player/week cluster selects its highest canonical completed winner, then includes only legitimate failed competing claims proven against that winner in the same processing batch. Metrics use one median observation per eligible player/week, avoiding duplicate weight from contingency/drop paths or a second clearing cycle. **Raw prediction R²*** is the standard predictive score against the observed-mean baseline, but it is **not the R² from a fitted regression**: strategy dollars are held fixed on the identity line rather than refit to bids. It may be negative when fixed predictions are worse than the mean-only baseline; that does not mean negative correlation. R² and Spearman are shown only when at least two non-constant observations make them meaningful.

### Overall

Serious median clusters: 28/45; closest=VoRP. Undefined strategy zeros are omitted strategy-by-strategy, so n is visible.

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 21 | 12.5 | 8.0 | +1.5 | 0.56 | 0.79 |
| VoRP | 21 | 11.0 | 7.0 | -1.0 | 0.63 | 0.78 |
| Safe | 25 | 28.4 | 31.5 | +18.7 | -1.26 | 0.42 |
| Weeks as Starter | 23 | 17.4 | 12.0 | +5.9 | 0.11 | 0.57 |

**All-bid-median sensitivity** (12 materially changed clusters; closest=VoRP):

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 25 | 12.1 | 9.0 | +6.4 | 0.66 | 0.86 |
| VoRP | 25 | 10.6 | 8.5 | +4.3 | 0.71 | 0.86 |
| Safe | 34 | 28.2 | 25.0 | +22.9 | -1.10 | 0.50 |
| Weeks as Starter | 32 | 15.2 | 10.5 | +9.2 | 0.31 | 0.69 |

### W2

Serious median clusters: 13/20; closest=Max VORP. Undefined strategy zeros are omitted strategy-by-strategy, so n is visible.

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 11 | 14.9 | 14.0 | -3.7 | 0.52 | 0.81 |
| VoRP | 11 | 15.0 | 14.0 | -4.0 | 0.52 | 0.81 |
| Safe | 11 | 31.0 | 31.5 | +25.0 | -1.05 | 0.46 |
| Weeks as Starter | 11 | 18.7 | 12.0 | +5.0 | 0.14 | 0.50 |

**All-bid-median sensitivity** (5 materially changed clusters; closest=Max VORP):

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 14 | 12.6 | 10.0 | +2.9 | 0.65 | 0.81 |
| VoRP | 14 | 12.7 | 10.0 | +2.6 | 0.65 | 0.81 |
| Safe | 15 | 31.3 | 28.0 | +27.6 | -0.90 | 0.64 |
| Weeks as Starter | 15 | 16.6 | 10.5 | +9.3 | 0.33 | 0.64 |

### W3

Serious median clusters: 15/25; closest=VoRP. Undefined strategy zeros are omitted strategy-by-strategy, so n is visible.

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 10 | 9.9 | 8.0 | +7.1 | 0.65 | 0.91 |
| VoRP | 10 | 6.6 | 6.0 | +2.3 | 0.85 | 0.91 |
| Safe | 14 | 26.3 | 30.3 | +13.8 | -1.59 | 0.48 |
| Weeks as Starter | 12 | 16.3 | 12.8 | +6.8 | 0.05 | 0.73 |

**All-bid-median sensitivity** (7 materially changed clusters; closest=VoRP):

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 11 | 11.4 | 8.5 | +10.9 | 0.66 | 0.89 |
| VoRP | 11 | 7.9 | 8.0 | +6.5 | 0.83 | 0.89 |
| Safe | 19 | 25.7 | 25.0 | +19.3 | -1.40 | 0.44 |
| Weeks as Starter | 17 | 13.9 | 10.5 | +9.1 | 0.27 | 0.73 |

## Owner-directed exclusion sensitivity

The underlying canonical evidence is retained. The primary view excludes only the deterministic anonymized marker **owner-directed-outlier-01**, established by private GET-only catalog match plus exact position/total fingerprints in both reconstructed snapshots map uniquely to one canonical completed W3 win at $234; no private name or identifier is stored or printed. Without owner-directed-outlier-01: n=28, closest=VoRP (Max VORP MAE 12.5; VoRP MAE 11.0; Safe MAE 28.4; Weeks as Starter MAE 17.4). With the marked target: n=29, closest=VoRP (Max VORP MAE 12.5; VoRP MAE 11.1; Safe MAE 28.5; Weeks as Starter MAE 16.9).

## Shape × scale interpretation

The four intrinsic strategies describe **target shape**—which players should cost relatively more—while the observed/intrinsic multipliers estimate a separate **market scale** for each week. The rank and error results can motivate a future model that combines strategy shape with a pooled week/market scale. They do **not** identify an individual manager style: two reconstructed weeks and sparse manager histories are insufficient for that claim.


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
