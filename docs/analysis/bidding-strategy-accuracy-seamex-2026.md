# Nine answers at a glance

1. **Predicted-bid accuracy for top versus middle bidders/players — Supported.** In the exact Week 5 top-three target slice, top-five predicted bidders were not more accurate: claim-only MAE was $78.2 versus $45.5 for the deterministic middle five. _Key n: 30 direct rows; 11/11 scored claims._
2. **What Likely/Possible/Unlikely predicts and whether narrower bands help — Directional.** Likely/Possible/Unlikely was ordered for any canonical claim, but ranking managers only by predicted dollars did not improve discrimination: the exact top 25% claimed less often than the bottom 25%. _Key n: 242 opportunities; any-claim rates 47.7% / 31.5% / 21.7%._
3. **Bidding after a prior expensive win — Directional.** The direct reconstructed slice is descriptive and mixed; it does not support a causal claim that an expensive win suppresses the next auction. _Key n: 7 reconstructed ≥$90 anchor wins._
4. **Aggressive versus actual winner/minimum by price tier — Directional.** Aggressive was closest in the low tier, but the winner/Aggressive ratio changed sharply by tier; it is not one stable market multiplier. _Key n: 10 exact app-W5 targets $10+; cumulative W2–W4 shown separately._
5. **Whether a nonlinear/tier-aware market-price curve fits better — Not enough evidence.** No nonlinear, power-law, piecewise, or liquidity-aware curve is validated yet. _Key n: 0 valid exact prior-week train → later-week test pairs._
6. **Weekly #1–#5 price ladder and player-rank relationship — Directional.** The top-five price ladder is visible, but a rank-to-price relationship is not yet comparable across weeks because exact auction-time player rank and liquidity are incomplete. _Key n: 3 distinct auctions: 2 reconstructed + 1 exact._
7. **Claims per manager — Supported.** Week 5 contained 23 extra same-manager alternatives beyond 84 unique manager-target pairs; raw claim count therefore overstates independent bidding intent. _Key n: 107 raw claims; 84 unique manager-target pairs._
8. **Positional need versus participation/amount — Not enough evidence.** Positional need cannot be tested honestly from the retained evidence, including the requested Week 5 WR/QB slice. _Key n: 0 time-aligned privacy-safe need snapshots._
9. **Whether prior-week top winners/bidders spend less next week — Directional.** The reconstructed direct slice leans toward lower next-week winning spend, but repeated managers, zero-win weeks, and non-exact history prevent a behavioral conclusion. _Key n: 5/6 reconstructed top-winner follow-ups had lower next-week winning spend._

## 1. Predicted-bid accuracy for top versus middle bidders/players

**Supported — 30 direct rows; 11/11 scored claims**

### Direct answer
In the exact Week 5 top-three target slice, top-five predicted bidders were not more accurate: claim-only MAE was $78.2 versus $45.5 for the deterministic middle five.

### Key evidence / n
The top-three targets were frozen pre-auction by Max VORP descending (102, 69, 50; alias tie-break). Errors exist only for explicit claims; non-bids remain missing, not $0.

### Practical implication
Use the ranking as a conversation starter, not proof that the highest projected manager will set the price. Keep feasible/capped values visible before judging willingness.

### Unknowns / next exact data
Repeat this exact 30-row slice weekly. Retain median/high prediction bands prospectively; Week 5 only preserved source-supported top-credible and top-all bands.

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
Week 5 has 65 Likely, 108 Possible, and 69 Unlikely opportunities. Top/bottom 25% and 10% are shown for every preregistered threshold outcome; they are descriptive, not selected-and-scored cutoffs.

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

