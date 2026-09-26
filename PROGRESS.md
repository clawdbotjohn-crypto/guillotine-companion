# Guillotine Companion — Progress

## 🚨 PR #10 owner correction round 3.1 — post-completion preview fixes (John, 2026-09-26; IMPLEMENT NOW)

**Status:** ✅ Completed and verified on the exact hosted PR preview at desktop and 390px. John reviewed the completed hosted preview and confirmed every item below is still valid. This section supersedes conflicting presentation details in prior completed sections. Keep Max VORP, replacement-level valuation, player bid history, and own-team border out of this correction.

**Failure protocol:** The previous run claimed 16/16 round-3 acceptance despite these visible mismatches. Before changing code, identify why each survived prior tests/hosted QA (ambiguous requirement, wrong surface asserted, stale/incorrect selector, or shared-helper logic not matching rendered data). Add regression tests that fail on the current implementation. Do not accept DOM presence alone when the requirement is ordering or layout.

- [x] **Teams → Bid Profiles ordering:** restore strict most-aggressive-to-least-aggressive ordering by manager multiplier. Use deterministic tie-breaking. FAAB quartile/color must not change card order. Verify the first/last real SeaMex cards and a deterministic fixture.
- [x] **Team Needs presentation differs by surface while categorization stays shared:**
  - Manager popup: show only top-quartile strengths and bottom-quartile weaknesses. Render no neutral/middle positions at all.
  - Hub: continue showing every position; neutral/middle positions remain visible in yellow.
  - Both must use the same shared quartile classification helper, with only the rendering/filter differing.
- [x] **Collapsed Teams FAAB color:** apply the exact same shared FAAB quartile text color and accessible tier semantics used by popup Remaining FAAB to collapsed `Current FAAB`.
- [x] **Waivers compact suggested-bid layout:** the text **Suggested bid** must be horizontally to the **left** of its amount, not beneath it. Preserve compact height and the separate yellow manager-derived Predicted bid behavior. Verify actual geometry/order at desktop and 390px, not only text presence.
- [x] **Expanded Waivers Bid Predictions card layout:**
  - On this one space-constrained surface only, omit the numeric multiplier from the aggression/style badge. Keep the multiplier everywhere else it currently belongs, including Teams Bid Profiles and manager popup/history tags. Implement via an explicit presentation option rather than altering shared model data.
  - Color bidder-likelihood text: **Likely bidder green**, **Possible bidder yellow**, **Unlikely bidder red**. Retain accessible text and existing buyer-tier math/order.
  - Place **Remaining FAAB beneath the Predicted bid amount** (John corrected “next to” to “beneath”). Do not put Remaining FAAB beneath the manager name/style column. Add structural/geometry coverage.
- [x] **Hub bye horizon regression:** the live Hub still renders one extra bye week compared with the manager popup. Trace the actual rendered data path and week-coordinate interpretation; then make Hub and popup show the same intended window of current scoring week + next two weeks. Add a boundary regression proving the first excluded week does not render on Hub. Do not merely assert both call the same helper.
- [x] Re-run focused tests, full frontend/API suites, lint, typecheck, production build, diff/secret checks, commit/push, green CI/preview deployment, and hosted real SeaMex QA at desktop + 390px.
- [x] Final `HANDOFF.md` must include a correction-by-correction evidence trace with before/after rendered observations, exact file/test, real ordering, popup-vs-Hub needs behavior, FAAB classes, Suggested-bid geometry, expanded-card column placement, and exact bye weeks included/excluded. No item is done until John’s visible complaint is absent on the exact hosted preview.

## 🔮 Future polish — identify John’s team card

- [ ] In Teams/Bid Profiles, give John’s own team the same green-border identity treatment used for John’s rostered players on Waivers. Reuse one ownership/current-user visual token and verify it remains accessible. John explicitly said this does not need to be in PR #10 round 3.1.

## 🚨 PR #10 owner review round 3 — modal/Teams terminology and visual consistency (John, 2026-09-26; IMPLEMENT NOW)

**Status: John authorized implementation. The attached mobile screenshot is the reference for the current problems. PR #10 scope is only this round-3 section; explicitly exclude all Future PR/Analysis sections below.**

**Owner-review gate:** Before claiming completion, produce a requirement-by-requirement trace in `HANDOFF.md` mapping every checkbox in this section to the implementation file, focused test, and real desktop/mobile preview observation. Re-read John’s full round-3 section after implementation and compare the rendered UI against it. Do not mark a checkbox complete from code inspection alone.

