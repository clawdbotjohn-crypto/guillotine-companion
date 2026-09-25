# Projection snapshot operations

## API and provenance

`POST /api/projection-snapshots` requires `Authorization: Bearer <scheduler secret>` and an explicit `provenance` of `exact` or `reconstructed`. The bearer value is compared as SHA-256 digests with a constant-time comparison. The function fetches every Sleeper regular-season weekly projection route from `decisionWeek` through Week 18, compacts finite scoring fields, deterministically sorts and hashes the result, and calls one database RPC.

The canonical cutoff is Tuesday **8:00 PM `America/Los_Angeles`**. It is 03:00 UTC during PDT and 04:00 UTC during PST. `exact` is accepted only when the authenticated request starts and finishes from the cutoff through 15 minutes afterward. Early, late, fallback, and post-hoc captures must be `reconstructed`; the database independently enforces the cutoff, provenance, and exact-capture window.

The RPC transaction either inserts the completed run and every value or inserts nothing. The uniqueness key `(source, season, decision_week, canonical_cutoff_at)` makes an identical retry reuse the first run. A retry with different content hash, row count, or provenance receives a conflict instead of silently reusing different evidence.

`GET /api/projection-snapshots?season=2026&decisionWeek=4` requires no browser credential and does not require `PROJECTION_SNAPSHOT_SCHEDULER_SECRET` during initialization. It still uses server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. GET returns stored immutable `snapshot.provenance`; same-week equality never upgrades a reconstructed run. An older fallback is exposed as effective reconstructed evidence even if its original capture was exact.

## Required Azure Static Web Apps settings

Configure these only as backend application settings. Do not create `VITE_` variants:

- `SUPABASE_URL` — dedicated project URL for project ref `xduqpomhjdlgmtmmkfed`.
- `SUPABASE_SERVICE_ROLE_KEY` — dedicated project service-role key.
- `PROJECTION_SNAPSHOT_SCHEDULER_SECRET` — random secret of at least 32 characters; required only by POST.
- `PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE` — authoritative Pacific Tuesday date for Week 1 (for 2026: `2026-09-08`). POST uses it to prevent an in-window caller from attaching `exact` to the wrong season/week coordinate; GET does not require it.

No app setting is changed by this PR.

## Scheduled workflow setup

`.github/workflows/projection-snapshot.yml` runs at 03:00 and 04:00 UTC Wednesdays. A DST-aware runtime guard invokes ingestion only when local Pacific time is Tuesday 8:00–8:15 PM, so one run is accepted in PDT or PST and a delayed/duplicate cron is skipped. Scheduled captures request `exact`; the API and database reject an early or late request.

Repository secrets:

- `PROJECTION_SNAPSHOT_API_URL` — full deployed URL ending in `/api/projection-snapshots`.
- `PROJECTION_SNAPSHOT_SCHEDULER_SECRET` — exactly the same value as the SWA POST setting.

Repository variables:

- `PROJECTION_SEASON` — four-digit season, for example `2026`.
- `PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE` — Week 1 Pacific Tuesday date, for example `2026-09-08`. Decision weeks are derived from local calendar dates, not fixed UTC durations across DST.

Manual dispatch requires explicit week/cutoff/provenance and defaults to `reconstructed`. Choosing `exact` cannot bypass the API/database live-window guard. Do not dispatch until the endpoint and settings exist.

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

An identical immediate retry returns the same ID/hash/count with `created: false`. If Sleeper's mutable source changed at the same coordinate, the retry fails with an honest conflict; it does not overwrite evidence. Historical data is available only as Sleeper's current mutable projection routes and therefore must never be relabeled exact.