**Directional — 7 reconstructed ≥$90 anchor wins**

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
| History manager 05 | W2 win $285 | W3 | 3 / 3 | 3 / 2 | 1 / $50 / $115 | 41.0% / 31.8% | 0 | No observed heavy-threshold censoring | W4: 1 raw / 1 canonical; 1 serious; 0 heavy; 0 wins; $0 spend; 9.0% bid volume / starting FAAB; 27.3% mean bid / pre-bid FAAB; 0 same-position | Reconstructed transaction-ledger history |
| History manager 28 | W2 win $153 | W3 | 5 / 5 | 3 / 1 | 0 / $0 / $57 | 21.4% / 10.3% | 0 | No observed heavy-threshold censoring | W4: 5 raw / 5 canonical; 5 serious; 2 heavy; 1 wins; $45 spend; 81.0% bid volume / starting FAAB; 23.3% mean bid / pre-bid FAAB; 0 same-position | Reconstructed transaction-ledger history |
| History manager 02 | W2 win $99 | W3 | 9 / 8 | 8 / 2 | 2 / $91 / $73 | 56.0% / 8.9% | 0 | No observed heavy-threshold censoring | W4: 8 raw / 8 canonical; 4 serious; 3 heavy; 1 wins; $74 spend; 50.4% bid volume / starting FAAB; 21.5% mean bid / pre-bid FAAB; 0 same-position | Reconstructed transaction-ledger history |
| History manager 14 | W3 win $234 | W4 | 4 / 4 | 2 / 1 | 1 / $17 / $154 | 34.2% / 32.3% | 1 | No observed heavy-threshold censoring | W4: 4 raw / 4 canonical; 2 serious; 1 heavy; 1 wins; $17 spend; 34.2% bid volume / starting FAAB; 32.3% mean bid / pre-bid FAAB; 1 same-position | Reconstructed transaction-ledger history |
| History manager 07 | W3 win $231 | W4 | 1 / 1 | 0 / 0 | 0 / $0 / — | 0.0% / — | 0 | No observed heavy-threshold censoring | W4: 1 raw / 1 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position | Reconstructed transaction-ledger history |
| History manager 07 | W3 win $187 | W4 | 1 / 1 | 0 / 0 | 0 / $0 / — | 0.0% / — | 0 | No observed heavy-threshold censoring | W4: 1 raw / 1 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position | Reconstructed transaction-ledger history |
| History manager 16 | W3 win $103 | W4 | 3 / 3 | 3 / 3 | 1 / $128 / $243 | 99.8% / 42.3% | 0 | No observed heavy-threshold censoring | W4: 3 raw / 3 canonical; 3 serious; 3 heavy; 1 wins; $128 spend; 99.8% bid volume / starting FAAB; 42.3% mean bid / pre-bid FAAB; 0 same-position | Reconstructed transaction-ledger history |

## 4. Aggressive versus actual winner/minimum by price tier

**Directional — 10 exact app-W5 targets $10+; cumulative W2–W4 shown separately**

### Direct answer
Aggressive was closest in the low tier, but the winner/Aggressive ratio changed sharply by tier; it is not one stable market multiplier.

### Key evidence / n
Fixed tier boundaries are high ≥$80, mid $25–$79, and low $10–$24. Weekly exact and cumulative reconstructed rows are separate views; reconstructed W4 is the same auction as exact app W5 and is never pooled with it. Minimum-to-guarantee and derived runner-up-proxy MAE are both shown with their own n.

### Practical implication
Keep Aggressive labeled as an intrinsic scenario/threshold, not a calibrated winning-price forecast.

### Unknowns / next exact data
Score the same fixed tiers on later exact weeks. Keep the privacy-safe owner-directed player exclusion only as an explicit with/without sensitivity and compare MAD/IQR rules; never delete the raw row. The exact audit did not retain an independently identified runner-up, so that view is only observed minimum minus $1.

**Do not pool these views:** reconstructed decision W4 and exact app W5 are the same Sleeper transaction-index-3 auction. The exact row is primary. Runner-up is only a derived observed-minimum-minus-$1 sensitivity.

| Scope | Tier | Boundary | winner n | minimum / runner-up n | Median ratio | Q1–Q3 | Winner MAE | Minimum MAE | Runner-up-proxy MAE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Exact app W5 (Sleeper decision W4) | High | winner ≥ $80 | 3 | 3 / 3 | 1.26 | 1.17–1.51 | $58.7 | $32.0 | $31.7 |
| Reconstructed cumulative W2–W4 | High | winner ≥ $80 | 10 | 10 / 10 | 1.71 | 1.28–2.39 | $80.7 | $47.9 | $47.3 |
| Exact app W5 (Sleeper decision W4) | Mid | $25–$79 | 4 | 4 / 4 | 1.78 | 1.09–5.54 | $21.0 | $12.5 | $13.0 |
| Reconstructed cumulative W2–W4 | Mid | $25–$79 | 13 | 13 / 13 | 1.10 | 0.77–2.38 | $23.3 | $18.1 | $18.8 |
| Exact app W5 (Sleeper decision W4) | Low | $10–$24 | 3 | 3 / 3 | 0.69 | 0.60–0.96 | $8.0 | $17.3 | $18.3 |
| Reconstructed cumulative W2–W4 | Low | $10–$24 | 6 | 6 / 6 | 2.22 | 0.82–3.61 | $9.2 | $10.7 | $11.3 |

## 5. Whether a nonlinear/tier-aware market-price curve fits better

