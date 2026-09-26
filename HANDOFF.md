# PR #10 follow-up handoff — correct baseline + buyer ranking

## Completed

- Historical manager event ratios now use the reconstructed historical `Weeks-as-Starter` suggestion, capped by pre-bid FAAB, rather than `predictedWinningBid`.
- Current manager forecasts now multiply the current row's `Weeks-as-Starter` suggestion by the manager multiplier and cap the displayed result by current FAAB.
- FAAB-capped amounts render red and include both an accessible label (`capped by available FAAB`) and visible `FAAB cap` text.
- Collapsed manager previews exclude all Unlikely buyers, even when fewer than three remain.
- Expanded predictions sort Likely → Possible → Unlikely, then capped predicted bid descending, manager name, and roster ID. Unlikely rows are visually de-emphasized.
- Added numeric regression coverage proving historical `$250` Weeks-as-Starter is used instead of `$469` predicted winning bid, and current `$42 × 1.50 = $63` is used instead of the materially different `$61` market prediction.
- The separate future weekly prediction-snapshot feature was intentionally not implemented.

## Validation

- Focused tests: 32 passed.
- Full frontend tests: 138 passed.
- API tests (`node --test api/test/*.test.js`): 36 passed.
- Lint: clean.
- Typecheck: clean.
- Production build: passed.
- `git diff --check`: clean.
- Secret pattern scan: clean.
- Real SeaMex Azure preview QA passed at desktop (1440×1000) and mobile (390×844): no horizontal overflow, collapsed previews show only likely/possible buyers, expanded tiers are ordered Likely → Possible → Unlikely, unlikely rows have reduced opacity, and capped `$165` displays red with visible `FAAB cap` plus the accessible `capped by available FAAB` label.
- Live numeric spot-check: Zay Flowers uses `$105` Weeks-as-Starter × `2.06` = `$216`; it does not multiply the standalone `$171` predicted-winning-bid value.
- Exact preview: https://nice-moss-07ec56310-10.centralus.7.azurestaticapps.net
- PR #10 head `994b393`: CI passed, Azure Build and Deploy passed, and GitHub reports MERGEABLE.

## Remaining

- None for this follow-up. Do not merge or deploy production; PR #10 is ready for review.
