import { spawnSync } from "node:child_process";
import { constants } from "node:fs";
import { access, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  STRATEGIES,
  enrichEvents,
  evaluationRows,
  type AnalysisFixture,
  type EnrichedEvent,
} from "./analyze-bidding-strategies.ts";
import {
  bootstrapMaeInterval,
  computeErrorMetrics,
  flagIsolatedOutliers,
} from "./bidding-strategy-analysis.ts";
import {
  buildWeeklyMarketAnalysis,
  MARKET_STRATEGIES,
} from "./weekly-market-analysis.ts";
import {
  buildOwnerDecisionReport,
  priorAccuracyRows,
  selectTopAndMiddleRows,
  stableSha256,
  type ExactAuditFixture,
  type OwnerDecisionReportModel,
  type QuestionSection,
} from "./owner-decision-report.ts";
import type { PrewaiverPanel } from "./prewaiver-capture.ts";

const RECONSTRUCTED_FIXTURE_PATH =
  "scripts/fixtures/bidding-strategy-seamex-2026.json";
const EXACT_FIXTURE_PATH = "scripts/fixtures/bidding-owner-decision-week5.json";
const HTML_PATH = "docs/analysis/bidding-strategy-accuracy-seamex-2026.html";
const MARKDOWN_PATH = "docs/analysis/bidding-strategy-accuracy-seamex-2026.md";
const PDF_PATH = "docs/analysis/bidding-strategy-accuracy-seamex-2026.pdf";

const escapeHtml = (value: string | number): string =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
const money = (value: number | null, digits = 0): string =>
  value == null ? "—" : `$${value.toFixed(digits)}`;
const pct = (numerator: number, denominator: number): string =>
  denominator ? `${((100 * numerator) / denominator).toFixed(1)}%` : "—";
const number = (value: number | null, digits = 2): string =>
  value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);

export function rSquared(
  rows: Array<{ actual: number; predicted: number }>,
): number | null {
  if (rows.length < 2) return null;
  const mean = rows.reduce((sum, row) => sum + row.actual, 0) / rows.length;
  const sst = rows.reduce((sum, row) => sum + (row.actual - mean) ** 2, 0);
  const sse = rows.reduce(
    (sum, row) => sum + (row.actual - row.predicted) ** 2,
    0,
  );
  return sst ? 1 - sse / sst : null;
}

const STRATEGY_FORMULAS: Array<[string, string]> = [
  [
    "Max VORP",
    "VORP-calibrated dollar value at the player-specific future active-team stage that maximizes value.",
  ],
  [
    "Middle VORP",
    "VORP-calibrated dollar value at one shared horizon: max(4, ceil(active teams / 2)).",
  ],
  [
    "Current-team VoRP",
    "VORP-calibrated dollar value at the current active-team count.",
  ],
  [
    "Corrected Safe",
    "round(0.2 × position weight × positional premium × available budget); premium is 1.25 for rank 1, otherwise 1.1 × (replacement rank − rank) / (replacement rank − 1), floored at 0.",
  ],
  [
    "Corrected Weeks as Starter",
    "Corrected Safe × projected starter weeks / weeks remaining, rounded and floored at 0.",
  ],
  [
    "Legacy Safe / Aggressive / Weeks as Starter",
    "Archived production outputs replayed from the same snapshot by buildWaiverBoard; no post-outcome refit.",
  ],
];

interface PriorSensitivityRow {
  label: string;
  n: number;
  metrics: Array<{ label: string; mae: number }>;
}

function priorSensitivityRows(
  model: OwnerDecisionReportModel,
): PriorSensitivityRow[] {
  const { usable } = enrichEvents(model.reconstructed);
  const budget = model.reconstructed.league.initialFaab;
  const wins = usable.filter((event) => event.outcome === "won");
  const seriousWins = wins.filter((event) => !event.token);
  const clusterKey = (event: EnrichedEvent): string =>
    `${event.decisionWeek}:${event.batch}:${event.player}`;
  const flags = flagIsolatedOutliers(
    usable.map((event) => ({
      eventId: event.event,
      clusterId: clusterKey(event),
      actualBid: event.actualBid,
      originalFaab: budget,
    })),
  );
  const subsets: Array<[string, EnrichedEvent[]]> = [
    ["All usable winning bids", wins],
    ["Non-token winning bids", seriousWins],
    [
      "Non-token; ratio-gap flag removed",
      seriousWins.filter((event) => !flags.ratioGap.has(event.event)),
    ],
    [
      "Non-token; MAD flag removed",
      seriousWins.filter((event) => !flags.mad.has(event.event)),
    ],
    [
      "Non-token; IQR flag removed",
      seriousWins.filter((event) => !flags.iqr.has(event.event)),
    ],
  ];
  return subsets.map(([label, events]) => ({
    label,
    n: events.length,
    metrics: STRATEGIES.map(([id, strategyLabel]) => {
      const metrics = computeErrorMetrics(evaluationRows(events, id, budget));
      if (!metrics)
        throw new Error(
          `Missing prior sensitivity metrics for ${strategyLabel}`,
        );
      return { label: strategyLabel, mae: metrics.mae };
    }),
  }));
}

function priorWeeklyAnalysis(model: OwnerDecisionReportModel) {
  return buildWeeklyMarketAnalysis(enrichEvents(model.reconstructed).usable);
}

function priorWinnerBootstrapRows(model: OwnerDecisionReportModel) {
  const wins = enrichEvents(model.reconstructed).usable.filter(
    (event) => event.outcome === "won",
  );
  const budget = model.reconstructed.league.initialFaab;
  return STRATEGIES.map(([id, label]) => {
    const rows = evaluationRows(wins, id, budget);
    const metrics = computeErrorMetrics(rows);
    if (!metrics) throw new Error(`Missing prior winner metrics for ${label}`);
    return {
      label,
      n: metrics.n,
      mae: metrics.mae,
      interval: bootstrapMaeInterval(rows),
    };
  });
}

function badge(value: QuestionSection["badge"]): string {
  const slug = value.toLowerCase().replaceAll(" ", "-");
  return `<span class="badge badge-${slug}">${escapeHtml(value)}</span>`;
}

function table(headers: string[], rows: string[][], className = ""): string {
  return `<div class="table-wrap"><table class="${className}"><thead><tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell, index) => (index === 0 ? `<th scope="row">${cell}</th>` : `<td>${cell}</td>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function formatLineageClass(key: string): string {
  if (/^exact/i.test(key)) {
    const suffix = key
      .replace(/^exact/i, "")
      .replaceAll(/([A-Z])/g, " $1")
      .trim();
    return suffix ? `Exact ${suffix}` : "Exact";
  }
  if (/^reconstructed/i.test(key)) {
    const suffix = key
      .replace(/^reconstructed/i, "")
      .replaceAll(/([A-Z])/g, " $1")
      .trim();
    return suffix ? `Reconstructed ${suffix}` : "Reconstructed";
  }
  return key.replaceAll(/([A-Z])/g, " $1").trim() || "Lineage";
}

function lineageRows(model: OwnerDecisionReportModel): string[][] {
  const lineage = model.exact.lineage as Record<string, unknown>;
  const rows: string[][] = [];
  for (const [key, value] of Object.entries(lineage)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (!item || typeof item !== "object") continue;
        const artifact = (item as { artifact?: unknown }).artifact;
        const sha256 = (item as { sha256?: unknown }).sha256;
        if (
          typeof artifact === "string" &&
          typeof sha256 === "string" &&
          !artifact.includes("bidding-strategy-seamex-2026.json")
        ) {
          rows.push([
            escapeHtml(artifact),
            formatLineageClass(key),
            `<code>${escapeHtml(sha256)}</code>`,
          ]);
        }
      }
      continue;
    }
    if (value && typeof value === "object") {
      const artifact = (value as { artifact?: unknown }).artifact;
      const sha256 = (value as { sha256?: unknown }).sha256;
      if (
        typeof artifact === "string" &&
        typeof sha256 === "string" &&
        !artifact.includes("bidding-strategy-seamex-2026.json")
      ) {
        rows.push([
          escapeHtml(artifact),
          formatLineageClass(key),
          `<code>${escapeHtml(sha256)}</code>`,
        ]);
      }
    }
  }
  const exactWeeks = model.reconstructed.snapshots
    .filter((snapshot) => snapshot.provenance === "exact")
    .map((snapshot) => snapshot.requestedDecisionWeek)
    .sort((a, b) => a - b);
  const reconstructedWeeks = model.reconstructed.snapshots
    .filter((snapshot) => snapshot.provenance === "reconstructed")
    .map((snapshot) => snapshot.requestedDecisionWeek)
    .sort((a, b) => a - b);
  rows.push([
    "bidding-strategy-seamex-2026.json",
    `Canonical market fixture: reconstructed W${reconstructedWeeks.join(", W")}; exact W${exactWeeks.join(", W")}`,
    `<code>${stableSha256(model.reconstructed)}</code>`,
  ]);
  return rows;
}