- [x] The shared manager-detail popup opens too low on mobile. Waivers and Teams must use the same placement: center it in the viewport or use a near/full-height mobile sheet. It must remain above fixed navigation, expose Bidding History without requiring awkward initial scrolling, respect safe areas, and preserve accessible focus/close behavior.
- [x] Position strength/need categories must be identical between Hub and the bid popup. Replace thirds with shared **top quartile = strength**, **bottom quartile = need**, middle 50% = neutral. Use one shared helper/component and deterministic tie/small-league behavior so labels cannot diverge.
- [x] Upcoming byes must use one shared window/helper on Hub and in the bid popup. John’s intended popup window is current week + next two weeks; Hub appears to include one extra week and should be aligned unless later feedback changes the common window.
- [x] Show **FAAB remaining** prominently in the manager popup.
- [x] Remove all user-facing bid-count/implementation copy from Teams Bid Profiles and the popup: no `3 bids`, `3 canonical bids`, numbered evidence counts, or `canonical bid` wording.
- [x] Restore the prior compact Teams Bid Profile card composition:
  - Combine bidding style and multiplier in one badge/element, as before.
  - Remove the bid-count text and put **Current FAAB** in that location.
  - Keep **Highest bid** on the left side.
- [x] Color Current/Remaining FAAB consistently across Teams and the modal. Rank **active managers** by current FAAB: top quartile green, bottom quartile red, middle 50% yellow/neutral. Ensure `$0` is red and the league maximum is green; add an accessible non-color label/description. Use one shared helper with deterministic ties and small-league behavior.
- [x] Remove the `Learning` tag. Managers without enough history get no style badge.
- [x] Replace `No canonical bid`/`No canonical bids` with a simple user-facing `—` (or similarly neutral empty state); never expose the word canonical.
- [x] Recalibrate bidding-style thresholds so `1.18×` is not Aggressive and **Aggressive starts at `1.50×`**. Preserve Conservative below `0.85×`; classify `0.85×` through `<1.50×` as Standard unless existing product semantics require a clearly documented narrower neutral subdivision. Update the one shared constant/helper, cards, modal, tests, and docs together. No `Learning` style.
- [x] **Superseding the prior collapsed three-manager summary:** collapsed Waivers player cards return to one compact overall **Predicted bid** in the prior yellow styling. Its numeric value is the highest eligible manager-level predicted bid (not the old market-adjusted `predictedWinningBid`). Do not show manager usernames or three prediction lines while collapsed.
- [x] Keep the compact card label/amount composition natural and remove the divider from the previous multi-manager layout.
- [x] Players whose current/suggested value is `$0` show no Predicted bid and the card is not expandable, because no meaningful manager-bid detail exists. Add keyboard/ARIA and boundary tests for exactly zero versus positive values.
- [x] Expanded Waivers manager predictions should visually reuse the compact Teams → Bid Profiles manager-card language: manager name, shared aggression/style badge beneath the name, FAAB remaining, predicted bid amount, and buyer status beneath that amount. Use clearer labels: **Likely bidder**, **Possible bidder**, and **Unlikely bidder**. Keep the same numeric predictions, eligibility, ordering, cap treatment, and shared modal opening behavior.
- [x] Rename the Waivers section heading from **Manager Predictions** to **Bid Predictions**.
- [x] Add responsive visual/component coverage for modal placement/safe-area/nav overlap, shared quartiles, shared bye window, FAAB display/colors, no implementation terminology, no Learning tag, style+multiplier composition, empty states, new category thresholds, and divider-free Suggested-bid layout.

## 🔮 Future PR — Max VORP strategy + empirical bid-model comparison (John, 2026-09-26)

**Product direction:** In its dedicated follow-up PR, **Max VORP becomes the default suggested-bid strategy and the baseline used for bidding-style ratios**, replacing Weeks as Starter. The separate empirical strategy-accuracy analysis below does **not** gate that default choice. Keep the dependency modular/versioned so John can swap the baseline again later. Do not alter PR #10 valuation math.

