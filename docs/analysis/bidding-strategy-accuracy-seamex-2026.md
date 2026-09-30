# SeaMex 2026 bidding-strategy accuracy analysis

Deterministic offline report generated from anonymized fixture version 1. Data are complete through **2026-09-30T07:50:30.120Z**; there is no wall-clock generation timestamp. Regenerate byte-for-byte with `npm run analyze:bidding`.

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


## Five-bullet answer: weekly price multipliers

- Scope: W2, W3 and W4 have same-week reconstructed snapshots. The top three are unique canonical winners after owner-directed-outlier-01 (private GET-only catalog match plus exact position/total fingerprints in both reconstructed snapshots map uniquely to one canonical completed W3 win at $234; proof matches=1).
- Top-three winning-price arithmetic multipliers (observed/intrinsic): W2: Max VORP 3.34× (3/3); Middle VORP 5.19× (3/3); Current-team VoRP 3.38× (3/3); Corrected Safe 2.30× (3/3); Corrected Weeks as Starter 2.84× (3/3); W3: Max VORP 2.35× (3/3); Middle VORP 3.00× (3/3); Current-team VoRP 3.00× (3/3); Corrected Safe 1.94× (3/3); Corrected Weeks as Starter 1.94× (3/3); W4: Max VORP 2.74× (3/3); Middle VORP 3.21× (3/3); Current-team VoRP 3.02× (3/3); Corrected Safe 2.07× (3/3); Corrected Weeks as Starter 2.21× (3/3).
- Top-three serious-market-median arithmetic multipliers: W2: Max VORP 1.40× (3/3); Middle VORP 2.21× (3/3); Current-team VoRP 1.42× (3/3); Corrected Safe 0.92× (3/3); Corrected Weeks as Starter 1.14× (3/3); W3: Max VORP 0.78× (3/3); Middle VORP 1.02× (3/3); Current-team VoRP 1.00× (3/3); Corrected Safe 0.65× (3/3); Corrected Weeks as Starter 0.65× (3/3); W4: Max VORP 1.45× (3/3); Middle VORP 1.70× (3/3); Current-team VoRP 1.61× (3/3); Corrected Safe 1.11× (3/3); Corrected Weeks as Starter 1.18× (3/3).
- Closest serious-market strategy by eligible weekly cluster: W2 Max VORP; W3 Current-team VoRP; W4 Corrected Weeks as Starter.
- Across all eligible weeks, the closest overall serious-median strategy is Current-team VoRP; raw evidence is retained in the labeled with-target sensitivity view, and weekly scale remains distinct from strategy shape.

## Weekly top-three and median-market appendix

This owner-directed view compares **Max VORP, Middle VORP, current-team VoRP, and the corrected PR #13 Safe and Weeks-as-Starter curves**. Legacy Aggressive is excluded because it is derived from legacy Safe. Only events with an exact or explicitly reconstructed same-decision-week snapshot join are eligible; the eligible decision weeks are W2, W3, W4. “Serious” is strictly **bid > $5**. Ratios are **observed/intrinsic**, not intrinsic/observed. A zero intrinsic denominator is undefined, excluded from arithmetic/geometric/median aggregation, and counted in coverage. A winning or competing bid at its reconstructed pre-bid FAAB is marked as FAAB-censored because latent willingness may be higher.

### W2 — Analysis A: top-three winning prices

| Privacy-safe target | Winning bid | FAAB-censored? | Max VORP ratio | Middle VORP ratio | Current-team VoRP ratio | Corrected Safe ratio | Corrected Weeks as Starter ratio |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W2 target 1 | $285 | no | 4.75 | 6.95 | 4.83 | 3.65 | 4.60 |
| W2 target 2 | $153 | no | 2.73 | 4.50 | 2.78 | 2.01 | 2.51 |
| W2 target 3 | $99 | no | 2.54 | 4.13 | 2.54 | 1.22 | 1.41 |

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 3/3 | 3.34 | 3.21 | 2.73 |
| Middle VORP | 3/3 | 5.19 | 5.05 | 4.50 |
| Current-team VoRP | 3/3 | 3.38 | 3.24 | 2.78 |
| Corrected Safe | 3/3 | 2.30 | 2.08 | 2.01 |
| Corrected Weeks as Starter | 3/3 | 2.84 | 2.54 | 2.51 |

### W2 — Analysis C: top-three median-market prices

