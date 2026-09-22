# PR #6 Review Fix Handoff

## Branch / PR

- Branch: `feat/john-feedback-batch-0922`
- PR: #6 (`feat/john-feedback-batch-0922` → `main`)
- Implementation commit: `e7aa3b9` — `fix: rank waiver values league-wide and flag over-budget bids`
- Push: successful to `origin/feat/john-feedback-batch-0922`
- No merge, deploy, production workflow, or `main` push was performed.

## Corrections completed

### League-wide waiver positional rank

- `buildWaiverBoard` now calculates positional ranks from the complete `PlayerSeason` map before applying availability or `maxPerPos` display filtering.
- The league-wide rank is used for the displayed `posRank` and all rank-dependent strategies (Safe, Exponential Starter, and Weeks-as-Starter). VoRP replacement levels already use the complete season pool, and predicted winning bid receives the league-rank-based Safe value.
- Regression coverage proves a lone available QB behind 21 higher-scoring players is displayed as QB22 and receives rank-22 values (`$60` Safe, `$150` Exponential, `$0` Weeks-as-Starter in the test context), not available-only QB1 values.
- A second regression proves `maxPerPos` limits displayed rows without renumbering league-wide ranks.

### Over-remaining-FAAB warning without raw-value clamp

- The Waivers page reads `rosterId` from the app store, finds that roster, and calculates actual remaining FAAB as league budget minus `roster.settings.waiver_budget_used` (floored at zero).
- Page context now shows `Your FAAB remaining $X`.
- A displayed strategy recommendation above that amount retains its raw value and shows a focusable warning icon. Its accessible/hover text is: “More than your FAAB remaining; this bid is not currently possible.”
- The default no-floor path remains unclamped, with a regression proving a raw `$188` recommendation remains `$188` when only `$20` remains.
- The optional budget-floor control remains an explicit pacing clamp, but now uses the selected user's actual remaining FAAB rather than the total league budget.

## Ranking data source (verified)

Current waiver ranking data comes from `buildPlayerSeasons(matchups)` in `src/logic/analytics.ts`. It aggregates Sleeper weekly matchup `players_points` over the season and calculates each player's season-to-date scoring average (`totalPoints / games`). The Waivers page passes that complete map to `buildWaiverBoard`.

It does **not** currently use Sleeper forward projections, FantasyCalc, or FantasyPros.

## Files changed for these fixes

- `src/logic/waivers.ts`
- `src/logic/__tests__/waivers.test.ts`
- `src/pages/WaiversPage.tsx`
- `src/components/FaabOverBudgetWarning.tsx`
- `src/components/FaabOverBudgetWarning.test.tsx`
- `HANDOFF.md`

## Verification

- Targeted waiver/warning tests: **passed** — 2 files, 5 tests
- Full `npm test`: **passed** — 3 files, 14 tests
- `npm run lint`: **passed** — 0 warnings, 0 errors
- `npm run build`: **passed**
- `git diff --check origin/main...HEAD`: **passed**
- Reviewed `git diff origin/main...HEAD` name/status and summary. The only new files beyond the existing PR scope are the focused warning component and waiver/warning tests; no unrelated implementation changes were introduced by this correction.

A representative live Sleeper/store state was not reliable for browser verification, so the warning was verified at component/DOM level instead: the test confirms a focusable warning with the exact accessible label/title and tooltip text. Logic tests separately verify selected-roster remaining-FAAB math and that low remaining FAAB does not clamp raw recommendations.
