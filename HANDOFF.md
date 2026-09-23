# Guillotine Companion PR #8 Handoff

**Updated:** 2026-09-22 19:42 PDT  
**Status:** COMPLETE  
**Branch:** `feat/hub-roster-visibility`  
**Implementation head:** `e188a39bbd49bc20ffe654ef300d175d8914227f` (a subsequent HANDOFF-only commit contains this report)  
**PR:** OPEN / CLEAN / MERGEABLE / **UNMERGED** — https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/8  
**Exact preview:** https://nice-moss-07ec56310-8.centralus.7.azurestaticapps.net

## Commits in this follow-up

- `fa4139b2646df643a9f5ab44a2abd749f685a4c5` — Keep projected lineup rankings coherent
- `7a5e77fbdb0b6ed770143a4c54b5b8b6b55016bc` — Add compact roster-aware waiver board
- `e188a39bbd49bc20ffe654ef300d175d8914227f` — Tighten waiver source controls on mobile

All three commits were normally pushed only to `origin/feat/hub-roster-visibility`.

## Delivered behavior

### 1. Hub compact rank labels

- Every visible Projected Lineup Strength rank now uses compact `rank/active-count` text such as `26/28`.
- Each group retains a detailed accessible label with group/duplicate-slot context, points, exact upcoming NFL week, rank, and active-team denominator (for example: `WR ×2: 16.0 projected points for NFL Week 3, rank 26 of 28 active teams`).
- Focused component tests cover compact visible text, removal of the verbose visible form, and detailed accessible text.

### 2. Shared optimal upcoming-week lineup coherence

- Hub score/current rank and Teams Projected total/order/rank continue to share `projectBestLineup` through `projectAllTeams`.
- Teams expanded breakdown now selects `computeProjectedLineupGroupRanks` in Projected mode and historical `computePositionGroupRanks` only in Historical mode.
- Projected unavailable states now honestly say `Projected lineup-group rankings unavailable.` instead of implying historical starter data.
- A realistic regression fixture proves a higher-projected current BENCH WR displaces a lower-projected Sleeper starter, and proves agreement across the optimized total/rank, Hub STARTER/BENCH assignment, Teams Projected order/total/rank, and RB/WR/FLEX/SUPER_FLEX group ranks.
- The fixture includes duplicate RB slots, FLEX, SUPER_FLEX, every roster player, three active survivors, and an eliminated team with intentionally huge projections that is excluded from all current projected pools.

### 3. Waivers show rostered players

- Added accessible checkbox exactly labeled `Show rostered players`; default is OFF.
- Enabled mode keeps one source/strategy-sorted board and adds active-roster players with both `Rostered` and `Owner: <identity>`.
- Rostered cards have `aria-disabled="true"` and contain no add/bid action control.
- Eliminated-team players are not considered rostered and remain eligible as available players.
- Default available rows continue to use the existing capped candidate display; the expanded all-player display does not feed back into source rank, positional rank, replacement baselines, VoRP, starter weeks, or bid values.
- Focused logic tests compare complete available-row objects with the same rows in the all-player board and test active owner/eliminated release semantics. UI tests cover OFF-by-default, enable callback, owner/rostered labels, disabled semantics, and no action button.

### 4. Compact 375px waiver cards

- Cards use dense header/context rows while retaining player name, position/NFL team, strategy value, owner/rostered status, over-budget warning, injury status, next-week points/rank or bye, bye week, starter weeks, selected ROS source/rank/value, and predicted-bid context (still intentionally suppressed for Aggressive).
- Strategy/source/position/toggle controls retain 44px targets (the checkbox uses a 44px label target); no tiny card actions were introduced.
- Focused UI tests prove retained context/warnings and Aggressive-only duplicate suppression.

**Exact density method:** Browser DOM `getBoundingClientRect()` on the old deployed PR preview at head `449712e` and the fresh PR preview at head `e188a39`, both at an exact `375 × 812` viewport, using the first ten available-player cards.

- Before: first-ten heights `194.5, 155.5, 155.5, 179.5, 155.5, 155.5, 179.5, 155.5, 179.5, 155.5px`; average **166.9px**.
- After: all first ten cards **111px**; average **111px**, a **33.5% height reduction**.
- Full cards per list-aligned 812px viewport: **4 → 6** (**50% more**).
- Full cards in the initial 375×812 page viewport: **2 → 3**; partially visible card count: **3 → 4**, despite adding the required roster toggle and source explanation.

### 5. Compact ranking-source selector

