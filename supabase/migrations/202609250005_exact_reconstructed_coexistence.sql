-- Allow independently immutable reconstructed and exact evidence at one canonical
-- decision coordinate. Existing rows retain IDs and values; only the uniqueness
-- key and service-role ingestion conflict target change.

alter table public.projection_snapshot_runs
  drop constraint projection_snapshot_runs_cutoff_unique,
  add constraint projection_snapshot_runs_evidence_unique
    unique (source, season, decision_week, canonical_cutoff_at, provenance);

drop index public.projection_snapshot_runs_lookup_idx;
create index projection_snapshot_runs_lookup_idx
  on public.projection_snapshot_runs (season, decision_week desc, provenance asc, canonical_cutoff_at desc, id asc)
  where status = 'completed';

comment on constraint projection_snapshot_runs_evidence_unique on public.projection_snapshot_runs is
  'One immutable row per capture kind at a canonical coordinate; exact and reconstructed evidence may coexist.';

revoke all on function public.ingest_projection_snapshot(text, integer, integer, timestamptz, timestamptz, timestamptz, text, text, text, jsonb)
  from public, anon, authenticated, service_role;
drop function public.ingest_projection_snapshot(text, integer, integer, timestamptz, timestamptz, timestamptz, text, text, text, jsonb);

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
  on conflict on constraint projection_snapshot_runs_evidence_unique do nothing
  returning id into v_snapshot_id;

  if v_snapshot_id is null then
    select r.id into strict v_snapshot_id
    from public.projection_snapshot_runs r
    where r.source = p_source
      and r.season = p_season
      and r.decision_week = p_decision_week
      and r.canonical_cutoff_at = p_canonical_cutoff_at
      and r.provenance = p_provenance;

    if exists (
      select 1 from public.projection_snapshot_runs r
      where r.id = v_snapshot_id
        and (
          r.content_hash is distinct from p_content_hash
          or r.row_count is distinct from v_count
          or r.provenance is distinct from p_provenance
          or exists (
            (select v.projection_week, v.player_id, v.pts_std, v.pts_half_ppr, v.pts_ppr
             from public.projection_snapshot_values v
             where v.snapshot_id = v_snapshot_id)
            except
            (select x.projection_week, x.player_id, x.pts_std, x.pts_half_ppr, x.pts_ppr
             from jsonb_to_recordset(p_values) as x(
               projection_week integer, player_id text, pts_std numeric,
               pts_half_ppr numeric, pts_ppr numeric
             ))
          )
          or exists (
            (select x.projection_week, x.player_id, x.pts_std, x.pts_half_ppr, x.pts_ppr
             from jsonb_to_recordset(p_values) as x(
               projection_week integer, player_id text, pts_std numeric,
               pts_half_ppr numeric, pts_ppr numeric
             ))
            except
            (select v.projection_week, v.player_id, v.pts_std, v.pts_half_ppr, v.pts_ppr
             from public.projection_snapshot_values v
             where v.snapshot_id = v_snapshot_id)
          )
        )
    ) then
      raise exception 'snapshot conflict: evidence key already has different immutable content'
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
