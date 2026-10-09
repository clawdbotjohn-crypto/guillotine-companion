# HANDOFF — Guillotine Companion PR #23 custom-ranking refinements

**Date:** 2026-10-09

**Branch:** `feat/hybrid-custom-rankings`

**PR:** https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/23

**Implementation commit:** `507a596` (`feat: refine custom ranking settings`)

**Gate:** Review only. Do not merge, enable auto-merge, delete the branch, deploy production, dispatch workflows, or mutate production data.

## Why this ran

John reviewed the hosted PR #23 preview and requested the custom-ranking refinements captured from Discord messages `1558198907257888838` and `1558198918486167552` at the top of the authoritative workspace `PROGRESS.md`. This continuation implements only that owner feedback.

## Delivered

- Numeric inputs retain transient empty/`-` states, select the initial zero for natural replacement, allow negative additive modifiers on mobile, and commit parsing on blur.
- Dialogs are vertically centered at desktop and 390×844; label/action spacing is increased.
- Settings now use exact `Preview` copy, omit `$0 floor`/trailing prose, remove Recalculate, and use a single `Save` settings action.
- Added two construction modes:
  - Built-in ranking system: ranking source + strategy + multiplier + additive modifier.
  - Position-based value curve: QB/RB/WR/TE max and rank step plus global multiplier.
- Both modes clamp generated values to `$0`, retain deterministic frozen baselines, and support explicit per-player overrides.
- Persistence/store schema is now v2 with migration defaults that keep existing v1 rankings valid.
- Reset regenerates from the currently selected settings and clears overrides after confirmation.
- Save confirms only when generated settings change, reports manual override count, defaults `Preserve edited player values` on, and supports unchecked clearing. Name-only Save remains confirmation-free.
- Ranking-source staging is guarded: settings open against the board source, cancel/error restores the prior source, and create/save/reset cannot snapshot rows from a mismatched provider.

## Focused verification

- `NODE_OPTIONS=--max-old-space-size=1024 nice -n 10 npm test -- --run src/logic/__tests__/customRankings.test.ts src/components/CustomRankingDialogs.test.tsx src/pages/WaiversPage.test.tsx`
  - **3 files, 34 tests passed** (9 logic + 10 dialogs + 15 page/control tests).
- Changed-file Oxlint:
  - **0 errors**.
  - One existing `react(set-state-in-effect)` warning remains in `CustomRankingSettingsDialog` for resetting confirmation state when the board changes.
- `git diff --check`: passed.
- Bounded secret scan of changed text files: no matches.
- Full build/typecheck was intentionally left to CI; focused validation was used under the Pi resource policy while gateway RSS was about 1.6 GB.

## Browser QA

Local Vite QA at desktop 1440×900 and mobile 390×844 exercised:

- Built-in create flow and exact concise Preview copy.
- Clearing modifier `0`, holding empty and `-`, committing `-20`, and replacing zero without `020`.
- Position-curve mode and per-position controls.
- Settings Save confirmation with one manual edit, default-checked preservation, checked preservation, and unchecked clearing.
- Name-only Save without the value-change confirmation.
- Reset confirmation and override clearing.
- Source-error rollback to the prior source without regenerating from mismatched rows.
- Dialog centering, mobile scroll containment, and action spacing.

Screenshots committed with the implementation:

- `artifacts/pr23-refinements-qa/desktop-create-built-in-1440x900.png`
- `artifacts/pr23-refinements-qa/mobile-create-position-390x844.png`
- `artifacts/pr23-refinements-qa/mobile-save-confirm-preserve-checked-390x844.png`
- `artifacts/pr23-refinements-qa/mobile-reset-confirm-390x844.png`

Browser QA touched only local browser storage. No production data or deployment configuration was touched.

## Independent review

The first independent review found one blocking risk: a selected ranking source could diverge from the rows used to regenerate a board. That was fixed with source-origin restoration, provider equality guards, and unavailable-source rollback. It also identified ambiguous position formula copy, which was corrected to show `rank − 1` math. A focused re-review found **no blocking findings**.

## Remaining after this handoff

1. Commit this `PROGRESS.md`/`HANDOFF.md` update and push the explicit review commits to the existing PR #23 branch.
2. Verify the exact remote PR head, CI checks, and hosted preview when available.
3. John reviews PR #23. The PR remains unmerged and production remains untouched.
