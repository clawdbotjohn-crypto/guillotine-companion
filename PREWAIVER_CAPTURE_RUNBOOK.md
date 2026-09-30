# Pre-waiver positional-need capture runbook

This is an analysis-only, deterministic manager × target opportunity capture. It is separate from the provider projection snapshot and does not write Supabase. No LLM judgment is used. The script calls the production `projectBestLineup`, `computeProjectedLineupGroupRanks`, `buyerLikelihood`, `buildWaiverBoard`, `resolveBiddingBaseline`, and `predictManagerBid` functions.

## Private input and local secret

Before the Tuesday waiver run, place a frozen input at:

`analysis/prewaiver-inputs-private/<season>-dw<decision-week>.json`

That directory is ignored. The input is `prewaiver-capture-input-v1` and contains:

- season, decision week, playing week (`decisionWeek - 1`), capture timestamp, exact window, and waiver processing timestamp;
- private source roster/player IDs (the league ID is not needed); initial and pre-waiver FAAB; active/eliminated state;
- every roster player, position, weekly projection, ROS projection/value/rank, target injury and bye;
- manager bidding profiles produced from the existing production history model;
- target IDs and optional provider projection content hash/decision coordinate.

Use the input shape in `scripts/fixtures/prewaiver-capture-input.json`. That committed fixture contains aliases only—never copy a real league ID, manager name, credential, environment value, or raw private payload into a fixture or panel.

Create a stable random salt once, store it only in the automation secret store or local shell, and reuse it every week so aliases remain joinable:

```bash
export PREWAIVER_ALIAS_SALT='<at-least-16-character-local-secret>'
```

Never pass the salt on the command line, commit `.env.prewaiver`, or commit an alias mapping. The output uses HMAC aliases; it does not persist source IDs or the salt.

## Validate without writing

Dry-run reads the complete input, runs production calculations, checks timing/week mapping/cardinality/hashes/privacy-safe aliases, and writes nothing:

```bash
npm run capture:prewaiver -- \
  --input analysis/prewaiver-inputs-private/2026-dw05.json \
  --output-dir analysis/prewaiver-panels \
  --dry-run
```

Expected validation shape:

```text
"timing": { "eligible": true, "state": "pre-waiver-exact" }
"managerCount": <all manager states>
"activeManagerCount": <active managers>
"targetCount": <targets>
"expectedRowCount": <all managers × targets>
"actualRowCount": <same>
"uniqueRowCount": <same>
"wouldWrite": false
"expectedArtifact": .../analysis/prewaiver-panels/prewaiver-2026-dw05-<capture UTC>.json
```

## Immutable write

Only after the eligible dry-run succeeds:

```bash
npm run capture:prewaiver -- \
  --input analysis/prewaiver-inputs-private/2026-dw05.json \
  --output-dir analysis/prewaiver-panels
```

The artifact name is coordinate-based and immutable. Repeating an identical run returns `status: "unchanged"`; the script refuses an existing path whose artifact, context, or row hash differs. The CLI checks its wall-clock execution time in addition to the frozen `captureAt`, so replaying a stale pre-cutoff input after the cutoff cannot create an exact panel. Commit only the generated privacy-safe panel, never the private input.

The panel freezes the anonymized roster/optimized-lineup inputs needed to reproduce each need rank, target values/ranks and four strategy amounts, willingness and capped prediction, injury/bye, FAAB/liquidity, source link, timing, and row/hash audit. Production rank ties use points descending then roster ID ascending. The capture sorts private source roster IDs with numeric collation before assigning synthetic IDs, preserving that rule without persisting source IDs; the audit records it. K/DEF targets are refused because the production waiver board does not support them. An unconfigured supported target position retains null rank/percentile/need and production `Possible` semantics rather than inventing evidence.

## Weekly report ingestion

After capture, provide the immutable panel to the report generator:

```bash
npx tsx scripts/generate-bidding-analysis-presentation.ts \
  --prewaiver-panel analysis/prewaiver-panels/prewaiver-2026-dw05-<capture UTC>.json \
  --pdf
```

The report validates exact timing, week mapping, row cardinality, uniqueness, and row hash. It feeds the prospective population into Questions 1, 2, and 8 without treating pre-auction rows as outcomes. Omitting `--prewaiver-panel` is supported and preserves legacy report output.

## Failure and alert procedure

- **Before-window:** wait until `windowOpensAt`, refresh the private frozen input, and dry-run again.
- **At/after `windowClosesAt`:** exit code `2`, `state: "post-waiver"`, no artifact. Do **not** move timestamps or reconstruct mutable roster/FAAB state. Alert the report owner: `MISSING EXACT PREWAIVER PANEL: season <S> decision week <W>; post-waiver reconstruction prohibited.` The weekly report must continue without the panel and disclose the gap.
- **Cardinality/hash/privacy/input error:** exit code `1`, no write. Keep the previous immutable artifact, correct the upstream private input, rerun dry-run, and alert if the exact window will be missed.
- **Immutable conflict:** do not delete or overwrite. Preserve both the input and existing panel locally, compare source hashes, and escalate as a capture-integrity incident.
- **Missing projection hash:** capture may proceed with `projectionLink: null`, but the gap is explicit. Never substitute a later provider snapshot.

Post-cutoff no-write gate check (exit `2`, `state: "post-waiver"`, no artifact when run after the fixture's window):

```bash
PREWAIVER_ALIAS_SALT='fixture-test-salt-2026-not-private' \
  npm run capture:prewaiver -- \
  --input scripts/fixtures/prewaiver-capture-input.json --dry-run
```

The deterministic eligible-path mechanics, idempotent second write, conflict refusal, and twice-generation/hash comparison use an injected test clock and are covered by:

```bash
npx vitest run scripts/__tests__/prewaiver-capture.test.ts
```
