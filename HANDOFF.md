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
- Real SeaMex desktop/mobile Azure preview QA: pending final hosted build verification after push.

## Remaining

1. Commit/push the correction to `feat/bidding-behavior-profiles`.
2. Resolve the exact PR preview URL, wait for CI/deployment, and run authenticated SeaMex desktop/mobile QA.
3. Record final preview/check/mergeability status here if another session needs to continue.
