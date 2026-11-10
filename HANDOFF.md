# HANDOFF — Page-navigation cache reuse

## Scope and authorization

- Owner selected the request/cache work in Discord `1569671232092377141` and narrowed/approved a small cache-reuse package in `1569671809161371649`.
- Exact base: `cf097ee6d0531dda4bbbfb4f5c9ee4266ee97b85` (`origin/main`).
- Branch: `feat/page-navigation-cache-reuse`.
- Review only: no merge, auto-merge, branch deletion, deploy/dispatch, runtime/config change, or live/provider/database mutation is authorized.

## Delivered behavior

- Audited the shared page data hooks. Historical transaction/matchup reads, source-specific values, week-specific scoring/projections, league metadata/users, and the player database already use bounded caches with material inputs in their query keys.
- Found one demonstrated page-remount duplicate: `useRosters()` used zero freshness plus `refetchOnMount: 'always'`, so a same-league page visit, navigation away, and return made two `GET /league/{leagueId}/rosters` requests.
- Current rosters now reuse the existing TanStack Query result for five minutes under `['rosters', leagueId]`. Stale mount and window-focus refresh remain enabled. Existing direct `refetch()` bypasses freshness and obtains updated ownership.
- No new cache abstraction, persistent cache, UI behavior, valuation/bidding behavior, provider write, or unrelated optimization was added.
- Changed files: `src/api/hooks.ts`, `src/api/hooks.test.ts`, `PROGRESS.md`, and `HANDOFF.md`.

## Request-count evidence

- Same league, first mount then back-navigation/remount while fresh: **2 requests before → 1 after**.
- Different league: separate request under its own key.
- Explicit refresh: **+1 request**, with the hook exposing the updated roster response.

## Verification

- Focused: `npm test -- --run src/api/hooks.test.ts` — 9/9 passed.
- Full frontend: `npm test` — 407/407 passed across 47 files.
- Managed API: `(cd api && npm test)` — 61/61 passed.
- `npm run typecheck` — passed.
- `npm run lint` — 0 errors; two pre-existing React effect warnings in unrelated files.
- `npm run build` — passed.
- `git diff --check` — passed.
- The correction changes request timing only and has no visual state, so desktop/mobile browser viewport QA would not add evidence beyond the deterministic remount test.

## Remaining / gate

- PR URL, exact pushed head, natural CI, mergeability, and preview status must be recorded after push/open.
- No implementation blocker or approved follow-up remains in this package.
- Keep the PR review-only until John explicitly authorizes that exact PR.
