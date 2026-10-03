const { createProjectionSnapshotService } = require('../_shared/projectionSnapshots');
const { createSupabaseProjectionRepository } = require('../_shared/supabaseProjectionRepository');

function createHandler({ env = process.env, repositoryFactory = () => createSupabaseProjectionRepository() } = {}) {
  return async function projectionSnapshotHandler(context, req) {
    if (req.method === 'OPTIONS') {
      context.res = {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'X-Projection-Snapshot-Secret, Content-Type',
        },
      };
      return;
    }

    if (!['GET', 'HEAD', 'POST'].includes(req.method)) {
      context.res = {
        status: 405,
        headers: { Allow: 'GET, HEAD, POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({ code: 'METHOD_NOT_ALLOWED', error: 'Method not allowed' }),
      };
      return;
    }

    try {
      let schedulerSecret;
      if (req.method === 'HEAD' || req.method === 'POST') {
        schedulerSecret = env.PROJECTION_SNAPSHOT_SCHEDULER_SECRET;
        if (typeof schedulerSecret !== 'string' || schedulerSecret.length < 32) throw new Error('PROJECTION_SNAPSHOT_SCHEDULER_SECRET is not configured');
      }
      const service = createProjectionSnapshotService({
        repository: req.method === 'HEAD' ? null : repositoryFactory(),
        schedulerSecret,
        firstDecisionWeekLocalDate: env.PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE,
      });
      if (req.method === 'HEAD') context.res = await service.health(req);
      else if (req.method === 'POST') context.res = await service.post(req);
      else context.res = await service.get(req);
    } catch (error) {
      context.log.error('Projection snapshot configuration error');
      context.res = {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          code: 'CONFIGURATION_ERROR',
          error: error instanceof Error ? error.message : 'Projection snapshot service is unavailable',
        }),
      };
    }
  };
}

const handler = createHandler();
module.exports = handler;
module.exports.createHandler = createHandler;
