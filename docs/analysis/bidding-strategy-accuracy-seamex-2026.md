# SeaMex 2026 bidding-strategy accuracy analysis

Deterministic offline report generated from anonymized fixture version 1. Data are complete through **2026-09-25T23:00:08.539Z**; there is no wall-clock generation timestamp. Regenerate byte-for-byte with `npm run analyze:bidding`.

## Middle VORP candidate evaluation

**Candidate:** use one common replacement horizon for the entire league state: `targetTeams = max(4, ceil(teamsRemaining / 2))`. This gives 28→14, 27→14, and 5→4. Unlike Max VORP, it never chooses a different future stage per player. Unlike current-team VoRP, it prices scarcity at a deliberately forward-looking but shared stage. The 50% horizon is a hypothesis, not a fitted constant.

**Recommendation: retain analysis-only.** Middle VORP is conceptually cleaner than per-player maximization and materially different from current-team VoRP, but only W2 and W3 completed decision weeks are evaluable and both projection inputs are reconstructed. That cannot establish a new default. A preregistered W4+ sequence using exact pre-waiver captures would raise confidence if Middle preserves rank quality, has lower held-out MAE/bias after prior-only scaling, and remains stable across 33%/50%/67% horizons and outlier/all-bid filters; persistent underperformance or horizon instability would lower it.

### Latest reproducible SeaMex state

The latest available deterministic input is the privacy-safe reconstructed **W3** projection snapshot (content hash `0aea608679cb52d12b4bc95fb7f3966e33d2f61012e44a364230ad23aa01c1b9`, 1142 stored projection rows; 445 supported QB/RB/WR/TE players), with 28 teams, $500 common budget, and no roster/manager/league identifiers. Player labels are fixture aliases, not identities. It is the latest reproducible analysis state—not a claim that an exact W4 pre-waiver capture exists.

#### Player ordering (top 12)

- **Max VORP:** P1104 (RB1, $232), P0984 (TE1, $178), P1116 (WR1, $156), P1117 (WR2, $152), P1125 (RB2, $148), P0838 (RB3, $143), P0690 (QB1, $121), P0901 (WR3, $114), P0632 (RB4, $99), P1133 (WR4, $84), P1107 (RB5, $84), P0999 (RB6, $81)
- **Middle VORP:** P1104 (RB1, $123), P1116 (WR1, $108), P1117 (WR2, $106), P1125 (RB2, $99), P0838 (RB3, $98), P0901 (WR3, $95), P0632 (RB4, $85), P1133 (WR4, $84), P0993 (WR5, $78), P0904 (WR6, $77), P1107 (RB5, $76), P0984 (TE1, $75)
- **Current-team VoRP:** P1104 (RB1, $109), P1125 (RB2, $95), P0838 (RB3, $94), P1116 (WR1, $91), P1117 (WR2, $90), P0632 (RB4, $87), P0901 (WR3, $84), P1107 (RB5, $81), P0999 (RB6, $79), P0604 (RB7, $78), P1105 (RB8, $78), P1133 (WR4, $77)
- **Corrected Safe:** P1104 (RB1, $125), P1116 (WR1, $125), P1117 (WR2, $109), P1125 (RB2, $108), P0901 (WR3, $107), P0838 (RB3, $106), P1133 (WR4, $106), P0984 (TE1, $106), P0993 (WR5, $105), P0632 (RB4, $104), P0904 (WR6, $103), P1107 (RB5, $102)
- **Corrected Weeks as Starter:** P1104 (RB1, $125), P1116 (WR1, $125), P1117 (WR2, $109), P1125 (RB2, $108), P0901 (WR3, $107), P0838 (RB3, $106), P1133 (WR4, $106), P0984 (TE1, $106), P0993 (WR5, $105), P0632 (RB4, $104), P1107 (RB5, $102), P0904 (WR6, $96)
- **67% common horizon:** P1104 (RB1, $119), P1125 (RB2, $100), P1116 (WR1, $99), P0838 (RB3, $99), P1117 (WR2, $98), P0901 (WR3, $89), P0632 (RB4, $89), P1107 (RB5, $82), P1133 (WR4, $81), P0999 (RB6, $79), P0604 (RB7, $78), P1105 (RB8, $77)
- **33% common horizon:** P1104 (RB1, $136), P1116 (WR1, $112), P1117 (WR2, $110), P1125 (RB2, $105), P0838 (RB3, $103), P0901 (WR3, $97), P0632 (RB4, $88), P0984 (TE1, $85), P1133 (WR4, $83), P0690 (QB1, $77), P1107 (RB5, $76), P0993 (WR5, $75)

