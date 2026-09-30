# SeaMex 2026 bidding-strategy accuracy analysis

Deterministic offline report generated from anonymized fixture version 1. Data are complete through **2026-09-30T07:50:30.120Z**; there is no wall-clock generation timestamp. Regenerate byte-for-byte with `npm run analyze:bidding`.

## Five-bullet answer: weekly price multipliers

- Newest supported week W4 top-three winning multipliers (arithmetic/geometric/median; coverage): Max VORP a/g/m 2.74/2.73/2.71× (coverage 3/3); Current-team VoRP a/g/m 3.02/2.98/2.75× (coverage 3/3); Corrected Safe a/g/m 2.07/2.00/1.89× (coverage 3/3); Corrected Weeks as Starter a/g/m 2.21/2.17/2.05× (coverage 3/3). Pooled season-to-date top-three: Max VORP a/g/m 2.81/2.67/2.71× (coverage 9/9); Current-team VoRP a/g/m 3.13/3.00/2.75× (coverage 9/9); Corrected Safe a/g/m 2.10/1.96/1.89× (coverage 9/9); Corrected Weeks as Starter a/g/m 2.33/2.15/2.05× (coverage 9/9).
- Newest supported week W4 top-three serious-market multipliers (arithmetic/geometric/median; coverage): Max VORP a/g/m 1.45/1.44/1.45× (coverage 3/3); Current-team VoRP a/g/m 1.61/1.57/1.47× (coverage 3/3); Corrected Safe a/g/m 1.11/1.05/1.01× (coverage 3/3); Corrected Weeks as Starter a/g/m 1.18/1.14/1.10× (coverage 3/3). Pooled season-to-date top-three: Max VORP a/g/m 1.21/1.16/1.34× (coverage 9/9); Current-team VoRP a/g/m 1.34/1.30/1.36× (coverage 9/9); Corrected Safe a/g/m 0.90/0.85/0.71× (coverage 9/9); Corrected Weeks as Starter a/g/m 0.99/0.93/0.82× (coverage 9/9).
- Serious-market raw identity fit — W4: Max VORP R² 0.68, MAE 17.2, ρ 0.75, n=10; Current-team VoRP R² 0.52, MAE 19.6, ρ 0.72, n=10; Corrected Safe R² 0.60, MAE 25.3, ρ 0.78, n=10; Corrected Weeks as Starter R² 0.72, MAE 16.3, ρ 0.77, n=10. Cumulative: Max VORP R² 0.67, MAE 14.0, ρ 0.79, n=31; Current-team VoRP R² 0.59, MAE 13.8, ρ 0.78, n=31; Corrected Safe R² 0.30, MAE 22.9, ρ 0.83, n=31; Corrected Weeks as Starter R² 0.56, MAE 17.3, ρ 0.80, n=30. R² is an unfitted prediction score, not fitted-regression R².
- Closest current strategy: W4 Corrected Weeks as Starter (MAE 16.3). Versus W3, Corrected Weeks as Starter's MAE changed -3.8; leadership changed Current-team VoRP → Corrected Weeks as Starter. Cumulative leader: Current-team VoRP (MAE 13.8).
- Material trend W3→W4: serious-market top-three arithmetic multipliers rose for 4/4 comparable methods and fell for 0/4 (Δ range +0.47× to +0.67×). Recommendation: do not change any formula from this small reconstructed sample; treat shape and market scale separately. Provenance caveat: deterministic anonymized fixture from read-only Supabase tables projection_snapshot_runs and projection_snapshot_values and Sleeper GET /v1/league/[private], /v1/players/nfl, and /v1/league/[private]/transactions/{week}; same-week snapshots are reconstructed, not proof of the pre-waiver forecast.

## Weekly top-three and median-market appendix

This owner-directed view compares the four required owner-summary methods: **Max VORP, current-team VoRP, Corrected Safe, and Corrected Weeks as Starter**. Middle VORP is kept only in its separately labeled analysis appendix. Legacy Aggressive is excluded because it is derived from legacy Safe. Only events with an exact or explicitly reconstructed same-decision-week snapshot join are eligible; the eligible decision weeks are W2, W3, W4. “Serious” is strictly **bid > $5**. Ratios are **observed/intrinsic**, not intrinsic/observed. A zero intrinsic denominator is undefined, excluded from arithmetic/geometric/median aggregation, and counted in coverage. A winning or competing bid at its reconstructed pre-bid FAAB is marked as FAAB-censored because latent willingness may be higher.

### W2 — Analysis A: top-three winning prices

| Privacy-safe target | Winning bid | FAAB-censored? | Max VORP ratio | Current-team VoRP ratio | Corrected Safe ratio | Corrected Weeks as Starter ratio |
| --- | --- | --- | --- | --- | --- | --- |
| W2 target 1 | $285 | no | 4.75 | 4.83 | 3.65 | 4.60 |
| W2 target 2 | $153 | no | 2.73 | 2.78 | 2.01 | 2.51 |
| W2 target 3 | $99 | no | 2.54 | 2.54 | 1.22 | 1.41 |

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 3/3 | 3.34 | 3.21 | 2.73 |
| Current-team VoRP | 3/3 | 3.38 | 3.24 | 2.78 |
| Corrected Safe | 3/3 | 2.30 | 2.08 | 2.01 |
| Corrected Weeks as Starter | 3/3 | 2.84 | 2.54 | 2.51 |

### W2 — Analysis C: top-three median-market prices

| Privacy-safe target | Serious median | Serious/all n | Censored observations | All-bid median | Max VORP ratio | Current-team VoRP ratio | Corrected Safe ratio | Corrected Weeks as Starter ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W2 target 1 | $85.0 | 21/21 | 0 | $85.0 | 1.42 | 1.44 | 1.09 | 1.37 |
| W2 target 2 | $75.0 | 19/19 | 0 | $75.0 | 1.34 | 1.36 | 0.99 | 1.23 |
| W2 target 3 | $56.5 | 8/9 | 0 | $53.0 | 1.45 | 1.45 | 0.70 | 0.81 |

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 3/3 | 1.40 | 1.40 | 1.42 |
| Current-team VoRP | 3/3 | 1.42 | 1.42 | 1.44 |
| Corrected Safe | 3/3 | 0.92 | 0.91 | 0.99 |
| Corrected Weeks as Starter | 3/3 | 1.14 | 1.11 | 1.23 |

† All-bid median differs from the serious-bid median by at least $5.

### W3 — Analysis A: top-three winning prices

| Privacy-safe target | Winning bid | FAAB-censored? | Max VORP ratio | Current-team VoRP ratio | Corrected Safe ratio | Corrected Weeks as Starter ratio |
| --- | --- | --- | --- | --- | --- | --- |
| W3 target 1 | $231 | no | 3.50 | 4.62 | 2.92 | 2.92 |
| W3 target 2 | $187 | no | 2.23 | 2.43 | 1.76 | 1.76 |
| W3 target 3 | $103 | no | 1.32 | 1.94 | 1.14 | 1.14 |

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 3/3 | 2.35 | 2.17 | 2.23 |
| Current-team VoRP | 3/3 | 3.00 | 2.79 | 2.43 |
| Corrected Safe | 3/3 | 1.94 | 1.81 | 1.76 |
| Corrected Weeks as Starter | 3/3 | 1.94 | 1.81 | 1.76 |

### W3 — Analysis C: top-three median-market prices

