# HANDOFF — Recurring owner decision report refresh (2026-10-07)

## Current state

Implementation is complete and verified in this worktree; commit/push are pending final review. The report pipeline now ingests the refreshed exact canonical decision-Week-5 evidence while keeping the frozen owner-specific 30-row panel and reconstructed W2–W4 history in separate evidence classes. No product bidding formula changed. Do not merge/deploy without owner authorization.

## What changed

- Refreshed `scripts/fixtures/bidding-strategy-seamex-2026.json` from the detached read-only audit (W2/W3/W4 reconstructed; W5 exact; event counts 130/158/128/112).
- Added explicit owner-fixture coordinates and future exact-fixture discovery/deduplication.
- Added coefficient/tier/proxy, forecast-band, robust/owner-directed, claims-distribution, provenance, and two-panel calibration outputs. Q4 contains only six exact-W5 all-tier winner/minimum coefficient rows; the exhaustive matrix is Appendix C-only. Claims distributions explicitly identify their single exact owner-audit week and why cumulative canonical context is unsupported.
- Updated weekly market provenance and W4→W5 exact held-out scoring.
- Regenerated Markdown/HTML/PDF twice with matching hashes:
  - Markdown `c5cc9f4c5963af7a86a2b11f46c9f44c5ac6dce9c197e78d32bf0b6efc3dd6f3`
  - HTML `7f9e30b8ee3f3012f8dc69f024b3b4809526265ceebe4bcf8ae28d85aead967a`
  - PDF `e17d23862b92b2456952752f9dd54e4e8307184055147b9f7b8450e3f58b95e`

## Review priorities

1. Check `scripts/owner-decision-report.ts` evidence boundaries: owner exact app W5/decision W4, canonical reconstructed W2–W4, canonical exact W5.
2. Check `scripts/generate-bidding-analysis-presentation.ts` two-panel SVG, coefficient tables, named Monangai sensitivity placement (appendix only), claims quantiles, and exact-data discovery.
3. Check that Q5 remains `Not enough evidence` despite one reconstructed-prior→exact-later score pair.
4. Verify direct tables remain aliased and non-bids/contingencies/FAAB censoring remain explicit.

## Validation

- Owner presentation tests: 16 passed.
- Weekly market + strategy tests: 12 passed.
- Pre-waiver capture tests: 8 passed (36 focused tests total).
- Deterministic generation, `git diff --check`, output guards, bounded secret scan, and PDF parse/type checks passed.
- Full `npm run lint`, `npm run typecheck`, and capped serial production `npm run build` passed. The four relevant suites pass together after giving the deterministic presentation test a 15-second budget.

## Known gaps

- Q1 cannot advance until a matching future owner-specific 30-row pre-waiver panel exists.
- No exact-prior→exact-later sequence yet; do not promote a coefficient or fitted curve.
- Median/high bands and time-aligned positional need/liquidity controls were not retained for the historical owner audit.

---

# IMPLEMENTATION COMPLETE — Non-VORP replacement-level zeroing (2026-09-27)

## Status

Implemented the approved `PLAN COMPLETE` semantics on `fix/non-vorp-replacement-zeroing`, based on origin/main merge `47f031d`. Independent review, hosted preview QA, and CI are complete. Custom valuations remain a separate P2 and were not touched.

## Review-only PR / final independent verification

- Implementation commit: `7d86b2d3ca079434cf87315cc43ced1149cc4999` on `fix/non-vorp-replacement-zeroing`; pushed only to that feature branch.
- Review-only PR: <https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/13> targeting `main`.
- Exact Azure environment obtained from `az staticwebapp environment list --name guillotine-companion`: <https://nice-moss-07ec56310-13.centralus.7.azurestaticapps.net> (`buildId=13`, source branch `fix/non-vorp-replacement-zeroing`, `Ready`).
- GitHub CI `build` and Azure `Build and Deploy` passed; PR #13 was independently confirmed open, mergeable, and `CLEAN` after the verification evidence update.
- Orchestrator independently reran focused waiver/ranking tests (**42 passed**), full frontend (**25 files / 173 tests**), API (**36 passed**), lint (0 errors; one pre-existing badge warning), typecheck, production build, live analysis/report guards, `git diff --check`, and changed-line secret scan — all passed.
- Hosted real SeaMex desktop QA at 1440×900: all four strategies switched correctly; with rostered players shown, Safe rendered **192 positive / 253 zero**, Weeks-as-Starter **181 / 264**, Aggressive **181 / 264** (top `$203`), and Max VORP rendered meaningful cards. Hiding rostered players reduced the UI from 445 to 37 displayed cards, all naturally `$0` in this deep current league.
- Hosted 390×844 QA: Max VORP, Safe, Weeks-as-Starter, and Aggressive controls all remained usable; rostered expansion showed 445 cards and Aggressive **181 positive / 264 zero**; page width was 384px with 384px content width (no horizontal overflow), the first card fit within the viewport, and the browser console had zero errors. Toggling rostered players off restored 37 `$0` available cards.
- Safety: PR remains review-only and unmerged. No production deployment, manual workflow dispatch, production-data change, or Supabase mutation occurred.

## Exact implementation and design semantics

- Extracted one **private generic optimized slot allocator** in `src/logic/waivers.ts`: direct QB/RB/WR/TE slots first, then one shared remaining-player FLEX pool, then one shared remaining-player SUPER_FLEX pool. Every slot is allocated exactly once.
- Preserved public `buildOptimizedStarterPool` Max-VORP semantics exactly: QB/RB/WR/TE, finite `totalPoints` including zero, descending `totalPoints`, ascending `playerId` ties, existing output shape/completeness.
- Added one non-VORP selected-source model per `buildWaiverBoard` call (not per row): eligibility is QB/RB/WR/TE with finite `pointsPerWeek > 0`; order is descending points/week then ascending player ID. It computes selected-source position ranks, exact current selected counts, and fresh selected-ID sets for every existing modeled stage.
- Safe uses exact selected count `R` for the row's position: `0` for `R<=1` or `r>=R`; `1.25` for rank one; otherwise `1.1*(R-r)/(R-1)`. Existing position weights, $200/$1000 base, budget scaling, nonnegative rounding, and source-relative ordering remain.
- Weeks-as-Starter counts actual player-ID membership in each fresh stage pool. Existing `buildLeagueContext`, fixed elimination cadence, week denominator, and survivor progression are unchanged.
- Aggressive remains exactly `round(corrected Weeks * predictedBidMultiplier(currentWeek))`.
- No arbitrary display clamp, no custom-valuations work, and no Max-VORP formula/selector/calibration/output dependency was introduced.

## Test-first red → green

