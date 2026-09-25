# Bidding Profiles and Bid Predictions — V1 Plan

**Status:** Approved direction; implementation starting 2026-09-24
**Scope:** Sleeper guillotine leagues, Sleeper projection source, top-three canonical manager bids

## 1. Product goal

For every manager, explain how aggressively they historically bid relative to the app's recommendation at the time of each claim, then use that behavior to predict their next bid.

The V1 output for each manager is:

- their top three usable waiver bids;
- the app's historical weekly baseline for each player at that claim's cutoff;
- actual-to-baseline ratio for each observation;
- whether budget constrained the observation;
- aggregate multiplier and confidence;
- style: **Conservative**, **Standard**, or **Aggressive**;
- next-week predicted willingness and the feasible bid after current-FAAB capping.

V1 does not infer roster needs, positional weakness, player ownership, elimination context, or who is likely to bid on a player.

## 2. Why persistent storage is required

Sleeper exposes old weekly projection routes, but those payloads are mutable. Past rows can be changed after the waiver window. The app's Sleeper rest-of-season ranking also sums every then-future weekly projection, so reconstructing an old baseline requires all future-week payloads as they existed before that waiver run.

Therefore:

- Existing weeks before snapshot collection are **reconstructed estimates** using currently available Sleeper data.
- Future weeks captured by the system are **exact snapshots** of the projection inputs used at the cutoff.

The database stores one global projection snapshot per canonical cutoff. It does **not** copy projections per league.

## 3. Architecture and responsibility split

### Database: immutable shared projection evidence

A dedicated Supabase project stores:

1. `projection_snapshot_runs`
   - season and decision week;
   - canonical cutoff plus immutable capture-start and fetch-finish times;
   - source and endpoint identity;
   - status, row count, content hash, and error/provenance metadata.
2. `projection_season_calendar`
   - immutable season-to-decision-Week-1 Pacific local Tuesday mapping;
   - DB-owned source for deriving every accepted season/week/cutoff coordinate.
3. `projection_snapshot_values`
   - snapshot ID;
   - projected NFL week;
   - Sleeper player ID;
   - `pts_std`, `pts_half_ppr`, and `pts_ppr` from that captured payload.

The database does not store manager bidding profiles, manager labels, rosters, needs, or duplicate per-league copies of global projection data in V1.

Security:

- Browser clients have read-only access to completed snapshots through the backend API.
- Browser clients cannot insert, update, or delete snapshots.
- Only the backend ingestion function receives the Supabase service-role credential.
- Row-level security remains enabled and default-deny for direct public access.

### Backend: capture and retrieval, not manager modeling

Azure Static Web Apps managed functions provide:

1. An authenticated projection-snapshot ingestion endpoint.
   - validates a scheduler secret;
   - fetches Sleeper projection payloads for the relevant remaining weeks;
   - normalizes only the compact scoring fields needed by V1;
   - writes one idempotent snapshot run and its player-week values;
   - records hashes, counts, timestamps, and failures.
2. A read endpoint for the frontend.
   - returns the most recent complete snapshot at or before a requested cutoff;
   - includes exact/reconstructed provenance;
   - does not expose database credentials.

A scheduled GitHub Actions workflow invokes ingestion before the canonical weekly waiver cutoff. This avoids requiring a separate paid Azure Functions app because SWA-managed Functions do not support timer triggers. The ingestion endpoint is idempotent, so a retry cannot duplicate a cutoff.

### Frontend: transaction evidence, calculations, and UI

The frontend remains the owner of manager-specific modeling:

1. Fetch all relevant Sleeper waiver transaction rounds for the league.
2. Classify canonical evidence:
   - include completed bids;
   - include failed claims only when the failure proves another manager won that player in the same processing batch;
   - exclude roster-invalid failures and unmatched failures;
   - collapse duplicate contingency/drop-path submissions to one manager-player-batch observation.
3. Reconstruct each manager's FAAB immediately before each claim from:
   - original league FAAB;
   - chronologically prior successful waiver spend;
   - exposed FAAB transfers/commissioner adjustments when available.