| Privacy-safe target | Serious median | Serious/all n | Censored observations | All-bid median | Max VORP ratio | Middle VORP ratio | Current-team VoRP ratio | Corrected Safe ratio | Corrected Weeks as Starter ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W2 target 1 | $85.0 | 21/21 | 0 | $85.0 | 1.42 | 2.07 | 1.44 | 1.09 | 1.37 |
| W2 target 2 | $75.0 | 19/19 | 0 | $75.0 | 1.34 | 2.21 | 1.36 | 0.99 | 1.23 |
| W2 target 3 | $56.5 | 8/9 | 0 | $53.0 | 1.45 | 2.35 | 1.45 | 0.70 | 0.81 |

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 3/3 | 1.40 | 1.40 | 1.42 |
| Middle VORP | 3/3 | 2.21 | 2.21 | 2.21 |
| Current-team VoRP | 3/3 | 1.42 | 1.42 | 1.44 |
| Corrected Safe | 3/3 | 0.92 | 0.91 | 0.99 |
| Corrected Weeks as Starter | 3/3 | 1.14 | 1.11 | 1.23 |

† All-bid median differs from the serious-bid median by at least $5.

### W3 — Analysis A: top-three winning prices

| Privacy-safe target | Winning bid | FAAB-censored? | Max VORP ratio | Middle VORP ratio | Current-team VoRP ratio | Corrected Safe ratio | Corrected Weeks as Starter ratio |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W3 target 1 | $231 | no | 3.50 | 4.53 | 4.62 | 2.92 | 2.92 |
| W3 target 2 | $187 | no | 2.23 | 2.23 | 2.43 | 1.76 | 1.76 |
| W3 target 3 | $103 | no | 1.32 | 2.24 | 1.94 | 1.14 | 1.14 |

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 3/3 | 2.35 | 2.17 | 2.23 |
| Middle VORP | 3/3 | 3.00 | 2.83 | 2.24 |
| Current-team VoRP | 3/3 | 3.00 | 2.79 | 2.43 |
| Corrected Safe | 3/3 | 1.94 | 1.81 | 1.76 |
| Corrected Weeks as Starter | 3/3 | 1.94 | 1.81 | 1.76 |

### W3 — Analysis C: top-three median-market prices

| Privacy-safe target | Serious median | Serious/all n | Censored observations | All-bid median | Max VORP ratio | Middle VORP ratio | Current-team VoRP ratio | Corrected Safe ratio | Corrected Weeks as Starter ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W3 target 1 | $56.0 | 13/14 | 0 | $53.0 | 0.85 | 1.10 | 1.12 | 0.71 | 0.71 |
| W3 target 2 | $66.5 | 14/15 | 0 | $66.0 | 0.79 | 0.79 | 0.86 | 0.63 | 0.63 |
| W3 target 3 | $54.5 | 14/14 | 0 | $54.5 | 0.70 | 1.18 | 1.03 | 0.61 | 0.61 |

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 3/3 | 0.78 | 0.78 | 0.79 |
| Middle VORP | 3/3 | 1.02 | 1.01 | 1.10 |
| Current-team VoRP | 3/3 | 1.00 | 1.00 | 1.03 |
| Corrected Safe | 3/3 | 0.65 | 0.65 | 0.63 |
| Corrected Weeks as Starter | 3/3 | 0.65 | 0.65 | 0.63 |

† All-bid median differs from the serious-bid median by at least $5.

### W4 — Analysis A: top-three winning prices

| Privacy-safe target | Winning bid | FAAB-censored? | Max VORP ratio | Middle VORP ratio | Current-team VoRP ratio | Corrected Safe ratio | Corrected Weeks as Starter ratio |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W4 target 1 | $300 | no | 2.94 | 3.53 | 3.75 | 2.86 | 2.86 |
| W4 target 2 | $187 | no | 2.71 | 2.83 | 2.75 | 1.89 | 2.05 |
| W4 target 3 | $128 | no | 2.56 | 3.28 | 2.56 | 1.47 | 1.73 |

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 3/3 | 2.74 | 2.73 | 2.71 |
| Middle VORP | 3/3 | 3.21 | 3.20 | 3.28 |
| Current-team VoRP | 3/3 | 3.02 | 2.98 | 2.75 |
| Corrected Safe | 3/3 | 2.07 | 2.00 | 1.89 |
| Corrected Weeks as Starter | 3/3 | 2.21 | 2.17 | 2.05 |

### W4 — Analysis C: top-three median-market prices