Before implementation, the new focused tests produced **11 expected failures**: replacement boundaries stayed positive, lower ranks retained positive tails, FLEX/SUPER_FLEX were multiplied independently across positions, sparse `R=1` stayed positive, tied boundary IDs were wrong, actual stage membership was overcounted, and arbitrary-context monotonic/zero expectations failed. The pre-extraction Max-VORP mixed FLEX/SUPER_FLEX selected-ID golden passed and now protects wrapper semantics.

Green coverage now includes:
- no FLEX, multiple FLEX, FLEX+SUPER_FLEX, exact one-time shared-slot counts;
- exact selected boundary and all-below zero, one-above positive, rank-one premium;
- `R=0`/`R=1`, sparse/missing/nonfinite/nonpositive/all-zero, supported-position filtering;
- deterministic selected-source ties;
- team counts 1/2/4/16/17/28/32, weeks 0/1/14, budgets 0/500/1000/NaN/negative, and lineup variants;
- actual selected-ID membership at every existing modeled stage and exact Aggressive derivation;
- Sleeper, FantasyCalc, and FantasyPros ownership of position rank and shared-slot ordering;
- Max-VORP mixed FLEX/SUPER_FLEX selected IDs, finite-zero eligibility, and existing numeric golden.

## SeaMex live comparison

Reproducible command: `npm run analyze:non-vorp`. Final report: `docs/analysis/non-vorp-seamex-2026.md`; live capture `2026-09-28T02:03:57.522Z`, Sleeper ROS PPR, Weeks 4–18, lineup `QB/RB/RB/WR/WR/TE/FLEX/K/DEF`, 28 active teams, 14 modeled stages, $500 budget, 445 positive finite supported rows, 161 actual available supported rows. The report hard-fails on invalid/nonfinite context/stage counts, incomplete pools, `NaN`, or `[object Object]`; boundary labels use exact current optimized selected counts.

Frozen BEFORE baseline (approved earlier capture):
- Safe: **272** positive / 173 zero — QB30/RB91/WR91/TE60.
- Weeks: **248** / 197 — QB28/RB84/WR84/TE52.
- Aggressive: **248** / 197 — QB28/RB84/WR84/TE52.

Final live AFTER:
- Safe: **192** positive / 253 zero — QB27/RB55/WR80/TE30.
- Weeks: **181** / 264 — QB26/RB52/WR76/TE27.
- Aggressive: **181** / 264 — QB26/RB52/WR76/TE27.
- Exact current boundaries: QB **Geno Smith #28**, RB **Brian Robinson #56**, WR **Calvin Ridley #81**, TE **Colby Parkinson #31**; each boundary and every lower rank is $0.
- Last Safe positives: Jameis Winston QB27 $3; Raheim Sanders RB55 $2; Demarcus Robinson WR80 $1; Greg Dulcich TE30 $1.
- Last Weeks positives: Daniel Jones QB26 $1; Chris Rodriguez RB52 $1; Tyquan Thornton WR76 $1; Terrance Ferguson TE27 $1. Aggressive has the same cutoffs at $2.
- Actual currently available rows: 161; all 161 are $0 in all three corrected strategies on this very deep 28-team capture.
- Max VORP evidence: 192 positive calibrated values on the same live input; existing RB10 golden remains VORP 35.82/raw 193.951864/$194 and exact selected-ID/zero-eligibility tests pass.

The report labels the frozen baseline versus live capture explicitly; future Sleeper endpoint or ownership changes are live-data drift.

## Changed files

- `src/logic/waivers.ts` — generic allocator and one-time non-VORP current/stage model; corrected Safe/Weeks/Aggressive.
- `src/logic/__tests__/waivers.test.ts` — focused boundaries, pools, edges, stages, derivation, Max-VORP golden.
- `src/logic/__tests__/rankingSources.test.ts` — cross-source position/FLEX ownership and zero-normalized eligibility.
- `scripts/analyze-non-vorp.ts` — reproducible live SeaMex capture and guarded report generation.
- `docs/analysis/non-vorp-seamex-2026.md` — exact context, stages, boundaries, before/after, cutoffs, available rows, representative values, Max-VORP evidence.
- `package.json` — `analyze:non-vorp` script.
- `PROGRESS.md` and `HANDOFF.md` — approved plan preserved; implementation/results prepended/recorded.

## Verification

- `npm test -- --run src/logic/__tests__/waivers.test.ts src/logic/__tests__/rankingSources.test.ts` — **50 passed**.
- `npm test` — **25 files, 173 passed**.
- `node --test api/test/*.test.js` — **36 passed**.
- `npm run typecheck` — passed.
- `npm run lint` — passed with one pre-existing unrelated `react-refresh/only-export-components` warning in `src/components/ui/badge.tsx`; zero errors.
- `npm run build` — passed; production Vite build generated successfully.
- `npm run analyze:non-vorp` plus report guards — passed; 14 complete stages, expected 192/181/181 after counts, no `NaN`/`[object Object]`.
- `git diff --check` — passed.
- Changed-file secret-pattern scan — passed.
- Diff inspection — no Max-VORP formula/selector/calibration changes; no custom-valuation changes.
- Browser smoke test against real SeaMex: desktop and 390×844; Safe, Weeks-as-Starter, Aggressive, and Max VORP switch successfully; 37 available cards render; no horizontal overflow at 390px.

## Delivery / caveats

- Implementation commit `7d86b2d3ca079434cf87315cc43ced1149cc4999` was pushed to `origin/fix/non-vorp-replacement-zeroing`; PR #13 and exact preview are recorded in the final independent-verification section above.
- PR remains open and review-only; no merge, production deploy/manual workflow dispatch, or Supabase/production-data mutation occurred.
- The first attempted API command used Vitest against Node test-runner files, so TAP bodies ran but Vitest reported `no suite found`; root cause was runner mismatch. The correct `node --test api/test/*.test.js` command passed all 36 tests.

---

# 2026-09-27 18:51 PDT — PLAN COMPLETE: Correct non-VORP replacement-level zeroing

## Status and scope

**Status: PLAN COMPLETE.** Investigation/design only; no application source, test, commit, branch, PR, or deployment changes were made. This section specifies the implementation semantics for the top P0 only: Safe, Weeks-as-Starter, and Aggressive. Custom valuations and all other roadmap items remain out of scope.