**Not enough evidence — 0 valid exact prior-week train → later-week test pairs**

### Direct answer
No nonlinear, power-law, piecewise, or liquidity-aware curve is validated yet.

### Key evidence / n
The reconstructed baseline has prior-week-fitted held-out scale checks, but exact Week 5 is a different provenance class and cannot be back-fit and called held out.

### Practical implication
Do not change app formulas. Separate curve shape from weekly market scale when a valid exact train/test sequence exists.

### Unknowns / next exact data
Capture candidate baselines, median remaining FAAB, active liquidity, week, winner, and minimum proxy before each auction; fit prior weeks only and score the next untouched week.

## 6. Weekly #1–#5 price ladder and player-rank relationship

**Directional — 3 distinct auctions: 2 reconstructed + 1 exact**

### Direct answer
The top-five price ladder is visible, but a rank-to-price relationship is not yet comparable across weeks because exact auction-time player rank and liquidity are incomplete.

### Key evidence / n
Each distinct auction shows the first through fifth winning bids and starting-FAAB shares with exact/reconstructed provenance. Sleeper transaction index 3 maps to decision W4 while the app labels that same auction W5, so the exact ladder replaces the reconstructed W4 row.

### Practical implication
Use the ladder to set market-scale expectations, not to claim a stable rank multiplier.

### Unknowns / next exact data
Persist contemporaneous free-agent value rank, position, injury/bye, active-team count, median remaining FAAB, and total active liquidity for every target.

| Auction label | Provenance | #1 | #2 | #3 | #4 | #5 | Context |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Decision W2 | Reconstructed | $285 | $153 | $99 | $75 | $50 | Transaction-ledger FAAB; contemporaneous player rank exists only inside the reconstructed snapshot. |
| Decision W3 | Reconstructed | $234 | $231 | $187 | $103 | $73 | Transaction-ledger FAAB; contemporaneous player rank exists only inside the reconstructed snapshot. |
| App W5 / decision W4 | Exact | $300 | $187 | $128 | $74 | $65 | Exact audit of Sleeper transaction index 3 / decision W4, labeled Week 5 by the app. It replaces—not supplements—the reconstructed W4 ladder. Active-liquidity total was not retained. |

## 7. Claims per manager

**Supported — 107 raw claims; 84 unique manager-target pairs**

### Direct answer
Week 5 contained 23 extra same-manager alternatives beyond 84 unique manager-target pairs; raw claim count therefore overstates independent bidding intent.

### Key evidence / n
Exact post-waiver classification preserves canonical claims, duplicates/alternatives, zero-dollar tokens, roster-full failures, and unknown contingencies separately.

### Practical implication
Use canonical manager-target claims for participation and keep raw count as process/contingency context.

### Unknowns / next exact data
One auction cannot define a manager’s usual claim volume. Repeat per-manager distributions, wins, and spend across exact weeks.

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

**Directional — 5/6 reconstructed top-winner follow-ups had lower next-week winning spend**

### Direct answer
The reconstructed direct slice leans toward lower next-week winning spend, but repeated managers, zero-win weeks, and non-exact history prevent a behavioral conclusion.

### Key evidence / n
For each reconstructed week’s top three distinct winning managers (highest winning bid per manager), the table shows prior and next raw/canonical claims, serious/heavy bids, wins, and spend. A no-win follow week contributes $0 winning spend but remains visible rather than disappearing.

### Practical implication
Use this only as a budget-monitoring cue; do not reduce forecasts mechanically after a win.

### Unknowns / next exact data
Continue the same manager-linked table with exact weekly snapshots, remaining-FAAB-normalized bid amount, same-position activity, and explicit no-claim outcomes.