function renderCalibrationVisual(model: OwnerDecisionReportModel): string {
  const points = model.calibrationVisual.points;
  if (points.length < 2)
    return `<div class="empty-state"><strong>Not enough evidence.</strong><p>Calibration visual requires at least two immutable winner rows.</p></div>`;

  const maxWinner = Math.max(...points.map((point) => point.winner));
  const safePoints = points.filter((point) => point.safe > 0);
  const weeksPoints = points.filter((point) => point.decayedWeeksBase >= 0);
  const maxSafe = Math.max(...safePoints.map((point) => point.safe));
  const maxWeeks = Math.max(
    ...weeksPoints.map((point) => point.decayedWeeksBase),
    1,
  );
  const width = 1100;
  const height = 420;
  const panelWidth = 500;
  const panelHeight = 320;
  const leftPadding = 60;
  const bottomPadding = 42;
  const topPadding = 26;
  const rightPadding = 20;

  const xFor = (value: number, panelIndex: number, xMax: number): number => {
    const panelStart = panelIndex === 0 ? 0 : 560;
    return (
      panelStart +
      leftPadding +
      (value / xMax) * (panelWidth - leftPadding - rightPadding)
    );
  };
  const yFor = (value: number): number =>
    topPadding +
    (1 - value / maxWinner) * (panelHeight - topPadding - bottomPadding);

  const linePoint = (x: number, y: number): string =>
    `${x.toFixed(2)},${y.toFixed(2)}`;
  const safeFit = model.calibrationVisual.safeFit;
  const safeLine = [0, maxSafe]
    .map((x) => {
      const y = Math.max(
        0,
        Math.min(maxWinner, safeFit.intercept + safeFit.slope * x),
      );
      return linePoint(xFor(x, 0, maxSafe), yFor(y));
    })
    .join(" ");

  const lineForSlope = (
    slope: number,
    color: string,
    dash: string,
    label: string,
  ): string => {
    const y = Math.max(0, Math.min(maxWinner, slope * maxWeeks));
    const pointsText = `${linePoint(xFor(0, 1, maxWeeks), yFor(0))} ${linePoint(xFor(maxWeeks, 1, maxWeeks), yFor(y))}`;
    return `<polyline points="${pointsText}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="${dash}" /><text x="${xFor(maxWeeks, 1, maxWeeks) - 4}" y="${yFor(y) - 6}" text-anchor="end" font-size="11" fill="${color}">${escapeHtml(label)}</text>`;
  };

  const dots = points
    .map((point) => {
      const fill = point.provenance === "Exact" ? "#0a6c70" : "#7d8a90";
      const safeX = xFor(point.safe, 0, maxSafe);
      const weekX = xFor(point.decayedWeeksBase, 1, maxWeeks);
      const y = yFor(point.winner);
      return (
        `<circle cx="${safeX.toFixed(2)}" cy="${y.toFixed(2)}" r="4" fill="${fill}" />` +
        `<circle cx="${weekX.toFixed(2)}" cy="${y.toFixed(2)}" r="4" fill="${fill}" />`
      );
    })
    .join("");

  return `<div class="table-wrap"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Two-panel calibration visual: Safe versus winner and decayed Weeks base versus winner">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
  <text x="60" y="18" font-size="14" font-weight="700" fill="#123047">Safe value vs canonical winner</text>
  <text x="620" y="18" font-size="14" font-weight="700" fill="#123047">Decayed Weeks-as-Starter base vs canonical winner</text>

  <line x1="${xFor(0, 0, maxSafe)}" y1="${yFor(0)}" x2="${xFor(maxSafe, 0, maxSafe)}" y2="${yFor(0)}" stroke="#6c7b82" />
  <line x1="${xFor(0, 0, maxSafe)}" y1="${yFor(0)}" x2="${xFor(0, 0, maxSafe)}" y2="${yFor(maxWinner)}" stroke="#6c7b82" />
  <line x1="${xFor(0, 1, maxWeeks)}" y1="${yFor(0)}" x2="${xFor(maxWeeks, 1, maxWeeks)}" y2="${yFor(0)}" stroke="#6c7b82" />
  <line x1="${xFor(0, 1, maxWeeks)}" y1="${yFor(0)}" x2="${xFor(0, 1, maxWeeks)}" y2="${yFor(maxWinner)}" stroke="#6c7b82" />

  <polyline points="${safeLine}" fill="none" stroke="#123047" stroke-width="2.5" />
  ${lineForSlope(2, "#0a6c70", "6 4", "2×")}
  ${lineForSlope(2.5, "#704700", "", "2.5×")}
  ${lineForSlope(3, "#8a2f2f", "4 3", "3×")}
  ${lineForSlope(model.calibrationVisual.weeksFitSlope, "#123047", "", `fitted ${model.calibrationVisual.weeksFitSlope.toFixed(2)}×`)}
  ${dots}

  <text x="${xFor(maxSafe, 0, maxSafe)}" y="${yFor(0) + 20}" text-anchor="end" font-size="11" fill="#58666d">Safe value</text>
  <text x="${xFor(maxWeeks, 1, maxWeeks)}" y="${yFor(0) + 20}" text-anchor="end" font-size="11" fill="#58666d">Decayed Weeks base</text>
  <text x="16" y="${yFor(maxWinner)}" transform="rotate(-90,16,${yFor(maxWinner)})" font-size="11" fill="#58666d">Canonical winner</text>

  <rect x="330" y="360" width="12" height="12" fill="#0a6c70" /><text x="346" y="370" font-size="11" fill="#58666d">Exact points</text>
  <rect x="430" y="360" width="12" height="12" fill="#7d8a90" /><text x="446" y="370" font-size="11" fill="#58666d">Reconstructed points</text>
</svg></div><p class="note">All distinct auctions are retained, including zero-model/high-price outliers. Lines are descriptive calibration aids, not production recommendations.</p>`;
}

function compactExactCoefficientRows(model: OwnerDecisionReportModel) {
  return model.coefficientSensitivity.filter(
    (row) =>
      row.scope.startsWith("Canonical exact decision W") && row.tier === "All",
  );
}

