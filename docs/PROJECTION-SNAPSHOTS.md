# Projection snapshot operations

## API

`POST /api/projection-snapshots` requires `Authorization: Bearer <scheduler secret>` and the JSON contract documented in `BIDDING-PROFILES-PLAN.md`. The bearer value is compared as SHA-256 digests with a constant-time comparison. The function fetches every Sleeper regular-season weekly projection route from `decisionWeek` through Week 18, compacts finite `pts_std`, `pts_half_ppr`, and `pts_ppr` values, deterministically sorts and hashes the result, and calls one database RPC. The RPC transaction either inserts the completed run and every value or inserts nothing. The database uniqueness key `(source, season, decision_week, canonical_cutoff_at)` makes retries and concurrent calls reuse the first committed run.

`GET /api/projection-snapshots?season=2026&decisionWeek=4` requires no browser credential. It selects the latest completed run whose decision week is at or before the requested week, ordered by decision week and canonical cutoff descending. A same-week match is returned with `provenance.kind = "exact"`; an older fallback is explicitly returned as `"reconstructed"`. Metadata includes source, endpoint identity, actual fetch time, canonical cutoff, row count, and SHA-256 hash.

## Required Azure Static Web Apps settings

Configure these as backend application settings in the Guillotine Companion SWA. Do not create `VITE_` variants and do not put them in frontend files:

- `SUPABASE_URL` — dedicated project URL for project ref `xduqpomhjdlgmtmmkfed`.
- `SUPABASE_SERVICE_ROLE_KEY` — dedicated project service-role key.
- `PROJECTION_SNAPSHOT_SCHEDULER_SECRET` — random secret of at least 32 characters.

No app setting is changed by this PR.

## Scheduled workflow setup

`.github/workflows/projection-snapshot.yml` runs Tuesdays at 23:00 UTC and supports manual dispatch. It only invokes ingestion; it does not build or deploy.

Repository secrets:

- `PROJECTION_SNAPSHOT_API_URL` — full deployed URL ending in `/api/projection-snapshots`.
- `PROJECTION_SNAPSHOT_SCHEDULER_SECRET` — exactly the same value as the SWA setting.

Repository variables:

- `PROJECTION_SEASON` — four-digit season, for example `2026`.
- `PROJECTION_FIRST_DECISION_WEEK_CUTOFF_AT` — Week 1 Tuesday cutoff in UTC, for example `2026-09-08T23:00:00Z`. Scheduled runs derive subsequent decision weeks in seven-day increments and skip dates outside Weeks 1–18.

Manual dispatch may override season, decision week, and cutoff. Do not dispatch until the endpoint and all settings exist.

## Local seed / idempotency verification

The seed command uses only local runtime environment variables and the same transactional repository path as the function. It prints IDs/counts/hashes, never credentials:

```bash
set -a
. ~/.openclaw/credentials/guillotine_supabase.env
set +a
node api/scripts/seed-projection-snapshot.js \
  --season 2026 \
  --decision-week 4 \
  --canonical-cutoff 2026-09-29T23:00:00Z
```

Run the identical command a second time. The same snapshot ID/hash/row count with `created: false` proves idempotent reuse. `fetched_at` records when the local seed actually fetched data; it does not pretend the fetch occurred at the canonical cutoff.
