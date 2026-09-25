create extension if not exists pgcrypto;

create table public.projection_snapshot_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  season integer not null,
  decision_week integer not null,
  canonical_cutoff_at timestamptz not null,
  fetched_at timestamptz not null,
  endpoint_template text not null,
  status text not null default 'completed',
  content_hash text not null,
  row_count integer not null,
  error_message text,
  created_at timestamptz not null default now(),
  constraint projection_snapshot_runs_source_check
    check (source = 'sleeper'),
  constraint projection_snapshot_runs_season_check
    check (season between 2000 and 2100),
  constraint projection_snapshot_runs_decision_week_check
    check (decision_week between 1 and 18),
  constraint projection_snapshot_runs_endpoint_check
    check (endpoint_template = 'https://api.sleeper.app/v1/projections/nfl/regular/{season}/{week}'),
  constraint projection_snapshot_runs_status_check
    check (status in ('completed', 'failed')),
  constraint projection_snapshot_runs_hash_check
    check (content_hash ~ '^[0-9a-f]{64}$'),
  constraint projection_snapshot_runs_row_count_check
    check (row_count between 0 and 100000),
  constraint projection_snapshot_runs_status_fields_check
    check (
      (status = 'completed' and error_message is null and row_count > 0)
      or (status = 'failed' and error_message is not null and row_count = 0)
    ),
  constraint projection_snapshot_runs_cutoff_unique
    unique (source, season, decision_week, canonical_cutoff_at)
);

create table public.projection_snapshot_values (
  snapshot_id uuid not null references public.projection_snapshot_runs(id) on delete restrict,
  projection_week integer not null,
  player_id text not null,
  pts_std numeric,
  pts_half_ppr numeric,
  pts_ppr numeric,
  primary key (snapshot_id, projection_week, player_id),
  constraint projection_snapshot_values_week_check
    check (projection_week between 1 and 18),
  constraint projection_snapshot_values_player_id_check
    check (player_id = btrim(player_id) and length(player_id) between 1 and 64),
  constraint projection_snapshot_values_any_points_check
    check (num_nonnulls(pts_std, pts_half_ppr, pts_ppr) >= 1),
  constraint projection_snapshot_values_std_check
    check (pts_std is null or (pts_std <> 'NaN'::numeric and pts_std between -1000 and 1000)),
  constraint projection_snapshot_values_half_check
    check (pts_half_ppr is null or (pts_half_ppr <> 'NaN'::numeric and pts_half_ppr between -1000 and 1000)),
  constraint projection_snapshot_values_ppr_check
    check (pts_ppr is null or (pts_ppr <> 'NaN'::numeric and pts_ppr between -1000 and 1000))
);

create index projection_snapshot_runs_lookup_idx
  on public.projection_snapshot_runs (season, decision_week desc, canonical_cutoff_at desc)
  where status = 'completed';
create index projection_snapshot_values_player_idx
  on public.projection_snapshot_values (snapshot_id, player_id, projection_week);

alter table public.projection_snapshot_runs enable row level security;
alter table public.projection_snapshot_runs force row level security;
alter table public.projection_snapshot_values enable row level security;
alter table public.projection_snapshot_values force row level security;

revoke all on table public.projection_snapshot_runs from public, anon, authenticated;
revoke all on table public.projection_snapshot_values from public, anon, authenticated;
grant select, insert on table public.projection_snapshot_runs to service_role;
grant select, insert on table public.projection_snapshot_values to service_role;

create or replace function public.reject_projection_snapshot_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'projection snapshots are immutable';
end;
$$;

create trigger projection_snapshot_runs_immutable
before update or delete on public.projection_snapshot_runs
for each row execute function public.reject_projection_snapshot_mutation();

create trigger projection_snapshot_values_immutable
before update or delete on public.projection_snapshot_values
for each row execute function public.reject_projection_snapshot_mutation();

create or replace function public.ingest_projection_snapshot(
  p_source text,
  p_season integer,
  p_decision_week integer,
  p_canonical_cutoff_at timestamptz,
  p_fetched_at timestamptz,
  p_endpoint_template text,
  p_content_hash text,
  p_values jsonb
)
returns table (snapshot_id uuid, created boolean, row_count integer, status text, stored_content_hash text)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_snapshot_id uuid;
  v_created boolean := false;
  v_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
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
    source, season, decision_week, canonical_cutoff_at, fetched_at,
    endpoint_template, status, content_hash, row_count
  ) values (
    p_source, p_season, p_decision_week, p_canonical_cutoff_at, p_fetched_at,
    p_endpoint_template, 'completed', p_content_hash, v_count
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
  select r.id, v_created, r.row_count, r.status, r.content_hash
  from public.projection_snapshot_runs r
  where r.id = v_snapshot_id;
end;
$$;

revoke all on function public.ingest_projection_snapshot(text, integer, integer, timestamptz, timestamptz, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.ingest_projection_snapshot(text, integer, integer, timestamptz, timestamptz, text, text, jsonb) to service_role;
