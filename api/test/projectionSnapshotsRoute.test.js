const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHandler } = require('../projection-snapshots');

function context() { return { log: { error() {} }, res: null }; }

test('Azure function binding explicitly allows HEAD scheduler health checks', () => {
  const binding = JSON.parse(fs.readFileSync(path.join(__dirname, '../projection-snapshots/function.json'), 'utf8'));
  assert.deepEqual(binding.bindings[0].methods, ['get', 'head', 'post', 'options']);
});

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

test('HEAD checks scheduler auth and calendar configuration without repository initialization', async () => {
  let initialized = false;
  const authValue = 'test-scheduler-value-'.repeat(2);
  const handler = createHandler({
    env: {
      PROJECTION_SNAPSHOT_SCHEDULER_SECRET: authValue,
      PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE: '2026-09-08',
    },
    repositoryFactory: () => { initialized = true; return {}; },
  });

  const healthy = context();
  await handler(healthy, { method: 'HEAD', headers: { authorization: `Bearer ${authValue}` } });
  assert.equal(healthy.res.status, 204);
  assert.equal(healthy.res.body, '');
  assert.equal(initialized, false);

  const unauthorized = context();
  await handler(unauthorized, { method: 'HEAD', headers: { authorization: 'Bearer wrong' } });
  assert.equal(unauthorized.res.status, 401);
  assert.equal(initialized, false);
});

test('HEAD fails closed for missing scheduler workflow/runtime configuration', async () => {
  let initialized = false;
  const handler = createHandler({ env: {}, repositoryFactory: () => { initialized = true; return {}; } });
  const ctx = context();
  await handler(ctx, { method: 'HEAD', headers: {} });
  assert.equal(ctx.res.status, 500);
  assert.match(ctx.res.body, /SCHEDULER_SECRET/);
  assert.equal(initialized, false);
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
