# Projection snapshot operations

## API and provenance

`POST /api/projection-snapshots` requires `Authorization: Bearer <scheduler secret>` and an explicit `provenance` of `exact` or `reconstructed`. The bearer value is compared as SHA-256 digests with a constant-time comparison. The function validates the requested season/week/cutoff against the configured season calendar, samples `captureStartedAt`, fetches every Sleeper regular-season weekly projection route from `decisionWeek` through Week 18, samples `fetchedAt`, compacts finite scoring fields, deterministically sorts and hashes the result, and calls one database RPC.

The canonical cutoff is Tuesday **8:00 PM `America/Los_Angeles`**. It is 03:00 UTC during PDT and 04:00 UTC during PST. Calendar-coordinate validation applies to both provenance kinds. `exact` additionally requires the authenticated capture to start at or after the cutoff and finish no later than 15 minutes afterward. Early, late, fallback, and post-hoc captures must be `reconstructed`.

PostgreSQL does not trust the caller's coordinate. The forced-RLS, default-deny `projection_season_calendar` table owns the authoritative Week 1 local Tuesday for each season. The SECURITY INVOKER RPC derives the expected Pacific cutoff from that date plus `(decision_week - 1) * 7 days`; a table trigger independently protects direct inserts. The RPC requires both `p_capture_started_at` and `p_fetched_at`. Exact rows require start >= cutoff, finish >= start, and finish <= cutoff + 15 minutes. Both timestamps, provenance, coordinates, hash, count, and child values are immutable.

The RPC transaction either inserts the completed run and every value or inserts nothing. The evidence key `(source, season, decision_week, canonical_cutoff_at, provenance)` permits one immutable `reconstructed` row and one immutable `exact` row at the same canonical coordinate. An identical retry of either kind reuses that kind's row; differing hash, row count, or actual child values for the same kind conflicts. This preserves an early reconstruction without blocking the later exact-at-cutoff capture.

`GET /api/projection-snapshots?season=2026&decisionWeek=4` requires no browser credential and does not require `PROJECTION_SNAPSHOT_SCHEDULER_SECRET` during initialization. It still uses server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Selection is confined to the requested season, chooses the highest decision week at or below the request, and prefers `exact` over `reconstructed` when both exist for that week. GET returns immutable capture timestamps and stored provenance. Its provenance object separately exposes requested/snapshot decision weeks, each preceding playing week (`decisionWeek - 1`), same-week versus fallback selection, stored `captureKind`, `captureTiming` (`early-reconstruction`, `post-cutoff-reconstruction`, or `exact-at-cutoff`), and effective exactness. Same-week equality never upgrades a reconstructed run; an older fallback is effective reconstructed evidence even when its stored capture was exact. Thus playing Week 3 waiver evidence is decision Week 4, not a claim that NFL Week 4 has been played.

## Required Azure Static Web Apps settings

Configure these only as backend application settings. Do not create `VITE_` variants:

- `SUPABASE_URL` — dedicated project URL for project ref `xduqpomhjdlgmtmmkfed`.
- `SUPABASE_SERVICE_ROLE_KEY` — dedicated project service-role key.
- `PROJECTION_SNAPSHOT_SCHEDULER_SECRET` — random secret of at least 32 characters; required only by POST.
- `PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE` — API-side copy of the authoritative Pacific Tuesday date for Week 1 (for 2026: `2026-09-08`). Every POST provenance is checked against it; GET does not require it. PostgreSQL independently checks the DB-owned calendar row.

No app setting is changed by this PR.

## New-season owner process

Before accepting any capture for a new season, the owner must:

1. Confirm the authoritative local Tuesday for decision Week 1.
2. Add that season/date to `projection_season_calendar` through a reviewed database migration. Do not update a prior row: update/delete are blocked, and the service role has only SELECT access to this table.
3. Apply that migration only to the verified dedicated project ref.
4. Set the backend `PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE` and repository variable of the same name to exactly the same `YYYY-MM-DD` value.
5. Run PDT/PST calendar tests and a reconstructed wrong-cutoff rejection probe before activating scheduling.

A missing or mismatched season is fail-closed in both the API and database.

## Scheduled workflow setup

`.github/workflows/projection-snapshot.yml` runs at 03:00 and 04:00 UTC Wednesdays. A DST-aware runtime guard invokes ingestion only when local Pacific time is Tuesday 8:00–8:15 PM, so one run is accepted in PDT or PST and a delayed/duplicate cron is skipped. Scheduled captures request `exact`; the API and database reject an early start or late finish.

Repository secrets:

- `PROJECTION_SNAPSHOT_API_URL` — full deployed URL ending in `/api/projection-snapshots`.
- `PROJECTION_SNAPSHOT_SCHEDULER_SECRET` — exactly the same value as the SWA POST setting.

Repository variables:

- `PROJECTION_SEASON` — four-digit season, for example `2026`.
- `PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE` — Week 1 Pacific Tuesday date, for example `2026-09-08`. Decision weeks are derived from local calendar dates, not fixed UTC durations across DST.

Manual dispatch requires explicit week/cutoff/provenance and defaults to `reconstructed`. Choosing `exact` cannot bypass the API/database calendar or live-window guards. Do not dispatch until the endpoint, calendar row, and settings exist.

## Reviewed reconstructed seed path

Use only the linked dedicated project and the transactional RPC path. Historical/current replay is always explicit `reconstructed`:

```bash
set -a
. ~/.openclaw/credentials/guillotine_supabase.env
set +a
test "$(cat supabase/.temp/project-ref)" = xduqpomhjdlgmtmmkfed
node api/scripts/seed-projection-snapshot.js \
  --season 2026 \
  --decision-week 3 \
  --canonical-cutoff 2026-09-23T03:00:00Z \
  --provenance reconstructed
```

The seed tool records the actual start and finish and validates the calendar for both provenance kinds. An identical retry returns the same ID/hash/count with `created: false`. If Sleeper's mutable source changed at the same coordinate, the retry fails with an honest conflict; it does not overwrite evidence. Historical data is available only as Sleeper's current mutable projection routes and therefore must never be relabeled exact.
