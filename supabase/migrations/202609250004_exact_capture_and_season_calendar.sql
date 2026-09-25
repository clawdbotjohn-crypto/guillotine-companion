-- Persist both ends of an exact capture and make season/week/cutoff coordinates
-- database-owned. Existing rows are reconstructed evidence, so their only
-- honest backfill for an unavailable historical start is fetched_at itself.

create table public.projection_season_calendar (
  season integer primary key,
  first_decision_week_local_date date not null,
  created_at timestamptz not null default now(),
  constraint projection_season_calendar_season_check
    check (season between 2000 and 2100),
  constraint projection_season_calendar_year_check
    check (extract(year from first_decision_week_local_date)::integer = season),
  constraint projection_season_calendar_tuesday_check
    check (extract(isodow from first_decision_week_local_date) = 2)
);

comment on table public.projection_season_calendar is
  'Authoritative immutable mapping from season to the Pacific local date of decision Week 1. Add future seasons through a reviewed migration.';

alter table public.projection_season_calendar enable row level security;
alter table public.projection_season_calendar force row level security;
revoke all on table public.projection_season_calendar from public, anon, authenticated;
grant select on table public.projection_season_calendar to service_role;

create trigger projection_season_calendar_immutable
before update or delete on public.projection_season_calendar
for each row execute function public.reject_projection_snapshot_mutation();

insert into public.projection_season_calendar (season, first_decision_week_local_date)
values (2026, date '2026-09-08');

do $$
begin
  if exists (
    select 1
    from public.projection_snapshot_runs r
    left join public.projection_season_calendar c on c.season = r.season
    where c.season is null
      or r.canonical_cutoff_at is distinct from (
        (c.first_decision_week_local_date + ((r.decision_week - 1) * 7)) + time '20:00'
      ) at time zone 'America/Los_Angeles'
  ) then
    raise exception 'existing projection snapshot has an unconfigured or invalid season/week cutoff';
  end if;
end;
$$;

alter table public.projection_snapshot_runs
  add column capture_started_at timestamptz;

do $$
begin
  if exists (
    select 1
    from public.projection_snapshot_runs
    where provenance <> 'reconstructed'
  ) then
    raise exception 'cannot backfill capture_started_at for pre-migration exact evidence';
  end if;

  alter table public.projection_snapshot_runs disable trigger projection_snapshot_runs_immutable;
  update public.projection_snapshot_runs
  set capture_started_at = fetched_at
  where provenance = 'reconstructed';
  alter table public.projection_snapshot_runs enable trigger projection_snapshot_runs_immutable;
end;
$$;

alter table public.projection_snapshot_runs
  alter column capture_started_at set not null,
  drop constraint projection_snapshot_runs_exact_capture_window_check,
  add constraint projection_snapshot_runs_capture_order_check
    check (fetched_at >= capture_started_at),
  add constraint projection_snapshot_runs_exact_capture_window_check
    check (
      provenance = 'reconstructed'
      or (
        capture_started_at >= canonical_cutoff_at
        and fetched_at >= capture_started_at
        and fetched_at <= canonical_cutoff_at + interval '15 minutes'
      )
    );

comment on column public.projection_snapshot_runs.capture_started_at is
  'Immutable instant immediately before upstream projection fetching begins. Pre-004 reconstructed rows use fetched_at because their historical start was not recorded.';

create function public.validate_projection_snapshot_calendar_coordinate()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_expected_cutoff timestamptz;
begin
  select (
    (c.first_decision_week_local_date + ((new.decision_week - 1) * 7)) + time '20:00'
  ) at time zone 'America/Los_Angeles'
  into v_expected_cutoff
  from public.projection_season_calendar c
  where c.season = new.season;

  if v_expected_cutoff is null then
    raise exception 'season calendar is not configured for season %', new.season
      using errcode = '23514';
  end if;

  if new.canonical_cutoff_at is distinct from v_expected_cutoff then
    raise exception 'canonical cutoff does not match season % decision week % calendar',
      new.season, new.decision_week
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger projection_snapshot_runs_calendar_coordinate
before insert on public.projection_snapshot_runs
for each row execute function public.validate_projection_snapshot_calendar_coordinate();

revoke all on function public.validate_projection_snapshot_calendar_coordinate()
  from public, anon, authenticated, service_role;

revoke all on function public.ingest_projection_snapshot(text, integer, integer, timestamptz, timestamptz, text, text, text, jsonb)
  from public, anon, authenticated, service_role;
drop function public.ingest_projection_snapshot(text, integer, integer, timestamptz, timestamptz, text, text, text, jsonb);