#### Dollar distributions and positive counts

| Method | n | Positive | Zero | Min | P25 | Median | Mean | P75 | Max | Total $ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 445 | 191 | 254 | 0 | 0.0 | 0.0 | 15.4 | 22.0 | 232 | 6843 |
| Middle VORP | 445 | 93 | 352 | 0 | 0.0 | 0.0 | 7.7 | 0.0 | 123 | 3412 |
| Current-team VoRP | 445 | 191 | 254 | 0 | 0.0 | 0.0 | 13.9 | 22.0 | 109 | 6196 |
| Corrected Safe | 445 | 192 | 253 | 0 | 0.0 | 0.0 | 22.9 | 44.0 | 125 | 10199 |
| Corrected Weeks as Starter | 445 | 183 | 262 | 0 | 0.0 | 0.0 | 16.2 | 20.0 | 125 | 7198 |
| 67% common horizon | 445 | 129 | 316 | 0 | 0.0 | 0.0 | 9.8 | 6.0 | 119 | 4383 |
| 33% common horizon | 445 | 65 | 380 | 0 | 0.0 | 0.0 | 6.3 | 0.0 | 136 | 2782 |

#### Positional positive-price cutoffs

| Method | Position | Positive count | Deepest positive position rank |
| --- | --- | --- | --- |
| Max VORP | QB | 27 | 27 |
| Max VORP | RB | 55 | 55 |
| Max VORP | WR | 80 | 80 |
| Max VORP | TE | 29 | 29 |
| Middle VORP | QB | 13 | 13 |
| Middle VORP | RB | 28 | 28 |
| Middle VORP | WR | 39 | 39 |
| Middle VORP | TE | 13 | 13 |
| Current-team VoRP | QB | 27 | 27 |
| Current-team VoRP | RB | 55 | 55 |
| Current-team VoRP | WR | 80 | 80 |
| Current-team VoRP | TE | 29 | 29 |
| Corrected Safe | QB | 27 | 27 |
| Corrected Safe | RB | 55 | 55 |
| Corrected Safe | WR | 81 | 81 |
| Corrected Safe | TE | 29 | 29 |
| Corrected Weeks as Starter | QB | 26 | 26 |
| Corrected Weeks as Starter | RB | 52 | 52 |
| Corrected Weeks as Starter | WR | 77 | 77 |
| Corrected Weeks as Starter | TE | 28 | 28 |
| 67% common horizon | QB | 18 | 18 |
| 67% common horizon | RB | 37 | 37 |
| 67% common horizon | WR | 54 | 54 |
| 67% common horizon | TE | 20 | 20 |
| 33% common horizon | QB | 9 | 9 |
| 33% common horizon | RB | 21 | 21 |
| 33% common horizon | WR | 26 | 26 |
| 33% common horizon | TE | 9 | 9 |

#### Rank correlations

| Pair | Spearman ρ |
| --- | --- |
| Middle VORP vs Max VORP | 0.780 |
| Middle VORP vs Current-team VoRP | 0.780 |
| Middle VORP vs Corrected Safe | 0.785 |
| Middle VORP vs Corrected Weeks as Starter | 0.796 |
| Middle VORP vs 67% common horizon | 0.880 |
| Middle VORP vs 33% common horizon | 0.861 |

#### Concrete Middle/Max/current-team divergences

