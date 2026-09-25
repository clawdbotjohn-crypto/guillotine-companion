alter table public.projection_snapshot_runs
  add constraint projection_snapshot_runs_canonical_cutoff_check
  check (
    extract(isodow from canonical_cutoff_at at time zone 'UTC') = 2
    and extract(hour from canonical_cutoff_at at time zone 'UTC') = 23
    and extract(minute from canonical_cutoff_at at time zone 'UTC') = 0
    and extract(second from canonical_cutoff_at at time zone 'UTC') = 0
  );
