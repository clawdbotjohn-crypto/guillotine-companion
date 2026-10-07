# Nine answers at a glance

1. **Predicted-bid accuracy for top versus middle bidders/players — Supported.** In the App W5 / decision W4 top-three target slice, top-five predicted bidders were not more accurate: claim-only MAE was $78.2 versus $45.5 for the deterministic middle five. _Key n: 30 direct rows; 11/11 scored claims._
2. **What Likely/Possible/Unlikely predicts and whether narrower bands help — Directional.** Likely/Possible/Unlikely was ordered for any canonical claim, but ranking managers only by predicted dollars did not improve discrimination: the exact top 25% claimed less often than the bottom 25%. _Key n: 242 opportunities; any-claim rates 47.7% / 31.5% / 21.7%._
3. **Bidding after a prior expensive win — Directional.** The direct reconstructed slice is descriptive and mixed; it does not support a causal claim that an expensive win suppresses the next auction. _Key n: 5 reconstructed ≥$90 anchor wins._
4. **Aggressive versus actual winner/minimum by price tier — Directional.** Aggressive was closest in the low tier, but the winner/Aggressive ratio changed sharply by tier; it is not one stable market multiplier. _Key n: 10 exact App W5 / decision W4 targets $10+; cumulative reconstructed shown separately._
5. **Whether a nonlinear/tier-aware market-price curve fits better — Not enough evidence.** Early exact sequencing exists but is still insufficient to validate a nonlinear, power-law, piecewise, or liquidity-aware curve. _Key n: 1 reconstructed-prior → exact-later score; 0 exact-prior → exact-later pairs._
6. **Weekly #1–#5 price ladder and player-rank relationship — Directional.** The top-five price ladder is visible, but a rank-to-price relationship is not yet comparable across weeks because exact auction-time player rank and liquidity are incomplete. _Key n: 4 distinct auctions: 2 reconstructed + 2 exact._
7. **Claims per manager — Supported.** 23 same-manager alternatives sit on top of 84 canonical manager-target pairs; raw claim count therefore overstates independent bidding intent. _Key n: 107 raw claims; 84 unique manager-target pairs._
8. **Positional need versus participation/amount — Not enough evidence.** Positional need cannot be tested honestly from the retained evidence, including the requested Week 5 WR/QB slice. _Key n: 0 time-aligned privacy-safe need snapshots._
9. **Whether prior-week top winners/bidders spend less next week — Directional.** The linked canonical slice leans toward lower next-week winning spend, but repeated managers, zero-win weeks, and reconstructed prior history prevent a behavioral conclusion. _Key n: 7/9 linked top-winner follow-ups had lower next-week winning spend; decision W5 follow-up evidence is exact._

## 1. Predicted-bid accuracy for top versus middle bidders/players

**Supported — 30 direct rows; 11/11 scored claims**

### Direct answer
In the App W5 / decision W4 top-three target slice, top-five predicted bidders were not more accurate: claim-only MAE was $78.2 versus $45.5 for the deterministic middle five.

### Key evidence / n
The top-three targets were frozen pre-auction by Max VORP descending (102, 69, 50; alias tie-break). Errors exist only for explicit claims; non-bids remain missing, not $0.

### Practical implication
Use the ranking as a conversation starter, not proof that the highest projected manager will set the price. Keep feasible/capped values visible before judging willingness.

### Unknowns / next exact data
Repeat this exact 30-row slice weekly. Retain median/high prediction bands prospectively; the current exact audit only retained source-supported top-credible and top-all bands.

| Target | Cohort | Manager | Likelihood | Predicted | Pre-FAAB | Feasible | Actual | Status/provenance | Error | Censoring |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Target 01 | Top five | Manager 12 | Unlikely | $265 | $265 | $265 | $154 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | +$111 signed / $111 absolute | No |
| Target 01 | Top five | Manager 24 | Possible | $215 | $293 | $215 | $93 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | +$122 signed / $122 absolute | No |
| Target 01 | Top five | Manager 01 | Unlikely | $212 | $433 | $212 | $233 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | $-21 signed / $21 absolute | No |
| Target 01 | Top five | Manager 21 | Possible | $173 | $408 | $173 | $117 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | +$56 signed / $56 absolute | No |
| Target 01 | Top five | Manager 07 | Possible | $172 | $489 | $172 | $300 | complete; winner; raw=1; alternatives=0; roster-full=0 | $-128 signed / $128 absolute | No |
| Target 01 | Middle five | Manager 17 | Likely | $158 | $494 | $158 | $201 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | $-43 signed / $43 absolute | No |
| Target 01 | Middle five | Manager 06 | Possible | $157 | $420 | $157 | Explicit non-bid (not $0) | explicit non-bid; non-bid; raw=0; alternatives=0; roster-full=0 | Not scored | No |
| Target 01 | Middle five | Manager 03 | Possible | $154 | $452 | $154 | $162 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | $-8 signed / $8 absolute | No |
| Target 01 | Middle five | Manager 08 | Unlikely | $151 | $393 | $151 | $243 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | $-92 signed / $92 absolute | No |
| Target 01 | Middle five | Manager 22 | Possible | $132 | $373 | $132 | $177 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | $-45 signed / $45 absolute | No |
| Target 02 | Top five | Manager 12 | Unlikely | $265 | $265 | $265 | Explicit non-bid (not $0) | explicit non-bid; non-bid; raw=0; alternatives=0; roster-full=0 | Not scored | No |
| Target 02 | Top five | Manager 11 | Likely | $165 | $165 | $165 | Explicit non-bid (not $0) | explicit non-bid; non-bid; raw=0; alternatives=0; roster-full=0 | Not scored | No |
| Target 02 | Top five | Manager 24 | Possible | $145 | $293 | $145 | $33 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | +$112 signed / $112 absolute | No |
| Target 02 | Top five | Manager 01 | Unlikely | $144 | $433 | $144 | $11 | failed; canonical_failed_competitor; raw=2; alternatives=1; roster-full=0 | +$133 signed / $133 absolute | No |
| Target 02 | Top five | Manager 21 | Possible | $117 | $408 | $117 | $43 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | +$74 signed / $74 absolute | No |
| Target 02 | Middle five | Manager 17 | Likely | $107 | $494 | $107 | $59 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | +$48 signed / $48 absolute | No |
| Target 02 | Middle five | Manager 06 | Possible | $106 | $420 | $106 | Explicit non-bid (not $0) | explicit non-bid; non-bid; raw=0; alternatives=0; roster-full=0 | Not scored | No |
| Target 02 | Middle five | Manager 03 | Possible | $104 | $452 | $104 | $2 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | +$102 signed / $102 absolute | No |
| Target 02 | Middle five | Manager 08 | Unlikely | $102 | $393 | $102 | $128 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | $-26 signed / $26 absolute | No |
| Target 02 | Middle five | Manager 22 | Possible | $89 | $373 | $89 | $48 | failed; canonical_failed_competitor; raw=3; alternatives=2; roster-full=0 | +$41 signed / $41 absolute | No |
| Target 03 | Top five | Manager 12 | Unlikely | $205 | $265 | $205 | Explicit non-bid (not $0) | explicit non-bid; non-bid; raw=0; alternatives=0; roster-full=0 | Not scored | No |
| Target 03 | Top five | Manager 11 | Likely | $144 | $165 | $144 | Explicit non-bid (not $0) | explicit non-bid; non-bid; raw=0; alternatives=0; roster-full=0 | Not scored | No |
| Target 03 | Top five | Manager 24 | Possible | $105 | $293 | $105 | $52 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | +$53 signed / $53 absolute | No |
| Target 03 | Top five | Manager 01 | Unlikely | $104 | $433 | $104 | $66 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | +$38 signed / $38 absolute | No |
| Target 03 | Top five | Manager 21 | Possible | $85 | $408 | $85 | $73 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | +$12 signed / $12 absolute | No |
| Target 03 | Middle five | Manager 06 | Possible | $77 | $420 | $77 | Explicit non-bid (not $0) | explicit non-bid; non-bid; raw=0; alternatives=0; roster-full=0 | Not scored | No |
| Target 03 | Middle five | Manager 17 | Likely | $77 | $494 | $77 | $39 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | +$38 signed / $38 absolute | No |
| Target 03 | Middle five | Manager 03 | Possible | $75 | $452 | $75 | $72 | failed; canonical_failed_competitor; raw=1; alternatives=0; roster-full=0 | +$3 signed / $3 absolute | No |
| Target 03 | Middle five | Manager 08 | Unlikely | $74 | $393 | $74 | $128 | complete; winner; raw=1; alternatives=0; roster-full=0 | $-54 signed / $54 absolute | No |
| Target 03 | Middle five | Manager 13 | Unlikely | $71 | $71 | $71 | Explicit non-bid (not $0) | explicit non-bid; non-bid; raw=0; alternatives=0; roster-full=0 | Not scored | No |