### Max VORP definition and league analysis
- [ ] Add a new suggested-bid strategy named **Max VORP**. For each player, compute VORP at every allowed remaining-team count (SeaMex currently spans 28 teams down to 4) and use that player’s maximum positive VORP across the range. Replacement-level players should naturally remain around `$0`; top players receive the strongest scarcity value; fringe current starters can retain value from an earlier/larger-team state even if they later fall below replacement.
- [ ] Before implementation, run an all-player SeaMex analysis across every allowed team count. At minimum include every player with positive VORP at the maximum team count; include all players if computationally reasonable. Report each player’s maximizing team count and verify whether any peak occurs at an interior count rather than only the largest or smallest allowed count. Do not assume endpoint-only behavior without evidence.
- [ ] Compare the full all-count maximum against the cheaper endpoint-only approximation (highest and lowest team counts). Quantify disagreements, player/value deltas, runtime, and positional patterns before choosing an optimization.
- [ ] Define replacement populations/positions, scarcity treatment, budget normalization, monotonicity, zero floor, tie handling, caching/performance, calibration fixtures, and migration/UX impact. Avoid cosmetic clamping or hard-coded thresholds.
- [ ] Preserve separate Weekly, Safe, and Aggressive strategies for comparison, but make the baseline strategy dependency explicit and swappable through one strategy selector/interface. Replace Weeks as Starter with Max VORP anywhere manager bidding-category ratios currently depend on the baseline, without coupling profiles permanently to Max VORP.
- [ ] Version the strategy used for predictions/history so future model swaps do not silently reinterpret historical ratios.

### Separate future analysis — which bid strategy best predicts real bids
- [ ] Build an offline analysis comparing Max VORP, Weekly, Safe, Aggressive, and the current Weeks-as-Starter baseline against historical real bids. Do not change production behavior until results are reviewed.
- [ ] Separate the target being evaluated: winning/top serious bids versus all bids. Low token bids may represent “only if nobody wants him” rather than willingness to win, so report metrics both with and without low-intent bids where a defensible rule can be defined.
- [ ] Use robust outlier handling for irrational/high bids (example: a `$200+` bid on backup RB Monangai). Candidate analysis: compare the top ~5 bids per player/waiver event after flagging an isolated top bid that is far above the next cluster. Never delete raw evidence; mark exclusions and run sensitivity analyses with all bids included.
- [ ] Predefine/compare defensible outlier rules (for example top-to-second ratio, median/MAD or IQR on normalized bid ratios) and avoid choosing the rule that merely makes the favored strategy look best. Report sample sizes and results under multiple thresholds.
- [ ] Normalize for available FAAB, week/team-count context, caps, player/position, and manager bidding behavior where possible. Evaluate MAE/median absolute error, calibration, rank correlation, winner accuracy, and serious-bid/top-N fit rather than one aggregate metric.
- [ ] Use walk-forward or leave-week-out validation so the same event does not both fit and evaluate manager multipliers/strategy thresholds. Produce a reproducible report with raw-event traceability and a recommendation, including uncertainty and known data limitations.

### Guardrail
- [ ] Preserve current PR #10 math until this dedicated PR is approved. PR #10 may only suppress zero-value prediction UI as specified above; it must not introduce interim value zeroing or switch the profile denominator.

## 🔮 Future PR after Max VORP — replacement-level zeroing for non-VORP strategies

- [ ] Diagnose why Weekly, Safe, Aggressive, and any other non-VORP bid strategies still assign **positive (`> $0`) values to too many replacement-level players**. John explicitly excluded this from the current PR #10 work.
- [ ] After Max VORP lands, define a shared replacement-level/zero-floor concept that makes those strategy curves reach `$0` at an appropriate player tier without cosmetic display clamping, arbitrary player-count cutoffs, or breaking monotonicity.
- [ ] Preserve genuinely positive values above replacement and evaluate by position, remaining-team count, week, FAAB scale, and edge cases around exactly `$0`.
- [ ] Add comparative fixtures/visualizations for Max VORP, Weekly, Safe, and Aggressive before changing production values; keep strategy implementations independently selectable.

## 🔮 Future PR — player-level waiver bid history (John, 2026-09-26)

**Goal:** Give both free-agent and rostered-player cards useful market history without mixing historical transactions into current bid predictions. Implement after PR #10 and the Max VORP follow-up unless reprioritized.