create function public.ingest_projection_snapshot(
  p_source text,
  p_season integer,
  p_decision_week integer,
  p_canonical_cutoff_at timestamptz,
  p_capture_started_at timestamptz,
  p_fetched_at timestamptz,
  p_endpoint_template text,
  p_content_hash text,
  p_provenance text,
  p_values jsonb
)
returns table (
  snapshot_id uuid,
  created boolean,
  row_count integer,
  status text,
  stored_content_hash text,
  stored_provenance text
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_snapshot_id uuid;
  v_created boolean := false;
  v_count integer;
  v_expected_cutoff timestamptz;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;
  if p_provenance not in ('exact', 'reconstructed') then
    raise exception 'provenance must be exact or reconstructed';
  end if;

  select (
    (c.first_decision_week_local_date + ((p_decision_week - 1) * 7)) + time '20:00'
  ) at time zone 'America/Los_Angeles'
  into v_expected_cutoff
  from public.projection_season_calendar c
  where c.season = p_season;

  if v_expected_cutoff is null then
    raise exception 'season calendar is not configured for season %', p_season
      using errcode = '23514';
  end if;
  if p_canonical_cutoff_at is distinct from v_expected_cutoff then
    raise exception 'canonical cutoff does not match season % decision week % calendar',
      p_season, p_decision_week
      using errcode = '23514';
  end if;
  if p_fetched_at < p_capture_started_at then
    raise exception 'capture finish cannot precede capture start'
      using errcode = '23514';
  end if;
  if p_provenance = 'exact' and (
    p_capture_started_at < v_expected_cutoff
    or p_fetched_at > v_expected_cutoff + interval '15 minutes'
  ) then
    raise exception 'exact capture must start at or after cutoff and finish within 15 minutes'
      using errcode = '23514';
  end if;

  if jsonb_typeof(p_values) <> 'array' then
    raise exception 'p_values must be a JSON array';
  end if;

  v_count := jsonb_array_length(p_values);
  if v_count < 1 or v_count > 100000 then
    raise exception 'p_values row count is out of range';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_values) item
    where jsonb_typeof(item) <> 'object'
      or item - array['projection_week', 'player_id', 'pts_std', 'pts_half_ppr', 'pts_ppr']::text[] <> '{}'::jsonb
      or not (item ? 'projection_week')
      or not (item ? 'player_id')
  ) then
    raise exception 'p_values contains an invalid row shape';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_values) as x(
      projection_week integer, player_id text, pts_std numeric,
      pts_half_ppr numeric, pts_ppr numeric
    )
    where x.projection_week < p_decision_week or x.projection_week > 18
  ) then
    raise exception 'projection week must be between decision week and 18';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_values) as x(projection_week integer, player_id text)
    group by x.projection_week, x.player_id
    having count(*) > 1
  ) then
    raise exception 'p_values contains duplicate player-week rows';
  end if;

  insert into public.projection_snapshot_runs (
    source, season, decision_week, canonical_cutoff_at, capture_started_at,
    fetched_at, endpoint_template, status, content_hash, row_count, provenance
  ) values (
    p_source, p_season, p_decision_week, p_canonical_cutoff_at, p_capture_started_at,
    p_fetched_at, p_endpoint_template, 'completed', p_content_hash, v_count, p_provenance
  )
  on conflict on constraint projection_snapshot_runs_cutoff_unique do nothing
  returning id into v_snapshot_id;

  if v_snapshot_id is null then
    select r.id into strict v_snapshot_id
    from public.projection_snapshot_runs r
    where r.source = p_source
      and r.season = p_season
      and r.decision_week = p_decision_week
      and r.canonical_cutoff_at = p_canonical_cutoff_at;

    if exists (
      select 1 from public.projection_snapshot_runs r
      where r.id = v_snapshot_id
        and (r.content_hash is distinct from p_content_hash
          or r.row_count is distinct from v_count
          or r.provenance is distinct from p_provenance)
    ) then
      raise exception 'snapshot conflict: canonical coordinate already has different immutable content or provenance'
        using errcode = '23505';
    end if;
  else
    v_created := true;
    insert into public.projection_snapshot_values (
      snapshot_id, projection_week, player_id, pts_std, pts_half_ppr, pts_ppr
    )
    select
      v_snapshot_id, x.projection_week, x.player_id,
      x.pts_std, x.pts_half_ppr, x.pts_ppr
    from jsonb_to_recordset(p_values) as x(
      projection_week integer,
      player_id text,
      pts_std numeric,
      pts_half_ppr numeric,
      pts_ppr numeric
    );

    if (select count(*) from public.projection_snapshot_values v where v.snapshot_id = v_snapshot_id) <> v_count then
      raise exception 'inserted row count does not match p_values';
    end if;
  end if;

  return query
  select r.id, v_created, r.row_count, r.status, r.content_hash, r.provenance
  from public.projection_snapshot_runs r
  where r.id = v_snapshot_id;
end;
$$;

revoke all on function public.ingest_projection_snapshot(text, integer, integer, timestamptz, timestamptz, timestamptz, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.ingest_projection_snapshot(text, integer, integer, timestamptz, timestamptz, timestamptz, text, text, text, jsonb)
  to service_role;
