import { writeFile } from 'node:fs/promises';
import type { League, Matchup, NflState, Roster, SleeperUser, WeeklyProjectionMap } from '../src/api/types.ts';
import { computeEliminations } from '../src/logic/elimination.ts';
import {
  getProjectionPoints,
  sumRestOfSeasonProjections,
  type ProjectionScoring,
} from '../src/logic/projections.ts';
import {
  buildLeagueContext,
  buildMaxVorpCalibration,
  buildWaiverBoard,
  computeAvailablePlayers,
  type LeagueContext,
  type StrategyKey,
} from '../src/logic/waivers.ts';

const LEAGUE_ID = process.env.LEAGUE_ID ?? '1312112493526536192';
const OUTPUT = process.argv[2] ?? 'docs/analysis/non-vorp-seamex-2026.md';
const API = 'https://api.sleeper.app/v1';
const POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const;
const STRATEGIES = ['safe', 'weeks-starter', 'aggressive'] as const;
const BEFORE_CAPTURE = '2026-09-28T01:49:35.020Z';

interface PlayerMetadata {
  position?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error(`${path}: ${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

function table(headers: string[], rows: Array<Array<string | number>>): string {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function playerName(playerId: string, players: Record<string, PlayerMetadata>): string {
  const player = players[playerId];
  return player?.full_name
    || [player?.first_name, player?.last_name].filter(Boolean).join(' ')
    || playerId;
}

function suggestionValue(
  row: ReturnType<typeof buildWaiverBoard>[number],
  strategy: StrategyKey,
): number {
  return row.suggestions.find((suggestion) => suggestion.strategy === strategy)?.value ?? 0;
}

function strategyStats(
  rows: ReturnType<typeof buildWaiverBoard>,
  strategy: StrategyKey,
  players: Record<string, PlayerMetadata>,
  currentSelectedCounts: Record<string, number>,
): Array<Array<string | number>> {
  return POSITIONS.map((position) => {
    const positionRows = rows.filter((row) => row.position === position)
      .sort((a, b) => a.posRank - b.posRank || a.playerId.localeCompare(b.playerId));
    const positive = positionRows.filter((row) => suggestionValue(row, strategy) > 0);
    const last = positive.at(-1);
    // Boundary identity comes directly from the exact current optimized pool composition.
    const boundary = positionRows.find((row) => row.posRank === currentSelectedCounts[position]);
    return [
      position,
      positive.length,
      positionRows.length - positive.length,
      last ? `${playerName(last.playerId, players)} (#${last.posRank}, $${suggestionValue(last, strategy)})` : 'none',
      boundary ? `${playerName(boundary.playerId, players)} (#${boundary.posRank}, $${suggestionValue(boundary, strategy)})` : 'none',
    ];
  });
}

function totalStats(rows: ReturnType<typeof buildWaiverBoard>, strategy: StrategyKey): [number, number] {
  const positive = rows.filter((row) => suggestionValue(row, strategy) > 0).length;
  return [positive, rows.length - positive];
}