- [ ] For any player with historical bids, add a player-card expansion section **before Bid Predictions** that shows prior successful/winning claims: buyer/manager, winning amount, and bidding cycle/week/date. Use canonical transaction identity/deduplication and truthful successful-claim classification.
- [ ] Add a separate **Most recent bids** section below winning history that lists all legitimate bids from that player’s latest completed bidding cycle, including winning and losing bids, ordered meaningfully with clear outcome labels. Do not combine bids from multiple cycles or count duplicated transaction views.
- [ ] Apply the same history to free agents and currently rostered players. A currently free player may still have prior winning/release history; current ownership and historical acquisition are separate facts.
- [ ] On collapsed **rostered-player** cards, replace vague value-adjacent prediction wording with **Winning bid: $N** for that player’s most recent successful acquisition when available. Prefer `Winning bid` over `Actual Value`; “Actual Value” is ambiguous and could be mistaken for the current valuation. If no valid acquisition exists, use a neutral empty state or omit the line.
- [ ] Keep the existing current-value display for rostered players; winning bid is acquisition history, not a substitute for current modeled value. Do not show manager predictions for rostered players.
- [ ] Define behavior for `$0` claims/free-agent adds, dropped-and-reacquired players, multiple winning claims, commissioner moves, trades, orphaned/duplicate transaction data, failed bids, ties, and incomplete historical cycles.
- [ ] Reuse the same won/lost colors and accessible labels as Bidding History, but do not expose `canonical`, reconstruction, evidence-count, or other implementation terminology.
- [ ] Add focused transaction/dedupe/cycle-selection tests plus desktop/mobile card-layout and expansion tests.


## 🚨 PR #10 owner review round 2 — modal details + live-data regressions (John, 2026-09-25)

**Status: implemented on the PR branch; code/tests complete and live preview verification recorded in `HANDOFF.md`.**

- [x] In the Bidding History modal, color **Actual bid** green for a successful/winning claim and red for a legitimate losing claim. Include a non-color won/lost label or icon for accessibility.
- [x] Make the manager’s bidding style/category visually obvious by restoring the existing colored style badge next to the manager/owner name. Reuse the exact badge colors and visual language from Teams → Bid Profiles rather than introducing a second style system.
- [x] In each manager-history modal, place **Upcoming byes** above Team needs:
  - Include that manager’s currently rostered players whose byes occur during the current NFL week or next two weeks.
  - Order first by nearest bye week, then by current player value descending; do not display the value.
  - Display player name and position + positional rank when available, e.g. `WR #4`.
  - Handle no upcoming byes with a compact empty state.
- [x] Below Upcoming byes and above Bidding History, add **Team needs** from next-week position projections across active teams:
  - Top/strong third: green up-arrow plus green position label, e.g. `↑ QB`.
  - Bottom/weak third: red down-arrow plus red position label, e.g. `↓ WR`.
  - Omit or neutrally de-emphasize middle-third positions.
  - Use SVG/icon + text, not color alone; keep deterministic tie/small-league handling aligned with buyer-likelihood calculations.
- [x] Teams → Bid Profiles must use the same manager-detail/modal component and Bidding History presentation as Waivers so the two surfaces cannot drift.
- [x] Keep the Teams collapsed manager card largely as-is, but add a compact `Highest bid: $N` line beneath the style badge, sourced from canonical bidding history and with an honest no-history state.
- [x] **Bug investigation: stale/non-available players in Waivers.** Zay Flowers and Lamar Jackson were free agents before Tuesday’s bidding but are now rostered; Jeremiyah Love appears as a free agent despite likely always being owned. Determine whether current ownership is stale, incorrectly derived from transaction-week state, filtered to active rosters, or cached. The default available-player list must be computed from current Sleeper roster ownership after processed waivers. Do not merely hard-code exclusions. Add current-roster/cache invalidation regression tests and real SeaMex verification. This may become a separate follow-up commit/PR only if the owner-review UI work would otherwise be blocked.
- [x] **Regression investigation: Teams count now says 29 active / 3 eliminated instead of 28 / 4.** This was previously correct. Trace current-week/elimination derivation and identify the exact regression before changing it. Restore 28 active / 4 eliminated for the current SeaMex state without league-specific constants; add a deterministic regression test and verify Hub/Teams/Waivers use one consistent active-roster set.
- [x] Browser-test desktop and 390px mobile for both Waivers and Teams: modal fit/scroll/focus, bye ordering, needs badges, style badge, history colors/grid, compact collapsed sizing, current free-agent ownership, and 28/4 team counts.

## 🚨 PR #10 owner review round 2 — restore compact Waivers cards (John, 2026-09-25)

**Status: implemented on the PR branch.**

- [x] Restore the collapsed waiver player card to approximately its pre-bidding-profile height/density. It must not contain three full bidder cards.
- [x] Use one compact right-side summary element in the collapsed card:
  - Show **Suggested bid**.
  - Under it, show at most three single-line bidder summaries ordered highest to lowest, e.g. `miluna92  $119`, followed by bidder 2 and bidder 3.
  - Do not show multiplier, category, buyer label, remaining FAAB, or full row/card chrome until expansion.