## 2. What Likely/Possible/Unlikely predicts and whether narrower bands help

**Directional — 242 opportunities; any-claim rates 47.7% / 31.5% / 21.7%**

### Direct answer
Likely/Possible/Unlikely was ordered for any canonical claim, but ranking managers only by predicted dollars did not improve discrimination: the exact top 25% claimed less often than the bottom 25%.

### Key evidence / n
Current exact evidence has 65 Likely, 108 Possible, and 69 Unlikely opportunities. Top/bottom 25% and 10% are shown for every preregistered threshold outcome; they are descriptive, not selected-and-scored cutoffs.

### Practical implication
Keep the three labels for coarse participation likelihood. Treat each row as a budget opportunity: available FAAB limits capacity, while a non-claim does not identify whether budget, roster capacity, or preference caused the outcome.

### Unknowns / next exact data
Pre-register cutoffs, probability calibration, and an untouched later-week score set. Report both the all-opportunity view and a declared budget-feasible/censoring sensitivity using exact canonical status and pre-waiver FAAB.

| Band | n | Claim | Positive | ≥Max | ≥Safe | ≥median | ≥minimum | Heavy | Top quartile |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Likely | 65 | 31 (47.7%) | 29 | 14 | 7 | 15 | 6 | 11 | 9 |
| Possible | 108 | 34 (31.5%) | 33 | 24 | 14 | 20 | 4 | 22 | 10 |
| Unlikely | 69 | 15 (21.7%) | 14 | 11 | 8 | 9 | 1 | 10 | 8 |
| Top 25% | 66 | 17 (25.8%) | 17 | 10 | 6 | 8 | 2 | 10 | 4 |
| Bottom 25% | 66 | 24 (36.4%) | 22 | 12 | 6 | 12 | 3 | 12 | 8 |
| Top 10% | 33 | 6 (18.2%) | 6 | 4 | 2 | 2 | 0 | 4 | 1 |
| Bottom 10% | 33 | 8 (24.2%) | 8 | 6 | 3 | 6 | 2 | 5 | 5 |

**Opportunity/censoring boundary:** denominators are manager-target opportunities. Available FAAB limits capacity, while a non-claim does not identify budget, roster capacity, or preference; this is not a budget-feasible-only calibration.

## 3. Bidding after a prior expensive win

**Directional — 5 reconstructed ≥$90 anchor wins**

### Direct answer
The direct reconstructed slice is descriptive and mixed; it does not support a causal claim that an expensive win suppresses the next auction.

### Key evidence / n
Managers winning for at least $90 in reconstructed Weeks 2–3 are followed individually into the next available week with raw/canonical claims, serious/heavy bids, wins, spend, normalization, same-position behavior, and censoring.

### Practical implication
Treat remaining budget as capacity and prior spend as context, not a manager-style coefficient.

### Unknowns / next exact data
Link at least two more exact pre/post-waiver weeks with starting and pre-bid FAAB, roster state, contingencies, and same-position acquisition history.

| Manager | Anchor | Follow week | Raw / canonical | Serious / heavy | Wins / spend / max | Bid volume / starting; mean bid / pre-bid | Same-position | Budget censoring | Latest-week behavior | Provenance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| History manager 02 | W2 win $99 | W3 | 8 / 8 | 8 / 2 | 3 / $99 / $73 | 53.0% / 8.4% | 3 | No observed heavy-threshold censoring | W5: 2 raw / 1 canonical; 1 serious; 1 heavy; 0 wins; $0 spend; 10.4% bid volume / starting FAAB; 23.7% mean bid / pre-bid FAAB; 0 same-position | Anchor Reconstructed; follow Reconstructed; latest activity W5 Exact |
| History manager 14 | W3 win $234 | No observed follow week | 0 / 0 | 0 / 0 | 0 / $0 / — | 0.0% / — | 0 | No observed heavy-threshold censoring | W5: 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position | Anchor Reconstructed; follow Reconstructed; latest activity W5 Exact |
| History manager 07 | W3 win $231 | No observed follow week | 0 / 0 | 0 / 0 | 0 / $0 / — | 0.0% / — | 0 | No observed heavy-threshold censoring | W5: 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position | Anchor Reconstructed; follow Reconstructed; latest activity W5 Exact |
| History manager 07 | W3 win $187 | No observed follow week | 0 / 0 | 0 / 0 | 0 / $0 / — | 0.0% / — | 0 | No observed heavy-threshold censoring | W5: 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position | Anchor Reconstructed; follow Reconstructed; latest activity W5 Exact |
| History manager 16 | W3 win $103 | No observed follow week | 0 / 0 | 0 / 0 | 0 / $0 / — | 0.0% / — | 0 | No observed heavy-threshold censoring | W5: 2 raw / 2 canonical; 1 serious; 0 heavy; 0 wins; $0 spend; 7.4% bid volume / starting FAAB; 14.3% mean bid / pre-bid FAAB; 0 same-position | Anchor Reconstructed; follow Reconstructed; latest activity W5 Exact |

## 4. Aggressive versus actual winner/minimum by price tier

**Directional — 10 exact App W5 / decision W4 targets $10+; cumulative reconstructed shown separately**

### Direct answer
Aggressive was closest in the low tier, but the winner/Aggressive ratio changed sharply by tier; it is not one stable market multiplier.

### Key evidence / n
Fixed tier boundaries are high ≥$80, mid $25–$79, and low $10–$24. Weekly exact and cumulative reconstructed rows are separate views; the exact auction replaces the same decision-week reconstructed ladder row and is never pooled with it. Minimum-to-guarantee and derived runner-up-proxy MAE are both shown with their own n.

### Practical implication
Keep Aggressive labeled as an intrinsic scenario/threshold, not a calibrated winning-price forecast.

### Unknowns / next exact data
Score the same fixed tiers on later exact weeks. Keep privacy-safe owner-directed and preregistered robust (ratio-gap/MAD/IQR) sensitivities explicit; never delete raw rows. The exact audit did not retain an independently identified runner-up, so that view is only observed minimum minus $1.

**Do not pool these views:** reconstructed and exact views remain separate. Runner-up is only a derived observed-minimum-minus-$1 sensitivity.

