## 2026-09-27 — Middle VORP review-only evaluation complete (PR #12)

### Scope and branch safety
- Worked only in `/home/john/guillotine-bid-analysis-work` on `analysis/bidding-strategy-accuracy`.
- Added Middle VORP only to offline analysis/report code. No production strategy registry, default, UI behavior, scheduler, workflow, Supabase, or deployment change.
- Inspected PR #13 at `origin/fix/non-vorp-replacement-zeroing` / implementation `7d86b2d` read-only. Its corrected allocation/zeroing semantics are reproduced analytically and labeled in the report; no product code was merged or cherry-picked.

### Candidate and conceptual result
- Primary: `targetTeams = max(4, ceil(teamsRemaining / 2))`; one common target for every player in the state (28→14, 27→14, 5→4), never per-player maximization.
- 50% is explicitly a hypothesis. Analysis also runs 67%/50%/33% common horizons and floor-vs-ceil sensitivity.
- Conceptually, Middle is easier to explain than Max VORP because all players share one forward horizon, but it is much narrower than Max/current and does not win the limited reconstructed historical comparison.
- **Recommendation: retain analysis-only.** Do not promote from two completed reconstructed decision weeks. W4+ exact pre-waiver captures should change confidence only if prospective prior-only scaling shows stable MAE/bias/rank quality and conclusions remain stable across 33%/50%/67%, owner-directed, and all-bid filters.

### Exact latest reproducible SeaMex findings
- Input: reconstructed decision-W3 fixture snapshot, 445 supported projections, 28 teams, common budget $500, privacy aliases only; Middle target is 14 teams. This is the latest reproducible state, not an exact W4 capture.
- Positive/mean/max/total dollars: Max 191 / $15.4 / $232 / $6,843; Middle 93 / $7.7 / $123 / $3,412; current-team VoRP 191 / $13.9 / $109 / $6,196; corrected Safe 192 / $22.9 / $125 / $10,199; corrected Weeks 183 / $16.2 / $125 / $7,198.
- Middle rank correlations: Max ρ=0.780, current 0.780, corrected Safe 0.785, corrected Weeks 0.796; 67% 0.880; 33% 0.861.
- Middle positive cutoffs: QB13/RB28/WR39/TE13. Max/current: QB27/RB55/WR80/TE29.
- Top Middle prices: P1104 RB1 $123, P1116 WR1 $108, P1117 WR2 $106, P1125 RB2 $99, P0838 RB3 $98, P0901 WR3 $95, P0632 RB4 $85, P1133 WR4 $84, P0993 WR5 $78, P0904 WR6 $77, P1107 RB5 $76, P0984 TE1 $75.
- Concrete stage divergences are in all artifacts. Examples: P0984 TE1 Middle $75 / Max $178 / current $70, where Max selected the 4-team stage; P1104 RB1 $123 / $232 / $109 at Max’s 4-team stage; P0690 QB1 $69 / $121 / $61 at 4 teams; P1116 WR1 $108 / $156 / $91 at 4 teams.

### Exact completed-week findings
- Owner-directed view retains the marked $234 W3 event in raw evidence but excludes it only in the labeled primary sensitivity. W2 and W3 projection inputs are reconstructed; W4 exact is absent.
- Serious-market medians overall: Middle n=9, MAE $20.8, median AE $17.5, bias −$12.6, raw unfitted prediction R² −0.15, ρ=0.44. Comparators: Max n=21/MAE $12.5/bias +$1.5/R² 0.56/ρ 0.79; current n=21/$11.0/−$1.0/0.63/0.78; corrected Safe n=21/$21.7/+$19.3/−0.42/0.82; corrected Weeks n=20/$17.8/+$6.0/0.13/0.78.
- Serious medians by week: W2 Middle n=4, MAE $34.3, bias −$24.5, R² −0.74, ρ=0.63 (Max is closest at $14.9); W3 Middle n=5, MAE $10.0, bias −$3.0, R² 0.64, ρ=1.00 (current is closest at $6.6).
- Canonical winners overall: Middle n=9, MAE $95.3, median AE $75.0, bias −$94.7, raw R² −1.08, ρ=0.71. Corrected Safe is closest among compared primary curves (n=25, MAE $31.9).
- Middle season multipliers (defined/45): canonical winning 9, arithmetic/geometric/median 3.62/3.18/3.84; serious median 9, 1.50/1.33/1.63. W2: winning 4.12/3.29/4.31, serious 1.76/1.46/2.14. W3: winning 3.23/3.10/3.30, serious 1.28/1.23/1.18.
- Strict prior-only median scaling: fit W2 and score W3. Middle canonical winners n=5, multiplier 4.313, MAE $60.1, bias +$55.7, raw held-out R² −0.50, ρ=0.90. Middle serious medians n=5, multiplier 2.140, MAE $44.9, bias +$44.9, raw held-out R² −9.69, ρ=1.00. No fit/scoring overlap.
- All-bid sensitivity keeps current-team VoRP closest overall (Middle n=9, MAE $19.4, bias −$11.1, R² −0.02, ρ=0.60). Including the owner-directed event does not change the closest serious-median strategy.

