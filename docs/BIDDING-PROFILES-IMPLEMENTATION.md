# Bidding Profiles Frontend — Implementation Plan

**Branch:** `feat/bidding-behavior-profiles`
**Backend gate:** passed 2026-09-25. PR #9 is merged; production `GET /api/projection-snapshots` returns explicit stored/effective provenance; the dedicated DB contains only reconstructed decision Weeks 1–3 and no Week 4 row.

## Existing data shapes

- `useAllTransactions()` returns `Map<number, Transaction[]>`; the map key is Sleeper's transaction/matchup week. A historical projection lookup uses `decisionWeek = transactionWeek + 1`, matching the API's explicit `requestedPlayingWeek = decisionWeek - 1` contract.
- Sleeper waiver transactions identify the manager with `roster_ids[0]`, the target with the single `adds` key, dollars with `settings.waiver_bid`, submission time with `created`, processing batch with `status_updated`, and outcome with `status` plus `metadata.notes`.
- A legitimate loss is a failed claim whose note says another owner claimed the player **and** which has a completed winner for the same player, transaction week/leg, and processing timestamp. Roster-invalid and unmatched failures are not evidence.
- `League.settings.waiver_budget` is the initial FAAB budget. Completed waiver spend and exposed `waiver_budget` transfers are available in transaction history. `Roster.settings.waiver_budget_used` supports current remaining FAAB, but is not rewritten into historical events.
- The public snapshot GET returns `{ snapshot, provenance, rows }`. `provenance.effectiveKind` is authoritative for the requested decision week; an older-week fallback remains reconstructed even if its stored capture was exact.
- Existing Weeks-as-Starter bidding is in `logic/waivers.ts`: projection position rank → starter weeks → recommended bid → `predictedBidMultiplier(currentWeek)`. Historical replay can use immutable projection rows plus current league lineup settings, but V1 has no historical roster, ownership, needs, or survivor-state snapshots.

## Implementation sequence

1. Expand strongly typed Sleeper transaction and public snapshot response shapes; add a credential-free GET client/query hook.
2. Add pure deterministic modeling for evidence classification, same-batch contingency deduplication, transaction-ledger pre-bid FAAB reconstruction, top-three selection, snapshot-to-ROS conversion, baseline/ratio math, geometric manager multiplier, style, confidence, and current capped prediction.
3. Reuse the existing Weeks-as-Starter formula for historical baselines with the snapshot's requested decision week and static league setup. Label this V1 setup-only replay explicitly; do not invent historical rosters, ownership, needs, survivor state, or exactness.
4. Add a Waivers `Manager bid profiles` surface with a target-player selector, manager summaries, raw current baseline, willingness, feasible/capped bid, multiplier/style/confidence, and expandable evidence rows with provenance and FAAB constraints. Include loading, empty, error, and insufficient states.
5. Add fixtures/tests for wins, proved losses, invalid/unmatched failures, contingencies, FAAB constraints/transfers, exact vs reconstructed confidence, minimum baselines, exhausted FAAB, style boundaries, and no usable evidence.
6. Run browser QA, accessibility/console checks, focused/full tests, lint, typecheck, production build, secret/diff scans, and independent review. Fix high/medium findings, update handoff/progress, then commit, push, and open (never merge) the PR.

## Explicitly deferred

- Historical roster/ownership/needs/position-weakness/survivor replay.
- Claims about exact historical Weeks-as-Starter context beyond snapshot provenance.
- Per-league backend storage or profile persistence.
- Automatic waiver submission or predicting which managers will bid on a player.

## Baseline migration: Max VORP v1 (PR #11)

The original V1 notes above document the Weeks-as-Starter baseline at initial rollout. PR #11 intentionally replaces that baseline for both historical ratios and current manager predictions with the shared, versioned `max-vorp-v1` resolver in `src/logic/waiverStrategies.ts`. Derived evidence records the baseline strategy/version; immutable transaction and projection snapshot evidence remains unchanged. See `docs/MAX-VORP.md` for the exact formula and analysis.