- [x] When **Show rostered players** is enabled, do not show bid predictions or bidder summaries. Show only the player’s current valued price.
- [x] Correct and simplify collapsed player metadata. Show only the player name, natural position + positional rank (for example `WR #4`), team if useful, next-week projection, and bye week. Remove the raw/source `Value 262.3`, duplicate weekly `Rank 4`/`Rank 9`, starter-weeks text, and any other duplicate ranking/value metadata. Preserve injury status only if it remains compact and useful. Do not change the underlying valuation merely to fit the layout.
- [x] Remove the standalone **Predicted bid** line now that top bidders are available. Keep the overall Predicted winning bid only in preseason/Week 1 when manager-level predictions cannot be produced.
- [x] Expanding a player card should reveal the manager bidders and predicted bids in a smooth, compact list—visually closer to the current compact expanded-list rows, not stacked large cards.
- [x] Do not embed a large **Bidding History** accordion inside every manager row. Clicking a manager row/card should open a single modal dialog containing that manager’s Bidding History, so only one history surface is open at a time. Include accessible modal focus management, keyboard close, backdrop close where appropriate, and mobile fit/scroll behavior.
- [x] In the Bidding History modal, each historical event uses a compact 2×2 metric grid: two fields on top and two below. Use explicit labels **Suggested bid** and **Actual bid**; retain **Pre-bid FAAB** and **Ratio** unless John’s continuation changes them.
- [x] Add mobile/desktop visual and interaction coverage for original-height collapsed cards, rostered-player mode, metadata cleanup, preseason/Week-1 fallback, expansion, manager modal behavior, 2×2 history layout, overflow, and keyboard/focus behavior.

### Round-2 root cause and prevention — 2026-09-25

- **Stale/non-available players:** ownership had two independent defects. `useRosters` treated live ownership as one-hour-stale metadata, so navigation could retain the pre-waiver snapshot; and `computeAvailablePlayers` / `computeRosteredPlayerOwners` deliberately skipped eliminated rosters, making players still present on those current Sleeper rosters appear free. Prevention: current rosters are stale immediately and refetch on mount/focus; availability and owner labels use every current Sleeper roster, while elimination still limits only buyers/projections. Live SeaMex evidence: roster 15 currently owns Zay Flowers (`9997`) and Jeremiyah Love (`13287`), so both are excluded; Sleeper currently reports no roster owner for Lamar Jackson (`6994`), so Lamar honestly remains available rather than being hard-coded.
- **29/3 team count:** all matchup queries scanned through Week 18 and accepted a week as “complete” once any roster had positive points. As the active NFL week began, partial scores entered elimination-rate/current-week math and produced the transient bad count. `NFL display_week` is also already the in-progress week for this live state, so it is not a safe boundary. Prevention: every page now clips current-season matchup history to authoritative `league.settings.last_scored_leg`; a shared `getActiveRosterIds()` supplies Hub/Teams/Waivers and buyer tiers. Live SeaMex reports `leg=3`, `last_scored_leg=2`; only Weeks 1–2 are applied, producing 28 active / 4 eliminated.

## 🚨 P0 PR #10 follow-up — correct baseline and de-emphasize non-buyers (John, 2026-09-25)

- [ ] **Fix an inflation bug:** manager multipliers are defined relative to the app's **Weeks-as-Starter weekly suggested bid**, not its higher market-adjusted `predictedWinningBid`. Both historical event ratios and current manager forecasts must use the corresponding Weeks-as-Starter suggestion (`strategy === 'weeks-starter'`) as their baseline. Do not feed `row.predictedWinningBid` into `calculateHistoricalBaseline()` or `buildManagerPredictions()`.
- [ ] Preserve formulas after that correction: historical ratio = actual bid / min(historical Weeks-as-Starter suggestion, pre-bid FAAB); current uncapped estimate = current Weeks-as-Starter suggestion × manager multiplier; displayed predicted bid = min(uncapped estimate, current FAAB).
- [ ] Add regression tests proving the larger market-adjusted predicted-winning number is never used as the manager-multiplier baseline and showing the corrected lower forecast numerically.
- [ ] Color a FAAB-capped displayed predicted bid red, with accessible non-color text/label indicating it is capped by available FAAB.
- [ ] Collapsed top-three predictions should include only **Likely** and **Possible** buyers. Do not include **Unlikely** buyers merely because their numeric prediction is high; showing fewer than three is preferable to implying false interest.
- [ ] Expanded manager list remains complete, but sort Likely first, Possible next, and Unlikely last; visually de-emphasize/gray Unlikely buyers. Within each tier, retain deterministic predicted-bid ordering.