| Scope | Tier | Boundary | winner n | minimum / runner-up n | Median ratio | Q1–Q3 | Winner MAE | Minimum MAE | Runner-up-proxy MAE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Exact app W5 (Sleeper decision W4) | High | winner ≥ $80 | 3 | 3 / 3 | 1.26 | 1.17–1.51 | $58.7 | $32.0 | $31.7 |
| Reconstructed cumulative W2–W4 | High | winner ≥ $80 | 3 | 3 / 3 | 2.89 | 2.04–4.33 | $125.0 | $73.7 | $74.0 |
| Canonical exact decision W5 | High | winner ≥ $80 | 1 | 1 / 1 | 1.67 | 1.67–1.67 | $36.0 | $28.0 | $27.0 |
| Exact app W5 (Sleeper decision W4) | Mid | $25–$79 | 4 | 4 / 4 | 1.78 | 1.09–5.54 | $21.0 | $12.5 | $13.0 |
| Reconstructed cumulative W2–W4 | Mid | $25–$79 | 4 | 4 / 4 | 4.56 | 0.75–9.69 | $25.8 | $21.5 | $21.5 |
| Canonical exact decision W5 | Mid | $25–$79 | 0 | 0 / 0 | — | —–— | — | — | — |
| Exact app W5 (Sleeper decision W4) | Low | $10–$24 | 3 | 3 / 3 | 0.69 | 0.60–0.96 | $8.0 | $17.3 | $18.3 |
| Reconstructed cumulative W2–W4 | Low | $10–$24 | 2 | 2 / 2 | 1.15 | 1.10–1.19 | $2.0 | $11.5 | $12.5 |
| Canonical exact decision W5 | Low | $10–$24 | 0 | 0 / 0 | — | —–— | — | — | — |

### Exact decision-W5 fixed-coefficient check
| Target | c | n | MAE | Bias | Coverage |
| --- | --- | --- | --- | --- | --- |
| Winner | 2.0 | 1 | $46.8 | $-46.8 | 0.0% |
| Observed minimum | 2.0 | 1 | $38.8 | $-38.8 | 0.0% |
| Winner | 2.5 | 1 | $36.0 | $-36.0 | 0.0% |
| Observed minimum | 2.5 | 1 | $28.0 | $-28.0 | 0.0% |
| Winner | 3.0 | 1 | $25.2 | $-25.2 | 0.0% |
| Observed minimum | 3.0 | 1 | $17.2 | $-17.2 | 0.0% |

Full coefficient × target × tier × sensitivity rows are in Appendix C; production defaults are unchanged.

## 5. Whether a nonlinear/tier-aware market-price curve fits better

**Not enough evidence — 1 reconstructed-prior → exact-later score; 0 exact-prior → exact-later pairs**

### Direct answer
Early exact sequencing exists but is still insufficient to validate a nonlinear, power-law, piecewise, or liquidity-aware curve.

### Key evidence / n
The reconstructed baseline has prior-week-fitted checks, and exact calibration visuals are now included, but the exact sequence is too short for a stable held-out claim.

### Practical implication
Do not change app formulas. Separate curve shape from weekly market scale when a valid exact train/test sequence exists.

### Unknowns / next exact data
Capture candidate baselines, median remaining FAAB, active liquidity, week, winner, and minimum proxy before each auction; fit prior exact weeks only and score the next untouched exact week.

Two-panel visual is rendered in HTML/PDF output: Safe vs canonical winner, and decayed Weeks-as-Starter base vs winner with 2×/2.5×/3×/fitted lines. Each canonical auction appears once; exact/reconstructed provenance remains visible. Exact curve claims remain gated until multiple immutable exact-prior → exact-later pairs exist.

## 6. Weekly #1–#5 price ladder and player-rank relationship

**Directional — 4 distinct auctions: 2 reconstructed + 2 exact**

### Direct answer
The top-five price ladder is visible, but a rank-to-price relationship is not yet comparable across weeks because exact auction-time player rank and liquidity are incomplete.

### Key evidence / n
Each distinct auction shows the first through fifth winning bids and starting-FAAB shares with exact/reconstructed provenance. The exact App W5 / decision W4 ladder replaces reconstructed decision W4.

### Practical implication
Use the ladder to set market-scale expectations, not to claim a stable rank multiplier.

### Unknowns / next exact data
Persist contemporaneous free-agent value rank, position, injury/bye, active-team count, median remaining FAAB, and total active liquidity for every target.

| Auction label | Provenance | #1 | #2 | #3 | #4 | #5 | Context |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Decision W2 | Reconstructed | $99 | $36 | $31 | $28 | $26 | Transaction-ledger FAAB; contemporaneous player rank exists only inside the reconstructed snapshot. |
| Decision W3 | Reconstructed | $234 | $231 | $187 | $103 | $73 | Transaction-ledger FAAB; contemporaneous player rank exists only inside the reconstructed snapshot. |
| App W5 / decision W4 | Exact | $300 | $187 | $128 | $74 | $65 | Exact owner audit of App W5 / Sleeper decision W4 / provider transaction index 3 / playing W4. It replaces—not supplements—the reconstructed decision W4 ladder. Active-liquidity total was not retained. |
| Decision W5 | Exact | $90 | $2 | — | — | — | Canonical completed-waiver outcomes joined to the immutable exact pre-waiver projection snapshot. |

## 7. Claims per manager

**Supported — 107 raw claims; 84 unique manager-target pairs**

### Direct answer
23 same-manager alternatives sit on top of 84 canonical manager-target pairs; raw claim count therefore overstates independent bidding intent.

### Key evidence / n
Exact post-waiver classification preserves canonical claims, duplicates/alternatives, zero-dollar tokens, roster-full failures, and unknown contingencies separately.

### Practical implication
Use canonical manager-target claims for participation and keep raw count as process/contingency context.

### Unknowns / next exact data
One auction cannot define a manager’s usual claim volume. Repeat per-manager distributions, quantiles, wins, and spend across exact weeks.

| Manager | Raw | Canonical / targets | Alternatives | Positive / heavy | Wins / spend | Roster-full |
| --- | --- | --- | --- | --- | --- | --- |
| Manager 01 | 6 | 4 / 4 | 2 | 4 / 2 | 0 / $0 | 0 |
| Manager 02 | 16 | 8 / 8 | 8 | 7 / 3 | 1 / $187 | 3 |
| Manager 03 | 6 | 6 / 6 | 0 | 6 / 2 | 1 / $31 | 0 |
| Manager 04 | 9 | 7 / 7 | 2 | 6 / 5 | 2 / $70 | 1 |
| Manager 05 | 10 | 7 / 7 | 3 | 5 / 2 | 0 / $0 | 0 |
| Manager 06 | 0 | 0 / 0 | 0 | 0 / 0 | 0 / $0 | 0 |
| Manager 07 | 2 | 2 / 2 | 0 | 2 / 2 | 1 / $300 | 0 |
| Manager 08 | 3 | 3 / 3 | 0 | 3 / 3 | 1 / $128 | 0 |
| Manager 09 | 2 | 2 / 2 | 0 | 2 / 1 | 0 / $0 | 0 |
| Manager 10 | 3 | 3 / 3 | 0 | 3 / 2 | 0 / $0 | 0 |
| Manager 11 | 1 | 1 / 1 | 0 | 1 / 0 | 0 / $0 | 0 |
| Manager 12 | 1 | 1 / 1 | 0 | 1 / 1 | 0 / $0 | 0 |
| Manager 13 | 1 | 1 / 1 | 0 | 1 / 0 | 0 / $0 | 0 |
| Manager 14 | 5 | 5 / 5 | 0 | 5 / 3 | 2 / $28 | 0 |
| Manager 15 | 0 | 0 / 0 | 0 | 0 / 0 | 0 / $0 | 0 |
| Manager 16 | 3 | 2 / 2 | 1 | 2 / 0 | 0 / $0 | 0 |
| Manager 17 | 4 | 4 / 4 | 0 | 4 / 2 | 1 / $16 | 0 |
| Manager 18 | 3 | 3 / 3 | 0 | 3 / 3 | 0 / $0 | 0 |
| Manager 19 | 5 | 5 / 5 | 0 | 5 / 2 | 1 / $45 | 0 |
| Manager 20 | 3 | 3 / 3 | 0 | 3 / 3 | 0 / $0 | 0 |
| Manager 21 | 4 | 4 / 4 | 0 | 4 / 2 | 0 / $0 | 0 |
| Manager 22 | 11 | 6 / 6 | 5 | 6 / 2 | 0 / $0 | 0 |
| Manager 23 | 2 | 1 / 1 | 1 | 1 / 1 | 0 / $0 | 0 |
| Manager 24 | 7 | 6 / 6 | 1 | 6 / 3 | 1 / $74 | 0 |

