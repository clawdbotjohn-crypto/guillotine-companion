# Guillotine Companion — PR #8 Final Review Handoff

## State

- PR: https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/8
- Branch: `feat/hub-roster-visibility`
- Status: **OPEN / UNMERGED**
- Start HEAD verified before edits: `ed86f385cbdec31a451662f9b0ee20d427d16836` locally and on origin, clean tree.
- Commits:
  - `b5f03b8` — `refine projection ranks and waiver hierarchy`
  - `80bc04f` — `document PR 8 final review verification`
  - `bff6e11` — `make shared disclosures hover-state reliable`

## Projection investigation (real endpoint evidence)

Investigated before changing completeness behavior on 2026-09-22 PDT:

- `GET https://api.sleeper.app/v1/projections/nfl/regular/2026/3` returned an object with **9,421 player-ID keys**, so the weekly endpoint itself was available.
- Only **859 rows** had numeric `pts_half_ppr`; many endpoint rows contain ADP/rank metadata but no weekly fantasy-points field.
- Numeric weekly field counts were identical for `pts_ppr`, `pts_half_ppr`, and `pts_std` (859 each); 40 explicit zero values existed for each.
- IDs are mixed by design: normal players use Sleeper IDs (examples from the response/player directory included kicker IDs such as `11538`, `12620`, `10244`), while defenses use team abbreviation IDs. Verified numeric DEF values for `ARI`, `ATL`, `BAL`, `BUF`, `SEA`, and `WAS`.
- Cross-checking `/v1/players/nfl` showed legitimate omissions/no numeric weekly row across positions, including bye/inactive/stale-directory cases. This confirms that player-row completeness is not a valid league-wide availability test.
- The initially guessed old league ID `1237312439318478848` returned 404 and was not used as real-league proof. No claim is made that a specific private roster payload was verified.

Conclusion implemented: an empty weekly map remains the honest endpoint-unavailable state. Once a usable weekly map exists, missing player rows/unfilled assignments contribute zero; they no longer suppress that configured group for every active roster.

## Completed scope

- Projected lineup coverage:
  - Removed the all-or-nothing per-player completeness gate.
  - Every configured supported group is ranked for every active roster.
  - Missing/bye/unfilled assignment points are honest zero.
  - Historical mode remains based on historical starters and actual matchup points.
  - Fixtures cover all groups, duplicate WR slots, FLEX, SUPER_FLEX, K, DEF, omitted projection=0, all active teams, and excluded eliminated teams.
- Lineup-strength cards:
  - Aggregate labels are plain (`WR`, never visible `WR ×2`).
  - Compact rank is `4/28` style.
  - Points/slot/week/rank detail moved to shared accessible hover/focus/tap disclosure.
  - Duplicate active-team/week/source chrome removed.
- Hub summary:
  - One `Week N projected points` heading with prominent total.
  - Added ordinal rank among every original roster, including eliminated teams, distinct from active-only current/risk rank.
  - Last Week Score now displays ordinal rank using that historical week's entrant count (pre-elimination denominator).
- Shared bye proximity:
  - `ByeWeekText` + `getByeProximity` reused by Hub roster and Waivers.
  - passed=green; current/+1=red; +2/+3=orange; +4/future/unknown=neutral; color-independent labels retained.
- Waiver hierarchy:
  - Bright left position marker; status beside player name.
  - One compact `WR #4 • NYG • Bye Wk 6` metadata line; only bye fragment gets proximity color.
  - Source/ROS details moved behind the rank's accessible disclosure.
  - Strategy words removed from the selected-value display; warnings retained.
  - Starter weeks display only for Weeks-as-Starter.
  - Predicted bid moved directly under suggested value and remains hidden for Aggressive.
  - Deleted hardcoded `predictedConfidence` model/UI and updated regressions.
- Copy/control refinements:
  - Visible `ROS sources: …` sentence removed; compact source help is disclosed accessibly.
  - Requested Weeks-as-Starter/Safe/Aggressive/VoRP copy implemented and tested.
  - Renamed to `VoRP team count`; old visible definition removed and replaced by accessible hover/focus/tap help with the 1-QB/16th-best-QB example.
  - VoRP-only control behavior and honest Sleeper ROS unavailable text preserved.

## Files

- Shared UI/helpers: `src/components/ContextDisclosure.tsx`, `src/components/ByeWeekText.tsx`, `src/logic/byeProximity.ts`, `src/logic/rankFormat.ts`
- Projection semantics/UI: `src/logic/analytics.ts`, `src/components/HubPositionRankings.tsx`, `src/pages/HubPage.tsx`
- Waiver semantics/UI: `src/logic/waivers.ts`, `src/logic/waiverDisplay.ts`, `src/pages/WaiversPage.tsx`
- Focused regressions in corresponding `*.test.ts(x)` plus `src/logic/__tests__/byeProximity.test.ts`.