## 📈 This-season prediction calibration + weekly league snapshots (John, 2026-09-25)

- [ ] Persist immutable, pre-waiver weekly prediction snapshots in the dedicated Guillotine database so this season can become a calibration dataset. Snapshot enough league state to reproduce each forecast: league/season/week/cutoff, active/eliminated rosters, rostered players, current FAAB, position-strength/need tier, player baseline, manager multiplier, uncapped estimate, capped prediction, and exact model/version inputs.
- [ ] After waivers process, attach canonical actual winners, winning bids, legitimate losing bids, and no-bid outcomes to the frozen predictions; never rewrite the original forecast.
- [ ] Track error/calibration by player, manager, week, buyer tier, cap state, and behavior category. Measure predicted-vs-actual bid error plus whether Likely/Possible/Unlikely tiers actually bid.
- [ ] To evaluate whether displaying predictions changes a user's willingness to bid, add an explicit privacy-conscious exposure/intended-bid measurement or app-mediated bid flow; transaction outcomes alone cannot establish that behavioral effect. Keep observational accuracy separate from causal product-impact claims.
- [ ] Use this season's evidence to recalibrate next season's buyer likelihood and decide whether Unlikely teams can be hidden entirely; during this season they remain visible, gray, and below likely/possible buyers when expanded.
- [ ] Design the capture schedule/idempotency/RLS/retention before implementation. Use only dedicated Supabase ref `xduqpomhjdlgmtmmkfed`; never expose service-role credentials to the browser.

## 🚨 PR #10 owner review — redesign bidding predictions inside player cards (John, 2026-09-25; feedback continuing)

**Status: implemented and verified on the PR #10 branch; awaiting owner review.**

- [x] Remove the standalone **Manager bid profiles** section from Waivers.
- [x] Put manager bid predictions directly on each waiver player card instead.
- [x] Compact the collapsed player-card layout to make room:
  - Hide `14/14 starter weeks` until the card is expanded.
  - Remove the duplicate `• WR4` text before starter weeks (John had already requested its removal).
  - Shorten projection copy where possible, e.g. `18.8 proj.`.
  - Remove the right-side `21%`; useful, but lower priority than predicted bids.
- [x] Collapsed player card, right side: show the **top 3 highest predicted manager bids**, each with owner/username. For each visible prediction show only username, predicted bid, multiplier, and category; also consider remaining FAAB because it is decision-useful. Do **not** show confidence labels.
- [x] Clicking a player expands that same card. Expanded card should show the top 10 predicted bids, with a **Show more…** control when additional managers exist.
- [x] Expanded manager rows should retain the useful Manager-profile evidence but remove implementation language such as `reconstructed` and confidence labels.
- [x] Simplify confusing `Raw`, `Willingness`, and `Feasible` columns. Candidate user-facing fields are **FAAB available** and **Predicted bid**. Before revising copy, explain to John exactly what all three current values mean.
- [x] Simplify each historical evidence row from six numbers to: **Suggested** value (the historical weekly baseline used by the multiplier), **Actual bid**, **Pre-bid FAAB**, and **Ratio**.
- [x] Replace the confusing `Transaction Wk 1 · decision Wk 2` display with one user-facing label for the week that just finished: **`Wk 1`** in this example. Keep the decision-week mapping internal.
- [x] Rename **Evidence** to **Bidding History**.
- [x] Remove visible `Model bidding-profile-v1` copy and the duplicate FAAB footer; these are implementation details, and current FAAB belongs in the manager prediction fields.
- [x] Add a Teams **Bid Profiles** sub-tab: list managers from most to least aggressive, show current FAAB, multiplier and category, and expand a manager to show the same simplified Bidding History/behavior details used on Waivers.
- [x] Week 1/no manager behavior: retain the existing overall **Predicted winning bid** rather than fabricating manager-specific predictions.
- [x] Add a simple buyer-need signal per manager/player using active-team position strength thirds: top third/strong at the target player's position = **Unlikely buyer**; middle third = **Possible buyer**; bottom third/weak = **Likely buyer**. Treat this as a visible heuristic, not a hidden multiplier in the numeric bid prediction. Reuse existing position-strength logic where possible and handle ties/small leagues honestly.
- [x] Preserve the overall Waivers page structure: same player list, now with top-three manager predictions in collapsed cards and additional manager/team bidding details only after expansion.
- [x] Add focused responsive/browser tests for collapsed density, expansion, top-3/top-10 ordering, Show more behavior, Week-1 fallback, need tiers, Teams Bid Profiles ordering/expansion, and truthful missing-data states.