| Privacy-safe target | Serious median | Serious/all n | Censored observations | All-bid median | Max VORP ratio | Current-team VoRP ratio | Corrected Safe ratio | Corrected Weeks as Starter ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W3 target 1 | $56.0 | 13/14 | 0 | $53.0 | 0.85 | 1.12 | 0.71 | 0.71 |
| W3 target 2 | $66.5 | 14/15 | 0 | $66.0 | 0.79 | 0.86 | 0.63 | 0.63 |
| W3 target 3 | $54.5 | 14/14 | 0 | $54.5 | 0.70 | 1.03 | 0.61 | 0.61 |

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 3/3 | 0.78 | 0.78 | 0.79 |
| Current-team VoRP | 3/3 | 1.00 | 1.00 | 1.03 |
| Corrected Safe | 3/3 | 0.65 | 0.65 | 0.63 |
| Corrected Weeks as Starter | 3/3 | 0.65 | 0.65 | 0.63 |

† All-bid median differs from the serious-bid median by at least $5.

### W4 — Analysis A: top-three winning prices

| Privacy-safe target | Winning bid | FAAB-censored? | Max VORP ratio | Current-team VoRP ratio | Corrected Safe ratio | Corrected Weeks as Starter ratio |
| --- | --- | --- | --- | --- | --- | --- |
| W4 target 1 | $300 | no | 2.94 | 3.75 | 2.86 | 2.86 |
| W4 target 2 | $187 | no | 2.71 | 2.75 | 1.89 | 2.05 |
| W4 target 3 | $128 | no | 2.56 | 2.56 | 1.47 | 1.73 |

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 3/3 | 2.74 | 2.73 | 2.71 |
| Current-team VoRP | 3/3 | 3.02 | 2.98 | 2.75 |
| Corrected Safe | 3/3 | 2.07 | 2.00 | 1.89 |
| Corrected Weeks as Starter | 3/3 | 2.21 | 2.17 | 2.05 |

### W4 — Analysis C: top-three median-market prices

| Privacy-safe target | Serious median | Serious/all n | Censored observations | All-bid median | Max VORP ratio | Current-team VoRP ratio | Corrected Safe ratio | Corrected Weeks as Starter ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W4 target 1 | $171.0 | 20/20 | 0 | $171.0 | 1.68 | 2.14 | 1.63 | 1.63 |
| W4 target 2 | $100.0 | 15/17 | 0 | $66.0 † | 1.45 | 1.47 | 1.01 | 1.10 |
| W4 target 3 | $61.0 | 15/15 | 0 | $61.0 | 1.22 | 1.22 | 0.70 | 0.82 |

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 3/3 | 1.45 | 1.44 | 1.45 |
| Current-team VoRP | 3/3 | 1.61 | 1.57 | 1.47 |
| Corrected Safe | 3/3 | 1.11 | 1.05 | 1.01 |
| Corrected Weeks as Starter | 3/3 | 1.18 | 1.14 | 1.10 |

† All-bid median differs from the serious-bid median by at least $5.

## Analysis B: median serious market versus intrinsic strategy

Each player/week cluster selects its highest canonical completed winner, then includes only legitimate failed competing claims proven against that winner in the same processing batch. Metrics use one median observation per eligible player/week, avoiding duplicate weight from contingency/drop paths or a second clearing cycle. **Raw prediction R²*** is the standard predictive score against the observed-mean baseline, but it is **not the R² from a fitted regression**: strategy dollars are held fixed on the identity line rather than refit to bids. It may be negative when fixed predictions are worse than the mean-only baseline; that does not mean negative correlation. R² and Spearman are shown only when at least two non-constant observations make them meaningful.

### Overall

Canonical winning-bid clusters: 70; closest=Corrected Safe. Undefined strategy zeros are omitted strategy-by-strategy, so n is visible.

| Strategy | n | MAE | Median AE | Bias (intrinsic−winning) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 36 | 40.0 | 17.0 | -36.4 | 0.26 | 0.91 |
| Current-team VoRP | 36 | 42.1 | 17.0 | -38.5 | 0.17 | 0.90 |
| Corrected Safe | 36 | 34.1 | 16.5 | -18.9 | 0.41 | 0.91 |
| Corrected Weeks as Starter | 34 | 38.0 | 18.0 | -34.2 | 0.33 | 0.90 |

Serious median clusters: 41/70; closest=Current-team VoRP.

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 31 | 14.0 | 8.0 | -3.7 | 0.67 | 0.79 |
| Current-team VoRP | 31 | 13.8 | 7.0 | -6.1 | 0.59 | 0.78 |
| Corrected Safe | 31 | 22.9 | 23.0 | +15.7 | 0.30 | 0.83 |
| Corrected Weeks as Starter | 30 | 17.3 | 12.5 | +1.4 | 0.56 | 0.80 |

**All-bid-median sensitivity** (18 materially changed clusters; closest=Current-team VoRP):

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 36 | 12.6 | 9.0 | +3.5 | 0.74 | 0.86 |
| Current-team VoRP | 36 | 12.1 | 8.3 | +1.4 | 0.68 | 0.86 |
| Corrected Safe | 36 | 25.1 | 25.5 | +21.1 | 0.24 | 0.87 |
| Corrected Weeks as Starter | 34 | 15.4 | 12.0 | +7.8 | 0.63 | 0.88 |

### W2

Canonical winning-bid clusters: 20; closest=Corrected Safe. Undefined strategy zeros are omitted strategy-by-strategy, so n is visible.

| Strategy | n | MAE | Median AE | Bias (intrinsic−winning) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 14 | 35.0 | 8.0 | -29.3 | 0.21 | 0.85 |
| Current-team VoRP | 14 | 35.1 | 8.0 | -29.5 | 0.20 | 0.85 |
| Corrected Safe | 14 | 32.1 | 15.0 | -13.8 | 0.36 | 0.85 |
| Corrected Weeks as Starter | 13 | 34.9 | 10.0 | -29.5 | 0.24 | 0.87 |

Serious median clusters: 13/20; closest=Max VORP.

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 11 | 14.9 | 14.0 | -3.7 | 0.52 | 0.81 |
| Current-team VoRP | 11 | 15.0 | 14.0 | -4.0 | 0.52 | 0.81 |
| Corrected Safe | 11 | 18.7 | 12.0 | +14.3 | 0.06 | 0.83 |
| Corrected Weeks as Starter | 10 | 15.4 | 12.3 | -0.5 | 0.47 | 0.80 |

**All-bid-median sensitivity** (5 materially changed clusters; closest=Corrected Weeks as Starter):

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 14 | 12.6 | 10.0 | +2.9 | 0.65 | 0.81 |
| Current-team VoRP | 14 | 12.7 | 10.0 | +2.6 | 0.65 | 0.81 |
| Corrected Safe | 14 | 19.4 | 10.0 | +18.4 | 0.08 | 0.80 |
| Corrected Weeks as Starter | 13 | 12.5 | 12.5 | +4.7 | 0.63 | 0.84 |

### W3

Canonical winning-bid clusters: 25; closest=Corrected Safe. Undefined strategy zeros are omitted strategy-by-strategy, so n is visible.

| Strategy | n | MAE | Median AE | Bias (intrinsic−winning) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 11 | 37.5 | 21.0 | -35.3 | 0.28 | 0.91 |
| Current-team VoRP | 11 | 41.8 | 21.0 | -39.6 | 0.12 | 0.91 |
| Corrected Safe | 11 | 31.6 | 13.0 | -18.5 | 0.44 | 0.91 |
| Corrected Weeks as Starter | 11 | 35.3 | 19.0 | -30.5 | 0.41 | 0.87 |

