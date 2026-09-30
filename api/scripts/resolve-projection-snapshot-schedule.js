#!/usr/bin/env node
const fs = require('node:fs');
const {
  resolveManualCapture,
  resolveScheduledCapture,
} = require('../_shared/projectionSnapshotSchedule');

function appendOutputs(result, outputPath) {
  const lines = [
    `capture=${result.capture}`,
    `reason=${result.reason}`,
  ];
  if (result.capture) {
    lines.push(
      `season=${result.season}`,
      `decision_week=${result.decisionWeek}`,
      `canonical_cutoff_at=${result.canonicalCutoffAt}`,
      `provenance=${result.provenance}`,
    );
  }
  fs.appendFileSync(outputPath, `${lines.join('\n')}\n`);
}

function main(env = process.env) {
  if (!env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required');
  const now = env.PROJECTION_SNAPSHOT_TEST_NOW ? new Date(env.PROJECTION_SNAPSHOT_TEST_NOW) : new Date();
  if (!Number.isFinite(now.getTime())) throw new Error('PROJECTION_SNAPSHOT_TEST_NOW is invalid');
  const result = env.GITHUB_EVENT_NAME === 'schedule'
    ? resolveScheduledCapture({
      now,
      season: env.PROJECTION_SEASON,
      firstDecisionWeekLocalDate: env.PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE,
    })
    : resolveManualCapture({
      now,
      season: env.INPUT_SEASON || env.PROJECTION_SEASON,
      decisionWeek: env.INPUT_DECISION_WEEK,
      canonicalCutoffAt: env.INPUT_CANONICAL_CUTOFF_AT,
      provenance: env.INPUT_PROVENANCE,
    });
  appendOutputs(result, env.GITHUB_OUTPUT);
  process.stdout.write(result.capture
    ? `Capture coordinates resolved (${result.reason}).\n`
    : `Capture skipped safely (${result.reason}).\n`);
  return result;
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`Capture coordinate resolution failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { appendOutputs, main };