### Implementation completion — 2026-09-25 19:40 PDT

Implemented the owner revision in the existing PR branch. Waiver cards now show the top three active-manager, FAAB-capped predictions while collapsed and top ten plus Show more when expanded. The full-card toggle is a native button with keyboard support. Player metadata uses the requested Position/Value and Week/Rank labels. Teams now has aggressiveness-sorted Bid Profiles with current FAAB and simplified expandable history/behavior. Buyer likelihood uses active-team positional-strength thirds only and never feeds bid math. Week 1/no canonical history leaves only the overall predicted winning bid. Existing canonical history, snapshot provenance, deduplication, FAAB reconstruction, geometric multiplier, and backend security logic remain intact.

Verification completed: focused owner-requirement tests, full frontend suite, API suite, lint, TypeScript/build, production build, diff check, changed-file secret scan, and desktop/mobile SeaMex browser QA. Final counts, hosted-preview evidence, commit, and PR status are recorded in `HANDOFF.md`.

## ✅ Bidding-behavior profiles + bid predictions FE PR #10 (2026-09-25)

- PR: <https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/10>
- Preview: <https://nice-moss-07ec56310-10.centralus.7.azurestaticapps.net>

- [x] Passed the hard backend gate before branching: PR #9 is merged to `main`; production credential-free GET returns explicit effective provenance; dedicated DB contains reconstructed decision Weeks 1–3 only and no Week 4 row.
- [x] Added versioned, strongly typed `bidding-profile-v1` modeling: completed wins plus proved same-batch losses; invalid/unmatched failure rejection; manager/player/batch contingency collapse; transaction-ledger pre-submission FAAB; deterministic top three; capped event ratios; geometric multiplier; style thresholds `<0.85`, `0.85–1.15`, `>1.15`; evidence-aware confidence; and willingness vs current-FAAB-capped prediction.
- [x] Added credential-free projection snapshot client/types/query hook. Historical evidence uses effective snapshot provenance and never promotes reconstructed/fallback evidence to exact.
- [x] Added the Waivers `Manager bid profiles` UI with live Sleeper target baselines, all-manager summaries, raw baseline/willingness/feasible bid, multiplier/style/confidence, expandable top-three rows, explicit provenance/ledger/budget/duplicate details, and loading/empty/error/insufficient states.
- [x] Kept V1 honest: historical baselines reuse the Weeks-as-Starter formula with immutable snapshot rows and static league setup, while clearly deferring unavailable historical roster/ownership/needs/survivor replay.
- [x] Added deterministic fixtures and 17 new logic/component/API-hook tests covering wins, legitimate losses, invalid/unmatched failures, duplicate paths, ledger spend/transfers, inferred budget lower bounds, top-three tie-breaking, tiny/zero baseline, zero bid, constrained observations, exact/reconstructed/fallback confidence, thresholds, exhausted FAAB, partial snapshot failure retention, snapshot filtering, explainability, and UI states.
- [x] Browser-tested the real 2026 32-team `SeaMex Guillotine` Sleeper league against the live production snapshot GET at desktop and 390px mobile: 32 manager profiles, real W1–W3 evidence, reconstructed labels, no horizontal overflow, 44px select target, and no console errors.
- [x] Full 128-test suite, 36 API regressions, lint, typecheck, production build, diff review, and secret scan pass. Independent review's one medium partial-snapshot resilience finding was fixed and regression-tested; no high findings.
- [ ] Owner review/merge only. No production deploy or self-merge.

## ✅ PR #9 final pre-activation correction — early W4 deleted; not activated (2026-09-25)