## Verification

Passed at implementation commit:

- `npm test -- --run` — **16 files, 104 tests passed**
- `npm run lint` — **0 warnings, 0 errors**
- `npm run build` — production TypeScript/Vite build passed
- `git diff --check origin/main...HEAD` — passed
- `git diff --check` — passed

## Browser / preview

Fresh normal Azure PR preview for code head `bff6e1134f83bfced796fb96fd42ffa795bccf25` deployed successfully:

- Exact URL: https://nice-moss-07ec56310-8.centralus.7.azurestaticapps.net
- Azure `Build and Deploy` run: https://github.com/clawdbotjohn-crypto/guillotine-companion/actions/runs/35817328660 (success; `headSha` verified as `bff6e1134f83bfced796fb96fd42ffa795bccf25`).
- 375×812 mobile verified:
  - Hub renders `Week 3 projected points`, `13th/32 among original rosters`, compact projected ranks, every configured group for this league (QB/RB/WR/TE/FLEX/K/DEF), and no horizontal overflow.
  - Tapping the WR rank changed `aria-expanded` to true and exposed the projected-points/slot/rank detail.
  - Waiver first card rendered compact metadata and right column (`WR #4 • BAL • Bye Wk 13`, `$105`, `21%`, predicted bid below); disclosure tap opened; Aggressive removed predicted bid and starter weeks; VoRP rendered only its team-count control and tappable exact help.
  - Teams Projected first expanded row showed every configured group above; Historical switched to actual historical position totals/ranks; no horizontal overflow.
- 1280×900 desktop verified:
  - Hub heading/grid, configured groups, original-roster rank, and bye classes rendered without horizontal overflow.
  - Waiver compact hierarchy/source help rendered without overflow.
  - Keyboard focus displayed the rank tooltip; a real browser hover initially revealed a CSS-only variant ordering issue, fixed in `bff6e11`; the fresh-head preview was reloaded and hover was re-tested successfully (`display: flex`, `aria-expanded: false`).
  - Tap/open behavior had already been verified and focused regression now explicitly covers hover, focus, and tap.
- Browser tab closed after verification.

## Remaining / constraints

- Do not merge, deploy production, force-push, run `workflow_dispatch`, or run `gh workflow run`.
- `PROGRESS.md` PR #8 review items were checked with concise evidence after all implementation/tests passed.

## Sep 22 21:49 final follow-up — investigation before patching

- **Hub rank contexts:** `HubPage` built a second projection order from every roster and rendered it with `ordinal()` plus “among original rosters,” even though `projectAllTeams` had already computed the required active-only rank/risk together. The historical Total Points card independently summed only the selected roster and had no all-original-roster ranking helper. `formatHistoricalWeekRank` itself injected ordinal suffixes. The header also rendered the same projected status later represented by the summary.
- **Waiver ownership/help/copy:** ownership was passed only as a truthy rostered marker, so `WaiverPlayerCard` could not compare the owner roster ID with the selected roster. The source disclosure was a sibling of the entire label/select block, visually placing it away from the heading; its content repeated source details. The first rendered strategy occurrence was the abbreviated `VoRP` toggle label.
- **Bid grid mobile behavior:** the horizontal scroller had no ref/effect tied to week/position filtering, preserving stale `scrollLeft` after the columns changed. The sticky header/body cells specified only `minWidth` (body did not even specify that), reused `z-10`, and had no fixed/max width or separating border, permitting the sticky layer and underlying content to overlap at mobile scroll offsets.
- **FAAB consistency/summary:** `FaabTracker` owned a local `getTeamStatus` that returned `safe` for every active team and never received shared weekly projections. Its summary was computed over all rosters before the visibility filter and mixed league total/average/median, so the figures did not describe the displayed pool.

## Sep 22 final follow-up — implementation and validation

### Delivered

- **Hub rank contexts:** `formatHistoricalWeekRank` now emits compact `rank/entrants`; `computeAllRosterHistoricalRanks` provides season-to-date rank across all original rosters (including eliminated); the projected card consumes `projectAllTeams`' active-only `projRank/projOutOf/risk` and the shared `StatusBadge`. Removed the duplicate header badge and all “among original rosters” projection copy.
- **Waivers:** cards compare ownership against the selected roster and only selected-team-owned rows receive the green 4px border plus explicit screen-reader copy. Every rostered article remains `aria-disabled`. Player Values uses compact `Sleeper` / `Fantasy Pros` / `FantasyCalc` options, an adjacent disclosure with exact copy `Choose your player rankings source.`, and the first visible VoRP term is `Value over Replacement Player (VoRP)`.
- **League Bids:** `BidGrid` resets its own scroller in a layout effect whenever week/position columns change. A one-position grid uses a compact 260px minimum, keeping player and bid amount in the viewport. WK cells use opaque backgrounds, inline/class `left: 0`, fixed/min/max 52px width, distinct z-indexes, and a right border.
- **League FAAB:** `LeaguePage` feeds the same `projectAllTeams` result used by Hub/Teams into `FaabTracker`. Active rows render that projection's shared risk and active-only projected rank; eliminated rows remain eliminated with no active rank. Summary is displayed-pool Remaining FAAB Min / Avg / Max via `logic/faabDisplay.ts`, with one currency formatter.

