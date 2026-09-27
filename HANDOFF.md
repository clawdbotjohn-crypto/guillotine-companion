# Handoff — P0 bidding strategy accuracy analysis (2026-09-27)

Implemented the complete review-only SeaMex 2026 strategy replay with no production/UI behavior changes.

Evidence and result:
- Sleeper public extraction: 469 transactions / 363 waivers. Proof filtering produced 70 completed wins and 265 legitimate-loss candidates; canonical dedupe retained 70 wins + 241 losses (311 bids) and removed 24 contingency/drop paths. Classifier reasons are preserved in the report.
- Pre-bid FAAB is reconstructed from 47 completed spend rows plus transfers (none observed): 311 transaction-ledger, 0 inferred-minimum, 0 uncertain. Transaction week maps to decision week +1; 32-team PPR settings and production progression give W2=30 and W3=28 active teams.
- Read-only Supabase refresh hard-checks approved project ref `xduqpomhjdlgmtmmkfed`. W2/W3 snapshots are explicitly reconstructed (never exact). W4 has only a W3 fallback, so all 23 W4 events are excluded; 49 more canonical events lack a supported-position projection. Final formula-usable sample: 239 bids, 47 wins, 192 legitimate losses.
- All five current registry outputs are replayed through `buildWaiverBoard`. Audit correction: requested “Weekly” is **not** mapped to `vorp`. Exhaustive history shows `vorp` has always been VoRP and no `weekly` key/formula ever existed; PR #10's “historicalWeeklyBaseline” explicitly meant `weeks-starter`, already a separately requested strategy. Weekly is therefore excluded as `no-authoritative-formula-or-key`, and VoRP is reported under its real name. Manager forecasts are separate and strict prior-batch walk-forward (133 forecastable bids / 27 wins).
- Naming evidence is documented in the report: initial registry `c331281`, Exponential→Aggressive rename `1656925`, Max-VORP addition `7c32a1f`, exhaustive all-ref search, and PR #10's explicit Weeks-as-Starter definition of “historicalWeeklyBaseline.”
- Findings: Aggressive has lowest winning-bid MAE (26.4) and non-token winning MAE (38.5), but is not robust: ratio-gap filtering still favors Aggressive while MAD/IQR filtering favors Max VORP. No strategy is recommended as a robust winner; keep production unchanged and collect exact pre-waiver snapshots.
- Report includes all/all-wins/non-token/competitive-cluster metrics, MAE bootstrap CIs (2,000 cluster resamples, seed 20260927), median AE, bias, Spearman, coverage/ranges, normalization, week/position/tier/cap slices, three predeclared outlier rules, provenance, formulas, limitations, and commands.

Files added/changed:
- `scripts/analyze-bidding-strategies.ts` — refresh, shared-formula replay, walk-forward forecast, deterministic report generator.
- `scripts/bidding-strategy-analysis.ts` — pure classifier, metrics, rank correlation, robust flags, deterministic cluster bootstrap.
- `scripts/__tests__/bidding-strategy-analysis.test.ts` — six focused deterministic tests.
- `scripts/fixtures/bidding-strategy-seamex-2026.json` — anonymized derived offline fixture (no source identities/raw payload).
- `docs/analysis/bidding-strategy-accuracy-seamex-2026.md` — generated report.
- `package.json`, `PROGRESS.md`, `HANDOFF.md`.

Verification:
- `npm test -- --run scripts/__tests__/bidding-strategy-analysis.test.ts` — 6/6 passed.
- `npm test -- --run` — 25 files / 168 tests passed.
- `node --test api/test/*.test.js` — 36/36 passed.
- `npm run lint` — 0 errors; one pre-existing React warning in `ManagerBiddingProfiles.tsx`.
- `npm run typecheck` and `npm run build` — passed.
- Script-only TypeScript check with TS 6/Bundler — passed using the required `--ignoreConfig` flag.
- Three consecutive stabilized `npm run analyze:bidding` runs produced identical report SHA-256 `bc6014fb93069b5ab3e991de69c0a22b6244126e0343142da11f5669598f00db`.
- An independent fixture audit reproduced 469 raw / 363 waiver / 311 canonical / 239 usable events, the 70/241 canonical and 47/192 usable win/loss splits, and the 49 missing-projection + 23 missing-snapshot exclusions.
- `git diff --check` and changed-file credential/identity scans passed.

Definition blocker recorded, not papered over: if John intended “Weekly” to be a sixth/distinct strategy rather than an erroneous backlog label, he must supply its formula; no authoritative implementation exists to replay.

Delivery completed by the top-level orchestrator: analysis commit `a8f414cb825b1406108408e72f3c0e90be822e30` was pushed only to `analysis/bidding-strategy-accuracy`, and review-only PR #12 is open against `main`: https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/12. Do not merge or deploy. No push to `main`, manual deploy, or `workflow_dispatch` was performed.

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
