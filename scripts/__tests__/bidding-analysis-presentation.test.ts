import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import type { AnalysisFixture } from "../analyze-bidding-strategies.ts";
import {
  buildOwnerDecisionReport,
  normalizePdfMetadata,
  renderBiddingMarkdown,
  renderBiddingPresentation,
  rSquared,
  selectTopAndMiddleRows,
  type ExactAuditFixture,
  type OwnerDecisionReportModel,
} from "../generate-bidding-analysis-presentation.ts";

let model: OwnerDecisionReportModel;
let html: string;
let markdown: string;
let exactText: string;

beforeAll(async () => {
  const reconstructed = JSON.parse(
    await readFile(
      "scripts/fixtures/bidding-strategy-seamex-2026.json",
      "utf8",
    ),
  ) as AnalysisFixture;
  exactText = await readFile(
    "scripts/fixtures/bidding-owner-decision-week5.json",
    "utf8",
  );
  const exact = JSON.parse(exactText) as ExactAuditFixture;
  model = buildOwnerDecisionReport(reconstructed, exact);
  html = renderBiddingPresentation(model);
  markdown = renderBiddingMarkdown(model);
});

describe("owner-decision nine-question report", () => {
  it("renders exactly nine overview answers and nine numbered main sections in approved order", () => {
    expect(html.match(/data-overview-number="\d"/g) ?? []).toHaveLength(9);
    expect(html.match(/data-question-number="\d"/g) ?? []).toHaveLength(9);
    expect(model.questions.map((question) => question.title)).toEqual([
      "Predicted-bid accuracy for top versus middle bidders/players",
      "What Likely/Possible/Unlikely predicts and whether narrower bands help",
      "Bidding after a prior expensive win",
      "Aggressive versus actual winner/minimum by price tier",
      "Whether a nonlinear/tier-aware market-price curve fits better",
      "Weekly #1–#5 price ladder and player-rank relationship",
      "Claims per manager",
      "Positional need versus participation/amount",
      "Whether prior-week top winners/bidders spend less next week",
    ]);
    expect(html).toContain(
      '<h1 id="overview-title">Nine answers at a glance</h1>',
    );
    expect(html.indexOf("Nine answers at a glance")).toBeLessThan(
      html.indexOf('data-question-number="1"'),
    );
  });

  it("uses a compact desktop overview while retaining the mobile stack", () => {
    expect(html).toContain("@media(min-width:901px){.hero{padding:28px 42px;justify-content:flex-start}");
    expect(html).toContain(".answer-grid{gap:8px;margin-top:14px}");
    expect(html).toContain(".answer-card p{font-size:.8rem;line-height:1.32;margin:0 0 .4rem}");
    expect(html).toContain("@media(max-width:560px){.hero{min-height:auto;padding:28px 18px}");
    expect(html).toContain(".answer-grid{grid-template-columns:1fr}");
  });

  it("keeps the mandated four-part answer structure in every section", () => {
    for (let question = 1; question <= 9; question += 1) {
      const start = html.indexOf(`data-question-number="${question}"`);
      const end =
        question < 9
          ? html.indexOf(`data-question-number="${question + 1}"`)
          : html.indexOf('class="appendix"');
      const section = html.slice(start, end);
      const parts = [
        "direct-answer",
        "key-evidence",
        "practical-implication",
        "unknowns-next-data",
      ];
      expect(
        parts.map((part) => section.indexOf(`data-part="${part}"`)),
      ).toEqual(
        [...parts.map((part) => section.indexOf(`data-part="${part}"`))].sort(
          (a, b) => a - b,
        ),
      );
      for (const part of parts)
        expect(section).toContain(`data-part="${part}"`);
    }
  });

  it("selects the exact top three and deterministic top/middle cohorts", () => {
    expect(
      model.exact.targets
        .slice(0, 3)
        .map((target) => [target.alias, target.maxVorp]),
    ).toEqual([
      ["Target 01", 102],
      ["Target 02", 69],
      ["Target 03", 50],
    ]);
    expect(model.directRows).toHaveLength(30);
    for (const target of model.exact.targets.slice(0, 3)) {
      const selected = selectTopAndMiddleRows(target);
      expect(selected.filter((row) => row.cohort === "Top five")).toHaveLength(
        5,
      );
      expect(
        selected.filter((row) => row.cohort === "Middle five"),
      ).toHaveLength(5);
      const ordered = [...target.managerPredictions!].sort(
        (a, b) =>
          b.predicted - a.predicted || a.manager.localeCompare(b.manager),
      );
      const start = Math.floor((ordered.length - 5) / 2);
      expect(
        selected
          .filter((row) => row.cohort === "Middle five")
          .map((row) => row.manager),
      ).toEqual(ordered.slice(start, start + 5).map((row) => row.manager));
    }
    expect(html).toContain("30 direct manager-target rows");
  });

  it("uses explicit non-bid semantics and scores claims only", () => {
    const nonBids = model.directRows.filter(
      (row) => row.actualKind === "non-bid",
    );
    expect(nonBids.length).toBeGreaterThan(0);
    expect(
      nonBids.every(
        (row) =>
          row.actualAmount == null &&
          row.signedError == null &&
          row.absoluteError == null,
      ),
    ).toBe(true);
    expect(html).toContain("Explicit non-bid</strong> (not $0)");
    expect(model.headlineMetrics).toMatchObject({
      topClaimN: 11,
      middleClaimN: 11,
    });
    expect(model.headlineMetrics.topClaimMae).toBeCloseTo(78.1818182, 6);
    expect(model.headlineMetrics.middleClaimMae).toBeCloseTo(45.4545455, 6);
  });

  it("keeps overview and section evidence badges consistent", () => {
    expect(model.questions.map((question) => question.badge)).toEqual([
      "Supported",
      "Directional",
      "Directional",
      "Directional",
      "Not enough evidence",
      "Directional",
      "Supported",
      "Not enough evidence",
      "Directional",
    ]);
    for (const question of model.questions) {
      const escaped = question.badge;
      const occurrences = (html.match(new RegExp(`>${escaped}<`, "g")) ?? [])
        .length;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it("preserves exact and reconstructed provenance and source hashes separately", () => {
    expect(model.exact.lineage.exactWeek5.length).toBeGreaterThanOrEqual(6);
    expect(
      model.exact.lineage.exactWeek5.every((row) =>
        /^[a-f0-9]{64}$/.test(row.sha256),
      ),
    ).toBe(true);
    expect(model.exact.lineage.reconstructedWeeks2To4.sha256).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(html).toContain("Exact Week 5");
    expect(html).toContain("Reconstructed Weeks 2–4");
    expect(html).toContain("separate evidence classes");
  });

  it("is self-contained, responsive, deterministic, and privacy-safe", () => {
    expect(renderBiddingPresentation(model)).toBe(html);
    expect(renderBiddingMarkdown(model)).toBe(markdown);
    expect(html).toContain("@media(max-width:900px)");
    expect(html).toContain("@media(max-width:560px)");
    expect(html).toContain("@media print");
    expect(html).not.toMatch(
      /<script\b|<link\b|https?:\/\/[^<"']+\.(?:js|css)/i,
    );
    for (const text of [html, markdown, exactText]) {
      expect(text).not.toMatch(
        /manager_[0-9]+|roster_[0-9]+|league[_ -]?id|transaction[_ -]?id|player[_ -]?id/i,
      );
      expect(text).not.toMatch(/\b\d{17,20}\b/);
      expect(text).not.toMatch(/SUPABASE_(?:URL|READ_KEY)|Bearer\s|apikey/i);
    }
    expect(
      model.directRows.every((row) => /^Manager \d{2}$/.test(row.manager)),
    ).toBe(true);
    expect(
      model.exact.targets.every((target) =>
        /^Target \d{2}$/.test(target.alias),
      ),
    ).toBe(true);
  });

  it("does not double-count the exact app-W5 / Sleeper-decision-W4 auction", () => {
    expect(model.ladderRows.map((row) => row.weekLabel)).toEqual([
      "Decision W2",
      "Decision W3",
      "App W5 / decision W4",
    ]);
    expect(model.ladderRows.at(-1)?.bids).toEqual([300, 187, 128, 74, 65]);
    expect(model.questions[5].keyNumber).toContain("3 distinct auctions");
    expect(markdown).toContain(
      "exact ladder replaces the reconstructed W4 row",
    );
    expect(markdown).not.toContain(
      "| Decision W4 | Reconstructed | $300 | $187 | $128 | $74 | $65 |",
    );
  });

  it("keeps the required Q3/Q7/Q9 direct tables and tier sensitivities in Markdown", () => {
    expect(markdown).toContain(
      "| Manager | Anchor | Follow week | Raw / canonical |",
    );
    expect(markdown).toContain(
      "| Manager | Raw | Canonical / targets | Alternatives |",
    );
    expect(markdown).toContain(
      "| Week | Top winner | Winning spend | Prior-week history | Next-week history |",
    );
    expect(markdown).toContain(
      "| Scope | Tier | Boundary | winner n | minimum / runner-up n |",
    );
    expect(markdown).toContain("Opportunity/censoring boundary");
    expect(markdown).toContain("Full predeclared winning-bid sensitivities");
    expect(markdown).toContain("Deterministic cluster-bootstrap check");
    expect(markdown).toContain(
      "Prior-week-fitted held-out checks (reconstructed only)",
    );
    expect(markdown).not.toContain("Monangai");
  });

  it("represents all requested tables and keeps technical material in appendices", () => {
    expect(html).toContain("Top 25%");
    expect(html).toContain("Bottom 10%");
    expect(html).toContain("≥$90 anchor wins");
    expect(html).toContain("Median winner / Aggressive");
    expect(html).toContain("Model scoreboard intentionally blank");
    expect(html).toContain("Starting-FAAB shares");
    expect(html).toContain("107</strong><span>raw claims");
    expect(html).toContain("Week 5 WR / QB");
    expect(html).toContain("Prior-week history");
    expect(html).toContain("Appendix A — My team this week");
    expect(html).toContain("Raw prediction R²");
    expect(html).toContain("Bootstrap");
    expect(html).toContain("source-hash lineage");
    expect(html).toContain("Glossary");
  });

  it("keeps raw R² definition and PDF metadata normalization deterministic", () => {
    expect(
      rSquared([
        { actual: 1, predicted: 1 },
        { actual: 2, predicted: 2 },
      ]),
    ).toBe(1);
    expect(
      rSquared([
        { actual: 1, predicted: 10 },
        { actual: 2, predicted: 10 },
      ]),
    ).toBeLessThan(0);
    const first = Buffer.from(
      "%PDF /CreationDate (D:20260927101000+00'00') /ModDate (D:20260927101000+00'00') /Headers [(node00002365)] /ID (node00002365) /ID (node00002366) body",
      "latin1",
    );
    const second = Buffer.from(
      "%PDF /CreationDate (D:20260927101159+00'00') /ModDate (D:20260927101159+00'00') /Headers [(node00001790)] /ID (node00001790) /ID (node00001791) body",
      "latin1",
    );
    expect(normalizePdfMetadata(first)).toEqual(normalizePdfMetadata(second));
  });
});