### Files

- Runtime: `src/pages/HubPage.tsx`, `src/pages/WaiversPage.tsx`, `src/pages/LeaguePage.tsx`, `src/components/BidGrid.tsx`, `src/components/FaabTracker.tsx`, `src/logic/analytics.ts`, `src/logic/faabDisplay.ts`, `src/logic/rankFormat.ts`, `src/logic/waiverDisplay.ts`, `src/logic/index.ts`.
- Focused regressions: `src/pages/HubPage.test.tsx`, `src/pages/WaiversPage.test.tsx`, `src/components/BidGrid.test.tsx`, `src/components/FaabTracker.test.tsx`, `src/logic/__tests__/analytics.test.ts`.
- Implementation commit: `12433cccbec28d89c4b4ed9ca89007a41335c8f7` (`fix final hub waiver bids and FAAB review`).

### Exact automated validation

- Focused: `npm test -- --run src/pages/WaiversPage.test.tsx src/components/FaabTracker.test.tsx src/components/BidGrid.test.tsx src/pages/HubPage.test.tsx src/logic/__tests__/analytics.test.ts` → **5 files, 30 tests passed**.
- Full: `npm test -- --run` → **19 files, 111 tests passed**.
- `npm run lint` → **0 warnings, 0 errors**.
- `npm run build` → production TypeScript/Vite build passed (existing Vite >500 kB advisory only; not a lint warning/error).
- `git diff --check` → passed.
- `git diff --check origin/main...HEAD` → passed.

### Fresh real-preview browser evidence

Implementation-head Azure run `35821608642` succeeded with `headSha=12433cccbec28d89c4b4ed9ca89007a41335c8f7`; preview: <https://nice-moss-07ec56310-8.centralus.7.azurestaticapps.net>.

Real league `SeaMex Guillotine 🪓` / selected `Houston0ilers`:

- **375px Hub:** projected `91.3`, active `13/28`, `Safe`; Total Points `136.5`, all-original `25/32`; Last Week `68.4`, historical-week `26/30`; no “among original rosters.”
- **375px Waivers:** compact options and expanded first VoRP term rendered; disclosure was 4px beside heading on the same row and showed exact copy. With rostered enabled: 10 selected-team rows had 4px green `rgb(16,185,129)` border and screen-reader ownership text, 260 other rostered rows were neutral, and all 270 were `aria-disabled=true`.
- **375px Bids:** All/Grid verified at `scrollLeft=0`, `200`, and max `457`; WK header/body remained at x=16 (the scroller's exact left), 52px wide, opaque, bordered, and above underlying cells with no screenshot bleed/seam. From max scroll, selecting WR immediately reset to `scrollLeft=0`; `Jordan Addison` and `$50` were both fully in bounds, and filtered table had no horizontal overflow. List retained WR filtering and real bid rows.
- **375px FAAB:** active pool explicitly said `28 displayed`, Min `$215`, Avg `$468`, Max `$500`; `Houston0ilers` showed `Safe · Proj 13/28`, exactly matching Hub/Teams. Showing eliminated changed the label to `All teams · 32 displayed`, rendered four Eliminated badges, and retained exactly 28 active projected ranks.
- **1280px desktop:** Hub, Waivers, Bids All/Grid, WR/Grid, WR/List, and FAAB were rechecked with real data; no page-level horizontal overflow. Hub retained all three contexts, Waivers retained compact source/VoRP/alignment, WR grid retained `$50` at scroll zero, list retained the filter, and FAAB retained displayed-pool labels/statuses.
- Browser tab was closed; no local dev server was started.

### Remaining / safety state

- No requested Sep 22 final-follow-up item remains unchecked in `PROGRESS.md`.
- PR #8 remains **OPEN and UNMERGED**. No main/master push, merge, force-push, production deploy, workflow dispatch, manual workflow run, or OpenClaw change was performed.

## Sep 22 22:30 post-QA corrections

John found two regressions on the fresh preview. Removed the remaining local Hub switch-league/logout arrow and empty right-side wrapper from both active and preseason headers; the global header remains the single league-switch control. Restored the strategy selector label to compact `VoRP`; only its first visible explanation expands `Value over Replacement Player (VoRP)`, then uses VoRP normally. Updated the selector/description regression separately.

Validation: focused Hub/Waivers **14/14**, full **111/111**, lint **0 warnings / 0 errors**, production build, `git diff --check`, and comparison diff check all pass.