### Claims-per-manager distribution — App W5 / decision W4 owner audit
| Metric | Min | P25 | Median | P75 | P90 | Max |
| --- | --- | --- | --- | --- | --- | --- |
| Raw claims | 0.0 | 2.0 | 3.0 | 6.0 | 9.7 | 16.0 |
| Canonical claims | 0.0 | 1.8 | 3.0 | 5.3 | 6.7 | 8.0 |

| Group | Managers | Mean canonical claims | Median canonical claims | Total wins | Total winning spend |
| --- | --- | --- | --- | --- | --- |
| Managers with ≥1 win | 9 | 5.11 | 5.00 | 11 | $879 |
| Managers with 0 wins | 15 | 2.53 | 2.00 | 0 | $0 |
| Top claim-volume quartile (canonical) | 6 | 6.67 | 6.50 | 5 | $362 |
| Bottom claim-volume quartile (canonical) | 6 | 0.67 | 1.00 | 0 | $0 |

Spearman ρ(canonical claims, wins) = 0.56; Spearman ρ(canonical claims, winning spend) = 0.50.

**Cumulative context:** No comparable cumulative claims-per-manager distribution is reported: generic W2–W4 rows are reconstructed and do not retain the exact canonical alternative/contingency classification used by this owner audit. W5 generic canonical rows are used only in the separate strategy/market sections.

Canonical manager-target rows are the participation unit. Raw alternatives, token claims, roster-full failures, and unknown contingencies remain distinct.

## 8. Positional need versus participation/amount

**Not enough evidence — 0 time-aligned privacy-safe need snapshots**

### Direct answer
Positional need cannot be tested honestly from the retained evidence, including the requested Week 5 WR/QB slice.

### Key evidence / n
The exact fixture has predictions, FAAB, and outcomes but no auction-time roster-need percentile, injury/bye state, or prior-acquisition control.

### Practical implication
Do not interpret a bid or non-bid as need. Modeled need and observed intent must stay separate.

### Unknowns / next exact data
Before each auction capture top/bottom 10% and 25% need ranks by position, roster/injury/bye, player value, FAAB, manager baseline, and prior acquisitions; then report claim rate and conditional amount for players >$10.

## 9. Whether prior-week top winners/bidders spend less next week

**Directional — 7/9 linked top-winner follow-ups had lower next-week winning spend; decision W5 follow-up evidence is exact**

### Direct answer
The linked canonical slice leans toward lower next-week winning spend, but repeated managers, zero-win weeks, and reconstructed prior history prevent a behavioral conclusion.

### Key evidence / n
For each week’s top three distinct winning managers (highest winning bid per manager), the table shows prior and next raw/canonical claims, serious/heavy bids, wins, spend, and exact/reconstructed provenance. Decision Week 5 follow-ups use the immutable exact snapshot. A no-win follow week contributes $0 winning spend but remains visible rather than disappearing.

### Practical implication
Use this only as a budget-monitoring cue; do not reduce forecasts mechanically after a win.

### Unknowns / next exact data
Continue the same manager-linked table with exact weekly snapshots, remaining-FAAB-normalized bid amount, same-position activity, and explicit no-claim outcomes.

| Week | Top winner | Winning spend | Winner provenance | Prior-week history / provenance | Next-week history / provenance |
| --- | --- | --- | --- | --- | --- |
| W2 | History manager 02 | $99 | Reconstructed | 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position (No capture) | 8 raw / 8 canonical; 8 serious; 2 heavy; 3 wins; $99 spend; 53.0% bid volume / starting FAAB; 8.4% mean bid / pre-bid FAAB; 3 same-position (Reconstructed) |
| W2 | History manager 12 | $36 | Reconstructed | 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position (No capture) | 12 raw / 8 canonical; 6 serious; 0 heavy; 1 wins; $47 spend; 40.0% bid volume / starting FAAB; 7.9% mean bid / pre-bid FAAB; 1 same-position (Reconstructed) |
| W2 | History manager 26 | $31 | Reconstructed | 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position (No capture) | 7 raw / 7 canonical; 4 serious; 0 heavy; 0 wins; $0 spend; 16.8% bid volume / starting FAAB; 4.5% mean bid / pre-bid FAAB; 0 same-position (Reconstructed) |
| W3 | History manager 14 | $234 | Reconstructed | 1 raw / 1 canonical; 1 serious; 1 heavy; 0 wins; $0 spend; 12.0% bid volume / starting FAAB; 12.0% mean bid / pre-bid FAAB; 0 same-position (Reconstructed) | 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position (Reconstructed) |
| W3 | History manager 07 | $231 | Reconstructed | 4 raw / 4 canonical; 2 serious; 0 heavy; 0 wins; $0 spend; 9.2% bid volume / starting FAAB; 4.6% mean bid / pre-bid FAAB; 2 same-position (Reconstructed) | 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position (Reconstructed) |
| W3 | History manager 16 | $103 | Reconstructed | 1 raw / 1 canonical; 1 serious; 1 heavy; 0 wins; $0 spend; 10.6% bid volume / starting FAAB; 10.6% mean bid / pre-bid FAAB; 1 same-position (Reconstructed) | 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position (Reconstructed) |
| W4 | History manager 27 | $45 | Reconstructed | 6 raw / 6 canonical; 3 serious; 1 heavy; 0 wins; $0 spend; 21.4% bid volume / starting FAAB; 10.3% mean bid / pre-bid FAAB; 3 same-position (Reconstructed) | 1 raw / 1 canonical; 1 serious; 0 heavy; 0 wins; $0 spend; 8.0% bid volume / starting FAAB; 13.2% mean bid / pre-bid FAAB; 0 same-position (Exact) |
| W4 | History manager 26 | $31 | Reconstructed | 7 raw / 7 canonical; 4 serious; 0 heavy; 0 wins; $0 spend; 16.8% bid volume / starting FAAB; 4.5% mean bid / pre-bid FAAB; 0 same-position (Reconstructed) | 2 raw / 2 canonical; 1 serious; 0 heavy; 0 wins; $0 spend; 1.4% bid volume / starting FAAB; 1.7% mean bid / pre-bid FAAB; 1 same-position (Exact) |
| W4 | History manager 12 | $17 | Reconstructed | 12 raw / 8 canonical; 6 serious; 0 heavy; 1 wins; $47 spend; 40.0% bid volume / starting FAAB; 7.9% mean bid / pre-bid FAAB; 1 same-position (Reconstructed) | 2 raw / 1 canonical; 1 serious; 0 heavy; 0 wins; $0 spend; 7.4% bid volume / starting FAAB; 10.4% mean bid / pre-bid FAAB; 1 same-position (Exact) |
| W5 | History manager 05 | $90 | Exact | 1 raw / 1 canonical; 1 serious; 0 heavy; 1 wins; $14 spend; 2.8% bid volume / starting FAAB; 8.5% mean bid / pre-bid FAAB; 1 same-position (Reconstructed) | 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position (No capture) |
| W5 | History manager 16 | $2 | Exact | 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position (Reconstructed) | 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position (No capture) |