4. Select each manager's top three canonical bids by actual bid amount, with deterministic tie-breaking.
5. Load the matching historical projection snapshot and run the existing waiver formula with the historical decision-week context to reproduce that player's weekly predicted-winning-bid baseline.
6. Calculate each event's effective baseline:

   ```text
   effectiveBaseline = min(historicalWeeklyBaseline, faabAvailableBeforeBid)
   ratio = actualBid / effectiveBaseline
   ```

7. Mark an observation budget-constrained when the manager bid all or nearly all available FAAB. This is censored evidence: it proves willingness of at least that amount, not the manager's unconstrained ceiling.
8. Aggregate the usable event ratios with a geometric mean:

   ```text
   managerMultiplier = exp(mean(log(eventRatio)))
   ```

   Geometric aggregation gives equal multiplicative weight to each decision and treats reciprocal behavior symmetrically (`2x` and `0.5x` produce `1x`).
9. Apply the multiplier to the selected player's current weekly baseline:

   ```text
   predictedWillingness = currentWeeklyBaseline * managerMultiplier
   feasiblePredictedBid = min(predictedWillingness, currentFaab)
   ```

10. Render the three evidence rows, aggregate multiplier, style, confidence, and current prediction.

## 4. Formula rules and edge cases

### Baseline and ratio

- Use the app's **predicted winning bid** for the player at that historical cutoff, derived from the captured Sleeper projection snapshot and existing Weeks-as-Starter model.
- Cap the historical denominator at pre-bid FAAB so depleted managers are not falsely labeled conservative.
- `$0` or unusably tiny baselines do not produce a ratio. Record the observation but exclude it from multiplier math.
- Add a versioned minimum-baseline constant to prevent tiny denominators from producing unstable multipliers.
- Do not silently clamp ordinary ratios merely to make styles look reasonable. If a winsorization cap is later added, it must be explicit, versioned, and tested.

### Budget-constrained observations

- `actualBid >= constrainedThreshold * faabAvailableBeforeBid` marks an all-in/near-all-in observation.
- The capped ratio may be shown and used in V1, but confidence is reduced because the true willingness is a lower bound.
- If enough unconstrained observations exist, they should drive confidence more strongly than constrained ones.

### Style thresholds

Thresholds live in versioned frontend constants with boundary tests. Initial proposal pending final calibration:

- **Conservative:** multiplier `< 0.85`
- **Standard:** `0.85–1.15`
- **Aggressive:** `> 1.15`

The UI must show the multiplier so the label never hides the underlying evidence.

### Confidence

Initial deterministic policy:

- **High:** three exact-snapshot, uncensored observations;
- **Medium:** three observations with one or more reconstructed/constrained rows, or two strong observations;
- **Low:** one observation, uncertain FAAB reconstruction, or only reconstructed/censored evidence;
- **Insufficient:** no usable ratio.

## 5. Snapshot timing and provenance

V1 uses one documented canonical weekly cutoff. The scheduler stores the actual fetch time and never pretends the data came from a different moment.

V1 canonical cutoff: Tuesday at **8:00 PM `America/Los_Angeles`** before the normal Wednesday waiver run. This is timezone/DST-aware (03:00 UTC during PDT and 04:00 UTC during PST), never a fixed UTC hour. The scheduler runs at both possible UTC hours and a Pacific-time runtime guard accepts only the first 15 minutes after the cutoff. The API and database enforce the same local instant. If supported leagues process claims at materially different times, add another explicitly versioned shared global cutoff rather than per-league copies.

Every stored run has immutable explicit provenance and both ends of its capture interval. `exact` is accepted only for an authenticated capture whose recorded start is at or after the canonical cutoff and whose recorded finish is no later than 15 minutes after it. Early, late, manual post-hoc, fallback, and historical captures are `reconstructed`; matching a requested decision week does not upgrade provenance. Both provenance kinds must match the immutable DB-owned season/week calendar.

