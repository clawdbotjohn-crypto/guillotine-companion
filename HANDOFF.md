# Guillotine Companion — PR #8 Final Review Handoff

## State

- PR: https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/8
- Branch: `feat/hub-roster-visibility`
- Status: **OPEN / UNMERGED**
- Start HEAD verified before edits: `ed86f385cbdec31a451662f9b0ee20d427d16836` locally and on origin, clean tree.
- Implementation commit: `b5f03b8` — `refine projection ranks and waiver hierarchy`

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

- Fresh-head Azure preview verification: **not yet performed at this handoff update**. Do not treat earlier preview observations as proof for `b5f03b8`.
- Mobile 375px/desktop checks still required if normal PR automation publishes a fresh preview before cutoff: Hub, Teams Projected/Historical, strategy switching, disclosure hover/focus/tap, bye colors, Waiver density/bid column, and VoRP control.

## Remaining / constraints

- Push feature branch only, then update PR description and record fresh checks/exact preview URL.
- Do not merge, deploy production, force-push, run `workflow_dispatch`, or run `gh workflow run`.
- `PROGRESS.md` PR #8 review items were checked with concise evidence after all implementation/tests passed.