Branch/fixture base is `fix/non-vorp-replacement-zeroing` at `47f031d` (the exact `origin/main` merge of PR #11). `PROGRESS.md` and the older handoff history below were read first.

## Diagnosis verified

Current code confirms the reported defect:

- `safeStrategy()` (`src/logic/waivers.ts:360-368`) gets `startersAtPos` from `starterCountForPos()` (`:389-397`). One FLEX is independently added to RB, WR, **and** TE; one SUPER_FLEX would be independently added to QB. In SeaMex's `QB RB RB WR WR TE FLEX` lineup this creates nominal pools QB 28, RB 84, WR 84, TE 56, although there are only 196 real core starter assignments and the FLEX contribution can only be 28 players total.
- For 1-based positional rank `r` and inflated slot count `N`, non-top Safe uses `max(0, 1.1 - r/N)`. It therefore stays mathematically positive while `r < 1.1N`; integer-dollar rounding happens to zero the very thinnest tail. This is not a replacement-boundary formula.
- `projectedStarterWeeks()` repeats the same independently inflated per-position threshold at each modeled stage. `weeksStarterStrategy()` is `round(Safe * starterWeeks / weeksRemaining)`. Aggressive is then `round(Weeks * predictedBidMultiplier(currentWeek))`, so both inherit the defect.
- `buildOptimizedStarterPool()` already fills direct slots, then one shared FLEX pool, then one shared SUPER_FLEX pool without duplicate players. It is currently used by calibrated/Max VORP and compares Sleeper `totalPoints`. The allocation plumbing is reusable, but non-VORP must supply the selected display source's ranking score and must not call into Max-VORP calibration/value logic.

Relevant history checked:

- `9bccb44` introduced the rank-tail Safe formula.
- `ca512d1` made the chosen projection/ranking source authoritative for ranks and Safe/Weeks/Aggressive.
- `88c8cac` made Aggressive derive from player-specific Weeks-as-Starter.
- `7c32a1f` introduced the one-time FLEX/SUPER_FLEX optimized starter pool for calibrated VORP.
- `f51932b` added Max VORP while retaining that pool.
- `47f031d` is the current merge/base. None of this history gives non-VORP an intended positive tail beyond replacement.

## Executed CURRENT/BEFORE analysis — real SeaMex data

### Reproducible fixture identity

- Generated: `2026-09-28T01:49:35.020Z` (`2026-09-27 18:49:35 PDT`).
- League: **private 32-team guillotine fixture**, private league identifier redacted, season 2026.
- Selected display source: **Sleeper ROS** (the app's default selected source), live Sleeper projection endpoint.
- Scoring: PPR. Initial FAAB: `$500`.
- Lineup: `QB, RB, RB, WR, WR, TE, FLEX` plus K/DEF/bench; no SUPER_FLEX.
- Sleeper NFL state at capture: season 2026, Week 4, previous Week 3, league `last_scored_leg=2`.
- ROS projection window loaded: Weeks 4-18 (15 endpoint weeks); 1,151 projected players total; 445 positive-projection QB/RB/WR/TE players analyzed league-wide.
- Actual eliminations/context: 28 active teams, `ctx.currentWeek=4`, `ctx.weeksRemaining=14`, fixed current cadence 2 chops/week, modeled stages 28,26,...,2.
- Board was intentionally generated with `maxPerPos=Infinity`; counts therefore measure the full selected-source valuation distribution rather than the UI's display cap. A secondary actual-unrostered check found 161 currently available supported rows.

### Current optimized-pool reference (not what current non-VORP uses)

The existing allocator selected all 196 required assignments exactly once:

- QB 28; final selected QB / positional boundary: Geno Smith, rank 28.
- RB 56; boundary: Brian Robinson, rank 56.
- WR 81; boundary: Calvin Ridley, rank 81.
- TE 31; boundary: Colby Parkinson, rank 31.

The 28 shared FLEX assignments therefore resolve to `0 QB + 0 RB + 25 WR + 3 TE` after direct slots (`28 QB + 56 RB + 56 WR + 28 TE`). Current Safe instead counts the same FLEX as 28 extra RB **and** 28 extra WR **and** 28 extra TE, a 56-player overcount.

### BEFORE distributions over all 445 positive-source QB/RB/WR/TE rows

- **Safe: 272 positive / 173 exactly $0.**
  - QB: 30 positive / 7 zero; last positive Fernando Mendoza, rank 30, `$2`, 203.35 ROS / 13.557 PPG; rank 31 is first zero. Actual optimized boundary is rank 28, yet rank 28 and two players below it remain positive.
  - RB: 91 / 19; last positive Jeremy McNichols, rank 91, `$2`, 53.49 / 3.566; rank 92 first zero. Actual boundary is rank 56, so 35 below-boundary RBs remain positive.
  - WR: 91 / 91; last positive Omar Cooper, rank 91, `$2`, 54.89 / 3.659; rank 92 first zero. Actual boundary is rank 81, so 10 below-boundary WRs remain positive.
  - TE: 60 / 56; last positive Adam Trautman, rank 60, `$1`, 46.46 / 3.097; rank 61 first zero. Actual boundary is rank 31, so 29 below-boundary TEs remain positive.
- **Weeks-as-Starter: 248 positive / 197 exactly $0.**
  - QB 28 / 9; last positive Geno Smith rank 28 `$1`, 238.91 ROS / 15.927 PPG.
  - RB 84 / 26; last positive Connor Heyward rank 84 `$1`, 62.60 / 4.173.
  - WR 84 / 98; last positive Antonio Williams rank 84 `$1`, 64.19 / 4.279.
  - TE 52 / 64; last positive Zach Ertz rank 52 `$1`, 57.29 / 3.819 (rounding zeroes ranks 53-56 even though inflated membership includes them).
- **Aggressive: 248 positive / 197 exactly $0.** At Week 4 the multiplier is `2 * (1 - 3/16) = 1.625`, so it has the same positive membership as Weeks in this fixture; the four last positives above are `$2`.

Secondary actual-unrostered board check (161 current supported rows): Safe 27 positive / 134 zero; Weeks 12 / 149; Aggressive 12 / 149. That smaller count depends on current Sleeper ownership and is not suitable for defining a league-wide replacement boundary, but confirms the executed logic on the UI-eligible population too.

### Representative current top order/value

Safe and Weeks are identical for players projected to start all 14 modeled weeks:

1. Jahmyr Gibbs RB1 `$125`
2. Puka Nacua WR1 `$125`
3. Jaxon Smith-Njigba WR2 `$108`
4. Bijan Robinson RB2 `$108`
5. Jonathan Taylor RB3 `$106`
6. Amon-Ra St. Brown WR3 `$106`

Aggressive preserves that order at Week 4 and returns `$203, $203, $176, $176, $172, $172` respectively. This top behavior is evidence to preserve; the bug is the replacement tail and independently inflated membership.

### Current boundary semantics (incorrect)

There is no actual non-VORP replacement boundary. Current Safe's tail ends only when the rank formula or integer rounding reaches zero; current Weeks tests membership against `(base + every eligible shared slot) * teams` separately per position. Thus the final truly selected starter is still positive, and many non-selected players can also be positive. This directly violates the P0 acceptance criterion.

## Implementation semantics — no decisions left to the implementer

### 1. Generic optimized allocation, source-specific score

Extract only the roster-slot allocator into a private generic helper in `src/logic/waivers.ts`. The helper accepts eligible records plus a descending comparator/score selector; it knows nothing about VORP, calibration, dollars, or strategy names.

For non-VORP, eligibility is:

- position exactly QB/RB/WR/TE;
- selected display source `pointsPerWeek` is finite and strictly `> 0`;
- score is that `pointsPerWeek` (Sleeper projected PPG, FantasyCalc's monotonic normalized cross-position score, or FantasyPros ECR's monotonic normalized cross-position score);
- descending score, then ascending `playerId` as the deterministic tie-breaker. Positional ranks must use this exact ordering too.

Allocation for integer `T=max(0,floor(teamCount))`:

1. Start with an empty selected-ID set.
2. For each position QB, RB, WR, TE, select its highest remaining `max(0, slotCount[position]) * T` players.
3. Select the highest remaining RB/WR/TE players for exactly `max(0,FLEX) * T` assignments.
4. Select the highest remaining QB/RB/WR/TE players for exactly `max(0,SUPER_FLEX) * T` assignments.
5. Never select an ID twice. If source supply is sparse, fill as many assignments as possible and mark the result incomplete; never invent players.

Why this allocates each shared slot once: direct selections are disjoint by position; both shared passes exclude the accumulated selected-ID set; FLEX performs one slice of size `FLEX*T`, not one slice per eligible position; SUPER_FLEX performs one slice of size `SUPER_FLEX*T` after FLEX. FLEX eligibility is a subset of SUPER_FLEX eligibility, so narrow FLEX first and broad SUPER_FLEX second maximizes the selected score without consuming a QB in a FLEX assignment. With adequate supply, selected count is exactly `T*(QB+RB+WR+TE+FLEX+SUPER_FLEX)`.

No FLEX means step 3 selects zero. Multiple FLEX and/or SUPER_FLEX slots simply multiply once by `T`. A position with zero direct slots can still have a replacement count if its players actually win FLEX/SUPER_FLEX assignments. If it wins none, its replacement count is zero and every player at that position receives `$0` from all three non-VORP strategies. Unsupported positions always receive `$0`/are excluded from this model.

### 2. Exact replacement boundary

For each supported position `p`, let `R_p` be the number of players of position `p` in the optimized **current-team** pool. Because each pass always takes the best remaining selected-source scores, those players are the contiguous positional ranks `1...R_p`.

**The final selected positional player, rank `R_p`, is deliberately the zero-valued replacement boundary.** This is required. Every positional rank `r >= R_p` is exactly `$0`; every row not eligible for the pool is also `$0`.

Special cases:

- `R_p=0`: no boundary player exists; all values at the position are zero.
- `R_p=1`: the sole selected player is both rank one and the boundary; boundary semantics win, so it is zero. Do not apply the rank-one premium.
- Sparse source: use the players actually selected. The last available selected player is the boundary; an underfilled pool is never padded.
- Missing, non-finite, non-positive, or all-zero source scores are not eligible. If all scores are zero, all values are zero.
- Ties retain ordinal ranks using ascending `playerId`; this is the existing deterministic convention. Do not switch to competition ranks. A tie at a cutoff is deterministically split for membership, but the selected boundary and all excluded tied players are all `$0`.

### 3. Recommended Safe formula

Use **1-based** positional rank `r`. For supported eligible players:

```ts
if (R <= 1 || r >= R) premium = 0;
else if (r === 1) premium = 1.25;
else premium = 1.1 * (R - r) / (R - 1);

safe = round((200 * positionWeight * premium / 1000) * nonNegativeBudget)
```

Weights remain exactly `{ QB: 0.75, RB: 1, WR: 1, TE: 0.25 }`. `nonNegativeBudget` is the finite `max(0, ctx.budget)`; a zero/invalid budget returns zero. Clamp the final result non-negative. Do not use projection distance, a Max-VORP bid, a display top-N clamp, or a first-nonselected boundary.

Equivalent 0-based statement: with index `i=r-1` and boundary index `b=R-1`, `i=0` gets 1.25 only when `b>0`; `0<i<b` gets `1.1*(b-i)/b`; `i>=b` gets zero.

Concrete SeaMex `$500` examples:

- RB `R=56`: rank 1 = `$125`; rank 55 (one above boundary) uses `1.1*(1/55)` and is `$2`; rank 56 boundary = `$0`; rank 57 below = `$0`.
- QB `R=28`: rank 27 is `$3`; rank 28 and below are `$0`.
- WR `R=81`: rank 80 is `$1`; rank 81 and below are `$0`.
- TE `R=31`: rank 30 is `$1`; rank 31 and below are `$0`.

The formula is monotone non-increasing within each position, preserves the existing explicit rank-one premium, keeps values proportional to league budget before integer rounding, and retains source-relative positional order. Position weights intentionally preserve the strategy's existing cross-position identity; equal dollar rounding is allowed.

### 4. Formula alternatives considered and rejected

1. **Recommended normalized old shape:** `1.1*(R-r)/(R-1)` for ranks 2 through `R-1`, with rank one overridden to 1.25. It lands exactly on zero at the selected boundary while keeping the old near-top ~1.1 shoulder and conservative linear rank shape.
2. **Subtract the old 10% tail:** `max(0,1-r/R)`. It also zeroes the boundary but drops rank two from roughly 1.1 to below 1.0 and unnecessarily discounts the entire useful starter tier. This changes established top/upper-tier behavior more.
3. **Make the first non-selected player the boundary:** formulas zeroing rank `R+1` leave the final selected replacement player positive. This directly fails the acceptance criterion and is rejected.
4. **Projection-distance VORP / Max VORP:** rejected by scope and strategy identity; Safe must stay rank-shaped and source-relative.

### 5. Weeks-as-Starter membership and denominator

Compute one non-VORP optimized pool for **every existing modeled stage**, and count actual player IDs, not a positional rank threshold.

Preserve the current survivor/calendar contract exactly (do not alter `buildLeagueContext` in this P0):

```ts
fixedElims = ctx.teamsRemaining > 16 ? 2 : 1;
teams = ctx.teamsRemaining;
for (w = 0; w < ctx.weeksRemaining && teams > 1; w++) {
  stageWeek = ctx.currentWeek + w;
  stagePool = optimizedSelectedSourcePool(teams);
  if (stagePool.selectedIds.has(playerId)) starterWeeks++;
  teams = max(1, teams - fixedElims);
}
possibleStarterWeeks = ctx.weeksRemaining;
weeksBid = possibleStarterWeeks > 0
  ? round(safeBid * starterWeeks / possibleStarterWeeks)
  : 0;
```

This deliberately preserves current fixed-cadence progression rather than broadening this bug fix into elimination/calendar redesign. For the captured SeaMex context, denominator is 14, stages correspond to Weeks 4-17, and team counts are exactly `28,26,24,22,20,18,16,14,12,10,8,6,4,2`. The same selected-source score snapshot is used at every stage; only slot demand/team count changes. The executed design simulation's actual `[QB,RB,WR,TE]` optimized membership counts were: 28 teams `[28,56,81,31]`; 26 `[26,52,76,28]`; 24 `[24,48,69,27]`; 22 `[22,44,62,26]`; 20 `[20,40,56,24]`; 18 `[18,36,52,20]`; 16 `[16,33,47,16]`; 14 `[14,30,40,14]`; 12 `[12,27,33,12]`; 10 `[10,23,27,10]`; 8 `[8,20,20,8]`; 6 `[6,16,14,6]`; 4 `[4,10,10,4]`; 2 `[2,5,5,2]`. Each row sums to exactly seven starter assignments per team. Do not claim future per-week projection refreshes that the input does not contain.

Each stage must run the full shared-slot optimizer. Do **not** derive later membership from `(base+FLEX)*teams`, current positional `R`, or Max-VORP's best stage. `starterWeeks` is the count of stage sets containing that exact ID. Keep `possibleStarterWeeks` and the returned row field equal to `ctx.weeksRemaining`, including zero-week handling. For arbitrary inputs with no modeled stage (`weeksRemaining<=0` or `teamsRemaining<=1`), starterWeeks and Weeks bid are zero.

Captured selected-source stage allocations should be emitted by the regression report so reviewers can see actual positional composition at every team count; assert total selected equals required slots whenever supply is sufficient.

### 6. Aggressive derivation

Do not change its identity:

```ts
aggressive = round(weeksBid * predictedBidMultiplier(ctx.currentWeek));
predictedBidMultiplier(w) = 2 * (1 - clamp((w - 1) / 16, 0, 1));
```

Then retain existing non-negative suggestion normalization. Therefore Safe boundary/below zero implies Weeks zero implies Aggressive zero. Week 1 remains the 2x market premium, Week 9 1x, Week 17+ zero. No historical bids or Max-VORP values enter it.

### 7. Max VORP isolation and no-output-change rule

Refactor `buildOptimizedStarterPool()` only as a wrapper over the generic allocator while preserving its current semantics byte-for-byte at the API level:

- eligibility remains supported positions with finite `totalPoints` (including zero, as today);
- comparator remains descending `totalPoints`, then ascending player ID;
- return order, `requiredSlots`, `complete`, replacement baselines, cache keys, calibrations, and Max-VORP bids remain unchanged.

Add the non-VORP wrapper separately, with positive finite selected-source `pointsPerWeek`. Safe/Weeks/Aggressive may share only the generic slot-allocation primitive with VORP; they must not call `buildVorpCalibration`, `buildMaxVorpCalibration`, `calculatePlayerVorp`, or read Max-VORP output. Lock the current interior Max-VORP fixture (`RB10` team 16, VORP 35.82, raw 193.951864, bid 194) and a mixed FLEX/SUPER_FLEX selected-ID fixture before refactoring, then prove they are unchanged after.

## Expected corrected SeaMex shape (simulation of the specified design, not implemented yet)

Using the same captured fixture and the recommended formula:

- Current boundaries/counts: QB 28, RB 56, WR 81, TE 31.
- Safe positive count should be 192 total: QB 27, RB 55, WR 80, TE 30. Boundary and below account for 253 zeros among the 445 rows.
- Integer rounding plus longevity makes Weeks positive for 181: QB 26, RB 52, WR 76, TE 27. Aggressive at Week 4 has the same positive membership. This is allowed: every above-boundary value is non-negative, but tiny Safe/longevity results can round to `$0`.
- Expected one-above/boundary examples: Safe RB55 `$2` / RB56 `$0`; Weeks RB55 `$0` / RB56 `$0`; Aggressive RB55 `$0` / RB56 `$0`. The important invariant is that no boundary/below player revives in a derived strategy.
- Top Safe/Weeks should remain approximately the existing order and premium. The exact formula gives RB1/WR1 `$125`; upper ranks stay near current values. Aggressive remains the timing-scaled derivative.

Treat these expected counts as regression targets only for the timestamped fixture; live Sleeper data can move, so the checked-in report must record capture time/source/context each run.

## Test-first implementation sequence and exact files

1. **`src/logic/__tests__/waivers.test.ts` — add failing tests first.**
   - Current-pool boundary: parameterized QB/RB/WR/TE fixture where final selected positional player is `$0`, one above is positive for Safe at normal budgets, and every rank below is `$0` for Safe/Weeks/Aggressive.
   - Exact allocation: no FLEX, one FLEX, multiple FLEX, SUPER_FLEX, and both; assert selected IDs are unique and each shared assignment contributes once. Include a fixture whose optimized cross-position FLEX composition differs from adding FLEX to every position.
   - Zero direct-slot position: selected through FLEX/SUPER_FLEX gets a real `R`; otherwise `R=0` and all values zero. Include `R=1` boundary-wins case.
   - Weeks: for each modeled stage, compare `starterWeeks` to explicit selected-ID sets and assert denominator/current week/team sequence. Include a player old inflated rank thresholds would count but optimized sets never contain.
   - Parameterize survivor counts 1 through 32 (including 16/17 transition), supported lineup variants, `weeksRemaining` 0/1/full, and budgets 0/500/1000. Assert finite, monotone, non-negative values and proportional raw scaling subject to documented rounding.
   - Sparse/missing/non-finite/non-positive/all-zero projections and unsupported positions: no throw, no invented membership, all-zero source -> all three zero.
   - Ties: repeated runs choose the same ascending-ID cutoff; boundary/excluded tie members are zero.
   - Preserve rank-one premium and strategy identities; Aggressive exactly equals each row's predicted bid.
   - Add/retain explicit current Max-VORP golden assertions before allocator extraction.
2. **`src/logic/waivers.ts` — implement only after failures exist.**
   - Extract private generic allocator; keep existing Max/VORP wrapper unchanged semantically.
   - Add selected-source non-VORP current/stage pools and positional replacement counts.
   - Replace `starterCountForPos`, old Safe tail, and rank-threshold `projectedStarterWeeks` only for these three strategies.
   - Compute the non-VORP model once per `buildWaiverBoard()` call (current pool + stage sets), not once per row. Pass row/player ID to pure strategy helpers.
   - Do not touch Max VORP formulas, selector behavior, calibration, UI caps, custom valuations, or `buildLeagueContext` progression in this P0.
3. **`src/logic/__tests__/rankingSources.test.ts` — cross-source integration.**
   - Run equivalent boundary/membership fixtures through Sleeper-like projections, FantasyCalc values, and FantasyPros ECR values. Assert each selected source controls both positional order and cross-position shared-slot membership, with boundary/below zero in all three strategies.
4. **`scripts/analyze-non-vorp.ts` + `package.json` (`analyze:non-vorp`) — reproducible evidence.**
   - Promote the temporary live analysis into a checked-in script modeled after `scripts/analyze-max-vorp.ts`.
   - Accept league ID and output path; print capture timestamp, source, scoring, lineup, NFL/current week, active teams, stage counts and per-stage positional membership, total/core/available row universes, per-strategy positives/zeros, position cutoffs/boundaries, and representative top values.
5. **`docs/analysis/non-vorp-seamex-2026.md` — generated BEFORE/AFTER report.**
   - Preserve the timestamped BEFORE numbers above and append one fresh AFTER run from the exact same frozen capture if a fixture is saved; if using live endpoints, clearly label changed upstream timestamp/data and do not present raw count movement as a pure code diff.
6. Run focused tests, full suite, build, and the real report. Review `git diff` to prove no custom valuation or Max-VORP behavior changed.

## Risks and guardrails

- **Cross-position comparability:** FLEX/SUPER_FLEX must use the selected source's cross-position score, not independent positional ranks. The existing external-source normalization is monotonic with FantasyCalc value / FantasyPros overall ECR. Tests must include a shared-slot winner that changes when source changes.
- **Max-VORP regression during extraction:** preserve its `totalPoints` eligibility/comparator, including all-zero behavior, and lock outputs before refactor.
- **Rounding:** a player above the boundary may legitimately round to `$0`, especially TE or one-week longevity. Acceptance requires non-negative above and exact zero at/below; it does not justify artificial `$1` floors.
- **Incomplete pools:** never reinterpret `complete=false` as permission to inflate every position. Use actual selected counts; `R=1` is zero by definition.
- **Tie cutoff:** deterministic ID split is intentional and consistent with current ranking. Do not expand the pool to include all ties, which would violate exact slot allocation.
- **Display availability:** boundaries are computed league-wide from the full selected source, not only currently available/free-agent rows and not `maxPerPos` display rows.
- **Calendar scope:** retain `ctx.weeksRemaining` and current fixed cadence for this P0. A separate future change may reconcile the broader two-above-16/one-below-16 schedule, but mixing it into this fix would obscure zeroing regression evidence.
- **Live-data drift:** record capture timestamps and fixture state. Prefer saving a normalized fixture for exact BEFORE/AFTER comparison.

## Commands executed

```bash
cd /home/john/guillotine-non-vorp-work
git status --short --branch
sed/rg/read of PROGRESS.md, HANDOFF.md, src/logic/waivers.ts,
  src/logic/__tests__/waivers.test.ts, src/logic/__tests__/rankingSources.test.ts,
  src/logic/rankingSources.ts, src/logic/projections.ts, src/pages/WaiversPage.tsx,
  scripts/analyze-max-vorp.ts, api/ecr-rankings/index.js, api/fc-rankings/index.js
git log --oneline --all -- src/logic/waivers.ts src/logic/__tests__/waivers.test.ts scripts/analyze-max-vorp.ts
git show 9bccb44 -- src/logic/waivers.ts src/logic/__tests__/waivers.test.ts
git show ca512d1 -- src/logic/waivers.ts src/logic/projections.ts src/pages/WaiversPage.tsx
git show 88c8cac -- src/logic/waivers.ts src/logic/__tests__/waivers.test.ts
git show 7c32a1f -- src/logic/waivers.ts src/logic/__tests__/waivers.test.ts scripts/analyze-max-vorp.ts docs/MAX-VORP.md
git show f51932b -- src/logic/waivers.ts src/logic/__tests__/waivers.test.ts scripts/analyze-max-vorp.ts docs/MAX-VORP.md
npm ci
npm run analyze:max-vorp -- /tmp/max-vorp-live.md
./node_modules/.bin/tsx /tmp/analyze-non-vorp-before.ts > /tmp/non-vorp-before.json
npx vitest run src/logic/__tests__/waivers.test.ts src/logic/__tests__/rankingSources.test.ts src/pages/WaiversPage.test.tsx
npm test -- --run
npm run build
git status --short --branch
```

Baseline validation before implementation: focused relevant tests **43/43 passed**; full suite **24 files / 162 tests passed**; production build passed. Temporary evidence files are under `/tmp` only and are not repository changes.

---

# Handoff — Non-VORP replacement zeroing (2026-09-27)

John approved starting the dedicated Safe / Weeks-as-Starter / Aggressive correction. Worktree `/home/john/guillotine-non-vorp-work` is branch `fix/non-vorp-replacement-zeroing`, based on `origin/main` at `47f031d`. The new top P0 section in `PROGRESS.md` is authoritative. Preserve the good rank-based strategy design while correcting FLEX/SUPER_FLEX allocation and the positive tail at/below replacement. Custom valuations are captured as a likely next feature and are explicitly out of scope for this session. No merge or production deployment.

---

# Handoff — PR #11 eliminated badge in Bid Profile popup (2026-09-26)

John requested that an eliminated manager's Bid Profile popup explicitly show `Eliminated` beside the manager name using the same presentation as Teams/Teams.

Implemented:
- `ManagerDetailsModal` accepts an optional eliminated state and renders the shared `StatusBadge status="eliminated"` beside the manager heading.
- `TeamBidProfiles` supplies that state from the active-roster set. Active Bid Profile popups and Waivers manager-prediction popups do not show the badge.
- Existing modal title association, wrapping, geometry, focus behavior, and calculations remain intact.
- Regression verifies the badge is absent for an active manager, present for an eliminated manager, and the hidden eliminated modal still closes when filtering is turned off.

Verification: focused Teams/Bid Profiles 25/25, full frontend 24 files/162 tests, API 36/36, lint, typecheck, production build, and `git diff --check` all passed. Pending commit/push and preview rebuild. No merge or production deployment.

---

# Handoff — PR #11 eliminated Bid Profile grouping/presentation (2026-09-26)

John requested two refinements after reviewing the checkbox patch: visually mute eliminated manager names just like Teams/Teams, and place eliminated Bid Profiles after all surviving profiles.

Implemented:
- Profiles are still sorted multiplier-descending with deterministic ties, then partitioned into active first and eliminated second. Ordering within each group is preserved.
- Eliminated manager names use the same muted `#4a4d77` text color as eliminated names in Teams/Teams; active names retain `#f0f0ff`.
- Active-only FAAB quartiles, persisted checkbox behavior, filtering, modal cleanup, and calculations are unchanged.
- Regression uses an eliminated profile with the highest multiplier to prove it still appears after all active profiles and verifies both active/eliminated name colors.

Verification: focused Teams/Bid Profiles 25/25, full frontend 24 files/162 tests, API 36/36, lint, typecheck, production build, and `git diff --check` all passed. Pending commit/push and hosted preview rebuild. No merge or production deployment.

---

# Handoff — PR #11 Max VORP selectable-count analysis correction (2026-09-26)

During owner follow-up, Clawdbot found the initial Max VORP implementation evaluated only survivor counts reachable under the elimination cadence (19 stages: 28, 26, …, 4), while the existing VoRP selector exposes every integer from the current active count through 4. John’s original request was to evaluate every allowed count.

Correction:
- Max VORP now evaluates all 25 selectable SeaMex counts from 28 through 4, including odd counts above 16.
- The reproducible SeaMex report was regenerated from live selected-scoring projections.
- Exact all-count computation remains the decision: 52/192 positive players peak at an interior count and disagree with endpoint-only evaluation. The largest endpoint miss is $6.720 (Lamar Jackson); mean positive miss is $1.320.
- Interior peaks: 27 teams (34 players), 24 (9), 23 (5), 16 (3), 8 (1). By position: RB 39, WR 12, QB 1, TE 0.
- Cold exact compute is 111.19 ms and remains memoized in production.

Verification:
- Focused Max VORP/waivers: 28/28 passed.
- Full frontend: 24 files / 162 tests passed.
- API: 36/36 passed.
- Lint, typecheck, production build, and `git diff --check`: passed.

This is shape/endpoint analysis only. It does not compare Max VORP, Weekly, Safe, Aggressive, or Weeks as Starter against historical real bids; that remains a separate future study. Pending commit/push and updated preview deployment. No merge or production deployment.

---

# Handoff — PR #11 owner preview fix: eliminated-team filtering (2026-09-26)

John found that the shared `Show eliminated teams` checkbox filtered the Teams tab but not Bid Profiles. Root cause: `TeamsPage` passed the active roster set into `TeamBidProfiles` only for FAAB quartile calculation; it never passed the visibility preference, and the component always mapped every profile.

Fix:
- `TeamsPage` now passes the shared persisted `showEliminatedTeams` state to Bid Profiles.
- Bid Profiles defaults to active managers only and adds eliminated managers when checked, preserving multiplier-descending order.
- Active-manager-only FAAB quartiles remain unchanged when eliminated cards are visible.
- Turning the checkbox off closes an open eliminated-manager modal.
- Empty active-profile state is explicit.

Verification:
- Focused Teams/Bid Profiles: 25/25 passed.
- Full frontend: 24 files / 162 tests passed.
- API: 36/36 passed.
- Lint, typecheck, production build, and `git diff --check`: passed.

Pending at handoff creation: commit/push and updated Azure preview deployment. No merge or production deployment.

---

# HANDOFF — Max VORP PR #11

_Last updated: 2026-09-26 04:13 PDT_

## Status

Complete and ready for review. PR #11 is open against `main`, mergeable, and has a successful CI build plus successful Azure PR deployment. **Do not merge and do not deploy production.**

- Branch: `feat/max-vorp-strategy`
- Implementation commit: `7c32a1fa0d6972108aa291ec8fe64ddaf173a4b4`
- PR: https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/11
- Exact hosted preview: https://nice-moss-07ec56310-11.centralus.7.azurestaticapps.net
- Base: merged `origin/main` at `2dccfcbe6d2f3fa7e03999a661694340f104147a` (PR #10)

## What shipped

- Added stable `max-vorp` strategy, displayed as **Max VORP**, first in the shared registry and the fresh/unset default.
- Connected the Waivers selector to persisted `activeStrategy` state instead of local-only state.
- Bumped persisted store schema to v2. Missing/invalid state migrates to Max VORP; every recognized explicit old selection is preserved; legacy `exponential` still maps to `aggressive`.
- Added exact all-count Max VORP computation and deterministic memoization.
- Replaced scattered Weeks-as-Starter profile lookups with one shared frozen `BIDDING_BASELINE = { strategyId: 'max-vorp', version: 'max-vorp-v1' }` resolver.
- Historical evidence and derived profiles record baseline strategy/version without modifying transaction or projection source evidence.
- Current predictions remain `baseline × manager multiplier`, applied once, capped by manager FAAB; buyer likelihood/order and Week 1/no-history behavior are unchanged.
- Added focused UI copy and `docs/MAX-VORP.md`.

## Formula and data flow

For each valid survivor count from the current active-team count through four (two eliminations per week above 16, then one per week):

1. Optimize the complete starter pool using league QB/RB/WR/TE/FLEX/SUPER_FLEX slots.
2. Use the final selected player at each position as its replacement projection.
3. Calculate player VORP as `max(0, player ROS points - positional replacement ROS points)`.
4. Build the final-four championship pool against that stage's replacement levels.
5. Calculate `dollarsPerVorp = initial league FAAB / average final-four-team VORP`.
6. Calculate the player's unrounded stage value as `VORP × dollarsPerVorp`.
7. Select the largest positive stage value and round once. Exact ties prefer the earlier/larger-team stage.

Sleeper ROS projections and the league's configured scoring/lineup are the source. Missing/incomplete calibration reports unavailable; a player at replacement level at every stage receives $0 through VORP itself.

The production cache keys on immutable projection-map identity plus lineup shape, initial FAAB, and survivor sequence. Historical snapshot projection maps are separately memoized, allowing claims from the same snapshot to share calibration results.

## SeaMex analysis and endpoint decision

Reproduce with `npm run analyze:max-vorp`; full per-player output is committed in `docs/analysis/max-vorp-seamex-2026.md`.

- Real 2026 SeaMex: 28 active teams; stages `28,26,24,22,20,18,16,15…4`
- Weeks 4–18; 2,110 players with projection data
- 192 players with positive Max VORP
- 21 interior maxima
- 21 endpoint-only disagreements
- Mean positive endpoint miss: $1.850
- Largest endpoint miss: $6.720 (Lamar Jackson)
- Positional interior maxima: QB 11, RB 6, TE 3, WR 1
- Cold exact calculation: 90.01 ms on the Pi; repeated call returns the memoized result object

**Decision:** endpoint-only is not equivalent. Exact all-count evaluation remains in production.

## Files of note

- `src/logic/waiverStrategies.ts` — ordered registry, default, versioned shared baseline resolver
- `src/logic/waivers.ts` — progression helpers, exact Max VORP calibration, cache, board integration
- `src/logic/biddingProfiles.ts` — historical survivor context, cached snapshot projections, versioned Max VORP evidence/profile baseline
- `src/pages/WaiversPage.tsx` — persisted selector/default and shared current prediction resolver
- `src/store/appStore.ts` — v2 migration/default
- `scripts/analyze-max-vorp.ts` — reproducible live-league analysis
- `docs/MAX-VORP.md` and `docs/analysis/max-vorp-seamex-2026.md`

## Verification

Local:

- Frontend Vitest: 24 files, 161 tests passed
- API Vitest: 2 files, 36 tests passed
- Typecheck passed
- ESLint passed
- Production Vite build passed
- `git diff --check` passed
- Changed-file secret scan passed
- Reproducible SeaMex analysis passed

CI / PR:

- PR #11: `MERGEABLE`, `mergeStateStatus: CLEAN`
- `build`: success
- `Build and Deploy`: success
- Exact Azure environment confirmed with `az staticwebapp environment list`

Hosted QA on exact PR preview:

- Real 2026 SeaMex loaded with 28 active / 32 total teams.
- Desktop 1440×1000 and mobile 390×844: no horizontal overflow and no console errors.
- Max VORP is first and selected by default; copy accurately describes all-stage championship-calibrated VORP.
- Switched to Weeks-as-Starter, reloaded, and confirmed the explicit choice persisted; switched back to Max VORP and confirmed persisted `activeStrategy: max-vorp`.
- Representative values with rostered players shown: elite Jahmyr Gibbs $227, fringe Devin Singletary $2, replacement-level Drew Lock $0.
- Bid Profiles rendered with real history; Houston0ilers showed Standard 0.95x and evidence baselines/ratios ($84/$90 = 1.07x, $66/$65 = 0.98x, $59/$48 = 0.81x), including Week 1 fallback.
- Current SeaMex has no unrostered player with positive Max VORP, so a manager-specific current prediction cannot naturally render in this hosted fixture. Focused tests verify Max VORP is the input, the multiplier is applied once, FAAB caps remain, and legacy `predictedWinningBid` is ignored.
- PR #10 source tabs, rostered toggle, team profiles, historical evidence modal, and responsive layout remained functional.

## Blockers / follow-up

No implementation blocker. The only hosted-data limitation is the absence of a positive-Max-VORP unrostered player for visually exercising current predictions; this path has direct unit coverage.

Real-bid model accuracy/outlier analysis, non-VORP replacement-level changes, player-level bid history, and new own-team border work remain explicitly out of scope.

## Safety confirmation

No merge, no push to `main`, no `workflow_dispatch`, and no production deployment were performed.
## 2026-09-27 owner clarity update — prediction R² labeling
- Owner flagged standalone `R²` labels as misleading because the report scores fixed strategy predictions against the identity line rather than presenting an in-sample fitted-regression goodness-of-fit statistic.
- Relabeled median-market tables to `Raw prediction R²*`, scatter plots/tables to `Prediction R²*`, and the formula card to `Prediction R² (unfitted)`.
- Added a prominent first-analysis warning: values are not fitted-regression R², may be negative when fixed predictions lose to the mean baseline, and do not imply negative correlation.
- Generator regression test now requires the explicit label/explanation and rejects ambiguous `<th>R²</th>`.
- Verification: `npm run analyze:bidding`; `npm run analyze:bidding:presentation`; focused presentation tests 4/4; `git diff --check`.

## 2026-09-30 weekly calibration handoff

- W4 is now a first-class eligible week throughout the weekly analysis/report/presentation. The exactly-five-bullet owner answer is generalized; no two-week guard or hardcoded W2/W3 labels remain.
- Adjacent held-out validation now emits W2→W3 and W3→W4 rows for the four owner-summary methods plus separately labeled Middle VORP analysis, across winning/serious-median lenses.
- Added a generated behavioral-question and privacy-safe owner-team audit appendix; unsupported longitudinal/need/manager-style questions are explicitly prospective. Owner bullets and multiplier tables now contain only the four required methods.
- Refreshed artifacts: `docs/analysis/bidding-strategy-accuracy-seamex-2026.{md,html,pdf}`. The PDF has 21 visually reviewed pages with no clipping or overflow.
- Current decision: **no product formula change**. W4 serious-market medians favor Corrected Weeks as Starter, W4 winners favor Corrected Safe, and aggregate serious/all-bid results still favor Current-team VoRP; lens instability plus reconstructed provenance keeps Middle VORP analysis-only.
- Validation to rerun: `npm run check`, `npm test`, `npm run analyze:bidding`, and `npm run analyze:bidding:presentation`.

## 2026-09-30 final five-bullet QA closure

- Reworked the generated answer to exactly five direct bullets: latest eligible and pooled season-to-date top-three winning/serious-market a/g/m multipliers with coverage; latest and cumulative four-method raw identity fit; current/prior/cumulative leadership; material week-over-week trend; and an explicit no-formula-change recommendation/provenance caveat.
- The calculation discovers latest/previous eligible weeks and pools raw top-three rows; no W4 or two-week constants were added. Aggressive and Middle VORP remain outside the five bullets; Middle stays in the separate analysis-only appendix.
- Generated provenance now names read-only Supabase tables `projection_snapshot_runs`/`projection_snapshot_values` and the Sleeper league, player-catalog, and weekly-transaction GET endpoint shapes without printing IDs or credentials.
- Focused report/presentation tests: 10 passed. `npm run check`: passed (one pre-existing unrelated React set-state lint warning). `git diff --check` and privacy scans passed. HTML DOM/render sanity passed; generated report structure retained 21 PDF pages.
- Markdown, HTML, and PDF are byte-identical across immediate repeat generation. Chromium timestamp and tagged-node IDs are normalized without changing PDF byte widths/xref offsets. Final SHA-256: MD `6bbaac9cb2ec646f4c3b7cd67ebc4780e5c57f13d4a2f828b0f57214dbb5b13b`; HTML `7f9e30b8ee3f3012f8dc69f024b3b4809526265ceebe4bcf8ae28d85aead967a`; PDF `40c868c38947ad707234e06b344b20c5d48e0d21879bb5e2ecb80bd46615a176`. No merge, deploy, main push, workflow dispatch, or external-data mutation.
