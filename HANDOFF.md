# HANDOFF — Guillotine Companion PR #23 rank/default correction

**Date:** 2026-10-09

**Branch:** `feat/hybrid-custom-rankings`

**PR:** https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/23

**Starting head:** `7990c17961b15cb1cd0a1959401f58a468ce9998`

**Gate:** Review only. Do not merge, enable auto-merge, delete the branch, deploy production, dispatch workflows, or mutate production data.

## Why this ran

John tested the hosted PR #23 preview and reported that Josh Allen displayed `QB #1 / $85` while an unranked Cade Klubnik displayed `QB #0 / $85`. He also requested that new position-curve defaults scale from the league's initial FAAB. The authoritative request is Discord `1558305184642240572` and the top P0 in the workspace project `PROGRESS.md`.

## Root cause

`buildWaiverBoard()` legitimately leaves players outside the positive replacement-model ranking as `posRank = 0`. Custom position curves reused that lineup/replacement rank directly, and `applyPositionValueCurve()` clamped every finite value to at least 1. Rank 0 was therefore promoted to rank 1 and awarded the position maximum.

## Delivered

- Added a custom-board-only deterministic position ordinal pass for position-curve mode:
  - unique 1..N ordinals within QB/RB/WR/TE;
  - valid positive selected-source position order first;
  - duplicate ranks untied with stable source-rank/value/name/player-ID tie-breaks;
  - missing/zero/nonfinite ranks after valid ranks;
  - stable under reversed input iteration order.
- Built-in custom-ranking generation remains unchanged.
- Position-curve snapshots store the corrected ordinal; the custom board displays frozen snapshot rank/source values.
- Invalid direct rank input (0, negative, NaN, infinity) now fails safe to `$0`; normal curves still floor at `$0`.
- Existing schema-v2 boards and manual overrides are not migrated or silently regenerated. Existing buggy frozen boards require explicit Reset, or a generated-setting change plus Save. The settings dialog now explains this.
- New ranking dialogs derive defaults from initial `LeagueContext.budget`, never remaining roster FAAB:
  - QB max 17%; RB max 27%; WR max 27%; TE max 9%; all steps 1%.
  - `$500`: QB `85/5`, RB `135/5`, WR `135/5`, TE `45/5`.
  - `$1,000`: QB `170/10`, RB `270/10`, WR `270/10`, TE `90/10`.
  - nearest whole-dollar rounding (`$333` => 57/3, 90/3, 90/3, 30/3).
  - missing/nonfinite/negative budget falls back to `$1,000`; `$0` is valid and produces zero defaults.
  - multiplier stays user-controlled and defaults to 1.
- Changing source before creation preserves the already computed league-budget defaults. Existing-board settings continue loading their saved curves.

## Verification before push

- Focused regression/logic/dialog suite: **66/66 passed**.
- Ranking-source + WaiversPage neighbor suite: **19/19 passed**.
- Final affected suite rerun: **40/40 passed**.
- Changed-file Oxlint: **0 errors**; one pre-existing `react(set-state-in-effect)` warning remains in `CustomRankingSettingsDialog`.
- `git diff --check`: passed.
- Bounded changed-line secret scan: no matches.
- Full build/typecheck intentionally left to capped GitHub CI under the 4 GB Pi resource policy.

## Independent review

Independent rank-semantics/budget-propagation review found **no blocking or material findings**. It identified one optional low-risk gap: explicit proof that migration leaves an existing schema-v2 curve board's settings, frozen player snapshots, and manual overrides unchanged. That regression test was added and the final custom-ranking suite passed 14/14.

## Push, CI, and hosted browser QA

- Implementation head: `8eb3e1af8a1167ccf685f6c3c4e65d961665c2d7`.
- Preview: https://nice-moss-07ec56310-23.centralus.7.azurestaticapps.net
- GitHub CI `build`: passed (lint, typecheck, frontend tests, function tests, and build).
- Azure `Build and Deploy`: passed.
- PR after implementation push: OPEN, CLEAN, MERGEABLE.
- Hosted desktop and 390×844 mobile QA passed in the real `$500` SeaMex league:
  - New position-curve dialog showed QB `85/5`, RB `135/5`, WR `135/5`, TE `45/5`, multiplier `1`.
  - Switching the not-yet-created dialog from Sleeper to FantasyCalc preserved those defaults.
  - Generated FantasyCalc list showed Josh Allen `QB #1 / $85`, Lamar Jackson `QB #2 / $80`, and Brock Purdy `QB #3 / $75`, then unique descending ordinals/values through the `$0` floor.
  - The saved board/settings survived reload. A manual Josh override to `$84` also survived reload while Lamar/Brock stayed `$80/$75`.
  - The settings dialog retained the exact saved curves and displayed the frozen/reset explanation.
  - Cade Klubnik was absent from the live FantasyCalc source, so the exact rank-0/Cade behavior is proven by the deterministic focused regression test rather than fabricated live evidence.
- New evidence (preserved in the existing untracked QA directory):
  - `artifacts/pr23-qa/13-hosted-desktop-500-defaults.png`
  - `artifacts/pr23-qa/14-hosted-desktop-qb-ordinals.jpg`
  - `artifacts/pr23-qa/15-hosted-mobile-qb-ordinals.jpg`
  - `artifacts/pr23-qa/16-hosted-mobile-frozen-settings.jpg`

## Remaining

No implementation work remains. This handoff/QA documentation is the only follow-up commit after the verified implementation head; use the PR's current head for the final exact SHA. Leave PR #23 unmerged and production untouched pending John's review.
