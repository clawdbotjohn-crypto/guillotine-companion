# Guillotine Companion — Current Progress

## P0 — Hybrid custom rankings (review-ready, 2026-10-09)

Authoritative owner scope remains the approved “Durable custom player values” / Hybrid refinement captured in this file and `docs/archive/PROGRESS-through-2026-10-03.md`.

- [x] Added the final top-level `Custom` strategy with a dropdown-only named-ranking identity, adjacent `+ New`, settings, and confirmed delete controls; no visible “Custom Board” label or redundant identity strip.
- [x] Added versioned league+season browser-local persistence using the repository's existing Zustand `persist` convention: deterministic frozen generated player snapshots, explicit manual overrides, ten-ranking cap, and persisted last-used selection. Provider/week/roster/FAAB changes do not mutate saved values. First-PR scope is intentionally this browser/device only; cross-device sync and import/export are deferred.
- [x] Added create/settings flows using existing Player Values and strategy terminology, multiplier/modifier formula with a `$0` floor and preview, rename-only non-destructive saves, and explicit confirmed recalculation that atomically updates formula metadata/generated values and clears overrides. Duplicate trimmed/case-insensitive names are rejected in UI and store; reset/delete remain confirmed.
- [x] Split custom cards so the player region opens `PlayerDetailDialog` and only the value region edits the custom value; Enter/blur commits before value-based resort while Escape cancels. Custom-ranking dialogs close on Escape, contain focus, focus an initial control, and restore opener focus. Predicted bidding, bid history, source metrics, and Team Impact remain separate concepts.
- [x] Focused tests cover creation/formula floor, ten cap, league-season isolation, real localStorage rehydration/last-used selection, manual edits, metadata-safe settings/recalculation, duplicate-name defense, Escape/Enter/blur editing, dialog keyboard/focus behavior, delete confirmation, and market-value separation. Review-fix run: 28/28 focused tests passed.
- [x] Implementation baseline: `3cf1ce0`; independent-review fixes are at the branch tip. Review-fix validation: 28/28 focused tests and changed-file Oxlint passed with 0 errors; `git diff --check` and bounded secret scan passed. Baseline typecheck passed; repeat typecheck was deferred to CI because host availability (~1.2 GiB) was below the repository's 1.5 GiB safety floor.
- [ ] Independent review and hosted preview QA remain. Review-only PR will target `main`; do not merge, deploy, auto-merge, delete the branch, or touch PR #20 without exact owner authorization.

## P0 — Add key/value colons to Team Impact rows (owner refinement, 2026-10-06)