- [x] Honored John's final direction to delete the too-early reconstructed decision-Week-4 run instead of retaining it. Migration `202609250006` is absent-safe on clean replay and deletes only ID `7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8` after exact metadata, 15,821-child, and ordered child-audit-hash checks.
- [x] Changed the values FK to `ON DELETE CASCADE`; the migration transaction temporarily disables only the two immutable delete triggers after all guards pass, deletes the exact parent ID, verifies parent and children are gone, and restores trigger state. Any mismatch fails the migration.
- [x] Reverified linked and credential refs as dedicated project `xduqpomhjdlgmtmmkfed`, rehearsed migration 006 inside a rolled-back real PostgreSQL transaction, confirmed dry-run listed only 006, and applied only 006. Remote migration history is now 001–006 and up to date.
- [x] Post-apply proof: target parent `0`, target children `0`, exact Week 4 coordinate rows `0`. W1–W3 IDs, content hashes, row/child counts, and independent ordered child audit hashes remain unchanged.
- [x] A rolled-back synthetic exact Week 4 probe succeeded; identical retry reused the same ID with `created=false`; differing exact evidence failed with SQLSTATE `23505`; rollback left no fabricated Week 4 row.
- [x] Migration 005 remains valid additive history and continues to provide provenance-aware exact/reconstructed idempotency and conflict behavior. No history was hidden or rewritten.
- [x] Docs now state that Sleeper route `week` is a matchup week, not a Tuesday snapshot; the route has no as-of/revision contract; live Sleeper returns current forecasts; and the canonical Tuesday snapshot preserves the historical ROS bidding baseline. Only reconstructed W1–W3 rows exist; there are no historical exact rows.
- [x] Focused/full tests, lint, typecheck, build, diff check, secret scan, clean replay through 006, and a mismatched-target rollback rehearsal all pass. Independent review is recorded in `HANDOFF.md`.
- [x] Did not merge, configure application/repository settings, activate the scheduler, dispatch a workflow, or deploy.

## ✅ PR #9 exact/reconstructed coexistence correction — migration 005 retained

- [x] Migration `202609250005` replaced the old coordinate-only uniqueness constraint with a provenance-aware evidence key; valid reconstructed and exact evidence can coexist when intentionally retained.
- [x] The service-role RPC keeps identical exact retries idempotent and rejects differing exact hash, count, or actual child values. Forced RLS, immutability, calendar, and capture-window checks remain intact.
- [x] GET is deterministic within the requested season: highest decision week first, then exact before reconstructed. API provenance separates decision week from preceding playing week and exposes same-week/fallback, stored capture kind/timing, and effective exactness.

## ✅ PR #9 late integrity findings — corrected; awaiting review

- [x] Persisted immutable `capture_started_at` alongside `fetched_at`; API passes the actual sampled start, GET/types/docs expose it, and exact DB/API rules validate start >= cutoff, finish >= start, and finish <= cutoff + 15 minutes.
- [x] Added sequenced-clock acceptance, early-start rejection, and late-finish rejection tests for both PDT and PST. A direct service-role RPC early-start exact claim is rejected remotely.
- [x] Added forced-RLS/default-deny immutable `projection_season_calendar`, seeded authoritative 2026 Week 1 local Tuesday `2026-09-08`. DB RPC/trigger derive expected coordinates, and API validates the calendar for exact and reconstructed captures.
- [x] Applied only reviewed migration 004 to verified dedicated ref `xduqpomhjdlgmtmmkfed`. It preserved the then-existing evidence and backfilled reconstructed rows with the only honest historical start (`capture_started_at = fetched_at`); migration 006 later removed only the explicitly audited early W4 run.
- [x] Re-ran remote early-start/wrong-reconstructed-cutoff/default-deny/immutability/credential-free-GET/idempotency/metadata probes plus API/full tests, lint, typecheck, build, syntax, diff, secret scan, and migration dry-run.
- [x] Documented the reviewed-migration owner process for adding future immutable season calendar rows. No merge, production setting, scheduler activation, workflow dispatch, or production deployment performed.

## P0 — Bidding Profiles V1 (John, 2026-09-24)

Architecture: `docs/BIDDING-PROFILES-PLAN.md`

- [x] **PR1: Dedicated projection-snapshot backend (merged as PR #9)** — Core immutable forced-RLS tables, explicit immutable provenance, DST-aware cutoff/window guards, transactional/idempotent service-role RPC with honest conflicts, managed Function, Sleeper compaction/hash, tests, and operations docs are complete. Dedicated project `xduqpomhjdlgmtmmkfed` retains reconstructed Weeks 1–3 only; the too-early W4 seed was guard-deleted, the exact W4 coordinate is free, and no historical exact evidence exists. Immutable DB-owned season calendar coordinates and start/finish window guards are enforced.
- [x] **PR2/PR3: Canonical evidence, profile math, and explainable UI (feature PR ready)** — Strongly typed classification, duplicate handling, FAAB reconstruction, top-three selection, ratio/multiplier/style/confidence, public snapshot reads, live prediction, evidence UI, fixtures, real-league browser QA, and verification are complete on `feat/bidding-behavior-profiles`.

## Constraints

- Feature branch and PR only; never push directly to `main`.
- No production deployment.
- Dedicated Supabase project; do not use another app's database.
- No per-league weekly roster/ownership/needs snapshots in V1.
- Existing historical weeks are labeled reconstructed; only prospectively captured snapshots are exact.
- Formula constants are versioned and tested in code.