Serious median clusters: 15/25; closest=Current-team VoRP.

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 10 | 9.9 | 8.0 | +7.1 | 0.65 | 0.91 |
| Current-team VoRP | 10 | 6.6 | 6.0 | +2.3 | 0.85 | 0.91 |
| Corrected Safe | 10 | 25.0 | 25.0 | +24.8 | -1.37 | 0.91 |
| Corrected Weeks as Starter | 10 | 20.1 | 18.5 | +12.5 | -0.50 | 0.88 |

**All-bid-median sensitivity** (7 materially changed clusters; closest=Current-team VoRP):

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 11 | 11.4 | 8.5 | +10.9 | 0.66 | 0.89 |
| Current-team VoRP | 11 | 7.9 | 8.0 | +6.5 | 0.83 | 0.89 |
| Corrected Safe | 11 | 27.6 | 26.0 | +27.6 | -1.04 | 0.89 |
| Corrected Weeks as Starter | 11 | 17.8 | 10.0 | +15.6 | -0.14 | 0.84 |

### W4

Canonical winning-bid clusters: 25; closest=Corrected Safe. Undefined strategy zeros are omitted strategy-by-strategy, so n is visible.

| Strategy | n | MAE | Median AE | Bias (intrinsic−winning) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 11 | 49.0 | 33.0 | -46.6 | 0.25 | 0.90 |
| Current-team VoRP | 11 | 51.2 | 34.0 | -48.8 | 0.13 | 0.89 |
| Corrected Safe | 11 | 39.1 | 19.0 | -25.6 | 0.42 | 0.93 |
| Corrected Weeks as Starter | 10 | 44.9 | 26.0 | -44.3 | 0.32 | 0.88 |

Serious median clusters: 13/25; closest=Corrected Weeks as Starter.

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 10 | 17.2 | 6.5 | -14.6 | 0.68 | 0.75 |
| Current-team VoRP | 10 | 19.6 | 6.5 | -17.0 | 0.52 | 0.72 |
| Corrected Safe | 10 | 25.3 | 26.0 | +8.1 | 0.60 | 0.78 |
| Corrected Weeks as Starter | 10 | 16.3 | 9.0 | -7.9 | 0.72 | 0.77 |

**All-bid-median sensitivity** (6 materially changed clusters; closest=Max VORP):

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 11 | 13.6 | 9.0 | -3.0 | 0.77 | 0.91 |
| Current-team VoRP | 11 | 15.4 | 8.0 | -5.2 | 0.64 | 0.90 |
| Corrected Safe | 11 | 30.0 | 27.0 | +18.0 | 0.53 | 0.93 |
| Corrected Weeks as Starter | 10 | 16.6 | 10.5 | +3.4 | 0.76 | 0.96 |

## Weekly and season multiplier summaries

### Season aggregate — winning

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 36/70 | 1.90 | 0.00 | 1.84 |
| Current-team VoRP | 36/70 | 1.99 | 0.00 | 1.91 |
| Corrected Safe | 36/70 | 1.12 | 0.00 | 1.02 |
| Corrected Weeks as Starter | 34/70 | 2.58 | 0.00 | 1.75 |

### Season aggregate — serious-median

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 31/70 | 1.34 | 1.11 | 1.20 |
| Current-team VoRP | 31/70 | 1.39 | 1.15 | 1.20 |
| Corrected Safe | 31/70 | 0.76 | 0.63 | 0.61 |
| Corrected Weeks as Starter | 30/70 | 2.14 | 1.26 | 0.90 |

### W2 — winning

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 14/20 | 1.88 | 0.00 | 1.74 |
| Current-team VoRP | 14/20 | 1.89 | 0.00 | 1.74 |
| Corrected Safe | 14/20 | 1.05 | 0.00 | 0.79 |
| Corrected Weeks as Starter | 13/20 | 2.88 | 0.00 | 1.41 |

### W2 — serious-median

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 11/20 | 1.66 | 1.26 | 1.40 |
| Current-team VoRP | 11/20 | 1.66 | 1.27 | 1.40 |
| Corrected Safe | 11/20 | 0.86 | 0.67 | 0.70 |
| Corrected Weeks as Starter | 10/20 | 2.98 | 1.48 | 1.16 |

### W3 — winning

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 11/25 | 1.68 | 0.00 | 1.67 |
| Current-team VoRP | 11/25 | 1.86 | 0.00 | 1.81 |
| Corrected Safe | 11/25 | 1.14 | 0.00 | 1.07 |
| Corrected Weeks as Starter | 11/25 | 2.71 | 0.00 | 1.76 |

### W3 — serious-median

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 10/25 | 0.92 | 0.86 | 0.82 |
| Current-team VoRP | 10/25 | 0.99 | 0.92 | 0.96 |
| Corrected Safe | 10/25 | 0.61 | 0.55 | 0.62 |
| Corrected Weeks as Starter | 10/25 | 1.90 | 1.13 | 0.78 |

### W4 — winning

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 11/25 | 2.14 | 1.89 | 2.47 |
| Current-team VoRP | 11/25 | 2.25 | 1.95 | 2.47 |
| Corrected Safe | 11/25 | 1.18 | 0.98 | 1.03 |
| Corrected Weeks as Starter | 10/25 | 2.06 | 1.77 | 1.81 |

### W4 — serious-median

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 10/25 | 1.42 | 1.26 | 1.21 |
| Current-team VoRP | 10/25 | 1.50 | 1.30 | 1.21 |
| Corrected Safe | 10/25 | 0.80 | 0.68 | 0.58 |
| Corrected Weeks as Starter | 10/25 | 1.54 | 1.21 | 0.99 |

## Prior-week-fitted held-out scale check

Each multiplier is fit **only** as the prior eligible week's median observed/intrinsic ratio, then applied without refitting to the next eligible week. It is never fit and scored on the same observations. Raw held-out R²* retains the same prediction-score meaning.

### Prior-week-fitted held-out scale — canonical winners

| Strategy | Fit→test week | Prior-week median multiplier | Test-week n | MAE | Median AE | Bias | Raw held-out R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 2→3 | 1.742 | 11 | 24.7 | 18.4 | -9.6 | 0.69 | 0.91 |
| Current-team VoRP | 2→3 | 1.742 | 11 | 26.3 | 10.7 | -17.2 | 0.56 | 0.91 |
| Corrected Safe | 2→3 | 0.794 | 11 | 37.3 | 13.4 | -29.1 | 0.27 | 0.91 |
| Corrected Weeks as Starter | 2→3 | 1.414 | 11 | 28.9 | 12.2 | -14.2 | 0.64 | 0.87 |
| Max VORP | 3→4 | 1.667 | 11 | 32.5 | 23.0 | -24.5 | 0.69 | 0.90 |
| Current-team VoRP | 3→4 | 1.808 | 11 | 33.4 | 19.8 | -23.7 | 0.62 | 0.89 |
| Corrected Safe | 3→4 | 1.067 | 11 | 37.7 | 17.3 | -22.0 | 0.46 | 0.93 |
| Corrected Weeks as Starter | 3→4 | 1.764 | 10 | 24.5 | 18.3 | -11.4 | 0.80 | 0.88 |

### Prior-week-fitted held-out scale — serious medians

