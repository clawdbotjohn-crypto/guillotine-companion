# Handoff — PR #10 owner correction round 3.4 (2026-09-26)

John’s hosted 390px screenshot showed an empty top gap in expanded Bid Predictions after the style badge was removed. Root cause: manager name rendered in a separate first row while the prediction column remained in a second row beside only the likelihood label.

Fix: `ManagerPredictionRow` now uses one top-aligned flex row. The left column contains manager name + likelihood; the right column starts at the same top edge and contains Predicted + Remaining FAAB. Added a structural regression proving both columns are direct siblings of the top-aligned container and no stale top margin remains.

Verification before push: focused 11/11; full frontend 24 files / 156 tests; lint, typecheck, production build, and `git diff --check` passed. Pending commit/push, green preview, and John’s visual verification. No merge or production deploy.

---

# Handoff — PR #10 owner correction round 3.3 (2026-09-26)

John reviewed the completed 3.2 mobile preview and requested two final micro-corrections. Implemented directly on `feat/bidding-behavior-profiles`:

- Removed the style/aggression badge entirely from expanded Waivers `Bid Predictions` rows. Teams cards and manager details modal still render the full style + multiplier badge.
- Changed the empty Upcoming byes message to exactly `No byes in the next few weeks.`

Verification before push:
- Focused manager presentation: 11/11 passed.
- Full frontend: 24 files / 156 tests passed.
- Lint: passed.
- Typecheck: passed.
- Production build: passed.
- `git diff --check`: passed.

Pending at handoff creation: commit/push, CI + Azure preview deployment, and John’s visual verification. No merge or production deployment.

---

# Handoff — PR #10 owner correction round 3.2 complete (2026-09-26)

## Scope and state

Completed every checkbox in the top round-3.2 section and verified the final screenshot-backed layout and prediction consistency on the exact Azure PR environment with real **2026 SeaMex Guillotine** data.

- Implementation commit: `3460721c5a22ed2e0d6c3023f2f5bb0cb63a7044` (`fix: align mobile manager predictions`)
- Branch: `feat/bidding-behavior-profiles`
- PR: <https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/10> — OPEN, MERGEABLE/CLEAN
- Exact preview: <https://nice-moss-07ec56310-10.centralus.7.azurestaticapps.net>
- GitHub checks on implementation commit: `build` SUCCESS (run `36234980426`); `Build and Deploy` SUCCESS (run `36234980361`); Azure PR environment `Ready`
- Merge/deploy: **not merged; no production deploy or workflow dispatch performed**
- Blockers: none

## Correction trace and hosted evidence

1. **Compact expanded metrics and badge row** — `src/components/ManagerBiddingProfiles.tsx` now renders the manager name and style badge in one top-row flex container, then a right-side column of two compact inline label/value groups. The multiplier remains suppressed only through the explicit `prediction-row` presentation. Structural coverage in `ManagerBiddingProfiles.test.tsx` asserts same-row badge ancestry, no multiplier, inline metric groups, and 6px gap classes. Before, both amounts sat below their labels and the badge occupied the lower-left name column; hosted 390×844 after: badge/name center-line delta **0px**, `Predicted`→`$30` gap **6px**, `Remaining FAAB`→`$165` gap **6px**, first row **100.5px** high, no overlap/overflow. Desktop 1280×900 measured the same 6px/6px/0px geometry.
2. **Collapsed Suggested bid spacing** — `src/pages/WaiversPage.tsx` replaces the full-width `justify-between` row with one baseline-aligned adjacent group. `WaiversPage.test.tsx` rejects `justify-between` and requires the compact gap. Before screenshot: label/amount were visually separated across the rail; hosted after: `Suggested bid`→`$6` gap **6px** at both 390px and desktop, while the compact summary stayed **57.5px** high and yellow `Predicted bid $30` remained separate.
3. **Eligible prediction consistency and order** — `src/logic/managerPredictionDisplay.ts` adds one deterministic ordering contract: all Likely/Possible buyers precede Unlikely, feasible FAAB-capped prediction descends first, then likelihood/name/roster tie-breakers. `WaiverPlayerCard` derives its collapsed value from the first eligible row and never from market `predictedWinningBid`; `WaiverManagerPredictions` applies the same order at the rendering boundary. `WaiversPage.test.tsx` proves global Unlikely `$100` cannot beat eligible `$96`, and a global Unlikely `$120` cannot beat tied FAAB-capped eligible `$80`; the tied Likely row precedes Possible. Hosted Seth: collapsed **`Predicted bid $30`** exactly equals first expanded eligible **MikeZertuche89 `$30`**; the screenshot’s earlier first-row `$16` mismatch is gone.
4. **Popup Team Needs** — `src/components/ManagerBiddingProfiles.tsx` groups strengths first and weaknesses second, omits neutral only in the popup, and de-duplicates normalized positions with strength priority. Focused coverage supplies scrambled, conflicting duplicate, and neutral rows and requires `QB, TE` strengths followed by `RB, WR` weaknesses with no duplicate. Hosted 390px popup rendered **QB, DEF** strengths then **K** weakness: **3/3 unique positions**, **0 overlap pairs**. Hub all-position behavior is untouched.
5. **Popup FAAB copy** — the popup FAAB block keeps visible `Remaining FAAB` and amount/color but moves quartile meaning to its accessible group label. Tests require no visible Top/Bottom copy and the exact accessible name. Hosted 390px popup showed visible **`Remaining FAAB $165`** in bottom-quartile red `rgb(251, 113, 133)`, accessible name `Remaining FAAB $165, Bottom FAAB quartile`, and **zero visible quartile-copy elements**.
6. **Responsive/runtime QA** — exact hosted preview, real SeaMex 2026, desktop 1280×900 and mobile 390×844: document/card/dialog horizontal overflow deltas all **0px**; popup dialog **366px** wide at x=12..378; no Team Needs overlap; browser console **0 errors**.

