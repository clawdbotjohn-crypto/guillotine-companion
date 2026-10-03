import { createHash } from "node:crypto";
import type {
  AnalysisFixture,
  EnrichedEvent,
} from "./analyze-bidding-strategies.ts";
import { enrichEvents } from "./analyze-bidding-strategies.ts";
import {
  computeErrorMetrics,
  type EvaluatedBid,
} from "./bidding-strategy-analysis.ts";
import type { PrewaiverPanel } from "./prewaiver-capture.ts";

export type EvidenceBadge = "Supported" | "Directional" | "Not enough evidence";

export interface DirectPredictionRow {
  manager: string;
  likelihood: "Likely" | "Possible" | "Unlikely";
  predicted: number;
  preWaiverFaab: number;
  feasiblePrediction: number;
  budgetCensored: boolean;
  actualKind: "claim" | "non-bid";
  actualAmount: number | null;
  status: string;
  claimClass: string;
  includedInClearingCompetition: boolean;
  exclusionReason: string | null;
  claimCount: number;
  additionalSameManagerClaims: number;
  rosterFullClaimCount: number;
}

export interface ExactTarget {
  alias: string;
  maxVorpRank: number;
  maxVorp: number;
  safe: number;
  aggressive: number;
  currentVorp: number;
  weeksAsStarter: number;
  topCredible: number;
  topAll: number;
  winningBid: number | null;
  observedMinimum: number | null;
  rawClaimCount: number;
  uniqueManagerClaims: number;
  additionalSameManagerClaims: number;
  rosterFullClaims: number;
  tokenClaims: number;
  unknownContingencies: number;
  managerPredictions?: DirectPredictionRow[];
}

export interface LikelihoodBand {
  band: string;
  n: number;
  claim: number;
  positive: number;
  max: number;
  safe: number;
  serious: number;
  minimum: number;
  heavy: number;
  topQuartile: number;
}

export interface ExactAuditFixture {
  fixtureVersion: string;
  evidenceWeek: number;
  managerSummaries: Array<{
    manager: string;
    rawClaims: number;
    canonicalClaims: number;
    targetCount: number;
    alternatives: number;
    rosterFullClaims: number;
    positiveClaims: number;
    heavyClaims: number;
    wins: number;
    winningSpend: number;
  }>;
  outcomeDefinitions: Record<string, string>;
  likelihoodBands: LikelihoodBand[];
  selectionRule: string;
  middleFiveRule: string;
  managerAliasRule: string;
  targets: ExactTarget[];
  lineage: {
    exactWeek5: Array<{ artifact: string; sha256: string }>;
    reconstructedWeeks2To4: {
      artifact: string;
      sha256: string;
      provenance: string;
    };
  };
}

export interface SelectedDirectRow extends DirectPredictionRow {
  target: string;
  targetRank: number;
  cohort: "Top five" | "Middle five";
  cohortRank: number;
  signedError: number | null;
  absoluteError: number | null;
}

export interface QuestionSection {
  number: number;
  title: string;
  badge: EvidenceBadge;
  keyNumber: string;
  directAnswer: string;
  evidence: string;
  implication: string;
  unknowns: string;
}

export interface TierRow {
  scope: string;
  tier: string;
  boundary: string;
  n: number;
  minimumProxyN: number;
  runnerUpProxyN: number;
  medianWinnerOverAggressive: number | null;
  q25: number | null;
  q75: number | null;
  winnerMae: number | null;
  minimumProxyMae: number | null;
  runnerUpProxyMae: number | null;
}

export interface LadderRow {
  weekLabel: string;
  provenance: "Exact" | "Reconstructed";
  bids: number[];
  startingFaabShares: number[];
  context: string;
}

export interface LongitudinalRow {
  manager: string;
  anchorWeek: number;
  anchorSpend: number;
  followWeek: number | null;
  canonicalClaims: number;
  rawClaims: number;
  seriousBids: number;
  heavyBids: number;
  wins: number;
  totalSpend: number;
  maxBid: number | null;
  startFaabShare: number;
  remainingFaabShare: number | null;
  samePositionClaims: number;
  budgetCensored: string;
  latestWeek: number;
  latestActivity: string;
  provenance: string;
}

export interface WinnerHistoryRow {
  week: number;
  manager: string;
  winningSpend: number;
  prior: string;
  next: string;
}