| Privacy-safe player | Middle $ / rank | Max $ / rank | Max-selected stage | Current $ / rank | Why |
| --- | --- | --- | --- | --- | --- |
| P0749 (QB12) | $2 / #88 | $21 / #115 | 28 teams | $21 / #115 | Max selected its largest unrounded value at the 28-team reachable stage; Middle fixes one 14-team stage for every player. |
| P0659 (QB13) | $1 / #91 | $21 / #116 | 28 teams | $21 / #116 | Max selected its largest unrounded value at the 28-team reachable stage; Middle fixes one 14-team stage for every player. |
| P0600 (QB10) | $9 / #75 | $26 / #99 | 28 teams | $26 / #99 | Max selected its largest unrounded value at the 28-team reachable stage; Middle fixes one 14-team stage for every player. |
| P0636 (QB11) | $9 / #76 | $26 / #100 | 28 teams | $26 / #100 | Max selected its largest unrounded value at the 28-team reachable stage; Middle fixes one 14-team stage for every player. |
| P0820 (QB8) | $13 / #66 | $28 / #90 | 28 teams | $28 / #90 | Max selected its largest unrounded value at the 28-team reachable stage; Middle fixes one 14-team stage for every player. |
| P0900 (RB27) | $6 / #82 | $41 / #58 | 28 teams | $41 / #58 | Max selected its largest unrounded value at the 28-team reachable stage; Middle fixes one 14-team stage for every player. |
| P0122 (QB9) | $11 / #71 | $27 / #94 | 28 teams | $27 / #94 | Max selected its largest unrounded value at the 28-team reachable stage; Middle fixes one 14-team stage for every player. |
| P0283 (RB28) | $3 / #86 | $39 / #63 | 28 teams | $39 / #63 | Max selected its largest unrounded value at the 28-team reachable stage; Middle fixes one 14-team stage for every player. |
| P0620 (QB6) | $17 / #60 | $30 / #83 | 28 teams | $30 / #83 | Max selected its largest unrounded value at the 28-team reachable stage; Middle fixes one 14-team stage for every player. |
| P0859 (QB7) | $14 / #64 | $29 / #86 | 28 teams | $29 / #86 | Max selected its largest unrounded value at the 28-team reachable stage; Middle fixes one 14-team stage for every player. |

### Common-horizon sensitivity

| Horizon | Current-state target teams | Positive prices | Spearman vs primary 50% |
| --- | --- | --- | --- |
| 67% | 19 | 129 | 0.880 |
| 50% (primary, ceil) | 14 | 93 | 1.000 |
| 50% (floor) | 14 | 93 | 1.000 |
| 33% | 10 | 65 | 0.861 |

| Horizon | Historical canonical-win n | MAE | Bias | Spearman ρ |
| --- | --- | --- | --- | --- |
| 67% | 13 | 71.4 | -68.5 | 0.693 |
| 50% (primary, ceil) | 9 | 95.3 | -94.7 | 0.711 |
| 50% (floor) | 9 | 95.3 | -94.7 | 0.711 |
| 33% | 8 | 106.0 | -106.0 | 0.714 |

The observed W2/W3 team counts are even (30 and 28), so floor and ceil produce identical empirical bids and **do not change the conclusions**. The explicit odd-state unit case differs as intended (27→14 with ceil versus 27→13 with floor); future odd-team observations must keep this sensitivity live.

### Corrected non-VORP context

Corrected Safe and Weeks-as-Starter are reproduced in the offline layer from PR #13 implementation commit `7d86b2d`: direct slots are allocated first, then FLEX and SUPER_FLEX from remaining eligible players, and unsupported replacement depth maps to zero rather than an artificial premium. No PR #13 product code is merged or cherry-picked. Legacy curves remain separately labeled in the broader report so historical comparisons are not silently rewritten.


## Five-bullet answer: weekly price multipliers

- Scope: W2 and W3 have same-week reconstructed snapshots. The top three are unique canonical winners after owner-directed-outlier-01 (private GET-only catalog match plus exact position/total fingerprints in both reconstructed snapshots map uniquely to one canonical completed W3 win at $234; proof matches=1); the closest overall serious-median strategy is Current-team VoRP.
- W2 top-three winning-price arithmetic multipliers (observed/intrinsic): Max VORP 3.34× (3/3); Middle VORP 5.19× (3/3); Current-team VoRP 3.38× (3/3); Corrected Safe 2.30× (3/3); Corrected Weeks as Starter 2.84× (3/3).
- W3 top-three winning-price arithmetic multipliers (observed/intrinsic): Max VORP 2.35× (3/3); Middle VORP 3.00× (3/3); Current-team VoRP 3.00× (3/3); Corrected Safe 1.94× (3/3); Corrected Weeks as Starter 1.94× (3/3).
- W2 top-three serious-market-median arithmetic multipliers: Max VORP 1.40× (3/3); Middle VORP 2.21× (3/3); Current-team VoRP 1.42× (3/3); Corrected Safe 0.92× (3/3); Corrected Weeks as Starter 1.14× (3/3); closest across all W2 eligible market clusters: Max VORP.
- W3 top-three serious-market-median arithmetic multipliers: Max VORP 0.78× (3/3); Middle VORP 1.02× (3/3); Current-team VoRP 1.00× (3/3); Corrected Safe 0.65× (3/3); Corrected Weeks as Starter 0.65× (3/3); closest across all W3 eligible market clusters: Current-team VoRP.