function sectionExtra(
  model: OwnerDecisionReportModel,
  numberValue: number,
): string {
  if (numberValue === 1) {
    const targets = [...model.exact.targets]
      .sort((a, b) => b.maxVorp - a.maxVorp || a.alias.localeCompare(b.alias))
      .slice(0, 3);
    const targetDeclaration = table(
      ["Pre-auction rank", "Target alias", "Max VORP", "Tie-break"],
      targets.map((target) => [
        String(target.maxVorpRank),
        escapeHtml(target.alias),
        money(target.maxVorp),
        "Stable alias ascending after Max VORP",
      ]),
    );
    const direct = table(
      [
        "Target",
        "Cohort",
        "Manager",
        "Likelihood",
        "Predicted",
        "Pre-waiver FAAB",
        "Feasible / capped",
        "Actual",
        "Status / contingency provenance",
        "Defined error",
        "Censoring",
      ],
      model.directRows.map((row) => [
        escapeHtml(row.target),
        escapeHtml(row.cohort),
        escapeHtml(row.manager),
        escapeHtml(row.likelihood),
        money(row.predicted),
        money(row.preWaiverFaab),
        money(row.feasiblePrediction),
        row.actualKind === "non-bid"
          ? "<strong>Explicit non-bid</strong> (not $0)"
          : money(row.actualAmount),
        `${escapeHtml(row.status)}; ${escapeHtml(row.claimClass)}; ${row.claimCount} raw claim${row.claimCount === 1 ? "" : "s"}; ${row.additionalSameManagerClaims} alternative${row.additionalSameManagerClaims === 1 ? "" : "s"}; ${row.rosterFullClaimCount} roster-full; ${row.includedInClearingCompetition ? "clearing-eligible" : escapeHtml(row.exclusionReason ?? "not clearing-eligible")}`,
        row.absoluteError == null
          ? "Not scored"
          : `${row.signedError! >= 0 ? "+" : ""}${money(row.signedError)} signed; ${money(row.absoluteError)} absolute`,
        row.budgetCensored
          ? `Yes: ${money(row.predicted)} → ${money(row.feasiblePrediction)}`
          : "No",
      ]),
      "direct-rows",
    );
    return `<h3>Declared top three before outcomes</h3><p class="note">Selection: ${escapeHtml(model.exact.selectionRule)}</p>${targetDeclaration}<h3>30 direct manager-target rows</h3><p class="note">Cohorts: ${escapeHtml(model.exact.middleFiveRule)} Error = predicted bid − explicit submitted amount. Claim-only MAE is descriptive. Non-bids have no amount and no error.</p>${direct}<h3>Retained forecast-band scorecard</h3>${table(
      ["Band", "Target", "Tier", "n", "MAE", "Bias", "Coverage", "Provenance"],
      model.forecastBandScores.map((row) => [
        escapeHtml(row.band),
        escapeHtml(row.target),
        escapeHtml(row.tier),
        String(row.n),
        money(row.mae, 1),
        money(row.bias, 1),
        `${(row.coverage * 100).toFixed(1)}%`,
        escapeHtml(row.provenance),
      ]),
    )}<p class="note">Median/high bands were not retained and are not backfilled. Full scoring mechanics remain in the appendices.</p>`;
  }
  if (numberValue === 2) {
    const defs = model.outcomeDefinitions;
    const find = (name: string) =>
      model.likelihoodBands.find((row) => row.band === name)!;
    const separation = (
      row: (typeof model.likelihoodBands)[number],
    ): string => {
      const reference =
        row.band === "Top 25%"
          ? find("Bottom 25%")
          : row.band === "Top 10%"
            ? find("Bottom 10%")
            : ["Likely", "Possible"].includes(row.band)
              ? find("Unlikely")
              : null;
      return reference
        ? `${(100 * (row.claim / row.n - reference.claim / reference.n)).toFixed(1)} pp claim-rate`
        : "Reference";
    };
    return (
      `<p class="note"><strong>Opportunity and censoring:</strong> denominators are manager-target opportunities, not only submitted claims. Pre-waiver FAAB bounds feasible spend; a non-claim does not reveal whether budget, roster capacity, or preference caused the outcome. This all-opportunity table is not a budget-feasible-only calibration.</p>` +
      table(
        [
          "Band",
          "n",
          "Any claim",
          "Positive",
          "≥ Max",
          "≥ Safe",
          "≥ serious median",
          "≥ observed minimum",
          "Heavy",
          "Top-quartile amount",
          "Calibration",
          "Separation",
        ],
        model.likelihoodBands.map((row) => [
          escapeHtml(row.band),
          String(row.n),
          `${row.claim} (${pct(row.claim, row.n)})`,
          `${row.positive} (${pct(row.positive, row.n)})`,
          `${row.max} (${pct(row.max, row.n)})`,
          `${row.safe} (${pct(row.safe, row.n)})`,
          `${row.serious} (${pct(row.serious, row.n)})`,
          `${row.minimum} (${pct(row.minimum, row.n)})`,
          `${row.heavy} (${pct(row.heavy, row.n)})`,
          `${row.topQuartile} (${pct(row.topQuartile, row.n)})`,
          "No numeric probability retained",
          separation(row),
        ]),
      ) +
      `<details><summary>Outcome definitions</summary><ul>${Object.entries(defs)
        .map(
          ([key, value]) =>
            `<li><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</li>`,
        )
        .join(
          "",
        )}</ul><p>Calibration cannot be computed from ordinal labels without preregistered numeric probabilities. Separation is descriptive claim-rate percentage-point difference versus Unlikely or the matched bottom extreme.</p></details>`
    );
  }
  if (numberValue === 3) {
    return table(
      [
        "Manager",
        "Anchor",
        "Following week",
        "Raw / canonical",
        "Serious / heavy",
        "Wins / spend / max",
        "Normalized activity",
        "Same-position",
        "Budget censoring",
        "Latest-week behavior",
        "Provenance",
      ],
      model.longitudinalRows.map((row) => [
        escapeHtml(row.manager),
        `W${row.anchorWeek} win ${money(row.anchorSpend)}`,
        row.followWeek == null
          ? "No observed follow week"
          : `W${row.followWeek}`,
        `${row.rawClaims} / ${row.canonicalClaims}`,
        `${row.seriousBids} / ${row.heavyBids}`,
        `${row.wins} / ${money(row.totalSpend)} / ${money(row.maxBid)}`,
        `${(row.startFaabShare * 100).toFixed(1)}% bid volume / starting FAAB; ${row.remainingFaabShare == null ? "—" : `${(row.remainingFaabShare * 100).toFixed(1)}% mean bid / pre-bid FAAB`}`,
        String(row.samePositionClaims),
        escapeHtml(row.budgetCensored),
        `W${row.latestWeek}: ${escapeHtml(row.latestActivity)}`,
        escapeHtml(row.provenance),
      ]),
    );
  }
  if (numberValue === 4) {
    const exactW5 = compactExactCoefficientRows(model);
    return `<p class="note"><strong>Do not pool these views:</strong> reconstructed decision-week and exact app-week views of the same auction remain separate. A runner-up proxy is derived as observed minimum − $1 because no independent exact runner-up identity/value was retained.</p>${table(
      [
        "Scope",
        "Tier",
        "Boundary",
        "winner n",
        "minimum / runner-up n",
        "Median winner / Aggressive",
        "Q1–Q3",
        "MAE vs winner",
        "MAE vs minimum",
        "MAE vs runner-up proxy",
      ],
      model.tierRows.map((row) => [
        escapeHtml(row.scope),
        escapeHtml(row.tier),
        escapeHtml(row.boundary),
        String(row.n),
        `${row.minimumProxyN} / ${row.runnerUpProxyN}`,
        number(row.medianWinnerOverAggressive),
        `${number(row.q25)}–${number(row.q75)}`,
        money(row.winnerMae, 1),
        money(row.minimumProxyMae, 1),
        money(row.runnerUpProxyMae, 1),
      ]),
    )}<h3>Exact decision-W5 fixed-coefficient check</h3>${table(
      ["Target", "c", "n", "MAE", "Bias", "Coverage"],
      exactW5.map((row) => [
        escapeHtml(row.target),
        number(row.coefficient, 1),
        String(row.n),
        money(row.mae, 1),
        money(row.bias, 1),
        row.coverage == null ? "—" : `${(row.coverage * 100).toFixed(1)}%`,
      ]),
    )}<p class="note">This compact held-out check is analysis-only. The exhaustive coefficient × target × tier × sensitivity table is in Appendix C; production defaults are unchanged.</p>`;
  }
  if (numberValue === 5) {
    return `${renderCalibrationVisual(model)}<p class="note">The chart uses each canonical auction once and preserves each point’s exact/reconstructed provenance. Held-out curve claims remain gated until multiple immutable exact-prior → exact-later pairs exist.</p>`;
  }
  if (numberValue === 6) {
    return table(
      [
        "Auction label",
        "Provenance",
        "#1",
        "#2",
        "#3",
        "#4",
        "#5",
        "Starting-FAAB shares",
        "Context",
      ],
      model.ladderRows.map((row) => [
        escapeHtml(row.weekLabel),
        escapeHtml(row.provenance),
        ...[0, 1, 2, 3, 4].map((index) => money(row.bids[index] ?? null)),
        row.startingFaabShares
          .map((share) => `${(share * 100).toFixed(1)}%`)
          .join(" · "),
        escapeHtml(row.context),
      ]),
    );
  }
  if (numberValue === 7) {
    const rawClaims = model.exact.managerSummaries.reduce(
      (sum, row) => sum + row.rawClaims,
      0,
    );
    const canonicalClaims = model.exact.managerSummaries.reduce(
      (sum, row) => sum + row.canonicalClaims,
      0,
    );
    const alternatives = model.exact.managerSummaries.reduce(
      (sum, row) => sum + row.alternatives,
      0,
    );
    return `<div class="stat-grid"><div><strong>${rawClaims}</strong><span>raw claims</span></div><div><strong>${canonicalClaims}</strong><span>unique manager-target pairs</span></div><div><strong>${alternatives}</strong><span>extra alternatives</span></div><div><strong>${number(model.claimDistribution.spearmanClaimsVsWins, 2)} / ${number(model.claimDistribution.spearmanClaimsVsSpend, 2)}</strong><span>Spearman ρ claims→wins / spend</span></div></div>${table(
      [
        "Manager",
        "Raw",
        "Canonical / targets",
        "Alternatives",
        "Positive / heavy",
        "Wins / spend",
        "Roster-full",
      ],
      model.exact.managerSummaries.map((row) => [
        escapeHtml(row.manager),
        String(row.rawClaims),
        `${row.canonicalClaims} / ${row.targetCount}`,
        String(row.alternatives),
        `${row.positiveClaims} / ${row.heavyClaims}`,
        `${row.wins} / ${money(row.winningSpend)}`,
        String(row.rosterFullClaims),
      ]),
    )}<h3>Claims-per-manager distribution — ${escapeHtml(model.claimDistribution.scope)}</h3>${table(
      ["Metric", "Min", "P25", "Median", "P75", "P90", "Max"],
      model.claimDistribution.quantiles.map((row) => [
        escapeHtml(row.metric),
        number(row.minimum, 1),
        number(row.q25, 1),
        number(row.median, 1),
        number(row.q75, 1),
        number(row.q90, 1),
        number(row.maximum, 1),
      ]),
    )}<h3>Relation to wins/spend (descriptive)</h3>${table(
      [
        "Group",
        "Managers",
        "Mean canonical claims",
        "Median canonical claims",
        "Total wins",
        "Total winning spend",
      ],
      model.claimDistribution.relations.map((row) => [
        escapeHtml(row.group),
        String(row.managers),
        number(row.meanCanonicalClaims, 2),
        number(row.medianCanonicalClaims, 2),
        String(row.wins),
        money(row.winningSpend, 0),
      ]),
    )}<p class="note"><strong>Cumulative context:</strong> ${escapeHtml(model.claimDistribution.cumulativeContext)}</p><p class="note">A canonical claim is one manager-target competitive path after duplicate/alternative classification. Zero-dollar token claims, explicit roster-full failures, and unknown contingencies remain distinct and are never converted into clearing bids.</p>`;
  }
  if (numberValue === 8) {
    return table(
      [
        "Requested need slice",
        "Available n",
        "Participation",
        "Conditional amount",
        "Status / required control",
      ],
      [
        ["Top 10%", "0", "—", "—", "Need snapshot absent"],
        ["Bottom 10%", "0", "—", "—", "Need snapshot absent"],
        ["Top 25%", "0", "—", "—", "Need snapshot absent"],
        ["Bottom 25%", "0", "—", "—", "Need snapshot absent"],
        [
          "Week 5 WR / QB, target >$10",
          "0 valid linked rows",
          "—",
          "—",
          "Capture position-specific need plus value, FAAB, injuries/byes, and prior acquisitions",
        ],
      ],
    );
  }
  if (numberValue === 9) {
    return table(
      [
        "Week",
        "Top winner",
        "Winning spend",
        "Winner provenance",
        "Prior-week history / provenance",
        "Next-week history / provenance",
      ],
      model.winnerHistoryRows.map((row) => [
        `W${row.week}`,
        escapeHtml(row.manager),
        money(row.winningSpend),
        escapeHtml(row.currentProvenance),
        `${escapeHtml(row.prior)}<br><small>${escapeHtml(row.priorProvenance)}</small>`,
        `${escapeHtml(row.next)}<br><small>${escapeHtml(row.nextProvenance)}</small>`,
      ]),
    );
  }
  return "";
}