# Appendices

## My team this week
- One premium acquisition for $187 from $499, leaving $312.
- 8 raw claims became 7 canonical claims; three later claims were explicitly roster-full.
- Clearing price was above the $159 observed-minimum proxy and below the $244 top-credible estimate.
- Lineup, injury, and positional-hole claims are not supported by the privacy-safe evidence.

## Methods and glossary
- Signed error = prediction − explicit submitted amount; MAE = mean absolute error over explicit claims only. Non-bids are missing, never $0.
- Spearman ρ is Pearson correlation of average ranks. Raw prediction R²* = 1 − SSE/SST on fixed, unrefit predictions; negative values are valid and this is not fitted-regression goodness-of-fit.
- Feasible prediction = min(prediction, pre-waiver FAAB). Capacity and willingness remain separate.
- Bootstrap intervals use 2,000 deterministic cluster resamples (seed 20260927); clusters are player × processing batch. This does not repair reconstructed-history error.
- Token threshold is ≤ max($1, 1% starting FAAB) = $5. Ratio-gap, MAD, and IQR are independent sensitivity flags.
- Exact and reconstructed provenance are not interchangeable. Later exact scores after reconstructed training = 1; exact-prior → exact-later pair count = 0.

## Full coefficient sensitivity (analysis-only)
| Scope | Provenance | Tier | Target | c | n | MAE | Bias | Coverage | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | All | Winner | 2.0 | 10 | $37.0 | $-34.8 | 20.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | All | Observed minimum | 2.0 | 10 | $23.0 | $-10.4 | 50.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | All | Winner | 2.5 | 10 | $28.4 | $-21.6 | 30.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | All | Observed minimum | 2.5 | 10 | $19.8 | $2.8 | 70.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | All | Winner | 3.0 | 10 | $23.8 | $-8.4 | 50.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | All | Observed minimum | 3.0 | 10 | $23.8 | $16.0 | 80.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | High | Winner | 2.0 | 3 | $87.9 | $-87.9 | 0.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | High | Observed minimum | 2.0 | 3 | $53.3 | $-53.3 | 0.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | High | Winner | 2.5 | 3 | $58.7 | $-58.7 | 0.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | High | Observed minimum | 2.5 | 3 | $32.0 | $-24.0 | 33.3% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | High | Winner | 3.0 | 3 | $40.1 | $-29.4 | 33.3% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | High | Observed minimum | 3.0 | 3 | $31.1 | $5.3 | 66.7% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | Mid | Winner | 2.0 | 4 | $22.4 | $-22.4 | 0.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | Mid | Observed minimum | 2.0 | 4 | $7.8 | $4.1 | 50.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | Mid | Winner | 2.5 | 4 | $21.0 | $-14.5 | 25.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | Mid | Observed minimum | 2.5 | 4 | $12.5 | $12.0 | 75.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | Mid | Winner | 3.0 | 4 | $21.7 | $-6.7 | 50.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | Mid | Observed minimum | 3.0 | 4 | $20.0 | $19.8 | 75.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | Low | Winner | 2.0 | 3 | $5.6 | $1.9 | 66.7% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | Low | Observed minimum | 2.0 | 3 | $13.2 | $13.2 | 100.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | Low | Winner | 2.5 | 3 | $8.0 | $6.0 | 66.7% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | Low | Observed minimum | 2.5 | 3 | $17.3 | $17.3 | 100.0% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | Low | Winner | 3.0 | 3 | $10.4 | $10.1 | 66.7% | Owner-specific exact in-sample descriptive slice |
| Exact app W5 (Sleeper decision W4) | Exact immutable owner post-waiver fixture | Low | Observed minimum | 3.0 | 3 | $21.5 | $21.5 | 100.0% | Owner-specific exact in-sample descriptive slice |
| Canonical exact decision W5 | Exact pre-waiver projection snapshot joined to completed waiver outcomes | All | Winner | 2.0 | 1 | $46.8 | $-46.8 | 0.0% | Exact later-week score of fixed coefficients; prior weeks remain reconstructed |
| Canonical exact decision W5 | Exact pre-waiver projection snapshot joined to completed waiver outcomes | All | Observed minimum | 2.0 | 1 | $38.8 | $-38.8 | 0.0% | Exact later-week score of fixed coefficients; prior weeks remain reconstructed |
| Canonical exact decision W5 | Exact pre-waiver projection snapshot joined to completed waiver outcomes | All | Winner | 2.5 | 1 | $36.0 | $-36.0 | 0.0% | Exact later-week score of fixed coefficients; prior weeks remain reconstructed |
| Canonical exact decision W5 | Exact pre-waiver projection snapshot joined to completed waiver outcomes | All | Observed minimum | 2.5 | 1 | $28.0 | $-28.0 | 0.0% | Exact later-week score of fixed coefficients; prior weeks remain reconstructed |
| Canonical exact decision W5 | Exact pre-waiver projection snapshot joined to completed waiver outcomes | All | Winner | 3.0 | 1 | $25.2 | $-25.2 | 0.0% | Exact later-week score of fixed coefficients; prior weeks remain reconstructed |
| Canonical exact decision W5 | Exact pre-waiver projection snapshot joined to completed waiver outcomes | All | Observed minimum | 3.0 | 1 | $17.2 | $-17.2 | 0.0% | Exact later-week score of fixed coefficients; prior weeks remain reconstructed |
| Canonical exact decision W5 | Exact pre-waiver projection snapshot joined to completed waiver outcomes | High | Winner | 2.0 | 1 | $46.8 | $-46.8 | 0.0% | Exact later-week score of fixed coefficients; prior weeks remain reconstructed |
| Canonical exact decision W5 | Exact pre-waiver projection snapshot joined to completed waiver outcomes | High | Observed minimum | 2.0 | 1 | $38.8 | $-38.8 | 0.0% | Exact later-week score of fixed coefficients; prior weeks remain reconstructed |
| Canonical exact decision W5 | Exact pre-waiver projection snapshot joined to completed waiver outcomes | High | Winner | 2.5 | 1 | $36.0 | $-36.0 | 0.0% | Exact later-week score of fixed coefficients; prior weeks remain reconstructed |
| Canonical exact decision W5 | Exact pre-waiver projection snapshot joined to completed waiver outcomes | High | Observed minimum | 2.5 | 1 | $28.0 | $-28.0 | 0.0% | Exact later-week score of fixed coefficients; prior weeks remain reconstructed |
| Canonical exact decision W5 | Exact pre-waiver projection snapshot joined to completed waiver outcomes | High | Winner | 3.0 | 1 | $25.2 | $-25.2 | 0.0% | Exact later-week score of fixed coefficients; prior weeks remain reconstructed |
| Canonical exact decision W5 | Exact pre-waiver projection snapshot joined to completed waiver outcomes | High | Observed minimum | 3.0 | 1 | $17.2 | $-17.2 | 0.0% | Exact later-week score of fixed coefficients; prior weeks remain reconstructed |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | All | Winner | 2.0 | 24 | $44.7 | $-42.3 | 4.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | All | Observed minimum | 2.0 | 23 | $28.3 | $-21.4 | 26.1% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | All | Winner | 2.5 | 24 | $42.8 | $-38.8 | 8.3% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | All | Observed minimum | 2.5 | 23 | $31.2 | $-17.8 | 26.1% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | All | Winner | 3.0 | 24 | $41.3 | $-35.4 | 16.7% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | All | Observed minimum | 3.0 | 23 | $34.0 | $-14.2 | 26.1% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | High | Winner | 2.0 | 5 | $126.5 | $-126.5 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | High | Observed minimum | 2.0 | 5 | $75.3 | $-66.3 | 40.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | High | Winner | 2.5 | 5 | $115.4 | $-115.4 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | High | Observed minimum | 2.5 | 5 | $83.2 | $-55.2 | 40.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | High | Winner | 3.0 | 5 | $104.4 | $-104.3 | 20.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | High | Observed minimum | 3.0 | 5 | $91.1 | $-44.1 | 40.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | Mid | Winner | 2.0 | 9 | $35.5 | $-29.0 | 11.1% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | Mid | Observed minimum | 2.0 | 9 | $24.5 | $-15.6 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | Mid | Winner | 2.5 | 9 | $37.2 | $-26.6 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | Mid | Observed minimum | 2.5 | 9 | $26.7 | $-13.1 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | Mid | Winner | 3.0 | 9 | $39.4 | $-24.1 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | Mid | Observed minimum | 3.0 | 9 | $28.9 | $-10.6 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | Low | Winner | 2.0 | 10 | $12.2 | $-12.2 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | Low | Observed minimum | 2.0 | 9 | $6.1 | $-2.3 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | Low | Winner | 2.5 | 10 | $11.6 | $-11.6 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | Low | Observed minimum | 2.5 | 9 | $6.8 | $-1.7 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | Low | Winner | 3.0 | 10 | $11.5 | $-11.0 | 10.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed cumulative W2–W4 | Reconstructed prior-only sensitivity (descriptive) | Low | Observed minimum | 3.0 | 9 | $7.4 | $-1.0 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | All | Winner | 2.0 | 23 | $39.3 | $-36.8 | 4.3% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | All | Observed minimum | 2.0 | 22 | $29.2 | $-22.8 | 22.7% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | All | Winner | 2.5 | 23 | $38.0 | $-33.9 | 8.7% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | All | Observed minimum | 2.5 | 22 | $31.5 | $-19.7 | 22.7% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | All | Winner | 3.0 | 23 | $37.2 | $-30.9 | 17.4% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | All | Observed minimum | 3.0 | 22 | $33.7 | $-16.7 | 22.7% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | High | Winner | 2.0 | 4 | $115.8 | $-115.8 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | High | Observed minimum | 2.0 | 4 | $92.0 | $-85.0 | 25.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | High | Winner | 2.5 | 4 | $106.0 | $-106.0 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | High | Observed minimum | 2.5 | 4 | $97.8 | $-75.3 | 25.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | High | Winner | 3.0 | 4 | $96.3 | $-96.2 | 25.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | High | Observed minimum | 3.0 | 4 | $103.5 | $-65.5 | 25.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | Mid | Winner | 2.0 | 9 | $35.5 | $-29.0 | 11.1% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | Mid | Observed minimum | 2.0 | 9 | $24.5 | $-15.6 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | Mid | Winner | 2.5 | 9 | $37.2 | $-26.6 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | Mid | Observed minimum | 2.5 | 9 | $26.7 | $-13.1 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | Mid | Winner | 3.0 | 9 | $39.4 | $-24.1 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | Mid | Observed minimum | 3.0 | 9 | $28.9 | $-10.6 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | Low | Winner | 2.0 | 10 | $12.2 | $-12.2 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | Low | Observed minimum | 2.0 | 9 | $6.1 | $-2.3 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | Low | Winner | 2.5 | 10 | $11.6 | $-11.6 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | Low | Observed minimum | 2.5 | 9 | $6.8 | $-1.7 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | Low | Winner | 3.0 | 10 | $11.5 | $-11.0 | 10.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed without privacy-safe owner-directed marker | Reconstructed sensitivity excluding owner-directed-outlier-01 | Low | Observed minimum | 3.0 | 9 | $7.4 | $-1.0 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | All | Winner | 2.0 | 23 | $39.3 | $-36.8 | 4.3% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | All | Observed minimum | 2.0 | 22 | $29.2 | $-22.8 | 22.7% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | All | Winner | 2.5 | 23 | $38.0 | $-33.9 | 8.7% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | All | Observed minimum | 2.5 | 22 | $31.5 | $-19.7 | 22.7% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | All | Winner | 3.0 | 23 | $37.2 | $-30.9 | 17.4% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | All | Observed minimum | 3.0 | 22 | $33.7 | $-16.7 | 22.7% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | High | Winner | 2.0 | 4 | $115.8 | $-115.8 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | High | Observed minimum | 2.0 | 4 | $92.0 | $-85.0 | 25.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | High | Winner | 2.5 | 4 | $106.0 | $-106.0 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | High | Observed minimum | 2.5 | 4 | $97.8 | $-75.3 | 25.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | High | Winner | 3.0 | 4 | $96.3 | $-96.2 | 25.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | High | Observed minimum | 3.0 | 4 | $103.5 | $-65.5 | 25.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | Mid | Winner | 2.0 | 9 | $35.5 | $-29.0 | 11.1% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | Mid | Observed minimum | 2.0 | 9 | $24.5 | $-15.6 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | Mid | Winner | 2.5 | 9 | $37.2 | $-26.6 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | Mid | Observed minimum | 2.5 | 9 | $26.7 | $-13.1 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | Mid | Winner | 3.0 | 9 | $39.4 | $-24.1 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | Mid | Observed minimum | 3.0 | 9 | $28.9 | $-10.6 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | Low | Winner | 2.0 | 10 | $12.2 | $-12.2 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | Low | Observed minimum | 2.0 | 9 | $6.1 | $-2.3 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | Low | Winner | 2.5 | 10 | $11.6 | $-11.6 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | Low | Observed minimum | 2.5 | 9 | $6.8 | $-1.7 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | Low | Winner | 3.0 | 10 | $11.5 | $-11.0 | 10.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; ratio-gap flag removed | Reconstructed sensitivity with preregistered ratio-gap outlier flag removed | Low | Observed minimum | 3.0 | 9 | $7.4 | $-1.0 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | All | Winner | 2.0 | 20 | $29.9 | $-27.0 | 5.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | All | Observed minimum | 2.0 | 19 | $24.5 | $-18.5 | 21.1% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | All | Winner | 2.5 | 20 | $30.4 | $-25.6 | 10.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | All | Observed minimum | 2.5 | 19 | $25.9 | $-17.1 | 21.1% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | All | Winner | 3.0 | 20 | $31.3 | $-24.2 | 15.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | All | Observed minimum | 3.0 | 19 | $27.2 | $-15.6 | 21.1% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | High | Winner | 2.0 | 2 | $101.0 | $-101.0 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | High | Observed minimum | 2.0 | 2 | $97.5 | $-97.5 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | High | Winner | 2.5 | 2 | $101.0 | $-101.0 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | High | Observed minimum | 2.5 | 2 | $97.5 | $-97.5 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | High | Winner | 3.0 | 2 | $101.0 | $-101.0 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | High | Observed minimum | 3.0 | 2 | $97.5 | $-97.5 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | Mid | Winner | 2.0 | 8 | $34.3 | $-27.0 | 12.5% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | Mid | Observed minimum | 2.0 | 8 | $27.0 | $-17.0 | 25.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | Mid | Winner | 2.5 | 8 | $36.3 | $-24.3 | 25.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | Mid | Observed minimum | 2.5 | 8 | $29.5 | $-14.3 | 25.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | Mid | Winner | 3.0 | 8 | $38.7 | $-21.5 | 25.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | Mid | Observed minimum | 3.0 | 8 | $32.0 | $-11.5 | 25.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | Low | Winner | 2.0 | 10 | $12.2 | $-12.2 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | Low | Observed minimum | 2.0 | 9 | $6.1 | $-2.3 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | Low | Winner | 2.5 | 10 | $11.6 | $-11.6 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | Low | Observed minimum | 2.5 | 9 | $6.8 | $-1.7 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | Low | Winner | 3.0 | 10 | $11.5 | $-11.0 | 10.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; MAD flag removed | Reconstructed sensitivity with preregistered MAD outlier flag removed | Low | Observed minimum | 3.0 | 9 | $7.4 | $-1.0 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | All | Winner | 2.0 | 21 | $30.6 | $-27.9 | 4.8% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | All | Observed minimum | 2.0 | 20 | $23.5 | $-17.8 | 20.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | All | Winner | 2.5 | 21 | $31.1 | $-26.5 | 9.5% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | All | Observed minimum | 2.5 | 20 | $24.8 | $-16.4 | 20.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | All | Winner | 3.0 | 21 | $32.0 | $-25.2 | 14.3% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | All | Observed minimum | 3.0 | 20 | $26.1 | $-15.0 | 20.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | High | Winner | 2.0 | 2 | $101.0 | $-101.0 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | High | Observed minimum | 2.0 | 2 | $97.5 | $-97.5 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | High | Winner | 2.5 | 2 | $101.0 | $-101.0 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | High | Observed minimum | 2.5 | 2 | $97.5 | $-97.5 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | High | Winner | 3.0 | 2 | $101.0 | $-101.0 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | High | Observed minimum | 3.0 | 2 | $97.5 | $-97.5 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | Mid | Winner | 2.0 | 9 | $35.5 | $-29.0 | 11.1% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | Mid | Observed minimum | 2.0 | 9 | $24.5 | $-15.6 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | Mid | Winner | 2.5 | 9 | $37.2 | $-26.6 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | Mid | Observed minimum | 2.5 | 9 | $26.7 | $-13.1 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | Mid | Winner | 3.0 | 9 | $39.4 | $-24.1 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | Mid | Observed minimum | 3.0 | 9 | $28.9 | $-10.6 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | Low | Winner | 2.0 | 10 | $12.2 | $-12.2 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | Low | Observed minimum | 2.0 | 9 | $6.1 | $-2.3 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | Low | Winner | 2.5 | 10 | $11.6 | $-11.6 | 0.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | Low | Observed minimum | 2.5 | 9 | $6.8 | $-1.7 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | Low | Winner | 3.0 | 10 | $11.5 | $-11.0 | 10.0% | Reconstructed prior-only sensitivity; not exact held-out evidence |
| Reconstructed non-token; IQR flag removed | Reconstructed sensitivity with preregistered IQR outlier flag removed | Low | Observed minimum | 3.0 | 9 | $7.4 | $-1.0 | 22.2% | Reconstructed prior-only sensitivity; not exact held-out evidence |

