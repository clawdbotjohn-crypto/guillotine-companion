# Projection snapshot operations

## API and provenance

`HEAD /api/projection-snapshots` is an authenticated, side-effect-free scheduler health check. It validates the bearer secret and API-side season-calendar configuration without constructing a repository, querying the database, or fetching Sleeper. Success is HTTP 204. Missing/short runtime secret fails 500; wrong auth fails 401; invalid calendar config fails 503. It is a config/auth canary, not the broader Sleeper/hash/database dry run.

`POST /api/projection-snapshots` requires `Authorization: Bearer <scheduler secret>` and an explicit `provenance` of `exact` or `reconstructed`. The bearer value is compared as SHA-256 digests with a constant-time comparison. The function validates the requested season/week/cutoff against the configured season calendar and samples `captureStartedAt`. For an exact request it first selects at most one completed run metadata row (`id`, count, hash, status, provenance); if one exists, it returns that row without fetching Sleeper, downloading child values, or ingesting. Otherwise it fetches every Sleeper regular-season weekly projection route from `decisionWeek` through Week 18, samples `fetchedAt`, compacts finite scoring fields, deterministically sorts and hashes the result, and calls one database RPC.

Sleeper's route `week` is an NFL matchup week, not a Tuesday snapshot. The route has no `as-of` argument or immutable revision contract: live requests return Sleeper's current forecast for that matchup week. The purpose of this service is to preserve one set of those live forecasts at each canonical Tuesday cutoff so the app can later reproduce the historical rest-of-season bidding baseline.

The canonical cutoff is Tuesday **8:00 PM `America/Los_Angeles`**. It is 03:00 UTC during PDT and 04:00 UTC during PST. Calendar-coordinate validation applies to both provenance kinds. `exact` additionally requires the authenticated capture to start at or after the cutoff and finish no later than 15 minutes afterward. Early, late, fallback, and post-hoc captures must be `reconstructed`.

PostgreSQL does not trust the caller's coordinate. The forced-RLS, default-deny `projection_season_calendar` table owns the authoritative Week 1 local Tuesday for each season. The SECURITY INVOKER RPC derives the expected Pacific cutoff from that date plus `(decision_week - 1) * 7 days`; a table trigger independently protects direct inserts. The RPC requires both `p_capture_started_at` and `p_fetched_at`. Exact rows require start >= cutoff, finish >= start, and finish <= cutoff + 15 minutes. Both timestamps, provenance, coordinates, hash, count, and child values are immutable.

The RPC transaction either inserts the completed run and every value or inserts nothing. The evidence key `(source, season, decision_week, canonical_cutoff_at, provenance)` permits one immutable `reconstructed` row and one immutable `exact` row at the same canonical coordinate. An identical retry of either kind reuses that kind's row; differing hash, row count, or actual child values for the same kind conflicts. This allows valid reconstructed and exact evidence to coexist when both are intentionally retained.

Current data state after the missed W4 exact window: reconstructed decision Weeks 1–3 are retained. W4 is honestly preserved as post-cutoff reconstructed snapshot `90681181-3c51-4f68-91cd-ca1637ffbd95` (15,761 rows, SHA-256 `9463b40e63b71c0088a311675d47bdc508a627ba446d703a54b5ba2ced4dc523`). No W4 exact row exists. Do not manufacture or relabel exact evidence from that or any later live response; exact evidence requires a successful prospective start/finish in the approved Tuesday window.

`GET /api/projection-snapshots?season=2026&decisionWeek=4` requires no browser credential and does not require `PROJECTION_SNAPSHOT_SCHEDULER_SECRET` during initialization. It still uses server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Selection is confined to the requested season, chooses the highest decision week at or below the request, and prefers `exact` over `reconstructed` when both exist for that week. GET returns immutable capture timestamps and stored provenance. Its provenance object separately exposes requested/snapshot decision weeks, each preceding playing week (`decisionWeek - 1`), same-week versus fallback selection, stored `captureKind`, `captureTiming` (`early-reconstruction`, `post-cutoff-reconstruction`, or `exact-at-cutoff`), and effective exactness. Same-week equality never upgrades a reconstructed run; an older fallback is effective reconstructed evidence even when its stored capture was exact. Thus playing Week 3 waiver evidence is decision Week 4, not a claim that NFL Week 4 has been played.

## W4 reliability incident evidence