function renderQuestion(
  model: OwnerDecisionReportModel,
  question: QuestionSection,
): string {
  return `<section class="question" data-question-number="${question.number}" aria-labelledby="question-${question.number}"><header><p class="eyebrow">Question ${question.number} of 9</p><h2 id="question-${question.number}">${question.number}. ${escapeHtml(question.title)}</h2>${badge(question.badge)}</header><div class="answer-flow"><div data-part="direct-answer"><h3>Direct answer</h3><p>${escapeHtml(question.directAnswer)}</p></div><div data-part="key-evidence"><h3>Key evidence / n</h3><p class="key-number">${escapeHtml(question.keyNumber)}</p><p>${escapeHtml(question.evidence)}</p></div><div data-part="practical-implication"><h3>Practical implication</h3><p>${escapeHtml(question.implication)}</p></div><div data-part="unknowns-next-data"><h3>Unknowns / next exact data</h3><p>${escapeHtml(question.unknowns)}</p></div></div>${sectionExtra(model, question.number)}</section>`;
}

function appendices(model: OwnerDecisionReportModel): string {
  const prior = priorAccuracyRows(model);
  const sensitivity = priorSensitivityRows(model);
  const winnerBootstrap = priorWinnerBootstrapRows(model);
  const weekly = priorWeeklyAnalysis(model);
  const ownerStrategyIds = new Set([
    "max-vorp",
    "vorp",
    "corrected-safe",
    "corrected-weeks-starter",
  ]);
  const exclusionViews = [
    ["Without privacy-safe owner-directed marker", weekly.ownerDirected],
    ["With marked target retained", weekly.withExcludedTarget],
  ] as const;
  const bands = model.exact.targets.map((target) => [
    escapeHtml(target.alias),
    String(target.maxVorpRank),
    money(target.winningBid),
    "Not retained",
    "Not retained",
    money(target.topCredible),
    money(target.topAll),
    target.winningBid == null
      ? "—"
      : money(Math.abs(target.topCredible - target.winningBid)),
    target.winningBid == null
      ? "—"
      : money(Math.abs(target.topAll - target.winningBid)),
  ]);
  const lineage = lineageRows(model);
  const exactPairCount = model.exactHeldOutPairs;
  return `<section class="appendix" aria-labelledby="appendix-my-team"><h2 id="appendix-my-team">Appendix A — My team this week</h2><div class="team-card"><p><strong>Outcome:</strong> one premium acquisition for $187 from $499 pre-waiver FAAB, leaving $312.</p><p><strong>Process:</strong> 8 raw claims became 7 canonical claims. Three later claims were explicitly roster-full; that is sequencing evidence, not $0 competition.</p><p><strong>Decision:</strong> the $187 acquisition cleared the $159 observed-minimum proxy and stayed below the $244 top-credible audit estimate. Preserve FAAB; fix contingency/drop paths before the next run.</p><p><strong>Unknown:</strong> optimized lineup, injury risk, and remaining positional holes are not present in the privacy-safe evidence.</p></div></section>
<section class="appendix" aria-labelledby="appendix-methods"><h2 id="appendix-methods">Appendix B — Methods, formulas, and scoreability</h2><ul><li><strong>Signed error:</strong> prediction − explicit submitted amount. Positive means overprediction.</li><li><strong>MAE:</strong> mean absolute error over scoreable explicit claims only. Non-bids and unknown amounts are excluded, never coded as $0.</li><li><strong>Raw prediction R²:</strong> 1 − SSE/SST on unrefit predictions; it may be negative and is not fitted regression goodness-of-fit.</li><li><strong>Fitted R²:</strong> belongs only to a declared fitted model. No exact nonlinear model is fit here.</li><li><strong>Bootstrap:</strong> prior report used deterministic cluster-aware resampling. Later exact scoring instances after reconstructed training = ${exactPairCount}; exact-prior → exact-later pair count = 0, so exact confidence intervals are not promoted.</li><li><strong>FAAB censoring:</strong> feasible prediction = min(prediction, pre-waiver FAAB). Capacity and willingness remain separate.</li></ul>${table(["Target", "Max-VORP rank", "Winner", "Median band", "High band", "Top credible", "Top all", "Top-credible AE", "Top-all AE"], bands)}<p class="note">Median/high bands were not retained as deterministic privacy-safe slices and are not backfilled. Top-credible/top-all are scored because their pre-waiver values and exact winners were retained.</p></section>
<section class="appendix" aria-labelledby="appendix-prior"><h2 id="appendix-prior">Appendix C — Prior reconstructed accuracy and full sensitivities</h2><h3>Coefficient sensitivity (analysis-only)</h3>${table(
    [
      "Scope",
      "Provenance",
      "Tier",
      "Target",
      "c",
      "n",
      "MAE",
      "Bias",
      "Coverage",
      "Validation",
    ],
    model.coefficientSensitivity.map((row) => [
      escapeHtml(row.scope),
      escapeHtml(row.provenance),
      escapeHtml(row.tier),
      escapeHtml(row.target),
      number(row.coefficient, 1),
      String(row.n),
      money(row.mae, 1),
      money(row.bias, 1),
      row.coverage == null || !Number.isFinite(row.coverage)
        ? "—"
        : `${(row.coverage * 100).toFixed(1)}%`,
      escapeHtml(row.validation),
    ]),
  )}<h3>Retained forecast-band scoring</h3>${table(
    ["Band", "Target", "Tier", "n", "MAE", "Bias", "Coverage", "Provenance"],
    model.forecastBandScores.map((row) => [
      escapeHtml(row.band),
      escapeHtml(row.target),
      escapeHtml(row.tier),
      String(row.n),
      money(row.mae, 1),
      money(row.bias, 1),
      `${(row.coverage * 100).toFixed(1)}%`,
      escapeHtml(row.provenance),
    ]),
  )}<h3>Strategy formulas retained from the prior report</h3>${table(
    ["Strategy", "Deterministic definition"],
    STRATEGY_FORMULAS.map(([label, formula]) => [
      escapeHtml(label),
      escapeHtml(formula),
    ]),
  )}${table(
    ["Baseline", "n serious bids", "MAE", "Signed bias", "Raw prediction R²*"],
    prior.map((row) => [
      escapeHtml(row.label),
      String(row.n),
      money(row.mae, 1),
      money(row.bias, 1),
      number(row.rawR2, 3),
    ]),
  )}<h3>Full predeclared winning-bid sensitivity</h3>${table(
    [
      "Sensitivity case",
      "n wins",
      ...STRATEGIES.map(([, label]) => `${label} MAE`),
    ],
    sensitivity.map((row) => [
      escapeHtml(row.label),
      String(row.n),
      ...row.metrics.map((metric) => money(metric.mae, 1)),
    ]),
  )}<h3>Deterministic cluster-bootstrap check</h3>${table(
    ["Strategy", "n wins", "MAE", "95% cluster-bootstrap MAE CI"],
    winnerBootstrap.map((row) => [
      escapeHtml(row.label),
      String(row.n),
      money(row.mae, 1),
      row.interval
        ? `${money(row.interval[0], 1)}–${money(row.interval[1], 1)}`
        : "—",
    ]),
  )}<p class="note">Intervals use 2,000 deterministic resamples (seed 20260927) of player × processing-batch clusters, preserving correlated win/loss claims. They describe sampling variation in the reconstructed data and do not repair projection-history error.</p><h3>Privacy-safe owner-directed exclusion sensitivity</h3>${table(
    [
      "View",
      "Serious-market clusters",
      "Closest",
      ...MARKET_STRATEGIES.filter(([id]) => ownerStrategyIds.has(id)).map(
        ([, label]) => `${label} MAE`,
      ),
    ],
    exclusionViews.map(([label, view]) => {
      const overall = view.marketMetrics.find((row) => row.week == null)!;
      return [
        escapeHtml(label),
        String(overall.seriousMedianClusters),
        escapeHtml(overall.closest ?? "—"),
        ...overall.metrics
          .filter((metric) => ownerStrategyIds.has(metric.id))
          .map((metric) => money(metric.mae, 1)),
      ];
    }),
  )}<h3>Prior-week-fitted held-out scale checks</h3>${table(
    [
      "Observation",
      "Strategy",
      "Fit→test",
      "Prior median scale",
      "test n",
      "MAE",
      "Bias",
      "Raw held-out R²*",
      "Spearman ρ",
    ],
    (
      [
        ["Winner", weekly.ownerDirected.heldOutScaleMetrics.winning],
        [
          "Serious-market median",
          weekly.ownerDirected.heldOutScaleMetrics.seriousMedian,
        ],
      ] as const
    ).flatMap(([observation, rows]) =>
      rows
        .filter((row) => ownerStrategyIds.has(row.id))
        .map((row) => [
          observation,
          escapeHtml(row.label),
          `W${row.fitWeek}→W${row.testWeek}`,
          number(row.fittedMultiplier, 3),
          String(row.n),
          money(row.mae, 1),
          money(row.signedBias, 1),
          number(row.rSquared, 2),
          number(row.spearman, 2),
        ]),
    ),
  )}<p class="note"><strong>Named owner-directed sensitivity:</strong> Monangai remains in the raw canonical rows. Only rows explicitly labeled “without privacy-safe owner-directed marker” exclude that one preregistered event; no raw row is silently deleted.</p><p class="note"><strong>Formula/fit boundary:</strong> MAE = mean(|predicted − actual|); bias = mean(predicted − actual); Spearman ρ is Pearson correlation of average ranks; raw prediction R²* = 1 − SSE/SST on fixed strategy dollars. Only the rows explicitly labeled prior-week-fitted fit a scale, using the prior eligible reconstructed week and scoring the next. Exact nonlinear, tier, intercept, or liquidity models remain gated until multiple immutable exact prior→later pairs are available. Token threshold is ≤ max($1, 1% of original FAAB) = $5. Ratio-gap, MAD, and IQR filters are independent sensitivity flags, never silent deletions.</p></section>
<section class="appendix" aria-labelledby="appendix-exhaustive"><h2 id="appendix-exhaustive">Appendix D — Exhaustive exact target table</h2>${table(
    [
      "Target",
      "Rank",
      "Max VORP",
      "Safe",
      "Aggressive",
      "Winner",
      "Minimum proxy",
      "Raw / unique / alternatives / roster-full / token / unknown",
    ],
    model.exact.targets.map((target) => [
      escapeHtml(target.alias),
      String(target.maxVorpRank),
      money(target.maxVorp),
      money(target.safe),
      money(target.aggressive),
      money(target.winningBid),
      money(target.observedMinimum),
      `${target.rawClaimCount} / ${target.uniqueManagerClaims} / ${target.additionalSameManagerClaims} / ${target.rosterFullClaims} / ${target.tokenClaims} / ${target.unknownContingencies}`,
    ]),
  )}</section>
<section class="appendix" aria-labelledby="appendix-lineage"><h2 id="appendix-lineage">Appendix E — Provenance and source-hash lineage</h2><p>Exact and reconstructed evidence classes remain separate. Hashes establish byte lineage; they do not make reconstructed snapshots exact.</p>${table(["Sanitized source label", "Evidence class", "SHA-256"], lineage)}<p><strong>Alias rules:</strong> ${escapeHtml(model.exact.managerAliasRule)} ${escapeHtml(model.exact.selectionRule)}</p></section>
<section class="appendix" aria-labelledby="appendix-glossary"><h2 id="appendix-glossary">Appendix F — Glossary</h2><dl><dt>Canonical claim</dt><dd>One classified manager-target competitive path after duplicate and contingency handling.</dd><dt>Explicit non-bid</dt><dd>No submitted claim matched for that manager-target opportunity; it has no dollar amount.</dd><dt>Observed minimum proxy</dt><dd>One dollar above the highest observed clearing-eligible losing bid, where identifiable; not a true reservation price.</dd><dt>Token</dt><dd>A zero/near-zero claim retained separately from serious bidding.</dd><dt>Top credible / top all</dt><dd>Pre-waiver prediction bands retained by the exact audit; top all includes all modeled manager estimates.</dd><dt>Directional</dt><dd>A descriptive signal worth monitoring, not a validated reusable effect.</dd></dl></section>`;
}

