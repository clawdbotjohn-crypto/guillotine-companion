const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  LATEST_CAPTURE_START_OFFSET_MS,
  resolveManualCapture,
  resolveScheduledCapture,
} = require('../_shared/projectionSnapshotSchedule');
const { main } = require('../scripts/resolve-projection-snapshot-schedule');
const { classifyProjectionSnapshotResponse } = require('../scripts/report-projection-snapshot-response');

const workflow = fs.readFileSync(path.join(__dirname, '../../.github/workflows/projection-snapshot.yml'), 'utf8');
const config = { season: '2026', firstDecisionWeekLocalDate: '2026-09-08' };

for (const [label, timestamp, expectedWeek, expectedCutoff] of [
  ['PDT minute 02', '2026-09-30T03:02:00Z', 4, '2026-09-30T03:00:00.000Z'],
  ['PDT minute 07', '2026-09-30T03:07:00Z', 4, '2026-09-30T03:00:00.000Z'],
  ['PDT minute 12', '2026-09-30T03:12:59Z', 4, '2026-09-30T03:00:00.000Z'],
  ['PST minute 02', '2026-11-11T04:02:00Z', 10, '2026-11-11T04:00:00.000Z'],
  ['PST minute 07', '2026-11-11T04:07:00Z', 10, '2026-11-11T04:00:00.000Z'],
  ['PST minute 12', '2026-11-11T04:12:59Z', 10, '2026-11-11T04:00:00.000Z'],
  ['Week 18 January crossing', '2027-01-06T04:07:00Z', 18, '2027-01-06T04:00:00.000Z'],
]) {
  test(`runtime timing resolver accepts ${label} with DST-aware coordinates`, () => {
    const result = resolveScheduledCapture({ now: new Date(timestamp), ...config });
    assert.deepEqual(result, {
      capture: true,
      reason: 'inside-exact-start-window',
      season: 2026,
      decisionWeek: expectedWeek,
      canonicalCutoffAt: expectedCutoff,
      provenance: 'exact',
    });
  });
}

test('runtime timing resolver skips delayed and wrong-DST-hour jobs with completion margin', () => {
  assert.equal(LATEST_CAPTURE_START_OFFSET_MS, 13 * 60 * 1000);
  assert.deepEqual(resolveScheduledCapture({ now: new Date('2026-09-30T03:13:00Z'), ...config }), {
    capture: false, reason: 'late-window',
  });
  assert.deepEqual(resolveScheduledCapture({ now: new Date('2026-09-30T04:02:00Z'), ...config }), {
    capture: false, reason: 'late-window',
  });
  assert.deepEqual(resolveScheduledCapture({ now: new Date('2026-09-30T09:03:53Z'), ...config }), {
    capture: false, reason: 'outside-pacific-window',
  });
  assert.deepEqual(resolveScheduledCapture({ now: new Date('2026-11-11T03:02:00Z'), ...config }), {
    capture: false, reason: 'outside-pacific-window',
  });
  assert.deepEqual(resolveScheduledCapture({ now: new Date('2027-01-20T04:02:00Z'), ...config }), {
    capture: false, reason: 'outside-season',
  });
});

test('final timing recheck safely closes an exact attempt delayed by the health check', () => {
  const initial = resolveScheduledCapture({ now: new Date('2026-09-30T03:12:59Z'), ...config });
  const final = resolveScheduledCapture({ now: new Date('2026-09-30T03:13:00Z'), ...config });
  assert.equal(initial.capture, true);
  assert.deepEqual(final, { capture: false, reason: 'late-window' });
});

test('manual exact dispatch is timing-guarded while reconstructed dispatch remains available', () => {
  const exact = resolveManualCapture({
    now: new Date('2026-09-30T03:13:00Z'), season: '2026', decisionWeek: '4',
    canonicalCutoffAt: '2026-09-30T03:00:00Z', provenance: 'exact',
  });
  assert.deepEqual(exact, { capture: false, reason: 'late-window' });
  assert.equal(resolveManualCapture({
    now: new Date('2026-09-30T09:00:00Z'), season: '2026', decisionWeek: '4',
    canonicalCutoffAt: '2026-09-30T03:00:00Z', provenance: 'reconstructed',
  }).capture, true);
});