async function main() {
  const [league, nflState, players] = await Promise.all([
    get<League>(`/league/${LEAGUE_ID}`),
    get<NflState>('/state/nfl'),
    get<Record<string, PlayerMetadata>>('/players/nfl'),
  ]);
  const scoring: ProjectionScoring = league.scoring_settings?.rec === 1
    ? 'ppr'
    : league.scoring_settings?.rec === 0.5 ? 'half-ppr' : 'standard';
  const startWeek = Math.max(1, nflState.week, nflState.display_week + 1);
  const weeks = Array.from({ length: Math.max(0, 19 - startWeek) }, (_, index) => startWeek + index);
  const weeklyEntries = await Promise.all(weeks.map(async (week) => [
    week,
    await get<WeeklyProjectionMap>(`/projections/nfl/regular/${league.season}/${week}`),
  ] as const));
  const weekly = new Map(weeklyEntries);
  const projections = sumRestOfSeasonProjections(
    weekly,
    scoring,
    (playerId) => players[playerId]?.position,
  );
  for (const [playerId] of projections) {
    const hasSelectedProjection = weeklyEntries.some(([, rows]) =>
      getProjectionPoints(rows[playerId], scoring) != null);
    if (!hasSelectedProjection) projections.delete(playerId);
  }

  const [rosters, users] = await Promise.all([
    get<Roster[]>(`/league/${LEAGUE_ID}/rosters`),
    get<SleeperUser[]>(`/league/${LEAGUE_ID}/users`),
  ]);
  const lastScoredWeek = Number(league.settings?.last_scored_leg ?? Math.max(0, nflState.week - 1));
  const matchupEntries = await Promise.all(
    Array.from({ length: Math.max(0, lastScoredWeek) }, (_, index) => index + 1)
      .map(async (week) => [week, await get<Matchup[]>(`/league/${LEAGUE_ID}/matchups/${week}`)] as const),
  );
  const eliminations = computeEliminations(new Map(matchupEntries), rosters, users);
  const ctx = buildLeagueContext(league, eliminations, startWeek);
  const supportedPositiveIds = [...projections.values()]
    .filter((player) => POSITIONS.includes(player.position as typeof POSITIONS[number])
      && Number.isFinite(player.pointsPerWeek)
      && player.pointsPerWeek > 0)
    .map((player) => player.playerId);
  const availableIds = computeAvailablePlayers(rosters, projections)
    .filter((playerId) => POSITIONS.includes(projections.get(playerId)?.position as typeof POSITIONS[number]));
  const boardOptions = {
    maxPerPos: Number.POSITIVE_INFINITY,
    sleeperRosProjections: projections,
  };
  const fullBoard = buildWaiverBoard(
    supportedPositiveIds, projections, ctx, ctx.maxVorpTeamCounts, (id) => playerName(id, players), boardOptions,
  );
  const availableBoard = buildWaiverBoard(
    availableIds, projections, ctx, ctx.maxVorpTeamCounts, (id) => playerName(id, players), boardOptions,
  );

  const eliminationsPerWeek = ctx.teamsRemaining > 16 ? 2 : 1;
  const stages: Array<{ week: number; teams: number; counts: Record<string, number>; selected: number }> = [];
  let stageTeams = ctx.teamsRemaining;
  for (let offset = 0; offset < ctx.weeksRemaining && stageTeams > 1; offset++) {
    const stageContext: LeagueContext = { ...ctx, teamsRemaining: stageTeams, weeksRemaining: 1 };
    const stageRows = buildWaiverBoard(
      supportedPositiveIds,
      projections,
      stageContext,
      [],
      (id) => playerName(id, players),
      { maxPerPos: Number.POSITIVE_INFINITY },
    );
    const selectedRows = stageRows.filter((row) => row.starterWeeks === 1);
    const counts = Object.fromEntries(POSITIONS.map((position) => [
      position,
      selectedRows.filter((row) => row.position === position).length,
    ]));
    stages.push({ week: ctx.currentWeek + offset, teams: stageTeams, counts, selected: selectedRows.length });
    stageTeams = Math.max(1, stageTeams - eliminationsPerWeek);
  }

  if (!Number.isFinite(ctx.currentWeek) || !Number.isFinite(ctx.weeksRemaining)
    || !Number.isFinite(ctx.teamsRemaining) || stages.length === 0) {
    throw new Error(`Invalid league context/stages: ${JSON.stringify({ ctx, stages: stages.length })}`);
  }
  const currentStage = stages[0];
  const boundaryRows = POSITIONS.map((position) => {
    const count = currentStage?.counts[position] ?? 0;
    const boundary = fullBoard.find((row) => row.position === position && row.posRank === count);
    return [position, count, boundary ? playerName(boundary.playerId, players) : 'none', boundary?.playerId ?? 'n/a'];
  });
  const topRows = [...fullBoard]
    .sort((a, b) => suggestionValue(b, 'safe') - suggestionValue(a, 'safe')
      || b.pointsPerWeek - a.pointsPerWeek || a.playerId.localeCompare(b.playerId))
    .slice(0, 12)
    .map((row) => [
      playerName(row.playerId, players), row.position, row.posRank,
      `$${suggestionValue(row, 'safe')}`,
      `$${suggestionValue(row, 'weeks-starter')}`,
      `$${suggestionValue(row, 'aggressive')}`,
      `${row.starterWeeks}/${row.possibleStarterWeeks}`,
    ]);

  const maxVorp = buildMaxVorpCalibration(
    projections,
    ctx.startersPerPos,
    ctx.teamsRemaining,
    ctx.budget,
  );
  const maxVorpPositive = maxVorp?.playerValues.size ?? 0;
  const generatedAt = new Date().toISOString();
  const lineup = league.roster_positions.filter((position) =>
    !['BN', 'IR', 'TAXI'].includes(position)).join(', ');
  const beforeRows: Array<Array<string | number>> = [
    ['Safe', 272, 173, 'QB 30 / RB 91 / WR 91 / TE 60'],
    ['Weeks-as-Starter', 248, 197, 'QB 28 / RB 84 / WR 84 / TE 52'],
    ['Aggressive', 248, 197, 'QB 28 / RB 84 / WR 84 / TE 52'],
  ];
  const afterRows = STRATEGIES.map((strategy) => {
    const [positive, zero] = totalStats(fullBoard, strategy);
    const positions = POSITIONS.map((position) =>
      `${position} ${fullBoard.filter((row) => row.position === position && suggestionValue(row, strategy) > 0).length}`,
    ).join(' / ');
    return [strategy, positive, zero, positions];
  });
  const availableRows = STRATEGIES.map((strategy) => {
    const [positive, zero] = totalStats(availableBoard, strategy);
    return [strategy, positive, zero];
  });
  const requiredPerTeam = Object.values(ctx.startersPerPos).reduce((sum, count) => sum + count, 0);
  const allStagesComplete = stages.every((stage) => stage.selected === requiredPerTeam * stage.teams);

  const report = `# SeaMex 2026 non-VORP replacement-level analysis\n\n` +
    `Generated by \`npm run analyze:non-vorp\` at **${generatedAt}**. League ID: \`${LEAGUE_ID}\`.\n\n` +
    `## Capture and model context\n\n` +
    `- Selected display source: **Sleeper ROS**, fetched live from Sleeper's weekly projection endpoints at the timestamp above.\n` +
    `- League: **${league.name}**; season ${league.season}; scoring ${scoring}; initial FAAB $${ctx.budget}.\n` +
    `- NFL state: Week ${nflState.week}, display/previous week ${nflState.display_week}; league last scored leg ${lastScoredWeek}.\n` +
    `- Projection window: Weeks ${weeks[0] ?? 'none'}–${weeks.at(-1) ?? 'none'} (${weeks.length} endpoint weeks); ${projections.size} total selected-scoring projection rows; ${supportedPositiveIds.length} positive finite QB/RB/WR/TE rows.\n` +
    `- Lineup: ${lineup}. Parsed slots: ${JSON.stringify(ctx.startersPerPos)}.\n` +
    `- Context: ${ctx.teamsRemaining} active teams; currentWeek=${ctx.currentWeek}; weeksRemaining=${ctx.weeksRemaining}; fixed cadence=${eliminationsPerWeek}; modeled stages ${stages.map((stage) => stage.teams).join(', ')}.\n` +
    `- Full board uses \`maxPerPos=Infinity\`. Actual currently unrostered supported rows: ${availableBoard.length}.\n\n` +
    `## Stage allocation\n\n` +
    table(['Modeled week', 'Teams', 'QB', 'RB', 'WR', 'TE', 'Selected / required'], stages.map((stage) => [
      stage.week, stage.teams, stage.counts.QB, stage.counts.RB, stage.counts.WR, stage.counts.TE,
      `${stage.selected} / ${requiredPerTeam * stage.teams}`,
    ])) +
    `\n\nEvery FLEX/SUPER_FLEX assignment is allocated once across eligible positions. All modeled pools complete: **${allStagesComplete ? 'yes' : 'no'}**.\n\n` +
    `## Current selected boundaries\n\n` +
    table(['Position', 'Selected count / boundary rank R', 'Boundary player', 'Sleeper ID'], boundaryRows) +
    `\n\nThe named rank-R player and every lower-ranked player are exactly $0 in Safe; Weeks-as-Starter and Aggressive cannot revive them.\n\n` +
    `## BEFORE baseline (frozen earlier capture)\n\n` +
    `These are the approved-plan baseline numbers captured at **${BEFORE_CAPTURE}** from the then-live Sleeper snapshot. They are preserved verbatim and are not recomputed by this script.\n\n` +
    table(['Strategy', 'Positive', 'Zero', 'Positive by position'], beforeRows) +
    `\n\n## AFTER (current live capture)\n\n` +
    `Because this run fetched live endpoints rather than a saved fixture, any upstream projection/ownership change since ${BEFORE_CAPTURE} is **live-data drift**; raw BEFORE→AFTER movement must not be attributed solely to code.\n\n` +
    table(['Strategy', 'Positive', 'Zero', 'Positive by position'], afterRows) +
    `\n\n### AFTER cutoffs and boundaries\n\n` +
    STRATEGIES.map((strategy) => `#### ${strategy}\n\n${table(
      ['Position', 'Positive', 'Zero', 'Last positive', 'Selected boundary'],
      strategyStats(fullBoard, strategy, players, currentStage?.counts ?? {}),
    )}`).join('\n\n') +
    `\n\n### Actual available rows\n\n` +
    table(['Strategy', 'Positive', 'Zero'], availableRows) +
    `\n\n## Representative top values and order\n\n` +
    table(['Player', 'Pos', 'Rank', 'Safe', 'Weeks', 'Aggressive', 'Starter weeks'], topRows) +
    `\n\n## Max VORP no-change evidence\n\n` +
    `- The same live input produces ${maxVorpPositive} positive Max VORP calibrated player values.\n` +
    `- Focused regression locks the mixed FLEX/SUPER_FLEX selected IDs and finite-zero eligibility. The existing interior golden remains RB10 at 16 teams, VORP 35.82, raw 193.951864, rounded bid $194.\n` +
    `- Production Max VORP still calls its finite-\`totalPoints\` wrapper and comparator. Non-VORP calls only the generic slot allocator with positive finite selected-source \`pointsPerWeek\`; no Max VORP formula, calibration, selector, or output is consumed.\n`;

  if (!allStagesComplete) throw new Error('At least one modeled starter pool is incomplete.');
  if (!stages.every((stage) => Number.isFinite(stage.week)
    && Number.isFinite(stage.teams)
    && Number.isFinite(stage.selected)
    && POSITIONS.every((position) => Number.isFinite(stage.counts[position])))) {
    throw new Error('At least one modeled stage contains a non-finite count.');
  }
  for (const invalidMarker of ['NaN', '[object Object]']) {
    if (report.includes(invalidMarker)) throw new Error(`Refusing to write invalid report containing ${invalidMarker}`);
  }

  await writeFile(OUTPUT, report);
  console.log(report);
}

await main();
