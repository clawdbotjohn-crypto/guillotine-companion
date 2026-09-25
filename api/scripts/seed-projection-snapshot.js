#!/usr/bin/env node
const {
  ENDPOINT_TEMPLATE, fetchRemainingProjections, hashRows, parsePostBody, validateCaptureTiming,
} = require('../_shared/projectionSnapshots');
const { createSupabaseProjectionRepository } = require('../_shared/supabaseProjectionRepository');

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || !process.argv[index + 1]) throw new Error(`--${name} is required`);
  return process.argv[index + 1];
}

async function main() {
  const input = parsePostBody({
    season: argument('season'), decisionWeek: argument('decision-week'),
    canonicalCutoffAt: argument('canonical-cutoff'), provenance: argument('provenance'),
  });
  const startedAt = new Date();
  validateCaptureTiming(input, startedAt, process.env.PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE);
  const rows = await fetchRemainingProjections({ fetchImpl: fetch, ...input });
  const fetchedAt = new Date();
  validateCaptureTiming(input, fetchedAt, process.env.PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE);
  const contentHash = hashRows(rows);
  const result = await createSupabaseProjectionRepository().ingest({
    source: 'sleeper', ...input, fetchedAt: fetchedAt.toISOString(), endpointTemplate: ENDPOINT_TEMPLATE, contentHash, rows,
  });
  console.log(JSON.stringify({ ...result, fetchedWeeks: `${input.decisionWeek}-18` }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'seed failed');
  process.exitCode = 1;
});