export function renderBiddingPresentation(
  model: OwnerDecisionReportModel,
): string {
  if (model.questions.length !== 9)
    throw new Error("Report requires exactly nine questions");
  const cards = model.questions
    .map(
      (question) =>
        `<article class="answer-card" data-overview-number="${question.number}"><div><span class="card-number">${question.number}</span>${badge(question.badge)}</div><h2>${escapeHtml(question.title)}</h2><p>${escapeHtml(question.directAnswer)}</p><strong>${escapeHtml(question.keyNumber)}</strong></article>`,
    )
    .join("");
  const css = `:root{--ink:#172127;--muted:#58666d;--paper:#fffdf8;--navy:#123047;--teal:#0a6c70;--line:#d9dedc;--gold:#d2a53f;--green:#1f704c;--amber:#8a5a00;--gray:#626b70;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:#eef2f1}*{box-sizing:border-box}body{margin:0;line-height:1.48}main{max-width:1240px;margin:auto;background:var(--paper);box-shadow:0 0 35px #102a3830}.hero{min-height:100vh;padding:clamp(24px,5vw,72px);background:linear-gradient(145deg,#0d293d,#164c57);color:#fff;display:flex;flex-direction:column;justify-content:center}.hero h1{font-family:Georgia,serif;font-size:clamp(2.3rem,6vw,5.4rem);line-height:.95;max-width:900px;margin:.2em 0}.hero .lede{max-width:760px;color:#d9edf0;font-size:1.05rem}.answer-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:28px}.answer-card{background:#ffffff0e;border:1px solid #ffffff2e;border-radius:14px;padding:16px;break-inside:avoid}.answer-card h2{font-size:1rem;margin:.7rem 0 .4rem}.answer-card p{font-size:.88rem;color:#e3edef}.answer-card>strong{display:block;color:#ffe7a7;font-size:.82rem}.card-number{font:700 1.25rem Georgia,serif;margin-right:8px}.badge{display:inline-block;border-radius:999px;padding:3px 9px;font-size:.72rem;font-weight:800;letter-spacing:.02em}.badge-supported{background:#d9f3e5;color:#155e3b}.badge-directional{background:#fff0c5;color:#704700}.badge-not-enough-evidence{background:#e3e7e9;color:#424b50}.question,.appendix{padding:clamp(28px,5vw,68px);border-top:1px solid var(--line)}.question>header{position:relative}.question>header .badge{position:absolute;right:0;top:0}.question h2,.appendix h2{font-family:Georgia,serif;color:var(--navy);font-size:clamp(1.65rem,3vw,2.65rem);max-width:900px}.eyebrow{text-transform:uppercase;color:var(--teal);font-size:.72rem;font-weight:900;letter-spacing:.14em}.answer-flow{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:26px 0}.answer-flow>div{border-left:4px solid var(--teal);padding:2px 16px;background:#f4f8f6}.answer-flow h3{font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:var(--teal)}.key-number{font-size:1.15rem;font-weight:800;color:var(--navy)}h3{color:var(--navy);margin-top:1.5rem}.table-wrap{overflow-x:auto;margin:18px 0;border:1px solid var(--line);border-radius:10px}table{border-collapse:collapse;width:100%;font-size:.82rem;background:#fff}th,td{padding:9px 10px;text-align:left;vertical-align:top;border-bottom:1px solid #e4e8e6}thead th{position:sticky;top:0;background:#eaf1ef;color:#173d47;white-space:nowrap}tbody th{font-weight:750}.direct-rows{min-width:1600px}.note{color:var(--muted);font-size:.88rem}.empty-state,.team-card{border:1px solid #d8c58e;background:#fff8e5;padding:18px;border-radius:10px}.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.stat-grid div{background:#eef5f3;border-radius:10px;padding:18px}.stat-grid strong{display:block;font:700 1.8rem Georgia,serif;color:var(--teal)}.stat-grid span{font-size:.8rem;color:var(--muted)}details{padding:12px;background:#f3f6f5;border-radius:8px}code{font-size:.72rem;overflow-wrap:anywhere}dl{display:grid;grid-template-columns:180px 1fr;gap:8px 16px}dt{font-weight:800}dd{margin:0}.appendix{background:#f8f8f4}@media(min-width:901px){.hero{padding:28px 42px;justify-content:flex-start}.hero>.eyebrow{margin:0 0 4px}.hero h1{font-size:3.4rem;line-height:.95;margin:.08em 0 .12em}.hero .lede{font-size:.9rem;line-height:1.35;margin:0}.answer-grid{gap:8px;margin-top:14px}.answer-card{padding:10px 12px}.answer-card h2{font-size:.9rem;line-height:1.2;margin:.35rem 0 .25rem}.answer-card p{font-size:.8rem;line-height:1.32;margin:0 0 .4rem}.answer-card>strong{font-size:.74rem;line-height:1.25}.answer-card .card-number{font-size:1rem}.answer-card .badge{padding:2px 7px;font-size:.65rem}}@media(max-width:900px){.answer-grid{grid-template-columns:repeat(2,1fr)}.answer-flow{grid-template-columns:1fr}.stat-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.hero{min-height:auto;padding:28px 18px}.answer-grid{grid-template-columns:1fr}.question,.appendix{padding:28px 18px}.question>header .badge{position:static}.stat-grid{grid-template-columns:1fr}dl{grid-template-columns:1fr}.table-wrap{margin-left:-18px;margin-right:-18px;border-radius:0}}@page{size:letter;margin:.42in}@media print{body{background:#fff}main{box-shadow:none}.hero{min-height:10.1in;page-break-after:always;padding:.35in}.answer-grid{gap:8px}.answer-card{padding:10px}.answer-card p{font-size:.75rem}.question,.appendix{break-before:page;padding:.25in 0}.answer-flow{gap:8px}table{font-size:7pt}th,td{padding:4px}.table-wrap{overflow:visible}.direct-rows{min-width:0;font-size:5.4pt}.question>header .badge{position:static}.appendix{background:#fff}}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nine answers at a glance — bidding owner decisions</title><style>${css}</style></head><body><main><section class="hero" aria-labelledby="overview-title"><p class="eyebrow">Owner decision report • ${escapeHtml(model.generatedFor)}</p><h1 id="overview-title">Nine answers at a glance</h1><p class="lede">A recurring, privacy-safe decision report. Exact evidence remains separate from reconstructed history. Badges describe how far the current evidence can travel—not how interesting the question is.</p><div class="answer-grid">${cards}</div></section>${model.questions.map((question) => renderQuestion(model, question)).join("")}${appendices(model)}</main></body></html>`;
}