| Privacy-safe target | Serious median | Serious/all n | Censored observations | All-bid median | Max VORP ratio | Middle VORP ratio | Current-team VoRP ratio | Corrected Safe ratio | Corrected Weeks as Starter ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W4 target 1 | $171.0 | 20/20 | 0 | $171.0 | 1.68 | 2.01 | 2.14 | 1.63 | 1.63 |
| W4 target 2 | $100.0 | 15/17 | 0 | $66.0 † | 1.45 | 1.52 | 1.47 | 1.01 | 1.10 |
| W4 target 3 | $61.0 | 15/15 | 0 | $61.0 | 1.22 | 1.56 | 1.22 | 0.70 | 0.82 |

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 3/3 | 1.45 | 1.44 | 1.45 |
| Middle VORP | 3/3 | 1.70 | 1.68 | 1.56 |
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
| Middle VORP | 14 | 100.4 | 82.0 | -99.9 | -1.04 | 0.80 |
| Current-team VoRP | 36 | 42.1 | 17.0 | -38.5 | 0.17 | 0.90 |
| Corrected Safe | 36 | 34.1 | 16.5 | -18.9 | 0.41 | 0.91 |
| Corrected Weeks as Starter | 34 | 38.0 | 18.0 | -34.2 | 0.33 | 0.90 |

Serious median clusters: 41/70; closest=Current-team VoRP.

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 31 | 14.0 | 8.0 | -3.7 | 0.67 | 0.79 |
| Middle VORP | 14 | 27.3 | 24.0 | -22.0 | 0.23 | 0.71 |
| Current-team VoRP | 31 | 13.8 | 7.0 | -6.1 | 0.59 | 0.78 |
| Corrected Safe | 31 | 22.9 | 23.0 | +15.7 | 0.30 | 0.83 |
| Corrected Weeks as Starter | 30 | 17.3 | 12.5 | +1.4 | 0.56 | 0.80 |

**All-bid-median sensitivity** (18 materially changed clusters; closest=Current-team VoRP):

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 36 | 12.6 | 9.0 | +3.5 | 0.74 | 0.86 |
| Middle VORP | 14 | 24.0 | 20.8 | -18.6 | 0.26 | 0.72 |
| Current-team VoRP | 36 | 12.1 | 8.3 | +1.4 | 0.68 | 0.86 |
| Corrected Safe | 36 | 25.1 | 25.5 | +21.1 | 0.24 | 0.87 |
| Corrected Weeks as Starter | 34 | 15.4 | 12.0 | +7.8 | 0.63 | 0.88 |

### W2

Canonical winning-bid clusters: 20; closest=Corrected Safe. Undefined strategy zeros are omitted strategy-by-strategy, so n is visible.

| Strategy | n | MAE | Median AE | Bias (intrinsic−winning) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 14 | 35.0 | 8.0 | -29.3 | 0.21 | 0.85 |
| Middle VORP | 4 | 110.3 | 97.0 | -108.8 | -1.28 | 0.63 |
| Current-team VoRP | 14 | 35.1 | 8.0 | -29.5 | 0.20 | 0.85 |
| Corrected Safe | 14 | 32.1 | 15.0 | -13.8 | 0.36 | 0.85 |
| Corrected Weeks as Starter | 13 | 34.9 | 10.0 | -29.5 | 0.24 | 0.87 |

Serious median clusters: 13/20; closest=Max VORP.

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 11 | 14.9 | 14.0 | -3.7 | 0.52 | 0.81 |
| Middle VORP | 4 | 34.3 | 36.8 | -24.5 | -0.74 | 0.63 |
| Current-team VoRP | 11 | 15.0 | 14.0 | -4.0 | 0.52 | 0.81 |
| Corrected Safe | 11 | 18.7 | 12.0 | +14.3 | 0.06 | 0.83 |
| Corrected Weeks as Starter | 10 | 15.4 | 12.3 | -0.5 | 0.47 | 0.80 |

**All-bid-median sensitivity** (5 materially changed clusters; closest=Corrected Weeks as Starter):

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 14 | 12.6 | 10.0 | +2.9 | 0.65 | 0.81 |
| Middle VORP | 4 | 33.4 | 35.0 | -23.6 | -0.65 | 0.63 |
| Current-team VoRP | 14 | 12.7 | 10.0 | +2.6 | 0.65 | 0.81 |
| Corrected Safe | 14 | 19.4 | 10.0 | +18.4 | 0.08 | 0.80 |
| Corrected Weeks as Starter | 13 | 12.5 | 12.5 | +4.7 | 0.63 | 0.84 |

### W3

Canonical winning-bid clusters: 25; closest=Corrected Safe. Undefined strategy zeros are omitted strategy-by-strategy, so n is visible.

| Strategy | n | MAE | Median AE | Bias (intrinsic−winning) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 11 | 37.5 | 21.0 | -35.3 | 0.28 | 0.91 |
| Middle VORP | 5 | 83.4 | 57.0 | -83.4 | -0.86 | 0.90 |
| Current-team VoRP | 11 | 41.8 | 21.0 | -39.6 | 0.12 | 0.91 |
| Corrected Safe | 11 | 31.6 | 13.0 | -18.5 | 0.44 | 0.91 |
| Corrected Weeks as Starter | 11 | 35.3 | 19.0 | -30.5 | 0.41 | 0.87 |