| Week | Top winner | Winning spend | Prior-week history | Next-week history |
| --- | --- | --- | --- | --- |
| W2 | History manager 05 | $285 | 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position | 3 raw / 3 canonical; 3 serious; 2 heavy; 1 wins; $50 spend; 41.0% bid volume / starting FAAB; 31.8% mean bid / pre-bid FAAB; 0 same-position |
| W2 | History manager 28 | $153 | 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position | 5 raw / 5 canonical; 3 serious; 1 heavy; 0 wins; $0 spend; 21.4% bid volume / starting FAAB; 10.3% mean bid / pre-bid FAAB; 0 same-position |
| W2 | History manager 02 | $99 | 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position | 9 raw / 8 canonical; 8 serious; 2 heavy; 2 wins; $91 spend; 56.0% bid volume / starting FAAB; 8.9% mean bid / pre-bid FAAB; 0 same-position |
| W3 | History manager 14 | $234 | 4 raw / 4 canonical; 3 serious; 3 heavy; 0 wins; $0 spend; 70.0% bid volume / starting FAAB; 23.3% mean bid / pre-bid FAAB; 2 same-position | 4 raw / 4 canonical; 2 serious; 1 heavy; 1 wins; $17 spend; 34.2% bid volume / starting FAAB; 32.3% mean bid / pre-bid FAAB; 1 same-position |
| W3 | History manager 07 | $231 | 6 raw / 6 canonical; 5 serious; 2 heavy; 1 wins; $11 spend; 51.4% bid volume / starting FAAB; 10.3% mean bid / pre-bid FAAB; 0 same-position | 1 raw / 1 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position |
| W3 | History manager 16 | $103 | 3 raw / 3 canonical; 2 serious; 2 heavy; 0 wins; $0 spend; 31.0% bid volume / starting FAAB; 15.5% mean bid / pre-bid FAAB; 1 same-position | 3 raw / 3 canonical; 3 serious; 3 heavy; 1 wins; $128 spend; 99.8% bid volume / starting FAAB; 42.3% mean bid / pre-bid FAAB; 0 same-position |
| W4 | History manager 24 | $300 | 4 raw / 4 canonical; 1 serious; 1 heavy; 0 wins; $0 spend; 38.0% bid volume / starting FAAB; 38.8% mean bid / pre-bid FAAB; 0 same-position | 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position |
| W4 | History manager 11 | $187 | 13 raw / 12 canonical; 5 serious; 2 heavy; 0 wins; $0 spend; 44.0% bid volume / starting FAAB; 8.8% mean bid / pre-bid FAAB; 3 same-position | 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position |
| W4 | History manager 16 | $128 | 5 raw / 5 canonical; 3 serious; 1 heavy; 1 wins; $103 spend; 35.2% bid volume / starting FAAB; 11.7% mean bid / pre-bid FAAB; 1 same-position | 0 raw / 0 canonical; 0 serious; 0 heavy; 0 wins; $0 spend; 0.0% bid volume / starting FAAB; 0.0% mean bid / pre-bid FAAB; 0 same-position |

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
- Exact and reconstructed provenance are not interchangeable.

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
| Max VORP | 240 | $33.4 | $-13.6 | 0.286 |
| Current VORP | 240 | $34.1 | $-18.5 | 0.201 |
| Legacy Aggressive | 240 | $46.3 | $26.1 | -0.086 |