### Horizon sensitivity
- Current 28-team state: 67%=19 teams/129 positive/ρ 0.880 vs primary; 50%=14/93/1.000; 33%=10/65/0.861. Historical canonical-win MAE: 67% $71.4 (n=13), 50% $95.3 (n=9), 33% $106.0 (n=8); all underpredict.
- Observed W2/W3 counts are even (30/28), so floor and ceil are identical and do not change conclusions. Unit tests explicitly verify odd 27-team sensitivity: ceil→14, floor→13.
- Sparse Middle n is a substantive coverage result: zero intrinsic suggestions are omitted strategy-by-strategy and all denominators are displayed.

### Files and artifacts
- New: `scripts/middle-vorp-analysis.ts`, `scripts/__tests__/middle-vorp-analysis.test.ts`.
- Updated analysis: `scripts/analyze-bidding-strategies.ts`, `scripts/weekly-market-analysis.ts`, `scripts/weekly-market-report.ts`, `scripts/generate-bidding-analysis-presentation.ts`.
- Updated tests/docs: `scripts/__tests__/weekly-market-analysis.test.ts`, `scripts/__tests__/bidding-analysis-presentation.test.ts`, `PROGRESS.md`, and the generated Markdown/HTML/PDF.
- Artifacts: `docs/analysis/bidding-strategy-accuracy-seamex-2026.{md,html,pdf}`.
- Deterministic SHA-256 after two complete regenerations: Markdown `b7c88d874dee5b3934e8cedca95f3c0961534d57f371ba5b49bd5b4cae59b3b6`; HTML `0cb860422112af05531c19a5a0b346b12d4ca92e1698d4c2d9f67bff81af721d`; PDF `ca361f29aaf0c53e94edb2599ef91b67e7cbb92b5e4a99a115c66a45aaa3f296`.

### Validation
- Focused: 4 files / 19 tests passed. Full frontend/analysis: 28 files / 181 tests passed. API: 36/36 passed.
- `npm run lint` passed with one pre-existing `react(set-state-in-effect)` warning in `ManagerBiddingProfiles.tsx`; zero errors. `npm run typecheck` and `npm run build` passed.
- `git diff --check` passed. HTML browser audit: 7 sections, 18 tables, 9 SVGs, zero empty tables, no horizontal section overflow. PDF parsed/rendered successfully at 19 letter-size pages; sampled pages rendered to PNG.
- Changed-file secret/privacy scan found no credential, key-material, token, private ID, raw payload, or newly added identity. The existing source file’s server-only project-ref constant was not introduced by this work and is not emitted to artifacts.
- No merge, deploy, workflow dispatch, Supabase mutation, scheduler/cron edit, production-registry/default/UI change, or Discord post.

---

# Handoff — weekly top-three + median-market P0 (2026-09-27)

Status: implementation `ccb5eca` and verification closure `06101fa` were pushed to review-only PR #12 on `analysis/bidding-strategy-accuracy`. No product/default behavior changed.

## Exact owner answer