## Weekly top-three and median-market appendix

This owner-directed view compares **Max VORP, Middle VORP, current-team VoRP, and the corrected PR #13 Safe and Weeks-as-Starter curves**. Legacy Aggressive is excluded because it is derived from legacy Safe. Only events with an exact or explicitly reconstructed same-decision-week snapshot join are eligible; W4 is absent because only a W3 fallback existed. “Serious” is strictly **bid > $5**. Ratios are **observed/intrinsic**, not intrinsic/observed. A zero intrinsic denominator is undefined, excluded from arithmetic/geometric/median aggregation, and counted in coverage. A winning or competing bid at its reconstructed pre-bid FAAB is marked as FAAB-censored because latent willingness may be higher.

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

## Analysis B: median serious market versus intrinsic strategy

Each player/week cluster selects its highest canonical completed winner, then includes only legitimate failed competing claims proven against that winner in the same processing batch. Metrics use one median observation per eligible player/week, avoiding duplicate weight from contingency/drop paths or a second clearing cycle. **Raw prediction R²*** is the standard predictive score against the observed-mean baseline, but it is **not the R² from a fitted regression**: strategy dollars are held fixed on the identity line rather than refit to bids. It may be negative when fixed predictions are worse than the mean-only baseline; that does not mean negative correlation. R² and Spearman are shown only when at least two non-constant observations make them meaningful.

### Overall

Canonical winning-bid clusters: 45; closest=Corrected Safe. Undefined strategy zeros are omitted strategy-by-strategy, so n is visible.

| Strategy | n | MAE | Median AE | Bias (intrinsic−winning) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 25 | 36.1 | 9.0 | -31.9 | 0.24 | 0.89 |
| Middle VORP | 9 | 95.3 | 75.0 | -94.7 | -1.08 | 0.71 |
| Current-team VoRP | 25 | 38.0 | 9.0 | -34.0 | 0.18 | 0.88 |
| Corrected Safe | 25 | 31.9 | 13.0 | -15.9 | 0.40 | 0.89 |
| Corrected Weeks as Starter | 24 | 35.1 | 16.0 | -30.0 | 0.32 | 0.88 |

Serious median clusters: 28/45; closest=Current-team VoRP.

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 21 | 12.5 | 8.0 | +1.5 | 0.56 | 0.79 |
| Middle VORP | 9 | 20.8 | 17.5 | -12.6 | -0.15 | 0.44 |
| Current-team VoRP | 21 | 11.0 | 7.0 | -1.0 | 0.63 | 0.78 |
| Corrected Safe | 21 | 21.7 | 21.5 | +19.3 | -0.42 | 0.82 |
| Corrected Weeks as Starter | 20 | 17.8 | 13.8 | +6.0 | 0.13 | 0.78 |

**All-bid-median sensitivity** (12 materially changed clusters; closest=Current-team VoRP):

| Strategy | n | MAE | Median AE | Bias (intrinsic−market) | Raw prediction R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 25 | 12.1 | 9.0 | +6.4 | 0.66 | 0.86 |
| Middle VORP | 9 | 19.4 | 18.0 | -11.1 | -0.02 | 0.60 |
| Current-team VoRP | 25 | 10.6 | 8.5 | +4.3 | 0.71 | 0.86 |
| Corrected Safe | 25 | 23.0 | 19.0 | +22.4 | -0.29 | 0.87 |
| Corrected Weeks as Starter | 24 | 14.9 | 12.3 | +9.7 | 0.37 | 0.85 |

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

## Weekly and season multiplier summaries

### Season aggregate — winning

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 25/45 | 1.79 | 0.00 | 1.67 |
| Middle VORP | 9/45 | 3.62 | 3.18 | 3.84 |
| Current-team VoRP | 25/45 | 1.88 | 0.00 | 1.81 |
| Corrected Safe | 25/45 | 1.09 | 0.00 | 1.00 |
| Corrected Weeks as Starter | 24/45 | 2.80 | 0.00 | 1.59 |

### Season aggregate — serious-median