## Full predeclared winning-bid sensitivities
| Sensitivity case | n wins | Max VORP MAE | Middle VORP MAE | Current-team VoRP MAE | Corrected Safe (PR #13) MAE | Corrected Weeks as Starter (PR #13) MAE | Legacy Safe MAE | Legacy Aggressive MAE | Legacy Weeks as Starter MAE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| All usable winning bids | 72 | $26.5 | $32.2 | $27.6 | $23.5 | $24.7 | $24.9 | $20.2 | $26.5 |
| Non-token winning bids | 42 | $44.1 | $54.4 | $45.9 | $38.1 | $41.3 | $40.7 | $33.5 | $44.5 |
| Non-token; ratio-gap flag removed | 41 | $40.0 | $50.0 | $41.8 | $34.2 | $36.9 | $36.8 | $29.1 | $40.1 |
| Non-token; MAD flag removed | 38 | $35.2 | $45.3 | $36.5 | $30.2 | $32.7 | $32.6 | $27.8 | $36.0 |
| Non-token; IQR flag removed | 38 | $35.1 | $45.0 | $36.4 | $30.0 | $32.4 | $32.8 | $27.8 | $35.9 |

## Deterministic cluster-bootstrap check
| Strategy | n wins | MAE | 95% cluster-bootstrap MAE CI |
| --- | --- | --- | --- |
| Max VORP | 72 | $26.5 | $16.3–$38.4 |
| Middle VORP | 72 | $32.2 | $20.9–$45.1 |
| Current-team VoRP | 72 | $27.6 | $16.8–$39.9 |
| Corrected Safe (PR #13) | 72 | $23.5 | $14.3–$34.5 |
| Corrected Weeks as Starter (PR #13) | 72 | $24.7 | $14.9–$36.3 |
| Legacy Safe | 72 | $24.9 | $15.1–$36.1 |
| Legacy Aggressive | 72 | $20.2 | $12.4–$29.8 |
| Legacy Weeks as Starter | 72 | $26.5 | $16.3–$38.0 |

## Privacy-safe owner-directed exclusion sensitivity
| View | Clusters | Closest | Max VORP MAE | Current-team VoRP MAE | Corrected Safe MAE | Corrected Weeks as Starter MAE |
| --- | --- | --- | --- | --- | --- | --- |
| Without privacy-safe owner-directed marker | 41 | Current-team VoRP | $14.0 | $13.8 | $22.9 | $17.3 |
| With marked target retained | 42 | Current-team VoRP | $14.0 | $13.7 | $22.2 | $17.4 |

## Prior-week-fitted held-out checks (reconstructed only)
| Observation | Strategy | Fit→test | Scale | test n | MAE | Bias | Raw held-out R²* | Spearman ρ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Winner | Max VORP | W2→W3 | 1.742 | 11 | $24.7 | $-9.6 | 0.69 | 0.91 |
| Winner | Current-team VoRP | W2→W3 | 1.742 | 11 | $26.3 | $-17.2 | 0.56 | 0.91 |
| Winner | Corrected Safe | W2→W3 | 0.794 | 11 | $37.3 | $-29.1 | 0.27 | 0.91 |
| Winner | Corrected Weeks as Starter | W2→W3 | 1.414 | 11 | $28.9 | $-14.2 | 0.64 | 0.87 |
| Winner | Max VORP | W3→W4 | 1.667 | 11 | $32.5 | $-24.5 | 0.69 | 0.90 |
| Winner | Current-team VoRP | W3→W4 | 1.808 | 11 | $33.4 | $-23.7 | 0.62 | 0.89 |
| Winner | Corrected Safe | W3→W4 | 1.067 | 11 | $37.7 | $-22.0 | 0.46 | 0.93 |
| Winner | Corrected Weeks as Starter | W3→W4 | 1.764 | 10 | $24.5 | $-11.4 | 0.80 | 0.88 |
| Serious-market median | Max VORP | W2→W3 | 1.400 | 10 | $22.7 | $22.2 | -1.20 | 0.91 |
| Serious-market median | Current-team VoRP | W2→W3 | 1.400 | 10 | $15.9 | $15.5 | -0.02 | 0.91 |
| Serious-market median | Corrected Safe | W2→W3 | 0.698 | 10 | $10.4 | $8.0 | 0.51 | 0.91 |
| Serious-market median | Corrected Weeks as Starter | W2→W3 | 1.161 | 10 | $26.6 | $19.4 | -1.73 | 0.88 |
| Serious-market median | Max VORP | W3→W4 | 0.822 | 10 | $22.2 | $-21.1 | 0.49 | 0.75 |
| Serious-market median | Current-team VoRP | W3→W4 | 0.956 | 10 | $20.7 | $-18.5 | 0.48 | 0.72 |
| Serious-market median | Corrected Safe | W3→W4 | 0.616 | 10 | $21.7 | $-14.6 | 0.38 | 0.78 |
| Serious-market median | Corrected Weeks as Starter | W3→W4 | 0.783 | 10 | $18.2 | $-17.3 | 0.54 | 0.77 |

Only these rows fit a scale, using the prior reconstructed week and scoring the next. No exact nonlinear, tier, intercept, or liquidity model was fit; exact app W5 is not back-fit or called held out.

## Source-hash lineage
| Source label | Evidence class | SHA-256 |
| --- | --- | --- |
| week-5-manager-predictions.csv | Exact Week 5 | a36ccdf7afa3dc43f2145a3e2de69f21938f7a6377922025daefa371c544bc15 |
| week-5-player-summary.csv | Exact Week 5 | 73a9954c755e7ff5299de1b33ba045ca5f4fd727346d9d6cebd28447e8e8efd2 |
| week-5-post-waiver-manager-comparison.csv | Exact Week 5 | 7d03f127981720e0494fdb34379254ca1cb6c83972a500f6d24b2c54951838d1 |
| week-5-post-waiver-player-comparison.csv | Exact Week 5 | 5c73337d78c193e1638d990d07d5cb2dbf39b902be1f338a54bc1d25ce94690a |
| week-5-pre-waiver.json | Exact Week 5 | cbc1f7d92a5c3c393640d09940a5b52d2130de4f174b5a6fbcac5e3fd622b38f |
| week-5-post-waiver-classified-claims.json | Exact Week 5 | 903a5ca60e7efecd752751f30f435360afe34fcb2bf3fb730b71974e76f0a80b |
| bidding-strategy-seamex-2026.json | Reconstructed Weeks 2–4 | 9d5ea0aa16bf1128e810abd91c1cfd84fb7dfd7b0523393fa5afe5ced4c027d3 |
