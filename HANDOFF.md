# Final Orchestrator Handoff — Required P0 Set (2026-09-22)

- **Verified session time:** 45 min of 60 target; exited early because all required P0 work was complete rather than inventing unrelated work.
- **Branch / PR:** `feat/waiver-ranking-sources`, existing PR #7 only. No merge, main/master push, force-push, production deployment, or workflow dispatch.
- **Required work completed:** Aggressive now equals the established player-sensitive Predicted Winning Bid; dynamic Sleeper ROS championship-calibrated VoRP is implemented; current Teams positional standings exclude eliminated rosters.
- **Independent preview QA:**
  - **Aggressive:** On the deployed preview with real 2025 FantasyPros ROS data, the explanation states maximum-bid/spending-ceiling, non-intrinsic-value, and intentional overpay semantics. Cards sorted by the same values previously shown as Predicted Winning Bid (`$19, $19, $15, $15…`), and the redundant Predicted Winning Bid footer was absent only on Aggressive.
  - **VoRP:** With the historical two-team league, replacement/startable depth correctly used the four-team floor; the external-source message stated independent Sleeper ROS usage; VoRP copy named the optimized four-team pool; unavailable rows rendered `Unavailable / Sleeper ROS required`, never fabricated `$0`.
  - **Active positional standings:** The preview identified exactly two surviving teams. Expanding active `jma1271` showed all QB/RB/WR/TE/FLEX/K/DEF ranks within `#1–#2`; expanding eliminated `4thandLange` showed `Eliminated — no current positional standing.`
- **Final full verification at head `c6c957e`:** 10 test files / **51 tests passed**; lint **0 warnings/errors**; production build passed; `git diff --check` passed; working tree clean and tracking only `origin/feat/waiver-ranking-sources`.
- **Blockers:** None.

---

# Handoff — Active-Team Positional Standings (2026-09-22)

- **Timestamp:** 2026-09-22 16:10:51 PDT
- **Task:** Fix the final documented P0 so current QB/RB/WR/TE/FLEX/K/DEF standings exclude eliminated teams.
- **Status:** COMPLETE on `feat/waiver-ranking-sources` for existing open PR #7. No merge, production deploy, workflow dispatch, force push, main-branch push, or Discord post was performed.
- **Implementation commit:** `a8da8a2` — `Exclude eliminated teams from positional ranks`

## Exact behavior

- `TeamsPage` derives `activeRosterIds` directly from the existing `computeEliminations(...)` result by selecting only `TeamInfo` entries where `eliminatedWeek == null`, then passes that required set into `computePositionGroupRanks`.
- `computePositionGroupRanks` still accumulates each team's actual historical `starters_points` and preserves fixed-slot/FLEX allocation, but constructs every current positional comparator from active roster IDs only. `outOf` is therefore exactly the active-team count, eliminated totals cannot shift an active rank, and no active rank can exceed that count.
- Equal position totals now explicitly sort by numeric roster ID ascending after points descending, so ties do not depend on Map/Set insertion order.
- Eliminated rosters are omitted from the rank result. Their expanded Teams card now says **“Eliminated — no current positional standing.”** and cannot display stale/misleading current rank cells. Active cards retain the existing rank colors and points UI.
- Production call-site search found exactly one current positional-standings caller (`src/pages/TeamsPage.tsx`), and it passes `activeRosterIds`. The helper's required third argument also prevents an unfiltered production call from compiling. Historical weekly total ranks were not changed.

## Regression coverage

- Added a realistic four-roster guillotine fixture where roster 4 is eliminated despite extreme 100-point historical totals in every position. Tests prove only rosters 1–3 are returned, all `outOf` values equal 3, every rank is at most 3, and the eliminated totals do not push active teams to rank 4.
- The same regression covers QB/RB/WR/TE/FLEX/K/DEF, historical point totals, distinct FLEX allocation from an extra RB starter, and equal QB totals with active IDs deliberately supplied in reverse order to prove numeric-roster-ID tie-breaking.
- Added Teams-card UI coverage proving eliminated cards suppress rank cells even if rank data is supplied, while active cards continue rendering position, rank, and points.