- Visible options are exactly `Sleeper`, `Fantasy Pros`, and `FantasyCalc`.
- Closed selector uses `w-fit max-w-full`, measured at **117px** inside a **321px** mobile content width (and 117px inside 464px on desktop).
- Accessible `Player Values` label and `aria-describedby` help clearly distinguish ROS sources: Sleeper projections, Fantasy Pros ECR, and FantasyCalc market values; it explicitly says next-week context always uses Sleeper.
- Focused tests cover exact options, content sizing classes, accessible relationship, explanatory semantics, and source changes.

## Files changed in this follow-up

- `src/components/HubPositionRankings.tsx`
- `src/components/HubPositionRankings.test.tsx`
- `src/logic/analytics.ts` tests in `src/logic/__tests__/analytics.test.ts`
- `src/logic/teamPositionGroups.ts`
- `src/pages/TeamsPage.tsx`
- `src/pages/TeamsPage.test.tsx`
- `src/logic/rankingSources.ts`
- `src/logic/waivers.ts`
- `src/logic/__tests__/waivers.test.ts`
- `src/pages/WaiversPage.tsx`
- `src/pages/WaiversPage.test.tsx`

The full PR diff also contains the previously delivered Hub roster/warning/bye/visibility work from earlier PR #8 commits; scope review found no unrelated new files in this follow-up.

## Verification

### Automated

- Focused item 1: `HubPositionRankings.test.tsx` — pass.
- Focused item 2: `analytics.test.ts`, `hubRoster.test.ts`, `TeamsPage.test.tsx` — pass.
- Focused items 3–5: `waivers.test.ts`, `WaiversPage.test.tsx` — pass.
- Full suite: **15 files / 96 tests passed**.
- Lint: **0 warnings / 0 errors**.
- Production build: TypeScript + Vite passed.
- `git diff --check origin/main...HEAD`: passed.
- Working tree: clean; local head equals origin feature head.
- Fresh-head GitHub CI `build`: passed.
- Fresh-head Azure `Build and Deploy`: passed normally.

### Browser — fresh PR preview

Real browser data: SeaMex Guillotine 2026, 28 active / 32 total. Fixture-only proof is explicitly distinguished below.

**375×812**

- Hub: visible group ranks `26/28`, `18/28`, `27/28`; DOM accessibility text includes NFL Week 3, points, rank, and 28 active teams. Real optimized full roster showed 9 STARTERS and 4 BENCH plus projected team score/current active rank.
- Teams Projected: active-only order showed `proj #1/28 · 101.1 pts`; expanded `nexs83` projected groups showed only the honestly available WR/K/DEF projection groups (`WR #25 18p`, `K #7 8p`, `DEF #21 6p`) because the live weekly payload lacked complete QB/RB/TE/FLEX data.
- Teams Historical: the same expanded team changed to historical `hist #3/28 · 219.6 pts` and historical QB/RB/WR/TE/FLEX/K/DEF group results, proving tab-specific models in the live UI.
- The higher-bench-player displacement across every surface is proven by the focused realistic fixture; live data did not expose an unambiguous displacement case for manual assertion.
- Waivers: checkbox was OFF with 43 default rows. Enabled mode showed 445 source-ranked rows, including 271 disabled rostered cards. Example: `Jahmyr Gibbs, rostered by 5cents87`, visible `ROSTERED`, `Owner: 5cents87`, `aria-disabled=true`, and zero card buttons.
- Zay Flowers retained identical `$105`, `WR#4`, `276.0` ROS points, `17.3/wk`, `14/14 starter wks`, next-week rank/value, bye, injury, and predicted bid when rostered display was toggled. It also remained identical after selecting Safe + WR and toggling rostered display back off.
- Compact selector/options/help and exact density measurements are documented above.

**1440×900**

- Hub compact/accessibility semantics and 9 STARTERS / 4 BENCH remained present with no horizontal overflow.
- Teams Historical expanded breakdown remained tab-correct with no horizontal overflow; Projected had been verified at 375px on the same fresh code path.
- Waiver card remained 111px; selector remained 117px inside 464px content; no horizontal overflow.

## Remaining work

- No remaining implementation or QA work from requested items 1–5.
- Human review/merge decision remains. PR #8 is intentionally **OPEN and UNMERGED**.
- Unrelated product backlog items in `PROGRESS.md` were not touched.

## Safety statement

- No push to main/master.
- No merge or self-merge.
- No production deployment.
- No `workflow_dispatch`, `gh workflow run`, or manual workflow trigger.
- Only normal PR push automation produced the Azure preview.
