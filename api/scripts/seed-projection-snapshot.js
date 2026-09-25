#!/usr/bin/env node
const { ENDPOINT_TEMPLATE, fetchRemainingProjections, hashRows } = require('../_shared/projectionSnapshots');
const { createSupabaseProjectionRepository } = require('../_shared/supabaseProjectionRepository');

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || !process.argv[index + 1]) throw new Error(`--${name} is required`);
  return process.argv[index + 1];
}

async function main() {
  const season = Number(argument('season'));
  const decisionWeek = Number(argument('decision-week'));
  const cutoff = new Date(argument('canonical-cutoff'));
  if (!Number.isInteger(season) || season < 2000 || season > 2100) throw new Error('invalid --season');
  if (!Number.isInteger(decisionWeek) || decisionWeek < 1 || decisionWeek > 18) throw new Error('invalid --decision-week');
  if (!Number.isFinite(cutoff.getTime())) throw new Error('invalid --canonical-cutoff');

  const rows = await fetchRemainingProjections({ fetchImpl: fetch, season, decisionWeek });
  const contentHash = hashRows(rows);
  const repository = createSupabaseProjectionRepository();
  const result = await repository.ingest({
    source: 'sleeper', season, decisionWeek, canonicalCutoffAt: cutoff.toISOString(),
    fetchedAt: new Date().toISOString(), endpointTemplate: ENDPOINT_TEMPLATE, contentHash, rows,
  });
  console.log(JSON.stringify({ ...result, contentHash: result.contentHash, fetchedWeeks: `${decisionWeek}-18` }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'seed failed');
  process.exitCode = 1;
});