## Verification

- `npm test -- --run`: **PASS** — 10 test files, 51 tests.
- `npm run lint`: **PASS** — 0 warnings, 0 errors across 49 files.
- `npm run build`: **PASS** — TypeScript and Vite production build completed; 2,467 modules transformed.
- `git diff --check`: **PASS**.
- `grep -RIn "computePositionGroupRanks" src`: **PASS** — the production call in `TeamsPage.tsx` and focused analytics test both pass active roster IDs; no other caller exists.

## Preview / checks state

- Implementation commit pushed only to `origin/feat/waiver-ranking-sources`; PR #7 remained **OPEN**, unmerged, with head advanced from `1706c0a` to `a8da8a2`.
- Immediately after that push, GitHub `build` and Azure SWA `Build and Deploy` were **QUEUED**. The existing PR #7 preview environment remained **Ready** at <https://nice-moss-07ec56310-7.centralus.7.azurestaticapps.net>; the fresh deployment had not completed at handoff time.

---

# Handoff — Aggressive Equals Predicted Winning Bid (2026-09-22)

- **Timestamp:** 2026-09-22 16:02 PDT
- **Task:** Correct the P0 Aggressive formula to use the established player-sensitive Predicted Winning Bid logic and remove the obsolete step caps.
- **Status:** COMPLETE on `feat/waiver-ranking-sources` for existing open PR #7. No merge, production deploy, workflow dispatch, force push, or main-branch push was performed.
- **Implementation commit:** `88c8cac` — `Fix Aggressive waiver bids to match predicted values`

## Exact formula and behavior

- Each row computes Weeks-as-Starter once, passes that exact value through the existing `predictWinningBid` helper, and uses the returned value for both `row.predictedWinningBid` and the **Aggressive** suggestion. Therefore `Aggressive === row.predictedWinningBid` exactly for every player.
- The established continuous Weeks 1–17 season multiplier remains `2 × (17 - currentWeek) / 16`; no duplicate formula was added to production code.
- Removed `aggressiveStrategy` and all of its 50% / 25% / 12.5% step-cap and rank-factor behavior. Deep players with zero Weeks-as-Starter now correctly have both Aggressive and Predicted Winning Bid equal to `$0`.
- Preserved the Aggressive name/tab, persisted legacy-key migration, selected-strategy sorting, player-sensitive Weeks-as-Starter basis, and honest maximum-bid/spending-ceiling, non-intrinsic-value, overpay-risk semantics.

## UX change

- When **Aggressive** is selected, cards no longer render a second redundant **Predicted winning bid** footer because the two values are identical. The footer remains visible, including confidence, for every other strategy.
- Updated the strategy explanation to say explicitly that Aggressive equals Predicted Winning Bid and declines continuously as the season advances.

## Files changed

- `src/logic/waivers.ts`
- `src/logic/waiverDisplay.ts`
- `src/logic/__tests__/waivers.test.ts`
- `src/pages/WaiversPage.tsx`
- `src/pages/WaiversPage.test.tsx`

## Verification

- `npm test -- --run`: **PASS** — 8 test files, 48 tests passed. Coverage proves exact Aggressive/predicted equality across representative players and Weeks 1, 6, 14, and 17; Week 6 continuous interpolation; player-sensitive Aggressive sorting; removal of old thresholds; explanation semantics; and strategy-specific footer visibility.
- `npm run lint`: **PASS** — 0 warnings, 0 errors across 47 files.
- `npm run build`: **PASS** — TypeScript and Vite production build completed; 2,467 modules transformed.
- `git diff --check`: **PASS**.
- Scoped grep over the five relevant source/test files found no old `1/2 budget`, `1/4`, `1/8`, `50%`, `25%`, `12.5%`, or `aggressiveStrategy` implementation/copy.

## Preview / checks state