| Strategy | Fit→test week | Prior-week median multiplier | Test-week n | MAE | Median AE | Bias | Raw held-out R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 2→3 | 1.400 | 10 | 22.7 | 18.6 | +22.2 | -1.20 | 0.91 |
| Current-team VoRP | 2→3 | 1.400 | 10 | 15.9 | 13.8 | +15.5 | -0.02 | 0.91 |
| Corrected Safe | 2→3 | 0.698 | 10 | 10.4 | 7.9 | +8.0 | 0.51 | 0.91 |
| Corrected Weeks as Starter | 2→3 | 1.161 | 10 | 26.6 | 22.1 | +19.4 | -1.73 | 0.88 |
| Max VORP | 3→4 | 0.822 | 10 | 22.2 | 10.3 | -21.1 | 0.49 | 0.75 |
| Current-team VoRP | 3→4 | 0.956 | 10 | 20.7 | 6.6 | -18.5 | 0.48 | 0.72 |
| Corrected Safe | 3→4 | 0.616 | 10 | 21.7 | 8.4 | -14.6 | 0.38 | 0.78 |
| Corrected Weeks as Starter | 3→4 | 0.783 | 10 | 18.2 | 3.3 | -17.3 | 0.54 | 0.77 |

## Owner-directed exclusion sensitivity

The underlying canonical evidence is retained. The primary view excludes only the deterministic anonymized marker **owner-directed-outlier-01**, established by private GET-only catalog match plus exact position/total fingerprints in both reconstructed snapshots map uniquely to one canonical completed W3 win at $234; no private name or identifier is stored or printed. Without owner-directed-outlier-01: n=41, closest=Current-team VoRP (Max VORP MAE 14.0; Current-team VoRP MAE 13.8; Corrected Safe MAE 22.9; Corrected Weeks as Starter MAE 17.3). With the marked target: n=42, closest=Current-team VoRP (Max VORP MAE 14.0; Current-team VoRP MAE 13.7; Corrected Safe MAE 22.2; Corrected Weeks as Starter MAE 17.4).

## Shape × scale interpretation

The four owner-summary strategies describe **target shape**—which players should cost relatively more—while the observed/intrinsic multipliers estimate a separate **market scale** for each week. The rank and error results can motivate a future model that combines strategy shape with a pooled week/market scale. They do **not** identify an individual manager style: 3 reconstructed weeks and sparse manager histories are insufficient for that claim.


## Middle VORP candidate evaluation

**Candidate:** use one common replacement horizon for the entire league state: `targetTeams = max(4, ceil(teamsRemaining / 2))`. This gives 28→14, 27→14, and 5→4. Unlike Max VORP, it never chooses a different future stage per player. Unlike current-team VoRP, it prices scarcity at a deliberately forward-looking but shared stage. The 50% horizon is a hypothesis, not a fitted constant.

**Recommendation: retain analysis-only.** Middle VORP is conceptually cleaner than per-player maximization and materially different from current-team VoRP, but only 3 completed decision weeks (W2, W3, W4) are evaluable and every projection input is reconstructed. That cannot establish a new default. A preregistered W5+ sequence using exact pre-waiver captures would raise confidence if Middle preserves rank quality, has lower held-out MAE/bias after prior-only scaling, and remains stable across 33%/50%/67% horizons and outlier/all-bid filters; persistent underperformance or horizon instability would lower it.

### Latest reproducible SeaMex state

The latest available deterministic input is the privacy-safe reconstructed **W4** projection snapshot (content hash `9463b40e63b71c0088a311675d47bdc508a627ba446d703a54b5ba2ced4dc523`, 1151 stored projection rows; 452 supported QB/RB/WR/TE players), with 26 teams, $500 common budget, and no roster/manager/league identifiers. Player labels are fixture aliases, not identities. It is the latest reproducible analysis state—not a claim that an exact W4 pre-waiver capture exists.

#### Player ordering (top 12)

- **Max VORP:** P1118 (RB1, $184), P1131 (WR1, $165), P1139 (RB2, $162), P1130 (WR2, $160), P1148 (WR3, $150), P0998 (TE1, $140), P0702 (QB1, $117), P0642 (RB3, $112), P0915 (WR4, $102), P0144 (TE2, $100), P0852 (RB4, $89), P0613 (RB5, $85)
- **Middle VORP:** P1118 (RB1, $114), P1139 (RB2, $107), P1131 (WR1, $104), P1130 (WR2, $102), P1148 (WR3, $100), P0642 (RB3, $92), P0915 (WR4, $85), P0852 (RB4, $85), P0613 (RB5, $83), P1013 (RB6, $78), P1007 (WR5, $77), P0702 (QB1, $74)
- **Current-team VoRP:** P1118 (RB1, $102), P1139 (RB2, $98), P1131 (WR1, $92), P1130 (WR2, $91), P1148 (WR3, $89), P0642 (RB3, $88), P0852 (RB4, $84), P0613 (RB5, $83), P0915 (WR4, $80), P1013 (RB6, $79), P1119 (RB7, $77), P1007 (WR5, $75)
- **Corrected Safe:** P1118 (RB1, $125), P1131 (WR1, $125), P1139 (RB2, $108), P1130 (WR2, $108), P1148 (WR3, $107), P0642 (RB3, $106), P0998 (TE1, $106), P0915 (WR4, $105), P0852 (RB4, $104), P1007 (WR5, $104), P0918 (WR6, $102), P0613 (RB5, $101)
- **Corrected Weeks as Starter:** P1118 (RB1, $125), P1131 (WR1, $125), P1139 (RB2, $108), P1130 (WR2, $108), P1148 (WR3, $107), P0642 (RB3, $106), P0998 (TE1, $106), P0915 (WR4, $105), P0852 (RB4, $104), P1007 (WR5, $104), P0613 (RB5, $101), P0702 (QB1, $94)
- **67% common horizon:** P1118 (RB1, $110), P1139 (RB2, $104), P1131 (WR1, $98), P1130 (WR2, $97), P1148 (WR3, $95), P0642 (RB3, $92), P0852 (RB4, $86), P0613 (RB5, $84), P0915 (WR4, $83), P1013 (RB6, $80), P1119 (RB7, $77), P1007 (WR5, $76)
- **33% common horizon:** P1118 (RB1, $122), P1139 (RB2, $112), P1131 (WR1, $110), P1130 (WR2, $108), P1148 (WR3, $104), P0702 (QB1, $100), P0642 (RB3, $91), P0998 (TE1, $88), P0915 (WR4, $83), P0852 (RB4, $81), P0613 (RB5, $78), P1007 (WR5, $72)

#### Dollar distributions and positive counts

| Method | n | Positive | Zero | Min | P25 | Median | Mean | P75 | Max | Total $ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 452 | 176 | 276 | 0 | 0.0 | 0.0 | 13.7 | 18.0 | 184 | 6176 |
| Middle VORP | 452 | 86 | 366 | 0 | 0.0 | 0.0 | 7.3 | 0.0 | 114 | 3317 |
| Current-team VoRP | 452 | 176 | 276 | 0 | 0.0 | 0.0 | 12.2 | 18.0 | 102 | 5535 |
| Corrected Safe | 452 | 178 | 274 | 0 | 0.0 | 0.0 | 20.9 | 39.0 | 125 | 9459 |
| Corrected Weeks as Starter | 452 | 169 | 283 | 0 | 0.0 | 0.0 | 14.8 | 15.0 | 125 | 6705 |
| 67% common horizon | 452 | 121 | 331 | 0 | 0.0 | 0.0 | 8.9 | 3.0 | 110 | 4038 |
| 33% common horizon | 452 | 59 | 393 | 0 | 0.0 | 0.0 | 5.5 | 0.0 | 122 | 2465 |

#### Positional positive-price cutoffs