Authoritative source: Discord message [`1556958219526471684`](https://discord.com/channels/@me/1466769475880620163/1556958219526471684), John:

> “Minor change on the GB PR: We should separate the key value with a colon. So like \"Overall: 21/24 --> 17/24\".”

- [x] Update existing review PR #21 only.
- [x] Add colons between each compact Team Impact row label and its values: `Overall:`, `{position}:`, and `Lineup pts:`. Preserve the vertical four-line layout, independently colored rank values, accessible text, calculations, and `None` states.
- [x] Update focused assertions and run resource-safe verification. Commit `29deec1` updated existing PR #21; focused `PlayerDetailDialog` tests passed 12/12, file-scoped lint passed with 0 warnings/errors, `git diff --check` passed, and both GitHub checks passed. Hosted preview QA confirmed `Overall:`, `WR:`, and `Lineup pts:` in the four-line stack with complete accessible labels, independent rank colors, and popup bidding preserved. No merge, production deploy, branch deletion, or PR #20 change was performed.

## P0 — Apply established rank colors to Team Impact transitions (owner refinement, 2026-10-06)

Authoritative source: Discord message [`1556955114978414653`](https://discord.com/channels/@me/1466769475880620163/1556955114978414653), John:

> “For GB Team Impact, minor change, but we should probably use the same color scheme elsewhere for the position and overall before and after values.”

- [x] Update existing review PR #21 only; do not create another PR, merge, deploy, delete branches, or alter PR #20.
- [x] Color the **before and after rank values independently** for both `Overall` and the position row using the app's established rank quartiles: top 25% green (`#10b981`), middle 50% amber (`#f59e0b`), bottom 25% red (`#f43f5e`). Keep labels/arrows neutral and leave `Lineup pts` unchanged.
- [x] Reuse the shared `rankQuartile()` semantics so tiny leagues, ties, invalid values, and active-team denominators remain consistent with Hub projected-position rankings and manager strength/need presentation.
- [x] Preserve the four-line layout, accessible complete text, `None` states, popup bidding, Waivers rail removal, and all Team Impact calculations.
- [x] Add focused regression assertions for independently colored before/after values and push commit `1fd6728` to PR #21. Focused tests passed 12/12 and file-scoped lint passed; GitHub/Azure preview checks are rebuilding.

## P0 — Simplify Team Impact to the four essential lines (owner request, 2026-10-05)

Authoritative source: Discord message [`1556879194926096504`](https://discord.com/channels/@me/1466769475880620163/1556879194926096504), John:

> “There is a lot of text, but really we just need the +/- number, followed by the 3 arrow parts (Overall 22/26 --> 16/26), all stacked vertically. So basically no text or other information in that section when there is impact.”

When `teamImpact.status === 'available'` and impact is non-zero:

- [x] Keep only the signed lineup-points delta (for example `+12.4`) followed by the three existing before → after metrics: `Overall`, the player's position rank, and `Lineup pts`.
- [x] Stack the delta and all three metrics vertically; do not use the current three-column card grid.
- [x] Remove the explanatory intro, “Projection change:” label, starter-change copy, assumed-drop copy, FAAB copy, and the explanatory footer from the rendered impact state.
- [x] Keep only the minimal labels necessary to identify the three arrow metrics; do not add replacement prose or new information.
- [x] Preserve the existing impact calculation, zero/`None` state, unavailable/`None` state, player-detail behavior, and accessibility.
- [x] Add focused desktop/mobile rendering coverage and open only a review PR. Do not merge, deploy, or alter PR #20.

## P0 — Remove redundant side `Bids` rail from collapsed Waivers cards (owner decision, 2026-10-05)

Authoritative source: Discord message [`1556881785235841097`](https://discord.com/channels/@me/1466769475880620163/1556881785235841097), John:

> “My guidance is to remove that side bid. Like you said it is redundant, the correct path is supposed to be to see bids in the player card popup (where it already is). Can you create a fix for this and share the link for me to verify?”

- [x] Forensics: PR #15's first implementation commit `de277b00` added universal player-details behavior and split the prior whole-card bid expansion into a separate right-side chevron rail on 2026-09-29 at 03:08 PDT. Commit `fe6cdbe3` changed that chevron into the visible vertical `Bids`/`Hide bids` text on 2026-09-29 at 21:46 PDT. PR #15 merged on 2026-10-02 at 03:36 PDT, so it was not a last-minute pre-merge addition; the visible text existed for more than two days and six subsequent PR commits before merge. It was nevertheless an implementation choice, not an explicit owner request.
- [x] PR #19 did not touch `WaiversPage.tsx` or `PlayerDetailDialog.tsx`. Its runtime scope was the League/Bids chart and shared filters, exact transaction timestamps/zero-dollar preservation, and strict native Sleeper type-3 detection; the remaining changes were tests/types/copy supporting those behaviors.
- [x] Remove the separate side disclosure rail, its local expanded state, and the duplicate inline `WaiverManagerPredictions` panel from collapsed waiver cards.
- [x] Keep the whole-card click path opening `PlayerDetailDialog`, where `Predicted bidding` already exists. Preserve the compact summary's prediction indicator/value unless visual QA shows it is also redundant; do not remove the popup data.
- [x] Add focused regression coverage that the card has one primary details action, no side `Bids`/`Hide bids` control or duplicate inline panel, and the popup still exposes predicted bidding.
- [x] Include this in the same narrowly scoped review PR as the approved Team Impact simplification, then provide an exact hosted preview for owner verification. Do not merge or deploy production.

Execution status (2026-10-05 PT):
- Review PR #21: https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/21
- Preview URL: https://nice-moss-07ec56310-21.centralus.7.azurestaticapps.net
- Focused regression tests passed: `src/components/PlayerDetailDialog.test.tsx`, `src/pages/WaiversPage.test.tsx`
- GitHub checks passed: `build`, `Build and Deploy`
- Hosted QA confirmed on preview data path (2026 league): no side `Bids` rail on Waivers cards, card click opens Player Details, popup still exposes `Predicted bidding`, and Team Impact renders as `+/-` plus the three stacked `before → after` rows.
- Desktop pass completed in-browser; separate explicit 390×844 re-run was blocked when the OpenClaw browser control service timed out before the mobile viewport capture step.

> **Updated:** 2026-10-05
> **Purpose:** Current owner-approved work, unresolved requirements, and operating constraints only.
> **Archive:** Detailed completed/review history through 2026-10-03 is preserved in `docs/archive/PROGRESS-through-2026-10-03.md`.

## Owner-selected package delivered — Live scoring on Hub (2026-10-05)

Authoritative sources: Discord DM `1556598413582401567`, `1555497219050278982` (“Add live scores to Hub”), and `1555501175110463619` (“Create a projection system where we have the score projections for every team in the league”).

- [x] Review-only [PR #20](https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/20) adds a compact all-team Hub view with official Sleeper points, actual-starter app projected finals, remaining/in-progress counts, freshness, explicit refresh, and unavailable/partial states.
- [x] Survival rank, risk, and cutline use only full projections for active teams; eliminated teams remain visible and excluded from the active denominator.
- [x] Refresh is 60 seconds only in bounded live windows, with one kickoff wake-up inside six hours and no polling for games hours/days away.
- [x] Independent review findings addressed; 247 frontend + 61 API tests, lint (one pre-existing warning), typecheck, build, diff/secret checks, CI, and hosted 1440×900/390×844 QA passed.
- [x] Exact preview: `https://nice-moss-07ec56310-20.centralus.7.azurestaticapps.net`. PR remains unmerged; no production deploy or branch deletion.
- [ ] **Owner design feedback (Discord `1556774531073310731`, 2026-10-05):** “I checked the 2nd GB work as well. It will need more design changes on how we want to implement it. But I'll think about how to do that soon.” Leave PR #20 open and do not invent or implement further design changes until John provides direction.

## Current state

- PR #19 was explicitly owner-approved in Discord messages `1556774531073310731` and `1556792284001992826` and squash-merged to `main` on 2026-10-05 as `7d825df44061a2bbfc9f0a0673fe46a848e9ed72`. Its branch was not deleted and no manual production workflow was triggered.
- PR #18 (`feature/native-guillotine-bidding-history`) was **closed unmerged at John's request** because it replaced the requested graph with a separate History page. Do not reopen, merge, deploy, or delete its branch without explicit owner approval.
- PR #20 is the independent Hub live-scoring package. It remains open and review-only pending John's design direction.
- PR #20 overlaps merged PR #19 in shared model/type surfaces (`src/api/types.ts`, `src/logic/elimination.ts`), so it may require a small conflict reconciliation; the packages are otherwise independent.
- No production deployment or manual workflow dispatch is authorized. Every PR remains review-only until John approves that exact PR.

## P0 — PR #19 ready for owner review: League/Bids graph + native identity

### Authoritative source

Discord message [`1555496839740919809`](https://discord.com/channels/@me/1466769475880620163/1555496839740919809), John:

> “In League/Bids, add a graph at the top like the scores by week graph that shows bids by week visual.”

John approved bundling the small native Sleeper identification correction. The quote above remains the visual scope.

### Owner mobile-QA corrections — 2026-10-05

Source: Discord message `1556593005849219072` with screenshots from the PR #19 mobile preview.

- [x] **Week scope filters the graph:** `All / 1 / 2 / 3…` now scopes Bids by Week and the supporting grid/list together; `All` restores the complete cross-week view. Position/FLEX and week filters intersect consistently.
- [x] **One visual x-column per NFL week:** root cause was deterministic array-index jitter (`week ± 0.28`), not transaction-day plotting. Every point now uses the exact integer NFL week x-value; exact Sleeper transaction time remains in tooltip/title/accessible detail only.
- [x] Validated on existing PR #19 branch at the exact preview with focused/full tests and hosted desktop/390px QA. Correction commit `764f678`; CI green, PR mergeable/clean, still unmerged and review-only.

### Current review state

- [x] Clean replacement branch from `origin/main`; no PR #18 code or branch reused.
- [x] Existing League → Bids now begins with a responsive Bids by Week chart, while retaining the canonical `extractBids()`, filters, grid/list, and existing navigation/components.
- [x] Position/FLEX and week filters update the chart and supporting content together; `All` restores every week. Completed wins, genuine `$0`, transaction timestamps, empty/partial weeks, labels, and tooltips retain explicit semantics.
- [x] Native identity is strictly NFL + integer `settings.type === 3`; 0/1/2 and missing/malformed/fractional/novel values fail closed, independent of `playoff_teams`, team/roster shape, eligibility, and elimination.
- [x] Focused/full frontend/API tests, lint, typecheck, production build, diff check, changed-file credential scan, independent review, and hosted desktop/mobile QA passed.
- [x] **Owner-approved and merged:** John explicitly approved PR #19 in Discord message `1556774531073310731`; it was squash-merged on 2026-10-05 as `05c86b3a46bc68761bf79476a4ddbbd6c67d8434`. Branch deletion and manual production deployment were not performed.

## P0 — Snapshot reliability and exact prospective evidence

### Decision Week 5 no-write preflight — PASS (2026-10-05 20:03 PDT)

- Current clean `origin/main` was `7d825df44061a2bbfc9f0a0673fe46a848e9ed72`. The merged runbook (`docs/PROJECTION-SNAPSHOTS.md`), workflow, API route, fetch/canonicalization/hash helpers, and repository boundary were reviewed before probing production.
- GitHub workflow `367263137` (`.github/workflows/projection-snapshot.yml`) exists on default branch `main` and is `active`. Its six independent Wednesday UTC schedules (`03:02/03:07/03:12` and `04:02/04:07/04:12`) cover Tuesday 20:02/20:07/20:12 in PDT and PST; direct resolver simulations accepted W5 PDT and representative PST coordinates and rejected the wrong W5 UTC hour.
- Required GitHub metadata is present without reading values: variables `PROJECTION_SEASON=2026` and `PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE=2026-09-08`; secrets `PROJECTION_SNAPSHOT_API_URL` and `PROJECTION_SNAPSHOT_SCHEDULER_SECRET` (plus the unrelated SWA deployment token).
- Production Azure settings metadata/shape checks confirmed the scheduler secret is present and at least 32 characters, the calendar date is `2026-09-08`, and `SUPABASE_URL` points only to approved ref `xduqpomhjdlgmtmmkfed`; no value was printed or changed. No broader fetch/hash dry-run endpoint is deployed on current `main`, so the approved side-effect-free authenticated `HEAD` returned HTTP 204 and a deliberately invalid authenticated `POST {}` returned deterministic HTTP 400 `INVALID_REQUEST` for missing required fields—authorization passed, with validation occurring before any fetch, repository query, or ingestion.
- Credential-free production GET for `season=2026&decisionWeek=5` was byte-for-byte identical before and after all probes: selected fallback snapshot `90681181-3c51-4f68-91cd-ca1637ffbd95`, stored Decision Week 4 reconstructed, 15,761 declared/returned rows, hash `9463b40e63b71c0088a311675d47bdc508a627ba446d703a54b5ba2ced4dc523`, response-body SHA-256 `35c28a56ad8385786ad6ffa9666c9aa260adc2fcdd9fdb358de1569a60bb58aa`. No W5 row was created.
- Direct fallback readiness was exercised from that clean `origin/main` clone using only existing `fetchRemainingProjections()` + `hashRows()` for season 2026 / Decision Week 5; no repository was constructed and ingestion was not called. Proposal at 2026-10-06T03:03:24Z–03:03:26Z: 14,841 canonical rows for Weeks 5–18, SHA-256 `2295db739041d1deb31afa8ae0a58d23547b03d690d1fb0226a77a35e44813b2`.
- Safety job `40be660b-c20a-41a9-a3b1-459b8c6e4ce9` is enabled, one-shot, scheduled for `2026-10-07T03:02:00.000Z`, and announces to Discord project channel `1467306156106977386` (`#clawdbot-projects`). Its prompt restricts production data to the approved Supabase ref and requires public-GET/workflow verification before any authorized in-window recovery.
- Remaining owner action: none before the exact window. Observe Tuesday's scheduled captures/safety job; only owner-authorized in-window recovery may persist an exact W5 snapshot, and exact provenance must never be fabricated after the window.

- [x] PR #16 merged and deployed with scheduler authentication moved to `X-Projection-Snapshot-Secret`; production no-write auth canaries passed.
- [x] Monday Decision Week 5 no-write preflight (`306c496e-a561-44d6-bb39-6150fcb7fec1`) passed with immutable production evidence recorded above.
- [ ] Keep Tuesday exact-window safety/recovery check (`40be660b-c20a-41a9-a3b1-459b8c6e4ce9`) under observation.
- [ ] Require an exact same-week row inside the database-enforced capture window. Never relabel a late/reconstructed capture as exact.
- [ ] Continue immutable pre-waiver positional-need snapshots and post-waiver canonical outcome attachment. Refuse or alert on missing/late capture.
- [ ] A future fully non-persisting dry-run may exercise auth, timing, fetch/hash, and repository configuration, but must prove no row mutation.

## Active recurring evidence work

- [ ] Wednesday bidding-strategy calibration remains read-only and must separate winning price, serious-market/clearing proxies, claim participation, and modeled need. Keep production coefficient/formulas unchanged without held-out multi-week evidence.
- [ ] Continue exact prospective snapshots, first-through-fifth winning-price tracking where analytically useful, and privacy-safe need/outcome evidence.
- [ ] Preserve raw provider projections; injury status remains display context and must not alter projections, values, ranks, optimized lineups, ROS projections, or bid formulas.
- [ ] Keep exact versus reconstructed provenance visible. Missing claims are not zero-dollar bids; FAAB caps are censoring.

## Owner-approved product backlog

### P1 — Make Hub and Team Profile share code and features

Authoritative owner wording from Discord message `1555524854795382986`: **“Share team page and hub features and code.”** Do not expand this into a route merger, large canonical dashboard rewrite, or new information architecture unless John separately asks.

- [ ] Create one shared team-view data/calculation layer keyed by `rosterId` for status, ranks, active-team denominator, weekly performance, roster, values, acquisitions, FAAB, draft/history, and common loading/unavailable states.
- [ ] Extract reusable sections/components instead of importing one route wholesale into another. Route composition and owner-only actions may differ where useful.
- [ ] Add parity tests proving `/hub` and `/teams/:ownRosterId` use the same canonical fields, values, denominators, and status semantics.
- [ ] Do not turn this into unnecessary route consolidation or an information-architecture rewrite.

### P1 — Live scoring on Hub

Authoritative owner wording: Discord message `1555497219050278982`, **“Add live scores to Hub,”** and message `1555501175110463619`, **“Create a projection system where we have the score projections for every team in the league.”**

- [ ] Design a compact Hub section showing current scored points and honest projected/survival context, remaining players, freshness, and a route to fuller league detail.
- [ ] Build/reuse one shared projection model for every league team; distinguish official Sleeper points, app-computed projections, and stale/unavailable states.
- [ ] Define game-window refresh/caching behavior before enabling polling; avoid overcrowding bottom navigation.

### P1 — Durable custom player values

- [ ] Design guided setup from a rankings source plus optional bidding style, configurable positional maximums, curve/spread, positive-player cutoffs, and understandable `$0` boundaries.
- [ ] Preserve source-relative ordering unless explicitly edited. Keep named/versioned custom sets separate from provider-native values.
- [ ] Define durable ownership/auth, persistence, autosave/versioning, reset/duplicate/recovery, and optional import/export before implementation.

### P1 — Request/cache audit

- [ ] Measure initial load, refresh, league/source switch, and tab-switch requests; identify duplicate provider/backend calls and request waterfalls.
- [ ] Define freshness by data class, shared deduplication/cache ownership, event-aware invalidation, and an explicit accessible refresh path.
- [ ] Add request-count/deduplication coverage without changing valuation semantics. Do not reactivate the previously deferred broad Waivers render-performance rewrite unless new evidence shows a current problem.

### P2 — Manager likely-bids view, scenarios, and opponent needs

- [ ] Authoritative owner request from Discord message `1555501175110463619`: **“Make likely bids a section for the manager that pops up. This way we can show every player we predict they might bid on.”** Do not invent ordering, confidence, filters, or extra layout requirements before design/review.
- [ ] Explore a roster/acquisition scenario planner comparing one or more free-agent targets: optimized next-week points/ranks, displaced starter/drop, remaining FAAB, bye conflicts, and credible competitors.
- [ ] Reuse existing position-need, FAAB, roster, and observed bid-history signals. Keep modeled `Likely/Possible/Unlikely` demand distinct from historical evidence and never imply certainty.
- [ ] Consider a conditional-claims checklist/export, but do not submit bids automatically.

### P2 — Additional league/player views

- [ ] Evaluate a bidding-by-position view using existing canonical bids; do not duplicate League/Bids parsing.
- [ ] Explore player game logs, prominent positional rank/average, injury-status display, and team strength/need parity only after confirming trustworthy source coverage.
- [ ] Keep broader first-through-fifth trend, stage/liquidity, and dedicated Bidding-navigation concepts as assistant-proposed possibilities unless John separately confirms them.

## Analysis hypotheses — not production changes

- [ ] Continue evaluating Middle VORP and alternative horizons only in reproducible analysis. Do not add/change the production default without stable held-out evidence and owner review.
- [ ] Keep intrinsic value, observed market distributions, manager-adjusted forecasts, and forward predictions visually and semantically separate.
- [ ] Historical evidence remains too sparse for strong causal or calibrated-probability claims. Report sample sizes, uncertainty, censoring, and exact/reconstructed provenance.

## Permanent project guardrails

- Production deploys are owner-only. “Merge” never implies deploy.
- Never merge, enable auto-merge, or delete a PR branch without explicit owner approval for that exact PR.
- Do not change bidding formulas merely to make a UI feature work.
- Use canonical transaction parsing; never fabricate bids, participation, exact snapshots, or causal conclusions.
- Use only dedicated Guillotine Supabase project `xduqpomhjdlgmtmmkfed` for project snapshot/evidence data.
- Preserve unrelated PR semantics, accessibility, mobile behavior, caching/request behavior, and source/provenance labels.

## Recently completed index

Detailed evidence and superseded checklists are archived in `docs/archive/PROGRESS-through-2026-10-03.md`.

- PR #17 — final Team Impact and predicted-bid wording; merged 2026-10-03.
- PR #16 — snapshot reliability/custom scheduler auth; merged and production canaries passed 2026-10-03.
- PR #15 — universal Player Details, Team Impact/value/history work; merged 2026-10-02 (see archive for unauthorized-merge incident and safeguards).
- PR #11 — Max VORP default and bidding-profile baseline.
- PR #10 — manager bidding profiles and owner-review corrections.
- PR #9 — immutable projection-snapshot backend.
- PR #6–#8 — compact Teams/Waivers/Hub and supporting product work.
- PR #18 — closed unmerged 2026-10-03 after owner-intent drift; branch retained for reference only.