Serious median clusters: 15/25; closest=Current-team VoRP.

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 10 | 9.9 | 8.0 | +7.1 | 0.65 | 0.91 |
| Middle VORP | 5 | 10.0 | 8.5 | -3.0 | 0.64 | 1.00 |
| Current-team VoRP | 10 | 6.6 | 6.0 | +2.3 | 0.85 | 0.91 |
| Corrected Safe | 10 | 25.0 | 25.0 | +24.8 | -1.37 | 0.91 |
| Corrected Weeks as Starter | 10 | 20.1 | 18.5 | +12.5 | -0.50 | 0.88 |

**All-bid-median sensitivity** (7 materially changed clusters; closest=Current-team VoRP):

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 11 | 11.4 | 8.5 | +10.9 | 0.66 | 0.89 |
| Middle VORP | 5 | 8.3 | 8.5 | -1.1 | 0.72 | 0.90 |
| Current-team VoRP | 11 | 7.9 | 8.0 | +6.5 | 0.83 | 0.89 |
| Corrected Safe | 11 | 27.6 | 26.0 | +27.6 | -1.04 | 0.89 |
| Corrected Weeks as Starter | 11 | 17.8 | 10.0 | +15.6 | -0.14 | 0.84 |

### W4

Canonical winning-bid clusters: 25; closest=Corrected Safe. Undefined strategy zeros are omitted strategy-by-strategy, so n is visible.

| Strategy | n | MAE | Median AE | Bias (intrinsic−winning) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 11 | 49.0 | 33.0 | -46.6 | 0.25 | 0.90 |
| Middle VORP | 5 | 109.4 | 89.0 | -109.4 | -1.04 | 0.90 |
| Current-team VoRP | 11 | 51.2 | 34.0 | -48.8 | 0.13 | 0.89 |
| Corrected Safe | 11 | 39.1 | 19.0 | -25.6 | 0.42 | 0.93 |
| Corrected Weeks as Starter | 10 | 44.9 | 26.0 | -44.3 | 0.32 | 0.88 |

Serious median clusters: 13/25; closest=Corrected Weeks as Starter.

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 10 | 17.2 | 6.5 | -14.6 | 0.68 | 0.75 |
| Middle VORP | 5 | 39.0 | 27.0 | -39.0 | 0.20 | 1.00 |
| Current-team VoRP | 10 | 19.6 | 6.5 | -17.0 | 0.52 | 0.72 |
| Corrected Safe | 10 | 25.3 | 26.0 | +8.1 | 0.60 | 0.78 |
| Corrected Weeks as Starter | 10 | 16.3 | 9.0 | -7.9 | 0.72 | 0.77 |

**All-bid-median sensitivity** (6 materially changed clusters; closest=Max VORP):

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 11 | 13.6 | 9.0 | -3.0 | 0.77 | 0.91 |
| Middle VORP | 5 | 32.2 | 26.0 | -32.2 | 0.27 | 1.00 |
| Current-team VoRP | 11 | 15.4 | 8.0 | -5.2 | 0.64 | 0.90 |
| Corrected Safe | 11 | 30.0 | 27.0 | +18.0 | 0.53 | 0.93 |
| Corrected Weeks as Starter | 10 | 16.6 | 10.5 | +3.4 | 0.76 | 0.96 |

## Weekly and season multiplier summaries

### Season aggregate — winning

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 36/70 | 1.90 | 0.00 | 1.84 |
| Middle VORP | 14/70 | 4.20 | 3.65 | 3.69 |
| Current-team VoRP | 36/70 | 1.99 | 0.00 | 1.91 |
| Corrected Safe | 36/70 | 1.12 | 0.00 | 1.02 |
| Corrected Weeks as Starter | 34/70 | 2.58 | 0.00 | 1.75 |

### Season aggregate — serious-median

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 31/70 | 1.34 | 1.11 | 1.20 |
| Middle VORP | 14/70 | 1.91 | 1.65 | 1.67 |
| Current-team VoRP | 31/70 | 1.39 | 1.15 | 1.20 |
| Corrected Safe | 31/70 | 0.76 | 0.63 | 0.61 |
| Corrected Weeks as Starter | 30/70 | 2.14 | 1.26 | 0.90 |

### W2 — winning

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 14/20 | 1.88 | 0.00 | 1.74 |
| Middle VORP | 4/20 | 4.12 | 3.29 | 4.31 |
| Current-team VoRP | 14/20 | 1.89 | 0.00 | 1.74 |
| Corrected Safe | 14/20 | 1.05 | 0.00 | 0.79 |
| Corrected Weeks as Starter | 13/20 | 2.88 | 0.00 | 1.41 |