- Workflow `367263137` was active on default branch `main` more than three days before W4. There were no runs from `2026-09-30T02:45Z` through `04:30Z`; the only schedule event was created at `09:03:53Z` and skipped at local Wednesday 02:03. GitHub documents schedule delay/drop under load and identifies start-of-hour as high load. Activation/default-branch timing is ruled out. At least one tick dropped and the emitted tick was delayed 5–6 hours; the old combined cron cannot identify whether its 03:00 or 04:00 tick emitted.
- Manual W4 runs reached the correct production SWA endpoint and returned 401. A deliberately invalid `{}` request using the exact Azure control-plane setting also returned 401. Source authenticates before parsing; matching auth plus `{}` must return 400 without Sleeper/DB work. Wrong endpoint/environment/header and missing/short config are ruled out. The concrete supported diagnosis is managed-function runtime/config divergence. The underlying Azure recycle/propagation mechanism is unresolved because runtime environment/App Insights introspection was unavailable.
- Confidence is high in both observed failure classes, but neither GitHub's exact dropped tick nor Azure's underlying runtime lifecycle mechanism can be narrowed further from available evidence. The hardening addresses the observed classes without claiming more.

## Required Azure Static Web Apps settings

Configure these only as backend application settings. Do not create `VITE_` variants:

- `SUPABASE_URL` — dedicated project URL for project ref `xduqpomhjdlgmtmmkfed`.
- `SUPABASE_SERVICE_ROLE_KEY` — dedicated project service-role key.
- `PROJECTION_SNAPSHOT_SCHEDULER_SECRET` — random secret of at least 32 characters; required by scheduler HEAD and POST.
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

`.github/workflows/projection-snapshot.yml` uses six independent, off-hour schedule expressions: minute 02, 07, and 12 in both the 03 UTC (PDT) and 04 UTC (PST) Wednesday hours. GitHub schedule delivery is best-effort; independent opportunities reduce dependence on one event, and off-hour timing avoids documented start-of-hour load. Workflow concurrency serializes ordinary attempts without cancellation.

After any queue delay, the checked-in Node resolver derives the current Pacific date/week/cutoff. Only Tuesday 20:00 through 20:12:59 Pacific can proceed; minute 13 and later skips before health/POST, retaining at least two minutes before the immutable API/database `finish <= cutoff + 15m` boundary. The wrong DST UTC hour, multi-hour-delayed jobs, and late manual `exact` dispatches skip. `reconstructed` manual dispatch remains available because it must record actual late provenance.

Before POST, the workflow calls authenticated HEAD. HTTP 204 passes. Output separately identifies:

- missing workflow secret;
- missing workflow endpoint variable;
- endpoint/auth mismatch (401/403/404);
- late/outside timing (safe skip, no API/upstream/database capture);
- API/config/network error;
- immutable conflict; and
- an already-completed exact retry whose upstream fetch was skipped.

No workflow loop or blind post-window retry exists. The multiple scheduled POSTs are expected: after the first exact succeeds, later requests stop at the bounded metadata lookup. A truly concurrent pair can both miss before either commits and both fetch upstream, but the unchanged transactional RPC remains authoritative: identical content is idempotent and differing content conflicts without overwrite.

Repository secrets:

- `PROJECTION_SNAPSHOT_API_URL` — full deployed URL ending in `/api/projection-snapshots`.
- `PROJECTION_SNAPSHOT_SCHEDULER_SECRET` — exactly the same value as the SWA HEAD/POST setting.

Repository variables:

- `PROJECTION_SEASON` — four-digit season, for example `2026`.
- `PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE` — Week 1 Pacific Tuesday date, for example `2026-09-08`. Decision weeks are derived from local calendar dates, not fixed UTC durations across DST.

Manual dispatch requires explicit week/cutoff/provenance and defaults to `reconstructed`. Choosing `exact` cannot bypass the workflow/API/database calendar or live-window guards. Do not dispatch until the endpoint, calendar row, and settings exist.

## W5 owner runbook and unresolved decisions

Before Tuesday 2026-10-06:

1. Review/merge/deploy the hardening only with owner approval. This review branch did not deploy anything.
2. Choose and perform an owner-controlled SWA restart/redeploy/config refresh to reconcile managed-function runtime configuration. A control-plane setting write alone did not prove runtime propagation in W4.
3. Synchronize workflow/runtime secrets without printing them. Production HEAD must return 204. Confirm endpoint, season, and first-decision-week variables.
4. Review simulated PDT/PST minute 02/07/12 success, minute-13 rejection, wrong-hour behavior, and the observed multi-hour-delay case. Decide separately whether to implement the broader no-write Sleeper canonicalization/hash/read-only DB preflight; HEAD intentionally does not do those operations.
5. Observe 20:02, 20:07, and 20:12 PDT. Shortly afterward, GET must report Decision Week 5 same-week exact; record ID/hash/count. If absent and still before cutoff +15m, the owner may invoke the already-validated direct exact fallback. At/after +15m, do not claim exact; retain only reconstructed provenance.

Open owner decisions: review/merge/deploy timing, the exact Azure runtime refresh mechanism, whether to enable App Insights/runtime environment observability, and whether to build the broader no-write preflight. GitHub scheduling remains best-effort, so the direct owner fallback remains part of operations.

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
