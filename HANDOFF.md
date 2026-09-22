# PR #6 Sleeper ROS Waiver Handoff

## Follow-up season-deflation prediction model (2026-09-22)

- Replaced the temporary historical-ratio predictor with John's deterministic Weeks-as-Starter season curve.
- Exact anchors for a 17-week fantasy season: Week 1 = `2.0×`, Week 9 = `1.0×`, Week 13 = `0.5×`, Week 17 = `0.25×`; interpolation is exponential (linear in log2 multiplier).
- Predicted bid is now simply `Weeks-as-Starter value × current-week multiplier`, preserving player quality and `$0 → $0` behavior.
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