- W2 top-three winning-bid arithmetic multipliers (observed ÷ intrinsic): Max VORP **3.34×**, VoRP **3.38×**, Safe **2.95×**, Weeks as Starter **3.37×**. Serious-market-median arithmetic multipliers: **1.40× / 1.42× / 1.35× / 1.53×** in the same strategy order.
- W3 owner-directed top-three winning-bid arithmetic multipliers: Max VORP **2.35×**, VoRP **3.00×**, Safe **2.87×**, Weeks as Starter **2.87×**. Serious-market-median arithmetic multipliers: **0.78× / 1.00× / 1.13× / 1.13×**.
- **VoRP is closest overall** to serious median market price: MAE **$10.98** across 21 defined-strategy clusters (28 eligible player/week serious-median clusters before zero-denominator coverage). By week, W2 narrowly favors Max VORP (**$14.86** vs VoRP **$14.95**); W3 favors VoRP (**$6.60**). All-bid median sensitivity also favors VoRP.
- The private GET-only trace maps the owner-designated outlier to exactly one anonymized canonical **W3 $234** win using a unique exact position/total projection fingerprint in both W2 and W3 snapshots. Raw evidence remains; only the labeled owner view excludes it. Including it keeps VoRP closest overall (MAE $11.07 vs $10.98 excluded). No name, raw player/event ID, league ID, manager identity, or payload is committed.
- Result supports **strategy shape × market scale**: intrinsic formulas rank/shape targets while weekly observed÷intrinsic multipliers estimate market scale. Two reconstructed weeks do not justify individual manager-style claims or a production default change.

## Implementation and evidence rules

- `scripts/weekly-market-analysis.ts`: pure player/week clustering, highest canonical winner selection, same-processing-batch legitimate competitor filtering, >$5 serious threshold, four non-derived strategies, ratio coverage, arithmetic/geometric/median aggregates, censoring, MAE/median AE/bias/unfitted R²/Spearman, and with/without sensitivity.
- `scripts/weekly-market-report.ts`: deterministic five-bullet appendix and detailed tables.
- `scripts/analyze-bidding-strategies.ts`: inserts the new answer first in the generated Markdown while preserving the prior study.
- `scripts/generate-bidding-analysis-presentation.ts`: first-page five-bullet answer, new charts/tables, split print-safe player tables, and deterministic Chromium PDF metadata.
- Tests: `scripts/__tests__/weekly-market-analysis.test.ts` plus presentation regressions.
- W2/W3 are the only eligible same-week reconstructed snapshots. W4 remains explicitly unavailable; no fallback is manufactured. Zero suggestions are undefined with defined/total coverage. Exact FAAB equality is treated as censored; none of the six selected targets are censored.

## Verification

- Focused analysis/presentation: **3 files / 15 tests passed**.
- Full frontend: **27 files / 177 tests passed**.
- API: **36/36 passed**.
- `npm run typecheck`, `npm run build`: passed.
- `npm run lint`: 0 errors; one pre-existing `react(set-state-in-effect)` warning in `ManagerBiddingProfiles.tsx`.
- `git diff --check`: passed. Added-line secret/private scan: passed; the generated legacy methodology retains only existing redacted refresh placeholders/project provenance.
- Determinism: consecutive final SHA-256 values match — Markdown `2d3391f799394212898077db3425ea34d4fbc69366dbbed9927fd3a121ab29bd`, HTML `cabee38c4edb028ced8c58c1a4cf70e071abb2b3debfb6509968d13f6ccac219`, PDF `17421b3d9eb63db92818bfedf9fd642d97722daee29481d28f0e9954aecfe513`.
- Render inspection: HTML at 1440×1000 and 390×844 has no document-level overflow; wide tables scroll only inside their containers. Letter print is **13 pages**. Ghostscript inspection confirmed the first five pages are readable and unclipped after splitting the winning/market target table; the previously reviewed legacy sections remain intact.

## Artifacts and delivery

- `docs/analysis/bidding-strategy-accuracy-seamex-2026.md`
- `docs/analysis/bidding-strategy-accuracy-seamex-2026.html`
- `docs/analysis/bidding-strategy-accuracy-seamex-2026.pdf`
- Branch: `analysis/bidding-strategy-accuracy`; PR: <https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/12>.
- Commits `ccb5eca` (implementation) and `06101fa` (verification closure) were pushed only to `analysis/bidding-strategy-accuracy`, updating open PR #12 against `main`. Local/remote branch heads matched at verification. Do not merge or deploy.

