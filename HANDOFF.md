# Guillotine Companion — Handoff

**Updated:** 2026-10-09 PT  
**Repo:** `clawdbotjohn-crypto/guillotine-companion`  
**Branch/worktree:** `feat/hybrid-custom-rankings` / `/home/john/.openclaw/worktrees/gb-hybrid-custom-rankings`  
**Base:** current `origin/main` at task start (`e6708ca503482fb3be10d3c87590d956e1d298aa`)  
**Implementation commit:** `3cf1ce0`

## Implemented approved Hybrid package

- Final top-level **Custom** strategy, named-ranking dropdown, `+ New`, adjacent settings and selected-ranking delete controls. The selected name appears only in the dropdown; there is no visible “Custom Board” text or redundant details strip.
- Maximum ten rankings per league-season and persisted last-used selection.
- New-ranking flow: name, existing Player Values source, existing base strategy, multiplier, additive modifier, `$0` floor, and concrete formula/player preview.
- Settings flow: rename/source/strategy/formula settings; ordinary Save preserves the frozen generated baseline and manual overrides. Confirmed Reset clears overrides only. Confirmed Recalculate rebuilds the frozen baseline from currently loaded data and clears overrides with explicit destructive copy.
- Confirmed delete beside the dropdown and from settings; copy explicitly says predicted bids, bid history, source-relative data, and Team Impact are unaffected.
- Split custom player cards: left/player region opens existing `PlayerDetailDialog`; right/value region alone edits the custom dollar value. Enter and blur commit normalized non-negative integer values before value-based resort; keyboard/mobile focus treatment is present.
- Custom values remain distinct from predicted winning bids, completed/losing history, source-relative rank/value, and Team Impact.

## Persistence semantics

`src/store/customRankingStore.ts` follows the existing Zustand `persist`/localStorage convention under its own versioned key. Each board is schema-versioned and scoped by encoded `leagueId + season`. It stores a deterministic, player-ID-sorted frozen generated snapshot plus a separate override map. Week/source/roster/FAAB changes cannot mutate saved work; only explicit value edits, Reset, Recalculate, settings Save, or confirmed Delete write it. No cross-device/export/drag-reorder scope was added.

## Files

- `src/logic/customRankings.ts` + focused model/store tests
- `src/store/customRankingStore.ts`, `src/store/index.ts`, `src/store/appStore.ts`
- `src/components/CustomRankingDialogs.tsx` + component tests
- `src/pages/WaiversPage.tsx` + focused card tests
- `src/logic/waiverDisplay.ts`
- `PROGRESS.md`, `HANDOFF.md`

## Validation

Resource-safe and serial under `NODE_OPTIONS=--max-old-space-size=1024 nice -n 10` after memory checks (>1.7 GiB available):

- `npm run typecheck` — passed.
- `npx vitest run src/logic/__tests__/customRankings.test.ts src/components/CustomRankingDialogs.test.tsx src/pages/WaiversPage.test.tsx` — **3 files, 24/24 tests passed**.
- `npm run lint` — **0 errors**; three warnings reported across the repo run, including two pre-existing locations and one feature warning subsequently removed by replacing effect-driven input synchronization with a nullable draft model.
- `git diff --check` — passed.
- Bounded changed-file sensitive-token pattern scan — passed, no matches.

## Honest remaining review / QA

- Independent reviewer should inspect the full page create/settings source-switch loading transition, empty Custom state, last-used restoration after reload, ten-cap affordance, and mobile keyboard behavior.
- Hosted QA should verify 390px and desktop layouts, create/edit/reset/recalculate/delete flows, and that Player Details still shows source metrics, bidding history/predictions, and Team Impact independently.
- No preview URL was available at handoff time; do not wait excessively for CI.

## Safety boundaries

Review-only. Do **not** merge, enable auto-merge, deploy, dispatch workflows, delete the branch, or modify PR #20 without John's explicit authorization for that exact action.
