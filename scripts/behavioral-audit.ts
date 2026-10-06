export const OWNER_SUMMARY_STRATEGY_IDS = ['max-vorp', 'vorp', 'corrected-safe', 'corrected-weeks-starter'] as const;

export interface BehavioralAuditRow {
  question: string;
  evidence: string;
  answer: string;
}

export const BEHAVIORAL_AUDIT_ROWS: BehavioralAuditRow[] = [
  {
    question: 'Price bands: median / upper quartile / top credible / top all',
    evidence: 'Exact manual W5 audit: 11 target rows. Top-credible MAE $36.36, median AE $25, signed bias +$16.91, Spearman 0.712; top-all MAE $47.27, median AE $48, signed bias +$40.91, Spearman 0.796.',
    answer: 'The ordering signal was useful, but levels were too high overall and errors differed materially by target tier. Privacy-safe median and upper-quartile prediction bands were not retained as a separate deterministic slice, so premium-versus-mid/lower band calibration remains prospective rather than inferred from 11 auctions.',
  },
  {
    question: 'Likely / Possible / Unlikely as claim probabilities and threshold outcomes',
    evidence: 'Full exact W5 incidence audit: Likely 31/65 (47.7%), Possible 34/108 (31.5%), Unlikely 15/69 (21.7%). Restricted cross-check: 50 manager predictions, 5 canonical claims, 4 observed players, 11 teams.',
    answer: 'The labels were directionally ordered for any canonical claim, but separation was weak and the restricted cross-check is tiny. Positive-claim, ≥Max VORP, ≥Safe, ≥serious-median, and ≥observed-minimum bands are not credibly estimable from this one auction; those outcomes remain preregistered prospective tests.',
  },
  {
    question: 'Prior wins, same-position wins, remaining FAAB, and prior-week top bidders',
    evidence: 'Longitudinal reconstructed replay contains 240 serious bids and 72 winners, but the exact W5 behavioral slice does not contain a clean prior-only panel for these covariates.',
    answer: 'No causal or manager-style claim is supported. Effects for prior wins ≥10%/≥20% starting FAAB, prior same-position wins, budget level, and prior-week top-bidder participation/heavy spend remain prospective; budget capacity must be separated from willingness.',
  },
  {
    question: 'Aggressive versus wins and observed minimum proxies',
    evidence: 'Exact W5, n=11: Aggressive MAE $26.27 versus winners (bias −$12.27; 5/11 at or above the winner) and MAE $18.09 versus observed minimum proxies (bias +$10.27; 10/11 at or above the proxy).',
    answer: 'Aggressive behaved more like a rough threshold than a winning-price forecast, but it was not a reliable minimum: it still missed one observed proxy and commonly exceeded the proxy. Keep it out of the four-method owner multiplier tables because it is derived from Safe.',
  },
  {
    question: 'Aggressive versus 1.5× Max VORP and a cautious tier-aware candidate',
    evidence: 'Exact W5, n=11: simple 1.5× Max VORP had winner MAE $36.45 and minimum-proxy MAE $27.18, worse than Aggressive at $26.27 / $18.09. Longitudinal winner replay favors Aggressive in-sample, but no prior-only held-out comparison validates a replacement curve.',
    answer: 'The manual audit rejects simple 1.5× Max VORP as an improvement. A cautious tier-aware candidate is only a hypothesis until preregistered exact pre-waiver and held-out evidence exists; no production formula change is warranted.',
  },
  {
    question: 'Prediction distribution and right-tail shape',
    evidence: 'Only 11 exact W5 target rows; top-all estimates were more upward biased than top-credible estimates.',
    answer: 'The sample is compatible with a heavy right tail, but is far too small to identify an exponential or other parametric distribution. Report empirical quantiles only when a larger exact sample exists.',
  },
  {
    question: 'Weekly free-agent rank 1/2/3/later prices',
    evidence: 'The committed privacy-safe fixture does not retain an exact auction-time free-agent rank with quality, position, injury, active-team, and liquidity controls.',
    answer: 'Starting-FAAB shares and Max-VORP/Aggressive multiples by free-agent rank are not credibly estimable here. Preserve this as a descriptive prospective analysis with the named controls.',
  },
  {
    question: 'Claims per manager/auction, alternatives, duplicates, and spend',
    evidence: 'Exact W5: 107 raw claims, 84 unique manager/player pairs, and 23 additional same-manager alternatives. The owner-team slice had 8 raw and 7 canonical claims.',
    answer: 'One auction cannot establish a manager’s “usual claims per auction,” clean claim-count quantiles, or a stable relation to wins/spend. Alternatives and contingency paths must stay separate from canonical claims.',
  },
  {
    question: 'Projected positional need',
    evidence: 'No privacy-safe, time-aligned roster-need feature with adequate controls is present in the exact behavioral slice or reconstructed replay.',
    answer: 'Need-as-predictor is unsupported. Future work must distinguish modeled roster need from observed intent and control for player quality, position, injury, active teams, liquidity, and remaining FAAB.',
  },
  {
    question: 'Do prior-week top bidders bid less next week?',
    evidence: 'The available exact manual audit is one auction; the reconstructed replay is not a clean prior-only manager panel for this question.',
    answer: 'Not estimable. Test raw dollars and starting-/remaining-FAAB-normalized bids prospectively across additional exact auctions.',
  },
];