- Implementation commit pushed only to `origin/feat/waiver-ranking-sources`. PR #7 is **OPEN**, unmerged, and its head advanced from `e2ff7d7` to `88c8cac`.
- GitHub `build` and Azure SWA `Build and Deploy` checks were **QUEUED** immediately after the feature-branch push. Existing PR preview environment: <https://nice-moss-07ec56310-7.centralus.7.azurestaticapps.net>.

---

# Handoff — Dynamic Championship-Calibrated VoRP (2026-09-22)

- **Timestamp:** 2026-09-22 15:49 PDT
- **Task:** Replace the arbitrary `$30 per weekly point` VoRP model with independent Sleeper ROS point projections calibrated to championship roster value.
- **Status:** COMPLETE on `feat/waiver-ranking-sources` for existing open PR #7. No merge, production deploy, workflow dispatch, force push, or main-branch push was performed.
- **Implementation commit:** `fb2f571` — `Implement championship-calibrated Sleeper VoRP`

## Exact algorithm

- VoRP exclusively consumes an independent `Map<string, RosPlayerProjection>` built from actual Sleeper remaining-season weekly projections. `totalPoints` is the single basis for player values, replacement baselines, and championship calibration; FantasyCalc normalized values and FantasyPros ECR never enter VoRP math.
- The target-N optimized pool first fills `N ×` actual QB/RB/WR/TE base slots. It then fills all `N × FLEX` slots from one shared pool of the best remaining RB/WR/TE players and all `N × SUPER_FLEX/QB_FLEX` slots from one shared best-remaining QB/RB/WR/TE pool, without duplicate players. Projection ties break by Sleeper player ID.
- Each positional replacement baseline is the lowest-point player of that position actually selected into the optimized target-N pool: the last starter (for example QB28), never the first excluded player. Player VoRP is `max(0, player Sleeper ROS totalPoints - positional replacement Sleeper ROS totalPoints)`.
- A separate optimized starter pool is built for exactly four teams from the same lineup settings. Its player VoRPs are summed against the selected target-N baselines and divided by four. `dollarsPerVorp = initial league FAAB / average championship-team VoRP`; each bid is rounded from `playerVorp × dollarsPerVorp`. The model uses `ctx.budget`, not a roster's remaining FAAB, and returns unavailable for missing projections, incomplete pools, or zero/invalid calibration denominators.

## UX

- Added an accessible **Replacement/startable depth teams** selector with individual integer choices from the current surviving-team count down to four. Default/max are `max(4, surviving teams)` and effective values are normalized safely as league/team counts change.
- External Player Values sources keep controlling display ranks/source metrics and non-VoRP strategies, while a visible status bar states that VoRP independently uses Sleeper ROS projected fantasy points.
- VoRP strategy copy dynamically names Sleeper, the selected N-team optimized pool, the last-startable baseline, and final-four calibration. Missing Sleeper ROS shows a specific unavailable reason; card values render **Unavailable / Sleeper ROS required**, never `$0`. Other source-driven strategies remain usable.
- Preserved Aggressive semantics/math, selected-strategy sorting, FantasyPros ROS behavior, next-week projections, bye/injury display, and the remaining FAAB warning.

## Files changed

- `src/logic/waivers.ts`
- `src/logic/waiverDisplay.ts`
- `src/logic/rankingSources.ts`
- `src/logic/__tests__/waivers.test.ts`
- `src/pages/WaiversPage.tsx`
- `src/pages/WaiversPage.test.tsx`

## Verification

- `npm test -- --run`: **PASS** — 8 test files, 46 tests passed (expanded from 35). Focused tests cover base+shared FLEX, shared SUPER_FLEX, deterministic non-duplication, QB28 replacement, target-depth changes and normalization including fewer than four survivors, final-four calibration, exact `500 / 900` and 90 VoRP → `$50`, external-source isolation, and honest unavailable/source UI.
- `npm run lint`: **PASS** — 0 warnings, 0 errors across 47 files.
- `npm run build`: **PASS** — TypeScript and Vite production build completed; 2,467 modules transformed.
- `git diff --check`: **PASS**.
- Focused scan of `src/logic/waivers.ts`: no `30`, replacement-index, points-per-week replacement, or per-position FLEX replacement expression remains. Shared-pool evidence is in `selectShared(FLEX_POSITIONS, ...)` and `selectShared(SUPER_FLEX_POSITIONS, ...)`; dollar conversion is explicit at `initialLeagueFaab / averageChampionshipTeamVorp`.

