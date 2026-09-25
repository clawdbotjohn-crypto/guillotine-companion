-- Remove only the explicitly audited, too-early reconstructed decision-Week-4
-- snapshot. This remains an additive migration: clean replays have no seeded run
-- and safely no-op, while any present target must match every audited metadata
-- field, child count, and independent ordered child hash before deletion.

alter table public.projection_snapshot_values
  drop constraint projection_snapshot_values_snapshot_id_fkey,
  add constraint projection_snapshot_values_snapshot_id_fkey
    foreign key (snapshot_id)
    references public.projection_snapshot_runs(id)
    on delete cascade;

comment on constraint projection_snapshot_values_snapshot_id_fkey
  on public.projection_snapshot_values is
  'Snapshot values are removed only with their parent run; snapshot immutability otherwise rejects direct deletion.';

do $$
declare
  v_actual_child_count bigint;
  v_actual_child_audit_hash text;
  v_deleted_count integer;
begin
  if exists (
    select 1
    from public.projection_snapshot_runs
    where id = '7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8'::uuid
  ) then
    if not exists (
      select 1
      from public.projection_snapshot_runs
      where id = '7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8'::uuid
        and source = 'sleeper'
        and season = 2026
        and decision_week = 4
        and canonical_cutoff_at = '2026-09-30T03:00:00Z'::timestamptz
        and capture_started_at = '2026-09-25T05:34:01.333Z'::timestamptz
        and fetched_at = '2026-09-25T05:34:01.333Z'::timestamptz
        and endpoint_template = 'https://api.sleeper.app/v1/projections/nfl/regular/{season}/{week}'
        and status = 'completed'
        and content_hash = 'ed711697f3b1e00a5fd81b09355b58ba566cccbd88a54d4cf4eb762226b3759d'
        and row_count = 15821
        and error_message is null
        and provenance = 'reconstructed'
        and created_at = '2026-09-25T05:34:02.498385Z'::timestamptz
    ) then
      raise exception 'known early reconstructed Week 4 run does not match audited deletion preconditions';
    end if;

    select
      count(*),
      encode(digest(coalesce(string_agg(
        v.projection_week::text || '|' || v.player_id || '|' ||
        coalesce(v.pts_std::text, '<NULL>') || '|' ||
        coalesce(v.pts_half_ppr::text, '<NULL>') || '|' ||
        coalesce(v.pts_ppr::text, '<NULL>'), E'\n'
        order by v.projection_week, v.player_id
      ), ''), 'sha256'), 'hex')
    into v_actual_child_count, v_actual_child_audit_hash
    from public.projection_snapshot_values v
    where v.snapshot_id = '7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8'::uuid;

    if v_actual_child_count <> 15821 then
      raise exception 'known early reconstructed Week 4 run child count mismatch: expected 15821, found %',
        v_actual_child_count;
    end if;

    if v_actual_child_audit_hash <> 'e948c6abc6248df5aac3296c585e83b6fd77c48a13d72356529cbad469cb2ec6' then
      raise exception 'known early reconstructed Week 4 run child audit hash mismatch';
    end if;

    -- DDL and DML are in the migration transaction. Any failure rolls back the
    -- trigger state and FK change. The delete predicate is the exact audited ID;
    -- the validated FK cascade removes only that run's children.
    alter table public.projection_snapshot_values
      disable trigger projection_snapshot_values_immutable;
    alter table public.projection_snapshot_runs
      disable trigger projection_snapshot_runs_immutable;

    delete from public.projection_snapshot_runs
    where id = '7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8'::uuid;
    get diagnostics v_deleted_count = row_count;

    alter table public.projection_snapshot_runs
      enable trigger projection_snapshot_runs_immutable;
    alter table public.projection_snapshot_values
      enable trigger projection_snapshot_values_immutable;

    if v_deleted_count <> 1 then
      raise exception 'known early reconstructed Week 4 run deletion affected % parent rows',
        v_deleted_count;
    end if;

    if exists (
      select 1 from public.projection_snapshot_runs
      where id = '7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8'::uuid
    ) or exists (
      select 1 from public.projection_snapshot_values
      where snapshot_id = '7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8'::uuid
    ) then
      raise exception 'known early reconstructed Week 4 run or children remain after deletion';
    end if;
  end if;
end;
$$;