test('CLI simulation writes guarded outputs without invoking a network', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-timing-'));
  const output = path.join(directory, 'output');
  try {
    const result = main({
      GITHUB_OUTPUT: output,
      GITHUB_EVENT_NAME: 'schedule',
      PROJECTION_SEASON: '2026',
      PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE: '2026-09-08',
      PROJECTION_SNAPSHOT_TEST_NOW: '2026-09-30T03:07:00Z',
    });
    assert.equal(result.capture, true);
    assert.match(fs.readFileSync(output, 'utf8'), /decision_week=4/);
    assert.match(fs.readFileSync(output, 'utf8'), /provenance=exact/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('workflow uses independent off-hour PDT/PST opportunities and the tested runtime guard', () => {
  for (const hour of [3, 4]) {
    for (const minute of [2, 7, 12]) assert.match(workflow, new RegExp(`cron: '${minute} ${hour} \\* \\* 3'`));
  }
  assert.doesNotMatch(workflow, /cron: '0 /);
  assert.match(workflow, /actions\/checkout@v4/);
  assert.equal((workflow.match(/resolve-projection-snapshot-schedule\.js/g) || []).length, 2);
  assert.doesNotMatch(workflow, /^concurrency:/m);
  assert.doesNotMatch(workflow, /projection-snapshot-capture/);
  assert.match(workflow, /timeout-minutes: 10/);
});

test('workflow health canary is side-effect-free and reports actionable failure classes', () => {
  assert.match(workflow, /--request HEAD/);
  assert.match(workflow, /Missing workflow secret/);
  assert.match(workflow, /Missing workflow endpoint/);
  assert.match(workflow, /Endpoint\/auth mismatch/);
  assert.match(workflow, /Snapshot API error/);
  assert.match(workflow, /Projection snapshot skipped/);
  assert.match(workflow, /No POST, Sleeper fetch, or database write was attempted/);
  assert.equal((workflow.match(/X-Projection-Snapshot-Secret: \$SCHEDULER_SECRET/g) || []).length, 2);
  assert.doesNotMatch(workflow, /Authorization: Bearer/);
  assert.ok(workflow.indexOf('--request HEAD') < workflow.indexOf('--request POST'));
});

test('workflow has bounded requests, a final post-health timing recheck, and no blind retry', () => {
  assert.doesNotMatch(workflow, /for .*retry|while .*retry|sleep [0-9]/i);
  assert.match(workflow, /id: health/);
  assert.match(workflow, /id: final_coordinates/);
  assert.match(workflow, /Recheck capture coordinates immediately before POST/);
  assert.match(workflow, /if: steps\.final_coordinates\.outputs\.capture == 'true' && steps\.health\.outcome == 'success'/);
  assert.match(workflow, /SEASON: \$\{\{ steps\.final_coordinates\.outputs\.season \}\}/);
  assert.equal((workflow.match(/--connect-timeout 5/g) || []).length, 2);
  assert.match(workflow, /--max-time 20/);
  assert.match(workflow, /--max-time 150/);
  assert.match(workflow, /report-projection-snapshot-response\.js/);
});

test('workflow response classifier distinguishes immutable, timing, and calendar 409 codes', () => {
  const conflict = classifyProjectionSnapshotResponse(409, { code: 'SNAPSHOT_CONFLICT' });
  assert.equal(conflict.title, 'Immutable snapshot conflict');
  assert.match(conflict.message, /different immutable evidence/);

  const closed = classifyProjectionSnapshotResponse(409, { code: 'WINDOW_CLOSED' });
  assert.equal(closed.title, 'Exact capture window closed');
  assert.doesNotMatch(closed.message, /different immutable evidence/);

  const early = classifyProjectionSnapshotResponse(409, { code: 'WINDOW_NOT_OPEN' });
  assert.equal(early.title, 'Exact capture window not open');
  assert.doesNotMatch(early.message, /different immutable evidence/);

  const calendar = classifyProjectionSnapshotResponse(409, { code: 'CALENDAR_MISMATCH' });
  assert.equal(calendar.title, 'Snapshot calendar mismatch');
  assert.doesNotMatch(calendar.message, /different immutable evidence/);
});
