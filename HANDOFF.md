# PR #10 Owner-Review Handoff

## Status

Owner review revision implemented and verified on `feat/bidding-behavior-profiles`.

## Implemented

- Removed the standalone Waivers manager-profile panel.
- Added the top three active-manager predicted bids directly to collapsed player cards.
- Full-card click/native keyboard activation expands to the top ten predictions; `Show more` reveals the rest.
- Each prediction shows manager, FAAB-capped predicted bid, current FAAB, multiplier/category, and positional-need buyer likelihood.
- Simplified player metadata to `Position #N • Value X`, `Week N X • Rank N`, team, and bye; kept Suggested and overall Predicted bid on the right.
- Added Teams > Bid Profiles sorted most-to-least aggressive, with current FAAB and expandable plain-language behavior/history.
- Simplified history to player, `Wk N`, Won/Lost, Suggested, Actual, pre-bid FAAB, and Ratio; provenance/reconstruction/confidence/model terminology stays hidden.
- Week 1/no canonical history renders only the existing overall predicted winning bid.
- Preserved the prior uncommitted per-coordinate snapshot parse/cache/partial-failure changes in API client/hooks/tests.

## Math semantics

- Overall baseline remains the existing season-adjusted Sleeper / Weeks-as-Starter predicted winning bid.
- Internal willingness remains `baseline × manager multiplier`.
- Displayed manager prediction remains `min(internal willingness, current FAAB)`.
- Historical ratio remains `actual / min(historical suggested baseline, pre-bid FAAB)`.
- Buyer likelihood is display-only: among active teams, top positional-strength third = Unlikely, middle = Possible, bottom = Likely. It does not alter any bid value.
- Canonical transaction classification/deduplication, historical FAAB reconstruction, top-three bid history, geometric multipliers, snapshot provenance, and backend security are unchanged.

## Verification

- Focused owner-requirement tests: passing.
- Full frontend suite: 135/135 passing across 22 files.
- API suite: 36/36 passing.
- Lint: 0 warnings/errors. TypeScript and production build: passing. `git diff --check`: clean. Changed-file secret scan: clean.
- SeaMex browser QA completed on the hosted Azure PR preview at 1440 px desktop and 390 px mobile: compact cards show exactly three live manager predictions; native keyboard Enter expands to 10; Show more revealed the remaining 15 (25 active-manager rows total); Teams > Bid Profiles loaded live profiles in descending aggressiveness (2.71×, 1.44×, 1.35× at the top); simplified nested history rendered Suggested/Actual/FAAB/Ratio; 0 px horizontal overflow; no console errors.

## PR / Preview

- Implementation commit: `bb24b514277db94c6a041dca871a14464e364760`.
- PR: https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/10
- Exact preview: https://nice-moss-07ec56310-10.centralus.7.azurestaticapps.net
- At implementation head: CI `build` passed; Azure `Build and Deploy` passed; PR was `MERGEABLE` / `CLEAN`.
- This documentation-only follow-up commit does not change runtime code; final head check status is reported by the scheduler summary.

## Safety

No merge, main/master push, production deployment, or workflow dispatch was performed.