## Verification

- Focused: `npm test -- --run src/components/ManagerBiddingProfiles.test.tsx src/pages/WaiversPage.test.tsx src/logic/__tests__/managerDetails.test.ts` — **3 files / 35 tests passed**
- Full frontend: `npm test` — **23 files / 154 tests passed**
- Managed Functions API: `cd api && npm test` — **2 files / 36 tests passed**
- `npm run lint` — PASS, 0 warnings/errors
- `npm run typecheck` — PASS
- `npm run build` — PASS
- `git diff --check` — PASS
- Changed-added-line secret-pattern scan — PASS, no matches (`gitleaks` unavailable)
- GitHub/Azure — both required checks SUCCESS; exact PR environment Ready

---

# Handoff — PR #10 owner correction round 3.1 complete (2026-09-26)

## Scope and state

Implemented every checkbox in the top `PR #10 owner correction round 3.1` section and verified the rendered fixes on the exact Azure PR environment with real **2026 SeaMex Guillotine** data. All explicitly out-of-scope items remain untouched.

- Implementation commit: `a3a6eeb` (`fix(ui): apply owner correction pass 3.1`)
- Branch: `feat/bidding-behavior-profiles`
- PR: <https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/10>
- Exact preview: <https://nice-moss-07ec56310-10.centralus.7.azurestaticapps.net>
- Hosted dataset: SeaMex Guillotine 2026; roster 19 / Houston0ilers for popup↔Hub bye comparison
- PR checks at implementation commit: `build` PASS; `Build and Deploy` PASS; Azure environment `Ready`
- Merge/deploy: PR remains open; **not merged; no production deployment or workflow dispatch performed**
- Blockers: none

## Why the prior QA missed these / prevention / mitigation

- **Ordering:** the previous Teams test encoded alphabetical ordering instead of the product requirement, and coincidental fixture names did not challenge multiplier order. Prevention: assert the rendered card sequence with names deliberately opposed to multipliers plus deterministic ties. Mitigation: sort descending on raw multiplier, then manager name and roster ID; FAAB is not a sort input.
- **Popup needs vs Hub:** prior tests treated shared classification as shared presentation and explicitly expected a neutral popup chip. Prevention: test each surface’s distinct rendering contract. Mitigation: retain shared `rankQuartile`, filter neutral only in popup, leave every Hub position visible.
- **Collapsed FAAB:** the earlier component assertion checked class tokens/screen-reader text but hosted QA did not inspect computed color/semantics on collapsed cards. Prevention: pair deterministic quartile coverage with computed hosted observations. Mitigation: collapsed values now carry explicit tier data, shared green/yellow/red token, stronger value emphasis, and an accessible tier label.
- **Suggested-bid layout:** earlier coverage checked words and divider absence, not geometry or sibling order, so a vertical stack passed. Prevention: assert a single flex row and label-before-value structure, then measure coordinates at both widths. Mitigation: label and amount now share the same horizontal row while manager-derived Predicted bid remains a separate yellow line.
- **Expanded predictions:** prior tests expected the multiplier, checked likelihood text presence without color, and validated global text order rather than column ancestry/vertical geometry. Prevention: assert the explicit badge presentation, computed status colors, and a dedicated prediction-side container with FAAB below Predicted. Mitigation: added the `prediction-row` badge variant and rebuilt the row into manager and stacked prediction columns.
- **Hub byes:** the helper boundary test manually supplied a week and never exercised the Hub caller, which passed projection week (`display_week + 1`) rather than scoring week. Prevention: regression starts with a Sleeper `NflState`, verifies `week`, and proves the first excluded week is absent. Mitigation: Hub now uses `getHubByeWindowWeek(nflState)` while projection fetching keeps its independent coordinate.