## Retained forecast-band scoring
| Band | Target | Tier | n | MAE | Bias | Coverage | Provenance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Top credible | Winner | All | 11 | $36.4 | $16.9 | 81.8% | Exact app W5 (Sleeper decision W4) only; descriptive exact scoreability |
| Top credible | Winner | High | 3 | $41.0 | $-30.3 | 33.3% | Exact app W5 (Sleeper decision W4) only; descriptive exact scoreability |
| Top credible | Winner | Mid | 4 | $29.3 | $29.3 | 100.0% | Exact app W5 (Sleeper decision W4) only; descriptive exact scoreability |
| Top credible | Winner | Low | 3 | $53.0 | $53.0 | 100.0% | Exact app W5 (Sleeper decision W4) only; descriptive exact scoreability |
| Top credible | Observed minimum | All | 11 | $44.7 | $39.5 | 90.9% | Exact app W5 (Sleeper decision W4) only; descriptive exact scoreability |
| Top credible | Observed minimum | High | 3 | $23.7 | $4.3 | 66.7% | Exact app W5 (Sleeper decision W4) only; descriptive exact scoreability |
| Top credible | Observed minimum | Mid | 4 | $55.8 | $55.8 | 100.0% | Exact app W5 (Sleeper decision W4) only; descriptive exact scoreability |
| Top credible | Observed minimum | Low | 3 | $64.3 | $64.3 | 100.0% | Exact app W5 (Sleeper decision W4) only; descriptive exact scoreability |
| Top all | Winner | All | 11 | $47.3 | $40.9 | 90.9% | Exact app W5 (Sleeper decision W4) only; descriptive exact scoreability |
| Top all | Winner | High | 3 | $63.3 | $40.0 | 66.7% | Exact app W5 (Sleeper decision W4) only; descriptive exact scoreability |
| Top all | Winner | Mid | 4 | $38.5 | $38.5 | 100.0% | Exact app W5 (Sleeper decision W4) only; descriptive exact scoreability |
| Top all | Winner | Low | 3 | $57.7 | $57.7 | 100.0% | Exact app W5 (Sleeper decision W4) only; descriptive exact scoreability |
| Top all | Observed minimum | All | 11 | $63.5 | $63.5 | 100.0% | Exact app W5 (Sleeper decision W4) only; descriptive exact scoreability |
| Top all | Observed minimum | High | 3 | $74.7 | $74.7 | 100.0% | Exact app W5 (Sleeper decision W4) only; descriptive exact scoreability |
| Top all | Observed minimum | Mid | 4 | $65.0 | $65.0 | 100.0% | Exact app W5 (Sleeper decision W4) only; descriptive exact scoreability |
| Top all | Observed minimum | Low | 3 | $69.0 | $69.0 | 100.0% | Exact app W5 (Sleeper decision W4) only; descriptive exact scoreability |