### W2 — serious-median

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 11/20 | 1.66 | 1.26 | 1.40 |
| Middle VORP | 4/20 | 1.76 | 1.46 | 2.14 |
| Current-team VoRP | 11/20 | 1.66 | 1.27 | 1.40 |
| Corrected Safe | 11/20 | 0.86 | 0.67 | 0.70 |
| Corrected Weeks as Starter | 10/20 | 2.98 | 1.48 | 1.16 |

### W3 — winning

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 11/25 | 1.68 | 0.00 | 1.67 |
| Middle VORP | 5/25 | 3.23 | 3.10 | 3.30 |
| Current-team VoRP | 11/25 | 1.86 | 0.00 | 1.81 |
| Corrected Safe | 11/25 | 1.14 | 0.00 | 1.07 |
| Corrected Weeks as Starter | 11/25 | 2.71 | 0.00 | 1.76 |

### W3 — serious-median

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 10/25 | 0.92 | 0.86 | 0.82 |
| Middle VORP | 5/25 | 1.28 | 1.23 | 1.18 |
| Current-team VoRP | 10/25 | 0.99 | 0.92 | 0.96 |
| Corrected Safe | 10/25 | 0.61 | 0.55 | 0.62 |
| Corrected Weeks as Starter | 10/25 | 1.90 | 1.13 | 0.78 |

### W4 — winning

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 11/25 | 2.14 | 1.89 | 2.47 |
| Middle VORP | 5/25 | 5.22 | 4.66 | 3.53 |
| Current-team VoRP | 11/25 | 2.25 | 1.95 | 2.47 |
| Corrected Safe | 11/25 | 1.18 | 0.98 | 1.03 |
| Corrected Weeks as Starter | 10/25 | 2.06 | 1.77 | 1.81 |

### W4 — serious-median

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 10/25 | 1.42 | 1.26 | 1.21 |
| Middle VORP | 5/25 | 2.67 | 2.41 | 2.01 |
| Current-team VoRP | 10/25 | 1.50 | 1.30 | 1.21 |
| Corrected Safe | 10/25 | 0.80 | 0.68 | 0.58 |
| Corrected Weeks as Starter | 10/25 | 1.54 | 1.21 | 0.99 |

## Prior-week-fitted held-out scale check

Each multiplier is fit **only** as the prior eligible week's median observed/intrinsic ratio, then applied without refitting to the next eligible week. It is never fit and scored on the same observations. Raw held-out R²* retains the same prediction-score meaning.

### Prior-week-fitted held-out scale — canonical winners

| Strategy | Fit→test week | Prior-week median multiplier | Test-week n | MAE | Median AE | Bias | Raw held-out R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 2→3 | 1.742 | 11 | 24.7 | 18.4 | -9.6 | 0.69 | 0.91 |
| Middle VORP | 2→3 | 4.313 | 5 | 60.1 | 11.1 | +55.7 | -0.50 | 0.90 |
| Current-team VoRP | 2→3 | 1.742 | 11 | 26.3 | 10.7 | -17.2 | 0.56 | 0.91 |
| Corrected Safe | 2→3 | 0.794 | 11 | 37.3 | 13.4 | -29.1 | 0.27 | 0.91 |
| Corrected Weeks as Starter | 2→3 | 1.414 | 11 | 28.9 | 12.2 | -14.2 | 0.64 | 0.87 |
| Max VORP | 3→4 | 1.667 | 11 | 32.5 | 23.0 | -24.5 | 0.69 | 0.90 |
| Middle VORP | 3→4 | 3.300 | 5 | 26.8 | 30.8 | -14.2 | 0.87 | 0.90 |
| Current-team VoRP | 3→4 | 1.808 | 11 | 33.4 | 19.8 | -23.7 | 0.62 | 0.89 |
| Corrected Safe | 3→4 | 1.067 | 11 | 37.7 | 17.3 | -22.0 | 0.46 | 0.93 |
| Corrected Weeks as Starter | 3→4 | 1.764 | 10 | 24.5 | 18.3 | -11.4 | 0.80 | 0.88 |

### Prior-week-fitted held-out scale — serious medians

