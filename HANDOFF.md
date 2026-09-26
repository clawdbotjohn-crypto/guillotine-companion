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
- Local SeaMex browser QA: compact labels verified; native keyboard Enter expansion verified; Teams Bid Profiles placement verified; 0 px horizontal overflow at desktop and 384 px mobile; no console errors. Local Vite does not host the Azure Functions snapshot endpoint, so live profile-data QA will be completed on the hosted PR preview after deployment.

## PR / Preview

_To be filled with final commit SHA, checks, mergeability, exact Azure preview URL, and hosted-preview QA after push._

## Safety

No merge, main/master push, production deployment, or workflow dispatch was performed.