---

# Handoff — owner-facing bidding analysis presentation (2026-09-27)

Completed the P0 visual follow-up on PR #12 without changing production behavior, merging, or deploying.

Artifacts:
- `docs/analysis/bidding-strategy-accuracy-seamex-2026.html` — self-contained owner-facing report with inline CSS/SVG and no external runtime or CDN dependency.
- `docs/analysis/bidding-strategy-accuracy-seamex-2026.pdf` — directly attachable 8-page Letter PDF generated from the HTML.
- `scripts/generate-bidding-analysis-presentation.ts` — deterministic fixture-to-model-to-HTML/PDF generator; run with `npm run analyze:bidding:presentation`.
- `scripts/__tests__/bidding-analysis-presentation.test.ts` — canonical counts/metrics/bootstrap-CI checks, explicit `R² = 1 − SSE/SST` and negative-R² coverage, deterministic HTML, privacy, and dependency guards.

Presentation content:
- Page 1 is a complete one-page executive summary: tested scope/provenance, four key findings, sample winner, robust recommendation, owner action, and the Weekly naming audit.
- Inline SVGs cover winning MAE, all/serious MAE, signed bias, Spearman/range coverage, five token/outlier sensitivity cases, five actual-vs-predicted small multiples with identity lines and R², and the strictly prior-history manager-adjusted subset.
- Every applicable visual/table labels n, subset, and reconstructed provenance. Tables include deterministic 95% cluster-bootstrap MAE intervals. The owner narrative explicitly separates “lowest error in this observed sample” from “robust winner,” avoids a universal Aggressive claim, and warns that manager-adjusted n=27 wins/n=133 bids is not directly comparable with raw strategy n=47/n=239.
- Formula cards explain MAE, median AE, signed bias, Spearman ρ, R² (including valid negative values for unfitted predictors), normalized FAAB error, deterministic cluster bootstrap, token threshold, all three outlier rules, coverage, and tolerance.
- No implemented Weekly key/formula was found or invented; VoRP appears under its actual name.

Render verification:
- Chromium desktop at 1440×1000: all 7 figures and 4 tables render; no external resource requests.
- Chromium mobile at 390×844: `documentElement.scrollWidth === clientWidth` (375 CSS px after scrollbar), so there is no document-level horizontal overflow; wide dense SVG/table panels stay contained.
- Chromium print to Letter PDF: 8 pages. Ghostscript-rendered page inspection confirmed the entire executive summary stays on page 1, each major section starts on a fresh page, charts/tables/formulas are readable and unclipped, and provenance/footer content no longer creates an orphan page.

Verification:
- `npm test -- scripts/__tests__/bidding-analysis-presentation.test.ts scripts/__tests__/bidding-strategy-analysis.test.ts` — 2 files / 9 tests passed.
- `npm test` — 26 files / 171 tests passed.
- `node --test api/test/*.test.js` — 36/36 API tests passed.
- `npm run typecheck` and `npm run build` — passed.
- `npm run lint` — 0 errors; one pre-existing `react(set-state-in-effect)` warning in `src/components/ManagerBiddingProfiles.tsx`.
- `git diff --check` and changed-file secret/private-identifier scan — passed before commit.
- Direct HTML scan found no `http://`, `https://`, external script/link/image, source payload, credential, project ref, manager/player alias, or private identifier.

# Handoff — P0 bidding strategy accuracy analysis (2026-09-27)

Implemented the complete review-only SeaMex 2026 strategy replay with no production/UI behavior changes.