| Strategy | Fit→test week | Prior-week median multiplier | Test-week n | MAE | Median AE | Bias | Raw held-out R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 2→3 | 1.400 | 10 | 22.7 | 18.6 | +22.2 | -1.20 | 0.91 |
| Middle VORP | 2→3 | 2.140 | 5 | 44.9 | 43.9 | +44.9 | -9.69 | 1.00 |
| Current-team VoRP | 2→3 | 1.400 | 10 | 15.9 | 13.8 | +15.5 | -0.02 | 0.91 |
| Corrected Safe | 2→3 | 0.698 | 10 | 10.4 | 7.9 | +8.0 | 0.51 | 0.91 |
| Corrected Weeks as Starter | 2→3 | 1.161 | 10 | 26.6 | 22.1 | +19.4 | -1.73 | 0.88 |
| Max VORP | 3→4 | 0.822 | 10 | 22.2 | 10.3 | -21.1 | 0.49 | 0.75 |
| Middle VORP | 3→4 | 1.185 | 5 | 31.4 | 24.5 | -31.4 | 0.47 | 1.00 |
| Current-team VoRP | 3→4 | 0.956 | 10 | 20.7 | 6.6 | -18.5 | 0.48 | 0.72 |
| Corrected Safe | 3→4 | 0.616 | 10 | 21.7 | 8.4 | -14.6 | 0.38 | 0.78 |
| Corrected Weeks as Starter | 3→4 | 0.783 | 10 | 18.2 | 3.3 | -17.3 | 0.54 | 0.77 |

## Owner-directed exclusion sensitivity

The underlying canonical evidence is retained. The primary view excludes only the deterministic anonymized marker **owner-directed-outlier-01**, established by private GET-only catalog match plus exact position/total fingerprints in both reconstructed snapshots map uniquely to one canonical completed W3 win at $234; no private name or identifier is stored or printed. Without owner-directed-outlier-01: n=41, closest=Current-team VoRP (Max VORP MAE 14.0; Middle VORP MAE 27.3; Current-team VoRP MAE 13.8; Corrected Safe MAE 22.9; Corrected Weeks as Starter MAE 17.3). With the marked target: n=42, closest=Current-team VoRP (Max VORP MAE 14.0; Middle VORP MAE 27.3; Current-team VoRP MAE 13.7; Corrected Safe MAE 22.2; Corrected Weeks as Starter MAE 17.4).

## Shape × scale interpretation

The five primary intrinsic strategies describe **target shape**—which players should cost relatively more—while the observed/intrinsic multipliers estimate a separate **market scale** for each week. The rank and error results can motivate a future model that combines strategy shape with a pooled week/market scale. They do **not** identify an individual manager style: 3 reconstructed weeks and sparse manager histories are insufficient for that claim.


## Executive result