| Method | Position | Positive count | Deepest positive position rank |
| --- | --- | --- | --- |
| Max VORP | QB | 25 | 25 |
| Max VORP | RB | 51 | 51 |
| Max VORP | WR | 71 | 71 |
| Max VORP | TE | 29 | 29 |
| Middle VORP | QB | 12 | 12 |
| Middle VORP | RB | 25 | 25 |
| Middle VORP | WR | 37 | 37 |
| Middle VORP | TE | 12 | 12 |
| Current-team VoRP | QB | 25 | 25 |
| Current-team VoRP | RB | 51 | 51 |
| Current-team VoRP | WR | 71 | 71 |
| Current-team VoRP | TE | 29 | 29 |
| Corrected Safe | QB | 25 | 25 |
| Corrected Safe | RB | 51 | 51 |
| Corrected Safe | WR | 73 | 73 |
| Corrected Safe | TE | 29 | 29 |
| Corrected Weeks as Starter | QB | 24 | 24 |
| Corrected Weeks as Starter | RB | 48 | 48 |
| Corrected Weeks as Starter | WR | 69 | 69 |
| Corrected Weeks as Starter | TE | 28 | 28 |
| 67% common horizon | QB | 17 | 17 |
| 67% common horizon | RB | 34 | 34 |
| 67% common horizon | WR | 50 | 50 |
| 67% common horizon | TE | 20 | 20 |
| 33% common horizon | QB | 8 | 8 |
| 33% common horizon | RB | 20 | 20 |
| 33% common horizon | WR | 23 | 23 |
| 33% common horizon | TE | 8 | 8 |

#### Rank correlations

| Pair | Spearman ρ |
| --- | --- |
| Middle VORP vs Max VORP | 0.776 |
| Middle VORP vs Current-team VoRP | 0.775 |
| Middle VORP vs Corrected Safe | 0.775 |
| Middle VORP vs Corrected Weeks as Starter | 0.788 |
| Middle VORP vs 67% common horizon | 0.877 |
| Middle VORP vs 33% common horizon | 0.849 |

#### Concrete Middle/Max/current-team divergences

| Privacy-safe player | Middle $ / rank | Max $ / rank | Max-selected stage | Current $ / rank | Why |
| --- | --- | --- | --- | --- | --- |
| P0575 (TE8) | $12 / #66 | $28 / #77 | 24 teams | $26 / #86 | Max selected its largest unrounded value at the 24-team reachable stage; Middle fixes one 13-team stage for every player. |
| P0289 (TE12) | $2 / #86 | $21 / #100 | 24 teams | $20 / #105 | Max selected its largest unrounded value at the 24-team reachable stage; Middle fixes one 13-team stage for every player. |
| P0288 (TE9) | $8 / #74 | $25 / #88 | 24 teams | $24 / #92 | Max selected its largest unrounded value at the 24-team reachable stage; Middle fixes one 13-team stage for every player. |
| P0711 (TE10) | $5 / #79 | $23 / #95 | 24 teams | $22 / #97 | Max selected its largest unrounded value at the 24-team reachable stage; Middle fixes one 13-team stage for every player. |
| P1127 (TE11) | $4 / #82 | $22 / #98 | 24 teams | $21 / #99 | Max selected its largest unrounded value at the 24-team reachable stage; Middle fixes one 13-team stage for every player. |
| P0019 (TE7) | $13 / #65 | $29 / #73 | 24 teams | $27 / #81 | Max selected its largest unrounded value at the 24-team reachable stage; Middle fixes one 13-team stage for every player. |
| P0882 (TE6) | $14 / #64 | $29 / #72 | 24 teams | $27 / #80 | Max selected its largest unrounded value at the 24-team reachable stage; Middle fixes one 13-team stage for every player. |
| P0017 (TE3) | $36 / #41 | $51 / #40 | 5 teams | $42 / #54 | Max selected its largest unrounded value at the 5-team reachable stage; Middle fixes one 13-team stage for every player. |
| P0144 (TE2) | $57 / #21 | $100 / #10 | 5 teams | $55 / #30 | Max selected its largest unrounded value at the 5-team reachable stage; Middle fixes one 13-team stage for every player. |
| P0282 (TE5) | $14 / #63 | $29 / #71 | 24 teams | $28 / #74 | Max selected its largest unrounded value at the 24-team reachable stage; Middle fixes one 13-team stage for every player. |

### Common-horizon sensitivity

| Horizon | Current-state target teams | Positive prices | Spearman vs primary 50% |
| --- | --- | --- | --- |
| 67% | 18 | 121 | 0.877 |
| 50% (primary, ceil) | 13 | 86 | 1.000 |
| 50% (floor) | 13 | 86 | 1.000 |
| 33% | 9 | 59 | 0.849 |

| Horizon | Historical canonical-win n | MAE | Bias | Spearman ρ |
| --- | --- | --- | --- | --- |
| 67% | 20 | 74.2 | -72.3 | 0.823 |
| 50% (primary, ceil) | 14 | 100.4 | -99.9 | 0.802 |
| 50% (floor) | 14 | 100.4 | -99.9 | 0.802 |
| 33% | 12 | 113.8 | -113.8 | 0.779 |

The observed W2, W3, W4 team counts are even (30, 28, 26), so floor and ceil produce identical empirical bids. The explicit odd-state unit case still differs as intended (27→14 with ceil versus 27→13 with floor).

### Corrected non-VORP context

Corrected Safe and Weeks-as-Starter are reproduced in the offline layer from PR #13 implementation commit `7d86b2d`: direct slots are allocated first, then FLEX and SUPER_FLEX from remaining eligible players, and unsupported replacement depth maps to zero rather than an artificial premium. No PR #13 product code is merged or cherry-picked. Legacy curves remain separately labeled in the broader report so historical comparisons are not silently rewritten.


## Behavioral-question audit appendix

These are privacy-safe aggregate answers from the exact manual app-Week-5 pre/post-waiver audit, supplemented only where explicitly labeled by the W2–W4 reconstructed replay. Exact manual evidence and reconstructed strategy replay are not interchangeable.