export interface OwnerDecisionReportModel {
  generatedFor: string;
  questions: QuestionSection[];
  directRows: SelectedDirectRow[];
  tierRows: TierRow[];
  ladderRows: LadderRow[];
  likelihoodBands: LikelihoodBand[];
  outcomeDefinitions: Record<string, string>;
  longitudinalRows: LongitudinalRow[];
  winnerHistoryRows: WinnerHistoryRow[];
  exact: ExactAuditFixture;
  reconstructed: AnalysisFixture;
  /** Optional prospective evidence. Omitted to preserve legacy report output. */
  prewaiverPanel?: PrewaiverPanel;
  headlineMetrics: {
    topClaimN: number;
    middleClaimN: number;
    topClaimMae: number;
    middleClaimMae: number;
    nextWeekObserved: number;
    nextWeekReduced: number;
  };
}

export function stableSha256(value: unknown): string {
  const stable = (item: unknown): string => {
    if (Array.isArray(item)) return `[${item.map(stable).join(",")}]`;
    if (item && typeof item === "object")
      return `{${Object.entries(item as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`)
        .join(",")}}`;
    return JSON.stringify(item);
  };
  return createHash("sha256").update(stable(value)).digest("hex");
}

/**
 * The middle cohort is deliberately positional, not hand-picked: sort all eligible
 * manager predictions by predicted dollars descending and stable alias ascending,
 * then take five rows beginning at floor((n - 5) / 2). Ties are therefore stable.
 */
export function selectTopAndMiddleRows(
  target: ExactTarget,
): SelectedDirectRow[] {
  const ordered = [...(target.managerPredictions ?? [])].sort(
    (a, b) => b.predicted - a.predicted || a.manager.localeCompare(b.manager),
  );
  if (ordered.length < 10)
    throw new Error(
      `${target.alias} needs at least ten eligible manager predictions`,
    );
  const middleStart = Math.floor((ordered.length - 5) / 2);
  const cohorts: Array<["Top five" | "Middle five", DirectPredictionRow[]]> = [
    ["Top five", ordered.slice(0, 5)],
    ["Middle five", ordered.slice(middleStart, middleStart + 5)],
  ];
  return cohorts.flatMap(([cohort, rows]) =>
    rows.map((row, index) => ({
      ...row,
      target: target.alias,
      targetRank: target.maxVorpRank,
      cohort,
      cohortRank: index + 1,
      // Non-bids are missing outcomes, never zero-dollar bids.
      signedError:
        row.actualKind === "claim" && row.actualAmount != null
          ? row.predicted - row.actualAmount
          : null,
      absoluteError:
        row.actualKind === "claim" && row.actualAmount != null
          ? Math.abs(row.predicted - row.actualAmount)
          : null,
    })),
  );
}

function quantile(values: number[], probability: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * probability;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

function aliasMap(events: EnrichedEvent[]): Map<string, string> {
  const managers = [...new Set(events.map((event) => event.manager))].sort(
    (a, b) => a.localeCompare(b),
  );
  return new Map(
    managers.map((manager, index) => [
      manager,
      `History manager ${String(index + 1).padStart(2, "0")}`,
    ]),
  );
}

function eventSummary(
  events: EnrichedEvent[],
  week: number,
  manager: string,
  budget: number,
  position: string,
): { text: string } {
  const rows = events.filter(
    (event) => event.decisionWeek === week && event.manager === manager,
  );
  const serious = rows.filter((event) => !event.token);
  const wins = serious.filter((event) => event.outcome === "won");
  const raw = rows.reduce((sum, event) => sum + event.duplicateCount, 0);
  const heavy = serious.filter((event) => event.actualBid >= 50).length;
  const spend = wins.reduce((sum, event) => sum + event.actualBid, 0);
  const startingShare =
    serious.reduce((sum, event) => sum + event.actualBid, 0) / budget;
  const remainingShare = serious.length
    ? serious.reduce(
        (sum, event) => sum + event.actualBid / Math.max(1, event.preBidFaab),
        0,
      ) / serious.length
    : 0;
  const samePosition = serious.filter(
    (event) => event.position === position,
  ).length;
  return {
    text: `${raw} raw / ${rows.length} canonical; ${serious.length} serious; ${heavy} heavy; ${wins.length} wins; $${spend} spend; ${(startingShare * 100).toFixed(1)}% bid volume / starting FAAB; ${(remainingShare * 100).toFixed(1)}% mean bid / pre-bid FAAB; ${samePosition} same-position`,
  };
}

function summarizeTier(
  scope: string,
  tier: string,
  boundary: string,
  rows: Array<{
    aggressive: number;
    winner: number;
    minimum: number | null;
    runnerUp: number | null;
  }>,
): TierRow {
  const ratios = rows.map((row) => row.winner / row.aggressive);
  const minimumRows = rows.filter((row) => row.minimum != null);
  const runnerUpRows = rows.filter((row) => row.runnerUp != null);
  return {
    scope,
    tier,
    boundary,
    n: rows.length,
    minimumProxyN: minimumRows.length,
    runnerUpProxyN: runnerUpRows.length,
    medianWinnerOverAggressive: quantile(ratios, 0.5),
    q25: quantile(ratios, 0.25),
    q75: quantile(ratios, 0.75),
    winnerMae: rows.length
      ? rows.reduce(
          (sum, row) => sum + Math.abs(row.aggressive - row.winner),
          0,
        ) / rows.length
      : null,
    minimumProxyMae: minimumRows.length
      ? minimumRows.reduce(
          (sum, row) => sum + Math.abs(row.aggressive - row.minimum!),
          0,
        ) / minimumRows.length
      : null,
    runnerUpProxyMae: runnerUpRows.length
      ? runnerUpRows.reduce(
          (sum, row) => sum + Math.abs(row.aggressive - row.runnerUp!),
          0,
        ) / runnerUpRows.length
      : null,
  };
}

function tierRows(
  reconstructed: AnalysisFixture,
  exact: ExactAuditFixture,
): TierRow[] {
  const definitions: Array<[string, string, number, number]> = [
    ["High", "winner ≥ $80", 80, Infinity],
    ["Mid", "$25–$79", 25, 79],
    ["Low", "$10–$24", 10, 24],
  ];
  const exactRows = exact.targets
    .filter(
      (target) =>
        target.winningBid != null &&
        target.winningBid >= 10 &&
        target.aggressive > 0,
    )
    .map((target) => ({
      aggressive: target.aggressive,
      winner: target.winningBid!,
      minimum: target.observedMinimum,
      // The audit retained the minimum-to-guarantee proxy, not an independently identified runner-up.
      // Under its declared one-dollar-above-loser definition, this is only a derived sensitivity.
      runnerUp:
        target.observedMinimum == null ? null : target.observedMinimum - 1,
    }));
  const { usable } = enrichEvents(reconstructed);
  const clusterKey = (event: EnrichedEvent): string =>
    `${event.decisionWeek}:${event.batch}:${event.player}`;
  const lossesByCluster = new Map<string, number[]>();
  for (const event of usable.filter(
    (item) => item.outcome === "legitimate-loss",
  )) {
    const key = clusterKey(event);
    lossesByCluster.set(key, [
      ...(lossesByCluster.get(key) ?? []),
      event.actualBid,
    ]);
  }
  const cumulativeRows = usable
    .filter(
      (event) =>
        event.outcome === "won" &&
        event.actualBid >= 10 &&
        event.suggestions.aggressive > 0,
    )
    .map((event) => {
      const losses = lossesByCluster.get(clusterKey(event)) ?? [];
      const runnerUp = losses.length ? Math.max(...losses) : null;
      return {
        aggressive: event.suggestions.aggressive,
        winner: event.actualBid,
        minimum: runnerUp == null ? null : runnerUp + 1,
        runnerUp,
      };
    });
  return definitions.flatMap(([tier, boundary, low, high]) => [
    summarizeTier(
      "Exact app W5 (Sleeper decision W4)",
      tier,
      boundary,
      exactRows.filter((row) => row.winner >= low && row.winner <= high),
    ),
    summarizeTier(
      "Reconstructed cumulative W2–W4",
      tier,
      boundary,
      cumulativeRows.filter((row) => row.winner >= low && row.winner <= high),
    ),
  ]);
}

function groupByWeek(events: EnrichedEvent[]): Map<number, EnrichedEvent[]> {
  const result = new Map<number, EnrichedEvent[]>();
  for (const event of events)
    result.set(event.decisionWeek, [
      ...(result.get(event.decisionWeek) ?? []),
      event,
    ]);
  return result;
}

function ladderRows(
  reconstructed: AnalysisFixture,
  exact: ExactAuditFixture,
): LadderRow[] {
  const { usable } = enrichEvents(reconstructed);
  const wins = usable.filter((event) => event.outcome === "won");
  // Sleeper transaction index 3 maps to decision week 4, while the app/audit labels that
  // same auction Week 5. The exact audit supersedes the reconstructed W4 ladder; emitting
  // both would falsely count one auction twice.
  const exactSleeperDecisionWeek = 4;
  const reconstructedWeeks = [...groupByWeek(wins).entries()]
    .filter(([week]) => week !== exactSleeperDecisionWeek)
    .sort(([a], [b]) => a - b)
    .map(([week, rows]) => {
      const bids = [...rows]
        .sort(
          (a, b) => b.actualBid - a.actualBid || a.event.localeCompare(b.event),
        )
        .slice(0, 5)
        .map((event) => event.actualBid);
      return {
        weekLabel: `Decision W${week}`,
        provenance: "Reconstructed" as const,
        bids,
        startingFaabShares: bids.map(
          (bid) => bid / reconstructed.league.initialFaab,
        ),
        context:
          "Transaction-ledger FAAB; contemporaneous player rank exists only inside the reconstructed snapshot.",
      };
    });
  const exactBids = exact.targets
    .map((target) => target.winningBid)
    .filter((bid): bid is number => bid != null)
    .sort((a, b) => b - a)
    .slice(0, 5);
  return [
    ...reconstructedWeeks,
    {
      weekLabel: "App W5 / decision W4",
      provenance: "Exact" as const,
      bids: exactBids,
      startingFaabShares: exactBids.map(
        (bid) => bid / reconstructed.league.initialFaab,
      ),
      context:
        "Exact audit of Sleeper transaction index 3 / decision W4, labeled Week 5 by the app. It replaces—not supplements—the reconstructed W4 ladder. Active-liquidity total was not retained.",
    },
  ];
}

function longitudinalRows(
  events: EnrichedEvent[],
  budget: number,
): LongitudinalRow[] {
  const aliases = aliasMap(events);
  const latestWeek = Math.max(...events.map((event) => event.decisionWeek));
  const anchors = events.filter(
    (event) =>
      event.outcome === "won" &&
      event.actualBid >= 90 &&
      (event.decisionWeek === 2 || event.decisionWeek === 3),
  );
  return anchors
    .sort(
      (a, b) =>
        a.decisionWeek - b.decisionWeek ||
        b.actualBid - a.actualBid ||
        a.event.localeCompare(b.event),
    )
    .map((anchor) => {
      const followWeek = anchor.decisionWeek + 1;
      const follow = events.filter(
        (event) =>
          event.manager === anchor.manager && event.decisionWeek === followWeek,
      );
      const serious = follow.filter((event) => !event.token);
      const wins = serious.filter((event) => event.outcome === "won");
      const maxBid = serious.length
        ? Math.max(...serious.map((event) => event.actualBid))
        : null;
      const minFaab = serious.length
        ? Math.min(...serious.map((event) => event.preBidFaab))
        : null;
      return {
        manager: aliases.get(anchor.manager)!,
        anchorWeek: anchor.decisionWeek,
        anchorSpend: anchor.actualBid,
        followWeek: follow.length ? followWeek : null,
        canonicalClaims: follow.length,
        rawClaims: follow.reduce((sum, event) => sum + event.duplicateCount, 0),
        seriousBids: serious.length,
        heavyBids: serious.filter((event) => event.actualBid >= 50).length,
        wins: wins.length,
        totalSpend: wins.reduce((sum, event) => sum + event.actualBid, 0),
        maxBid,
        startFaabShare:
          serious.reduce((sum, event) => sum + event.actualBid, 0) / budget,
        remainingFaabShare:
          minFaab == null
            ? null
            : serious.reduce(
                (sum, event) =>
                  sum + event.actualBid / Math.max(1, event.preBidFaab),
                0,
              ) / Math.max(1, serious.length),
        samePositionClaims: serious.filter(
          (event) => event.position === anchor.position,
        ).length,
        budgetCensored:
          minFaab != null && minFaab < 50
            ? "Yes: below heavy-bid threshold"
            : "No observed heavy-threshold censoring",
        latestWeek,
        latestActivity: eventSummary(
          events,
          latestWeek,
          anchor.manager,
          budget,
          anchor.position,
        ).text,
        provenance: "Reconstructed transaction-ledger history",
      };
    });
}

function topWinningManagers(rows: EnrichedEvent[]): EnrichedEvent[] {
  const seen = new Set<string>();
  return [...rows]
    .sort((a, b) => b.actualBid - a.actualBid || a.event.localeCompare(b.event))
    .filter((event) => {
      if (seen.has(event.manager)) return false;
      seen.add(event.manager);
      return true;
    })
    .slice(0, 3);
}

function winnerHistoryRows(events: EnrichedEvent[]): WinnerHistoryRow[] {
  const aliases = aliasMap(events);
  const result: WinnerHistoryRow[] = [];
  for (const [week, rows] of groupByWeek(
    events.filter((event) => event.outcome === "won"),
  )) {
    const top = topWinningManagers(rows);
    for (const winner of top) {
      result.push({
        week,
        manager: aliases.get(winner.manager)!,
        winningSpend: winner.actualBid,
        prior: eventSummary(
          events,
          week - 1,
          winner.manager,
          500,
          winner.position,
        ).text,
        next: eventSummary(
          events,
          week + 1,
          winner.manager,
          500,
          winner.position,
        ).text,
      });
    }
  }
  return result.sort(
    (a, b) =>
      a.week - b.week ||
      b.winningSpend - a.winningSpend ||
      a.manager.localeCompare(b.manager),
  );
}

function countNextWeekReduction(events: EnrichedEvent[]): {
  observed: number;
  reduced: number;
} {
  let observed = 0;
  let reduced = 0;
  for (const [week, rows] of groupByWeek(
    events.filter((event) => event.outcome === "won"),
  )) {
    for (const winner of topWinningManagers(rows)) {
      const next = events
        .filter(
          (event) =>
            event.manager === winner.manager &&
            event.decisionWeek === week + 1 &&
            event.outcome === "won",
        )
        .reduce((sum, event) => sum + event.actualBid, 0);
      if (events.some((event) => event.decisionWeek === week + 1)) {
        observed += 1;
        if (next < winner.actualBid) reduced += 1;
      }
    }
  }
  return { observed, reduced };
}

interface ProspectivePanelSummary {
  rows: number;
  managers: number;
  targets: number;
  capped: number;
  rankedNeedRows: number;
  likelihood: Record<DirectPredictionRow["likelihood"], number>;
}

function summarizePrewaiverPanel(panel: PrewaiverPanel): ProspectivePanelSummary {
  if (panel.schemaVersion !== "prewaiver-opportunity-v1" || !panel.timing.exact
    || panel.timing.state !== "pre-waiver-exact") {
    throw new Error("Weekly report accepts exact pre-waiver opportunity panels only.");
  }
  if (panel.coordinate.playingWeek !== panel.coordinate.decisionWeek - 1) {
    throw new Error("Pre-waiver panel has an invalid playing-week/decision-week mapping.");
  }
  const uniqueRows = new Set(panel.rows.map((row) => `${row.managerKey}|${row.targetKey}`)).size;
  const { artifactHash, ...auditWithoutArtifactHash } = panel.audit;
  const computedArtifactHash = stableSha256({ ...panel, audit: auditWithoutArtifactHash });
  if (panel.rows.length !== panel.audit.expectedRowCount
    || panel.rows.length !== panel.audit.actualRowCount
    || uniqueRows !== panel.audit.uniqueRowCount
    || stableSha256(panel.rows) !== panel.audit.rowsHash
    || computedArtifactHash !== artifactHash) {
    throw new Error("Pre-waiver panel cardinality/hash validation failed.");
  }
  const activeRows = panel.rows.filter((row) => row.active);
  return {
    rows: activeRows.length,
    managers: new Set(activeRows.map((row) => row.managerKey)).size,
    targets: new Set(activeRows.map((row) => row.targetKey)).size,
    capped: activeRows.filter((row) => row.cappedByFaab).length,
    rankedNeedRows: activeRows.filter((row) => row.needPercentile != null).length,
    likelihood: {
      Likely: activeRows.filter((row) => row.likelihood === "Likely").length,
      Possible: activeRows.filter((row) => row.likelihood === "Possible").length,
      Unlikely: activeRows.filter((row) => row.likelihood === "Unlikely").length,
    },
  };
}

export function buildOwnerDecisionReport(
  reconstructed: AnalysisFixture,
  exact: ExactAuditFixture,
  prewaiverPanel?: PrewaiverPanel,
): OwnerDecisionReportModel {
  const topTargets = [...exact.targets]
    .sort((a, b) => b.maxVorp - a.maxVorp || a.alias.localeCompare(b.alias))
    .slice(0, 3);
  const directRows = topTargets.flatMap(selectTopAndMiddleRows);
  const topClaims = directRows.filter(
    (row) => row.cohort === "Top five" && row.actualAmount != null,
  );
  const middleClaims = directRows.filter(
    (row) => row.cohort === "Middle five" && row.actualAmount != null,
  );
  const mae = (rows: SelectedDirectRow[]) =>
    rows.reduce((sum, row) => sum + row.absoluteError!, 0) / rows.length;
  const { usable } = enrichEvents(reconstructed);
  const longitudinal = longitudinalRows(
    usable,
    reconstructed.league.initialFaab,
  );
  const winnerHistory = winnerHistoryRows(usable);
  const reduction = countNextWeekReduction(usable);
  const prospective = prewaiverPanel ? summarizePrewaiverPanel(prewaiverPanel) : null;
  const questions: QuestionSection[] = [
    {
      number: 1,
      title: "Predicted-bid accuracy for top versus middle bidders/players",
      badge: "Supported",
      keyNumber: prospective
        ? `30 direct rows; ${topClaims.length}/${middleClaims.length} scored claims; ${prospective.rows} future exact opportunities ingested`
        : `30 direct rows; ${topClaims.length}/${middleClaims.length} scored claims`,
      directAnswer: `In the exact Week 5 top-three target slice, top-five predicted bidders were not more accurate: claim-only MAE was $${mae(topClaims).toFixed(1)} versus $${mae(middleClaims).toFixed(1)} for the deterministic middle five.`,
      evidence: `The top-three targets were frozen pre-auction by Max VORP descending (102, 69, 50; alias tie-break). Errors exist only for explicit claims; non-bids remain missing, not $0.${prospective ? ` The prospective panel contributes ${prospective.rows} immutable manager-target predictions (${prospective.capped} FAAB-capped) for the next post-waiver outcome join.` : ""}`,
      implication:
        "Use the ranking as a conversation starter, not proof that the highest projected manager will set the price. Keep feasible/capped values visible before judging willingness.",
      unknowns:
        "Repeat this exact 30-row slice weekly. Retain median/high prediction bands prospectively; Week 5 only preserved source-supported top-credible and top-all bands.",
    },
    {
      number: 2,
      title:
        "What Likely/Possible/Unlikely predicts and whether narrower bands help",
      badge: "Directional",
      keyNumber: prospective
        ? `242 scored opportunities; next exact panel ${prospective.likelihood.Likely}/${prospective.likelihood.Possible}/${prospective.likelihood.Unlikely} Likely/Possible/Unlikely`
        : "242 opportunities; any-claim rates 47.7% / 31.5% / 21.7%",
      directAnswer:
        "Likely/Possible/Unlikely was ordered for any canonical claim, but ranking managers only by predicted dollars did not improve discrimination: the exact top 25% claimed less often than the bottom 25%.",
      evidence: prospective
        ? `Week 5 has 65 Likely, 108 Possible, and 69 Unlikely scored opportunities. The separately frozen prospective panel adds ${prospective.rows} unscored opportunities across ${prospective.managers} active managers and ${prospective.targets} targets; it is not treated as outcome evidence before the auction.`
        : "Week 5 has 65 Likely, 108 Possible, and 69 Unlikely opportunities. Top/bottom 25% and 10% are shown for every preregistered threshold outcome; they are descriptive, not selected-and-scored cutoffs.",
      implication:
        "Keep the three labels for coarse participation likelihood. Treat each row as a budget opportunity: available FAAB limits capacity, while a non-claim does not identify whether budget, roster capacity, or preference caused the outcome.",
      unknowns:
        "Pre-register cutoffs, probability calibration, and an untouched later-week score set. Report both the all-opportunity view and a declared budget-feasible/censoring sensitivity using exact canonical status and pre-waiver FAAB.",
    },
    {
      number: 3,
      title: "Bidding after a prior expensive win",
      badge: "Directional",
      keyNumber: `${longitudinal.length} reconstructed ≥$90 anchor wins`,
      directAnswer:
        "The direct reconstructed slice is descriptive and mixed; it does not support a causal claim that an expensive win suppresses the next auction.",
      evidence: `Managers winning for at least $90 in reconstructed Weeks 2–3 are followed individually into the next available week with raw/canonical claims, serious/heavy bids, wins, spend, normalization, same-position behavior, and censoring.`,
      implication:
        "Treat remaining budget as capacity and prior spend as context, not a manager-style coefficient.",
      unknowns:
        "Link at least two more exact pre/post-waiver weeks with starting and pre-bid FAAB, roster state, contingencies, and same-position acquisition history.",
    },
    {
      number: 4,
      title: "Aggressive versus actual winner/minimum by price tier",
      badge: "Directional",
      keyNumber:
        "10 exact app-W5 targets $10+; cumulative W2–W4 shown separately",
      directAnswer:
        "Aggressive was closest in the low tier, but the winner/Aggressive ratio changed sharply by tier; it is not one stable market multiplier.",
      evidence:
        "Fixed tier boundaries are high ≥$80, mid $25–$79, and low $10–$24. Weekly exact and cumulative reconstructed rows are separate views; reconstructed W4 is the same auction as exact app W5 and is never pooled with it. Minimum-to-guarantee and derived runner-up-proxy MAE are both shown with their own n.",
      implication:
        "Keep Aggressive labeled as an intrinsic scenario/threshold, not a calibrated winning-price forecast.",
      unknowns:
        "Score the same fixed tiers on later exact weeks. Keep the privacy-safe owner-directed player exclusion only as an explicit with/without sensitivity and compare MAD/IQR rules; never delete the raw row. The exact audit did not retain an independently identified runner-up, so that view is only observed minimum minus $1.",
    },
    {
      number: 5,
      title: "Whether a nonlinear/tier-aware market-price curve fits better",
      badge: "Not enough evidence",
      keyNumber: "0 valid exact prior-week train → later-week test pairs",
      directAnswer:
        "No nonlinear, power-law, piecewise, or liquidity-aware curve is validated yet.",
      evidence:
        "The reconstructed baseline has prior-week-fitted held-out scale checks, but exact Week 5 is a different provenance class and cannot be back-fit and called held out.",
      implication:
        "Do not change app formulas. Separate curve shape from weekly market scale when a valid exact train/test sequence exists.",
      unknowns:
        "Capture candidate baselines, median remaining FAAB, active liquidity, week, winner, and minimum proxy before each auction; fit prior weeks only and score the next untouched week.",
    },
    {
      number: 6,
      title: "Weekly #1–#5 price ladder and player-rank relationship",
      badge: "Directional",
      keyNumber: "3 distinct auctions: 2 reconstructed + 1 exact",
      directAnswer:
        "The top-five price ladder is visible, but a rank-to-price relationship is not yet comparable across weeks because exact auction-time player rank and liquidity are incomplete.",
      evidence:
        "Each distinct auction shows the first through fifth winning bids and starting-FAAB shares with exact/reconstructed provenance. Sleeper transaction index 3 maps to decision W4 while the app labels that same auction W5, so the exact ladder replaces the reconstructed W4 row.",
      implication:
        "Use the ladder to set market-scale expectations, not to claim a stable rank multiplier.",
      unknowns:
        "Persist contemporaneous free-agent value rank, position, injury/bye, active-team count, median remaining FAAB, and total active liquidity for every target.",
    },
    {
      number: 7,
      title: "Claims per manager",
      badge: "Supported",
      keyNumber: "107 raw claims; 84 unique manager-target pairs",
      directAnswer:
        "Week 5 contained 23 extra same-manager alternatives beyond 84 unique manager-target pairs; raw claim count therefore overstates independent bidding intent.",
      evidence:
        "Exact post-waiver classification preserves canonical claims, duplicates/alternatives, zero-dollar tokens, roster-full failures, and unknown contingencies separately.",
      implication:
        "Use canonical manager-target claims for participation and keep raw count as process/contingency context.",
      unknowns:
        "One auction cannot define a manager’s usual claim volume. Repeat per-manager distributions, wins, and spend across exact weeks.",
    },
    {
      number: 8,
      title: "Positional need versus participation/amount",
      badge: "Not enough evidence",
      keyNumber: prospective
        ? `${prospective.rankedNeedRows}/${prospective.rows} future exact opportunities have time-aligned need ranks`
        : "0 time-aligned privacy-safe need snapshots",
      directAnswer: prospective
        ? "A prospective positional-need panel is now frozen, but participation and conditional bid-size effects remain unscored until exact post-waiver outcomes are joined."
        : "Positional need cannot be tested honestly from the retained evidence, including the requested Week 5 WR/QB slice.",
      evidence: prospective
        ? `The exact prospective panel preserves ${prospective.rankedNeedRows} ranked need opportunities across ${prospective.targets} targets, including frozen lineup inputs, FAAB, injury/bye, target strategy values, and liquidity. It remains separate from observed intent.`
        : "The exact fixture has predictions, FAAB, and outcomes but no auction-time roster-need percentile, injury/bye state, or prior-acquisition control.",
      implication:
        "Do not interpret a bid or non-bid as need. Modeled need and observed intent must stay separate.",
      unknowns: prospective
        ? "Join canonical outcomes without mutating the panel, then report preregistered top/bottom 10% and 25% claim rates and conditional amounts for targets valued >$10; retain FAAB censoring and small-n warnings."
        : "Before each auction capture top/bottom 10% and 25% need ranks by position, roster/injury/bye, player value, FAAB, manager baseline, and prior acquisitions; then report claim rate and conditional amount for players >$10.",
    },
    {
      number: 9,
      title: "Whether prior-week top winners/bidders spend less next week",
      badge: "Directional",
      keyNumber: `${reduction.reduced}/${reduction.observed} reconstructed top-winner follow-ups had lower next-week winning spend`,
      directAnswer:
        "The reconstructed direct slice leans toward lower next-week winning spend, but repeated managers, zero-win weeks, and non-exact history prevent a behavioral conclusion.",
      evidence:
        "For each reconstructed week’s top three distinct winning managers (highest winning bid per manager), the table shows prior and next raw/canonical claims, serious/heavy bids, wins, and spend. A no-win follow week contributes $0 winning spend but remains visible rather than disappearing.",
      implication:
        "Use this only as a budget-monitoring cue; do not reduce forecasts mechanically after a win.",
      unknowns:
        "Continue the same manager-linked table with exact weekly snapshots, remaining-FAAB-normalized bid amount, same-position activity, and explicit no-claim outcomes.",
    },
  ];
  return {
    generatedFor:
      "SeaMex 2026 • evidence through exact app Week 5 / Sleeper decision Week 4",
    questions,
    directRows,
    tierRows: tierRows(reconstructed, exact),
    ladderRows: ladderRows(reconstructed, exact),
    likelihoodBands: exact.likelihoodBands,
    outcomeDefinitions: exact.outcomeDefinitions,
    longitudinalRows: longitudinal,
    winnerHistoryRows: winnerHistory,
    exact,
    reconstructed,
    ...(prewaiverPanel ? { prewaiverPanel } : {}),
    headlineMetrics: {
      topClaimN: topClaims.length,
      middleClaimN: middleClaims.length,
      topClaimMae: mae(topClaims),
      middleClaimMae: mae(middleClaims),
      nextWeekObserved: reduction.observed,
      nextWeekReduced: reduction.reduced,
    },
  };
}

export function priorAccuracyRows(model: OwnerDecisionReportModel): Array<{
  label: string;
  n: number;
  mae: number;
  bias: number;
  rawR2: number | null;
}> {
  const { usable } = enrichEvents(model.reconstructed);
  const definitions: Array<[string, (event: EnrichedEvent) => number]> = [
    ["Max VORP", (event) => event.suggestions["max-vorp"]],
    ["Current VORP", (event) => event.suggestions.vorp],
    ["Legacy Aggressive", (event) => event.suggestions.aggressive],
  ];
  return definitions.map(([label, prediction]) => {
    const rows: EvaluatedBid[] = usable
      .filter((event) => !event.token)
      .map((event) => ({
        eventId: event.event,
        clusterId: `${event.decisionWeek}:${event.batch}:${event.player}`,
        strategy: label,
        actual: event.actualBid,
        predicted: prediction(event),
        originalFaab: model.reconstructed.league.initialFaab,
        preBidFaab: event.preBidFaab,
      }));
    const metrics = computeErrorMetrics(rows)!;
    const actualMean =
      rows.reduce((sum, row) => sum + row.actual, 0) / rows.length;
    const sst = rows.reduce(
      (sum, row) => sum + (row.actual - actualMean) ** 2,
      0,
    );
    const sse = rows.reduce(
      (sum, row) => sum + (row.actual - row.predicted) ** 2,
      0,
    );
    return {
      label,
      n: rows.length,
      mae: metrics.mae,
      bias: metrics.signedBias,
      rawR2: sst ? 1 - sse / sst : null,
    };
  });
}
