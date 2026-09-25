const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../projection-snapshots');

function context() { return { log: { error() {} }, res: null }; }

test('GET initializes without scheduler secret when read-side Supabase config is available', async () => {
  const handler = createHandler({
    env: {},
    repositoryFactory: () => ({ findLatest: async () => null }),
  });
  const ctx = context();
  await handler(ctx, { method: 'GET', query: { season: '2026', decisionWeek: '4' }, headers: {} });
  assert.equal(ctx.res.status, 404);
  assert.doesNotMatch(ctx.res.body, /SCHEDULER_SECRET/);
});

test('POST still requires configured scheduler secret before repository initialization', async () => {
  let initialized = false;
  const handler = createHandler({ env: {}, repositoryFactory: () => { initialized = true; return {}; } });
  const ctx = context();
  await handler(ctx, { method: 'POST', query: {}, headers: {}, body: {} });
  assert.equal(ctx.res.status, 500);
  assert.match(ctx.res.body, /SCHEDULER_SECRET/);
  assert.equal(initialized, false);
});