export const OWNER_TEAM_AUDIT = {
  sample: 'Exact W5 owner-team slice: 8 raw claims, 7 canonical claims; behavioral cross-check includes 5 canonical claims across 4 observed players.',
  outcome: 'One acquisition for $187 from $499 pre-waiver FAAB, leaving $312. Its observed minimum proxy was $159 and top-credible prediction was $244, so the clearing price landed inside that wide audit band.',
  process: 'Tiered coverage produced one intended premium acquisition and preserved substantial FAAB, but three later claims were explicitly rejected as roster-full. Contingency/roster-capacity sequencing was therefore imperfect; hidden drop paths are not inferred and failed claims are not treated as clearing competition. This is a process-quality observation, not evidence that the acquisition will produce a good future outcome.',
  roster: 'Strength: one premium skill-position addition without exhausting budget. Optimized lineup, injury risk, and remaining positional holes are not supported by the privacy-safe post-waiver evidence and are intentionally not fabricated.',
} as const;

export function renderBehavioralAuditMarkdown(): string {
  const rows = BEHAVIORAL_AUDIT_ROWS.map((row) => `| ${row.question} | ${row.evidence} | ${row.answer} |`).join('\n');
  return `## Behavioral-question audit appendix\n\n` +
    `These are privacy-safe aggregate answers from the exact manual app-Week-5 pre/post-waiver audit, supplemented only where explicitly labeled by the W2–W4 reconstructed replay. Exact manual evidence and reconstructed strategy replay are not interchangeable.\n\n` +
    `| Question | Available evidence / n | Current answer |\n| --- | --- | --- |\n${rows}\n\n` +
    `### Owner-team appendix (privacy-safe)\n\n` +
    `- **Scope:** ${OWNER_TEAM_AUDIT.sample}\n` +
    `- **Acquisition / spend / remaining:** ${OWNER_TEAM_AUDIT.outcome}\n` +
    `- **Failed contingencies and process quality:** ${OWNER_TEAM_AUDIT.process}\n` +
    `- **Lineup / risk:** ${OWNER_TEAM_AUDIT.roster}\n\n` +
    `### Limitation\n\nThree reconstructed auctions plus one exact manual audit do not support stable manager-style, positional-need, longitudinal behavioral, or parametric right-tail claims. Unsupported questions above remain prospective hypotheses, not missing-at-random zeros or inferred facts.\n`;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function renderBehavioralAuditHtml(): string {
  const rows = BEHAVIORAL_AUDIT_ROWS.map((row) => `<tr><th scope="row">${escapeHtml(row.question)}</th><td>${escapeHtml(row.evidence)}</td><td>${escapeHtml(row.answer)}</td></tr>`).join('');
  return `<section aria-labelledby="behavioral-title"><h2 id="behavioral-title">Behavioral-question audit appendix</h2><p>Privacy-safe exact manual app-Week-5 aggregates are supplemented only where explicitly labeled by the W2–W4 reconstructed replay. These provenance classes are not interchangeable.</p><div class="table-wrap"><table><thead><tr><th>Question</th><th>Available evidence / n</th><th>Current answer</th></tr></thead><tbody>${rows}</tbody></table></div><h3>Owner-team appendix (privacy-safe)</h3><ul><li><strong>Scope:</strong> ${escapeHtml(OWNER_TEAM_AUDIT.sample)}</li><li><strong>Acquisition / spend / remaining:</strong> ${escapeHtml(OWNER_TEAM_AUDIT.outcome)}</li><li><strong>Failed contingencies and process quality:</strong> ${escapeHtml(OWNER_TEAM_AUDIT.process)}</li><li><strong>Lineup / risk:</strong> ${escapeHtml(OWNER_TEAM_AUDIT.roster)}</li></ul><div class="callout"><strong>Limitation.</strong> Three reconstructed auctions plus one exact manual audit do not support stable manager-style, positional-need, longitudinal behavioral, or parametric right-tail claims. Unsupported questions remain prospective hypotheses.</div></section>`;
}