Among 72 usable winning bids, **Legacy Aggressive** has the lowest in-sample MAE (22.0). After the predeclared token rule, **Legacy Aggressive** is lowest (34.0). Robust-filter leaders are ratio-gap flag removed: Legacy Aggressive; MAD flag removed: Legacy Aggressive; IQR flag removed: Corrected Safe (PR #13); the serious-bid leader is **not** stable across them. This is descriptive evidence from one 32-team league, 3 reconstructed decision weeks, not a universal strategy ranking. Do **not** change the production default from this study alone.

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

- Sleeper public API base: `https://api.sleeper.app/v1`; season 2026; transaction payload SHA-256 `1a83a3057100ac0af0e721f8073496e2a43f08972af412737ecdd187b2e93583`. The private league identifier is intentionally absent.
- Projection source: read-only Supabase project ref `xduqpomhjdlgmtmmkfed`, verified before every refresh. Refresh uses GET only. No credential, raw payload, player ID/name, manager ID/name, or league ID is stored.
- League settings observed at refresh: 32 starting teams, $500 initial FAAB, ppr, lineup `QB,RB,RB,WR,WR,TE,FLEX,K,DEF,BN,BN,BN,BN`. Sleeper provides no historical settings endpoint, so season stability is an explicit assumption, not silently inferred history.
- Active teams use the production progression estimator, not current rosters: W2=30, W3=28, W4=26. Every transaction week is translated to decision week as `transactionWeek + 1`.
- Fixture refresh (private environment only): `SUPABASE_PROJECT_REF=xduqpomhjdlgmtmmkfed SUPABASE_URL=https://xduqpomhjdlgmtmmkfed.supabase.co SUPABASE_READ_KEY=<private> LEAGUE_ID=<private> npm run analyze:bidding -- --refresh`. Offline report: `npm run analyze:bidding`. Focused tests: `npm test -- --run scripts/__tests__/bidding-strategy-analysis.test.ts`. Full verification: `npm test -- --run`, `npm run lint`, script-only `tsc --ignoreConfig --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --allowImportingTsExtensions --types node scripts/analyze-bidding-strategies.ts scripts/bidding-strategy-analysis.ts`, `git diff --check`, and changed-file secret/identifier scan.

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
| Legacy Safe | 355 | 38.1 | 31.9–43.8 | 33.0 | 14.8 | 0.69 | 16.3% | 0–105 |
| Legacy Aggressive | 355 | 44.4 | 34.1–53.1 | 35.0 | 34.2 | 0.72 | 27.0% | 0–184 |
| Legacy Weeks as Starter | 355 | 28.9 | 21.4–35.7 | 21.0 | 1.2 | 0.72 | 29.9% | 0–105 |

### Winning bids

| Strategy | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias (pred−actual) | Spearman ρ | Within max($5,20%) | Predicted range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 72 | 26.5 | 16.3–38.4 | 6.0 | -24.5 | 0.75 | 45.8% | 0–102 |
| Middle VORP | 72 | 32.2 | 20.9–45.1 | 10.0 | -32.1 | 0.65 | 43.1% | 0–85 |
| Current-team VoRP | 72 | 27.6 | 16.8–39.9 | 6.0 | -25.5 | 0.75 | 45.8% | 0–80 |
| Corrected Safe (PR #13) | 72 | 23.5 | 14.3–34.5 | 6.0 | -15.4 | 0.75 | 50.0% | 0–106 |
| Corrected Weeks as Starter (PR #13) | 72 | 24.7 | 14.9–36.3 | 5.0 | -22.8 | 0.75 | 52.8% | 0–106 |
| Legacy Safe | 72 | 29.9 | 20.7–40.1 | 12.5 | -7.8 | 0.67 | 33.3% | 0–105 |
| Legacy Aggressive | 72 | 22.0 | 14.7–30.5 | 6.5 | -5.4 | 0.69 | 48.6% | 0–184 |
| Legacy Weeks as Starter | 72 | 26.5 | 16.8–37.7 | 10.0 | -20.1 | 0.69 | 43.1% | 0–105 |

### Serious/non-token bids

| Strategy | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias (pred−actual) | Spearman ρ | Within max($5,20%) | Predicted range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 240 | 33.4 | 23.3–42.5 | 21.0 | -13.6 | 0.65 | 18.3% | 0–102 |
| Middle VORP | 240 | 38.7 | 27.1–48.8 | 25.5 | -29.8 | 0.65 | 11.7% | 0–85 |
| Current-team VoRP | 240 | 34.1 | 22.4–45.3 | 20.0 | -18.5 | 0.65 | 19.2% | 0–80 |
| Corrected Safe (PR #13) | 240 | 38.8 | 31.3–46.1 | 33.5 | 6.5 | 0.64 | 20.0% | 0–106 |
| Corrected Weeks as Starter (PR #13) | 240 | 35.8 | 26.3–43.9 | 24.5 | -5.3 | 0.64 | 21.3% | 0–106 |
| Legacy Safe | 240 | 41.9 | 35.4–48.6 | 38.0 | 7.5 | 0.57 | 15.8% | 0–105 |
| Legacy Aggressive | 240 | 52.4 | 41.2–62.1 | 40.5 | 37.4 | 0.59 | 19.6% | 0–184 |
| Legacy Weeks as Starter | 240 | 35.3 | 26.3–43.5 | 26.0 | -5.4 | 0.61 | 19.6% | 0–105 |

### Serious competitive clusters

| Strategy | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias (pred−actual) | Spearman ρ | Within max($5,20%) | Predicted range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 224 | 34.6 | 24.2–44.3 | 22.5 | -13.5 | 0.62 | 19.2% | 0–102 |
| Middle VORP | 224 | 39.9 | 28.4–50.9 | 26.0 | -30.5 | 0.63 | 12.5% | 0–85 |
| Current-team VoRP | 224 | 35.3 | 23.3–47.3 | 21.0 | -18.7 | 0.63 | 20.1% | 0–80 |
| Corrected Safe (PR #13) | 224 | 40.3 | 32.4–47.8 | 36.0 | 7.7 | 0.61 | 20.1% | 0–106 |
| Corrected Weeks as Starter (PR #13) | 224 | 37.0 | 27.3–45.7 | 28.5 | -4.4 | 0.61 | 21.9% | 0–106 |
| Legacy Safe | 224 | 43.4 | 36.4–50.5 | 39.0 | 8.2 | 0.55 | 15.2% | 11–105 |
| Legacy Aggressive | 224 | 54.6 | 43.1–65.7 | 45.0 | 40.7 | 0.57 | 19.6% | 2–184 |
| Legacy Weeks as Starter | 224 | 36.5 | 27.2–45.2 | 27.5 | -4.7 | 0.59 | 19.2% | 1–105 |

## Sensitivity of winning-bid MAE

| Sensitivity case | n wins | Max VORP MAE | Middle VORP MAE | Current-team VoRP MAE | Corrected Safe (PR #13) MAE | Corrected Weeks as Starter (PR #13) MAE | Legacy Safe MAE | Legacy Aggressive MAE | Legacy Weeks as Starter MAE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| All usable winning bids | 72 | 26.5 | 32.2 | 27.6 | 23.5 | 24.7 | 29.9 | 22.0 | 26.5 |
| Non-token winning bids | 42 | 44.1 | 54.4 | 45.9 | 38.1 | 41.3 | 43.2 | 34.0 | 43.1 |
| Non-token, ratio-gap flag removed | 41 | 40.0 | 50.0 | 41.8 | 34.2 | 36.9 | 40.1 | 30.7 | 39.4 |
| Non-token, MAD flag removed | 38 | 35.2 | 45.3 | 36.5 | 30.2 | 32.7 | 36.3 | 29.7 | 35.3 |
| Non-token, IQR flag removed | 38 | 35.1 | 45.0 | 36.4 | 30.0 | 32.4 | 37.0 | 30.4 | 35.7 |

95% intervals are deterministic 2000-replicate cluster bootstraps (seed 20260927); resampling the player/batch cluster keeps correlated win/loss bids together. They quantify sampling variation in this observed set, not projection-history error.

## Target/player price rank and range coverage

| Strategy | Spearman vs winning price | Observed winning range | Predicted range |
| --- | --- | --- | --- |
| Max VORP | 0.75 | 0–300 | 0–102 |
| Middle VORP | 0.65 | 0–300 | 0–85 |
| Current-team VoRP | 0.75 | 0–300 | 0–80 |
| Corrected Safe (PR #13) | 0.75 | 0–300 | 0–106 |
| Corrected Weeks as Starter (PR #13) | 0.75 | 0–300 | 0–106 |
| Legacy Safe | 0.67 | 0–300 | 0–105 |
| Legacy Aggressive | 0.69 | 0–300 | 0–184 |
| Legacy Weeks as Starter | 0.69 | 0–300 | 0–105 |

A serious-cluster prediction is “covered” when it falls inside that target's observed non-token bid range (minimum serious loss through winning bid).

| Strategy | Competitive clusters | Inside observed range | Coverage |
| --- | --- | --- | --- |
| Max VORP | 26 | 19 | 73.1% |
| Middle VORP | 26 | 12 | 46.2% |
| Current-team VoRP | 26 | 19 | 73.1% |
| Corrected Safe (PR #13) | 26 | 15 | 57.7% |
| Corrected Weeks as Starter (PR #13) | 26 | 17 | 65.4% |
| Legacy Safe | 26 | 15 | 57.7% |
| Legacy Aggressive | 26 | 14 | 53.8% |
| Legacy Weeks as Starter | 26 | 20 | 76.9% |

## Normalized winning-bid error

| Strategy | MAE / original FAAB | MAE of bid/pre-bid-FAAB ratio |
| --- | --- | --- |
| Max VORP | 5.3% | 5.9% |
| Middle VORP | 6.4% | 7.1% |
| Current-team VoRP | 5.5% | 6.1% |
| Corrected Safe (PR #13) | 4.7% | 5.1% |
| Corrected Weeks as Starter (PR #13) | 4.9% | 5.4% |
| Legacy Safe | 6.0% | 6.4% |
| Legacy Aggressive | 4.4% | 4.7% |
| Legacy Weeks as Starter | 5.3% | 5.8% |

Pre-bid normalization is shown only because the ledger denominator is positive; reconstruction confidence remains visible above. It does not reinterpret intrinsic strategy values as manager-specific willingness.

## Useful slices (winning bids)

| Dimension | Slice | n | Lowest MAE strategy (MAE) |
| --- | --- | --- | --- |
| decision week | W2 | 20 | Corrected Safe (PR #13) (27.0) |
| decision week | W3 | 27 | Legacy Aggressive (22.9) |
| decision week | W4 | 25 | Legacy Aggressive (13.7) |
| position | QB | 8 | Legacy Aggressive (31.4) |
| position | RB | 20 | Max VORP (33.6) |
| position | TE | 12 | Corrected Weeks as Starter (PR #13) (10.2) |
| position | WR | 32 | Legacy Aggressive (11.2) |
| Max-VORP target tier | bottom-quartile | 19 | Corrected Safe (PR #13) (7.0) |
| Max-VORP target tier | middle-half | 36 | Max VORP (15.0) |
| Max-VORP target tier | top-quartile | 17 | Legacy Aggressive (45.4) |
| cap state | below-90%-prebid | 72 | Legacy Aggressive (22.0) |

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
- Recommendation: keep production behavior unchanged. No strategy is a robust winner: **Legacy Aggressive** leads the serious-bid view, but another strategy leads at least one fixed outlier sensitivity. Collect exact Tuesday 8 PM captures and repeat across materially more weeks before drawing product conclusions.
