function requireConfig(env) {
  const url = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) throw new Error('SUPABASE_URL is not configured');
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return { url: url.replace(/\/$/, ''), serviceRoleKey };
}

function createSupabaseProjectionRepository({ env = process.env, fetchImpl = fetch } = {}) {
  const { url, serviceRoleKey } = requireConfig(env);
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  async function request(path, options = {}) {
    const response = await fetchImpl(`${url}/rest/v1/${path}`, { ...options, headers: { ...headers, ...options.headers } });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Snapshot database request failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
    }
    return response;
  }

  return {
    async ingest(snapshot) {
      const response = await request('rpc/ingest_projection_snapshot', {
        method: 'POST',
        body: JSON.stringify({
          p_source: snapshot.source,
          p_season: snapshot.season,
          p_decision_week: snapshot.decisionWeek,
          p_canonical_cutoff_at: snapshot.canonicalCutoffAt,
          p_fetched_at: snapshot.fetchedAt,
          p_endpoint_template: snapshot.endpointTemplate,
          p_content_hash: snapshot.contentHash,
          p_values: snapshot.rows,
        }),
      });
      const result = await response.json();
      if (!Array.isArray(result) || result.length !== 1) throw new Error('Snapshot database returned an invalid ingestion result');
      return {
        snapshotId: result[0].snapshot_id,
        created: result[0].created,
        rowCount: result[0].row_count,
        status: result[0].status,
        contentHash: result[0].stored_content_hash,
      };
    },

    async findLatest({ season, decisionWeek }) {
      const params = new URLSearchParams({
        select: 'id,source,season,decision_week,canonical_cutoff_at,fetched_at,endpoint_template,row_count,content_hash,status',
        season: `eq.${season}`,
        decision_week: `lte.${decisionWeek}`,
        status: 'eq.completed',
        order: 'decision_week.desc,canonical_cutoff_at.desc',
        limit: '1',
      });
      const runResponse = await request(`projection_snapshot_runs?${params}`);
      const runs = await runResponse.json();
      if (!Array.isArray(runs) || runs.length === 0) return null;
      const run = runs[0];
      const rows = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const valueParams = new URLSearchParams({
          select: 'projection_week,player_id,pts_std,pts_half_ppr,pts_ppr',
          snapshot_id: `eq.${run.id}`,
          order: 'projection_week.asc,player_id.asc',
        });
        const response = await request(`projection_snapshot_values?${valueParams}`, {
          headers: { Range: `${from}-${from + pageSize - 1}` },
        });
        const page = await response.json();
        if (!Array.isArray(page)) throw new Error('Snapshot database returned invalid values');
        rows.push(...page.map((row) => ({
          projectionWeek: row.projection_week,
          playerId: row.player_id,
          ptsStd: row.pts_std === null ? null : Number(row.pts_std),
          ptsHalfPpr: row.pts_half_ppr === null ? null : Number(row.pts_half_ppr),
          ptsPpr: row.pts_ppr === null ? null : Number(row.pts_ppr),
        })));
        if (page.length < pageSize) break;
      }
      if (rows.length !== run.row_count) throw new Error('Snapshot row count does not match stored provenance');
      return {
        id: run.id,
        source: run.source,
        season: run.season,
        decisionWeek: run.decision_week,
        canonicalCutoffAt: run.canonical_cutoff_at,
        fetchedAt: run.fetched_at,
        endpointTemplate: run.endpoint_template,
        rowCount: run.row_count,
        contentHash: run.content_hash,
        rows,
      };
    },
  };
}

module.exports = { createSupabaseProjectionRepository, requireConfig };