| Strategy | Defined/total | Arithmetic mean × | Geometric mean × | Median × |
| --- | --- | --- | --- | --- |
| Max VORP | 21/45 | 1.31 | 1.05 | 1.13 |
| Middle VORP | 9/45 | 1.50 | 1.33 | 1.63 |
| Current-team VoRP | 21/45 | 1.34 | 1.09 | 1.13 |
| Corrected Safe | 21/45 | 0.74 | 0.61 | 0.63 |
| Corrected Weeks as Starter | 20/45 | 2.44 | 1.29 | 0.89 |

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

## Prior-week-fitted held-out scale check

The multiplier is fit **only** as the W2 median observed/intrinsic ratio, then applied without refitting to W3. It is never fit and scored on the same observations. Raw held-out R²* retains the same prediction-score meaning.

### Prior-week-fitted held-out scale — canonical winners

| Strategy | Fit→test week | W2 median multiplier | W3 n | MAE | Median AE | Bias | Raw held-out R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 2→3 | 1.742 | 11 | 24.7 | 18.4 | -9.6 | 0.69 | 0.91 |
| Middle VORP | 2→3 | 4.313 | 5 | 60.1 | 11.1 | +55.7 | -0.50 | 0.90 |
| Current-team VoRP | 2→3 | 1.742 | 11 | 26.3 | 10.7 | -17.2 | 0.56 | 0.91 |
| Corrected Safe | 2→3 | 0.794 | 11 | 37.3 | 13.4 | -29.1 | 0.27 | 0.91 |
| Corrected Weeks as Starter | 2→3 | 1.414 | 11 | 28.9 | 12.2 | -14.2 | 0.64 | 0.87 |

### Prior-week-fitted held-out scale — serious medians

| Strategy | Fit→test week | W2 median multiplier | W3 n | MAE | Median AE | Bias | Raw held-out R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 2→3 | 1.400 | 10 | 22.7 | 18.6 | +22.2 | -1.20 | 0.91 |
| Middle VORP | 2→3 | 2.140 | 5 | 44.9 | 43.9 | +44.9 | -9.69 | 1.00 |
| Current-team VoRP | 2→3 | 1.400 | 10 | 15.9 | 13.8 | +15.5 | -0.02 | 0.91 |
| Corrected Safe | 2→3 | 0.698 | 10 | 10.4 | 7.9 | +8.0 | 0.51 | 0.91 |
| Corrected Weeks as Starter | 2→3 | 1.161 | 10 | 26.6 | 22.1 | +19.4 | -1.73 | 0.88 |

## Owner-directed exclusion sensitivity

The underlying canonical evidence is retained. The primary view excludes only the deterministic anonymized marker **owner-directed-outlier-01**, established by private GET-only catalog match plus exact position/total fingerprints in both reconstructed snapshots map uniquely to one canonical completed W3 win at $234; no private name or identifier is stored or printed. Without owner-directed-outlier-01: n=28, closest=Current-team VoRP (Max VORP MAE 12.5; Middle VORP MAE 20.8; Current-team VoRP MAE 11.0; Corrected Safe MAE 21.7; Corrected Weeks as Starter MAE 17.8). With the marked target: n=29, closest=Current-team VoRP (Max VORP MAE 12.5; Middle VORP MAE 20.8; Current-team VoRP MAE 11.1; Corrected Safe MAE 20.8; Corrected Weeks as Starter MAE 17.9).

## Shape × scale interpretation

The five primary intrinsic strategies describe **target shape**—which players should cost relatively more—while the observed/intrinsic multipliers estimate a separate **market scale** for each week. The rank and error results can motivate a future model that combines strategy shape with a pooled week/market scale. They do **not** identify an individual manager style: two reconstructed weeks and sparse manager histories are insufficient for that claim.


## Executive result

