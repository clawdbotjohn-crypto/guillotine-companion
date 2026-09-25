-- Restore the approved DST-aware Tuesday 8 PM Pacific cutoff and make capture
-- provenance immutable, explicit evidence. This migration audibly repairs the
-- single pre-existing early Week 4 seed without deleting it or changing its
-- fetched_at, content_hash, row_count, or child values.

alter table public.projection_snapshot_runs
  drop constraint projection_snapshot_runs_canonical_cutoff_check;

alter table public.projection_snapshot_runs
  add column provenance text not null default 'reconstructed';

alter table public.projection_snapshot_runs
  alter column provenance drop default,
  add constraint projection_snapshot_runs_provenance_check
    check (provenance in ('exact', 'reconstructed')),
  add constraint projection_snapshot_runs_exact_capture_window_check
    check (
      provenance = 'reconstructed'
      or (
        fetched_at >= canonical_cutoff_at
        and fetched_at <= canonical_cutoff_at + interval '15 minutes'
      )
    );

-- Guard the known correction so this migration cannot silently rewrite an
-- unexpected database. Only the bad canonical coordinate changes.
do $$
begin
  if not exists (
    select 1
    from public.projection_snapshot_runs
    where id = '7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8'::uuid
      and season = 2026
      and decision_week = 4
      and canonical_cutoff_at = '2026-09-29T23:00:00Z'::timestamptz
      and fetched_at = '2026-09-25T05:34:01.333Z'::timestamptz
      and row_count = 15821
      and content_hash = 'ed711697f3b1e00a5fd81b09355b58ba566cccbd88a54d4cf4eb762226b3759d'
      and provenance = 'reconstructed'
  ) then
    raise exception 'known Week 4 seed does not match audited correction preconditions';
  end if;
end;
$$;

alter table public.projection_snapshot_runs disable trigger projection_snapshot_runs_immutable;
update public.projection_snapshot_runs
set canonical_cutoff_at = '2026-09-30T03:00:00Z'::timestamptz
where id = '7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8'::uuid;
alter table public.projection_snapshot_runs enable trigger projection_snapshot_runs_immutable;

alter table public.projection_snapshot_runs
  add constraint projection_snapshot_runs_canonical_cutoff_check
  check (
    extract(isodow from canonical_cutoff_at at time zone 'America/Los_Angeles') = 2
    and extract(hour from canonical_cutoff_at at time zone 'America/Los_Angeles') = 20
    and extract(minute from canonical_cutoff_at at time zone 'America/Los_Angeles') = 0
    and extract(second from canonical_cutoff_at at time zone 'America/Los_Angeles') = 0
  );

comment on column public.projection_snapshot_runs.provenance is
  'Immutable capture provenance: exact only inside the approved cutoff window; reconstructed for early, late, fallback, or post-hoc evidence.';

revoke all on function public.ingest_projection_snapshot(text, integer, integer, timestamptz, timestamptz, text, text, jsonb)
  from public, anon, authenticated, service_role;
drop function public.ingest_projection_snapshot(text, integer, integer, timestamptz, timestamptz, text, text, jsonb);

create function public.ingest_projection_snapshot(
  p_source text,
  p_season integer,
  p_decision_week integer,
  p_canonical_cutoff_at timestamptz,
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
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;
  if p_provenance not in ('exact', 'reconstructed') then
    raise exception 'provenance must be exact or reconstructed';
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
    endpoint_template, status, content_hash, row_count, provenance
  ) values (
    p_source, p_season, p_decision_week, p_canonical_cutoff_at, p_fetched_at,
    p_endpoint_template, 'completed', p_content_hash, v_count, p_provenance
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

revoke all on function public.ingest_projection_snapshot(text, integer, integer, timestamptz, timestamptz, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.ingest_projection_snapshot(text, integer, integer, timestamptz, timestamptz, text, text, text, jsonb)
  to service_role;