Evidence and result:
- Sleeper public extraction: 469 transactions / 363 waivers. Proof filtering produced 70 completed wins and 265 legitimate-loss candidates; canonical dedupe retained 70 wins + 241 losses (311 bids) and removed 24 contingency/drop paths. Classifier reasons are preserved in the report.
- Pre-bid FAAB is reconstructed from 47 completed spend rows plus transfers (none observed): 311 transaction-ledger, 0 inferred-minimum, 0 uncertain. Transaction week maps to decision week +1; 32-team PPR settings and production progression give W2=30 and W3=28 active teams.
- Read-only Supabase refresh hard-checks approved project ref `xduqpomhjdlgmtmmkfed`. W2/W3 snapshots are explicitly reconstructed (never exact). W4 has only a W3 fallback, so all 23 W4 events are excluded; 49 more canonical events lack a supported-position projection. Final formula-usable sample: 239 bids, 47 wins, 192 legitimate losses.
- All five current registry outputs are replayed through `buildWaiverBoard`. Audit correction: requested “Weekly” is **not** mapped to `vorp`. Exhaustive history shows `vorp` has always been VoRP and no `weekly` key/formula ever existed; PR #10's “historicalWeeklyBaseline” explicitly meant `weeks-starter`, already a separately requested strategy. Weekly is therefore excluded as `no-authoritative-formula-or-key`, and VoRP is reported under its real name. Manager forecasts are separate and strict prior-batch walk-forward (133 forecastable bids / 27 wins).
- Naming evidence is documented in the report: initial registry `c331281`, Exponential→Aggressive rename `1656925`, Max-VORP addition `7c32a1f`, exhaustive all-ref search, and PR #10's explicit Weeks-as-Starter definition of “historicalWeeklyBaseline.”
- Findings: Aggressive has lowest winning-bid MAE (26.4) and non-token winning MAE (38.5), but is not robust: ratio-gap filtering still favors Aggressive while MAD/IQR filtering favors Max VORP. No strategy is recommended as a robust winner; keep production unchanged and collect exact pre-waiver snapshots.
- Report includes all/all-wins/non-token/competitive-cluster metrics, MAE bootstrap CIs (2,000 cluster resamples, seed 20260927), median AE, bias, Spearman, coverage/ranges, normalization, week/position/tier/cap slices, three predeclared outlier rules, provenance, formulas, limitations, and commands.

Files added/changed:
- `scripts/analyze-bidding-strategies.ts` — refresh, shared-formula replay, walk-forward forecast, deterministic report generator.
- `scripts/bidding-strategy-analysis.ts` — pure classifier, metrics, rank correlation, robust flags, deterministic cluster bootstrap.
- `scripts/__tests__/bidding-strategy-analysis.test.ts` — six focused deterministic tests.
- `scripts/fixtures/bidding-strategy-seamex-2026.json` — anonymized derived offline fixture (no source identities/raw payload).
- `docs/analysis/bidding-strategy-accuracy-seamex-2026.md` — generated report.
- `package.json`, `PROGRESS.md`, `HANDOFF.md`.

Verification:
- `npm test -- --run scripts/__tests__/bidding-strategy-analysis.test.ts` — 6/6 passed.
- `npm test -- --run` — 25 files / 168 tests passed.
- `node --test api/test/*.test.js` — 36/36 passed.
- `npm run lint` — 0 errors; one pre-existing React warning in `ManagerBiddingProfiles.tsx`.
- `npm run typecheck` and `npm run build` — passed.
- Script-only TypeScript check with TS 6/Bundler — passed using the required `--ignoreConfig` flag.
- Three consecutive stabilized `npm run analyze:bidding` runs produced identical report SHA-256 `bc6014fb93069b5ab3e991de69c0a22b6244126e0343142da11f5669598f00db`.
- An independent fixture audit reproduced 469 raw / 363 waiver / 311 canonical / 239 usable events, the 70/241 canonical and 47/192 usable win/loss splits, and the 49 missing-projection + 23 missing-snapshot exclusions.
- `git diff --check` and changed-file credential/identity scans passed.

Definition blocker recorded, not papered over: if John intended “Weekly” to be a sixth/distinct strategy rather than an erroneous backlog label, he must supply its formula; no authoritative implementation exists to replay.

Delivery completed by the top-level orchestrator: analysis commit `a8f414cb825b1406108408e72f3c0e90be822e30` was pushed only to `analysis/bidding-strategy-accuracy`, and review-only PR #12 is open against `main`: https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/12. Do not merge or deploy. No push to `main`, manual deploy, or `workflow_dispatch` was performed.

---

# Handoff — PR #11 eliminated badge in Bid Profile popup (2026-09-26)