## Preview / checks / browser evidence

- Implementation commit pushed only to `origin/feat/waiver-ranking-sources`; PR #7 remained **OPEN** and unmerged with head `fb2f571`.
- GitHub CI `build`: **PASS** (19s). Azure SWA `Build and Deploy`: **PASS** (1m07s). Preview environment: <https://nice-moss-07ec56310-7.centralus.7.azurestaticapps.net>.
- Browser-tested the deployed preview using the persisted real historical league `#SFB15 - Dallas Wings` (2025, two teams surviving). FantasyPros loaded and remained usable; the replacement selector correctly defaulted/maxed to **4 teams** despite fewer than four survivors. The visible status bar said VoRP independently uses Sleeper ROS and was unavailable for historical season 2025. Selecting VoRP changed the dynamic copy to the optimized **4-team** baseline and rendered all 48 shown recommendations as **Unavailable / Sleeper ROS required**, not `$0`.
- **Limitation:** the available real browser league is historical, so live positive 2026 Sleeper calibration could not be visually proven there. The historical preview did exercise the required unavailable path and external-source independence; full positive calibration and selector math are covered by focused pure/UI tests.

---

# Handoff — PR #7 Aggressive Maximum-Bid Reframe (2026-09-22)

- **Timestamp:** 2026-09-22 15:34:05 PDT
- **Task:** Replace the misleading maximum-bid strategy presentation and implementation naming with **Aggressive** while preserving its current math.
- **Status:** COMPLETE on `feat/waiver-ranking-sources` for existing PR #7. No VoRP, ranking-source, endpoint, merge, deploy, workflow-dispatch, or main-branch changes were made.
- **Implementation commit:** `1656925` — `Reframe maximum waiver bid as Aggressive`

## Summary

- Renamed the strategy key, calculation function, suggestion label, and tab to semantic `aggressive` / **Aggressive** naming.
- Reframed the dynamic explanation as the maximum bid to consider: a spending ceiling, not intrinsic player value. It explicitly says the strategy intentionally accepts overpay risk to land elite players.
- Preserved the existing ceiling math exactly: 50% of FAAB in weeks 1–8, 25% in weeks 9–12, and 12.5% thereafter, with the unchanged positional-rank factor.
- Preserved strategy-selected sorting and displayed recommendation lookup by the new key.
- Added Zustand persist version 1 migration so a legacy stored strategy key hydrates as `aggressive` instead of becoming invalid.
- Added focused coverage for strategy order/label/copy, unchanged representative early/mid/late and rank-adjusted values, Aggressive sorting, absence of stale visible wording, and legacy state migration.

## Files changed

- `src/logic/waiverDisplay.ts`
- `src/logic/waivers.ts`
- `src/store/appStore.ts`
- `src/store/appStore.test.ts`
- `src/logic/__tests__/waivers.test.ts`
- `src/pages/WaiversPage.test.tsx`

## Exact verification results

- `npm test -- --run`: **PASS** — 8 test files, 35 tests passed.
- `npm run lint`: **PASS** — 0 warnings, 0 errors across 47 files.
- `npm run build`: **PASS** — TypeScript and Vite production build completed; 2,467 modules transformed.
- `git diff --check`: **PASS** — no whitespace errors.
- Stale wording search over source/docs/public: only `src/store/appStore.ts` contains the legacy lowercase key, exclusively in the required persistence migration. No user-facing `Exp. Starter` or `Exponential` wording remains.

---

# Handoff — PR #7 Review Changes (2026-09-22)

## FantasyPros ROS source correction

