const { createProjectionSnapshotService } = require('../_shared/projectionSnapshots');
const { createSupabaseProjectionRepository } = require('../_shared/supabaseProjectionRepository');

function createHandler({ env = process.env, repositoryFactory = () => createSupabaseProjectionRepository() } = {}) {
  return async function projectionSnapshotHandler(context, req) {
    if (req.method === 'OPTIONS') {
      context.res = {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        },
      };
      return;
    }

    try {
      let schedulerSecret;
      if (req.method === 'POST') {
        schedulerSecret = env.PROJECTION_SNAPSHOT_SCHEDULER_SECRET;
        if (typeof schedulerSecret !== 'string' || schedulerSecret.length < 32) throw new Error('PROJECTION_SNAPSHOT_SCHEDULER_SECRET is not configured');
      }
      const service = createProjectionSnapshotService({
        repository: repositoryFactory(), schedulerSecret,
        firstDecisionWeekLocalDate: env.PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE,
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
}

const handler = createHandler();
module.exports = handler;
module.exports.createHandler = createHandler;