John requested that an eliminated manager's Bid Profile popup explicitly show `Eliminated` beside the manager name using the same presentation as Teams/Teams.

Implemented:
- `ManagerDetailsModal` accepts an optional eliminated state and renders the shared `StatusBadge status="eliminated"` beside the manager heading.
- `TeamBidProfiles` supplies that state from the active-roster set. Active Bid Profile popups and Waivers manager-prediction popups do not show the badge.
- Existing modal title association, wrapping, geometry, focus behavior, and calculations remain intact.
- Regression verifies the badge is absent for an active manager, present for an eliminated manager, and the hidden eliminated modal still closes when filtering is turned off.

Verification: focused Teams/Bid Profiles 25/25, full frontend 24 files/162 tests, API 36/36, lint, typecheck, production build, and `git diff --check` all passed. Pending commit/push and preview rebuild. No merge or production deployment.

---

# Handoff — PR #11 eliminated Bid Profile grouping/presentation (2026-09-26)

John requested two refinements after reviewing the checkbox patch: visually mute eliminated manager names just like Teams/Teams, and place eliminated Bid Profiles after all surviving profiles.

Implemented:
- Profiles are still sorted multiplier-descending with deterministic ties, then partitioned into active first and eliminated second. Ordering within each group is preserved.
- Eliminated manager names use the same muted `#4a4d77` text color as eliminated names in Teams/Teams; active names retain `#f0f0ff`.
- Active-only FAAB quartiles, persisted checkbox behavior, filtering, modal cleanup, and calculations are unchanged.
- Regression uses an eliminated profile with the highest multiplier to prove it still appears after all active profiles and verifies both active/eliminated name colors.

Verification: focused Teams/Bid Profiles 25/25, full frontend 24 files/162 tests, API 36/36, lint, typecheck, production build, and `git diff --check` all passed. Pending commit/push and hosted preview rebuild. No merge or production deployment.

---

# Handoff — PR #11 Max VORP selectable-count analysis correction (2026-09-26)

During owner follow-up, Clawdbot found the initial Max VORP implementation evaluated only survivor counts reachable under the elimination cadence (19 stages: 28, 26, …, 4), while the existing VoRP selector exposes every integer from the current active count through 4. John’s original request was to evaluate every allowed count.

Correction:
- Max VORP now evaluates all 25 selectable SeaMex counts from 28 through 4, including odd counts above 16.
- The reproducible SeaMex report was regenerated from live selected-scoring projections.
- Exact all-count computation remains the decision: 52/192 positive players peak at an interior count and disagree with endpoint-only evaluation. The largest endpoint miss is $6.720 (Lamar Jackson); mean positive miss is $1.320.
- Interior peaks: 27 teams (34 players), 24 (9), 23 (5), 16 (3), 8 (1). By position: RB 39, WR 12, QB 1, TE 0.
- Cold exact compute is 111.19 ms and remains memoized in production.

Verification:
- Focused Max VORP/waivers: 28/28 passed.
- Full frontend: 24 files / 162 tests passed.
- API: 36/36 passed.
- Lint, typecheck, production build, and `git diff --check`: passed.

This is shape/endpoint analysis only. It does not compare Max VORP, Weekly, Safe, Aggressive, or Weeks as Starter against historical real bids; that remains a separate future study. Pending commit/push and updated preview deployment. No merge or production deployment.

---

# Handoff — PR #11 owner preview fix: eliminated-team filtering (2026-09-26)

John found that the shared `Show eliminated teams` checkbox filtered the Teams tab but not Bid Profiles. Root cause: `TeamsPage` passed the active roster set into `TeamBidProfiles` only for FAAB quartile calculation; it never passed the visibility preference, and the component always mapped every profile.

Fix:
- `TeamsPage` now passes the shared persisted `showEliminatedTeams` state to Bid Profiles.
- Bid Profiles defaults to active managers only and adds eliminated managers when checked, preserving multiplier-descending order.
- Active-manager-only FAAB quartiles remain unchanged when eliminated cards are visible.
- Turning the checkbox off closes an open eliminated-manager modal.
- Empty active-profile state is explicit.