Among 47 usable winning bids, **Corrected Safe (PR #13)** has the lowest in-sample MAE (25.7). After the predeclared token rule, **Legacy Aggressive** is lowest (38.5). Robust-filter leaders are ratio-gap flag removed: Corrected Safe (PR #13); MAD flag removed: Corrected Safe (PR #13); IQR flag removed: Corrected Safe (PR #13); the serious-bid leader is **not** stable across them. This is descriptive evidence from one 32-team league, 2 reconstructed decision weeks, not a universal strategy ranking. Do **not** change the production default from this study alone.

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

Production-registry values come from `buildWaiverBoard` using the shared implementation and each event's reconstructed context. Max VORP maximizes unrounded championship-calibrated VORP dollars across every reachable active-team stage. Current-team VoRP uses the event's active-team replacement stage. Middle VORP is analysis-only and uses the same VoRP calibration at one shared `max(4, ceil(teamsRemaining/2))` stage. Corrected Safe/Weeks reproduce PR #13 commit `7d86b2d` in the offline layer; legacy branch outputs remain separately labeled. Legacy Aggressive is `round(WeeksAsStarter × 2 × (1 − (decisionWeek−1)/16))`. Intrinsic suggestions are **not** capped by manager FAAB; pre-bid normalization is reported separately. No Weekly value is computed because no authoritative production or historical formula exists.

### All valid bids

| Strategy | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias (pred−actual) | Spearman ρ | Within max($5,20%) | Predicted range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 239 | 25.2 | 17.2–32.7 | 16.0 | -2.1 | 0.72 | 27.6% | 0–84 |
| Middle VORP | 239 | 25.5 | 15.5–34.4 | 12.0 | -17.5 | 0.69 | 36.0% | 0–84 |
| Current-team VoRP | 239 | 24.4 | 16.4–32.1 | 15.0 | -5.2 | 0.72 | 29.7% | 0–77 |
| Corrected Safe (PR #13) | 239 | 32.7 | 25.3–38.6 | 27.0 | 14.4 | 0.71 | 23.4% | 0–106 |
| Corrected Weeks as Starter (PR #13) | 239 | 27.6 | 18.9–35.1 | 17.0 | 2.2 | 0.71 | 29.7% | 0–106 |
| Legacy Safe | 239 | 39.2 | 32.8–44.2 | 39.0 | 18.6 | 0.56 | 16.7% | 0–105 |
| Legacy Aggressive | 239 | 48.3 | 35.6–59.6 | 38.0 | 37.8 | 0.60 | 19.7% | 0–184 |
| Legacy Weeks as Starter | 239 | 29.3 | 21.9–35.5 | 23.0 | 4.1 | 0.61 | 23.0% | 0–105 |

### Winning bids

| Strategy | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias (pred−actual) | Spearman ρ | Within max($5,20%) | Predicted range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 47 | 28.0 | 15.2–44.5 | 7.0 | -25.4 | 0.71 | 42.6% | 0–84 |
| Middle VORP | 47 | 33.9 | 19.8–52.0 | 10.0 | -33.8 | 0.62 | 40.4% | 0–84 |
| Current-team VoRP | 47 | 29.1 | 15.8–45.6 | 7.0 | -26.5 | 0.71 | 42.6% | 0–77 |
| Corrected Safe (PR #13) | 47 | 25.7 | 14.4–40.5 | 8.0 | -16.4 | 0.71 | 46.8% | 0–106 |
| Corrected Weeks as Starter (PR #13) | 47 | 27.0 | 14.4–43.1 | 10.0 | -24.3 | 0.70 | 48.9% | 0–106 |
| Legacy Safe | 47 | 32.9 | 21.4–46.0 | 11.0 | -9.1 | 0.61 | 36.2% | 0–105 |
| Legacy Aggressive | 47 | 26.4 | 17.2–37.6 | 11.0 | -5.6 | 0.62 | 40.4% | 0–184 |
| Legacy Weeks as Starter | 47 | 29.4 | 17.4–44.1 | 11.0 | -21.5 | 0.62 | 34.0% | 0–105 |

### Serious/non-token bids

| Strategy | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias (pred−actual) | Spearman ρ | Within max($5,20%) | Predicted range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 165 | 31.0 | 20.9–39.5 | 19.0 | -8.3 | 0.57 | 18.2% | 0–84 |
| Middle VORP | 165 | 35.3 | 24.6–44.6 | 23.0 | -26.0 | 0.56 | 10.9% | 0–84 |
| Current-team VoRP | 165 | 30.0 | 19.8–38.9 | 17.0 | -12.6 | 0.57 | 21.2% | 0–77 |
| Corrected Safe (PR #13) | 165 | 36.9 | 29.4–43.3 | 34.0 | 10.8 | 0.56 | 20.0% | 0–106 |
| Corrected Weeks as Starter (PR #13) | 165 | 34.6 | 25.3–42.3 | 24.0 | -1.7 | 0.56 | 18.2% | 0–106 |
| Legacy Safe | 165 | 41.0 | 34.4–46.8 | 38.0 | 11.2 | 0.42 | 15.2% | 0–105 |
| Legacy Aggressive | 165 | 54.3 | 39.0–67.0 | 38.0 | 39.3 | 0.48 | 15.2% | 0–184 |
| Legacy Weeks as Starter | 165 | 34.0 | 24.9–41.4 | 25.0 | -2.4 | 0.49 | 16.4% | 0–105 |

### Serious competitive clusters

| Strategy | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias (pred−actual) | Spearman ρ | Within max($5,20%) | Predicted range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max VORP | 155 | 31.7 | 21.5–40.5 | 21.0 | -7.5 | 0.55 | 19.4% | 0–84 |
| Middle VORP | 155 | 36.2 | 25.4–45.6 | 23.0 | -26.2 | 0.54 | 11.6% | 0–84 |
| Current-team VoRP | 155 | 30.6 | 20.3–39.9 | 18.0 | -12.1 | 0.55 | 22.6% | 0–77 |
| Corrected Safe (PR #13) | 155 | 38.2 | 30.6–44.5 | 35.0 | 12.6 | 0.55 | 19.4% | 0–106 |
| Corrected Weeks as Starter (PR #13) | 155 | 35.5 | 26.3–43.5 | 27.0 | -0.4 | 0.54 | 19.4% | 0–106 |
| Legacy Safe | 155 | 42.3 | 35.9–48.1 | 39.0 | 12.6 | 0.40 | 14.2% | 11–105 |
| Legacy Aggressive | 155 | 56.4 | 41.2–71.4 | 40.0 | 42.9 | 0.46 | 15.5% | 2–184 |
| Legacy Weeks as Starter | 155 | 34.7 | 25.8–42.3 | 26.0 | -1.3 | 0.46 | 16.8% | 1–105 |

## Sensitivity of winning-bid MAE

| Sensitivity case | n wins | Max VORP MAE | Middle VORP MAE | Current-team VoRP MAE | Corrected Safe (PR #13) MAE | Corrected Weeks as Starter (PR #13) MAE | Legacy Safe MAE | Legacy Aggressive MAE | Legacy Weeks as Starter MAE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| All usable winning bids | 47 | 28.0 | 33.9 | 29.1 | 25.7 | 27.0 | 32.9 | 26.4 | 29.4 |
| Non-token winning bids | 29 | 44.0 | 54.4 | 45.7 | 39.0 | 43.0 | 45.5 | 38.5 | 45.2 |
| Non-token, ratio-gap flag removed | 28 | 38.0 | 48.0 | 39.7 | 33.3 | 36.6 | 41.1 | 33.8 | 39.8 |
| Non-token, MAD flag removed | 26 | 30.6 | 40.8 | 31.6 | 26.9 | 30.5 | 35.2 | 32.6 | 33.7 |
| Non-token, IQR flag removed | 25 | 30.2 | 40.1 | 31.3 | 26.8 | 29.7 | 36.4 | 33.8 | 34.2 |

95% intervals are deterministic 2000-replicate cluster bootstraps (seed 20260927); resampling the player/batch cluster keeps correlated win/loss bids together. They quantify sampling variation in this observed set, not projection-history error.

## Target/player price rank and range coverage

| Strategy | Spearman vs winning price | Observed winning range | Predicted range |
| --- | --- | --- | --- |
| Max VORP | 0.71 | 0–285 | 0–84 |
| Middle VORP | 0.62 | 0–285 | 0–84 |
| Current-team VoRP | 0.71 | 0–285 | 0–77 |
| Corrected Safe (PR #13) | 0.71 | 0–285 | 0–106 |
| Corrected Weeks as Starter (PR #13) | 0.70 | 0–285 | 0–106 |
| Legacy Safe | 0.61 | 0–285 | 0–105 |
| Legacy Aggressive | 0.62 | 0–285 | 0–184 |
| Legacy Weeks as Starter | 0.62 | 0–285 | 0–105 |

A serious-cluster prediction is “covered” when it falls inside that target's observed non-token bid range (minimum serious loss through winning bid).

| Strategy | Competitive clusters | Inside observed range | Coverage |
| --- | --- | --- | --- |
| Max VORP | 19 | 13 | 68.4% |
| Middle VORP | 19 | 8 | 42.1% |
| Current-team VoRP | 19 | 13 | 68.4% |
| Corrected Safe (PR #13) | 19 | 10 | 52.6% |
| Corrected Weeks as Starter (PR #13) | 19 | 11 | 57.9% |
| Legacy Safe | 19 | 9 | 47.4% |
| Legacy Aggressive | 19 | 8 | 42.1% |
| Legacy Weeks as Starter | 19 | 13 | 68.4% |

## Normalized winning-bid error

| Strategy | MAE / original FAAB | MAE of bid/pre-bid-FAAB ratio |
| --- | --- | --- |
| Max VORP | 5.6% | 6.0% |
| Middle VORP | 6.8% | 7.2% |
| Current-team VoRP | 5.8% | 6.2% |
| Corrected Safe (PR #13) | 5.1% | 5.5% |
| Corrected Weeks as Starter (PR #13) | 5.4% | 5.8% |
| Legacy Safe | 6.6% | 6.9% |
| Legacy Aggressive | 5.3% | 5.6% |
| Legacy Weeks as Starter | 5.9% | 6.3% |

Pre-bid normalization is shown only because the ledger denominator is positive; reconstruction confidence remains visible above. It does not reinterpret intrinsic strategy values as manager-specific willingness.

## Useful slices (winning bids)

| Dimension | Slice | n | Lowest MAE strategy (MAE) |
| --- | --- | --- | --- |
| decision week | W2 | 20 | Corrected Safe (PR #13) (27.0) |
| decision week | W3 | 27 | Legacy Aggressive (22.9) |
| position | QB | 6 | Legacy Aggressive (38.2) |
| position | RB | 13 | Corrected Safe (PR #13) (47.8) |
| position | TE | 8 | Corrected Weeks as Starter (PR #13) (10.1) |
| position | WR | 20 | Legacy Aggressive (8.0) |
| Max-VORP target tier | bottom-quartile | 12 | Legacy Aggressive (9.4) |
| Max-VORP target tier | middle-half | 24 | Corrected Safe (PR #13) (17.9) |
| Max-VORP target tier | top-quartile | 11 | Legacy Aggressive (48.1) |
| cap state | below-90%-prebid | 47 | Corrected Safe (PR #13) (25.7) |

Slices are descriptive and often tiny. Player tier is a deterministic within-decision-week quartile of target Max-VORP value; cap state means actual bid ≥90% of reconstructed pre-bid FAAB.

## Manager-adjusted forecasts (strict walk-forward)

For each batch, the production Max-VORP manager profile is fit only from that anonymized manager's earlier processed batches with usable historical baselines; same-batch and future claims are excluded. The prediction is capped at reconstructed pre-bid FAAB and is analyzed separately from intrinsic strategies. Forecastable=133; omitted for insufficient prior-only evidence=106.

| Forecast subset | n | MAE | 95% cluster-bootstrap MAE CI | Median AE | Bias | Spearman ρ | Within max($5,20%) | Actual range | Forecast range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| All forecastable bids | 133 | 28.0 | 17.4–36.5 | 18.0 | 12.1 | 0.67 | 31.6% | 0–234 | 0–220 |
| Forecastable wins | 27 | 22.9 | 9.0–40.6 | 6.0 | -19.9 | 0.76 | 51.9% | 0–234 | 0–119 |

Because every underlying historical projection is reconstructed, these forecasts are exploratory, not historically exact. Missing forecasts are explicit prior-evidence exclusions, not zero predictions.

## Validation, limitations, and recommendation

- Leave-week-out fitting is not statistically supported: only 2 usable decision weeks (W2, W3) exist and all are reconstructed. The compared intrinsic formulas have no fitted parameters here. Manager forecasts therefore use strict chronological walk-forward validation instead.
- Sleeper's transaction API reveals failed private amounts only for returned failed records. The classifier retains only failures proven by a different same-player winner in the identical processing batch; it makes no claim about unsupported or absent private bids.
- Reconstructed snapshots were captured after their canonical cutoffs. Historical player ranks and values may differ from what managers saw. No current projection is substituted for an absent decision week.
- Historical roster ownership is not required by these formulas for a known claimed target, but league settings are only observed current-season state. Active-team counts are formula-derived progression estimates.
- One league, early season, correlated bids, and small slices mean strategy ordering can change with one extreme target. Bootstrap intervals do not repair systematic snapshot error.
- Recommendation: keep production behavior unchanged. No strategy is a robust winner: **Legacy Aggressive** leads the serious-bid view, but another strategy leads at least one fixed outlier sensitivity. Collect exact Tuesday 8 PM captures and repeat across materially more weeks before drawing product conclusions.
