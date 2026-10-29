# HANDOFF — Suggested Bids stable drop-row ordering

## Status / owner source

Review-only PR #28 on existing branch `fix/suggested-bids-non-worsening`. This follow-up started from required remote head `8609b3eba37599e431c65b3088f48d46456dcd90`; the remote head was verified unchanged before implementation.

Owner report — Discord `1565091946865758229`:

> Hmm... another weird thing I see is that Algiers is above Flournoy with 1 suggested drop, while Fl... has 5. How is that possible? If Fl... is more valuable than Jones then I would expect less drop options (like Montgomery is a RB so how could he be better than our #4 drop but not our #3 drop who is a RB?). If Jones is more valuable, the Flournoy should appear higher than Jones on the drop list.

The fixture labels are explicitly Allgeier/Flournoy/Montgomery-shaped synthetic labels, not verified player identities.

## Causal diagnosis and implementation

The existing stable queue sorted same-source positional ROS VORP before weekly projection. In the exact synthetic reproduction, that put a starting RB shape (ROS positional VORP `10`) above a bench WR shape (`25`) even though removing them from the optimized original next-week lineup cost `14` and `0` projected fantasy points respectively. That priority was a real ordering defect.

The differing recommendation counts are legitimate and are not a sort key. In the fixture, the bench WR row has five recommendations while the starting RB row has one. The Montgomery-shaped target is safe for the bench WR (`passes: eligible`, weekly change `0`, transaction VORP `+15`) but fails for the starting RB (`fails: original-lineup-harm`, weekly change `-4`). The exact non-nested sets also reflect prior-primary consumption. The pair is not rejected by mixed-outcome safety, and the result cannot be inferred from names or shared RB labels alone.

The stable queue is now computed exactly once from the original roster with this ascending tuple:

```text
(
  optimized next-week lineup removal cost,
  same-source ROS positional VORP / keep value,
  deterministic player ID
)

removalCost = optimizedOriginalLineupPoints
            - optimizedLineupPoints(originalRoster - player)
keepValue   = sameSourcePlayerValue
            - sameSourceReplacementBaseline[player.nativePosition]
```

Both numeric keys use their source's native projected-fantasy-point/value units; raw cross-position totals are never mixed. Finite injury/bye projections of `0` produce a valid zero removal cost. Missing/non-finite weekly data receives conservative `+Infinity` removal cost. Missing/non-finite player value or native-position baseline receives conservative `+Infinity` keep value. Removal cost is clamped at zero against numerical/model anomalies. A zero-removal durable injured/bye player is still protected by secondary ROS VORP and, decisively, the existing transaction-VORP eligibility gate; empty rows remain omitted.

The safety evaluator now returns exact diagnostic reasons while enforcing the same guards. Preserved: transaction-VORP-first pickups; successful-row primary consumption in both win/loss availability branches; all-miss/all-hit/mixed outcome safety; same-position calibration fallback; FLEX/SUPER_FLEX; bid/budget/opponent/duplicate caps; DST/K; advisory/no-write behavior.

## Exact synthetic diagnostics

| Drop shape | Original-roster removal cost | ROS positional VORP | Best primary transaction VORP | Recs | Montgomery-shaped result |
|---|---:|---:|---:|---:|---|
| Bench WR / Flournoy shape | 0 | 25 | 15 | 5 | `passes: eligible`; weekly change 0 |
| Starting RB / Allgeier shape | 14 | 10 | 20 | 1 | `fails: original-lineup-harm`; weekly change -4 |

Regression coverage also proves one excellent option can precede five marginal ones without count sorting; two zero-removal bench players use ROS positional VORP; exact ties use player ID; a high-ROS injury/bye player does not produce an unsafe displayed row; and the queue remains original-roster-stable after prior hit/miss branches. Existing primary-consumption, outcome-state, transaction-VORP, calibration, FLEX/SUPER_FLEX, cap, duplicate, DST/K, and no-harm tests remain green.

## Files and validation

Changed files:

- `src/logic/weeklyBidPlan.ts`
- `src/logic/weeklyBidPlan.test.ts`
- `PROGRESS.md`
- `HANDOFF.md`

Local validation:

- focused planner: 34/34
- full frontend: 402/402 across 47 files
- full API: 61/61
- TypeScript typecheck: passed
- production build: passed
- changed-file Oxlint: 0 warnings / 0 errors
- `git diff --check`: passed
- bounded diff/privacy/secret/scope review: only intended PR #28 logic/tests/docs; synthetic identifiers only; no private data, credentials, artifacts, provider/DB/live-user changes

Exact implementation commit/head: `b79277f6a2eae8adae1f34a0278053e4ac559152`. The first pushed documentation head was `5d5bb27f77f61553bc0ffdd87702e34d710d2233`; natural exact-head CI and Azure deployment passed. Exact preview URL: `https://nice-moss-07ec56310-28.centralus.7.azurestaticapps.net`. Hosted privacy-safe synthetic QA passed at 1280×900 and 390×844: bench WR appeared before starting RB; non-nested counts were coherent (4 vs 1) without explanatory prose; primaries were distinct (Marginal Alpha then Exceptional Safe); pickup cards remained transaction-VORP ordered; every card had nonnegative next-week gain and unchanged/improved rank; and neither viewport had horizontal overflow or console errors. Browser local/session storage, Cache Storage, and IndexedDB were cleared and all preview tabs closed afterward. Final post-QA docs-head checks and PR state are recorded in PR #28 because a commit cannot contain its own SHA.

## Residual caveat

No private/live owner roster was inspected or mutated. The code defect and mechanism are proven with a privacy-safe synthetic shape matching the reported constraints; the exact live players/source values can drift and remain unverified. Non-nested recommendation sets are expected and need no UI prose.

## Boundaries

PR #28 remains review-only. Do not merge/auto-merge, push main, delete the branch/environment, manually deploy or dispatch workflows, mutate provider/database/live-user data, force-push, or create another PR.