One reconstructed and one exact row may coexist at a canonical decision coordinate; retrieval deterministically prefers exact for that same decision week. Older-week fallback never crosses seasons and is effectively reconstructed even if the stored older capture was exact. API provenance keeps decision week distinct from the preceding playing week (`decisionWeek - 1`), so the waiver after playing Week 3 is decision Week 4.

Every displayed historical baseline is labeled:

- **Exact:** same-decision-week evidence captured prospectively in the approved cutoff window.
- **Reconstructed:** early/post-cutoff evidence from Sleeper's mutable routes, or any older-decision-week fallback.

## 6. Minimal schema

```sql
projection_snapshot_runs (
  id uuid primary key,
  source text not null,
  season integer not null,
  decision_week integer not null,
  canonical_cutoff_at timestamptz not null,
  capture_started_at timestamptz not null,
  fetched_at timestamptz not null,
  status text not null,
  content_hash text,
  row_count integer not null default 0,
  error_message text,
  provenance text not null check (provenance in ('exact', 'reconstructed')),
  created_at timestamptz not null default now(),
  unique (source, season, decision_week, canonical_cutoff_at, provenance)
)

projection_season_calendar (
  season integer primary key,
  first_decision_week_local_date date not null,
  created_at timestamptz not null default now()
)

projection_snapshot_values (
  snapshot_id uuid not null references projection_snapshot_runs(id) on delete cascade,
  projection_week integer not null,
  player_id text not null,
  pts_std numeric,
  pts_half_ppr numeric,
  pts_ppr numeric,
  primary key (snapshot_id, projection_week, player_id)
)
```

Indexes support season/decision-week lookup and player lookup within one snapshot.

## 7. API contracts

### `POST /api/projection-snapshots`

Authenticated ingestion request:

```json
{
  "season": 2026,
  "decisionWeek": 4,
  "canonicalCutoffAt": "2026-09-30T03:00:00Z",
  "provenance": "exact"
}
```

Response contains snapshot ID, status, fetched weeks, compact row count, hash, and whether the call created or reused an idempotent run.

### `GET /api/projection-snapshots?season=2026&decisionWeek=4`

Returns snapshot metadata plus compact projection rows needed to reproduce ROS values. The frontend selects the league's standard/half/PPR field.

## 8. Implementation sequence

### PR1 — Dedicated snapshot backend

- Add Supabase migration and RLS.
- Add authenticated idempotent ingestion endpoint.
- Add snapshot read endpoint.
- Add the scheduled GitHub Actions workflow and secret documentation.
- Seed only supported historical/current rows as explicit `reconstructed` evidence; begin `exact` captures prospectively inside the approved window and verify stored counts/hash.

### PR2 — Evidence and calculation foundation

- Expand Sleeper transaction types with required status/provenance fields.
- Add frozen won, legitimate-loss, invalid-failure, and contingency fixtures.
- Implement canonical classification and deduplication.
- Reconstruct pre-bid FAAB.
- Select top-three evidence.
- Implement ratio, geometric multiplier, constrained marker, style, and confidence tests.

### PR3 — Bidding profiles and predictions UI

- Add manager evidence rows and provenance.
- Show style, multiplier, confidence, and budget-constrained markers.
- Apply manager multiplier to the current baseline.
- Show both predicted willingness and current-FAAB-capped feasible bid when they differ.
- Browser-test against a real Sleeper guillotine league.

## 9. Explicit non-goals for V1

- Persisting transaction history already retained by Sleeper.
- Per-league weekly roster snapshots.
- Historical roster needs or positional weakness.
- Modeling eliminated-player pools or ownership at old cutoffs.
- FantasyCalc/FantasyPros historical snapshots.
- Automatically submitting waiver claims.
- Pretending pre-snapshot historical recommendations are exact.

## 10. Definition of done

V1 is done when a manager card can explain, from three canonical claims, why it labels that manager's style and can produce a next-bid prediction from a current player baseline; every historical baseline is traceable to exact or reconstructed projection inputs; exhausted FAAB cannot make an aggressive manager look conservative; and no per-league snapshot duplication is required.