Verification:
- Focused Teams/Bid Profiles: 25/25 passed.
- Full frontend: 24 files / 162 tests passed.
- API: 36/36 passed.
- Lint, typecheck, production build, and `git diff --check`: passed.

Pending at handoff creation: commit/push and updated Azure preview deployment. No merge or production deployment.

---

# HANDOFF — Max VORP PR #11

_Last updated: 2026-09-26 04:13 PDT_

## Status

Complete and ready for review. PR #11 is open against `main`, mergeable, and has a successful CI build plus successful Azure PR deployment. **Do not merge and do not deploy production.**

- Branch: `feat/max-vorp-strategy`
- Implementation commit: `7c32a1fa0d6972108aa291ec8fe64ddaf173a4b4`
- PR: https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/11
- Exact hosted preview: https://nice-moss-07ec56310-11.centralus.7.azurestaticapps.net
- Base: merged `origin/main` at `2dccfcbe6d2f3fa7e03999a661694340f104147a` (PR #10)

## What shipped

- Added stable `max-vorp` strategy, displayed as **Max VORP**, first in the shared registry and the fresh/unset default.
- Connected the Waivers selector to persisted `activeStrategy` state instead of local-only state.
- Bumped persisted store schema to v2. Missing/invalid state migrates to Max VORP; every recognized explicit old selection is preserved; legacy `exponential` still maps to `aggressive`.
- Added exact all-count Max VORP computation and deterministic memoization.
- Replaced scattered Weeks-as-Starter profile lookups with one shared frozen `BIDDING_BASELINE = { strategyId: 'max-vorp', version: 'max-vorp-v1' }` resolver.
- Historical evidence and derived profiles record baseline strategy/version without modifying transaction or projection source evidence.
- Current predictions remain `baseline × manager multiplier`, applied once, capped by manager FAAB; buyer likelihood/order and Week 1/no-history behavior are unchanged.
- Added focused UI copy and `docs/MAX-VORP.md`.

## Formula and data flow

For each valid survivor count from the current active-team count through four (two eliminations per week above 16, then one per week):

1. Optimize the complete starter pool using league QB/RB/WR/TE/FLEX/SUPER_FLEX slots.
2. Use the final selected player at each position as its replacement projection.
3. Calculate player VORP as `max(0, player ROS points - positional replacement ROS points)`.
4. Build the final-four championship pool against that stage's replacement levels.
5. Calculate `dollarsPerVorp = initial league FAAB / average final-four-team VORP`.
6. Calculate the player's unrounded stage value as `VORP × dollarsPerVorp`.
7. Select the largest positive stage value and round once. Exact ties prefer the earlier/larger-team stage.

Sleeper ROS projections and the league's configured scoring/lineup are the source. Missing/incomplete calibration reports unavailable; a player at replacement level at every stage receives $0 through VORP itself.

The production cache keys on immutable projection-map identity plus lineup shape, initial FAAB, and survivor sequence. Historical snapshot projection maps are separately memoized, allowing claims from the same snapshot to share calibration results.

## SeaMex analysis and endpoint decision

Reproduce with `npm run analyze:max-vorp`; full per-player output is committed in `docs/analysis/max-vorp-seamex-2026.md`.

- Real 2026 SeaMex: 28 active teams; stages `28,26,24,22,20,18,16,15…4`
- Weeks 4–18; 2,110 players with projection data
- 192 players with positive Max VORP
- 21 interior maxima
- 21 endpoint-only disagreements
- Mean positive endpoint miss: $1.850
- Largest endpoint miss: $6.720 (Lamar Jackson)
- Positional interior maxima: QB 11, RB 6, TE 3, WR 1
- Cold exact calculation: 90.01 ms on the Pi; repeated call returns the memoized result object

**Decision:** endpoint-only is not equivalent. Exact all-count evaluation remains in production.

## Files of note

- `src/logic/waiverStrategies.ts` — ordered registry, default, versioned shared baseline resolver
- `src/logic/waivers.ts` — progression helpers, exact Max VORP calibration, cache, board integration
- `src/logic/biddingProfiles.ts` — historical survivor context, cached snapshot projections, versioned Max VORP evidence/profile baseline
- `src/pages/WaiversPage.tsx` — persisted selector/default and shared current prediction resolver
- `src/store/appStore.ts` — v2 migration/default
- `scripts/analyze-max-vorp.ts` — reproducible live-league analysis
- `docs/MAX-VORP.md` and `docs/analysis/max-vorp-seamex-2026.md`

## Verification

Local:

- Frontend Vitest: 24 files, 161 tests passed
- API Vitest: 2 files, 36 tests passed
- Typecheck passed
- ESLint passed
- Production Vite build passed
- `git diff --check` passed
- Changed-file secret scan passed
- Reproducible SeaMex analysis passed

CI / PR:

- PR #11: `MERGEABLE`, `mergeStateStatus: CLEAN`
- `build`: success
- `Build and Deploy`: success
- Exact Azure environment confirmed with `az staticwebapp environment list`

Hosted QA on exact PR preview:

- Real 2026 SeaMex loaded with 28 active / 32 total teams.
- Desktop 1440×1000 and mobile 390×844: no horizontal overflow and no console errors.
- Max VORP is first and selected by default; copy accurately describes all-stage championship-calibrated VORP.
- Switched to Weeks-as-Starter, reloaded, and confirmed the explicit choice persisted; switched back to Max VORP and confirmed persisted `activeStrategy: max-vorp`.
- Representative values with rostered players shown: elite Jahmyr Gibbs $227, fringe Devin Singletary $2, replacement-level Drew Lock $0.
- Bid Profiles rendered with real history; Houston0ilers showed Standard 0.95x and evidence baselines/ratios ($84/$90 = 1.07x, $66/$65 = 0.98x, $59/$48 = 0.81x), including Week 1 fallback.
- Current SeaMex has no unrostered player with positive Max VORP, so a manager-specific current prediction cannot naturally render in this hosted fixture. Focused tests verify Max VORP is the input, the multiplier is applied once, FAAB caps remain, and legacy `predictedWinningBid` is ignored.
- PR #10 source tabs, rostered toggle, team profiles, historical evidence modal, and responsive layout remained functional.

## Blockers / follow-up

No implementation blocker. The only hosted-data limitation is the absence of a positive-Max-VORP unrostered player for visually exercising current predictions; this path has direct unit coverage.

Real-bid model accuracy/outlier analysis, non-VORP replacement-level changes, player-level bid history, and new own-team border work remain explicitly out of scope.

## Safety confirmation

No merge, no push to `main`, no `workflow_dispatch`, and no production deployment were performed.
## 2026-09-27 owner clarity update — prediction R² labeling
- Owner flagged standalone `R²` labels as misleading because the report scores fixed strategy predictions against the identity line rather than presenting an in-sample fitted-regression goodness-of-fit statistic.
- Relabeled median-market tables to `Raw prediction R²*`, scatter plots/tables to `Prediction R²*`, and the formula card to `Prediction R² (unfitted)`.
- Added a prominent first-analysis warning: values are not fitted-regression R², may be negative when fixed predictions lose to the mean baseline, and do not imply negative correlation.
- Generator regression test now requires the explicit label/explanation and rejects ambiguous `<th>R²</th>`.
- Verification: `npm run analyze:bidding`; `npm run analyze:bidding:presentation`; focused presentation tests 4/4; `git diff --check`.

## 2026-09-30 weekly calibration handoff

- W4 is now a first-class eligible week throughout the weekly analysis/report/presentation. The exactly-five-bullet owner answer is generalized; no two-week guard or hardcoded W2/W3 labels remain.
- Adjacent held-out validation now emits W2→W3 and W3→W4 rows for all five primary strategies and both winning/serious-median lenses.
- Refreshed artifacts: `docs/analysis/bidding-strategy-accuracy-seamex-2026.{md,html,pdf}`. The PDF has 20 visually reviewed pages with no clipping or overflow.
- Current decision: **no product formula change**. W4 serious-market medians favor Corrected Weeks as Starter, W4 winners favor Corrected Safe, and aggregate serious/all-bid results still favor Current-team VoRP; lens instability plus reconstructed provenance keeps Middle VORP analysis-only.
- Validation to rerun: `npm run check`, `npm test`, `npm run analyze:bidding`, and `npm run analyze:bidding:presentation`.
