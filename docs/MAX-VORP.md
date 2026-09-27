# Max VORP strategy

Max VORP is the first and default waiver strategy. It uses Sleeper rest-of-season projections in the league's scoring format and the league's actual starter slots.

## Formula

For every valid survivor stage from the current active-team count through four teams:

1. Build a deterministic optimal starter pool for that team count. Base position slots are filled first; FLEX and SUPER_FLEX then draw from one shared remaining eligible-player pool.
2. Set each position's replacement projection to the final selected starter at that position.
3. Compute each player's non-negative VORP: `max(0, player ROS points - replacement ROS points)`.
4. Build a separate final-four starter pool against that stage's replacement baselines.
5. Calibrate dollars as `initial league FAAB / average final-four-team VORP`.
6. Compute the player's unrounded stage value as `VORP × dollars per VORP`.
7. Select the maximum positive unrounded stage value and round once. Exact ties prefer the earlier/larger-team stage.

The valid team sequence follows the same generic progression as the app: two teams are eliminated per week above 16 survivors, then one per week, with a lower bound of four. It is not hard-coded to SeaMex or 28 teams.

A player at or below replacement level at every stage receives $0 from VORP itself. Missing or incomplete Sleeper data makes the strategy unavailable rather than silently substituting another source.

## Default and persistence

`src/logic/waiverStrategies.ts` owns the ordered strategy registry and `DEFAULT_WAIVER_STRATEGY`. Fresh or unset persisted state uses `max-vorp`; valid explicit legacy selections remain unchanged. The old `exponential` alias still migrates to `aggressive`.

## Bidding-profile baseline

The same registry module owns the single swappable `BIDDING_BASELINE` descriptor. Historical bid ratios and current manager predictions both call its resolver. Version `max-vorp-v1` records the strategy alongside derived evidence/profile data; immutable transaction and projection source evidence is not modified.

A current prediction is calculated exactly once as `Max VORP baseline × manager multiplier`, then capped by that manager's remaining FAAB. The older market-level `predictedWinningBid` is not an input.

## Analysis and performance

Run the reproducible live-league analysis with:

```bash
npm run analyze:max-vorp
# optional overrides:
LEAGUE_ID=<id> TEAMS_REMAINING=<count> npm run analyze:max-vorp -- docs/analysis/output.md
```

The checked-in SeaMex result is in [`analysis/max-vorp-seamex-2026.md`](analysis/max-vorp-seamex-2026.md). It records every positive player's maximizing stage, interior maxima, endpoint disagreements, positional summaries, and cold runtime. Because real interior maxima exist, production evaluates every valid stage exactly.

The complete result is memoized by projection-map identity, lineup configuration, initial FAAB, and survivor-stage sequence. Inputs are treated as immutable.
