# Guillotine Companion — Handoff

**Updated:** 2026-10-05 21:45 PT  
**Repo:** `clawdbotjohn-crypto/guillotine-companion`  
**Branch/worktree:** `fix/team-impact-compact-stack` / `/home/john/guillotine-team-impact-simplify`

## Scope completed (owner-approved)

1. **Team Impact simplification (Player Details dialog)**
   - For `teamImpact.status === 'available'` with non-zero impact, Team Impact now renders only a compact four-line vertical stack:
     1) signed lineup-points delta (e.g. `+8.5`)  
     2) `Overall before/outOf → after/outOf`  
     3) `<position> before/outOf → after/outOf`  
     4) `Lineup pts before → after`
   - Removed the previous metric-card grid and all explanatory prose in this state (`Projection change`, `Starter change`, `Assumed drop`, `FAAB`, footer copy).
   - Preserved unavailable/`None` and no-impact/`None` states.
   - Preserved accessibility by adding an aria label for the delta line.

2. **Waivers side-rail cleanup**
   - Removed the separate right-side `Bids` / `Hide bids` disclosure control from `WaiverPlayerCard`.
   - Removed `predictionsOpen` local state and the duplicate inline `WaiverManagerPredictions` panel.
   - Kept compact card click as the primary action opening `PlayerDetailDialog`.
   - Preserved manager prediction data path into the popup (`Predicted bidding` in dialog still present).

## PR / preview

- **Review PR:** https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/21
- **Branch:** `fix/team-impact-compact-stack`
- **Preview URL:** https://nice-moss-07ec56310-21.centralus.7.azurestaticapps.net

## Validation

### Focused local tests (resource-safe)
- Checked memory before Node work (`free -m`, top RSS).
- Ran:
  - `NODE_OPTIONS=--max-old-space-size=1024 nice -n 10 npm test -- src/components/PlayerDetailDialog.test.tsx src/pages/WaiversPage.test.tsx`
- Result: **26/26 tests passed**.

### CI
- `build` ✅
- `Build and Deploy` ✅

### Hosted QA on PR preview
- Confirmed on live preview (2026 SeaMex data path):
  - no side `Bids` rail on Waivers cards,
  - card tap/click opens Player Details,
  - popup still exposes `Predicted bidding`,
  - Team Impact shown as compact four-line stack with no explanatory text.
- **Blocker for explicit mobile rerun:** after desktop verification, OpenClaw browser control service timed out before running a second forced 390×844 capture pass.

## Files changed

- `src/components/PlayerDetailDialog.tsx`
- `src/components/PlayerDetailDialog.test.tsx`
- `src/pages/WaiversPage.tsx`
- `src/pages/WaiversPage.test.tsx`
- `PROGRESS.md`

## Safety / boundaries

- PR #20 untouched.
- No merge, no auto-merge, no production deploy, no branch deletion.