| Question | Available evidence / n | Current answer |
| --- | --- | --- |
| Price bands: median / upper quartile / top credible / top all | Exact manual W5 audit: 11 target rows. Top-credible MAE $36.36, median AE $25, signed bias +$16.91, Spearman 0.712; top-all MAE $47.27, median AE $48, signed bias +$40.91, Spearman 0.796. | The ordering signal was useful, but levels were too high overall and errors differed materially by target tier. Privacy-safe median and upper-quartile prediction bands were not retained as a separate deterministic slice, so premium-versus-mid/lower band calibration remains prospective rather than inferred from 11 auctions. |
| Likely / Possible / Unlikely as claim probabilities and threshold outcomes | Full exact W5 incidence audit: Likely 31/65 (47.7%), Possible 34/108 (31.5%), Unlikely 15/69 (21.7%). Restricted cross-check: 50 manager predictions, 5 canonical claims, 4 observed players, 11 teams. | The labels were directionally ordered for any canonical claim, but separation was weak and the restricted cross-check is tiny. Positive-claim, ≥Max VORP, ≥Safe, ≥serious-median, and ≥observed-minimum bands are not credibly estimable from this one auction; those outcomes remain preregistered prospective tests. |
| Prior wins, same-position wins, remaining FAAB, and prior-week top bidders | Longitudinal reconstructed replay contains 240 serious bids and 72 winners, but the exact W5 behavioral slice does not contain a clean prior-only panel for these covariates. | No causal or manager-style claim is supported. Effects for prior wins ≥10%/≥20% starting FAAB, prior same-position wins, budget level, and prior-week top-bidder participation/heavy spend remain prospective; budget capacity must be separated from willingness. |
| Aggressive versus wins and observed minimum proxies | Exact W5, n=11: Aggressive MAE $26.27 versus winners (bias −$12.27; 5/11 at or above the winner) and MAE $18.09 versus observed minimum proxies (bias +$10.27; 10/11 at or above the proxy). | Aggressive behaved more like a rough threshold than a winning-price forecast, but it was not a reliable minimum: it still missed one observed proxy and commonly exceeded the proxy. Keep it out of the four-method owner multiplier tables because it is derived from Safe. |
| Aggressive versus 1.5× Max VORP and a cautious tier-aware candidate | Exact W5, n=11: simple 1.5× Max VORP had winner MAE $36.45 and minimum-proxy MAE $27.18, worse than Aggressive at $26.27 / $18.09. Longitudinal winner replay favors Aggressive in-sample, but no prior-only held-out comparison validates a replacement curve. | The manual audit rejects simple 1.5× Max VORP as an improvement. A cautious tier-aware candidate is only a hypothesis until preregistered exact pre-waiver and held-out evidence exists; no production formula change is warranted. |
| Prediction distribution and right-tail shape | Only 11 exact W5 target rows; top-all estimates were more upward biased than top-credible estimates. | The sample is compatible with a heavy right tail, but is far too small to identify an exponential or other parametric distribution. Report empirical quantiles only when a larger exact sample exists. |
| Weekly free-agent rank 1/2/3/later prices | The committed privacy-safe fixture does not retain an exact auction-time free-agent rank with quality, position, injury, active-team, and liquidity controls. | Starting-FAAB shares and Max-VORP/Aggressive multiples by free-agent rank are not credibly estimable here. Preserve this as a descriptive prospective analysis with the named controls. |
| Claims per manager/auction, alternatives, duplicates, and spend | Exact W5: 107 raw claims, 84 unique manager/player pairs, and 23 additional same-manager alternatives. The owner-team slice had 8 raw and 7 canonical claims. | One auction cannot establish a manager’s “usual claims per auction,” clean claim-count quantiles, or a stable relation to wins/spend. Alternatives and contingency paths must stay separate from canonical claims. |
| Projected positional need | No privacy-safe, time-aligned roster-need feature with adequate controls is present in the exact behavioral slice or reconstructed replay. | Need-as-predictor is unsupported. Future work must distinguish modeled roster need from observed intent and control for player quality, position, injury, active teams, liquidity, and remaining FAAB. |
| Do prior-week top bidders bid less next week? | The available exact manual audit is one auction; the reconstructed replay is not a clean prior-only manager panel for this question. | Not estimable. Test raw dollars and starting-/remaining-FAAB-normalized bids prospectively across additional exact auctions. |

### Owner-team appendix (privacy-safe)

- **Scope:** Exact W5 owner-team slice: 8 raw claims, 7 canonical claims; behavioral cross-check includes 5 canonical claims across 4 observed players.
- **Acquisition / spend / remaining:** One acquisition for $187 from $499 pre-waiver FAAB, leaving $312. Its observed minimum proxy was $159 and top-credible prediction was $244, so the clearing price landed inside that wide audit band.
- **Failed contingencies and process quality:** Tiered coverage produced one intended premium acquisition and preserved substantial FAAB, but three later claims were explicitly rejected as roster-full. Contingency/roster-capacity sequencing was therefore imperfect; hidden drop paths are not inferred and failed claims are not treated as clearing competition. This is a process-quality observation, not evidence that the acquisition will produce a good future outcome.
- **Lineup / risk:** Strength: one premium skill-position addition without exhausting budget. Optimized lineup, injury risk, and remaining positional holes are not supported by the privacy-safe post-waiver evidence and are intentionally not fabricated.

### Limitation

Three reconstructed auctions plus one exact manual audit do not support stable manager-style, positional-need, longitudinal behavioral, or parametric right-tail claims. Unsupported questions above remain prospective hypotheses, not missing-at-random zeros or inferred facts.


## Executive result

Among 72 usable winning bids, **Legacy Aggressive** has the lowest in-sample MAE (20.2). After the predeclared token rule, **Legacy Aggressive** is lowest (33.5). Robust-filter leaders are ratio-gap flag removed: Legacy Aggressive; MAD flag removed: Legacy Aggressive; IQR flag removed: Legacy Aggressive; the serious-bid leader is stable across them. This is descriptive evidence from one 32-team league, 3 reconstructed decision weeks, not a universal strategy ranking. Do **not** change the production default from this study alone.

The executable comparison preserves the five production-registry strategies, adds **Middle VORP only in this offline analysis**, and separately labels the corrected PR #13 Safe/Weeks curves versus legacy branch outputs. The P0 label “Weekly” is **not** silently mapped to VoRP; the naming audit below establishes why it is excluded as undefined. No production registry, default, or UI behavior is changed.

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

- Sleeper read-only endpoints: `GET /v1/league/[private]`, `GET /v1/players/nfl`, and `GET /v1/league/[private]/transactions/{week}`; season 2026; transaction payload SHA-256 `1a83a3057100ac0af0e721f8073496e2a43f08972af412737ecdd187b2e93583`. The private league identifier is intentionally absent.
- Projection source: read-only Supabase REST tables `projection_snapshot_runs` and `projection_snapshot_values`. Refresh uses GET only. No project identifier, credential, raw payload, player ID/name, manager ID/name, or league ID is printed in the report.
- League settings observed at refresh: 32 starting teams, $500 initial FAAB, ppr, lineup `QB,RB,RB,WR,WR,TE,FLEX,K,DEF,BN,BN,BN,BN`. Sleeper provides no historical settings endpoint, so season stability is an explicit assumption, not silently inferred history.
- Active teams use the production progression estimator, not current rosters: W2=30, W3=28, W4=26. Every transaction week is translated to decision week as `transactionWeek + 1`.
- Fixture refresh (private environment only): `SUPABASE_PROJECT_REF=<private> SUPABASE_URL=<private> SUPABASE_READ_KEY=<private> LEAGUE_ID=<private> npm run analyze:bidding -- --refresh`. Offline report: `npm run analyze:bidding`. Focused tests: `npm test -- --run scripts/__tests__/bidding-strategy-analysis.test.ts`. Full verification: `npm test -- --run`, `npm run lint`, script-only `tsc --ignoreConfig --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --allowImportingTsExtensions --types node scripts/analyze-bidding-strategies.ts scripts/bidding-strategy-analysis.ts`, `git diff --check`, and changed-file secret/identifier scan.

### Projection snapshots

| Requested decision week | Stored week | Status/provenance | Canonical cutoff/effective at | Capture started | Provider fetched at | Content hash / exclusion | Raw rows | ROS players |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 2 | reconstructed | 2026-09-16T03:00:00+00:00 | 2026-09-25T07:57:31.224+00:00 | 2026-09-25T07:57:31.224+00:00 | c6613f6cb9a739f1… | 17847 | 1162 |
| 3 | 3 | reconstructed | 2026-09-23T03:00:00+00:00 | 2026-09-25T07:57:35.629+00:00 | 2026-09-25T07:57:35.629+00:00 | 0aea608679cb52d1… | 16867 | 1142 |
| 4 | 4 | reconstructed | 2026-09-30T03:00:00+00:00 | 2026-09-30T08:34:54.549+00:00 | 2026-09-30T08:34:56.428+00:00 | 9463b40e63b71c00… | 15761 | 1151 |

Per the repository's provenance rules, the available W2, W3, W4 snapshot runs are labeled **reconstructed**, never exact. A same-week reconstructed capture preserves what was actually stored and its capture/effective-at provenance, but it is not proof of the pre-waiver forecast. An earlier-week fallback is not substituted: affected events are excluded.

## Extraction and exclusion audit