function markdownTable(
  headers: string[],
  rows: Array<Array<string | number>>,
): string {
  const clean = (value: string | number) =>
    String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
  return `| ${headers.map(clean).join(" | ")} |\n| ${headers.map(() => "---").join(" | ")} |\n${rows.map((row) => `| ${row.map(clean).join(" | ")} |`).join("\n")}`;
}

export function renderBiddingMarkdown(model: OwnerDecisionReportModel): string {
  const overview = model.questions
    .map(
      (question) =>
        `${question.number}. **${question.title} — ${question.badge}.** ${question.directAnswer} _Key n: ${question.keyNumber}._`,
    )
    .join("\n");
  const sections = model.questions
    .map((question) => {
      let extra = "";
      if (question.number === 1)
        extra = `\n\n${markdownTable(
          [
            "Target",
            "Cohort",
            "Manager",
            "Likelihood",
            "Predicted",
            "Pre-FAAB",
            "Feasible",
            "Actual",
            "Status/provenance",
            "Error",
            "Censoring",
          ],
          model.directRows.map((row) => [
            row.target,
            row.cohort,
            row.manager,
            row.likelihood,
            money(row.predicted),
            money(row.preWaiverFaab),
            money(row.feasiblePrediction),
            row.actualKind === "non-bid"
              ? "Explicit non-bid (not $0)"
              : money(row.actualAmount),
            `${row.status}; ${row.claimClass}; raw=${row.claimCount}; alternatives=${row.additionalSameManagerClaims}; roster-full=${row.rosterFullClaimCount}`,
            row.absoluteError == null
              ? "Not scored"
              : `${row.signedError! >= 0 ? "+" : ""}${money(row.signedError)} signed / ${money(row.absoluteError)} absolute`,
            row.budgetCensored ? "Budget-capped" : "No",
          ]),
        )}`;
      if (question.number === 2)
        extra = `\n\n${markdownTable(
          [
            "Band",
            "n",
            "Claim",
            "Positive",
            "≥Max",
            "≥Safe",
            "≥median",
            "≥minimum",
            "Heavy",
            "Top quartile",
          ],
          model.likelihoodBands.map((row) => [
            row.band,
            row.n,
            `${row.claim} (${pct(row.claim, row.n)})`,
            row.positive,
            row.max,
            row.safe,
            row.serious,
            row.minimum,
            row.heavy,
            row.topQuartile,
          ]),
        )}

**Opportunity/censoring boundary:** denominators are manager-target opportunities. Available FAAB limits capacity, while a non-claim does not identify budget, roster capacity, or preference; this is not a budget-feasible-only calibration.`;
      if (question.number === 3)
        extra = `

${markdownTable(
  [
    "Manager",
    "Anchor",
    "Follow week",
    "Raw / canonical",
    "Serious / heavy",
    "Wins / spend / max",
    "Bid volume / starting; mean bid / pre-bid",
    "Same-position",
    "Budget censoring",
    "Latest-week behavior",
    "Provenance",
  ],
  model.longitudinalRows.map((row) => [
    row.manager,
    `W${row.anchorWeek} win ${money(row.anchorSpend)}`,
    row.followWeek == null ? "No observed follow week" : `W${row.followWeek}`,
    `${row.rawClaims} / ${row.canonicalClaims}`,
    `${row.seriousBids} / ${row.heavyBids}`,
    `${row.wins} / ${money(row.totalSpend)} / ${money(row.maxBid)}`,
    `${(row.startFaabShare * 100).toFixed(1)}% / ${row.remainingFaabShare == null ? "—" : `${(row.remainingFaabShare * 100).toFixed(1)}%`}`,
    row.samePositionClaims,
    row.budgetCensored,
    `W${row.latestWeek}: ${row.latestActivity}`,
    row.provenance,
  ]),
)}`;
      if (question.number === 4) {
        const exactW5 = compactExactCoefficientRows(model);
        extra = `

**Do not pool these views:** reconstructed and exact views remain separate. Runner-up is only a derived observed-minimum-minus-$1 sensitivity.

${markdownTable(
  [
    "Scope",
    "Tier",
    "Boundary",
    "winner n",
    "minimum / runner-up n",
    "Median ratio",
    "Q1–Q3",
    "Winner MAE",
    "Minimum MAE",
    "Runner-up-proxy MAE",
  ],
  model.tierRows.map((row) => [
    row.scope,
    row.tier,
    row.boundary,
    row.n,
    `${row.minimumProxyN} / ${row.runnerUpProxyN}`,
    number(row.medianWinnerOverAggressive),
    `${number(row.q25)}–${number(row.q75)}`,
    money(row.winnerMae, 1),
    money(row.minimumProxyMae, 1),
    money(row.runnerUpProxyMae, 1),
  ]),
)}

### Exact decision-W5 fixed-coefficient check
${markdownTable(
  ["Target", "c", "n", "MAE", "Bias", "Coverage"],
  exactW5.map((row) => [
    row.target,
    number(row.coefficient, 1),
    row.n,
    money(row.mae, 1),
    money(row.bias, 1),
    row.coverage == null ? "—" : `${(row.coverage * 100).toFixed(1)}%`,
  ]),
)}

Full coefficient × target × tier × sensitivity rows are in Appendix C; production defaults are unchanged.`;
      }
      if (question.number === 5)
        extra = `

Two-panel visual is rendered in HTML/PDF output: Safe vs canonical winner, and decayed Weeks-as-Starter base vs winner with 2×/2.5×/3×/fitted lines. Each canonical auction appears once; exact/reconstructed provenance remains visible. Exact curve claims remain gated until multiple immutable exact-prior → exact-later pairs exist.`;
      if (question.number === 6)
        extra = `

${markdownTable(
  ["Auction label", "Provenance", "#1", "#2", "#3", "#4", "#5", "Context"],
  model.ladderRows.map((row) => [
    row.weekLabel,
    row.provenance,
    ...[0, 1, 2, 3, 4].map((index) => money(row.bids[index] ?? null)),
    row.context,
  ]),
)}`;
      if (question.number === 7)
        extra = `

${markdownTable(
  [
    "Manager",
    "Raw",
    "Canonical / targets",
    "Alternatives",
    "Positive / heavy",
    "Wins / spend",
    "Roster-full",
  ],
  model.exact.managerSummaries.map((row) => [
    row.manager,
    row.rawClaims,
    `${row.canonicalClaims} / ${row.targetCount}`,
    row.alternatives,
    `${row.positiveClaims} / ${row.heavyClaims}`,
    `${row.wins} / ${money(row.winningSpend)}`,
    row.rosterFullClaims,
  ]),
)}

### Claims-per-manager distribution — ${model.claimDistribution.scope}
${markdownTable(
  ["Metric", "Min", "P25", "Median", "P75", "P90", "Max"],
  model.claimDistribution.quantiles.map((row) => [
    row.metric,
    number(row.minimum, 1),
    number(row.q25, 1),
    number(row.median, 1),
    number(row.q75, 1),
    number(row.q90, 1),
    number(row.maximum, 1),
  ]),
)}

${markdownTable(
  [
    "Group",
    "Managers",
    "Mean canonical claims",
    "Median canonical claims",
    "Total wins",
    "Total winning spend",
  ],
  model.claimDistribution.relations.map((row) => [
    row.group,
    row.managers,
    number(row.meanCanonicalClaims, 2),
    number(row.medianCanonicalClaims, 2),
    row.wins,
    money(row.winningSpend, 0),
  ]),
)}

Spearman ρ(canonical claims, wins) = ${number(model.claimDistribution.spearmanClaimsVsWins, 2)}; Spearman ρ(canonical claims, winning spend) = ${number(model.claimDistribution.spearmanClaimsVsSpend, 2)}.

**Cumulative context:** ${model.claimDistribution.cumulativeContext}

Canonical manager-target rows are the participation unit. Raw alternatives, token claims, roster-full failures, and unknown contingencies remain distinct.`;
      if (question.number === 9)
        extra = `

${markdownTable(
  [
    "Week",
    "Top winner",
    "Winning spend",
    "Winner provenance",
    "Prior-week history / provenance",
    "Next-week history / provenance",
  ],
  model.winnerHistoryRows.map((row) => [
    `W${row.week}`,
    row.manager,
    money(row.winningSpend),
    row.currentProvenance,
    `${row.prior} (${row.priorProvenance})`,
    `${row.next} (${row.nextProvenance})`,
  ]),
)}`;
      return `## ${question.number}. ${question.title}\n\n**${question.badge} — ${question.keyNumber}**\n\n### Direct answer\n${question.directAnswer}\n\n### Key evidence / n\n${question.evidence}\n\n### Practical implication\n${question.implication}\n\n### Unknowns / next exact data\n${question.unknowns}${extra}`;
    })
    .join("\n\n");
  const lineage = markdownTable(
    ["Source label", "Evidence class", "SHA-256"],
    lineageRows(model).map((row) => [
      row[0].replace(/<[^>]+>/g, ""),
      row[1],
      row[2].replace(/<[^>]+>/g, ""),
    ]),
  );
  const prior = priorAccuracyRows(model);
  const sensitivity = priorSensitivityRows(model);
  const winnerBootstrap = priorWinnerBootstrapRows(model);
  const weekly = priorWeeklyAnalysis(model);
  const ownerStrategyIds = new Set([
    "max-vorp",
    "vorp",
    "corrected-safe",
    "corrected-weeks-starter",
  ]);
  const priorTable = markdownTable(
    ["Baseline", "n serious", "MAE", "Bias", "Raw prediction R²*"],
    prior.map((row) => [
      row.label,
      row.n,
      money(row.mae, 1),
      money(row.bias, 1),
      number(row.rawR2, 3),
    ]),
  );
  const strategyFormulaTable = markdownTable(
    ["Strategy", "Deterministic definition"],
    STRATEGY_FORMULAS,
  );
  const sensitivityTable = markdownTable(
    [
      "Sensitivity case",
      "n wins",
      ...STRATEGIES.map(([, label]) => `${label} MAE`),
    ],
    sensitivity.map((row) => [
      row.label,
      row.n,
      ...row.metrics.map((metric) => money(metric.mae, 1)),
    ]),
  );
  const bootstrapTable = markdownTable(
    ["Strategy", "n wins", "MAE", "95% cluster-bootstrap MAE CI"],
    winnerBootstrap.map((row) => [
      row.label,
      row.n,
      money(row.mae, 1),
      row.interval
        ? `${money(row.interval[0], 1)}–${money(row.interval[1], 1)}`
        : "—",
    ]),
  );
  const exclusionTable = markdownTable(
    [
      "View",
      "Clusters",
      "Closest",
      ...MARKET_STRATEGIES.filter(([id]) => ownerStrategyIds.has(id)).map(
        ([, label]) => `${label} MAE`,
      ),
    ],
    [
      [
        "Without privacy-safe owner-directed marker",
        weekly.ownerDirected,
      ] as const,
      ["With marked target retained", weekly.withExcludedTarget] as const,
    ].map(([label, view]) => {
      const overall = view.marketMetrics.find((row) => row.week == null)!;
      return [
        label,
        overall.seriousMedianClusters,
        overall.closest ?? "—",
        ...overall.metrics
          .filter((metric) => ownerStrategyIds.has(metric.id))
          .map((metric) => money(metric.mae, 1)),
      ];
    }),
  );
  const heldOutTable = markdownTable(
    [
      "Observation",
      "Strategy",
      "Fit→test",
      "Scale",
      "test n",
      "MAE",
      "Bias",
      "Raw held-out R²*",
      "Spearman ρ",
    ],
    (
      [
        ["Winner", weekly.ownerDirected.heldOutScaleMetrics.winning],
        [
          "Serious-market median",
          weekly.ownerDirected.heldOutScaleMetrics.seriousMedian,
        ],
      ] as const
    ).flatMap(([observation, rows]) =>
      rows
        .filter((row) => ownerStrategyIds.has(row.id))
        .map((row) => [
          observation,
          row.label,
          `W${row.fitWeek}→W${row.testWeek}`,
          number(row.fittedMultiplier, 3),
          row.n,
          money(row.mae, 1),
          money(row.signedBias, 1),
          number(row.rSquared, 2),
          number(row.spearman, 2),
        ]),
    ),
  );
  return `# Nine answers at a glance

${overview}

${sections}

# Appendices

## My team this week
- One premium acquisition for $187 from $499, leaving $312.
- 8 raw claims became 7 canonical claims; three later claims were explicitly roster-full.
- Clearing price was above the $159 observed-minimum proxy and below the $244 top-credible estimate.
- Lineup, injury, and positional-hole claims are not supported by the privacy-safe evidence.

## Methods and glossary
- Signed error = prediction − explicit submitted amount; MAE = mean absolute error over explicit claims only. Non-bids are missing, never $0.
- Spearman ρ is Pearson correlation of average ranks. Raw prediction R²* = 1 − SSE/SST on fixed, unrefit predictions; negative values are valid and this is not fitted-regression goodness-of-fit.
- Feasible prediction = min(prediction, pre-waiver FAAB). Capacity and willingness remain separate.
- Bootstrap intervals use 2,000 deterministic cluster resamples (seed 20260927); clusters are player × processing batch. This does not repair reconstructed-history error.
- Token threshold is ≤ max($1, 1% starting FAAB) = $5. Ratio-gap, MAD, and IQR are independent sensitivity flags.
- Exact and reconstructed provenance are not interchangeable. Later exact scores after reconstructed training = ${model.exactHeldOutPairs}; exact-prior → exact-later pair count = 0.

## Full coefficient sensitivity (analysis-only)
${markdownTable(
  [
    "Scope",
    "Provenance",
    "Tier",
    "Target",
    "c",
    "n",
    "MAE",
    "Bias",
    "Coverage",
    "Validation",
  ],
  model.coefficientSensitivity.map((row) => [
    row.scope,
    row.provenance,
    row.tier,
    row.target,
    number(row.coefficient, 1),
    row.n,
    money(row.mae, 1),
    money(row.bias, 1),
    row.coverage == null || !Number.isFinite(row.coverage)
      ? "—"
      : `${(row.coverage * 100).toFixed(1)}%`,
    row.validation,
  ]),
)}

## Retained forecast-band scoring
${markdownTable(
  ["Band", "Target", "Tier", "n", "MAE", "Bias", "Coverage", "Provenance"],
  model.forecastBandScores.map((row) => [
    row.band,
    row.target,
    row.tier,
    row.n,
    money(row.mae, 1),
    money(row.bias, 1),
    `${(row.coverage * 100).toFixed(1)}%`,
    row.provenance,
  ]),
)}

## Prior strategy formulas
${strategyFormulaTable}

## Prior reconstructed accuracy
${priorTable}

## Full predeclared winning-bid sensitivities
${sensitivityTable}

## Deterministic cluster-bootstrap check
${bootstrapTable}

## Privacy-safe owner-directed exclusion sensitivity
${exclusionTable}

**Named owner-directed sensitivity:** Monangai remains in the raw canonical rows. Only rows explicitly labeled “without privacy-safe owner-directed marker” exclude that one preregistered event; no raw row is silently deleted.

## Prior-week-fitted held-out checks
${heldOutTable}

Only these rows fit a scale, using the prior week and scoring the next. The W4→W5 rows use reconstructed W4 as training evidence and immutable exact W5 as the later score. Exact nonlinear/tier/liquidity model claims remain gated until more immutable exact prior→later pairs exist.

## Source-hash lineage
${lineage}
`;
}

