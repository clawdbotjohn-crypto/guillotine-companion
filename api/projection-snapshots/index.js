const { createProjectionSnapshotService } = require('../_shared/projectionSnapshots');
const { createSupabaseProjectionRepository } = require('../_shared/supabaseProjectionRepository');

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    };
    return;
  }

  try {
    const schedulerSecret = process.env.PROJECTION_SNAPSHOT_SCHEDULER_SECRET;
    if (typeof schedulerSecret !== 'string' || schedulerSecret.length < 32) {
      throw new Error('PROJECTION_SNAPSHOT_SCHEDULER_SECRET is not configured');
    }
    const service = createProjectionSnapshotService({
      repository: createSupabaseProjectionRepository(),
      schedulerSecret,
    });
    context.res = req.method === 'POST' ? await service.post(req) : await service.get(req);
  } catch (error) {
    context.log.error('Projection snapshot configuration error');
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Projection snapshot service is unavailable' }),
    };
  }
};