## Correction-by-correction evidence

1. **Multiplier ordering** — `ManagerBiddingProfiles.tsx`; focused test “sorts Teams profiles by multiplier descending with deterministic name and roster ties.” Hosted desktop + 390px: 32 cards monotonically descend from **MikeZertuche89 5.08x** to historical-less **z88**; no horizontal overflow. Current FAAB values vary independently of order.
2. **Surface-specific Team Needs** — `ManagerBiddingProfiles.tsx` and existing `HubPositionRankings.tsx`, both backed by `rankQuartile`; focused popup test now rejects WR neutral and Hub test retains neutral yellow. Hosted Houston0ilers popup showed only QB 27/28, RB 7/28, WR 26/28, TE 5/28, DEF 26/28—no neutral chips. Hub showed all QB/RB/WR/TE/Flex/K/DEF; neutral Flex 9/28 and K 12/28 were yellow (`rgb(245,158,11)`).
3. **Collapsed Current FAAB** — `ManagerBiddingProfiles.tsx`; focused component coverage asserts exact top/middle/bottom classes and non-color labels. Hosted cards exposed bottom `$165/$265` red, middle `$433` yellow, top `$500` green, with `data-faab-quartile` and accessible `Bottom/Middle/Top FAAB quartile` labels; popup Remaining FAAB used the matching tier treatment.
4. **Suggested bid left of amount** — `WaiversPage.tsx`; focused structural test requires one flex row and label-before-amount DOM order. Hosted Seth McGowan desktop geometry: label x=702, amount x=802.4, shared row y=439; mobile: label x=199, amount x=299.4, same row. Compact summary stayed 57.5px high at 390px; separate yellow `Predicted bid $30` remained.
5. **Expanded Bid Predictions** — `ManagerBiddingProfiles.tsx`; focused tests cover explicit `prediction-row` badge variant, status colors, prediction-side ancestry/order, and shared modal fallback. Hosted rows contained **zero multipliers**, while Teams cards and the opened Poncho87Ro modal retained `2.64x`. Likely/Possible/Unlikely computed green/yellow/red (`rgb(52,211,153)`, `rgb(251,191,36)`, `rgb(251,113,133)`). On each row Remaining FAAB was in the right prediction container and below Predicted (first row label y=586 vs Predicted y=542.5), with zero overflow at desktop and 390px.
6. **Exact bye horizon** — `hubRoster.ts`, `HubPage.tsx`, `logic/index.ts`; focused state-coordinate test includes week 5, includes week 7, and excludes week 8 for a current week of 5. Hosted current scoring week was 3 while projection display was Week 4: Houston0ilers popup and Hub both showed only Jonathon Brooks **W5**. Hub full roster visibly contained W6 and W7 players, but neither appeared as a warning, proving W6 is the first excluded boundary for the actual current-week-3 window.
7. **Responsive/console QA** — desktop 1280×900 and mobile 390×844 both had document overflow delta 0 on Teams, popup, Waivers expanded cards, and Hub. Browser console error log was empty.

## Verification

- New focused regression selection: **4 files / 32 tests passed**
- Full frontend suite: **23 files / 154 tests passed**
- Managed Functions API: **2 files / 36 tests passed**
- `npm run lint`: PASS, 0 warnings/errors
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS
- Changed-file secret scan: PASS, no matches
- GitHub CI/deploy and Azure PR environment: PASS / Ready

