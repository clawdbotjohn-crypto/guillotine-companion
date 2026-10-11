# HANDOFF — Guillotine Companion PR #23 mobile custom-ranking follow-up

## Status

Owner follow-up from Discord `1558416398890565642` is implemented, tested, pushed, and hosted-QA complete on the existing PR #23 branch/worktree.

- Worktree: `/home/john/.openclaw/worktrees/gb-hybrid-custom-rankings`
- Branch: `feat/hybrid-custom-rankings`
- PR: https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/23
- Hosted preview: https://nice-moss-07ec56310-23.centralus.7.azurestaticapps.net
- Implementation commits: `8390000` (`fix custom ranking mobile follow-up`) and `3a15ef4` (`preserve mobile value touch target`)
- PR remains OPEN, review-only, and unmerged. No production deploy or manual workflow dispatch occurred.

## Root causes and fixes

1. **Divider too far left on mobile**
   - Root cause: the custom-value rail used a fixed `8.75rem` width at every viewport.
   - Fix: mobile rail is `7.75rem`, returning 16px to player/name details; `sm:` and larger retain `8.75rem`.
   - The value input was also only 36px high (38px bordered group), so final hosted QA raised it to a true 44px input/46px editor group rather than sacrificing touch usability.

2. **Zero-edit preservation confirmation**
   - Root cause: Save opened confirmation for every generated-setting change, even when `board.overrides` had no applicable manual edit.
   - Fix: count only overrides for current players whose normalized value differs from the frozen baseline. With count 0, Save regenerates directly. With count >=1, confirmation uses the actual singular/plural count and keeps preservation checked by default.

3. **Custom valuation unavailable in Player Details**
   - Root cause: custom cards deliberately passed `suggestedBid: null` to avoid conflating custom and market concepts, but no separate custom valuation was propagated; the generic Suggested field therefore rendered `Unavailable`.
   - Fix: `PlayerDetailData` now has explicit `customValue`. Custom cards pass the selected board value; the popup renders `Custom value` separately from market `Predicted`, source-native rank/value, Team Impact, manager predictions, and bidding history.

## Files changed

- `src/pages/WaiversPage.tsx`
- `src/pages/WaiversPage.test.tsx`
- `src/components/CustomRankingDialogs.tsx`
- `src/components/CustomRankingDialogs.test.tsx`
- `src/components/PlayerDetailDialog.tsx`
- `PROGRESS.md`
- `HANDOFF.md`

Untracked QA evidence was intentionally preserved under `artifacts/pr23-qa/2026-10-10-mobile-follow-up/` and was not staged wholesale.

## Validation

Passed locally:

- Focused Vitest: **56/56** across:
  - `src/components/CustomRankingDialogs.test.tsx`
  - `src/pages/WaiversPage.test.tsx`
  - `src/components/PlayerDetailDialog.test.tsx`
  - `src/logic/__tests__/customRankings.test.ts`
- Follow-up WaiversPage test after the touch-target correction: **15/15**.
- Capped serial `npm run build` with `NODE_OPTIONS=--max-old-space-size=1024 nice -n 10`.
- Changed-file Oxlint: **0 errors**; one pre-existing `react(set-state-in-effect)` warning in `CustomRankingDialogs.tsx` when linting the wider changed set.
- `git diff --check` and bounded added-line secret scan.

Implementation-head GitHub checks passed:

- CI run `38094475186`: success (lint, typecheck, frontend tests, managed Functions tests, build, artifact).
- Azure preview run `38094475177`: success.

## Hosted QA

Real SeaMex Guillotine 2026 league / `PR23 QA` custom ranking:

- Desktop: responsive value rail retained; left/right card actions remained distinct; popup showed source-native value, `Custom value $34`, and market `Predicted $0` separately.
- Mobile 390×844 measurements: viewport/document width 390px (no page-level horizontal overflow), card 334px, player region 210px, value region 124px, input 44px, editor group 46px.
- One override: confirmation showed `1 player value has been edited.` and preservation checked by default; preserving retained the override after regeneration.
- Unchecked preservation cleared the override.
- Zero overrides: settings regenerated directly with no confirmation, no zero-count copy, and no preservation checkbox.
- Left side opened Player Details; right editor focused without opening a dialog.

Evidence:

- `artifacts/pr23-qa/2026-10-10-mobile-follow-up/desktop-custom-cards.jpg`
- `artifacts/pr23-qa/2026-10-10-mobile-follow-up/desktop-custom-popup.jpg`
- `artifacts/pr23-qa/2026-10-10-mobile-follow-up/mobile-390-custom-cards.jpg`
- `artifacts/pr23-qa/2026-10-10-mobile-follow-up/mobile-390-custom-popup.jpg`
- `artifacts/pr23-qa/2026-10-10-mobile-follow-up/mobile-390-one-override-confirmation.jpg`
- `artifacts/pr23-qa/2026-10-10-mobile-follow-up/qa-notes.md`

## Safety gate

PR #23 remains unmerged. Do not merge, enable auto-merge, delete the branch, deploy production, or dispatch deployment workflows without John's explicit authorization for that exact action.