- Review found the first FantasyPros integration used draft/preseason ECR endpoints; the PPR URL redirects to FantasyPros' **2026 Fantasy Football Draft Rankings** consensus cheat sheet.
- Corrected all scoring modes to verified current rest-of-season pages:
  - PPR: `https://www.fantasypros.com/nfl/rankings/ros-ppr-overall.php`
  - Half-PPR: `https://www.fantasypros.com/nfl/rankings/ros-half-point-ppr-overall.php`
  - Standard: `https://www.fantasypros.com/nfl/rankings/ros-overall.php`
- Renamed the source to **FantasyPros ROS ECR** and added endpoint regression coverage so draft URLs cannot silently return.
- Direct handler probes succeeded for all formats: 349 PPR players, 350 half-PPR players, and 349 standard players; each returned the exact ROS source URL and Jahmyr Gibbs at current ROS ECR #1.

## Status
Implemented on `feat/waiver-ranking-sources` for existing PR #7. No merge, production deployment, workflow dispatch, or push to `main` was performed.

## Source provenance and selector
- Replaced the three source buttons with one native accessible `Player Values` select. It has Sleeper ROS, FantasyCalc, and FantasyPros ECR options and no redundant `Active:` copy.
- Removed Football Absurdity from the UI, client, types, API route, and API dependencies. It was **not** relabeled.
- Added a direct FantasyPros ROS ECR Azure Function adapted from the proven Draft Assistant proxy pattern. The function fetches FantasyPros' verified `ros-ppr-overall.php`, `ros-half-point-ppr-overall.php`, or `ros-overall.php` page, parses embedded `ecrData`, retains each actual `rank_ecr`, and reports the exact source URL. Direct live handler invocations returned HTTP 200 and 349–350 eligible QB/RB/WR/TE players depending on scoring, led by Jahmyr Gibbs at current ROS ECR #1. The season-value score only converts ECR into descending positive numbers for model math; cards display the original ROS ECR rank.
- League reception scoring selects the matching FantasyPros PPR, half-PPR, or standard page. No third-party feed is attributed to FantasyPros.

## Waiver UX/model changes
- Weeks-as-Starter is first and is the initial strategy. The pure board builder also defaults to Weeks-as-Starter ordering. Suggestions are selected by `strategy` key, not tab/array index.
- Each of Weeks-as-Starter, Safe, Exponential Starter, and VoRP has concise strategy-specific copy.
- Removed the Floor control, local state, clamp option, clamp function, and dead path. Raw recommendations and the existing over-budget warning remain.
- Cards show official 2026 team bye weeks from the NFL schedule release. Missing teams/unsupported seasons say `Bye unavailable`; completed byes say `Bye passed (W#)`.
- An independent Sleeper weekly query runs for the upcoming week regardless of season-long source. It uses league reception scoring and shows `Next week: N.N pts · WR#`. Positional ranks are computed from the full weekly projection payload before roster/availability filtering. Exact Sleeper injury metadata renders as a compact badge; projection values are never used to infer injury or matchup quality. Bye and missing-projection states are explicit.

## Regression coverage
- Native dropdown label/options/change behavior, no Football Absurdity, no `Active:` copy.
- Weeks-as-Starter first/default and default board ordering.
- Key-based strategy outputs and unclamped raw recommendation behavior.
- Official bye lookup plus honest unsupported-season behavior.
- Weekly positional rank includes rostered players from the complete projection pool (available WR remains WR2 behind a rostered WR).
- External original source rank plumbing and league-to-FantasyPros scoring format.