## Prior strategy formulas
| Strategy | Deterministic definition |
| --- | --- |
| Max VORP | VORP-calibrated dollar value at the player-specific future active-team stage that maximizes value. |
| Middle VORP | VORP-calibrated dollar value at one shared horizon: max(4, ceil(active teams / 2)). |
| Current-team VoRP | VORP-calibrated dollar value at the current active-team count. |
| Corrected Safe | round(0.2 × position weight × positional premium × available budget); premium is 1.25 for rank 1, otherwise 1.1 × (replacement rank − rank) / (replacement rank − 1), floored at 0. |
| Corrected Weeks as Starter | Corrected Safe × projected starter weeks / weeks remaining, rounded and floored at 0. |
| Legacy Safe / Aggressive / Weeks as Starter | Archived production outputs replayed from the same snapshot by buildWaiverBoard; no post-outcome refit. |

## Prior reconstructed accuracy
| Baseline | n serious | MAE | Bias | Raw prediction R²* |
| --- | --- | --- | --- | --- |
| Max VORP | 130 | $30.4 | $-21.5 | -0.243 |
| Current VORP | 130 | $30.3 | $-21.6 | -0.242 |
| Legacy Aggressive | 130 | $41.6 | $-6.2 | -0.793 |

## Full predeclared winning-bid sensitivities
| Sensitivity case | n wins | Max VORP MAE | Middle VORP MAE | Current-team VoRP MAE | Corrected Safe (PR #13) MAE | Corrected Weeks as Starter (PR #13) MAE | Legacy Safe MAE | Legacy Aggressive MAE | Legacy Weeks as Starter MAE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| All usable winning bids | 54 | $28.3 | $27.6 | $27.9 | $31.2 | $28.5 | $29.4 | $28.4 | $27.1 |
| Non-token winning bids | 28 | $42.5 | $47.6 | $42.5 | $40.6 | $41.4 | $43.1 | $39.8 | $43.5 |
| Non-token; ratio-gap flag removed | 27 | $36.7 | $41.1 | $36.7 | $36.1 | $36.0 | $38.7 | $35.6 | $38.1 |
| Non-token; MAD flag removed | 24 | $27.0 | $30.9 | $26.9 | $28.9 | $28.1 | $29.3 | $29.0 | $28.3 |
| Non-token; IQR flag removed | 25 | $27.7 | $31.5 | $27.6 | $29.5 | $28.8 | $30.0 | $29.6 | $29.0 |

## Deterministic cluster-bootstrap check
| Strategy | n wins | MAE | 95% cluster-bootstrap MAE CI |
| --- | --- | --- | --- |
| Max VORP | 54 | $28.3 | $18.3–$40.2 |
| Middle VORP | 54 | $27.6 | $16.7–$40.5 |
| Current-team VoRP | 54 | $27.9 | $17.9–$39.5 |
| Corrected Safe (PR #13) | 54 | $31.2 | $22.2–$41.8 |
| Corrected Weeks as Starter (PR #13) | 54 | $28.5 | $19.1–$39.4 |
| Legacy Safe | 54 | $29.4 | $19.5–$40.8 |
| Legacy Aggressive | 54 | $28.4 | $18.4–$39.6 |
| Legacy Weeks as Starter | 54 | $27.1 | $17.0–$39.1 |

## Privacy-safe owner-directed exclusion sensitivity
| View | Clusters | Closest | Max VORP MAE | Current-team VoRP MAE | Corrected Safe MAE | Corrected Weeks as Starter MAE |
| --- | --- | --- | --- | --- | --- | --- |
| Without privacy-safe owner-directed marker | 27 | Current-team VoRP | $12.1 | $11.9 | $24.6 | $15.1 |
| With marked target retained | 28 | Current-team VoRP | $11.3 | $11.1 | $25.9 | $14.9 |

**Named owner-directed sensitivity:** Monangai remains in the raw canonical rows. Only rows explicitly labeled “without privacy-safe owner-directed marker” exclude that one preregistered event; no raw row is silently deleted.

## Prior-week-fitted held-out checks
| Observation | Strategy | Fit→test | Scale | test n | MAE | Bias | Raw held-out R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Winner | Max VORP | W2→W3 | 0.943 | 11 | $49.5 | $-9.6 | 0.14 | 0.11 |
| Winner | Current-team VoRP | W2→W3 | 0.953 | 11 | $47.5 | $-11.5 | 0.18 | 0.11 |
| Winner | Corrected Safe | W2→W3 | 0.544 | 11 | $49.5 | $-13.2 | 0.14 | 0.19 |
| Winner | Corrected Weeks as Starter | W2→W3 | 1.200 | 11 | $50.7 | $5.9 | 0.31 | 0.10 |
| Winner | Max VORP | W3→W4 | 0.000 | 3 | $5.7 | $-5.7 | -0.50 | — |
| Winner | Current-team VoRP | W3→W4 | 0.000 | 3 | $5.7 | $-5.7 | -0.50 | — |
| Winner | Corrected Safe | W3→W4 | 0.000 | 3 | $5.7 | $-5.7 | -0.50 | — |
| Winner | Corrected Weeks as Starter | W3→W4 | 0.000 | 3 | $5.7 | $-5.7 | -0.50 | — |
| Winner | Max VORP | W4→W5 | 0.000 | 2 | $46.0 | $-46.0 | -1.09 | — |
| Winner | Current-team VoRP | W4→W5 | 0.000 | 2 | $46.0 | $-46.0 | -1.09 | — |
| Winner | Corrected Safe | W4→W5 | 0.000 | 2 | $46.0 | $-46.0 | -1.09 | — |
| Winner | Corrected Weeks as Starter | W4→W5 | 0.000 | 1 | $90.0 | $-90.0 | — | — |
| Serious-market median | Max VORP | W2→W3 | 0.855 | 4 | $10.3 | $-2.7 | 0.72 | 0.80 |
| Serious-market median | Current-team VoRP | W2→W3 | 0.855 | 4 | $10.1 | $-2.9 | 0.72 | 0.80 |
| Serious-market median | Corrected Safe | W2→W3 | 0.420 | 4 | $17.8 | $-10.8 | 0.43 | 0.80 |
| Serious-market median | Corrected Weeks as Starter | W2→W3 | 1.487 | 4 | $41.1 | $37.1 | -2.61 | 0.80 |
| Serious-market median | Max VORP | W3→W4 | 0.988 | 1 | $2.2 | $-2.2 | — | — |
| Serious-market median | Current-team VoRP | W3→W4 | 0.993 | 1 | $2.1 | $-2.1 | — | — |
| Serious-market median | Corrected Safe | W3→W4 | 0.680 | 1 | $4.8 | $4.8 | — | — |
| Serious-market median | Corrected Weeks as Starter | W3→W4 | 0.733 | 1 | $9.7 | $-9.7 | — | — |
| Serious-market median | Max VORP | W4→W5 | 1.133 | 1 | $0.3 | $-0.3 | — | — |
| Serious-market median | Current-team VoRP | W4→W5 | 1.133 | 1 | $0.3 | $-0.3 | — | — |
| Serious-market median | Corrected Safe | W4→W5 | 0.531 | 1 | $7.1 | $-7.1 | — | — |
| Serious-market median | Corrected Weeks as Starter | W4→W5 | 1.700 | 1 | $21.2 | $21.2 | — | — |

Only these rows fit a scale, using the prior week and scoring the next. The W4→W5 rows use reconstructed W4 as training evidence and immutable exact W5 as the later score. Exact nonlinear/tier/liquidity model claims remain gated until more immutable exact prior→later pairs exist.

## Source-hash lineage
| Source label | Evidence class | SHA-256 |
| --- | --- | --- |
| week-5-manager-predictions.csv | Exact Week5 | a36ccdf7afa3dc43f2145a3e2de69f21938f7a6377922025daefa371c544bc15 |
| week-5-player-summary.csv | Exact Week5 | 73a9954c755e7ff5299de1b33ba045ca5f4fd727346d9d6cebd28447e8e8efd2 |
| week-5-post-waiver-manager-comparison.csv | Exact Week5 | 7d03f127981720e0494fdb34379254ca1cb6c83972a500f6d24b2c54951838d1 |
| week-5-post-waiver-player-comparison.csv | Exact Week5 | 5c73337d78c193e1638d990d07d5cb2dbf39b902be1f338a54bc1d25ce94690a |
| week-5-pre-waiver.json | Exact Week5 | cbc1f7d92a5c3c393640d09940a5b52d2130de4f174b5a6fbcac5e3fd622b38f |
| week-5-post-waiver-classified-claims.json | Exact Week5 | 903a5ca60e7efecd752751f30f435360afe34fcb2bf3fb730b71974e76f0a80b |
| bidding-strategy-seamex-2026.json | Canonical market fixture: reconstructed W2, W3, W4; exact W5 | 2f80c608cf94ee255223716fd3962cf4fd453f4a7000a5f7059d7ceb8651e8e8 |
