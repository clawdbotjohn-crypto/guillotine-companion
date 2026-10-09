# Guillotine Companion — Handoff

**Updated:** 2026-10-09 PT
**Repo:** `clawdbotjohn-crypto/guillotine-companion`
**Branch/worktree:** `feat/hybrid-custom-rankings` / `/home/john/.openclaw/worktrees/gb-hybrid-custom-rankings`
**Base:** current `origin/main` at task start (`e6708ca503482fb3be10d3c87590d956e1d298aa`)
**Implementation baseline:** `3cf1ce0` (review fixes are at the branch tip)

## Implemented approved Hybrid package

- Final top-level **Custom** strategy, named-ranking dropdown, `+ New`, adjacent settings and selected-ranking delete controls. The selected name appears only in the dropdown; there is no visible “Custom Board” text or redundant details strip.
- Maximum ten rankings per league-season and persisted last-used selection.
- New-ranking flow: name, existing Player Values source, existing base strategy, multiplier, additive modifier, `$0` floor, and concrete formula/player preview.
- Settings flow: ordinary **Save name** is rename-only and preserves formula metadata, frozen values, and manual overrides. Formula changes cannot be saved as stale metadata; they require explicit confirmed Recalculate, which atomically rebuilds the baseline, updates metadata, and clears overrides. Trimmed/case-insensitive duplicate names are rejected in both UI and store. Confirmed Reset clears overrides only.
- Confirmed delete beside the dropdown and from settings; copy explicitly says predicted bids, bid history, source-relative data, and Team Impact are unaffected.
- Split custom player cards: left/player region opens existing `PlayerDetailDialog`; right/value region alone edits the custom dollar value. Enter and blur commit normalized non-negative integer values before value-based resort; Escape cancels without committing. Dialogs support Escape close, practical Tab containment, initial focus, and opener-focus restoration.
- Custom values remain distinct from predicted winning bids, completed/losing history, source-relative rank/value, and Team Impact.

## Persistence semantics

`src/store/customRankingStore.ts` follows the existing Zustand `persist`/localStorage convention under its own versioned key. Each board is schema-versioned and scoped by encoded `leagueId + season`. It stores a deterministic, player-ID-sorted frozen generated snapshot plus a separate override map. Week/source/roster/FAAB changes cannot mutate saved work; only explicit value edits, Reset, confirmed Recalculate, rename, or confirmed Delete write it. The UI states that data is stored only in this browser on this device. This first PR intentionally does not include backend/auth, cross-device sync, or import/export; those are deferred rather than implied.

## Files

- `src/logic/customRankings.ts` + focused model/store tests
- `src/store/customRankingStore.ts`, `src/store/index.ts`, `src/store/appStore.ts`
- `src/components/CustomRankingDialogs.tsx` + component tests
- `src/pages/WaiversPage.tsx` + focused card tests
- `src/logic/waiverDisplay.ts`
- `PROGRESS.md`, `HANDOFF.md`

## Mobile QA follow-up (PR #23)

- Fixed the 390×844 Custom Ranking Settings dialog overlap: its backdrop now stacks above the fixed bottom navigation, while the mobile sheet uses dynamic-viewport height, independent scrolling, overscroll containment, and safe-area bottom padding so lower actions remain reachable.
- Focused dialog regression coverage asserts the modal stacking, scroll, dynamic-height, and safe-area contracts.

## Validation

Resource-safe and serial under capped `NODE_OPTIONS`/`nice` after memory checks:

- Baseline `npm run typecheck` passed. It was not repeated after review fixes because available RAM was ~1.2 GiB (below the repository's 1.5 GiB safety floor); focused Vitest transformation and changed-file Oxlint validation passed, with CI as the full typecheck gate.
- `npx vitest run src/logic/__tests__/customRankings.test.ts src/components/CustomRankingDialogs.test.tsx src/pages/WaiversPage.test.tsx` — **3 files, 28/28 tests passed** after review fixes.
- Changed-file `oxlint` — **0 errors**; one pre-existing React warning remains for clearing confirmation state when the selected board changes.
- `git diff --check` — passed.
- Bounded changed-file sensitive-token pattern scan — passed, no matches.

## Honest remaining review / QA

- Remaining low-risk QA: inspect the full-page source-switch loading transition, empty Custom state, ten-cap affordance, and mobile virtual-keyboard behavior. Automated coverage now exercises actual localStorage rehydration/last-used selection and the reviewed interaction regressions.
- Hosted QA should verify 390px and desktop layouts, create/edit/reset/recalculate/delete flows, and that Player Details still shows source metrics, bidding history/predictions, and Team Impact independently.
- No preview URL was available at handoff time; do not wait excessively for CI.

## Safety boundaries

Review-only. Do **not** merge, enable auto-merge, deploy, dispatch workflows, delete the branch, or modify PR #20 without John's explicit authorization for that exact action.