## Exact browser verification
Ran the final production bundle with Azure Static Web Apps CLI and local API functions, then tested in headless Chromium against real Sleeper league **#SFB15 - Dallas Wings** (`1237312439318478848`, 2025), roster 1 / user `4thandLange`.
- The `Player Values` control appeared as an accessible combobox with exactly Sleeper ROS, FantasyCalc, and FantasyPros ECR.
- Sleeper ROS honestly showed unavailable because the real league is 2025 while Sleeper state is 2026; the dropdown remained usable.
- Selecting FantasyPros loaded live direct ECR data. The board opened with Weeks-as-Starter first/selected and showed Jahmyr Gibbs `RB#1 · ECR #1`, Ja'Marr Chase `WR#1 · ECR #2`, model dollars, predictions, `Next week: No projection`, `Bye unavailable`, and real Sleeper injury badges including Out/IR/Questionable.
- Clicking Safe changed both per-card strategy values/labels and the explanation to `Uses a conservative position-and-rank baseline for steady bidding.`
- The browser caught and prompted a fix for a null comparison that initially rendered unsupported historical byes as `Bye`; the rebuilt final bundle correctly renders `Next week: No projection · Bye unavailable`.
- Limitation: no accessible real 2026 Sleeper league was available for browser proof of live weekly-point/rank and 2026 bye text. That data path is covered by focused regression tests; the historical real-league browser correctly exercises the honest unavailable states.

## Verification
- `npm test`: **PASS** — 6 files, 30 tests
- `npm run lint`: **PASS** — 0 warnings/errors
- `npm run build`: **PASS**
- `git diff --check`: **PASS**
- Direct FantasyPros function invocation: **PASS** — HTTP 200, 132 players, direct fantasypros.com source URL

## Remaining
- Optional active-team positional-rank bug was not attempted; required review changes took priority.
- After push, confirm PR #7 preview/check status and, if a real current-season league becomes available, repeat browser verification for numeric weekly projection rank and 2026 bye text.

---

# PR #6 Sleeper ROS Waiver Handoff

## Follow-up season-deflation prediction model (2026-09-22)

- Replaced the temporary historical-ratio predictor with John's deterministic Weeks-as-Starter season curve.
- Exact anchors for a 17-week fantasy season: Week 1 = `2.0×`, Week 9 = `1.0×`, Week 13 = `0.5×`, Week 15 = `0.25×`, Week 17 = `0×`.
- The sequence simplifies exactly to `multiplier = 2 × season fraction remaining`, or `2 × (17 - currentWeek) / 16` for Weeks 1–17.
- Predicted bid is `Weeks-as-Starter value × current-week multiplier`, preserving player quality and `$0 → $0` behavior while converging to zero at season end.
- Historical 2025 report supports strong deflation (average winning bid $88 W1 → $12 W9 → $3 W13), but exact bid/WAS ratios cannot be backtested without weekly projection snapshots.
- Added exact multiplier-anchor unit tests. Verification: targeted 10/10, full 23/23, lint clean, build and diff-check passed.

## Follow-up selected-strategy sorting (2026-09-22)

- Waiver rows now re-sort descending whenever the active strategy changes; Safe, Exponential, Weeks-as-Starter, and VoRP no longer reuse Safe's ordering.
- Regression tests cover active-strategy ordering, deep-player prediction `$0`, and player-sensitive predictions.
- The intermediate historical-ratio prediction experiment from this commit was superseded by the season-deflation model documented above.

## Follow-up Safe / Weeks-as-Starter corrections (2026-09-22)

- Removed Safe's artificial `0.4` minimum rank premium; sufficiently deep players now decay to `$0` rather than retaining a position-specific dollar floor.
- Fixed Weeks-as-Starter to include the two-team championship week. Positional rank #1 now starts every remaining week and exactly matches Safe value.
- Waiver rows expose and display `starterWeeks / possibleStarterWeeks` when Weeks-as-Starter is selected.
- Regression coverage includes a QB22 worth `$0` under Safe and QB1 receiving full Safe value for 11/11 starter weeks.
- Verification: targeted tests 7/7, full tests 20/20, lint clean, production build passed, `git diff --check` passed.

## Branch / PR

- Branch: `feat/john-feedback-batch-0922`
- PR: #6 (`feat/john-feedback-batch-0922` → `main`)
- Sleeper ROS implementation commit: `ca512d1` — `feat: use Sleeper ROS projections for waivers`
- Prior review fixes preserved:
  - `e7aa3b9` — league-wide rank basis + raw over-remaining-FAAB warning
  - `5ed7475` — prior review handoff
- No merge, deploy, workflow dispatch, production action, or `main` push was performed.

## Projection source and exact semantics