---

# Handoff — PR #10 owner review round 3 complete (2026-09-26)

## Scope and state

Implemented and preview-verified every checkbox in the top `PR #10 owner review round 3` section of `PROGRESS.md`. No Future PR/Future analysis item was implemented or analyzed. Current valuation strategy math and the Weeks-as-Starter profile baseline remain unchanged.

- Implementation commit: `cbbc23b7bab7322bcc12964c21d9dd605410bd8c` (includes the preceding round-3 commits on the same branch)
- Branch: `feat/bidding-behavior-profiles`
- PR: <https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/10>
- Exact Azure PR preview: <https://nice-moss-07ec56310-10.centralus.7.azurestaticapps.net>
- Preview league: real **SeaMex Guillotine**, season 2026, roster 19
- CI at implementation commit: GitHub `CI` PASS and `Deploy to Azure SWA` PASS
- Merge/deploy: PR remains open; **not merged; no production deploy/workflow dispatch performed**
- Blockers: none

## Requirement-by-requirement trace

1. **Shared modal geometry/accessibility** — `src/components/ManagerBiddingProfiles.tsx` uses a `document.body` portal, centered desktop layout, a near-full-height mobile layout, safe-area and fixed-nav bottom inset, internal scrolling, focus trap/restore, Escape, backdrop, and body-scroll lock. Focused test: `ManagerBiddingProfiles.test.tsx` “renders near-full-height safe-area geometry…”. Preview: Teams and Waivers modal at 390×844 measured x=12–378/y=12–768 with nav beginning y=780 (12px gap), zero horizontal overflow, close button initially focused, Tab trapped, Escape closed; desktop measured x=464–976/y=113.25–886.75 with 49.25px before nav. Bidding History was visible without awkward initial page scrolling.
2. **Shared position quartiles** — `src/logic/rankingQuartiles.ts`, `managerDetails.ts`, `managerPredictionDisplay.ts`, and `HubPositionRankings.tsx` use `rankQuartile`: top 25% strength, bottom 25% need, middle neutral. Focused tests: `rankingQuartiles.test.ts`, `managerDetails.test.ts`, `HubPositionRankings.test.tsx`, `ManagerBiddingProfiles.test.tsx` cover boundaries, ties/competition ranks, and 1/2/3-team leagues. Preview: Hub 7/28 was green, 9/28 and 12/28 yellow, 26/28 and 27/28 red; popup labels/colors used the same cutoffs (for example QB 2/28 green, RB 26/28 red, WR 12/28 yellow).
3. **Shared bye horizon** — `src/logic/byeProximity.ts` exports `isUpcomingByeWeek` and both `hubRoster.ts` and `managerDetails.ts` consume it. Focused tests: `byeProximity.test.ts`, `hubRoster.test.ts`, `managerDetails.test.ts`, `HubByeWarnings.test.tsx`. Preview: current scoring week was 4; Hub and popup showed Week 5 byes and excluded dates outside current week + next two.
4. **Prominent Remaining FAAB** — `ManagerDetailsModal` renders a prominent labeled FAAB block before bye/need/history content. Focused test: modal FAAB test in `ManagerBiddingProfiles.test.tsx`. Preview: `$500 / Top FAAB quartile` on BetoMtz and `$265 / Bottom FAAB quartile` in a Waivers-opened modal.
5. **No implementation/bid-count terminology** — removed counts and all `canonical` wording from `ManagerBiddingProfiles.tsx`. Focused tests assert absence in Teams, popup, and Waivers. Preview DOM searches across Hub, Teams, Waivers, and modal returned no `canonical`, `Learning`, or `No canonical bid`.
6. **Teams compact composition** — `TeamBidProfiles` places name + Highest bid on the left and one combined style/multiplier badge + Current FAAB on the right. Focused test: “restores Teams composition…”. Preview cards showed e.g. `5cents87 / Highest bid: $100 / Standard · 1.25x / Current FAAB $420`.
7. **Shared active-manager FAAB quartiles** — `faabQuartile`/`faabQuartileLabel` in `rankingQuartiles.ts` drive both Teams Current FAAB and modal Remaining FAAB, with active-roster filtering from `TeamsPage.tsx`. Focused tests cover ties, tiny leagues, max, and exact zero plus visible/screen-reader labels. Preview Teams DOM exposed middle yellow (`$420`), top green (`$500`), and bottom red (`$347`, `$71`) with non-color quartile text; popup matched.
8. **No Learning/insufficient style badge** — `ManagerStyleBadge` returns no badge for `insufficient`; no replacement implementation tag is shown. Focused tests assert both `Learning` and placeholder badge text are absent. Preview DOM contained neither `Learning` nor `Not enough history`.
9. **Neutral empty highest bid** — `TeamBidProfiles` renders `Highest bid: —` when history is empty. Focused Teams composition test covers this; no canonical empty-state wording exists.
10. **Style thresholds** — `BIDDING_PROFILE_MODEL_V1.aggressiveAtOrAbove` and `styleForMultiplier` in `biddingProfiles.ts` define Conservative `<0.85`, Standard `0.85..<1.50`, Aggressive `>=1.50`; every card/modal uses `ManagerStyleBadge`. Focused deterministic tests cover exactly `0.84`, `0.85`, `1.18`, `1.49`, and `1.50`. Preview showed 1.18-class values as Standard and no old 1.15 cutoff behavior.
11. **One collapsed manager-level prediction** — `WaiverPlayerCard` computes the maximum of active manager predictions and never reads `row.predictedWinningBid` for display. Focused Waivers/component tests prove a manager prediction of `$40` displays instead of old market `$61` and formula test proves `$42 × 1.50 = $63`, not `$61 × 1.50`. Preview showed one yellow `Predicted bid $30` on Seth McGowan.
12. **Natural compact composition/no divider/usernames** — collapsed Waivers card renders one inline yellow label/value, no manager names, no three-row summary, and no prior `border-t`. Focused test inspects text and markup. Preview collapsed DOM contained one prediction and no manager usernames.
13. **Exactly-zero behavior** — `WaiverPlayerCard` gates prediction and expansion on positive suggestion value and disables non-expandable cards. Focused keyboard/ARIA boundary test compares positive vs exactly zero. Preview: Seth McGowan `$6` had `aria-expanded=false` and was enabled; Shedeur Sanders `$0` had no prediction, no `aria-expanded`, and `disabled=true`.
14. **Expanded Bid Predictions visual parity/statuses** — `ManagerPredictionRow` renders manager, shared style+multiplier badge, Remaining FAAB, predicted amount, then `Likely bidder`/`Possible bidder`/`Unlikely bidder`; caps, ordering, formulas, and shared modal opening remain intact. Focused tests validate DOM order, all statuses, caps, active eligibility, and modal opening. Preview had 32 rows in original ordering (8 likely/15 possible/9 unlikely), and the row popup opened correctly.
15. **Heading rename** — `WaiversPage.tsx` now renders `Bid Predictions`. Focused Waivers test and hosted preview both observed the exact heading.
16. **Responsive/component coverage** — focused suites include modal placement/safe areas/nav inset/portal/focus/backdrop/Escape, rank and FAAB quartiles/ties/small leagues, bye horizon, terminology and Learning absence, empty state, threshold boundaries, Teams composition, highest prediction source, zero/positive ARIA behavior, divider removal, row order/statuses, caps, and modal opening. Hosted QA covered desktop and 390px mobile.

## Verification

- Focused round-3 selection: **9 files / 60 tests passed**
- Full frontend: **24 files / 151 tests passed**
- Managed Functions API: **36 tests passed**
- `npm run lint`: PASS, 0 warnings/errors
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS
- Changed-file secret scan: PASS, no matches
- GitHub CI: PASS
- Azure PR deployment: PASS
- Hosted browser: PASS on desktop 1440×1000 and mobile 390×844; no horizontal overflow; clean fresh-tab console (0 errors)

## Hosted evidence notes

- Waivers collapsed positive card: one yellow manager-derived prediction; no username or divider. Exact-zero card: disabled, no prediction, no expansion state/content.
- Expanded Waivers: exact `Bid Predictions` heading; rows contain manager → combined style/multiplier → Remaining FAAB → prediction → bidder status; shared modal opens.
- Teams: prior left/right composition restored; Current FAAB carries green/yellow/red quartile styling plus non-color text.
- Hub/modal: common quartile colors and current+next-two bye window observed.
- Modal: body portal fixed the transformed-card offset found during hosted QA; both Teams and Waivers now share correct placement.
- Fresh hosted tab console: zero errors.

---

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
