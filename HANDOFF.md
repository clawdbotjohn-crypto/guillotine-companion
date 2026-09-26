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