Waiver rankings and values now use Sleeper **rest-of-season projections**, not matchup scoring history.

1. Fetch `GET /v1/state/nfl`.
2. Require the selected league season to equal the current Sleeper NFL state season. The page shows an honest unavailable state for a historical season; it never substitutes historical averages.
3. Choose the first ROS week as `max(state.week, state.display_week + 1, 1)`:
   - With the verified 2026 state (`week: 3`, `display_week: 2`), week 3 is included.
   - If Sleeper marks the nominal current week completed (`display_week >= week`), aggregation advances to the next week.
4. Fetch every weekly endpoint from that week through week 18: `GET /v1/projections/nfl/regular/{leagueSeason}/{week}`.
   - Requests use a concurrency cap of four, avoiding a sequential waterfall and unbounded fan-out.
   - TanStack Query caches the aggregate by season/start/end for 30 minutes, retains it for six hours, and retries once.
   - The full-season endpoint is intentionally not used because its `gp: 18` totals are not exact ROS totals.
5. Select `pts_ppr`, `pts_half_ppr`, or `pts_std` using the league's `scoring_settings.rec`, matching the Draft Assistant behavior.
6. Sum the selected field across all requested weeks. Missing player weeks contribute zero (bye/inactive). `pointsPerWeek` is the ROS sum divided by every requested week, so byes remain represented rather than disappearing from the denominator.
7. A player with no selected Sleeper scoring field is omitted. There is no fallback to matchup scores or another projection field.

A bounded live endpoint verification on 2026-09-22 confirmed weeks 3, 4, and 18 return projection maps containing all three selected totals. Representative counts were 1,057 scored records in week 3, 1,118 in week 4, and 1,144 in week 18. No payload was saved or committed.

## Waiver / FAAB behavior

- All projected players are ranked at each position before availability and display filtering. The regression still proves the available QB behind 21 stronger projected QBs is QB22.
- Available-player detection is projection-driven; a historical scorer with no ROS projection does not appear.
- Board ordering and Safe, Exponential Starter, and Weeks-as-Starter values use projection-driven league-wide position rank.
- Replacement levels and VoRP use Sleeper ROS projected points per remaining week.
- The existing predicted-winning-bid display continues to describe historical league bid behavior, while the four recommendation strategies use ROS values.
- The raw recommendation and over-remaining-FAAB warning behavior from `e7aa3b9` remains unchanged.
- UI copy explicitly says `Sleeper rest-of-season projections`, shows ROS total and per-week values, and includes honest loading/error/empty-season states with retry where actionable.
- If projection requests fail or return no usable totals, the page does not render historical waiver values.
- Teams/Hub analytics remain on their prior data source; this change is scoped to Waivers/FAAB.

## Files changed in `ca512d1`

- `src/api/types.ts` — typed NFL state and weekly Sleeper projection payloads
- `src/api/client.ts` — state/weekly projection endpoints and concurrency-limited week fetcher
- `src/api/hooks.ts` — cached state and aggregate ROS projection hooks
- `src/logic/projections.ts` — scoring selection, start-week semantics, and weekly ROS summation
- `src/logic/waivers.ts` — projection-driven ranks, ordering, replacement level, VoRP, and availability
- `src/pages/WaiversPage.tsx` — ROS wiring, labels, loading/error/retry states, and projection display
- `src/logic/index.ts` — projection exports
- `src/logic/__tests__/projections.test.ts` — weekly sum, format selection, no field fallback, and week semantics
- `src/logic/__tests__/waivers.test.ts` — projection-driven QB22/ranks, VoRP, no historical fallback, and preserved raw-bid behavior

## Verification

- Targeted projection + waiver tests: **passed** — 2 files, 9 tests
- Full `npm test`: **passed** — 4 files, 19 tests
- `npm run lint`: **passed** — 0 warnings, 0 errors
- `npm run build`: **passed**
- `git diff --check origin/main...HEAD`: **passed**
- Reviewed the complete PR file list and implementation scope; the continuation changes only projection plumbing and Waivers/FAAB calculations/tests, not Teams/Hub analytics.