export function normalizePdfMetadata(buffer: Buffer): Buffer {
  const nodeIds = new Map<string, string>();
  const normalized = buffer
    .toString("latin1")
    .replace(
      /\/(CreationDate|ModDate) \(D:[^)]+\)/g,
      "/$1 (D:20260925230008+00'00')",
    )
    .replace(/\(node(\d{8})\)/g, (match, volatileId: string) => {
      let stableId = nodeIds.get(volatileId);
      if (!stableId) {
        stableId = String(nodeIds.size + 1).padStart(8, "0");
        nodeIds.set(volatileId, stableId);
      }
      return match.replace(volatileId, stableId);
    });
  return Buffer.from(normalized, "latin1");
}

async function findChromium(): Promise<string | null> {
  for (const candidate of [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ]) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      /* next */
    }
  }
  return null;
}

async function loadExactFixtureHistory(
  primary: ExactAuditFixture,
): Promise<ExactAuditFixture[]> {
  const candidateDirs = [
    "scripts/fixtures",
    "research",
    "research/owner-decision-report",
    "research/owner-decision-evidence",
  ];
  const fixturePattern = /(?:^|-)owner-decision.*week\d+.*\.json$/i;
  const history = new Map<string, ExactAuditFixture>();
  history.set(stableSha256(primary), primary);

  for (const directory of candidateDirs) {
    try {
      const entries = await readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !fixturePattern.test(entry.name)) continue;
        const path = join(directory, entry.name);
        try {
          const parsed = JSON.parse(
            await readFile(path, "utf8"),
          ) as ExactAuditFixture;
          if (
            !parsed ||
            !Array.isArray(parsed.targets) ||
            !Array.isArray(parsed.managerSummaries)
          )
            continue;
          const hash = stableSha256(parsed);
          history.set(hash, parsed);
        } catch {
          // Ignore non-fixture JSON files.
        }
      }
    } catch {
      // Missing optional directories are expected.
    }
  }

  return [...history.values()].sort((a, b) => {
    const aWeek = a.coordinate?.appWeek ?? a.evidenceWeek;
    const bWeek = b.coordinate?.appWeek ?? b.evidenceWeek;
    const aDecision = a.coordinate?.decisionWeek ?? Math.max(1, aWeek - 1);
    const bDecision = b.coordinate?.decisionWeek ?? Math.max(1, bWeek - 1);
    return aWeek - bWeek || aDecision - bDecision;
  });
}