| Transaction week | Raw transactions | Raw waivers |
| --- | --- | --- |
| 1 | 206 | 146 |
| 2 | 226 | 194 |
| 3 | 207 | 184 |
| 4 | 5 | 0 |

- Raw transactions: **644**; raw waivers: **524**.
- Before dedupe: 94 completed wins and 368 same-batch/player-proven legitimate losses. After manager+player+processing-batch dedupe: **94 wins + 322 losses = 416 canonical bids**; 46 contingency/drop paths removed.
- FAAB ledger inputs: 66 completed spend rows and 0 completed transfer records. Reconstruction: transaction-ledger=416, inferred-minimum=0, uncertain=0. A claim that exceeds the reconstructed ledger is retained at an explicit inferred minimum; unreliable prior timestamps are marked uncertain.
- Formula-usable events: **355** (72 wins, 283 legitimate losses); token/low-intent: 115; serious: 240; serious competitive-cluster bids: 224 across 26 player/batches.

| Exclusion reason | Count |
| --- | --- |
| classifier:non-waiver:chopped | 6 |
| classifier:non-waiver:free_agent | 114 |
| classifier:waiver:failed-claim-without-same-batch-winner | 12 |
| classifier:waiver:failed-without-claimed-by-other-proof | 50 |
| analysis:target-missing-supported-position-projection | 61 |

## Fixed rules (declared before looking at winners)

- **Token/low intent:** bid ≤ max($1, 1% of original FAAB) = $5. Evidence is never deleted; it is separated in sensitivity views.
- **Ratio-gap isolated top:** top/second ≥ 2× and dollar gap ≥ 10% original FAAB.
- **MAD isolated top:** cluster n≥3, normalized top > median + 3×1.4826×MAD, plus ≥ 5% original-FAAB gap.
- **IQR isolated top:** cluster n≥4, normalized top > Q3 + 1.5×IQR, plus the same minimum gap.
Flags (not deletions): ratio-gap=1, MAD=4, IQR=4. Rules are applied independently and are not selected based on which strategy wins.

## Production formulas replayed

Production-registry values come from `buildWaiverBoard` using the shared implementation and each event's reconstructed context. Max VORP maximizes unrounded championship-calibrated VORP dollars across every reachable active-team stage. Current-team VoRP uses the event's active-team replacement stage. Middle VORP is analysis-only and uses the same VoRP calibration at one shared `max(4, ceil(teamsRemaining/2))` stage. Corrected Safe/Weeks reproduce PR #13 commit `7d86b2d` in the offline layer; legacy branch outputs remain separately labeled. Legacy Aggressive is `round(WeeksAsStarter × 2 × (1 − (decisionWeek−1)/16))`. Intrinsic suggestions are **not** capped by manager FAAB; pre-bid normalization is reported separately. No Weekly value is computed because no authoritative production or historical formula exists.

### All valid bids

