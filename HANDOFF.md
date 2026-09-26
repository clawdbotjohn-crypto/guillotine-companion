# PR #10 — owner review round 2 handoff

## Status

Owner round-2 implementation and hosted QA are complete on `feat/bidding-behavior-profiles`. Do not merge or deploy from this worktree.

## Implemented

- Restored collapsed Waivers density. The right rail now contains Suggested bid plus at most three one-line `manager $bid` summaries. Full manager rows are not mounted until expansion.
- Rostered mode shows only Current value and suppresses manager predictions/overall prediction.
- Player metadata is limited to name, natural position + positional rank, team, next-week projection, and bye (plus a compact rostered owner state). Raw source value, duplicate weekly rank, starter weeks, and injury text were removed from the collapsed presentation without changing valuation math.
- Overall Predicted bid remains only when manager predictions do not exist (preseason/Week 1 fallback).
- Expanded players show all manager predictions in Likely/Possible/Unlikely order supplied by the canonical prediction builder, with Unlikely de-emphasized and FAAB-capped values carrying red plus a text label.
- Manager rows open the shared `ManagerDetailsModal`; there are no nested Bidding History accordions.
- Shared modal provides focus entry/restore, Escape/backdrop close, focus trapping, body scroll lock, mobile max-height/scroll, and sections in this order: Upcoming byes, Team needs, Bidding History.
- Upcoming byes are current roster players in current week + next two, ordered by bye then value descending, displaying only player name and position/rank.
- Team needs reuses the buyer-likelihood thirds: top third is an accessible green up-arrow strength, bottom third an accessible red down-arrow need, middle omitted.
- History uses a mobile-safe 2x2 metric grid (Suggested, Actual, Pre-bid FAAB, Ratio). Actual is green + Won or red + Lost.
- Teams Bid Profiles uses the same modal and exact shared style badge. Collapsed cards retain FAAB/multiplier and add canonical `Highest bid: $N` with a no-history state.

## Root causes, prevention, mitigation

### Stale/non-available Waivers players

**WHY:** Two independent issues compounded. `useRosters` cached current roster ownership as fresh for one hour, so a Hub/Teams visit before waivers could seed stale ownership for Waivers. Separately, `computeAvailablePlayers` and `computeRosteredPlayerOwners` skipped eliminated rosters. That incorrectly treated a player still present on any current Sleeper roster as free merely because our elimination model marked that roster eliminated.

**Prevention:** Current roster queries now have `staleTime: 0`, always refetch on mount, and refetch on focus. Availability/owner identity always uses all current Sleeper rosters. The active roster set is used only for eligible buyers and projection comparisons.

**Mitigation/live evidence:** SeaMex 2026 league `1312112493526536192` currently has Zay Flowers (`9997`) and Jeremiyah Love (`13287`) on roster 15, so both are excluded from free agents. Sleeper currently reports no roster ownership anywhere for Lamar Jackson (`6994`), so Lamar remains honestly available; no player IDs are hard-coded into product logic.

### 29 active / 3 eliminated

**WHY:** `useAllMatchups(..., 18)` treated a week as usable as soon as any matchup had positive points. Once Thursday scoring began, the partial current week entered `detectEliminationRate` and `computeEliminations`, changing both the inferred chop rate and elimination count. `NFL display_week` cannot fix this because the live state already reports the in-progress week.

**Prevention:** `getCompletedLeagueWeek()` now clips current-season matchup fetches to authoritative `league.settings.last_scored_leg`, with a defensive `state.week - 1` fallback. `getActiveRosterIds()` provides one canonical survivor set used by Hub, Teams, Waivers, projections, and buyer tiers. Historical leagues still scan stored weeks.

**Mitigation/live evidence:** SeaMex reports league `leg=3`, `last_scored_leg=2`; only completed Weeks 1–2 are fed to elimination. Live UI reports 28 active / 4 eliminated. The deterministic 32-team regression fixture also proves 28/4 while partial Week 3 data exists.

## Primary files

- `src/components/ManagerBiddingProfiles.tsx` — shared modal, badge, manager rows, Teams cards
- `src/logic/managerDetails.ts` — byes ordering and shared team-need tier mapping
- `src/pages/WaiversPage.tsx` — compact card/rostered/fallback/expanded flow
- `src/pages/TeamsPage.tsx` — shared details data and canonical active set
- `src/api/hooks.ts` — live roster freshness and bounded matchup query
- `src/logic/elimination.ts` — completed-week boundary and shared active set
- `src/logic/waivers.ts` — current ownership across all Sleeper rosters
- `src/pages/{HubPage,LeaguePage,TeamProfilePage}.tsx` — same completed-week boundary
- focused tests in component/page/logic/API test files

## Verification

- Focused owner-requirement tests: 33 passed.
- Full frontend: 23 files / 144 tests passed.
- API: 44 passed.
- `npm run lint`: 0 warnings/errors.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- Changed-file secret scan: no findings.
- Direct live Sleeper verification: 32 current rosters; `last_scored_leg=2`; Zay and Jeremiyah owned by roster 15; Lamar currently unowned.
- Exact PR preview desktop: 28 active / 4 eliminated; compact cards were 131px with all three manager summaries (87px before profile data hydrated); no horizontal overflow.
- Exact PR preview at 390px: no horizontal overflow; modal was 340×743 inside an 844px viewport, body scroll locked, close control focused, and modal content scrollable.
- Hosted Waivers and Teams both opened the same modal with Upcoming byes → Team needs → Bidding History; history used the 2-column metric grid and displayed explicit Won/Lost labels.
- Hosted console: no runtime errors. Chromium reported only the pre-existing manifest touch-icon size warning.

## PR / preview

- PR: <https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/10>
- Implementation commit: `e13b9e11635b1a6f04f545b744657d054aee582a`
- Mergeability/checks at implementation push: MERGEABLE; CI and Azure Build and Deploy passed.
- Exact Azure preview: <https://nice-moss-07ec56310-10.centralus.7.azurestaticapps.net>
- Hosted desktop + 390px browser QA: passed; evidence above.

## Guardrails

No merge, main/master push, workflow dispatch, or production deployment was performed.