export async function generateArtifacts(
  includePdf = true,
  prewaiverPanelPath?: string,
): Promise<OwnerDecisionReportModel> {
  const reconstructed = JSON.parse(
    await readFile(RECONSTRUCTED_FIXTURE_PATH, "utf8"),
  ) as AnalysisFixture;
  const exact = JSON.parse(
    await readFile(EXACT_FIXTURE_PATH, "utf8"),
  ) as ExactAuditFixture;
  const prewaiverPanel = prewaiverPanelPath
    ? (JSON.parse(await readFile(prewaiverPanelPath, "utf8")) as PrewaiverPanel)
    : undefined;
  const exactHistory = await loadExactFixtureHistory(exact);
  const model = buildOwnerDecisionReport(
    reconstructed,
    exact,
    prewaiverPanel,
    exactHistory,
  );
  await writeFile(HTML_PATH, renderBiddingPresentation(model));
  await writeFile(MARKDOWN_PATH, renderBiddingMarkdown(model));
  console.log(`Wrote ${HTML_PATH}`);
  console.log(`Wrote ${MARKDOWN_PATH}`);
  if (includePdf) {
    const chromium = await findChromium();
    if (!chromium) throw new Error("No Chromium executable found");
    const result = spawnSync(
      chromium,
      [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--no-pdf-header-footer",
        `--print-to-pdf=${resolve(PDF_PATH)}`,
        pathToFileURL(resolve(HTML_PATH)).href,
      ],
      { encoding: "utf8" },
    );
    if (result.status !== 0)
      throw new Error(
        `Chromium PDF generation failed (${result.status}): ${result.stderr}`,
      );
    await writeFile(PDF_PATH, normalizePdfMetadata(await readFile(PDF_PATH)));
    console.log(
      `Wrote ${PDF_PATH} with ${basename(chromium)} (deterministic metadata)`,
    );
  }
  return model;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const panelArgument = process.argv.indexOf("--prewaiver-panel");
  const panelPath =
    panelArgument >= 0 ? process.argv[panelArgument + 1] : undefined;
  if (panelArgument >= 0 && !panelPath)
    throw new Error("--prewaiver-panel requires a path");
  generateArtifacts(process.argv.includes("--pdf"), panelPath).catch(
    (error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}

export { buildOwnerDecisionReport, selectTopAndMiddleRows };
export type { ExactAuditFixture, OwnerDecisionReportModel };