| Strategy | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias (pred−actual) | Spearman ρ | Within max($5,20%) | Predicted range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 355 | 25.9 | 17.7–33.7 | 15.0 | -6.2 | 0.78 | 31.3% | 0–102 |
| Middle VORP | 355 | 27.4 | 17.7–36.4 | 14.0 | -19.6 | 0.76 | 38.0% | 0–85 |
| Current-team VoRP | 355 | 26.3 | 17.2–35.9 | 15.0 | -9.5 | 0.78 | 31.8% | 0–80 |
| Corrected Safe (PR #13) | 355 | 32.3 | 24.7–38.7 | 25.0 | 10.2 | 0.77 | 28.5% | 0–106 |
| Corrected Weeks as Starter (PR #13) | 355 | 27.4 | 18.8–34.9 | 16.0 | -0.6 | 0.77 | 35.2% | 0–106 |
| Legacy Safe | 355 | 30.8 | 23.2–37.4 | 23.0 | 4.7 | 0.74 | 29.0% | 0–106 |
| Legacy Aggressive | 355 | 36.2 | 25.3–45.5 | 19.0 | 22.2 | 0.77 | 33.8% | 0–186 |
| Legacy Weeks as Starter | 355 | 26.6 | 17.9–34.2 | 14.0 | -5.4 | 0.77 | 34.4% | 0–106 |

### Winning bids

| Strategy | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias (pred−actual) | Spearman ρ | Within max($5,20%) | Predicted range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 72 | 26.5 | 16.3–38.4 | 6.0 | -24.5 | 0.75 | 45.8% | 0–102 |
| Middle VORP | 72 | 32.2 | 20.9–45.1 | 10.0 | -32.1 | 0.65 | 43.1% | 0–85 |
| Current-team VoRP | 72 | 27.6 | 16.8–39.9 | 6.0 | -25.5 | 0.75 | 45.8% | 0–80 |
| Corrected Safe (PR #13) | 72 | 23.5 | 14.3–34.5 | 6.0 | -15.4 | 0.75 | 50.0% | 0–106 |
| Corrected Weeks as Starter (PR #13) | 72 | 24.7 | 14.9–36.3 | 5.0 | -22.8 | 0.75 | 52.8% | 0–106 |
| Legacy Safe | 72 | 24.9 | 15.1–36.1 | 6.0 | -18.6 | 0.73 | 48.6% | 0–106 |
| Legacy Aggressive | 72 | 20.2 | 12.4–29.8 | 6.0 | -14.7 | 0.76 | 52.8% | 0–186 |
| Legacy Weeks as Starter | 72 | 26.5 | 16.3–38.0 | 5.5 | -25.3 | 0.76 | 50.0% | 0–106 |

### Serious/non-token bids

| Strategy | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias (pred−actual) | Spearman ρ | Within max($5,20%) | Predicted range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 240 | 33.4 | 23.3–42.5 | 21.0 | -13.6 | 0.65 | 18.3% | 0–102 |
| Middle VORP | 240 | 38.7 | 27.1–48.8 | 25.5 | -29.8 | 0.65 | 11.7% | 0–85 |
| Current-team VoRP | 240 | 34.1 | 22.4–45.3 | 20.0 | -18.5 | 0.65 | 19.2% | 0–80 |
| Corrected Safe (PR #13) | 240 | 38.8 | 31.3–46.1 | 33.5 | 6.5 | 0.64 | 20.0% | 0–106 |
| Corrected Weeks as Starter (PR #13) | 240 | 35.8 | 26.3–43.9 | 24.5 | -5.3 | 0.64 | 21.3% | 0–106 |
| Legacy Safe | 240 | 37.6 | 29.7–45.1 | 30.0 | -0.5 | 0.60 | 18.8% | 0–106 |
| Legacy Aggressive | 240 | 46.3 | 35.2–56.7 | 34.5 | 26.1 | 0.63 | 20.0% | 0–186 |
| Legacy Weeks as Starter | 240 | 35.2 | 25.8–43.7 | 23.0 | -11.6 | 0.63 | 20.0% | 0–106 |

### Serious competitive clusters

| Strategy | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias (pred−actual) | Spearman ρ | Within max($5,20%) | Predicted range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 224 | 34.6 | 24.2–44.3 | 22.5 | -13.5 | 0.62 | 19.2% | 0–102 |
| Middle VORP | 224 | 39.9 | 28.4–50.9 | 26.0 | -30.5 | 0.63 | 12.5% | 0–85 |
| Current-team VoRP | 224 | 35.3 | 23.3–47.3 | 21.0 | -18.7 | 0.63 | 20.1% | 0–80 |
| Corrected Safe (PR #13) | 224 | 40.3 | 32.4–47.8 | 36.0 | 7.7 | 0.61 | 20.1% | 0–106 |
| Corrected Weeks as Starter (PR #13) | 224 | 37.0 | 27.3–45.7 | 28.5 | -4.4 | 0.61 | 21.9% | 0–106 |
| Legacy Safe | 224 | 38.9 | 31.0–46.6 | 32.0 | 0.3 | 0.58 | 18.8% | 0–106 |
| Legacy Aggressive | 224 | 48.3 | 36.2–59.7 | 37.5 | 29.1 | 0.61 | 20.5% | 0–186 |
| Legacy Weeks as Starter | 224 | 36.4 | 26.6–45.4 | 24.0 | -11.1 | 0.61 | 20.5% | 0–106 |

## Sensitivity of winning-bid MAE

| Sensitivity case | n wins | Max VORP MAE | Middle VORP MAE | Current-team VoRP MAE | Corrected Safe (PR #13) MAE | Corrected Weeks as Starter (PR #13) MAE | Legacy Safe MAE | Legacy Aggressive MAE | Legacy Weeks as Starter MAE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| All usable winning bids | 72 | 26.5 | 32.2 | 27.6 | 23.5 | 24.7 | 24.9 | 20.2 | 26.5 |
| Non-token winning bids | 42 | 44.1 | 54.4 | 45.9 | 38.1 | 41.3 | 40.7 | 33.5 | 44.5 |
| Non-token, ratio-gap flag removed | 41 | 40.0 | 50.0 | 41.8 | 34.2 | 36.9 | 36.8 | 29.1 | 40.1 |
| Non-token, MAD flag removed | 38 | 35.2 | 45.3 | 36.5 | 30.2 | 32.7 | 32.6 | 27.8 | 36.0 |
| Non-token, IQR flag removed | 38 | 35.1 | 45.0 | 36.4 | 30.0 | 32.4 | 32.8 | 27.8 | 35.9 |

95% intervals are deterministic 2000-replicate cluster bootstraps (seed 20260927); resampling the player/batch cluster keeps correlated win/loss bids together. They quantify sampling variation in this observed set, not projection-history error.

## Target/player price rank and range coverage

| Strategy | Spearman vs winning price | Observed winning range | Predicted range |
| --- | --- | --- | --- |
| Max VORP | 0.75 | 0–300 | 0–102 |
| Middle VORP | 0.65 | 0–300 | 0–85 |
| Current-team VoRP | 0.75 | 0–300 | 0–80 |
| Corrected Safe (PR #13) | 0.75 | 0–300 | 0–106 |
| Corrected Weeks as Starter (PR #13) | 0.75 | 0–300 | 0–106 |
| Legacy Safe | 0.73 | 0–300 | 0–106 |
| Legacy Aggressive | 0.76 | 0–300 | 0–186 |
| Legacy Weeks as Starter | 0.76 | 0–300 | 0–106 |

A serious-cluster prediction is “covered” when it falls inside that target's observed non-token bid range (minimum serious loss through winning bid).

| Strategy | Competitive clusters | Inside observed range | Coverage |
| --- | --- | --- | --- |
| Max VORP | 26 | 19 | 73.1% |
| Middle VORP | 26 | 12 | 46.2% |
| Current-team VoRP | 26 | 19 | 73.1% |
| Corrected Safe (PR #13) | 26 | 15 | 57.7% |
| Corrected Weeks as Starter (PR #13) | 26 | 17 | 65.4% |
| Legacy Safe | 26 | 17 | 65.4% |
| Legacy Aggressive | 26 | 16 | 61.5% |
| Legacy Weeks as Starter | 26 | 18 | 69.2% |

## Normalized winning-bid error

| Strategy | MAE / original FAAB | MAE of bid/pre-bid-FAAB ratio |
| --- | --- | --- |
| Max VORP | 5.3% | 5.9% |
| Middle VORP | 6.4% | 7.1% |
| Current-team VoRP | 5.5% | 6.1% |
| Corrected Safe (PR #13) | 4.7% | 5.1% |
| Corrected Weeks as Starter (PR #13) | 4.9% | 5.4% |
| Legacy Safe | 5.0% | 5.4% |
| Legacy Aggressive | 4.0% | 4.5% |
| Legacy Weeks as Starter | 5.3% | 5.8% |

Pre-bid normalization is shown only because the ledger denominator is positive; reconstruction confidence remains visible above. It does not reinterpret intrinsic strategy values as manager-specific willingness.

## Useful slices (winning bids)

| Dimension | Slice | n | Lowest MAE strategy (MAE) |
| --- | --- | --- | --- |
| decision week | W2 | 20 | Corrected Safe (PR #13) (27.0) |
| decision week | W3 | 27 | Legacy Aggressive (21.2) |
| decision week | W4 | 25 | Legacy Aggressive (13.8) |
| position | QB | 8 | Legacy Aggressive (31.0) |
| position | RB | 20 | Legacy Aggressive (32.3) |
| position | TE | 12 | Corrected Weeks as Starter (PR #13) (10.2) |
| position | WR | 32 | Legacy Aggressive (11.5) |
| Max-VORP target tier | bottom-quartile | 19 | Corrected Safe (PR #13) (7.0) |
| Max-VORP target tier | middle-half | 36 | Max VORP (15.0) |
| Max-VORP target tier | top-quartile | 17 | Legacy Aggressive (45.0) |
| cap state | below-90%-prebid | 72 | Legacy Aggressive (20.2) |

Slices are descriptive and often tiny. Player tier is a deterministic within-decision-week quartile of target Max-VORP value; cap state means actual bid ≥90% of reconstructed pre-bid FAAB.

## Manager-adjusted forecasts (strict walk-forward)

For each batch, the production Max-VORP manager profile is fit only from that anonymized manager's earlier processed batches with usable historical baselines; same-batch and future claims are excluded. The prediction is capped at reconstructed pre-bid FAAB and is analyzed separately from intrinsic strategies. Forecastable=243; omitted for insufficient prior-only evidence=112.

| Forecast subset | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias | Spearman ρ | Within max($5,20%) | Actual range | Forecast range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| All forecastable bids | 243 | 28.8 | 18.4–37.3 | 16.0 | 6.1 | 0.75 | 37.4% | 0–300 | 0–316 |
| Forecastable wins | 50 | 18.9 | 9.8–29.7 | 5.0 | -16.5 | 0.80 | 58.0% | 0–300 | 0–316 |

Because every underlying historical projection is reconstructed, these forecasts are exploratory, not historically exact. Missing forecasts are explicit prior-evidence exclusions, not zero predictions.

## Validation, limitations, and recommendation

- Leave-week-out fitting is not statistically supported: only 3 usable decision weeks (W2, W3, W4) exist and all are reconstructed. The compared intrinsic formulas have no fitted parameters here. Manager forecasts therefore use strict chronological walk-forward validation instead.
- Sleeper's transaction API reveals failed private amounts only for returned failed records. The classifier retains only failures proven by a different same-player winner in the identical processing batch; it makes no claim about unsupported or absent private bids.
- Reconstructed snapshots were captured after their canonical cutoffs. Historical player ranks and values may differ from what managers saw. No current projection is substituted for an absent decision week.
- Historical roster ownership is not required by these formulas for a known claimed target, but league settings are only observed current-season state. Active-team counts are formula-derived progression estimates.
- One league, early season, correlated bids, and small slices mean strategy ordering can change with one extreme target. Bootstrap intervals do not repair systematic snapshot error.
- Recommendation: keep production behavior unchanged. Use **Legacy Aggressive** only as a preregistered hypothesis, not a winner. Collect exact Tuesday 8 PM captures and repeat across materially more weeks before drawing product conclusions.
